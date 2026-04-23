"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Activity,
  Clock,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Target,
  Calendar,
  Sparkles,
  Flame,
  ChevronRight,
  Loader2,
  PieChart,
  BarChart3,
  Award,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  CONTENT_TYPE_LABELS,
  XHS_CONTENT_TYPE_LABELS,
} from "@/types";
import { useAppStore } from "@/store/app-store";
import { subDays, startOfWeek, addDays } from "date-fns";
import { zhCN } from "date-fns/locale";
import { safeFormat } from "@/lib/safe-date";

// ─── Types ─────────────────────────────────────────────────────────
interface OpsRhythmData {
  todayPlan: { total: number; completed: number; pending: number };
  weekProgress: { published: number; total: number; rate: number };
  bestPostingTimes: {
    hour: string;
    slotKey: string;
    label: string;
    emoji: string;
    score: number;
    reason: string;
  }[];
  heatmap: {
    day: string;
    dayIndex: number;
    slotKey: string;
    slotLabel: string;
    count: number;
    totalEngagement: number;
  }[];
  contentMix: {
    types: { type: string; count: number; percentage: number }[];
    diversityScore: number;
    totalPosts: number;
  };
  consistency: {
    streak: number;
    avgPerWeek: number;
    trend: "up" | "down" | "stable";
    fourWeekCalendar: { date: string; count: number; dayOfWeek: number }[];
    weekCounts: number[];
  };
  suggestions: {
    type: "timing" | "mix" | "consistency" | "quality";
    priority: "high" | "medium" | "low";
    title: string;
    description: string;
    action: string;
  }[];
  weeklyGoal: { target: number; current: number; percentage: number };
}

// ─── Constants ─────────────────────────────────────────────────────
const TIME_SLOT_LABELS = ["早间", "上午", "午间", "下午", "傍晚", "晚间"];
const WEEKDAY_SHORT = ["一", "二", "三", "四", "五", "六", "日"];

const SUGGESTION_CONFIG = {
  timing: { icon: Clock, color: "from-amber-500/15 to-orange-500/15", iconColor: "text-amber-600 dark:text-amber-400", label: "最佳发布时间" },
  mix: { icon: FileText, color: "from-violet-500/15 to-purple-500/15", iconColor: "text-violet-600 dark:text-violet-400", label: "内容配比" },
  consistency: { icon: Flame, color: "from-emerald-500/15 to-teal-500/15", iconColor: "text-emerald-600 dark:text-emerald-400", label: "连续性" },
  quality: { icon: Sparkles, color: "from-rose-500/15 to-pink-500/15", iconColor: "text-rose-600 dark:text-rose-400", label: "质量提升" },
} as const;

