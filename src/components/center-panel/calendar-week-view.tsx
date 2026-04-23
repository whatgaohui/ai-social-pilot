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
  XHS_CONTENT_TYPE_COLORS,
  CONTENT_TYPE_COLORS,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  GripVertical,
  MessageSquare,
  Heart,
  Eye,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isToday,
  addWeeks,
  subWeeks,
  parseISO,
  startOfDay,
  differenceInCalendarDays,
} from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  useCalendarDragSort,
  CalendarDateDropZone,
} from "@/components/center-panel/drag-sort-calendar";

// ─── Color Maps ──────────────────────────────────────────────────────────────

const STATUS_DOT_COLORS: Record<PostStatus, string> = {
  planned: "bg-gray-400",
  generated: "bg-sky-500",
  optimized: "bg-amber-500",
  published: "bg-emerald-500",
  scheduled: "bg-violet-500",
};

const STATUS_BADGE_COLORS: Record<PostStatus, string> = {
  planned: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  generated: "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300",
  optimized: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300",
  scheduled: "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300",
  published: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300",
};

const PLATFORM_DOT_COLORS: Record<string, string> = {
  wechat: "bg-green-500",
  xiaohongshu: "bg-red-500",
};

const PLATFORM_BADGE_COLORS: Record<string, string> = {
  wechat: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  xiaohongshu: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

const WEEKDAY_NAMES = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

// ─── Animation ───────────────────────────────────────────────────────────────

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.015, delayChildren: 0.03 },
  },
};

const staggerChild = {
  hidden: { opacity: 0, y: 6, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 400, damping: 25 },
  },
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

function getContentTypeColor(post: ContentPost): string {
  if (post.platform === "xiaohongshu")
    return (
      XHS_CONTENT_TYPE_COLORS[post.contentType as XHSContentType] || ""
    );
  return CONTENT_TYPE_COLORS[post.contentType as ContentType] || "";
}

function getPlatformLabel(post: ContentPost): string {
  if (!post.platform || post.platform === "wechat") return "朋友圈";
  return PLATFORM_LABELS[post.platform as keyof typeof PLATFORM_LABELS] || post.platform;
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface CalendarWeekViewProps {
  /** Override posts array; defaults to useAppStore contentPosts */
  posts?: ContentPost[];
  /** Whether to show the full card style (for center panel) vs compact */
  compact?: boolean;
}

// ─── Quick Create Dialog ─────────────────────────────────────────────────────

interface QuickCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate: string;
}

