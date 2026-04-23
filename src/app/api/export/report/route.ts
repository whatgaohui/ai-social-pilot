import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// ─── Label maps ────────────────────────────────────────────────────────────

const PLATFORM_LABELS: Record<string, string> = {
  wechat: "朋友圈",
  xiaohongshu: "小红书",
};

const STATUS_LABELS: Record<string, string> = {
  planned: "计划中",
  generated: "已生成",
  optimized: "已优化",
  scheduled: "已排期",
  published: "已发布",
};

const CONTENT_LABELS: Record<string, string> = {
  text: "纯文字",
  image: "图文搭配",
  video: "视频动态",
  mixed: "混合内容",
  story: "故事分享",
  insight: "观点洞察",
  interaction: "互动话题",
  seeding: "种草安利",
  review: "好物测评",
  tutorial: "教程攻略",
  drygoods: "干货知识",
  vlog: "生活Vlog",
  daily: "日常分享",
  recommend: "好物推荐",
  collection: "合集清单",
};

// ─── CSV safe escape ──────────────────────────────────────────────────────

function csvEsc(val: string | number | null | undefined): string {
  const s = val == null ? "" : String(val);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return `"${s.replace(/"/g, '""')}"`;
}

// ─── Compute report data ──────────────────────────────────────────────────

interface ReportData {
  periodLabel: string;
  startDate: string;
  endDate: string;
  platformFilter: string;
  overview: {
    totalPosts: number;
    totalInteractions: number;
    avgEngagementRate: number;
    bestPerformingTopic: string;
    bestPerformingEngagement: number;
  };
  typeDistribution: Array<{ type: string; label: string; count: number; pct: number }>;
  topPosts: Array<{
    rank: number;
    date: string;
    platform: string;
    topic: string;
    contentType: string;
    likes: number;
    comments: number;
    shares: number;
    views: number;
    favorites: number;
    engagement: number;
  }>;
  weeklyTrends: Array<{
    weekLabel: string;
    posts: number;
    interactions: number;
    avgEngagementRate: number;
  }>;
}

function computeReport(
  posts: Array<{
    scheduledDate: string;
    platform: string;
    contentType: string;
    topic: string;
    content: string;
    status: string;
    likes: number;
    comments: number;
    shares: number;
    views: number;
    favorites: number;
    aiScore: number;
    createdAt: Date;
  }>,
  periodLabel: string,
  startDate: string,
  endDate: string,
  platformFilter: string
): ReportData {
  const totalPosts = posts.length;
  const totalInteractions = posts.reduce(
    (s, p) => s + p.likes + p.comments + p.shares + (p.favorites || 0),
    0
  );
  const totalViews = posts.reduce((s, p) => s + p.views, 0);
  const avgEngagementRate =
    totalViews > 0
      ? Math.round((totalInteractions / totalViews) * 10000) / 100
      : 0;

  // Best performing post
  const scoredPosts = posts.map((p) => ({
    ...p,
    engagement:
      p.likes + p.comments * 2 + p.shares * 3 + (p.favorites || 0),
  }));
  const best = scoredPosts.sort((a, b) => b.engagement - a.engagement)[0];

  // Type distribution
  const typeMap: Record<string, number> = {};
  posts.forEach((p) => {
    typeMap[p.contentType] = (typeMap[p.contentType] || 0) + 1;
  });
  const typeDistribution = Object.entries(typeMap)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({
      type,
      label: CONTENT_LABELS[type] || type,
      count,
      pct: totalPosts > 0 ? Math.round((count / totalPosts) * 100) : 0,
    }));

  // Top 10 posts
  const topPosts = scoredPosts
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 10)
    .map((p, i) => ({
      rank: i + 1,
      date: p.scheduledDate,
      platform: PLATFORM_LABELS[p.platform] || p.platform,
      topic: p.topic || "无标题",
      contentType: CONTENT_LABELS[p.contentType] || p.contentType,
      likes: p.likes,
      comments: p.comments,
      shares: p.shares,
      views: p.views,
      favorites: p.favorites || 0,
      engagement: p.engagement,
    }));

  // Weekly trends: group by ISO week
  const weekMap: Record<
    string,
    { posts: number; interactions: number; views: number }
  > = {};
  posts.forEach((p) => {
    const d = new Date(p.scheduledDate || p.createdAt);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const weekKey = weekStart.toISOString().slice(0, 10);
    if (!weekMap[weekKey]) {
      weekMap[weekKey] = { posts: 0, interactions: 0, views: 0 };
    }
    weekMap[weekKey].posts += 1;
    weekMap[weekKey].interactions +=
      p.likes + p.comments + p.shares + (p.favorites || 0);
    weekMap[weekKey].views += p.views;
  });

  const weeklyTrends = Object.entries(weekMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekKey, data]) => ({
      weekLabel: `${weekKey} 周`,
      posts: data.posts,
      interactions: data.interactions,
      avgEngagementRate:
        data.views > 0
          ? Math.round((data.interactions / data.views) * 10000) / 100
          : 0,
    }));

  return {
    periodLabel,
    startDate,
    endDate,
    platformFilter: PLATFORM_LABELS[platformFilter] || "全部平台",
    overview: {
      totalPosts,
      totalInteractions,
      avgEngagementRate,
      bestPerformingTopic: best?.topic || "暂无",
      bestPerformingEngagement: best?.engagement || 0,
    },
    typeDistribution,
    topPosts,
    weeklyTrends,
  };
}

