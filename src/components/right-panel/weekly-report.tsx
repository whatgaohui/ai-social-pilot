"use client";

import { useState } from "react";
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
import { useAppStore } from "@/store/app-store";
import {
  FileBarChart,
  ChevronDown,
  ChevronUp,
  Loader2,
  Copy,
  Check,
  TrendingUp,
  Flame,
  BarChart3,
  Lightbulb,
  Sparkles,
  CalendarDays,
  Users,
  Eye,
  ThumbsUp,
  MessageSquare,
  Repeat2,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

interface ReportOverview {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalViews: number;
  avgScore: number;
  publishRate: number;
}

interface TopPost {
  id: string;
  topic: string;
  contentPreview: string;
  engagementSummary: string;
  engagement: number;
}

interface ReportTrends {
  summary: string;
  engagementTrend: string;
  bestPerformingType: string;
  peakDay: string;
}

interface ReportSuggestion {
  title: string;
  description: string;
}

interface WeeklyReportData {
  report: {
    overview: ReportOverview;
    topPosts: TopPost[];
    trends: ReportTrends;
    aiInsights: string[];
    suggestions: ReportSuggestion[];
    nextWeekPlan: { focus: string; type: string; reason: string }[];
  };
  generatedAt: string;
  period: string;
  platform: string;
}

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
      className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
    >
      <div className={`h-7 w-7 rounded-lg ${color} flex items-center justify-center shrink-0`}>
        <Icon className="h-3.5 w-3.5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-xs font-semibold truncate">{value}</p>
      </div>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 p-1">
      {/* Header skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-4 w-32" />
      </div>
      {/* Stats skeleton */}
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
      {/* Top posts skeleton */}
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
      {/* Insights skeleton */}
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-6 rounded" />
        ))}
      </div>
    </div>
  );
}

function buildReportText(data: WeeklyReportData): string {
  const { report } = data;
  const isXHS = data.platform === "xiaohongshu";
  const periodLabel = data.period === "weekly" ? "本周" : "本月";

  let text = `📊 ${periodLabel}运营报告\n`;
  text += `生成时间: ${new Date(data.generatedAt).toLocaleString("zh-CN")}\n\n`;

  // Overview
  text += `━━━ 📊 数据概览 ━━━\n`;
  text += `总${isXHS ? "笔记" : "内容"}数: ${report.overview.totalPosts}\n`;
  text += `已发布: ${report.overview.totalPosts > 0 ? Math.round((report.overview.publishRate / 100) * report.overview.totalPosts) : 0}（发布率 ${report.overview.publishRate}%）\n`;
  text += `总点赞: ${report.overview.totalLikes}\n`;
  text += `总评论: ${report.overview.totalComments}\n`;
  text += `总${isXHS ? "收藏" : "转发"}: ${report.overview.totalShares}\n`;
  text += `总浏览: ${report.overview.totalViews}\n`;
  text += `平均AI评分: ${report.overview.avgScore}/100\n\n`;

  // Top Posts
  if (report.topPosts.length > 0) {
    text += `━━━ 🔥 热门内容 TOP 3 ━━━\n`;
    report.topPosts.forEach((post, i) => {
      text += `${i + 1}. ${post.topic}\n`;
      text += `   ${post.contentPreview?.substring(0, 50)}...\n`;
      text += `   互动: ${post.engagementSummary || `互动指数 ${post.engagement}`}\n\n`;
    });
  }

  // Trends
  if (report.trends) {
    text += `━━━ 📈 趋势分析 ━━━\n`;
    text += `${report.trends.summary}\n`;
    text += `互动趋势: ${report.trends.engagementTrend}\n`;
    text += `最佳类型: ${report.trends.bestPerformingType}\n`;
    text += `高峰: ${report.trends.peakDay}\n\n`;
  }

  // AI Insights
  if (report.aiInsights?.length > 0) {
    text += `━━━ 🧠 AI 洞察 ━━━\n`;
    report.aiInsights.forEach((insight) => {
      text += `• ${insight}\n`;
    });
    text += "\n";
  }

  // Suggestions
  if (report.suggestions?.length > 0) {
    text += `━━━ 💡 运营建议 ━━━\n`;
    report.suggestions.forEach((s) => {
      text += `• ${s.title}: ${s.description}\n`;
    });
    text += "\n";
  }

  // Next Week Plan
  if (report.nextWeekPlan?.length > 0) {
    text += `━━━ 📅 下周计划 ━━━\n`;
    report.nextWeekPlan.forEach((p) => {
      text += `• ${p.focus}（${p.type}）- ${p.reason}\n`;
    });
  }

  return text;
}

