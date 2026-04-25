import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'week'; // week | month
    const platform = searchParams.get('platform') || undefined;

    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    if (period === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else {
      startDate.setDate(now.getDate() - 7);
    }
    const startStr = startDate.toISOString().split('T')[0];

    // Fetch posts from database
    const posts = await db.contentPost.findMany({
      where: {
        scheduledDate: { gte: startStr },
        ...(platform ? { platform } : {}),
      },
      orderBy: { scheduledDate: 'asc' },
    });

    // ── Overview calculations ────────────────────────────────────────
    const totalPosts = posts.length;
    const totalLikes = posts.reduce((sum, p) => sum + p.likes, 0);
    const totalComments = posts.reduce((sum, p) => sum + p.comments, 0);
    const totalShares = posts.reduce((sum, p) => sum + p.shares, 0);
    const totalViews = posts.reduce((sum, p) => sum + p.views, 0);
    const totalFavorites = posts.reduce((sum, p) => sum + (p.favorites || 0), 0);
    const totalInteractions = totalLikes + totalComments + totalShares + totalFavorites;
    const avgScore = totalPosts > 0
      ? Math.round(posts.reduce((sum, p) => sum + p.aiScore, 0) / totalPosts * 10) / 10
      : 0;

    const publishedCount = posts.filter(p => p.status === 'published').length;
    const publishRate = totalPosts > 0 ? Math.round((publishedCount / totalPosts) * 100) : 0;

    // ── Content type distribution ────────────────────────────────────
    const typeMap: Record<string, { count: number; engagement: number }> = {};
    posts.forEach(p => {
      const t = p.contentType || 'text';
      if (!typeMap[t]) typeMap[t] = { count: 0, engagement: 0 };
      typeMap[t].count++;
      typeMap[t].engagement += p.likes + p.comments * 2 + p.shares * 3 + (p.favorites || 0);
    });

    const contentTypeDistribution = Object.entries(typeMap).map(([type, data]) => ({
      type,
      count: data.count,
      percentage: totalPosts > 0 ? Math.round((data.count / totalPosts) * 100) : 0,
      avgEngagement: data.count > 0 ? Math.round(data.engagement / data.count) : 0,
    })).sort((a, b) => b.avgEngagement - a.avgEngagement);

    const bestContentType = contentTypeDistribution.length > 0 ? contentTypeDistribution[0] : null;

    // ── Best publishing time slot ────────────────────────────────────
    const dayEngagement: Record<string, { total: number; count: number }> = {};
    posts.forEach(p => {
      const day = new Date(p.scheduledDate).toLocaleDateString('zh-CN', { weekday: 'long' });
      if (!dayEngagement[day]) dayEngagement[day] = { total: 0, count: 0 };
      dayEngagement[day].total += p.likes + p.comments * 2 + p.shares * 3 + (p.favorites || 0);
      dayEngagement[day].count++;
    });

    const bestDay = Object.entries(dayEngagement)
      .sort((a, b) => b[1].total - a[1].total)[0];

    const bestPublishSlot = bestDay
      ? `${bestDay[0]}（平均互动 ${bestDay[1].count > 0 ? Math.round(bestDay[1].total / bestDay[1].count) : 0}）`
      : '数据不足';

    // ── Content status distribution ──────────────────────────────────
    const statusMap: Record<string, number> = {};
    posts.forEach(p => {
      statusMap[p.status] = (statusMap[p.status] || 0) + 1;
    });
    const statusDistribution = Object.entries(statusMap).map(([status, count]) => ({
      status,
      count,
      percentage: totalPosts > 0 ? Math.round((count / totalPosts) * 100) : 0,
    }));

    // ── Top posts by engagement ──────────────────────────────────────
    const topPosts = [...posts]
      .sort((a, b) => (b.likes + b.comments * 2 + b.shares * 3 + (b.favorites || 0)) - (a.likes + a.comments * 2 + a.shares * 3 + (a.favorites || 0)))
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        topic: p.topic,
        contentPreview: p.content.substring(0, 100),
        likes: p.likes,
        comments: p.comments,
        shares: p.shares,
        views: p.views,
        favorites: p.favorites || 0,
        aiScore: p.aiScore,
        contentType: p.contentType,
        status: p.status,
        scheduledDate: p.scheduledDate,
        engagement: p.likes + p.comments * 2 + p.shares * 3 + (p.favorites || 0),
      }));

    // ── Date range labels ────────────────────────────────────────────
    const periodLabel = period === 'month' ? '本月' : '本周';
    const dateRange = {
      start: startStr,
      end: now.toISOString().split('T')[0],
    };

    return NextResponse.json({
      period,
      periodLabel,
      dateRange,
      platform: platform || 'all',
      generatedAt: new Date().toISOString(),
      overview: {
        totalPosts,
        totalLikes,
        totalComments,
        totalShares,
        totalFavorites,
        totalViews,
        totalInteractions,
        avgScore,
        publishRate,
        publishedCount,
      },
      contentTypeDistribution,
      bestContentType: bestContentType ? {
        type: bestContentType.type,
        count: bestContentType.count,
        avgEngagement: bestContentType.avgEngagement,
      } : null,
      bestPublishSlot,
      statusDistribution,
      topPosts,
    });
  } catch (error) {
    console.error('Weekly report API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate weekly report', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
