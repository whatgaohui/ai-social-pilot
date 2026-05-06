import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/accounts/[id]/health - Calculate and return account health score
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const account = await db.xhsAccount.findUnique({
      where: { id },
      include: { posts: { orderBy: { publishDate: 'desc' } } },
    });

    if (!account) {
      return NextResponse.json(
        { success: false, error: '账号不存在' },
        { status: 404 }
      );
    }

    const posts = account.posts;
    const totalPosts = posts.length;

    if (totalPosts === 0) {
      const emptyScore = {
        score: 0,
        postingScore: 0,
        engagementScore: 0,
        followerScore: 0,
        diversityScore: 0,
        factors: { message: '暂无笔记数据，请先采集账号数据' },
      };
      return NextResponse.json({ success: true, data: emptyScore });
    }

    // ─── Posting Score (0-100): frequency consistency ───
    const dateMap = new Map<string, number>();
    for (const p of posts) {
      if (p.publishDate) {
        const date = p.publishDate.slice(0, 10);
        dateMap.set(date, (dateMap.get(date) || 0) + 1);
      }
    }
    const sortedDates = Array.from(dateMap.keys()).sort();
    let postingScore = 30; // base score for having posts

    if (sortedDates.length >= 2) {
      // Calculate gaps between posting dates
      const gaps: number[] = [];
      for (let i = 1; i < sortedDates.length; i++) {
        const d1 = new Date(sortedDates[i - 1]);
        const d2 = new Date(sortedDates[i]);
        const gap = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
        if (gap > 0) gaps.push(gap);
      }

      if (gaps.length > 0) {
        const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
        // Ideal: post every 2-3 days
        const idealGap = 2.5;
        const gapVariance = gaps.reduce((sum, g) => sum + Math.pow(g - avgGap, 2), 0) / gaps.length;
        const consistency = Math.max(0, 1 - gapVariance / 100); // lower variance = higher consistency

        // Score based on frequency (posting every 1-3 days is ideal)
        const freqScore = avgGap <= 7 ? Math.max(0, 100 - avgGap * 10) : 0;
        postingScore = Math.round(freqScore * 0.6 + consistency * 100 * 0.4);
      }
    }

    // Bonus for recent activity (posts in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentPosts = posts.filter((p) => new Date(p.publishDate) >= thirtyDaysAgo).length;
    if (recentPosts > 0) {
      postingScore = Math.min(100, postingScore + Math.min(recentPosts * 3, 15));
    }

    postingScore = Math.max(0, Math.min(100, postingScore));

    // ─── Engagement Score (0-100): avg engagement rate ───
    const totalEngagement = posts.reduce(
      (sum, p) => sum + p.likes + p.comments + p.collects + p.shares,
      0
    );
    const avgEngagement = totalEngagement / totalPosts;

    // Normalize: 100 engagement = 50pts, 500+ = 100pts
    let engagementScore = Math.min(100, Math.round((avgEngagement / 500) * 100));
    // Bonus for high ratio of comments/collects (indicates quality)
    const totalComments = posts.reduce((sum, p) => sum + p.comments, 0);
    const totalCollects = posts.reduce((sum, p) => sum + p.collects, 0);
    if (totalEngagement > 0) {
      const qualityRatio = (totalComments + totalCollects * 2) / totalEngagement;
      engagementScore = Math.min(100, engagementScore + Math.round(qualityRatio * 20));
    }

    // ─── Follower Score (0-100): follower count normalized ───
    // Normalize: 100 followers = 20pts, 1000 = 50pts, 10000 = 80pts, 50000+ = 100pts
    const followers = account.followers;
    let followerScore: number;
    if (followers < 100) followerScore = Math.round((followers / 100) * 20);
    else if (followers < 1000) followerScore = 20 + Math.round(((followers - 100) / 900) * 30);
    else if (followers < 10000) followerScore = 50 + Math.round(((followers - 1000) / 9000) * 30);
    else if (followers < 50000) followerScore = 80 + Math.round(((followers - 10000) / 40000) * 20);
    else followerScore = 100;

    followerScore = Math.max(0, Math.min(100, followerScore));

    // ─── Diversity Score (0-100): content category + tag variety ───
    const categorySet = new Set<string>();
    const tagSet = new Set<string>();
    for (const p of posts) {
      if (p.category) categorySet.add(p.category);
      try {
        const tags: string[] = JSON.parse(p.tags || '[]');
        for (const t of tags) tagSet.add(t);
      } catch {
        // ignore
      }
    }

    // Category diversity: 1 cat = 20, 3 cats = 50, 5+ cats = 80
    const categoryCount = categorySet.size;
    const catScore = Math.min(80, categoryCount * 16);

    // Tag diversity: 5 tags = 30, 15+ tags = 70
    const tagCount = tagSet.size;
    const tagScore = Math.min(70, tagCount * 5);

    const diversityScore = Math.min(100, Math.round(catScore + tagScore));

    // ─── Total Score (weighted) ───
    const totalScore = Math.round(
      postingScore * 0.3 +
      engagementScore * 0.4 +
      followerScore * 0.15 +
      diversityScore * 0.15
    );

    // ─── Save to database ───
    const saved = await db.accountHealthScore.create({
      data: {
        accountId: id,
        score: totalScore,
        postingScore,
        engagementScore,
        followerScore,
        diversityScore,
        factors: JSON.stringify({
          totalPosts,
          avgEngagement,
          categoryCount: categorySet.size,
          tagCount: tagSet.size,
          recentPosts,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: saved.id,
        score: saved.score,
        postingScore: saved.postingScore,
        engagementScore: saved.engagementScore,
        followerScore: saved.followerScore,
        diversityScore: saved.diversityScore,
        calculatedAt: saved.calculatedAt.toISOString(),
        factors: {
          totalPosts,
          avgEngagement: Math.round(avgEngagement),
          categoryCount: categorySet.size,
          tagCount: tagSet.size,
          recentPosts,
        },
      },
    });
  } catch (error) {
    console.error('Failed to calculate health score:', error);
    return NextResponse.json(
      { success: false, error: '健康评分计算失败' },
      { status: 500 }
    );
  }
}
