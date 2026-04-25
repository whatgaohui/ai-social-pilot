"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  Eye,
  Hash,
  Loader2,
  LineChart as LineChartIcon,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface TrendDataPoint {
  date: string;
  postCount: number;
  engagementRate: number;
  avgScore: number;
}

interface CompetitorTrend {
  id: string;
  nickname: string;
  platform: string;
  trendData: TrendDataPoint[];
}

interface AnalysisResponse {
  period: string;
  competitors: CompetitorTrend[];
  own: {
    trendData: TrendDataPoint[];
    stats: { totalPosts: number; avgEngagementRate: number };
  };
}

// ─── Color Palette ──────────────────────────────────────────────────────────

const LINE_COLORS = [
  { stroke: "#8b5cf6", fill: "rgba(139,92,246,0.12)", name: "我的数据" },
  { stroke: "#10b981", fill: "rgba(16,185,129,0.10)", name: "" },
  { stroke: "#f59e0b", fill: "rgba(245,158,11,0.10)", name: "" },
  { stroke: "#f43f5e", fill: "rgba(244,63,94,0.10)", name: "" },
  { stroke: "#06b6d4", fill: "rgba(6,182,212,0.10)", name: "" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

type MetricKey = "engagementRate" | "postCount" | "avgScore";

const METRIC_LABELS: Record<MetricKey, string> = {
  engagementRate: "互动率",
  postCount: "发布数",
  avgScore: "平均点赞",
};

const METRIC_ICONS: Record<MetricKey, typeof TrendingUp> = {
  engagementRate: TrendingUp,
  postCount: Hash,
  avgScore: Eye,
};

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatValue(metric: MetricKey, value: number): string {
  if (metric === "engagementRate") return `${value.toFixed(1)}%`;
  if (metric === "avgScore") {
    if (value >= 10000) return `${(value / 10000).toFixed(1)}w`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return value.toFixed(0);
  }
  return value.toString();
}

// ─── SVG Line Chart ─────────────────────────────────────────────────────────

interface ChartLine {
  nickname: string;
  data: TrendDataPoint[];
  color: { stroke: string; fill: string; name: string };
  visible: boolean;
}

function MultiLineChart({
  lines,
  metric,
  days,
  hoveredIndex,
  onHover,
}: {
  lines: ChartLine[];
  metric: MetricKey;
  days: number;
  hoveredIndex: number | null;
  onHover: (idx: number | null) => void;
}) {
  const width = 600;
  const height = 260;
  const pad = { top: 20, right: 20, bottom: 36, left: 50 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  // Generate date range based on days
  const now = new Date();
  const dateRange: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dateRange.push(d.toISOString().slice(0, 10));
  }

  // Merge all data to find max value
  const allValues = lines
    .filter((l) => l.visible)
    .flatMap((l) => l.data.map((d) => d[metric]));
  const maxVal = Math.max(...allValues, 0.1);

  // Y axis ticks
  const yTicks = 5;
  const yStep = maxVal / yTicks;

  // Build data points per line
  const linePoints = lines
    .filter((l) => l.visible)
    .map((line) => {
      const points = dateRange.map((date, i) => {
        const match = line.data.find((d) => d.date === date);
        const val = match ? match[metric] : 0;
        const x = pad.left + (i / Math.max(dateRange.length - 1, 1)) * chartW;
        const y = pad.top + chartH - (val / maxVal) * chartH;
        return { x, y, val, date };
      });
      return { ...line, points };
    });

  // SVG path helper
  const toPath = (pts: Array<{ x: number; y: number }>) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  // Area path (close to bottom)
  const toAreaPath = (pts: Array<{ x: number; y: number }>) => {
    if (pts.length === 0) return "";
    const line = toPath(pts);
    return `${line} L ${pts[pts.length - 1].x} ${pad.top + chartH} L ${pts[0].x} ${pad.top + chartH} Z`;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        onMouseLeave={() => onHover(null)}
      >
        <defs>
          {linePoints.map((line, idx) => (
            <linearGradient
              key={`area-grad-${idx}`}
              id={`area-grad-${idx}`}
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor={line.color.stroke} stopOpacity={0.25} />
              <stop offset="100%" stopColor={line.color.stroke} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>

        {/* Grid lines */}
        {Array.from({ length: yTicks + 1 }).map((_, i) => {
          const y = pad.top + (i / yTicks) * chartH;
          const val = maxVal - i * yStep;
          return (
            <g key={`grid-${i}`}>
              <line
                x1={pad.left}
                y1={y}
                x2={width - pad.right}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.06}
                strokeWidth={1}
              />
              <text
                x={pad.left - 8}
                y={y + 3}
                textAnchor="end"
                className="fill-muted-foreground"
                fontSize={9}
              >
                {formatValue(metric, val)}
              </text>
            </g>
          );
        })}

        {/* X axis labels */}
        {dateRange
          .filter((_, i) => {
            if (days <= 7) return true;
            if (days <= 30) return i % 5 === 0 || i === days - 1;
            return i % 7 === 0 || i === days - 1;
          })
          .map((date, _, arr) => {
            const i = dateRange.indexOf(date);
            const x = pad.left + (i / Math.max(dateRange.length - 1, 1)) * chartW;
            return (
              <text
                key={date}
                x={x}
                y={height - 6}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize={9}
              >
                {formatDateLabel(date)}
              </text>
            );
          })}

        {/* Lines + Areas */}
        {linePoints.map((line, lineIdx) => {
          const areaPath = toAreaPath(line.points);
          const linePath = toPath(line.points);

          return (
            <g key={`line-${lineIdx}`}>
              {/* Gradient fill area */}
              <motion.path
                d={areaPath}
                fill={`url(#area-grad-${lineIdx})`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.3 + lineIdx * 0.15 }}
              />
              {/* Line stroke */}
              <motion.path
                d={linePath}
                fill="none"
                stroke={line.color.stroke}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, delay: 0.2 + lineIdx * 0.15, ease: "easeOut" }}
              />
            </g>
          );
        })}

        {/* Data points */}
        {linePoints.map((line, lineIdx) =>
          line.points.map((pt, ptIdx) => (
            <motion.circle
              key={`dot-${lineIdx}-${ptIdx}`}
              cx={pt.x}
              cy={pt.y}
              r={hoveredIndex === ptIdx ? 4 : 2}
              fill={line.color.stroke}
              stroke="hsl(var(--background))"
              strokeWidth={1.5}
              initial={{ r: 0 }}
              animate={{ r: hoveredIndex === ptIdx ? 4 : 2 }}
              transition={{ duration: 0.15 }}
              style={{ cursor: "pointer" }}
            />
          )),
        )}

        {/* Hover crosshair + tooltip anchor */}
        {hoveredIndex !== null && (
          <g>
            <line
              x1={pad.left + (hoveredIndex / Math.max(dateRange.length - 1, 1)) * chartW}
              y1={pad.top}
              x2={pad.left + (hoveredIndex / Math.max(dateRange.length - 1, 1)) * chartW}
              y2={pad.top + chartH}
              stroke="currentColor"
              strokeOpacity={0.12}
              strokeWidth={1}
              strokeDasharray="4 3"
            />
            {/* Invisible rect for tooltip trigger */}
            <TooltipTrigger asChild>
              <rect
                x={
                  pad.left +
                  (hoveredIndex / Math.max(dateRange.length - 1, 1)) * chartW -
                  20
                }
                y={pad.top}
                width={40}
                height={chartH}
                fill="transparent"
              />
            </TooltipTrigger>
          </g>
        )}

        {/* Hover tooltip content */}
        {hoveredIndex !== null && (
          <TooltipContent side="top" className="text-xs p-2 space-y-1.5 max-w-xs">
            <p className="font-semibold">{formatDateLabel(dateRange[hoveredIndex])}</p>
            {linePoints.map((line, lineIdx) => {
              const pt = line.points[hoveredIndex];
              if (!pt) return null;
              return (
                <div key={lineIdx} className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: line.color.stroke }}
                  />
                  <span className="text-muted-foreground truncate">
                    {line.nickname.slice(0, 8)}
                  </span>
                  <span className="font-medium ml-auto tabular-nums">
                    {formatValue(metric, pt.val)}
                  </span>
                </div>
              );
            })}
          </TooltipContent>
        )}

        {/* Invisible hover zones for each data point column */}
        {dateRange.map((_, i) => (
          <rect
            key={`hover-zone-${i}`}
            x={pad.left + (i / Math.max(dateRange.length - 1, 1)) * chartW - 6}
            y={pad.top}
            width={12}
            height={chartH}
            fill="transparent"
            onMouseEnter={() => onHover(i)}
            style={{ cursor: "crosshair" }}
          />
        ))}
      </svg>
    </TooltipProvider>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function TrendComparisonChart() {
  const { platform } = useAppStore();
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [metric, setMetric] = useState<MetricKey>("engagementRate");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [visibleLines, setVisibleLines] = useState<Set<number>>(new Set([0, 1, 2, 3, 4]));

  const days = period === "week" ? 7 : 30;

  // Fetch data
  useEffect(() => {
    async function fetchAnalysis() {
      setLoading(true);
      try {
        const res = await fetch(`/api/competitor-analysis?period=${period}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchAnalysis();
  }, [period]);

  // Build chart lines
  const lines: ChartLine[] = useMemo(() => {
    if (!data) return [];

    const result: ChartLine[] = [];

    // Own data first (index 0)
    if (data.own.trendData.length > 0) {
      result.push({
        nickname: "我的数据",
        data: data.own.trendData,
        color: LINE_COLORS[0],
        visible: visibleLines.has(0),
      });
    }

    // Competitors
    data.competitors.forEach((comp, idx) => {
      if (comp.trendData.length > 0 && idx < 4) {
        result.push({
          nickname: comp.nickname || `竞品${idx + 1}`,
          data: comp.trendData,
          color: LINE_COLORS[idx + 1],
          visible: visibleLines.has(idx + 1),
        });
      }
    });

    return result;
  }, [data, visibleLines]);

  const toggleVisibility = useCallback((idx: number) => {
    setVisibleLines((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        if (next.size > 1) next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  }, []);

  const MetricIcon = METRIC_ICONS[metric];

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 px-4 pt-3">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-violet-500/10 flex items-center justify-center">
              <LineChartIcon className="h-3.5 w-3.5 text-violet-500" />
            </div>
            趋势对比
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <Skeleton className="h-48 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!data || lines.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 px-4 pt-3">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-violet-500/10 flex items-center justify-center">
              <LineChartIcon className="h-3.5 w-3.5 text-violet-500" />
            </div>
            趋势对比
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex flex-col items-center py-8 text-center">
            <LineChartIcon className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">暂无对比数据</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              添加竞品账号并同步数据后即可查看趋势对比
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2 px-4 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-violet-500/10 flex items-center justify-center">
              <LineChartIcon className="h-3.5 w-3.5 text-violet-500" />
            </div>
            趋势对比
          </CardTitle>
          <div className="flex items-center gap-1">
            <MetricIcon className="h-3 w-3 text-muted-foreground" />
            <Select
              value={metric}
              onValueChange={(v) => setMetric(v as MetricKey)}
            >
              <SelectTrigger className="h-6 w-[80px] text-[10px] border-0 p-0 shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="engagementRate" className="text-xs">
                  互动率
                </SelectItem>
                <SelectItem value="postCount" className="text-xs">
                  发布数
                </SelectItem>
                <SelectItem value="avgScore" className="text-xs">
                  平均点赞
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Period toggle */}
        <Tabs
          value={period}
          onValueChange={(v) => setPeriod(v as "week" | "month")}
        >
          <TabsList className="h-7 p-0.5 bg-muted/50">
            <TabsTrigger
              value="week"
              className="h-6 text-[10px] px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              7天
            </TabsTrigger>
            <TabsTrigger
              value="month"
              className="h-6 text-[10px] px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              30天
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Legend with toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {lines.map((line, idx) => (
            <motion.button
              key={idx}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => toggleVisibility(idx)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] transition-all ${
                visibleLines.has(idx)
                  ? "border-border/80 bg-background"
                  : "border-transparent bg-muted/30 opacity-40"
              }`}
            >
              <span
                className="h-2 w-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: line.color.stroke }}
              />
              <span className="truncate max-w-[80px]">{line.nickname}</span>
            </motion.button>
          ))}
        </div>

        {/* Chart */}
        <div className="rounded-lg border bg-muted/20 p-2">
          <MultiLineChart
            lines={lines}
            metric={metric}
            days={days}
            hoveredIndex={hoveredIndex}
            onHover={setHoveredIndex}
          />
        </div>

        {/* Summary */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>
            共 {data.competitors.length} 个竞品
          </span>
          <span>·</span>
          <span>
            {period === "week" ? "近7天" : "近30天"}数据
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