// ─── Format as CSV ────────────────────────────────────────────────────────

function formatCSV(report: ReportData): string {
  const BOM = "\uFEFF";
  const lines: string[] = [];

  // Overview section
  lines.push("运营报告概览");
  lines.push(
    `报告周期,${report.periodLabel},时间范围,${report.startDate} ~ ${report.endDate},平台,${report.platformFilter}`
  );
  lines.push(
    `总内容数,${report.overview.totalPosts},总互动量,${report.overview.totalInteractions},平均互动率,${report.overview.avgEngagementRate}%`
  );
  lines.push(
    `最佳表现,"${report.overview.bestPerformingTopic.replace(/"/g, '""')}",互动得分,${report.overview.bestPerformingEngagement}`
  );
  lines.push("");

  // Type distribution
  lines.push("内容类型分布");
  lines.push("类型,数量,占比");
  report.typeDistribution.forEach((t) => {
    lines.push(`${csvEsc(t.label)},${csvEsc(t.count)},${csvEsc(t.pct + "%")}`);
  });
  lines.push("");

  // Top 10 posts
  lines.push("TOP10帖子表现");
  lines.push(
    "排名,日期,平台,主题,类型,点赞,评论,转发,浏览,收藏,互动得分"
  );
  report.topPosts.forEach((p) => {
    lines.push(
      [
        csvEsc(p.rank),
        csvEsc(p.date),
        csvEsc(p.platform),
        csvEsc(p.topic),
        csvEsc(p.contentType),
        csvEsc(p.likes),
        csvEsc(p.comments),
        csvEsc(p.shares),
        csvEsc(p.views),
        csvEsc(p.favorites),
        csvEsc(p.engagement),
      ].join(",")
    );
  });
  lines.push("");

  // Weekly trends
  lines.push("周度趋势数据");
  lines.push("周,内容数,互动量,互动率");
  report.weeklyTrends.forEach((w) => {
    lines.push(
      `${csvEsc(w.weekLabel)},${csvEsc(w.posts)},${csvEsc(w.interactions)},${csvEsc(w.avgEngagementRate + "%")}`
    );
  });

  return BOM + lines.join("\n");
}

// ─── Format as JSON ───────────────────────────────────────────────────────

function formatJSON(report: ReportData): string {
  return JSON.stringify(report, null, 2);
}

// ─── Format as plain text ─────────────────────────────────────────────────

