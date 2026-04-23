"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef, Fragment } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import type { ContentPost } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CalendarDays,
  Heart,
  Star,
  CheckCircle,
  ChevronDown,
  Sparkles,
  BarChart3,
  AlertTriangle,
  Clock,
  FileText,
  CalendarX,
  ArrowRight,
  Zap,
  Bot,
  CalendarRange,
  TrendingUp,
  Bell,
  Layers,
  Activity,
} from "lucide-react";
import { subDays, startOfWeek, endOfWeek, startOfDay, differenceInDays, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";
import { safeFormat } from "@/lib/safe-date";
import { EnhancedTooltip } from "@/components/enhanced-tooltip";
import { ProgressRing } from "@/components/progress-ring";
import { MiniSparkline } from "@/components/ui/mini-sparkline";

// ─── Animation variants ──────────────────────────────────────────────────────

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const staggerChild = {
  hidden: { opacity: 0, y: 12, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 400, damping: 25 },
  },
};

const fadeIn = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const activityContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.3 },
  },
};

const activityChild = {
  hidden: { opacity: 0, x: -12 },
  show: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 300, damping: 25 },
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "夜深了";
  if (hour < 12) return "早上好";
  if (hour < 14) return "中午好";
  if (hour < 18) return "下午好";
  return "晚上好";
}

function getFormattedDate(): string {
  return safeFormat(new Date(), "yyyy年M月d日 EEEE", "--", { locale: zhCN });
}

function formatNumber(num: number): string {
  if (num >= 10000) return `${(num / 10000).toFixed(1)}w`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return String(num);
}

// ─── Animated Counter Hook ───────────────────────────────────────────────────

function useAnimatedCounter(target: number, shouldAnimate: boolean, duration: number = 1.5) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const display = useTransform(rounded, (v) => formatNumber(v));
  const [text, setText] = useState("0");
  const prevAnimateRef = useRef(false);

  useEffect(() => {
    if (!shouldAnimate) return;
    if (prevAnimateRef.current) return;
    prevAnimateRef.current = true;
    if (target === 0) return;
    const controls = animate(count, target, {
      duration,
      ease: "easeOut",
    });
    const unsubscribe = display.on("change", (v) => setText(v));
    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [count, target, duration, display, shouldAnimate]);

  return text;
}

// ─── Animated Counter Display ───────────────────────────────────────────────

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  prefix?: string;
  delay?: number;
}

function AnimatedCounter({ value, suffix = "", prefix = "", delay = 0 }: AnimatedCounterProps) {
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const count = useAnimatedCounter(value, shouldAnimate, 1.5);

  useEffect(() => {
    const timer = setTimeout(() => setShouldAnimate(true), delay * 1000);
    return () => clearTimeout(timer);
  }, [delay]);

  if (value === 0) {
    return <span>{"--"}</span>;
  }

  return (
    <span className="tabular-nums">
      {prefix}{count}{suffix}
    </span>
  );
}

// ─── Activity Feed Data ─────────────────────────────────────────────────────

interface ActivityItem {
  id: string;
  type: "ai-generate" | "publish" | "score-update" | "template-use";
  description: string;
  time: string;
}

const ACTIVITY_ICONS = {
  "ai-generate": Bot,
  "publish": Bell,
  "score-update": TrendingUp,
  "template-use": Layers,
} as const;

type ActivityType = ActivityItem["type"];

function getActivityColor(type: ActivityType) {
  switch (type) {
    case "ai-generate": return "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400";
    case "publish": return "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "score-update": return "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400";
    case "template-use": return "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400";
  }
}

// ─── Metric Card ─────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  numericValue: number;
  displaySuffix?: string;
  icon: React.ComponentType<{ className?: string }>;
  gradientBorder: string;
  iconBg: string;
  trend: { value: number; isPositive: boolean };
  index: number;
  sparklineData?: number[];
  sparklineColor?: string;
}

