"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import type { Platform } from "@/types";
import {
  CONTENT_TYPE_LABELS,
  XHS_CONTENT_TYPE_LABELS,
} from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles,
  Loader2,
  Calendar,
  Clock,
  TrendingUp,
  CalendarX,
  Zap,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Flame,
  Target,
  Lightbulb,
  ChevronRight,
  RefreshCw,
  CalendarClock,
  Hash,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  addDays,
  startOfWeek,
  isWithinInterval,
  isSameDay,
} from "date-fns";
import { safeFormat } from "@/lib/safe-date";
import { zhCN } from "date-fns/locale";

// ─── Types ───────────────────────────────────────────────────────────

interface RecommendationData {
  suggestions: Array<{
    type: string;
    topic: string;
    reasoning: string;
    expectedEngagement: number;
    confidence: number;
  }>;
  bestTimes: Array<{
    slot: string;
    count: number;
    avgLikes: number;
    avgComments: number;
    avgEngagement: number;
  }>;
  bestWeekdays: Array<{
    weekday: number;
    label: string;
    count: number;
    avgEngagement: number;
    avgScore: number;
  }>;
  contentGaps: Array<{
    date: string;
    label: string;
    weekday: string;
    suggestedTypes: string[];
    reasoning: string;
  }>;
  contentTypePerformance: Array<{
    type: string;
    count: number;
    avgLikes: number;
    avgComments: number;
    avgShares: number;
    avgViews: number;
    avgScore: number;
    engagementRate: number;
  }>;
  summary: {
    totalPosts: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    avgEngagementRate: number;
    topContentType: string;
    topTimeSlot: string;
    topWeekday: string;
  };
}

interface ConflictInfo {
  date: string;
  label: string;
  count: number;
  postTopics: string[];
}

// ─── Constants ─────────────────────────────────────────────────────────

const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

const TIME_SLOT_LABELS: Record<string, string> = {
  "06:00-09:00": "早间",
  "09:00-12:00": "上午",
  "12:00-14:00": "午间",
  "14:00-17:00": "下午",
  "17:00-19:00": "傍晚",
  "19:00-21:00": "晚间",
  "21:00-23:00": "深夜",
  "23:00-06:00": "凌晨",
};

const SLOT_COLORS: Record<string, string> = {
  "06:00-09:00": "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  "09:00-12:00": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  "12:00-14:00": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "14:00-17:00": "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  "17:00-19:00": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "19:00-21:00": "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  "21:00-23:00": "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  "23:00-06:00": "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300",
};

// ─── Helpers ─────────────────────────────────────────────────────────

function getContentTypeLabel(type: string, platform: Platform): string {
  if (platform === "xiaohongshu") {
    return XHS_CONTENT_TYPE_LABELS[type as keyof typeof XHS_CONTENT_TYPE_LABELS] || type;
  }
  return CONTENT_TYPE_LABELS[type as keyof typeof CONTENT_TYPE_LABELS] || type;
}

function getEngagementColor(rate: number): string {
  if (rate >= 10) return "text-emerald-600 dark:text-emerald-400";
  if (rate >= 5) return "text-amber-600 dark:text-amber-400";
  return "text-muted-foreground";
}

function getHeatColor(value: number, max: number): string {
  if (max === 0) return "bg-muted/30";
  const ratio = value / max;
  if (ratio >= 0.8) return "bg-emerald-500";
  if (ratio >= 0.6) return "bg-emerald-400";
  if (ratio >= 0.4) return "bg-amber-400";
  if (ratio >= 0.2) return "bg-amber-300";
  return "bg-muted/50";
}

// ─── Component ───────────────────────────────────────────────────────

