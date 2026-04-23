"use client";

import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import type { ContentPost } from "@/types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  GripVertical,
  Loader2,
  Sparkles,
  Clock,
  CalendarDays,
  PartyPopper,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ReschedulePanelProps {
  post: ContentPost;
}

interface CalendarDay {
  date: string;        // yyyy-MM-dd
  day: number;         // 1-31
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  postCount: number;   // number of posts on this day
}

// ─── Date Helpers ────────────────────────────────────────────────────────────

function toDateString(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function getTodayString(): string {
  const now = new Date();
  return toDateString(now.getFullYear(), now.getMonth(), now.getDate());
}

const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

// ─── Smart Suggestion Type ──────────────────────────────────────────────────

interface SmartSuggestion {
  id: string;
  label: string;
  description: string;
  icon: typeof Sparkles;
  color: string;       // text color
  bg: string;          // background
  getDate: (currentDate: string, dateCounts: Map<string, number>) => string | null;
}

const SMART_SUGGESTIONS: SmartSuggestion[] = [
  {
    id: "best-day",
    label: "最佳发布日",
    description: "本周最少内容的一天",
    icon: Sparkles,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800",
    getDate: (_currentDate, dateCounts) => {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());

      let bestDate: string | null = null;
      let minCount = Infinity;

      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        const ds = toDateString(d.getFullYear(), d.getMonth(), d.getDate());
        if (d < today) continue; // skip past days
        const count = dateCounts.get(ds) || 0;
        if (count < minCount) {
          minCount = count;
          bestDate = ds;
        }
      }
      return bestDate;
    },
  },
  {
    id: "next-empty",
    label: "保持节奏",
    description: "当前位置之后的第一个空日",
    icon: Clock,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
    getDate: (currentDate, dateCounts) => {
      const current = new Date(currentDate);
      for (let i = 1; i <= 60; i++) {
        const d = new Date(current);
        d.setDate(current.getDate() + i);
        const ds = toDateString(d.getFullYear(), d.getMonth(), d.getDate());
        if ((dateCounts.get(ds) || 0) === 0) return ds;
      }
      return null;
    },
  },
  {
    id: "weekend",
    label: "周末发布",
    description: "下一个周六或周日",
    icon: PartyPopper,
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800",
    getDate: (currentDate, _dateCounts) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      for (let i = 0; i < 14; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const day = d.getDay();
        if (day === 0 || day === 6) {
          const ds = toDateString(d.getFullYear(), d.getMonth(), d.getDate());
          if (ds > currentDate) return ds;
        }
      }
      return null;
    },
  },
  {
    id: "skip-one",
    label: "顺延一天",
    description: "当前日期 +1 天",
    icon: Zap,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
    getDate: (currentDate, _dateCounts) => {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      return toDateString(d.getFullYear(), d.getMonth(), d.getDate());
    },
  },
];

// ─── Animation Variants ──────────────────────────────────────────────────────

const panelVariants = {
  hidden: { opacity: 0, height: 0, marginTop: 0 },
  visible: { opacity: 1, height: "auto", marginTop: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, height: 0, marginTop: 0, transition: { duration: 0.2 } },
};

const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

// ─── Main Component ──────────────────────────────────────────────────────────

