"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from "lucide-react";
import {
  format,
  startOfWeek,
  endOfWeek,
  subWeeks,
  addDays,
} from "date-fns";
import type { ContentPost } from "@/types";

// --- Mini Sparkline Bar Chart (CSS-only) ---

interface MiniSparklineProps {
  data: number[];
  maxVal?: number;
  color?: string;
}

function MiniSparkline({ data, maxVal, color = "bg-primary" }: MiniSparklineProps) {
  const max = maxVal || Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[2px] h-[18px]">
      {data.map((val, idx) => {
        const h = Math.max(2, (val / max) * 16);
        return (
          <motion.div
            key={idx}
            initial={{ height: 0 }}
            animate={{ height: `${h}px` }}
            transition={{ duration: 0.4, delay: idx * 0.05, ease: [0.22, 1, 0.36, 1] }}
            className={`w-[6px] rounded-sm flex-shrink-0 ${color} opacity-80`}
          />
        );
      })}
    </div>
  );
}

// --- Metric Card ---

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: { value: number; direction: "up" | "down" | "neutral" };
  color?: string;
  sparkline?: number[];
  sparkColor?: string;
}

function MetricCard({ label, value, trend, color, sparkline, sparkColor }: MetricCardProps) {
  return (
    <div className="rounded-lg border bg-card/50 p-2 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-medium text-muted-foreground">{label}</span>
        {trend && trend.direction !== "neutral" && (
          <motion.span
            initial={{ opacity: 0, x: trend.direction === "up" ? -4 : 4 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex items-center gap-0.5 text-[8px] font-semibold ${
              trend.direction === "up"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {trend.direction === "up" ? (
              <TrendingUp className="h-2.5 w-2.5" />
            ) : (
              <TrendingDown className="h-2.5 w-2.5" />
            )}
            {Math.abs(trend.value)}%
          </motion.span>
        )}
      </div>
      <div className={`text-sm font-bold tabular-nums ${color || "text-foreground"}`}>
        {value}
      </div>
      {sparkline && sparkline.length > 0 && (
        <MiniSparkline data={sparkline} color={sparkColor || "bg-primary/60"} />
      )}
    </div>
  );
}

// --- Compute week stats ---

function computeWeekStats(posts: ContentPost[]) {
  const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const lastWeekStart = subWeeks(thisWeekStart, 1);

  // Filter posts for this week and last week
  const thisWeekPosts = posts.filter((p) => {
    return p.scheduledDate >= format(thisWeekStart, "yyyy-MM-dd") &&
           p.scheduledDate <= format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  });

  const lastWeekPosts = posts.filter((p) => {
    return p.scheduledDate >= format(lastWeekStart, "yyyy-MM-dd") &&
           p.scheduledDate < format(thisWeekStart, "yyyy-MM-dd");
  });

  // This week metrics
  const thisPublished = thisWeekPosts.filter((p) => p.status === "published").length;
  const thisAvgScore = thisWeekPosts.length > 0
    ? Math.round(thisWeekPosts.reduce((s, p) => s + (p.aiScore || 0), 0) / thisWeekPosts.length)
    : 0;
  const thisTotalInteractions = thisWeekPosts.reduce(
    (s, p) => s + (p.likes || 0) + (p.comments || 0) + (p.shares || 0),
    0,
  );
  const thisCompletionRate = thisWeekPosts.length > 0
    ? Math.round(((thisPublished + thisWeekPosts.filter((p) => p.status === "optimized").length) / thisWeekPosts.length) * 100)
    : 0;

  // Last week metrics
  const lastPublished = lastWeekPosts.filter((p) => p.status === "published").length;
  const lastTotalInteractions = lastWeekPosts.reduce(
    (s, p) => s + (p.likes || 0) + (p.comments || 0) + (p.shares || 0),
    0,
  );

  // Trends
  const publishedTrend = lastPublished > 0
    ? Math.round(((thisPublished - lastPublished) / lastPublished) * 100)
    : thisPublished > 0 ? 100 : 0;

  const interactionsTrend = lastTotalInteractions > 0
    ? Math.round(((thisTotalInteractions - lastTotalInteractions) / lastTotalInteractions) * 100)
    : thisTotalInteractions > 0 ? 100 : 0;

  // Daily post count for this week sparkline
  const dailyCounts: number[] = [];
  for (let d = thisWeekStart; d <= endOfWeek(new Date(), { weekStartsOn: 1 }); d = addDays(d, 1)) {
    const dateStr = format(d, "yyyy-MM-dd");
    dailyCounts.push(posts.filter((p) => p.scheduledDate === dateStr).length);
  }

  // Daily interactions sparkline
  const dailyInteractions: number[] = [];
  for (let d = thisWeekStart; d <= endOfWeek(new Date(), { weekStartsOn: 1 }); d = addDays(d, 1)) {
    const dateStr = format(d, "yyyy-MM-dd");
    dailyInteractions.push(
      posts
        .filter((p) => p.scheduledDate === dateStr)
        .reduce((s, p) => s + (p.likes || 0) + (p.comments || 0) + (p.shares || 0), 0),
    );
  }

  // Score color
  const scoreColor = thisAvgScore >= 80
    ? "text-emerald-600 dark:text-emerald-400"
    : thisAvgScore >= 60
      ? "text-amber-600 dark:text-amber-400"
      : "text-rose-600 dark:text-rose-400";

  // Completion color
  const completionColor = thisCompletionRate >= 80
    ? "text-emerald-600 dark:text-emerald-400"
    : thisCompletionRate >= 50
      ? "text-amber-600 dark:text-amber-400"
      : "text-rose-600 dark:text-rose-400";

  return {
    thisPublished,
    thisAvgScore,
    thisTotalInteractions,
    thisCompletionRate,
    publishedTrend,
    interactionsTrend,
    dailyCounts,
    dailyInteractions,
    scoreColor,
    completionColor,
    totalPosts: thisWeekPosts.length,
  };
}

// --- Main Component ---

interface WeeklyMiniStatsProps {
  posts: ContentPost[];
  onViewDetails?: () => void;
}

export function WeeklyMiniStats({ posts, onViewDetails }: WeeklyMiniStatsProps) {
  const stats = useMemo(() => computeWeekStats(posts), [posts]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-muted ml-auto"
        >
          <BarChart3 className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        className="w-[220px] p-3 z-50"
      >
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-[11px] font-semibold text-foreground">本周统计</h3>
              <span className="text-[8px] text-muted-foreground tabular-nums">
                {format(startOfWeek(new Date(), { weekStartsOn: 1 }), "M/d")} - {format(endOfWeek(new Date(), { weekStartsOn: 1 }), "M/d")}
              </span>
            </div>

            {/* 2x2 Metrics Grid */}
            <div className="grid grid-cols-2 gap-1.5 mb-2.5">
              <MetricCard
                label="本周发布"
                value={stats.thisPublished}
                trend={{
                  value: stats.publishedTrend,
                  direction: stats.publishedTrend > 0 ? "up" : stats.publishedTrend < 0 ? "down" : "neutral",
                }}
                sparkline={stats.dailyCounts}
                sparkColor="bg-violet-500/60"
              />
              <MetricCard
                label="平均AI评分"
                value={stats.thisAvgScore}
                color={stats.scoreColor}
              />
              <MetricCard
                label="总互动量"
                value={stats.thisTotalInteractions > 1000
                  ? `${(stats.thisTotalInteractions / 1000).toFixed(1)}k`
                  : stats.thisTotalInteractions}
                trend={{
                  value: stats.interactionsTrend,
                  direction: stats.interactionsTrend > 0 ? "up" : stats.interactionsTrend < 0 ? "down" : "neutral",
                }}
                sparkline={stats.dailyInteractions}
                sparkColor="bg-emerald-500/60"
              />
              <MetricCard
                label="完成率"
                value={`${stats.thisCompletionRate}%`}
                color={stats.completionColor}
              />
            </div>

            {/* Footer */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-[10px] text-muted-foreground hover:text-foreground"
              onClick={onViewDetails}
            >
              查看详情
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </motion.div>
        </AnimatePresence>
      </PopoverContent>
    </Popover>
  );
}