function MetricCard({
  label,
  numericValue,
  displaySuffix = "",
  icon: Icon,
  gradientBorder,
  iconBg,
  trend,
  index,
  sparklineData,
  sparklineColor,
}: MetricCardProps) {
  return (
    <motion.div
      variants={staggerChild}
      custom={index}
      className="group relative"
    >
      <div
        className={`relative rounded-xl border p-4 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 border-border/60 hover:border-border content-card-hover micro-hover ${gradientBorder}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-muted-foreground font-medium mb-1.5 truncate">
              {label}
            </p>
            <motion.p
              className="text-xl font-bold tabular-nums tracking-tight"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.08 + 0.2, type: "spring", stiffness: 300 }}
            >
              <AnimatedCounter value={numericValue} suffix={displaySuffix} delay={index * 0.1 + 0.3} />
            </motion.p>
          </div>
          <motion.div
            className={`flex items-center justify-center h-9 w-9 rounded-lg ${iconBg} shadow-sm transition-transform duration-300 group-hover:scale-105`}
            whileHover={{ rotate: 5 }}
          >
            <Icon className="h-4 w-4" />
          </motion.div>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5">
          {trend.value !== 0 && (
            <Badge
              variant="secondary"
              className={`text-[10px] px-1.5 py-0 h-4 font-semibold tabular-nums ${
                trend.isPositive
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                  : "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400"
              }`}
            >
              {trend.isPositive ? "↑" : "↓"}{Math.abs(trend.value)}%
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground/70">较上周</span>
          {sparklineData && sparklineData.length > 1 && (
            <div className="ml-auto">
              <MiniSparkline
                data={sparklineData}
                width={56}
                height={20}
                color={sparklineColor || "currentColor"}
                strokeWidth={1.5}
                showDot
                dotRadius={2}
                className="opacity-60 group-hover:opacity-100 transition-opacity duration-300"
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Quick Action Card (Enhanced 2x2) ───────────────────────────────────────

interface QuickActionCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  gradient: string;
  onClick: () => void;
  index: number;
}

function QuickActionCard({ icon, title, subtitle, gradient, onClick, index }: QuickActionCardProps) {
  return (
    <motion.button
      variants={staggerChild}
      custom={index}
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="group relative flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card hover:bg-accent/50 text-left cursor-pointer w-full transition-all duration-200 hover:shadow-sm focus-ring-soft"
    >
      <div className="relative flex items-center justify-center h-8 w-8 rounded-lg bg-muted/80 group-hover:bg-muted shrink-0 transition-colors duration-200">
        <div className={`${gradient} bg-clip-text`}>{icon}</div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{title}</p>
        <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">{subtitle}</p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-foreground/50 group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
    </motion.button>
  );
}

// ─── Activity Timeline Item ──────────────────────────────────────────────────

interface ActivityTimelineItemProps {
  activity: ActivityItem;
  index: number;
  isLast: boolean;
}

function ActivityTimelineItem({ activity, index, isLast }: ActivityTimelineItemProps) {
  const colorClass = getActivityColor(activity.type);
  const Icon = ACTIVITY_ICONS[activity.type];

  return (
    <motion.div
      variants={activityChild}
      custom={index}
      className="relative flex items-center gap-2.5 group py-1.5"
    >
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-[11px] top-[26px] bottom-0 w-px bg-border/30" />
      )}
      {/* Timeline dot */}
      <div className={`relative z-10 flex items-center justify-center h-[22px] w-[22px] rounded-full shrink-0 ${colorClass}`}>
        <Icon className="h-3 w-3" />
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-foreground/75 truncate">{activity.description}</p>
        <p className="text-[10px] text-muted-foreground/50 mt-0.5">{activity.time}</p>
      </div>
    </motion.div>
  );
}

// ─── Todo Reminder Item ──────────────────────────────────────────────────────

interface TodoReminderProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
  colorClass: string;
  onClick: () => void;
}

function TodoReminder({ icon: Icon, label, count, colorClass, onClick }: TodoReminderProps) {
  if (count === 0) return null;
  return (
    <motion.button
      variants={fadeIn}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${colorClass} transition-all duration-200 hover:shadow-sm cursor-pointer w-full text-left`}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="text-xs font-medium flex-1">{label}</span>
      <Badge
        variant="secondary"
        className="h-5 px-1.5 text-[10px] font-bold tabular-nums"
      >
        {count}
      </Badge>
    </motion.button>
  );
}

