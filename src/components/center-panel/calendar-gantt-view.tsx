"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import type { ContentPost } from "@/types";
import {
  POST_STATUS_LABELS,
  XHS_CONTENT_TYPE_LABELS,
  CONTENT_TYPE_LABELS,
  PostStatus,
  XHSContentType,
  ContentType,
  PLATFORM_LABELS,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ZoomIn,
  ZoomOut,
  CalendarDays,
  Eye,
  Heart,
  MessageSquare,
  BarChart3,
} from "lucide-react";
import {
  format,
  parseISO,
  startOfDay,
  addDays,
  differenceInCalendarDays,
  isToday,
  isAfter,
  isBefore,
  isValid,
} from "date-fns";
import { zhCN } from "date-fns/locale";

// ─── Types ───────────────────────────────────────────────────────────────────

export type GanttZoomLevel = 7 | 14 | 30;

export interface CalendarGanttViewProps {
  /** Override posts; defaults to useAppStore contentPosts */
  posts?: ContentPost[];
}

// ─── Color Maps ──────────────────────────────────────────────────────────────

const STATUS_BAR_COLORS: Record<PostStatus, string> = {
  planned: "bg-gray-400 dark:bg-gray-500",
  generated: "bg-sky-400 dark:bg-sky-500",
  optimized: "bg-amber-400 dark:bg-amber-500",
  scheduled: "bg-violet-400 dark:bg-violet-500",
  published: "bg-emerald-400 dark:bg-emerald-500",
};

const STATUS_BAR_BG: Record<PostStatus, string> = {
  planned: "bg-gray-100 dark:bg-gray-800",
  generated: "bg-sky-50 dark:bg-sky-900/20",
  optimized: "bg-amber-50 dark:bg-amber-900/20",
  scheduled: "bg-violet-50 dark:bg-violet-900/20",
  published: "bg-emerald-50 dark:bg-emerald-900/20",
};

const STATUS_BADGE_COLORS: Record<PostStatus, string> = {
  planned: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  generated: "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300",
  optimized: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300",
  scheduled: "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300",
  published: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300",
};

