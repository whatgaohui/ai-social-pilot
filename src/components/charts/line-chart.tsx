"use client";

import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatNumber, generatePath, niceScale, clamp, uniqueGradId, CHART_PALETTE } from "@/lib/chart-utils";

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface TrendSeries {
  name: string;
  data: number[];
  color: string;
}

interface LineChartAdvancedProps {
  series: TrendSeries[];
  labels: string[];
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  smooth?: boolean;
  showAreaGradient?: boolean;
  showDataPoints?: boolean;
  showTooltip?: boolean;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LineChartAdvanced — Multi-series SVG line chart with rich interactivity
// ═══════════════════════════════════════════════════════════════════════════════

export const LineChartAdvanced = React.memo(function LineChartAdvanced({
  series,
  labels,
  height = 220,
  showLegend = true,
  showGrid = true,
  smooth = true,
  showAreaGradient = true,
  showDataPoints = true,
  showTooltip = true,
  className,
}: LineChartAdvancedProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  // Visible series (excluding hidden ones)
  const visibleSeries = useMemo(
    () => series.filter((s) => !hiddenSeries.has(s.name)),
    [series, hiddenSeries]
  );

  // SVG layout constants
  const svgW = 340;
  const padL = 40;
  const padR = 14;
  const padT = 14;
  const padB = 28;
  const innerW = svgW - padL - padR;
  const innerH = height - padT - padB;

  // Y-axis: compute max value from visible series only
  const maxVal = useMemo(() => {
    const flat = visibleSeries.flatMap((s) => s.data);
    return Math.max(...flat, 1);
  }, [visibleSeries]);

  const ticks = useMemo(() => niceScale(maxVal, 5), [maxVal]);

  // Compute chart points for each visible series
  const allPoints = useMemo(() => {
    return visibleSeries.map((s) =>
      s.data.map((v, i) => ({
        x: padL + (i / Math.max(labels.length - 1, 1)) * innerW,
        y: padT + innerH - (v / maxVal) * innerH,
        value: v,
      }))
    );
  }, [visibleSeries, labels, innerW, innerH, padL, padT, maxVal]);

  // Generate SVG path strings
  const paths = useMemo(() => {
    return allPoints.map((pts) => {
      const linePath = generatePath(pts, smooth);
      const areaPath =
        pts.length >= 2
          ? `${linePath} L${pts[pts.length - 1].x},${padT + innerH} L${pts[0].x},${padT + innerH} Z`
          : "";
      return { linePath, areaPath };
    });
  }, [allPoints, smooth, padT, innerH]);

  // Toggle series visibility
  const toggleSeries = useCallback((name: string) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        // Prevent hiding all series
        if (series.length - next.size > 0) {
          next.add(name);
        }
      }
      return next;
    });
  }, [series.length]);

  const handleMouseLeave = useCallback(() => setHoveredIdx(null), []);

  // Label step to avoid crowding on X-axis
  const labelStep = useMemo(
    () => Math.max(1, Math.floor(labels.length / 8)),
    [labels.length]
  );

  return (
    <div className={className ?? ""}>
      {/* Legend — clickable to toggle series */}
      {showLegend && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
          {series.map((s) => {
            const isHidden = hiddenSeries.has(s.name);
            return (
              <motion.button
                key={s.name}
                className="flex items-center gap-1.5 cursor-pointer group"
                onClick={() => toggleSeries(s.name)}
                whileTap={{ scale: 0.95 }}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full flex-shrink-0 transition-all duration-200"
                  style={{
                    backgroundColor: isHidden ? undefined : s.color,
                    opacity: isHidden ? 0.3 : 1,
                    border: isHidden ? `1.5px dashed ${s.color}` : "none",
                  }}
                />
                <span
                  className={`text-[11px] transition-colors duration-200 ${
                    isHidden
                      ? "text-muted-foreground/50 line-through"
                      : "text-muted-foreground group-hover:text-foreground"
                  }`}
                >
                  {s.name}
                </span>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* SVG Chart */}
      <svg
        width="100%"
        viewBox={`0 0 ${svgW} ${height}`}
        className="overflow-visible"
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          {/* Gradient definitions for each series' area fill */}
          {visibleSeries.map((s, i) => {
            const gid = uniqueGradId("lcadv-area", `${s.name}-${i}`);
            return (
              <linearGradient key={gid} id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.25} />
                <stop offset="80%" stopColor={s.color} stopOpacity={0.03} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            );
          })}
          {/* Glow filter for hovered data points */}
          <filter id="lcadv-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Y-axis grid lines and tick labels */}
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
                  className="stroke-muted/25"
                  strokeWidth={0.5}
                  strokeDasharray={tick === 0 ? "none" : "4 3"}
                />
                <text
                  x={padL - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-muted-foreground"
                  fontSize={8}
                  fontFamily="system-ui"
                >
                  {formatNumber(tick)}
                </text>
              </g>
            );
          })}

        {/* X-axis baseline */}
        <line
          x1={padL}
          y1={padT + innerH}
          x2={padL + innerW}
          y2={padT + innerH}
          className="stroke-muted/40"
          strokeWidth={1}
        />

        {/* X-axis labels */}
        {labels.map((label, i) => {
          if (i % labelStep !== 0 && i !== labels.length - 1) return null;
          const x = padL + (i / Math.max(labels.length - 1, 1)) * innerW;
          return (
            <text
              key={`xl-${i}`}
              x={x}
              y={height - 6}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize={8}
              fontFamily="system-ui"
            >
              {label}
            </text>
          );
        })}

        {/* Hover vertical guide line */}
        <AnimatePresence>
          {hoveredIdx !== null && showTooltip && (
            <motion.line
              x1={padL + (hoveredIdx / Math.max(labels.length - 1, 1)) * innerW}
              y1={padT}
              x2={padL + (hoveredIdx / Math.max(labels.length - 1, 1)) * innerW}
              y2={padT + innerH}
              className="stroke-muted-foreground/30"
              strokeWidth={1}
              strokeDasharray="4 4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            />
          )}
        </AnimatePresence>

        {/* Series: Area fill → Line → Data points */}
        {visibleSeries.map((s, si) => {
          const pts = allPoints[si];
          const { linePath, areaPath } = paths[si];
          const gid = uniqueGradId("lcadv-area", `${s.name}-${si}`);

          return (
            <g key={s.name}>
              {/* Area gradient fill */}
              {showAreaGradient && areaPath && (
                <motion.path
                  d={areaPath}
                  fill={`url(#${gid})`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.9, delay: si * 0.12 }}
                />
              )}

              {/* Line path with bezier smoothing */}
              <motion.path
                d={linePath}
                fill="none"
                stroke={s.color}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  duration: 1.2,
                  delay: si * 0.12,
                  ease: "easeInOut",
                }}
              />

              {/* Data points */}
              {showDataPoints &&
                pts.map((p, pi) => (
                  <g key={pi}>
                    {/* Invisible hit area for hover */}
                    <rect
                      x={p.x - 10}
                      y={padT}
                      width={20}
                      height={innerH}
                      fill="transparent"
                      onMouseEnter={() => setHoveredIdx(pi)}
                      className="cursor-pointer"
                    />
                    {/* Normal dot */}
                    <motion.circle
                      cx={p.x}
                      cy={p.y}
                      r={hoveredIdx === pi && showTooltip ? 4.5 : 2.5}
                      fill={s.color}
                      stroke={
                        hoveredIdx === pi && showTooltip
                          ? s.color
                          : "var(--chart-bg, hsl(var(--background)))"
                      }
                      strokeWidth={
                        hoveredIdx === pi && showTooltip ? 2 : 1.5
                      }
                      initial={{ r: 0, opacity: 0 }}
                      animate={{
                        r: hoveredIdx === pi && showTooltip ? 4.5 : 2.5,
                        opacity: 1,
                      }}
                      transition={{
                        duration: 0.2,
                        delay: 0.4 + si * 0.1 + pi * 0.025,
                      }}
                    />
                  </g>
                ))}
            </g>
          );
        })}

        {/* Hovered crosshair dots + tooltip */}
        <AnimatePresence>
          {hoveredIdx !== null && showTooltip && (
            <motion.g
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {/* Crosshair dots for each visible series */}
              {visibleSeries.map((s, si) => {
                const p = allPoints[si][hoveredIdx];
                if (!p) return null;
                return (
                  <motion.circle
                    key={`cross-${s.name}`}
                    cx={p.x}
                    cy={p.y}
                    r={5}
                    fill={s.color}
                    stroke="var(--chart-bg, hsl(var(--background)))"
                    strokeWidth={2}
                    filter="url(#lcadv-glow)"
                    initial={{ r: 2 }}
                    animate={{ r: 5 }}
                    transition={{ duration: 0.15 }}
                  />
                );
              })}

              {/* Tooltip box */}
              <g>
                <motion.rect
                  x={padL + (hoveredIdx / Math.max(labels.length - 1, 1)) * innerW}
                  y={padT - 4}
                  width={80}
                  height={14 + visibleSeries.length * 16}
                  rx={6}
                  fill="none"
                  stroke="currentColor"
                  className="stroke-border"
                  strokeWidth={0.5}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15 }}
                />
                <motion.rect
                  x={padL + (hoveredIdx / Math.max(labels.length - 1, 1)) * innerW}
                  y={padT - 4}
                  width={80}
                  height={14 + visibleSeries.length * 16}
                  rx={6}
                  className="fill-popover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.95 }}
                  transition={{ duration: 0.15 }}
                />
                {/* Date label */}
                <text
                  x={
                    padL +
                    (hoveredIdx / Math.max(labels.length - 1, 1)) * innerW +
                    6
                  }
                  y={padT + 9}
                  className="fill-muted-foreground"
                  fontSize={8}
                  fontFamily="system-ui"
                >
                  {labels[hoveredIdx]}
                </text>
                {/* Series values */}
                {visibleSeries.map((s, si) => {
                  const val = s.data[hoveredIdx] ?? 0;
                  const tx =
                    padL +
                    (hoveredIdx / Math.max(labels.length - 1, 1)) * innerW +
                    6;
                  const ty = padT + 9 + (si + 1) * 16;
                  return (
                    <g key={`tt-${s.name}`}>
                      <circle
                        cx={tx + 3}
                        cy={ty - 3}
                        r={3}
                        fill={s.color}
                      />
                      <text
                        x={tx + 10}
                        y={ty}
                        className="fill-foreground"
                        fontSize={9}
                        fontWeight="600"
                        fontFamily="system-ui"
                      >
                        {s.name}: {formatNumber(val)}
                      </text>
                    </g>
                  );
                })}
              </g>
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// KpiSparkline — Compact 7-day mini sparkline for KPI cards
// ═══════════════════════════════════════════════════════════════════════════════

