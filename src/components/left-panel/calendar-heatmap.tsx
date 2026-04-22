"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import type { ContentPost } from "@/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Flame, Calendar } from "lucide-react";
import { format, subDays, startOfDay, differenceInDays, parseISO, eachDayOfInterval, startOfMonth, endOfMonth } from "date-fns";
import { zhCN } from "date-fns/locale";

// ─── Heatmap Constants ───────────────────────────────────────────────────────

const CELL_SIZE = 14;
const CELL_GAP = 2;
const DAYS_TO_SHOW = 90;

// Color levels: 0=empty, 1=light, 2-3=medium, 4+=dark
const HEAT_COLORS = {
  light: {
    0: "#f0f0f0",      // empty - light mode
    1: "#ddd6fe",      // violet-200
    2: "#a78bfa",      // violet-400
    3: "#7c3aed",      // violet-600
  },
  dark: {
    0: "#27272a",      // zinc-800
    1: "#4c1d95",      // violet-900
    2: "#6d28d9",      // violet-700
    3: "#8b5cf6",      // violet-500
  },
} as const;

// Use CSS custom properties approach for dark mode detection
// We'll use a className-based approach instead

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getHeatLevel(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  return 3;
}

function getHeatColor(level: number, isDark: boolean): string {
  return isDark ? HEAT_COLORS.dark[level] : HEAT_COLORS.light[level];
}

interface HeatmapDay {
  date: string; // yyyy-MM-dd
  count: number;
  level: number;
  weekColumn: number;
  dayRow: number; // 0=Mon, 6=Sun
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface CalendarHeatmapProps {
  posts: ContentPost[];
}

export function CalendarHeatmap({ posts }: CalendarHeatmapProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDark, setIsDark] = useState(false);

  // Detect dark mode
  useMemo(() => {
    if (typeof window !== "undefined") {
      const observer = new MutationObserver(() => {
        setIsDark(document.documentElement.classList.contains("dark"));
      });
      setIsDark(document.documentElement.classList.contains("dark"));
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
      return () => observer.disconnect();
    }
  }, []);

