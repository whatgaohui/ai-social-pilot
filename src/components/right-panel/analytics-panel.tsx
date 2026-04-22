"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_COLORS,
  ContentType,
  XHS_CONTENT_TYPE_LABELS,
  XHS_CONTENT_TYPE_COLORS,
  XHSContentType,
  POST_STATUS_LABELS,
  PostStatus,
} from "@/types";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  TrendingUp,
  Heart,
  MessageSquare,
  Share2,
  Eye,
  Sparkles,
  Loader2,
  Trophy,
  Target,
  Zap,
  Star,
  Download,
  FileJson,
  FileText,
  Medal,
} from "lucide-react";
import { toast } from "sonner";
import { TimeSuggestions } from "@/components/right-panel/time-suggestions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalyticsData {
  totalPosts: number;
  publishedCount: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalViews: number;
  avgScore: number;
  typeDistribution: Record<string, number>;
  statusDistribution: Record<string, number>;
  topPosts: Array<{
    id: string;
    topic: string;
    contentType: string;
    likes: number;
    comments: number;
    shares: number;
  }>;
}

// ─── SVG Color Mappings ──────────────────────────────────────────────────────

const CHART_COLORS_WECAT: Record<string, string> = {
  text: "#6366f1",
  image: "#10b981",
  video: "#f43f5e",
  mixed: "#f59e0b",
  story: "#a855f7",
  insight: "#06b6d4",
  interaction: "#f97316",
};

const CHART_COLORS_XHS: Record<string, string> = {
  seeding: "#ec4899",
  review: "#f59e0b",
  tutorial: "#0ea5e9",
  drygoods: "#8b5cf6",
  vlog: "#14b8a6",
  daily: "#f97316",
  recommend: "#f43f5e",
  collection: "#6366f1",
};

const STATUS_CHART_COLORS: Record<string, string> = {
  planned: "#94a3b8",
  generated: "#6366f1",
  optimized: "#10b981",
  published: "#8b5cf6",
};

const BAR_GRADIENTS = [
  { from: "#f59e0b", to: "#f97316" },
  { from: "#94a3b8", to: "#64748b" },
  { from: "#d97706", to: "#ea580c" },
  { from: "#10b981", to: "#14b8a6" },
  { from: "#a855f7", to: "#8b5cf6" },
];

// ─── Helper: Get SVG color for content type ──────────────────────────────────

function getChartColor(type: string, isXHS: boolean): string {
  if (isXHS) return CHART_COLORS_XHS[type] || "#8b5cf6";
  return CHART_COLORS_WECAT[type] || "#8b5cf6";
}

// ─── Helper: Format number ───────────────────────────────────────────────────

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + "w";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

// ─── Donut Chart Component ───────────────────────────────────────────────────

