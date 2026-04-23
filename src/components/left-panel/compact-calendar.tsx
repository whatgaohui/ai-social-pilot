"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  GripVertical,
  ArrowUpDown,
  X,
  Activity,
  CalendarRange,
  Plus,
  Copy,
  Trash2,
  Pencil,
  Calendar as CalendarIcon,
  MoreHorizontal,
  Eye,
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
  startOfDay,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  isSameDay,
  addDays,
} from "date-fns";
import { safeFormat } from "@/lib/safe-date";
import { zhCN } from "date-fns/locale";
import {
  useCalendarDragSort,
  CalendarDateDropZone,
} from "@/components/center-panel/drag-sort-calendar";
import { CalendarHeatmap } from "@/components/left-panel/calendar-heatmap";
import { CalendarQuickActions } from "@/components/left-panel/calendar-quick-actions";
import { WeeklyMiniStats } from "@/components/left-panel/weekly-mini-stats";
import {
  ContentHoverPreview,
  useContentHover,
} from "@/components/left-panel/content-hover-preview";
import { CalendarDndReorder } from "@/components/left-panel/calendar-dnd-reorder";

// --- Color maps ---

const STATUS_DOT_COLORS: Record<PostStatus, string> = {
  planned: "bg-gray-400",
  generated: "bg-sky-500",
  optimized: "bg-amber-500",
  published: "bg-violet-500",
};

// Day cell background tints per status
const STATUS_CELL_BG: Record<PostStatus, { bg: string; border: string; dot: string }> = {
  published: { bg: "bg-violet-100 dark:bg-violet-950/50", border: "border-l-2 border-l-violet-500", dot: "bg-violet-500" },
  optimized: { bg: "bg-amber-100 dark:bg-amber-950/40", border: "border-l-2 border-l-amber-500", dot: "bg-amber-500" },
  generated: { bg: "bg-sky-100 dark:bg-sky-950/40", border: "border-l-2 border-l-sky-500", dot: "bg-sky-500" },
  planned:   { bg: "bg-gray-100 dark:bg-gray-800/60", border: "border-l-2 border-l-gray-400", dot: "bg-gray-400" },
};

// Platform left-bar accent color
const PLATFORM_CELL_ACCENT: Record<string, string> = {
  wechat: "border-l-green-500",
  xiaohongshu: "border-l-red-500",
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

const WEEKDAY_NAMES = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

// --- Animation variants ---

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.02, delayChildren: 0.05 },
  },
};

const staggerChild = {
  hidden: { opacity: 0, y: 6, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 400, damping: 25 } },
};

const viewTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
};

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

// --- Quick Create Dialog ---

interface QuickCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate: string;
}

