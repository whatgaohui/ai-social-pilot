"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar, Clock, Flame, Layers } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface DayCellData {
  date: string;
  competitorCount: number;
  ownCount: number;
  competitorTopics: string[];
  ownTopics: string[];
}

interface HourlyData {
  hour: number;
  competitorCount: number;
  ownCount: number;
}

// ─── Color helpers ──────────────────────────────────────────────────────────

function getHeatColor(count: number): string {
  if (count === 0) return "bg-muted/50 dark:bg-muted/30";
  if (count <= 1) return "bg-emerald-200/70 dark:bg-emerald-900/40";
  if (count <= 2) return "bg-emerald-300/70 dark:bg-emerald-800/50";
  if (count <= 4) return "bg-emerald-400/70 dark:bg-emerald-700/60";
  return "bg-emerald-500/80 dark:bg-emerald-600/70";
}

function getOwnHeatColor(count: number): string {
  if (count === 0) return "";
  return "ring-2 ring-violet-400 ring-offset-1 ring-offset-background";
}

const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

// ─── Calendar Heatmap ───────────────────────────────────────────────────────

function CalendarHeatmap({
  cells,
  selectedDate,
  onSelectDate,
}: {
  cells: DayCellData[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}) {
  // Build a 4-week (28-day) grid
  // Each row = day of week, each column = week
  const grid: (DayCellData | null)[][] = Array.from({ length: 7 }, () =>
    Array.from({ length: 4 }, () => null),
  );

  // Fill the grid based on the cells data
  // We need to align cells to a proper calendar layout
  const cellMap = new Map(cells.map((c) => [c.date, c]));

  // Get the 28 days ending today
  const now = new Date();
  const days: string[] = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  // Map to grid: col = week index, row = day of week (Mon=0...Sun=6)
  days.forEach((date) => {
    const d = new Date(date);
    let dow = d.getDay() - 1; // Mon=0
    if (dow < 0) dow = 6; // Sun=6
    const dayIndex = days.indexOf(date);
    const weekIndex = Math.floor(dayIndex / 7);
    if (weekIndex < 4) {
      grid[dow][weekIndex] = cellMap.get(date) || {
        date,
        competitorCount: 0,
        ownCount: 0,
        competitorTopics: [],
        ownTopics: [],
      };
    }
  });

  return (
    <div className="space-y-1.5">
      {/* Week header */}
      <div className="grid grid-cols-[24px_repeat(4,1fr)] gap-1.5 items-center">
        <div className="w-6" />
        {["第1周", "第2周", "第3周", "第4周"].map((label) => (
          <div key={label} className="text-[9px] text-muted-foreground text-center">
            {label}
          </div>
        ))}
      </div>

      {/* Grid */}
      {grid.map((row, rowIdx) => (
        <div
          key={rowIdx}
          className="grid grid-cols-[24px_repeat(4,1fr)] gap-1.5 items-center"
        >
          <div className="text-[9px] text-muted-foreground text-center font-medium">
            {WEEKDAY_LABELS[rowIdx]}
          </div>
          {row.map((cell, colIdx) => {
            if (!cell) {
              return (
                <div
                  key={colIdx}
                  className="aspect-square rounded-md bg-muted/20"
                />
              );
            }

            const isSelected = selectedDate === cell.date;
            const hasCompetitor = cell.competitorCount > 0;
            const hasOwn = cell.ownCount > 0;

            return (
              <TooltipProvider key={colIdx} delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div
                      whileHover={{ scale: 1.12 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() =>
                        onSelectDate(isSelected ? null : cell.date)
                      }
                      className={`aspect-square rounded-md cursor-pointer transition-colors ${getHeatColor(cell.competitorCount)} ${getOwnHeatColor(cell.ownCount)} ${
                        isSelected
                          ? "ring-2 ring-primary shadow-md"
                          : ""
                      }`}
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: (rowIdx * 4 + colIdx) * 0.015, duration: 0.25 }}
                    >
                      {hasCompetitor && (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-[8px] font-bold text-emerald-800 dark:text-emerald-200">
                            {cell.competitorCount}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-[10px] p-2 max-w-[200px]">
                    <p className="font-semibold">{cell.date}</p>
                    {hasCompetitor && (
                      <p className="text-emerald-600 dark:text-emerald-400">
                        竞品发布 {cell.competitorCount} 条
                      </p>
                    )}
                    {hasOwn && (
                      <p className="text-violet-600 dark:text-violet-400">
                        你的发布 {cell.ownCount} 条
                      </p>
                    )}
                    {cell.competitorTopics.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-0.5">
                        {cell.competitorTopics.slice(0, 2).map((t, i) => (
                          <Badge key={i} variant="secondary" className="text-[8px] px-1 h-3">
                            {t.slice(0, 8)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      ))}

      {/* Color scale legend */}
      <div className="flex items-center justify-end gap-2 mt-2">
        <span className="text-[9px] text-muted-foreground">少</span>
        <div className="flex gap-0.5">
          {[0, 1, 2, 4, 6].map((count) => (
            <div
              key={count}
              className={`h-3 w-3 rounded-sm ${getHeatColor(count)}`}
            />
          ))}
        </div>
        <span className="text-[9px] text-muted-foreground">多</span>
      </div>
    </div>
  );
}

// ─── Best Posting Times ─────────────────────────────────────────────────────

function BestTimesChart({
  hourlyData,
}: {
  hourlyData: HourlyData[];
}) {
  const maxComp = Math.max(...hourlyData.map((h) => h.competitorCount), 1);
  const peakHours = hourlyData
    .filter((h) => h.competitorCount > 0)
    .sort((a, b) => b.competitorCount - a.competitorCount)
    .slice(0, 3);

  return (
    <div className="space-y-3">
      {/* Hourly bar chart */}
      <div className="flex gap-0.5 items-end h-16">
        {hourlyData.map((h) => {
          const barH = (h.competitorCount / maxComp) * 100;
          const isPeak = peakHours.some((p) => p.hour === h.hour);
          return (
            <motion.div
              key={h.hour}
              className="flex-1 flex flex-col items-center gap-0.5"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ delay: h.hour * 0.02 }}
            >
              <div
                className={`w-full rounded-t-sm transition-colors ${
                  isPeak
                    ? "bg-gradient-to-t from-emerald-500 to-emerald-400"
                    : h.competitorCount > 0
                      ? "bg-emerald-200 dark:bg-emerald-800"
                      : "bg-muted/30"
                }`}
                style={{ height: `${Math.max(barH, 4)}%` }}
              />
            </motion.div>
          );
        })}
      </div>
      <div className="flex justify-between text-[8px] text-muted-foreground">
        <span>0h</span>
        <span>6h</span>
        <span>12h</span>
        <span>18h</span>
        <span>23h</span>
      </div>

      {/* Peak hours summary */}
      {peakHours.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Flame className="h-3 w-3 text-amber-500" />
          <span className="text-[10px] text-muted-foreground">最佳发布时间：</span>
          {peakHours.map((h) => (
            <Badge
              key={h.hour}
              variant="secondary"
              className="text-[9px] px-1.5 h-4 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
            >
              {h.hour}:00 ({h.competitorCount}条)
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Date Detail Panel ──────────────────────────────────────────────────────

function DateDetail({
  cell,
  onClose,
}: {
  cell: DayCellData;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-lg border bg-muted/20 p-3 space-y-2"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold">{cell.date}</span>
        <button
          onClick={onClose}
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          收起
        </button>
      </div>

      {cell.competitorTopics.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-[10px] font-medium text-muted-foreground">
              竞品发布 ({cell.competitorCount})
            </span>
          </div>
          {cell.competitorTopics.map((topic, i) => (
            <p key={i} className="text-[10px] text-foreground/80 pl-3 truncate">
              · {topic}
            </p>
          ))}
        </div>
      )}

      {cell.ownTopics.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-violet-400" />
            <span className="text-[10px] font-medium text-muted-foreground">
              我的发布 ({cell.ownCount})
            </span>
          </div>
          {cell.ownTopics.map((topic, i) => (
            <p key={i} className="text-[10px] text-foreground/80 pl-3 truncate">
              · {topic}
            </p>
          ))}
        </div>
      )}

      {cell.competitorCount === 0 && cell.ownCount === 0 && (
        <p className="text-[10px] text-muted-foreground">当天无发布记录</p>
      )}
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function CompetitorCalendarView() {
  const { platform } = useAppStore();
  const [cells, setCells] = useState<DayCellData[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch("/api/competitor-analysis?period=month");
        if (res.ok) {
          const data = await res.json();

          // Build day cells from competitor and own trend data
          const dayMap = new Map<
            string,
            { competitorCount: number; ownCount: number; competitorTopics: string[]; ownTopics: string[] }
          >();

          // Add competitor data
          data.competitors.forEach((comp: { trendData: Array<{ date: string }> }) => {
            comp.trendData.forEach((d) => {
              if (!dayMap.has(d.date)) {
                dayMap.set(d.date, {
                  competitorCount: 0,
                  ownCount: 0,
                  competitorTopics: [],
                  ownTopics: [],
                });
              }
              const entry = dayMap.get(d.date)!;
              entry.competitorCount++;
            });
          });

          // Add own data
          if (data.own?.trendData) {
            data.own.trendData.forEach((d: { date: string }) => {
              if (!dayMap.has(d.date)) {
                dayMap.set(d.date, {
                  competitorCount: 0,
                  ownCount: 0,
                  competitorTopics: [],
                  ownTopics: [],
                });
              }
              const entry = dayMap.get(d.date)!;
              entry.ownCount++;
            });
          }

          const resultCells: DayCellData[] = Array.from(dayMap.entries()).map(
            ([date, entry]) => ({
              date,
              ...entry,
            }),
          );

          setCells(resultCells);

          // Build hourly pattern
          const compHours = new Array(24).fill(0) as number[];
          const ownHours = new Array(24).fill(0) as number[];

          data.competitors.forEach((comp: { hourlyPattern: Array<{ hour: number; count: number }> }) => {
            comp.hourlyPattern?.forEach((h) => {
              if (h.hour >= 0 && h.hour < 24) {
                compHours[h.hour] += h.count;
              }
            });
          });

          data.own?.hourlyPattern?.forEach((h: { hour: number; count: number }) => {
            if (h.hour >= 0 && h.hour < 24) {
              ownHours[h.hour] += h.count;
            }
          });

          const hourly: HourlyData[] = Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            competitorCount: compHours[i],
            ownCount: ownHours[i],
          }));

          setHourlyData(hourly);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [platform]);

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 px-4 pt-3">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-emerald-500/10 flex items-center justify-center">
              <Calendar className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            发布日历
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <Skeleton className="h-52 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg mt-3" />
        </CardContent>
      </Card>
    );
  }

  const selectedCell = selectedDate
    ? cells.find((c) => c.date === selectedDate)
    : null;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2 px-4 pt-3">
        <CardTitle className="text-xs font-semibold flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-emerald-500/10 flex items-center justify-center">
            <Calendar className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          发布日历
          <Badge variant="outline" className="text-[8px] ml-auto">
            近28天
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        {/* Legend */}
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-emerald-300 dark:bg-emerald-700" />
            <span>竞品发布</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm ring-2 ring-violet-400 ring-offset-1 ring-offset-background" />
            <span>我的发布</span>
          </div>
        </div>

        {/* Calendar heatmap */}
        <div className="rounded-lg border bg-muted/10 p-3">
          <CalendarHeatmap
            cells={cells}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </div>

        {/* Selected date detail */}
        <AnimatePresence>
          {selectedCell && (
            <DateDetail
              cell={selectedCell}
              onClose={() => setSelectedDate(null)}
            />
          )}
        </AnimatePresence>

        {/* Best posting times */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-medium">
            <Clock className="h-3.5 w-3.5 text-amber-500" />
            最佳发布时间分析
          </div>
          <div className="rounded-lg border p-3">
            <BestTimesChart hourlyData={hourlyData} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
