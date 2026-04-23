"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { ChevronDown, Flame, Calendar, Grid3X3, CalendarDays } from "lucide-react";
import { format, subDays, startOfDay, differenceInDays, eachDayOfInterval, startOfMonth, endOfMonth } from "date-fns";
import { safeFormat } from "@/lib/safe-date";
import { zhCN } from "date-fns/locale";

// ─── Heatmap Constants ───────────────────────────────────────────────────────

const CELL_SIZE = 14;
const CELL_GAP = 2;
const DAYS_TO_SHOW = 90;

// Emerald color scale: 0 posts → 1-2 → 3-4 → 5-6 → 7+
const HEAT_COLORS = {
  light: {
    0: "#f0f0f0",      // empty - light mode
    1: "#d1fae5",      // emerald-100
    2: "#6ee7b7",      // emerald-300
    3: "#34d399",      // emerald-400
    4: "#10b981",      // emerald-500
  },
  dark: {
    0: "#27272a",      // zinc-800
    1: "#064e3b",      // emerald-900
    2: "#065f46",      // emerald-800
    3: "#059669",      // emerald-600
    4: "#10b981",      // emerald-500
  },
} as const;

// Legend labels for the 5 levels
const LEGEND_LABELS = ["无", "1-2", "3-4", "5-6", "7+"];

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getHeatLevel(count: number): number {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 4) return 2;
  if (count <= 6) return 3;
  return 4;
}

function getHeatColor(level: number, isDark: boolean): string {
  return isDark ? HEAT_COLORS.dark[level] : HEAT_COLORS.light[level];
}

function getHeatClass(level: number): string {
  switch (level) {
    case 0: return "bg-muted";
    case 1: return "bg-emerald-500/20";
    case 2: return "bg-emerald-500/40";
    case 3: return "bg-emerald-500/60";
    case 4: return "bg-emerald-500/80";
    default: return "bg-muted";
  }
}

interface HeatmapDay {
  date: string; // yyyy-MM-dd
  count: number;
  level: number;
  weekColumn: number;
  dayRow: number; // 0=Mon, 6=Sun
  topics: string[]; // topic snippets for that date
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface CalendarHeatmapProps {
  posts: ContentPost[];
}

export function CalendarHeatmap({ posts }: CalendarHeatmapProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDark, setIsDark] = useState(false);
  const [viewMode, setViewMode] = useState<"month" | "week">("week"); // week = GitHub style, month = calendar view
  const { setSelectedDate, setSelectedPostId, leftPanelTab } = useAppStore();

