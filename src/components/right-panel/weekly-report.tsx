"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/store/app-store";
import {
  FileBarChart,
  ChevronDown,
  ChevronUp,
  Loader2,
  Copy,
  Check,
  TrendingUp,
  Sparkles,
  CalendarDays,
  Eye,
  ThumbsUp,
  MessageSquare,
  Star,
  Image as ImageIcon,
  Download,
  Pencil,
  RotateCcw,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

// ─── Types ─────────────────────────────────────────────────────────────

interface WeeklyReportOverview {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalFavorites: number;
  totalViews: number;
  totalInteractions: number;
  avgScore: number;
  publishRate: number;
  publishedCount: number;
}

interface WeeklyReportData {
  period: string;
  periodLabel: string;
  dateRange: { start: string; end: string };
  platform: string;
  generatedAt: string;
  overview: WeeklyReportOverview;
  contentTypeDistribution: { type: string; count: number; percentage: number; avgEngagement: number }[];
  bestContentType: { type: string; count: number; avgEngagement: number } | null;
  bestPublishSlot: string;
  statusDistribution: { status: string; count: number; percentage: number }[];
  topPosts: {
    id: string;
    topic: string;
    contentPreview: string;
    likes: number;
    comments: number;
    shares: number;
    views: number;
    favorites: number;
    aiScore: number;
    contentType: string;
    status: string;
    scheduledDate: string;
    engagement: number;
  }[];
}

interface AIWeeklyReport {
  review: string;
  highlights: string;
  suggestions: string;
  nextPlan: string;
}

// ─── Constants ──────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  planned: "待生成",
  generated: "已生成",
  optimized: "已优化",
  published: "已发布",
};

const STATUS_COLORS: Record<string, string> = {
  planned: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  generated: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  optimized: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  published: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
};

// ─── Sub-components ─────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 card-press"
    >
      <div className={`h-7 w-7 rounded-lg ${color} flex items-center justify-center shrink-0`}>
        <Icon className="h-3.5 w-3.5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-xs font-semibold truncate count-up">{value}</p>
      </div>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 p-1">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-6 rounded" />
        ))}
      </div>
    </div>
  );
}

function buildReportText(data: WeeklyReportData, aiReport?: AIWeeklyReport): string {
  const { overview } = data;
  const periodLabel = data.periodLabel;

  let text = `📊 ${periodLabel}运营报告\n`;
  text += `时间范围: ${data.dateRange.start} ~ ${data.dateRange.end}\n`;
  text += `生成时间: ${new Date(data.generatedAt).toLocaleString("zh-CN")}\n\n`;

  // Overview
  text += `━━━ 📊 数据概览 ━━━\n`;
  text += `总内容数: ${overview.totalPosts}\n`;
  text += `已发布: ${overview.publishedCount}（发布率 ${overview.publishRate}%）\n`;
  text += `总互动: ${overview.totalInteractions}\n`;
  text += `总点赞: ${overview.totalLikes}\n`;
  text += `总评论: ${overview.totalComments}\n`;
  text += `总转发: ${overview.totalShares}\n`;
  text += `总浏览: ${overview.totalViews}\n`;
  text += `平均AI评分: ${overview.avgScore}/100\n\n`;

  // Content Type
  if (data.contentTypeDistribution.length > 0) {
    text += `━━━ 📋 内容类型分布 ━━━\n`;
    data.contentTypeDistribution.forEach((ct) => {
      text += `• ${ct.type}: ${ct.count}篇 (${ct.percentage}%), 平均互动${ct.avgEngagement}\n`;
    });
    text += "\n";
  }

  // Top Posts
  if (data.topPosts.length > 0) {
    text += `━━━ 🔥 热门内容 TOP ${data.topPosts.length} ━━━\n`;
    data.topPosts.forEach((post, i) => {
      text += `${i + 1}. ${post.topic}\n`;
      text += `   ${post.contentPreview?.substring(0, 50)}...\n`;
      text += `   互动: 赞${post.likes} 评${post.comments} 转${post.shares} 浏${post.views}\n\n`;
    });
  }

  // AI Report
  if (aiReport) {
    text += `━━━ 🤖 AI 周报分析 ━━━\n\n`;
    text += `【本周回顾】\n${aiReport.review}\n\n`;
    text += `【数据亮点】\n${aiReport.highlights}\n\n`;
    text += `【改进建议】\n${aiReport.suggestions}\n\n`;
    text += `【下周规划建议】\n${aiReport.nextPlan}\n`;
  }

  return text;
}

