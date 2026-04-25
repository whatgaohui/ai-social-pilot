import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAIClient } from '@/lib/ai-client';

// ─── Helper: calculate engagement score ─────────────────────────────────────
function engagementScore(p: { likes: number; comments: number; shares: number; favorites?: number }) {
  return p.likes + p.comments * 2 + p.shares * 3 + (p.favorites || 0) * 1.5;
}

// ─── GET /api/trends ────────────────────────────────────────────────────────
// Analyze existing ContentPost data for patterns and trends.
// Supports ?period=week|month|quarter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';

    const now = new Date();
    let daysBack = 30;
    if (period === 'week') daysBack = 7;
    if (period === 'quarter') daysBack = 90;
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysBack);

    // Fetch all posts within date range
    const allPosts = await db.contentPost.findMany({
      where: { createdAt: { gte: startDate } },
      orderBy: { scheduledDate: 'asc' },
    });

    // Fetch tracked competitor accounts
    const competitorAccounts = await db.trackedAccount.findMany({
      where: { isOwn: false },
    });

    const scrapedPosts = allPosts.filter((p) => p.generationType === 'scraped');
    const ownPosts = allPosts.filter((p) => p.generationType !== 'scraped');

    // ── 1. Top performing content types by avg engagement ──
    const typeMap: Record<string, { totalEngagement: number; count: number; totalScore: number; totalViews: number }> = {};
    allPosts.forEach((p) => {
      if (!typeMap[p.contentType]) {
        typeMap[p.contentType] = { totalEngagement: 0, count: 0, totalScore: 0, totalViews: 0 };
      }
      typeMap[p.contentType].totalEngagement += p.likes + p.comments + p.shares;
      typeMap[p.contentType].totalScore += engagementScore(p);
      typeMap[p.contentType].totalViews += p.views;
      typeMap[p.contentType].count++;
    });

    const topContentTypes = Object.entries(typeMap)
      .map(([type, data]) => ({
        type,
        count: data.count,
        avgEngagement: data.count > 0 ? data.totalEngagement / data.count : 0,
        avgScore: data.count > 0 ? data.totalScore / data.count : 0,
        engagementRate: data.totalViews > 0 ? (data.totalEngagement / data.totalViews) * 100 : 0,
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement);

    // ── 2. Best posting times by day/hour ──
    const dayBuckets = new Array(7).fill(0) as number[];    // Mon-Sun
    const hourBuckets = new Array(24).fill(0) as number[];
    const dayEngagement = new Array(7).fill(0) as number[];  // engagement per day
    const hourEngagement = new Array(24).fill(0) as number[];

    allPosts.forEach((p) => {
      const d = new Date(p.scheduledDate || p.createdAt);
      if (isNaN(d.getTime())) return;
      // JS getDay: 0=Sun, convert to Mon=0
      const jsDay = d.getDay();
      const ourDay = jsDay === 0 ? 6 : jsDay - 1;
      const hour = d.getHours();
      const eng = engagementScore(p);

      dayBuckets[ourDay]++;
      hourBuckets[hour]++;
      dayEngagement[ourDay] += eng;
      hourEngagement[hour] += eng;
    });

    const bestDays = dayBuckets.map((count, day) => ({
      day,
      dayLabel: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][day],
      postCount: count,
      avgEngagement: count > 0 ? dayEngagement[day] / count : 0,
    })).sort((a, b) => b.avgEngagement - a.avgEngagement);

    const bestHours = hourBuckets.map((count, hour) => ({
      hour,
      hourLabel: `${String(hour).padStart(2, '0')}:00`,
      postCount: count,
      avgEngagement: count > 0 ? hourEngagement[hour] / count : 0,
    })).filter((h) => h.postCount > 0).sort((a, b) => b.avgEngagement - a.avgEngagement).slice(0, 6);

    // ── 3. Content length vs engagement correlation ──
    const lengthBuckets: Record<string, { totalEngagement: number; count: number }> = {
      short: { totalEngagement: 0, count: 0 },     // 0-100 chars
      medium: { totalEngagement: 0, count: 0 },     // 100-300 chars
      long: { totalEngagement: 0, count: 0 },       // 300-600 chars
      veryLong: { totalEngagement: 0, count: 0 },   // 600+ chars
    };

    allPosts.forEach((p) => {
      const len = p.content.length;
      const eng = engagementScore(p);
      let bucket = 'short';
      if (len > 600) bucket = 'veryLong';
      else if (len > 300) bucket = 'long';
      else if (len > 100) bucket = 'medium';
      lengthBuckets[bucket].totalEngagement += eng;
      lengthBuckets[bucket].count++;
    });

    const lengthCorrelation = Object.entries(lengthBuckets).map(([range, data]) => ({
      range,
      label: { short: '短文 (0-100字)', medium: '中文 (100-300字)', long: '长文 (300-600字)', veryLong: '深度 (600+字)' }[range],
      count: data.count,
      avgEngagement: data.count > 0 ? data.totalEngagement / data.count : 0,
    }));

    // ── 4. Platform-specific trends ──
    const wechatPosts = allPosts.filter((p) => p.platform === 'wechat');
    const xhsPosts = allPosts.filter((p) => p.platform === 'xiaohongshu');

    const platformTrends = {
      wechat: {
        totalPosts: wechatPosts.length,
        avgEngagement: wechatPosts.length > 0
          ? wechatPosts.reduce((s, p) => s + engagementScore(p), 0) / wechatPosts.length : 0,
        topType: topContentTypes.filter((t) => wechatPosts.some((p) => p.contentType === t.type))[0] || null,
      },
      xiaohongshu: {
        totalPosts: xhsPosts.length,
        avgEngagement: xhsPosts.length > 0
          ? xhsPosts.reduce((s, p) => s + engagementScore(p), 0) / xhsPosts.length : 0,
        topType: topContentTypes.filter((t) => xhsPosts.some((p) => p.contentType === t.type))[0] || null,
      },
    };

    // ── 5. Content calendar heatmap data (daily post counts for last 12 weeks) ──
    const heatmapData: Record<string, number> = {};
    for (let i = 83; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      heatmapData[key] = 0;
    }
    allPosts.forEach((p) => {
      const dateKey = (p.scheduledDate || p.createdAt.toISOString()).slice(0, 10);
      if (heatmapData.hasOwnProperty(dateKey)) {
        heatmapData[dateKey]++;
      }
    });

    // ── 6. Trending topics extraction ──
    const topicMap: Record<string, { count: number; totalEngagement: number }> = {};
    allPosts.forEach((p) => {
      if (!p.topic) return;
      const eng = engagementScore(p);
      if (!topicMap[p.topic]) {
        topicMap[p.topic] = { count: 0, totalEngagement: 0 };
      }
      topicMap[p.topic].count++;
      topicMap[p.topic].totalEngagement += eng;
    });

    const trendingTopics = Object.entries(topicMap)
      .map(([topic, data]) => ({
        topic,
        count: data.count,
        avgEngagement: data.count > 0 ? data.totalEngagement / data.count : 0,
        heatScore: data.count * (data.totalEngagement / (data.count || 1)),
      }))
      .sort((a, b) => b.heatScore - a.heatScore)
      .slice(0, 12);

    // ── 7. Weekly patterns ──
    const weeklyData: { weekStart: string; postCount: number; avgEngagement: number }[] = [];
    for (let w = 0; w < Math.ceil(daysBack / 7); w++) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - w * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);
      const startKey = weekStart.toISOString().slice(0, 10);
      const endKey = weekEnd.toISOString().slice(0, 10);

      const weekPosts = allPosts.filter((p) => {
        const d = (p.scheduledDate || p.createdAt.toISOString()).slice(0, 10);
        return d >= startKey && d <= endKey;
      });

      weeklyData.push({
        weekStart: startKey,
        postCount: weekPosts.length,
        avgEngagement: weekPosts.length > 0
          ? weekPosts.reduce((s, p) => s + engagementScore(p), 0) / weekPosts.length : 0,
      });
    }

    // ── Recommendations ──
    const recommendations: string[] = [];
    if (topContentTypes.length > 0) {
      recommendations.push(`最佳内容类型为「${topContentTypes[0].type}」，平均互动 ${topContentTypes[0].avgEngagement.toFixed(1)}`);
    }
    if (bestDays.length > 0 && bestDays[0].postCount > 0) {
      recommendations.push(`${bestDays[0].dayLabel}发布效果最好，平均互动 ${bestDays[0].avgEngagement.toFixed(1)}`);
    }
    if (bestHours.length > 0) {
      recommendations.push(`黄金发布时段为 ${bestHours[0].hourLabel}`);
    }
    const bestLen = lengthCorrelation.filter((l) => l.count > 0).sort((a, b) => b.avgEngagement - a.avgEngagement);
    if (bestLen.length > 0) {
      recommendations.push(`${bestLen[0].label}的内容表现最佳`);
    }

    return NextResponse.json({
      period,
      startDate: startDate.toISOString().slice(0, 10),
      endDate: now.toISOString().slice(0, 10),
      totalPosts: allPosts.length,
      ownPosts: ownPosts.length,
      competitorPosts: scrapedPosts.length,
      trackedCompetitors: competitorAccounts.length,
      topContentTypes,
      bestDays,
      bestHours,
      lengthCorrelation,
      platformTrends,
      heatmapData,
      trendingTopics,
      weeklyData,
      recommendations,
    });
  } catch (error) {
    console.error('Failed to fetch trends:', error);
    return NextResponse.json({ error: '获取趋势数据失败' }, { status: 500 });
  }
}

