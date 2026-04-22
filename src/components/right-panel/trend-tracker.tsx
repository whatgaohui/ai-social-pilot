"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Flame,
  TrendingUp,
  CalendarDays,
  Sparkles,
  BarChart3,
  Clock,
  FileText,
  Lightbulb,
  RefreshCw,
  Zap,
  Target,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrendData {
  period: string;
  startDate: string;
  endDate: string;
  totalPosts: number;
  ownPosts: number;
  competitorPosts: number;
  trackedCompetitors: number;
  topContentTypes: { type: string; count: number; avgEngagement: number; engagementRate: number }[];
  bestDays: { day: number; dayLabel: string; postCount: number; avgEngagement: number }[];
  bestHours: { hour: number; hourLabel: string; postCount: number; avgEngagement: number }[];
  lengthCorrelation: { range: string; label: string; count: number; avgEngagement: number }[];
  platformTrends: {
    wechat: { totalPosts: number; avgEngagement: number; topType: { type: string } | null };
    xiaohongshu: { totalPosts: number; avgEngagement: number; topType: { type: string } | null };
  };
  heatmapData: Record<string, number>;
  trendingTopics: { topic: string; count: number; avgEngagement: number; heatScore: number }[];
  weeklyData: { weekStart: string; postCount: number; avgEngagement: number }[];
  recommendations: string[];
}