function QuickCreateDialog({ open, onOpenChange, defaultDate }: QuickCreateDialogProps) {
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
      toast.success("已添加新内容", { description: `${safeFormat(defaultDate, "M月d日", defaultDate)} - ${topic.trim()}` });
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
            排期：{safeFormat(defaultDate, "yyyy年M月d日 EEEE", "请选择日期", { locale: zhCN })}
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
              {platform === "wechat" ? "朋友圈" : "小红书"}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {platform === "xiaohongshu" ? "种草安利" : "纯文字"}
            </Badge>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button size="sm" onClick={handleCreate} disabled={!topic.trim() || isCreating}>
            {isCreating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Move-to-Date Dialog ---

interface MoveToDateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: ContentPost | null;
}

function MoveToDateDialog({ open, onOpenChange, post }: MoveToDateDialogProps) {
  const { updateContentPost } = useAppStore();
  const [targetDate, setTargetDate] = useState("");
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    if (open && post) {
      setTargetDate(post.scheduledDate);
    }
  }, [open, post]);

  const handleMove = useCallback(async () => {
    if (!post || !targetDate) return;
    setIsMoving(true);
    try {
      const res = await fetch(`/api/content/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledDate: targetDate }),
      });
      if (!res.ok) throw new Error("移动失败");
      updateContentPost(post.id, { scheduledDate: targetDate });
      toast.success("已移动", { description: `${safeFormat(targetDate, "M月d日")}` });
      onOpenChange(false);
    } catch {
      toast.error("移动失败");
    } finally {
      setIsMoving(false);
    }
  }, [post, targetDate, updateContentPost, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[340px]">
        <DialogHeader>
          <DialogTitle className="text-sm">移动到日期</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            选择目标日期：{post?.topic}
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <Input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="text-sm"
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button size="sm" onClick={handleMove} disabled={!targetDate || isMoving}>
            {isMoving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
            移动
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Drag post card used in drag mode ---

interface DragPostCardProps {
  post: ContentPost;
  isDragged: boolean;
  onDragStart: (e: React.DragEvent<HTMLElement>, post: ContentPost) => void;
  onDragEnd: () => void;
  onClick: () => void;
}

function DragPostCard({ post, isDragged, onDragStart, onDragEnd, onClick }: DragPostCardProps) {
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
    onClick();
  }, [onClick]);

  const handleDragEnd = useCallback(() => {
    setTimeout(() => {
      didDragRef.current = false;
    }, 0);
    onDragEnd();
  }, [onDragEnd]);

  const platformColor = post.platform === "xiaohongshu"
    ? "border-l-rose-400 dark:border-l-rose-500"
    : "border-l-green-400 dark:border-l-green-500";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{
        opacity: isDragged ? 0.5 : 1,
        y: 0,
        scale: isDragged ? 0.95 : 1,
      }}
      transition={{
        type: "spring" as const,
        stiffness: 350,
        damping: 28,
      }}
    >
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
        className={`
          group relative flex items-center gap-1.5 rounded-md border border-l-[3px]
          ${platformColor}
          bg-card hover:bg-muted/50 p-1.5 cursor-grab active:cursor-grabbing
          transition-all duration-200 hover:shadow-sm select-none
          ${isDragged ? "z-50 shadow-lg" : ""}
        `}
      >
        {/* Drag handle */}
        <div
          className={`
            flex-shrink-0 flex items-center justify-center w-4 h-4
            opacity-0 group-hover:opacity-100 transition-opacity duration-200
            text-muted-foreground hover:text-foreground
          `}
        >
          <GripVertical className="h-3 w-3" />
        </div>

        {/* Platform + status dots */}
        <div className="flex items-center gap-[2px] flex-shrink-0">
          <span
            className={`h-[4px] w-[4px] rounded-full ${PLATFORM_DOT_COLORS[post.platform || "wechat"]}`}
          />
          <span
            className={`h-[4px] w-[4px] rounded-full ${STATUS_DOT_COLORS[post.status as PostStatus]}`}
          />
        </div>

        {/* Content type */}
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

        {/* Status */}
        <Badge
          className={`text-[7px] px-1 py-0 h-3 leading-3 flex-shrink-0 ${STATUS_BADGE_COLORS[post.status as PostStatus]}`}
          variant="secondary"
        >
          {POST_STATUS_LABELS[post.status as PostStatus]}
        </Badge>
      </div>
    </motion.div>
  );
}

// --- List View Draggable Post Item ---

interface DraggableListItemProps {
  post: ContentPost;
  index: number;
  isSelected: boolean;
  onClick: (post: ContentPost) => void;
  onDragStart: (e: React.DragEvent<HTMLElement>, post: ContentPost) => void;
  onDragEnd: () => void;
  onDoubleClick: (post: ContentPost) => void;
  onContextMenuAction: (action: string, post: ContentPost) => void;
  isDragged: boolean;
}

function DraggableListItem({
  post,
  index,
  isSelected,
  onClick,
  onDragStart,
  onDragEnd,
  onDoubleClick,
  onContextMenuAction,
  isDragged,
}: DraggableListItemProps) {
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
    setTimeout(() => { didDragRef.current = false; }, 0);
    onDragEnd();
  }, [onDragEnd]);

  const handleDoubleClick = useCallback(() => {
    if (!didDragRef.current) onDoubleClick(post);
  }, [post, onDoubleClick]);

  let formattedDate = safeFormat(post.scheduledDate, "M/d EEEE", post.scheduledDate, { locale: zhCN });

  const platformColor = post.platform === "xiaohongshu"
    ? "border-l-rose-400 dark:border-l-rose-400"
    : "border-l-green-400 dark:border-l-green-400";

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <motion.div
          variants={staggerChild}
          initial="hidden"
          animate="show"
          layout
        >
          <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            className={`
              group relative w-full rounded-md border border-l-[3px] p-1.5 text-left
              transition-all duration-150 cursor-grab active:cursor-grabbing
              hover:border-primary/30 hover:bg-muted/50 hover:shadow-sm
              ${platformColor}
              ${isSelected ? "ring-1.5 ring-primary bg-primary/[0.05] border-primary/40" : "border-border"}
              ${isDragged ? "opacity-50 scale-95 z-50" : ""}
            `}
          >
            <div className="flex items-center gap-1.5">
              {/* Drag handle */}
              <div className="flex-shrink-0 flex items-center justify-center w-3.5 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground">
                <GripVertical className="h-3 w-3" />
              </div>
              {/* Date */}
              <span className="text-[9px] text-muted-foreground tabular-nums flex-shrink-0 w-[48px] leading-tight">
                {formattedDate}
              </span>
              {/* Dots */}
              <div className="flex items-center gap-[2px] flex-shrink-0">
                <span className={`h-[4px] w-[4px] rounded-full ${PLATFORM_DOT_COLORS[post.platform || "wechat"]}`} />
                <span className={`h-[4px] w-[4px] rounded-full ${STATUS_DOT_COLORS[post.status as PostStatus]}`} />
              </div>
              {/* Content type badge */}
              <Badge className={`text-[7px] px-1 py-0 h-3 leading-3 flex-shrink-0 ${getContentTypeColorForPost(post)}`} variant="secondary">
                {getContentTypeLabelForPost(post)}
              </Badge>
              {/* Topic */}
              <span className="text-[10px] font-medium truncate flex-1 leading-tight">
                {post.topic}
              </span>
              {/* Status badge */}
              <Badge className={`text-[7px] px-1 py-0 h-3 leading-3 flex-shrink-0 ${STATUS_BADGE_COLORS[post.status as PostStatus]}`} variant="secondary">
                {POST_STATUS_LABELS[post.status as PostStatus]}
              </Badge>
            </div>
            {/* Content preview */}
            {post.content && (
              <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight line-clamp-1 pl-[62px]">
                {post.content.length > 50 ? post.content.slice(0, 50) + "…" : post.content}
              </p>
            )}
          </div>
        </motion.div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-44">
        <ContextMenuItem onClick={() => onContextMenuAction("view", post)}>
          <Eye className="h-3.5 w-3.5 mr-2" />
          查看详情
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onContextMenuAction("edit", post)}>
          <Pencil className="h-3.5 w-3.5 mr-2" />
          编辑内容
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onContextMenuAction("duplicate", post)}>
          <Copy className="h-3.5 w-3.5 mr-2" />
          复制一条
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onContextMenuAction("move", post)}>
          <CalendarIcon className="h-3.5 w-3.5 mr-2" />
          移动到日期...
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onContextMenuAction("delete", post)} className="text-red-600 dark:text-red-400">
          <Trash2 className="h-3.5 w-3.5 mr-2" />
          删除
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

// --- Week View Sub-components ---

interface WeekViewHeaderProps {
  weekStart: Date;
  weekEnd: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
}

function WeekViewHeader({ weekStart, weekEnd, onPrevWeek, onNextWeek, onToday }: WeekViewHeaderProps) {
  const isCurrentWeek = isToday(weekStart) || isToday(weekEnd) ||
    (weekStart <= new Date() && weekEnd >= new Date());
  const startLabel = format(weekStart, "M月d日");
  const endLabel = format(weekEnd, "M月d日");

  return (
    <div className="flex items-center justify-between px-3 pb-1.5">
      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onPrevWeek}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="text-[10px] font-semibold min-w-[90px] text-center tabular-nums">
          {startLabel} - {endLabel}
        </span>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onNextWeek}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="sm" className="h-5 px-2 text-[9px] font-medium" onClick={onToday}>
          回到今天
        </Button>
      </div>
    </div>
  );
}

interface EnhancedWeekDayColumnProps {
  day: Date;
  dayIndex: number;
  posts: ContentPost[];
  isSelected: boolean;
  isTodayFlag: boolean;
  platformFilter: "all" | "wechat" | "xiaohongshu";
  onClick: (dateStr: string) => void;
  onDoubleClick: (dateStr: string) => void;
  // Drag-and-drop props
  isDragging: boolean;
  overDate: string | null;
  droppedDate: string | null;
  onDragOver: (e: React.DragEvent<HTMLElement>, dateStr: string) => void;
  onDragEnter: (e: React.DragEvent<HTMLElement>, dateStr: string) => void;
  onDragLeave: (e: React.DragEvent<HTMLElement>, dateStr: string) => void;
  onDrop: (e: React.DragEvent<HTMLElement>, dateStr: string) => void;
}

function EnhancedWeekDayColumn({
  day,
  dayIndex,
  posts,
  isSelected,
  isTodayFlag,
  platformFilter,
  onClick,
  onDoubleClick,
  isDragging,
  overDate,
  droppedDate,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
}: EnhancedWeekDayColumnProps) {
  const dateStr = format(day, "yyyy-MM-dd");
  const truncatedPosts = posts.slice(0, 2);
  const isOverThis = isDragging && overDate === dateStr;
  const isFlashThis = droppedDate === dateStr;
  const firstPost = posts[0];
  const isWeekend = dayIndex >= 5; // Saturday=5, Sunday=6

  // Unique platforms in this day's posts
  const platforms = posts.reduce<string[]>((acc, p) => {
    const plat = p.platform || "wechat";
    if (!acc.includes(plat)) acc.push(plat);
    return acc;
  }, []);

  return (
    <motion.div
      variants={staggerChild}
      initial="hidden"
      animate="show"
      className="flex-1 min-w-0"
    >
      <div
        onDragOver={(e) => onDragOver(e, dateStr)}
        onDragEnter={(e) => onDragEnter(e, dateStr)}
        onDragLeave={(e) => onDragLeave(e, dateStr)}
        onDrop={(e) => onDrop(e, dateStr)}
        className={`
          relative rounded-md border text-left transition-all duration-200 overflow-hidden min-h-[80px]
          ${isSelected
            ? "ring-2 ring-primary bg-primary/[0.06] border-primary/40"
            : isTodayFlag
              ? "ring-1 ring-primary/30 bg-primary/5 border-primary/20"
              : posts.length > 0
                ? `bg-card border-border hover:border-primary/30 hover:bg-muted/50 ${isWeekend ? "dark:bg-card/80" : ""}`
                : isWeekend
                  ? "bg-muted/10 border-transparent hover:bg-muted/30"
                  : "bg-muted/20 border-transparent hover:bg-muted/40"
          }
          ${isWeekend && !isSelected && !isTodayFlag && !isOverThis ? "dark:bg-muted/5" : ""}
          ${isOverThis ? "ring-2 ring-violet-500 bg-violet-500/10 dark:bg-violet-500/10 border-violet-300 scale-[1.02]" : ""}
        `}
      >
        {/* Drop success flash animation */}
        <AnimatePresence>
          {isFlashThis && (
            <motion.div
              initial={{ opacity: 0.4, scale: 0.9 }}
              animate={{ opacity: 0, scale: 1.1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute inset-0 rounded-md bg-violet-500 pointer-events-none z-20"
            />
          )}
        </AnimatePresence>

        {/* Drop hint overlay */}
        <AnimatePresence>
          {isOverThis && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex items-center justify-center bg-violet-500/5 rounded-md pointer-events-none"
            >
              <div className="flex items-center gap-1 text-violet-600 dark:text-violet-400">
                <GripVertical className="h-3 w-3" />
                <span className="text-[9px] font-medium">放置</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Day header */}
        <button
          onClick={() => onClick(dateStr)}
          onDoubleClick={() => onDoubleClick(dateStr)}
          className={`w-full px-1.5 py-1 border-b text-left ${isSelected ? "border-primary/20" : "border-border/50"}`}
        >
          <div className="flex items-center justify-between">
            {/* Today indicator with animated ring */}
            <span className="relative">
              {isTodayFlag && (
                <motion.span
                  className="absolute -inset-[3px] rounded-full border-2 border-primary"
                  animate={{
                    scale: [1, 1.15, 1],
                    opacity: [0.6, 1, 0.6],
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
              <span className={`relative text-[11px] font-bold tabular-nums ${isTodayFlag ? "text-primary" : "text-foreground"}`}>
                {format(day, "d")}
              </span>
            </span>
            <span className={`text-[8px] font-medium ${isTodayFlag ? "text-primary" : "text-muted-foreground"}`}>
              {WEEKDAY_NAMES[dayIndex]}
            </span>
          </div>
          {/* Platform indicators + count */}
          <div className="flex items-center gap-0.5 mt-0.5">
            {platformFilter === "all" && platforms.map((plat) => (
              <span key={plat} className={`h-[5px] w-[5px] rounded-full ${PLATFORM_DOT_COLORS[plat]}`} />
            ))}
            {posts.length > 0 && (
              <span className="text-[8px] font-semibold text-muted-foreground ml-auto tabular-nums">
                {posts.length}篇
              </span>
            )}
          </div>
        </button>

        {/* Posts list - mini content preview with platform color */}
        <div className="px-1 py-1 space-y-0.5 min-h-[28px]">
          {truncatedPosts.map((post, idx) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03 + 0.1 }}
              className="flex items-center gap-[2px] leading-tight"
            >
              <span className={`h-[4px] w-[4px] rounded-full flex-shrink-0 ${PLATFORM_DOT_COLORS[post.platform || "wechat"]}`} />
              <span className={`text-[7px] font-medium truncate max-w-[55px] ${post.platform === "xiaohongshu" ? "text-rose-400/80 dark:text-rose-300/80" : "text-emerald-600/80 dark:text-emerald-400/80"}`}>
                {post.topic.length > 12 ? post.topic.slice(0, 12) + "…" : post.topic}
              </span>
            </motion.div>
          ))}
          {/* First post type badge */}
          {firstPost && posts.length > 0 && (
            <div className="mt-0.5">
              <Badge
                className={`text-[6px] px-1 py-0 h-[14px] leading-[14px] ${getContentTypeColorForPost(firstPost)}`}
                variant="secondary"
              >
                {getContentTypeLabelForPost(firstPost)}
              </Badge>
            </div>
          )}
          {posts.length > 2 && (
            <span className="text-[7px] text-muted-foreground">+{posts.length - 2}更多</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface WeekStatsBarProps {
  weekPosts: ContentPost[];
}

function WeekStatsBar({ weekPosts }: WeekStatsBarProps) {
  const published = weekPosts.filter((p) => p.status === "published").length;
  const optimized = weekPosts.filter((p) => p.status === "optimized").length;
  const generated = weekPosts.filter((p) => p.status === "generated").length;
  const planned = weekPosts.filter((p) => p.status === "planned").length;
  const total = weekPosts.length;

  if (total === 0) return null;

  return (
    <div className="mx-3 mb-2 px-2 py-1 rounded-md bg-muted/40 border border-border/30">
      <div className="flex items-center gap-1.5 text-[9px] flex-wrap">
        <span className="font-semibold text-foreground/80 tabular-nums">本周 {total}篇</span>
        {published > 0 && (
          <span className="text-violet-500 font-medium flex items-center gap-0.5 tabular-nums">
            <span className="h-1 w-1 rounded-full bg-violet-500" />
            {published}已发
          </span>
        )}
        {optimized > 0 && (
          <span className="text-amber-500 font-medium flex items-center gap-0.5 tabular-nums">
            <span className="h-1 w-1 rounded-full bg-amber-500" />
            {optimized}已优
          </span>
        )}
        {generated > 0 && (
          <span className="text-sky-500 font-medium flex items-center gap-0.5 tabular-nums">
            <span className="h-1 w-1 rounded-full bg-sky-500" />
            {generated}已生
          </span>
        )}
        {planned > 0 && (
          <span className="text-gray-400 font-medium flex items-center gap-0.5 tabular-nums">
            <span className="h-1 w-1 rounded-full bg-gray-400" />
            {planned}待办
          </span>
        )}
      </div>
    </div>
  );
}

// --- Main Component ---

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
    updateContentPost,
    addContentPost,
    leftPanelTab,
  } = useAppStore();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<"grid" | "list" | "week" | "drag">("grid");
  const [platformFilter, setPlatformFilter] = useState<"all" | "wechat" | "xiaohongshu">("all");
  const [isSavingDate, setIsSavingDate] = useState(false);
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [weekSlideDir, setWeekSlideDir] = useState<0 | -1 | 1>(0);

  // Quick create dialog state
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateDate, setQuickCreateDate] = useState("");

  // Move-to-date dialog state
  const [moveToDateOpen, setMoveToDateOpen] = useState(false);
  const [movePost, setMovePost] = useState<ContentPost | null>(null);

  // Swipe gesture state
  const swipeRef = useRef<HTMLDivElement>(null);
  const swipeStartX = useRef(0);
  const swipeStartY = useRef(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // --- Drop flash animation state ---
  const [droppedDate, setDroppedDate] = useState<string | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- DnD Reorder mode (dnd-kit) ---
  const [isDndReorderActive, setIsDndReorderActive] = useState(false);

  // --- Content Hover Preview ---
  const {
    hoveredPost,
    anchorRect,
    containerRect,
    handleMouseEnter,
    handleMouseMove,
    handleMouseLeave,
  } = useContentHover();

  // --- Keyboard navigation for calendar ---
  useEffect(() => {
    function handleCalendarKeys(e: KeyboardEvent) {
      if (leftPanelTab !== 'calendar') return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.target as HTMLElement)?.isContentEditable) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (viewMode === 'week') setWeekAnchor(prev => subWeeks(prev, 1));
          else setCurrentMonth(prev => subMonths(prev, 1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (viewMode === 'week') setWeekAnchor(prev => addWeeks(prev, 1));
          else setCurrentMonth(prev => addMonths(prev, 1));
          break;
        case 't':
        case 'T':
          e.preventDefault();
          setCurrentMonth(new Date());
          setWeekAnchor(startOfWeek(new Date(), { weekStartsOn: 1 }));
          break;
        case 'g':
        case 'G':
          e.preventDefault();
          if (viewMode === 'week') setViewMode('grid');
          else setViewMode(viewMode === 'grid' ? 'list' : 'grid');
          break;
      }
    }
    window.addEventListener('keydown', handleCalendarKeys);
    return () => window.removeEventListener('keydown', handleCalendarKeys);
  }, [leftPanelTab, viewMode]);

  // --- Calendar math ---
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = (getDay(monthStart) + 6) % 7;

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

  // --- Drag mode: posts grouped by date for the current month ---
  const dragGroupedPosts = useMemo(() => {
    const groups: { dateStr: string; label: string; posts: ContentPost[] }[] = [];
    for (const day of daysInMonth) {
      const dateStr = format(day, "yyyy-MM-dd");
      const posts = postsByDate[dateStr];
      if (posts && posts.length > 0) {
        let label = "";
        try {
          label = format(day, "M月d日 EEEE", { locale: zhCN });
        } catch {
          label = dateStr;
        }
        groups.push({ dateStr, label, posts });
      }
    }
    return groups;
  }, [daysInMonth, postsByDate]);

  // --- Cross-date drag handler ---
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
        // Trigger flash animation on target date
        setDroppedDate(newScheduledDate);
        if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = setTimeout(() => setDroppedDate(null), 1000);
      } catch (error) {
        console.error("Failed to update scheduled date:", error);
        toast.error("排期更新失败，请重试");
      } finally {
        setIsSavingDate(false);
      }
    },
    [updateContentPost],
  );

  const { dragState: calDragState, handlers: calDragHandlers } = useCalendarDragSort(
    filteredPosts,
    handleDateChange,
  );

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

  // --- Posts for the current displayed month ---
  const monthPosts = useMemo(() => {
    const monthPrefix = format(currentMonth, "yyyy-MM");
    return filteredPosts.filter((p) => p.scheduledDate && p.scheduledDate.startsWith(monthPrefix));
  }, [filteredPosts, currentMonth]);

  // --- Stats ---
  const stats = useMemo(() => {
    const total = monthPosts.length;
    const optimized = monthPosts.filter((p) => p.status === "optimized").length;
    const published = monthPosts.filter((p) => p.status === "published").length;
    return { total, optimized, published };
  }, [monthPosts]);

  // --- Handlers ---
  const handlePrevMonth = () => setCurrentMonth((prev) => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1));

  // --- Week view math ---
  const weekDays = useMemo(() => {
    return eachDayOfInterval({
      start: startOfWeek(weekAnchor, { weekStartsOn: 1 }),
      end: endOfWeek(weekAnchor, { weekStartsOn: 1 }),
    });
  }, [weekAnchor]);

  const weekPosts = useMemo(() => {
    return weekDays.flatMap((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      return postsByDate[dateStr] || [];
    });
  }, [weekDays, postsByDate]);

  const handlePrevWeek = useCallback(() => { setWeekSlideDir(1); setWeekAnchor((prev) => subWeeks(prev, 1)); }, []);
  const handleNextWeek = useCallback(() => { setWeekSlideDir(-1); setWeekAnchor((prev) => addWeeks(prev, 1)); }, []);
  const handleTodayWeek = useCallback(() => { setWeekSlideDir(0); setWeekAnchor(startOfWeek(new Date(), { weekStartsOn: 1 })); }, []);

  const isDragMode = viewMode === "drag";

  // --- Hover preview action handlers ---
  const handlePreviewEdit = useCallback(
    (post: ContentPost) => {
      setSelectedDate(post.scheduledDate);
      setSelectedPostId(post.id);
    },
    [setSelectedDate, setSelectedPostId],
  );

  const handlePreviewAnalytics = useCallback(
    (post: ContentPost) => {
      setSelectedDate(post.scheduledDate);
      setSelectedPostId(post.id);
      const { setRightPanelTab } = useAppStore.getState();
      setRightPanelTab("data");
      toast.info("已切换到数据分析面板");
    },
    [],
  );

  const handlePreviewCopy = useCallback(
    (post: ContentPost) => {
      const duplicated: ContentPost = {
        ...post,
        id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addContentPost(duplicated);
      toast.success("已复制", { description: post.topic });
    },
    [addContentPost],
  );

  // --- DnD reorder handler ---
  const handleDndReorder = useCallback(
    (updates: { id: string; scheduledDate: string; sortOrder: number }[]) => {
      for (const u of updates) {
        updateContentPost(u.id, { scheduledDate: u.scheduledDate });
      }
    },
    [updateContentPost],
  );

  const handleDayClick = useCallback(
    (dateStr: string) => {
      if (isDragMode) return;
      setSelectedDate(dateStr);
      const posts = postsByDate[dateStr];
      if (posts && posts.length > 0) {
        const match = posts.find((p) => !p.platform || p.platform === platform);
        setSelectedPostId((match || posts[0]).id);
      } else {
        setSelectedPostId(null);
      }
    },
    [postsByDate, platform, setSelectedDate, setSelectedPostId, isDragMode],
  );

  const handleDayDoubleClick = useCallback(
    (dateStr: string) => {
      setQuickCreateDate(dateStr);
      setQuickCreateOpen(true);
    },
    [],
  );

  const handleListItemClick = useCallback(
    (post: ContentPost) => {
      if (isDragMode) return;
      setSelectedDate(post.scheduledDate);
      setSelectedPostId(post.id);
    },
    [setSelectedDate, setSelectedPostId, isDragMode],
  );

  // --- Context menu action handler ---
  const handleContextMenuAction = useCallback(
    (action: string, post: ContentPost) => {
      switch (action) {
        case "view":
          setSelectedDate(post.scheduledDate);
          setSelectedPostId(post.id);
          break;
        case "edit":
          setSelectedDate(post.scheduledDate);
          setSelectedPostId(post.id);
          break;
        case "duplicate": {
          const duplicated: ContentPost = {
            ...post,
            id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          addContentPost(duplicated);
          toast.success("已复制", { description: post.topic });
          break;
        }
        case "move":
          setMovePost(post);
          setMoveToDateOpen(true);
          break;
        case "delete":
          toast.success("已删除", { description: post.topic });
          break;
      }
    },
    [setSelectedDate, setSelectedPostId, addContentPost],
  );

  // --- Swipe gesture for mobile ---
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    swipeStartX.current = e.touches[0].clientX;
    swipeStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - swipeStartX.current;
    const deltaY = e.changedTouches[0].clientY - swipeStartY.current;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Only trigger if horizontal swipe is dominant and exceeds threshold
    if (absDeltaX > 50 && absDeltaX > absDeltaY * 1.5) {
      if (deltaX < 0) {
        // Swipe left → next
        if (viewMode === 'week') handleNextWeek();
        else handleNextMonth();
      } else {
        // Swipe right → prev
        if (viewMode === 'week') handlePrevWeek();
        else handlePrevMonth();
      }
    }

    // Pull-to-refresh: swipe down
    if (deltaY > 80 && absDeltaY > absDeltaX * 2) {
      setIsRefreshing(true);
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  }, [viewMode, handlePrevWeek, handleNextWeek, handlePrevMonth, handleNextMonth]);

  // --- Grid double-click handler ---
  const handleGridDayDoubleClick = useCallback(
    (dateStr: string) => {
      // If no posts on this date, open quick create
      const posts = postsByDate[dateStr];
      if (!posts || posts.length === 0) {
        setQuickCreateDate(dateStr);
        setQuickCreateOpen(true);
      }
    },
    [postsByDate],
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
      toast.success("内容已生成");
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
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handlePrevMonth}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs font-semibold min-w-[80px] text-center tabular-nums animate-float-subtle">
            {format(currentMonth, "yyyy年M月", { locale: zhCN })}
          </span>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleNextMonth}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <CalendarDndReorder
            groupedPosts={dragGroupedPosts}
            isActive={isDndReorderActive}
            onActivate={() => { setIsDndReorderActive(true); setViewMode('grid'); }}
            onDeactivate={() => setIsDndReorderActive(false)}
            onReorder={handleDndReorder}
          />
          <div className="flex items-center bg-muted rounded-md p-0.5">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="h-5 w-5 p-0"
              onClick={() => { setViewMode("grid"); setIsDndReorderActive(false); }}
            >
              <LayoutGrid className="h-3 w-3" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-5 w-5 p-0"
              onClick={() => { setViewMode("list"); setIsDndReorderActive(false); }}
            >
              <List className="h-3 w-3" />
            </Button>
            <Button
              variant={viewMode === "week" ? "secondary" : "ghost"}
              size="sm"
              className="h-5 w-5 p-0"
              onClick={() => { setViewMode(viewMode === "week" ? "grid" : "week"); setIsDndReorderActive(false); }}
              title="周视图"
            >
              <CalendarRange className="h-3 w-3" />
            </Button>
            <Button
              variant={viewMode === "drag" ? "secondary" : "ghost"}
              size="sm"
              className={`h-5 w-5 p-0 ${viewMode === "drag" ? "text-violet-600 dark:text-violet-400" : ""}`}
              onClick={() => { setViewMode(viewMode === "drag" ? "grid" : "drag"); setIsDndReorderActive(false); }}
              title="拖拽排序"
            >
              <ArrowUpDown className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* ====== Drag mode banner ====== */}
      <AnimatePresence>
        {isDragMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mx-3 mb-2 px-2.5 py-1.5 rounded-md bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800/40 flex items-center gap-2">
              <div className="flex-shrink-0 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
                <GripVertical className="h-2.5 w-2.5 text-white" />
              </div>
              <span className="text-[10px] font-medium text-violet-700 dark:text-violet-300 flex-1">
                拖拽内容到目标日期重新排期
              </span>
              <button
                onClick={() => setViewMode("grid")}
                className="flex-shrink-0 p-0.5 rounded hover:bg-violet-100 dark:hover:bg-violet-800/40 transition-colors"
              >
                <X className="h-3 w-3 text-violet-500" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====== Calendar Quick Actions Bar ====== */}
      {!isDragMode && (
        <CalendarQuickActions
          onOpenQuickCreate={(date) => {
            setQuickCreateDate(date);
            setQuickCreateOpen(true);
          }}
          onOpenWeeklyStats={() => {
            // The WeeklyMiniStats is rendered as a popover, this is a no-op trigger
          }}
        />
      )}

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
                flex items-center gap-0.5 h-6 px-2 py-0.5 rounded text-[9px] font-medium transition-all duration-200
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
                <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white" : pf.dotColor}`} />
              )}
              {pf.label}
              <span className={`tabular-nums ${isSelected ? "text-white/70" : "text-muted-foreground/70"}`}>
                {pf.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ====== Content Completion Progress Bar ====== */}
      {filteredPosts.length > 0 && (() => {
        const completedCount = stats.published + stats.optimized;
        const completionPercent = stats.total > 0 ? Math.round((completedCount / stats.total) * 100) : 0;
        const barColor = completionPercent > 80 ? "bg-emerald-500" : completionPercent >= 50 ? "bg-amber-500" : "bg-rose-500";
        const labelColor = completionPercent > 80 ? "text-emerald-600 dark:text-emerald-400" : completionPercent >= 50 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400";
        return (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="px-3 pb-1.5">
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[9px] font-semibold ${labelColor}`}>本月完成度 {completionPercent}%</span>
            </div>
            <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
              <div className={`absolute inset-y-0 left-0 rounded-full ${barColor} animate-progress`} style={{ width: `${completionPercent}%` }} />
            </div>
          </motion.div>
        );
      })()}

      {/* ====== Compact Stats Summary ====== */}
      {filteredPosts.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }} className="px-3 pb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-muted-foreground/70 mr-0.5">本月</span>
            <Badge variant="secondary" className="h-4 px-1.5 text-[8px] font-semibold tabular-nums bg-muted/80 text-foreground">
              <span className="animate-number-tick">{stats.total}</span>篇
            </Badge>
            <span className="text-[9px] text-violet-500 font-medium flex items-center gap-0.5">
              <span className="h-1 w-1 rounded-full bg-violet-500" />
              <span className="animate-number-tick tabular-nums">{stats.published}</span>已发
            </span>
            <span className="text-[9px] text-amber-500 font-medium flex items-center gap-0.5">
              <span className="h-1 w-1 rounded-full bg-amber-500" />
              <span className="animate-number-tick tabular-nums">{stats.optimized}</span>已优
            </span>
            <span className="text-[9px] text-muted-foreground font-medium flex items-center gap-0.5">
              <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
              <span className="animate-number-tick tabular-nums">{stats.total - stats.published - stats.optimized}</span>待办
            </span>
          </div>
        </motion.div>
      )}

      {/* ====== Calendar Heatmap ====== */}
      <CalendarHeatmap posts={filteredPosts} />

      {/* ====== Content Health Indicator ====== */}
      {filteredPosts.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }} className="mx-3 mb-2 p-2 rounded-lg bg-muted/30 border border-border/40">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Activity className="h-3 w-3" />
              内容健康度
            </span>
            {(() => {
              const completionRate = stats.total > 0 ? Math.round((stats.published / stats.total) * 100) : 0;
              const rateColor = completionRate > 80 ? "text-emerald-600 dark:text-emerald-400" : completionRate >= 50 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400";
              const rateLabel = completionRate > 80 ? "优秀" : completionRate >= 50 ? "良好" : "需努力";
              return <span className={`text-[9px] font-bold tabular-nums ${rateColor}`}>{rateLabel} {completionRate}%</span>;
            })()}
          </div>
          <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${stats.total > 0 ? (stats.published / stats.total) * 100 : 0}%` }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              style={{
                background: stats.total > 0 && (stats.published / stats.total) > 0.8 ? "linear-gradient(90deg, #10b981, #34d399)" : stats.total > 0 && (stats.published / stats.total) >= 0.5 ? "linear-gradient(90deg, #f59e0b, #fbbf24)" : "linear-gradient(90deg, #ef4444, #f87171)",
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[9px] text-muted-foreground tabular-nums">已发布 {stats.published}/{stats.total} 篇</span>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-0.5 text-[8px] text-emerald-500 tabular-nums"><span className="h-1 w-1 rounded-full bg-emerald-500" />{stats.published}</span>
              <span className="flex items-center gap-0.5 text-[8px] text-amber-500 tabular-nums"><span className="h-1 w-1 rounded-full bg-amber-500" />{stats.optimized}</span>
              <span className="flex items-center gap-0.5 text-[8px] text-muted-foreground tabular-nums"><span className="h-1 w-1 rounded-full bg-gray-400" />{stats.total - stats.published - stats.optimized}</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* ====== Calendar content (with swipe gesture) ====== */}
      <ScrollArea className="flex-1">
        {/* Pull-to-refresh indicator */}
        <AnimatePresence>
          {isRefreshing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 32 }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center justify-center gap-1.5 text-muted-foreground"
            >
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="text-[10px]">刷新中...</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          ref={swipeRef}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <AnimatePresence mode="wait">
            {isDragMode ? (
              /* ====== DRAG MODE VIEW ====== */
              <motion.div key="drag" {...viewTransition} className="px-3 space-y-3 pb-2">
                {dragGroupedPosts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <CalendarDays className="h-8 w-8 mb-2 opacity-30" />
                    <p className="text-xs">本月暂无内容</p>
                  </div>
                ) : (
                  dragGroupedPosts.map((group) => {
                    const isOverThisDate = calDragState.isDragging && calDragState.overDate === group.dateStr;
                    const isDraggedPostInThisDate = group.posts.some((p) => p.id === calDragState.draggedPostId);
                    const primaryPlatform = group.posts[0]?.platform || "wechat";
                    const borderHighlight = primaryPlatform === "xiaohongshu"
                      ? "border-rose-400 dark:border-rose-500 ring-rose-200 dark:ring-rose-800"
                      : "border-green-400 dark:border-green-500 ring-green-200 dark:ring-green-800";

                    return (
                      <CalendarDateDropZone
                        key={group.dateStr}
                        dateStr={group.dateStr}
                        posts={group.posts}
                        overDate={calDragState.overDate}
                        draggedPostId={calDragState.draggedPostId}
                        isDragging={calDragState.isDragging}
                      >
                        <motion.div
                          layout
                          initial={{ opacity: 0, y: 6 }}
                          animate={{
                            opacity: 1, y: 0,
                            borderColor: isOverThisDate && !isDraggedPostInThisDate
                              ? (primaryPlatform === "xiaohongshu" ? "rgb(251 113 133)" : "rgb(74 222 128)")
                              : undefined,
                            backgroundColor: isOverThisDate && !isDraggedPostInThisDate ? "var(--color-primary-alpha-04)" : undefined,
                          }}
                          transition={{ type: "spring" as const, stiffness: 300, damping: 25 }}
                          className={`rounded-lg border-2 overflow-hidden ${isOverThisDate && !isDraggedPostInThisDate ? `${borderHighlight} ring-2 bg-primary/[0.04] dark:bg-primary/[0.08] scale-[1.01]` : "border-border bg-card/50"} transition-all duration-200`}
                        >
                          <div
                            onDragOver={(e) => calDragHandlers.onDateDragOver(e, group.dateStr)}
                            onDragEnter={(e) => calDragHandlers.onDateDragEnter(e, group.dateStr)}
                            onDragLeave={(e) => calDragHandlers.onDateDragLeave(e, group.dateStr)}
                            onDrop={(e) => calDragHandlers.onDateDrop(e, group.dateStr)}
                            className={`flex items-center gap-2 px-2 py-1 cursor-default ${isOverThisDate && !isDraggedPostInThisDate ? "bg-primary/[0.06] dark:bg-primary/[0.10]" : "bg-muted/40"} transition-colors duration-150`}
                          >
                            <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">{group.label}</span>
                            <span className="text-[9px] text-muted-foreground/60">{group.posts.length} 条</span>
                            {isOverThisDate && !isDraggedPostInThisDate && (
                              <motion.span initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} className="text-[9px] font-medium text-violet-600 dark:text-violet-400 ml-auto">
                                放置到此处 ↑
                              </motion.span>
                            )}
                          </div>
                          <div className="px-1.5 pb-1.5 space-y-1">
                            {group.posts.map((post) => (
                              <DragPostCard
                                key={post.id}
                                post={post}
                                isDragged={calDragState.draggedPostId === post.id}
                                onDragStart={calDragHandlers.onPostDragStart}
                                onDragEnd={calDragHandlers.onPostDragEnd}
                                onClick={() => {
                                  setSelectedDate(post.scheduledDate);
                                  setSelectedPostId(post.id);
                                }}
                              />
                            ))}
                          </div>
                        </motion.div>
                      </CalendarDateDropZone>
                    );
                  })
                )}
                <AnimatePresence>
                  {isSavingDate && (
                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="flex items-center justify-center gap-1.5 py-2 text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-[10px]">保存排期中…</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : viewMode === "grid" ? (
              /* ====== GRID VIEW ====== */
              <motion.div key="grid" {...viewTransition}>
                <div className="px-3">
                  {/* Weekday header row */}
                  <div className="grid grid-cols-7 gap-px mb-0.5">
                    {WEEKDAYS_SHORT.map((d) => (
                      <div key={d} className="h-5 flex items-center justify-center text-[9px] font-medium text-muted-foreground">
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Days grid - staggered animation */}
                  <motion.div className="grid grid-cols-7 gap-px" variants={staggerContainer} initial="hidden" animate="show">
                    {Array.from({ length: startDayOfWeek }).map((_, i) => (
                      <div key={`empty-${i}`} className="h-8" />
                    ))}

                    {daysInMonth.map((day) => {
                      const dateStr = format(day, "yyyy-MM-dd");
                      const posts = postsByDate[dateStr];
                      const today = isToday(day);
                      const isSelected = selectedDate === dateStr;
                      const primaryPost = posts?.[0];
                      const postStatus = (primaryPost?.status || "planned") as PostStatus;
                      const statusStyle = STATUS_CELL_BG[postStatus];
                      const isMultiPlatform = platformFilter === "all" && posts && posts.length > 1;
                      const platformAccent = primaryPost?.platform ? PLATFORM_CELL_ACCENT[primaryPost.platform] || "" : "";
                      const hasContent = posts && posts.length > 0;
                      const isOverThisCell = calDragState.isDragging && calDragState.overDate === dateStr;
                      const isFlashCell = droppedDate === dateStr;
                      const isReorderActive = isDndReorderActive;

                      return (
                        <motion.button
                          key={dateStr}
                          variants={staggerChild}
                          whileHover={hasContent && !calDragState.isDragging && !isReorderActive ? { scale: 1.05, transition: { type: "spring", stiffness: 400, damping: 20 } } : {}}
                          whileTap={{ scale: 0.92 }}
                          onClick={() => handleDayClick(dateStr)}
                          onDoubleClick={() => handleGridDayDoubleClick(dateStr)}
                          onDragOver={(e) => calDragHandlers.onDateDragOver(e, dateStr)}
                          onDragEnter={(e) => calDragHandlers.onDateDragEnter(e, dateStr)}
                          onDragLeave={(e) => calDragHandlers.onDateDragLeave(e, dateStr)}
                          onDrop={(e) => calDragHandlers.onDateDrop(e, dateStr)}
                          onMouseEnter={hasContent && !isReorderActive && !calDragState.isDragging ? (e) => handleMouseEnter(e, primaryPost!) : undefined}
                          onMouseMove={hasContent && !isReorderActive && !calDragState.isDragging ? (e) => handleMouseMove(e, primaryPost!) : undefined}
                          onMouseLeave={hasContent ? handleMouseLeave : undefined}
                          className={`
                            relative h-8 w-full rounded flex flex-col items-center justify-center cursor-pointer
                            transition-all duration-150 overflow-hidden
                            ${isSelected ? "ring-2 ring-primary ring-offset-1" : ""}
                            ${today && !isSelected && !isOverThisCell ? "ring-1 ring-primary/50 shimmer-border" : ""}
                            ${today && !isOverThisCell ? "bg-gradient-to-br from-violet-100/60 to-purple-100/40 dark:from-violet-950/40 dark:to-purple-950/30" : ""}
                            ${primaryPost
                              ? `${today ? "" : statusStyle.bg} ${isMultiPlatform ? platformAccent : statusStyle.border} hover:brightness-95 dark:hover:brightness-110`
                              : "hover:bg-muted/40"
                            }
                            ${isOverThisCell && !isSelected ? "ring-2 ring-violet-500 bg-violet-500/10 scale-105 shadow-lg shadow-violet-500/20" : ""}
                          `}
                        >
                          {/* Drop flash overlay */}
                          <AnimatePresence>
                            {isFlashCell && (
                              <motion.div
                                initial={{ opacity: 0.5, scale: 0.85 }}
                                animate={{ opacity: 0, scale: 1.15 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className="absolute inset-0 rounded bg-violet-500 pointer-events-none z-20"
                              />
                            )}
                          </AnimatePresence>

                          {/* Today animated ring */}
                          {today && !isSelected && (
                            <motion.span
                              className="absolute inset-0 rounded"
                              animate={{
                                boxShadow: [
                                  "0 0 0 0 rgba(139, 92, 246, 0)",
                                  "0 0 0 2px rgba(139, 92, 246, 0.3)",
                                  "0 0 0 0 rgba(139, 92, 246, 0)",
                                ],
                              }}
                              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            />
                          )}

                          <span className={`text-[11px] leading-none font-medium ${today ? "font-bold text-primary" : primaryPost ? isSelected ? "text-primary" : "text-foreground/90" : "text-muted-foreground"}`}>
                            {format(day, "d")}
                          </span>

                          {/* Content count badge with glow for dates with posts */}
                          {hasContent && (
                            <motion.div
                              className="flex items-center gap-[2px] mt-[1px]"
                              initial={{ scale: 0.8 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 500, damping: 25 }}
                            >
                              {postStatus === 'planned' && (
                                <span className="absolute top-[3px] right-[3px] h-[4px] w-[4px] rounded-full bg-amber-500 animate-pulse-dot" />
                              )}
                              {isMultiPlatform ? (
                                posts.reduce((acc, p) => {
                                  const plat = p.platform || "wechat";
                                  if (!acc.includes(plat)) acc.push(plat);
                                  return acc;
                                }, [] as string[]).map((plat) => (
                                  <span key={plat} className={`h-[5px] w-[5px] rounded-full ${PLATFORM_DOT_COLORS[plat]} ring-1 ring-white/50 dark:ring-black/20`} />
                                ))
                              ) : (
                                <span className={`text-[7px] font-semibold leading-none px-1 rounded-sm ${
                                  postStatus === 'published' ? 'bg-violet-200/80 dark:bg-violet-800/60 text-violet-700 dark:text-violet-200'
                                    : postStatus === 'optimized' ? 'bg-amber-200/80 dark:bg-amber-800/60 text-amber-700 dark:text-amber-200'
                                    : postStatus === 'generated' ? 'bg-sky-200/80 dark:bg-sky-800/60 text-sky-700 dark:text-sky-200'
                                    : 'bg-gray-200/80 dark:bg-gray-700/60 text-gray-500 dark:text-gray-300'
                                }`}>
                                  {postStatus === 'published' ? '已发' : postStatus === 'optimized' ? '已优' : postStatus === 'generated' ? '已生' : '待发'}
                                </span>
                              )}
                              {/* Post count badge for multi-post days */}
                              {posts.length > 1 && (
                                <motion.span
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="absolute -top-0.5 -right-0.5 flex h-3 min-w-3 items-center justify-center rounded-full bg-primary text-[6px] font-bold text-primary-foreground ring-1 ring-background"
                                >
                                  {posts.length}
                                </motion.span>
                              )}
                            </motion.div>
                          )}
                        </motion.button>
                      );
                    })}
                  </motion.div>

                  {/* Legend */}
                  {filteredPosts.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-2 pt-2 border-t space-y-1.5">
                      {platformFilter === "all" && (
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200/60 dark:border-green-800/40">
                            <span className="h-2 w-2 rounded-full bg-green-500 shadow-sm shadow-green-300 dark:shadow-green-900" />
                            <span className="text-[10px] font-semibold text-green-700 dark:text-green-300">朋友圈</span>
                          </span>
                          <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200/60 dark:border-red-800/40">
                            <span className="h-2 w-2 rounded-full bg-red-500 shadow-sm shadow-red-300 dark:shadow-red-900" />
                            <span className="text-[10px] font-semibold text-red-700 dark:text-red-300">小红书</span>
                          </span>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-1">
                        {([
                          { key: "published" as PostStatus, dot: "bg-violet-500", bg: "bg-violet-50 dark:bg-violet-900/20", text: "text-violet-700 dark:text-violet-300", border: "border-violet-200/60 dark:border-violet-800/40", icon: "✓" },
                          { key: "optimized" as PostStatus, dot: "bg-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200/60 dark:border-amber-800/40", icon: "★" },
                          { key: "generated" as PostStatus, dot: "bg-sky-500", bg: "bg-sky-50 dark:bg-sky-900/20", text: "text-sky-700 dark:text-sky-300", border: "border-sky-200/60 dark:border-sky-800/40", icon: "◆" },
                          { key: "planned" as PostStatus, dot: "bg-gray-400", bg: "bg-gray-50 dark:bg-gray-800/50", text: "text-gray-600 dark:text-gray-300", border: "border-gray-200/60 dark:border-gray-700/40", icon: "○" },
                        ]).map((s) => {
                          const count = filteredPosts.filter(p => p.status === s.key).length;
                          return (
                            <span key={s.key} className={`flex items-center gap-1 px-2 py-1 rounded-md ${s.bg} border ${s.border}`}>
                              <span className={`h-2 w-2 rounded-full ${s.dot} shadow-sm`} />
                              <span className={`text-[10px] font-semibold ${s.text}`}>{s.icon}{POST_STATUS_LABELS[s.key]}</span>
                              <span className={`ml-auto text-[9px] tabular-nums font-bold ${s.text} opacity-70`}>{count}</span>
                            </span>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* ====== Upcoming Posts ====== */}
                {upcomingPosts.length > 0 && (
                  <div className="px-3 mt-3 pt-2 border-t">
                    <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">即将发布</h4>
                    <div className="space-y-1.5">
                      {upcomingPosts.map((post, idx) => {
                        let dayLabel = "";
                        dayLabel = safeFormat(post.scheduledDate, "M/d EEE", post.scheduledDate, { locale: zhCN });
                        return (
                          <motion.button
                            key={post.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.15, delay: idx * 0.03 }}
                            onClick={() => handleListItemClick(post)}
                            className="w-full flex items-center gap-1.5 rounded-md px-1.5 py-1 text-left hover:bg-muted/70 transition-colors group"
                          >
                            <span className="text-[9px] text-muted-foreground tabular-nums flex-shrink-0 w-[38px]">{dayLabel}</span>
                            <div className="flex items-center gap-[2px] flex-shrink-0">
                              <span className={`h-[4px] w-[4px] rounded-full ${PLATFORM_DOT_COLORS[post.platform || "wechat"]}`} />
                              <span className={`h-[4px] w-[4px] rounded-full ${STATUS_DOT_COLORS[post.status as PostStatus]}`} />
                            </div>
                            <span className="text-[10px] font-medium truncate flex-1 leading-tight">{post.topic}</span>
                            <Badge className={`text-[7px] px-1 py-0 h-3 leading-3 flex-shrink-0 ${STATUS_BADGE_COLORS[post.status as PostStatus]}`} variant="secondary">
                              {POST_STATUS_LABELS[post.status as PostStatus]}
                            </Badge>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : viewMode === "week" ? (
              /* ====== ENHANCED WEEK VIEW WITH DnD ====== */
              <motion.div
                key={`week-${weekAnchor.getTime()}`}
                initial={weekSlideDir !== 0 ? { opacity: 0, x: weekSlideDir * 30 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={weekSlideDir !== 0 ? { opacity: 0, x: -weekSlideDir * 30 } : { opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="px-3 pb-2"
              >
                <WeekViewHeader
                  weekStart={weekDays[0]}
                  weekEnd={weekDays[6]}
                  onPrevWeek={handlePrevWeek}
                  onNextWeek={handleNextWeek}
                  onToday={handleTodayWeek}
                />
                <WeekStatsBar weekPosts={weekPosts} />

                {/* Mini weekly stats popover - inline after stats bar */}
                <WeeklyMiniStats
                  posts={contentPosts}
                  onViewDetails={() => {
                    const { setRightPanelTab } = useAppStore.getState();
                    setRightPanelTab("data");
                    toast.info("已切换到数据分析面板");
                  }}
                />
                {/* 7-column grid with DnD and staggered animation */}
                <motion.div className="grid grid-cols-7 gap-1" variants={staggerContainer} initial="hidden" animate="show">
                  {weekDays.map((day, idx) => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    return (
                      <EnhancedWeekDayColumn
                        key={dateStr}
                        day={day}
                        dayIndex={idx}
                        posts={postsByDate[dateStr] || []}
                        isSelected={selectedDate === dateStr}
                        isTodayFlag={isToday(day)}
                        platformFilter={platformFilter}
                        onClick={handleDayClick}
                        onDoubleClick={handleDayDoubleClick}
                        isDragging={calDragState.isDragging}
                        overDate={calDragState.overDate}
                        droppedDate={droppedDate}
                        onDragOver={calDragHandlers.onDateDragOver}
                        onDragEnter={calDragHandlers.onDateDragEnter}
                        onDragLeave={calDragHandlers.onDateDragLeave}
                        onDrop={calDragHandlers.onDateDrop}
                      />
                    );
                  })}
                </motion.div>
                {/* Legend for week view */}
                {filteredPosts.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-2 pt-1.5 border-t space-y-1">
                    {platformFilter === "all" && (
                      <div className="flex items-center gap-1">
                        <span className="flex items-center gap-1 text-[8px] text-muted-foreground"><span className="h-[5px] w-[5px] rounded-full bg-green-500" />朋友圈</span>
                        <span className="flex items-center gap-1 text-[8px] text-muted-foreground"><span className="h-[5px] w-[5px] rounded-full bg-red-500" />小红书</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(["published", "optimized", "generated", "planned"] as PostStatus[]).map((s) => {
                        if (weekPosts.filter((p) => p.status === s).length === 0) return null;
                        return (
                          <span key={s} className="flex items-center gap-[3px] text-[8px] font-medium">
                            <span className={`h-[5px] w-[5px] rounded-full ${STATUS_DOT_COLORS[s]}`} />
                            <span className={s === "published" ? "text-violet-500" : s === "optimized" ? "text-amber-500" : s === "generated" ? "text-sky-500" : "text-gray-400"}>
                              {POST_STATUS_LABELS[s]}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                    <p className="text-[7px] text-muted-foreground/60">💡 双击日期快速创建 · 拖拽到其他日期可重新排期</p>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              /* ====== ENHANCED LIST VIEW WITH DRAG-AND-DROP ====== */
              <motion.div key="list" {...viewTransition} className="px-3 space-y-1 pb-2">
                {sortedPosts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <CalendarDays className="h-8 w-8 mb-2 opacity-30" />
                    <p className="text-xs">本月暂无内容</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">双击日期可快速创建</p>
                  </div>
                ) : (
                  <motion.div variants={staggerContainer} initial="hidden" animate="show">
                    {sortedPosts.map((post, index) => (
                      <DraggableListItem
                        key={post.id}
                        post={post}
                        index={index}
                        isSelected={selectedDate === post.scheduledDate}
                        onClick={handleListItemClick}
                        onDragStart={calDragHandlers.onPostDragStart}
                        onDragEnd={calDragHandlers.onPostDragEnd}
                        onDoubleClick={handleDayDoubleClick}
                        onContextMenuAction={handleContextMenuAction}
                        isDragged={calDragState.draggedPostId === post.id}
                      />
                    ))}
                  </motion.div>
                )}

                {/* Saving indicator */}
                <AnimatePresence>
                  {isSavingDate && (
                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="flex items-center justify-center gap-1.5 py-2 text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-[10px]">保存排期中…</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Drop zone for cross-date list reordering */}
                <AnimatePresence>
                  {calDragState.isDragging && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="pt-2 border-t"
                    >
                      <p className="text-[9px] text-muted-foreground text-center mb-1">拖拽到日历中的日期可重新排期</p>
                      <div className="grid grid-cols-7 gap-0.5">
                        {weekDays.map((day) => {
                          const dateStr = format(day, "yyyy-MM-dd");
                          const isOver = calDragState.overDate === dateStr;
                          const hasPosts = (postsByDate[dateStr]?.length || 0) > 0;
                          const today = isToday(day);
                          return (
                            <div
                              key={dateStr}
                              onDragOver={(e) => calDragHandlers.onDateDragOver(e, dateStr)}
                              onDragEnter={(e) => calDragHandlers.onDateDragEnter(e, dateStr)}
                              onDragLeave={(e) => calDragHandlers.onDateDragLeave(e, dateStr)}
                              onDrop={(e) => calDragHandlers.onDateDrop(e, dateStr)}
                              className={`
                                h-7 rounded flex flex-col items-center justify-center text-[9px] cursor-default
                                transition-all duration-150
                                ${isOver ? "bg-violet-100 dark:bg-violet-900/30 ring-1 ring-violet-500 scale-105" : ""}
                                ${today ? "text-primary font-bold" : "text-muted-foreground"}
                                ${hasPosts ? "bg-muted/50" : "bg-muted/20"}
                              `}
                            >
                              <span className="tabular-nums">{format(day, "d")}</span>
                              {isOver && (
                                <motion.span
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="text-[6px] text-violet-600 dark:text-violet-400"
                                >
                                  放置
                                </motion.span>
                              )}
                              {/* Drop flash for list mini calendar */}
                              <AnimatePresence>
                                {droppedDate === dateStr && !isOver && (
                                  <motion.div
                                    initial={{ opacity: 0.4, scale: 0.85 }}
                                    animate={{ opacity: 0, scale: 1.1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.7, ease: "easeOut" }}
                                    className="absolute inset-0 rounded bg-violet-500 pointer-events-none z-10"
                                  />
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ====== Stats summary ====== */}
          {filteredPosts.length > 0 && !isDragMode && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-3 py-2 mt-2 border-t">
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><FileText className="h-3 w-3" />总计 <strong className="text-foreground">{stats.total}</strong></span>
                <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-amber-500" />优化 <strong className="text-foreground">{stats.optimized}</strong></span>
                <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-violet-500" />发布 <strong className="text-foreground">{stats.published}</strong></span>
              </div>
            </motion.div>
          )}

          {/* ====== Batch generate button ====== */}
          <div className="px-3 pb-3 pt-1">
            <Button
              onClick={createPlanAndGenerate}
              disabled={isGenerating}
              size="sm"
              className="w-full h-7 text-[11px] bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-sm"
            >
              {isGenerating ? (
                <><Loader2 className="h-3 w-3 mr-1 animate-spin" />生成中…</>
              ) : (
                <><Sparkles className="h-3 w-3 mr-1" />一键生成30天</>
              )}
            </Button>
          </div>
        </div>
      </ScrollArea>

      {/* ====== Dialogs ====== */}
      <QuickCreateDialog
        open={quickCreateOpen}
        onOpenChange={setQuickCreateOpen}
        defaultDate={quickCreateDate}
      />
      <MoveToDateDialog
        open={moveToDateOpen}
        onOpenChange={setMoveToDateOpen}
        post={movePost}
      />

      {/* ====== Content Hover Preview ====== */}
      <ContentHoverPreview
        post={hoveredPost}
        anchorRect={anchorRect}
        containerRect={containerRect}
        visible={!!hoveredPost && !isDndReorderActive && !isDragMode}
        onEdit={handlePreviewEdit}
        onViewAnalytics={handlePreviewAnalytics}
        onCopy={handlePreviewCopy}
      />
    </div>
  );
}
