"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Sparkles,
  RefreshCw,
  BarChart3,
  ArrowRight,
  Loader2,
  Zap,
  Flame,
} from "lucide-react";
import { MockDataBanner } from "@/components/ui/mock-data-banner";

// ─── Types ────────────────────────────────────────────────────────────────

interface AudienceTag {
  label: string;
  category: "age" | "behavior" | "interest" | "time" | "trait";
  confidence: number;
  description: string;
}

interface ActiveHourCell {
  day: string;
  period: string;
  hourStart: number;
  hourEnd: number;
  score: number;
  engagement: number;
}

interface AudienceInsightsData {
  range: string;
  days: number;
  generatedAt: string;
  demographics: {
    ageGroups: Array<{ label: string; percentage: number; confidence: number }>;
    genderSplit: Array<{ label: string; percentage: number }>;
    cityTier: Array<{ label: string; percentage: number }>;
  };
  activeHours: {
    heatmap: ActiveHourCell[];
    bestSlot: { day: string; period: string; score: number };
    bestTime: string;
  };
  contentPreferences: {
    topTypes: Array<{
      type: string;
      label: string;
      engagement: number;
      count: number;
      avgEngagement: number;
      percentage: number;
    }>;
    radar: Array<{ dimension: string; score: number }>;
  };
  engagementTrends: {
    daily: Array<{ date: string; label: string; engagementRate: number; totalEngagement: number; posts: number }>;
    weeklyAvg: Array<{ weekLabel: string; avgEngagementRate: number; totalInteractions: number }>;
    changePercentage: number;
    trend: "up" | "down" | "stable";
  };
  audienceTags: AudienceTag[];
  platformComparison: {
    wechat: {
      engagementRate: number;
      topContentType: string;
      topContentLabel: string;
      activePeriod: string;
      audienceTrait: string;
      avgInteractionPerPost: number;
    };
    xiaohongshu: {
      engagementRate: number;
      topContentType: string;
      topContentLabel: string;
      activePeriod: string;
      audienceTrait: string;
      avgInteractionPerPost: number;
    };
    differences: Array<{ dimension: string; wechat: string; xhs: string }>;
  };
  estimatedSize: {
    min: number;
    max: number;
    estimated: number;
    confidence: string;
    basis: string;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────

const DAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const PERIODS = ["早间", "上午", "中午", "下午", "傍晚", "晚间"];

const TAG_CATEGORY_COLORS: Record<string, string> = {
  age: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  behavior: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  interest: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  time: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  trait: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

const TAG_CATEGORY_ICONS: Record<string, typeof Users> = {
  age: Users,
  behavior: Zap,
  interest: Target,
  time: Clock,
  trait: Sparkles,
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + "w";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

function getHeatmapColor(score: number): string {
  // 0 → white/transparent, 100 → deep purple
  const opacity = Math.min(score / 100, 1);
  if (opacity < 0.01) return "rgba(139, 92, 246, 0.04)";
  return `rgba(139, 92, 246, ${Math.max(0.06, opacity * 0.85).toFixed(2)})`;
}

function getHeatmapTextColor(score: number): string {
  return score > 60 ? "rgba(255,255,255,0.95)" : "rgba(139, 92, 246, 0.7)";
}

// ─── Skeleton ─────────────────────────────────────────────────────────────

const InsightsSkeleton = React.memo(function InsightsSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-8 w-48 rounded-md" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
      <Skeleton className="h-48 rounded-lg" />
      <Skeleton className="h-64 rounded-lg" />
      <Skeleton className="h-32 rounded-lg" />
      <Skeleton className="h-48 rounded-lg" />
    </div>
  );
});

// ─── Sub-component: Audience Tags Card ────────────────────────────────────

const AudienceTagsCard = React.memo(function AudienceTagsCard({
  tags,
  estimatedSize,
}: {
  tags: AudienceTag[];
  estimatedSize: AudienceInsightsData["estimatedSize"];
}) {
  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-50/80 via-background to-amber-50/40 dark:from-violet-950/20 dark:via-background dark:to-amber-950/10" />
      <CardContent className="p-4 relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
              <Users className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="text-sm font-semibold">受众画像</h3>
          </div>
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">
            {estimatedSize.estimated > 0 ? `~${formatNum(estimatedSize.estimated)} 活跃受众` : "推算中"}
          </Badge>
        </div>

        {/* Main Tags */}
        <div className="space-y-2.5">
          {tags.map((tag, i) => {
            const IconComp = TAG_CATEGORY_ICONS[tag.category] || Sparkles;
            return (
              <motion.div
                key={tag.label}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
              >
                <div className="flex items-center gap-2.5 mb-1">
                  <div className={`h-5 w-5 rounded flex items-center justify-center flex-shrink-0 ${TAG_CATEGORY_COLORS[tag.category]}`}>
                    <IconComp className="h-2.5 w-2.5" />
                  </div>
                  <span className="text-xs font-semibold flex-1">{tag.label}</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {Math.round(tag.confidence * 100)}%
                  </span>
                </div>
                {/* Confidence bar */}
                <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden ml-[30px]">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${tag.confidence * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.2 + i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
                  />
                </div>
                {i === 0 && tag.description && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 ml-[30px]">{tag.description}</p>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Estimated Size */}
        {estimatedSize.estimated > 0 && (
          <motion.div
            className="mt-3 pt-3 border-t border-muted/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">受众规模估算</span>
              <span className="text-[10px] text-muted-foreground">{estimatedSize.confidence}置信度</span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-lg font-bold text-violet-600 dark:text-violet-400 tabular-nums">
                {formatNum(estimatedSize.min)}
              </span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className="text-lg font-bold text-violet-600 dark:text-violet-400 tabular-nums">
                {formatNum(estimatedSize.max)}
              </span>
            </div>
            <p className="text-[9px] text-muted-foreground mt-0.5 leading-relaxed">
              {estimatedSize.basis}
            </p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
});

// ─── Sub-component: Heatmap ───────────────────────────────────────────────

const ActiveHeatmap = React.memo(function ActiveHeatmap({
  heatmap,
  bestSlot,
  bestTime,
}: {
  heatmap: ActiveHourCell[];
  bestSlot: { day: string; period: string; score: number };
  bestTime: string;
}) {
  // Build 7×6 grid
  const grid = DAYS.map((day, dayIdx) =>
    PERIODS.map((period, periodIdx) => {
      const idx = dayIdx * 6 + periodIdx;
      return heatmap[idx] || { day, period, score: 0, hourStart: 0, hourEnd: 0, engagement: 0 };
    })
  );

  const cellW = 38;
  const cellH = 28;
  const labelW = 36;
  const headerH = 22;
  const svgW = labelW + 6 * cellW;
  const svgH = headerH + 7 * cellH;

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-sm font-semibold">活跃时段热力图</h3>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1 font-normal">
                  <Flame className="h-2.5 w-2.5 text-amber-500" />
                  {bestTime}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-[11px]">最佳发布时段，活跃度 {bestSlot.score}%</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <svg
          width="100%"
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="overflow-visible"
        >
          {/* Period headers */}
          {PERIODS.map((period, i) => (
            <text
              key={period}
              x={labelW + i * cellW + cellW / 2}
              y={14}
              className="fill-muted-foreground"
              fontSize={9}
              textAnchor="middle"
              fontWeight={500}
            >
              {period}
            </text>
          ))}

          {/* Day labels + cells */}
          {grid.map((row, dayIdx) =>
            row.map((cell, periodIdx) => {
              const x = labelW + periodIdx * cellW;
              const y = headerH + dayIdx * cellH;
              const isBest = cell.day === bestSlot.day && cell.period === bestSlot.period;
              const score = cell.score;

              return (
                <g key={`${dayIdx}-${periodIdx}`}>
                  {/* Day label (only first column) */}
                  {periodIdx === 0 && (
                    <text
                      x={labelW - 4}
                      y={y + cellH / 2 + 3}
                      className="fill-muted-foreground"
                      fontSize={9}
                      textAnchor="end"
                    >
                      {cell.day}
                    </text>
                  )}
                  {/* Cell */}
                  <motion.rect
                    x={x + 1}
                    y={y + 1}
                    width={cellW - 2}
                    height={cellH - 2}
                    rx={4}
                    fill={getHeatmapColor(score)}
                    stroke={isBest ? "rgba(245, 158, 11, 0.6)" : "transparent"}
                    strokeWidth={isBest ? 1.5 : 0}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: dayIdx * 0.04 + periodIdx * 0.04 }}
                  />
                  {/* Score text */}
                  <motion.text
                    x={x + cellW / 2}
                    y={y + cellH / 2 + 3}
                    className={getHeatmapTextColor(score)}
                    fontSize={8}
                    fontWeight={600}
                    textAnchor="middle"
                    fontFamily="monospace"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 + dayIdx * 0.04 + periodIdx * 0.04 }}
                  >
                    {score > 0 ? score : "-"}
                  </motion.text>
                  {/* Best slot glow */}
                  {isBest && (
                    <motion.rect
                      x={x}
                      y={y}
                      width={cellW}
                      height={cellH}
                      rx={5}
                      fill="none"
                      stroke="rgba(245, 158, 11, 0.4)"
                      strokeWidth={2}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: [0.4, 0.8, 0.4], scale: 1 }}
                      transition={{ duration: 2, repeat: Infinity, repeatType: "loop" }}
                    />
                  )}
                </g>
              );
            })
          )}
        </svg>

        {/* Legend */}
        <div className="flex items-center justify-between mt-2 px-1">
          <span className="text-[9px] text-muted-foreground">低活跃</span>
          <div className="flex items-center gap-0.5">
            {[0, 20, 40, 60, 80, 100].map((s) => (
              <div
                key={s}
                className="h-2 w-4 rounded-sm first:rounded-l-md last:rounded-r-md"
                style={{ backgroundColor: getHeatmapColor(s) }}
              />
            ))}
          </div>
          <span className="text-[9px] text-muted-foreground">高活跃</span>
        </div>
      </CardContent>
    </Card>
  );
});

// ─── Sub-component: Radar Chart ───────────────────────────────────────────

const ContentRadarChart = React.memo(function ContentRadarChart({
  radar,
}: {
  radar: Array<{ dimension: string; score: number }>;
}) {
  const size = 180;
  const center = size / 2;
  const maxR = 68;
  const levels = 4;

  // Compute polygon points
  const angleStep = (2 * Math.PI) / radar.length;
  const startAngle = -Math.PI / 2; // start from top

  const dataPoints = radar.map((item, i) => {
    const angle = startAngle + i * angleStep;
    const r = (item.score / 100) * maxR;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
      ...item,
    };
  });

  const dataPolygonStr = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  // Grid levels
  const gridLevels = Array.from({ length: levels }, (_, li) => {
    const r = (maxR / levels) * (li + 1);
    const pts = radar.map((_, i) => {
      const angle = startAngle + i * angleStep;
      return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
    }).join(" ");
    return { r, pts };
  });

  // Axis lines
  const axisLines = radar.map((_, i) => {
    const angle = startAngle + i * angleStep;
    return {
      x2: center + maxR * Math.cos(angle),
      y2: center + maxR * Math.sin(angle),
    };
  });

  // Label positions (outside the grid)
  const labels = radar.map((item, i) => {
    const angle = startAngle + i * angleStep;
    const labelR = maxR + 18;
    return {
      x: center + labelR * Math.cos(angle),
      y: center + labelR * Math.sin(angle),
      ...item,
    };
  });

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <Target className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-sm font-semibold">内容偏好雷达</h3>
        </div>

        <div className="flex justify-center">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="overflow-visible"
          >
            <defs>
              <radialGradient id="radar-fill-grad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#a855f7" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.05" />
              </radialGradient>
            </defs>

            {/* Grid levels */}
            {gridLevels.map((level) => (
              <polygon
                key={level.r}
                points={level.pts}
                fill="none"
                className="stroke-muted/30"
                strokeWidth={0.5}
              />
            ))}

            {/* Axis lines */}
            {axisLines.map((line, i) => (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={line.x2}
                y2={line.y2}
                className="stroke-muted/20"
                strokeWidth={0.5}
              />
            ))}

            {/* Data polygon (animated) */}
            <motion.polygon
              points={dataPolygonStr}
              fill="url(#radar-fill-grad)"
              stroke="#8b5cf6"
              strokeWidth={1.5}
              strokeLinejoin="round"
              initial={{ opacity: 0, scale: 0.2 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
              style={{ transformOrigin: `${center}px ${center}px` }}
            />

            {/* Data points */}
            {dataPoints.map((p, i) => (
              <motion.circle
                key={p.dimension}
                cx={p.x}
                cy={p.y}
                r={3}
                fill="#8b5cf6"
                stroke="white"
                strokeWidth={1.5}
                initial={{ r: 0, opacity: 0 }}
                animate={{ r: 3, opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.6 + i * 0.08 }}
              />
            ))}

            {/* Labels */}
            {labels.map((l, i) => (
              <motion.g
                key={l.dimension}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 + i * 0.06 }}
              >
                <text
                  x={l.x}
                  y={l.y - 3}
                  className="fill-foreground"
                  fontSize={9}
                  fontWeight={600}
                  textAnchor="middle"
                >
                  {l.dimension}
                </text>
                <text
                  x={l.x}
                  y={l.y + 8}
                  className="fill-muted-foreground"
                  fontSize={8}
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {l.score}%
                </text>
              </motion.g>
            ))}
          </svg>
        </div>

        {/* Top preference tags */}
        <div className="flex flex-wrap gap-1.5 mt-2 justify-center">
          {[...radar]
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map((item, i) => (
              <Badge
                key={item.dimension}
                variant="secondary"
                className="text-[10px] h-5 px-2 font-normal gap-1"
              >
                {i === 0 && <Flame className="h-2.5 w-2.5 text-amber-500" />}
                {item.dimension} {item.score}%
              </Badge>
            ))}
        </div>
      </CardContent>
    </Card>
  );
});