// ─── POST /api/trends ───────────────────────────────────────────────────────
// AI-powered trend analysis using createAIClient()
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trendData, platform } = body;

    if (!trendData) {
      return NextResponse.json({ error: '缺少趋势数据' }, { status: 400 });
    }

    const ai = await createAIClient();

    const platformLabel = platform === 'xiaohongshu' ? '小红书' : '朋友圈';

    const prompt = `你是一位专业的社交媒体运营分析师。请根据以下${platformLabel}平台的数据分析结果，提供深入的运营洞察和可执行的建议。

## 数据概览
- 总内容数: ${trendData.totalPosts || 0}
- 我的内容: ${trendData.ownPosts || 0}
- 竞品内容: ${trendData.competitorPosts || 0}
- 追踪竞品数: ${trendData.trackedCompetitors || 0}

## 最佳内容类型
${(trendData.topContentTypes || []).map((t: { type: string; avgEngagement: number; count: number }) => `- ${t.type}: 平均互动 ${t.avgEngagement.toFixed(1)}, 数量 ${t.count}`).join('\n')}

## 最佳发布时间
${(trendData.bestDays || []).slice(0, 3).map((d: { dayLabel: string; avgEngagement: number }) => `- ${d.dayLabel}: 平均互动 ${d.avgEngagement.toFixed(1)}`).join('\n')}
${(trendData.bestHours || []).slice(0, 3).map((h: { hourLabel: string; avgEngagement: number }) => `- ${h.hourLabel}: 平均互动 ${h.avgEngagement.toFixed(1)}`).join('\n')}

## 热门话题
${(trendData.trendingTopics || []).slice(0, 6).map((t: { topic: string; heatScore: number }) => `- ${t.topic} (热度: ${t.heatScore.toFixed(0)})`).join('\n')}

## 平台对比
- 朋友圈: ${trendData.platformTrends?.wechat?.totalPosts || 0}篇, 平均互动 ${trendData.platformTrends?.wechat?.avgEngagement?.toFixed(1) || 0}
- 小红书: ${trendData.platformTrends?.xiaohongshu?.totalPosts || 0}篇, 平均互动 ${trendData.platformTrends?.xiaohongshu?.avgEngagement?.toFixed(1) || 0}

## 内容长度分析
${(trendData.lengthCorrelation || []).map((l: { label: string; avgEngagement: number; count: number }) => `- ${l.label}: ${l.count}篇, 平均互动 ${l.avgEngagement.toFixed(1)}`).join('\n')}

请以JSON格式返回你的分析结果，格式如下（不要加markdown代码块标记）：
{
  "summary": "2-3句话的整体趋势总结",
  "contentGaps": [
    { "type": "内容缺口类型", "opportunity": "具体机会描述", "priority": "high|medium|low" }
  ],
  "opportunities": [
    { "title": "机会标题", "description": "详细描述", "expectedImpact": "预期效果" }
  ],
  "weeklyInsight": "本周一句话洞察",
  "nextActions": [
    "具体可执行的下一步行动建议1",
    "具体可执行的下一步行动建议2",
    "具体可执行的下一步行动建议3"
  ]
}`;

    const response = await ai.chatCompletion([
      { role: 'system', content: '你是一位资深的社交媒体运营策略专家，善于从数据中发现机会并给出精准建议。回复必须是合法的JSON格式。' },
      { role: 'user', content: prompt },
    ]);

    // Try to parse JSON from response
    let parsed;
    try {
      // Extract JSON from response (may be wrapped in code blocks)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = JSON.parse(response);
      }
    } catch {
      parsed = {
        summary: response.slice(0, 200),
        contentGaps: [],
        opportunities: [],
        weeklyInsight: '',
        nextActions: [],
      };
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Failed to generate AI trend analysis:', error);
    return NextResponse.json({ error: 'AI趋势分析失败' }, { status: 500 });
  }
}
