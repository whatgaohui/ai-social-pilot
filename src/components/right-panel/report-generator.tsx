"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  FileBarChart,
  Loader2,
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
  CalendarDays,
  Copy,
  Check,
  X,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Target,
  Zap,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

// ─── Types ──────────────────────────────────────────────────────────────

type PeriodType = "week" | "month" | "quarter" | "custom";

interface TimeRange {
  period: PeriodType;
  startDate?: Date;
  endDate?: Date;
}

interface ReportSection {
  key: string;
  title: string;
  enabled: boolean;
}

interface ReportOverview {
  totalPosts: number;
  publishedCount: number;
  publishRate: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalViews: number;
  totalFavorites: number;
  totalInteractions: number;
  avgScore: number;
}

interface TopPost {
  id: string;
  topic: string;
  contentType: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  favorites: number;
  engagement: number;
  contentPreview: string;
  aiScore: number;
}

interface TrendData {
  date: string;
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  postCount: number;
}

interface PlatformStats {
  total: number;
  published: number;
  engagement: number;
  avgEngagement: number;
}

interface ReportData {
  title: string;
  periodType: PeriodType;
  periodLabel: string;
  dateRange: { start: string; end: string };
  platform: string;
  generatedAt: string;
  templateName: string;
  sections: ReportSection[];
  overview?: ReportOverview;
  topPosts?: TopPost[];
  trends?: { dailyTrends: TrendData[]; summary: string };
  platformComparison?: {
    wechat: PlatformStats;
    xiaohongshu: PlatformStats;
    summary: string;
  };
  suggestions?: string[];
  historyId?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────

const PERIOD_OPTIONS: Array<{ value: PeriodType; label: string; icon: LucideIcon }> = [
  { value: "week", label: "本周", icon: CalendarDays },
  { value: "month", label: "本月", icon: CalendarDays },
  { value: "quarter", label: "本季度", icon: CalendarDays },
  { value: "custom", label: "自定义", icon: CalendarDays },
];

const STAT_CONFIG = [
  { key: "totalPosts" as const, label: "总发布", icon: PenTool, gradient: "from-violet-500 to-purple-600", bg: "bg-violet-50 dark:bg-violet-900/20" },
  { key: "totalInteractions" as const, label: "总互动", icon: Heart, gradient: "from-rose-500 to-pink-600", bg: "bg-rose-50 dark:bg-rose-900/20" },
  { key: "totalViews" as const, label: "总浏览", icon: Eye, gradient: "from-cyan-500 to-teal-600", bg: "bg-cyan-50 dark:bg-cyan-900/20" },
  { key: "avgScore" as const, label: "AI评分", icon: Star, gradient: "from-amber-400 to-yellow-500", bg: "bg-amber-50 dark:bg-amber-900/20", isScore: true },
];

// ─── Helpers ────────────────────────────────────────────────────────────

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + "w";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

function ChangeIndicator({ value }: { value: number }) {
  if (value === 0) return <Minus className="h-3 w-3 text-muted-foreground" />;
  if (value > 0) {
    return (
      <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
        <ArrowUpRight className="h-3 w-3" />
        +{value}%
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-rose-600 dark:text-rose-400 text-xs font-medium">
      <ArrowDownRight className="h-3 w-3" />
      {value}%
    </span>
  );
}

function buildTextReport(report: ReportData): string {
  const lines: string[] = [];
  lines.push(`📊 ${report.title}`);
  lines.push(`时间范围: ${report.dateRange.start} ~ ${report.dateRange.end}`);
  lines.push(`生成时间: ${new Date(report.generatedAt).toLocaleString("zh-CN")}`);
  lines.push("");

  if (report.overview) {
    const o = report.overview;
    lines.push("━━━ 📊 数据概览 ━━━");
    lines.push(`总发布: ${o.totalPosts} (已发布 ${o.publishedCount}, 发布率 ${o.publishRate}%)`);
    lines.push(`总互动: ${formatNum(o.totalInteractions)} (赞${o.totalLikes} 评${o.totalComments} 转${o.totalShares})`);
    lines.push(`总浏览: ${formatNum(o.totalViews)}`);
    lines.push(`平均AI评分: ${o.avgScore}`);
    lines.push("");
  }

  if (report.topPosts && report.topPosts.length > 0) {
    lines.push(`━━━ 🔥 内容表现 TOP${report.topPosts.length} ━━━`);
    report.topPosts.forEach((p, i) => {
      lines.push(`${i + 1}. ${p.topic}`);
      lines.push(`   类型: ${p.contentType} | 赞${p.likes} 评${p.comments} 转${p.shares} 浏${p.views}`);
      if (p.contentPreview) lines.push(`   ${p.contentPreview}...`);
    });
    lines.push("");
  }

  if (report.trends) {
    lines.push("━━━ 📈 互动趋势 ━━━");
    lines.push(report.trends.summary);
    if (report.trends.dailyTrends.length > 0) {
      lines.push("逐日数据:");
      report.trends.dailyTrends.forEach((d) => {
        lines.push(`  ${d.date}: ${d.postCount}篇, 互动${d.engagement}`);
      });
    }
    lines.push("");
  }

  if (report.platformComparison) {
    lines.push("━━━ 🔄 平台对比 ━━━");
    lines.push(report.platformComparison.summary);
    lines.push(`  朋友圈: ${report.platformComparison.wechat.total}篇, 平均互动${report.platformComparison.wechat.avgEngagement}`);
    lines.push(`  小红书: ${report.platformComparison.xiaohongshu.total}篇, 平均互动${report.platformComparison.xiaohongshu.avgEngagement}`);
    lines.push("");
  }

  if (report.suggestions && report.suggestions.length > 0) {
    lines.push("━━━ 💡 运营建议 ━━━");
    report.suggestions.forEach((s, i) => {
      lines.push(`${i + 1}. ${s}`);
    });
  }

  return lines.join("\n");
}

// ─── Animation ──────────────────────────────────────────────────────────

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

// ─── Skeleton ───────────────────────────────────────────────────────────

function ReportSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-28 rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-32 rounded-lg" />
      <Skeleton className="h-24 rounded-lg" />
    </div>
  );
}

