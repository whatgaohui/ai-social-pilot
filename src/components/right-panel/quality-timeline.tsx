"use client";

import React, { useState, useMemo, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Info } from "lucide-react";
import type { ContentPost } from "@/types";

// ─── Types ──────────────────────────────────────────────────────────────────

interface DataPoint {
  date: string;
  label: string;
  score: number;
  topic: string;
}

interface TooltipData {
  x: number;
  y: number;
  date: string;
  score: number;
  topic: string;
}

// ─── Simple linear regression ──────────────────────────────────────────────
function linearRegression(points: DataPoint[]): { slope: number; intercept: number } | null {
  const n = points.length;
  if (n < 2) return null;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += points[i].score;
    sumXY += i * points[i].score;
    sumXX += i * i;
  }

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

// ─── Chart dimensions ──────────────────────────────────────────────────────
const CHART_WIDTH = 560;
const CHART_HEIGHT = 220;
const PADDING = { top: 20, right: 20, bottom: 36, left: 36 };
const PLOT_W = CHART_WIDTH - PADDING.left - PADDING.right;
const PLOT_H = CHART_HEIGHT - PADDING.top - PADDING.bottom;

function getDotColor(score: number): string {
  if (score >= 80) return "#34d399"; // emerald-400
  if (score >= 60) return "#fbbf24"; // amber-400
  return "#f87171"; // red-400
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}`;
  } catch {
    return dateStr;
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

interface QualityTimelineProps {
  posts: ContentPost[];
}

export function QualityTimeline({ posts }: QualityTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [containerWidth, setContainerWidth] = useState(400);

  // Filter posts with aiScore > 0 and sort by date
  const dataPoints = useMemo((): DataPoint[] => {
    return posts
      .filter((p) => p.aiScore > 0 && p.scheduledDate)
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
      .map((p) => ({
        date: p.scheduledDate,
        label: formatDate(p.scheduledDate),
        score: p.aiScore,
        topic: p.topic || "未命名",
      }));
  }, [posts]);

  const avgScore = useMemo(() => {
    if (dataPoints.length === 0) return 0;
    return dataPoints.reduce((sum, d) => sum + d.score, 0) / dataPoints.length;
  }, [dataPoints]);

  const regression = useMemo(
    () => linearRegression(dataPoints),
    [dataPoints],
  );

  // ── Build SVG paths ─────────────────────────────────────────────────────
  const linePath = useMemo(() => {
    if (dataPoints.length < 2) return "";
    return dataPoints
      .map((d, i) => {
        const x = PADDING.left + (i / (dataPoints.length - 1)) * PLOT_W;
        const y = PADDING.top + PLOT_H - (d.score / 100) * PLOT_H;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [dataPoints]);

  const areaPath = useMemo(() => {
    if (!linePath || dataPoints.length < 2) return "";
    const lastX = PADDING.left + PLOT_W;
    const baseline = PADDING.top + PLOT_H;
    return `${linePath} L${lastX.toFixed(1)},${baseline} L${PADDING.left},${baseline} Z`;
  }, [linePath, dataPoints]);

  const trendPath = useMemo(() => {
    if (!regression || dataPoints.length < 2) return "";
    const y0 = regression.intercept;
    const y1 = regression.intercept + regression.slope * (dataPoints.length - 1);
    const x0 = PADDING.left;
    const x1 = PADDING.left + PLOT_W;
    const py0 = PADDING.top + PLOT_H - (y0 / 100) * PLOT_H;
    const py1 = PADDING.top + PLOT_H - (y1 / 100) * PLOT_H;
    return `M${x0},${py0.toFixed(1)} L${x1},${py1.toFixed(1)}`;
  }, [regression, dataPoints]);

  const avgY = useMemo(() => {
    return PADDING.top + PLOT_H - (avgScore / 100) * PLOT_H;
  }, [avgScore]);

  // Estimate total path length for animation
  const estimatedPathLength = useMemo(() => {
    if (dataPoints.length < 2) return 0;
    // Rough estimate: sum of segment lengths
    let total = 0;
    for (let i = 1; i < dataPoints.length; i++) {
      const dx = PLOT_W / (dataPoints.length - 1);
      const dy = Math.abs(dataPoints[i].score - dataPoints[i - 1].score) / 100 * PLOT_H;
      total += Math.sqrt(dx * dx + dy * dy);
    }
    return total;
  }, [dataPoints]);

  const handleDotHover = useCallback((point: DataPoint, index: number, e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = containerRef.current?.clientWidth || 400;
    setContainerWidth(width);
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      date: point.label,
      score: point.score,
      topic: point.topic,
    });
  }, []);

  const handleDotLeave = () => {
    setTooltip(null);
  };

  // ── Empty state ──────────────────────────────────────────────────────────
  if (dataPoints.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <TrendingUp className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <h3 className="text-xs font-semibold">质量趋势</h3>
            <p className="text-[10px] text-muted-foreground">AI评分随时间的变化</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center rounded-xl border border-border/20 bg-card/50">
          <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center mb-3">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">暂无AI评分数据</p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">
            对内容进行AI评分后即可查看质量趋势
          </p>
        </div>
      </div>
    );
  }

  // ── Y-axis gridlines ─────────────────────────────────────────────────────
  const yTicks = [0, 20, 40, 60, 80, 100];

  // Determine trend direction
  const trendDirection = regression
    ? regression.slope > 0.5
      ? "上升"
      : regression.slope < -0.5
        ? "下降"
        : "平稳"
    : "—";

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <TrendingUp className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <h3 className="text-xs font-semibold">质量趋势</h3>
            <p className="text-[10px] text-muted-foreground">
              {dataPoints.length} 条数据 · 平均 {avgScore.toFixed(1)} 分 · 趋势{trendDirection}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-[9px] text-muted-foreground">≥80</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="text-[9px] text-muted-foreground">≥60</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-red-400" />
            <span className="text-[9px] text-muted-foreground">&lt;60</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-border/20 bg-card/50 p-3 relative" ref={containerRef}>
        <div className="w-full overflow-x-auto scrollbar-none">
          <svg
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            className="w-full h-auto"
            style={{ minWidth: CHART_WIDTH }}
          >
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#7c3aed" />
              </linearGradient>
            </defs>

            {/* Y-axis gridlines + labels */}
            {yTicks.map((tick) => {
              const y = PADDING.top + PLOT_H - (tick / 100) * PLOT_H;
              return (
                <g key={tick}>
                  <line
                    x1={PADDING.left}
                    y1={y}
                    x2={PADDING.left + PLOT_W}
                    y2={y}
                    stroke="currentColor"
                    strokeOpacity={0.06}
                    strokeWidth={1}
                  />
                  <text
                    x={PADDING.left - 6}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-muted-foreground/50"
                    style={{ fontSize: "8px" }}
                  >
                    {tick}
                  </text>
                </g>
              );
            })}

            {/* X-axis labels */}
            {dataPoints.map((point, i) => {
              const x =
                dataPoints.length === 1
                  ? PADDING.left + PLOT_W / 2
                  : PADDING.left + (i / (dataPoints.length - 1)) * PLOT_W;
              // Show at most ~10 labels to avoid crowding
              const labelInterval = Math.max(1, Math.floor(dataPoints.length / 10));
              const showLabel = i % labelInterval === 0 || i === dataPoints.length - 1;
              return (
                <text
                  key={i}
                  x={x}
                  y={CHART_HEIGHT - 6}
                  textAnchor="middle"
                  className="fill-muted-foreground/50"
                  style={{ fontSize: "7px" }}
                >
                  {showLabel ? point.label : ""}
                </text>
              );
            })}

            {/* Average line (dashed) */}
            <line
              x1={PADDING.left}
              y1={avgY}
              x2={PADDING.left + PLOT_W}
              y2={avgY}
              stroke="#fbbf24"
              strokeWidth={1}
              strokeDasharray="4 3"
              strokeOpacity={0.6}
            />
            <text
              x={PADDING.left + PLOT_W + 4}
              y={avgY + 3}
              className="fill-amber-400/70"
              style={{ fontSize: "7px" }}
            >
              均{avgScore.toFixed(0)}
            </text>

            {/* Area fill (gradient) */}
            {areaPath && (
              <motion.path
                d={areaPath}
                fill="url(#areaGradient)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
            )}

            {/* Trend line */}
            {trendPath && (
              <motion.path
                d={trendPath}
                fill="none"
                stroke="#f472b6"
                strokeWidth={1.5}
                strokeDasharray="6 4"
                strokeOpacity={0.5}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.5 }}
                transition={{ duration: 1.5, delay: 0.8, ease: "easeInOut" }}
              />
            )}

            {/* Main line */}
            {linePath && (
              <motion.path
                d={linePath}
                fill="none"
                stroke="url(#lineGradient)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
              />
            )}

            {/* Data dots */}
            {dataPoints.map((point, i) => {
              const x =
                dataPoints.length === 1
                  ? PADDING.left + PLOT_W / 2
                  : PADDING.left + (i / (dataPoints.length - 1)) * PLOT_W;
              const y = PADDING.top + PLOT_H - (point.score / 100) * PLOT_H;
              const color = getDotColor(point.score);

              return (
                <motion.circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={4}
                  fill={color}
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    duration: 0.3,
                    delay: 0.3 + i * 0.06,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={(e) => handleDotHover(point, i, e as unknown as React.MouseEvent)}
                  onMouseLeave={handleDotLeave}
                />
              );
            })}
          </svg>
        </div>

        {/* Tooltip */}
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.12 }}
            className="absolute z-20 pointer-events-none rounded-lg border border-border/80 bg-popover/95 backdrop-blur-sm shadow-xl p-2.5 max-w-[200px]"
            style={{
              left: Math.min(tooltip.x + 12, containerWidth - 220),
              top: tooltip.y - 10,
            }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: getDotColor(tooltip.score) }}
              />
              <span className="text-[11px] font-semibold">{tooltip.score} 分</span>
            </div>
            <p className="text-[10px] text-muted-foreground truncate">{tooltip.topic}</p>
            <p className="text-[9px] text-muted-foreground/60 mt-0.5">{tooltip.date}</p>
          </motion.div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-border/20 bg-muted/20 p-2.5 text-center">
          <p className="text-[10px] text-muted-foreground">最高分</p>
          <p className="text-sm font-bold text-emerald-500 tabular-nums">
            {Math.max(...dataPoints.map((d) => d.score))}
          </p>
        </div>
        <div className="rounded-lg border border-border/20 bg-muted/20 p-2.5 text-center">
          <p className="text-[10px] text-muted-foreground">最低分</p>
          <p className="text-sm font-bold text-red-400 tabular-nums">
            {Math.min(...dataPoints.map((d) => d.score))}
          </p>
        </div>
        <div className="rounded-lg border border-border/20 bg-muted/20 p-2.5 text-center">
          <p className="text-[10px] text-muted-foreground">趋势</p>
          <p className={`text-sm font-bold tabular-nums ${
            trendDirection === "上升" ? "text-emerald-500" :
            trendDirection === "下降" ? "text-red-400" : "text-amber-400"
          }`}>
            {trendDirection}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-1">
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-4 rounded bg-gradient-to-r from-violet-400 to-violet-600" />
          <span className="text-[9px] text-muted-foreground/60">评分曲线</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-4 rounded bg-amber-400/60 border-t border-dashed border-amber-400" />
          <span className="text-[9px] text-muted-foreground/60">平均线</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-4 rounded bg-pink-400/50 border-t border-dashed border-pink-400" />
          <span className="text-[9px] text-muted-foreground/60">趋势线</span>
        </div>
      </div>
    </div>
  );
}
