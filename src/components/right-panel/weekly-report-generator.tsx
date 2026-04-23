"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Download,
  Copy,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Heart,
  MessageSquare,
  Share2,
  Eye,
  Loader2,
  Award,
  Target,
  Zap,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";
import {
  subWeeks,
  startOfWeek,
  endOfWeek,
  getDay,
} from "date-fns";
import { zhCN } from "date-fns/locale";
import { safeFormat } from "@/lib/safe-date";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportSection {
  title: string;
  content: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

interface WeekRange {
  label: string;
  startDate: Date;
  endDate: Date;
  weekOffset: number;
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function getWeekRange(offset: number): WeekRange {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const targetStart = new Date(weekStart);
  targetStart.setDate(weekStart.getDate() + offset * 7);
  const targetEnd = new Date(targetStart);
  targetEnd.setDate(targetStart.getDate() + 6);
  targetEnd.setHours(23, 59, 59, 999);

  const label =
    offset === 0
      ? "本周"
      : offset === -1
        ? "上周"
        : `${safeFormat(targetStart, "M/d", "--", { locale: zhCN })}-${safeFormat(targetEnd, "M/d", "--", { locale: zhCN })}`;

  return { label, startDate: targetStart, endDate: targetEnd, weekOffset: offset };
}

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + "w";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

function getDiffIndicator(current: number, previous: number): {
  icon: React.ReactNode;
  className: string;
  text: string;
} {
  if (previous === 0 && current === 0) {
    return {
      icon: <Minus className="h-3 w-3" />,
      className: "text-muted-foreground",
      text: "持平",
    };
  }
  if (previous === 0 && current > 0) {
    return {
      icon: <TrendingUp className="h-3 w-3" />,
      className: "text-emerald-500",
      text: "新增",
    };
  }
  const diff = current - previous;
  const pct = Math.round((diff / previous) * 100);
  if (diff > 0) {
    return {
      icon: <TrendingUp className="h-3 w-3" />,
      className: "text-emerald-500",
      text: `+${pct}%`,
    };
  }
  if (diff < 0) {
    return {
      icon: <TrendingDown className="h-3 w-3" />,
      className: "text-rose-500",
      text: `${pct}%`,
    };
  }
  return {
    icon: <Minus className="h-3 w-3" />,
    className: "text-muted-foreground",
    text: "持平",
  };
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function WeeklyReportGenerator() {
  const contentPosts = useAppStore((s) => s.contentPosts);
  const [weekOffset, setWeekOffset] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);

  const currentWeek = useMemo(() => getWeekRange(weekOffset), [weekOffset]);
  const previousWeek = useMemo(
    () => getWeekRange(weekOffset - 1),
    [weekOffset]
  );

  // ── Aggregate data for current week ───────────────────────────────────
  const currentData = useMemo(() => {
    return aggregateWeekData(contentPosts, currentWeek.startDate, currentWeek.endDate);
  }, [contentPosts, currentWeek]);

  // ── Aggregate data for previous week ──────────────────────────────────
  const previousData = useMemo(() => {
    return aggregateWeekData(contentPosts, previousWeek.startDate, previousWeek.endDate);
  }, [contentPosts, previousWeek]);

  // ── Build report sections ─────────────────────────────────────────────
  const reportSections = useMemo<ReportSection[]>(() => {
    return [
      {
        title: "📊 本周概览",
        content: buildOverviewSection(currentData, previousData),
        icon: BarChart3,
        color: "text-violet-500",
      },
      {
        title: "📝 内容分析",
        content: buildContentSection(currentData, previousData),
        icon: FileText,
        color: "text-amber-500",
      },
      {
        title: "💬 互动数据",
        content: buildEngagementSection(currentData, previousData),
        icon: Heart,
        color: "text-rose-500",
      },
      {
        title: "🔥 热门内容 TOP5",
        content: buildTopContentSection(currentData),
        icon: Award,
        color: "text-emerald-500",
      },
      {
        title: "💡 运营建议",
        content: buildRecommendationSection(currentData, previousData),
        icon: Lightbulb,
        color: "text-amber-500",
      },
    ];
  }, [currentData, previousData]);

  // ── Plain text version ────────────────────────────────────────────────
  const plainTextReport = useMemo(() => {
    const header = `# 运营周报 - ${currentWeek.label}\n${safeFormat(currentWeek.startDate, "yyyy年M月d日", "--", { locale: zhCN })} - ${safeFormat(currentWeek.endDate, "yyyy年M月d日", "--", { locale: zhCN })}\n\n`;
    return header + reportSections.map((s) => `## ${s.title}\n\n${s.content}`).join("\n\n---\n\n");
  }, [reportSections, currentWeek]);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    await new Promise((r) => setTimeout(r, 1200));
    setIsGenerating(false);
    setReportGenerated(true);
    toast.success("周报已生成");
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(plainTextReport);
      toast.success("已复制到剪贴板");
    } catch {
      toast.error("复制失败");
    }
  }, [plainTextReport]);

  const handleDownload = useCallback(() => {
    try {
      const blob = new Blob([plainTextReport], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `运营周报-${currentWeek.label}-${safeFormat(new Date(), "yyyyMMdd")}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("周报已下载");
    } catch {
      toast.error("下载失败");
    }
  }, [plainTextReport, currentWeek]);

  const handlePrevWeek = useCallback(() => {
    setWeekOffset((o) => o - 1);
    setReportGenerated(false);
  }, []);

  const handleNextWeek = useCallback(() => {
    setWeekOffset((o) => Math.min(0, o + 1));
    setReportGenerated(false);
  }, []);

  return (
    <div className="space-y-3 p-4">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500/15 to-amber-500/15 flex items-center justify-center">
            <FileText className="h-4.5 w-4.5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">周报自动生成</h2>
            <p className="text-[10px] text-muted-foreground">
              AI智能运营周报
            </p>
          </div>
        </div>
      </div>

      {/* ─── Week Selector ─── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={handlePrevWeek}
                disabled={weekOffset <= -12}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="text-center">
                <p className="text-xs font-semibold">{currentWeek.label}</p>
                <p className="text-[10px] text-muted-foreground">
                  {safeFormat(currentWeek.startDate, "M月d日", "--", { locale: zhCN })} -{" "}
                  {safeFormat(currentWeek.endDate, "M月d日", "--", { locale: zhCN })}
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={handleNextWeek}
                disabled={weekOffset >= 0}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Quick stats comparison */}
            <div className="grid grid-cols-4 gap-2 mt-3">
              {[
                {
                  label: "发布",
                  current: currentData.totalPosts,
                  previous: previousData.totalPosts,
                },
                {
                  label: "浏览",
                  current: currentData.totalViews,
                  previous: previousData.totalViews,
                },
                {
                  label: "互动",
                  current: currentData.totalEngagement,
                  previous: previousData.totalEngagement,
                },
                {
                  label: "AI评分",
                  current: currentData.avgAiScore,
                  previous: previousData.avgAiScore,
                },
              ].map((item) => {
                const diff = getDiffIndicator(
                  item.current,
                  item.previous
                );
                return (
                  <div key={item.label} className="text-center">
                    <p className="text-sm font-bold tabular-nums">
                      {formatNum(item.current)}
                    </p>
                    <div className="flex items-center justify-center gap-0.5">
                      <span className="text-[9px] text-muted-foreground">
                        {item.label}
                      </span>
                      <span className={`text-[8px] ${diff.className}`}>
                        {diff.text}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Generate Button ─── */}
      {!reportGenerated && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            className="w-full h-10 text-sm bg-gradient-to-r from-violet-500 to-emerald-500 hover:from-violet-600 hover:to-emerald-600 text-white"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                正在生成周报...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                生成{currentWeek.label}运营周报
              </>
            )}
          </Button>
        </motion.div>
      )}

      {/* ─── Report Preview ─── */}
      <AnimatePresence>
        {reportGenerated && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
          >
            <Card className="border-0 shadow-sm overflow-hidden">
              <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-violet-500" />
                    {currentWeek.label}运营周报
                  </CardTitle>
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant="secondary"
                      className="text-[9px] px-1.5 py-0"
                    >
                      AI生成
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-4 pr-2">
                    {reportSections.map((section, idx) => {
                      const SectionIcon = section.icon;
                      return (
                        <motion.div
                          key={section.title}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <SectionIcon className={`h-4 w-4 ${section.color}`} />
                            <h3 className="text-xs font-semibold">
                              {section.title}
                            </h3>
                          </div>
                          <div className="pl-6 text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
                            {section.content.split("\n").map((line, li) => (
                              <p key={li} className={line === "" ? "h-2" : ""}>
                                {line}
                              </p>
                            ))}
                          </div>
                          {idx < reportSections.length - 1 && (
                            <Separator />
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* ─── Export Actions ─── */}
            <div className="flex items-center gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-9 text-xs border-dashed"
                onClick={handleCopy}
              >
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                复制文本
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-9 text-xs border-dashed"
                onClick={handleDownload}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                下载文件
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs text-muted-foreground"
                onClick={() => setReportGenerated(false)}
              >
                重新生成
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Data Aggregation ─────────────────────────────────────────────────────────

interface WeekData {
  totalPosts: number;
  publishedPosts: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalEngagement: number;
  avgAiScore: number;
  topPosts: {
    id: string;
    topic: string;
    likes: number;
    comments: number;
    shares: number;
    views: number;
    aiScore: number;
    contentType: string;
    engagement: number;
  }[];
  contentTypes: { type: string; count: number }[];
  weekDays: number;
}

function aggregateWeekData(
  posts: import("@/types").ContentPost[],
  start: Date,
  end: Date
): WeekData {
  const filtered = posts.filter((p) => {
    const d = new Date(p.createdAt);
    return d >= start && d <= end;
  });

  const published = filtered.filter((p) => p.status === "published");

  const topPosts = [...published]
    .map((p) => ({
      id: p.id,
      topic: p.topic || "未命名",
      likes: p.likes,
      comments: p.comments,
      shares: p.shares,
      views: p.views,
      aiScore: p.aiScore,
      contentType: p.contentType,
      engagement: p.likes + p.comments * 2 + p.shares * 3,
    }))
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 5);

  const typeMap: Record<string, number> = {};
  filtered.forEach((p) => {
    typeMap[p.contentType] = (typeMap[p.contentType] || 0) + 1;
  });
  const contentTypes = Object.entries(typeMap)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ type, count }));

  const totalViews = published.reduce((s, p) => s + p.views, 0);
  const totalLikes = published.reduce((s, p) => s + p.likes, 0);
  const totalComments = published.reduce((s, p) => s + p.comments, 0);
  const totalShares = published.reduce((s, p) => s + p.shares, 0);
  const totalEngagement = totalLikes + totalComments * 2 + totalShares * 3;

  const scored = published.filter((p) => p.aiScore > 0);
  const avgAiScore =
    scored.length > 0
      ? Math.round(scored.reduce((s, p) => s + p.aiScore, 0) / scored.length)
      : 0;

  const weekDays = new Set(
    published.map((p) => (p.publishedAt || p.createdAt).slice(0, 10))
  ).size;

  return {
    totalPosts: filtered.length,
    publishedPosts: published.length,
    totalViews,
    totalLikes,
    totalComments,
    totalShares,
    totalEngagement,
    avgAiScore,
    topPosts,
    contentTypes,
    weekDays,
  };
}

// ─── Report Section Builders ──────────────────────────────────────────────────

function buildOverviewSection(current: WeekData, previous: WeekData): string {
  const postDiff = getDiffIndicator(current.totalPosts, previous.totalPosts);
  const engDiff = getDiffIndicator(current.totalEngagement, previous.totalEngagement);
  const viewDiff = getDiffIndicator(current.totalViews, previous.totalViews);
  const scoreDiff = getDiffIndicator(current.avgAiScore, previous.avgAiScore);

  return `本周共创建 ${current.totalPosts} 条内容，已发布 ${current.publishedPosts} 条，活跃 ${current.weekDays} 天。

关键指标变化：
• 发布量：${current.totalPosts} 条（${postDiff.text}）
• 浏览总量：${formatNum(current.totalViews)}（${viewDiff.text}）
• 互动总量：${formatNum(current.totalEngagement)}（${engDiff.text}）
• 平均AI评分：${current.avgAiScore}/100（${scoreDiff.text}）`;
}

function buildContentSection(current: WeekData, previous: WeekData): string {
  const typeLines = current.contentTypes
    .slice(0, 5)
    .map((t) => `• ${t.type}：${t.count} 条`)
    .join("\n");

  const publishRate =
    current.totalPosts > 0
      ? Math.round((current.publishedPosts / current.totalPosts) * 100)
      : 0;

  const prevPublishRate =
    previous.totalPosts > 0
      ? Math.round((previous.publishedPosts / previous.totalPosts) * 100)
      : 0;

  const rateDiff = getDiffIndicator(publishRate, prevPublishRate);

  return `内容发布率为 ${publishRate}%（${rateDiff.text}），共 ${current.weekDays} 天有内容发布。

内容类型分布：
${typeLines || "• 暂无内容"}

${current.contentTypes.length <= 1 ? "⚠️ 内容类型过于单一，建议丰富内容形式以提升账号活跃度。" : "✅ 内容类型较为丰富，有利于吸引不同兴趣的用户群体。"}`;
}

function buildEngagementSection(current: WeekData, previous: WeekData): string {
  const likeDiff = getDiffIndicator(current.totalLikes, previous.totalLikes);
  const commentDiff = getDiffIndicator(current.totalComments, previous.totalComments);
  const shareDiff = getDiffIndicator(current.totalShares, previous.totalShares);

  const avgEng =
    current.publishedPosts > 0
      ? Math.round(current.totalEngagement / current.publishedPosts)
      : 0;
  const prevAvgEng =
    previous.publishedPosts > 0
      ? Math.round(previous.totalEngagement / previous.publishedPosts)
      : 0;

  const avgDiff = getDiffIndicator(avgEng, prevAvgEng);

  return `互动数据明细：
• 点赞：${current.totalLikes}（${likeDiff.text}）
• 评论：${current.totalComments}（${commentDiff.text}）
• 转发：${current.totalShares}（${shareDiff.text}）

条均互动量：${avgEng}（${avgDiff.text}）

${current.totalEngagement > previous.totalEngagement ? "📈 互动量较上周有所提升，说明内容质量和发布策略较为有效。" : "📉 互动量较上周有所下降，建议优化内容质量和发布时间。"}`;
}

function buildTopContentSection(current: WeekData): string {
  if (current.topPosts.length === 0) {
    return "本周暂无已发布的互动数据。";
  }

  return current.topPosts
    .map((post, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
      return `${medal} 「${post.topic}」
   类型：${post.contentType} | 互动：${post.engagement} | 浏览：${post.views} | AI评分：${post.aiScore}`;
    })
    .join("\n\n");
}

function buildRecommendationSection(current: WeekData, previous: WeekData): string {
  const recommendations: string[] = [];

  // Frequency analysis
  if (current.weekDays < 4) {
    recommendations.push(
      "📅 发布频率偏低，建议每周至少保持5天的发布频率，以维持账号活跃度和粉丝粘性。"
    );
  } else if (current.weekDays >= 6) {
    recommendations.push(
      "🔥 发布频率保持得非常好！继续保持当前节奏，可以考虑在互动高峰时段集中发布。"
    );
  }

  // Content diversity
  if (current.contentTypes.length <= 1) {
    recommendations.push(
      "📝 内容类型过于集中，建议尝试不同类型的内容（如图文、视频、观点等），以覆盖更广泛的受众群体。"
    );
  }

  // Engagement analysis
  if (current.totalEngagement < previous.totalEngagement) {
    recommendations.push(
      "💡 互动量较上周下降，建议：1) 优化内容质量提升用户参与感；2) 增加互动引导（提问、投票等）；3) 分析高互动内容的共性并复用。"
    );
  } else if (current.totalEngagement > previous.totalEngagement * 1.2) {
    recommendations.push(
      "🎉 互动量大幅增长！建议总结本周高互动内容的成功经验，形成可复用的内容模板。"
    );
  }

  // AI score analysis
  if (current.avgAiScore < 60 && current.avgAiScore > 0) {
    recommendations.push(
      "🎯 AI评分偏低，建议在发布前充分利用AI优化功能，提升内容质量和可读性。"
    );
  } else if (current.avgAiScore >= 80) {
    recommendations.push(
      "✨ AI评分优秀！内容质量保持在高水平，可以适当关注创意和差异化表达。"
    );
  }

  // Publishing rate
  const publishRate =
    current.totalPosts > 0
      ? Math.round((current.publishedPosts / current.totalPosts) * 100)
      : 0;
  if (publishRate < 50 && current.totalPosts > 3) {
    recommendations.push(
      "📤 内容发布率较低，有较多内容积压在草稿或待优化状态，建议及时处理。"
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "👍 本周运营状况良好，各项指标表现稳定。建议继续关注内容创新和用户互动，持续优化运营策略。"
    );
  }

  return recommendations.join("\n\n");
}
