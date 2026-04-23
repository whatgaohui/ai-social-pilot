"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendChart,
  MiniPieChart,
  ComparisonBar,
  MiniBarChart,
  SparkLine,
  ProgressRing,
} from "@/components/charts";
import { formatNumber, CHART_PALETTE } from "@/lib/chart-utils";
import {
  TrendingUp,
  BarChart3,
  PieChart as PieIcon,
  GitCompareArrows,
  Calendar,
  Lightbulb,
  Sparkles,
  Zap,
  Target,
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────────

function getWeekDates() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function getLastWeekDates() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - ((dayOfWeek + 6) % 7 + 7));
  lastMonday.setHours(0, 0, 0, 0);
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(lastMonday);
    d.setDate(lastMonday.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  return `周${weekdays[d.getDay()]}`;
}

// ─── AI Insights (mock) ────────────────────────────────────────────────────────

const MOCK_INSIGHTS = [
  {
    icon: <TrendingUp className="h-4 w-4 text-emerald-500 flex-shrink-0" />,
    title: "互动趋势向好",
    text: "本周互动量较上周有明显增长，建议继续保持当前发布节奏，重点关注周三和周五的高互动时段。",
  },
  {
    icon: <Target className="h-4 w-4 text-violet-500 flex-shrink-0" />,
    title: "内容类型优化",
    text: "图文搭配内容表现最佳，占比 45% 但贡献了 62% 的互动。可适当增加此类内容比例。",
  },
  {
    icon: <Zap className="h-4 w-4 text-amber-500 flex-shrink-0" />,
    title: "发布频率建议",
    text: "日均发布 2.1 条，略低于最佳频率 3 条/天。建议增加轻量互动类内容以提升曝光。",
  },
];

// ─── Weekly Analytics Component ─────────────────────────────────────────────────

