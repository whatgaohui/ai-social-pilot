"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import type { ContentPost, Platform } from "@/types";
import {
  PLATFORM_LABELS,
  CONTENT_TYPE_LABELS,
  XHS_CONTENT_TYPE_LABELS,
} from "@/types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
  Clock,
  AlertTriangle,
  Calendar,
  BarChart3,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Check,
  Zap,
  CalendarX,
  Layers,
  Flame,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import {
  format,
  addDays,
  startOfWeek,
  isSameDay,
  parseISO,
  isWithinInterval,
} from "date-fns";
import { safeFormat } from "@/lib/safe-date";
import { zhCN } from "date-fns/locale";

// ─── Types ───────────────────────────────────────────────────────────
interface ScheduleSlot {
  day: string;
  time: string;
  contentType: string;
  reasoning: string;
  topic: string;
}

interface DayGap {
  date: Date;
  dateStr: string;
  dayLabel: string;
  hasContent: boolean;
}

type FrequencyLevel = "good" | "below" | "low";

// ─── Constants ───
const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

const FREQUENCY_CONFIG = {
  wechat: { min: 3, max: 5, label: "3-5条/周" },
  xiaohongshu: { min: 4, max: 7, label: "4-7条/周" },
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────
function getFrequencyLevel(
  count: number,
  min: number
): FrequencyLevel {
  if (count >= min) return "good";
  if (count >= Math.ceil(min / 2)) return "below";
  return "low";
}

function getFrequencyColor(level: FrequencyLevel): string {
  switch (level) {
    case "good":
      return "text-emerald-600 dark:text-emerald-400";
    case "below":
      return "text-amber-600 dark:text-amber-400";
    case "low":
      return "text-red-600 dark:text-red-400";
  }
}

function getFrequencyBg(level: FrequencyLevel): string {
  switch (level) {
    case "good":
      return "bg-emerald-500";
    case "below":
      return "bg-amber-500";
    case "low":
      return "bg-red-500";
  }
}

function getFrequencyLabel(level: FrequencyLevel): string {
  switch (level) {
    case "good":
      return "发布频率良好";
    case "below":
      return "发布频率偏低";
    case "low":
      return "发布频率过低";
  }
}

function getContentTypeLabel(
  type: string,
  platform: Platform
): string {
  if (platform === "xiaohongshu") {
    return (
      XHS_CONTENT_TYPE_LABELS[type as keyof typeof XHS_CONTENT_TYPE_LABELS] ||
      type
    );
  }
  return CONTENT_TYPE_LABELS[type as keyof typeof CONTENT_TYPE_LABELS] || type;
}

// ─── Component ───────────────────────────────────────────────────────
export function AISchedulingAssistant() {
  const { contentPosts, platform, addContentPost } = useAppStore();

  const [isOpen, setIsOpen] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([]);
  const [scheduleGenerated, setScheduleGenerated] = useState(false);

  const [loadingFill, setLoadingFill] = useState(false);

  const [batchItems, setBatchItems] = useState<ScheduleSlot[]>([]);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [applyingBatch, setApplyingBatch] = useState(false);

  // ─── Derived data ──────────────────────────────────────────────
  const weekStart = useMemo(
    () => startOfWeek(new Date(), { weekStartsOn: 1 }),
    []
  );

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const thisWeekPosts = useMemo(() => {
    const weekEnd = addDays(weekStart, 7);
    return contentPosts.filter((p) => {
      try {
        const d = parseISO(p.scheduledDate);
        return isWithinInterval(d, { start: weekStart, end: weekEnd });
      } catch {
        return false;
      }
    });
  }, [contentPosts, weekStart]);

  const postsPerWeek = thisWeekPosts.length;

  const freqConfig = FREQUENCY_CONFIG[platform] ?? FREQUENCY_CONFIG.wechat;
  const frequencyLevel = getFrequencyLevel(postsPerWeek, freqConfig.min);
  const frequencyProgress = Math.min(
    100,
    Math.round((postsPerWeek / freqConfig.max) * 100)
  );

  const dayGaps = useMemo((): DayGap[] => {
    return weekDays.map((date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const hasContent = thisWeekPosts.some((p) => {
        try {
          return isSameDay(parseISO(p.scheduledDate), date);
        } catch {
          return false;
        }
      });
      return {
        date,
        dateStr,
        dayLabel: format(date, "EEE", { locale: zhCN }),
        hasContent,
      };
    });
  }, [weekDays, thisWeekPosts]);

  const gapDays = dayGaps.filter((g) => !g.hasContent);
  const gapCount = gapDays.length;

  // ─── Schedule generation ───────────────────────────────────────
  const handleGenerateSchedule = useCallback(async () => {
    setLoadingSchedule(true);
    setScheduleSlots([]);
    setScheduleGenerated(false);

    try {
      const res = await fetch("/api/ai/schedule-suggest");
      if (!res.ok) throw new Error("API request failed");

      const data = await res.json();
      const slots: ScheduleSlot[] = data.schedule || [];
      setScheduleSlots(slots);
      setScheduleGenerated(true);
      toast.success(`AI已生成 ${slots.length} 个排期建议`);
    } catch {
      toast.error("排期生成失败，请重试");
    } finally {
      setLoadingSchedule(false);
    }
  }, []);

  // ─── Fill gaps ─────────────────────────────────────────────────
  const handleFillGaps = useCallback(async () => {
    if (gapCount === 0) {
      toast.info("本周没有空闲天数");
      return;
    }

    setLoadingFill(true);

    try {
      const gapPayload = gapDays.map((g) => ({
        day: g.dateStr,
        time: "20:00",
        contentType: "text",
        reasoning: "补充空白日",
        topic: "待定主题",
      }));

      const res = await fetch("/api/ai/schedule-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          days: gapCount,
          contentPosts: contentPosts.map((p) => ({
            scheduledDate: p.scheduledDate,
            contentType: p.contentType,
            topic: p.topic,
            likes: p.likes,
            comments: p.comments,
            shares: p.shares,
            status: p.status,
          })),
        }),
      });

      if (!res.ok) throw new Error("API request failed");

      const data = await res.json();
      const slots: ScheduleSlot[] = data.schedule || [];

      if (slots.length > 0) {
        setScheduleSlots(slots);
        setScheduleGenerated(true);
        toast.success(`已为 ${gapCount} 个空白日生成内容建议`);
      } else {
        toast.info("未能生成补充内容");
      }
    } catch {
      toast.error("补充内容生成失败");
    } finally {
      setLoadingFill(false);
    }
  }, [gapCount, gapDays, platform, contentPosts]);

  // ─── Batch auto-fill ───────────────────────────────────────────
  const handleBatchGenerate = useCallback(async () => {
    setLoadingBatch(true);
    setBatchItems([]);

    try {
      const res = await fetch("/api/ai/schedule-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          days: 7,
          contentPosts: contentPosts.map((p) => ({
            scheduledDate: p.scheduledDate,
            contentType: p.contentType,
            topic: p.topic,
            likes: p.likes,
            comments: p.comments,
            shares: p.shares,
            status: p.status,
          })),
        }),
      });

      if (!res.ok) throw new Error("API request failed");

      const data = await res.json();
      const items: ScheduleSlot[] = data.schedule || [];
      setBatchItems(items);
      toast.success(`已生成 ${items.length} 条排期建议`);
    } catch {
      toast.error("批量排期生成失败");
    } finally {
      setLoadingBatch(false);
    }
  }, [platform, contentPosts]);

  const handleReorder = useCallback(
    (index: number, direction: "up" | "down") => {
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= batchItems.length) return;
      const next = [...batchItems];
      const temp = next[index];
      next[index] = next[target];
      next[target] = temp;
      setBatchItems(next);
    },
    [batchItems]
  );

  const handleApplyBatch = useCallback(async () => {
    if (batchItems.length === 0) return;

    setApplyingBatch(true);
    let successCount = 0;

    try {
      for (const item of batchItems) {
        const newPost: ContentPost = {
          id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          planId: "",
          scheduledDate: item.day,
          platform,
          contentType: item.contentType,
          topic: item.topic,
          content: "",
          status: "planned",
          generationType: "auto",
          likes: 0,
          comments: 0,
          shares: 0,
          views: 0,
          aiScore: 0,
          feedback: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        addContentPost(newPost);
        successCount++;
      }

      toast.success(`已成功排期 ${successCount} 条内容到日历`);
      setBatchItems([]);
    } catch {
      toast.error("排期应用失败");
    } finally {
      setApplyingBatch(false);
    }
  }, [batchItems, platform, addContentPost]);

  // ─── Render ────────────────────────────────────────────────────
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group/trig">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-500/15 to-orange-500/15 flex items-center justify-center">
                <CalendarClock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">AI排期助手</span>
                <span className="text-[10px] text-muted-foreground">
                  {scheduleGenerated
                    ? `${scheduleSlots.length} 条排期建议`
                    : gapCount > 0
                    ? `本周 ${gapCount} 天空白`
                    : "智能排期分析"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {gapCount > 0 && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                >
                  <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                  {gapCount} 空白
                </Badge>
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
          {/* ─── Section 1: Posting Frequency Analyzer ─── */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              发布频率分析
            </span>

            <div className="rounded-lg border p-3 space-y-3">
              {/* Platform & frequency header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium">
                    {PLATFORM_LABELS[platform]}
                  </span>
                  <Badge
                    variant="secondary"
                    className="text-[9px] px-1.5 py-0 h-4"
                  >
                    本周 {postsPerWeek} 条
                  </Badge>
                </div>
                <span
                  className={`text-[10px] font-medium ${getFrequencyColor(frequencyLevel)}`}
                >
                  {getFrequencyLabel(frequencyLevel)}
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="relative">
                  <Progress
                    value={frequencyProgress}
                    className="h-2 [&>div]:bg-muted"
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${frequencyProgress}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className={`absolute top-0 left-0 h-2 rounded-full ${getFrequencyBg(frequencyLevel)}`}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>推荐: {freqConfig.label}</span>
                  <span>{frequencyProgress}%</span>
                </div>
              </div>

              {/* Weekly breakdown */}
              <div className="grid grid-cols-7 gap-1">
                {dayGaps.map((gap, idx) => (
                  <motion.div
                    key={gap.dateStr}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.04 }}
                    className={`flex flex-col items-center gap-0.5 p-1 rounded-md transition-colors ${
                      gap.hasContent
                        ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-800/50"
                        : "bg-red-50 dark:bg-red-900/15 border border-red-200/50 dark:border-red-800/50"
                    }`}
                  >
                    <span className="text-[9px] text-muted-foreground">
                      {WEEKDAY_LABELS[idx]}
                    </span>
                    {gap.hasContent ? (
                      <Check className="h-3 w-3 text-amber-500" />
                    ) : (
                      <CalendarX className="h-3 w-3 text-red-400" />
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* ─── Section 2: Content Gap Detector ─── */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                <CalendarX className="h-3 w-3" />
                空白日检测
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 ${
                  gapCount === 0
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                }`}
              >
                {gapCount === 0 ? "全覆盖" : `${gapCount} 天空白`}
              </Badge>
            </div>

            <AnimatePresence mode="wait">
              {gapCount > 0 ? (
                <motion.div
                  key="gaps"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="space-y-2"
                >
                  {/* Gap list */}
                  <ScrollArea className="max-h-32">
                    <div className="space-y-1">
                      {gapDays.map((gap, idx) => (
                        <motion.div
                          key={gap.dateStr}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-amber-50/80 dark:bg-amber-950/15 border border-amber-100 dark:border-amber-900/30"
                        >
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                          <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
                            {gap.dateStr}
                          </span>
                          <span className="text-[10px] text-amber-600/70 dark:text-amber-400/60">
                            周{gap.dayLabel}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Fill gaps button */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-8 text-xs border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                    onClick={handleFillGaps}
                    disabled={loadingFill}
                  >
                    {loadingFill ? (
                      <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                    ) : (
                      <Zap className="h-3 w-3 mr-1.5" />
                    )}
                    {loadingFill ? "正在生成..." : "AI 补充空白日"}
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="no-gaps"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex items-center gap-2 px-3 py-3 rounded-md bg-emerald-50 dark:bg-emerald-950/15 border border-emerald-100 dark:border-emerald-900/30"
                >
                  <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    本周所有日期都已安排内容，很棒！
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Separator />

          {/* ─── Section 3: Smart Schedule Suggestions ─── */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                AI 排期建议
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
                onClick={handleGenerateSchedule}
                disabled={loadingSchedule}
              >
                {loadingSchedule ? (
                  <Loader2 className="h-2.5 w-2.5 mr-0.5 animate-spin" />
                ) : (
                  <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                )}
                {scheduleGenerated ? "重新生成" : "生成排期"}
              </Button>
            </div>

            {loadingSchedule && (
              <div className="space-y-2">
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
              </div>
            )}

            {!loadingSchedule && scheduleGenerated && scheduleSlots.length > 0 && (
              <ScrollArea className="max-h-52">
                <div className="space-y-1.5">
                  {scheduleSlots.map((slot, idx) => {
                    const dateLabel = safeFormat(slot.day, "MM/dd EEE", "--", {
                      locale: zhCN,
                    });

                    return (
                      <motion.div
                        key={`${slot.day}-${slot.time}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="rounded-lg border p-2.5 hover:shadow-sm transition-all bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10"
                      >
                        <div className="flex items-start gap-2.5">
                          {/* Date indicator */}
                          <div className="flex-shrink-0 mt-0.5">
                            <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                              <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            </div>
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            {/* Date & time */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] font-semibold">
                                {dateLabel}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1.5 py-0 h-4 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60"
                              >
                                <Clock className="h-2.5 w-2.5 mr-0.5" />
                                {slot.time}
                              </Badge>
                              <Badge
                                variant="secondary"
                                className="text-[9px] px-1.5 py-0 h-4"
                              >
                                {getContentTypeLabel(slot.contentType, platform)}
                              </Badge>
                            </div>

                            {/* Topic */}
                            <p className="text-[11px] font-medium text-foreground truncate">
                              {slot.topic}
                            </p>

                            {/* Reasoning */}
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                              {slot.reasoning}
                            </p>
                          </div>

                          {/* Rank */}
                          <div className="flex-shrink-0">
                            <div className="h-5 w-5 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">
                                {idx + 1}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}

            {!loadingSchedule && !scheduleGenerated && (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                <CalendarClock className="h-8 w-8 mb-2 text-amber-300 dark:text-amber-700" />
                <p className="text-xs">点击"生成排期"获取AI建议</p>
              </div>
            )}
          </div>

          <Separator />

          {/* ─── Section 4: Batch Quick-Schedule ─── */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
              <Layers className="h-3 w-3" />
              批量快速排期
            </span>

            <Button
              size="sm"
              className="w-full h-9 text-xs bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm"
              onClick={handleBatchGenerate}
              disabled={loadingBatch}
            >
              {loadingBatch ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Flame className="h-3.5 w-3.5 mr-1.5" />
              )}
              {loadingBatch ? "正在生成..." : "Auto-fill 下7天"}
            </Button>

            {/* Draggable batch list */}
            <AnimatePresence>
              {batchItems.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <ScrollArea className="max-h-52">
                    <div className="space-y-1">
                      {batchItems.map((item, idx) => {
                        const dateLabel = safeFormat(item.day, "MM/dd EEE", "--", {
                          locale: zhCN,
                        });

                        return (
                          <motion.div
                            key={`batch-${item.day}-${idx}`}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.04 }}
                            className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-muted/50 border border-border/20 hover:bg-muted/80 transition-colors group"
                          >
                            {/* Drag handle */}
                            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0 cursor-grab" />

                            {/* Reorder buttons */}
                            <div className="flex flex-col gap-0.5 flex-shrink-0">
                              <button
                                onClick={() => handleReorder(idx, "up")}
                                disabled={idx === 0}
                                className="p-0.5 rounded hover:bg-muted disabled:opacity-30 transition-colors"
                              >
                                <ArrowUp className="h-2.5 w-2.5" />
                              </button>
                              <button
                                onClick={() => handleReorder(idx, "down")}
                                disabled={idx === batchItems.length - 1}
                                className="p-0.5 rounded hover:bg-muted disabled:opacity-30 transition-colors"
                              >
                                <ArrowDown className="h-2.5 w-2.5" />
                              </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                                  {dateLabel}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {item.time}
                                </span>
                                <Badge
                                  variant="secondary"
                                  className="text-[8px] px-1 py-0 h-3.5"
                                >
                                  {getContentTypeLabel(
                                    item.contentType,
                                    platform
                                  )}
                                </Badge>
                              </div>
                              <p className="text-[11px] truncate">
                                {item.topic}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </ScrollArea>

                  {/* Apply button */}
                  <div className="mt-2">
                    <Button
                      size="sm"
                      className="w-full h-8 text-xs bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
                      onClick={handleApplyBatch}
                      disabled={applyingBatch}
                    >
                      {applyingBatch ? (
                        <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                      ) : (
                        <Target className="h-3 w-3 mr-1.5" />
                      )}
                      {applyingBatch
                        ? "正在应用..."
                        : `应用排期（${batchItems.length} 条）`}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Batch empty state */}
            {batchItems.length === 0 && !loadingBatch && (
              <p className="text-[10px] text-center text-muted-foreground py-2">
                点击上方按钮，AI将自动生成未来7天的排期
              </p>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