// ─── Pipeline Overview Mini Component ─────────────────────────────────────

const PIPELINE_OVERVIEW_STAGES = [
  { id: "planned", label: "待生成", emoji: "💡", color: "text-amber-500", gradient: "bg-gradient-to-r from-amber-500 to-orange-500" },
  { id: "generated", label: "已生成", emoji: "🤖", color: "text-violet-500", gradient: "bg-gradient-to-r from-violet-500 to-purple-500" },
  { id: "optimized", label: "已优化", emoji: "✨", color: "text-emerald-500", gradient: "bg-gradient-to-r from-emerald-500 to-teal-500" },
  { id: "scheduled", label: "已排期", emoji: "📅", color: "text-cyan-500", gradient: "bg-gradient-to-r from-cyan-500 to-blue-500" },
  { id: "published", label: "已发布", emoji: "🚀", color: "text-rose-500", gradient: "bg-gradient-to-r from-rose-500 to-pink-500" },
];

function DashboardPipelineOverview() {
  const { contentPosts, setRightPanelTab, platform } = useAppStore();

  // Platform-aware colors for the "generated" stage
  const generatedGradient = platform === 'wechat'
    ? 'bg-gradient-to-r from-violet-500 to-purple-500'
    : 'bg-gradient-to-r from-rose-500 to-red-500';

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const stage of PIPELINE_OVERVIEW_STAGES) {
      counts[stage.id] = contentPosts.filter((p) => p.status === stage.id).length;
    }
    return counts;
  }, [contentPosts]);

  const total = contentPosts.length;

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="flex items-center gap-1.5">
          <BarChart3 className="h-3 w-3 text-muted-foreground" />
          <span className="text-[11px] font-medium text-foreground/70">内容流水线</span>
          <span className="text-[10px] text-muted-foreground/50 tabular-nums">{total} 条</span>
        </div>
        <button
          onClick={() => setRightPanelTab("workspace")}
          className="text-[10px] text-muted-foreground hover:text-foreground font-medium flex items-center gap-0.5 transition-colors"
        >
          管理
          <ArrowRight className="h-2.5 w-2.5" />
        </button>
      </div>
      <div className="flex items-center gap-1">
        {PIPELINE_OVERVIEW_STAGES.map((stage, i) => {
          const count = stageCounts[stage.id] || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <Fragment key={stage.id}>
              {i > 0 && (
                <div className="w-2 flex-shrink-0 flex items-center">
                  <div className="w-full h-px bg-border/40" />
                </div>
              )}
              <div className={`flex-1 flex flex-col items-center gap-0.5 cursor-pointer group py-1 rounded-lg hover:bg-muted/50 transition-colors relative ${count > 0 ? 'has-items' : ''}`} onClick={() => setRightPanelTab("workspace")}>
                <div className="text-xs relative">{stage.emoji}
                  {count > 0 && (
                    <span className="absolute -top-0.5 -right-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 ring-1 ring-background animate-pulse" />
                  )}
                </div>
                <div className={`text-[11px] font-semibold tabular-nums ${count > 0 ? "text-foreground" : "text-muted-foreground/40"}`}>
                  {count}
                </div>
                <div className="text-[9px] text-muted-foreground/60">{stage.label}</div>
                {count > 0 && (
                  <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${stage.id === 'generated' ? generatedGradient : stage.gradient}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(pct, 8)}%` }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                    />
                  </div>
                )}
              </div>
            </Fragment>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Main DashboardOverview ─────────────────────────────────────────────────

export function DashboardOverview() {
  const {
    contentPosts,
    platform,
    persona,
    setRightPanelTab,
    setLeftPanelTab,
    isGenerating,
    setIsGenerating,
    currentPlan,
    knowledgeItems,
  } = useAppStore();

  const [isOpen, setIsOpen] = useState(true);
  const mountedRef = useRef(false);

  // Set mounted flag after first paint to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      mountedRef.current = true;
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // ── Compute metrics ──────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const now = new Date();
    const todayStr = safeFormat(now, "yyyy-MM-dd");

    // This week's posts (Monday to Sunday)
    const weekStart = safeFormat(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const weekEnd = safeFormat(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const thisWeekPosts = contentPosts.filter(
      (p) => p.scheduledDate >= weekStart && p.scheduledDate <= weekEnd
    );

    // Last week's posts
    const lastWeekStart = safeFormat(subDays(parseISO(weekStart), 7), "yyyy-MM-dd");
    const lastWeekPosts = contentPosts.filter(
      (p) => p.scheduledDate >= lastWeekStart && p.scheduledDate < weekStart
    );

    // Total interactions
    const totalInteractions = contentPosts.reduce(
      (sum, p) => sum + p.likes + p.comments + p.shares + (p.favorites || 0),
      0
    );
    const lastWeekInteractions = lastWeekPosts.reduce(
      (sum, p) => sum + p.likes + p.comments + p.shares + (p.favorites || 0),
      0
    );

    // Average AI score
    const scoredPosts = contentPosts.filter((p) => p.aiScore > 0);
    const avgScore =
      scoredPosts.length > 0
        ? Math.round(scoredPosts.reduce((s, p) => s + p.aiScore, 0) / scoredPosts.length)
        : 0;

    // Content completion rate
    const completedPosts = contentPosts.filter(
      (p) => p.status === "published" || p.status === "optimized"
    );
    const completionRate =
      contentPosts.length > 0
        ? Math.round((completedPosts.length / contentPosts.length) * 100)
        : 0;

    // Trends
    const weekChange =
      lastWeekPosts.length > 0
        ? Math.round(((thisWeekPosts.length - lastWeekPosts.length) / lastWeekPosts.length) * 100)
        : thisWeekPosts.length > 0
          ? 100
          : 0;

    const interactionChange =
      lastWeekInteractions > 0
        ? Math.round(((totalInteractions - lastWeekInteractions) / lastWeekInteractions) * 100)
        : totalInteractions > 0
          ? 100
          : 0;

    // Generate sparkline data from posts by date
    const postsByDate = new Map<string, number>();
    for (const p of contentPosts) {
      const date = p.scheduledDate || "";
      if (!date) continue;
      const count = postsByDate.get(date) || 0;
      postsByDate.set(date, count + 1);
    }
    const sparklineDates = Array.from(postsByDate.keys()).sort();
    const sparklinePosts = sparklineDates.map(d => postsByDate.get(d) || 0);
    // Generate mock interaction trend data (7 points)
    const interactionSparkline = sparklinePosts.length >= 2
      ? sparklinePosts.slice(-7)
      : Array.from({ length: 7 }, (_, i) => Math.floor(Math.random() * 50) + 5);

    return {
      weekPosts: thisWeekPosts.length,
      weekTrend: weekChange,
      totalInteractions,
      interactionTrend: interactionChange,
      avgScore,
      scoreTrend: 0,
      completionRate,
      completionTrend: 0,
      sparklinePosts: sparklinePosts.slice(-10),
      interactionSparkline,
    };
  }, [contentPosts]);

  // Extract sparkline dates for reuse
  const sparklineDates = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of contentPosts) {
      const date = p.scheduledDate || "";
      if (!date) continue;
      map.set(date, (map.get(date) || 0) + 1);
    }
    return Array.from(map.keys()).sort();
  }, [contentPosts]);

  // ── Compute real activity feed from store data ─────────────────────
  const activities = useMemo(() => {
    const items: ActivityItem[] = [];
    const now = Date.now();

    // Helper: relative time label from ISO string
    const timeLabel = (iso: string): string => {
      const diff = now - new Date(iso).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return "刚刚";
      if (mins < 60) return `${mins}分钟前`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}小时前`;
      const days = Math.floor(hours / 24);
      if (days < 2) return "昨天";
      if (days < 7) return `${days}天前`;
      return safeFormat(iso, "M月d日");
    };

    // 1. Recently published posts
    const publishedPosts = contentPosts
      .filter((p) => p.status === "published" && p.publishedAt)
      .sort((a, b) => new Date(b.publishedAt!).getTime() - new Date(a.publishedAt!).getTime());
    for (const p of publishedPosts.slice(0, 2)) {
      items.push({
        id: `pub-${p.id}`,
        type: "publish",
        description: `发布了「${p.topic}」`,
        time: timeLabel(p.publishedAt!),
      });
    }

    // 2. AI-generated posts (status = generated or optimized)
    const aiPosts = contentPosts
      .filter((p) => (p.status === "generated" || p.status === "optimized") && p.content)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    const generatedCount = contentPosts.filter((p) => p.status === "generated").length;
    if (generatedCount > 0) {
      items.push({
        id: "ai-gen-batch",
        type: "ai-generate",
        description: `AI生成了${generatedCount}条内容`,
        time: aiPosts[0] ? timeLabel(aiPosts[0].updatedAt) : "今天",
      });
    }
    // Individual optimized posts
    const optimizedPosts = aiPosts.filter((p) => p.status === "optimized");
    for (const p of optimizedPosts.slice(0, 1)) {
      items.push({
        id: `opt-${p.id}`,
        type: "ai-generate",
        description: `AI优化了「${p.topic}」`,
        time: timeLabel(p.updatedAt),
      });
    }

    // 3. High AI-score posts
    const highScorePosts = contentPosts
      .filter((p) => p.aiScore > 0)
      .sort((a, b) => b.aiScore - a.aiScore);
    if (highScorePosts.length > 0) {
      const top = highScorePosts[0];
      items.push({
        id: `score-${top.id}`,
        type: "score-update",
        description: `「${top.topic}」AI评分 ${top.aiScore}`,
        time: timeLabel(top.updatedAt),
      });
    }
    // Average score entry
    const scoredPosts = contentPosts.filter((p) => p.aiScore > 0);
    if (scoredPosts.length >= 3) {
      const avg = Math.round(scoredPosts.reduce((s, p) => s + p.aiScore, 0) / scoredPosts.length);
      items.push({
        id: "avg-score",
        type: "score-update",
        description: `平均AI评分达到${avg}`,
        time: "本周",
      });
    }

    // 4. Knowledge base entry count
    if (knowledgeItems.length > 0) {
      const latestKnowledge = [...knowledgeItems].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )[0];
      items.push({
        id: "kb-count",
        type: "template-use",
        description: `知识库已录入${knowledgeItems.length}条内容`,
        time: latestKnowledge ? timeLabel(latestKnowledge.updatedAt) : "最近",
      });
    }

    // 5. Plan info
    if (currentPlan) {
      items.push({
        id: "plan-info",
        type: "template-use",
        description: `${currentPlan.month}内容计划已创建`,
        time: timeLabel(currentPlan.updatedAt || currentPlan.createdAt),
      });
    }

    // 6. Scheduled posts
    const scheduledPosts = contentPosts.filter((p) => p.status === "scheduled");
    if (scheduledPosts.length > 0) {
      items.push({
        id: "scheduled-info",
        type: "publish",
        description: `${scheduledPosts.length}条内容已排期待发布`,
        time: "今天",
      });
    }

    // Sort by most recent (approximation)
    items.sort((a, b) => {
      // Simple heuristic: “刚刚" > "分钟前" > "小时前" > "昨天" > "天前" > "本周" > "M月d日"
      const order: Record<string, number> = { "刚刚": 0, "分钟前": 1, "小时前": 2, "昨天": 3, "天前": 4, "本周": 5, "今天": 2.5 };
      const getOrder = (t: string) => {
        for (const [key, val] of Object.entries(order)) {
          if (t.includes(key)) return val;
        }
        return 6;
      };
      return getOrder(a.time) - getOrder(b.time);
    });

    // Pad with generic activities if fewer than 4
    const GENERIC: ActivityItem[] = [
      { id: "gen-1", type: "template-use" as const, description: `欢迎使用${platform === 'wechat' ? '朋友圈' : '小红书'}AI运营助手`, time: "今天" },
      { id: "gen-2", type: "ai-generate" as const, description: "开始创建你的第一条内容", time: "今天" },
    ];
    while (items.length < 4) {
      const next = GENERIC[items.length % GENERIC.length];
      if (!items.find((i) => i.id === next.id)) {
        items.push(next);
      } else {
        break;
      }
    }

    return items.slice(0, 4);
  }, [contentPosts, knowledgeItems, currentPlan, platform]);


  const reminders = useMemo(() => {
    const now = new Date();
    const todayStr = safeFormat(now, "yyyy-MM-dd");

    const overduePosts = contentPosts.filter(
      (p) => p.scheduledDate < todayStr && p.status !== "published"
    );

    const toOptimize = contentPosts.filter(
      (p) => p.status === "generated"
    );

    const emptyDays: string[] = [];
    for (let i = 0; i < 7; i++) {
      const dayStr = safeFormat(subDays(now, -i), "yyyy-MM-dd");
      const hasPosts = contentPosts.some((p) => p.scheduledDate === dayStr);
      if (!hasPosts) {
        emptyDays.push(dayStr);
      }
    }

    return {
      overdue: overduePosts.length,
      toOptimize: toOptimize.length,
      emptyDays: emptyDays.length,
    };
  }, [contentPosts]);

  // ── Action handlers ──────────────────────────────────────────────────

  const handleGenerateContent = useCallback(() => {
    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 3000);
  }, [setIsGenerating]);

  const handleViewReports = useCallback(() => {
    setRightPanelTab("data");
  }, [setRightPanelTab]);

  const handleManageKnowledge = useCallback(() => {
    setLeftPanelTab("knowledge");
  }, [setLeftPanelTab]);

  const handleAIInspiration = useCallback(() => {
    setRightPanelTab("workspace");
  }, [setRightPanelTab]);

  const handleViewCalendar = useCallback(() => {
    setLeftPanelTab("calendar");
  }, [setLeftPanelTab]);

  const handleOverdueClick = useCallback(() => {
    setRightPanelTab("workspace");
  }, [setRightPanelTab]);

  const handleOptimizeClick = useCallback(() => {
    setRightPanelTab("workspace");
  }, [setRightPanelTab]);

  const handleEmptyDaysClick = useCallback(() => {
    setLeftPanelTab("calendar");
  }, [setLeftPanelTab]);

  if (!mounted) return null;

  const platformLabel = platform === "wechat" ? "朋友圈" : "小红书";

  return (
    <TooltipProvider delayDuration={300}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="mx-3 mt-3 mb-2">
          <CollapsibleTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.002 }}
              whileTap={{ scale: 0.998 }}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-card border border-border/50 hover:border-border transition-all duration-200 cursor-pointer group"
            >
              <div className={`flex items-center justify-center h-8 w-8 rounded-lg ${platform === 'wechat' ? 'bg-gradient-to-br from-violet-500 to-purple-600' : 'bg-gradient-to-br from-rose-500 to-red-600'} shadow-sm`}>
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    {getGreeting()}{persona?.name ? `，${persona.name}` : ""}
                  </span>
                  <Badge
                    variant="secondary"
                    className={`text-[9px] px-1.5 py-0 h-4 font-medium ${
                      platform === "wechat"
                        ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                        : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                    }`}
                  >
                    {platformLabel}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {getFormattedDate()}
                </p>
              </div>
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </motion.div>
            </motion.button>
          </CollapsibleTrigger>

          <AnimatePresence>
            {isOpen && (
              <CollapsibleContent forceMount>
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 space-y-4">
                    {/* ── 4 Core Metric Cards with Animated Counters ── */}
                    <motion.div
                      variants={staggerContainer}
                      initial="hidden"
                      animate="show"
                      className="grid grid-cols-2 lg:grid-cols-4 gap-3"
                    >
                      <EnhancedTooltip title="本周发布数" description="本周已发布和排期发布的内容数量" shortcut="⌘1">
                        <div className="h-full">
                          <MetricCard
                            label="本周发布数"
                            numericValue={metrics.weekPosts}
                            icon={CalendarDays}
                            gradientBorder="border-violet-200 dark:border-violet-800/60"
                            iconBg="bg-gradient-to-br from-violet-500 to-purple-600"
                            trend={{ value: metrics.weekTrend, isPositive: metrics.weekTrend >= 0 }}
                            index={0}
                            sparklineData={metrics.sparklinePosts}
                            sparklineColor="#8b5cf6"
                          />
                        </div>
                      </EnhancedTooltip>
                      <EnhancedTooltip title="总互动量" description="所有内容的点赞、评论、收藏总数" shortcut="⌘2">
                        <div className="h-full">
                          <MetricCard
                            label="总互动量"
                            numericValue={metrics.totalInteractions}
                            icon={Heart}
                            gradientBorder="border-rose-200 dark:border-rose-800/60"
                            iconBg="bg-gradient-to-br from-rose-500 to-pink-600"
                            trend={{ value: metrics.interactionTrend, isPositive: metrics.interactionTrend >= 0 }}
                            index={1}
                            sparklineData={metrics.interactionSparkline}
                            sparklineColor="#f43f5e"
                          />
                        </div>
                      </EnhancedTooltip>
                      <EnhancedTooltip title="平均AI评分" description="所有已评分内容的AI质量得分均值">
                        <div className="h-full">
                          <MetricCard
                            label="平均AI评分"
                            numericValue={metrics.avgScore}
                            icon={Star}
                            gradientBorder="border-amber-200 dark:border-amber-800/60"
                            iconBg="bg-gradient-to-br from-amber-500 to-orange-600"
                            trend={{ value: metrics.scoreTrend, isPositive: metrics.scoreTrend >= 0 }}
                            index={2}
                            sparklineData={contentPosts.filter(p => p.aiScore > 0).slice(-7).map(p => p.aiScore)}
                            sparklineColor="#f59e0b"
                          />
                        </div>
                      </EnhancedTooltip>
                      <EnhancedTooltip title="内容完成率" description="已发布和已优化内容占总内容的百分比">
                        <div className="h-full">
                          <MetricCard
                            label="内容完成率"
                            numericValue={metrics.completionRate}
                            displaySuffix="%"
                            icon={CheckCircle}
                            gradientBorder="border-emerald-200 dark:border-emerald-800/60"
                            iconBg="bg-gradient-to-br from-emerald-500 to-teal-600"
                            trend={{ value: metrics.completionTrend, isPositive: metrics.completionTrend >= 0 }}
                            index={3}
                            sparklineData={sparklineDates.slice(-7).map(d => {
                              const dayPosts = contentPosts.filter(p => p.scheduledDate === d && (p.status === 'published' || p.status === 'optimized'));
                              return contentPosts.length > 0 ? Math.round((dayPosts.length / Math.max(contentPosts.filter(p => p.scheduledDate === d).length, 1)) * 100) : 0;
                            }).filter((_, i, arr) => arr.length > 0)}
                            sparklineColor="#10b981"
                          />
                        </div>
                      </EnhancedTooltip>
                    </motion.div>

                    {/* ── Quick Action Cards (Enhanced 2x2 Grid) ── */}
                    <div>
                      <div className="flex items-center gap-1.5 px-1 mb-1.5">
                        <Activity className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[11px] font-medium text-foreground/70">快速操作</span>
                      </div>
                      <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-2 gap-2.5"
                      >
                        <QuickActionCard
                          icon={<Bot className="h-4 w-4 text-white" />}
                          title="AI生成内容"
                          subtitle="智能创作，一键生成"
                          gradient="bg-gradient-to-r from-violet-500 to-purple-600"
                          onClick={handleGenerateContent}
                          index={0}
                        />
                        <QuickActionCard
                          icon={<CalendarRange className="h-4 w-4 text-white" />}
                          title="查看日历"
                          subtitle="内容排期一目了然"
                          gradient="bg-gradient-to-r from-emerald-500 to-teal-600"
                          onClick={handleViewCalendar}
                          index={1}
                        />
                        <QuickActionCard
                          icon={<BarChart3 className="h-4 w-4 text-white" />}
                          title="数据报告"
                          subtitle="运营数据分析洞察"
                          gradient="bg-gradient-to-r from-amber-500 to-orange-600"
                          onClick={handleViewReports}
                          index={2}
                        />
                        <QuickActionCard
                          icon={<Zap className="h-4 w-4 text-white" />}
                          title="爆款灵感"
                          subtitle="热门话题智能推荐"
                          gradient="bg-gradient-to-r from-rose-500 to-pink-600"
                          onClick={handleAIInspiration}
                          index={3}
                        />
                      </motion.div>
                    </div>

                    {/* ── Activity Feed Mini Timeline ── */}
                    <div>
                      <div className="flex items-center justify-between px-1 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[11px] font-medium text-foreground/70">最近动态</span>
                        </div>
                      </div>
                      <motion.div
                        variants={activityContainer}
                        initial="hidden"
                        animate="show"
                        className="px-1"
                      >
                        {activities.slice(0, 4).map((activity, i) => (
                          <ActivityTimelineItem
                            key={activity.id}
                            activity={activity}
                            index={i}
                            isLast={i === activities.slice(0, 4).length - 1}
                          />
                        ))}
                      </motion.div>
                    </div>

                    {/* ── Pipeline Overview Mini ── */}
                    <DashboardPipelineOverview />

                    {/* ── Todo Reminders ── */}
                    {(reminders.overdue > 0 || reminders.toOptimize > 0 || reminders.emptyDays > 0) && (
                      <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        animate="show"
                        className="space-y-2"
                      >
                        <div className="flex items-center gap-1.5 px-1">
                          <AlertTriangle className="h-3 w-3 text-amber-500" />
                          <span className="text-[11px] font-medium text-foreground/70">待办提醒</span>
                        </div>
                        <div className="space-y-1.5">
                          <TodoReminder
                            icon={Clock}
                            label="过期未发布的内容"
                            count={reminders.overdue}
                            colorClass="border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                            onClick={handleOverdueClick}
                          />
                          <TodoReminder
                            icon={FileText}
                            label="待优化内容"
                            count={reminders.toOptimize}
                            colorClass="border-violet-200 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-900/10 hover:bg-violet-50 dark:hover:bg-violet-900/20"
                            onClick={handleOptimizeClick}
                          />
                          <TodoReminder
                            icon={CalendarX}
                            label="近7天空白日"
                            count={reminders.emptyDays}
                            colorClass="border-rose-200 dark:border-rose-800/50 bg-rose-50/50 dark:bg-rose-900/10 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                            onClick={handleEmptyDaysClick}
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              </CollapsibleContent>
            )}
          </AnimatePresence>
        </div>
      </Collapsible>
    </TooltipProvider>
  );
}