// ─── Report Preview Card ────────────────────────────────────────────────

function ReportPreviewCard({ report, onAISummary, aiSummary, isGeneratingAI }: {
  report: ReportData;
  onAISummary: () => void;
  aiSummary: string;
  isGeneratingAI: boolean;
}) {
  const isXHS = report.platform === "xiaohongshu";
  const gradientFrom = isXHS ? "from-rose-600" : "from-violet-600";
  const gradientVia = isXHS ? "via-red-500" : "via-purple-500";
  const gradientTo = isXHS ? "to-pink-500" : "to-fuchsia-500";
  const o = report.overview;

  const scoreLabel = o
    ? o.avgScore >= 85
      ? "优秀"
      : o.avgScore >= 70
        ? "良好"
        : o.avgScore >= 50
          ? "中等"
          : "待改进"
    : "--";
  const scoreColor = o
    ? o.avgScore >= 85
      ? "text-emerald-300"
      : o.avgScore >= 70
        ? "text-teal-300"
        : o.avgScore >= 50
          ? "text-amber-300"
          : "text-rose-300"
    : "text-white";

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-3">
      {/* ── Header Card ── */}
      <motion.div variants={itemVariants}>
        <div className={`bg-gradient-to-br ${gradientFrom} ${gradientVia} ${gradientTo} rounded-xl p-4 text-white relative overflow-hidden`}>
          {/* 装饰背景 */}
          <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/5" />
          <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-white/5" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-white/20 text-white border-0 text-[10px] px-2 py-0.5">
                {report.periodLabel}
              </Badge>
              <Badge className="bg-white/20 text-white border-0 text-[10px] px-2 py-0.5">
                {isXHS ? "📕 小红书" : "💬 朋友圈"}
              </Badge>
            </div>
            <h2 className="text-base font-bold mb-0.5">{report.title}</h2>
            <p className="text-[10px] text-white/60">
              {report.dateRange.start} ~ {report.dateRange.end} · {new Date(report.generatedAt).toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Key Metrics ── */}
      {o && (
        <motion.div variants={itemVariants}>
          <div className="grid grid-cols-2 gap-2">
            {STAT_CONFIG.map((stat) => {
              const Icon = stat.icon;
              const value = o[stat.key];
              const numVal = typeof value === "number" ? value : 0;
              return (
                <div key={stat.key} className="rounded-lg border p-3 card-press">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`h-6 w-6 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                      <Icon className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{stat.label}</span>
                  </div>
                  <span className="text-lg font-bold tabular-nums">
                    {stat.isScore ? <>{numVal}<span className="text-xs font-normal text-muted-foreground ml-0.5">分</span></> : formatNum(numVal)}
                  </span>
                  {!stat.isScore && (
                    <span className="ml-2 text-[10px] text-muted-foreground">
                      {stat.key === "totalPosts" ? `(发布率${o.publishRate}%)` : `赞${o.totalLikes} 评${o.totalComments}`}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Content TOP5 ── */}
      {report.topPosts && report.topPosts.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2.5">
                <Target className="h-4 w-4 text-amber-500" />
                <h3 className="text-xs font-semibold">内容表现 TOP {report.topPosts.length}</h3>
              </div>
              <div className="space-y-2">
                {report.topPosts.map((post, idx) => (
                  <div key={post.id || idx} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                    <span className="text-sm font-bold text-amber-500 flex-shrink-0 w-5 text-center">
                      {["🥇", "🥈", "🥉", "4", "5"][idx]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{post.topic}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                        <span>♥{post.likes}</span>
                        <span>💬{post.comments}</span>
                        <span>↗{post.shares}</span>
                        <span>👁{post.views}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[9px] h-4 px-1 flex-shrink-0">
                      {post.contentType}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Interaction Trends ── */}
      {report.trends && (
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2.5">
                <TrendingUp className="h-4 w-4 text-violet-500" />
                <h3 className="text-xs font-semibold">互动趋势</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                {report.trends.summary}
              </p>
              {/* Mini trend chart */}
              {report.trends.dailyTrends.length > 1 && (
                <div className="flex items-end gap-1 h-12">
                  {report.trends.dailyTrends.map((d, i) => {
                    const maxE = Math.max(...report.trends!.dailyTrends.map((t) => t.engagement), 1);
                    const h = Math.max(4, (d.engagement / maxE) * 48);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                        <motion.div
                          className="w-full rounded-t-sm bg-gradient-to-t from-violet-500 to-purple-400"
                          initial={{ height: 0 }}
                          animate={{ height: h }}
                          transition={{ delay: i * 0.05, duration: 0.4 }}
                        />
                        <span className="text-[8px] text-muted-foreground">{d.date.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Platform Comparison ── */}
      {report.platformComparison && (
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2.5">
                <BarChart3 className="h-4 w-4 text-teal-500" />
                <h3 className="text-xs font-semibold">平台对比</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{report.platformComparison.summary}</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30">
                  <p className="text-[10px] text-muted-foreground mb-1">💬 朋友圈</p>
                  <p className="text-xs font-bold">{report.platformComparison.wechat.total} 篇</p>
                  <p className="text-[10px] text-muted-foreground">平均互动 {report.platformComparison.wechat.avgEngagement}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/30">
                  <p className="text-[10px] text-muted-foreground mb-1">📕 小红书</p>
                  <p className="text-xs font-bold">{report.platformComparison.xiaohongshu.total} 篇</p>
                  <p className="text-[10px] text-muted-foreground">平均互动 {report.platformComparison.xiaohongshu.avgEngagement}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Suggestions ── */}
      {report.suggestions && report.suggestions.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-yellow-200" />
                <h3 className="text-xs font-semibold text-white">
                  {report.periodType === "week" ? "下周" : report.periodType === "month" ? "下月" : "后续"}建议
                </h3>
              </div>
              <div className="space-y-1.5">
                {report.suggestions.map((s, idx) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <span className="text-yellow-200 text-xs mt-0.5 shrink-0">💡</span>
                    <p className="text-[11px] text-white/90 leading-relaxed">{s}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* ── AI Summary Section ── */}
      <motion.div variants={itemVariants}>
        <div className="space-y-2">
          {!aiSummary && !isGeneratingAI && (
            <Button
              onClick={onAISummary}
              className="w-full h-9 text-xs gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white"
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI 生成报告摘要
            </Button>
          )}
          {isGeneratingAI && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
              <span className="text-xs text-muted-foreground">AI 正在分析报告数据...</span>
            </div>
          )}
          {aiSummary && (
            <div className="rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/10 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">AI 摘要</span>
                <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400">
                  AI 生成
                </Badge>
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">{aiSummary}</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────

interface ReportGeneratorProps {
  onClose?: () => void;
}

export function ReportGenerator({ onClose }: ReportGeneratorProps) {
  const { platform } = useAppStore();
  const { copied, copy } = useCopyToClipboard();

  const [timeRange, setTimeRange] = useState<TimeRange>({ period: "week" });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [aiSummary, setAiSummary] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // ── Generate Report ───────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setReport(null);
    setAiSummary("");

    try {
      const body: Record<string, unknown> = {
        periodType: timeRange.period,
        platform,
      };
      if (timeRange.period === "custom" && timeRange.startDate) {
        body.customStart = timeRange.startDate.toISOString().split("T")[0];
      }
      if (timeRange.period === "custom" && timeRange.endDate) {
        body.customEnd = timeRange.endDate.toISOString().split("T")[0];
      }

      const res = await fetch("/api/report-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "生成失败");
      }

      const data = await res.json();
      setReport(data);
      toast.success(`${data.title}已生成`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "报告生成失败");
    } finally {
      setIsGenerating(false);
    }
  }, [timeRange, platform]);

  // ── AI Summary ────────────────────────────────────────────────────
  const handleAISummary = useCallback(async () => {
    if (!report) return;
    setIsGeneratingAI(true);
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analytics: report.overview,
          posts: report.topPosts,
          platform,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiSummary(data.analysis || "AI 暂时无法生成摘要");
        toast.success("AI 摘要已生成");
      } else {
        toast.error("AI 摘要生成失败");
      }
    } catch {
      toast.error("AI 摘要生成失败");
    } finally {
      setIsGeneratingAI(false);
    }
  }, [report, platform]);

  // ── Copy Report ───────────────────────────────────────────────────
  const handleCopy = useCallback(() => {
    if (!report) return;
    const text = buildTextReport(report);
    copy(text);
  }, [report, copy]);

  // ── Date range display ────────────────────────────────────────────
  const dateRangeLabel = useMemo(() => {
    switch (timeRange.period) {
      case "week": {
        const now = new Date();
        const start = new Date(now);
        start.setDate(now.getDate() - 7);
        return `${start.toLocaleDateString("zh-CN", { month: "short", day: "numeric" })} - ${now.toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}`;
      }
      case "month": {
        const now = new Date();
        const start = new Date(now);
        start.setMonth(now.getMonth() - 1);
        return `${start.toLocaleDateString("zh-CN", { month: "short", day: "numeric" })} - ${now.toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}`;
      }
      case "quarter": {
        const now = new Date();
        const start = new Date(now);
        start.setMonth(now.getMonth() - 3);
        return `${start.toLocaleDateString("zh-CN", { month: "short", day: "numeric" })} - ${now.toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}`;
      }
      case "custom":
        if (timeRange.startDate && timeRange.endDate) {
          return `${timeRange.startDate.toLocaleDateString("zh-CN", { month: "short", day: "numeric" })} - ${timeRange.endDate.toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}`;
        }
        return "请选择日期范围";
      default:
        return "";
    }
  }, [timeRange]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-1 flex-shrink-0">
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 px-2 text-xs gap-1">
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold truncate">运营报告生成器</h3>
          <p className="text-[10px] text-muted-foreground">支持自定义时间范围 · AI 摘要分析</p>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {/* ── Time Range Selector ── */}
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">时间范围</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {PERIOD_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isActive = timeRange.period === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setTimeRange((prev) => ({ ...prev, period: opt.value }))}
                    className={`flex items-center gap-1 h-7 px-3 rounded-full text-[11px] font-medium transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-sm"
                        : "bg-muted/80 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Custom Date Picker */}
            {timeRange.period === "custom" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2">
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5 justify-start">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {timeRange.startDate
                        ? `${timeRange.startDate.toLocaleDateString("zh-CN")} ~ ${timeRange.endDate?.toLocaleDateString("zh-CN") || "..." }`
                        : "选择日期范围"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={{ from: timeRange.startDate, to: timeRange.endDate }}
                      onSelect={(range) => {
                        if (range) {
                          setTimeRange((prev) => ({
                            ...prev,
                            startDate: range.from,
                            endDate: range.to,
                          }));
                        }
                      }}
                      numberOfMonths={1}
                    />
                    {timeRange.startDate && timeRange.endDate && (
                      <div className="p-2 border-t">
                        <Button size="sm" className="w-full h-7 text-xs" onClick={() => setCalendarOpen(false)}>
                          确认选择
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </motion.div>
            )}

            <p className="text-[10px] text-muted-foreground">{dateRangeLabel}</p>
          </motion.div>

          {/* ── Generate Button ── */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || (timeRange.period === "custom" && !timeRange.startDate)}
            className={`w-full h-9 text-xs gap-1.5 ${
              report
                ? "bg-muted text-muted-foreground hover:bg-muted/80"
                : "bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white"
            }`}
          >
            {isGenerating ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" />生成中...</>
            ) : report ? (
              <><FileBarChart className="h-3.5 w-3.5" />重新生成报告</>
            ) : (
              <><Sparkles className="h-3.5 w-3.5" />生成报告</>
            )}
          </Button>

          {/* ── Loading State ── */}
          {isGenerating && <ReportSkeleton />}

          {/* ── Empty State ── */}
          {!report && !isGenerating && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center py-8 text-center"
            >
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-3 shadow-lg">
                <FileBarChart className="h-7 w-7 text-white" />
              </div>
              <p className="text-xs text-muted-foreground max-w-[220px]">
                选择时间范围，生成包含数据概览、内容TOP5、互动趋势和运营建议的完整报告
              </p>
            </motion.div>
          )}

          {/* ── Report Preview ── */}
          <AnimatePresence>
            {report && !isGenerating && (
              <motion.div key="report" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <ReportPreviewCard
                  report={report}
                  onAISummary={handleAISummary}
                  aiSummary={aiSummary}
                  isGeneratingAI={isGeneratingAI}
                />

                {/* Export Buttons */}
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className={`flex-1 h-8 text-xs gap-1.5 ${copied ? "border-emerald-300 dark:border-emerald-700" : ""}`}
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <><Check className="h-3.5 w-3.5 text-emerald-500" />已复制</>
                    ) : (
                      <><Copy className="h-3.5 w-3.5" />复制报告</>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
