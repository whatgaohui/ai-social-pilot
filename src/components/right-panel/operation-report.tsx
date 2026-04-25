"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  FileBarChart,
  Loader2,
  RefreshCw,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Heart,
  MessageCircle,
  Share2,
  Eye,
  Star,
  PenTool,
  Target,
  Lightbulb,
  Rocket,
  ChevronRight,
  Award,
  BarChart3,
  Calendar,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { Platform } from "@/types";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ReportOverview {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalViews: number;
  avgScore: number;
  publishRate: number;
}

interface TopPostItem {
  id: string;
  topic: string;
  contentPreview: string;
  engagementSummary: string;
  engagement: number;
}

interface Trends {
  summary: string;
  engagementTrend: string;
  bestPerformingType: string;
  peakDay: string;
}

interface Suggestion {
  title: string;
  description: string;
}

interface NextPlanItem {
  focus: string;
  type: string;
  reason: string;
}

interface OperationReport {
  overview: ReportOverview;
  topPosts: TopPostItem[];
  contentTypeAnalysis: string;
  trends: Trends;
  aiInsights: string[];
  suggestions: Suggestion[];
  nextWeekPlan: NextPlanItem[];
}

type Period = "weekly" | "monthly";

// ─── Constants ──────────────────────────────────────────────────────────────

const RANK_BADGES = ["🥇", "🥈", "🥉"];

const STAT_CARDS = [
  { key: "totalPosts" as const, label: "总发布", icon: PenTool, gradient: "from-violet-500 to-purple-600", bgLight: "bg-violet-50 dark:bg-violet-900/20" },
  { key: "totalLikes" as const, label: "总点赞", icon: Heart, gradient: "from-rose-500 to-pink-600", bgLight: "bg-rose-50 dark:bg-rose-900/20" },
  { key: "totalComments" as const, label: "总评论", icon: MessageCircle, gradient: "from-amber-500 to-orange-600", bgLight: "bg-amber-50 dark:bg-amber-900/20" },
  { key: "totalShares" as const, label: "总转发", icon: Share2, gradient: "from-emerald-500 to-teal-600", bgLight: "bg-emerald-50 dark:bg-emerald-900/20" },
  { key: "totalViews" as const, label: "总浏览", icon: Eye, gradient: "from-cyan-500 to-teal-600", bgLight: "bg-cyan-50 dark:bg-cyan-900/20" },
  { key: "avgScore" as const, label: "平均评分", icon: Star, gradient: "from-amber-400 to-yellow-500", bgLight: "bg-amber-50 dark:bg-amber-900/20", isScore: true },
];

const SUGGESTION_ICONS: LucideIcon[] = [Target, Zap, Rocket, TrendingUp, Lightbulb];

const CHART_COLORS: Record<string, string> = {
  text: "#8b5cf6",
  image: "#10b981",
  video: "#f43f5e",
  mixed: "#f59e0b",
  story: "#a855f7",
  insight: "#06b6d4",
  interaction: "#f97316",
  seeding: "#ec4899",
  review: "#f59e0b",
  tutorial: "#06b6d4",
  drygoods: "#8b5cf6",
  vlog: "#14b8a6",
  daily: "#f97316",
  recommend: "#f43f5e",
  collection: "#6366f1",
};

// ─── Animation Variants ────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

// ─── Helper: Animated Counter ──────────────────────────────────────────────

function AnimatedCounter({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const prevValue = useRef(0);
  const frameRef = useRef<number>(0);
  const startTime = useRef<number>(0);

  useEffect(() => {
    const startVal = prevValue.current;
    startTime.current = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(startVal + (value - startVal) * eased));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        prevValue.current = value;
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value, duration]);

  return <span>{display.toLocaleString()}</span>;
}

// ─── Helper: Format number ─────────────────────────────────────────────────

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + "w";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

// ─── Helper: SVG Circle Progress ───────────────────────────────────────────

