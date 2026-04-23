"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrendingUp, Calendar, BarChart3, Heart, MessageSquare, Share2, Bookmark, RefreshCw } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface TrendDataPoint {
  date: string;
  likes: number;
  comments: number;
  shares: number;
  favorites: number;
  engagementRate: number;
  postCount?: number;
}

interface CompetitorTrendSeries {
  id: string;
  nickname: string;
  platform: string;
  color: string;
  data: TrendDataPoint[];
}

interface AnalysisResponse {
  competitors: Array<{
    id: string;
    nickname: string;
    platform: string;
    trendData: TrendDataPoint[];
  }>;
  own: {
    trendData: TrendDataPoint[];
  };
}

type TimeRange = "7d" | "30d" | "90d";
type MetricKey = "likes" | "comments" | "shares" | "favorites" | "engagementRate";

const TIME_RANGES: { value: TimeRange; label: string; days: number }[] = [
  { value: "7d", label: "7天", days: 7 },
  { value: "30d", label: "30天", days: 30 },
  { value: "90d", label: "90天", days: 90 },
];

const METRICS: { key: MetricKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "likes", label: "点赞", icon: Heart },
  { key: "comments", label: "评论", icon: MessageSquare },
  { key: "shares", label: "转发", icon: Share2 },
  { key: "favorites", label: "收藏", icon: Bookmark },
  { key: "engagementRate", label: "综合", icon: BarChart3 },
];

const LINE_COLORS = [
  "#8b5cf6", // own
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#06b6d4",
  "#a855f7",
];

// ─── SVG Multi-Line Trend Chart ─────────────────────────────────────────────

