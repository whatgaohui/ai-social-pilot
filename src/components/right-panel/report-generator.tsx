"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
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
  Calendar,
  Copy,
  Printer,
  ArrowUpRight,
  ArrowDownRight,
  X,
  CheckCircle2,
  Lightbulb,
  BarChart3,
  Target,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AnalyticsData {
  totalPosts: number;
  publishedCount: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalViews: number;
  avgScore: number;
  typeDistribution: Record<string, number>;
  topPosts: Array<{
    id: string;
    topic: string;
    contentType: string;
    likes: number;
    comments: number;
    shares: number;
  }>;
}

interface ReportData {
  title: string;
  period: "weekly" | "monthly";
  dateRange: string;
  generatedAt: string;
  overview: {
    totalPosts: number;
    totalEngagement: number;
    publishRate: number;
    avgScore: number;
  };
  contentAnalysis: string;
  topPosts: Array<{ topic: string; engagement: number; likes: number; comments: number; shares: number }>;
  growth: {
    postsChange: number;
    engagementChange: number;
    scoreChange: number;
  };
  suggestions: string[];
}

// ─── Animation Variants ────────────────────────────────────────────────────

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + "w";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

function formatDateRange(period: "weekly" | "monthly"): string {
  const now = new Date();
  const endDate = now.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
  let startDate: string;

  if (period === "weekly") {
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    startDate = start.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
  } else {
    const start = new Date(now);
    start.setDate(now.getDate() - 30);
    startDate = start.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
  }

  return `${startDate} - ${endDate}`;
}

function getWeekNumber(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 604800000;
  const weekNum = Math.ceil((diff / oneWeek) + 1);
  return `第${weekNum}周`;
}

