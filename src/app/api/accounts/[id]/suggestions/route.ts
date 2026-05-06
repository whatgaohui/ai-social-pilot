import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateAccountInsights } from '@/lib/ai-service';

// GET /api/accounts/[id]/suggestions - Get AI suggestions for account
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const account = await db.xhsAccount.findUnique({ where: { id } });
    if (!account) {
      return NextResponse.json(
        { success: false, error: '账号不存在' },
        { status: 404 }
      );
    }

    // Get non-dismissed suggestions
    let suggestions = await db.contentSuggestion.findMany({
      where: { accountId: id, isDismissed: false },
      orderBy: { generatedAt: 'desc' },
    });

    // If no suggestions, generate them
    if (suggestions.length === 0) {
      const posts = await db.xhsPost.findMany({
        where: { accountId: id },
        orderBy: { publishDate: 'desc' },
        take: 20,
      });

      if (posts.length > 0) {
        const postsFormatted = posts.map((p) => ({
          id: p.id,
          accountId: p.accountId,
          xhsPostId: p.xhsPostId,
          title: p.title,
          content: p.content,
          coverUrl: p.coverUrl,
          imageUrls: JSON.parse(p.imageUrls || '[]'),
          postType: p.postType as 'normal' | 'video',
          likes: p.likes,
          comments: p.comments,
          collects: p.collects,
          shares: p.shares,
          tags: JSON.parse(p.tags || '[]'),
          category: p.category,
          aiScore: p.aiScore,
          aiAnalysis: p.aiAnalysis,
          publishDate: p.publishDate,
        }));

        const avgLikes = Math.round(posts.reduce((s, p) => s + p.likes, 0) / posts.length);
        const avgComments = Math.round(posts.reduce((s, p) => s + p.comments, 0) / posts.length);
        const avgCollects = Math.round(posts.reduce((s, p) => s + p.collects, 0) / posts.length);
        const avgShares = Math.round(posts.reduce((s, p) => s + p.shares, 0) / posts.length);

        const categoryMap = new Map<string, { count: number; totalEngagement: number }>();
        for (const p of posts) {
          const cat = p.category || '未分类';
          const engagement = p.likes + p.comments + p.collects + p.shares;
          const existing = categoryMap.get(cat) || { count: 0, totalEngagement: 0 };
          categoryMap.set(cat, { count: existing.count + 1, totalEngagement: existing.totalEngagement + engagement });
        }
        const contentCategories = Array.from(categoryMap.entries()).map(([name, data]) => ({
          name, count: data.count, avgEngagement: Math.round(data.totalEngagement / data.count),
        }));

        const themeMap = new Map<string, number>();
        for (const p of posts) {
          const tags: string[] = JSON.parse(p.tags || '[]');
          for (const tag of tags) themeMap.set(tag, (themeMap.get(tag) || 0) + 1);
        }
        const contentThemes = Array.from(themeMap.entries()).map(([theme, count]) => ({ theme, count }))
          .sort((a, b) => b.count - a.count).slice(0, 20);

        const accountInfo = {
          id: account.id, xhsUrl: account.xhsUrl, xhsId: account.xhsId,
          nickname: account.nickname, avatarUrl: account.avatarUrl, bio: account.bio,
          location: account.location, followers: account.followers, following: account.following,
          likedCollected: account.likedCollected, notesCount: account.notesCount,
          status: account.status as 'idle' | 'scraping' | 'success' | 'error',
          lastScrapedAt: account.lastScrapedAt?.toISOString() || null,
        };

        const analysis = {
          totalPosts: posts.length, avgLikes, avgComments, avgCollects, avgShares,
          topPosts: postsFormatted.slice(0, 5), contentCategories,
          postingFrequency: [], engagementTrend: [], bestPostingTimes: [
            { hour: 8, avgEngagement: avgLikes + avgComments + avgCollects },
            { hour: 12, avgEngagement: avgLikes + avgComments + avgCollects },
            { hour: 18, avgEngagement: avgLikes + avgComments + avgCollects },
            { hour: 21, avgEngagement: avgLikes + avgComments + avgCollects },
          ],
          contentThemes,
        };

        const insights = await generateAccountInsights(accountInfo, analysis);

        // Parse insights into suggestions
        const suggestionItems = [
          { type: 'general', title: 'AI 运营建议', description: insights.slice(0, 300), priority: 'high' as const },
          { type: 'content_gap', title: '内容优化方向', description: '基于数据分析，建议尝试新的内容主题以覆盖更广泛的受众。', priority: 'medium' as const },
          { type: 'best_time', title: '发布时间优化', description: `建议在高互动时段（${analysis.bestPostingTimes.map((t) => `${t.hour}:00`).join('、')}）发布笔记以获得更多曝光。`, priority: 'medium' as const },
          { type: 'trending', title: '选题趋势', description: contentThemes.length > 0 ? `热门话题：${contentThemes.slice(0, 3).map((t) => t.theme).join('、')}，建议继续深耕。` : '暂无趋势数据。', priority: 'low' as const },
        ];

        const created = await db.contentSuggestion.createMany({
          data: suggestionItems.map((s) => ({
            accountId: id, ...s, metadata: JSON.stringify({ source: 'auto-generated' }),
          })),
        });

        suggestions = await db.contentSuggestion.findMany({
          where: { accountId: id, isDismissed: false },
          orderBy: { generatedAt: 'desc' },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: suggestions.map((s) => ({
        id: s.id, type: s.type, title: s.title, description: s.description,
        priority: s.priority, generatedAt: s.generatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Failed to get suggestions:', error);
    return NextResponse.json(
      { success: false, error: '获取建议失败' },
      { status: 500 }
    );
  }
}

// POST /api/accounts/[id]/suggestions - Dismiss or apply a suggestion
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { suggestionId, action } = body;

    if (!suggestionId || !action) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段' },
        { status: 400 }
      );
    }

    const suggestion = await db.contentSuggestion.findUnique({
      where: { id: suggestionId },
    });

    if (!suggestion || suggestion.accountId !== id) {
      return NextResponse.json(
        { success: false, error: '建议不存在' },
        { status: 404 }
      );
    }

    if (action === 'dismiss') {
      const updated = await db.contentSuggestion.update({
        where: { id: suggestionId },
        data: { isDismissed: true },
      });
      return NextResponse.json({ success: true, data: updated });
    }

    if (action === 'apply') {
      const updated = await db.contentSuggestion.update({
        where: { id: suggestionId },
        data: { isDismissed: true, metadata: JSON.stringify({ ...JSON.parse(suggestion.metadata || '{}'), applied: true }) },
      });
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json(
      { success: false, error: '未知的操作' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Failed to update suggestion:', error);
    return NextResponse.json(
      { success: false, error: '操作失败' },
      { status: 500 }
    );
  }
}