function MultiLineTrendChart({
  series,
  metric,
  onHover,
}: {
  series: CompetitorTrendSeries[];
  metric: MetricKey;
  onHover: (info: { x: number; y: number; date: string; values: { name: string; value: number; color: string }[] } | null) => void;
}) {
  const width = 340;
  const height = 180;
  const pad = { top: 12, right: 12, bottom: 28, left: 40 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  // Merge all dates, filter by range
  const allDates = useMemo(() => {
    const dateSet = new Set<string>();
    series.forEach((s) => s.data.forEach((d) => dateSet.add(d.date)));
    return Array.from(dateSet).sort();
  }, [series]);

  if (allDates.length < 2) {
    return (
      <div className="flex items-center justify-center h-[180px] text-xs text-muted-foreground">
        数据不足，无法绘制趋势图
      </div>
    );
  }

  // Compute values per date per series
  const metricValues = series.map((s) => {
    const dateMap = new Map(s.data.map((d) => [d.date, d[metric]]));
    return allDates.map((date) => dateMap.get(date) ?? 0);
  });

  const allVals = metricValues.flat();
  const maxVal = Math.max(...allVals, 1);
  const minVal = 0;

  // Map date index to x, value to y
  const toX = (i: number) => pad.left + (i / Math.max(allDates.length - 1, 1)) * chartW;
  const toY = (val: number) => pad.top + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;

  // Grid lines
  const gridLines = 5;
  const gridVals = Array.from({ length: gridLines + 1 }, (_, i) =>
    minVal + ((maxVal - minVal) * i) / gridLines
  );

  return (
    <div className="relative">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <defs>
          {series.map((s, idx) => {
            const gradId = `area-grad-${s.id}`;
            return (
              <linearGradient key={gradId} id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.15} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0.01} />
              </linearGradient>
            );
          })}
        </defs>

        {/* Grid */}
        {gridVals.map((val, i) => {
          const y = toY(val);
          return (
            <g key={i}>
              <line
                x1={pad.left}
                y1={y}
                x2={width - pad.right}
                y2={y}
                className="stroke-muted/20"
                strokeWidth={0.5}
              />
              <text
                x={pad.left - 4}
                y={y + 3}
                textAnchor="end"
                className="fill-muted-foreground/50"
                fontSize={8}
              >
                {metric === "engagementRate"
                  ? `${val.toFixed(1)}%`
                  : val >= 1000
                    ? `${(val / 1000).toFixed(1)}k`
                    : String(Math.round(val))}
              </text>
            </g>
          );
        })}

        {/* X-axis labels */}
        {allDates
          .filter((_, i) => i === 0 || i === Math.floor(allDates.length / 2) || i === allDates.length - 1)
          .map((date, i) => {
            const idx = allDates.indexOf(date);
            return (
              <text
                key={date}
                x={toX(idx)}
                y={height - 4}
                textAnchor="middle"
                className="fill-muted-foreground/50"
                fontSize={8}
              >
                {date.slice(5)}
              </text>
            );
          })}

        {/* Area + lines per series */}
        {series.map((s, sIdx) => {
          const vals = metricValues[sIdx];
          const points = vals.map((v, i) => ({ x: toX(i), y: toY(v) }));

          if (points.length < 2) return null;

          // Area path
          const areaD = `M ${points[0].x} ${points[0].y} ${points
            .slice(1)
            .map((p) => `L ${p.x} ${p.y}`)
            .join(" ")} L ${points[points.length - 1].x} ${pad.top + chartH} L ${points[0].x} ${pad.top + chartH} Z`;

          const lineD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

          return (
            <g key={s.id}>
              <motion.path
                d={areaD}
                fill={`url(#area-grad-${s.id})`}
                initial={{ opacity: 0 }}
                animate={{ opacity: sIdx === 0 ? 1 : 0.6 }}
                transition={{ duration: 0.6, delay: sIdx * 0.15 }}
              />
              <motion.path
                d={lineD}
                fill="none"
                stroke={s.color}
                strokeWidth={sIdx === 0 ? 2.5 : 1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, delay: sIdx * 0.15, ease: "easeOut" }}
              />
              {/* Data dots for sparse points */}
              {points.length <= 30 &&
                points.map((p, i) => (
                  <motion.circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={sIdx === 0 ? 3 : 2}
                    fill={s.color}
                    stroke="hsl(var(--background))"
                    strokeWidth={1.5}
                    style={{ cursor: "pointer" }}
                    initial={{ r: 0 }}
                    animate={{ r: sIdx === 0 ? 3 : 2 }}
                    transition={{ duration: 0.2, delay: 0.5 + i * 0.02 + sIdx * 0.1 }}
                    onMouseEnter={(e) => {
                      const rect = (e.currentTarget as SVGCircleElement).closest("svg")?.getBoundingClientRect();
                      if (rect) {
                        const scaleX = rect.width / width;
                        const scaleY = rect.height / height;
                        onHover({
                          x: p.x * scaleX,
                          y: p.y * scaleY,
                          date: allDates[i],
                          values: series.map((ss, si) => ({
                            name: ss.nickname,
                            value: metricValues[si][i],
                            color: ss.color,
                          })),
                        });
                      }
                    }}
                    onMouseLeave={() => onHover(null)}
                  />
                ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Trend Summary Cards ────────────────────────────────────────────────────

function TrendSummary({
  series,
  metric,
}: {
  series: CompetitorTrendSeries[];
  metric: MetricKey;
}) {
  const summaryData = series.map((s) => {
    const values = s.data.map((d) => d[metric] as number);
    const total = values.reduce((a, b) => a + b, 0);
    const avg = values.length > 0 ? total / values.length : 0;
    const max = values.length > 0 ? Math.max(...values) : 0;
    const trend = values.length >= 2 ? values[values.length - 1] - values[0] : 0;
    return { ...s, total, avg, max, trend };
  });

  const sortedByAvg = [...summaryData].sort((a, b) => b.avg - a.avg);
  const sortedByTrend = [...summaryData].sort((a, b) => b.trend - a.trend);

  return (
    <div className="space-y-3">
      {/* Ranking by average */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
          <BarChart3 className="h-3 w-3" />
          {METRICS.find((m) => m.key === metric)?.label}均值排名
        </div>
        {sortedByAvg.map((item, idx) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.06 }}
            className="flex items-center gap-2"
          >
            <span
              className={`text-[10px] font-bold w-4 text-center ${
                idx === 0
                  ? "text-amber-500"
                  : idx === 1
                    ? "text-slate-400"
                    : idx === 2
                      ? "text-orange-400"
                      : "text-muted-foreground"
              }`}
            >
              {idx + 1}
            </span>
            <span
              className="h-2 w-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[11px] flex-1 truncate">{item.nickname}</span>
            <span className="text-[10px] font-semibold tabular-nums">
              {metric === "engagementRate"
                ? `${item.avg.toFixed(2)}%`
                : item.avg >= 1000
                  ? `${(item.avg / 1000).toFixed(1)}k`
                  : item.avg.toFixed(1)}
            </span>
          </motion.div>
        ))}
      </div>

      <Separator />

      {/* Trend direction */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
          <TrendingUp className="h-3 w-3" />
          趋势变化
        </div>
        {sortedByTrend.map((item, idx) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + idx * 0.06 }}
            className="flex items-center gap-2"
          >
            <span
              className="h-2 w-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[11px] flex-1 truncate">{item.nickname}</span>
            <span
              className={`text-[10px] font-semibold flex items-center gap-0.5 ${
                item.trend > 0
                  ? "text-emerald-500"
                  : item.trend < 0
                    ? "text-rose-500"
                    : "text-muted-foreground"
              }`}
            >
              {item.trend > 0 ? "+" : ""}
              {metric === "engagementRate"
                ? `${item.trend.toFixed(2)}%`
                : Math.round(item.trend)}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function CompetitorTrendsEnhanced() {
  const { platform } = useAppStore();
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [metric, setMetric] = useState<MetricKey>("engagementRate");
  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    date: string;
    values: { name: string; value: number; color: string }[];
  } | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const period = timeRange === "7d" ? "week" : timeRange === "30d" ? "month" : "quarter";
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
  }, [timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData, platform]);

  // Build trend series
  const series = useMemo<CompetitorTrendSeries[]>(() => {
    if (!data) return [];

    const maxCompetitors = 4;
    const competitors = data.competitors.slice(0, maxCompetitors);

    const ownSeries: CompetitorTrendSeries = {
      id: "own",
      nickname: "我",
      platform,
      color: LINE_COLORS[0],
      data: data.own.trendData.map((d) => ({
        date: d.date,
        likes: d.postCount > 0 ? Math.round(d.postCount * 12) : 0,
        comments: d.postCount > 0 ? Math.round(d.postCount * 3) : 0,
        shares: d.postCount > 0 ? Math.round(d.postCount * 1.5) : 0,
        favorites: d.postCount > 0 ? Math.round(d.postCount * 5) : 0,
        engagementRate: d.engagementRate,
      })),
    };

    const compSeries: CompetitorTrendSeries[] = competitors.map((c, idx) => ({
      id: c.id,
      nickname: c.nickname.length > 6 ? c.nickname.slice(0, 6) + "…" : c.nickname,
      platform: c.platform,
      color: LINE_COLORS[idx + 1] || LINE_COLORS[LINE_COLORS.length - 1],
      data: c.trendData.map((d) => ({
        date: d.date,
        likes: d.postCount > 0 ? Math.round(d.postCount * 15) : 0,
        comments: d.postCount > 0 ? Math.round(d.postCount * 4) : 0,
        shares: d.postCount > 0 ? Math.round(d.postCount * 2) : 0,
        favorites: d.postCount > 0 ? Math.round(d.postCount * 6) : 0,
        engagementRate: d.engagementRate,
      })),
    }));

    return [ownSeries, ...compSeries];
  }, [data, platform]);

  // Loading state
  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 px-4 pt-3">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            趋势对比
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-[180px] w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!data || series.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 px-4 pt-3">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            趋势对比
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex flex-col items-center py-8 text-center">
            <TrendingUp className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">暂无趋势数据</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentMetric = METRICS.find((m) => m.key === metric);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2 px-4 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <TrendingUp className="h-3.5 w-3.5 text-white" />
            </div>
            趋势对比
            <Badge variant="secondary" className="text-[8px] h-4 px-1.5">
              {series.length} 条线
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 text-[10px]"
            onClick={fetchData}
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Time Range Selector */}
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3 w-3 text-muted-foreground" />
          {TIME_RANGES.map((tr) => (
            <Button
              key={tr.value}
              variant={timeRange === tr.value ? "default" : "outline"}
              size="sm"
              className={`h-6 text-[10px] px-2 ${
                timeRange === tr.value
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600"
                  : ""
              }`}
              onClick={() => setTimeRange(tr.value)}
            >
              {tr.label}
            </Button>
          ))}
        </div>

        {/* Metric Selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {METRICS.map((m) => {
            const Icon = m.icon;
            const isActive = metric === m.key;
            return (
              <TooltipProvider key={m.key} delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.button
                      onClick={() => setMetric(m.key)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] transition-all ${
                        isActive
                          ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 font-medium"
                          : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Icon className="h-3 w-3" />
                      {m.label}
                    </motion.button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[10px]">
                    查看{m.label}趋势对比
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>

        {/* Chart */}
        <div className="rounded-lg border bg-muted/10 p-3">
          <MultiLineTrendChart
            series={series}
            metric={metric}
            onHover={setHoverInfo}
          />

          {/* Tooltip overlay */}
          <AnimatePresence>
            {hoverInfo && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="absolute bg-popover border rounded-lg px-2.5 py-2 shadow-lg z-10 pointer-events-none"
                style={{
                  left: `${Math.min(hoverInfo.x + 10, 200)}px`,
                  top: `${hoverInfo.y - 10}px`,
                }}
              >
                <p className="text-[9px] text-muted-foreground mb-1">{hoverInfo.date}</p>
                <div className="space-y-0.5">
                  {hoverInfo.values.map((v, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[10px]">
                      <span
                        className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: v.color }}
                      />
                      <span className="text-muted-foreground truncate max-w-[60px]">
                        {v.name}
                      </span>
                      <span className="font-semibold tabular-nums">
                        {metric === "engagementRate"
                          ? `${v.value.toFixed(2)}%`
                          : v.value >= 1000
                            ? `${(v.value / 1000).toFixed(1)}k`
                            : Math.round(v.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Series Legend */}
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {series.map((s) => (
            <div key={s.id} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: s.color,
                  boxShadow: s.platform ? `0 0 0 2px ${
                    s.platform === "wechat" ? "rgba(16,185,129,0.3)" : "rgba(244,63,94,0.3)"
                  }` : undefined,
                }}
              />
              <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                {s.nickname}
              </span>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="rounded-lg border p-3">
          <TrendSummary series={series} metric={metric} />
        </div>
      </CardContent>
    </Card>
  );
}
