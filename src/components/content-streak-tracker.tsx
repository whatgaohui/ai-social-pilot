"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Types ──────────────────────────────────────────────────────────────────

interface WeeklyDayData {
  day: string;
  date: string;
  count: number;
  score: number;
  isToday: boolean;
}

interface ContentStreakTrackerProps {
  currentStreak: number;
  bestStreak: number;
  weeklyData: WeeklyDayData[];
  compact?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getMotivationalMessage(streak: number): string {
  if (streak >= 30) return "月更达人，无人能挡！";
  if (streak >= 14) return "两周连更，内容达人！";
  if (streak >= 7) return "连续一周！太棒了";
  if (streak >= 3) return "不错的节奏！保持下去";
  return "加油，坚持就是胜利！";
}

function getStreakColor(streak: number): string {
  if (streak >= 30) return "text-rose-500";
  if (streak >= 14) return "text-orange-500";
  if (streak >= 7) return "text-amber-500";
  if (streak >= 3) return "text-emerald-500";
  return "text-muted-foreground";
}

function getCellColor(count: number): string {
  if (count === 0) return "bg-muted/60 dark:bg-muted/30";
  if (count === 1) return "bg-emerald-400 dark:bg-emerald-500";
  return "bg-emerald-600 dark:bg-emerald-400";
}

const DAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"] as const;

// ─── Animated Number Hook ────────────────────────────────────────────────────

function useAnimatedNumber(target: number, duration = 1) {
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

// ─── Heatmap Cell ───────────────────────────────────────────────────────────

interface HeatmapCellProps {
  data: WeeklyDayData;
  dayLabel: string;
}

function HeatmapCell({ data, dayLabel }: HeatmapCellProps) {
  const color = getCellColor(data.count);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative flex flex-col items-center gap-1 group cursor-default">
            <span className="text-[9px] text-muted-foreground/60 font-medium">
              {dayLabel}
            </span>
            <motion.div
              className={`h-8 w-8 rounded-lg ${color} transition-all duration-300 group-hover:scale-110 group-hover:shadow-md`}
              whileHover={{ y: -2 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              {data.isToday && (
                <motion.div
                  className="absolute inset-0 rounded-lg border-2 border-violet-500 dark:border-violet-400"
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
              {data.count > 0 && (
                <div className="flex items-center justify-center h-full w-full">
                  <span className="text-[10px] font-bold text-white tabular-nums">
                    {data.count}
                  </span>
                </div>
              )}
            </motion.div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs px-2 py-1">
          <p>
            {data.day} · {data.count > 0 ? `${data.count} 篇已发布` : "无内容"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function ContentStreakTracker({
  currentStreak,
  bestStreak,
  weeklyData,
  compact = false,
}: ContentStreakTrackerProps) {
  const animatedStreak = useAnimatedNumber(currentStreak, 1.2);
  const animatedBest = useAnimatedNumber(bestStreak, 1.2);
  const message = getMotivationalMessage(currentStreak);
  const streakColor = getStreakColor(currentStreak);
  const showBadge = currentStreak >= 3;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          {showBadge && <span className="text-sm">🔥</span>}
          <span className={`text-sm font-bold tabular-nums ${streakColor}`}>
            {animatedStreak}
          </span>
          <span className="text-[10px] text-muted-foreground">天连更</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Streak Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showBadge && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 15 }}
              className="relative"
            >
              <motion.span
                className="text-xl"
                animate={
                  currentStreak >= 7
                    ? { scale: [1, 1.2, 1] }
                    : { scale: 1 }
                }
                transition={{
                  duration: 1,
                  repeat: currentStreak >= 7 ? Infinity : 0,
                  ease: "easeInOut",
                }}
              >
                🔥
              </motion.span>
              {currentStreak >= 7 && (
                <motion.div
                  className="absolute -top-0.5 -right-0.5"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <span className="text-[8px]">✨</span>
                </motion.div>
              )}
            </motion.div>
          )}
          <div>
            <div className="flex items-baseline gap-1">
              <span className={`text-lg font-bold tabular-nums ${streakColor}`}>
                {animatedStreak}
              </span>
              <span className="text-xs text-muted-foreground">天连续发布</span>
            </div>
            <p className="text-[10px] text-muted-foreground/70">{message}</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-[10px] text-muted-foreground">最佳纪录</p>
          <p className="text-sm font-semibold tabular-nums text-amber-500">
            🏆 {animatedBest}天
          </p>
        </div>
      </div>

      {/* 7-Day Heatmap */}
      <div className="grid grid-cols-7 gap-1.5">
        {weeklyData.map((dayData, i) => (
          <HeatmapCell
            key={dayData.date}
            data={dayData}
            dayLabel={DAY_LABELS[i] || dayData.day}
          />
        ))}
      </div>
    </div>
  );
}
