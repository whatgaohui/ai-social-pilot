"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { ContentPost } from "@/types";
import { safeFormat } from "@/lib/safe-date";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ─── Props ────────────────────────────────────────────────────────────────────

interface CalendarMiniHeatmapProps {
  posts: ContentPost[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

// ─── Animation variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.008,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.25,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Returns 0=Mon, 1=Tue, ..., 6=Sun */
function getFirstDayOffset(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  // JS: 0=Sun, 1=Mon, ..., 6=Sat → convert to Mon-first
  return day === 0 ? 6 : day - 1;
}

function getHeatmapColor(count: number): string {
  if (count === 0) return "bg-muted";
  if (count === 1) return "bg-emerald-300/50 dark:bg-emerald-300/40";
  if (count === 2) return "bg-emerald-500/60 dark:bg-emerald-500/50";
  return "bg-emerald-700/80 dark:bg-emerald-600/70";
}

function toDateStr(year: number, month: number, day: number): string {
  return new Date(year, month, day).toISOString().split("T")[0];
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function CalendarMiniHeatmap({
  posts,
  selectedDate,
  onSelectDate,
}: CalendarMiniHeatmapProps) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const todayDate = now.getDate();

  // ── Derived values ─────────────────────────────────────────────────────────

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOffset = getFirstDayOffset(currentYear, currentMonth);
  const todayStr = toDateStr(currentYear, currentMonth, todayDate);

  // Map of YYYY-MM-DD → post count for the current month
  const postCountByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const post of posts) {
      const dateKey = post.scheduledDate;
      if (!dateKey) continue;
      map.set(dateKey, (map.get(dateKey) || 0) + 1);
    }
    return map;
  }, [posts]);

  // Build grid cells
  const cells = useMemo(() => {
    const result: Array<{
      day: number;
      dateStr: string;
      count: number;
      isToday: boolean;
      isSelected: boolean;
    }> = [];

    // Leading empty cells before first day
    for (let i = 0; i < firstDayOffset; i++) {
      result.push({ day: 0, dateStr: "", count: 0, isToday: false, isSelected: false });
    }

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = toDateStr(currentYear, currentMonth, d);
      const count = postCountByDate.get(dateStr) || 0;
      result.push({
        day: d,
        dateStr,
        count,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
      });
    }

    return result;
  }, [daysInMonth, firstDayOffset, postCountByDate, todayStr, selectedDate, currentYear, currentMonth]);

  // ── Empty state ────────────────────────────────────────────────────────────

  if (posts.length === 0) {
    return (
      <Card className="py-4">
        <CardHeader className="pb-0 pt-0 px-4">
          <CardTitle className="text-sm font-semibold">本月发布热力图</CardTitle>
        </CardHeader>
        <CardContent className="px-4 py-4">
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
            <div className="text-2xl mb-2">📅</div>
            <p className="text-xs">暂无发布数据</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Card className="py-4">
      <CardHeader className="pb-0 pt-0 px-4">
        <CardTitle className="text-sm font-semibold">本月发布热力图</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <TooltipProvider delayDuration={200}>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((wd) => (
              <div
                key={wd}
                className="w-6 h-4 flex items-center justify-center text-[10px] text-muted-foreground"
              >
                {wd}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          <motion.div
            className="grid grid-cols-7 gap-1"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {cells.map((cell, idx) => {
              // Empty placeholder cell
              if (cell.day === 0) {
                return (
                  <motion.div
                    key={`empty-${idx}`}
                    className="w-6 h-6"
                  />
                );
              }

              return (
                <motion.div key={cell.dateStr} variants={itemVariants}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onSelectDate(cell.dateStr)}
                        className={`
                          w-6 h-6 rounded-sm text-[10px] font-medium tabular-nums
                          flex items-center justify-center transition-all duration-150 cursor-pointer
                          ${getHeatmapColor(cell.count)}
                          ${cell.isSelected ? "!bg-violet-500 text-white" : ""}
                          ${cell.isToday && !cell.isSelected ? "ring-2 ring-violet-500" : ""}
                          hover:brightness-110
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500
                        `}
                        aria-label={`${safeFormat(cell.dateStr, "M月d日")}: ${cell.count}篇内容`}
                      >
                        <span className="sr-only">
                          {safeFormat(cell.dateStr, "M月d日")}: {cell.count}篇内容
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs py-1 px-2">
                      <p className="font-medium">{safeFormat(cell.dateStr, "M月d日")}</p>
                      <p className="text-muted-foreground">{cell.count}篇内容</p>
                    </TooltipContent>
                  </Tooltip>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-1.5 mt-2">
            <span className="text-[10px] text-muted-foreground">少</span>
            <div className="flex gap-0.5">
              <div className="h-3 w-3 rounded-[2px] bg-muted" />
              <div className="h-3 w-3 rounded-[2px] bg-emerald-300/50 dark:bg-emerald-300/40" />
              <div className="h-3 w-3 rounded-[2px] bg-emerald-500/60 dark:bg-emerald-500/50" />
              <div className="h-3 w-3 rounded-[2px] bg-emerald-700/80 dark:bg-emerald-600/70" />
            </div>
            <span className="text-[10px] text-muted-foreground">多</span>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
