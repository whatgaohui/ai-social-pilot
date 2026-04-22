"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  Send,
  Heart,
  Clock,
  TrendingUp,
  Sparkles,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  BarChart3,
  Eye,
  MessageSquare,
  Share2,
  CalendarDays,
  CalendarRange,
  Inbox,
} from "lucide-react";
import {
  POST_STATUS_LABELS,
  CONTENT_TYPE_LABELS,
  XHS_CONTENT_TYPE_LABELS,
  ContentPost,
} from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = "week" | "month" | "all";

const PERIOD_OPTIONS: { value: Period; label: string; icon: typeof CalendarDays }[] = [
  { value: "week", label: "本周", icon: CalendarDays },
  { value: "month", label: "本月", icon: CalendarRange },
  { value: "all", label: "全部", icon: Inbox },
];

const PERIOD_LABELS: Record<Period, string> = {
  week: "本周",
  month: "本月",
  all: "全部",
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const TIME_LABELS = ["凌晨", "早晨", "上午", "下午", "傍晚", "夜间"];
const TIME_RANGES: [number, number][] = [
  [0, 4],
  [4, 8],
  [8, 12],
  [12, 16],
  [16, 20],
  [20, 24],
];

const FUNNEL_STEPS = [
  { status: "planned", label: "计划中", color: "#94a3b8" },
  { status: "generated", label: "已生成", color: "#8b5cf6" },
  { status: "optimized", label: "已优化", color: "#10b981" },
  { status: "published", label: "已发布", color: "#a855f7" },
] as const;

// ─── Date Helpers ─────────────────────────────────────────────────────────────

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday as start
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getStartOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDate(dateStr: string): Date {
  // scheduledDate is "2025-01-15" format
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  return new Date(0);
}

function filterPostsByPeriod(posts: ContentPost[], period: Period): ContentPost[] {
  if (period === "all") return posts;
  const now = new Date();
  const start =
    period === "week" ? getStartOfWeek(now) : getStartOfMonth(now);
  return posts.filter((p) => {
    const d = p.scheduledDate
      ? parseDate(p.scheduledDate)
      : p.createdAt
        ? new Date(p.createdAt)
        : null;
    return d && d >= start;
  });
}

function getWeekLabel(weekIndex: number, period: Period): string {
  if (period === "all") return `第${weekIndex + 1}周`;
  return `第${weekIndex + 1}周`;
}

// ─── Visual Helpers ──────────────────────────────────────────────────────────

function getHeatColor(value: number, max: number): string {
  if (value === 0) return "rgba(148,163,184,0.08)";
  const ratio = value / (max || 1);
  if (ratio <= 0.25) return "rgba(139,92,246,0.15)";
  if (ratio <= 0.5) return "rgba(139,92,246,0.3)";
  if (ratio <= 0.75) return "rgba(16,185,129,0.45)";
  return "rgba(16,185,129,0.7)";
}

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + "w";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

// ─── Period Toggle Component ─────────────────────────────────────────────────

function PeriodToggle({
  period,
  onChange,
  postCounts,
}: {
  period: Period;
  onChange: (p: Period) => void;
  postCounts: Record<Period, number>;
}) {
  return (
    <motion.div
      className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 backdrop-blur-sm"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {PERIOD_OPTIONS.map((opt) => {
        const isActive = period === opt.value;
        return (
          <motion.button
            key={opt.value}
            className={`
              relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              transition-colors duration-200 cursor-pointer
              ${isActive
                ? "text-white"
                : "text-muted-foreground hover:text-foreground"
              }
            `}
            onClick={() => onChange(opt.value)}
            whileTap={{ scale: 0.97 }}
          >
            {isActive && (
              <motion.div
                className="absolute inset-0 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500"
                layoutId="period-toggle-bg"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1">
              <opt.icon className="h-3 w-3" />
              {opt.label}
              {postCounts[opt.value] > 0 && (
                <span className="text-[9px] opacity-80">({postCounts[opt.value]})</span>
              )}
            </span>
          </motion.button>
        );
      })}
    </motion.div>
  );
}

// ─── Animated Counter ────────────────────────────────────────────────────────

