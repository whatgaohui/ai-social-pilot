"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";
import { TrendLineChart } from "@/components/charts/trend-line-chart";
import type { TrendChartData } from "@/components/charts/trend-line-chart";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════════════
// Range selector config
// ═══════════════════════════════════════════════════════════════════════════════

const RANGE_OPTIONS = [
  { value: "7d", label: "近7天" },
  { value: "30d", label: "近30天" },
  { value: "90d", label: "近90天" },
] as const;

type RangeOption = (typeof RANGE_OPTIONS)[number]["value"];

// ═══════════════════════════════════════════════════════════════════════════════
// TrendLineChartPanel — Fetches trend data and renders TrendLineChart
// ═══════════════════════════════════════════════════════════════════════════════

export function TrendLineChartPanel({ className }: { className?: string }) {
  const [range, setRange] = useState<RangeOption>("30d");
  const [chartData, setChartData] = useState<TrendChartData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (selectedRange: RangeOption) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/analytics/trends?range=${selectedRange}&metrics=likes,comments,shares`
      );
      if (!res.ok) throw new Error("请求失败");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setChartData({
        dates: json.dates ?? [],
        series: json.series ?? [],
      });
    } catch {
      setChartData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(range);
  }, [range, fetchData]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.08 }}
      className={cn(className)}
    >
      <Card className="border-border/50 overflow-hidden">
        {/* Header with title + range selector */}
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="text-sm font-semibold">互动趋势</CardTitle>
            </div>
            <div className="flex items-center gap-1 bg-muted/50 rounded-md p-0.5">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRange(opt.value)}
                  className={cn(
                    "px-2.5 py-1 text-[11px] rounded-md transition-all duration-200 cursor-pointer",
                    range === opt.value
                      ? "bg-background text-foreground shadow-sm font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-4">
          {loading ? (
            <div className="space-y-3">
              {/* Legend skeleton */}
              <div className="flex gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Skeleton className="h-3 w-3 rounded-full" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                ))}
              </div>
              {/* Chart skeleton */}
              <Skeleton className="h-[220px] w-full rounded-lg" />
            </div>
          ) : chartData && chartData.dates.length > 0 ? (
            <TrendLineChart
              data={chartData}
              height={220}
              showLegend={true}
              showTooltip={true}
              animated={true}
            />
          ) : (
            <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
              暂无趋势数据
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
