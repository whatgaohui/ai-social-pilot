import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAIClient } from '@/lib/ai-client';
import { buildReportPrompt, type ReportPromptParams } from '@/lib/ai-prompts';

export async function POST(request: NextRequest) {
  try {
    const { period = 'weekly', platform = 'wechat', persona, knowledgeItems = [], contentPosts = [] } = await request.json();
    const isXHS = platform === 'xiaohongshu';
    const isWeekly = period === 'weekly';

    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    if (isWeekly) {
      startDate.setDate(now.getDate() - 7);
    } else {
      startDate.setMonth(now.getMonth() - 1);
    }
    const startStr = startDate.toISOString().split('T')[0];

    // Fetch real analytics data from database
    const allPosts = await db.contentPost.findMany({
      where: {
        scheduledDate: { gte: startStr },
        ...(isXHS ? { platform: 'xiaohongshu' } : {}),
      },
      orderBy: { scheduledDate: 'asc' },
    });

    // Also fetch platform-agnostic posts for wechat (backward compat)
    const posts = isXHS
      ? allPosts
      : allPosts.length > 0
        ? allPosts
        : await db.contentPost.findMany({
            where: { scheduledDate: { gte: startStr } },
            orderBy: { scheduledDate: 'asc' },
          });

    // Calculate overview stats
    const totalPosts = posts.length;
    const totalLikes = posts.reduce((sum, p) => sum + p.likes, 0);
    const totalComments = posts.reduce((sum, p) => sum + p.comments, 0);
    const totalShares = posts.reduce((sum, p) => sum + p.shares, 0);
    const totalViews = posts.reduce((sum, p) => sum + p.views, 0);
    const avgScore = totalPosts > 0
      ? Math.round(posts.reduce((sum, p) => sum + p.aiScore, 0) / totalPosts * 10) / 10
      : 0;
    const publishedCount = posts.filter(p => p.status === 'published').length;
    const publishRate = totalPosts > 0 ? Math.round(publishedCount / totalPosts * 100) : 0;

    // Top posts by engagement score (likes + comments*2 + shares*3)
    const topPosts = [...posts]
      .sort((a, b) => (b.likes + b.comments * 2 + b.shares * 3) - (a.likes + a.comments * 2 + a.shares * 3))
      .slice(0, 3)
      .map(p => ({
        id: p.id,
        topic: p.topic,
        content: p.content.substring(0, 100),
        likes: p.likes,
        comments: p.comments,
        shares: p.shares,
        views: p.views,
        favorites: p.favorites || 0,
        aiScore: p.aiScore,
        contentType: p.contentType,
        engagement: p.likes + p.comments * 2 + p.shares * 3,
      }));

    // Content type distribution
    const typeMap: Record<string, { count: number; engagement: number }> = {};
    posts.forEach(p => {
      const t = p.contentType || 'text';
      if (!typeMap[t]) typeMap[t] = { count: 0, engagement: 0 };
      typeMap[t].count++;
      typeMap[t].engagement += p.likes + p.comments * 2 + p.shares * 3;
    });
    const contentTypeAnalysis = Object.entries(typeMap).map(([type, data]) => ({
      type,
      count: data.count,
      percentage: totalPosts > 0 ? Math.round(data.count / totalPosts * 100) : 0,
      avgEngagement: data.count > 0 ? Math.round(data.engagement / data.count) : 0,
    }));

    // Call AI for insights, suggestions, and next period plan
    const ai = await createAIClient();

    // Build prompts using centralized prompt builder
    const promptData: ReportPromptParams['data'] = {
      totalPosts,
      totalLikes,
      totalComments,
      totalShares,
      totalViews,
      avgScore,
      publishRate,
      publishedCount,
      totalFavorites: isXHS ? posts.reduce((s, p) => s + (p.favorites || 0), 0) : undefined,
      contentTypeAnalysis,
      topPosts,
      persona: persona || null,
      knowledgeItems: knowledgeItems || [],
    };

    const messages = buildReportPrompt({ platform, period, data: promptData });

    const aiResponse = await ai.chatCompletion(messages);

    // Parse AI response - handle markdown code blocks
    let jsonStr = aiResponse.trim();
    // Remove markdown code block wrappers
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    const periodLabel = isWeekly ? '本周' : '本月';

    let report;
    try {
      report = JSON.parse(jsonStr);
    } catch {
      // If parsing fails, build a basic report with the raw data
      report = {
        overview: { totalPosts, totalLikes, totalComments, totalShares, totalViews, avgScore, publishRate },
        topPosts: topPosts.map(p => ({
          id: p.id,
          topic: p.topic,
          contentPreview: p.content,
          engagementSummary: `赞${p.likes} 评${p.comments} ${isXHS ? `藏${p.favorites}` : `转${p.shares}`}`,
          engagement: p.engagement,
        })),
        contentTypeAnalysis: JSON.stringify(contentTypeAnalysis),
        trends: {
          summary: totalPosts > 0 ? `${periodLabel}共发布${totalPosts}篇${isXHS ? '笔记' : '内容'}，总互动${totalLikes + totalComments + totalShares}` : `${periodLabel}暂无内容数据`,
          engagementTrend: totalLikes > 0 ? '平稳' : '暂无数据',
          bestPerformingType: contentTypeAnalysis.length > 0 ? contentTypeAnalysis[0].type : '暂无',
          peakDay: '数据不足',
        },
        aiInsights: [
          totalPosts > 0 ? `${periodLabel}共创作${totalPosts}篇${isXHS ? '笔记' : '内容'}，发布率为${publishRate}%` : `${periodLabel}暂无内容数据，建议开始创建内容`,
          totalPosts > 0 ? `平均AI评分为${avgScore}分，${avgScore >= 70 ? '整体质量不错' : '还有提升空间'}` : '建议先完善人设和知识库设置',
          totalLikes > 0 ? `总互动量为${totalLikes + totalComments + totalShares}，${contentTypeAnalysis.length > 0 ? `表现最好的类型是${contentTypeAnalysis[0].type}` : '各类型表现均衡'}` : '发布内容后可以积累互动数据',
          isXHS ? '小红书内容建议注重封面图质量和话题标签选择' : '朋友圈内容建议保持真诚和互动性',
          '持续产出优质内容是运营增长的关键',
        ],
        suggestions: [
          { title: '保持更新频率', description: '建议每周至少发布3-5篇内容，保持账号活跃度' },
          { title: '关注高互动内容', description: '分析表现最好的内容类型，加大该类型的创作比重' },
          { title: '优化发布时间', description: '根据受众活跃时间选择最佳发布时段' },
          { title: '增加互动引导', description: '在内容中自然地引导读者点赞、评论和转发' },
        ],
        nextWeekPlan: [
          { focus: '延续优质内容类型', type: contentTypeAnalysis[0]?.type || '综合', reason: '表现最好的类型值得持续深耕' },
          { focus: '尝试新内容形式', type: '互动', reason: '增加与读者的互动以提升账号活跃度' },
          { focus: '热点话题结合', type: isXHS ? '种草安利' : '观点洞察', reason: '结合热点可以提升内容曝光量' },
        ],
      };
    }

    // Ensure report structure is complete
    report.overview = report.overview || { totalPosts, totalLikes, totalComments, totalShares, totalViews, avgScore, publishRate };
    report.topPosts = report.topPosts || topPosts.map(p => ({
      id: p.id, topic: p.topic, contentPreview: p.content, engagementSummary: `赞${p.likes} 评${p.comments}`, engagement: p.engagement,
    }));
    report.contentTypeAnalysis = report.contentTypeAnalysis || JSON.stringify(contentTypeAnalysis);
    report.trends = report.trends || { summary: '暂无趋势数据', engagementTrend: '暂无', bestPerformingType: '暂无', peakDay: '暂无' };
    report.aiInsights = report.aiInsights || ['暂无洞察数据'];
    report.suggestions = report.suggestions || [];
    report.nextWeekPlan = report.nextWeekPlan || [];

    return NextResponse.json({
      report,
      generatedAt: new Date().toISOString(),
      period,
      platform,
      model: ai.config?.name || ai.config?.provider || 'default',
    });
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