export function WeeklyReport() {
  const { platform, persona, knowledgeItems } = useAppStore();
  const { copied, copy } = useCopyToClipboard();
  const [isOpen, setIsOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<WeeklyReportData | null>(null);

  const isXHS = platform === "xiaohongshu";

  const handleGenerate = async () => {
    setGenerating(true);
    setReport(null);
    setIsOpen(true);

    try {
      const res = await fetch("/api/ai/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: "weekly",
          platform,
          persona,
          knowledgeItems,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setReport(data);
        toast.success("运营周报已生成");
      } else {
        const errData = await res.json().catch(() => null);
        toast.error(errData?.error || "生成报告失败，请重试");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!report) return;
    copy(buildReportText(report));
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-0 shadow-sm card-glow-border">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full h-auto p-3 hover:bg-muted/50 rounded-lg"
            onClick={(e) => {
              if (!isOpen && !report && !generating) {
                e.preventDefault();
                handleGenerate();
              }
            }}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <FileBarChart className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-semibold">AI 运营周报</span>
                {report && (
                  <Badge variant="outline" className="text-[10px] h-5 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400">
                    已生成
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {generating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
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
            {generating && (
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
                  <p className="text-sm font-medium">AI 正在生成运营报告...</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    分析数据中，请稍候
                  </p>
                </div>
                <LoadingSkeleton />
              </motion.div>
            )}

            {/* Report Content */}
            <AnimatePresence>
              {!generating && report && (
                <motion.div
                  key="weekly-report"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-3"
                >
                  {/* Copy Button */}
                  <div className="flex items-center justify-end">
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
                          复制报告
                        </>
                      )}
                    </Button>
                  </div>

                  <ScrollArea className="max-h-[500px]">
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
                          <span className="text-xs font-semibold">本周数据概览</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <StatCard
                            icon={CalendarDays}
                            label={isXHS ? "笔记数" : "内容数"}
                            value={`${report.report.overview.totalPosts}`}
                            color="bg-gradient-to-br from-violet-500 to-purple-500"
                            delay={0.15}
                          />
                          <StatCard
                            icon={Eye}
                            label="总浏览"
                            value={report.report.overview.totalViews.toLocaleString()}
                            color="bg-gradient-to-br from-cyan-500 to-teal-500"
                            delay={0.2}
                          />
                          <StatCard
                            icon={ThumbsUp}
                            label="总点赞"
                            value={report.report.overview.totalLikes.toLocaleString()}
                            color="bg-gradient-to-br from-rose-500 to-pink-500"
                            delay={0.25}
                          />
                          <StatCard
                            icon={MessageSquare}
                            label="总评论"
                            value={report.report.overview.totalComments.toLocaleString()}
                            color="bg-gradient-to-br from-amber-500 to-orange-500"
                            delay={0.3}
                          />
                          <StatCard
                            icon={isXHS ? Star : Repeat2}
                            label={isXHS ? "总收藏" : "总转发"}
                            value={report.report.overview.totalShares.toLocaleString()}
                            color="bg-gradient-to-br from-emerald-500 to-teal-500"
                            delay={0.35}
                          />
                          <StatCard
                            icon={BarChart3}
                            label="发布率"
                            value={`${report.report.overview.publishRate}%`}
                            color="bg-gradient-to-br from-amber-500 to-yellow-500"
                            delay={0.4}
                          />
                        </div>
                      </motion.div>

                      {/* 🔥 Top Posts */}
                      {report.report.topPosts && report.report.topPosts.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.45 }}
                          className="space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">🔥</span>
                            <span className="text-xs font-semibold">热门内容 TOP 3</span>
                          </div>
                          <div className="space-y-1.5">
                            {report.report.topPosts.map((post, idx) => (
                              <motion.div
                                key={post.id || idx}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 + idx * 0.08 }}
                                className="p-2.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10 space-y-1"
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
                                    {post.topic}
                                  </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground line-clamp-1">
                                  {post.contentPreview}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {post.engagementSummary || `互动指数 ${post.engagement}`}
                                </p>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {/* 📈 Trend Analysis */}
                      {report.report.trends && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.65 }}
                          className="space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">📈</span>
                            <span className="text-xs font-semibold">趋势分析</span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] h-5 ${
                                report.report.trends.engagementTrend === "上升"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                  : report.report.trends.engagementTrend === "下降"
                                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800"
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                              }`}
                            >
                              <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                              {report.report.trends.engagementTrend}
                            </Badge>
                          </div>
                          <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/30">
                            <p className="text-xs leading-relaxed text-foreground/80">
                              {report.report.trends.summary}
                            </p>
                            <div className="flex flex-wrap gap-2 text-[10px]">
                              <span className="text-muted-foreground">
                                最佳类型: <span className="font-medium text-foreground">{report.report.trends.bestPerformingType}</span>
                              </span>
                              <span className="text-muted-foreground">
                                高峰: <span className="font-medium text-foreground">{report.report.trends.peakDay}</span>
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* 💡 AI Insights */}
                      {report.report.aiInsights && report.report.aiInsights.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.75 }}
                          className="space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">🧠</span>
                            <span className="text-xs font-semibold">AI 洞察</span>
                          </div>
                          <div className="space-y-1.5">
                            {report.report.aiInsights.map((insight, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.8 + i * 0.06 }}
                                className="flex items-start gap-2 text-xs text-muted-foreground"
                              >
                                <div className="h-1.5 w-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0" />
                                <span className="leading-relaxed">{insight}</span>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {/* 💡 Suggestions */}
                      {report.report.suggestions && report.report.suggestions.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.9 }}
                          className="space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">💡</span>
                            <span className="text-xs font-semibold">运营建议</span>
                          </div>
                          <div className="space-y-1.5">
                            {report.report.suggestions.map((s, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.95 + i * 0.06 }}
                                className="p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/10 space-y-0.5"
                              >
                                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                                  {s.title}
                                </p>
                                <p className="text-[10px] text-muted-foreground leading-relaxed">
                                  {s.description}
                                </p>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </ScrollArea>

                  {/* Regenerate Button */}
                  <Button
                    onClick={handleGenerate}
                    variant="ghost"
                    size="sm"
                    className="w-full h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <Sparkles className="h-3 w-3" />
                    重新生成
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty State */}
            {!generating && !report && isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-6 space-y-3"
              >
                <FileBarChart className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">点击下方按钮生成运营周报</p>
                <Button
                  onClick={handleGenerate}
                  size="sm"
                  className="h-8 text-xs gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white btn-press"
                >
                  <FileBarChart className="h-3.5 w-3.5" />
                  生成本周报告
                </Button>
              </motion.div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
