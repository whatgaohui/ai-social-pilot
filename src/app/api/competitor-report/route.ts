import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/competitor-report
// Generate a competitive analysis report comparing self vs selected competitors
// Supports ?period=week|month|quarter&competitorIds=id1,id2,id3
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "month";
    const competitorIdsParam = searchParams.get("competitorIds");

    // Calculate date range
    const now = new Date();
    let daysBack = 30;
    if (period === "week") daysBack = 7;
    if (period === "quarter") daysBack = 90;
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysBack);

    // Parse competitor IDs (optional filter)
    const selectedIds = competitorIdsParam
      ? competitorIdsParam.split(",").filter(Boolean)
      : null;

    // Fetch competitor accounts
    const accountWhere = selectedIds
      ? { isOwn: false, id: { in: selectedIds } }
      : { isOwn: false };

    const accounts = await db.trackedAccount.findMany({
      where: accountWhere,
      orderBy: { lastSyncAt: { sort: "desc", nulls: "last" } },
    });

    // Fetch scraped posts (competitor content)
    const scrapedPosts = await db.contentPost.findMany({
      where: {
        generationType: "scraped",
        createdAt: { gte: startDate },
        ...(selectedIds && accounts.length > 0
          ? { platform: { in: accounts.map((a) => a.platform) } }
          : {}),
      },
      orderBy: { scheduledDate: "asc" },
    });

    // Fetch own posts
    const ownPosts = await db.contentPost.findMany({
      where: {
        generationType: { not: "scraped" },
        createdAt: { gte: startDate },
      },
      orderBy: { scheduledDate: "asc" },
    });

    // ── Compute own metrics ──
    const ownTotalPosts = ownPosts.length;
    const ownTotalLikes = ownPosts.reduce((s, p) => s + p.likes, 0);
    const ownTotalComments = ownPosts.reduce((s, p) => s + p.comments, 0);
    const ownTotalShares = ownPosts.reduce((s, p) => s + p.shares, 0);
    const ownTotalViews = ownPosts.reduce((s, p) => s + p.views, 0);
    const ownEngagementRate = ownTotalViews > 0
      ? ((ownTotalLikes + ownTotalComments + ownTotalShares) / ownTotalViews) * 100
      : 0;
    const ownPostsPerWeek = daysBack > 0 ? (ownTotalPosts / daysBack) * 7 : 0;

    // Own content type distribution
    const ownTypeMap: Record<string, number> = {};
    ownPosts.forEach((p) => {
      ownTypeMap[p.contentType] = (ownTypeMap[p.contentType] || 0) + 1;
    });
    const ownTypeDiversity = Object.keys(ownTypeMap).length;

    // Own posting hour distribution
    const ownHourBuckets = new Array(24).fill(0) as number[];
    ownPosts.forEach((p) => {
      const d = new Date(p.scheduledDate || p.createdAt);
      if (!isNaN(d.getTime())) ownHourBuckets[d.getHours()]++;
    });
    const ownPeakHour = ownHourBuckets.indexOf(Math.max(...ownHourBuckets));
    const ownPeakHourCount = Math.max(...ownHourBuckets);

    // Own day-of-week distribution
    const ownDayBuckets = new Array(7).fill(0) as number[];
    ownPosts.forEach((p) => {
      const d = new Date(p.scheduledDate || p.createdAt);
      if (!isNaN(d.getTime())) ownDayBuckets[d.getDay()]++;
    });
    const DAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    const ownBestDay = DAY_LABELS[ownDayBuckets.indexOf(Math.max(...ownDayBuckets))];

    // ── Compute competitor metrics (per competitor) ──
    const competitorReports = accounts.map((account) => {
      // Match scraped posts to this competitor (by platform)
      const accountPosts = scrapedPosts.filter(
        (p) => p.platform === account.platform
      );

      const totalPosts = accountPosts.length;
      const totalLikes = accountPosts.reduce((s, p) => s + p.likes, 0);
      const totalComments = accountPosts.reduce((s, p) => s + p.comments, 0);
      const totalShares = accountPosts.reduce((s, p) => s + p.shares, 0);
      const totalViews = accountPosts.reduce((s, p) => s + p.views, 0);
      const engagementRate = totalViews > 0
        ? ((totalLikes + totalComments + totalShares) / totalViews) * 100
        : 0;
      const postsPerWeek = daysBack > 0 ? (totalPosts / daysBack) * 7 : 0;

      // Content type diversity
      const typeMap: Record<string, number> = {};
      accountPosts.forEach((p) => {
        typeMap[p.contentType] = (typeMap[p.contentType] || 0) + 1;
      });
      const typeDiversity = Object.keys(typeMap).length;
      const topContentTypes = Object.entries(typeMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => ({ type, count }));

      // Posting hour distribution
      const hourBuckets = new Array(24).fill(0) as number[];
      accountPosts.forEach((p) => {
        const d = new Date(p.scheduledDate || p.createdAt);
        if (!isNaN(d.getTime())) hourBuckets[d.getHours()]++;
      });
      const peakHour = hourBuckets.indexOf(Math.max(...hourBuckets));
      const peakHourCount = Math.max(...hourBuckets);

      // Day of week
      const dayBuckets = new Array(7).fill(0) as number[];
      accountPosts.forEach((p) => {
        const d = new Date(p.scheduledDate || p.createdAt);
        if (!isNaN(d.getTime())) dayBuckets[d.getDay()]++;
      });
      const bestDay = DAY_LABELS[dayBuckets.indexOf(Math.max(...dayBuckets))];

      return {
        id: account.id,
        nickname: account.nickname,
        platform: account.platform,
        followers: account.followers,
        totalPosts,
        totalLikes,
        totalComments,
        totalShares,
        totalViews,
        engagementRate: parseFloat(engagementRate.toFixed(2)),
        postsPerWeek: parseFloat(postsPerWeek.toFixed(1)),
        typeDiversity,
        topContentTypes,
        peakHour,
        peakHourCount,
        bestDay,
      };
    });

    // ── Aggregate competitor metrics ──
    const compCount = competitorReports.length;
    const avgCompEngagement = compCount > 0
      ? competitorReports.reduce((s, c) => s + c.engagementRate, 0) / compCount
      : 0;
    const avgCompPostsPerWeek = compCount > 0
      ? competitorReports.reduce((s, c) => s + c.postsPerWeek, 0) / compCount
      : 0;
    const avgCompTypeDiversity = compCount > 0
      ? competitorReports.reduce((s, c) => s + c.typeDiversity, 0) / compCount
      : 0;

    // ── Compute gaps ──
    const frequencyGap = ownPostsPerWeek - avgCompPostsPerWeek;
    const engagementGap = ownEngagementRate - avgCompEngagement;
    const diversityGap = ownTypeDiversity - avgCompTypeDiversity;

    // Best posting time recommendation
    // Combine peak hours across competitors to find gaps
    const compPeakHourBuckets = new Array(24).fill(0) as number[];
    competitorReports.forEach((c) => {
      // Mark the peak hour and surrounding hours
      const start = Math.max(0, c.peakHour - 1);
      const end = Math.min(23, c.peakHour + 1);
      for (let h = start; h <= end; h++) {
        compPeakHourBuckets[h] += c.peakHourCount;
      }
    });

    // Find the best own posting hours that competitors DON'T dominate
    const bestOwnHours: number[] = [];
    for (let h = 0; h < 24; h++) {
      const compPressure = compPeakHourBuckets[h];
      const ownActivity = ownHourBuckets[h];
      // If competitor pressure is low and own activity is moderate, it's a good slot
      if (compPressure < avgCompPostsPerWeek * 2 && ownActivity > 0) {
        bestOwnHours.push(h);
      }
    }
    // Fallback to own peak hour
    const recommendedHours = bestOwnHours.length > 0
      ? bestOwnHours.slice(0, 3)
      : [ownPeakHour];

    // ── Generate recommendations ──
    const recommendations: Array<{
      type: "strength" | "weakness" | "opportunity" | "action";
      title: string;
      description: string;
      priority: "high" | "medium" | "low";
    }> = [];

    // Posting frequency analysis
    if (frequencyGap < -1) {
      recommendations.push({
        type: "weakness",
        title: "发布频率不足",
        description: `你的周均发布频率（${ownPostsPerWeek.toFixed(1)}篇/周）低于竞品平均（${avgCompPostsPerWeek.toFixed(1)}篇/周），差距 ${Math.abs(frequencyGap).toFixed(1)} 篇。建议增加发布频率以保持账号活跃度。`,
        priority: "high",
      });
    } else if (frequencyGap > 1) {
      recommendations.push({
        type: "strength",
        title: "发布频率领先",
        description: `你的周均发布频率（${ownPostsPerWeek.toFixed(1)}篇/周）领先竞品平均（${avgCompPostsPerWeek.toFixed(1)}篇/周）${frequencyGap.toFixed(1)} 篇，保持稳定的输出节奏。`,
        priority: "low",
      });
    }

    // Engagement analysis
    if (engagementGap < -1) {
      recommendations.push({
        type: "weakness",
        title: "互动率需提升",
        description: `你的平均互动率（${ownEngagementRate.toFixed(2)}%）低于竞品平均（${avgCompEngagement.toFixed(2)}%），差距 ${(Math.abs(engagementGap)).toFixed(2)}%。建议优化内容标题、封面质量，增加互动引导语。`,
        priority: "high",
      });
    } else if (engagementGap > 1) {
      recommendations.push({
        type: "strength",
        title: "互动率领先",
        description: `你的平均互动率（${ownEngagementRate.toFixed(2)}%）领先竞品平均（${avgCompEngagement.toFixed(2)}%），用户参与度较高。`,
        priority: "low",
      });
    }

    // Content diversity
    if (diversityGap < -1) {
      recommendations.push({
        type: "opportunity",
        title: "丰富内容类型",
        description: `你目前使用了 ${ownTypeDiversity} 种内容类型，竞品平均使用 ${avgCompTypeDiversity.toFixed(1)} 种。建议尝试新的内容形式（如视频、互动话题等）来吸引更多受众。`,
        priority: "medium",
      });
    } else {
      recommendations.push({
        type: "strength",
        title: "内容类型丰富",
        description: `你使用了 ${ownTypeDiversity} 种内容类型，内容生态较为丰富。`,
        priority: "low",
      });
    }

    // Posting time strategy
    if (recommendedHours.length > 0) {
      const hoursStr = recommendedHours.map((h) => `${h}:00`).join("、");
      recommendations.push({
        type: "action",
        title: "优化发布时间",
        description: `竞品在高竞争时段集中发布，建议错峰发布。推荐发布时间：${hoursStr}。你的最佳发布日为${ownBestDay}。`,
        priority: "medium",
      });
    }

    // Best practices from top competitor
    if (competitorReports.length > 0) {
      const topComp = [...competitorReports].sort((a, b) => b.engagementRate - a.engagementRate)[0];
      const topTypes = topComp.topContentTypes.slice(0, 2).map((t) => t.type).join("、");
      recommendations.push({
        type: "opportunity",
        title: `学习竞品「${topComp.nickname}」`,
        description: `该竞品互动率最高（${topComp.engagementRate}%），每周发布 ${topComp.postsPerWeek} 篇，擅长${topTypes}类型内容，最佳发布时间 ${topComp.peakHour}:00。`,
        priority: "medium",
      });
    }

    // General improvement tips
    if (ownTotalPosts < 10) {
      recommendations.push({
        type: "action",
        title: "增加内容积累",
        description: `分析周期内仅发布 ${ownTotalPosts} 条内容，数据样本较少可能导致分析不准确。建议保持每周至少 3-5 篇的发布节奏。`,
        priority: "high",
      });
    }

    if (recommendations.length < 3) {
      recommendations.push({
        type: "action",
        title: "持续关注竞品动态",
        description: "定期追踪竞品的内容策略变化，及时调整自身运营方向。关注高互动内容的共性特征，将其融入自己的创作中。",
        priority: "low",
      });
    }

    // ── Summary scores ──
    const overallScore = Math.min(100, Math.max(0, Math.round(
      50 +
      (engagementGap > 0 ? engagementGap * 5 : engagementGap * 8) +
      (frequencyGap > 0 ? frequencyGap * 3 : frequencyGap * 5) +
      (diversityGap > 0 ? diversityGap * 4 : diversityGap * 3)
    )));

    const rating =
      overallScore >= 80
        ? "优秀"
        : overallScore >= 65
          ? "良好"
          : overallScore >= 50
            ? "一般"
            : "待改进";

    // ── Build report ──
    const report = {
      generatedAt: new Date().toISOString(),
      period,
      startDate: startDate.toISOString().slice(0, 10),
      endDate: now.toISOString().slice(0, 10),
      overallScore,
      rating,
      summary: {
        totalCompetitors: compCount,
        frequencyGap: parseFloat(frequencyGap.toFixed(1)),
        engagementGap: parseFloat(engagementGap.toFixed(2)),
        diversityGap: parseFloat(diversityGap.toFixed(1)),
      },
      own: {
        totalPosts: ownTotalPosts,
        avgEngagementRate: parseFloat(ownEngagementRate.toFixed(2)),
        postsPerWeek: parseFloat(ownPostsPerWeek.toFixed(1)),
        typeDiversity: ownTypeDiversity,
        peakHour: ownPeakHour,
        peakHourCount: ownPeakHourCount,
        bestDay: ownBestDay,
        topContentTypes: Object.entries(ownTypeMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([type, count]) => ({ type, count })),
      },
      competitorAverage: {
        avgEngagementRate: parseFloat(avgCompEngagement.toFixed(2)),
        avgPostsPerWeek: parseFloat(avgCompPostsPerWeek.toFixed(1)),
        avgTypeDiversity: parseFloat(avgCompTypeDiversity.toFixed(1)),
        peakHour: competitorReports.length > 0
          ? competitorReports.reduce((s, c) => s + c.peakHour, 0) / compCount
          : 0,
      },
      competitors: competitorReports,
      recommendations: recommendations.sort((a, b) => {
        const prio = { high: 0, medium: 1, low: 2 };
        return prio[a.priority] - prio[b.priority];
      }),
      bestPostingTimes: recommendedHours,
      postingFrequencyGap: {
        own: parseFloat(ownPostsPerWeek.toFixed(1)),
        competitorAvg: parseFloat(avgCompPostsPerWeek.toFixed(1)),
        gap: parseFloat(frequencyGap.toFixed(1)),
        unit: "篇/周",
      },
      engagementGap: {
        own: parseFloat(ownEngagementRate.toFixed(2)),
        competitorAvg: parseFloat(avgCompEngagement.toFixed(2)),
        gap: parseFloat(engagementGap.toFixed(2)),
        unit: "%",
      },
      contentTypeDiversity: {
        own: ownTypeDiversity,
        competitorAvg: parseFloat(avgCompTypeDiversity.toFixed(1)),
        gap: parseFloat(diversityGap.toFixed(1)),
        unit: "种",
      },
    };

    return NextResponse.json(report);
  } catch (error) {
    console.error("Failed to generate competitor report:", error);
    return NextResponse.json(
      { error: "生成竞争分析报告失败" },
      { status: 500 }
    );
  }
}
