"use client";

import React, { useMemo } from "react";
import { motion, type Variants } from "framer-motion";
import {
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_COLORS,
  ContentType,
  XHS_CONTENT_TYPE_LABELS,
  XHS_CONTENT_TYPE_COLORS,
  XHSContentType,
} from "@/types";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Radar,
  Heart,
  Activity,
  ChevronDown,
  TrendingUp,
  Sparkles,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  CalendarCheck,
  BarChart3,
  Target,
  Flame,
  ThumbsUp,
  Layers,
  Zap,
} from "lucide-react";
import type { ContentPost } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRate(n: number): string {
  if (n >= 10) return n.toFixed(1);
  if (n >= 1) return n.toFixed(2);
  if (n > 0) return n.toFixed(3);
  return "0";
}

const WEEKDAY_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

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

function getChartColor(type: string, isXHS: boolean): string {
  if (isXHS) return CHART_COLORS_XHS[type] || "#8b5cf6";
  return CHART_COLORS_WECAT[type] || "#8b5cf6";
}

// ─── Animation variants ───────────────────────────────────────────────────────

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

// ─── Radar Chart ──────────────────────────────────────────────────────────────

interface RadarDataPoint {
  label: string;
  value: number;       // 0-100
  benchmark: number;   // 0-100
}

const RadarChart = React.memo(function RadarChart({
  data,
}: {
  data: RadarDataPoint[];
}) {
  const sides = data.length;
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 75;
  const minR = 20;

  // Compute angle for each vertex (-90 to start from top)
  const angles = data.map((_, i) => {
    const angle = (2 * Math.PI * i) / sides - Math.PI / 2;
    return angle;
  });

  // Convert polar to cartesian
  const toXY = (angle: number, r: number) => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  });

  // Polygon points helper
  const polyPoints = (r: number) =>
    angles.map((a) => {
      const p = toXY(a, r);
      return `${p.x},${p.y}`;
    }).join(" ");

  // Grid rings (20%, 40%, 60%, 80%, 100%)
  const gridRings = [0.2, 0.4, 0.6, 0.8, 1.0];

  // Own data polygon
  const ownPoints = data
    .map((d, i) => {
      const r = minR + ((d.value / 100) * (maxR - minR));
      const p = toXY(angles[i], r);
      return `${p.x},${p.y}`;
    })
    .join(" ");

  // Benchmark polygon
  const benchPoints = data
    .map((d, i) => {
      const r = minR + ((d.benchmark / 100) * (maxR - minR));
      const p = toXY(angles[i], r);
      return `${p.x},${p.y}`;
    })
    .join(" ");

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id="radar-own-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#a855f7" stopOpacity={0.15} />
          </linearGradient>
          <linearGradient id="radar-own-stroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
        </defs>

        {/* Grid rings */}
        {gridRings.map((scale) => (
          <polygon
            key={scale}
            points={polyPoints(minR + scale * (maxR - minR))}
            fill="none"
            className="stroke-muted/30"
            strokeWidth={0.8}
          />
        ))}

        {/* Axis lines */}
        {angles.map((a, i) => {
          const p = toXY(a, maxR);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={p.x}
              y2={p.y}
              className="stroke-muted/20"
              strokeWidth={0.6}
            />
          );
        })}

        {/* Benchmark polygon (gray) */}
        <motion.polygon
          points={benchPoints}
          fill="rgba(148,163,184,0.1)"
          stroke="rgba(148,163,184,0.35)"
          strokeWidth={1.2}
          strokeLinejoin="round"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        />

        {/* Own polygon (violet) */}
        <motion.polygon
          points={ownPoints}
          fill="url(#radar-own-grad)"
          stroke="url(#radar-own-stroke)"
          strokeWidth={2}
          strokeLinejoin="round"
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />

        {/* Data points for own values */}
        {data.map((d, i) => {
          const r = minR + ((d.value / 100) * (maxR - minR));
          const p = toXY(angles[i], r);
          return (
            <motion.circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={3.5}
              fill="#8b5cf6"
              stroke="white"
              strokeWidth={1.5}
              initial={{ r: 0, opacity: 0 }}
              animate={{ r: 3.5, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.8 + i * 0.06 }}
            />
          );
        })}

        {/* Labels */}
        {data.map((d, i) => {
          const labelR = maxR + 18;
          const p = toXY(angles[i], labelR);
          const isRight = p.x >= cx;
          const isBottom = p.y > cy + 5;
          return (
            <text
              key={i}
              x={p.x}
              y={p.y + (isBottom ? 3 : -2)}
              textAnchor={isRight ? "start" : "end"}
              className="fill-muted-foreground text-[10px]"
              fontSize={10}
            >
              {d.label}
              <tspan
                className="fill-foreground font-medium"
                dx={4}
              >
                {d.value}
              </tspan>
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: "#8b5cf6" }}
          />
          <span className="text-[11px] text-muted-foreground">我的表现</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: "rgba(148,163,184,0.5)" }}
          />
          <span className="text-[11px] text-muted-foreground">行业平均</span>
        </div>
      </div>
    </div>
  );
});

