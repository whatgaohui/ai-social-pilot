"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import type { ContentPost, ContentPlan } from "@/types";
import {
  POST_STATUS_LABELS,
  XHS_CONTENT_TYPE_LABELS,
  CONTENT_TYPE_LABELS,
  XHS_CONTENT_TYPE_COLORS,
  CONTENT_TYPE_COLORS,
  PostStatus,
  XHSContentType,
  ContentType,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Loader2,
  CalendarDays,
  LayoutGrid,
  List,
  FileText,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isToday,
  isAfter,
  addMonths,
  subMonths,
  parseISO,
  startOfDay,
} from "date-fns";
import { zhCN } from "date-fns/locale";

// --- Color maps (mirrors content-calendar.tsx) ---

const STATUS_DOT_COLORS: Record<PostStatus, string> = {
  planned: "bg-gray-400",
  generated: "bg-sky-500",
  optimized: "bg-amber-500",
  published: "bg-violet-500",
};

const STATUS_BADGE_COLORS: Record<PostStatus, string> = {
  planned: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  generated: "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300",
  optimized: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300",
  published: "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300",
};

const PLATFORM_DOT_COLORS: Record<string, string> = {
  wechat: "bg-green-500",
  xiaohongshu: "bg-red-500",
};

const WEEKDAYS_SHORT = ["一", "二", "三", "四", "五", "六", "日"];

// --- Helpers ---

function getContentTypeLabelForPost(post: ContentPost) {
  if (post.platform === "xiaohongshu")
    return XHS_CONTENT_TYPE_LABELS[post.contentType as XHSContentType] || post.contentType;
  return CONTENT_TYPE_LABELS[post.contentType as ContentType] || post.contentType;
}

function getContentTypeColorForPost(post: ContentPost) {
  if (post.platform === "xiaohongshu")
    return XHS_CONTENT_TYPE_COLORS[post.contentType as XHSContentType] || "";
  return CONTENT_TYPE_COLORS[post.contentType as ContentType] || "";
}

// --- Component ---

