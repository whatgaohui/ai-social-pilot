"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Activity,
  Flame,
  TrendingUp,
  Calendar,
  Clock,
  BarChart3,
  Zap,
  Target,
  Award,
  RefreshCw,
} from "lucide-react";
import { format, subDays, startOfWeek, getDay, addDays } from "date-fns";
import { zhCN } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HeatmapDay {
  date: string;
  count: number;
  dayOfWeek: number;
}

interface ScoreBreakdown {
  label: string;
  score: number;
  max: number;
  color: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];
const TIME_SLOT_LABELS = [
  "凌晨(0-6)", "早晨(6-9)", "上午(9-12)",
  "下午(12-14)", "傍晚(14-18)", "晚间(18-24)",
];

function getHeatmapColor(count: number, maxCount: number): string {
  if (count === 0) return "fill-muted/30 dark:fill-muted/20";
  const ratio = maxCount > 0 ? count / maxCount : 0;
  if (ratio <= 0.2) return "fill-emerald-200 dark:fill-emerald-900/40";
  if (ratio <= 0.4) return "fill-emerald-300 dark:fill-emerald-800/50";
  if (ratio <= 0.6) return "fill-emerald-400 dark:fill-emerald-700/60";
  if (ratio <= 0.8) return "fill-emerald-500 dark:fill-emerald-500/70";
  return "fill-emerald-600 dark:fill-emerald-400";
}

function getScoreLabel(score: number): string {
  if (score >= 90) return "运营极佳";
  if (score >= 75) return "运营良好";
  if (score >= 60) return "运营一般";
  if (score >= 40) return "需要改进";
  return "急需提升";
}

function getScoreColorClass(score: number): string {
  if (score >= 90) return "text-emerald-500";
  if (score >= 75) return "text-emerald-400";
  if (score >= 60) return "text-amber-500";
  if (score >= 40) return "text-orange-500";
  return "text-rose-500";
}

function getScoreRingColor(score: number): string {
  if (score >= 90) return "#10b981";
  if (score >= 75) return "#34d399";
  if (score >= 60) return "#f59e0b";
  if (score >= 40) return "#f97316";
  return "#f43f5e";
}

// ─── Sparkline (SVG Polyline) ─────────────────────────────────────────────────