// ─── Health Score Ring ────────────────────────────────────────────────────────

interface SubScore {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}

const HealthScoreRing = React.memo(function HealthScoreRing({
  score,
  rating,
  subScores,
}: {
  score: number;
  rating: { text: string; color: string };
  subScores: SubScore[];
}) {
  const radius = 44;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const progressLen = (score / 100) * circumference;
  const center = radius + strokeWidth;

  const ringColor =
    score >= 85
      ? "#10b981"
      : score >= 70
        ? "#8b5cf6"
        : score >= 50
          ? "#f59e0b"
          : "#f43f5e";

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      {/* Ring */}
      <div className="relative flex-shrink-0">
        <svg
          width={center * 2}
          height={center * 2}
          viewBox={`0 0 ${center * 2} ${center * 2}`}
          className="transform -rotate-90"
        >
          <defs>
            <linearGradient id="health-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor={ringColor} />
            </linearGradient>
          </defs>
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            className="stroke-muted/40"
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="url(#health-grad)"
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
            className="text-2xl font-bold tabular-nums"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            {Math.round(score)}
          </motion.span>
          <motion.span
            className={`text-[10px] font-semibold ${rating.color}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            {rating.text}
          </motion.span>
        </div>
      </div>

      {/* Sub-scores */}
      <div className="flex-1 w-full space-y-3">
        {subScores.map((sub, i) => (
          <motion.div
            key={sub.label}
            className="flex items-center gap-2.5"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.4 + i * 0.1 }}
          >
            <div className="flex-shrink-0 text-muted-foreground">{sub.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] text-muted-foreground">
                  {sub.label}
                </span>
                <span className="text-[11px] font-semibold tabular-nums">
                  {Math.round(sub.value)}
                </span>
              </div>
              <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${sub.color}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${sub.value}%` }}
                  transition={{ duration: 0.7, delay: 0.5 + i * 0.1, ease: "easeOut" }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
});

// ─── Content Type Bar Chart ───────────────────────────────────────────────────

interface ContentTypeStat {
  type: string;
  count: number;
  avgEngagement: number;
  label: string;
  color: string;
}