interface KpiSparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  className?: string;
}

export const KpiSparkline = React.memo(function KpiSparkline({
  data,
  color = "#8b5cf6",
  width = 80,
  height = 32,
  className,
}: KpiSparklineProps) {
  const { points, linePath, areaPath, trendInfo, gradId } = useMemo(() => {
    const max = Math.max(...data, 1);
    const padX = 2;
    const padY = 4;
    const innerW = width - padX * 2;
    const innerH = height - padY * 2;
    const pts = data.map((v, i) => ({
      x: padX + (i / Math.max(data.length - 1, 1)) * innerW,
      y: padY + innerH - (v / max) * innerH,
    }));
    const line = generatePath(pts, true);
    const area =
      pts.length >= 2
        ? `${line} L${pts[pts.length - 1].x},${height} L${pts[0].x},${height} Z`
        : "";
    const last = data[data.length - 1];
    const prev = data.length > 1 ? data[data.length - 2] : last;
    const diff = prev === 0 ? 0 : Math.round(((last - prev) / Math.abs(prev)) * 100);
    const direction = diff > 0 ? "up" : diff < 0 ? "down" : "stable";
    return {
      points: pts,
      linePath: line,
      areaPath: area,
      trendInfo: { direction, pct: Math.abs(diff) },
      gradId: uniqueGradId("kpi-spark", color),
    };
  }, [data, width, height, color]);

  if (data.length < 2) {
    return (
      <span className={`inline-flex items-center ${className ?? ""}`}>
        <span className="text-[10px] text-muted-foreground">—</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 ${className ?? ""}`}>
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
        {/* End dot */}
        <motion.circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r={2.5}
          fill={color}
          initial={{ r: 0 }}
          animate={{ r: 2.5 }}
          transition={{ delay: 0.6, duration: 0.2 }}
        />
      </svg>
      {trendInfo.direction !== "stable" && (
        <span
          className={`text-[10px] font-semibold tabular-nums ${
            trendInfo.direction === "up" ? "text-emerald-500" : "text-rose-500"
          }`}
        >
          {trendInfo.direction === "up" ? "↑" : "↓"}
          {trendInfo.pct}%
        </span>
      )}
    </span>
  );
});