function ChangeIndicator({ value }: { value: number }) {
  if (value === 0) return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
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

// ─── Print-Specific Report Preview ──────────────────────────────────────────

function ReportPreview({ report, platform }: { report: ReportData; platform: string }) {
  const isXHS = platform === "xiaohongshu";
  const gradientFrom = isXHS ? "from-rose-600" : "from-violet-600";
  const gradientVia = isXHS ? "via-red-600" : "via-purple-600";
  const gradientTo = isXHS ? "to-pink-600" : "to-fuchsia-600";

  return (
    <div className="report-preview space-y-4">
      {/* Report Header */}
      <div className={`bg-gradient-to-br ${gradientFrom} ${gradientVia} ${gradientTo} rounded-xl p-5 text-white print:break-inside-avoid`}>
        <div className="flex items-center gap-2 mb-2">
          <Badge className="bg-white/20 text-white border-0 text-[10px] px-2 py-0.5">
            {report.period === "weekly" ? "📅 周报" : "📆 月报"}
          </Badge>
          <Badge className="bg-white/20 text-white border-0 text-[10px] px-2 py-0.5">
            {isXHS ? "📕 小红书" : "💬 朋友圈"}
          </Badge>
        </div>
        <h1 className="text-lg font-bold mb-1">{report.title}</h1>
        <p className="text-[11px] text-white/60">
          {report.dateRange} · 生成于 {report.generatedAt}
        </p>
      </div>

      {/* Data Overview */}
      <div className="grid grid-cols-2 gap-3 print:break-inside-avoid">
        <div className="rounded-lg border p-3">
          <div className="flex items-center gap-2 mb-1">
            <PenTool className="h-3.5 w-3.5 text-violet-500" />
            <span className="text-[10px] text-muted-foreground">总发布</span>
          </div>
          <span className="text-xl font-bold">{report.overview.totalPosts}</span>
        </div>
        <div className="rounded-lg border p-3">
          <div className="flex items-center gap-2 mb-1">
            <Heart className="h-3.5 w-3.5 text-rose-500" />
            <span className="text-[10px] text-muted-foreground">总互动</span>
          </div>
          <span className="text-xl font-bold">{formatNum(report.overview.totalEngagement)}</span>
        </div>
        <div className="rounded-lg border p-3">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-[10px] text-muted-foreground">发布率</span>
          </div>
          <span className="text-xl font-bold">{report.overview.publishRate}%</span>
        </div>
        <div className="rounded-lg border p-3">
          <div className="flex items-center gap-2 mb-1">
            <Star className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-[10px] text-muted-foreground">平均AI评分</span>
          </div>
          <span className="text-xl font-bold">{report.overview.avgScore}</span>
        </div>
      </div>

      {/* Growth Trends */}
      <div className="rounded-lg border p-4 print:break-inside-avoid">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-violet-500" />
          <h3 className="text-sm font-semibold">增长趋势</h3>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">发布量</span>
            <ChangeIndicator value={report.growth.postsChange} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">互动量</span>
            <ChangeIndicator value={report.growth.engagementChange} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">AI评分</span>
            <ChangeIndicator value={report.growth.scoreChange} />
          </div>
        </div>
      </div>

      {/* Content Analysis */}
      <div className="rounded-lg border p-4 print:break-inside-avoid">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold">内容分析</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {report.contentAnalysis}
        </p>
      </div>

      {/* Top Posts */}
      {report.topPosts.length > 0 && (
        <div className="rounded-lg border p-4 print:break-inside-avoid">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-semibold">表现最佳内容</h3>
          </div>
          <div className="space-y-2">
            {report.topPosts.map((post, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-xs font-bold text-amber-500 flex-shrink-0 w-4">
                  {idx + 1}.
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{post.topic}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>♥{formatNum(post.likes)}</span>
                    <span>💬{formatNum(post.comments)}</span>
                    <span>↗{formatNum(post.shares)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      <div className="rounded-lg border p-4 print:break-inside-avoid">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-violet-500" />
          <h3 className="text-sm font-semibold">运营建议</h3>
        </div>
        <div className="space-y-2">
          {report.suggestions.map((s, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-xs text-violet-500 flex-shrink-0">💡</span>
              <p className="text-xs text-muted-foreground leading-relaxed">{s}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Loading Skeleton ───────────────────────────────────────────────────────

function ReportGeneratorSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-24 rounded-xl" />
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

// ─── Main Component ────────────────────────────────────────────────────────

interface ReportGeneratorProps {
  onClose?: () => void;
}

export function ReportGenerator({ onClose }: ReportGeneratorProps) {
  const { platform, contentPosts } = useAppStore();
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch("/api/analytics");
        if (res.ok) setAnalytics(await res.json());
      } catch {
        // ignore
      }
    };
    fetchAnalytics();
  }, []);

  // Generate report from data (no AI needed - computed locally)
  const handleGenerate = useCallback(() => {
    setIsGenerating(true);
    setReport(null);

    // Use a timeout to show loading state
    setTimeout(() => {
      try {
        const posts = contentPosts;
        const now = new Date();

        // Compute period posts
        const periodStart = new Date(now);
        if (period === "weekly") {
          periodStart.setDate(now.getDate() - 7);
        } else {
          periodStart.setDate(now.getDate() - 30);
        }
        periodStart.setHours(0, 0, 0, 0);

        const periodPosts = posts.filter((p) => new Date(p.scheduledDate) >= periodStart);
        const totalPosts = periodPosts.length;
        const publishedPosts = periodPosts.filter((p) => p.status === "published");
        const totalEngagement = periodPosts.reduce(
          (a, p) => a + p.likes + p.comments + p.shares,
          0
        );
        const publishRate = totalPosts > 0 ? Math.round((publishedPosts.length / totalPosts) * 100) : 0;
        const avgScore = periodPosts.length > 0
          ? Math.round(periodPosts.reduce((a, p) => a + p.aiScore, 0) / periodPosts.length)
          : 0;

        // Previous period for growth comparison
        const prevPeriodStart = new Date(periodStart);
        if (period === "weekly") {
          prevPeriodStart.setDate(periodStart.getDate() - 7);
        } else {
          prevPeriodStart.setDate(periodStart.getDate() - 30);
        }
        const prevPosts = posts.filter((p) => {
          const d = new Date(p.scheduledDate);
          return d >= prevPeriodStart && d < periodStart;
        });
        const prevEngagement = prevPosts.reduce(
          (a, p) => a + p.likes + p.comments + p.shares,
          0
        );
        const prevAvgScore = prevPosts.length > 0
          ? Math.round(prevPosts.reduce((a, p) => a + p.aiScore, 0) / prevPosts.length)
          : 0;

        const postsChange = prevPosts.length > 0 ? Math.round(((totalPosts - prevPosts.length) / prevPosts.length) * 100) : 0;
        const engagementChange = prevEngagement > 0 ? Math.round(((totalEngagement - prevEngagement) / prevEngagement) * 100) : 0;
        const scoreChange = prevAvgScore > 0 ? avgScore - prevAvgScore : 0;

        // Top posts by engagement
        const topPosts = periodPosts
          .map((p) => ({
            topic: p.topic || "未命名",
            engagement: p.likes + p.comments * 2 + p.shares * 3,
            likes: p.likes,
            comments: p.comments,
            shares: p.shares,
          }))
          .sort((a, b) => b.engagement - a.engagement)
          .slice(0, 5);

        // Content type analysis
        const typeCount: Record<string, number> = {};
        periodPosts.forEach((p) => {
          typeCount[p.contentType] = (typeCount[p.contentType] || 0) + 1;
        });
        const typeEntries = Object.entries(typeCount).sort((a, b) => b[1] - a[1]);
        const contentAnalysis =
          typeEntries.length > 0
            ? `本${period === "weekly" ? "周" : "月"}共发布 ${totalPosts} 条内容，其中已发布 ${publishedPosts.length} 条。内容类型分布：${typeEntries.map(([t, c]) => `${t}(${c}条)`).join("、")}。${topPosts.length > 0 ? `表现最佳的内容为"${topPosts[0].topic}"，综合互动量 ${formatNum(topPosts[0].engagement)}。` : ""}`
            : `本${period === "weekly" ? "周" : "月"}暂无发布内容。`;

        // Generate suggestions based on data
        const suggestions: string[] = [];
        if (publishRate < 60) {
          suggestions.push(`当前发布率仅 ${publishRate}%，建议提高内容执行力，争取达到80%以上的发布率。`);
        } else {
          suggestions.push("内容发布率保持良好，建议维持当前的创作节奏。");
        }
        if (avgScore < 70) {
          suggestions.push(`平均AI评分为 ${avgScore} 分，建议对低分内容进行优化，重点关注标题吸引力和内容质量。`);
        } else {
          suggestions.push(`内容质量评分 ${avgScore} 分表现${avgScore >= 85 ? "优秀" : "良好"}，建议继续保持并尝试突破。`);
        }
        if (typeEntries.length === 1) {
          suggestions.push(`内容类型较为单一（仅${typeEntries[0][0]}），建议尝试多样化的内容形式以拓展受众。`);
        } else if (typeEntries.length >= 3) {
          suggestions.push("内容类型丰富，多样性好。建议找出表现最佳的类型并加大投入。");
        }
        if (engagementChange > 0) {
          suggestions.push(`互动量较上期增长 ${engagementChange}%，势头良好！建议分析增长原因并持续优化。`);
        } else if (engagementChange < -10) {
          suggestions.push(`互动量较上期下降 ${Math.abs(engagementChange)}%，建议检查近期内容是否有偏离受众喜好的情况。`);
        }

        const title =
          period === "weekly"
            ? `${getWeekNumber()}运营报告`
            : `${now.getFullYear()}年${now.getMonth() + 1}月运营报告`;

        const generatedReport: ReportData = {
          title,
          period,
          dateRange: formatDateRange(period),
          generatedAt: now.toLocaleString("zh-CN"),
          overview: {
            totalPosts,
            totalEngagement,
            publishRate,
            avgScore,
          },
          contentAnalysis,
          topPosts,
          growth: {
            postsChange,
            engagementChange,
            scoreChange,
          },
          suggestions: suggestions.length > 0 ? suggestions : ["暂无建议，持续积累数据以获得更精准的分析。"],
        };

        setReport(generatedReport);
        toast.success(`${period === "weekly" ? "周报" : "月报"}已生成`);
      } catch {
        toast.error("报告生成失败");
      } finally {
        setIsGenerating(false);
      }
    }, 800);
  }, [period, contentPosts]);

  // Copy report as text
  const handleCopy = useCallback(() => {
    if (!report) return;

    const text = [
      `${report.title}`,
      `${report.dateRange}`,
      "",
      "━━━ 数据概览 ━━━",
      `总发布: ${report.overview.totalPosts}`,
      `总互动: ${formatNum(report.overview.totalEngagement)}`,
      `发布率: ${report.overview.publishRate}%`,
      `平均AI评分: ${report.overview.avgScore}`,
      "",
      "━━━ 增长趋势 ━━━",
      `发布量变化: ${report.growth.postsChange > 0 ? "+" : ""}${report.growth.postsChange}%`,
      `互动量变化: ${report.growth.engagementChange > 0 ? "+" : ""}${report.growth.engagementChange}%`,
      `评分变化: ${report.growth.scoreChange > 0 ? "+" : ""}${report.growth.scoreChange}`,
      "",
      "━━━ 内容分析 ━━━",
      report.contentAnalysis,
      "",
      "━━━ 运营建议 ━━━",
      ...report.suggestions.map((s, i) => `${i + 1}. ${s}`),
    ].join("\n");

    navigator.clipboard.writeText(text);
    toast.success("报告已复制到剪贴板");
  }, [report]);

  // Print report
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-1 flex-shrink-0">
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-7 px-2 text-xs gap-1"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold truncate">运营报告生成</h3>
          <p className="text-[10px] text-muted-foreground">
            自动生成运营周报/月报
          </p>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {/* Period toggle */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">报告周期：</span>
            <div className="flex items-center h-7 rounded-full bg-muted/80 p-0.5 ml-auto">
              <button
                onClick={() => setPeriod("weekly")}
                className={`px-3 h-6 rounded-full text-[11px] font-medium transition-colors ${
                  period === "weekly"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                周报
              </button>
              <button
                onClick={() => setPeriod("monthly")}
                className={`px-3 h-6 rounded-full text-[11px] font-medium transition-colors ${
                  period === "monthly"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                月报
              </button>
            </div>
          </div>

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`w-full h-9 text-xs gap-1.5 btn-ripple press-scale ${
              report
                ? "bg-muted text-muted-foreground hover:bg-muted/80"
                : "bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white"
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                生成中...
              </>
            ) : report ? (
              <>
                <FileBarChart className="h-3.5 w-3.5" />
                重新生成{period === "weekly" ? "周报" : "月报"}
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                生成{period === "weekly" ? "周报" : "月报"}
              </>
            )}
          </Button>

          {/* Loading */}
          {isGenerating && <ReportGeneratorSkeleton />}

          {/* Empty state */}
          {!report && !isGenerating && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center py-8 text-center"
            >
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-3 shadow-md">
                <FileBarChart className="h-6 w-6 text-white" />
              </div>
              <p className="text-xs text-muted-foreground max-w-[200px]">
                点击上方按钮，自动生成包含数据概览、增长趋势和运营建议的{period === "weekly" ? "周报" : "月报"}
              </p>
            </motion.div>
          )}

          {/* Report preview */}
          <AnimatePresence>
            {report && !isGenerating && (
              <motion.div
                key="report"
                ref={printRef}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="report-preview-container"
              >
                <ReportPreview report={report} platform={platform} />

                {/* Export buttons */}
                <div className="flex gap-2 mt-4 print:hidden">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs gap-1.5"
                    onClick={handleCopy}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    复制报告
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs gap-1.5"
                    onClick={handlePrint}
                  >
                    <Printer className="h-3.5 w-3.5" />
                    打印/导出
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