// ─── Main Component ─────────────────────────────────────────────────────

export function WeeklyReport() {
  const { platform } = useAppStore();
  const { copied, copy } = useCopyToClipboard();
  const [isOpen, setIsOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [report, setReport] = useState<WeeklyReportData | null>(null);
  const [aiReport, setAIReport] = useState<AIWeeklyReport | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month">("week");

  const isXHS = platform === "xiaohongshu";

  // ── Load data from API ───────────────────────────────────────────────
  const handleLoadData = useCallback(async () => {
    setLoadingData(true);
    setReport(null);
    setAIReport(null);
    setIsOpen(true);

    try {
      const params = new URLSearchParams({ period: selectedPeriod });
      if (platform) params.set("platform", platform);
      const res = await fetch(`/api/weekly-report?${params.toString()}`);

      if (res.ok) {
        const data = await res.json();
        setReport(data);
      } else {
        toast.error("加载报告数据失败");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setLoadingData(false);
    }
  }, [selectedPeriod, platform]);

  // ── Generate AI weekly report ────────────────────────────────────────
  const handleGenerateAI = useCallback(async () => {
    if (!report) return;
    setGeneratingAI(true);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "weekly_report_summary",
          platform,
          existingContent: JSON.stringify({
            overview: report.overview,
            contentTypeDistribution: report.contentTypeDistribution,
            bestContentType: report.bestContentType,
            bestPublishSlot: report.bestPublishSlot,
            statusDistribution: report.statusDistribution,
            topPosts: report.topPosts.slice(0, 3),
          }),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Parse the AI response to extract the 4 sections
        const content = data.content || "";
        const parsed = parseAIReport(content);
        setAIReport(parsed);
        setEditContent(buildAIReportText(parsed));
        toast.success("AI 周报已生成");
      } else {
        toast.error("生成AI周报失败");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setGeneratingAI(false);
    }
  }, [report, platform]);

  // ── Parse AI response into structured sections ────────────────────────
  const parseAIReport = (content: string): AIWeeklyReport => {
    const defaultReport: AIWeeklyReport = {
      review: "本周内容创作情况良好。",
      highlights: "各项数据表现稳定。",
      suggestions: "建议继续优化内容质量。",
      nextPlan: "下周计划延续本周的内容策略。",
    };

    try {
      // Try to extract sections from markdown-like content
      const reviewMatch = content.match(/本周回顾[：:]\s*([\s\S]*?)(?=数据亮点|$)/i);
      const highlightsMatch = content.match(/数据亮点[：:]\s*([\s\S]*?)(?=改进建议|$)/i);
      const suggestionsMatch = content.match(/改进建议[：:]\s*([\s\S]*?)(?=下周规划|$)/i);
      const nextPlanMatch = content.match(/下周规划[建议：:]?\s*([\s\S]*?)$/i);

      return {
        review: reviewMatch?.[1]?.trim() || defaultReport.review,
        highlights: highlightsMatch?.[1]?.trim() || defaultReport.highlights,
        suggestions: suggestionsMatch?.[1]?.trim() || defaultReport.suggestions,
        nextPlan: nextPlanMatch?.[1]?.trim() || defaultReport.nextPlan,
      };
    } catch {
      // If parsing fails, try JSON
      try {
        const jsonStr = content.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1]?.trim() || content;
        const parsed = JSON.parse(jsonStr);
        return {
          review: parsed.review || parsed.本周回顾 || defaultReport.review,
          highlights: parsed.highlights || parsed.数据亮点 || defaultReport.highlights,
          suggestions: parsed.suggestions || parsed.改进建议 || defaultReport.suggestions,
          nextPlan: parsed.nextPlan || parsed.下周规划 || defaultReport.nextPlan,
        };
      } catch {
        // Use raw content as review
        return {
          ...defaultReport,
          review: content.substring(0, 500) || defaultReport.review,
        };
      }
    }
  };

  const buildAIReportText = (ai: AIWeeklyReport): string => {
    return `【本周回顾】\n${ai.review}\n\n【数据亮点】\n${ai.highlights}\n\n【改进建议】\n${ai.suggestions}\n\n【下周规划建议】\n${ai.nextPlan}`;
  };

  // ── Copy report ──────────────────────────────────────────────────────
  const handleCopy = () => {
    if (!report) return;
    const text = buildReportText(report, aiReport || undefined);
    copy(text);
  };

  // ── Export as image ──────────────────────────────────────────────────
  const handleExportImage = async () => {
    try {
      const params = new URLSearchParams({ period: selectedPeriod || "week" });
      const res = await fetch(`/api/export/report-image?${params.toString()}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `运营报告_${new Date().toISOString().slice(0, 10)}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("图片已下载");
      } else {
        toast.error("导出图片失败");
      }
    } catch {
      toast.error("导出图片失败");
    }
  };

  // ── Save edited AI report ────────────────────────────────────────────
  const handleSaveEdit = () => {
    if (!editContent.trim()) return;
    const parsed = parseAIReport(editContent);
    setAIReport(parsed);
    setIsEditing(false);
    toast.success("周报已更新");
  };

  // ── Toggle: first time open triggers data load ───────────────────────
  const handleTriggerClick = (e: React.MouseEvent) => {
    if (!isOpen && !report && !loadingData) {
      e.preventDefault();
      handleLoadData();
    }
  };

  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value as "week" | "month");
    if (isOpen) {
      setReport(null);
      setAIReport(null);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-0 shadow-sm card-glow-border">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full h-auto p-3 hover:bg-muted/50 rounded-lg"
            onClick={handleTriggerClick}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <FileBarChart className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-semibold">AI 运营周报</span>
                {report && (
                  <Badge variant="outline" className="text-[10px] h-5 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 content-type-badge">
                    已生成
                  </Badge>
                )}
                {aiReport && (
                  <Badge variant="outline" className="text-[10px] h-5 border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 content-type-badge">
                    AI已分析
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
                  <SelectTrigger
                    className="h-6 w-[70px] text-[10px] border-0 p-0 focus:ring-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">本周</SelectItem>
                    <SelectItem value="month">本月</SelectItem>
                  </SelectContent>
                </Select>
                {loadingData && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="px-3 pb-3 space-y-3">
            {/* Loading State */}
            {loadingData && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-6 space-y-3"
              >
                <div className="relative">
                  <Loader2 className="h-10 w-10 animate-spin text-amber-500/60" />
                  <FileBarChart className="h-5 w-5 text-amber-500 absolute -top-1 -right-1" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">正在加载运营数据...</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    分析数据中，请稍候
                  </p>
                </div>
                <LoadingSkeleton />
              </motion.div>
            )}

            {/* Report Content */}
            <AnimatePresence>
              {!loadingData && report && (
                <motion.div
                  key="weekly-report"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-3"
                >
                  {/* Action Buttons Bar */}
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1">
                      {!aiReport && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[10px] gap-1 px-2 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white btn-press"
                          onClick={handleGenerateAI}
                          disabled={generatingAI}
                        >
                          {generatingAI ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Sparkles className="h-3 w-3" />
                          )}
                          生成AI周报
                        </Button>
                      )}
                      {aiReport && !isEditing && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[10px] gap-1 px-2 text-muted-foreground hover:text-foreground btn-press"
                          onClick={() => {
                            setEditContent(buildAIReportText(aiReport));
                            setIsEditing(true);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                          编辑
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-7 text-[10px] gap-1 px-2 ${copied ? "text-emerald-500" : "text-muted-foreground hover:text-foreground"}`}
                        onClick={handleCopy}
                      >
                        {copied ? (
                          <>
                            <Check className="h-3 w-3" />
                            已复制
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            复制周报
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[10px] gap-1 px-2 text-muted-foreground hover:text-foreground btn-press"
                        onClick={handleExportImage}
                      >
                        <ImageIcon className="h-3 w-3" />
                        导出图片
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[10px] gap-1 px-2 text-muted-foreground hover:text-foreground btn-press"
                        onClick={handleLoadData}
                      >
                        <RotateCcw className="h-3 w-3" />
                        刷新
                      </Button>
                    </div>
                  </div>

                  <ScrollArea className="max-h-[600px]">
                    <div className="space-y-3 pr-1">
                      {/* 📊 Data Overview */}
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">📊</span>
                          <span className="text-xs font-semibold">
                            {report.periodLabel}数据概览
                          </span>
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {report.dateRange.start} ~ {report.dateRange.end}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <StatCard
                            icon={CalendarDays}
                            label={isXHS ? "笔记数" : "内容数"}
                            value={`${report.overview.totalPosts}`}
                            color="bg-gradient-to-br from-violet-500 to-purple-500"
                            delay={0.15}
                          />
                          <StatCard
                            icon={BarChart3}
                            label="总互动"
                            value={report.overview.totalInteractions.toLocaleString()}
                            color="bg-gradient-to-br from-emerald-500 to-teal-500"
                            delay={0.2}
                          />
                          <StatCard
                            icon={Eye}
                            label="总浏览"
                            value={report.overview.totalViews.toLocaleString()}
                            color="bg-gradient-to-br from-cyan-500 to-teal-500"
                            delay={0.25}
                          />
                          <StatCard
                            icon={ThumbsUp}
                            label="总点赞"
                            value={report.overview.totalLikes.toLocaleString()}
                            color="bg-gradient-to-br from-rose-500 to-pink-500"
                            delay={0.3}
                          />
                          <StatCard
                            icon={MessageSquare}
                            label="总评论"
                            value={report.overview.totalComments.toLocaleString()}
                            color="bg-gradient-to-br from-amber-500 to-orange-500"
                            delay={0.35}
                          />
                          <StatCard
                            icon={Star}
                            label="发布率"
                            value={`${report.overview.publishRate}%`}
                            color="bg-gradient-to-br from-amber-500 to-yellow-500"
                            delay={0.4}
                          />
                        </div>
                      </motion.div>

                      {/* 📋 Content Type Distribution */}
                      {report.contentTypeDistribution.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.45 }}
                          className="space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">📋</span>
                            <span className="text-xs font-semibold">内容类型分布</span>
                          </div>
                          <div className="space-y-1.5">
                            {report.contentTypeDistribution.slice(0, 5).map((ct, idx) => (
                              <motion.div
                                key={ct.type}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 + idx * 0.05 }}
                                className="flex items-center gap-2"
                              >
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] h-5 shrink-0 content-type-badge ${
                                    idx === 0
                                      ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200 dark:border-violet-800"
                                      : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {ct.type}
                                </Badge>
                                <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden">
                                  <div
                                    className="h-full rounded-full progress-bar-animated bg-gradient-to-r from-violet-500 to-purple-500"
                                    style={{
                                      width: `${ct.percentage}%`,
                                      animationDelay: `${0.5 + idx * 0.1}s`,
                                    }}
                                  />
                                </div>
                                <span className="text-[10px] text-muted-foreground w-10 text-right shrink-0">
                                  {ct.count}篇
                                </span>
                                <span className="text-[10px] font-medium text-foreground w-10 text-right shrink-0">
                                  {ct.percentage}%
                                </span>
                              </motion.div>
                            ))}
                          </div>
                          {report.bestContentType && (
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">
                              ✨ 最佳内容类型: {report.bestContentType.type}（平均互动 {report.bestContentType.avgEngagement}）
                            </p>
                          )}
                        </motion.div>
                      )}

                      {/* 🕐 Best Publishing Slot */}
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.65 }}
                      >
                        <div className="p-2.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10">
                          <p className="text-[10px] text-muted-foreground">
                            🕐 最佳发布时段
                          </p>
                          <p className="text-xs font-medium mt-0.5">
                            {report.bestPublishSlot}
                          </p>
                        </div>
                      </motion.div>

                      {/* 📊 Status Distribution */}
                      {report.statusDistribution.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.7 }}
                          className="space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">📊</span>
                            <span className="text-xs font-semibold">内容状态分布</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {report.statusDistribution.map((s, idx) => (
                              <motion.div
                                key={s.status}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.75 + idx * 0.05 }}
                                className="flex items-center gap-1"
                              >
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] h-5 tag-pop ${
                                    STATUS_COLORS[s.status] || "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {STATUS_LABELS[s.status] || s.status}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">
                                  {s.count}({s.percentage}%)
                                </span>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {/* 🔥 Top Posts */}
                      {report.topPosts.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.85 }}
                          className="space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">🔥</span>
                            <span className="text-xs font-semibold">热门内容 TOP {report.topPosts.length}</span>
                          </div>
                          <div className="space-y-1.5">
                            {report.topPosts.slice(0, 3).map((post, idx) => (
                              <motion.div
                                key={post.id || idx}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.9 + idx * 0.08 }}
                                className="p-2.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10 space-y-1 card-press"
                              >
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] h-5 shrink-0 ${
                                      idx === 0
                                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                                        : idx === 1
                                          ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200 dark:border-violet-800"
                                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                    }`}
                                  >
                                    TOP {idx + 1}
                                  </Badge>
                                  <span className="text-xs font-medium truncate flex-1">
                                    {post.topic || "无标题"}
                                  </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground line-clamp-1">
                                  {post.contentPreview}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  赞{post.likes} 评{post.comments} 转{post.shares} 浏{post.views} · 互动指数 {post.engagement}
                                </p>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {/* 🤖 AI Weekly Report */}
                      <AnimatePresence>
                        {generatingAI && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-2"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm">🤖</span>
                              <span className="text-xs font-semibold">AI 正在分析...</span>
                              <Loader2 className="h-3 w-3 animate-spin text-violet-500" />
                            </div>
                            <div className="space-y-2">
                              <Skeleton className="h-16 rounded-lg" />
                              <Skeleton className="h-16 rounded-lg" />
                              <Skeleton className="h-16 rounded-lg" />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {aiReport && !isEditing && (
                        <motion.div
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                          className="space-y-3"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">🤖</span>
                            <span className="text-xs font-semibold">AI 周报分析</span>
                            <Badge
                              variant="outline"
                              className="text-[10px] h-5 border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 ai-badge-pulse"
                            >
                              <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                              AI 生成
                            </Badge>
                          </div>

                          {/* Review */}
                          <div className="p-3 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/10 space-y-1 card-press">
                            <p className="text-[10px] text-violet-600 dark:text-violet-400 font-medium">
                              📝 本周回顾
                            </p>
                            <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">
                              {aiReport.review}
                            </p>
                          </div>

                          {/* Highlights */}
                          <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10 space-y-1 card-press">
                            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                              ✨ 数据亮点
                            </p>
                            <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">
                              {aiReport.highlights}
                            </p>
                          </div>

                          {/* Suggestions */}
                          <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/10 space-y-1 card-press">
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                              💡 改进建议
                            </p>
                            <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">
                              {aiReport.suggestions}
                            </p>
                          </div>

                          {/* Next Plan */}
                          <div className="p-3 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/10 space-y-1 card-press">
                            <p className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                              📅 下周规划建议
                            </p>
                            <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">
                              {aiReport.nextPlan}
                            </p>
                          </div>
                        </motion.div>
                      )}

                      {/* Editable AI Report */}
                      {aiReport && isEditing && (
                        <motion.div
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">✏️</span>
                            <span className="text-xs font-semibold">编辑 AI 周报</span>
                          </div>
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="min-h-[200px] text-xs leading-relaxed resize-y"
                            placeholder="编辑AI周报内容..."
                          />
                          <div className="flex items-center gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[10px] gap-1 px-2 text-muted-foreground hover:text-foreground btn-press"
                              onClick={() => setIsEditing(false)}
                            >
                              取消
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[10px] gap-1 px-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white btn-press"
                              onClick={handleSaveEdit}
                            >
                              <Check className="h-3 w-3" />
                              保存
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </ScrollArea>

                  {/* Regenerate Button */}
                  <Button
                    onClick={handleGenerateAI}
                    variant="ghost"
                    size="sm"
                    className="w-full h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground btn-press"
                    disabled={generatingAI}
                  >
                    {generatingAI ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    {aiReport ? "重新生成AI周报" : "生成AI周报分析"}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty State */}
            {!loadingData && !report && isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-6 space-y-3"
              >
                <FileBarChart className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">点击下方按钮加载{selectedPeriod === "week" ? "本周" : "本月"}报告</p>
                <Button
                  onClick={handleLoadData}
                  size="sm"
                  className="h-8 text-xs gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white btn-press"
                >
                  <FileBarChart className="h-3.5 w-3.5" />
                  加载{selectedPeriod === "week" ? "本周" : "本月"}报告
                </Button>
              </motion.div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