function formatText(report: ReportData): string {
  const divider = "═".repeat(50);
  const thinDivider = "─".repeat(50);
  const lines: string[] = [];

  lines.push(divider);
  lines.push("                    运营报告");
  lines.push(divider);
  lines.push("");
  lines.push(
    `报告周期：${report.periodLabel}    时间范围：${report.startDate} ~ ${report.endDate}`
  );
  lines.push(`平台筛选：${report.platformFilter}`);
  lines.push("");
  lines.push(thinDivider);
  lines.push("  📊 概览");
  lines.push(thinDivider);
  lines.push(`  总内容数：${report.overview.totalPosts} 篇`);
  lines.push(`  总互动量：${report.overview.totalInteractions} 次`);
  lines.push(`  平均互动率：${report.overview.avgEngagementRate}%`);
  lines.push(`  最佳表现：${report.overview.bestPerformingTopic}（互动 ${report.overview.bestPerformingEngagement}）`);
  lines.push("");

  lines.push(thinDivider);
  lines.push("  📋 内容类型分布");
  lines.push(thinDivider);
  report.typeDistribution.forEach((t) => {
    const bar = "█".repeat(Math.round(t.pct / 5)) + "░".repeat(Math.max(0, 20 - Math.round(t.pct / 5)));
    lines.push(`  ${t.label.padEnd(8, "　")} ${bar} ${t.count}篇 (${t.pct}%)`);
  });
  lines.push("");

  lines.push(thinDivider);
  lines.push("  🏆 TOP10 帖子表现");
  lines.push(thinDivider);
  report.topPosts.forEach((p) => {
    const rank =
      p.rank <= 3 ? ["🥇", "🥈", "🥉"][p.rank - 1] : `${String(p.rank).padStart(2)}`;
    lines.push(`  ${rank} [${p.date}] ${p.platform} · ${p.topic}`);
    lines.push(
      `      ♥${p.likes}  💬${p.comments}  ↗${p.shares}  👁${p.views}  ⭐${p.favorites}  总分:${p.engagement}`
    );
  });
  lines.push("");

  lines.push(thinDivider);
  lines.push("  📈 周度趋势");
  lines.push(thinDivider);
  report.weeklyTrends.forEach((w) => {
    lines.push(
      `  ${w.weekLabel.padEnd(14)} ${String(w.posts).padStart(3)}篇  互动${String(w.interactions).padStart(6)}次  互动率${String(w.avgEngagementRate).padStart(6)}%`
    );
  });
  lines.push("");
  lines.push(divider);
  lines.push(
    `  生成时间：${new Date().toLocaleString("zh-CN")}  ·  AI社交运营助手`
  );
  lines.push(divider);

  return lines.join("\n");
}

// ─── GET handler ──────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get("format") || "csv").toLowerCase(); // csv | json | text
    const range = searchParams.get("range") || "30d"; // 7d | 30d | 90d
    const platform = searchParams.get("platform") || "all"; // wechat | xiaohongshu | all

    // Calculate date range
    const now = new Date();
    const startDate = new Date(now);
    if (range === "7d") startDate.setDate(startDate.getDate() - 7);
    else if (range === "30d") startDate.setDate(startDate.getDate() - 30);
    else if (range === "90d") startDate.setDate(startDate.getDate() - 90);

    const periodLabel =
      range === "7d"
        ? "近7天"
        : range === "30d"
          ? "近30天"
          : range === "90d"
            ? "近90天"
            : "全部";

    const startDateStr = startDate.toISOString().slice(0, 10);
    const endDateStr = now.toISOString().slice(0, 10);

    // Build where clause
    const where: Prisma.ContentPostWhereInput = {
      createdAt: { gte: startDate },
    };

    if (platform !== "all") {
      where.platform = platform;
    }

    const posts = await db.contentPost.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // Compute report data
    const report = computeReport(
      posts.map((p) => ({
        scheduledDate: p.scheduledDate,
        platform: p.platform,
        contentType: p.contentType,
        topic: p.topic,
        content: p.content,
        status: p.status,
        likes: p.likes,
        comments: p.comments,
        shares: p.shares,
        views: p.views,
        favorites: p.favorites,
        aiScore: p.aiScore,
        createdAt: p.createdAt,
      })),
      periodLabel,
      startDateStr,
      endDateStr,
      platform
    );

    const today = new Date().toISOString().slice(0, 10);

    // Return based on format
    if (format === "json") {
      return new NextResponse(formatJSON(report), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="operation_report_${range}_${today}.json"`,
          "Cache-Control": "no-cache",
        },
      });
    }

    if (format === "text") {
      return new NextResponse(formatText(report), {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="operation_report_${range}_${today}.txt"`,
          "Cache-Control": "no-cache",
        },
      });
    }

    // Default: CSV
    return new NextResponse(formatCSV(report), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="operation_report_${range}_${today}.csv"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Report export failed:", error);
    return NextResponse.json(
      { error: "运营报告导出失败" },
      { status: 500 }
    );
  }
}