export function CompactCalendar() {
  const {
    currentPlan,
    setCurrentPlan,
    contentPosts,
    setContentPosts,
    selectedDate,
    setSelectedDate,
    persona,
    knowledgeItems,
    isGenerating,
    setIsGenerating,
    setSelectedPostId,
    platform,
  } = useAppStore();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [platformFilter, setPlatformFilter] = useState<"all" | "wechat" | "xiaohongshu">("all");

  // --- Calendar math ---
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = (getDay(monthStart) + 6) % 7; // Monday = 0

  // --- Platform filter ---
  const filteredPosts = useMemo(() => {
    return contentPosts.filter((p) => {
      if (platformFilter === "all") return true;
      if (!p.platform && platformFilter === "wechat") return true;
      return p.platform === platformFilter;
    });
  }, [contentPosts, platformFilter]);

  const postsByDate = useMemo(() => {
    const map: Record<string, ContentPost[]> = {};
    filteredPosts.forEach((post) => {
      if (!map[post.scheduledDate]) {
        map[post.scheduledDate] = [];
      }
      map[post.scheduledDate].push(post);
    });
    return map;
  }, [filteredPosts]);

  // --- Upcoming posts (next 5 from today) ---
  const upcomingPosts = useMemo(() => {
    const todayStr = format(startOfDay(new Date()), "yyyy-MM-dd");
    return [...filteredPosts]
      .filter((p) => p.scheduledDate >= todayStr)
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
      .slice(0, 5);
  }, [filteredPosts]);

  // --- All posts sorted for list view ---
  const sortedPosts = useMemo(() => {
    return [...filteredPosts]
      .filter((p) => p.scheduledDate)
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  }, [filteredPosts]);

  // --- Stats ---
  const stats = useMemo(() => {
    const total = filteredPosts.length;
    const optimized = filteredPosts.filter((p) => p.status === "optimized").length;
    const published = filteredPosts.filter((p) => p.status === "published").length;
    return { total, optimized, published };
  }, [filteredPosts]);

  // --- Handlers ---
  const handlePrevMonth = () => setCurrentMonth((prev) => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1));

  const handleDayClick = useCallback(
    (dateStr: string) => {
      setSelectedDate(dateStr);
      const posts = postsByDate[dateStr];
      if (posts && posts.length > 0) {
        const match = posts.find((p) => !p.platform || p.platform === platform);
        setSelectedPostId((match || posts[0]).id);
      }
    },
    [postsByDate, platform, setSelectedDate, setSelectedPostId]
  );

  const handleListItemClick = useCallback(
    (post: ContentPost) => {
      setSelectedDate(post.scheduledDate);
      setSelectedPostId(post.id);
    },
    [setSelectedDate, setSelectedPostId]
  );

  const createPlanAndGenerate = async () => {
    if (!persona?.name) {
      toast.error("请先设置人设信息");
      return;
    }
    if (knowledgeItems.length === 0) {
      toast.error("请先在知识库中添加内容");
      return;
    }

    setIsGenerating(true);
    try {
      const monthStr = format(currentMonth, "yyyy-MM");
      const planRes = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: monthStr,
          theme: `${persona.name}的${format(currentMonth, "yyyy年M月")}计划`,
          status: "draft",
        }),
      });
      if (!planRes.ok) throw new Error("Failed to create plan");
      const plan = await planRes.json();

      const genRes = await fetch("/api/ai/batch-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          persona,
          knowledgeItems,
          startDate: format(startOfMonth(currentMonth), "yyyy-MM-dd"),
          month: format(currentMonth, "yyyy年M月"),
          platform,
        }),
      });
      if (!genRes.ok) {
        const errorData = await genRes.json();
        throw new Error(errorData.error || "Failed to generate");
      }
      const genData = await genRes.json();
      setCurrentPlan({ ...plan, status: "active" });
      setContentPosts(genData.posts);
      toast.success(`成功生成 ${genData.count} 条内容！`);
    } catch (error) {
      console.error("Generation error:", error);
      toast.error("生成失败，请稍后重试");
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Platform filter config ---
  const platformFilters: {
    value: "all" | "wechat" | "xiaohongshu";
    label: string;
    dotColor?: string;
    count: number;
  }[] = [
    { value: "all", label: "全部", count: contentPosts.length },
    {
      value: "wechat",
      label: "朋友圈",
      dotColor: "bg-green-500",
      count: contentPosts.filter((p) => !p.platform || p.platform === "wechat").length,
    },
    {
      value: "xiaohongshu",
      label: "小红书",
      dotColor: "bg-red-500",
      count: contentPosts.filter((p) => p.platform === "xiaohongshu").length,
    },
  ];

  return (
    <div className="flex flex-col h-full select-none">
      {/* ====== Header: Month nav + view toggle ====== */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handlePrevMonth}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs font-semibold min-w-[80px] text-center tabular-nums">
            {format(currentMonth, "yyyy年M月", { locale: zhCN })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleNextMonth}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          {/* View toggle */}
          <div className="flex items-center bg-muted rounded-md p-0.5">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="h-5 w-5 p-0"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-3 w-3" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-5 w-5 p-0"
              onClick={() => setViewMode("list")}
            >
              <List className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* ====== Platform filter ====== */}
      <div className="flex items-center gap-1 px-3 pb-2">
        {platformFilters.map((pf) => {
          const isSelected = platformFilter === pf.value;
          const isWechat = pf.value === "wechat";
          const isXH = pf.value === "xiaohongshu";
          return (
            <button
              key={pf.value}
              onClick={() => setPlatformFilter(pf.value)}
              className={`
                flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium transition-all duration-200
                ${
                  isSelected
                    ? isWechat
                      ? "bg-green-500 text-white shadow-sm"
                      : isXH
                        ? "bg-red-500 text-white shadow-sm"
                        : "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }
              `}
            >
              {pf.dotColor && (
                <span
                  className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white" : pf.dotColor}`}
                />
              )}
              {pf.label}
              <span className={`tabular-nums ${isSelected ? "text-white/70" : "text-muted-foreground/70"}`}>
                {pf.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ====== Calendar content ====== */}
      <ScrollArea className="flex-1">
        <AnimatePresence mode="wait">
          {viewMode === "grid" ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {/* Compact grid */}
              <div className="px-3">
                {/* Weekday header row */}
                <div className="grid grid-cols-7 gap-px mb-0.5">
                  {WEEKDAYS_SHORT.map((d) => (
                    <div
                      key={d}
                      className="h-5 flex items-center justify-center text-[9px] font-medium text-muted-foreground"
                    >
                      {d}
                    </div>
                  ))}
                </div>

                {/* Days grid */}
                <div className="grid grid-cols-7 gap-px">
                  {/* Empty offset cells */}
                  {Array.from({ length: startDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-7" />
                  ))}

                  {/* Day cells - compact 28px height */}
                  {daysInMonth.map((day) => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const posts = postsByDate[dateStr];
                    const today = isToday(day);
                    const isSelected = selectedDate === dateStr;
                    const primaryPost = posts?.[0];

                    return (
                      <motion.button
                        key={dateStr}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => handleDayClick(dateStr)}
                        className={`
                          relative h-7 w-full rounded-sm flex flex-col items-center justify-center cursor-pointer
                          transition-colors duration-150
                          ${isSelected ? "bg-primary/15 ring-1.5 ring-primary" : ""}
                          ${today && !isSelected ? "ring-1 ring-primary/40" : ""}
                          ${primaryPost ? (isSelected ? "bg-primary/15" : "bg-muted/60 hover:bg-muted") : "hover:bg-muted/40"}
                        `}
                      >
                        <span
                          className={`text-[10px] leading-none ${
                            today
                              ? "font-bold text-primary"
                              : isSelected
                                ? "font-semibold text-primary"
                                : "text-foreground/80"
                          }`}
                        >
                          {format(day, "d")}
                        </span>
                        {/* Dots row */}
                        {posts && posts.length > 0 && (
                          <div className="flex items-center gap-[2px] mt-[1px]">
                            {/* Platform dots (when all view and multiple posts) */}
                            {platformFilter === "all" && posts.length > 1 && (
                              <>
                                {posts
                                  .reduce((acc, p) => {
                                    const plat = p.platform || "wechat";
                                    if (!acc.includes(plat)) acc.push(plat);
                                    return acc;
                                  }, [] as string[])
                                  .map((plat) => (
                                    <span
                                      key={plat}
                                      className={`h-[3px] w-[3px] rounded-full ${PLATFORM_DOT_COLORS[plat]}`}
                                    />
                                  ))}
                              </>
                            )}
                            {/* Status dot (when single post or filtered) */}
                            {platformFilter !== "all" || posts.length <= 1 ? (
                              <span
                                className={`h-[3px] w-[3px] rounded-full ${STATUS_DOT_COLORS[(primaryPost?.status || "planned") as PostStatus]}`}
                              />
                            ) : null}
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Mini legend */}
                {filteredPosts.length > 0 && (
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-2 pt-1.5 border-t">
                    {platformFilter === "all" && (
                      <>
                        <span className="flex items-center gap-1">
                          <span className="h-[5px] w-[5px] rounded-full bg-green-500" />
                          <span className="text-[8px] text-muted-foreground">朋友圈</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="h-[5px] w-[5px] rounded-full bg-red-500" />
                          <span className="text-[8px] text-muted-foreground">小红书</span>
                        </span>
                      </>
                    )}
                    {(["planned", "generated", "optimized", "published"] as PostStatus[]).map(
                      (s) => (
                        <span key={s} className="flex items-center gap-1">
                          <span className={`h-[5px] w-[5px] rounded-full ${STATUS_DOT_COLORS[s]}`} />
                          <span className="text-[8px] text-muted-foreground">
                            {POST_STATUS_LABELS[s]}
                          </span>
                        </span>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* ====== Upcoming Posts ====== */}
              {upcomingPosts.length > 0 && (
                <div className="px-3 mt-3 pt-2 border-t">
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    即将发布
                  </h4>
                  <div className="space-y-1.5">
                    {upcomingPosts.map((post, idx) => {
                      let dayLabel = "";
                      try {
                        dayLabel = format(parseISO(post.scheduledDate), "M/d EEE", { locale: zhCN });
                      } catch {
                        dayLabel = post.scheduledDate;
                      }
                      return (
                        <motion.button
                          key={post.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.15, delay: idx * 0.03 }}
                          onClick={() => handleListItemClick(post)}
                          className="w-full flex items-center gap-1.5 rounded-md px-1.5 py-1 text-left hover:bg-muted/70 transition-colors group"
                        >
                          {/* Date */}
                          <span className="text-[9px] text-muted-foreground tabular-nums flex-shrink-0 w-[38px]">
                            {dayLabel}
                          </span>
                          {/* Platform + status dots */}
                          <div className="flex items-center gap-[2px] flex-shrink-0">
                            <span
                              className={`h-[4px] w-[4px] rounded-full ${PLATFORM_DOT_COLORS[post.platform || "wechat"]}`}
                            />
                            <span
                              className={`h-[4px] w-[4px] rounded-full ${STATUS_DOT_COLORS[post.status as PostStatus]}`}
                            />
                          </div>
                          {/* Topic (truncated) */}
                          <span className="text-[10px] font-medium truncate flex-1 leading-tight">
                            {post.topic}
                          </span>
                          {/* Status badge */}
                          <Badge
                            className={`text-[7px] px-1 py-0 h-3 leading-3 flex-shrink-0 ${STATUS_BADGE_COLORS[post.status as PostStatus]}`}
                            variant="secondary"
                          >
                            {POST_STATUS_LABELS[post.status as PostStatus]}
                          </Badge>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            /* ====== LIST VIEW ====== */
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="px-3 space-y-1 pb-2"
            >
              {sortedPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <CalendarDays className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-xs">本月暂无内容</p>
                </div>
              ) : (
                sortedPosts.map((post, index) => {
                  const isSelected = selectedDate === post.scheduledDate;
                  let formattedDate = "";
                  try {
                    formattedDate = format(parseISO(post.scheduledDate), "M/d EEEE", { locale: zhCN });
                  } catch {
                    formattedDate = post.scheduledDate;
                  }

                  return (
                    <motion.button
                      key={post.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.12, delay: index * 0.015 }}
                      onClick={() => handleListItemClick(post)}
                      className={`
                        w-full rounded-md border p-1.5 text-left transition-all duration-150
                        hover:border-primary/30 hover:bg-muted/50
                        ${isSelected ? "ring-1.5 ring-primary bg-primary/[0.05] border-primary/40" : "border-border"}
                      `}
                    >
                      <div className="flex items-center gap-1.5">
                        {/* Date */}
                        <span className="text-[9px] text-muted-foreground tabular-nums flex-shrink-0 w-[52px] leading-tight">
                          {formattedDate}
                        </span>
                        {/* Dots */}
                        <div className="flex items-center gap-[2px] flex-shrink-0">
                          <span
                            className={`h-[4px] w-[4px] rounded-full ${PLATFORM_DOT_COLORS[post.platform || "wechat"]}`}
                          />
                          <span
                            className={`h-[4px] w-[4px] rounded-full ${STATUS_DOT_COLORS[post.status as PostStatus]}`}
                          />
                        </div>
                        {/* Content type badge */}
                        <Badge
                          className={`text-[7px] px-1 py-0 h-3 leading-3 flex-shrink-0 ${getContentTypeColorForPost(post)}`}
                          variant="secondary"
                        >
                          {getContentTypeLabelForPost(post)}
                        </Badge>
                        {/* Topic */}
                        <span className="text-[10px] font-medium truncate flex-1 leading-tight">
                          {post.topic}
                        </span>
                        {/* Status badge */}
                        <Badge
                          className={`text-[7px] px-1 py-0 h-3 leading-3 flex-shrink-0 ${STATUS_BADGE_COLORS[post.status as PostStatus]}`}
                          variant="secondary"
                        >
                          {POST_STATUS_LABELS[post.status as PostStatus]}
                        </Badge>
                      </div>
                      {/* Content preview */}
                      {post.content && (
                        <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight line-clamp-1 pl-[68px]">
                          {post.content.length > 50 ? post.content.slice(0, 50) + "…" : post.content}
                        </p>
                      )}
                    </motion.button>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ====== Stats summary ====== */}
        {filteredPosts.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-3 py-2 mt-2 border-t"
          >
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                总计 <strong className="text-foreground">{stats.total}</strong>
              </span>
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-amber-500" />
                优化 <strong className="text-foreground">{stats.optimized}</strong>
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-violet-500" />
                发布 <strong className="text-foreground">{stats.published}</strong>
              </span>
            </div>
          </motion.div>
        )}

        {/* ====== Batch generate button (compact) ====== */}
        <div className="px-3 pb-3 pt-1">
          <Button
            onClick={createPlanAndGenerate}
            disabled={isGenerating}
            size="sm"
            className="w-full h-7 text-[11px] bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-sm"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                生成中…
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3 mr-1" />
                一键生成30天
              </>
            )}
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}