export function AISchedulingAssistant() {
  const { contentPosts, platform, currentPlan, setContentPosts } = useAppStore();

  const [recommendations, setRecommendations] = useState<RecommendationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<number>(0);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [expandedGap, setExpandedGap] = useState<string | null>(null);

  // ─── Fetch recommendations ────────────────────────────────────────
  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ platform, days: "30" });
      if (currentPlan?.id) params.set("planId", currentPlan.id);

      const res = await fetch(`/api/content/recommendations?${params}`);
      if (!res.ok) throw new Error("API request failed");
      const data = await res.json();
      setRecommendations(data);
      setLastRefresh(Date.now());
    } catch {
      toast.error("获取推荐数据失败，请重试");
    } finally {
      setLoading(false);
    }
  }, [platform, currentPlan?.id]);

  // Auto-fetch on mount
  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // ─── Detect scheduling conflicts ──────────────────────────────────
  const conflicts = useMemo((): ConflictInfo[] => {
    const dateMap = new Map<string, typeof contentPosts>();
    for (const p of contentPosts) {
      if (p.status === "published") continue;
      const group = dateMap.get(p.scheduledDate) || [];
      group.push(p);
      dateMap.set(p.scheduledDate, group);
    }

    const result: ConflictInfo[] = [];
    for (const [date, posts] of dateMap) {
      if (posts.length >= 3) {
        const label = safeFormat(date, "M月d日 EEEE", "--", { locale: zhCN });
        result.push({
          date,
          label,
          count: posts.length,
          postTopics: posts.map((p) => p.topic || "未命名").slice(0, 3),
        });
      }
    }
    return result;
  }, [contentPosts]);

  // ─── AI Auto-Fill gaps ────────────────────────────────────────────
  const handleAutoFill = useCallback(async () => {
    if (!recommendations || recommendations.contentGaps.length === 0) {
      toast.info("暂无空白日期需要填充");
      return;
    }

    setIsAutoFilling(true);
    let successCount = 0;

    try {
      const gapDates = recommendations.contentGaps.slice(0, 7).map((g) => g.date);

      const res = await fetch("/api/ai/batch-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: currentPlan?.id || "",
          startDate: gapDates[0],
          month: safeFormat(gapDates[0], "yyyy-MM"),
          platform,
          persona: useAppStore.getState().persona,
          knowledgeItems: useAppStore.getState().knowledgeItems,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        successCount = data.count || data.posts?.length || 0;

        // Refresh posts in store
        const postsRes = await fetch("/api/content");
        if (postsRes.ok) {
          const freshPosts = await postsRes.json();
          setContentPosts(freshPosts);
        }

        // Re-fetch recommendations
        await fetchRecommendations();

        toast.success(`AI已生成 ${successCount} 条内容并填充到空白日期`);
      } else {
        toast.error("AI批量生成失败，请重试");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setIsAutoFilling(false);
    }
  }, [recommendations, currentPlan?.id, platform, setContentPosts, fetchRecommendations]);

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* ─── Header with refresh ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500/15 to-purple-500/15 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <span className="text-sm font-medium">智能排期助手</span>
            <p className="text-[10px] text-muted-foreground">
              基于数据分析的AI排期建议
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[10px] gap-1"
          onClick={fetchRecommendations}
          disabled={loading}
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </div>

      {loading && !recommendations ? (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      ) : recommendations ? (
        <div className="space-y-4">
          {/* ─── Section 1: AI Smart Suggestions ─── */}
          {recommendations.suggestions.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                <Lightbulb className="h-3 w-3 text-amber-500" />
                AI智能建议
              </span>
              <div className="space-y-1.5">
                {recommendations.suggestions.map((sug, idx) => (
                  <motion.div
                    key={`${sug.type}-${idx}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.06 }}
                    className="flex items-start gap-2.5 p-2.5 rounded-lg border bg-gradient-to-r from-violet-50/40 to-purple-50/40 dark:from-violet-950/10 dark:to-purple-950/10 border-violet-100 dark:border-violet-900/30 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                        sug.confidence >= 0.9
                          ? "bg-emerald-100 dark:bg-emerald-900/30"
                          : sug.confidence >= 0.7
                          ? "bg-amber-100 dark:bg-amber-900/30"
                          : "bg-sky-100 dark:bg-sky-900/30"
                      }`}>
                        {sug.type === 'gap-fill' ? (
                          <CalendarX className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                        ) : sug.type === 'timing' ? (
                          <Clock className="h-3 w-3 text-sky-600 dark:text-sky-400" />
                        ) : sug.type === 'variety' ? (
                          <Hash className="h-3 w-3 text-violet-600 dark:text-violet-400" />
                        ) : (
                          <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium leading-tight">{sug.topic}</p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
                        {sug.reasoning}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1.5 py-0 h-4 flex-shrink-0 ${
                        sug.confidence >= 0.9
                          ? "bg-emerald-100/50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                          : "bg-muted/50"
                      }`}
                    >
                      {Math.round(sug.confidence * 100)}%确信
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* ─── Section 2: Best Publishing Time Heatmap ─── */}
          <div className="space-y-2">
            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
              <Clock className="h-3 w-3 text-sky-500" />
              最佳发布时间
            </span>
            <div className="rounded-lg border p-3 space-y-3">
              {/* Time slot bars */}
              <div className="space-y-1.5">
                {recommendations.bestTimes.slice(0, 5).map((slot, idx) => {
                  const maxEngagement = recommendations.bestTimes[0]?.avgEngagement || 1;
                  const barWidth = slot.avgEngagement > 0
                    ? Math.max(8, Math.round((slot.avgEngagement / maxEngagement) * 100))
                    : 0;
                  const slotLabel = TIME_SLOT_LABELS[slot.slot] || slot.slot;
                  const isTop = idx === 0;

                  return (
                    <motion.div
                      key={slot.slot}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center gap-2"
                    >
                      <span className={`text-[10px] w-10 text-right flex-shrink-0 font-medium ${isTop ? "text-foreground" : "text-muted-foreground"}`}>
                        {slotLabel}
                      </span>
                      <div className="flex-1 h-4 bg-muted/30 rounded-full overflow-hidden relative">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${barWidth}%` }}
                          transition={{ duration: 0.6, delay: idx * 0.08, ease: "easeOut" }}
                          className={`h-full rounded-full ${
                            isTop
                              ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                              : "bg-gradient-to-r from-muted-foreground/40 to-muted-foreground/30"
                          }`}
                        />
                      </div>
                      <div className="flex items-center gap-1 w-16 flex-shrink-0 justify-end">
                        <span className={`text-[10px] tabular-nums ${isTop ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                          {slot.avgEngagement}
                        </span>
                        {isTop && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="text-[8px] text-emerald-500 font-bold"
                          >
                            最佳
                          </motion.span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Weekday heatmap */}
              <div className="mt-2">
                <p className="text-[9px] text-muted-foreground mb-1.5">星期表现热力图</p>
                <div className="grid grid-cols-7 gap-1">
                  {recommendations.bestWeekdays.map((wd, idx) => {
                    const maxEng = recommendations.bestWeekdays[0]?.avgEngagement || 1;
                    const heatClass = wd.count > 0 ? getHeatColor(wd.avgEngagement, maxEng) : "bg-muted/20";

                    return (
                      <motion.div
                        key={wd.weekday}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.03 }}
                        className="flex flex-col items-center gap-0.5"
                      >
                        <span className="text-[9px] text-muted-foreground">
                          {WEEKDAY_LABELS[idx]}
                        </span>
                        <div className={`h-6 w-full rounded-md ${heatClass} flex items-center justify-center transition-colors`}>
                          <span className="text-[8px] font-medium text-foreground/70 tabular-nums">
                            {wd.count > 0 ? wd.avgEngagement : "-"}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* ─── Section 3: Content Gaps ─── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                <CalendarX className="h-3 w-3 text-amber-500" />
                空缺日期检测
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 ${
                  recommendations.contentGaps.length === 0
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                }`}
              >
                {recommendations.contentGaps.length === 0 ? "无空缺" : `${recommendations.contentGaps.length} 天空白`}
              </Badge>
            </div>

            {recommendations.contentGaps.length > 0 ? (
              <ScrollArea className="max-h-40">
                <div className="space-y-1">
                  {recommendations.contentGaps.slice(0, 10).map((gap, idx) => {
                    const isExpanded = expandedGap === gap.date;
                    return (
                      <motion.div
                        key={gap.date}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.04 }}
                      >
                        <button
                          onClick={() => setExpandedGap(isExpanded ? null : gap.date)}
                          className="w-full text-left"
                        >
                          <div className="flex items-center gap-2 px-2.5 py-2 rounded-md bg-amber-50/60 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
                                {gap.label}
                              </span>
                              <span className="text-[10px] text-amber-600/70 dark:text-amber-400/60 ml-1.5">
                                周{gap.weekday}
                              </span>
                            </div>
                            <ChevronRight className={`h-3 w-3 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                          </div>
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 py-2 space-y-1.5">
                                <p className="text-[10px] text-muted-foreground leading-relaxed">
                                  {gap.reasoning}
                                </p>
                                <div className="flex items-center gap-1">
                                  <span className="text-[9px] text-muted-foreground">建议类型：</span>
                                  {gap.suggestedTypes.map((type) => (
                                    <Badge
                                      key={type}
                                      variant="secondary"
                                      className="text-[8px] px-1 py-0 h-4"
                                    >
                                      {getContentTypeLabel(type, platform)}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex items-center gap-2 px-3 py-3 rounded-md bg-emerald-50 dark:bg-emerald-950/15 border border-emerald-100 dark:border-emerald-900/30">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span className="text-[11px] text-emerald-700 dark:text-emerald-300">
                  未来两周内容已全覆盖，排期状况良好！
                </span>
              </div>
            )}

            {/* AI Auto-fill button */}
            {recommendations.contentGaps.length > 0 && (
              <Button
                size="sm"
                className="w-full h-9 text-xs bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white shadow-sm"
                onClick={handleAutoFill}
                disabled={isAutoFilling || !currentPlan}
              >
                {isAutoFilling ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Flame className="h-3.5 w-3.5 mr-1.5" />
                )}
                {isAutoFilling
                  ? "AI正在生成内容…"
                  : `AI一键排期（${recommendations.contentGaps.length} 天空缺）`}
              </Button>
            )}
            {!currentPlan && recommendations.contentGaps.length > 0 && (
              <p className="text-[9px] text-center text-amber-600 dark:text-amber-400">
                ⚠️ 需要先创建内容计划才能使用AI一键排期
              </p>
            )}
          </div>

          {/* ─── Section 4: Scheduling Conflicts ─── */}
          {conflicts.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-orange-500" />
                  排期冲突检测
                </span>
                <div className="space-y-1">
                  {conflicts.slice(0, 3).map((conflict, idx) => (
                    <motion.div
                      key={conflict.date}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-md bg-orange-50/60 dark:bg-orange-950/10 border border-orange-100 dark:border-orange-900/30"
                    >
                      <div className="h-5 w-5 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                        <span className="text-[9px] font-bold text-orange-600 dark:text-orange-400">
                          {conflict.count}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-medium text-orange-700 dark:text-orange-300">
                          {conflict.label}
                        </span>
                        <p className="text-[9px] text-orange-600/60 dark:text-orange-400/60 truncate">
                          {conflict.postTopics.join("、")}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ─── Section 5: Content Type Performance ─── */}
          {recommendations.contentTypePerformance.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                  <BarChart3 className="h-3 w-3 text-emerald-500" />
                  内容类型表现
                </span>
                <div className="rounded-lg border p-3 space-y-2">
                  {recommendations.contentTypePerformance.slice(0, 5).map((ct, idx) => {
                    const maxRate = recommendations.contentTypePerformance[0]?.engagementRate || 1;
                    const barWidth = ct.engagementRate > 0
                      ? Math.max(10, Math.round((ct.engagementRate / maxRate) * 100))
                      : 0;
                    const isTop = idx === 0;

                    return (
                      <div key={ct.type} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-medium">
                              {getContentTypeLabel(ct.type, platform)}
                            </span>
                            <span className="text-[9px] text-muted-foreground">
                              {ct.count}条
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] tabular-nums ${getEngagementColor(ct.engagementRate)}`}>
                              {ct.engagementRate}%互动率
                            </span>
                            {isTop && (
                              <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                            )}
                          </div>
                        </div>
                        <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${barWidth}%` }}
                            transition={{ duration: 0.5, delay: idx * 0.08 }}
                            className={`h-full rounded-full ${
                              isTop
                                ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                                : "bg-muted-foreground/30"
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ─── Summary Footer ─── */}
          <Separator />
          <div className="flex items-center justify-between text-[10px] text-muted-foreground px-0.5">
            <span>
              分析 {recommendations.summary.totalPosts} 条内容
            </span>
            {lastRefresh > 0 && (
              <span>
                {safeFormat(new Date(lastRefresh), "HH:mm:ss")} 更新
              </span>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
