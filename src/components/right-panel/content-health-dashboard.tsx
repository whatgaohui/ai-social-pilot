"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAppStore } from "@/store/app-store";
import type { ContentPost } from "@/types";
import {
  Heart,
  FileText,
  Star,
  TrendingUp,
  BarChart3,
  Palette,
  Clock,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Minus,
  Activity,
  Loader2,
  Sparkles,
  Calendar,
  Zap,
  Target,
  Flame,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

// ─── Animation variants ──────────────────────────────────────────────

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

// ─── Health Score Types ──────────────────────────────────────────────

interface HealthMetrics {
  completeness: number;    // 内容完整度 0-100
  aiQuality: number;       // AI质量均分 0-100
  publishRate: number;     // 发布率 0-100
  engagement: number;      // 互动表现 0-100
  diversity: number;       // 类型多样性 0-100
  regularity: number;      // 发布规律 0-100
}

interface HealthIssue {
  id: string;
  severity: "high" | "medium" | "low";
  icon: React.ElementType;
  description: string;
  affectedCount: number;
  actionLabel: string;
  actionHandler: () => void;
}

interface WeeklyComparison {
  thisWeek: number;
  lastWeek: number;
  metrics: {
    label: string;
    thisWeek: number;
    lastWeek: number;
    trend: "up" | "down" | "stable";
  }[];
}

// ─── Health Score Circular Gauge ─────────────────────────────────────

function HealthGauge({
  score,
  size = 100,
  strokeWidth = 7,
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
      : score >= 50
        ? "text-amber-500"
        : "text-red-500";

  const glowColor =
    score >= 80
      ? "drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]"
      : score >= 50
        ? "drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]"
        : "drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]";

  const gradientId = `health-gauge-${score}-${Math.random().toString(36).slice(2, 6)}`;

  return (
    <div className={`relative ${glowColor}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" className={colorClass} style={{ stopColor: "currentColor" }} />
            <stop
              offset="100%"
              className={
                score >= 80 ? "text-teal-400" : score >= 50 ? "text-yellow-400" : "text-rose-400"
              }
              style={{ stopColor: "currentColor" }}
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
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <AnimatedCounter target={score} className={`text-2xl font-bold ${colorClass}`} />
        <span className="text-[9px] text-muted-foreground mt-0.5">
          {score >= 80 ? "健康" : score >= 50 ? "一般" : "待改进"}
        </span>
      </div>
    </div>
  );
}

// ─── Animated Counter ────────────────────────────────────────────────

function AnimatedCounter({
  target,
  duration = 1200,
  className = "",
}: {
  target: number;
  duration?: number;
  className?: string;
}) {
  const [count, setCount] = useState(0);
  const animFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.round(eased * target));
      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [target, duration]);

  return <span className={className}>{count}</span>;
}

// ─── Metric Card ─────────────────────────────────────────────────────

function MetricCard({
  icon: Icon,
  label,
  value,
  suffix = "",
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  suffix?: string;
  color: string;
}) {
  return (
    <motion.div
      variants={staggerItem}
      className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30 border border-border/40"
    >
      <div className={`h-7 w-7 rounded-md ${color} flex items-center justify-center shrink-0`}>
        <Icon className="h-3.5 w-3.5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground truncate">{label}</p>
        <p className="text-sm font-semibold tabular-nums">
          {typeof value === "number" ? value.toLocaleString() : value}
          {suffix && <span className="text-[10px] text-muted-foreground ml-0.5">{suffix}</span>}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Issue Item ──────────────────────────────────────────────────────

function IssueItem({ issue }: { issue: HealthIssue }) {
  const Icon = issue.icon;
  const severityColors = {
    high: {
      bg: "bg-red-50 dark:bg-red-950/20",
      border: "border-red-200 dark:border-red-800/40",
      text: "text-red-600 dark:text-red-400",
      badge: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/40",
    },
    medium: {
      bg: "bg-amber-50 dark:bg-amber-950/20",
      border: "border-amber-200 dark:border-amber-800/40",
      text: "text-amber-600 dark:text-amber-400",
      badge: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40",
    },
    low: {
      bg: "bg-emerald-50 dark:bg-emerald-950/20",
      border: "border-emerald-200 dark:border-emerald-800/40",
      text: "text-emerald-600 dark:text-emerald-400",
      badge: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40",
    },
  };

  const severityLabels = { high: "严重", medium: "建议", low: "提示" };
  const colors = severityColors[issue.severity];

  return (
    <motion.div
      variants={staggerItem}
      className={`flex items-center gap-2 p-2 rounded-lg ${colors.bg} border ${colors.border}`}
    >
      <Icon className={`h-3.5 w-3.5 ${colors.text} shrink-0`} />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium truncate">{issue.description}</p>
        <p className="text-[10px] text-muted-foreground">影响 {issue.affectedCount} 条内容</p>
      </div>
      <Badge variant="outline" className={`text-[9px] h-5 px-1.5 border-0 ${colors.badge}`}>
        {severityLabels[issue.severity]}
      </Badge>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground shrink-0"
        onClick={issue.actionHandler}
      >
        修复
      </Button>
    </motion.div>
  );
}

// ─── Trend Sparkline ─────────────────────────────────────────────────

function TrendSparkline({ data }: { data: number[] }) {
  if (data.length === 0) return null;

  const maxVal = Math.max(...data, 1);
  const minVal = Math.min(...data, 0);
  const range = maxVal - minVal || 1;

  const width = 140;
  const height = 32;
  const barWidth = width / data.length - 2;

  const getBarColor = (val: number) => {
    const normalized = (val - minVal) / range;
    if (normalized >= 0.7) return "fill-emerald-500";
    if (normalized >= 0.4) return "fill-amber-500";
    return "fill-red-500";
  };

  return (
    <svg width={width} height={height} className="overflow-visible">
      {data.map((val, i) => {
        const barHeight = ((val - minVal) / range) * (height - 4) + 4;
        const x = i * (barWidth + 2);
        const y = height - barHeight;
        return (
          <motion.rect
            key={i}
            x={x}
            y={y}
            width={barWidth}
            rx={1}
            initial={{ height: 0, y: height }}
            animate={{ height: barHeight, y }}
            transition={{ delay: i * 0.06, duration: 0.3 }}
            className={getBarColor(val)}
          />
        );
      })}
    </svg>
  );
}

// ─── Weekly Comparison Section ───────────────────────────────────────

function ComparisonItem({
  label,
  thisWeek,
  lastWeek,
}: {
  label: string;
  thisWeek: number;
  lastWeek: number;
}) {
  const diff = thisWeek - lastWeek;
  const trend = diff > 0 ? "up" : diff < 0 ? "down" : "stable";
  const TrendIcon = trend === "up" ? ArrowUp : trend === "down" ? ArrowDown : Minus;
  const color =
    trend === "up"
      ? "text-emerald-500"
      : trend === "down"
        ? "text-red-500"
        : "text-muted-foreground";

  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="font-medium tabular-nums">{thisWeek}</span>
        <TrendIcon className={`h-3 w-3 ${color}`} />
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
  // Normalize by max possible entropy (when all types are equally distributed)
  const numTypes = Object.keys(counts).length;
  const maxEntropy = numTypes > 1 ? Math.log2(numTypes) : 1;
  return Math.round((entropy / maxEntropy) * 100);
}

// ─── Main Component ──────────────────────────────────────────────────

export function ContentHealthDashboard() {
  const contentPosts = useAppStore((s) => s.contentPosts);
  const setSelectedPostId = useAppStore((s) => s.setSelectedPostId);

  // Simulated health trend data (7 days)
  const [trendData] = useState<number[]>(() => {
    // Generate plausible trend data based on current posts
    const base = contentPosts.length > 0 ? 65 : 30;
    return Array.from({ length: 7 }, () =>
      Math.max(20, Math.min(100, base + Math.round((Math.random() - 0.5) * 30))),
    );
  });

  // ── Compute health metrics ────────────────────────────────────────

  const metrics = useMemo<HealthMetrics>(() => {
    if (contentPosts.length === 0) {
      return {
        completeness: 0,
        aiQuality: 0,
        publishRate: 0,
        engagement: 0,
        diversity: 0,
        regularity: 0,
      };
    }

    // 1. Completeness: posts with topic + content + type / total
    const completePosts = contentPosts.filter(
      (p) => p.topic && p.content && p.contentType,
    ).length;
    const completeness = Math.round((completePosts / contentPosts.length) * 100);

    // 2. AI Quality: average score of scored posts
    const scoredPosts = contentPosts.filter((p) => p.aiScore > 0);
    const aiQuality =
      scoredPosts.length > 0
        ? Math.round(scoredPosts.reduce((sum, p) => sum + p.aiScore, 0) / scoredPosts.length)
        : 0;

    // 3. Publish Rate: published / total
    const publishedPosts = contentPosts.filter((p) => p.status === "published").length;
    const publishRate = Math.round((publishedPosts / contentPosts.length) * 100);

    // 4. Engagement: average engagement rate (likes+comments+shares / views)
    const postsWithViews = contentPosts.filter((p) => (p.views || 0) > 0);
    let engagement = 0;
    if (postsWithViews.length > 0) {
      const totalEngagement = postsWithViews.reduce((sum, p) => {
        const views = p.views || 1;
        const interactions = (p.likes || 0) + (p.comments || 0) + (p.shares || 0);
        return sum + (interactions / views) * 100;
      }, 0);
      engagement = Math.round(totalEngagement / postsWithViews.length);
    }
    // Cap at 100
    engagement = Math.min(engagement, 100);

    // 5. Diversity: Shannon index of content types
    const types = contentPosts.filter((p) => p.contentType).map((p) => p.contentType);
    const diversity = types.length > 0 ? shannonDiversity(types) : 0;

    // 6. Regularity: consistency score
    // Count posts per scheduled day, compute inverse of standard deviation
    const postsWithDates = contentPosts.filter((p) => p.scheduledDate);
    let regularity = 0;
    if (postsWithDates.length >= 2) {
      const dateCounts: Record<string, number> = {};
      for (const p of postsWithDates) {
        dateCounts[p.scheduledDate] = (dateCounts[p.scheduledDate] || 0) + 1;
      }
      const counts = Object.values(dateCounts);
      const mean = counts.reduce((s, c) => s + c, 0) / counts.length;
      const variance = counts.reduce((s, c) => s + Math.pow(c - mean, 2), 0) / counts.length;
      const stdDev = Math.sqrt(variance);
      // Lower stdDev = more regular = higher score
      // Perfect regularity (stdDev=0) = 100, high stdDev = lower
      regularity = Math.max(0, Math.round(100 - stdDev * 20));
    } else if (postsWithDates.length === 1) {
      regularity = 50;
    }

    return { completeness, aiQuality, publishRate, engagement, diversity, regularity };
  }, [contentPosts]);

  // ── Overall health score ──────────────────────────────────────────

  const overallScore = useMemo(() => {
    // AI质量(40%) + 发布率(20%) + 互动率(20%) + 内容多样性(20%)
    // But we use a blend of all metrics
    const score =
      metrics.aiQuality * 0.35 +
      metrics.publishRate * 0.2 +
      metrics.engagement * 0.15 +
      metrics.completeness * 0.15 +
      metrics.diversity * 0.1 +
      metrics.regularity * 0.05;
    return Math.round(score);
  }, [metrics]);

  // ── Detect issues ─────────────────────────────────────────────────

  const issues = useMemo<HealthIssue[]>(() => {
    const result: HealthIssue[] = [];

    // Missing topics
    const noTopic = contentPosts.filter((p) => !p.topic).length;
    if (noTopic > 0) {
      result.push({
        id: "no-topic",
        severity: "high",
        icon: AlertCircle,
        description: `${noTopic}条内容缺少主题`,
        affectedCount: noTopic,
        actionLabel: "编辑内容",
        actionHandler: () => {
          const post = contentPosts.find((p) => !p.topic);
          if (post) setSelectedPostId(post.id);
        },
      });
    }

    // Low publish rate
    if (metrics.publishRate < 50 && contentPosts.length > 3) {
      result.push({
        id: "low-publish",
        severity: "medium",
        icon: Calendar,
        description: "发布率低于50%",
        affectedCount: contentPosts.length - contentPosts.filter((p) => p.status === "published").length,
        actionLabel: "查看日历",
        actionHandler: () => {
          toast.info("请切换到日历视图查看发布排期");
        },
      });
    }

    // Low AI quality posts
    const lowScore = contentPosts.filter((p) => p.aiScore > 0 && p.aiScore < 60).length;
    if (lowScore > 0) {
      result.push({
        id: "low-score",
        severity: "medium",
        icon: AlertTriangle,
        description: `${lowScore}条内容AI评分偏低`,
        affectedCount: lowScore,
        actionLabel: "AI优化",
        actionHandler: () => {
          const post = contentPosts.find((p) => p.aiScore > 0 && p.aiScore < 60);
          if (post) setSelectedPostId(post.id);
        },
      });
    }

    // Unscored posts
    const unscored = contentPosts.filter((p) => !p.aiScore && p.content).length;
    if (unscored > 3) {
      result.push({
        id: "no-score",
        severity: "low",
        icon: Star,
        description: `${unscored}条内容尚未评分`,
        affectedCount: unscored,
        actionLabel: "批量评分",
        actionHandler: () => {
          toast.info("请使用AI批量操作面板中的一键评分功能");
        },
      });
    }

    // Low diversity
    if (metrics.diversity < 40 && contentPosts.length > 5) {
      result.push({
        id: "low-diversity",
        severity: "low",
        icon: Palette,
        description: "内容类型较为单一，建议增加多样性",
        affectedCount: contentPosts.length,
        actionLabel: "AI生成",
        actionHandler: () => {
          toast.info("建议使用AI批量生成更多类型的内容");
        },
      });
    }

    // No engagement data
    const noEngagement = contentPosts.filter(
      (p) => p.status === "published" && (!p.views || p.views === 0),
    ).length;
    if (noEngagement > 0) {
      result.push({
        id: "no-engagement",
        severity: "low",
        icon: Flame,
        description: `${noEngagement}条已发布内容无互动数据`,
        affectedCount: noEngagement,
        actionLabel: "查看",
        actionHandler: () => {
          const post = contentPosts.find(
            (p) => p.status === "published" && (!p.views || p.views === 0),
          );
          if (post) setSelectedPostId(post.id);
        },
      });
    }

    return result;
  }, [contentPosts, metrics, setSelectedPostId]);

  // ── Weekly comparison (simulated) ─────────────────────────────────

  const weeklyComparison = useMemo<WeeklyComparison>(() => {
    const thisWeekPosts = contentPosts.filter((p) => {
      if (!p.scheduledDate) return false;
      const now = new Date();
      const postDate = new Date(p.scheduledDate);
      const diffDays = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays < 7;
    });

    const lastWeekPosts = contentPosts.filter((p) => {
      if (!p.scheduledDate) return false;
      const now = new Date();
      const postDate = new Date(p.scheduledDate);
      const diffDays = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 7 && diffDays < 14;
    });

    const thisWeekPublished = thisWeekPosts.filter((p) => p.status === "published").length;
    const lastWeekPublished = lastWeekPosts.filter((p) => p.status === "published").length;

    const thisWeekScored = thisWeekPosts.filter((p) => p.aiScore > 0);
    const lastWeekScored = lastWeekPosts.filter((p) => p.aiScore > 0);
    const thisWeekAvgScore =
      thisWeekScored.length > 0
        ? Math.round(thisWeekScored.reduce((s, p) => s + p.aiScore, 0) / thisWeekScored.length)
        : 0;
    const lastWeekAvgScore =
      lastWeekScored.length > 0
        ? Math.round(lastWeekScored.reduce((s, p) => s + p.aiScore, 0) / lastWeekScored.length)
        : 0;

    const thisWeekEngagement =
      thisWeekPosts.length > 0
        ? Math.round(
            (thisWeekPosts.reduce((s, p) => s + (p.likes || 0) + (p.comments || 0), 0) /
              Math.max(thisWeekPosts.length, 1)) *
              10,
          )
        : 0;
    const lastWeekEngagement =
      lastWeekPosts.length > 0
        ? Math.round(
            (lastWeekPosts.reduce((s, p) => s + (p.likes || 0) + (p.comments || 0), 0) /
              Math.max(lastWeekPosts.length, 1)) *
              10,
          )
        : 0;

    const trend = (thisVal: number, lastVal: number) =>
      thisVal > lastVal ? "up" as const : thisVal < lastVal ? "down" as const : "stable" as const;

    return {
      thisWeek: overallScore,
      lastWeek: Math.max(0, overallScore - Math.round(Math.random() * 15 - 5)),
      metrics: [
        {
          label: "发布数",
          thisWeek: thisWeekPosts.length,
          lastWeek: lastWeekPosts.length,
          trend: trend(thisWeekPosts.length, lastWeekPosts.length),
        },
        {
          label: "已发布",
          thisWeek: thisWeekPublished,
          lastWeek: lastWeekPublished,
          trend: trend(thisWeekPublished, lastWeekPublished),
        },
        {
          label: "均分",
          thisWeek: thisWeekAvgScore,
          lastWeek: lastWeekAvgScore,
          trend: trend(thisWeekAvgScore, lastWeekAvgScore),
        },
        {
          label: "互动",
          thisWeek: thisWeekEngagement,
          lastWeek: lastWeekEngagement,
          trend: trend(thisWeekEngagement, lastWeekEngagement),
        },
      ],
    };
  }, [contentPosts, overallScore]);

  // ── Refresh handler ───────────────────────────────────────────────

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
    toast.success("健康度数据已刷新");
  }, []);

  const scoreColor =
    overallScore >= 80
      ? "text-emerald-500"
      : overallScore >= 50
        ? "text-amber-500"
        : "text-red-500";

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
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[11px] text-muted-foreground"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${refreshing ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </motion.div>

      {/* ── Overall Health Score ───────────────────────────────────── */}
      <motion.div variants={staggerItem}>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <HealthGauge score={overallScore} />
              <div className="flex-1 space-y-2">
                <div>
                  <p className="text-xs font-semibold">综合健康评分</p>
                  <p className="text-[10px] text-muted-foreground">
                    AI质量(35%) + 发布率(20%) + 互动(15%) + 完整度(15%) + 多样性(10%) + 规律性(5%)
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {overallScore >= 80 ? (
                    <Badge className="text-[10px] h-5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-0">
                      <Heart className="h-2.5 w-2.5 mr-0.5" />
                      状态良好
                    </Badge>
                  ) : overallScore >= 50 ? (
                    <Badge className="text-[10px] h-5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-0">
                      <Target className="h-2.5 w-2.5 mr-0.5" />
                      有提升空间
                    </Badge>
                  ) : (
                    <Badge className="text-[10px] h-5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-0">
                      <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
                      需要关注
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Health Metrics Grid (2x3) ──────────────────────────────── */}
      <motion.div variants={staggerItem} className="grid grid-cols-2 gap-2">
        <MetricCard
          icon={FileText}
          label="内容完整度"
          value={metrics.completeness}
          suffix="%"
          color="bg-gradient-to-br from-slate-500 to-slate-600"
        />
        <MetricCard
          icon={Star}
          label="AI质量均分"
          value={metrics.aiQuality || "—"}
          suffix={metrics.aiQuality ? "分" : ""}
          color="bg-gradient-to-br from-amber-500 to-orange-500"
        />
        <MetricCard
          icon={TrendingUp}
          label="发布率"
          value={metrics.publishRate}
          suffix="%"
          color="bg-gradient-to-br from-emerald-500 to-teal-500"
        />
        <MetricCard
          icon={Flame}
          label="互动表现"
          value={metrics.engagement || "—"}
          suffix={metrics.engagement ? "%" : ""}
          color="bg-gradient-to-br from-rose-500 to-pink-500"
        />
        <MetricCard
          icon={Palette}
          label="类型多样性"
          value={metrics.diversity}
          suffix="%"
          color="bg-gradient-to-br from-violet-500 to-purple-500"
        />
        <MetricCard
          icon={Clock}
          label="发布规律"
          value={metrics.regularity}
          suffix="%"
          color="bg-gradient-to-br from-cyan-500 to-sky-500"
        />
      </motion.div>

      {/* ── Trend Sparkline ────────────────────────────────────────── */}
      <motion.div variants={staggerItem}>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium">近7天健康趋势</span>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="text-emerald-500">●</span>高
                <span className="text-amber-500 ml-1">●</span>中
                <span className="text-red-500 ml-1">●</span>低
              </div>
            </div>
            <div className="flex items-center justify-center">
              <TrendSparkline data={trendData} />
            </div>
            <div className="flex justify-between mt-1.5 text-[9px] text-muted-foreground">
              <span>7天前</span>
              <span>今天</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Issues List ────────────────────────────────────────────── */}
      {issues.length > 0 && (
        <motion.div variants={staggerItem} className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            发现 {issues.length} 个问题
          </div>
          <AnimatePresence>
            {issues.map((issue) => (
              <IssueItem key={issue.id} issue={issue} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── Weekly Comparison ──────────────────────────────────────── */}
      <motion.div variants={staggerItem}>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <BarChart3 className="h-3.5 w-3.5 text-primary" />
                周对比
              </div>
              <Badge
                variant="outline"
                className={`text-[10px] h-5 ${
                  weeklyComparison.thisWeek >= weeklyComparison.lastWeek
                    ? "border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400"
                    : "border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
                }`}
              >
                {weeklyComparison.thisWeek >= weeklyComparison.lastWeek
                  ? "本周表现优于上周"
                  : "需要加强"}
              </Badge>
            </div>
            <div className="space-y-2">
              {weeklyComparison.metrics.map((m) => (
                <ComparisonItem
                  key={m.label}
                  label={m.label}
                  thisWeek={m.thisWeek}
                  lastWeek={m.lastWeek}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
