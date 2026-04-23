"use client";

import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EngagementFunnelProps {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  favorites?: number;
  platform?: string;
}

interface FunnelLevel {
  key: string;
  label: string;
  count: number;
  gradientFrom: string;
  gradientTo: string;
  glowColor: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LEVEL_DEFS: Record<
  string,
  { label: string; gradientFrom: string; gradientTo: string; glowColor: string }
> = {
  views: {
    label: "浏览",
    gradientFrom: "#8b5cf6", // violet-500
    gradientTo: "#a855f7",   // purple-500
    glowColor: "rgba(139,92,246,0.25)",
  },
  likes: {
    label: "点赞",
    gradientFrom: "#f43f5e", // rose-500
    gradientTo: "#ec4899",   // pink-500
    glowColor: "rgba(244,63,94,0.25)",
  },
  comments: {
    label: "评论",
    gradientFrom: "#f59e0b", // amber-500
    gradientTo: "#f97316",   // orange-500
    glowColor: "rgba(245,158,11,0.25)",
  },
  shares: {
    label: "转发",
    gradientFrom: "#10b981", // emerald-500
    gradientTo: "#14b8a6",   // teal-500
    glowColor: "rgba(16,185,129,0.25)",
  },
  favorites: {
    label: "收藏",
    gradientFrom: "#0ea5e9", // sky-500
    gradientTo: "#06b6d4",   // cyan-500
    glowColor: "rgba(14,165,233,0.25)",
  },
};

// SVG layout constants
const SVG_W = 400;
const SVG_H = 300;
const CENTER_X = 150;
const MAX_HW = 125; // max half-width of funnel
const MIN_HW = 14;  // min half-width (ensures visibility)
const GAP = 4;       // gap between trapezoid levels
const PAD_Y = 12;    // vertical padding

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 100_000) return (n / 10_000).toFixed(0) + "w";
  if (n >= 10_000) return (n / 10_000).toFixed(1) + "w";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <BarChart3 className="h-6 w-6 opacity-40" />
      </div>
      <p className="text-sm font-medium">暂无互动数据</p>
      <p className="text-xs mt-1 opacity-60">发布内容后将展示互动漏斗</p>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function EngagementFunnel({
  views,
  likes,
  comments,
  shares,
  favorites,
  platform,
}: EngagementFunnelProps) {
  const isXHS = platform === "xiaohongshu";
  const allZero =
    views === 0 &&
    likes === 0 &&
    comments === 0 &&
    shares === 0 &&
    (favorites ?? 0) === 0;

  // Build ordered level array
  const levels: FunnelLevel[] = React.useMemo(() => {
    const base: FunnelLevel[] = [
      { key: "views", label: LEVEL_DEFS.views.label, count: views, ...LEVEL_DEFS.views },
      { key: "likes", label: LEVEL_DEFS.likes.label, count: likes, ...LEVEL_DEFS.likes },
      { key: "comments", label: LEVEL_DEFS.comments.label, count: comments, ...LEVEL_DEFS.comments },
    ];

    if (isXHS && favorites !== undefined) {
      base.push({
        key: "favorites",
        label: LEVEL_DEFS.favorites.label,
        count: favorites,
        ...LEVEL_DEFS.favorites,
      });
    }

    base.push({
      key: "shares",
      label: LEVEL_DEFS.shares.label,
      count: shares,
      ...LEVEL_DEFS.shares,
    });

    return base;
  }, [views, likes, comments, shares, favorites, isXHS]);

  // ── Empty state ──────────────────────────────────────────────────────────

  if (allZero) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 px-4 pt-3">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <div className="h-5 w-5 rounded-md bg-gradient-to-br from-violet-500 to-rose-500 flex items-center justify-center">
              <BarChart3 className="h-3 w-3 text-white" />
            </div>
            互动漏斗
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <EmptyState />
        </CardContent>
      </Card>
    );
  }

  // ── Funnel calculations ─────────────────────────────────────────────────

  const n = levels.length;
  const levelH = (SVG_H - PAD_Y * 2 - GAP * (n - 1)) / n;
  const maxCount = Math.max(...levels.map((l) => l.count), 1);

  // Half-widths proportional to each level's count
  const hw = levels.map((l) => {
    const ratio = l.count / maxCount;
    return MIN_HW + ratio * (MAX_HW - MIN_HW);
  });

  // Label x position: to the right of the widest point
  const labelX = CENTER_X + MAX_HW + 18;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2 px-4 pt-3">
        <CardTitle className="text-xs font-semibold flex items-center gap-2">
          <div className="h-5 w-5 rounded-md bg-gradient-to-br from-violet-500 to-rose-500 flex items-center justify-center">
            <BarChart3 className="h-3 w-3 text-white" />
          </div>
          互动漏斗
          {platform && (
            <span className="text-[10px] font-normal text-muted-foreground ml-auto">
              {isXHS ? "小红书" : "朋友圈"}
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="px-4 pb-3">
        <motion.svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full h-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          role="img"
          aria-label="互动漏斗图"
        >
          {/* ── Gradient defs ────────────────────────────────────────────── */}
          <defs>
            {levels.map((lvl, i) => (
              <React.Fragment key={lvl.key}>
                <linearGradient
                  id={`fg-${i}`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop
                    offset="0%"
                    stopColor={lvl.gradientFrom}
                    stopOpacity="0.95"
                  />
                  <stop
                    offset="100%"
                    stopColor={lvl.gradientTo}
                    stopOpacity="0.55"
                  />
                </linearGradient>

                {/* Subtle glow behind each trapezoid */}
                <filter id={`fg-glow-${i}`} x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
                </filter>
              </React.Fragment>
            ))}
          </defs>

          {/* ── Funnel levels ────────────────────────────────────────────── */}
          {levels.map((lvl, i) => {
            const yTop = PAD_Y + i * (levelH + GAP);
            const yBot = yTop + levelH;
            const yMid = (yTop + yBot) / 2;

            const topHW = hw[i];
            // Bottom edge connects seamlessly to the next level's top edge
            const botHW =
              i < n - 1
                ? hw[i + 1]
                : Math.max(hw[i] * 0.75, MIN_HW);

            // Trapezoid polygon points
            const points = [
              `${CENTER_X - topHW},${yTop}`,
              `${CENTER_X + topHW},${yTop}`,
              `${CENTER_X + botHW},${yBot}`,
              `${CENTER_X - botHW},${yBot}`,
            ].join(" ");

            // Conversion rate from previous level
            const prevCount = i > 0 ? levels[i - 1].count : 0;
            const convRate =
              prevCount > 0 ? (lvl.count / prevCount) * 100 : 0;

            return (
              <motion.g
                key={lvl.key}
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{
                  duration: 0.8,
                  delay: i * 0.1,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                style={{
                  transformOrigin: `${CENTER_X}px ${yMid}px`,
                }}
              >
                {/* Glow behind shape */}
                <polygon
                  points={points}
                  fill={lvl.glowColor}
                  filter={`url(#fg-glow-${i})`}
                  opacity="0.5"
                />

                {/* Trapezoid body */}
                <polygon
                  points={points}
                  fill={`url(#fg-${i})`}
                />

                {/* Top highlight line for depth */}
                <line
                  x1={CENTER_X - topHW + 2}
                  y1={yTop + 1}
                  x2={CENTER_X + topHW - 2}
                  y2={yTop + 1}
                  stroke="white"
                  strokeOpacity="0.2"
                  strokeWidth="1"
                  strokeLinecap="round"
                />

                {/* ── Count inside trapezoid ─────────────────────────────── */}
                <text
                  x={CENTER_X}
                  y={yMid}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="white"
                  fontSize="12"
                  fontWeight="700"
                  stroke="rgba(0,0,0,0.12)"
                  strokeWidth="2.5"
                  paintOrder="stroke"
                  letterSpacing="0.02em"
                >
                  {fmtNum(lvl.count)}
                </text>

                {/* ── Label (right side) ─────────────────────────────────── */}
                <text
                  x={labelX}
                  y={yMid - 7}
                  textAnchor="start"
                  dominantBaseline="central"
                  fill="currentColor"
                  className="text-foreground"
                  fontSize="11.5"
                  fontWeight="600"
                >
                  {lvl.label}
                </text>

                {/* ── Sub-line: conversion rate or "total" ──────────────── */}
                <text
                  x={labelX}
                  y={yMid + 9}
                  textAnchor="start"
                  dominantBaseline="central"
                  fill="currentColor"
                  className="text-muted-foreground"
                  fontSize="10"
                >
                  {i === 0
                    ? "总浏览量"
                    : prevCount > 0
                      ? `↓ ${convRate.toFixed(1)}% 转化`
                      : "—"}
                </text>
              </motion.g>
            );
          })}

          {/* ── Decorative center dashed axis ──────────────────────────── */}
          <motion.line
            x1={CENTER_X}
            y1={PAD_Y + n * (levelH + GAP) - GAP + 8}
            x2={CENTER_X}
            y2={SVG_H - 4}
            stroke="currentColor"
            className="text-muted-foreground/20"
            strokeWidth="1"
            strokeDasharray="3 3"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: n * 0.1 + 0.3 }}
          />
        </motion.svg>
      </CardContent>
    </Card>
  );
}
