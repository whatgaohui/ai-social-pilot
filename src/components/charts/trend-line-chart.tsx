"use client";

import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  formatNumber,
  generatePath,
  niceScale,
  clamp,
  uniqueGradId,
} from "@/lib/chart-utils";

// ═══════════════════════════════════════════════════════════════════════════════
// Types — matches the task-specified interface
// ═══════════════════════════════════════════════════════════════════════════════

interface TrendSeries {
  name: string;
  data: number[];
  color: string;
}

interface TrendChartData {
  dates: string[];
  series: TrendSeries[];
}

export interface TrendLineChartProps {
  data: TrendChartData;
  width?: number;
  height?: number;
  showLegend?: boolean;
  showTooltip?: boolean;
  animated?: boolean;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TrendLineChart — Production-grade multi-series SVG line chart
// ═══════════════════════════════════════════════════════════════════════════════
//
// Features:
// - Pure SVG, zero external chart libs
// - Cubic bezier (Catmull-Rom) smooth curves via generatePath
// - Multi data series support
// - Auto-scaling Y-axis with nice ticks
// - Hover tooltip with crosshair (state + re-render)
// - Gradient area fill beneath each line
// - Data point dots with framer-motion entrance animation
// - Clickable legend to toggle series visibility
// - Dark mode compatible via CSS variables
// - No variable mutations: all SVG path data pre-computed with reduce/map

export const TrendLineChart = React.memo(function TrendLineChart({
  data,
  width = 600,
  height = 300,
  showLegend = true,
  showTooltip = true,
  animated = true,
  className,
}: TrendLineChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  const { dates, series } = data;

  // ── Visible series (filter hidden ones) ──
  const visibleSeries = useMemo(
    () => series.filter((s) => !hiddenSeries.has(s.name)),
    [series, hiddenSeries]
  );

  // ── SVG layout constants ──
  const svgW = width;
  const padL = 48;
  const padR = 20;
  const padT = 16;
  const padB = 32;
  const innerW = svgW - padL - padR;
  const innerH = height - padT - padB;

  // ── Y-axis auto-scaling ──
  const maxVal = useMemo(() => {
    const flat = visibleSeries.flatMap((s) => s.data);
    return Math.max(...flat, 1);
  }, [visibleSeries]);

  const ticks = useMemo(() => niceScale(maxVal, 5), [maxVal]);

  // ── X-axis label step to avoid crowding ──
  const labelStep = useMemo(
    () => Math.max(1, Math.floor(dates.length / 8)),
    [dates.length]
  );

  // ── Precompute all chart points + paths for each visible series ──
  const seriesPaths = useMemo(() => {
    return visibleSeries.map((s) => {
      // Map data points to SVG coordinates
      const points = s.data.map((v, i) => ({
        x: padL + (i / Math.max(dates.length - 1, 1)) * innerW,
        y: padT + innerH - (v / maxVal) * innerH,
        value: v,
      }));

      // Cubic bezier smooth path
      const linePath = generatePath(points, true);

      // Area path: line + bottom edge closure
      const areaPath =
        points.length >= 2
          ? `${linePath} L${points[points.length - 1].x},${padT + innerH} L${points[0].x},${padT + innerH} Z`
          : "";

      // Unique gradient ID for this series
      const gradId = uniqueGradId("tlc-area", s.name);

      return { series: s, points, linePath, areaPath, gradId };
    });
  }, [visibleSeries, dates.length, innerW, innerH, padL, padT, maxVal]);

  // ── Toggle series visibility via legend click ──
  const toggleSeries = useCallback(
    (name: string) => {
      setHiddenSeries((prev) => {
        const next = new Set(prev);
        if (next.has(name)) {
          next.delete(name);
        } else {
          // Prevent hiding ALL series
          if (series.length - next.size > 0) {
            next.add(name);
          }
        }
        return next;
      });
    },
    [series.length]
  );

  const handleMouseLeave = useCallback(() => setHoveredIdx(null), []);

  // ── Compute tooltip position & dimensions ──
  const tooltipLayout = useMemo(() => {
    if (hoveredIdx === null || !showTooltip) return null;
    const x =
      padL + (hoveredIdx / Math.max(dates.length - 1, 1)) * innerW;
    const boxW = 120;
    const boxH = 16 + visibleSeries.length * 20;
    // Flip tooltip to left side if it would overflow right
    const flipRight = x + boxW + 8 > svgW;
    const tx = flipRight ? x - boxW - 12 : x + 12;
    return { x, tx, boxW, boxH, dateLabel: dates[hoveredIdx] };
  }, [hoveredIdx, showTooltip, dates, visibleSeries.length, innerW, svgW, padL]);

  // ── Early return for empty data ──
  if (dates.length === 0 || series.length === 0) {
    return (
      <div className={className ?? ""}>
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          暂无趋势数据
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className ?? ""}`}>
      {/* ── Legend (clickable to toggle series) ── */}
      {showLegend && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-3 px-1">
          {series.map((s) => {
            const isHidden = hiddenSeries.has(s.name);
            return (
              <motion.button
                key={s.name}
                type="button"
                className="flex items-center gap-2 cursor-pointer group"
                onClick={() => toggleSeries(s.name)}
                whileTap={{ scale: 0.95 }}
                aria-label={`${isHidden ? "显示" : "隐藏"} ${s.name} 系列`}
              >
                <span
                  className="h-3 w-3 rounded-full flex-shrink-0 transition-all duration-200"
                  style={{
                    backgroundColor: isHidden ? undefined : s.color,
                    opacity: isHidden ? 0.3 : 1,
                    border: isHidden
                      ? `2px dashed ${s.color}`
                      : "2px solid transparent",
                  }}
                />
                <span
                  className={`text-xs transition-colors duration-200 ${
                    isHidden
                      ? "text-muted-foreground/40 line-through"
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

      {/* ── SVG Chart ── */}
      <svg
        width="100%"
        viewBox={`0 0 ${svgW} ${height}`}
        className="overflow-visible"
        onMouseLeave={handleMouseLeave}
        role="img"
        aria-label="趋势折线图"
      >
        <defs>
          {/* Gradient definitions for area fill */}
          {visibleSeries.map((s, i) => {
            const gid = uniqueGradId("tlc-area", `${s.name}-${i}`);
            return (
              <linearGradient key={gid} id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
                <stop offset="60%" stopColor={s.color} stopOpacity={0.08} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            );
          })}
          {/* Glow filter for hovered data points */}
          <filter id="tlc-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Y-axis grid lines + tick labels ── */}
        {ticks.map((tick) => {
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
                x={padL - 8}
                y={y + 3.5}
                textAnchor="end"
                className="fill-muted-foreground/70"
                fontSize={10}
                fontFamily="system-ui"
              >
                {formatNumber(tick)}
              </text>
            </g>
          );
        })}

        {/* ── X-axis baseline ── */}
        <line
          x1={padL}
          y1={padT + innerH}
          x2={padL + innerW}
          y2={padT + innerH}
          className="stroke-muted/40"
          strokeWidth={1}
        />

        {/* ── X-axis date labels ── */}
        {dates.map((label, i) => {
          if (i % labelStep !== 0 && i !== dates.length - 1) return null;
          const x = padL + (i / Math.max(dates.length - 1, 1)) * innerW;
          return (
            <text
              key={`xl-${i}`}
              x={x}
              y={height - 8}
              textAnchor="middle"
              className="fill-muted-foreground/70"
              fontSize={10}
              fontFamily="system-ui"
            >
              {label}
            </text>
          );
        })}

        {/* ── Hover vertical guide line ── */}
        <AnimatePresence>
          {hoveredIdx !== null && showTooltip && (
            <motion.line
              x1={
                padL +
                (hoveredIdx / Math.max(dates.length - 1, 1)) * innerW
              }
              y1={padT}
              x2={
                padL +
                (hoveredIdx / Math.max(dates.length - 1, 1)) * innerW
              }
              y2={padT + innerH}
              className="stroke-muted-foreground/25"
              strokeWidth={1}
              strokeDasharray="4 4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
            />
          )}
        </AnimatePresence>

        {/* ── Series: Area → Line → Data Points ── */}
        {seriesPaths.map(({ series: s, points, linePath, areaPath, gradId }, si) => (
          <g key={s.name}>
            {/* Area gradient fill */}
            {areaPath && (
              <motion.path
                d={areaPath}
                fill={`url(#${gradId})`}
                initial={animated ? { opacity: 0 } : { opacity: 1 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.9, delay: si * 0.12 }}
              />
            )}

            {/* Line path (bezier cubic) */}
            <motion.path
              d={linePath}
              fill="none"
              stroke={s.color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={animated ? { pathLength: 0 } : { pathLength: 1 }}
              animate={{ pathLength: 1 }}
              transition={{
                duration: 1.2,
                delay: si * 0.12,
                ease: "easeInOut",
              }}
            />

            {/* Data point dots */}
            {points.map((p, pi) => (
              <g key={`pt-${pi}`}>
                {/* Invisible hit area for hover */}
                <rect
                  x={p.x - innerW / dates.length / 2}
                  y={padT}
                  width={innerW / dates.length}
                  height={innerH}
                  fill="transparent"
                  onMouseEnter={() => setHoveredIdx(pi)}
                  className="cursor-pointer"
                />
                {/* Visible dot */}
                <motion.circle
                  cx={p.x}
                  cy={p.y}
                  r={hoveredIdx === pi && showTooltip ? 5 : 3}
                  fill={s.color}
                  stroke={
                    hoveredIdx === pi && showTooltip
                      ? s.color
                      : "var(--background, #fff)"
                  }
                  strokeWidth={
                    hoveredIdx === pi && showTooltip ? 2 : 1.5
                  }
                  initial={animated ? { r: 0, opacity: 0 } : { r: 3, opacity: 1 }}
                  animate={{
                    r: hoveredIdx === pi && showTooltip ? 5 : 3,
                    opacity: 1,
                  }}
                  transition={{
                    duration: 0.2,
                    delay: animated
                      ? 0.4 + si * 0.1 + pi * 0.02
                      : 0,
                  }}
                />
              </g>
            ))}
          </g>
        ))}

        {/* ── Tooltip (hover crosshair + info box) ── */}
        <AnimatePresence>
          {hoveredIdx !== null && showTooltip && tooltipLayout && (
            <motion.g
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {/* Crosshair dots on each visible series */}
              {seriesPaths.map(({ series: s, points }) => {
                const p = points[hoveredIdx];
                if (!p) return null;
                return (
                  <motion.circle
                    key={`cross-${s.name}`}
                    cx={p.x}
                    cy={p.y}
                    r={6}
                    fill={s.color}
                    stroke="var(--background, #fff)"
                    strokeWidth={2.5}
                    filter="url(#tlc-glow)"
                    initial={{ r: 3 }}
                    animate={{ r: 6 }}
                    transition={{ duration: 0.15 }}
                  />
                );
              })}

              {/* Tooltip background box */}
              <motion.rect
                x={tooltipLayout.tx}
                y={padT - 2}
                width={tooltipLayout.boxW}
                height={tooltipLayout.boxH}
                rx={8}
                className="fill-popover stroke-border/60"
                strokeWidth={0.5}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.15 }}
                style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.08))" }}
              />

              {/* Date label in tooltip */}
              <text
                x={tooltipLayout.tx + 10}
                y={padT + 13}
                className="fill-muted-foreground"
                fontSize={10}
                fontWeight="500"
                fontFamily="system-ui"
              >
                {tooltipLayout.dateLabel}
              </text>

              {/* Series values in tooltip */}
              {visibleSeries.map((s, si) => {
                const val = s.data[hoveredIdx] ?? 0;
                const rowX = tooltipLayout.tx + 10;
                const rowY = padT + 13 + (si + 1) * 20;
                return (
                  <g key={`tt-${s.name}`}>
                    <circle
                      cx={rowX + 4}
                      cy={rowY - 3}
                      r={4}
                      fill={s.color}
                    />
                    <text
                      x={rowX + 14}
                      y={rowY}
                      className="fill-foreground"
                      fontSize={11}
                      fontWeight="600"
                      fontFamily="system-ui"
                    >
                      {s.name}
                    </text>
                    <text
                      x={tooltipLayout.tx + tooltipLayout.boxW - 10}
                      y={rowY}
                      textAnchor="end"
                      className="fill-foreground"
                      fontSize={11}
                      fontWeight="700"
                      fontFamily="system-ui"
                    >
                      {formatNumber(val)}
                    </text>
                  </g>
                );
              })}
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
    </div>
  );
});

export type { TrendSeries, TrendChartData };
