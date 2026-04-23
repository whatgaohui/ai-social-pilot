"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { CalendarDays } from "lucide-react";
import { useAppStore } from "@/store/app-store";
import {
  format,
  subDays,
  startOfDay,
  eachDayOfInterval,
  startOfWeek,
} from "date-fns";
import { zhCN } from "date-fns/locale";
import { safeFormat } from "@/lib/safe-date";

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_DAYS = 182; // ~26 weeks

// Violet color scale: Tailwind classes for light/dark
const LEVEL_COLORS: Record<number, string> = {
  0: "bg-muted/40",
  1: "bg-violet-200 dark:bg-violet-900/40",
  2: "bg-violet-300 dark:bg-violet-800/50",
  3: "bg-violet-400 dark:bg-violet-700/60",
  4: "bg-violet-500 dark:bg-violet-600",
};

// Day labels shown on the left: Mon (row 0), Wed (row 2), Fri (row 4)
const DAY_LABELS: { label: string; row: number }[] = [
  { label: "Mon", row: 0 },
  { label: "Wed", row: 2 },
  { label: "Fri", row: 4 },
];

// Animation variant for staggered entrance
const cellVariant = {
  hidden: { opacity: 0, scale: 0.4 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: Math.min(i * 0.0008, 0.8), // cap total delay at 0.8s
      duration: 0.2,
      ease: "easeOut",
    },
  }),
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface HeatmapCell {
  date: string;       // yyyy-MM-dd
  count: number;
  level: number;      // 0-4
  dayRow: number;     // 0=Mon, 6=Sun
  weekCol: number;    // column index
  isToday: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLevel(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ContentHeatmap() {
  const { contentPosts } = useAppStore();

  // Build heatmap data from contentPosts
  const { cells, totalPosts, maxDayLabel, activeDays } = useMemo(() => {
    const today = startOfDay(new Date());
    const startDate = startOfWeek(subDays(today, TOTAL_DAYS - 1), {
      weekStartsOn: 1,
    });

    // Count posts by date
    const countByDate: Record<string, number> = {};
    contentPosts.forEach((post) => {
      if (post.scheduledDate) {
        countByDate[post.scheduledDate] =
          (countByDate[post.scheduledDate] || 0) + 1;
      }
    });

    // Generate all days from startDate to today
    const allDays = eachDayOfInterval({ start: startDate, end: today });

    const todayStr = format(today, "yyyy-MM-dd");
    let totalCount = 0;

    // Compute week column offset based on start date's day-of-week
    const startDow = (startDate.getDay() + 6) % 7; // 0=Mon

    const result: HeatmapCell[] = [];
    allDays.forEach((day, i) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const count = countByDate[dateStr] || 0;
      totalCount += count;
      const dayRow = (day.getDay() + 6) % 7; // 0=Mon, 6=Sun
      const weekCol = Math.floor((i + startDow) / 7);

      result.push({
        date: dateStr,
        count,
        level: getLevel(count),
        dayRow,
        weekCol,
        isToday: dateStr === todayStr,
      });
    });

    // Find the most active day of the week
    const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun
    result.forEach((cell) => {
      dayOfWeekCounts[cell.dayRow] += cell.count;
    });
    const maxCount = Math.max(...dayOfWeekCounts);
    const maxDayIndex = dayOfWeekCounts.indexOf(maxCount);
    const dayNames = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

    return {
      cells: result,
      totalPosts: totalCount,
      maxDayLabel: maxCount > 0 ? dayNames[maxDayIndex] : "--",
      activeDays: result.filter((c) => c.count > 0).length,
    };
  }, [contentPosts]);

  // Month labels: positioned at the first column where each month starts
  const monthLabels = useMemo(() => {
    const labels: { text: string; col: number }[] = [];
    let lastMonth = "";
    cells.forEach((cell) => {
      if (cell.dayRow === 0) {
        // Only process from the first row
        const monthStr = safeFormat(cell.date, "MMM", cell.date.slice(0, 7), {
          locale: zhCN,
        });
        if (monthStr !== lastMonth) {
          // Use English short month names for compact display
          const engMonth = safeFormat(cell.date, "MMM", "", { locale: "en" });
          labels.push({ text: engMonth, col: cell.weekCol });
          lastMonth = monthStr;
        }
      }
    });
    return labels;
  }, [cells]);

  // Max week column for grid sizing
  const maxCol = cells.length > 0 ? Math.max(...cells.map((c) => c.weekCol)) : 0;
  const numWeeks = maxCol + 1;

  return (
    <div className="p-3 rounded-lg border border-border/20 bg-card/50">
      {/* Title */}
      <div className="flex items-center gap-1.5 mb-2">
        <CalendarDays className="h-3 w-3 text-violet-500" />
        <span className="text-xs font-medium text-muted-foreground">
          内容贡献热力图
        </span>
      </div>

      {/* Heatmap grid container - horizontally scrollable */}
      <div className="overflow-x-auto scrollbar-none -mx-1 px-1">
        <div className="inline-flex flex-col gap-[1px] min-w-max">
          {/* Month labels row */}
          <div className="flex h-3 items-center" style={{ paddingLeft: 22 }}>
            {monthLabels.map((m) => {
              // Calculate left offset based on column
              const colStart = m.col;
              return (
                <span
                  key={`${m.text}-${m.col}`}
                  className="text-[9px] text-muted-foreground/60 font-medium absolute"
                  style={{
                    left: `${colStart * 11 + 22}px`,
                  }}
                >
                  {m.text}
                </span>
              );
            })}
            {/* Spacer to set container width */}
            <div style={{ width: numWeeks * 11 }} />
          </div>

          {/* Grid: 7 rows (days) x N columns (weeks) */}
          <div className="flex">
            {/* Day labels column */}
            <div className="flex flex-col justify-between py-[1px]" style={{ width: 20 }}>
              {[0, 2, 4].map((row) => {
                const label = DAY_LABELS.find((d) => d.row === row);
                return (
                  <span
                    key={row}
                    className="text-[9px] text-muted-foreground/60 leading-none"
                    style={{ height: 10 }}
                  >
                    {label?.label}
                  </span>
                );
              })}
            </div>

            {/* Cells grid */}
            <div
              className="grid gap-[1px]"
              style={{
                gridTemplateColumns: `repeat(${numWeeks}, 10px)`,
                gridTemplateRows: "repeat(7, 10px)",
              }}
            >
              {cells.map((cell, index) => (
                <motion.div
                  key={cell.date}
                  title={`${safeFormat(cell.date, "yyyy年M月d日 EEEE", cell.date, { locale: zhCN })} — ${cell.count} 篇内容`}
                  custom={index}
                  variants={cellVariant}
                  initial="hidden"
                  animate="visible"
                  className={`
                    rounded-[2px] cursor-default transition-transform hover:scale-125
                    ${LEVEL_COLORS[cell.level]}
                    ${cell.isToday ? "ring-[1.5px] ring-violet-500 ring-offset-1 ring-offset-background" : ""}
                  `}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 mt-2">
        <span className="text-[9px] text-muted-foreground/50">少</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`w-[10px] h-[10px] rounded-[2px] ${LEVEL_COLORS[level]}`}
          />
        ))}
        <span className="text-[9px] text-muted-foreground/50">多</span>
      </div>

      {/* Stats summary */}
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {totalPosts} 篇内容（近6个月）
        </span>
        {activeDays > 0 && (
          <span className="text-[10px] text-muted-foreground tabular-nums">
            最活跃: {maxDayLabel}
          </span>
        )}
      </div>
    </div>
  );
}