  // Detect dark mode
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    setIsDark(document.documentElement.classList.contains("dark"));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  // Build heatmap data
  const { days, totalPosts, maxStreak, monthPosts, postsByDateMap } = useMemo(() => {
    const today = startOfDay(new Date());
    const startDate = subDays(today, DAYS_TO_SHOW - 1);

    // Build posts-by-date map with topic snippets
    const postsByDate: Record<string, { count: number; topics: string[] }> = {};
    posts.forEach((p) => {
      if (p.scheduledDate) {
        const existing = postsByDate[p.scheduledDate] || { count: 0, topics: [] };
        existing.count += 1;
        if (existing.topics.length < 3) {
          existing.topics.push(p.topic || p.contentType || "内容");
        }
        postsByDate[p.scheduledDate] = existing;
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
      const dayData = postsByDate[dateStr];
      const count = dayData?.count || 0;
      const topics = dayData?.topics || [];
      const level = getHeatLevel(count);

      // Column = which week this belongs to from the start
      const dayIndex = i + startDayOfWeek;
      const weekColumn = Math.floor(dayIndex / 7);
      const dayRow = (day.getDay() + 6) % 7; // 0=Mon, 6=Sun

      heatmapDays.push({ date: dateStr, count, level, weekColumn, dayRow, topics });

      // Streak calculation
      if (count > 0) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });

    const totalPosts = posts.reduce((sum, _p) => sum + 1, 0);
    const now = new Date();
    const monthPrefix = format(now, "yyyy-MM");
    const thisMonthPosts = posts.filter(
      (p) => p.scheduledDate && p.scheduledDate.startsWith(monthPrefix)
    ).length;

    return { days: heatmapDays, totalPosts, maxStreak, monthPosts: thisMonthPosts, postsByDateMap: postsByDate };
  }, [posts]);

  // Month labels
  const monthLabels = useMemo(() => {
    const labels: { label: string; column: number }[] = [];
    let lastMonth = "";
    days.forEach((d) => {
      const monthStr = safeFormat(d.date, "M月");
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

  // Handle cell click — navigate to that date in calendar
  const handleCellClick = useCallback((day: HeatmapDay) => {
    setSelectedDate(day.date);
    // Also switch to calendar tab
    useAppStore.getState().setLeftPanelTab("calendar");
    // If there are posts on this date, select the first one
    const postForDate = posts.find((p) => p.scheduledDate === day.date);
    if (postForDate) {
      setSelectedPostId(postForDate.id);
    }
  }, [posts, setSelectedDate, setSelectedPostId]);

  // Stagger delay for each cell (top-left to bottom-right)
  const getStaggerDelay = useCallback((day: HeatmapDay) => {
    return (day.weekColumn * 7 + day.dayRow) * 8; // ms per cell
  }, []);

  // Month view data
  const monthViewData = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    return allDays.map((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const dayData = postsByDateMap[dateStr];
      const count = dayData?.count || 0;
      const topics = dayData?.topics || [];
      return {
        date: dateStr,
        day: day.getDate(),
        dow: day.getDay(),
        level: getHeatLevel(count),
        count,
        topics,
        isCurrentMonth: true,
      };
    });
  }, [postsByDateMap]);

  // Pad month view: add leading days from previous month
  const paddedMonthData = useMemo(() => {
    const firstDow = monthViewData.length > 0 ? (monthViewData[0].dow + 6) % 7 : 0; // 0=Mon
    const padding: typeof monthViewData[0][] = [];
    for (let i = 0; i < firstDow; i++) {
      padding.push({
        date: "",
        day: 0,
        dow: i,
        level: 0,
        count: 0,
        topics: [],
        isCurrentMonth: false,
      });
    }
    return [...padding, ...monthViewData];
  }, [monthViewData]);

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
                <Calendar className="h-3 w-3 text-emerald-500" />
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
                {/* View mode toggle */}
                <div className="flex items-center gap-1 mb-2">
                  <button
                    onClick={() => setViewMode("week")}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium transition-colors ${
                      viewMode === "week"
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                    aria-label="周视图"
                  >
                    <Grid3X3 className="h-2.5 w-2.5" />
                    周
                  </button>
                  <button
                    onClick={() => setViewMode("month")}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium transition-colors ${
                      viewMode === "month"
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                    aria-label="月视图"
                  >
                    <CalendarDays className="h-2.5 w-2.5" />
                    月
                  </button>
                </div>

                <AnimatePresence mode="wait">
                {viewMode === "week" ? (
                  /* ── Week (GitHub-style) View ── */
                  <motion.div
                    key="week-view"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
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

                    {/* SVG Heatmap with stagger entrance */}
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

                        {/* Day cells with stagger entrance animation */}
                        {days.map((day) => (
                          <Tooltip key={day.date}>
                            <TooltipTrigger asChild>
                              <motion.rect
                                x={day.weekColumn * (CELL_SIZE + CELL_GAP) + 20}
                                y={day.dayRow * (CELL_SIZE + CELL_GAP)}
                                width={CELL_SIZE}
                                height={CELL_SIZE}
                                rx={2}
                                fill={getHeatColor(day.level, isDark)}
                                className="cursor-pointer hover:opacity-80"
                                initial={{ opacity: 0, scale: 0.3 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{
                                  duration: 0.25,
                                  delay: getStaggerDelay(day) / 1000,
                                  ease: "easeOut",
                                }}
                                whileHover={{ scale: 1.3 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleCellClick(day)}
                              />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-[10px] px-2.5 py-1.5 max-w-[200px]">
                              <div>
                                <p className="font-semibold">
                                  {safeFormat(day.date, "M月d日 EEEE", "--", { locale: zhCN })}
                                </p>
                                <p className="text-muted-foreground mt-0.5">
                                  {day.count > 0 ? `${day.count} 篇内容` : "无发布"}
                                </p>
                                {day.topics.length > 0 && (
                                  <div className="mt-1 pt-1 border-t border-border/20">
                                    <p className="text-[9px] text-muted-foreground/70 truncate">
                                      📝 {day.topics.slice(0, 2).join(" · ")}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </svg>
                    </div>
                  </motion.div>
                ) : (
                  /* ── Month Calendar View ── */
                  <motion.div
                    key="month-view"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Month header */}
                    <div className="text-center mb-1.5">
                      <span className="text-[10px] font-semibold text-foreground/80">
                        {safeFormat(new Date(), "yyyy年M月", "--")}
                      </span>
                    </div>

                    {/* Weekday headers */}
                    <div className="grid grid-cols-7 gap-0.5 mb-1">
                      {WEEKDAYS.map((d) => (
                        <div key={d} className="text-center text-[7px] text-muted-foreground/60 font-medium py-0.5">
                          {d}
                        </div>
                      ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="grid grid-cols-7 gap-0.5">
                      {paddedMonthData.map((day, i) => (
                        <Tooltip key={day.date || `pad-${i}`}>
                          <TooltipTrigger asChild>
                            <motion.div
                              className={`
                                aspect-square rounded-sm flex items-center justify-center text-[8px]
                                cursor-pointer transition-colors
                                ${!day.isCurrentMonth ? "opacity-20 pointer-events-none" : ""}
                                ${day.isCurrentMonth ? getHeatClass(day.level) : "bg-transparent"}
                              `}
                              initial={{ opacity: 0, scale: 0.6 }}
                              animate={{ opacity: day.isCurrentMonth ? 1 : 0.2, scale: 1 }}
                              transition={{
                                duration: 0.2,
                                delay: i * 10 / 1000,
                                ease: "easeOut",
                              }}
                              whileHover={day.isCurrentMonth ? { scale: 1.15 } : {}}
                              whileTap={day.isCurrentMonth ? { scale: 0.9 } : {}}
                              onClick={() => day.isCurrentMonth && handleCellClick({ ...day, weekColumn: 0, dayRow: (day.dow + 6) % 7 })}
                            >
                              <span className="tabular-nums font-medium">
                                {day.day > 0 ? day.day : ""}
                              </span>
                            </motion.div>
                          </TooltipTrigger>
                          {day.isCurrentMonth && day.date && (
                            <TooltipContent side="top" className="text-[10px] px-2.5 py-1.5 max-w-[200px]">
                              <div>
                                <p className="font-semibold">
                                  {safeFormat(day.date, "M月d日 EEEE", "--", { locale: zhCN })}
                                </p>
                                <p className="text-muted-foreground mt-0.5">
                                  {day.count > 0 ? `${day.count} 篇内容` : "无发布"}
                                </p>
                                {day.topics.length > 0 && (
                                  <div className="mt-1 pt-1 border-t border-border/20">
                                    <p className="text-[9px] text-muted-foreground/70 truncate">
                                      📝 {day.topics.slice(0, 2).join(" · ")}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      ))}
                    </div>
                  </motion.div>
                )}
                </AnimatePresence>

                {/* Legend with labels */}
                <div className="flex items-center justify-between mt-2 px-0.5">
                  <div className="flex items-center gap-1">
                    <span className="text-[7px] text-muted-foreground">少</span>
                    <div className="flex items-center gap-0.5">
                      {[0, 1, 2, 3, 4].map((level) => (
                        <Tooltip key={level}>
                          <TooltipTrigger asChild>
                            <div
                              className="rounded-sm cursor-default"
                              style={{
                                width: 10,
                                height: 10,
                                backgroundColor: getHeatColor(level, isDark),
                              }}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-[9px] px-1.5 py-0.5">
                            {LEGEND_LABELS[level]} 篇
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                    <span className="text-[7px] text-muted-foreground">多</span>
                  </div>
                  <span className="text-[7px] text-muted-foreground/50">点击跳转</span>
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
