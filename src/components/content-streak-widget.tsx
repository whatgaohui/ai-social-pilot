"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Flame,
  Trophy,
  Calendar,
  BarChart3,
  TrendingUp,
  Zap,
  Target,
  Award,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface HeatmapDay {
  date: string;
  count: number;
  isToday: boolean;
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  weekCount: number;
  monthCount: number;
  streakDates: string[];
  todayCompleted: boolean;
  heatmapData: HeatmapDay[];
  totalPublished: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MILESTONES = [7, 14, 30, 60, 100];

const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"] as const;

// ─── Helpers ────────────────────────────────────────────────────────────────

function getMotivationalMessage(streak: number): string {
  if (streak >= 30) return "月度大师！你是最强运营！";
  if (streak >= 14) return "两周连续！自律即自由！";
  if (streak >= 7) return "一周达成！你太棒了！";
  if (streak >= 3) return "势头不错！再坚持几天！";
  if (streak >= 1) return "好的开始！继续保持！";
  return "开始你的创作之旅吧！";
}

function getNextMilestone(streak: number): { milestone: number; remaining: number; progress: number; prevMilestone: number } {
  for (const m of MILESTONES) {
    if (streak < m) {
      const prev = MILESTONES[MILESTONES.indexOf(m) - 1] || 0;
      return {
        milestone: m,
        remaining: m - streak,
        progress: ((streak - prev) / (m - prev)) * 100,
        prevMilestone: prev,
      };
    }
  }
  return { milestone: 100, remaining: 0, progress: 100, prevMilestone: 60 };
}

function getHeatmapCellColor(count: number): string {
  if (count === 0) return "bg-muted/50 dark:bg-muted/30";
  if (count === 1) return "bg-emerald-400 dark:bg-emerald-500";
  if (count === 2) return "bg-violet-500 dark:bg-violet-400";
  return "bg-rose-500 dark:bg-rose-400";
}

function getHeatmapCellBorder(count: number): string {
  if (count === 0) return "border-muted/30 dark:border-muted/20";
  if (count === 1) return "border-emerald-300 dark:border-emerald-600";
  if (count === 2) return "border-violet-400 dark:border-violet-500";
  return "border-rose-400 dark:border-rose-500";
}

function getStreakGradient(streak: number): string {
  if (streak >= 14) return "from-violet-500 via-fuchsia-500 to-rose-500";
  if (streak >= 7) return "from-violet-500 via-purple-500 to-rose-500";
  if (streak >= 3) return "from-violet-500 to-rose-500";
  return "from-emerald-500 to-cyan-500";
}

function getStreakRingColor(streak: number): string {
  if (streak >= 30) return "text-rose-500";
  if (streak >= 14) return "text-violet-500";
  if (streak >= 7) return "text-fuchsia-500";
  if (streak >= 3) return "text-amber-500";
  return "text-emerald-500";
}

function getStreakTextColor(streak: number): string {
  if (streak >= 30) return "text-rose-500 dark:text-rose-400";
  if (streak >= 14) return "text-violet-500 dark:text-violet-400";
  if (streak >= 7) return "text-fuchsia-500 dark:text-fuchsia-400";
  if (streak >= 3) return "text-amber-500 dark:text-amber-400";
  return "text-emerald-500 dark:text-emerald-400";
}

// ─── Animated Number Hook ────────────────────────────────────────────────────

function useAnimatedNumber(target: number, duration = 1.2) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(count, target, { duration, ease: "easeOut" });
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [count, target, duration, rounded]);

  return display;
}

// ─── SVG Flame Component ────────────────────────────────────────────────────