function DonutChart({
  data,
  isXHS,
}: {
  data: Record<string, number>;
  isXHS: boolean;
}) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  const radius = 52;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  const center = radius + strokeWidth;

  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const hasMultipleSegments = entries.length > 1;
  const gapSize = hasMultipleSegments ? 3 : 0;

  // Precompute all segment geometry using reduce (no mutation)
  const segments = entries.reduce<Array<{ type: string; count: number; actualLen: number; offset: number }>>(
    (acc, [type, count]) => {
      const pct = count / total;
      const segLen = pct * circumference;
      const actualLen = Math.max(0, segLen - gapSize);
      const accumulated = acc.length > 0
        ? acc[acc.length - 1].offset + acc[acc.length - 1].actualLen + gapSize
        : 0;
      acc.push({ type, count, actualLen, offset: -accumulated });
      return acc;
    },
    []
  );

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="relative flex-shrink-0">
        <svg
          width={center * 2}
          height={center * 2}
          viewBox={`0 0 ${center * 2} ${center * 2}`}
          className="transform -rotate-90"
        >
          <defs>
            {entries.map(([type]) => (
              <linearGradient
                key={type}
                id={`donut-grad-${type}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop
                  offset="0%"
                  stopColor={getChartColor(type, isXHS)}
                  stopOpacity="1"
                />
                <stop
                  offset="100%"
                  stopColor={getChartColor(type, isXHS)}
                  stopOpacity="0.7"
                />
              </linearGradient>
            ))}
          </defs>
          {/* Background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-muted/40"
            strokeWidth={strokeWidth}
          />
          {/* Segments */}
          {segments.map(({ type, count, actualLen, offset }) => {

            return (
              <motion.circle
                key={type}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={`url(#donut-grad-${type})`}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${actualLen} ${circumference - actualLen}`}
                strokeDashoffset={offset}
                initial={{ strokeDasharray: `0 ${circumference}` }}
                animate={{
                  strokeDasharray: `${actualLen} ${circumference - actualLen}`,
                }}
                transition={{
                  duration: 0.8,
                  delay: 0.2,
                  ease: "easeOut",
                }}
              />
            );
          })}
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-2xl font-bold"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            {total}
          </motion.span>
          <span className="text-[10px] text-muted-foreground">总内容</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 justify-center sm:justify-start">
        {entries.map(([type, count]) => {
          const pct = Math.round((count / total) * 100);
          const label = isXHS
            ? XHS_CONTENT_TYPE_LABELS[type as XHSContentType] || type
            : CONTENT_TYPE_LABELS[type as ContentType] || type;
          return (
            <motion.div
              key={type}
              className="flex items-center gap-1.5"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
            >
              <span
                className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: getChartColor(type, isXHS) }}
              />
              <span className="text-[11px] text-muted-foreground">
                {label}
                <span className="font-medium text-foreground ml-0.5">
                  {pct}%
                </span>
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Horizontal Bar Chart Component ──────────────────────────────────────────

function HorizontalBarChart({
  posts,
  isXHS,
}: {
  posts: AnalyticsData["topPosts"];
  isXHS: boolean;
}) {
  const scored = posts.map((p) => ({
    ...p,
    engagement: p.likes + p.comments * 2 + p.shares * 3,
  }));
  const maxEngagement = Math.max(...scored.map((s) => s.engagement), 1);

  const medalColors = [
    { bg: "bg-amber-400", text: "text-amber-900", ring: "ring-amber-300", label: "🥇" },
    { bg: "bg-slate-300", text: "text-slate-700", ring: "ring-slate-200", label: "🥈" },
    { bg: "bg-orange-400", text: "text-orange-900", ring: "ring-orange-300", label: "🥉" },
  ];

  return (
    <div className="space-y-3">
      {scored.map((post, index) => {
        const pct = (post.engagement / maxEngagement) * 100;
        const grad = BAR_GRADIENTS[index] || BAR_GRADIENTS[4];
        const medal = medalColors[index];

        return (
          <motion.div
            key={post.id}
            className="group"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 * index }}
          >
            <div className="flex items-center gap-2.5 mb-1">
              {/* Medal badge for top 3 */}
              <div className="flex-shrink-0">
                {medal ? (
                  <span
                    className={`inline-flex items-center justify-center h-6 w-6 rounded-full ${medal.bg} ${medal.text} text-xs font-bold ring-2 ${medal.ring} shadow-sm`}
                  >
                    {index + 1}
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                    {index + 1}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-xs font-medium truncate mr-2">
                    {post.topic}
                  </p>
                  <span className="text-xs font-bold tabular-nums flex-shrink-0">
                    {formatNum(post.engagement)}
                  </span>
                </div>
                {/* Bar */}
                <div className="relative h-5 bg-muted/50 rounded-md overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-md"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{
                      duration: 0.7,
                      delay: 0.15 * index,
                      ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                  >
                    <svg
                      width="100%"
                      height="100%"
                      preserveAspectRatio="none"
                      className="absolute inset-0"
                    >
                      <defs>
                        <linearGradient
                          id={`bar-grad-${index}`}
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="0%"
                        >
                          <stop offset="0%" stopColor={grad.from} />
                          <stop offset="100%" stopColor={grad.to} />
                        </linearGradient>
                      </defs>
                      <rect
                        width="100%"
                        height="100%"
                        fill={`url(#bar-grad-${index})`}
                        rx="6"
                      />
                    </svg>
                  </motion.div>
                  {/* Engagement breakdown overlay */}
                  <div className="absolute inset-y-0 left-0 flex items-center pl-2 gap-1.5 pointer-events-none">
                    <span className="text-[9px] text-white/90 drop-shadow-sm font-medium">
                      ♥{post.likes}
                    </span>
                    <span className="text-[9px] text-white/90 drop-shadow-sm font-medium">
                      💬{post.comments}
                    </span>
                    {post.shares > 0 && (
                      <span className="text-[9px] text-white/90 drop-shadow-sm font-medium">
                        ↗{post.shares}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Engagement Rate Card ────────────────────────────────────────────────────

function EngagementRateCard({
  likes,
  comments,
  shares,
  views,
}: {
  likes: number;
  comments: number;
  shares: number;
  views: number;
}) {
  const engagementRate =
    views > 0
      ? Math.min(((likes + comments + shares) / views) * 100, 100)
      : 0;
  const displayRate = views > 0
    ? ((likes + comments + shares) / views) * 100
    : 0;
  const radius = 40;
  const strokeWidth = 7;
  const circumference = 2 * Math.PI * radius;
  const progressLen = (engagementRate / 100) * circumference;
  const center = radius + strokeWidth;

  const getRateLabel = (rate: number) => {
    if (rate >= 10) return { text: "极佳", color: "text-emerald-500" };
    if (rate >= 5) return { text: "良好", color: "text-emerald-400" };
    if (rate >= 2) return { text: "一般", color: "text-amber-500" };
    return { text: "偏低", color: "text-rose-400" };
  };

  const rateInfo = getRateLabel(displayRate);

  return (
    <Card className="border-0 shadow-sm overflow-hidden relative">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-50/80 via-background to-emerald-50/60 dark:from-violet-950/20 dark:via-background dark:to-emerald-950/10" />
      <CardContent className="p-4 relative">
        <div className="flex items-center gap-4">
          {/* SVG Circular Progress */}
          <div className="relative flex-shrink-0">
            <svg
              width={center * 2}
              height={center * 2}
              viewBox={`0 0 ${center * 2} ${center * 2}`}
              className="transform -rotate-90"
            >
              <defs>
                <linearGradient
                  id="engagement-grad"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="50%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                className="stroke-muted/50"
                strokeWidth={strokeWidth}
              />
              <motion.circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="url(#engagement-grad)"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${progressLen} ${circumference - progressLen}`}
                initial={{ strokeDasharray: `0 ${circumference}` }}
                animate={{
                  strokeDasharray: `${progressLen} ${circumference - progressLen}`,
                }}
                transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                className="text-lg font-bold tabular-nums"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                {displayRate.toFixed(1)}%
              </motion.span>
            </div>
          </div>

          {/* Text info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-violet-500" />
              <span className="text-sm font-semibold">互动率</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              每100次浏览约产生{" "}
              <span className="font-medium text-foreground">
                {displayRate.toFixed(1)}
              </span>{" "}
              次互动
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className={`text-xs font-semibold ${rateInfo.color}`}
              >
                {rateInfo.text}
              </span>
              <div className="h-1 flex-1 bg-muted rounded-full overflow-hidden max-w-[80px]">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min(engagementRate * 5, 100)}%`,
                  }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Status Distribution Ring Component ──────────────────────────────────────

function StatusRing({
  statusDistribution,
}: {
  statusDistribution: Record<string, number>;
}) {
  const total = Object.values(statusDistribution).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const radius = 28;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const center = radius + strokeWidth;

  const statusOrder: PostStatus[] = [
    "planned",
    "generated",
    "optimized",
    "published",
  ];

  const entries = statusOrder
    .filter((s) => statusDistribution[s] > 0)
    .map((s) => [s, statusDistribution[s]] as const);

  const hasMultipleSegments = entries.length > 1;
  const gapSize = hasMultipleSegments ? 4 : 0;

  // Precompute all segment geometry using reduce (no mutation)
  const segments = entries.reduce<Array<{ status: string; count: number; actualLen: number; offset: number }>>(
    (acc, [status, count]) => {
      const pct = count / total;
      const segLen = pct * circumference;
      const actualLen = Math.max(0, segLen - gapSize);
      const accumulated = acc.length > 0
        ? acc[acc.length - 1].offset + acc[acc.length - 1].actualLen + gapSize
        : 0;
      acc.push({ status, count, actualLen, offset: -accumulated });
      return acc;
    },
    []
  );

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-shrink-0">
        <svg
          width={center * 2}
          height={center * 2}
          viewBox={`0 0 ${center * 2} ${center * 2}`}
          className="transform -rotate-90"
        >
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            className="stroke-muted/30"
            strokeWidth={strokeWidth}
          />
          {segments.map(({ status, actualLen, offset }) => {

            return (
              <motion.circle
                key={status}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={STATUS_CHART_COLORS[status] || "#94a3b8"}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${actualLen} ${circumference - actualLen}`}
                strokeDashoffset={offset}
                initial={{ strokeDasharray: `0 ${circumference}` }}
                animate={{
                  strokeDasharray: `${actualLen} ${circumference - actualLen}`,
                }}
                transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
              />
            );
          })}
        </svg>
        {/* Center checkmark or count */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs font-bold">{total}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {entries.map(([status, count]) => {
          const pct = Math.round((count / total) * 100);
          return (
            <div key={status} className="flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: STATUS_CHART_COLORS[status] || "#94a3b8",
                }}
              />
              <span className="text-[10px] text-muted-foreground">
                {POST_STATUS_LABELS[status]}{" "}
                <span className="font-medium text-foreground">{pct}%</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Enhanced Skeleton ───────────────────────────────────────────────────────

function AnalyticsSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {/* Export buttons skeleton */}
      <div className="skeleton-shine flex gap-2">
        <Skeleton className="h-8 flex-1 rounded-md" />
        <Skeleton className="h-8 flex-1 rounded-md" />
      </div>

      {/* Stats grid skeleton */}
      <div className="skeleton-shine grid grid-cols-2 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border bg-card p-3"
          >
            <Skeleton className="h-9 w-9 rounded-lg flex-shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-2.5 w-12" />
            </div>
          </div>
        ))}
      </div>

      {/* Engagement rate skeleton */}
      <div className="skeleton-shine rounded-lg border bg-card p-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-[94px] w-[94px] rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </div>

      {/* Donut chart skeleton */}
      <div className="skeleton-shine rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-[132px] w-[132px] rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-2.5 w-2.5 rounded-full" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bar chart skeleton */}
      <div className="skeleton-shine rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-6 w-6 rounded-full" />
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                  <Skeleton className="h-5 w-full rounded-md" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Status ring skeleton */}
      <div className="skeleton-shine rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-[72px] w-[72px] rounded-full flex-shrink-0" />
          <div className="space-y-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <Skeleton className="h-2 w-2 rounded-full" />
                <Skeleton className="h-2.5 w-14" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI analysis skeleton */}
      <div className="skeleton-shine rounded-lg border bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-8 w-full rounded-md" />
      </div>
    </div>
  );
}

// ─── Main Analytics Panel ────────────────────────────────────────────────────

export function AnalyticsPanel() {
  const { platform } = useAppStore();
  const isXHS = platform === "xiaohongshu";
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/analytics");
      if (res.ok) {
        setAnalytics(await res.json());
      }
    } catch (e) {
      console.error("Failed to fetch analytics:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: "json" | "text") => {
    try {
      const res = await fetch(`/api/export?format=${format}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `moments-plan-${new Date().toISOString().slice(0, 10)}.${format === "json" ? "json" : "txt"}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("导出成功");
      }
    } catch {
      toast.error("导出失败");
    }
  };

  const handleAIAnalysis = async () => {
    if (!analytics) return;
    setAnalyzing(true);
    setAiAnalysis("");
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analytics, posts: analytics.topPosts }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiAnalysis(data.analysis);
        toast.info("内容已优化");
      }
    } catch {
      toast.error("分析失败");
    } finally {
      setAnalyzing(false);
    }
  };

  const getLabel = (type: string) => {
    if (isXHS)
      return XHS_CONTENT_TYPE_LABELS[type as XHSContentType] || type;
    return CONTENT_TYPE_LABELS[type as ContentType] || type;
  };

  const getColor = (type: string) => {
    if (isXHS)
      return XHS_CONTENT_TYPE_COLORS[type as XHSContentType] || "";
    return CONTENT_TYPE_COLORS[type as ContentType] || "";
  };

  // Memoize total favorites for XHS
  const totalFavorites = useMemo(() => {
    if (!analytics) return 0;
    return analytics.topPosts.reduce(
      (acc, p) => acc + ((p as Record<string, unknown>).favorites as number) || 0,
      0
    );
  }, [analytics]);

  // ─── Loading State ─────────────────────────────────────────────────────
  if (loading) {
    return <AnalyticsSkeleton />;
  }

  // ─── Empty State ───────────────────────────────────────────────────────
  if (!analytics || analytics.totalPosts === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <BarChart3 className="h-10 w-10 mb-3 opacity-30" />
        <p className="text-sm">暂无数据</p>
        <p className="text-xs mt-1">
          生成内容计划后将自动展示数据分析
        </p>
      </div>
    );
  }

  // ─── Main Content ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-4 py-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* ── Export Buttons ─────────────────────────────────────── */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs gap-1.5"
              onClick={() => handleExport("json")}
            >
              <FileJson className="h-3.5 w-3.5" />
              导出JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs gap-1.5"
              onClick={() => handleExport("text")}
            >
              <FileText className="h-3.5 w-3.5" />
              导出文本
            </Button>
          </div>

          {/* ── Overview Stats ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: "总内容",
                value: analytics.totalPosts,
                icon: BarChart3,
                color: "text-violet-500",
                bg: "bg-violet-50 dark:bg-violet-950/30",
              },
              {
                label: "总点赞",
                value: analytics.totalLikes,
                icon: Heart,
                color: "text-rose-500",
                bg: "bg-rose-50 dark:bg-rose-950/30",
              },
              {
                label: "总评论",
                value: analytics.totalComments,
                icon: MessageSquare,
                color: "text-amber-500",
                bg: "bg-amber-50 dark:bg-amber-950/30",
              },
              ...(isXHS
                ? [
                    {
                      label: "收藏",
                      value: totalFavorites,
                      icon: Star,
                      color: "text-violet-500",
                      bg: "bg-violet-50 dark:bg-violet-950/30",
                    },
                  ]
                : []),
              {
                label: "总转发",
                value: analytics.totalShares,
                icon: Share2,
                color: "text-emerald-500",
                bg: "bg-emerald-50 dark:bg-emerald-950/30",
              },
              {
                label: "总浏览",
                value: analytics.totalViews,
                icon: Eye,
                color: "text-cyan-500",
                bg: "bg-cyan-50 dark:bg-cyan-950/30",
              },
            ].map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
                transition={{ duration: 0.3, delay: idx * 0.06 }}
              >
                <Card className="border-0 shadow-sm stat-card-hover card-glass-hover">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div
                      className={`h-9 w-9 rounded-lg ${stat.bg} flex items-center justify-center flex-shrink-0`}
                    >
                      <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-lg font-semibold truncate">
                        {formatNum(stat.value)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {stat.label}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* ── Average Score ───────────────────────────────────────── */}
          <Card className="border-0 shadow-sm bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-amber-500" />
                <span className="text-sm font-medium">平均AI质量评分</span>
              </div>
              <motion.span
                className="text-2xl font-bold text-amber-600"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
              >
                {analytics.avgScore}
              </motion.span>
            </CardContent>
          </Card>

          {/* ── Engagement Rate Card ────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <EngagementRateCard
              likes={analytics.totalLikes}
              comments={analytics.totalComments}
              shares={analytics.totalShares}
              views={analytics.totalViews}
            />
          </motion.div>

          {/* ── Content Type Distribution (Donut Chart) ────────────── */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-3.5 w-3.5 text-primary" />
                </div>
                内容类型分布
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <DonutChart
                data={analytics.typeDistribution}
                isXHS={isXHS}
              />
            </CardContent>
          </Card>

          {/* ── Status Distribution Ring ────────────────────────────── */}
          {Object.keys(analytics.statusDistribution).length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="h-6 w-6 rounded bg-violet-500/10 flex items-center justify-center">
                    <Zap className="h-3.5 w-3.5 text-violet-500" />
                  </div>
                  状态分布
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <StatusRing
                  statusDistribution={analytics.statusDistribution}
                />
              </CardContent>
            </Card>
          )}

          {/* ── Top Posts (Horizontal Bar Chart) ────────────────────── */}
          {analytics.topPosts.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="h-6 w-6 rounded bg-amber-500/10 flex items-center justify-center">
                    <Trophy className="h-3.5 w-3.5 text-amber-500" />
                  </div>
                  表现最佳内容
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-[10px] text-muted-foreground mb-3">
                  综合评分 = 点赞 ×1 + 评论 ×2 + 转发 ×3
                </p>
                <HorizontalBarChart
                  posts={analytics.topPosts.slice(0, 5)}
                  isXHS={isXHS}
                />
              </CardContent>
            </Card>
          )}

          {/* ── Best Publishing Time Suggestions ───────────────────── */}
          <TimeSuggestions />

          {/* ── AI Analysis ────────────────────────────────────────── */}
          <Card className="border-0 shadow-sm bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="h-6 w-6 rounded bg-violet-500/10 flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                </div>
                AI智能分析
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                AI将分析您的运营数据，提供优化建议和下一阶段策略
              </p>
              <Button
                onClick={handleAIAnalysis}
                disabled={analyzing}
                variant="outline"
                className="w-full border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-950/30"
                size="sm"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    分析中...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    开始AI分析
                  </>
                )}
              </Button>

              {aiAnalysis && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg bg-background p-3 border text-sm leading-relaxed whitespace-pre-wrap"
                >
                  {aiAnalysis}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </ScrollArea>
    </div>
  );
}
