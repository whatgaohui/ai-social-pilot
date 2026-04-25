"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import {
  CONTENT_TYPE_LABELS,
  XHS_CONTENT_TYPE_LABELS,
  Platform,
} from "@/types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  Clock,
  AlertTriangle,
  BarChart3,
  CalendarX,
  CheckCircle2,
  Lightbulb,
  TrendingUp,
  Zap,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, addDays, isSameDay, differenceInDays, startOfWeek } from "date-fns";
import { zhCN } from "date-fns/locale";

// ─── Types ───────────────────────────────────────────────────────────────

interface ScheduleSuggestion {
  id: string;
  type: "timing" | "gap" | "balance" | "reorder";
  severity: "warning" | "positive" | "suggestion";
  title: string;
  description: string;
  actionable?: {
    label: string;
    postId?: string;
    newDate?: string;
    items?: Array<{ id: string; scheduledDate: string; sortOrder: number }>;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function getSeverityStyles(severity: ScheduleSuggestion["severity"]) {
  switch (severity) {
    case "warning":
      return {
        bg: "bg-amber-50/80 dark:bg-amber-950/15 border border-amber-200/60 dark:border-amber-800/60",
        icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
        badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
        actionBtn: "border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30",
      };
    case "positive":
      return {
        bg: "bg-emerald-50/80 dark:bg-emerald-950/15 border border-emerald-200/60 dark:border-emerald-800/60",
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
        badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        actionBtn: "border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30",
      };
    case "suggestion":
      return {
        bg: "bg-violet-50/80 dark:bg-violet-950/15 border border-violet-200/60 dark:border-violet-800/60",
        icon: <Lightbulb className="h-4 w-4 text-violet-500" />,
        badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 border-violet-200 dark:border-violet-800",
        actionBtn: "border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/30",
      };
  }
}

function getContentTypeLabel(type: string, platform: Platform): string {
  if (platform === "xiaohongshu") {
    return XHS_CONTENT_TYPE_LABELS[type as keyof typeof XHS_CONTENT_TYPE_LABELS] || type;
  }
  return CONTENT_TYPE_LABELS[type as keyof typeof CONTENT_TYPE_LABELS] || type;
}

// ─── Stagger Animation ───────────────────────────────────────────────────

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } },
};

// ─── Main Component ──────────────────────────────────────────────────────

