import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/competitor-analysis
// Aggregates competitor data with stats, trends, and top content
// Supports ?period=week|month|quarter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';

    // Calculate date range based on period
    const now = new Date();
    let daysBack = 30;
    if (period === 'week') daysBack = 7;
    if (period === 'quarter') daysBack = 90;
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysBack);

    // Fetch all tracked accounts (non-own = competitors)
    const accounts = await db.trackedAccount.findMany({
      where: { isOwn: false },
      orderBy: { lastSyncAt: { sort: 'desc', nulls: 'last' } },
    });

    // Fetch all scraped posts within the date range
    const scrapedPosts = await db.contentPost.findMany({
      where: {
        generationType: 'scraped',
        createdAt: { gte: startDate },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    // Fetch own posts within the date range for comparison
    const ownPosts = await db.contentPost.findMany({
      where: {
        generationType: { not: 'scraped' },
        createdAt: { gte: startDate },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    // Build competitor list with aggregated stats
    const competitorList = accounts.map((account) => {
      // Filter scraped posts by platform match
      const accountPosts = scrapedPosts.filter((p) => p.platform === account.platform);

      // Basic stats
      const totalPosts = accountPosts.length;
      const totalLikes = accountPosts.reduce((s, p) => s + p.likes, 0);
      const totalComments = accountPosts.reduce((s, p) => s + p.comments, 0);
      const totalShares = accountPosts.reduce((s, p) => s + p.shares, 0);
      const totalViews = accountPosts.reduce((s, p) => s + p.views, 0);
      const totalFavorites = accountPosts.reduce((s, p) => s + (p.favorites || 0), 0);

      const avgEngagementRate = totalViews > 0
        ? ((totalLikes + totalComments + totalShares) / totalViews) * 100
        : 0;

      // Content frequency (posts per week)
      const postsPerWeek = daysBack > 0 ? (totalPosts / daysBack) * 7 : 0;

      // Best posting times analysis
      const hourBuckets = new Array(24).fill(0) as number[];
      accountPosts.forEach((p) => {
        const d = new Date(p.scheduledDate || p.createdAt);
        if (!isNaN(d.getTime())) {
          hourBuckets[d.getHours()]++;
        }
      });
      const peakHour = hourBuckets.indexOf(Math.max(...hourBuckets));

      // Top content types
      const typeCounts: Record<string, number> = {};
      accountPosts.forEach((p) => {
        typeCounts[p.contentType] = (typeCounts[p.contentType] || 0) + 1;
      });
      const topContentTypes = Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([type, count]) => ({ type, count }));

      // Top performing content (sorted by engagement score)
      const topContent = [...accountPosts]
        .map((p) => ({
          id: p.id,
          topic: p.topic,
          contentType: p.contentType,
          likes: p.likes,
          comments: p.comments,
          shares: p.shares,
          favorites: p.favorites || 0,
          views: p.views,
          scheduledDate: p.scheduledDate,
          engagementScore: p.likes + p.comments * 2 + p.shares * 3 + (p.favorites || 0) * 1.5,
        }))
        .sort((a, b) => b.engagementScore - a.engagementScore)
        .slice(0, 5);

      // Daily trend data for charts
      const dailyData: Record<string, {
        postCount: number;
        likes: number;
        comments: number;
        shares: number;
        views: number;
      }> = {};
      accountPosts.forEach((p) => {
        const dateKey = (p.scheduledDate || '').slice(0, 10);
        if (!dateKey) return;
        if (!dailyData[dateKey]) {
          dailyData[dateKey] = { postCount: 0, likes: 0, comments: 0, shares: 0, views: 0 };
        }
        dailyData[dateKey].postCount++;
        dailyData[dateKey].likes += p.likes;
        dailyData[dateKey].comments += p.comments;
        dailyData[dateKey].shares += p.shares;
        dailyData[dateKey].views += p.views;
      });

      const trendData = Object.entries(dailyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({
          date,
          postCount: data.postCount,
          engagementRate: data.views > 0
            ? ((data.likes + data.comments + data.shares) / data.views) * 100
            : 0,
          avgScore: data.postCount > 0
            ? data.likes / data.postCount
            : 0,
        }));

      // Hourly posting pattern
      const hourlyPattern = hourBuckets.map((count, hour) => ({
        hour,
        count,
      }));

      return {
        id: account.id,
        nickname: account.nickname,
        avatarUrl: account.avatarUrl,
        platform: account.platform,
        followers: account.followers,
        postsCount: account.postsCount,
        lastSyncAt: account.lastSyncAt,
        stats: {
          totalPosts,
          totalLikes,
          totalComments,
          totalShares,
          totalFavorites,
          totalViews,
          avgEngagementRate: parseFloat(avgEngagementRate.toFixed(2)),
          postsPerWeek: parseFloat(postsPerWeek.toFixed(1)),
          peakHour,
          topContentTypes,
        },
        topContent,
        trendData,
        hourlyPattern,
      };
    });

    // Aggregate own stats for comparison
    const ownTotalPosts = ownPosts.length;
    const ownTotalLikes = ownPosts.reduce((s, p) => s + p.likes, 0);
    const ownTotalComments = ownPosts.reduce((s, p) => s + p.comments, 0);
    const ownTotalShares = ownPosts.reduce((s, p) => s + p.shares, 0);
    const ownTotalViews = ownPosts.reduce((s, p) => s + p.views, 0);
    const ownAvgEngagementRate = ownTotalViews > 0
      ? ((ownTotalLikes + ownTotalComments + ownTotalShares) / ownTotalViews) * 100
      : 0;
    const ownPostsPerWeek = daysBack > 0 ? (ownTotalPosts / daysBack) * 7 : 0;

    // Own trend data
    const ownDailyData: Record<string, {
      postCount: number;
      likes: number;
      comments: number;
      shares: number;
      views: number;
    }> = {};
    ownPosts.forEach((p) => {
      const dateKey = (p.scheduledDate || '').slice(0, 10);
      if (!dateKey) return;
      if (!ownDailyData[dateKey]) {
        ownDailyData[dateKey] = { postCount: 0, likes: 0, comments: 0, shares: 0, views: 0 };
      }
      ownDailyData[dateKey].postCount++;
      ownDailyData[dateKey].likes += p.likes;
      ownDailyData[dateKey].comments += p.comments;
      ownDailyData[dateKey].shares += p.shares;
      ownDailyData[dateKey].views += p.views;
    });

    const ownTrendData = Object.entries(ownDailyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        postCount: data.postCount,
        engagementRate: data.views > 0
          ? ((data.likes + data.comments + data.shares) / data.views) * 100
          : 0,
        avgScore: data.postCount > 0
          ? data.likes / data.postCount
          : 0,
      }));

    // Own hourly pattern
    const ownHourBuckets = new Array(24).fill(0) as number[];
    ownPosts.forEach((p) => {
      const d = new Date(p.scheduledDate || p.createdAt);
      if (!isNaN(d.getTime())) {
        ownHourBuckets[d.getHours()]++;
      }
    });
    const ownHourlyPattern = ownHourBuckets.map((count, hour) => ({
      hour,
      count,
    }));

    // Aggregate stats across all competitors
    const aggregated = {
      totalCompetitors: accounts.length,
      avgFollowerCount: accounts.length > 0
        ? Math.round(accounts.reduce((s, a) => s + a.followers, 0) / accounts.length)
        : 0,
      avgEngagementRate: competitorList.length > 0
        ? parseFloat((competitorList.reduce((s, c) => s + c.stats.avgEngagementRate, 0) / competitorList.length).toFixed(2))
        : 0,
      avgPostsPerWeek: competitorList.length > 0
        ? parseFloat((competitorList.reduce((s, c) => s + c.stats.postsPerWeek, 0) / competitorList.length).toFixed(1))
        : 0,
    };

    return NextResponse.json({
      period,
      startDate: startDate.toISOString().slice(0, 10),
      endDate: now.toISOString().slice(0, 10),
      competitors: competitorList,
      own: {
        stats: {
          totalPosts: ownTotalPosts,
          totalLikes: ownTotalLikes,
          totalComments: ownTotalComments,
          totalShares: ownTotalShares,
          totalViews: ownTotalViews,
          avgEngagementRate: parseFloat(ownAvgEngagementRate.toFixed(2)),
          postsPerWeek: parseFloat(ownPostsPerWeek.toFixed(1)),
        },
        trendData: ownTrendData,
        hourlyPattern: ownHourlyPattern,
      },
      aggregated,
    });
  } catch (error) {
    console.error('Failed to fetch competitor analysis:', error);
    return NextResponse.json({ error: '获取竞品分析数据失败' }, { status: 500 });
  }
}