// ─── Sub-component: Engagement Sparkline ──────────────────────────────────

const EngagementSparkline = React.memo(function EngagementSparkline({
  trends,
}: {
  trends: AudienceInsightsData["engagementTrends"];
}) {
  const data = trends.daily;
  const svgW = 280;
  const svgH = 72;
  const padL = 2;
  const padR = 2;
  const padT = 8;
  const padB = 18;
  const innerW = svgW - padL - padR;
  const innerH = svgH - padT - padB;

  const maxEng = Math.max(...data.map((d) => d.totalEngagement), 1);
  const points = data.map((d, i) => ({
    x: padL + (i / Math.max(data.length - 1, 1)) * innerW,
    y: padT + innerH - (d.totalEngagement / maxEng) * innerH,
    label: d.label,
    value: d.totalEngagement,
  }));

  const lineStr = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaStr = `${padL},${svgH - padB} ${lineStr} ${padL + innerW},${svgH - padB}`;

  const TrendIcon = trends.trend === "up" ? TrendingUp : trends.trend === "down" ? TrendingDown : Minus;
  const trendColor = trends.trend === "up" ? "text-emerald-500" : trends.trend === "down" ? "text-rose-500" : "text-muted-foreground";
  const changePct = trends.changePercentage;

  // Average stats
  const avgEngagement = data.length > 0
    ? Math.round(data.reduce((s, d) => s + d.totalEngagement, 0) / data.length)
    : 0;
  const totalInteractions = data.reduce((s, d) => s + d.totalEngagement, 0);

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-cyan-100 dark:bg-cyan-900/40 flex items-center justify-center">
              <BarChart3 className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <h3 className="text-sm font-semibold">互动趋势</h3>
          </div>
          <div className="flex items-center gap-1">
            <TrendIcon className={`h-3.5 w-3.5 ${trendColor}`} />
            <span className={`text-xs font-semibold tabular-nums ${trendColor}`}>
              {changePct > 0 ? "+" : ""}{changePct}%
            </span>
          </div>
        </div>

        {/* Summary row */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-baseline gap-1">
            <span className="text-base font-bold tabular-nums">{formatNum(totalInteractions)}</span>
            <span className="text-[10px] text-muted-foreground">总互动</span>
          </div>
          <div className="h-3 w-px bg-muted" />
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-semibold tabular-nums">{formatNum(avgEngagement)}</span>
            <span className="text-[10px] text-muted-foreground">日均</span>
          </div>
        </div>

        {/* Sparkline SVG */}
        <svg
          width="100%"
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="overflow-visible"
        >
          <defs>
            <linearGradient id="spark-area-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.01" />
            </linearGradient>
            <linearGradient id="spark-line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>

          {/* X-axis */}
          <line
            x1={padL}
            y1={svgH - padB}
            x2={padL + innerW}
            y2={svgH - padB}
            className="stroke-muted/20"
            strokeWidth={0.5}
          />

          {/* Area fill */}
          <motion.polygon
            points={areaStr}
            fill="url(#spark-area-fill)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          />

          {/* Line */}
          <motion.polyline
            points={lineStr}
            fill="none"
            stroke="url(#spark-line-grad)"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: 0.2, ease: "easeInOut" }}
          />

          {/* Data points & labels */}
          {points.map((p, i) => {
            const showLabel = data.length <= 14 || i % Math.ceil(data.length / 7) === 0 || i === data.length - 1;
            return (
              <g key={i}>
                {showLabel && (
                  <text
                    x={p.x}
                    y={svgH - 4}
                    className="fill-muted-foreground"
                    fontSize={7}
                    textAnchor="middle"
                  >
                    {p.label}
                  </text>
                )}
                <motion.circle
                  cx={p.x}
                  cy={p.y}
                  r={p.value > 0 ? 2.5 : 1.5}
                  fill={p.value > 0 ? "#06b6d4" : "currentColor"}
                  className={p.value > 0 ? "" : "fill-muted-foreground/30"}
                  initial={{ r: 0 }}
                  animate={{ r: p.value > 0 ? 2.5 : 1.5 }}
                  transition={{ duration: 0.2, delay: 0.5 + i * 0.03 }}
                />
              </g>
            );
          })}
        </svg>

        {/* Weekly breakdown */}
        {trends.weeklyAvg.length > 1 && (
          <div className="flex items-center gap-3 mt-2 px-1">
            {trends.weeklyAvg.map((w, i) => (
              <div key={w.weekLabel} className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">{w.weekLabel}</span>
                <span className="text-[10px] font-semibold tabular-nums">{formatNum(w.totalInteractions)}</span>
                {i < trends.weeklyAvg.length - 1 && (
                  <ArrowRight className="h-2.5 w-2.5 text-muted-foreground/40" />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

// ─── Sub-component: Platform Comparison ───────────────────────────────────

const PlatformComparisonCard = React.memo(function PlatformComparisonCard({
  comparison,
}: {
  comparison: AudienceInsightsData["platformComparison"];
}) {
  const { wechat: wc, xiaohongshu: xhs, differences } = comparison;

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-7 w-7 rounded-lg bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
          </div>
          <h3 className="text-sm font-semibold">平台对比</h3>
        </div>

        {/* Platform cards */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {/* WeChat */}
          <div className="rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/10 p-2.5 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-semibold">朋友圈</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-[9px] text-muted-foreground">互动率</span>
                <span className="text-[10px] font-semibold tabular-nums">{wc.engagementRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[9px] text-muted-foreground">篇均互动</span>
                <span className="text-[10px] font-semibold tabular-nums">{wc.avgInteractionPerPost}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[9px] text-muted-foreground">高互动类型</span>
                <span className="text-[10px] font-semibold">{wc.topContentLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[9px] text-muted-foreground">受众特征</span>
                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">{wc.audienceTrait}</span>
              </div>
            </div>
          </div>

          {/* XHS */}
          <div className="rounded-lg border bg-rose-50/50 dark:bg-rose-950/10 p-2.5 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span className="text-[11px] font-semibold">小红书</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-[9px] text-muted-foreground">互动率</span>
                <span className="text-[10px] font-semibold tabular-nums">{xhs.engagementRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[9px] text-muted-foreground">篇均互动</span>
                <span className="text-[10px] font-semibold tabular-nums">{xhs.avgInteractionPerPost}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[9px] text-muted-foreground">高互动类型</span>
                <span className="text-[10px] font-semibold">{xhs.topContentLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[9px] text-muted-foreground">受众特征</span>
                <span className="text-[10px] font-medium text-rose-600 dark:text-rose-400">{xhs.audienceTrait}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Differences table */}
        <div className="rounded-md border bg-muted/20 overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_1fr] text-[10px] font-semibold text-muted-foreground px-2.5 py-1.5 bg-muted/30">
            <span>对比维度</span>
            <span className="text-center">朋友圈</span>
            <span className="text-center">小红书</span>
          </div>
          {differences.map((diff, i) => (
            <motion.div
              key={diff.dimension}
              className="grid grid-cols-[1fr_1fr_1fr] text-[10px] px-2.5 py-1.5 border-t border-muted/20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.06 }}
            >
              <span className="text-muted-foreground font-medium">{diff.dimension}</span>
              <span className="text-center text-emerald-600 dark:text-emerald-400">{diff.wechat}</span>
              <span className="text-center text-rose-600 dark:text-rose-400">{diff.xhs}</span>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

// ─── Sub-component: Demographics Card ─────────────────────────────────────

const DemographicsCard = React.memo(function DemographicsCard({
  demographics,
}: {
  demographics: AudienceInsightsData["demographics"];
}) {
  const svgW = 120;
  const svgH = 60;
  const barH = 10;
  const barGap = 6;
  const padR = 36;
  const maxPct = 60;

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-7 w-7 rounded-lg bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center">
            <Users className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
          </div>
          <h3 className="text-sm font-semibold">人口画像</h3>
        </div>

        {/* Age groups */}
        <div className="space-y-2 mb-3">
          <span className="text-[10px] text-muted-foreground font-medium">年龄分布</span>
          <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} className="overflow-visible">
            {demographics.ageGroups.slice(0, 4).map((item, i) => {
              const y = i * (barH + barGap);
              const w = Math.max((item.percentage / maxPct) * (svgW - padR), 2);
              return (
                <g key={item.label}>
                  <text x={svgW - 2} y={y + barH / 2 + 3} className="fill-muted-foreground" fontSize={8} textAnchor="end">
                    {item.label}
                  </text>
                  <motion.rect
                    x={0} y={y}
                    width={0} height={barH}
                    rx={3}
                    fill={i === 0 ? "#8b5cf6" : i === 1 ? "#a855f7" : "#c4b5fd"}
                    initial={{ width: 0 }}
                    animate={{ width: w }}
                    transition={{ duration: 0.6, delay: 0.2 + i * 0.1 }}
                  />
                  <motion.text
                    x={w + 4} y={y + barH / 2 + 3}
                    className="fill-foreground font-medium"
                    fontSize={8}
                    fontFamily="monospace"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                  >
                    {item.percentage}%
                  </motion.text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Gender & City */}
        <div className="grid grid-cols-2 gap-3">
          {/* Gender */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-muted-foreground font-medium">性别比例</span>
            {demographics.genderSplit.map((g) => (
              <div key={g.label} className="flex items-center justify-between">
                <span className="text-[10px]">{g.label}</span>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-12 bg-muted/50 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-pink-400 to-violet-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${g.percentage}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold tabular-nums w-6 text-right">{g.percentage}%</span>
                </div>
              </div>
            ))}
          </div>

          {/* City tier */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-muted-foreground font-medium">城市分布</span>
            {demographics.cityTier.slice(0, 3).map((c) => (
              <div key={c.label} className="flex items-center justify-between">
                <span className="text-[10px]">{c.label}</span>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-12 bg-muted/50 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${c.percentage * 2}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold tabular-nums w-6 text-right">{c.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// ─── Main Panel ───────────────────────────────────────────────────────────

type RangeOption = "7d" | "30d" | "90d";
const RANGE_OPTIONS: Array<{ value: RangeOption; label: string }> = [
  { value: "7d", label: "近7天" },
  { value: "30d", label: "近30天" },
  { value: "90d", label: "近90天" },
];

export function AudienceInsightsPanel() {
  const [data, setData] = useState<AudienceInsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<RangeOption>("30d");
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (r: RangeOption) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/audience-insights?range=${r}`);
      if (!res.ok) throw new Error("请求失败");
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError("获取受众洞察失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(range);
  }, [range, fetchData]);

  if (loading) return <InsightsSkeleton />;
  if (error || !data) {
    return (
      <div className="p-4 flex flex-col items-center justify-center gap-3 min-h-[200px]">
        <p className="text-sm text-muted-foreground">{error || "暂无数据"}</p>
        <Button variant="outline" size="sm" onClick={() => fetchData(range)}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          重试
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <MockDataBanner />
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
            <Users className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold">受众洞察</h2>
            <p className="text-[10px] text-muted-foreground">
              基于内容互动数据推算粉丝画像特征
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {RANGE_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={range === opt.value ? "default" : "ghost"}
              size="sm"
              className="h-6 px-2 text-[10px]"
              onClick={() => setRange(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => fetchData(range)}
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-[11px]">刷新数据</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </motion.div>

      {/* Grid Layout: Tags + Demographics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AudienceTagsCard tags={data.audienceTags} estimatedSize={data.estimatedSize} />
        <DemographicsCard demographics={data.demographics} />
      </div>

      {/* Heatmap */}
      <ActiveHeatmap
        heatmap={data.activeHours.heatmap}
        bestSlot={data.activeHours.bestSlot}
        bestTime={data.activeHours.bestTime}
      />

      {/* Radar + Sparkline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ContentRadarChart radar={data.contentPreferences.radar} />
        <EngagementSparkline trends={data.engagementTrends} />
      </div>

      {/* Platform Comparison */}
      <PlatformComparisonCard comparison={data.platformComparison} />
    </div>
  );
}
