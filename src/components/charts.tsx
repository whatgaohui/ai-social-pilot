"use client";

import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  formatNumber,
  generatePath,
  calculatePercentage,
  getTrendDirectionFull,
  uniqueGradId,
  clamp,
  niceScale,
  CHART_PALETTE,
} from "@/lib/chart-utils";

// ═══════════════════════════════════════════════════════════════════════════════
// SparkLine — Mini inline sparkline with gradient fill
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
    return data.map((v, i) => ({
      x: padX + (i / Math.max(data.length - 1, 1)) * (width - padX * 2),
      y: padY + (height - padY * 2) - (v / max) * (height - padY * 2),
    }));
  }, [data, width, height]);

  const linePath = useMemo(() => generatePath(points, true), [points]);
  const areaPath = useMemo(() => {
    if (points.length < 2) return "";
    return `${linePath} L${points[points.length - 1].x},${height} L${points[0].x},${height} Z`;
  }, [linePath, points, height]);

  const gradId = useMemo(() => uniqueGradId("spark", color), [color]);
  const trend = useMemo(() => getTrendDirectionFull(data), [data]);

  const trendDisplay = useMemo(() => {
    if (!showTrend || data.length < 2) return null;
    const colorClass =
      trend.direction === "up"
        ? "text-emerald-500"
        : trend.direction === "down"
          ? "text-rose-500"
          : "text-muted-foreground";
    const arrow = trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→";
    return (
      <span className={`text-[10px] font-semibold tabular-nums ${colorClass}`}>
        {arrow}{trend.percentage}%
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
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <motion.path d={areaPath} fill={`url(#${gradId})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} />
        <motion.path d={linePath} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, ease: "easeInOut" }} />
      </svg>
      {trendDisplay}
    </span>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// MiniBarChart — Compact horizontal bars
// ═══════════════════════════════════════════════════════════════════════════════

interface MiniBarChartProps {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  className?: string;
}

export const MiniBarChart = React.memo(function MiniBarChart({
  data,
  color = "#8b5cf6",
  height = 140,
  className,
}: MiniBarChartProps) {
  const maxVal = useMemo(() => Math.max(...data.map((d) => d.value), 1), [data]);
  const barH = Math.min(Math.max((height - data.length * 6) / data.length, 8), 20);
  const gap = barH + 6;
  const labelW = 56;
  const valueW = 40;
  const chartW = 180;
  const svgW = labelW + chartW + valueW;
  const svgH = Math.max(data.length * gap, 40);

  return (
    <div className={className ?? ""}>
      <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} className="overflow-visible">
        {data.map((item, i) => {
          const y = i * gap;
          const barWidth = Math.max((item.value / maxVal) * chartW, 0);
          const gradId = uniqueGradId("mbar", `${i}`);
          return (
            <g key={item.label}>
              <text x={0} y={y + barH / 2 + 3} className="fill-muted-foreground" fontSize={10} textAnchor="start">
                {item.label}
              </text>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={color} stopOpacity="0.8" />
                  <stop offset="100%" stopColor={color} stopOpacity="1" />
                </linearGradient>
              </defs>
              <motion.rect x={labelW} y={y} width={0} height={barH} rx={3} fill={`url(#${gradId})`} initial={{ width: 0 }} animate={{ width: barWidth }} transition={{ duration: 0.5, delay: i * 0.06, ease: "easeOut" }} />
              <motion.text x={labelW + chartW + 6} y={y + barH / 2 + 3} className="fill-foreground" fontSize={10} fontWeight="600" fontFamily="monospace" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.06 }}>
                {formatNumber(item.value)}
              </motion.text>
            </g>
          );
        })}
      </svg>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// ProgressRing — Animated circular progress indicator
// ═══════════════════════════════════════════════════════════════════════════════

interface ProgressRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
}