const CONTENT_TYPE_BAR_COLORS: Record<string, string> = {
  text: "from-sky-400 to-sky-500",
  image: "from-emerald-400 to-emerald-500",
  video: "from-rose-400 to-rose-500",
  mixed: "bg-amber-400 to-amber-500",
  story: "from-purple-400 to-purple-500",
  insight: "from-cyan-400 to-cyan-500",
  interaction: "from-orange-400 to-orange-500",
  seeding: "from-pink-400 to-pink-500",
  review: "from-amber-400 to-amber-500",
  tutorial: "from-sky-400 to-sky-500",
  drygoods: "from-violet-400 to-violet-500",
  vlog: "from-teal-400 to-teal-500",
  daily: "from-orange-400 to-orange-500",
  recommend: "from-rose-400 to-rose-500",
  collection: "from-purple-400 to-purple-500",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getContentTypeLabel(post: ContentPost): string {
  if (post.platform === "xiaohongshu")
    return (
      XHS_CONTENT_TYPE_LABELS[post.contentType as XHSContentType] ||
      post.contentType
    );
  return (
    CONTENT_TYPE_LABELS[post.contentType as ContentType] || post.contentType
  );
}

function getBarGradient(post: ContentPost): string {
  const ct = CONTENT_TYPE_BAR_COLORS[post.contentType] || "from-gray-400 to-gray-500";
  return ct;
}

function getBarBgClass(post: ContentPost): string {
  return STATUS_BAR_BG[post.status as PostStatus] || "bg-gray-100 dark:bg-gray-800";
}

function getBarColorClass(post: ContentPost): string {
  return STATUS_BAR_COLORS[post.status as PostStatus] || "bg-gray-400";
}

function getPlatformLabel(post: ContentPost): string {
  if (!post.platform || post.platform === "wechat") return "朋友圈";
  return PLATFORM_LABELS[post.platform as keyof typeof PLATFORM_LABELS] || post.platform;
}

// ─── Gantt Bar Component ─────────────────────────────────────────────────────

interface GanttBarProps {
  post: ContentPost;
  startDate: Date;
  endDate: Date;
  dayWidth: number;
  barHeight: number;
  isSelected: boolean;
  onClick: (post: ContentPost) => void;
}

function GanttBar({
  post,
  startDate,
  endDate,
  dayWidth,
  barHeight,
  isSelected,
  onClick,
}: GanttBarProps) {
  const parsedDate = parseISO(post.scheduledDate);
  const postDate = isValid(parsedDate) ? parsedDate : new Date();
  const endPostDate = post.publishedAt
    ? (() => { const d = parseISO(post.publishedAt); return isValid(d) ? d : postDate; })()
    : post.scheduledDate === format(new Date(), "yyyy-MM-dd")
      ? new Date()
      : postDate;

  const totalDays = differenceInCalendarDays(endDate, startDate) + 1;
  const postStartOffset = differenceInCalendarDays(postDate, startDate);
  const postSpan = Math.max(1, differenceInCalendarDays(endPostDate, postDate) + 1);

  // Clamp
  const clampedOffset = Math.max(0, postStartOffset);
  const clampedEnd = Math.min(totalDays, postStartOffset + postSpan);
  const clampedSpan = Math.max(1, clampedEnd - clampedOffset);

  const barLeft = clampedOffset * dayWidth;
  const barWidth = clampedSpan * dayWidth - 4; // 4px gap

  if (barLeft > totalDays * dayWidth || clampedOffset >= totalDays) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{
              duration: 0.3,
              delay: clampedOffset * 0.01,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              left: `${barLeft + 2}px`,
              width: `${Math.max(barWidth, 40)}px`,
              height: `${barHeight}px`,
            }}
            onClick={() => onClick(post)}
            className={`
              absolute top-0 rounded-md overflow-hidden cursor-pointer
              border transition-all duration-200
              hover:shadow-md hover:z-10 hover:scale-[1.02]
              ${isSelected
                ? "ring-2 ring-primary border-primary shadow-md z-10"
                : "border-border hover:border-primary/40"
              }
              ${getBarBgClass(post)}
            `}
          >
            {/* Bar fill */}
            <div
              className={`
                absolute inset-y-0 left-0 rounded-md
                bg-gradient-to-r ${getBarGradient(post)}
                opacity-30
              `}
            />
            {/* Status accent line on left */}
            <div
              className={`absolute inset-y-0 left-0 w-[3px] rounded-l-md ${getBarColorClass(post)}`}
            />
            {/* Content */}
            <div className="relative px-2 h-full flex items-center gap-1 overflow-hidden">
              <span
                className={`text-[9px] font-medium truncate leading-tight ${isSelected ? "text-foreground" : "text-foreground/80"}`}
              >
                {post.topic}
              </span>
              {barWidth > 120 && (
                <Badge
                  className={`text-[7px] px-1 py-0 h-3 leading-3 flex-shrink-0 ${STATUS_BADGE_COLORS[post.status as PostStatus]}`}
                  variant="secondary"
                >
                  {POST_STATUS_LABELS[post.status as PostStatus]}
                </Badge>
              )}
            </div>
          </motion.button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[260px]">
          <div className="space-y-1">
            <p className="text-xs font-semibold">{post.topic}</p>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span>{getPlatformLabel(post)}</span>
              <span>·</span>
              <span>{getContentTypeLabel(post)}</span>
              <span>·</span>
              <Badge className={`text-[8px] px-1 py-0 h-3 ${STATUS_BADGE_COLORS[post.status as PostStatus]}`} variant="secondary">
                {POST_STATUS_LABELS[post.status as PostStatus]}
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground">
              排期：{format(postDate, "M月d日 EEEE", { locale: zhCN })}
              {post.publishedAt && (
                <span> · 发布：{format(parseISO(post.publishedAt), "M月d日")}</span>
              )}
            </p>
            {post.status === "published" && (
              <div className="flex items-center gap-2 text-[10px] pt-0.5">
                <span className="flex items-center gap-0.5 text-muted-foreground">
                  <Eye className="h-2.5 w-2.5" />{post.views}
                </span>
                <span className="flex items-center gap-0.5 text-rose-400">
                  <Heart className="h-2.5 w-2.5" />{post.likes}
                </span>
                <span className="flex items-center gap-0.5 text-amber-400">
                  <MessageSquare className="h-2.5 w-2.5" />{post.comments}
                </span>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function GanttEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <BarChart3 className="h-10 w-10 mb-3 opacity-30" />
      </motion.div>
      <p className="text-sm font-medium">暂无甘特图数据</p>
      <p className="text-xs text-muted-foreground/60 mt-1">
        创建内容后即可查看时间线分布
      </p>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function CalendarGanttView({ posts: externalPosts }: CalendarGanttViewProps) {
  const {
    contentPosts,
    selectedPostId,
    setSelectedPostId,
    setSelectedDate,
  } = useAppStore();

  const posts = externalPosts ?? contentPosts;

  // Zoom & range
  const [zoom, setZoom] = useState<GanttZoomLevel>(14);
  const [rangeStart, setRangeStart] = useState(() => startOfDay(new Date()));

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // ─── Computed Range ────────────────────────────────────────

  const rangeEnd = useMemo(
    () => addDays(rangeStart, zoom - 1),
    [rangeStart, zoom],
  );

  const totalDays = zoom;

  // ─── Filter & Sort Posts ───────────────────────────────────

  const ganttPosts = useMemo(() => {
    return [...posts]
      .filter((p) => p.scheduledDate)
      .filter(
        (p) =>
          !isAfter(parseISO(p.scheduledDate), rangeEnd) &&
          !isBefore(parseISO(p.scheduledDate), addDays(rangeStart, -1)),
      )
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  }, [posts, rangeStart, rangeEnd]);

  // ─── Responsive Day Width ─────────────────────────────────

  const dayWidth = useMemo(() => {
    // Minimum 48px per day, expand on wider screens
    return Math.max(48, Math.min(80, 1200 / totalDays));
  }, [totalDays]);

  const totalWidth = totalDays * dayWidth;

  const barHeight = 28;
  const rowGap = 8;

  // ─── Today Position ───────────────────────────────────────

  const todayPosition = useMemo(() => {
    const today = new Date();
    const diff = differenceInCalendarDays(today, rangeStart);
    if (diff < 0 || diff >= totalDays) return null;
    return diff * dayWidth + dayWidth / 2;
  }, [rangeStart, totalDays, dayWidth]);

  // ─── Navigation ───────────────────────────────────────────

  const handlePrevRange = useCallback(() => {
    setRangeStart((prev) => addDays(prev, -zoom));
  }, [zoom]);

  const handleNextRange = useCallback(() => {
    setRangeStart((prev) => addDays(prev, zoom));
  }, [zoom]);

  const handleToday = useCallback(() => {
    setRangeStart(startOfDay(new Date()));
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => {
      if (prev >= 30) return 30;
      return (prev === 7 ? 14 : 30) as GanttZoomLevel;
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => {
      if (prev <= 7) return 7;
      return (prev === 30 ? 14 : 7) as GanttZoomLevel;
    });
  }, []);

  // ─── Post Click ───────────────────────────────────────────

  const handlePostClick = useCallback(
    (post: ContentPost) => {
      setSelectedDate(post.scheduledDate);
      setSelectedPostId(post.id);
    },
    [setSelectedDate, setSelectedPostId],
  );

  // ─── Keyboard ─────────────────────────────────────────────

  useEffect(() => {
    function handleKeys(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.target as HTMLElement)?.isContentEditable) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod) return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          handlePrevRange();
          break;
        case "ArrowRight":
          e.preventDefault();
          handleNextRange();
          break;
        case "+":
        case "=":
          e.preventDefault();
          handleZoomIn();
          break;
        case "-":
        case "_":
          e.preventDefault();
          handleZoomOut();
          break;
        case "t":
        case "T":
          e.preventDefault();
          handleToday();
          break;
      }
    }
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [handlePrevRange, handleNextRange, handleZoomIn, handleZoomOut, handleToday]);

  // ─── Date Headers ─────────────────────────────────────────

  const dateHeaders = useMemo(() => {
    return Array.from({ length: totalDays }, (_, i) => {
      const day = addDays(rangeStart, i);
      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
      return {
        date: day,
        dateStr: format(day, "yyyy-MM-dd"),
        dayNum: format(day, "d"),
        weekday: format(day, "EEE", { locale: zhCN }),
        isToday: isToday(day),
        isWeekend,
      };
    });
  }, [rangeStart, totalDays]);

  // ─── Zoom Label ───────────────────────────────────────────

  const zoomLabels: Record<GanttZoomLevel, string> = {
    7: "7天",
    14: "14天",
    30: "30天",
  };

  // ─── Render ────────────────────────────────────────────────

  if (ganttPosts.length === 0) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 flex-shrink-0">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handlePrevRange}
            >
              <span className="text-xs">‹</span>
            </Button>
            <span className="text-sm font-semibold min-w-[160px] text-center tabular-nums">
              {format(rangeStart, "M月d日", { locale: zhCN })} —{" "}
              {format(rangeEnd, "M月d日", { locale: zhCN })}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleNextRange}
            >
              <span className="text-xs">›</span>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-muted rounded-md p-0.5">
              <Button
                variant={zoom === 7 ? "secondary" : "ghost"}
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={handleZoomOut}
                disabled={zoom <= 7}
              >
                <ZoomOut className="h-3 w-3 mr-0.5" />
                7天
              </Button>
              <Button
                variant={zoom === 14 ? "secondary" : "ghost"}
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={() => setZoom(14)}
              >
                14天
              </Button>
              <Button
                variant={zoom === 30 ? "secondary" : "ghost"}
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={handleZoomIn}
                disabled={zoom >= 30}
              >
                30天
                <ZoomIn className="h-3 w-3 ml-0.5" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={handleToday}
            >
              今天
            </Button>
          </div>
        </div>
        <GanttEmptyState />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ─── Header ─────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pb-3 flex-shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handlePrevRange}
          >
            <span className="text-base leading-none">‹</span>
          </Button>
          <span className="text-sm font-semibold min-w-[160px] text-center tabular-nums">
            {format(rangeStart, "M月d日", { locale: zhCN })} —{" "}
            {format(rangeEnd, "M月d日", { locale: zhCN })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleNextRange}
          >
            <span className="text-base leading-none">›</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-muted rounded-md p-0.5">
            <Button
              variant={zoom === 7 ? "secondary" : "ghost"}
              size="sm"
              className="h-6 px-2 text-[10px] gap-0.5"
              onClick={handleZoomOut}
              disabled={zoom <= 7}
            >
              <ZoomOut className="h-3 w-3" />
              7天
            </Button>
            <Button
              variant={zoom === 14 ? "secondary" : "ghost"}
              size="sm"
              className="h-6 px-2 text-[10px]"
              onClick={() => setZoom(14)}
            >
              14天
            </Button>
            <Button
              variant={zoom === 30 ? "secondary" : "ghost"}
              size="sm"
              className="h-6 px-2 text-[10px] gap-0.5"
              onClick={handleZoomIn}
              disabled={zoom >= 30}
            >
              30天
              <ZoomIn className="h-3 w-3" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-7 px-3 text-xs"
            onClick={handleToday}
          >
            <CalendarDays className="h-3 w-3 mr-1" />
            今天
          </Button>
        </div>
      </div>

      {/* ─── Legend ──────────────────────────────────── */}
      <div className="px-4 pb-2 flex-shrink-0">
        <div className="flex items-center gap-3 text-[9px] text-muted-foreground flex-wrap">
          <span className="font-medium">状态色标：</span>
          {(Object.keys(POST_STATUS_LABELS) as PostStatus[]).map((status) => (
            <span key={status} className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded-sm ${STATUS_BAR_COLORS[status]}`} />
              {POST_STATUS_LABELS[status]}
            </span>
          ))}
          <span className="ml-auto tabular-nums">
            {ganttPosts.length} 条 · {zoomLabels[zoom]}视图
          </span>
        </div>
      </div>

      {/* ─── Gantt Chart ─────────────────────────────── */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto border border-border/50 rounded-lg"
      >
        <div style={{ width: `${totalWidth + 160}px`, minWidth: "100%" }}>
          {/* Date header row */}
          <div className="sticky top-0 z-20 bg-background border-b border-border/50">
            <div className="flex">
              {/* Row label spacer */}
              <div className="w-[140px] flex-shrink-0 border-r border-border/50 px-2 py-2">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  内容
                </span>
              </div>
              {/* Date columns */}
              <div className="flex">
                {dateHeaders.map((d) => (
                  <div
                    key={d.dateStr}
                    className={`
                      flex flex-col items-center justify-center py-2 border-r border-border/30
                      ${d.isToday ? "bg-primary/5" : ""}
                      ${d.isWeekend ? "bg-muted/20" : ""}
                    `}
                    style={{ width: `${dayWidth}px`, minWidth: `${dayWidth}px` }}
                  >
                    <span
                      className={`text-[10px] font-medium ${d.isToday ? "text-primary" : "text-muted-foreground"}`}
                    >
                      {d.weekday}
                    </span>
                    <span
                      className={`
                        text-sm font-bold tabular-nums mt-0.5
                        ${d.isToday ? "text-primary" : d.isWeekend ? "text-muted-foreground/70" : "text-foreground"}
                      `}
                    >
                      {d.dayNum}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Post rows */}
          <div className="relative">
            {ganttPosts.map((post, index) => {
              const postDate = parseISO(post.scheduledDate);
              const isThisSelected = selectedPostId === post.id;
              const postStartOffset = differenceInCalendarDays(
                postDate,
                rangeStart,
              );

              return (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: index * 0.02,
                    duration: 0.2,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className={`
                    flex border-b border-border/20 last:border-b-0
                    hover:bg-muted/20 transition-colors
                    ${isThisSelected ? "bg-primary/[0.04]" : ""}
                  `}
                >
                  {/* Row label */}
                  <div
                    className={`
                      w-[140px] flex-shrink-0 border-r border-border/50 px-2 py-1.5
                      flex items-center gap-1.5 cursor-pointer
                      ${isThisSelected ? "bg-primary/[0.04]" : ""}
                    `}
                    onClick={() => handlePostClick(post)}
                  >
                    {/* Status dot */}
                    <span
                      className={`h-[6px] w-[6px] rounded-full flex-shrink-0 ${STATUS_BAR_COLORS[post.status as PostStatus]}`}
                    />
                    {/* Topic (truncated) */}
                    <span
                      className={`text-[10px] font-medium truncate leading-tight ${isThisSelected ? "text-foreground" : "text-foreground/80"}`}
                    >
                      {post.topic.length > 14
                        ? post.topic.slice(0, 14) + "…"
                        : post.topic}
                    </span>
                  </div>

                  {/* Bar area */}
                  <div
                    className="relative flex-1 py-1.5"
                    style={{ height: `${barHeight + rowGap}px` }}
                  >
                    {/* Weekend background highlights */}
                    {dateHeaders
                      .filter((d) => d.isWeekend)
                      .map((d) => {
                        const idx = differenceInCalendarDays(d.date, rangeStart);
                        return (
                          <div
                            key={`wk-${d.dateStr}`}
                            className="absolute top-0 bottom-0 bg-muted/15 pointer-events-none"
                            style={{
                              left: `${idx * dayWidth}px`,
                              width: `${dayWidth}px`,
                            }}
                          />
                        );
                      })}

                    {/* Today line */}
                    {todayPosition !== null && (
                      <div
                        className="absolute top-0 bottom-0 w-[2px] bg-red-500/60 pointer-events-none z-10"
                        style={{ left: `${todayPosition}px` }}
                      >
                        {/* Today label */}
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                          <span className="text-[8px] font-semibold text-red-500 bg-background px-1 rounded">
                            今天
                          </span>
                        </div>
                        {/* Dashed effect via repeating gradient */}
                        <div
                          className="absolute inset-0 w-full"
                          style={{
                            background:
                              "repeating-linear-gradient(to bottom, rgb(239 68 68 / 0.7) 0px, rgb(239 68 68 / 0.7) 3px, transparent 3px, transparent 6px)",
                          }}
                        />
                      </div>
                    )}

                    {/* The bar */}
                    <GanttBar
                      post={post}
                      startDate={rangeStart}
                      endDate={rangeEnd}
                      dayWidth={dayWidth}
                      barHeight={barHeight}
                      isSelected={isThisSelected}
                      onClick={handlePostClick}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Bottom Bar ──────────────────────────────── */}
      <div className="px-4 py-2 flex-shrink-0 border-t border-border/30">
        <div className="flex items-center justify-between text-[9px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1 py-0.5 bg-muted rounded text-[8px] font-mono">←→</kbd>
            切换范围
            <kbd className="px-1 py-0.5 bg-muted rounded text-[8px] font-mono ml-2">+/-</kbd>
            缩放
            <kbd className="px-1 py-0.5 bg-muted rounded text-[8px] font-mono ml-2">T</kbd>
            回到今天
          </span>
          <span className="tabular-nums">
            {format(rangeStart, "MM/dd")} → {format(rangeEnd, "MM/dd")} ({zoom}天)
          </span>
        </div>
      </div>
    </div>
  );
}