function CircleProgress({ value, size = 80, strokeWidth = 6 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.max(0, Math.min(100, value));

  let colorClass = "text-rose-500";
  let label = "待改进";
  if (clampedValue >= 85) { colorClass = "text-emerald-500"; label = "优秀"; }
  else if (clampedValue >= 70) { colorClass = "text-teal-500"; label = "良好"; }
  else if (clampedValue >= 50) { colorClass = "text-amber-500"; label = "中等"; }

  const gradientId = `scoreGrad-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={clampedValue >= 85 ? "#10b981" : clampedValue >= 70 ? "#14b8a6" : clampedValue >= 50 ? "#f59e0b" : "#ef4444"} />
            <stop offset="100%" stopColor={clampedValue >= 85 ? "#059669" : clampedValue >= 70 ? "#0d9488" : clampedValue >= 50 ? "#d97706" : "#dc2626"} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-muted/30" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={`url(#${gradientId})`} strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - (circumference * clampedValue) / 100 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-lg font-bold ${colorClass}`}>
          <AnimatedCounter value={clampedValue} />
        </span>
        <span className="text-[10px] text-muted-foreground -mt-0.5">{label}</span>
      </div>
    </div>
  );
}

// ─── Helper: Content Type Bar Chart ────────────────────────────────────────

function ContentTypeBarChart({ analysisStr }: { analysisStr: string }) {
  let typeData: Array<{ type: string; count: number; percentage: number; avgEngagement: number }> = [];

  try {
    const parsed = typeof analysisStr === "string" ? JSON.parse(analysisStr) : analysisStr;
    typeData = Array.isArray(parsed) ? parsed : [];
  } catch {
    // Fallback empty
  }

  const maxCount = Math.max(...typeData.map(t => t.count), 1);

  return (
    <div className="space-y-2.5">
      {typeData.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">暂无内容类型数据</p>
      ) : (
        typeData.map((item, idx) => {
          const color = CHART_COLORS[item.type] || ["#8b5cf6", "#10b981", "#f59e0b", "#f43f5e", "#06b6d4"][idx % 5];
          return (
            <motion.div
              key={item.type}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08, duration: 0.4 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-xs font-medium flex-1 truncate">{item.type}</span>
                <span className="text-[10px] text-muted-foreground">{item.count}篇</span>
                <span className="text-[10px] font-semibold" style={{ color }}>{item.percentage}%</span>
              </div>
              <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.count / maxCount) * 100}%` }}
                  transition={{ delay: idx * 0.1 + 0.2, duration: 0.7, ease: "easeOut" }}
                />
              </div>
            </motion.div>
          );
        })
      )}
      {typeData.length > 0 && (
        <p className="text-[10px] text-muted-foreground mt-1 pl-4">
          💡 表现最好的内容类型值得持续深耕，同时适当尝试新类型以拓展受众
        </p>
      )}
    </div>
  );
}

// ─── Loading Skeleton ──────────────────────────────────────────────────────

function ReportSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4 p-4"
    >
      {/* Header skeleton */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <Skeleton className="h-32 w-full rounded-none" />
      </Card>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>

      {/* Top posts skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>

      {/* Content type skeleton */}
      <Skeleton className="h-40 rounded-xl" />

      {/* AI insights skeleton */}
      <Skeleton className="h-44 rounded-xl" />

      {/* Suggestions skeleton */}
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      {/* Next plan skeleton */}
      <Skeleton className="h-20 rounded-xl" />
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function OperationReport() {
  const { platform, persona, knowledgeItems, contentPosts, setSelectedPostId } = useAppStore();
  const isXHS = platform === "xiaohongshu";

  const [period, setPeriod] = useState<Period>("weekly");
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState<OperationReport | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const handleGenerateReport = useCallback(async () => {
    setIsGenerating(true);
    setReport(null);
    try {
      const res = await fetch("/api/ai/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period,
          platform,
          persona: useAppStore.getState().persona,
          knowledgeItems: useAppStore.getState().knowledgeItems,
          contentPosts: useAppStore.getState().contentPosts,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "生成失败");
      }
      const data = await res.json();
      setReport(data.report);
      setGeneratedAt(data.generatedAt);
      toast.success(`${period === "weekly" ? "本周" : "本月"}运营报告已生成`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "报告生成失败，请重试");
    } finally {
      setIsGenerating(false);
    }
  }, [period, platform]);

  // Parse content type analysis
  const parsedContentTypeData: Array<{ type: string; count: number; percentage: number; avgEngagement: number }> = (() => {
    if (!report?.contentTypeAnalysis) return [];
    try {
      const parsed = typeof report.contentTypeAnalysis === "string" ? JSON.parse(report.contentTypeAnalysis) : report.contentTypeAnalysis;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  const bestPerformingType = parsedContentTypeData.length > 0
    ? parsedContentTypeData.reduce((a, b) => a.avgEngagement > b.avgEngagement ? a : b).type
    : null;

  // Score label
  const getScoreLabel = (score: number) => {
    if (score >= 85) return { text: "优秀", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30" };
    if (score >= 70) return { text: "良好", color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-100 dark:bg-teal-900/30" };
    if (score >= 50) return { text: "中等", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30" };
    return { text: "待改进", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-100 dark:bg-rose-900/30" };
  };

  const getTrendIcon = (trend: string) => {
    if (trend.includes("上升") || trend.includes("增长") || trend.includes("提升")) return <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />;
    if (trend.includes("下降") || trend.includes("减少") || trend.includes("降低")) return <TrendingDown className="h-3.5 w-3.5 text-rose-500" />;
    return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* ── Controls ───────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2"
        >
          {/* Period Toggle */}
          <div className="flex items-center h-8 rounded-full bg-muted/80 p-0.5">
            <button
              onClick={() => setPeriod("weekly")}
              className={`relative z-10 flex items-center gap-1 px-3 h-7 rounded-full text-xs font-medium transition-colors ${period === "weekly" ? "text-white" : "text-muted-foreground"}`}
            >
              <Calendar className="h-3 w-3" />
              本周
            </button>
            <button
              onClick={() => setPeriod("monthly")}
              className={`relative z-10 flex items-center gap-1 px-3 h-7 rounded-full text-xs font-medium transition-colors ${period === "monthly" ? "text-white" : "text-muted-foreground"}`}
            >
              <Calendar className="h-3 w-3" />
              本月
            </button>
            <motion.div
              className="absolute h-7 rounded-full"
              layoutId="period-indicator"
              style={{
                width: "calc(50% - 2px)",
                left: period === "weekly" ? "2px" : "calc(50%)",
              }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              <div className={`h-full w-full rounded-full ${platform === "wechat" ? "bg-violet-500" : "bg-rose-500"}`} />
            </motion.div>
          </div>

          <div className="flex-1" />

          {/* Generate / Regenerate Button */}
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button
              onClick={handleGenerateReport}
              disabled={isGenerating}
              size="sm"
              className={`h-8 text-xs gap-1.5 shadow-sm ${
                report
                  ? "bg-muted text-muted-foreground hover:bg-muted/80"
                  : `bg-gradient-to-r ${platform === "wechat" ? "from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700" : "from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700"} text-white`
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  生成中...
                </>
              ) : report ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  重新生成
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  生成报告
                </>
              )}
            </Button>
          </motion.div>
        </motion.div>

        {/* ── Loading State ──────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {isGenerating && !report && (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ReportSkeleton />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Empty State ────────────────────────────────────────────── */}
        {!report && !isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${platform === "wechat" ? "from-violet-500 to-purple-600" : "from-rose-500 to-red-600"} flex items-center justify-center mb-4 shadow-lg`}>
              <FileBarChart className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-sm font-semibold mb-1">
              {period === "weekly" ? "本周" : "本月"}运营报告
            </h3>
            <p className="text-xs text-muted-foreground mb-4 max-w-[200px]">
              AI 将分析你的{isXHS ? "笔记" : "内容"}数据，生成详细的运营洞察和改进建议
            </p>
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                onClick={handleGenerateReport}
                className={`bg-gradient-to-r ${platform === "wechat" ? "from-violet-500 to-purple-600" : "from-rose-500 to-red-600"} text-white shadow-md hover:shadow-lg transition-shadow`}
              >
                <Sparkles className="h-4 w-4 mr-1.5" />
                生成{period === "weekly" ? "本周" : "本月"}报告
              </Button>
            </motion.div>
          </motion.div>
        )}

        {/* ── Report Content ─────────────────────────────────────────── */}
        <AnimatePresence>
          {report && !isGenerating && (
            <motion.div
              key="report"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              {/* ── Report Header ──────────────────────────────────────── */}
              <motion.div variants={itemVariants}>
                <Card className="border-0 shadow-sm overflow-hidden">
                  <div className={`bg-gradient-to-br ${platform === "wechat" ? "from-violet-600 via-purple-600 to-fuchsia-600" : "from-rose-600 via-red-600 to-pink-600"} p-4`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-white/20 text-white border-0 text-[10px] px-2 py-0.5 backdrop-blur-sm">
                            {period === "weekly" ? "📅 本周" : "📆 本月"}
                          </Badge>
                          <Badge className="bg-white/20 text-white border-0 text-[10px] px-2 py-0.5 backdrop-blur-sm">
                            {isXHS ? "📕 小红书" : "💬 朋友圈"}
                          </Badge>
                        </div>
                        <h2 className="text-base font-bold text-white mb-1">
                          {period === "weekly" ? "本周" : "本月"}运营报告
                        </h2>
                        {generatedAt && (
                          <p className="text-[10px] text-white/60">
                            生成于 {new Date(generatedAt).toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                      </div>
                      <CircleProgress value={report.overview.avgScore} size={72} strokeWidth={5} />
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* ── Overview Stats Grid ────────────────────────────────── */}
              <motion.div variants={itemVariants}>
                <div className="grid grid-cols-3 gap-2">
                  {STAT_CARDS.map((stat) => {
                    const Icon = stat.icon;
                    const value = report.overview[stat.key];
                    const numVal = typeof value === "number" ? value : 0;
                    const scoreInfo = stat.isScore ? getScoreLabel(numVal) : null;

                    return (
                      <motion.div
                        key={stat.key}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <Card className="border-0 shadow-sm overflow-hidden">
                          <div className={`p-3 ${stat.bgLight}`}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className={`h-6 w-6 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                                <Icon className="h-3 w-3 text-white" />
                              </div>
                              {stat.isScore && scoreInfo ? (
                                <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 ${scoreInfo.bg} ${scoreInfo.color}`}>
                                  {scoreInfo.text}
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                  {numVal > 0 ? <ArrowUpRight className="h-2.5 w-2.5 text-emerald-500" /> : <Minus className="h-2.5 w-2.5" />}
                                </span>
                              )}
                            </div>
                            <div className="text-lg font-bold tabular-nums">
                              {stat.isScore ? (
                                <span>
                                  <AnimatedCounter value={numVal} />
                                  <span className="text-xs text-muted-foreground font-normal ml-0.5">分</span>
                                </span>
                              ) : (
                                <AnimatedCounter value={numVal} />
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>

              {/* ── Publish Rate ───────────────────────────────────────── */}
              <motion.div variants={itemVariants}>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium">发布率</span>
                      <span className="text-xs font-semibold">
                        {report.overview.publishRate}%
                        <span className="text-[10px] text-muted-foreground font-normal ml-1">
                          ({report.overview.totalPosts}篇中已发布)
                        </span>
                      </span>
                    </div>
                    <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(report.overview.publishRate, 100)}%` }}
                        transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* ── Top 3 Posts ────────────────────────────────────────── */}
              <motion.div variants={itemVariants}>
                <div className="flex items-center gap-2 mb-2.5">
                  <Award className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-semibold">Top 3 {isXHS ? "爆款笔记" : "爆款内容"}</h3>
                </div>
                <div className="space-y-2">
                  {report.topPosts.map((post, idx) => (
                    <motion.div
                      key={post.id || idx}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1, duration: 0.4 }}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <Card className="border-0 shadow-sm overflow-hidden cursor-pointer group/post" onClick={() => post.id && setSelectedPostId(post.id)}>
                        <CardContent className="p-3">
                          <div className="flex items-start gap-2.5">
                            <div className="text-xl mt-0.5 shrink-0">{RANK_BADGES[idx] || ""}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-xs font-semibold truncate">{post.topic || "未命名内容"}</h4>
                              </div>
                              <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed mb-1.5">
                                {post.contentPreview || "暂无内容预览"}
                              </p>
                              {/* Engagement bar */}
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                  <Heart className="h-2.5 w-2.5 text-rose-400" />
                                  {post.engagementSummary || formatNum(post.engagement || 0)}
                                </span>
                                <div className="flex-1">
                                  <div className="h-1 bg-muted/40 rounded-full overflow-hidden">
                                    <motion.div
                                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                                      initial={{ width: 0 }}
                                      animate={{ width: `${report.topPosts.length > 0 ? ((report.topPosts[0].engagement || 1) > 0 ? ((post.engagement || 0) / (report.topPosts[0].engagement || 1)) * 100 : 0) : 0}%` }}
                                      transition={{ delay: 0.4 + idx * 0.15, duration: 0.6 }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover/post:opacity-100 transition-opacity mt-1" />
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                  {report.topPosts.length === 0 && (
                    <Card className="border-0 shadow-sm">
                      <CardContent className="p-6 text-center">
                        <p className="text-xs text-muted-foreground">暂无{isXHS ? "笔记" : "内容"}数据</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </motion.div>

              {/* ── Content Type Analysis ──────────────────────────────── */}
              <motion.div variants={itemVariants}>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart3 className="h-4 w-4 text-teal-500" />
                      <h3 className="text-sm font-semibold">内容类型分布</h3>
                    </div>
                    <ContentTypeBarChart analysisStr={report.contentTypeAnalysis} />
                    {bestPerformingType && (
                      <div className="mt-3 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30">
                        <p className="text-[10px] text-emerald-700 dark:text-emerald-300">
                          <span className="font-semibold">推荐：</span>「{bestPerformingType}」类型平均互动最高，建议持续产出此类内容
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* ── Trends ─────────────────────────────────────────────── */}
              <motion.div variants={itemVariants}>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="h-4 w-4 text-violet-500" />
                      <h3 className="text-sm font-semibold">趋势分析</h3>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                      {report.trends?.summary || "暂无趋势数据"}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-lg bg-muted/50">
                        <p className="text-[10px] text-muted-foreground mb-1">互动趋势</p>
                        <div className="flex items-center gap-1.5">
                          {getTrendIcon(report.trends?.engagementTrend || "")}
                          <span className="text-xs font-medium">{report.trends?.engagementTrend || "平稳"}</span>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-muted/50">
                        <p className="text-[10px] text-muted-foreground mb-1">最佳类型</p>
                        <span className="text-xs font-medium">{report.trends?.bestPerformingType || "暂无"}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* ── AI Insights ────────────────────────────────────────── */}
              <motion.div variants={itemVariants}>
                <Card className="border-0 shadow-sm overflow-hidden">
                  <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-7 w-7 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
                        <Lightbulb className="h-4 w-4 text-yellow-200" />
                      </div>
                      <h3 className="text-sm font-semibold text-white">AI 洞察</h3>
                    </div>
                    <div className="space-y-2">
                      {report.aiInsights.map((insight, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.08, duration: 0.3 }}
                          className="flex items-start gap-2"
                        >
                          <span className="text-yellow-200 text-xs mt-0.5 shrink-0">💡</span>
                          <p className="text-xs text-white/90 leading-relaxed">{insight}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* ── Suggestions ────────────────────────────────────────── */}
              {report.suggestions.length > 0 && (
                <motion.div variants={itemVariants}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <Rocket className="h-4 w-4 text-rose-500" />
                    <h3 className="text-sm font-semibold">改进建议</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {report.suggestions.map((suggestion, idx) => {
                      const Icon = SUGGESTION_ICONS[idx % SUGGESTION_ICONS.length];
                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.08 }}
                          whileHover={{ scale: 1.02 }}
                        >
                          <Card className="border-0 shadow-sm h-full">
                            <CardContent className="p-3">
                              <div className={`h-6 w-6 rounded-lg bg-gradient-to-br ${["from-rose-500 to-pink-600", "from-amber-500 to-orange-600", "from-emerald-500 to-teal-600", "from-violet-500 to-purple-600", "from-cyan-500 to-teal-600"][idx % 5]} flex items-center justify-center mb-2`}>
                                <Icon className="h-3 w-3 text-white" />
                              </div>
                              <h4 className="text-xs font-semibold mb-1">{suggestion.title}</h4>
                              <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-3">{suggestion.description}</p>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* ── Next Period Plan ───────────────────────────────────── */}
              {report.nextWeekPlan.length > 0 && (
                <motion.div variants={itemVariants}>
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Zap className="h-4 w-4 text-amber-500" />
                        <h3 className="text-sm font-semibold">
                          {period === "weekly" ? "下周" : "下月"}内容规划
                        </h3>
                      </div>
                      <div className="space-y-2.5">
                        {report.nextWeekPlan.map((plan, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1, duration: 0.3 }}
                            className="flex items-start gap-2.5"
                          >
                            <div className={`h-6 w-6 rounded-full bg-gradient-to-br ${["from-amber-400 to-orange-500", "from-emerald-400 to-teal-500", "from-violet-400 to-purple-500", "from-rose-400 to-pink-500"][idx % 4]} flex items-center justify-center shrink-0`}>
                              <span className="text-[10px] font-bold text-white">{idx + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-medium">{plan.focus}</span>
                                <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                                  {plan.type}
                                </Badge>
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{plan.reason}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* ── Regenerate at bottom ──────────────────────────────── */}
              <motion.div variants={itemVariants} className="pb-4">
                <Separator className="mb-3" />
                <div className="flex justify-center">
                  <motion.div whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleGenerateReport}
                      disabled={isGenerating}
                      className="text-xs text-muted-foreground gap-1.5"
                    >
                      <RefreshCw className={`h-3 w-3 ${isGenerating ? "animate-spin" : ""}`} />
                      重新生成报告
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ScrollArea>
  );
}