export function ContentReschedulePanel({ post }: ReschedulePanelProps) {
  const { contentPosts, updateContentPost, addNotification } = useAppStore();

  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => new Date(post.scheduledDate).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date(post.scheduledDate).getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const todayStr = getTodayString();

  // ── Build date → post count map ──────────────────────────────────────────
  const dateCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of contentPosts) {
      if (p.id === post.id) continue; // exclude current post
      const count = map.get(p.scheduledDate) || 0;
      map.set(p.scheduledDate, count + 1);
    }
    return map;
  }, [contentPosts, post.id]);

  // ── Build calendar days grid ─────────────────────────────────────────────
  const calendarDays = useMemo((): CalendarDay[] => {
    const days: CalendarDay[] = [];
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

    // Previous month padding
    const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    const prevDays = getDaysInMonth(prevYear, prevMonth);
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevDays - i;
      const ds = toDateString(prevYear, prevMonth, d);
      days.push({
        date: ds,
        day: d,
        isCurrentMonth: false,
        isToday: ds === todayStr,
        isPast: ds < todayStr,
        postCount: dateCountMap.get(ds) || 0,
      });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = toDateString(viewYear, viewMonth, d);
      days.push({
        date: ds,
        day: d,
        isCurrentMonth: true,
        isToday: ds === todayStr,
        isPast: ds < todayStr,
        postCount: dateCountMap.get(ds) || 0,
      });
    }

    // Next month padding (fill to 42 = 6 rows)
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const ds = toDateString(nextYear, nextMonth, d);
      days.push({
        date: ds,
        day: d,
        isCurrentMonth: false,
        isToday: ds === todayStr,
        isPast: ds < todayStr,
        postCount: dateCountMap.get(ds) || 0,
      });
    }

    return days;
  }, [viewYear, viewMonth, dateCountMap, todayStr]);

  // ── Navigation ──────────────────────────────────────────────────────────
  const goToPrevMonth = useCallback(() => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }, [viewMonth]);

  const goToNextMonth = useCallback(() => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }, [viewMonth]);

  // ── Smart suggestions computed dates ────────────────────────────────────
  const smartDates = useMemo(() => {
    return SMART_SUGGESTIONS.map((s) => ({
      ...s,
      suggestedDate: s.getDate(post.scheduledDate, dateCountMap),
    })).filter((s) => s.suggestedDate !== null);
  }, [post.scheduledDate, dateCountMap]);

  // ── Submit reschedule ───────────────────────────────────────────────────
  const handleConfirm = useCallback(async () => {
    if (!selectedDate || selectedDate === post.scheduledDate) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/content/${post.id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
          newDate: selectedDate,
          reason: "用户手动改期",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "改期失败");
      }

      const data = await res.json();
      const updatedPost = (data as { post?: ContentPost }).post;
      if (updatedPost) {
        updateContentPost(post.id, updatedPost);
      }

      toast.success("内容已改期", {
        description: `从 ${post.scheduledDate} 改至 ${selectedDate}`,
      });

      addNotification({
        type: "schedule",
        category: "schedule",
        title: "内容改期",
        description: `"${post.topic || "未命名"}" 已从 ${post.scheduledDate} 改至 ${selectedDate}`,
        postId: post.id,
      });

      setIsOpen(false);
      setSelectedDate(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "改期失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedDate, post, updateContentPost, addNotification]);

  const handleCancel = useCallback(() => {
    setSelectedDate(null);
    setIsOpen(false);
  }, []);

  // ── Handle smart suggestion click ──────────────────────────────────────
  const handleSuggestionClick = useCallback((date: string) => {
    const d = new Date(date);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setSelectedDate(date);
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center gap-2.5 py-2 px-3 rounded-xl border border-border/60 bg-card/80 hover:bg-muted/40 transition-all cursor-pointer group hover-glow-violet">
          {/* Drag indicator */}
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors" />

          {/* Icon */}
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 shadow-sm">
            <CalendarClock className="h-3.5 w-3.5 text-white" />
          </div>

          {/* Label */}
          <span className="text-xs font-semibold flex-1 text-left">内容改期</span>

          {/* Current date badge */}
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 h-4 font-normal text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20"
          >
            {post.scheduledDate}
          </Badge>

          {/* Arrow */}
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </motion.div>
        </button>
      </CollapsibleTrigger>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="reschedule-content"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="overflow-hidden"
          >
            <CollapsibleContent>
              <div className="mt-2 space-y-3 px-1">
                {/* ── Mini Calendar ──────────────────────────────────────────── */}
                <div className="bg-background/60 backdrop-blur-sm border border-border/60 rounded-xl p-3">
                  {/* Month navigation */}
                  <div className="flex items-center justify-between mb-2.5">
                    <button
                      onClick={goToPrevMonth}
                      className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-semibold text-foreground">
                      {viewYear}年{viewMonth + 1}月
                    </span>
                    <button
                      onClick={goToNextMonth}
                      className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Weekday headers */}
                  <div className="grid grid-cols-7 gap-0.5 mb-1">
                    {WEEKDAY_LABELS.map((label) => (
                      <div
                        key={label}
                        className="text-center text-[10px] font-medium text-muted-foreground py-1"
                      >
                        {label}
                      </div>
                    ))}
                  </div>

                  {/* Day buttons grid */}
                  <div className="grid grid-cols-7 gap-0.5">
                    {calendarDays.map((dayInfo) => {
                      const isPostDate = dayInfo.date === post.scheduledDate;
                      const isSelected = dayInfo.date === selectedDate;
                      const hasPosts = dayInfo.postCount > 0;

                      return (
                        <TooltipProvider key={dayInfo.date} delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                disabled={dayInfo.isPast}
                                onClick={() => {
                                  if (!dayInfo.isPast) {
                                    setSelectedDate(dayInfo.date);
                                  }
                                }}
                                className={`
                                  relative h-7 w-full rounded-md flex flex-col items-center justify-center
                                  text-[11px] transition-all duration-150 cursor-pointer
                                  ${dayInfo.isPast
                                    ? "text-muted-foreground/30 cursor-not-allowed"
                                    : !dayInfo.isCurrentMonth
                                      ? "text-muted-foreground/40 hover:text-muted-foreground/70"
                                      : isSelected
                                        ? "bg-violet-500 text-white shadow-sm shadow-violet-500/30"
                                        : isPostDate
                                          ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-700"
                                          : dayInfo.isToday
                                            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-semibold"
                                            : "hover:bg-muted/60 text-foreground"
                                  }
                                `}
                              >
                                {dayInfo.day}
                                {/* Post count badge */}
                                {hasPosts && !dayInfo.isPast && (
                                  <span className={`absolute -top-0.5 -right-0.5 h-3 min-w-[10px] px-0.5 rounded-full flex items-center justify-center text-[7px] font-bold leading-none ${
                                    isSelected
                                      ? "bg-white text-violet-600"
                                      : "bg-amber-500 text-white"
                                  }`}>
                                    {dayInfo.postCount}
                                  </span>
                                )}
                                {/* Selection indicator */}
                                {isSelected && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-3 rounded-full bg-white"
                                  />
                                )}
                              </motion.button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-[10px]">
                              <p>{dayInfo.date}</p>
                              {isPostDate && <p className="text-violet-400">当前日期</p>}
                              {dayInfo.isToday && <p className="text-emerald-400">今天</p>}
                              {hasPosts && <p className="text-amber-400">{dayInfo.postCount} 条内容</p>}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/40">
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-[9px] text-muted-foreground">今天</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-violet-400" />
                      <span className="text-[9px] text-muted-foreground">当前</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <span className="text-[9px] text-muted-foreground">有内容</span>
                    </div>
                    {selectedDate && (
                      <div className="flex items-center gap-1 ml-auto">
                        <Check className="h-2.5 w-2.5 text-violet-500" />
                        <span className="text-[9px] text-violet-500 font-medium">
                          已选 {selectedDate}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Smart Suggestions ─────────────────────────────────────── */}
                <div className="space-y-1.5">
                  <p className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase px-0.5 flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    智能建议
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {smartDates.map((suggestion, idx) => {
                      const Icon = suggestion.icon;
                      const isActive = suggestion.suggestedDate === selectedDate;
                      return (
                        <motion.button
                          key={suggestion.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          whileHover={{ y: -1 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleSuggestionClick(suggestion.suggestedDate!)}
                          className={`
                            relative flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-left transition-all cursor-pointer
                            ${isActive
                              ? `${suggestion.bg} ring-2 ring-violet-400/50 shadow-sm`
                              : `${suggestion.bg} hover:shadow-sm`
                            }
                          `}
                        >
                          <Icon className={`h-3.5 w-3.5 shrink-0 ${suggestion.color}`} />
                          <div className="min-w-0">
                            <p className={`text-[10px] font-semibold truncate ${suggestion.color}`}>
                              {suggestion.label}
                            </p>
                            <p className="text-[8px] text-muted-foreground truncate">
                              {suggestion.suggestedDate}
                            </p>
                          </div>
                          {isActive && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-violet-500 flex items-center justify-center"
                            >
                              <Check className="h-2.5 w-2.5 text-white" />
                            </motion.div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* ── Confirm / Cancel Buttons ──────────────────────────────── */}
                <AnimatePresence>
                  {selectedDate && selectedDate !== post.scheduledDate && (
                    <motion.div
                      {...fadeIn}
                      className="flex items-center gap-2"
                    >
                      <Button
                        onClick={handleConfirm}
                        disabled={isSubmitting}
                        size="sm"
                        className="flex-1 h-8 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white border-0 text-xs gap-1.5 shadow-sm shadow-violet-500/20"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            改期中...
                          </>
                        ) : (
                          <>
                            <Check className="h-3 w-3" />
                            确认改期至 {selectedDate.slice(5)}
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={handleCancel}
                        disabled={isSubmitting}
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground border-border/60"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </CollapsibleContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Collapsible>
  );
}