export const ProgressRing = React.memo(function ProgressRing({
  value,
  size = 80,
  strokeWidth = 6,
  color = "#8b5cf6",
  className,
}: ProgressRingProps) {
  const clampedValue = clamp(value, 0, 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference;
  const gradId = useMemo(() => uniqueGradId("pring", color), [color]);

  return (
    <div className={`relative inline-flex items-center justify-center ${className ?? ""}`}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={CHART_PALETTE.secondary} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" className="stroke-muted/20" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span className="text-sm font-bold tabular-nums" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }}>
          {Math.round(clampedValue)}%
        </motion.span>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// MiniPieChart — Small inline donut chart with center text
// ═══════════════════════════════════════════════════════════════════════════════

interface MiniPieChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
  centerText?: string;
  className?: string;
}

export const MiniPieChart = React.memo(function MiniPieChart({
  data,
  size = 120,
  centerText,
  className,
}: MiniPieChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const total = useMemo(() => data.reduce((a, d) => a + d.value, 0), [data]);

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 10;
  const innerR = radius * 0.58;

  const segments = useMemo(() => {
    if (total === 0) return [];
    let cumulative = -Math.PI / 2;
    return data.map((entry) => {
      const pct = entry.value / total;
      const sweep = pct * 2 * Math.PI;
      const startAngle = cumulative;
      const endAngle = cumulative + sweep;
      cumulative = endAngle;
      const x1 = cx + radius * Math.cos(startAngle);
      const y1 = cy + radius * Math.sin(startAngle);
      const x2 = cx + radius * Math.cos(endAngle);
      const y2 = cy + radius * Math.sin(endAngle);
      const ix1 = cx + innerR * Math.cos(endAngle);
      const iy1 = cy + innerR * Math.sin(endAngle);
      const ix2 = cx + innerR * Math.cos(startAngle);
      const iy2 = cy + innerR * Math.sin(startAngle);
      const large = sweep > Math.PI ? 1 : 0;
      const d = `M${x1},${y1} A${radius},${radius} 0 ${large} 1 ${x2},${y2} L${ix1},${iy1} A${innerR},${innerR} 0 ${large} 0 ${ix2},${iy2} Z`;
      return { ...entry, d, pct, midAngle: (startAngle + endAngle) / 2 };
    });
  }, [data, total, cx, cy, radius, innerR]);

  if (total === 0) return null;

  return (
    <div className={`flex flex-col items-center gap-2 ${className ?? ""}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {segments.map((seg, i) => {
          const expandDist = hovered === i ? 4 : 0;
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
              animate={{ opacity: 1, scale: 1, translateX: mx, translateY: my }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              style={{ transformOrigin: `${cx}px ${cy}px` }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}
        {centerText && (
          <motion.text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" className="fill-foreground" fontSize={14} fontWeight="700" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            {centerText}
          </motion.text>
        )}
      </svg>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
        {segments.map((seg) => (
          <div key={seg.label} className="chart-legend-item flex items-center gap-1">
            <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-[10px] text-muted-foreground">
              {seg.label}<span className="font-medium text-foreground ml-0.5">{Math.round(seg.pct * 100)}%</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// TrendChart — Line chart with area fill, grid, labels
// ═══════════════════════════════════════════════════════════════════════════════

interface TrendChartProps {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  showGrid?: boolean;
  className?: string;
}

export const TrendChart = React.memo(function TrendChart({
  data,
  color = "#8b5cf6",
  height = 180,
  showGrid = true,
  className,
}: TrendChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const svgW = 300;
  const padL = 36;
  const padR = 12;
  const padT = 12;
  const padB = 24;
  const innerW = svgW - padL - padR;
  const innerH = height - padT - padB;

  const maxVal = useMemo(() => Math.max(...data.map((d) => d.value), 1), [data]);
  const ticks = useMemo(() => niceScale(maxVal, 4), [maxVal]);

  const points = useMemo(() =>
    data.map((d, i) => ({
      x: padL + (i / Math.max(data.length - 1, 1)) * innerW,
      y: padT + innerH - (d.value / maxVal) * innerH,
      value: d.value,
    })),
  [data, innerW, innerH, padL, padT, maxVal]);

  const linePath = useMemo(() => generatePath(points, true), [points]);
  const areaPath = useMemo(() => {
    if (points.length < 2) return "";
    return `${linePath} L${points[points.length - 1].x},${padT + innerH} L${points[0].x},${padT + innerH} Z`;
  }, [linePath, points, padT, innerH]);

  const gradId = useMemo(() => uniqueGradId("trend", color), [color]);
  const areaGradId = useMemo(() => uniqueGradId("trend-area", color), [color]);

  return (
    <div className={className ?? ""}>
      <svg width="100%" viewBox={`0 0 ${svgW} ${height}`} className="overflow-visible" onMouseLeave={() => setHoveredIdx(null)}>
        <defs>
          <linearGradient id={areaGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {showGrid && ticks.map((tick) => {
          const y = padT + innerH - (tick / maxVal) * innerH;
          return (
            <g key={`grid-${tick}`}>
              <line x1={padL} y1={y} x2={padL + innerW} y2={y} className="trend-chart-grid stroke-muted/30" strokeWidth={0.5} />
              <text x={padL - 4} y={y + 3} textAnchor="end" className="trend-chart-label fill-muted-foreground" fontSize={8}>
                {formatNumber(tick)}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const x = padL + (i / Math.max(data.length - 1, 1)) * innerW;
          return (
            <text key={`xl-${i}`} x={x} y={height - 4} textAnchor="middle" className="trend-chart-label fill-muted-foreground" fontSize={8}>
              {d.label}
            </text>
          );
        })}

        <AnimatePresence>
          {hoveredIdx !== null && (
            <motion.line
              x1={padL + (hoveredIdx / Math.max(data.length - 1, 1)) * innerW}
              y1={padT} x2={padL + (hoveredIdx / Math.max(data.length - 1, 1)) * innerW} y2={padT + innerH}
              className="stroke-muted-foreground/30" strokeWidth={1} strokeDasharray="3 3"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            />
          )}
        </AnimatePresence>

        <motion.path d={areaPath} fill={`url(#${areaGradId})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} />
        <motion.path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: "easeInOut" }} />

        {points.map((p, i) => (
          <g key={i}>
            <rect x={p.x - 12} y={padT} width={24} height={innerH} fill="transparent" onMouseEnter={() => setHoveredIdx(i)} />
            <motion.circle
              cx={p.x} cy={p.y} r={hoveredIdx === i ? 4 : 2.5}
              fill={color} stroke="var(--chart-bg, #fff)" strokeWidth={1.5}
              initial={{ r: 0, opacity: 0 }} animate={{ r: hoveredIdx === i ? 4 : 2.5, opacity: 1 }}
              transition={{ duration: 0.2, delay: 0.3 + i * 0.03 }}
            />
          </g>
        ))}

        <AnimatePresence>
          {hoveredIdx !== null && (
            <motion.g initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <rect x={points[hoveredIdx]?.x - 24 ?? 0} y={padT - 18} width={48} height={18} rx={4} className="fill-popover stroke-border" strokeWidth={0.5} />
              <text x={points[hoveredIdx]?.x ?? 0} y={padT - 6} textAnchor="middle" className="fill-foreground" fontSize={9} fontWeight="600">
                {formatNumber(data[hoveredIdx]?.value ?? 0)}
              </text>
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// ComparisonBar — Horizontal dual bars (this week vs last week)
// ═══════════════════════════════════════════════════════════════════════════════

interface ComparisonBarProps {
  items: { label: string; current: number; previous: number }[];
  height?: number;
  className?: string;
}

export const ComparisonBar = React.memo(function ComparisonBar({
  items,
  height = 160,
  className,
}: ComparisonBarProps) {
  const maxVal = useMemo(() => {
    const allVals = items.flatMap((m) => [m.current, m.previous]);
    return Math.max(...allVals, 1);
  }, [items]);

  const barH = 8;
  const groupGap = 14;
  const labelW = 52;
  const chartW = 180;
  const valueW = 44;
  const svgW = labelW + chartW + valueW;
  const svgH = items.length * (barH * 2 + groupGap) + items.length * 18;

  return (
    <div className={className ?? ""}>
      {/* Legend */}
      <div className="flex items-center gap-4 mb-2 px-1">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#8b5cf6" }} />
          <span className="text-[10px] text-muted-foreground">本周</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#94a3b8" }} />
          <span className="text-[10px] text-muted-foreground">上周</span>
        </div>
      </div>

      <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} className="overflow-visible">
        <defs>
          <linearGradient id="comp-current" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="comp-previous" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.7" />
          </linearGradient>
        </defs>

        {items.map((m, i) => {
          const yBase = i * (barH * 2 + groupGap + 18) + 10;
          const curW = Math.max((m.current / maxVal) * chartW, 2);
          const prevW = Math.max((m.previous / maxVal) * chartW, 2);
          const change = m.previous === 0 ? 0 : Math.round(((m.current - m.previous) / Math.abs(m.previous)) * 100);
          const changeColor = change >= 0 ? "text-emerald-500" : "text-rose-500";

          return (
            <g key={m.label}>
              <text x={0} y={yBase + barH + 2} className="fill-muted-foreground" fontSize={10} textAnchor="start">
                {m.label}
              </text>
              <motion.rect x={labelW} y={yBase} width={0} height={barH} rx={3} fill="url(#comp-current)" initial={{ width: 0 }} animate={{ width: curW }} transition={{ duration: 0.5, delay: i * 0.08, ease: "easeOut" }} />
              <motion.rect x={labelW} y={yBase + barH + 3} width={0} height={barH} rx={3} fill="url(#comp-previous)" initial={{ width: 0 }} animate={{ width: prevW }} transition={{ duration: 0.5, delay: i * 0.08 + 0.05, ease: "easeOut" }} />
              <motion.text x={labelW + chartW + 6} y={yBase + barH + 1} className="fill-foreground" fontSize={9} fontWeight="600" fontFamily="monospace" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.08 }}>
                {formatNumber(m.current)}
              </motion.text>
              <motion.text x={labelW + chartW + 6} y={yBase + barH + barH + 4} className="fill-muted-foreground" fontSize={9} fontFamily="monospace" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 + i * 0.08 }}>
                {formatNumber(m.previous)}
              </motion.text>
              <motion.text x={labelW + chartW + valueW - 8} y={yBase + barH + 4} textAnchor="end" className={changeColor} fontSize={9} fontWeight="600" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 + i * 0.08 }}>
                {change >= 0 ? "+" : ""}{change}%
              </motion.text>
            </g>
          );
        })}
      </svg>
    </div>
  );
});