const PRIORITY_CONFIG = {
  high: { label: "重要", bg: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800" },
  medium: { label: "建议", bg: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800" },
  low: { label: "可选", bg: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" },
} as const;

const DONUT_COLORS = [
  "text-amber-500",
  "text-violet-500",
  "text-emerald-500",
  "text-rose-500",
  "text-sky-500",
  "text-orange-500",
  "text-pink-500",
  "text-teal-500",
];

const DONUT_STROKE_COLORS = [
  "#f59e0b",
  "#8b5cf6",
  "#10b981",
  "#f43f5e",
  "#0ea5e9",
  "#f97316",
  "#ec4899",
  "#14b8a6",
];

// ─── Helpers ───────────────────────────────────────────────────────
function getContentTypeLabel(type: string): string {
  return (
    (CONTENT_TYPE_LABELS as Record<string, string>)[type] ||
    (XHS_CONTENT_TYPE_LABELS as Record<string, string>)[type] ||
    type
  );
}

function getMotivationalMessage(percentage: number): string {
  if (percentage >= 100) return "🏆 太棒了！本周目标已达成！";
  if (percentage >= 80) return "🔥 即将达成，再加把劲！";
  if (percentage >= 60) return "💪 进展顺利，保持节奏！";
  if (percentage >= 40) return "🌱 已有进展，继续加油！";
  if (percentage >= 20) return "📝 良好的开始，坚持下去！";
  return "🚀 新的一周，从现在开始！";
}

function getTrendIcon(trend: string) {
  switch (trend) {
    case "up": return <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />;
    case "down": return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
    default: return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

function getTrendLabel(trend: string) {
  switch (trend) {
    case "up": return "上升趋势";
    case "down": return "下降趋势";
    default: return "保持稳定";
  }
}

function getCalendarCellColor(count: number): string {
  if (count === 0) return "bg-muted/40";
  if (count <= 2) return "bg-green-100 dark:bg-green-900/30 border-green-200/50 dark:border-green-800/50";
  return "bg-emerald-200 dark:bg-emerald-800/40 border-emerald-300/50 dark:border-emerald-700/50";
}

function getHeatmapColor(count: number, maxCount: number): string {
  if (count === 0) return "bg-muted/30 dark:bg-muted/20";
  const ratio = maxCount > 0 ? count / maxCount : 0;
  if (ratio <= 0.33) return "bg-amber-100 dark:bg-amber-900/25";
  if (ratio <= 0.66) return "bg-amber-300 dark:bg-amber-700/40";
  return "bg-amber-500 dark:bg-amber-500/80";
}

// ─── Component ─────────────────────────────────────────────────────
export function OpsRhythmDashboard() {
  const { platform, setRightPanelTab } = useAppStore();
  const [data, setData] = useState<OpsRhythmData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [newGoalTarget, setNewGoalTarget] = useState("7");
  const [savingGoal, setSavingGoal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/ops-rhythm");
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      setData(json);
      setNewGoalTarget(String(json.weeklyGoal?.target ?? 7));
    } catch {
      toast.error("加载运营节奏数据失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveGoal = useCallback(async () => {
    const target = parseInt(newGoalTarget, 10);
    if (!target || target < 1 || target > 30) {
      toast.error("目标必须是1-30之间的整数");
      return;
    }
    setSavingGoal(true);
    try {
      const res = await fetch("/api/ops-rhythm/goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`周目标已更新为 ${target} 条/周`);
      setGoalDialogOpen(false);
      fetchData();
    } catch {
      toast.error("更新目标失败");
    } finally {
      setSavingGoal(false);
    }
  }, [newGoalTarget, fetchData]);

  const handleQuickFill = useCallback(() => {
    toast.info("正在为空白日生成内容...");
    setRightPanelTab("workspace");
  }, [setRightPanelTab]);

  const handleOptimizeSchedule = useCallback(() => {
    toast.info("AI正在分析排期...");
    setRightPanelTab("workspace");
  }, [setRightPanelTab]);

  const handleGenerateReport = useCallback(() => {
    setRightPanelTab("data");
  }, [setRightPanelTab]);

  const handleApplySuggestion = useCallback((suggestion: OpsRhythmData["suggestions"][number]) => {
    if (suggestion.type === "consistency" || suggestion.type === "timing") {
      setRightPanelTab("workspace");
      toast.info(suggestion.action);
    } else if (suggestion.type === "mix") {
      toast.info("已记录内容配比建议");
    } else {
      toast.info(suggestion.action);
    }
  }, [setRightPanelTab]);

  // ─── Derived values ──────────────────────────────────────────
  const maxHeatmapCount = data
    ? Math.max(1, ...data.heatmap.map((h) => h.count))
    : 1;

  const donutData = data?.contentMix.types.slice(0, 6) ?? [];
  const totalContentCount = data?.contentMix.totalPosts ?? 0;

  // ─── Render ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4 p-4">
        {/* ─── Header ─── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500/15 to-orange-500/15 flex items-center justify-center">
              <Activity className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">运营节奏分析</h2>
              <p className="text-[10px] text-muted-foreground">基于发布数据的智能运营建议</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[10px] text-muted-foreground"
            onClick={fetchData}
          >
            刷新
          </Button>
        </div>

        {/* ─── Row 1: Today + Week + Goal ─── */}
        <div className="grid grid-cols-3 gap-3">
          {/* Today Plan */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Card className="border-0 shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-1 mb-2">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground font-medium">今日计划</span>
                </div>
                <div className="text-xl font-bold">
                  {data.todayPlan.total}
                  <span className="text-xs font-normal text-muted-foreground ml-0.5">条</span>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                    ✓ {data.todayPlan.completed}
                  </span>
                  {data.todayPlan.pending > 0 && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400">
                      ○ {data.todayPlan.pending}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Week Progress */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-0 shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-1 mb-2">
                  <BarChart3 className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground font-medium">本周进度</span>
                </div>
                <div className="text-xl font-bold">
                  {data.weekProgress.rate}
                  <span className="text-xs font-normal text-muted-foreground ml-0.5">%</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  已发布 {data.weekProgress.published}/{data.weekProgress.total}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Weekly Goal - Circular Progress */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setGoalDialogOpen(true)}
            >
              <CardContent className="p-3 flex flex-col items-center">
                <div className="relative">
                  <svg width="56" height="56" className="-rotate-90">
                    <circle
                      cx="28" cy="28" r="22"
                      fill="none"
                      className="stroke-muted"
                      strokeWidth="4"
                    />
                    <motion.circle
                      cx="28" cy="28" r="22"
                      fill="none"
                      className="stroke-amber-500"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 22}`}
                      initial={{ strokeDashoffset: 2 * Math.PI * 22 }}
                      animate={{
                        strokeDashoffset: 2 * Math.PI * 22 * (1 - Math.min(data.weeklyGoal.percentage, 100) / 100),
                      }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xs font-bold">{data.weeklyGoal.current}</span>
                    <span className="text-[8px] text-muted-foreground">/{data.weeklyGoal.target}</span>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground mt-1.5">周目标</span>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Motivational Message */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-[11px] text-center text-muted-foreground"
        >
          {getMotivationalMessage(data.weeklyGoal.percentage)}
        </motion.p>

        <Separator />

        {/* ─── Section 1: Weekly Rhythm Heatmap ─── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium">发布节奏热力图</span>
            <span className="text-[10px] text-muted-foreground">(近4周数据)</span>
          </div>

          <Card className="border-0 shadow-sm overflow-hidden">
            <CardContent className="p-3">
              {/* Header row */}
              <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: "36px repeat(6, 1fr)" }}>
                <div /> {/* empty corner */}
                {TIME_SLOT_LABELS.map((slot) => (
                  <div key={slot} className="text-center text-[9px] text-muted-foreground font-medium">
                    {slot}
                  </div>
                ))}
              </div>

              {/* Heatmap grid */}
              <div className="space-y-1">
                {WEEKDAY_SHORT.map((day, dayIdx) => (
                  <div key={day} className="grid gap-1" style={{ gridTemplateColumns: "36px repeat(6, 1fr)" }}>
                    <div className="flex items-center justify-center text-[9px] text-muted-foreground font-medium">
                      {day}
                    </div>
                    {TIME_SLOT_LABELS.map((slotLabel, slotIdx) => {
                      const cellKey = `${dayIdx}-${slotIdx}`;
                      const cellData = data.heatmap.find(
                        (h) => h.dayIndex === dayIdx && h.slotKey === TIME_SLOT_LABELS[slotIdx === 0 ? 0 : slotIdx === 1 ? 1 : slotIdx === 2 ? 2 : slotIdx === 3 ? 3 : slotIdx === 4 ? 4 : 5]?.toLowerCase() === undefined
                      );
                      const slotKeys = ["morning", "forenoon", "noon", "afternoon", "evening", "night"];
                      const actualCell = data.heatmap.find(
                        (h) => h.dayIndex === dayIdx && h.slotKey === slotKeys[slotIdx]
                      );
                      const count = actualCell?.count ?? 0;

                      return (
                        <Tooltip key={cellKey}>
                          <TooltipTrigger asChild>
                            <motion.div
                              className={`h-7 rounded-md flex items-center justify-center cursor-default transition-colors ${getHeatmapColor(count, maxHeatmapCount)}`}
                              onMouseEnter={() => setHoveredCell(cellKey)}
                              onMouseLeave={() => setHoveredCell(null)}
                              whileHover={{ scale: 1.1 }}
                              style={{
                                boxShadow: hoveredCell === cellKey ? "0 0 0 2px rgba(245,158,11,0.4)" : undefined,
                              }}
                            >
                              <span className="text-[9px] font-medium text-foreground/70">
                                {count > 0 ? count : ""}
                              </span>
                            </motion.div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-[10px]">
                            <div>周{day} · {slotLabel}</div>
                            <div>发布 {count} 条</div>
                            {actualCell && actualCell.totalEngagement > 0 && (
                              <div>互动 {actualCell.totalEngagement}</div>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Best times summary */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {data.bestPostingTimes.slice(0, 3).map((t) => (
                  <Badge
                    key={t.slotKey}
                    variant="outline"
                    className="text-[9px] px-1.5 py-0 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                  >
                    {t.emoji} {t.label} · {t.score}分
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <Separator />

        {/* ─── Section 2: Content Mix Analyzer ─── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <PieChart className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">内容配比分析</span>
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 ${
                data.contentMix.diversityScore >= 70
                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                  : data.contentMix.diversityScore >= 40
                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                  : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
              }`}
            >
              健康度 {data.contentMix.diversityScore}%
            </Badge>
          </div>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-start gap-4">
                {/* Donut Chart (SVG) */}
                <div className="flex-shrink-0 relative">
                  <svg width="90" height="90" viewBox="0 0 90 90" className="-rotate-90">
                    {donutData.length === 0 && (
                      <circle
                        cx="45" cy="45" r="32"
                        fill="none"
                        className="stroke-muted"
                        strokeWidth="10"
                      />
                    )}
                    {donutData.map((item, idx) => {
                      const circumference = 2 * Math.PI * 32;
                      const totalPct = donutData.reduce((s, d) => s + d.percentage, 0);
                      const segPct = totalPct > 0 ? item.percentage / totalPct : 0;
                      const dashLen = circumference * segPct;
                      const offset = donutData.slice(0, idx).reduce(
                        (s, d) => s + (totalPct > 0 ? (d.percentage / totalPct) * circumference : 0),
                        0,
                      );
                      return (
                        <motion.circle
                          key={item.type}
                          cx="45" cy="45" r="32"
                          fill="none"
                          stroke={DONUT_STROKE_COLORS[idx % DONUT_STROKE_COLORS.length]}
                          strokeWidth="10"
                          strokeLinecap="butt"
                          strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                          strokeDashoffset={-offset}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.4 + idx * 0.1 }}
                        />
                      );
                    })}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-sm font-bold">{totalContentCount}</span>
                    <span className="text-[8px] text-muted-foreground">总内容</span>
                  </div>
                </div>

                {/* Type bars */}
                <div className="flex-1 space-y-2 min-w-0">
                  {data.contentMix.types.slice(0, 5).map((item, idx) => (
                    <div key={item.type} className="space-y-0.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 min-w-0">
                          <div
                            className="h-2 w-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: DONUT_STROKE_COLORS[idx % DONUT_STROKE_COLORS.length] }}
                          />
                          <span className="text-[10px] font-medium truncate">
                            {getContentTypeLabel(item.type)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                          <span className="text-[10px] text-muted-foreground">{item.count}条</span>
                          <span className="text-[9px] font-medium">{item.percentage}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: DONUT_STROKE_COLORS[idx % DONUT_STROKE_COLORS.length] }}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, item.percentage)}%` }}
                          transition={{ duration: 0.5, delay: 0.4 + idx * 0.08 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Diversity recommendation */}
              {data.contentMix.diversityScore < 60 && data.contentMix.types.length > 0 && (
                <div className="mt-3 p-2 rounded-md bg-amber-50 dark:bg-amber-950/15 border border-amber-100 dark:border-amber-900/30">
                  <p className="text-[10px] text-amber-700 dark:text-amber-300">
                    💡 建议增加 <strong>{data.contentMix.types.length < 3 ? "新类型内容" : getContentTypeLabel(data.contentMix.types[data.contentMix.types.length - 1]?.type ?? "")}</strong> 以提升内容多样性
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <Separator />

        {/* ─── Section 3: Publishing Consistency ─── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">发布连续性</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {getTrendIcon(data.consistency.trend)}
                <span className="text-[10px] text-muted-foreground">{getTrendLabel(data.consistency.trend)}</span>
              </div>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800"
              >
                <Flame className="h-2.5 w-2.5 mr-0.5" />
                连续 {data.consistency.streak} 天
              </Badge>
            </div>
          </div>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 space-y-3">
              {/* 4-week calendar */}
              <div className="grid grid-cols-7 gap-1">
                {/* Week labels row */}
                {WEEKDAY_SHORT.map((d) => (
                  <div key={d} className="text-center text-[8px] text-muted-foreground font-medium pb-1">
                    {d}
                  </div>
                ))}

                {/* Calendar cells */}
                {data.consistency.fourWeekCalendar.map((cell, idx) => {
                  const dayNum = parseInt(cell.date.split("-")[2], 10);
                  const isToday = cell.date === safeFormat(new Date(), "yyyy-MM-dd");
                  return (
                    <Tooltip key={cell.date}>
                      <TooltipTrigger asChild>
                        <motion.div
                          className={`h-6 rounded flex items-center justify-center text-[9px] cursor-default border ${getCalendarCellColor(cell.count)} ${
                            isToday ? "ring-1 ring-primary ring-offset-1" : ""
                          }`}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.008 }}
                        >
                          <span className={isToday ? "font-bold" : "text-muted-foreground"}>
                            {dayNum}
                          </span>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-[10px]">
                        {cell.date} · 发布 {cell.count} 条
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>

              {/* Weekly stats */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  周均发布 <strong className="text-foreground">{data.consistency.avgPerWeek}</strong> 条
                </span>
                <div className="flex items-center gap-1.5">
                  {data.consistency.weekCounts.map((wc, i) => (
                    <div key={i} className="flex flex-col items-center gap-0.5">
                      <div
                        className="w-5 rounded-sm transition-all"
                        style={{
                          height: `${Math.max(4, (wc / Math.max(...data.consistency.weekCounts, 1)) * 24)}px`,
                          backgroundColor: wc >= 5 ? "#10b981" : wc >= 3 ? "#f59e0b" : "#ef4444",
                          opacity: 0.6 + (wc / Math.max(...data.consistency.weekCounts, 1)) * 0.4,
                        }}
                      />
                      <span className="text-[7px] text-muted-foreground">W{i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <Separator />

        {/* ─── Section 4: Smart Suggestions ─── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium">AI 智能建议</span>
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
              {data.suggestions.length} 条
            </Badge>
          </div>

          <ScrollArea className="max-h-64">
            <div className="space-y-2">
              {data.suggestions.map((suggestion, idx) => {
                const config = SUGGESTION_CONFIG[suggestion.type];
                const prioConf = PRIORITY_CONFIG[suggestion.priority];
                const IconComp = config.icon;

                return (
                  <motion.div
                    key={`${suggestion.type}-${idx}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 + idx * 0.06 }}
                    className="rounded-lg border p-2.5 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Icon */}
                      <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center flex-shrink-0`}>
                        <IconComp className={`h-4 w-4 ${config.iconColor}`} />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-semibold">{suggestion.title}</span>
                          <Badge
                            variant="outline"
                            className={`text-[8px] px-1 py-0 h-3.5 ${prioConf.bg}`}
                          >
                            {prioConf.label}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          {suggestion.description}
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[10px] text-primary hover:text-primary/80 gap-0.5"
                          onClick={() => handleApplySuggestion(suggestion)}
                        >
                          {suggestion.action}
                          <ArrowUpRight className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>

          {data.suggestions.length === 0 && (
            <div className="flex flex-col items-center py-6 text-muted-foreground">
              <Award className="h-8 w-8 mb-2 text-emerald-300 dark:text-emerald-700" />
              <p className="text-xs">运营状态良好，暂无建议！</p>
            </div>
          )}
        </motion.div>

        <Separator />

        {/* ─── Section 5: Quick Actions ─── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium">快捷操作</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-auto py-2.5 flex-col gap-1.5 border-dashed"
              onClick={handleQuickFill}
            >
              <Calendar className="h-4 w-4 text-amber-500" />
              <span className="text-[10px]">一键补齐本周</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-auto py-2.5 flex-col gap-1.5 border-dashed"
              onClick={handleOptimizeSchedule}
            >
              <Target className="h-4 w-4 text-violet-500" />
              <span className="text-[10px]">优化排期</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-auto py-2.5 flex-col gap-1.5 border-dashed"
              onClick={handleGenerateReport}
            >
              <ChevronRight className="h-4 w-4 text-emerald-500" />
              <span className="text-[10px]">生成周报</span>
            </Button>
          </div>
        </motion.div>

        {/* ─── Goal Setting Dialog ─── */}
        <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
          <DialogContent className="sm:max-w-xs">
            <DialogHeader>
              <DialogTitle className="text-sm">设置周目标</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">每周发布目标 (条)</Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={newGoalTarget}
                  onChange={(e) => setNewGoalTarget(e.target.value)}
                  className="h-9"
                />
                <p className="text-[10px] text-muted-foreground">
                  建议设置 5-7 条/周以获得最佳运营效果
                </p>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">取消</Button>
              </DialogClose>
              <Button
                size="sm"
                className="h-8 text-xs bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                onClick={handleSaveGoal}
                disabled={savingGoal}
              >
                {savingGoal && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
