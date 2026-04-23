"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";
import type { ContentPost } from "@/types";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  Heart,
  MessageSquare,
  BarChart3,
  Layers,
  FileText,
  Star,
  ArrowUp,
} from "lucide-react";

// ─── Animation Variants ──────────────────────────────────────────────

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const },
  },
};

// ─── Health Dimension Types ──────────────────────────────────────────

interface HealthDimension {
  id: string;
  label: string;
  score: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  description: string;
}

// ─── Health Score Gauge (SVG) ────────────────────────────────────────

function HealthGauge({
  score,
  size = 80,
  strokeWidth = 6,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const colorClass =
    score >= 80
      ? "text-emerald-500"
      : score >= 60
        ? "text-amber-500"
        : "text-red-500";

  const gradientId = `health-card-gauge-${score}`;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop
              offset="0%"
              style={{ stopColor: score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444" }}
            />
            <stop
              offset="100%"
              style={{ stopColor: score >= 80 ? "#14b8a6" : score >= 60 ? "#eab308" : "#f43f5e" }}
            />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          stroke={`url(#${gradientId})`}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className={`text-xl font-bold ${colorClass} tabular-nums`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {score}
        </motion.span>
      </div>
    </div>
  );
}

// ─── Trend Indicator ─────────────────────────────────────────────────

function TrendIndicator({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up") {
    return (
      <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
        <ArrowUp className="h-3 w-3" />
        <span className="text-[9px] font-medium">上升</span>
      </span>
    );
  }
  if (trend === "down") {
    return (
      <span className="flex items-center gap-0.5 text-red-500">
        <TrendingDown className="h-3 w-3" />
        <span className="text-[9px] font-medium">下降</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-muted-foreground">
      <Minus className="h-3 w-3" />
      <span className="text-[9px] font-medium">平稳</span>
    </span>
  );
}

// ─── Dimension Bar ───────────────────────────────────────────────────

function DimensionBar({
  dimension,
}: {
  dimension: HealthDimension;
}) {
  const Icon = dimension.icon;
  const barColor =
    dimension.score >= 80
      ? "bg-emerald-500"
      : dimension.score >= 60
        ? "bg-amber-500"
        : "bg-red-500";

  const textColor =
    dimension.score >= 80
      ? "text-emerald-600 dark:text-emerald-400"
      : dimension.score >= 60
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className={`h-3 w-3 ${textColor}`} />
          <span className="text-[10px] font-medium">{dimension.label}</span>
        </div>
        <span className={`text-[10px] font-semibold tabular-nums ${textColor}`}>
          {dimension.score}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${dimension.score}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        />
      </div>
    </div>
  );
}

// ─── Shannon Diversity Index ─────────────────────────────────────────

function shannonDiversity(types: string[]): number {
  if (types.length === 0) return 0;
  const counts: Record<string, number> = {};
  for (const t of types) {
    counts[t] = (counts[t] || 0) + 1;
  }
  const total = types.length;
  let entropy = 0;
  for (const count of Object.values(counts)) {
    const p = count / total;
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }
  const numTypes = Object.keys(counts).length;
  const maxEntropy = numTypes > 1 ? Math.log2(numTypes) : 1;
  return Math.round((entropy / maxEntropy) * 100);
}

// ─── Main Component ──────────────────────────────────────────────────

export function ContentHealthCard({ onClick }: { onClick?: () => void }) {
  const contentPosts = useAppStore((s) => s.contentPosts);
  const [expanded, setExpanded] = useState(false);

  // ── Compute health dimensions ──
  const dimensions = useMemo<HealthDimension[]>(() => {
    if (contentPosts.length === 0) {
      return [
        { id: "completeness", label: "内容完整性", score: 0, icon: FileText, color: "text-violet-500", bgColor: "bg-violet-500", description: "有主题、内容和类型" },
        { id: "engagement", label: "互动数据", score: 0, icon: MessageSquare, color: "text-rose-500", bgColor: "bg-rose-500", description: "有浏览/点赞/评论" },
        { id: "publish", label: "发布状态", score: 0, icon: BarChart3, color: "text-emerald-500", bgColor: "bg-emerald-500", description: "已发布 vs 已排期" },
        { id: "ai-score", label: "AI评分覆盖", score: 0, icon: Star, color: "text-amber-500", bgColor: "bg-amber-500", description: "已评分内容占比" },
        { id: "platform", label: "平台分布", score: 0, icon: Layers, color: "text-cyan-500", bgColor: "bg-cyan-500", description: "跨平台内容分布" },
      ];
    }

    // 1. 内容完整性
    const completePosts = contentPosts.filter(
      (p) => p.topic && p.content && p.contentType,
    ).length;
    const completeness = Math.round((completePosts / contentPosts.length) * 100);

    // 2. 互动数据
    const postsWithEngagement = contentPosts.filter(
      (p) => (p.views || 0) > 0 || (p.likes || 0) > 0,
    ).length;
    const engagement = Math.round((postsWithEngagement / contentPosts.length) * 100);

    // 3. 发布状态
    const published = contentPosts.filter(
      (p) => p.status === "published" || p.status === "scheduled",
    ).length;
    const publishStatus = Math.round((published / contentPosts.length) * 100);

    // 4. AI评分覆盖
    const scoredPosts = contentPosts.filter((p) => p.aiScore > 0).length;
    const aiScoreCoverage = Math.round((scoredPosts / contentPosts.length) * 100);

    // 5. 平台分布
    const platforms = contentPosts
      .filter((p) => p.platform)
      .map((p) => p.platform);
    const platformDiversity =
      platforms.length > 0 ? shannonDiversity(platforms) : 0;

    return [
      { id: "completeness", label: "内容完整性", score: completeness, icon: FileText, color: "text-violet-500", bgColor: "bg-violet-500", description: "有主题、内容和类型" },
      { id: "engagement", label: "互动数据", score: engagement, icon: MessageSquare, color: "text-rose-500", bgColor: "bg-rose-500", description: "有浏览/点赞/评论" },
      { id: "publish", label: "发布状态", score: publishStatus, icon: BarChart3, color: "text-emerald-500", bgColor: "bg-emerald-500", description: "已发布 vs 已排期" },
      { id: "ai-score", label: "AI评分覆盖", score: aiScoreCoverage, icon: Star, color: "text-amber-500", bgColor: "bg-amber-500", description: "已评分内容占比" },
      { id: "platform", label: "平台分布", score: platformDiversity, icon: Layers, color: "text-cyan-500", bgColor: "bg-cyan-500", description: "跨平台内容分布" },
    ];
  }, [contentPosts]);

  // ── Overall score ──
  const overallScore = useMemo(() => {
    if (contentPosts.length === 0) return 0;
    const weights = [0.25, 0.2, 0.2, 0.2, 0.15];
    const weighted = dimensions.reduce(
      (sum, dim, i) => sum + dim.score * weights[i],
      0,
    );
    return Math.round(weighted);
  }, [dimensions, contentPosts.length]);

  // ── Trend (simulated from current state) ──
  const trend = useMemo<"up" | "down" | "stable">(() => {
    if (overallScore >= 75) return "up";
    if (overallScore >= 50) return "stable";
    return "down";
  }, [overallScore]);

  // ── Score color helpers ──
  const scoreColorClass =
    overallScore >= 80
      ? "text-emerald-500"
      : overallScore >= 60
        ? "text-amber-500"
        : "text-red-500";

  const statusBadge = overallScore >= 80
    ? { label: "健康", bg: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-0" }
    : overallScore >= 60
      ? { label: "一般", bg: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-0" }
      : { label: "待改进", bg: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-0" };

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-3"
    >
      {/* Header */}
      <motion.div variants={staggerItem} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold">内容健康度</span>
        </div>
        <div className="flex items-center gap-2">
          <TrendIndicator trend={trend} />
          <Badge variant="outline" className={`text-[9px] h-5 border-0 ${statusBadge.bg}`}>
            {statusBadge.label}
          </Badge>
        </div>
      </motion.div>

      {/* ── Main Score Card ────────────────────────────────────────── */}
      <motion.div variants={staggerItem}>
        <div
          className="rounded-xl border border-border/60 bg-card/80 p-4 cursor-pointer hover:shadow-sm transition-shadow"
          onClick={() => {
            setExpanded(!expanded);
            onClick?.();
          }}
        >
          <div className="flex items-center gap-4">
            {/* Gauge */}
            <HealthGauge score={overallScore} />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold mb-1">综合健康评分</p>
              <p className="text-[10px] text-muted-foreground mb-2">
                基于内容完整性、互动数据、发布状态等5个维度综合评估
              </p>

              {/* Quick dimension preview */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {dimensions.slice(0, 3).map((dim) => {
                  const dotColor =
                    dim.score >= 80
                      ? "bg-emerald-500"
                      : dim.score >= 60
                        ? "bg-amber-500"
                        : "bg-red-500";
                  return (
                    <div key={dim.id} className="flex items-center gap-0.5">
                      <div className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
                      <span className="text-[9px] text-muted-foreground">
                        {dim.label}
                      </span>
                    </div>
                  );
                })}
                {dimensions.length > 3 && (
                  <span className="text-[9px] text-muted-foreground">
                    +{dimensions.length - 3}
                  </span>
                )}
              </div>
            </div>

            {/* Expand indicator */}
            <motion.div
              animate={{ rotate: expanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* ── Expanded Dimensions ────────────────────────────────────── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as const }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-border/60 bg-card/80 p-4 space-y-3">
              <p className="text-[11px] font-semibold">健康维度详情</p>
              <div className="space-y-2.5">
                {dimensions.map((dim) => (
                  <DimensionBar key={dim.id} dimension={dim} />
                ))}
              </div>

              {/* Dimension legend */}
              <div className="flex items-center justify-center gap-3 pt-1 text-[9px] text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="h-1.5 w-3 rounded-full bg-emerald-500" />
                  优秀 (≥80)
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-1.5 w-3 rounded-full bg-amber-500" />
                  良好 (≥60)
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-1.5 w-3 rounded-full bg-red-500" />
                  待改进 (&lt;60)
                </div>
              </div>

              {/* Drill-down button */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-[10px] text-violet-600 dark:text-violet-400 hover:text-violet-700"
                onClick={() => onClick?.()}
              >
                <BarChart3 className="h-3 w-3 mr-1" />
                查看完整健康度仪表板
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