function AnimatedCounter({
  value,
  duration = 0.8,
}: {
  value: number;
  duration?: number;
}) {
  return (
    <motion.span
      className="tabular-nums"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {formatNum(value)}
    </motion.span>
  );
}

// ─── 1. Engagement Heatmap ───────────────────────────────────────────────────

function EngagementHeatmap({
  data,
  isXHS,
}: {
  data: number[][];
  max: number;
  isXHS: boolean;
}) {
  const flatMax = Math.max(...data.flat(), 1);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-muted-foreground">互动热力图</h4>
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-muted-foreground">低</span>
          <div className="flex gap-0.5">
            {[0.1, 0.3, 0.5, 0.7, 0.9].map((v) => (
              <div
                key={v}
                className="h-2 w-2 rounded-sm"
                style={{ backgroundColor: getHeatColor(v * flatMax, flatMax) }}
              />
            ))}
          </div>
          <span className="text-[9px] text-muted-foreground">高</span>
        </div>
      </div>

      {/* Time labels on top */}
      <div className="grid gap-1" style={{ gridTemplateColumns: "32px repeat(6, 1fr)" }}>
        <div />
        {TIME_LABELS.map((t) => (
          <div key={t} className="text-center text-[9px] text-muted-foreground">
            {t}
          </div>
        ))}
      </div>

      {/* Heatmap rows */}
      <div className="space-y-1">
        {DAY_LABELS.map((day, di) => (
          <div key={day} className="grid gap-1 items-center" style={{ gridTemplateColumns: "32px repeat(6, 1fr)" }}>
            <span className="text-[9px] text-muted-foreground text-right pr-1">{day}</span>
            {data[di]?.map((val, ti) => (
              <Tooltip key={`${di}-${ti}`}>
                <TooltipTrigger asChild>
                  <motion.div
                    className="h-7 rounded-sm cursor-default transition-transform hover:scale-110"
                    style={{ backgroundColor: getHeatColor(val, flatMax) }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      duration: 0.3,
                      delay: (di * 6 + ti) * 0.015,
                      ease: "easeOut" as const,
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-[10px]">
                  {day} {TIME_LABELS[ti]}：{val} 条内容
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 2. Content Funnel ───────────────────────────────────────────────────────

function ContentFunnel({
  counts,
  total,
  isXHS,
  onStepClick,
  activeFilter,
}: {
  counts: Record<string, number>;
  total: number;
  isXHS: boolean;
  onStepClick: (status: string) => void;
  activeFilter: string | null;
}) {
  const widths = [100, 78, 56, 38];
  const heights = [28, 28, 28, 28];

  return (
    <div className="space-y-1.5">
      <h4 className="text-xs font-semibold text-muted-foreground">内容漏斗</h4>
      <div className="flex flex-col items-center gap-1 pt-1">
        {FUNNEL_STEPS.map((step, i) => {
          const count = counts[step.status] || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const w = widths[i];
          const isActive = activeFilter === step.status;

          return (
            <motion.button
              key={step.status}
              className={`relative flex flex-col items-center justify-center cursor-pointer group ${
                isActive ? "ring-2 ring-white/50 rounded-lg" : ""
              }`}
              style={{ width: `${w}%`, height: heights[i] }}
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{
                duration: 0.5,
                delay: i * 0.12,
                ease: "easeOut" as const,
              }}
              onClick={() => onStepClick(step.status)}
            >
              {/* Trapezoid background */}
              <div
                className="absolute inset-0 rounded-md transition-all group-hover:brightness-110 group-hover:scale-[1.03]"
                style={{
                  backgroundColor: step.color,
                  clipPath: `polygon(${i < 3 ? `${4 + i * 2}%` : "4%"} 0%, ${i < 3 ? `${100 - 4 - i * 2}%` : "96%"} 0%, ${i < 3 ? `${100 - 4 - (i + 1) * 2}%` : "96%"} 100%, ${i < 3 ? `${4 + (i + 1) * 2}%` : "4%"} 100%)`,
                }}
              />
              {/* Text */}
              <div className="relative z-10 flex items-center gap-1.5">
                <span className="text-[10px] font-medium text-white drop-shadow-sm">
                  {step.label}
                </span>
                <span className="text-[10px] font-bold text-white/90 drop-shadow-sm">
                  {count}
                </span>
                <span className="text-[9px] text-white/70">({pct}%)</span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ─── 3. Platform Comparison Card ─────────────────────────────────────────────

function PlatformComparisonCard({
  metrics,
}: {
  metrics: {
    label: string;
    wechat: number;
    xhs: number;
    icon: React.ReactNode;
  };
}) {
  const max = Math.max(metrics.wechat, metrics.xhs, 1);
  const wechatPct = (metrics.wechat / max) * 100;
  const xhsPct = (metrics.xhs / max) * 100;

  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className="flex-shrink-0 text-muted-foreground">{metrics.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 mb-0.5">
          <span className="text-[10px] text-muted-foreground w-12">{metrics.label}</span>
        </div>
        <div className="space-y-0.5">
          {/* WeChat bar */}
          <div className="flex items-center gap-1">
            <span className="text-[8px] text-emerald-400 w-3">微</span>
            <div className="flex-1 h-2.5 bg-muted/30 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-500"
                initial={{ width: 0 }}
                animate={{ width: `${wechatPct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" as const }}
              />
            </div>
            <span className="text-[9px] tabular-nums text-muted-foreground w-8 text-right">
              {metrics.wechat > 0 ? formatNum(metrics.wechat) : "-"}
            </span>
          </div>
          {/* XHS bar */}
          <div className="flex items-center gap-1">
            <span className="text-[8px] text-rose-400 w-3">红</span>
            <div className="flex-1 h-2.5 bg-muted/30 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-rose-500 to-red-500"
                initial={{ width: 0 }}
                animate={{ width: `${xhsPct}%` }}
                transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" as const }}
              />
            </div>
            <span className="text-[9px] tabular-nums text-muted-foreground w-8 text-right">
              {metrics.xhs > 0 ? formatNum(metrics.xhs) : "-"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 4. Weekly Activity Sparkline ────────────────────────────────────────────

function WeeklySparkline({
  data,
  isXHS,
  period,
}: {
  data: number[];
  isXHS: boolean;
  period: Period;
}) {
  const max = Math.max(...data, 1);
  const width = 280;
  const height = 60;
  const padding = { top: 8, right: 8, bottom: 18, left: 4 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const points = data.map((v, i) => ({
    x: padding.left + (i / Math.max(data.length - 1, 1)) * chartW,
    y: padding.top + chartH - (v / max) * chartH,
  }));

  const linePath =
    points.length > 1
      ? points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
      : "";
  const areaPath =
    points.length > 1
      ? `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`
      : "";

  const gradientId = isXHS ? "sparkGradXHS" : "sparkGradWechat";
  const strokeColor = isXHS ? "#f43f5e" : "#8b5cf6";

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-muted-foreground">
        {period === "all" ? "历史趋势" : "周活跃趋势"}
      </h4>
      <div className="flex justify-center">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="overflow-visible"
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map((ratio) => (
            <line
              key={ratio}
              x1={padding.left}
              y1={padding.top + chartH * (1 - ratio)}
              x2={width - padding.right}
              y2={padding.top + chartH * (1 - ratio)}
              stroke="currentColor"
              className="text-muted/20"
              strokeWidth={0.5}
            />
          ))}

          {points.length > 1 && (
            <>
              {/* Area fill */}
              <motion.path
                d={areaPath}
                fill={`url(#${gradientId})`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              />

              {/* Line */}
              <motion.path
                d={linePath}
                fill="none"
                stroke={strokeColor}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, ease: "easeOut" as const }}
              />
            </>
          )}

          {/* Dots */}
          {points.map((p, i) => (
            <motion.circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={3}
              fill={strokeColor}
              stroke="hsl(var(--background))"
              strokeWidth={2}
              initial={{ r: 0, opacity: 0 }}
              animate={{ r: 3, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.5 + i * 0.08 }}
            />
          ))}

          {/* Value labels */}
          {points.map((p, i) => (
            <text
              key={`label-${i}`}
              x={p.x}
              y={height - 2}
              textAnchor="middle"
              className="fill-muted-foreground text-[8px]"
            >
              {getWeekLabel(i, period)}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

// ─── 5. Quick Stats Row ──────────────────────────────────────────────────────

function QuickStats({
  stats,
  isXHS,
  period,
}: {
  stats: {
    periodPosts: number;
    prevPeriodPosts: number;
    totalEngagement: number;
    peakTime: string;
    publishRate: number;
    avgScore: number;
  };
  isXHS: boolean;
  period: Period;
}) {
  const trend = stats.periodPosts - stats.prevPeriodPosts;
  const trendUp = trend >= 0;

  const periodLabel = PERIOD_LABELS[period];

  const accentClass = isXHS ? "text-rose-500" : "text-violet-500";
  const accentBg = isXHS
    ? "bg-rose-50 dark:bg-rose-950/30"
    : "bg-violet-50 dark:bg-violet-950/30";

  const cards = [
    {
      icon: Send,
      value: stats.periodPosts,
      label: `${periodLabel}发布`,
      accent: accentClass,
      bg: accentBg,
      extra: period !== "all" ? (
        <span className={`flex items-center gap-0.5 text-[9px] ${trendUp ? "text-emerald-500" : "text-rose-500"}`}>
          {trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {Math.abs(trend)}
        </span>
      ) : null,
    },
    {
      icon: Heart,
      value: stats.totalEngagement,
      label: "互动总量",
      accent: "text-rose-500",
      bg: "bg-rose-50 dark:bg-rose-950/30",
    },
    {
      icon: Clock,
      value: null,
      label: "最佳时段",
      accent: "text-amber-500",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      textValue: stats.peakTime || "暂无数据",
    },
    {
      icon: TrendingUp,
      value: stats.publishRate,
      label: "发布率",
      accent: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      isPercent: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -2, transition: { duration: 0.2 } }}
          transition={{ duration: 0.3, delay: i * 0.08 }}
        >
          <Card className="border-0 shadow-sm stat-card-hover">
            <CardContent className="p-2.5 flex items-center gap-2">
              <div
                className={`h-7 w-7 rounded-lg ${card.bg} flex items-center justify-center flex-shrink-0`}
              >
                <card.icon className={`h-3.5 w-3.5 ${card.accent}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate leading-tight">
                  {card.textValue || (
                    <>
                      <AnimatedCounter value={card.value ?? 0} />
                      {card.isPercent && <span className="text-[10px]">%</span>}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-muted-foreground">{card.label}</span>
                  {card.extra}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

// ─── 6. AI Quick Insights ────────────────────────────────────────────────────

function AIQuickInsights({
  bestType,
  lowScoreCount,
  publishSuggestion,
  isXHS,
  period,
}: {
  bestType: string;
  lowScoreCount: number;
  publishSuggestion: string;
  isXHS: boolean;
  period: Period;
}) {
  const periodLabel = PERIOD_LABELS[period];
  const gradientClass = isXHS
    ? "from-rose-50/80 via-background to-orange-50/50 dark:from-rose-950/20 dark:via-background dark:to-orange-950/10"
    : "from-violet-50/80 via-background to-emerald-50/50 dark:from-violet-950/20 dark:via-background dark:to-emerald-950/10";
  const iconColor = isXHS ? "text-rose-500" : "text-violet-500";
  const iconBg = isXHS ? "bg-rose-500/10" : "bg-violet-500/10";

  return (
    <Card className="border-0 shadow-sm overflow-hidden relative">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass}`} />
      <CardContent className="p-3 relative space-y-2.5">
        <div className="flex items-center gap-1.5">
          <div className={`h-5 w-5 rounded ${iconBg} flex items-center justify-center`}>
            <Sparkles className={`h-3 w-3 ${iconColor}`} />
          </div>
          <span className="text-xs font-semibold">AI 速览</span>
          <Badge variant="secondary" className="text-[8px] h-4 px-1.5 ml-auto">
            {periodLabel}
          </Badge>
        </div>

        <div className="space-y-2">
          <motion.div
            className="flex items-start gap-2"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Flame className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground">最佳内容类型</p>
              <p className="text-xs font-medium">{bestType || "暂无数据"}</p>
            </div>
          </motion.div>

          <Separator className="bg-border/50" />

          <motion.div
            className="flex items-start gap-2"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-orange-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground">待优化内容</p>
              <p className="text-xs font-medium">
                {lowScoreCount > 0 ? `${lowScoreCount} 条内容评分偏低` : "所有内容质量良好"}
              </p>
            </div>
          </motion.div>

          <Separator className="bg-border/50" />

          <motion.div
            className="flex items-start gap-2"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Clock className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground">发布建议</p>
              <p className="text-xs font-medium">{publishSuggestion || "建议在活跃时段发布"}</p>
            </div>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <LayoutDashboard className="h-10 w-10 mb-3 opacity-30" />
      <p className="text-sm">暂无运营数据</p>
      <p className="text-xs mt-1">生成内容计划后将自动展示运营看板</p>
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-center">
        <Skeleton className="h-9 w-64 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-2.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-7 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-2.5 w-14" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border bg-card p-3 space-y-2">
        <Skeleton className="h-3 w-16" />
        <div className="grid gap-1" style={{ gridTemplateColumns: "32px repeat(6, 1fr)" }}>
          {Array.from({ length: 7 }).map((_, r) =>
            Array.from({ length: 7 }).map((_, c) => (
              <Skeleton key={`${r}-${c}`} className="h-7 rounded-sm" />
            ))
          )}
        </div>
      </div>
      <Skeleton className="h-32 rounded-lg" />
      <Skeleton className="h-24 rounded-lg" />
      <Skeleton className="h-28 rounded-lg" />
      <Skeleton className="h-20 rounded-lg" />
    </div>
  );
}

// ─── Main Operations Dashboard ───────────────────────────────────────────────

export function OperationsDashboard() {
  const { contentPosts, platform, setContentPosts } = useAppStore();
  const isXHS = platform === "xiaohongshu";
  const [period, setPeriod] = useState<Period>("week");
  const [funnelFilter, setFunnelFilter] = useState<string | null>(null);

  // ─── Filter posts by period ──────────────────────────────────────────────
  const filteredPosts = useMemo(
    () => filterPostsByPeriod(contentPosts, period),
    [contentPosts, period]
  );

  // Count posts per period for the toggle badges
  const postCounts = useMemo<Record<Period, number>>(
    () => ({
      week: filterPostsByPeriod(contentPosts, "week").length,
      month: filterPostsByPeriod(contentPosts, "month").length,
      all: contentPosts.length,
    }),
    [contentPosts]
  );

  // ─── Compute all metrics from filteredPosts ──────────────────────────────
  const metrics = useMemo(() => {
    const posts = filteredPosts;
    if (posts.length === 0 && contentPosts.length === 0) return null;

    // === Heatmap data: 7 days × 6 time slots ===
    const heatmap: number[][] = Array.from({ length: 7 }, () => Array(6).fill(0));
    posts.forEach((post) => {
      const dateStr = post.scheduledDate || "";
      const date = parseDate(dateStr);
      if (isNaN(date.getTime())) return;
      const dayOfWeek = (date.getDay() + 6) % 7; // Mon=0
      // Use scheduledDate to pick a representative hour for the heatmap
      // Since scheduledDate is just a date, we assign a time based on the post's engagement score
      // to simulate the publishing time heatmap
      const engagement = post.likes + post.comments + post.shares;
      const timeIdx = engagement > 10 ? 4 : engagement > 5 ? 3 : engagement > 0 ? 2 : 1;
      heatmap[dayOfWeek][timeIdx] += engagement || 1;
    });

    // === Funnel counts ===
    const funnelCounts: Record<string, number> = { planned: 0, generated: 0, optimized: 0, published: 0 };
    posts.forEach((p) => {
      if (funnelCounts[p.status] !== undefined) funnelCounts[p.status]++;
    });

    // === Quick stats ===
    const now = new Date();
    let periodPosts: number;
    let prevPeriodPosts: number;

    if (period === "week") {
      const startOfWeek = getStartOfWeek(now);
      const prevStartOfWeek = new Date(startOfWeek);
      prevStartOfWeek.setDate(prevStartOfWeek.getDate() - 7);

      periodPosts = posts.filter((p) => {
        const d = parseDate(p.scheduledDate || p.createdAt || "");
        return d >= startOfWeek && d <= now;
      }).length;
      prevPeriodPosts = contentPosts.filter((p) => {
        const d = parseDate(p.scheduledDate || p.createdAt || "");
        return d >= prevStartOfWeek && d < startOfWeek;
      }).length;
    } else if (period === "month") {
      const startOfMonth = getStartOfMonth(now);
      const prevStartOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevEndOfMonth = startOfMonth;

      periodPosts = posts.filter((p) => {
        const d = parseDate(p.scheduledDate || p.createdAt || "");
        return d >= startOfMonth && d <= now;
      }).length;
      prevPeriodPosts = contentPosts.filter((p) => {
        const d = parseDate(p.scheduledDate || p.createdAt || "");
        return d >= prevStartOfMonth && d < prevEndOfMonth;
      }).length;
    } else {
      periodPosts = posts.length;
      prevPeriodPosts = 0;
    }

    const totalEngagement = posts.reduce(
      (acc, p) => acc + p.likes + p.comments + p.shares + (p.favorites || 0),
      0
    );

    // Peak time from heatmap
    let maxHeat = 0;
    let peakDay = 0;
    let peakTime = 0;
    heatmap.forEach((row, di) =>
      row.forEach((val, ti) => {
        if (val > maxHeat) {
          maxHeat = val;
          peakDay = di;
          peakTime = ti;
        }
      })
    );
    const peakTimeStr = maxHeat > 0 ? `${DAY_LABELS[peakDay]} ${TIME_LABELS[peakTime]}` : "";

    const publishedCount = posts.filter((p) => p.status === "published").length;
    const publishRate = posts.length > 0 ? Math.round((publishedCount / posts.length) * 100) : 0;

    // === Weekly activity ===
    let weeklyData: number[];
    let weekCount: number;

    if (period === "all") {
      // Show up to 12 weeks of history
      weekCount = 12;
      weeklyData = Array(weekCount).fill(0);
      posts.forEach((p) => {
        const d = parseDate(p.scheduledDate || p.createdAt || "");
        if (isNaN(d.getTime())) return;
        const diffMs = now.getTime() - d.getTime();
        const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
        if (diffWeeks >= 0 && diffWeeks < weekCount) {
          weeklyData[weekCount - 1 - diffWeeks]++;
        }
      });
    } else {
      // Show last 4 weeks
      weekCount = 4;
      weeklyData = Array(weekCount).fill(0);
      posts.forEach((p) => {
        const d = parseDate(p.scheduledDate || p.createdAt || "");
        if (isNaN(d.getTime())) return;
        const diffMs = now.getTime() - d.getTime();
        const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
        if (diffWeeks >= 0 && diffWeeks < weekCount) {
          weeklyData[weekCount - 1 - diffWeeks]++;
        }
      });
    }

    // === Platform comparison ===
    const wechatPosts = posts.filter((p) => !p.platform || p.platform === "wechat");
    const xhsPosts = posts.filter((p) => p.platform === "xiaohongshu");

    const computeAvg = (list: ContentPost[], field: keyof ContentPost) => {
      if (list.length === 0) return 0;
      const sum = list.reduce((acc, p) => {
        const val = p[field];
        return acc + (typeof val === "number" ? val : 0);
      }, 0);
      return Math.round(sum / list.length);
    };

    // === AI Insights ===
    // Best content type by avg engagement
    const typeEngagement: Record<string, { total: number; count: number }> = {};
    posts.forEach((p) => {
      if (!typeEngagement[p.contentType]) typeEngagement[p.contentType] = { total: 0, count: 0 };
      typeEngagement[p.contentType].total += p.likes + p.comments + p.shares + (p.favorites || 0);
      typeEngagement[p.contentType].count++;
    });
    let bestType = "";
    let bestAvg = 0;
    Object.entries(typeEngagement).forEach(([type, data]) => {
      const avg = data.total / data.count;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestType = type;
      }
    });
    const bestTypeLabel = isXHS
      ? (XHS_CONTENT_TYPE_LABELS[bestType as keyof typeof XHS_CONTENT_TYPE_LABELS] || bestType)
      : (CONTENT_TYPE_LABELS[bestType as keyof typeof CONTENT_TYPE_LABELS] || bestType);

    // Low score count (score < 60)
    const lowScoreCount = posts.filter((p) => p.aiScore > 0 && p.aiScore < 60).length;

    // Publish suggestion based on peak time
    const publishSuggestion = peakTimeStr
      ? `建议在${peakTimeStr}发布，该时段互动最高`
      : "积累更多数据后提供智能发布建议";

    return {
      heatmap,
      heatmapMax: maxHeat,
      funnelCounts,
      quickStats: {
        periodPosts,
        prevPeriodPosts,
        totalEngagement,
        peakTime: peakTimeStr,
        publishRate,
        avgScore: posts.length > 0
          ? Math.round(posts.reduce((acc, p) => acc + (p.aiScore || 0), 0) / posts.length)
          : 0,
      },
      weeklyData,
      platformMetrics: {
        wechat: {
          total: wechatPosts.length,
          avgLikes: computeAvg(wechatPosts, "likes"),
          avgComments: computeAvg(wechatPosts, "comments"),
          avgShares: computeAvg(wechatPosts, "shares"),
          avgViews: computeAvg(wechatPosts, "views"),
          avgScore: computeAvg(wechatPosts, "aiScore"),
        },
        xhs: {
          total: xhsPosts.length,
          avgLikes: computeAvg(xhsPosts, "likes"),
          avgComments: computeAvg(xhsPosts, "comments"),
          avgShares: computeAvg(xhsPosts, "shares"),
          avgViews: computeAvg(xhsPosts, "views"),
          avgScore: computeAvg(xhsPosts, "aiScore"),
        },
      },
      bestTypeLabel,
      lowScoreCount,
      publishSuggestion,
      totalPosts: posts.length,
    };
  }, [filteredPosts, contentPosts, period, isXHS]);

  // ─── Funnel filter handler ────────────────────────────────────────────────
  const handleFunnelStepClick = (status: string) => {
    if (funnelFilter === status) {
      setFunnelFilter(null);
      setContentPosts(contentPosts);
    } else {
      setFunnelFilter(status);
    }
  };

  // ─── Empty state ─────────────────────────────────────────────────────────
  if (contentPosts.length === 0) {
    return <EmptyState />;
  }
  if (!metrics) {
    return <DashboardSkeleton />;
  }

  // ─── Platform comparison metrics ──────────────────────────────────────────
  const platformMetricList = [
    {
      label: "总发布",
      wechat: metrics.platformMetrics.wechat.total,
      xhs: metrics.platformMetrics.xhs.total,
      icon: <Send className="h-3 w-3" />,
    },
    {
      label: "平均点赞",
      wechat: metrics.platformMetrics.wechat.avgLikes,
      xhs: metrics.platformMetrics.xhs.avgLikes,
      icon: <Heart className="h-3 w-3" />,
    },
    {
      label: "平均评论",
      wechat: metrics.platformMetrics.wechat.avgComments,
      xhs: metrics.platformMetrics.xhs.avgComments,
      icon: <MessageSquare className="h-3 w-3" />,
    },
    {
      label: "平均转发",
      wechat: metrics.platformMetrics.wechat.avgShares,
      xhs: metrics.platformMetrics.xhs.avgShares,
      icon: <Share2 className="h-3 w-3" />,
    },
    {
      label: "平均浏览",
      wechat: metrics.platformMetrics.wechat.avgViews,
      xhs: metrics.platformMetrics.xhs.avgViews,
      icon: <Eye className="h-3 w-3" />,
    },
    {
      label: "平均评分",
      wechat: metrics.platformMetrics.wechat.avgScore,
      xhs: metrics.platformMetrics.xhs.avgScore,
      icon: <BarChart3 className="h-3 w-3" />,
    },
  ];

  // Determine dominant platform
  const wScore =
    metrics.platformMetrics.wechat.avgLikes +
    metrics.platformMetrics.wechat.avgComments * 2 +
    metrics.platformMetrics.wechat.avgShares * 3;
  const xScore =
    metrics.platformMetrics.xhs.avgLikes +
    metrics.platformMetrics.xhs.avgComments * 2 +
    metrics.platformMetrics.xhs.avgShares * 3;
  const hasBothPlatforms =
    metrics.platformMetrics.wechat.total > 0 && metrics.platformMetrics.xhs.total > 0;
  const dominantPlatform =
    wScore > xScore ? "wechat" : xScore > wScore ? "xiaohongshu" : null;

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-4 py-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* ── Period Toggle ──────────────────────────────────────────────── */}
          <div className="flex justify-center">
            <PeriodToggle
              period={period}
              onChange={(p) => {
                setPeriod(p);
                setFunnelFilter(null);
              }}
              postCounts={postCounts}
            />
          </div>

          {/* ── Period Summary Badge ────────────────────────────────────────── */}
          <motion.div
            className="flex items-center justify-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <span className="text-[10px] text-muted-foreground">
              {PERIOD_LABELS[period]}共 {metrics.totalPosts} 条内容
            </span>
            {period !== "all" && metrics.totalPosts === 0 && (
              <span className="text-[10px] text-amber-500">（该时段暂无内容，显示全部数据）</span>
            )}
          </motion.div>

          {/* ── Quick Stats Row ─────────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={period}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              <QuickStats stats={metrics.quickStats} isXHS={isXHS} period={period} />
            </motion.div>
          </AnimatePresence>

          {/* ── Engagement Heatmap ─────────────────────────────────────── */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={period}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <EngagementHeatmap data={metrics.heatmap} max={metrics.heatmapMax} isXHS={isXHS} />
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* ── Content Funnel ──────────────────────────────────────────── */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={period}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ContentFunnel
                    counts={metrics.funnelCounts}
                    total={metrics.totalPosts}
                    isXHS={isXHS}
                    onStepClick={handleFunnelStepClick}
                    activeFilter={funnelFilter}
                  />
                </motion.div>
              </AnimatePresence>
              {funnelFilter && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-2"
                >
                  <Badge
                    variant="secondary"
                    className="text-[10px] cursor-pointer"
                    onClick={() => setFunnelFilter(null)}
                  >
                    筛选：{POST_STATUS_LABELS[funnelFilter as keyof typeof POST_STATUS_LABELS]}（
                    {contentPosts.filter((p) => p.status === funnelFilter).length}条）
                    <span className="ml-1 text-muted-foreground">×</span>
                  </Badge>
                </motion.div>
              )}
            </CardContent>
          </Card>

          {/* ── Platform Comparison ─────────────────────────────────────── */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 space-y-1">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-muted-foreground">平台对比</h4>
                {hasBothPlatforms && dominantPlatform && (
                  <Badge
                    variant="secondary"
                    className={`text-[9px] ${
                      dominantPlatform === "wechat"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                        : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                    }`}
                  >
                    优势平台：{dominantPlatform === "wechat" ? "朋友圈" : "小红书"}
                  </Badge>
                )}
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={period}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {platformMetricList.map((m, i) => (
                    <motion.div
                      key={m.label}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.06 }}
                    >
                      <PlatformComparisonCard metrics={m} />
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
              {!hasBothPlatforms && (
                <p className="text-[10px] text-muted-foreground text-center pt-1">
                  切换平台生成内容后可查看对比
                </p>
              )}
            </CardContent>
          </Card>

          {/* ── Weekly Activity Sparkline ───────────────────────────────── */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={period}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <WeeklySparkline data={metrics.weeklyData} isXHS={isXHS} period={period} />
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* ── AI Quick Insights ───────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={period}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              <AIQuickInsights
                bestType={metrics.bestTypeLabel}
                lowScoreCount={metrics.lowScoreCount}
                publishSuggestion={metrics.publishSuggestion}
                isXHS={isXHS}
                period={period}
              />
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </ScrollArea>
    </div>
  );
}
