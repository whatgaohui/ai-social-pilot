"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  BookOpen,
  Lightbulb,
  AlertTriangle,
  Clock,
  FileText,
  CalendarX,
} from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek, startOfDay, differenceInDays, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";

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
  return format(new Date(), "yyyy年M月d日 EEEE", { locale: zhCN });
}

// ─── Metric Card ─────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  gradientBorder: string;
  iconBg: string;
  trend: { value: number; isPositive: boolean };
  index: number;
}

function MetricCard({
  label,
  value,
  icon: Icon,
  gradientBorder,
  iconBg,
  trend,
  index,
}: MetricCardProps) {
  return (
    <motion.div
      variants={staggerChild}
      custom={index}
      className="group relative"
    >
      <div
        className={`relative rounded-xl border p-4 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${gradientBorder}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium mb-1 truncate">
              {label}
            </p>
            <motion.p
              className="text-2xl font-bold tabular-nums tracking-tight"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.08 + 0.2, type: "spring", stiffness: 300 }}
            >
              {value}
            </motion.p>
          </div>
          <div className={`flex items-center justify-center h-10 w-10 rounded-lg ${iconBg} transition-transform duration-300 group-hover:scale-110`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          {trend.value !== 0 && (
            <Badge
              variant="secondary"
              className={`text-[10px] px-1.5 py-0 h-5 font-semibold tabular-nums ${
                trend.isPositive
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
              }`}
            >
              {trend.isPositive ? "▲" : "▼"}{Math.abs(trend.value)}%
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground">较上周</span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Quick Action Button ────────────────────────────────────────────────────

interface QuickActionProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  gradient: string;
  onClick: () => void;
  index: number;
}

function QuickAction({ icon: Icon, label, gradient, onClick, index }: QuickActionProps) {
  return (
    <motion.button
      variants={staggerChild}
      custom={index}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/60 bg-card/60 hover:bg-card transition-all duration-200 hover:shadow-md cursor-pointer group min-w-[80px]"
    >
      <div className={`relative flex items-center justify-center h-10 w-10 rounded-xl ${gradient} transition-transform duration-300 group-hover:scale-110`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <span className="text-[11px] font-medium text-foreground/80 group-hover:text-foreground transition-colors whitespace-nowrap">
        {label}
      </span>
    </motion.button>
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
  // Using setTimeout to satisfy the lint rule about setState in effects
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
    const todayStr = format(now, "yyyy-MM-dd");

    // This week's posts (Monday to Sunday)
    const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const thisWeekPosts = contentPosts.filter(
      (p) => p.scheduledDate >= weekStart && p.scheduledDate <= weekEnd
    );

    // Last week's posts
    const lastWeekStart = format(subDays(parseISO(weekStart), 7), "yyyy-MM-dd");
    const lastWeekPosts = contentPosts.filter(
      (p) => p.scheduledDate >= lastWeekStart && p.scheduledDate < weekStart
    );

    // Total interactions (likes + comments + shares + (favorites or 0))
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

    // Trends (percentage change vs last week)
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

    return {
      weekPosts: thisWeekPosts.length,
      weekTrend: weekChange,
      totalInteractions,
      interactionTrend: interactionChange,
      avgScore,
      scoreTrend: 0, // placeholder - no historical score data
      completionRate,
      completionTrend: 0, // placeholder
    };
  }, [contentPosts]);

  // ── Compute todo reminders ───────────────────────────────────────────

  const reminders = useMemo(() => {
    const now = new Date();
    const todayStr = format(now, "yyyy-MM-dd");

    // Overdue unpublished posts (scheduled before today, not published)
    const overduePosts = contentPosts.filter(
      (p) => p.scheduledDate < todayStr && p.status !== "published"
    );

    // Posts needing optimization (status = generated, not optimized)
    const toOptimize = contentPosts.filter(
      (p) => p.status === "generated"
    );

    // Calculate empty days in the next 7 days
    const emptyDays: string[] = [];
    for (let i = 0; i < 7; i++) {
      const dayStr = format(subDays(now, -i), "yyyy-MM-dd");
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
    // Simulate AI generation
    setTimeout(() => setIsGenerating(false), 3000);
  }, [setIsGenerating]);

  const handleViewReports = useCallback(() => {
    setRightPanelTab("data");
  }, [setRightPanelTab]);

  const handleManageKnowledge = useCallback(() => {
    setLeftPanelTab("knowledge");
  }, [setLeftPanelTab]);

  const handleAIInspiration = useCallback(() => {
    // Could open an inspiration panel in the future
    setRightPanelTab("workspace");
  }, [setRightPanelTab]);

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
        <div className="mx-4 mt-3 mb-2">
          <CollapsibleTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.005 }}
              whileTap={{ scale: 0.995 }}
              className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-500/5 via-purple-500/5 to-rose-500/5 dark:from-violet-500/10 dark:via-purple-500/10 dark:to-rose-500/10 border border-border/50 hover:border-border transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-200/50 dark:shadow-violet-900/30">
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
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}
                  >
                    {platformLabel}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
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
                    {/* ── 4 Core Metric Cards ── */}
                    <motion.div
                      variants={staggerContainer}
                      initial="hidden"
                      animate="show"
                      className="grid grid-cols-2 lg:grid-cols-4 gap-3"
                    >
                      <MetricCard
                        label="本周发布数"
                        value={metrics.weekPosts}
                        icon={CalendarDays}
                        gradientBorder="border-violet-200 dark:border-violet-800/60"
                        iconBg="bg-gradient-to-br from-violet-500 to-purple-600"
                        trend={{ value: metrics.weekTrend, isPositive: metrics.weekTrend >= 0 }}
                        index={0}
                      />
                      <MetricCard
                        label="总互动量"
                        value={metrics.totalInteractions > 999
                          ? `${(metrics.totalInteractions / 1000).toFixed(1)}k`
                          : metrics.totalInteractions}
                        icon={Heart}
                        gradientBorder="border-rose-200 dark:border-rose-800/60"
                        iconBg="bg-gradient-to-br from-rose-500 to-pink-600"
                        trend={{ value: metrics.interactionTrend, isPositive: metrics.interactionTrend >= 0 }}
                        index={1}
                      />
                      <MetricCard
                        label="平均AI评分"
                        value={metrics.avgScore > 0 ? `${metrics.avgScore}` : "--"}
                        icon={Star}
                        gradientBorder="border-amber-200 dark:border-amber-800/60"
                        iconBg="bg-gradient-to-br from-amber-500 to-orange-600"
                        trend={{ value: metrics.scoreTrend, isPositive: metrics.scoreTrend >= 0 }}
                        index={2}
                      />
                      <MetricCard
                        label="内容完成率"
                        value={`${metrics.completionRate}%`}
                        icon={CheckCircle}
                        gradientBorder="border-emerald-200 dark:border-emerald-800/60"
                        iconBg="bg-gradient-to-br from-emerald-500 to-teal-600"
                        trend={{ value: metrics.completionTrend, isPositive: metrics.completionTrend >= 0 }}
                        index={3}
                      />
                    </motion.div>

                    {/* ── Quick Actions ── */}
                    <motion.div
                      variants={staggerContainer}
                      initial="hidden"
                      animate="show"
                      className="flex items-center gap-3 overflow-x-auto pb-1"
                    >
                      <QuickAction
                        icon={isGenerating ? Sparkles : Sparkles}
                        label="生成今日内容"
                        gradient="bg-gradient-to-br from-violet-500 to-purple-600"
                        onClick={handleGenerateContent}
                        index={0}
                      />
                      <QuickAction
                        icon={BarChart3}
                        label="查看运营报告"
                        gradient="bg-gradient-to-br from-rose-500 to-pink-600"
                        onClick={handleViewReports}
                        index={1}
                      />
                      <QuickAction
                        icon={BookOpen}
                        label="管理知识库"
                        gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
                        onClick={handleManageKnowledge}
                        index={2}
                      />
                      <QuickAction
                        icon={Lightbulb}
                        label="AI灵感推荐"
                        gradient="bg-gradient-to-br from-amber-500 to-orange-600"
                        onClick={handleAIInspiration}
                        index={3}
                      />
                    </motion.div>

                    {/* ── Todo Reminders ── */}
                    {(reminders.overdue > 0 || reminders.toOptimize > 0 || reminders.emptyDays > 0) && (
                      <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        animate="show"
                        className="space-y-2"
                      >
                        <div className="flex items-center gap-1.5 px-1">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                          <span className="text-xs font-semibold text-foreground/80">待办提醒</span>
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