function AnimatedFlame({ size = 28, streak }: { size?: number; streak: number }) {
  const intensity = Math.min(streak / 30, 1);
  const flameScale = 1 + intensity * 0.3;

  return (
    <motion.div
      className="relative"
      animate={{
        scale: streak >= 7 ? [1, flameScale, 1] : 1,
        rotate: streak >= 14 ? [0, 3, -3, 0] : 0,
      }}
      transition={{
        duration: streak >= 14 ? 2 : 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <motion.path
          d="M12 2c-1 4-5 6-5 11a5 5 0 0010 0c0-1.5-.5-3-1.5-4-.3-.3-.5-.7-.5-1.2 0-.5.3-1 .6-1.4.2-.3.4-.6.4-1C16 3 14 2 12 2z"
          fill="url(#flameGrad)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8 }}
        />
        <motion.path
          d="M12 22a3 3 0 003-3c0-1.2-.5-2-1.2-2.8-.2-.2-.3-.4-.3-.7 0-.3.2-.5.4-.7.1-.2.1-.3.1-.5 0-1-.6-1.3-2-1.3s-2 .3-2 1.3c0 .2 0 .3.1.5.2.2.4.4.4.7 0 .3-.1.5-.3.7C9.5 16 9 16.8 9 18a3 3 0 003 4z"
          fill="url(#flameInner)"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
        <defs>
          <linearGradient id="flameGrad" x1="12" y1="2" x2="12" y2="18">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
          <linearGradient id="flameInner" x1="12" y1="12" x2="12" y2="22">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
      </svg>
      {streak >= 14 && (
        <motion.div
          className="absolute -top-1 -right-1"
          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <span className="text-xs">✨</span>
        </motion.div>
      )}
      {streak >= 30 && (
        <motion.div
          className="absolute -top-0.5 -left-1"
          animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: 0.3 }}
        >
          <span className="text-[10px]">💫</span>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Progress Ring (SVG circular) ───────────────────────────────────────────

function ProgressRing({
  value,
  size = 64,
  strokeWidth = 4,
  color,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted/30 dark:text-muted/20"
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        className={color}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        style={{ strokeDasharray: circumference }}
      />
    </svg>
  );
}

// ─── Heatmap Cell ───────────────────────────────────────────────────────────

function HeatmapCell({
  day,
  index,
}: {
  day: HeatmapDay;
  index: number;
}) {
  const bgColor = getHeatmapCellColor(day.count);
  const borderColor = getHeatmapCellBorder(day.count);

  const dateObj = new Date(day.date + "T00:00:00");
  const formattedDate = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
  const dayOfWeek = WEEKDAY_LABELS[(dateObj.getDay() + 6) % 7];

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            className={`relative h-6 w-6 rounded-sm border ${bgColor} ${borderColor} cursor-default transition-colors duration-200`}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: index * 0.015,
              duration: 0.2,
              type: "spring",
              stiffness: 400,
              damping: 20,
            }}
            whileHover={{ scale: 1.25, zIndex: 10 }}
          >
            {day.isToday && (
              <motion.div
                className="absolute -inset-0.5 rounded-sm border-2 border-amber-400 dark:border-amber-500"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
            {day.count > 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[8px] font-bold text-white leading-none">
                  {day.count}
                </span>
              </div>
            )}
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-[10px] px-2 py-1">
          <p>
            {formattedDate} 周{dayOfWeek} · {day.count > 0 ? `${day.count} 篇已发布` : "无内容"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── Stat Mini Card ─────────────────────────────────────────────────────────

function StatMiniCard({
  icon: Icon,
  label,
  value,
  color,
  delay = 0,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  color: string;
  delay?: number;
}) {
  return (
    <motion.div
      className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      <div className={`rounded-md bg-gradient-to-br ${color} p-1.5`}>
        <Icon className="h-3 w-3 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground truncate">{label}</p>
        <p className="text-sm font-bold tabular-nums leading-tight">{value}</p>
      </div>
    </motion.div>
  );
}

// ─── Streak Skeleton Loader ─────────────────────────────────────────────────

export function ContentStreakWidgetSkeleton() {
  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-16 rounded-full" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-16 w-full rounded-lg" />
        <div className="space-y-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Widget ────────────────────────────────────────────────────────────

export function ContentStreakWidget() {
  const [data, setData] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hooks must be called before any early returns
  const currentStreak = data?.currentStreak ?? 0;
  const longestStreak = data?.longestStreak ?? 0;
  const weekCount = data?.weekCount ?? 0;
  const monthCount = data?.monthCount ?? 0;
  const totalPublished = data?.totalPublished ?? 0;

  const animatedStreak = useAnimatedNumber(currentStreak, 1.4);
  const animatedLongest = useAnimatedNumber(longestStreak, 1.4);
  const animatedWeek = useAnimatedNumber(weekCount, 0.8);
  const animatedMonth = useAnimatedNumber(monthCount, 0.8);
  const animatedTotal = useAnimatedNumber(totalPublished, 1.6);

  const fetchStreak = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/content/streak");
      if (!res.ok) throw new Error("获取数据失败");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStreak();
  }, [fetchStreak]);

  if (loading) return <ContentStreakWidgetSkeleton />;
  if (error || !data) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">{error || "暂无数据"}</p>
          <motion.button
            onClick={fetchStreak}
            className="mt-2 text-xs text-violet-500 hover:underline"
            whileTap={{ scale: 0.97 }}
          >
            重试
          </motion.button>
        </CardContent>
      </Card>
    );
  }

  const {
    heatmapData,
    todayCompleted,
  } = data;

  const message = getMotivationalMessage(currentStreak);
  const nextMilestone = getNextMilestone(currentStreak);
  const showFlame = currentStreak >= 3;
  const gradient = getStreakGradient(currentStreak);
  const streakColor = getStreakTextColor(currentStreak);
  const ringColor = getStreakRingColor(currentStreak);

  // Heatmap: 5 rows x 7 cols (last 35 days)
  const heatmapRows: HeatmapDay[][] = [];
  for (let i = 0; i < 5; i++) {
    heatmapRows.push(heatmapData.slice(i * 7, (i + 1) * 7));
  }

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      {/* Gradient top border */}
      <div className={`h-1 bg-gradient-to-r ${gradient}`} />

      <CardContent className="p-4 space-y-4">
        {/* ─── Header ─── */}
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2">
            <div className={`rounded-md bg-gradient-to-br ${gradient} p-1.5`}>
              <Flame className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold">运营连续打卡</span>
          </div>
          {todayCompleted && (
            <Badge className="text-[9px] h-5 px-2 border-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              今日已完成
            </Badge>
          )}
        </motion.div>

        {/* ─── Streak Hero Section ─── */}
        <motion.div
          className="flex items-center gap-4"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {/* Progress ring with streak number */}
          <div className="relative flex-shrink-0">
            <ProgressRing
              value={nextMilestone.progress}
              size={72}
              strokeWidth={4}
              color={ringColor}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              {showFlame ? (
                <AnimatedFlame size={20} streak={currentStreak} />
              ) : (
                <Zap className="h-5 w-5 text-muted-foreground/40" />
              )}
            </div>
          </div>

          {/* Large streak number */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <motion.span
                className={`text-5xl font-black tabular-nums leading-none ${streakColor}`}
                key={currentStreak}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {animatedStreak}
              </motion.span>
              <span className="text-sm font-medium text-muted-foreground">
                天连续发布
              </span>
            </div>
            <motion.p
              className="text-xs text-muted-foreground mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {message}
            </motion.p>
          </div>
        </motion.div>

        {/* ─── Stats Row (4 mini cards) ─── */}
        <div className="grid grid-cols-2 gap-2">
          <StatMiniCard
            icon={BarChart3}
            label="本周发布"
            value={`${animatedWeek} 篇`}
            color="from-violet-500 to-purple-600"
            delay={0.15}
          />
          <StatMiniCard
            icon={Calendar}
            label="本月发布"
            value={`${animatedMonth} 篇`}
            color="from-emerald-500 to-teal-600"
            delay={0.2}
          />
          <StatMiniCard
            icon={Trophy}
            label="最长连续"
            value={`${animatedLongest} 天`}
            color="from-amber-500 to-orange-600"
            delay={0.25}
          />
          <StatMiniCard
            icon={TrendingUp}
            label="总发布数"
            value={`${animatedTotal} 篇`}
            color="from-rose-500 to-pink-600"
            delay={0.3}
          />
        </div>

        {/* ─── Milestone Progress ─── */}
        {currentStreak > 0 && currentStreak < 100 && (
          <motion.div
            className="rounded-lg border bg-gradient-to-r from-violet-50/60 to-rose-50/40 dark:from-violet-950/20 dark:to-rose-950/10 p-3 space-y-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-violet-500" />
                <span className="text-xs font-medium">下一里程碑</span>
              </div>
              <div className="flex items-center gap-1">
                <Award className="h-3 w-3 text-amber-500" />
                <span className="text-xs font-bold tabular-nums text-amber-600 dark:text-amber-400">
                  {nextMilestone.milestone}天
                </span>
              </div>
            </div>
            <div className="relative h-2 rounded-full bg-muted/40 overflow-hidden">
              <motion.div
                className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${gradient}`}
                initial={{ width: 0 }}
                animate={{ width: `${nextMilestone.progress}%` }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.5 }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground text-right">
              还差 <span className="font-semibold text-violet-600 dark:text-violet-400">{nextMilestone.remaining}</span> 天达成
            </p>
          </motion.div>
        )}

        {currentStreak >= 100 && (
          <motion.div
            className="rounded-lg border border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-rose-50 dark:from-amber-950/30 dark:to-rose-950/20 p-3 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35 }}
          >
            <div className="flex items-center justify-center gap-2">
              <motion.span
                className="text-2xl"
                animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                👑
              </motion.span>
              <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                百日传奇！已达成所有里程碑！
              </span>
            </div>
          </motion.div>
        )}

        {/* ─── Calendar Heatmap ─── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-muted-foreground">
              最近 35 天活跃图
            </span>
            <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm bg-muted/50 dark:bg-muted/30" />
                无
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400 dark:bg-emerald-500" />
                1
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm bg-violet-500 dark:bg-violet-400" />
                2
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm bg-rose-500 dark:bg-rose-400" />
                3+
              </span>
            </div>
          </div>

          {/* Heatmap grid with weekday labels */}
          <div className="flex gap-1.5">
            {/* Weekday column */}
            <div className="flex flex-col gap-1 pt-0">
              {WEEKDAY_LABELS.map((label, i) => (
                <div key={i} className="h-6 flex items-center">
                  <span className="text-[8px] text-muted-foreground/50 font-medium w-4 text-right">
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {/* Grid cells: transpose - 7 columns × 5 rows */}
            <div className="flex gap-1 flex-1">
              {Array.from({ length: 7 }).map((_, colIdx) => (
                <div key={colIdx} className="flex flex-col gap-1">
                  {heatmapRows.map((row, rowIdx) => {
                    const day = row[colIdx];
                    return day ? (
                      <HeatmapCell
                        key={day.date}
                        day={day}
                        index={rowIdx * 7 + colIdx}
                      />
                    ) : null;
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
