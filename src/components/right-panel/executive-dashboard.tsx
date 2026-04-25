"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  LineChartAdvanced,
  KpiSparkline,
  type TrendSeries,
} from "@/components/charts/line-chart";
import { formatNumber, CHART_PALETTE } from "@/lib/chart-utils";
import {
  TrendingUp,
  TrendingDown,
  Heart,
  MessageSquare,
  Share2,
  Eye,
  Users,
  Target,
  Zap,
  BarChart3,
  Sparkles,
  Calendar,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Brain,
  Clock,
  ChevronRight,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { MockDataBanner } from "@/components/ui/mock-data-banner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrendData {
  range: string;
  days: number;
  dates: string[];
  series: TrendSeries[];
  totals: Record<string, number>;
  changes: Record<string, number>;
}

interface KpiCardData {
  label: string;
  value: number;
  change: number;
  sparkline: number[];
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  format?: "number" | "percent";
}

type TrendRange = "7d" | "30d" | "90d";

const RANGE_OPTIONS: { value: TrendRange; label: string }[] = [
  { value: "7d", label: "7天" },
  { value: "30d", label: "30天" },
  { value: "90d", label: "90天" },
];

// ─── Helper: Format number compactly ──────────────────────────────────────────

function fmt(n: number): string {
  return formatNumber(n);
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function ExecutiveSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {/* Range selector */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-48 rounded-lg" />
      </div>
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      {/* Trend chart */}
      <Skeleton className="h-52 rounded-xl" />
      {/* Health score + quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
      </div>
      {/* Week comparison */}
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

// ─── Main Executive Dashboard ─────────────────────────────────────────────────

export function ExecutiveDashboard() {
  const contentPosts = useAppStore((s) => s.contentPosts);
  const platform = useAppStore((s) => s.platform);

  const [range, setRange] = useState<TrendRange>("7d");
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch trend data from API
  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/analytics/trends?range=${range}&metrics=likes,comments,shares,views`
        );
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setTrendData(data);
        }
      } catch {
        // Silently fail — use client-side fallback
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [range]);

  // ── KPI Cards ────────────────────────────────────────────────────────

  const kpiCards: KpiCardData[] = useMemo(() => {
    if (!trendData) {
      // Client-side fallback from store data
      const totalInteractions = contentPosts.reduce(
        (s, p) => s + p.likes + p.comments + p.shares,
        0
      );
      const totalViews = contentPosts.reduce((s, p) => s + p.views, 0);
      const avgEngagement =
        totalViews > 0
          ? Math.round((totalInteractions / totalViews) * 100)
          : 0;
      return [
        {
          label: "今日互动总量",
          value: totalInteractions,
          change: 0,
          sparkline: [],
          icon: Heart,
          color: "text-rose-500",
          bgColor: "bg-rose-50 dark:bg-rose-950/30",
        },
        {
          label: "本周增长率",
          value: 0,
          change: 0,
          sparkline: [],
          icon: TrendingUp,
          color: "text-emerald-500",
          bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
          format: "percent",
        },
        {
          label: "月度目标进度",
          value: 0,
          change: 0,
          sparkline: [],
          icon: Target,
          color: "text-violet-500",
          bgColor: "bg-violet-50 dark:bg-violet-950/30",
          format: "percent",
        },
        {
          label: "粉丝净增",
          value: 0,
          change: 0,
          sparkline: [],
          icon: Users,
          color: "text-amber-500",
          bgColor: "bg-amber-50 dark:bg-amber-950/30",
        },
      ];
    }

    const { totals, changes, series } = trendData;
    const totalInteractions = (totals.likes || 0) + (totals.comments || 0) + (totals.shares || 0);

    // Extract sparkline data: take last 7 values from each series
    const likeSpark = (series.find((s) => s.name === "点赞")?.data || []).slice(-7);
    const commentSpark = (series.find((s) => s.name === "评论")?.data || []).slice(-7);
    const shareSpark = (series.find((s) => s.name === "转发")?.data || []).slice(-7);
    const viewSpark = (series.find((s) => s.name === "浏览")?.data || []).slice(-7);

    // Compute week over week change for interactions
    const half = Math.floor((trendData.dates.length) / 2);
    const allSeriesCombined = series.reduce<number[]>((acc, s) => {
      if (acc.length === 0) return [...s.data];
      return acc.map((v, i) => v + (s.data[i] || 0));
    }, []);

    const recentSum = allSeriesCombined.slice(half).reduce((a, b) => a + b, 0);
    const prevSum = allSeriesCombined.slice(0, half).reduce((a, b) => a + b, 0);
    const weekChange =
      prevSum === 0
        ? recentSum > 0
          ? 100
          : 0
        : Math.round(((recentSum - prevSum) / prevSum) * 100);

    return [
      {
        label: "互动总量",
        value: totalInteractions,
        change: changes.likes ? Math.round((changes.likes + changes.comments + changes.shares) / 3) : 0,
        sparkline: likeSpark,
        icon: Heart,
        color: "text-rose-500",
        bgColor: "bg-rose-50 dark:bg-rose-950/30",
      },
      {
        label: "浏览总量",
        value: totals.views || 0,
        change: changes.views || 0,
        sparkline: viewSpark,
        icon: Eye,
        color: "text-violet-500",
        bgColor: "bg-violet-50 dark:bg-violet-950/30",
      },
      {
        label: "互动率趋势",
        value: totalViews(trendData),
        change: weekChange,
        sparkline: allSeriesCombined.slice(-7),
        icon: TrendingUp,
        color: "text-emerald-500",
        bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
      },
      {
        label: "粉丝净增",
        value: Math.round((changes.likes || 0) * 0.3),
        change: changes.likes || 0,
        sparkline: shareSpark,
        icon: Users,
        color: "text-amber-500",
        bgColor: "bg-amber-50 dark:bg-amber-950/30",
      },
    ];
  }, [trendData, contentPosts]);

  // ── Content Health Score ──────────────────────────────────────────────

  const healthScore = useMemo(() => {
    const posts = contentPosts;
    if (posts.length === 0) return { score: 0, label: "暂无数据", level: "none" };

    // Factor 1: Publishing frequency (0-30 points)
    const now = new Date();
    const recentPosts = posts.filter((p) => {
      const d = new Date(p.createdAt);
      const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
      return diff <= 7;
    });
    const freqScore = Math.min(Math.round((recentPosts.length / 7) * 30), 30);

    // Factor 2: Engagement rate (0-40 points)
    const totalViews = posts.reduce((s, p) => s + p.views, 0);
    const totalInteractions = posts.reduce(
      (s, p) => s + p.likes + p.comments + p.shares,
      0
    );
    const engagementRate =
      totalViews > 0 ? (totalInteractions / totalViews) * 100 : 0;
    const engScore = Math.min(Math.round(engagementRate * 4), 40);

    // Factor 3: Content diversity (0-30 points)
    const uniqueTypes = new Set(posts.map((p) => p.contentType)).size;
    const diversityScore = Math.min(Math.round(uniqueTypes * 6), 30);

    const total = freqScore + engScore + diversityScore;

    const level =
      total >= 80
        ? "excellent"
        : total >= 60
          ? "good"
          : total >= 40
            ? "fair"
            : "poor";

    const labelMap: Record<string, string> = {
      excellent: "内容生态极佳",
      good: "内容健康良好",
      fair: "内容有待优化",
      poor: "内容需要关注",
      none: "暂无数据",
    };

    return {
      score: total,
      label: labelMap[level] || "暂无数据",
      level,
      details: [
        { name: "发布频率", value: freqScore, max: 30 },
        { name: "互动质量", value: engScore, max: 40 },
        { name: "内容多样性", value: diversityScore, max: 30 },
      ],
    };
  }, [contentPosts]);

  // ── Week Comparison Data ──────────────────────────────────────────────

  const weekComparison = useMemo(() => {
    if (!trendData || trendData.dates.length < 7) return null;

    const { dates, series } = trendData;
    const len = dates.length;

    // Split into 3 segments (roughly)
    const segmentSize = Math.floor(len / 3);
    const segments = [
      dates.slice(0, segmentSize),
      dates.slice(segmentSize, segmentSize * 2),
      dates.slice(segmentSize * 2),
    ];
    const labels = ["上上周", "上周", "本周"];

    // Compute totals per segment for interactions
    const segmentTotals = segments.map((seg) => {
      const startIdx = dates.indexOf(seg[0]);
      const endIdx = startIdx + seg.length;
      return series.reduce<number>((acc, s) => {
        const sum = s.data.slice(startIdx, endIdx).reduce((a, b) => a + b, 0);
        return acc + sum;
      }, 0);
    });

    return { labels, values: segmentTotals };
  }, [trendData]);

  // ── Quick Actions ─────────────────────────────────────────────────────

  const handleQuickAction = useCallback((action: string) => {
    toast.info(`${action}功能即将开放`, {
      description: "AI 正在处理您的请求...",
      duration: 2000,
    });
  }, []);

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <MockDataBanner />
        {/* Header with range selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Activity className="h-3.5 w-3.5 text-white" />
            </div>
            <h3 className="text-sm font-bold">执行仪表盘</h3>
          </div>
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted/60">
            {RANGE_OPTIONS.map((opt) => (
              <motion.button
                key={opt.value}
                className={`relative px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  range === opt.value
                    ? "text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setRange(opt.value)}
                whileTap={{ scale: 0.95 }}
              >
                {range === opt.value && (
                  <motion.div
                    className="absolute inset-0 rounded-md bg-gradient-to-r from-violet-500 to-purple-600"
                    layoutId="exec-range-bg"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{opt.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {loading && !trendData ? (
          <ExecutiveSkeleton />
        ) : (
          <>
            {/* ── 1. KPI Cards Row ──────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3">
              {kpiCards.map((kpi, i) => {
                const Icon = kpi.icon;
                const isPositive = kpi.change >= 0;
                return (
                  <motion.div
                    key={kpi.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: i * 0.08 }}
                    whileHover={{ y: -2, transition: { duration: 0.2 } }}
                  >
                    <Card className="border-0 shadow-sm overflow-hidden relative">
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${kpi.bgColor} opacity-50`}
                      />
                      <CardContent className="p-3 relative">
                        <div className="flex items-start justify-between mb-2">
                          <div
                            className={`h-7 w-7 rounded-lg ${kpi.bgColor} flex items-center justify-center`}
                          >
                            <Icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                          </div>
                          {kpi.change !== 0 && (
                            <span
                              className={`flex items-center gap-0.5 text-[9px] font-semibold ${
                                isPositive ? "text-emerald-500" : "text-rose-500"
                              }`}
                            >
                              {isPositive ? (
                                <ArrowUpRight className="h-3 w-3" />
                              ) : (
                                <ArrowDownRight className="h-3 w-3" />
                              )}
                              {Math.abs(kpi.change)}%
                            </span>
                          )}
                        </div>
                        <p className="text-base font-bold tabular-nums leading-tight">
                          {kpi.format === "percent"
                            ? `${kpi.value}%`
                            : fmt(kpi.value)}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {kpi.label}
                        </p>
                        {/* Sparkline */}
                        {kpi.sparkline.length > 1 && (
                          <div className="mt-2">
                            <KpiSparkline
                              data={kpi.sparkline}
                              color={
                                kpi.color.includes("rose")
                                  ? "#f43f5e"
                                  : kpi.color.includes("emerald")
                                    ? "#10b981"
                                    : kpi.color.includes("violet")
                                      ? "#8b5cf6"
                                      : "#f59e0b"
                              }
                              width={72}
                              height={24}
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* ── 2. Trend Line Chart ────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <Card className="border-0 shadow-sm">
                <CardHeader className="p-3 pb-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-violet-500" />
                      <CardTitle className="text-xs font-semibold">
                        互动趋势
                      </CardTitle>
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-[9px] h-4 px-1.5"
                    >
                      {trendData ? `${trendData.days}天` : "7天"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-3">
                  {trendData && trendData.series.length > 0 ? (
                    <LineChartAdvanced
                      series={trendData.series}
                      labels={trendData.dates}
                      height={200}
                      showLegend
                      showGrid
                      smooth
                      showAreaGradient
                      showDataPoints
                      showTooltip
                    />
                  ) : (
                    <div className="h-48 flex items-center justify-center text-muted-foreground text-xs">
                      暂无趋势数据
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* ── 3. Health Score + Quick Actions ────────────────────── */}
            <div className="grid grid-cols-2 gap-3">
              {/* Health Score */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
                <Card className="border-0 shadow-sm overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/60 via-background to-teal-50/40 dark:from-emerald-950/20 dark:via-background dark:to-teal-950/10" />
                  <CardContent className="p-3 relative">
                    <div className="flex items-center gap-1.5 mb-3">
                      <Activity className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-xs font-semibold">内容健康度</span>
                    </div>
                    {/* Score ring */}
                    <div className="flex items-center justify-center mb-2">
                      <div className="relative">
                        <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
                          <circle
                            cx="40"
                            cy="40"
                            r="34"
                            fill="none"
                            className="stroke-muted/20"
                            strokeWidth="6"
                          />
                          <motion.circle
                            cx="40"
                            cy="40"
                            r="34"
                            fill="none"
                            stroke={
                              healthScore.level === "excellent"
                                ? "#10b981"
                                : healthScore.level === "good"
                                  ? "#f59e0b"
                                  : "#f43f5e"
                            }
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 34}`}
                            initial={{ strokeDashoffset: 2 * Math.PI * 34 }}
                            animate={{
                              strokeDashoffset:
                                2 * Math.PI * 34 -
                                (healthScore.score / 100) * 2 * Math.PI * 34,
                            }}
                            transition={{ duration: 1, ease: "easeOut" }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <motion.span
                            className="text-lg font-bold tabular-nums"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                          >
                            {healthScore.score}
                          </motion.span>
                        </div>
                      </div>
                    </div>
                    <p
                      className={`text-center text-[10px] font-medium ${
                        healthScore.level === "excellent"
                          ? "text-emerald-500"
                          : healthScore.level === "good"
                            ? "text-amber-500"
                            : "text-rose-500"
                      }`}
                    >
                      {healthScore.label}
                    </p>
                    {/* Detail bars */}
                    {healthScore.details && (
                      <div className="mt-2.5 space-y-1.5">
                        {healthScore.details.map((d) => (
                          <div key={d.name} className="space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] text-muted-foreground">
                                {d.name}
                              </span>
                              <span className="text-[9px] tabular-nums text-muted-foreground">
                                {d.value}/{d.max}
                              </span>
                            </div>
                            <Progress
                              value={(d.value / d.max) * 100}
                              className="h-1"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.45 }}
              >
                <Card className="border-0 shadow-sm overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-50/60 via-background to-purple-50/40 dark:from-violet-950/20 dark:via-background dark:to-purple-950/10" />
                  <CardContent className="p-3 relative space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-violet-500" />
                      <span className="text-xs font-semibold">快速操作</span>
                    </div>
                    {[
                      {
                        icon: FileText,
                        label: "一键生成报告",
                        color: "text-violet-500",
                        bg: "bg-violet-50 dark:bg-violet-950/30",
                        action: "生成报告",
                      },
                      {
                        icon: Calendar,
                        label: "一键智能排期",
                        color: "text-emerald-500",
                        bg: "bg-emerald-50 dark:bg-emerald-950/30",
                        action: "智能排期",
                      },
                      {
                        icon: Brain,
                        label: "AI 深度分析",
                        color: "text-amber-500",
                        bg: "bg-amber-50 dark:bg-amber-950/30",
                        action: "深度分析",
                      },
                      {
                        icon: Clock,
                        label: "最佳发布时间",
                        color: "text-rose-500",
                        bg: "bg-rose-50 dark:bg-rose-950/30",
                        action: "发布时间分析",
                      },
                    ].map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <motion.button
                          key={item.label}
                          className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group text-left"
                          onClick={() => handleQuickAction(item.action)}
                          initial={{ opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: 0.5 + i * 0.06 }}
                          whileHover={{ x: 2 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div
                            className={`h-7 w-7 rounded-lg ${item.bg} flex items-center justify-center flex-shrink-0`}
                          >
                            <Icon
                              className={`h-3.5 w-3.5 ${item.color}`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] font-medium">
                              {item.label}
                            </span>
                          </div>
                          <ChevronRight className="h-3 w-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </motion.button>
                      );
                    })}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* ── 4. Week Comparison Panel ────────────────────────────── */}
            {weekComparison && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 }}
              >
                <Card className="border-0 shadow-sm">
                  <CardHeader className="p-3 pb-0">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-violet-500" />
                      <CardTitle className="text-xs font-semibold">
                        趋势对比
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3">
                    <WeekComparisonBars
                      labels={weekComparison.labels}
                      values={weekComparison.values}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </>
        )}
      </div>
    </ScrollArea>
  );
}

// ─── Week Comparison Bars ────────────────────────────────────────────────────

function WeekComparisonBars({
  labels,
  values,
}: {
  labels: string[];
  values: number[];
}) {
  const maxVal = useMemo(() => Math.max(...values, 1), [values]);
  const colors = ["#94a3b8", "#8b5cf6", "#10b981"];
  const bgColors = [
    "bg-slate-100 dark:bg-slate-800",
    "bg-violet-100 dark:bg-violet-900/40",
    "bg-emerald-100 dark:bg-emerald-900/40",
  ];
  const textColors = [
    "text-slate-600 dark:text-slate-400",
    "text-violet-600 dark:text-violet-400",
    "text-emerald-600 dark:text-emerald-400",
  ];

  return (
    <div className="space-y-2.5">
      {labels.map((label, i) => {
        const pct = (values[i] / maxVal) * 100;
        const change =
          i > 0 && values[i - 1] > 0
            ? Math.round(
                ((values[i] - values[i - 1]) / values[i - 1]) * 100
              )
            : 0;
        const isUp = change >= 0;
        return (
          <motion.div
            key={label}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.6 + i * 0.08 }}
            className="space-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium">{label}</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold tabular-nums ${textColors[i]}`}>
                  {fmt(values[i])}
                </span>
                {i > 0 && change !== 0 && (
                  <span
                    className={`text-[9px] font-semibold ${
                      isUp ? "text-emerald-500" : "text-rose-500"
                    }`}
                  >
                    {isUp ? "+" : ""}
                    {change}%
                  </span>
                )}
              </div>
            </div>
            <div className="h-5 bg-muted/40 rounded-md overflow-hidden">
              <motion.div
                className={`h-full rounded-md ${bgColors[i]}`}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, delay: 0.7 + i * 0.08 }}
              >
                <div
                  className="h-full rounded-md"
                  style={{
                    background: `linear-gradient(90deg, ${colors[i]}cc, ${colors[i]})`,
                    opacity: 0.6,
                  }}
                />
              </motion.div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Helper: compute total views from trendData ──────────────────────────────

function totalViews(td: TrendData): number {
  const viewSeries = td.series.find((s) => s.name === "浏览");
  if (!viewSeries) return 0;
  const total = viewSeries.data.reduce((a, b) => a + b, 0);
  const interactions = td.series
    .filter((s) => s.name !== "浏览")
    .reduce((acc, s) => acc + s.data.reduce((a, b) => a + b, 0), 0);
  if (total === 0) return 0;
  return Math.round((interactions / total) * 100);
}