interface AISuggestion {
  summary: string;
  contentGaps: { type: string; opportunity: string; priority: string }[];
  opportunities: { title: string; description: string; expectedImpact: string }[];
  weeklyInsight: string;
  nextActions: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + "w";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

function getHeatColor(value: number, max: number): string {
  if (value === 0) return "rgba(148,163,184,0.08)";
  const ratio = value / (max || 1);
  if (ratio <= 0.2) return "rgba(139,92,246,0.12)";
  if (ratio <= 0.4) return "rgba(139,92,246,0.25)";
  if (ratio <= 0.6) return "rgba(139,92,246,0.45)";
  if (ratio <= 0.8) return "rgba(16,185,129,0.5)";
  return "rgba(16,185,129,0.75)";
}

function getHeatClass(value: number, max: number): string {
  if (value === 0) return "heatmap-cell-empty";
  const ratio = value / (max || 1);
  if (ratio <= 0.2) return "heatmap-cell-1";
  if (ratio <= 0.4) return "heatmap-cell-2";
  if (ratio <= 0.6) return "heatmap-cell-3";
  if (ratio <= 0.8) return "heatmap-cell-4";
  return "heatmap-cell-5";
}

// ─── Animation Variants ──────────────────────────────────────────────────────

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

// ─── Trending Topic Card ─────────────────────────────────────────────────────

function TrendingTopicCard({
  topic,
  index,
  maxHeatScore,
}: {
  topic: TrendData["trendingTopics"][0];
  index: number;
  maxHeatScore: number;
}) {
  const heatPct = (topic.heatScore / (maxHeatScore || 1)) * 100;
  const heatLevel = heatPct >= 80 ? "high" : heatPct >= 50 ? "medium" : "low";

  const heatColors = {
    high: "from-rose-500 to-orange-500",
    medium: "from-amber-500 to-yellow-500",
    low: "from-violet-500 to-purple-500",
  };

  const heatBgColors = {
    high: "bg-rose-50 dark:bg-rose-950/20",
    medium: "bg-amber-50 dark:bg-amber-950/20",
    low: "bg-violet-50 dark:bg-violet-950/20",
  };

  const heatTextColors = {
    high: "text-rose-500",
    medium: "text-amber-500",
    low: "text-violet-500",
  };

  return (
    <motion.div
      variants={fadeInUp}
      className={`trending-topic-card relative overflow-hidden rounded-lg border p-3 ${heatBgColors[heatLevel]} cursor-default`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Heat indicator bar */}
      <div className="absolute top-0 left-0 h-full w-1 rounded-l-lg overflow-hidden">
        <motion.div
          className={`h-full w-full bg-gradient-to-b ${heatColors[heatLevel]}`}
          initial={{ height: 0 }}
          animate={{ height: `${heatPct}%` }}
          transition={{ duration: 0.6, delay: 0.2 + index * 0.05 }}
        />
      </div>

      <div className="pl-2">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Flame className={`h-3 w-3 trend-heat-indicator ${heatTextColors[heatLevel]}`} />
          <span className="text-[10px] font-semibold truncate flex-1">{topic.topic}</span>
          <Badge
            variant="secondary"
            className={`text-[8px] h-4 px-1 border-0 ${
              heatLevel === "high"
                ? "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300"
                : heatLevel === "medium"
                  ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300"
                  : "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300"
            }`}
          >
            {formatNum(topic.heatScore)}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
          <span>{topic.count}篇内容</span>
          <span>·</span>
          <span>平均互动 {topic.avgEngagement.toFixed(1)}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Mini Pattern Chart ──────────────────────────────────────────────────────

function PatternMiniChart({
  data,
  label,
  value,
  color,
  icon: Icon,
}: {
  data: number[];
  label: string;
  value: string;
  color: string;
  icon: LucideIcon;
}) {
  const max = Math.max(...data, 1);
  const width = 280;
  const height = 48;
  const pad = { top: 4, bottom: 4, left: 0, right: 0 };
  const cw = width - pad.left - pad.right;
  const ch = height - pad.top - pad.bottom;

  const points = data.map((v, i) => ({
    x: pad.left + (i / Math.max(data.length - 1, 1)) * cw,
    y: pad.top + ch - (v / max) * ch,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath =
    points.length > 1
      ? `${linePath} L ${points[points.length - 1].x} ${pad.top + ch} L ${points[0].x} ${pad.top + ch} Z`
      : "";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-5 rounded flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
            <Icon className="h-3 w-3" style={{ color }} />
          </div>
          <span className="text-[11px] font-medium">{label}</span>
        </div>
        <span className="text-xs font-bold tabular-nums" style={{ color }}>{value}</span>
      </div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <defs>
          <linearGradient id={`pat-grad-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {points.length > 1 && (
          <>
            <motion.path
              d={areaPath}
              fill={`url(#pat-grad-${label})`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            />
            <motion.path
              d={linePath}
              fill="none"
              stroke={color}
              strokeWidth={1.5}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            />
          </>
        )}
      </svg>
    </div>
  );
}

// ─── Content Calendar Heatmap ────────────────────────────────────────────────

function ContributionHeatmap({
  heatmapData,
}: {
  heatmapData: Record<string, number>;
}) {
  // Build 12-week grid (84 days)
  const entries = Object.entries(heatmapData).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return null;

  const maxCount = Math.max(...entries.map(([, v]) => v), 1);
  const cellSize = 12;
  const cellGap = 2;
  const weekWidth = cellSize + cellGap;
  const weeks = Math.ceil(entries.length / 7);

  const svgWidth = weeks * weekWidth + 24;
  const svgHeight = 7 * (cellSize + cellGap) + 20;

  // Arrange data into a week-column layout
  const gridData: { count: number; key: string }[][] = Array.from({ length: 7 }, () => []);
  entries.forEach(([key, count], idx) => {
    const dayOfWeek = idx % 7; // 0=Mon, 6=Sun
    const weekIndex = Math.floor(idx / 7);
    if (!gridData[dayOfWeek]) gridData[dayOfWeek] = [];
    // Pad empty weeks
    while (gridData[dayOfWeek].length < weekIndex) {
      gridData[dayOfWeek].push({ count: 0, key: "" });
    }
    gridData[dayOfWeek].push({ count, key });
  });

  const dayLabels = ["一", "二", "三", "四", "五", "六", "日"];

  return (
    <div className="contribution-heatmap overflow-x-auto scrollbar-none">
      <svg width="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="min-w-[260px]">
        {/* Day labels */}
        {dayLabels.map((label, i) => (
          <text
            key={i}
            x={2}
            y={i * (cellSize + cellGap) + cellSize - 1}
            className="fill-muted-foreground text-[7px]"
            textAnchor="start"
            dominantBaseline="middle"
          >
            {label}
          </text>
        ))}

        {/* Cells */}
        {gridData.map((row, dayIdx) =>
          row.map((cell, weekIdx) => {
            const x = 20 + weekIdx * weekWidth;
            const y = dayIdx * (cellSize + cellGap);
            return (
              <motion.rect
                key={`${dayIdx}-${weekIdx}`}
                x={x}
                y={y}
                width={cellSize}
                height={cellSize}
                rx={2}
                fill={getHeatColor(cell.count, maxCount)}
                className={`heatmap-cell ${getHeatClass(cell.count, maxCount)}`}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: (dayIdx * weeks + weekIdx) * 0.003 }}
              >
                <title>{cell.key}: {cell.count}篇</title>
              </motion.rect>
            );
          })
        )}

        {/* Legend */}
        <text x={svgWidth - 120} y={svgHeight - 4} className="fill-muted-foreground text-[7px]">少</text>
        {[0.1, 0.3, 0.5, 0.7, 0.9].map((v, i) => (
          <rect
            key={i}
            x={svgWidth - 105 + i * (cellSize + 1)}
            y={svgHeight - 12}
            width={cellSize}
            height={8}
            rx={1.5}
            fill={getHeatColor(v * maxCount, maxCount)}
          />
        ))}
        <text x={svgWidth - 105 + 5 * (cellSize + 1) + 2} y={svgHeight - 4} className="fill-muted-foreground text-[7px]">多</text>
      </svg>
    </div>
  );
}

// ─── AI Suggestion Section ───────────────────────────────────────────────────

function AISuggestionSection({
  data,
  onGenerate,
  loading,
}: {
  data: AISuggestion | null;
  onGenerate: () => void;
  loading: boolean;
}) {
  if (!data && !loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-violet-500" />
            <h4 className="text-xs font-semibold">AI 趋势洞察</h4>
          </div>
          <div className="text-center py-6 space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Lightbulb className="h-6 w-6 text-violet-500" />
            </div>
            <p className="text-xs text-muted-foreground">
              基于当前趋势数据，AI 将为你分析内容缺口并推荐优化方向
            </p>
            <Button
              size="sm"
              className="gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white"
              onClick={onGenerate}
            >
              <Sparkles className="h-3.5 w-3.5" />
              生成 AI 洞察
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-500 animate-pulse" />
            <h4 className="text-xs font-semibold">正在分析趋势...</h4>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const priorityColors: Record<string, string> = {
    high: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  };

  const priorityLabels: Record<string, string> = {
    high: "高优先",
    medium: "中优先",
    low: "低优先",
  };

  return (
    <Card className="border-0 shadow-sm overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-50/60 via-background to-amber-50/40 dark:from-violet-950/15 dark:via-background dark:to-amber-950/10" />
      <CardContent className="p-4 relative space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Sparkles className="h-3 w-3 text-violet-500" />
            </div>
            <h4 className="text-xs font-semibold">AI 趋势洞察</h4>
          </div>
          <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={onGenerate}>
            <RefreshCw className="h-3 w-3 mr-1" />
            重新分析
          </Button>
        </div>

        {/* Summary */}
        {data.summary && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-muted-foreground leading-relaxed p-3 rounded-lg bg-muted/30"
          >
            {data.summary}
          </motion.div>
        )}

        {/* Content Gaps */}
        {data.contentGaps.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-rose-500" />
              <h5 className="text-[11px] font-semibold">内容缺口</h5>
            </div>
            <div className="space-y-1.5">
              {data.contentGaps.map((gap, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * i }}
                  className="flex items-start gap-2 p-2 rounded-lg bg-background/60"
                >
                  <Badge
                    className={`text-[8px] px-1.5 h-4 border-0 flex-shrink-0 mt-0.5 ${
                      priorityColors[gap.priority] || priorityColors.low
                    }`}
                  >
                    {priorityLabels[gap.priority] || gap.priority}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium">{gap.type}</p>
                    <p className="text-[10px] text-muted-foreground">{gap.opportunity}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Opportunities */}
        {data.opportunities.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
              <h5 className="text-[11px] font-semibold">机会发现</h5>
            </div>
            <div className="space-y-1.5">
              {data.opportunities.map((opp, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * i + 0.2 }}
                  className="p-2.5 rounded-lg border border-amber-200/50 bg-amber-50/40 dark:border-amber-800/30 dark:bg-amber-950/15"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <ArrowUpRight className="h-3 w-3 text-amber-500" />
                    <span className="text-[11px] font-semibold">{opp.title}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{opp.description}</p>
                  {opp.expectedImpact && (
                    <p className="text-[9px] text-emerald-500 mt-1">
                      预期效果: {opp.expectedImpact}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Weekly Insight */}
        {data.weeklyInsight && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-violet-50/50 dark:bg-violet-950/15">
            <Zap className="h-3.5 w-3.5 text-violet-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] font-medium text-violet-700 dark:text-violet-300">本周洞察</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{data.weeklyInsight}</p>
            </div>
          </div>
        )}

        {/* Next Actions */}
        {data.nextActions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <h5 className="text-[11px] font-semibold">行动建议</h5>
            </div>
            <div className="space-y-1">
              {data.nextActions.map((action, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 * i + 0.3 }}
                  className="flex items-start gap-2 text-[10px]"
                >
                  <span className="h-4 w-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 text-[8px] text-emerald-600 dark:text-emerald-300 font-bold mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground leading-relaxed">{action}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function TrendTracker() {
  const platform = useAppStore((s) => s.platform);
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrends = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/trends?period=month");
      if (!res.ok) throw new Error("请求失败");
      const json = await res.json();
      setTrendData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends, platform]);

  const generateAIInsight = useCallback(async () => {
    if (!trendData) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/trends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trendData, platform }),
      });
      if (!res.ok) throw new Error("AI分析失败");
      const json = await res.json();
      setAiSuggestion(json);
    } catch (err) {
      console.error("AI trend analysis error:", err);
    } finally {
      setAiLoading(false);
    }
  }, [trendData, platform]);

  const maxHeatScore = useMemo(
    () => Math.max(...(trendData?.trendingTopics || []).map((t) => t.heatScore), 1),
    [trendData]
  );

  const weeklyEngagement = useMemo(
    () => (trendData?.weeklyData || []).map((w) => w.avgEngagement).reverse(),
    [trendData]
  );

  const weeklyPosts = useMemo(
    () => (trendData?.weeklyData || []).map((w) => w.postCount).reverse(),
    [trendData]
  );

  const dailyPattern = useMemo(
    () => (trendData?.bestDays || []).map((d) => d.avgEngagement),
    [trendData]
  );

  // ── Loading state ──
  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (error || !trendData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Flame className="h-10 w-10 mb-3 opacity-30" />
        <p className="text-sm">{error || "暂无趋势数据"}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={fetchTrends}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          重新加载
        </Button>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-5">
        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-orange-500 to-rose-600 flex items-center justify-center shadow-sm">
              <Flame className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">趋势追踪</h3>
              <p className="text-[10px] text-muted-foreground">
                发现内容趋势与机会
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="text-[8px] h-4 px-1.5">
            {trendData.totalPosts} 篇内容
          </Badge>
        </div>

        {/* ── Trending Topics Grid ── */}
        {trendData.trendingTopics.length > 0 && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <div className="flex items-center gap-2 mb-3">
              <Flame className="h-4 w-4 text-orange-500" />
              <h4 className="text-xs font-semibold">热门话题</h4>
              <Badge variant="secondary" className="text-[8px] h-4 px-1.5 ml-auto">
                {trendData.trendingTopics.length} 个话题
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {trendData.trendingTopics.slice(0, 8).map((topic, i) => (
                <TrendingTopicCard key={topic.topic} topic={topic} index={i} maxHeatScore={maxHeatScore} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Content Pattern Analysis ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-violet-500" />
                <h4 className="text-xs font-semibold">内容模式分析</h4>
              </div>

              <PatternMiniChart
                data={weeklyEngagement}
                label="每周互动趋势"
                value={weeklyEngagement.length > 0 ? `${(weeklyEngagement.reduce((a, b) => a + b, 0) / weeklyEngagement.length).toFixed(1)}` : "0"}
                color="#8b5cf6"
                icon={TrendingUp}
              />

              <Separator className="bg-border/30" />

              <PatternMiniChart
                data={weeklyPosts}
                label="每周发布量"
                value={weeklyPosts.length > 0 ? `${(weeklyPosts.reduce((a, b) => a + b, 0) / weeklyPosts.length).toFixed(1)}` : "0"}
                color="#10b981"
                icon={FileText}
              />

              <Separator className="bg-border/30" />

              <PatternMiniChart
                data={dailyPattern}
                label="每日互动分布"
                value={
                  trendData.bestDays.length > 0 && trendData.bestDays[0].postCount > 0
                    ? trendData.bestDays[0].dayLabel
                    : "-"
                }
                color="#f59e0b"
                icon={CalendarDays}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Content Calendar Heatmap ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays className="h-4 w-4 text-emerald-500" />
                <h4 className="text-xs font-semibold">内容日历热力图</h4>
                <span className="text-[9px] text-muted-foreground ml-auto">
                  近12周
                </span>
              </div>
              <ContributionHeatmap heatmapData={trendData.heatmapData} />
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Best Time & Length Cards ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className="grid grid-cols-2 gap-2">
            {/* Best posting hours */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-[11px] font-semibold">最佳时段</span>
                </div>
                <div className="space-y-1.5">
                  {trendData.bestHours.slice(0, 3).map((h, i) => (
                    <motion.div
                      key={h.hour}
                      className="flex items-center justify-between"
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * i }}
                    >
                      <span className="text-xs tabular-nums">{h.hourLabel}</span>
                      <span className="text-[9px] text-muted-foreground">
                        {h.postCount}篇 · 互动{h.avgEngagement.toFixed(1)}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Content length performance */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <FileText className="h-3.5 w-3.5 text-violet-500" />
                  <span className="text-[11px] font-semibold">长度效果</span>
                </div>
                <div className="space-y-1.5">
                  {trendData.lengthCorrelation
                    .filter((l) => l.count > 0)
                    .sort((a, b) => b.avgEngagement - a.avgEngagement)
                    .slice(0, 3)
                    .map((l, i) => (
                      <motion.div
                        key={l.range}
                        className="flex items-center justify-between"
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * i }}
                      >
                        <span className="text-xs">{l.label.split(" ")[0]}</span>
                        <span className="text-[9px] text-muted-foreground">
                          {l.avgEngagement.toFixed(1)}
                        </span>
                      </motion.div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* ── AI Trend Suggestions ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <AISuggestionSection
            data={aiSuggestion}
            onGenerate={generateAIInsight}
            loading={aiLoading}
          />
        </motion.div>
      </div>
    </ScrollArea>
  );
}