const ContentTypeBarChart = React.memo(function ContentTypeBarChart({
  stats,
  isXHS,
}: {
  stats: ContentTypeStat[];
  isXHS: boolean;
}) {
  const maxEngagement = Math.max(...stats.map((s) => s.avgEngagement), 1);
  const bestType = stats.reduce<string | null>((best, s) => {
    if (best === null || s.avgEngagement > (stats.find((x) => x.type === best)?.avgEngagement ?? 0)) {
      return s.type;
    }
    return best;
  }, null);

  return (
    <div className="space-y-3">
      {stats.map((stat, index) => {
        const pct = (stat.avgEngagement / maxEngagement) * 100;
        const isBest = stat.type === bestType;
        const barColor = getChartColor(stat.type, isXHS);

        return (
          <motion.div
            key={stat.type}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 * index }}
          >
            <div className="flex items-center gap-2.5 mb-1">
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={`text-[10px] px-1.5 py-0 h-5 ${stat.color}`}
                >
                  {stat.label}
                </Badge>
                {isBest && stats.length > 1 && (
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[9px] px-1.5 py-0 h-4 border-0">
                    <Flame className="h-2.5 w-2.5 mr-0.5" />
                    最佳
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Badge
                  variant="outline"
                  className="text-[9px] px-1.5 py-0 h-4 border-muted"
                >
                  {stat.count}篇
                </Badge>
                <span className="text-[11px] font-semibold tabular-nums min-w-[36px] text-right">
                  {formatRate(stat.avgEngagement)}%
                </span>
              </div>
            </div>
            <div className="relative h-4 bg-muted/40 rounded-md overflow-hidden">
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
                      id={`type-bar-${stat.type}`}
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop offset="0%" stopColor={barColor} stopOpacity={0.75} />
                      <stop offset="100%" stopColor={barColor} stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <rect
                    width="100%"
                    height="100%"
                    fill={`url(#type-bar-${stat.type})`}
                    rx="6"
                  />
                </svg>
              </motion.div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
});

// ─── Day-of-Week Cards ────────────────────────────────────────────────────────

interface DayOfWeekStat {
  day: number;        // 0=Mon .. 6=Sun
  count: number;
  avgEngagement: number;
  label: string;
}

const DayOfWeekCards = React.memo(function DayOfWeekCards({
  stats,
  recommendedDays,
}: {
  stats: DayOfWeekStat[];
  recommendedDays: number[];
}) {
  const bestDay = stats.reduce<DayOfWeekStat | null>((best, s) => {
    if (!best || s.avgEngagement > best.avgEngagement) return s;
    return best;
  }, null);
  const worstDay = stats.reduce<DayOfWeekStat | null>((worst, s) => {
    if (s.count === 0) return worst;
    if (!worst || s.avgEngagement < worst.avgEngagement) return s;
    return worst;
  }, null);

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {stats.map((stat, i) => {
        const isBest = bestDay && stat.day === bestDay.day && stat.count > 0;
        const isWorst =
          worstDay && stat.day === worstDay.day && stat.count > 0;
        const isRecommended = recommendedDays.includes(stat.day);
        const hasData = stat.count > 0;

        return (
          <motion.div
            key={stat.day}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.05 * i }}
            className={`relative flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors ${
              isRecommended
                ? "border-violet-300 bg-violet-50/60 dark:border-violet-800 dark:bg-violet-950/30"
                : "border-muted/50 bg-card"
            }`}
          >
            <span className="text-[10px] text-muted-foreground font-medium">
              {stat.label}
            </span>
            {hasData ? (
              <>
                <span className="text-sm font-bold tabular-nums leading-none">
                  {stat.count}
                </span>
                <span
                  className={`text-[9px] font-medium tabular-nums ${
                    stat.avgEngagement >= 8
                      ? "text-emerald-500"
                      : stat.avgEngagement >= 4
                        ? "text-amber-500"
                        : "text-rose-400"
                  }`}
                >
                  {formatRate(stat.avgEngagement)}%
                </span>
                {isBest && (
                  <ArrowUpRight className="h-3 w-3 text-emerald-500 absolute -top-1 -right-1" />
                )}
                {isWorst && (
                  <AlertTriangle className="h-3 w-3 text-rose-400 absolute -top-1 -right-1" />
                )}
              </>
            ) : (
              <span className="text-[10px] text-muted-foreground/40 leading-none mt-1">
                -
              </span>
            )}
            {isRecommended && (
              <Sparkles className="h-2.5 w-2.5 text-violet-400 absolute -bottom-1 -right-1" />
            )}
          </motion.div>
        );
      })}
    </div>
  );
});

// ─── Suggestion Card ──────────────────────────────────────────────────────────

type SuggestionType = "success" | "improve" | "focus";

interface Suggestion {
  icon: React.ReactNode;
  title: string;
  description: string;
  type: SuggestionType;
}

const SUGGESTION_STYLES: Record<
  SuggestionType,
  { border: string; bg: string; iconColor: string; badgeClass: string }
> = {
  success: {
    border: "border-emerald-200 dark:border-emerald-800/50",
    bg: "bg-emerald-50/50 dark:bg-emerald-950/20",
    iconColor: "text-emerald-500",
    badgeClass:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  improve: {
    border: "border-amber-200 dark:border-amber-800/50",
    bg: "bg-amber-50/50 dark:bg-amber-950/20",
    iconColor: "text-amber-500",
    badgeClass:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
  focus: {
    border: "border-rose-200 dark:border-rose-800/50",
    bg: "bg-rose-50/50 dark:bg-rose-950/20",
    iconColor: "text-rose-500",
    badgeClass:
      "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  },
};

const SUGGESTION_TYPE_LABELS: Record<SuggestionType, string> = {
  success: "继续保持",
  improve: "需要改进",
  focus: "重点关注",
};

const SuggestionCard = React.memo(function SuggestionCard({
  suggestion,
}: {
  suggestion: Suggestion;
}) {
  const style = SUGGESTION_STYLES[suggestion.type];

  return (
    <motion.div
      className={`rounded-lg border p-3 ${style.border} ${style.bg}`}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex items-start gap-2.5">
        <div className={`flex-shrink-0 mt-0.5 ${style.iconColor}`}>
          {suggestion.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold">{suggestion.title}</span>
            <Badge
              className={`text-[9px] px-1.5 py-0 h-4 border-0 ${style.badgeClass}`}
            >
              {SUGGESTION_TYPE_LABELS[suggestion.type]}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {suggestion.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
});

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex-shrink-0 text-violet-500">{icon}</div>
      <h4 className="text-xs font-semibold tracking-wide">{title}</h4>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ContentCompetitionPanel({
  className,
}: {
  className?: string;
}) {
  const platform = useAppStore((s) => s.platform);
  const contentPosts = useAppStore((s) => s.contentPosts);
  const isXHS = platform === "xiaohongshu";

  // ─── Computed analytics ─────────────────────────────────────────────────

  const analysis = useMemo(() => {
    const posts = contentPosts;
    if (posts.length === 0) return null;

    // ── Radar data (5 dimensions) ──
    const publishedPosts = posts.filter((p) => p.status === "published");

    // 1. 互动率 (0-100)
    const totalViews = posts.reduce((s, p) => s + p.views, 0);
    const totalInteractions = posts.reduce(
      (s, p) => s + p.likes + p.comments + p.shares,
      0
    );
    const engagementRate =
      totalViews > 0 ? (totalInteractions / totalViews) * 100 : 0;
    const engagementScore = Math.min(engagementRate * 10, 100); // 10% = 100
    const engagementBenchmark = 35; // 3.5% industry average

    // 2. 内容多样性 (0-100)
    const uniqueTypes = new Set(posts.map((p) => p.contentType)).size;
    const diversityScore = Math.min((uniqueTypes / 5) * 100, 100);
    const diversityBenchmark = 40;

    // 3. 发布频率 (0-100) — based on posts per week in last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentPosts = posts.filter(
      (p) => new Date(p.createdAt) >= thirtyDaysAgo
    );
    const postsPerWeek = (recentPosts.length / 30) * 7;
    const frequencyScore = Math.min((postsPerWeek / 7) * 100, 100); // 7 posts/week = 100
    const frequencyBenchmark = 40; // ~2.8 posts/week industry avg

    // 4. AI 评分 (0-100)
    const avgAiScore =
      posts.length > 0
        ? posts.reduce((s, p) => s + p.aiScore, 0) / posts.length
        : 0;
    const aiScoreNormalized = Math.min((avgAiScore / 10) * 100, 100);
    const aiScoreBenchmark = 60;

    // 5. 粉丝增长潜力 (composite proxy)
    const avgShares =
      posts.length > 0
        ? posts.reduce((s, p) => s + p.shares, 0) / posts.length
        : 0;
    const avgFavorites =
      posts.length > 0
        ? posts.reduce((s, p) => s + (p.favorites ?? 0), 0) / posts.length
        : 0;
    const growthPotential = Math.min(
      ((avgShares * 2 + avgFavorites) / 20) * 100,
      100
    );
    const growthBenchmark = 30;

    const radarData: RadarDataPoint[] = [
      { label: "互动率", value: Math.round(engagementScore), benchmark: engagementBenchmark },
      { label: "内容多样性", value: Math.round(diversityScore), benchmark: diversityBenchmark },
      { label: "发布频率", value: Math.round(frequencyScore), benchmark: frequencyBenchmark },
      { label: "AI评分", value: Math.round(aiScoreNormalized), benchmark: aiScoreBenchmark },
      { label: "增长潜力", value: Math.round(growthPotential), benchmark: growthBenchmark },
    ];

    // ── Health score ──
    const completionRate =
      publishedPosts.length > 0
        ? publishedPosts.length / posts.length
        : 0;
    const completionScore = completionRate * 100;

    const healthScore =
      frequencyScore * 0.3 +
      engagementScore * 0.25 +
      diversityScore * 0.2 +
      aiScoreNormalized * 0.15 +
      completionScore * 0.1;

    const healthRating =
      healthScore >= 85
        ? { text: "优秀", color: "text-emerald-500" }
        : healthScore >= 70
          ? { text: "良好", color: "text-violet-500" }
          : healthScore >= 50
            ? { text: "一般", color: "text-amber-500" }
            : { text: "待改进", color: "text-rose-500" };

    const subScores: SubScore[] = [
      {
        label: "发布频率",
        value: frequencyScore,
        color: "bg-gradient-to-r from-violet-500 to-purple-500",
        icon: <Clock className="h-3.5 w-3.5" />,
      },
      {
        label: "互动率",
        value: engagementScore,
        color: "bg-gradient-to-r from-emerald-500 to-teal-500",
        icon: <Heart className="h-3.5 w-3.5" />,
      },
      {
        label: "内容多样性",
        value: diversityScore,
        color: "bg-gradient-to-r from-amber-500 to-orange-500",
        icon: <Layers className="h-3.5 w-3.5" />,
      },
      {
        label: "完成率",
        value: completionScore,
        color: "bg-gradient-to-r from-rose-500 to-pink-500",
        icon: <Target className="h-3.5 w-3.5" />,
      },
    ];

    // ── Content type stats ──
    const typeMap: Record<
      string,
      { totalEngagement: number; totalViews: number; count: number }
    > = {};
    posts.forEach((p) => {
      if (!typeMap[p.contentType]) {
        typeMap[p.contentType] = {
          totalEngagement: 0,
          totalViews: 0,
          count: 0,
        };
      }
      typeMap[p.contentType].totalEngagement +=
        p.likes + p.comments + p.shares;
      typeMap[p.contentType].totalViews += p.views;
      typeMap[p.contentType].count += 1;
    });

    const contentTypeStats: ContentTypeStat[] = Object.entries(typeMap)
      .map(([type, data]) => ({
        type,
        count: data.count,
        avgEngagement:
          data.totalViews > 0
            ? (data.totalEngagement / data.totalViews) * 100
            : 0,
        label: isXHS
          ? XHS_CONTENT_TYPE_LABELS[type as XHSContentType] || type
          : CONTENT_TYPE_LABELS[type as ContentType] || type,
        color: isXHS
          ? XHS_CONTENT_TYPE_COLORS[type as XHSContentType] || ""
          : CONTENT_TYPE_COLORS[type as ContentType] || "",
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement);

    // ── Day-of-week stats ──
    const dayStats: DayOfWeekStat[] = WEEKDAY_LABELS.map((label, day) => {
      // getDay() returns 0=Sun, 1=Mon, ... so we map day index 0=Mon to JS getDay
      const jsDay = day === 6 ? 0 : day + 1; // our day 6=Sun → JS 0
      const dayPosts = posts.filter((p) => {
        const d = new Date(p.scheduledDate || p.createdAt);
        return d.getDay() === jsDay;
      });
      const dayViews = dayPosts.reduce((s, p) => s + p.views, 0);
      const dayInteractions = dayPosts.reduce(
        (s, p) => s + p.likes + p.comments + p.shares,
        0
      );
      return {
        day,
        count: dayPosts.length,
        avgEngagement:
          dayViews > 0 ? (dayInteractions / dayViews) * 100 : 0,
        label,
      };
    });

    // Recommended days: top 2 by engagement (with at least 1 post)
    const recommendedDays = [...dayStats]
      .filter((d) => d.count > 0)
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
      .slice(0, 2)
      .map((d) => d.day);

    // ── Suggestions ──
    const suggestions: Suggestion[] = [];

    // Check various conditions
    if (engagementScore >= 50) {
      suggestions.push({
        icon: <CheckCircle2 className="h-4 w-4" />,
        title: "互动表现优秀",
        description: `当前互动率 ${formatRate(engagementRate)}%，远超行业平均水平。建议继续保持现有内容策略，并尝试更多深度互动话题。`,
        type: "success",
      });
    } else if (engagementScore >= 25) {
      suggestions.push({
        icon: <TrendingUp className="h-4 w-4" />,
        title: "互动率有提升空间",
        description: `当前互动率 ${formatRate(engagementRate)}%，处于行业中等水平。建议增加问答类、投票类互动内容来提升参与度。`,
        type: "improve",
      });
    } else {
      suggestions.push({
        icon: <AlertTriangle className="h-4 w-4" />,
        title: "互动率偏低需关注",
        description: `当前互动率仅 ${formatRate(engagementRate)}%，低于行业平均水平。建议优化内容标题、封面图，增加互动引导语。`,
        type: "focus",
      });
    }

    if (diversityScore >= 60) {
      suggestions.push({
        icon: <CheckCircle2 className="h-4 w-4" />,
        title: "内容类型丰富",
        description: `已覆盖 ${uniqueTypes} 种内容类型，内容生态丰富。保持多元化的创作方向有助于触达更广泛的受众。`,
        type: "success",
      });
    } else {
      suggestions.push({
        icon: <Layers className="h-4 w-4" />,
        title: "建议丰富内容类型",
        description: `目前仅使用 ${uniqueTypes} 种内容类型，多样性不足。尝试加入视频、故事分享等新形式，提升内容吸引力。`,
        type: "improve",
      });
    }

    if (frequencyScore < 40) {
      suggestions.push({
        icon: <AlertTriangle className="h-4 w-4" />,
        title: "发布频率不足",
        description: `近30天平均每周发布 ${postsPerWeek.toFixed(1)} 篇，低于建议的每周3-5篇。保持稳定的更新节奏对账号增长至关重要。`,
        type: "focus",
      });
    }

    if (recommendedDays.length === 2 && postsPerWeek >= 2) {
      const dayLabels = recommendedDays.map((d) => WEEKDAY_LABELS[d]).join("、");
      suggestions.push({
        icon: <CalendarCheck className="h-4 w-4" />,
        title: "优化发布时间",
        description: `数据分析显示${dayLabels}的互动效果最佳，建议将重要内容优先安排在这两天发布。`,
        type: "improve",
      });
    }

    if (contentTypeStats.length > 1) {
      const bestStat = contentTypeStats[0];
      suggestions.push({
        icon: <Flame className="h-4 w-4" />,
        title: `${bestStat.label}效果最佳`,
        description: `${bestStat.label}类内容的平均互动率达到 ${formatRate(bestStat.avgEngagement)}%，建议增加此类内容的占比（当前 ${Math.round((bestStat.count / posts.length) * 100)}%）。`,
        type: "success",
      });
    }

    if (completionScore < 70 && posts.length > 3) {
      suggestions.push({
        icon: <Target className="h-4 w-4" />,
        title: "内容完成率需提升",
        description: `目前完成率为 ${Math.round(completionScore)}%，有 ${posts.length - publishedPosts.length} 篇内容尚未发布。建议尽快完成审核和发布流程。`,
        type: "focus",
      });
    }

    return {
      radarData,
      healthScore,
      healthRating,
      subScores,
      contentTypeStats,
      dayStats,
      recommendedDays,
      suggestions,
    };
  }, [contentPosts, isXHS]);

  // ─── Empty state ─────────────────────────────────────────────────────────

  if (!analysis) {
    return (
      <Collapsible defaultOpen className={className}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardContent className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors rounded-lg">
              <div className="flex items-center gap-2">
                <Radar className="h-4 w-4 text-violet-500" />
                <span className="text-sm font-semibold">内容竞争分析</span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="px-4 pb-4">
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Activity className="h-8 w-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  暂无内容数据
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  创建内容后将自动生成竞争分析
                </p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  return (
    <Collapsible defaultOpen className={className}>
      <Card>
        <CollapsibleTrigger className="w-full group">
          <CardContent className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors rounded-lg">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                <Radar className="h-4 w-4 text-white" />
              </div>
              <div>
                <span className="text-sm font-semibold">内容竞争分析</span>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  多维度评估内容竞争力
                </p>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-5">
            <Separator />

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-5"
            >
              {/* ── 1. Radar Chart ── */}
              <motion.div variants={itemVariants}>
                <SectionHeader
                  icon={<Radar className="h-3.5 w-3.5" />}
                  title="内容表现雷达图"
                />
                <div className="rounded-lg border bg-gradient-to-br from-violet-50/40 via-background to-purple-50/30 dark:from-violet-950/10 dark:via-background dark:to-purple-950/10 p-4">
                  <RadarChart data={analysis.radarData} />
                </div>
              </motion.div>

              {/* ── 2. Health Score ── */}
              <motion.div variants={itemVariants}>
                <SectionHeader
                  icon={<Heart className="h-3.5 w-3.5" />}
                  title="内容健康度评分"
                />
                <div className="rounded-lg border p-4">
                  <HealthScoreRing
                    score={analysis.healthScore}
                    rating={analysis.healthRating}
                    subScores={analysis.subScores}
                  />
                </div>
              </motion.div>

              {/* ── 3. Content Type Comparison ── */}
              {analysis.contentTypeStats.length > 0 && (
                <motion.div variants={itemVariants}>
                  <SectionHeader
                    icon={<BarChart3 className="h-3.5 w-3.5" />}
                    title="内容类型效果对比"
                  />
                  <div className="rounded-lg border p-4">
                    <ContentTypeBarChart
                      stats={analysis.contentTypeStats}
                      isXHS={isXHS}
                    />
                  </div>
                </motion.div>
              )}

              {/* ── 4. Publishing Rhythm ── */}
              <motion.div variants={itemVariants}>
                <SectionHeader
                  icon={<Clock className="h-3.5 w-3.5" />}
                  title="发布节奏分析"
                />
                <div className="rounded-lg border p-4 space-y-2">
                  <DayOfWeekCards
                    stats={analysis.dayStats}
                    recommendedDays={analysis.recommendedDays}
                  />
                  {analysis.recommendedDays.length > 0 && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <Sparkles className="h-3 w-3 text-violet-400" />
                      <span className="text-[10px] text-muted-foreground">
                        建议发布日：
                        <span className="text-violet-500 font-medium">
                          {analysis.recommendedDays
                            .map((d) => WEEKDAY_LABELS[d])
                            .join("、")}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* ── 5. Suggestions ── */}
              {analysis.suggestions.length > 0 && (
                <motion.div variants={itemVariants}>
                  <SectionHeader
                    icon={<Zap className="h-3.5 w-3.5" />}
                    title="运营建议"
                  />
                  <div className="space-y-2">
                    {analysis.suggestions.map((s, i) => (
                      <SuggestionCard key={i} suggestion={s} />
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