function QuickCreateDialog({
  open,
  onOpenChange,
  defaultDate,
}: QuickCreateDialogProps) {
  const { addContentPost, platform, currentPlan } = useAppStore();
  const [topic, setTopic] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTopic("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleCreate = useCallback(async () => {
    if (!topic.trim()) return;
    setIsCreating(true);
    try {
      const newPost: ContentPost = {
        id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        planId: currentPlan?.id || "",
        scheduledDate: defaultDate,
        platform,
        contentType: platform === "xiaohongshu" ? "seeding" : "text",
        topic: topic.trim(),
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
      toast.success("已添加新内容", {
        description: `${format(parseISO(defaultDate), "M月d日")} - ${topic.trim()}`,
      });
      onOpenChange(false);
    } catch {
      toast.error("创建失败");
    } finally {
      setIsCreating(false);
    }
  }, [topic, defaultDate, platform, currentPlan, addContentPost, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            快速创建内容
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            排期：
            {format(parseISO(defaultDate), "yyyy年M月d日 EEEE", { locale: zhCN })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Input
            ref={inputRef}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="输入内容主题..."
            className="text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
          />
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className="text-[10px]">
              {getPlatformLabel({ platform } as ContentPost)}
            </Badge>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={!topic.trim() || isCreating}
          >
            {isCreating ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Plus className="h-3 w-3 mr-1" />
            )}
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Post Card for Week View ─────────────────────────────────────────────────

interface WeekPostCardProps {
  post: ContentPost;
  isSelected: boolean;
  isDragged: boolean;
  onClick: (post: ContentPost) => void;
  onDragStart: (e: React.DragEvent<HTMLElement>, post: ContentPost) => void;
  onDragEnd: () => void;
}

function WeekPostCard({
  post,
  isSelected,
  isDragged,
  onClick,
  onDragStart,
  onDragEnd,
}: WeekPostCardProps) {
  const didDragRef = useRef(false);

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      didDragRef.current = true;
      onDragStart(e, post);
    },
    [post, onDragStart],
  );

  const handleClick = useCallback(() => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    onClick(post);
  }, [post, onClick]);

  const handleDragEnd = useCallback(() => {
    setTimeout(() => {
      didDragRef.current = false;
    }, 0);
    onDragEnd();
  }, [onDragEnd]);

  const platformBar =
    post.platform === "xiaohongshu"
      ? "border-l-rose-400 dark:border-l-rose-500"
      : "border-l-green-400 dark:border-l-green-500";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 3 }}
      animate={{
        opacity: isDragged ? 0.4 : 1,
        y: 0,
        scale: isDragged ? 0.96 : 1,
      }}
      transition={{ type: "spring" as const, stiffness: 350, damping: 28 }}
    >
      <TooltipProvider delayDuration={400}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              draggable
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onClick={handleClick}
              className={`
                group relative rounded-lg border border-l-[3px] p-2 cursor-grab
                active:cursor-grabbing transition-all duration-200
                hover:shadow-md hover:border-primary/30
                ${platformBar}
                ${isSelected
                  ? "ring-2 ring-primary bg-primary/[0.06] border-primary/40 shadow-md"
                  : "bg-card border-border hover:bg-muted/50"
                }
                ${isDragged ? "z-50 shadow-xl opacity-50" : ""}
              `}
            >
              {/* Drag handle */}
              <div className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground">
                <GripVertical className="h-3 w-3" />
              </div>

              {/* Badges row */}
              <div className="flex items-center gap-1 mb-1 flex-wrap">
                {/* Platform badge */}
                <Badge
                  className={`text-[8px] px-1 py-0 h-4 leading-4 ${PLATFORM_BADGE_COLORS[post.platform || "wechat"]}`}
                  variant="secondary"
                >
                  {getPlatformLabel(post)}
                </Badge>
                {/* Content type badge */}
                <Badge
                  className={`text-[8px] px-1 py-0 h-4 leading-4 ${getContentTypeColor(post)}`}
                  variant="secondary"
                >
                  {getContentTypeLabel(post)}
                </Badge>
                {/* Status dot + badge */}
                <span className="flex items-center gap-1 ml-auto">
                  <span
                    className={`h-[6px] w-[6px] rounded-full ${STATUS_DOT_COLORS[post.status as PostStatus] || "bg-gray-300"}`}
                  />
                  <Badge
                    className={`text-[7px] px-1 py-0 h-4 leading-4 ${STATUS_BADGE_COLORS[post.status as PostStatus]}`}
                    variant="secondary"
                  >
                    {POST_STATUS_LABELS[post.status as PostStatus]}
                  </Badge>
                </span>
              </div>

              {/* Topic */}
              <p className="text-xs font-medium leading-snug line-clamp-2 pr-4">
                {post.topic}
              </p>

              {/* Content preview */}
              {post.content && (
                <p className="text-[10px] text-muted-foreground mt-1 leading-tight line-clamp-1">
                  {post.content.length > 40
                    ? post.content.slice(0, 40) + "…"
                    : post.content}
                </p>
              )}

              {/* Mini stats for published posts */}
              {post.status === "published" && (post.likes || post.comments || post.views) > 0 && (
                <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-border/50">
                  {post.views > 0 && (
                    <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground tabular-nums">
                      <Eye className="h-2.5 w-2.5" />
                      {post.views}
                    </span>
                  )}
                  {post.likes > 0 && (
                    <span className="flex items-center gap-0.5 text-[9px] text-rose-400 tabular-nums">
                      <Heart className="h-2.5 w-2.5" />
                      {post.likes}
                    </span>
                  )}
                  {post.comments > 0 && (
                    <span className="flex items-center gap-0.5 text-[9px] text-amber-400 tabular-nums">
                      <MessageSquare className="h-2.5 w-2.5" />
                      {post.comments}
                    </span>
                  )}
                  {post.favorites != null && post.favorites > 0 && (
                    <span className="flex items-center gap-0.5 text-[9px] text-violet-400 tabular-nums">
                      <Star className="h-2.5 w-2.5" />
                      {post.favorites}
                    </span>
                  )}
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[220px]">
            <p className="text-xs font-medium">{post.topic}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {format(parseISO(post.scheduledDate), "M月d日 EEEE", { locale: zhCN })}
              {" · "}
              {getPlatformLabel(post)}
            </p>
            {post.status === "published" && (post.likes + post.comments + post.views) > 0 && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                浏览 {post.views} · 点赞 {post.likes} · 评论 {post.comments}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </motion.div>
  );
}

// ─── Empty Day Slot ──────────────────────────────────────────────────────────

interface EmptyDaySlotProps {
  dateStr: string;
  dayLabel: string;
  onAddClick: (dateStr: string) => void;
  isDragging: boolean;
  overDate: string | null;
  onDragOver: (e: React.DragEvent<HTMLElement>, dateStr: string) => void;
  onDragEnter: (e: React.DragEvent<HTMLElement>, dateStr: string) => void;
  onDragLeave: (e: React.DragEvent<HTMLElement>, dateStr: string) => void;
  onDrop: (e: React.DragEvent<HTMLElement>, dateStr: string) => void;
}

function EmptyDaySlot({
  dateStr,
  dayLabel,
  onAddClick,
  isDragging,
  overDate,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
}: EmptyDaySlotProps) {
  const isOverThis = isDragging && overDate === dateStr;

  return (
    <div
      onDragOver={(e) => onDragOver(e, dateStr)}
      onDragEnter={(e) => onDragEnter(e, dateStr)}
      onDragLeave={(e) => onDragLeave(e, dateStr)}
      onDrop={(e) => onDrop(e, dateStr)}
      className={`
        rounded-lg border-2 border-dashed transition-all duration-200
        flex items-center justify-center min-h-[60px]
        ${
          isOverThis
            ? "border-violet-400 dark:border-violet-500 bg-violet-50/60 dark:bg-violet-950/20 scale-[1.02]"
            : "border-transparent hover:border-muted-foreground/20 hover:bg-muted/30"
        }
      `}
    >
      {isOverThis ? (
        <span className="text-[10px] font-medium text-violet-600 dark:text-violet-400 flex items-center gap-1">
          <GripVertical className="h-3 w-3" />
          放置到此处
        </span>
      ) : (
        <button
          onClick={() => onAddClick(dateStr)}
          className="flex flex-col items-center gap-0.5 py-2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="text-[9px]">添加</span>
        </button>
      )}
    </div>
  );
}

// ─── Week Stats Bar ──────────────────────────────────────────────────────────

interface WeekStatsBarProps {
  weekPosts: ContentPost[];
}

function WeekStatsBar({ weekPosts }: WeekStatsBarProps) {
  const total = weekPosts.length;
  const published = weekPosts.filter((p) => p.status === "published").length;
  const optimized = weekPosts.filter((p) => p.status === "optimized").length;
  const generated = weekPosts.filter((p) => p.status === "generated").length;
  const planned = weekPosts.filter((p) => p.status === "planned").length;

  // Compute engagement totals
  const totalLikes = weekPosts.reduce((s, p) => s + (p.likes || 0), 0);
  const totalComments = weekPosts.reduce((s, p) => s + (p.comments || 0), 0);
  const totalViews = weekPosts.reduce((s, p) => s + (p.views || 0), 0);
  const totalInteraction = totalLikes + totalComments;
  const avgScore =
    total > 0
      ? Math.round(
          weekPosts.reduce((s, p) => s + (p.aiScore || 0), 0) / total,
        )
      : 0;

  if (total === 0) return null;

  return (
    <div className="mb-3 px-3 py-2 rounded-lg bg-muted/40 border border-border/30">
      <div className="flex items-center gap-3 text-[10px] flex-wrap">
        <span className="font-semibold text-foreground/80 tabular-nums">
          本周 {total} 篇
        </span>
        <div className="flex items-center gap-1.5">
          {published > 0 && (
            <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-medium tabular-nums">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {published} 已发
            </span>
          )}
          {optimized > 0 && (
            <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-medium tabular-nums">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              {optimized} 已优
            </span>
          )}
          {generated > 0 && (
            <span className="flex items-center gap-0.5 text-sky-600 dark:text-sky-400 font-medium tabular-nums">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
              {generated} 已生
            </span>
          )}
          {planned > 0 && (
            <span className="flex items-center gap-0.5 text-gray-500 font-medium tabular-nums">
              <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
              {planned} 待办
            </span>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-2 ml-auto text-muted-foreground">
          {published > 0 && (
            <span className="tabular-nums">
              互动{" "}
              {totalInteraction > 0
                ? totalInteraction > 999
                  ? `${(totalInteraction / 1000).toFixed(1)}k`
                  : totalInteraction
                : 0}
            </span>
          )}
          {avgScore > 0 && (
            <span className="tabular-nums">均分 {avgScore}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function CalendarWeekView({ posts: externalPosts }: CalendarWeekViewProps) {
  const {
    contentPosts,
    selectedDate,
    setSelectedDate,
    selectedPostId,
    setSelectedPostId,
    platform: currentPlatform,
    updateContentPost,
  } = useAppStore();

  const posts = externalPosts ?? contentPosts;

  // Week navigation
  const [weekAnchor, setWeekAnchor] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [slideDirection, setSlideDirection] = useState<0 | -1 | 1>(0);
  const [isSavingDate, setIsSavingDate] = useState(false);

  // Quick create dialog
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateDate, setQuickCreateDate] = useState("");

  // Swipe gesture
  const swipeStartX = useRef(0);
  const swipeStartY = useRef(0);

  // ─── Week Math ──────────────────────────────────────────────

  const weekDays = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(weekAnchor, { weekStartsOn: 1 }),
        end: endOfWeek(weekAnchor, { weekStartsOn: 1 }),
      }),
    [weekAnchor],
  );

  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];

  const postsByDate = useMemo(() => {
    const map: Record<string, ContentPost[]> = {};
    posts.forEach((post) => {
      if (!map[post.scheduledDate]) {
        map[post.scheduledDate] = [];
      }
      map[post.scheduledDate].push(post);
    });
    return map;
  }, [posts]);

  const weekPosts = useMemo(
    () =>
      weekDays.flatMap((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        return postsByDate[dateStr] || [];
      }),
    [weekDays, postsByDate],
  );

  // ─── Drag Handler ───────────────────────────────────────────

  const handleDateChange = useCallback(
    async (postId: string, newScheduledDate: string) => {
      setIsSavingDate(true);
      try {
        const res = await fetch(`/api/content/${postId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheduledDate: newScheduledDate }),
        });
        if (!res.ok) throw new Error("更新排期失败");
        updateContentPost(postId, { scheduledDate: newScheduledDate });
        toast.success("排期已更新");
      } catch {
        toast.error("排期更新失败，请重试");
      } finally {
        setIsSavingDate(false);
      }
    },
    [updateContentPost],
  );

  const { dragState: calDragState, handlers: calDragHandlers } =
    useCalendarDragSort(posts, handleDateChange);

  // ─── Navigation ─────────────────────────────────────────────

  const handlePrevWeek = useCallback(() => {
    setSlideDirection(1);
    setWeekAnchor((prev) => subWeeks(prev, 1));
  }, []);

  const handleNextWeek = useCallback(() => {
    setSlideDirection(-1);
    setWeekAnchor((prev) => addWeeks(prev, 1));
  }, []);

  const handleToday = useCallback(() => {
    setSlideDirection(0);
    setWeekAnchor(startOfWeek(new Date(), { weekStartsOn: 1 }));
  }, []);

  // ─── Post Click ─────────────────────────────────────────────

  const handlePostClick = useCallback(
    (post: ContentPost) => {
      setSelectedDate(post.scheduledDate);
      setSelectedPostId(post.id);
    },
    [setSelectedDate, setSelectedPostId],
  );

  const handleDayClick = useCallback(
    (dateStr: string) => {
      setSelectedDate(dateStr);
      const dayPosts = postsByDate[dateStr];
      if (dayPosts && dayPosts.length > 0) {
        const match = dayPosts.find(
          (p) => !p.platform || p.platform === currentPlatform,
        );
        setSelectedPostId((match || dayPosts[0]).id);
      } else {
        setSelectedPostId(null);
      }
    },
    [postsByDate, currentPlatform, setSelectedDate, setSelectedPostId],
  );

  const handleAddClick = useCallback((dateStr: string) => {
    setQuickCreateDate(dateStr);
    setQuickCreateOpen(true);
  }, []);

  // ─── Swipe Gesture ──────────────────────────────────────────

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    swipeStartX.current = e.touches[0].clientX;
    swipeStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const deltaX = e.changedTouches[0].clientX - swipeStartX.current;
      const deltaY = e.changedTouches[0].clientY - swipeStartY.current;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      if (absX > 50 && absX > absY * 1.5) {
        if (deltaX < 0) handleNextWeek();
        else handlePrevWeek();
      }
    },
    [handleNextWeek, handlePrevWeek],
  );

  // ─── Keyboard Navigation ────────────────────────────────────

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
          handlePrevWeek();
          break;
        case "ArrowRight":
          e.preventDefault();
          handleNextWeek();
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
  }, [handlePrevWeek, handleNextWeek, handleToday]);

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* ─── Header ───────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pb-2 flex-shrink-0">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handlePrevWeek}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold min-w-[140px] text-center tabular-nums">
            {format(weekStart, "M月d日", { locale: zhCN })} —{" "}
            {format(weekEnd, "M月d日", { locale: zhCN })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleNextWeek}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Saving indicator */}
          <AnimatePresence>
            {isSavingDate && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[10px] text-muted-foreground flex items-center gap-1"
              >
                <Loader2 className="h-3 w-3 animate-spin" />
                保存中...
              </motion.span>
            )}
          </AnimatePresence>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-3 text-xs"
            onClick={handleToday}
          >
            回到今天
          </Button>
        </div>
      </div>

      {/* ─── Stats Bar ─────────────────────────────────── */}
      <WeekStatsBar weekPosts={weekPosts} />

      {/* ─── Week Grid ─────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto overflow-x-auto px-2 pb-4"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={weekAnchor.toISOString()}
            initial={{ opacity: 0, x: slideDirection * 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: slideDirection * -30 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            variants={staggerContainer}
          >
            {/* Desktop: 7-column grid */}
            <div className="hidden sm:grid sm:grid-cols-7 gap-2 min-h-0">
              {weekDays.map((day, dayIndex) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const dayPosts = postsByDate[dateStr] || [];
                const isTodayFlag = isToday(day);
                const isSelected = selectedDate === dateStr;
                const isWeekend = dayIndex >= 5;

                return (
                  <motion.div
                    key={dateStr}
                    variants={staggerChild}
                    className="flex flex-col min-w-[140px]"
                  >
                    {/* Day header */}
                    <button
                      onClick={() => handleDayClick(dateStr)}
                      className={`
                        flex items-center justify-between px-2 py-1.5 rounded-t-lg border-b-2 text-left transition-colors
                        ${
                          isTodayFlag
                            ? "bg-primary/8 border-primary text-primary"
                            : isSelected
                              ? "bg-primary/5 border-primary/40"
                              : isWeekend
                                ? "bg-muted/30 border-transparent"
                                : "bg-muted/20 border-transparent"
                        }
                      `}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="relative">
                          {isTodayFlag && (
                            <motion.span
                              className="absolute -inset-[2px] rounded-full border-2 border-primary"
                              animate={{
                                scale: [1, 1.15, 1],
                                opacity: [0.5, 1, 0.5],
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut",
                              }}
                            />
                          )}
                          <span
                            className={`relative text-sm font-bold tabular-nums ${isTodayFlag ? "text-primary" : "text-foreground"}`}
                          >
                            {format(day, "d")}
                          </span>
                        </span>
                        <span
                          className={`text-[10px] font-medium ${isTodayFlag ? "text-primary" : "text-muted-foreground"}`}
                        >
                          {WEEKDAY_NAMES[dayIndex]}
                        </span>
                      </div>
                      {dayPosts.length > 0 && (
                        <Badge
                          variant="secondary"
                          className="text-[9px] h-4 px-1.5 tabular-nums"
                        >
                          {dayPosts.length}篇
                        </Badge>
                      )}
                    </button>

                    {/* Day content area */}
                    <CalendarDateDropZone
                      dateStr={dateStr}
                      posts={dayPosts}
                      overDate={calDragState.overDate}
                      draggedPostId={calDragState.draggedPostId}
                      isDragging={calDragState.isDragging}
                      className={`
                        flex-1 rounded-b-lg p-1.5 space-y-1.5 min-h-[100px]
                        ${isTodayFlag
                          ? "bg-primary/[0.03] ring-1 ring-primary/20"
                          : isWeekend
                            ? "bg-muted/10"
                            : "bg-card/50"
                        }
                      `}
                    >
                      {dayPosts.length === 0 ? (
                        <EmptyDaySlot
                          dateStr={dateStr}
                          dayLabel={WEEKDAY_NAMES[dayIndex]}
                          onAddClick={handleAddClick}
                          isDragging={calDragState.isDragging}
                          overDate={calDragState.overDate}
                          onDragOver={calDragHandlers.onDateDragOver}
                          onDragEnter={calDragHandlers.onDateDragEnter}
                          onDragLeave={calDragHandlers.onDateDragLeave}
                          onDrop={calDragHandlers.onDateDrop}
                        />
                      ) : (
                        dayPosts.map((post) => (
                          <WeekPostCard
                            key={post.id}
                            post={post}
                            isSelected={selectedPostId === post.id}
                            isDragged={
                              calDragState.draggedPostId === post.id
                            }
                            onClick={handlePostClick}
                            onDragStart={calDragHandlers.onPostDragStart}
                            onDragEnd={calDragHandlers.onPostDragEnd}
                          />
                        ))
                      )}

                      {/* + add button for non-empty days */}
                      {dayPosts.length > 0 && (
                        <button
                          onClick={() => handleAddClick(dateStr)}
                          className="w-full py-1 rounded-md text-[9px] text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/40 transition-colors flex items-center justify-center gap-0.5"
                        >
                          <Plus className="h-3 w-3" />
                          添加
                        </button>
                      )}
                    </CalendarDateDropZone>
                  </motion.div>
                );
              })}
            </div>

            {/* Mobile: single-column vertical layout */}
            <div className="sm:hidden space-y-3">
              {weekDays.map((day, dayIndex) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const dayPosts = postsByDate[dateStr] || [];
                const isTodayFlag = isToday(day);
                const isSelected = selectedDate === dateStr;

                return (
                  <motion.div key={dateStr} variants={staggerChild}>
                    {/* Day header */}
                    <button
                      onClick={() => handleDayClick(dateStr)}
                      className={`
                        w-full flex items-center justify-between px-3 py-2 rounded-t-lg border-b-2 text-left transition-colors
                        ${
                          isTodayFlag
                            ? "bg-primary/8 border-primary text-primary"
                            : isSelected
                              ? "bg-primary/5 border-primary/40"
                              : "bg-muted/20 border-transparent"
                        }
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold tabular-nums">
                          {format(day, "d日")}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground">
                          {WEEKDAY_NAMES[dayIndex]}
                          {isTodayFlag && (
                            <Badge className="ml-1.5 text-[8px] h-4 px-1" variant="secondary">
                              今天
                            </Badge>
                          )}
                        </span>
                      </div>
                      {dayPosts.length > 0 && (
                        <Badge
                          variant="secondary"
                          className="text-[9px] h-4 px-1.5 tabular-nums"
                        >
                          {dayPosts.length}篇
                        </Badge>
                      )}
                    </button>

                    {/* Day content */}
                    <div
                      className={`
                        rounded-b-lg p-2 space-y-1.5
                        ${isTodayFlag
                          ? "bg-primary/[0.03] ring-1 ring-primary/20"
                          : "bg-card/50"
                        }
                      `}
                    >
                      {dayPosts.length === 0 ? (
                        <div className="py-3">
                          <button
                            onClick={() => handleAddClick(dateStr)}
                            className="w-full py-2 rounded-lg border-2 border-dashed border-transparent hover:border-muted-foreground/20 text-muted-foreground/50 hover:text-muted-foreground transition-colors flex items-center justify-center gap-1"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span className="text-xs">添加内容</span>
                          </button>
                        </div>
                      ) : (
                        dayPosts.map((post) => (
                          <WeekPostCard
                            key={post.id}
                            post={post}
                            isSelected={selectedPostId === post.id}
                            isDragged={
                              calDragState.draggedPostId === post.id
                            }
                            onClick={handlePostClick}
                            onDragStart={calDragHandlers.onPostDragStart}
                            onDragEnd={calDragHandlers.onPostDragEnd}
                          />
                        ))
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ─── Quick Create Dialog ────────────────────────── */}
      <QuickCreateDialog
        open={quickCreateOpen}
        onOpenChange={setQuickCreateOpen}
        defaultDate={quickCreateDate}
      />
    </div>
  );
}