export function AIScheduleOptimizer() {
  const { contentPosts, platform, setContentPosts } = useAppStore();

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<ScheduleSuggestion[]>([]);
  const [applying, setApplying] = useState<string | null>(null);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const isXHS = platform === "xiaohongshu";

  // ─── Local analysis (quick, no AI needed) ──────────────────────────
  const localAnalysis = useMemo((): ScheduleSuggestion[] => {
    if (contentPosts.length === 0) return [];

    const results: ScheduleSuggestion[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Content gaps detection
    const dates = [...new Set(contentPosts.map((p) => p.scheduledDate))].sort();
    if (dates.length >= 2) {
      const gaps: Array<{ start: string; end: string; days: number }> = [];
      for (let i = 1; i < dates.length; i++) {
        const gap = differenceInDays(parseISO(dates[i]), parseISO(dates[i - 1]));
        if (gap > 2) {
          gaps.push({ start: dates[i - 1], end: dates[i], days: gap });
        }
      }
      if (gaps.length > 0) {
        const biggestGap = gaps.sort((a, b) => b.days - a.days)[0];
        results.push({
          id: `gap-${biggestGap.start}`,
          type: "gap",
          severity: "warning",
          title: "内容发布间隔过大",
          description: `${biggestGap.start} 至 ${biggestGap.end} 之间有 ${biggestGap.days} 天没有内容安排，建议补充内容保持活跃度`,
        });
      }
    }

    // 2. Content type balance check
    const typeCounts: Record<string, number> = {};
    contentPosts.forEach((p) => {
      typeCounts[p.contentType] = (typeCounts[p.contentType] || 0) + 1;
    });
    const totalCount = contentPosts.length;
    const typeEntries = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);

    if (typeEntries.length > 0) {
      const dominantType = typeEntries[0];
      const dominantPct = Math.round((dominantType[1] / totalCount) * 100);
      if (dominantPct > 60 && typeEntries.length > 1) {
        results.push({
          id: "balance-dominant",
          type: "balance",
          severity: "suggestion",
          title: "内容类型分布不均",
          description: `"${getContentTypeLabel(dominantType[0], platform)}" 占比 ${dominantPct}%，建议增加其他类型内容以提升多样性`,
        });
      }

      if (typeEntries.length === 1) {
        results.push({
          id: "balance-single",
          type: "balance",
          severity: "warning",
          title: "内容类型过于单一",
          description: `所有内容都是"${getContentTypeLabel(typeEntries[0][0], platform)}"类型，建议混合使用不同内容形式`,
        });
      }
    }

    // 3. Unpublished content that's overdue
    const unpublished = contentPosts.filter(
      (p) => p.status === "planned" || p.status === "generated"
    );
    const overdue = unpublished.filter((p) => {
      try {
        return parseISO(p.scheduledDate) < today;
      } catch {
        return false;
      }
    });
    if (overdue.length > 0) {
      results.push({
        id: "overdue-posts",
        type: "timing",
        severity: "warning",
        title: `${overdue.length} 条内容已过期`,
        description: "有已排期但未发布的内容已过期，建议重新排期或加快内容生成",
      });
    }

    // 4. Positive: well-scored content ready to publish
    const readyToPublish = contentPosts.filter(
      (p) => (p.status === "optimized" || p.status === "generated") && p.aiScore >= 75
    );
    if (readyToPublish.length > 0) {
      results.push({
        id: "ready-publish",
        type: "timing",
        severity: "positive",
        title: `${readyToPublish.length} 条内容可以发布`,
        description: "这些内容质量评分良好，可以安排发布以获得更好的互动效果",
      });
    }

    return results;
  }, [contentPosts, platform]);

  // ─── AI-powered suggestions ──────────────────────────────────────────
  const handleAnalyze = useCallback(async () => {
    setLoading(true);
    setSuggestions([]);
    setHasAnalyzed(true);

    try {
      const res = await fetch("/api/ai/schedule-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          days: 14,
          type: "optimize",
          contentPosts: contentPosts.map((p) => ({
            scheduledDate: p.scheduledDate,
            contentType: p.contentType,
            topic: p.topic,
            likes: p.likes,
            comments: p.comments,
            shares: p.shares,
            status: p.status,
            aiScore: p.aiScore,
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const schedule = data.schedule || [];

        // Convert AI schedule slots into actionable suggestions
        const aiSuggestions: ScheduleSuggestion[] = [];

        // Best posting times suggestion
        if (schedule.length > 0) {
          const timeGroups: Record<string, number> = {};
          schedule.forEach((slot: { time: string }) => {
            timeGroups[slot.time] = (timeGroups[slot.time] || 0) + 1;
          });
          const bestTime = Object.entries(timeGroups).sort((a, b) => b[1] - a[1])[0];
          if (bestTime) {
            aiSuggestions.push({
              id: "ai-best-time",
              type: "timing",
              severity: "suggestion",
              title: `推荐发布时段：${bestTime[0]}`,
              description: `AI 分析认为 ${bestTime[0]} 是最佳发布时间，建议将重要内容安排在此时段`,
            });
          }
        }

        // Content reorder suggestion based on AI schedule
        if (schedule.length >= 3) {
          const contentTypeSuggestions: Record<string, number> = {};
          schedule.forEach((slot: { contentType: string }) => {
            contentTypeSuggestions[slot.contentType] = (contentTypeSuggestions[slot.contentType] || 0) + 1;
          });
          const topTypes = Object.entries(contentTypeSuggestions)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);

          if (topTypes.length > 0) {
            aiSuggestions.push({
              id: "ai-type-mix",
              type: "balance",
              severity: "suggestion",
              title: "AI 推荐内容类型搭配",
              description: `未来两周建议的内容类型比例：${topTypes.map(([t, c]) => `${getContentTypeLabel(t, platform)}(${c}次)`).join("、")}`,
            });
          }
        }

        // Merge local + AI suggestions
        setSuggestions([...aiSuggestions, ...localAnalysis]);
        toast.success("排期分析完成");
      } else {
        // Fallback to local analysis only
        setSuggestions(localAnalysis);
        toast.info("AI分析暂时不可用，已显示基础分析");
      }
    } catch {
      // Fallback to local analysis
      setSuggestions(localAnalysis);
      toast.info("已显示基础排期分析");
    } finally {
      setLoading(false);
    }
  }, [platform, contentPosts, localAnalysis]);

  // ─── Apply suggestion ───────────────────────────────────────────────
  const handleApplySuggestion = useCallback(async (suggestion: ScheduleSuggestion) => {
    if (!suggestion.actionable) return;

    setApplying(suggestion.id);

    try {
      if (suggestion.actionable.items && suggestion.actionable.items.length > 0) {
        const res = await fetch("/api/content/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: suggestion.actionable.items }),
        });

        if (res.ok) {
          toast.success("排期建议已应用");
          // Remove this suggestion from list
          setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
        } else {
          toast.error("应用失败，请重试");
        }
      } else if (suggestion.actionable.postId && suggestion.actionable.newDate) {
        // Single post reschedule
        const res = await fetch(`/api/content/${suggestion.actionable.postId}/reschedule`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheduledDate: suggestion.actionable.newDate }),
        });

        if (res.ok) {
          const updated = await res.json();
          // Update store
          const newPosts = contentPosts.map((p) =>
            p.id === suggestion.actionable.postId ? { ...p, ...updated } : p
          );
          setContentPosts(newPosts);
          toast.success("排期建议已应用");
          setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
        } else {
          toast.error("应用失败，请重试");
        }
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setApplying(null);
    }
  }, [contentPosts, setContentPosts]);

  // ─── Determine if calendar is well-balanced ─────────────────────────
  const isWellBalanced = localAnalysis.length === 0 && suggestions.length === 0;

  // ─── Count badges ───────────────────────────────────────────────────
  const warningCount = (hasAnalyzed ? suggestions : localAnalysis).filter(
    (s) => s.severity === "warning"
  ).length;
  const suggestionCount = (hasAnalyzed ? suggestions : localAnalysis).filter(
    (s) => s.severity === "suggestion"
  ).length;

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group/trig">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500/15 to-purple-500/15 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">排期优化建议</span>
                <span className="text-[10px] text-muted-foreground">
                  {hasAnalyzed
                    ? suggestions.length > 0
                      ? `${suggestions.length} 条建议`
                      : "排期良好"
                    : localAnalysis.length > 0
                    ? `${localAnalysis.length} 个提示`
                    : "AI排期分析"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {warningCount > 0 && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                >
                  {warningCount} 提醒
                </Badge>
              )}
              {suggestionCount > 0 && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200 dark:border-violet-800"
                >
                  {suggestionCount} 建议
                </Badge>
              )}
              {loading && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500" />
              )}
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CardContent>
        </Card>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="px-1 pb-3 space-y-3">
          {/* Analyze button */}
          {!hasAnalyzed && (
            <Button
              onClick={handleAnalyze}
              disabled={loading}
              size="sm"
              className="w-full h-9 text-xs gap-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-sm btn-press"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  AI 正在分析排期...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  AI 智能分析排期
                </>
              )}
            </Button>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-lg bg-muted/50 animate-pulse" />
              ))}
            </div>
          )}

          {/* Well-balanced empty state */}
          {!loading && hasAnalyzed && isWellBalanced && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-6 text-center space-y-2"
            >
              <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">排期状态良好</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  当前内容日历分布均匀，没有需要优化的地方
                </p>
              </div>
            </motion.div>
          )}

          {/* Suggestions list */}
          {!loading && (hasAnalyzed ? suggestions : localAnalysis).length > 0 && (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="space-y-2"
            >
              {(hasAnalyzed ? suggestions : localAnalysis).map((suggestion) => {
                const styles = getSeverityStyles(suggestion.severity);
                const isApplying = applying === suggestion.id;

                return (
                  <motion.div
                    key={suggestion.id}
                    variants={staggerItem}
                    className={`rounded-lg p-3 space-y-2 ${styles.bg}`}
                  >
                    {/* Header */}
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 mt-0.5">{styles.icon}</div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold">{suggestion.title}</span>
                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1.5 py-0 h-4 ${styles.badge}`}
                          >
                            {suggestion.type === "timing"
                              ? "发布时机"
                              : suggestion.type === "gap"
                              ? "内容缺口"
                              : suggestion.type === "balance"
                              ? "类型均衡"
                              : "排序优化"}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {suggestion.description}
                        </p>
                      </div>
                    </div>

                    {/* Action button */}
                    {suggestion.actionable && (
                      <div className="flex items-center justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className={`h-7 text-[10px] px-3 gap-1 ${styles.actionBtn}`}
                          onClick={() => handleApplySuggestion(suggestion)}
                          disabled={isApplying}
                        >
                          {isApplying ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              应用中...
                            </>
                          ) : (
                            <>
                              <Check className="h-3 w-3" />
                              应用
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* Re-analyze button */}
          {hasAnalyzed && !loading && (
            <>
              <Separator />
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                onClick={handleAnalyze}
              >
                <RefreshCw className="h-3 w-3" />
                重新分析
              </Button>
            </>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