export function WeeklyAnalytics() {
  const contentPosts = useAppStore((s) => s.contentPosts);
  const platform = useAppStore((s) => s.platform);

  const thisWeekDates = useMemo(() => getWeekDates(), []);
  const lastWeekDates = useMemo(() => getLastWeekDates(), []);

  const data = useMemo(() => {
    const thisPosts = contentPosts.filter((p) =>
      thisWeekDates.includes(p.createdAt.slice(0, 10))
    );
    const lastPosts = contentPosts.filter((p) =>
      lastWeekDates.includes(p.createdAt.slice(0, 10))
    );

    // Per-day engagement for this week
    const dailyEngagement = thisWeekDates.map((date) => {
      const dayPosts = thisPosts.filter((p) => p.createdAt.slice(0, 10) === date);
      return {
        label: getDayLabel(date),
        value: dayPosts.reduce((s, p) => s + p.likes + p.comments * 2 + p.shares * 3, 0),
      };
    });

    // Per-day engagement for last week
    const lastDailyEngagement = lastWeekDates.map((date) => {
      const dayPosts = lastPosts.filter((p) => p.createdAt.slice(0, 10) === date);
      return dayPosts.reduce((s, p) => s + p.likes + p.comments * 2 + p.shares * 3, 0);
    });

    // Posts per day this week
    const postsPerDay = thisWeekDates.map((date) => ({
      label: getDayLabel(date),
      value: thisPosts.filter((p) => p.createdAt.slice(0, 10) === date).length,
    }));

    // Platform split
    const wcPosts = thisPosts.filter((p) => !p.platform || p.platform === "wechat");
    const xhsPosts = thisPosts.filter((p) => p.platform === "xiaohongshu");
    const platformData = [
      { label: "朋友圈", value: wcPosts.length || 1, color: "#10b981" },
      { label: "小红书", value: xhsPosts.length || 1, color: "#f43f5e" },
    ];
    if (wcPosts.length === 0 && xhsPosts.length === 0) {
      platformData[0].value = 1;
      platformData[1].value = 0;
    }

    // Week-over-week comparison metrics
    const thisTotalLikes = thisPosts.reduce((s, p) => s + p.likes, 0);
    const lastTotalLikes = lastPosts.reduce((s, p) => s + p.likes, 0);
    const thisTotalComments = thisPosts.reduce((s, p) => s + p.comments, 0);
    const lastTotalComments = lastPosts.reduce((s, p) => s + p.comments, 0);
    const thisTotalShares = thisPosts.reduce((s, p) => s + p.shares, 0);
    const lastTotalShares = lastPosts.reduce((s, p) => s + p.shares, 0);
    const thisTotalViews = thisPosts.reduce((s, p) => s + p.views, 0);
    const lastTotalViews = lastPosts.reduce((s, p) => s + p.views, 0);

    const comparisonItems = [
      { label: "点赞数", current: thisTotalLikes, previous: lastTotalLikes },
      { label: "评论数", current: thisTotalComments, previous: lastTotalComments },
      { label: "转发数", current: thisTotalShares, previous: lastTotalShares },
      { label: "浏览量", current: thisTotalViews, previous: lastTotalViews },
    ];

    // Content type distribution for horizontal bars
    const typeDist: Record<string, number> = {};
    thisPosts.forEach((p) => {
      typeDist[p.contentType] = (typeDist[p.contentType] || 0) + 1;
    });
    const labels: Record<string, string> =
      platform === "xiaohongshu"
        ? { seeding: "种草", review: "测评", tutorial: "教程", drygoods: "干货", vlog: "Vlog", daily: "日常", recommend: "推荐", collection: "合集" }
        : { text: "纯文字", image: "图文", video: "视频", mixed: "混合", story: "故事", insight: "观点", interaction: "互动" };
    const topContentTypes = Object.entries(typeDist)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ label: labels[type] || type, value: count }));

    // Overall completion rate
    const totalEngagement = thisPosts.reduce(
      (s, p) => s + p.likes + p.comments * 2 + p.shares * 3, 0
    );
    const completionScore = Math.min(
      Math.round((totalEngagement / Math.max(thisPosts.length * 100, 1)) * 100),
      100
    );

    return {
      dailyEngagement,
      postsPerDay,
      platformData,
      comparisonItems,
      topContentTypes,
      completionScore,
      sparkData: dailyEngagement.map((d) => d.value),
      thisPostCount: thisPosts.length,
      lastPostCount: lastPosts.length,
    };
  }, [contentPosts, platform, thisWeekDates, lastWeekDates]);

  return (
    <div className="p-4 space-y-4 chart-entrance">
      {/* 1. Weekly Trend: daily engagement over 7 days */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4 text-violet-500" />
            本周互动趋势
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <TrendChart data={data.dailyEngagement} color="#8b5cf6" height={160} showGrid />
        </CardContent>
      </Card>

      {/* 2. Platform split + Performance ring */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border shadow-sm">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="flex items-center gap-2 text-xs font-semibold">
              <PieIcon className="h-3.5 w-3.5 text-rose-500" />
              平台分布
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 flex items-center justify-center">
            <MiniPieChart
              data={data.platformData}
              size={110}
              centerText={String(data.thisPostCount)}
            />
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="flex items-center gap-2 text-xs font-semibold">
              <Target className="h-3.5 w-3.5 text-cyan-500" />
              运营完成度
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 flex items-center justify-center">
            <ProgressRing value={data.completionScore} size={110} strokeWidth={8} color="#8b5cf6" />
          </CardContent>
        </Card>
      </div>

      {/* 3. Performance comparison: this week vs last week */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <GitCompareArrows className="h-4 w-4 text-emerald-500" />
            周环比对比
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <ComparisonBar items={data.comparisonItems} />
        </CardContent>
      </Card>

      {/* 4. Day-by-day breakdown: posts per day */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Calendar className="h-4 w-4 text-amber-500" />
            每日发布量
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <MiniBarChart data={data.postsPerDay} color="#f59e0b" height={120} />
        </CardContent>
      </Card>

      {/* 5. Top content types: horizontal bars */}
      {data.topContentTypes.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <BarChart3 className="h-4 w-4 text-purple-500" />
              热门内容类型
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <MiniBarChart data={data.topContentTypes} color="#a855f7" height={120} />
          </CardContent>
        </Card>
      )}

      {/* 6. Quick insights: AI-generated insight cards */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-violet-500" />
            AI 洞察
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-2.5">
          {MOCK_INSIGHTS.map((insight, i) => (
            <motion.div
              key={insight.title}
              className="insight-card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
            >
              <div className="flex items-start gap-2.5">
                {insight.icon}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground mb-0.5">{insight.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{insight.text}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>

      {/* 7. Weekly summary sparkline cards */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            周度概览
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="metric-card">
              <p className="text-[10px] text-muted-foreground mb-1">本周发布</p>
              <div className="flex items-end justify-between">
                <span className="text-base font-bold tabular-nums">{data.thisPostCount}</span>
                <div className="metric-sparkline">
                  <SparkLine data={data.sparkData} color="#8b5cf6" width={48} height={18} />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                上周 {data.lastPostCount} 条
              </p>
            </div>
            <div className="metric-card">
              <p className="text-[10px] text-muted-foreground mb-1">互动总量</p>
              <div className="flex items-end justify-between">
                <span className="text-base font-bold tabular-nums">
                  {formatNumber(data.dailyEngagement.reduce((s, d) => s + d.value, 0))}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {data.thisPostCount > 0
                  ? `平均 ${formatNumber(Math.round(data.dailyEngagement.reduce((s, d) => s + d.value, 0) / data.thisPostCount))}/条`
                  : "暂无数据"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
