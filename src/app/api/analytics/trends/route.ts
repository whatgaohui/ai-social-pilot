import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── GET /api/analytics/trends ────────────────────────────────────────────────
// Aggregate daily trend data for a given time range and metrics.
// Query params:
//   range  — "7d" | "30d" | "90d" (default: "30d")
//   metrics — comma-separated list of "likes,comments,shares,views" (default: all)

const COLOR_MAP: Record<string, string> = {
  likes: '#a855f7',
  comments: '#10b981',
  shares: '#f59e0b',
  views: '#06b6d4',
};

const LABEL_MAP: Record<string, string> = {
  likes: '点赞',
  comments: '评论',
  shares: '转发',
  views: '浏览',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';
    const metricsParam = searchParams.get('metrics') || 'likes,comments,shares';

    // Parse range into days
    let days = 30;
    if (range === '7d') days = 7;
    else if (range === '90d') days = 90;

    // Parse metrics
    const requestedMetrics = metricsParam
      .split(',')
      .map((m) => m.trim())
      .filter((m): m is 'likes' | 'comments' | 'shares' | 'views' =>
        ['likes', 'comments', 'shares', 'views'].includes(m)
      );

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Fetch all posts in the range + previous period for WoW comparison
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);

    const [postsInRange, postsInPrevRange] = await Promise.all([
      db.contentPost.findMany({
        where: { createdAt: { gte: startDate } },
        orderBy: { createdAt: 'asc' },
      }),
      db.contentPost.findMany({
        where: {
          createdAt: { gte: prevStartDate, lt: startDate },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // ── Build date map: each date → { likes, comments, shares, views } ──
    const dateMap = new Map<string, Record<string, number>>();
    for (let i = 0; i < days; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - (days - 1 - i));
      const key = d.toISOString().slice(0, 10);
      dateMap.set(key, { likes: 0, comments: 0, shares: 0, views: 0 });
    }

    // Aggregate posts by date (in range)
    for (const post of postsInRange) {
      const key = new Date(post.createdAt).toISOString().slice(0, 10);
      const entry = dateMap.get(key);
      if (entry) {
        entry.likes += post.likes;
        entry.comments += post.comments;
        entry.shares += post.shares;
        entry.views += post.views;
      }
    }

    // ── Build dates array and series ──
    const dates: string[] = [];
    const metricData: Record<string, number[]> = {
      likes: [],
      comments: [],
      shares: [],
      views: [],
    };

    for (const [dateStr, entry] of dateMap) {
      const d = new Date(dateStr);
      dates.push(`${d.getMonth() + 1}/${d.getDate()}`);
      metricData.likes.push(entry.likes);
      metricData.comments.push(entry.comments);
      metricData.shares.push(entry.shares);
      metricData.views.push(entry.views);
    }

    // Build series only for requested metrics
    const series = requestedMetrics.map((metric) => ({
      name: LABEL_MAP[metric] || metric,
      data: metricData[metric],
      color: COLOR_MAP[metric] || '#8b5cf6',
    }));

    // ── Totals for the range ──
    const totals = requestedMetrics.reduce<Record<string, number>>((acc, m) => {
      acc[m] = metricData[m].reduce((a, b) => a + b, 0);
      return acc;
    }, {});

    // ── Previous period totals for WoW comparison ──
    const prevTotals = requestedMetrics.reduce<Record<string, number>>((acc, m) => {
      acc[m] = postsInPrevRange.reduce((sum, p) => {
        switch (m) {
          case 'likes': return sum + p.likes;
          case 'comments': return sum + p.comments;
          case 'shares': return sum + p.shares;
          case 'views': return sum + p.views;
          default: return sum;
        }
      }, 0);
      return acc;
    }, {});

    // Week-over-week change percentages
    const changes: Record<string, number> = {};
    for (const m of requestedMetrics) {
      changes[m] =
        prevTotals[m] === 0
          ? totals[m] > 0
            ? 100
            : 0
          : Math.round(((totals[m] - prevTotals[m]) / prevTotals[m]) * 100);
    }

    // ── KPI Summary ──
    const totalInteractions = (totals.likes ?? 0) + (totals.comments ?? 0) + (totals.shares ?? 0);
    const prevInteractions = (prevTotals.likes ?? 0) + (prevTotals.comments ?? 0) + (prevTotals.shares ?? 0);
    const interactionChangePct =
      prevInteractions === 0
        ? totalInteractions > 0 ? 100 : 0
        : Math.round(((totalInteractions - prevInteractions) / prevInteractions) * 100);

    // Posts published this month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [thisMonthPosts, prevMonthPosts] = await Promise.all([
      db.contentPost.count({ where: { createdAt: { gte: monthStart } } }),
      (() => {
        const pm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const pmEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        return db.contentPost.count({ where: { createdAt: { gte: pm, lte: pmEnd } } });
      })(),
    ]);
    const postChangePct =
      prevMonthPosts === 0
        ? thisMonthPosts > 0 ? 100 : 0
        : Math.round(((thisMonthPosts - prevMonthPosts) / prevMonthPosts) * 100);

    // Average engagement rate across all posts
    const allPosts = await db.contentPost.findMany({
      where: { status: 'published' },
    });
    const totalViewsAll = allPosts.reduce((s, p) => s + p.views, 0);
    const totalEngAll = allPosts.reduce((s, p) => s + p.likes + p.comments + p.shares, 0);
    const avgEngagementRate = totalViewsAll > 0 ? (totalEngAll / totalViewsAll) * 100 : 0;

    // Best performing content
    const topPost = allPosts.length > 0
      ? [...allPosts].sort(
          (a, b) =>
            (b.likes + b.comments * 2 + b.shares * 3) -
            (a.likes + a.comments * 2 + a.shares * 3)
        )[0]
      : null;

    const summary = {
      totalInteractions,
      interactionChangePct,
      thisMonthPosts,
      postChangePct,
      avgEngagementRate: Math.round(avgEngagementRate * 100) / 100,
      bestContent: topPost
        ? {
            title: topPost.topic || '未命名内容',
            engagement: topPost.likes + topPost.comments * 2 + topPost.shares * 3,
          }
        : { title: '暂无内容', engagement: 0 },
    };

    return NextResponse.json({
      range,
      days,
      dates,
      series,
      totals,
      changes,
      summary,
    });
  } catch (error) {
    console.error('Failed to fetch analytics trends:', error);
    return NextResponse.json(
      { error: '获取趋势数据失败' },
      { status: 500 }
    );
  }
}