  // Build heatmap data
  const { days, totalPosts, maxStreak, monthPosts } = useMemo(() => {
    const today = startOfDay(new Date());
    const startDate = subDays(today, DAYS_TO_SHOW - 1);

    // Build posts-by-date map
    const postsByDate: Record<string, number> = {};
    posts.forEach((p) => {
      if (p.scheduledDate) {
        postsByDate[p.scheduledDate] = (postsByDate[p.scheduledDate] || 0) + 1;
      }
    });

    // Generate all days
    const allDays = eachDayOfInterval({ start: startDate, end: today });

    // Group by weeks (columns), starting from Monday
    const heatmapDays: HeatmapDay[] = [];
    let maxStreak = 0;
    let currentStreak = 0;

    // Calculate the starting week offset (for proper column alignment)
    const startDayOfWeek = (startDate.getDay() + 6) % 7; // 0=Mon

    allDays.forEach((day, i) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const count = postsByDate[dateStr] || 0;
      const level = getHeatLevel(count);

      // Column = which week this belongs to from the start
      const dayIndex = i + startDayOfWeek;
      const weekColumn = Math.floor(dayIndex / 7);
      const dayRow = (day.getDay() + 6) % 7; // 0=Mon, 6=Sun

      heatmapDays.push({ date: dateStr, count, level, weekColumn, dayRow });

      // Streak calculation
      if (count > 0) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });

    const totalPosts = posts.reduce((sum, p) => sum + 1, 0);
    const now = new Date();
    const monthPrefix = format(now, "yyyy-MM");
    const thisMonthPosts = posts.filter(
      (p) => p.scheduledDate && p.scheduledDate.startsWith(monthPrefix)
    ).length;

    return { days: heatmapDays, totalPosts, maxStreak, monthPosts: thisMonthPosts };
  }, [posts]);

  // Month labels
  const monthLabels = useMemo(() => {
    const labels: { label: string; column: number }[] = [];
    let lastMonth = "";
    days.forEach((d) => {
      const monthStr = format(parseISO(d.date), "M月");
      if (monthStr !== lastMonth) {
        labels.push({ label: monthStr, column: d.weekColumn });
        lastMonth = monthStr;
      }
    });
    return labels;
  }, [days]);

  // SVG dimensions
  const maxColumn = days.length > 0 ? Math.max(...days.map((d) => d.weekColumn)) : 0;
  const svgWidth = (maxColumn + 1) * (CELL_SIZE + CELL_GAP) + 20;
  const svgHeight = 7 * (CELL_SIZE + CELL_GAP) + 16;

  return (
    <TooltipProvider delayDuration={200}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="mx-3 mb-2">
          <CollapsibleTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.005 }}
              whileTap={{ scale: 0.995 }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md bg-muted/40 border border-border/30 hover:bg-muted/60 transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3 text-violet-500" />
                <span className="text-[9px] font-semibold text-foreground/80 group-hover:text-foreground transition-colors">
                  发布热力图
                </span>
                <span className="text-[9px] text-muted-foreground tabular-nums">
                  近90天 {posts.filter((p) => {
                    const cutoff = format(subDays(new Date(), 90), "yyyy-MM-dd");
                    return p.scheduledDate >= cutoff;
                  }).length} 篇
                </span>
              </div>
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
              </motion.div>
            </motion.button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div ref={containerRef} className="mt-1.5 p-2 rounded-lg border border-border/30 bg-muted/20">
                {/* Month labels */}
                <div className="relative" style={{ height: 12, paddingLeft: 20 }}>
                  {monthLabels.map((m) => (
                    <span
                      key={m.label}
                      className="absolute text-[7px] text-muted-foreground font-medium tabular-nums"
                      style={{
                        left: m.column * (CELL_SIZE + CELL_GAP) + 20,
                        top: 0,
                      }}
                    >
                      {m.label}
                    </span>
                  ))}
                </div>

                {/* SVG Heatmap */}
                <div className="overflow-x-auto">
                  <svg
                    width={svgWidth}
                    height={svgHeight}
                    className="block"
                    role="img"
                    aria-label="内容发布热力图"
                  >
                    {/* Weekday labels */}
                    {WEEKDAYS.map((label, i) => (
                      <text
                        key={label}
                        x={16}
                        y={i * (CELL_SIZE + CELL_GAP) + CELL_SIZE - 2}
                        textAnchor="end"
                        className="fill-muted-foreground/50"
                        style={{ fontSize: 7, fontFamily: "system-ui, sans-serif" }}
                      >
                        {label}
                      </text>
                    ))}

                    {/* Day cells */}
                    {days.map((day) => (
                      <Tooltip key={day.date}>
                        <TooltipTrigger asChild>
                          <rect
                            x={day.weekColumn * (CELL_SIZE + CELL_GAP) + 20}
                            y={day.dayRow * (CELL_SIZE + CELL_GAP)}
                            width={CELL_SIZE}
                            height={CELL_SIZE}
                            rx={2}
                            fill={getHeatColor(day.level, isDark)}
                            className="transition-opacity hover:opacity-80 cursor-pointer"
                            style={{
                              transition: "opacity 0.15s",
                            }}
                          >
                            <title>
                              {format(parseISO(day.date), "M月d日 EEEE", { locale: zhCN })}
                              {" · "}
                              {day.count > 0 ? `${day.count} 篇内容` : "无发布"}
                            </title>
                          </rect>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-[10px] px-2 py-1">
                          <p className="font-medium">
                            {format(parseISO(day.date), "M月d日 EEEE", { locale: zhCN })}
                          </p>
                          <p className="text-muted-foreground">
                            {day.count > 0 ? `${day.count} 篇内容` : "无发布"}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </svg>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-between mt-2 px-0.5">
                  <span className="text-[7px] text-muted-foreground">少</span>
                  <div className="flex items-center gap-0.5">
                    {[0, 1, 2, 3].map((level) => (
                      <div
                        key={level}
                        className="rounded-sm"
                        style={{
                          width: 10,
                          height: 10,
                          backgroundColor: getHeatColor(level, isDark),
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-[7px] text-muted-foreground">多</span>
                </div>

                {/* Stats Summary */}
                <div className="mt-2 pt-2 border-t border-border/30 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-muted-foreground">
                      过去90天共发布
                    </span>
                    <span className="text-[9px] font-semibold tabular-nums">
                      {posts.filter((p) => {
                        const cutoff = format(subDays(new Date(), 90), "yyyy-MM-dd");
                        return p.scheduledDate >= cutoff;
                      }).length} 篇
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                      <Flame className="h-3 w-3 text-emerald-500" />
                      最长连续发布
                    </span>
                    <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {maxStreak} 天
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-muted-foreground">
                      本月发布
                    </span>
                    <span className="text-[9px] font-semibold tabular-nums">
                      {monthPosts} 篇
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </TooltipProvider>
  );
}
