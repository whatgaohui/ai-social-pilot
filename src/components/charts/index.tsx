"use client";

import React, { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  formatNumber,
  generatePath,
  calculatePercentage,
  getTrendDirection,
  niceScale,
  clamp,
  uniqueGradId,
  CHART_PALETTE,
} from "@/lib/chart-utils";

// ═══════════════════════════════════════════════════════════════════════════════
// Types shared across chart components
// ═══════════════════════════════════════════════════════════════════════════════

interface Series {
  name: string;
  data: number[];
  color: string;
}

interface PieEntry {
  label: string;
  value: number;
  color?: string;
}

interface RadarAxis {
  label: string;
  value: number;
}

interface RadarDataset {
  name: string;
  values: number[];
  color: string;
  fillOpacity?: number;
}

interface HeatmapData {
  label: string;
  values: number[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SparkLine — Mini inline sparkline (~80 lines)
// ═══════════════════════════════════════════════════════════════════════════════

interface SparkLineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  showTrend?: boolean;
  className?: string;
}

export const SparkLine = React.memo(function SparkLine({
  data,
  color = "#8b5cf6",
  width = 80,
  height = 28,
  showTrend = true,
  className,
}: SparkLineProps) {
  const points = useMemo(() => {
    const max = Math.max(...data, 1);
    const padX = 2;
    const padY = 2;
    const innerW = width - padX * 2;
    const innerH = height - padY * 2;
    return data.map((v, i) => ({
      x: padX + (i / Math.max(data.length - 1, 1)) * innerW,
      y: padY + innerH - (v / max) * innerH,
    }));
  }, [data, width, height]);

  const linePath = useMemo(() => generatePath(points, true), [points]);
  const areaPath = useMemo(() => {
    if (points.length < 2) return "";
    return `${linePath} L${points[points.length - 1].x},${height} L${points[0].x},${height} Z`;
  }, [linePath, points, height]);

  const gradId = useMemo(() => uniqueGradId("spark", color), [color]);
  const trend = useMemo(() => getTrendDirection(data), [data]);

  const trendDisplay = useMemo(() => {
    if (!showTrend || data.length < 2) return null;
    const last = data[data.length - 1];
    const prev = data[data.length - 2];
    const pct = prev === 0 ? 0 : Math.round(((last - prev) / Math.abs(prev)) * 100);
    const colorClass =
      trend === "up"
        ? "text-emerald-500"
        : trend === "down"
          ? "text-rose-500"
          : "text-muted-foreground";
    const arrow = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";
    return (
      <span className={`text-[10px] font-semibold tabular-nums ${colorClass}`}>
        {arrow}
        {Math.abs(pct)}%
      </span>
    );
  }, [showTrend, data, trend]);

  if (data.length < 2) {
    return (
      <span className={`inline-flex items-center gap-1 ${className ?? ""}`}>
        <span className="text-[10px] text-muted-foreground">—</span>
        {trendDisplay}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${className ?? ""}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <motion.path
          d={areaPath}
          fill={`url(#${gradId})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        />
        <motion.path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        />
      </svg>
      {trendDisplay}
    </span>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// LineChart — Multi-series line chart (~200 lines)
// ═══════════════════════════════════════════════════════════════════════════════

interface LineChartProps {
  series: Series[];
  labels: string[];
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  colors?: string[];
  className?: string;
}

export const LineChart = React.memo(function LineChart({
  series,
  labels,
  height = 180,
  showLegend = true,
  showGrid = true,
  colors = CHART_PALETTE.multi,
  className,
}: LineChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const svgW = 300;
  const padL = 32;
  const padR = 12;
  const padT = 12;
  const padB = 24;
  const innerW = svgW - padL - padR;
  const innerH = height - padT - padB;

  const maxVal = useMemo(() => {
    const flat = series.flatMap((s) => s.data);
    return Math.max(...flat, 1);
  }, [series]);

  const ticks = useMemo(() => niceScale(maxVal, 4), [maxVal]);

  const allPoints = useMemo(() => {
    return series.map((s) =>
      s.data.map((v, i) => ({
        x: padL + (i / Math.max(labels.length - 1, 1)) * innerW,
        y: padT + innerH - (v / maxVal) * innerH,
        value: v,
      }))
    );
  }, [series, labels, innerW, innerH, padL, padT, maxVal]);

  const handleMouseLeave = useCallback(() => setHoveredIdx(null), []);

  return (
    <div className={className ?? ""}>
      {showLegend && (
        <div className="flex flex-wrap items-center gap-3 mb-2">
          {series.map((s, i) => (
            <div key={s.name} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: s.color || colors[i % colors.length] }}
              />
              <span className="text-[11px] text-muted-foreground">{s.name}</span>
            </div>
          ))}
        </div>
      )}
      <svg
        width="100%"
        viewBox={`0 0 ${svgW} ${height}`}
        className="overflow-visible"
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          {series.map((s, i) => {
            const c = s.color || colors[i % colors.length];
            const gid = uniqueGradId("lc-fill", s.name);
            return (
              <linearGradient key={gid} id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c} stopOpacity="0.2" />
                <stop offset="100%" stopColor={c} stopOpacity="0" />
              </linearGradient>
            );
          })}
        </defs>

        {/* Grid lines */}
        {showGrid &&
          ticks.map((tick) => {
            const y = padT + innerH - (tick / maxVal) * innerH;
            return (
              <g key={`grid-${tick}`}>
                <line
                  x1={padL}
                  y1={y}
                  x2={padL + innerW}
                  y2={y}
                  className="stroke-muted/30"
                  strokeWidth={0.5}
                />
                <text
                  x={padL - 4}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-muted-foreground"
                  fontSize={8}
                >
                  {formatNumber(tick)}
                </text>
              </g>
            );
          })}

        {/* X-axis labels */}
        {labels.map((label, i) => {
          const step = Math.max(1, Math.floor(labels.length / 7));
          if (i % step !== 0 && i !== labels.length - 1) return null;
          const x = padL + (i / Math.max(labels.length - 1, 1)) * innerW;
          return (
            <text
              key={`xl-${i}`}
              x={x}
              y={height - 4}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize={8}
            >
              {label}
            </text>
          );
        })}

        {/* Hover vertical line */}
        <AnimatePresence>
          {hoveredIdx !== null && (
            <motion.line
              x1={padL + (hoveredIdx / Math.max(labels.length - 1, 1)) * innerW}
              y1={padT}
              x2={padL + (hoveredIdx / Math.max(labels.length - 1, 1)) * innerW}
              y2={padT + innerH}
              className="stroke-muted-foreground/40"
              strokeWidth={1}
              strokeDasharray="3 3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          )}
        </AnimatePresence>

        {/* Area + Line + Points */}
        {series.map((s, si) => {
          const pts = allPoints[si];
          const c = s.color || colors[si % colors.length];
          const lineP = generatePath(pts, true);
          const areaP = pts.length >= 2
            ? `${lineP} L${pts[pts.length - 1].x},${padT + innerH} L${pts[0].x},${padT + innerH} Z`
            : "";
          const gid = uniqueGradId("lc-fill", s.name);
          return (
            <g key={s.name}>
              {areaP && (
                <motion.path
                  d={areaP}
                  fill={`url(#${gid})`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: si * 0.1 }}
                />
              )}
              <motion.path
                d={lineP}
                fill="none"
                stroke={c}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, delay: si * 0.1, ease: "easeInOut" }}
              />
              {pts.map((p, pi) => (
                <g key={pi}>
                  <rect
                    x={p.x - 12}
                    y={padT}
                    width={24}
                    height={innerH}
                    fill="transparent"
                    onMouseEnter={() => setHoveredIdx(pi)}
                  />
                  <motion.circle
                    cx={p.x}
                    cy={p.y}
                    r={hoveredIdx === pi ? 4 : 2.5}
                    fill={c}
                    stroke="var(--chart-bg, #fff)"
                    strokeWidth={1.5}
                    initial={{ r: 0, opacity: 0 }}
                    animate={{ r: hoveredIdx === pi ? 4 : 2.5, opacity: 1 }}
                    transition={{ duration: 0.2, delay: 0.3 + pi * 0.03 }}
                  />
                </g>
              ))}
            </g>
          );
        })}

        {/* Tooltip */}
        <AnimatePresence>
          {hoveredIdx !== null && (
            <motion.g
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {series.map((s, si) => {
                const px =
                  padL + (hoveredIdx / Math.max(labels.length - 1, 1)) * innerW;
                const py = allPoints[si][hoveredIdx]?.y ?? padT;
                return (
                  <text
                    key={s.name}
                    x={px}
                    y={py - 8 - si * 12}
                    textAnchor="middle"
                    className="fill-foreground"
                    fontSize={9}
                    fontWeight="600"
                  >
                    {formatNumber(s.data[hoveredIdx])}
                  </text>
                );
              })}
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// AreaChart — Stacked or overlaid area chart (~180 lines)
// ═══════════════════════════════════════════════════════════════════════════════

interface AreaChartProps {
  series: Series[];
  labels: string[];
  height?: number;
  stacked?: boolean;
  showLegend?: boolean;
  colors?: string[];
  className?: string;
}

export const AreaChart = React.memo(function AreaChart({
  series,
  labels,
  height = 180,
  stacked = false,
  showLegend = true,
  colors = CHART_PALETTE.multi,
  className,
}: AreaChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const svgW = 300;
  const padL = 32;
  const padR = 12;
  const padT = 12;
  const padB = 24;
  const innerW = svgW - padL - padR;
  const innerH = height - padT - padB;

  const computed = useMemo(() => {
    if (stacked) {
      const baseline: number[] = new Array(labels.length).fill(0);
      return series.map((s) => {
        const top = s.data.map((v, i) => v + baseline[i]);
        const result = { baseline: [...baseline], top };
        for (let i = 0; i < baseline.length; i++) baseline[i] = top[i];
        return result;
      });
    }
    return series.map((s) => ({
      baseline: new Array(labels.length).fill(0),
      top: s.data,
    }));
  }, [series, labels, stacked]);

  const maxVal = useMemo(() => {
    if (stacked) {
      const sums = labels.map((_, i) =>
        series.reduce((acc, s) => acc + (s.data[i] ?? 0), 0)
      );
      return Math.max(...sums, 1);
    }
    return Math.max(...series.flatMap((s) => s.data), 1);
  }, [series, labels, stacked]);

  const ticks = useMemo(() => niceScale(maxVal, 4), [maxVal]);
  const makePoints = (values: number[]) =>
    values.map((v, i) => ({
      x: padL + (i / Math.max(labels.length - 1, 1)) * innerW,
      y: padT + innerH - (v / maxVal) * innerH,
    }));

  return (
    <div className={className ?? ""}>
      {showLegend && (
        <div className="flex flex-wrap items-center gap-3 mb-2">
          {series.map((s, i) => (
            <div key={s.name} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: s.color || colors[i % colors.length],
                  opacity: stacked ? 1 : 0.8,
                }}
              />
              <span className="text-[11px] text-muted-foreground">{s.name}</span>
            </div>
          ))}
        </div>
      )}
      <svg
        width="100%"
        viewBox={`0 0 ${svgW} ${height}`}
        className="overflow-visible"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <defs>
          {series.map((s, i) => {
            const c = s.color || colors[i % colors.length];
            const gid = uniqueGradId("ac", s.name);
            return (
              <linearGradient key={gid} id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c} stopOpacity={stacked ? 0.6 : 0.3} />
                <stop offset="100%" stopColor={c} stopOpacity={stacked ? 0.3 : 0.02} />
              </linearGradient>
            );
          })}
        </defs>

        {/* Grid */}
        {ticks.map((tick) => {
          const y = padT + innerH - (tick / maxVal) * innerH;
          return (
            <g key={`g-${tick}`}>
              <line x1={padL} y1={y} x2={padL + innerW} y2={y} className="stroke-muted/30" strokeWidth={0.5} />
              <text x={padL - 4} y={y + 3} textAnchor="end" className="fill-muted-foreground" fontSize={8}>
                {formatNumber(tick)}
              </text>
            </g>
          );
        })}

        {/* X labels */}
        {labels.map((label, i) => {
          const step = Math.max(1, Math.floor(labels.length / 7));
          if (i % step !== 0 && i !== labels.length - 1) return null;
          const x = padL + (i / Math.max(labels.length - 1, 1)) * innerW;
          return (
            <text key={`xl-${i}`} x={x} y={height - 4} textAnchor="middle" className="fill-muted-foreground" fontSize={8}>
              {label}
            </text>
          );
        })}

        {/* Areas (drawn bottom-up for stacking) */}
        {[...series].reverse().map((s, ri) => {
          const si = series.length - 1 - ri;
          const c = s.color || colors[si % colors.length];
          const basePts = makePoints(computed[si].baseline);
          const topPts = makePoints(computed[si].top);
          const gid = uniqueGradId("ac", s.name);
          // Build area path: top line forward, baseline line backward
          const topPath = generatePath(topPts, true);
          const basePath = generatePath([...basePts].reverse(), true);
          const areaD = `${topPath} L${topPts[topPts.length - 1].x},${padT + innerH} L${basePts[0].x},${padT + innerH} ${basePath.slice(1)} Z`;
          return (
            <g key={s.name}>
              <motion.path
                d={areaD}
                fill={`url(#${gid})`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: si * 0.1 }}
              />
              <motion.path
                d={topPath}
                fill="none"
                stroke={c}
                strokeWidth={1.5}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, delay: si * 0.1, ease: "easeInOut" }}
              />
            </g>
          );
        })}

        {/* Hover dots */}
        {hoveredIdx !== null &&
          series.map((s, si) => {
            const x = padL + (hoveredIdx / Math.max(labels.length - 1, 1)) * innerW;
            const y = padT + innerH - (computed[si].top[hoveredIdx] / maxVal) * innerH;
            return (
              <circle
                key={`hd-${si}`}
                cx={x}
                cy={y}
                r={3.5}
                fill={s.color || colors[si % colors.length]}
                stroke="var(--chart-bg, #fff)"
                strokeWidth={1.5}
              />
            );
          })}

        {/* Hover zone */}
        {labels.map((_, i) => (
          <rect
            key={`hz-${i}`}
            x={padL + (i / Math.max(labels.length - 1, 1)) * innerW - 8}
            y={padT}
            width={16}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setHoveredIdx(i)}
          />
        ))}
      </svg>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// BarChart — Vertical bar chart (~200 lines)