function MiniSparkline({
  data,
  color,
  width = 60,
  height = 20,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const pad = 2;
  const cw = width - pad * 2;
  const ch = height - pad * 2;

  const points = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * cw,
    y: pad + ch - (v / max) * ch,
  }));

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={2}
        fill={color}
      />
    </svg>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function OpsRhythmEngine() {
  const contentPosts = useAppStore((s) => s.contentPosts);

  // ── Build heatmap data (last 90 days) ──────────────────────────────────
  const heatmapData = useMemo<HeatmapDay[]>(() => {
    const today = new Date();
    const days: HeatmapDay[] = [];
    for (let i = 89; i >= 0; i--) {
      const d = subDays(today, i);
      const dateStr = format(d, "yyyy-MM-dd");
      const dayOfWeek = getDay(d) === 0 ? 6 : getDay(d) - 1; // Mon=0
      const count = contentPosts.filter(
        (p) =>
          p.status === "published" &&
          (p.publishedAt?.slice(0, 10) || p.createdAt.slice(0, 10)) === dateStr
      ).length;
      days.push({ date: dateStr, count, dayOfWeek });
    }
    return days;
  }, [contentPosts]);

  const maxHeatmapCount = useMemo(
    () => Math.max(...heatmapData.map((d) => d.count), 1),
    [heatmapData]
  );

  // ── Best performing day of week ────────────────────────────────────────
  const bestDayOfWeek = useMemo(() => {
    const dayTotals = Array(7).fill(0);
    const dayCounts = Array(7).fill(0);
    contentPosts
      .filter((p) => p.status === "published")
      .forEach((p) => {
        const d = new Date(p.publishedAt || p.createdAt);
        const dow = getDay(d) === 0 ? 6 : getDay(d) - 1;
        dayTotals[dow] += p.likes + p.comments * 2 + p.shares * 3;
        dayCounts[dow]++;
      });
    const avgEngagement = dayTotals.map((t, i) =>
      dayCounts[i] > 0 ? t / dayCounts[i] : 0
    );
    const bestIdx = avgEngagement.indexOf(Math.max(...avgEngagement));
    return {
      dayIndex: bestIdx,
      dayLabel: `周${WEEKDAY_LABELS[bestIdx]}`,
      avgEngagement: Math.round(avgEngagement[bestIdx]),
      dayCounts,
      avgEngagements: avgEngagement,
    };
  }, [contentPosts]);

  // ── Best performing time slot ───────────────────────────────────────────
  const bestTimeSlot = useMemo(() => {
    const slotTotals = Array(6).fill(0);
    const slotCounts = Array(6).fill(0);
    contentPosts
      .filter((p) => p.status === "published")
      .forEach((p) => {
        const d = new Date(p.publishedAt || p.createdAt);
        const hour = d.getHours();
        const slotIdx =
          hour < 6 ? 0 : hour < 9 ? 1 : hour < 12 ? 2 : hour < 14 ? 3 : hour < 18 ? 4 : 5;
        slotTotals[slotIdx] += p.likes + p.comments * 2 + p.shares * 3;
        slotCounts[slotIdx]++;
      });
    const avgEngagement = slotTotals.map((t, i) =>
      slotCounts[i] > 0 ? t / slotCounts[i] : 0
    );
    const bestIdx = avgEngagement.indexOf(Math.max(...avgEngagement));
    return {
      slotIndex: bestIdx,
      slotLabel: TIME_SLOT_LABELS[bestIdx],
      avgEngagement: Math.round(avgEngagement[bestIdx]),
      slotCounts,
      avgEngagements: avgEngagement,
    };
  }, [contentPosts]);

  // ── Posting consistency streak ──────────────────────────────────────────
  const streak = useMemo(() => {
    const today = new Date();
    let count = 0;
    for (let i = 0; i < 365; i++) {
      const d = subDays(today, i);
      const dateStr = format(d, "yyyy-MM-dd");
      const hasPost = contentPosts.some(
        (p) =>
          p.status === "published" &&
          (p.publishedAt?.slice(0, 10) || p.createdAt.slice(0, 10)) === dateStr
      );
      if (hasPost) {
        count++;
      } else if (i > 0) {
        // Allow today to be missing (day not over yet)
        if (i === 0) continue;
        break;
      }
    }
    return count;
  }, [contentPosts]);

  // ── Composite rhythm score ──────────────────────────────────────────────
  const scoreBreakdowns = useMemo<ScoreBreakdown[]>(() => {
    // 1. Posting frequency (0-25): avg posts per week over last 4 weeks
    const now = new Date();
    const fourWeeksAgo = subDays(now, 28);
    const recentPublished = contentPosts.filter((p) => {
      const d = new Date(p.publishedAt || p.createdAt);
      return d >= fourWeeksAgo && p.status === "published";
    });
    const weeklyAvg = recentPublished.length / 4;
    const frequencyScore = Math.min(Math.round((weeklyAvg / 7) * 25), 25);

    // 2. Timing regularity (0-25): standard deviation of posting hours
    const publishHours = recentPublished.map((p) => {
      const d = new Date(p.publishedAt || p.createdAt);
      return d.getHours();
    });
    let regularityScore = 15; // base
    if (publishHours.length >= 5) {
      const mean = publishHours.reduce((a, b) => a + b, 0) / publishHours.length;
      const variance =
        publishHours.reduce((s, h) => s + Math.pow(h - mean, 2), 0) / publishHours.length;
      const std = Math.sqrt(variance);
      // Lower std = more regular = higher score
      regularityScore = Math.round(Math.max(0, 25 - std * 1.5));
    }

    // 3. Content diversity (0-25): unique content types
    const uniqueTypes = new Set(
      recentPublished.map((p) => p.contentType)
    ).size;
    const diversityScore = Math.min(Math.round(uniqueTypes * 4), 25);

    // 4. Engagement stability (0-25): coefficient of variation
    const engagements = recentPublished.map(
      (p) => p.likes + p.comments * 2 + p.shares * 3
    );
    let stabilityScore = 15;
    if (engagements.length >= 5) {
      const mean = engagements.reduce((a, b) => a + b, 0) / engagements.length;
      if (mean > 0) {
        const variance =
          engagements.reduce((s, e) => s + Math.pow(e - mean, 2), 0) / engagements.length;
        const cv = Math.sqrt(variance) / mean;
        stabilityScore = Math.round(Math.max(0, 25 - cv * 8));
      } else {
        stabilityScore = 10;
      }
    }

    return [
      { label: "发布频率", score: frequencyScore, max: 25, color: "#10b981" },
      { label: "时间规律性", score: regularityScore, max: 25, color: "#8b5cf6" },
      { label: "内容多样性", score: diversityScore, max: 25, color: "#f59e0b" },
      { label: "互动稳定性", score: stabilityScore, max: 25, color: "#f43f5e" },
    ];
  }, [contentPosts]);

  const totalScore = useMemo(
    () => scoreBreakdowns.reduce((s, b) => s + b.score, 0),
    [scoreBreakdowns]
  );

  // ── 7-day sparkline data for day-of-week chart ─────────────────────────
  const weeklyPostCounts = useMemo(() => {
    const now = new Date();
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    return Array(7)
      .fill(0)
      .map((_, i) => {
        const d = addDays(thisWeekStart, i);
        const dateStr = format(d, "yyyy-MM-dd");
        return contentPosts.filter(
          (p) =>
            p.status === "published" &&
            (p.publishedAt?.slice(0, 10) || p.createdAt.slice(0, 10)) === dateStr
        ).length;
      });
  }, [contentPosts]);

  // ── Month labels for heatmap ────────────────────────────────────────────
  const monthLabels = useMemo(() => {
    const labels: { label: string; colIndex: number }[] = [];
    const today = new Date();
    let lastMonth = "";
    for (let i = 89; i >= 0; i--) {
      const d = subDays(today, i);
      const m = format(d, "M月");
      const colIndex = 89 - i;
      if (m !== lastMonth) {
        labels.push({ label: m, colIndex });
        lastMonth = m;
      }
    }
    return labels;
  }, []);

  // ── Tooltip state ──────────────────────────────────────────────────────
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  const circumference = 2 * Math.PI * 42;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4 p-4">
        {/* ─── Header ─── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500/15 to-teal-500/15 flex items-center justify-center">
              <Activity className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">运营节奏引擎</h2>
              <p className="text-[10px] text-muted-foreground">AI驱动运营节奏分析</p>
            </div>
          </div>
        </div>

        {/* ─── Score Ring + Breakdown ─── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start gap-5">
                {/* Score Ring */}
                <div className="flex-shrink-0 relative">
                  <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
                    <circle
                      cx="48" cy="48" r="42"
                      fill="none"
                      className="stroke-muted/30"
                      strokeWidth="6"
                    />
                    <motion.circle
                      cx="48" cy="48" r="42"
                      fill="none"
                      stroke={getScoreRingColor(totalScore)}
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      initial={{ strokeDashoffset: circumference }}
                      animate={{
                        strokeDashoffset:
                          circumference * (1 - totalScore / 100),
                      }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.span
                      className="text-2xl font-bold tabular-nums"
                      style={{ color: getScoreRingColor(totalScore) }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      {totalScore}
                    </motion.span>
                    <span className="text-[9px] text-muted-foreground">
                      {getScoreLabel(totalScore)}
                    </span>
                  </div>
                </div>

                {/* Score Breakdown */}
                <div className="flex-1 space-y-2.5 pt-1">
                  {scoreBreakdowns.map((item, idx) => {
                    const pct = (item.score / item.max) * 100;
                    return (
                      <div key={item.label} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground">
                            {item.label}
                          </span>
                          <span className="text-[11px] font-semibold tabular-nums">
                            {item.score}/{item.max}
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: item.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{
                              duration: 0.6,
                              delay: 0.2 + idx * 0.1,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <Separator />

        {/* ─── 90-Day Calendar Heatmap ─── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">运营日历热力图</span>
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                近90天
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-muted-foreground">少</span>
              <div className="flex gap-0.5">
                {[0, 0.2, 0.4, 0.6, 0.8, 1].map((v) => (
                  <div
                    key={v}
                    className={`h-2.5 w-2.5 rounded-sm ${getHeatmapColor(
                      Math.round(v * maxHeatmapCount),
                      maxHeatmapCount
                    )}`}
                  />
                ))}
              </div>
              <span className="text-[9px] text-muted-foreground">多</span>
            </div>
          </div>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-3">
              {/* Month labels */}
              <div className="relative mb-1" style={{ paddingLeft: 24 }}>
                {monthLabels.map((m) => (
                  <span
                    key={m.label}
                    className="absolute text-[8px] text-muted-foreground"
                    style={{
                      left: `${(m.colIndex / 90) * 100}%`,
                    }}
                  >
                    {m.label}
                  </span>
                ))}
              </div>

              {/* Day labels + heatmap grid */}
              <div className="flex gap-0.5">
                {/* Day-of-week labels */}
                <div className="flex flex-col gap-0.5 flex-shrink-0 w-6 pt-0.5">
                  {["一", "", "三", "", "五", "", "日"].map((d, i) => (
                    <div
                      key={i}
                      className="h-2.5 flex items-center justify-center text-[8px] text-muted-foreground"
                    >
                      {d}
                    </div>
                  ))}
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-hidden">
                  {WEEKDAY_LABELS.map((dayLabel, dowIdx) => {
                    // Build 13 rows of 7 days = 91 cells (90 days)
                    return (
                      <div
                        key={dowIdx}
                        className="flex gap-0.5 mb-0.5"
                      >
                        {Array.from({ length: 13 }).map((_, weekIdx) => {
                          const dayIndex = weekIdx * 7 + dowIdx;
                          if (dayIndex >= 90) return (
                            <div key={weekIdx} className="w-2.5 h-2.5" />
                          );

                          const dayData = heatmapData[dayIndex];
                          if (!dayData) return (
                            <div key={weekIdx} className="w-2.5 h-2.5" />
                          );

                          const cellKey = `${dayData.date}-${dowIdx}`;

                          return (
                            <Tooltip key={cellKey}>
                              <TooltipTrigger asChild>
                                <motion.div
                                  className={`w-2.5 h-2.5 rounded-sm cursor-default transition-transform ${getHeatmapColor(
                                    dayData.count,
                                    maxHeatmapCount
                                  )}`}
                                  onMouseEnter={() => setHoveredCell(cellKey)}
                                  onMouseLeave={() => setHoveredCell(null)}
                                  whileHover={{ scale: 1.4, zIndex: 10 }}
                                  initial={{ opacity: 0, scale: 0 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{
                                    delay: dayIndex * 0.005,
                                    duration: 0.15,
                                  }}
                                  style={{
                                    boxShadow:
                                      hoveredCell === cellKey
                                        ? "0 0 0 1px rgba(16,185,129,0.6)"
                                        : undefined,
                                  }}
                                />
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                className="text-[10px] py-1 px-2"
                              >
                                <div className="font-medium">{dayData.date}</div>
                                <div className="text-muted-foreground">
                                  发布 {dayData.count} 条
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <Separator />

        {/* ─── Best Performing Analysis ─── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium">发布规律分析</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Best Day of Week */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="h-5 w-5 rounded bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Calendar className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    最佳发布日
                  </span>
                </div>
                <p className="text-base font-bold text-amber-600 dark:text-amber-400">
                  {bestDayOfWeek.dayLabel}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  平均互动 {bestDayOfWeek.avgEngagement}
                </p>
                {/* Mini bar chart */}
                <div className="flex items-end gap-1 mt-2 h-10">
                  {WEEKDAY_LABELS.map((_, i) => {
                    const maxVal = Math.max(...bestDayOfWeek.avgEngagements, 1);
                    const pct =
                      (bestDayOfWeek.avgEngagements[i] / maxVal) * 100;
                    const isBest = i === bestDayOfWeek.dayIndex;
                    return (
                      <div
                        key={i}
                        className="flex-1 flex flex-col items-center gap-0.5"
                      >
                        <motion.div
                          className={`w-full rounded-sm ${
                            isBest
                              ? "bg-amber-400 dark:bg-amber-500"
                              : "bg-amber-200/60 dark:bg-amber-800/30"
                          }`}
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(4, pct * 0.8)}px` }}
                          transition={{ duration: 0.4, delay: 0.3 + i * 0.05 }}
                        />
                        <span className="text-[7px] text-muted-foreground">
                          {WEEKDAY_LABELS[i]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Best Time Slot */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="h-5 w-5 rounded bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                    <Clock className="h-3 w-3 text-violet-600 dark:text-violet-400" />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    最佳时段
                  </span>
                </div>
                <p className="text-xs font-bold text-violet-600 dark:text-violet-400 leading-tight">
                  {bestTimeSlot.slotLabel}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  平均互动 {bestTimeSlot.avgEngagement}
                </p>
                {/* Horizontal bar chart */}
                <div className="space-y-1 mt-2">
                  {TIME_SLOT_LABELS.slice(0, 4).map((label, i) => {
                    const maxVal = Math.max(...bestTimeSlot.avgEngagements, 1);
                    const pct =
                      (bestTimeSlot.avgEngagements[i] / maxVal) * 100;
                    const isBest = i === bestTimeSlot.slotIndex;
                    return (
                      <div key={i} className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] text-muted-foreground truncate flex-1 mr-2">
                            {label}
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${
                              isBest
                                ? "bg-violet-500"
                                : "bg-violet-300/60 dark:bg-violet-700/40"
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(2, pct)}%` }}
                            transition={{
                              duration: 0.4,
                              delay: 0.35 + i * 0.06,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Consistency Streak */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-rose-500/15 to-orange-500/15 flex items-center justify-center">
                    <Flame className="h-4 w-4 text-rose-500" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">连续发布</p>
                    <p className="text-[10px] text-muted-foreground">
                      保持每日发布习惯
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline gap-0.5">
                    <motion.span
                      className="text-2xl font-bold text-rose-500 tabular-nums"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        type: "spring",
                        delay: 0.4,
                        stiffness: 200,
                      }}
                    >
                      {streak}
                    </motion.span>
                    <span className="text-[10px] text-muted-foreground">天</span>
                  </div>
                  {streak >= 7 && (
                    <Badge
                      variant="outline"
                      className="text-[8px] px-1 py-0 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800"
                    >
                      <Award className="h-2 w-2 mr-0.5" />
                      {streak >= 30 ? "月度达成" : streak >= 7 ? "周度达成" : ""}
                    </Badge>
                  )}
                </div>
              </div>
              {/* Weekly trend sparkline */}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  本周每日发布
                </span>
                <MiniSparkline
                  data={weeklyPostCounts}
                  color="#10b981"
                  width={80}
                  height={24}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </TooltipProvider>
  );
}