// ═══════════════════════════════════════════════════════════════════════════════

interface BarChartProps {
  data: number[];
  labels: string[];
  height?: number;
  colors?: string[];
  showGrid?: boolean;
  showValues?: boolean;
  className?: string;
}

export const BarChart = React.memo(function BarChart({
  data,
  labels,
  height = 180,
  colors = CHART_PALETTE.multi,
  showGrid = true,
  showValues = true,
  className,
}: BarChartProps) {
  const svgW = 300;
  const padL = 32;
  const padR = 12;
  const padT = 12;
  const padB = 24;
  const innerW = svgW - padL - padR;
  const innerH = height - padT - padB;

  const maxVal = useMemo(() => Math.max(...data, 1), [data]);
  const ticks = useMemo(() => niceScale(maxVal, 4), [maxVal]);
  const barW = Math.min(Math.max(innerW / data.length * 0.6, 8), 36);
  const gap = innerW / data.length;

  return (
    <div className={className ?? ""}>
      <svg width="100%" viewBox={`0 0 ${svgW} ${height}`} className="overflow-visible">
        <defs>
          {data.map((_, i) => {
            const c = colors[i % colors.length];
            const gid = uniqueGradId("bar", `${i}`);
            return (
              <linearGradient key={gid} id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c} stopOpacity="1" />
                <stop offset="100%" stopColor={c} stopOpacity="0.6" />
              </linearGradient>
            );
          })}
        </defs>

        {/* Grid */}
        {showGrid &&
          ticks.map((tick) => {
            const y = padT + innerH - (tick / maxVal) * innerH;
            return (
              <g key={`bg-${tick}`}>
                <line x1={padL} y1={y} x2={padL + innerW} y2={y} className="stroke-muted/30" strokeWidth={0.5} />
                <text x={padL - 4} y={y + 3} textAnchor="end" className="fill-muted-foreground" fontSize={8}>
                  {formatNumber(tick)}
                </text>
              </g>
            );
          })}

        {/* Bars */}
        {data.map((val, i) => {
          const x = padL + i * gap + (gap - barW) / 2;
          const barH = Math.max((val / maxVal) * innerH, 0);
          const y = padT + innerH - barH;
          const gid = uniqueGradId("bar", `${i}`);
          return (
            <g key={`b-${i}`}>
              <motion.rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={3}
                fill={`url(#${gid})`}
                initial={{ height: 0, y: padT + innerH }}
                animate={{ height: barH, y }}
                transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
              />
              {/* X label */}
              <text
                x={x + barW / 2}
                y={height - 4}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize={8}
              >
                {labels[i]}
              </text>
              {/* Value on top */}
              {showValues && val > 0 && (
                <motion.text
                  x={x + barW / 2}
                  y={y - 4}
                  textAnchor="middle"
                  className="fill-foreground"
                  fontSize={8}
                  fontWeight="500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                >
                  {formatNumber(val)}
                </motion.text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// PieChart — Animated pie/donut chart (~150 lines)
// ═══════════════════════════════════════════════════════════════════════════════

interface PieChartProps {
  data: PieEntry[];
  donut?: boolean;
  centerText?: string;
  size?: number;
  className?: string;
}

export const PieChart = React.memo(function PieChart({
  data,
  donut = true,
  centerText,
  size = 140,
  className,
}: PieChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const cx = size / 2;
  const cy = size / 2;
  const radius = donut ? size / 2 - 12 : size / 2 - 4;
  const innerR = donut ? radius * 0.55 : 0;

  const total = useMemo(() => data.reduce((a, d) => a + d.value, 0), [data]);

  const segments = useMemo(() => {
    if (total === 0) return [];
    const results: Array<typeof data[0] & { d: string; color: string; pct: number; midAngle: number }> = [];
    let acc = -Math.PI / 2;
    for (let i = 0; i < data.length; i++) {
      const entry = data[i];
      const pct = entry.value / total;
      const sweep = pct * 2 * Math.PI;
      const startAngle = acc;
      const endAngle = acc + sweep;
      acc = endAngle;
      const color = entry.color || CHART_PALETTE.multi[i % CHART_PALETTE.multi.length];
      const x1 = cx + radius * Math.cos(startAngle);
      const y1 = cy + radius * Math.sin(startAngle);
      const x2 = cx + radius * Math.cos(endAngle);
      const y2 = cy + radius * Math.sin(endAngle);
      const ix1 = cx + innerR * Math.cos(endAngle);
      const iy1 = cy + innerR * Math.sin(endAngle);
      const ix2 = cx + innerR * Math.cos(startAngle);
      const iy2 = cy + innerR * Math.sin(startAngle);
      const large = sweep > Math.PI ? 1 : 0;
      const d = donut
        ? `M${x1},${y1} A${radius},${radius} 0 ${large} 1 ${x2},${y2} L${ix1},${iy1} A${innerR},${innerR} 0 ${large} 0 ${ix2},${iy2} Z`
        : `M${cx},${cy} L${x1},${y1} A${radius},${radius} 0 ${large} 1 ${x2},${y2} Z`;
      results.push({ ...entry, d, color, pct, midAngle: (startAngle + endAngle) / 2 });
    }
    return results;
  }, [data, total, cx, cy, radius, innerR, donut]);

  if (total === 0 || segments.length === 0) return null;

  return (
    <div className={`flex flex-col items-center gap-2 ${className ?? ""}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
      >
        {segments.map((seg, i) => {
          const isHovered = hovered === i;
          const expandDist = isHovered ? 4 : 0;
          const mx = expandDist * Math.cos(seg.midAngle);
          const my = expandDist * Math.sin(seg.midAngle);
          return (
            <motion.path
              key={seg.label}
              d={seg.d}
              fill={seg.color}
              stroke="var(--chart-bg, #fff)"
              strokeWidth={1}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{
                opacity: 1,
                scale: 1,
                translateX: mx,
                translateY: my,
              }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              style={{ transformOrigin: `${cx}px ${cy}px` }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}
        {/* Center text */}
        {donut && centerText && (
          <motion.text
            x={cx}
            y={cy + 1}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-foreground"
            fontSize={16}
            fontWeight="700"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            {centerText}
          </motion.text>
        )}
      </svg>
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-1">
            <span
              className="h-2 w-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-[10px] text-muted-foreground">
              {seg.label}
              <span className="font-medium text-foreground ml-0.5">
                {Math.round(seg.pct * 100)}%
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// RadarChart — Multi-dataset radar/spider chart (~180 lines)
// ═══════════════════════════════════════════════════════════════════════════════

interface RadarChartProps {
  axes: RadarAxis[];
  datasets: RadarDataset[];
  maxValue?: number;
  size?: number;
  className?: string;
}

export const RadarChart = React.memo(function RadarChart({
  axes,
  datasets,
  maxValue: maxProp,
  size = 180,
  className,
}: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 28;
  const n = axes.length;
  const angleStep = (2 * Math.PI) / n;
  const maxValue = maxProp ?? Math.max(...axes.map((a) => a.value), 1);

  const gridLevels = 4;

  const getAxisPos = (i: number, value: number) => {
    const angle = -Math.PI / 2 + i * angleStep;
    const r = (value / maxValue) * radius;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  return (
    <div className={`flex flex-col items-center gap-2 ${className ?? ""}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
      >
        {/* Grid rings */}
        {Array.from({ length: gridLevels }).map((_, lvl) => {
          const r = ((lvl + 1) / gridLevels) * radius;
          const pts = axes
            .map((_, i) => {
              const angle = -Math.PI / 2 + i * angleStep;
              return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
            })
            .join(" ");
          return (
            <polygon
              key={`ring-${lvl}`}
              points={pts}
              fill="none"
              className="stroke-muted/30"
              strokeWidth={0.5}
            />
          );
        })}

        {/* Axis lines */}
        {axes.map((_, i) => {
          const angle = -Math.PI / 2 + i * angleStep;
          return (
            <line
              key={`axis-${i}`}
              x1={cx}
              y1={cy}
              x2={cx + radius * Math.cos(angle)}
              y2={cy + radius * Math.sin(angle)}
              className="stroke-muted/20"
              strokeWidth={0.5}
            />
          );
        })}

        {/* Axis labels */}
        {axes.map((axis, i) => {
          const angle = -Math.PI / 2 + i * angleStep;
          const labelR = radius + 14;
          const x = cx + labelR * Math.cos(angle);
          const y = cy + labelR * Math.sin(angle);
          const anchor =
            Math.abs(Math.cos(angle)) < 0.1
              ? "middle"
              : Math.cos(angle) > 0
                ? "start"
                : "end";
          return (
            <text
              key={`al-${i}`}
              x={x}
              y={y + 3}
              textAnchor={anchor}
              className="fill-muted-foreground"
              fontSize={9}
            >
              {axis.label}
            </text>
          );
        })}

        {/* Data polygons */}
        {datasets.map((ds, di) => {
          const pts = ds.values
            .map((v, i) => {
              const p = getAxisPos(i, v);
              return `${p.x},${p.y}`;
            })
            .join(" ");
          const gid = uniqueGradId("radar", ds.name);
          return (
            <g key={ds.name}>
              <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={ds.color} stopOpacity={ds.fillOpacity ?? 0.25} />
                  <stop offset="100%" stopColor={ds.color} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <motion.polygon
                points={pts}
                fill={`url(#${gid})`}
                stroke={ds.color}
                strokeWidth={1.5}
                strokeLinejoin="round"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: di * 0.15 }}
                style={{ transformOrigin: `${cx}px ${cy}px` }}
              />
              {ds.values.map((v, i) => {
                const p = getAxisPos(i, v);
                return (
                  <motion.circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={3}
                    fill={ds.color}
                    stroke="var(--chart-bg, #fff)"
                    strokeWidth={1}
                    initial={{ r: 0 }}
                    animate={{ r: 3 }}
                    transition={{ delay: 0.5 + di * 0.15 + i * 0.03 }}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>
      {/* Legend */}
      {datasets.length > 1 && (
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
          {datasets.map((ds) => (
            <div key={ds.name} className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ds.color }} />
              <span className="text-[10px] text-muted-foreground">{ds.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// Heatmap — Calendar-style grid heatmap (~150 lines)
// ═══════════════════════════════════════════════════════════════════════════════

interface HeatmapProps {
  data: HeatmapData[];
  colors?: string[];
  cellSize?: number;
  className?: string;
}

export const Heatmap = React.memo(function Heatmap({
  data,
  colors = CHART_PALETTE.heatmap,
  cellSize = 18,
  className,
}: HeatmapProps) {
  const [tooltip, setTooltip] = useState<{
    label: string;
    value: number;
    x: number;
    y: number;
  } | null>(null);

  const allValues = useMemo(() => data.flatMap((d) => d.values), [data]);
  const maxVal = useMemo(() => Math.max(...allValues, 1), [allValues]);

  const getColor = (val: number) => {
    if (val === 0) return colors[0];
    const level = clamp(Math.ceil((val / maxVal) * (colors.length - 1)), 0, colors.length - 1);
    return colors[level];
  };

  const cellGap = 2;
  const svgW = data[0]?.values.length ? data[0].values.length * (cellSize + cellGap) + 40 : 200;
  const svgH = data.length * (cellSize + cellGap) + 20;

  return (
    <div className={`relative ${className ?? ""}`}>
      <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} className="overflow-visible">
        {data.map((row, ri) =>
          row.values.map((val, ci) => {
            const x = 40 + ci * (cellSize + cellGap);
            const y = ri * (cellSize + cellGap);
            return (
              <motion.rect
                key={`${ri}-${ci}`}
                x={x}
                y={y}
                width={cellSize}
                height={cellSize}
                rx={3}
                fill={getColor(val)}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: (ri * row.values.length + ci) * 0.01 }}
                onMouseEnter={(e) => {
                  const rect = (e.target as SVGElement).getBoundingClientRect();
                  const parent = (e.target as SVGElement).closest("svg")?.getBoundingClientRect();
                  if (parent) {
                    setTooltip({
                      label: row.label + " · 星期" + (["一", "二", "三", "四", "五", "六", "日"][ci % 7] ?? "D" + ci),
                      value: val,
                      x: x + cellSize / 2,
                      y: y - 4,
                    });
                  }
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            );
          })
        )}

        {/* Row labels */}
        {data.map((row, ri) => (
          <text
            key={`rl-${ri}`}
            x={36}
            y={ri * (cellSize + cellGap) + cellSize / 2 + 3}
            textAnchor="end"
            className="fill-muted-foreground"
            fontSize={8}
          >
            {row.label}
          </text>
        ))}

        {/* Tooltip */}
        <AnimatePresence>
          {tooltip && (
            <motion.g
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
            >
              <rect
                x={tooltip.x - 30}
                y={tooltip.y - 24}
                width={60}
                height={20}
                rx={4}
                className="fill-popover stroke-border"
                strokeWidth={0.5}
              />
              <text
                x={tooltip.x}
                y={tooltip.y - 11}
                textAnchor="middle"
                className="fill-foreground"
                fontSize={8}
                fontWeight="500"
              >
                {tooltip.label}: {tooltip.value}
              </text>
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// ProgressChart — Semi-circular gauge + linear progress + stats (~100 lines)
// ═══════════════════════════════════════════════════════════════════════════════

interface ProgressChartProps {
  value: number;
  max?: number;
  label?: string;
  showLinear?: boolean;
  size?: number;
  className?: string;
}

export const ProgressChart = React.memo(function ProgressChart({
  value,
  max = 100,
  label,
  showLinear = true,
  size = 120,
  className,
}: ProgressChartProps) {
  const pct = clamp(calculatePercentage(value, max), 0, 100);

  const color = pct >= 70 ? "#10b981" : pct >= 30 ? "#f59e0b" : "#f43f5e";
  const colorLabel = pct >= 70 ? "良好" : pct >= 30 ? "一般" : "偏低";

  // Semicircle arc parameters
  const r = (size - 16) / 2;
  const strokeWidth = 10;
  const arcLength = Math.PI * r;
  const filledLength = (pct / 100) * arcLength;
  const arcCx = size / 2;
  const arcCy = r + 8;

  const gid = uniqueGradId("gauge", String(value));

  return (
    <div className={`flex flex-col items-center gap-1 ${className ?? ""}`}>
      {/* Semicircular Gauge */}
      <svg width={size} height={r + 20} viewBox={`0 0 ${size} ${r + 20}`} className="overflow-visible">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.6" />
          </linearGradient>
        </defs>
        {/* Background arc */}
        <path
          d={`M${arcCx - r},${arcCy} A${r},${r} 0 0 1 ${arcCx + r},${arcCy}`}
          fill="none"
          className="stroke-muted/30"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <motion.path
          d={`M${arcCx - r},${arcCy} A${r},${r} 0 0 1 ${arcCx + r},${arcCy}`}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={arcLength}
          initial={{ strokeDashoffset: arcLength }}
          animate={{ strokeDashoffset: arcLength - filledLength }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
        />
        {/* Center value */}
        <text
          x={arcCx}
          y={arcCy - 4}
          textAnchor="middle"
          className="fill-foreground"
          fontSize={20}
          fontWeight="700"
          fontFamily="monospace"
        >
          {Math.round(pct)}
          <tspan fontSize={10} fill="currentColor" className="fill-muted-foreground">%</tspan>
        </text>
        <text
          x={arcCx}
          y={arcCy + 10}
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize={9}
        >
          {colorLabel}
        </text>
      </svg>

      {/* Linear progress bar */}
      {showLinear && (
        <div className="w-full max-w-[200px]">
          {label && (
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground">{label}</span>
              <span className="text-[10px] font-medium text-foreground tabular-nums">
                {value}/{max}
              </span>
            </div>
          )}
          <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>
      )}
    </div>
  );
});
