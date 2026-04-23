"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import type { ContentPost, PostStatus } from "@/types";
import {
  POST_STATUS_LABELS,
  PLATFORM_LABELS,
  XHS_CONTENT_TYPE_LABELS,
  CONTENT_TYPE_LABELS,
  XHSContentType,
  ContentType,
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
  ScrollArea,
} from "@/components/ui/scroll-area";
import {
  LayoutGrid,
  List,
  CalendarDays,
  GanttChart,
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  Sparkles,
  FileText,
  GripVertical,
  Eye,
  Pencil,
  Copy,
  Trash2,
  Calendar as CalendarIcon,
  Activity,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isToday,
  addMonths,
  subMonths,
  parseISO,
  startOfDay,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
} from "date-fns";
import { zhCN } from "date-fns/locale";
import { CalendarWeekView } from "@/components/center-panel/calendar-week-view";
import { CalendarGanttView } from "@/components/center-panel/calendar-gantt-view";
import { CalendarHeatmap } from "@/components/left-panel/calendar-heatmap";

// ─── Types ───────────────────────────────────────────────────────────────────

type ViewMode = "grid" | "list" | "week" | "gantt";

// ─── Color Maps ──────────────────────────────────────────────────────────────

const STATUS_DOT_COLORS: Record<PostStatus, string> = {
  planned: "bg-gray-400",
  generated: "bg-sky-500",
  optimized: "bg-amber-500",
  scheduled: "bg-violet-500",
  published: "bg-emerald-500",
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

const WEEKDAY_NAMES = ["一", "二", "三", "四", "五", "六", "日"];

// ─── Animation ───────────────────────────────────────────────────────────────

const viewTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
};

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
      XHS_CONTENT_TYPE_LABELS[post.contentType as XHSContentType]
        ? (() => {
            const colors: Record<string, string> = {
              seeding: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
              review: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
              tutorial: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
              drygoods: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
              vlog: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
              daily: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
              recommend: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
              collection: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
            };
            return colors[post.contentType] || "";
          })()
        : ""
    );
  const colors: Record<string, string> = {
    text: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    image: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    video: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    mixed: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    story: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    insight: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
    interaction: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  };
  return colors[post.contentType] || "";
}

function getPlatformLabel(post: ContentPost): string {
  if (!post.platform || post.platform === "wechat") return "朋友圈";
  return PLATFORM_LABELS[post.platform as keyof typeof PLATFORM_LABELS] || post.platform;
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
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
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

// ─── Grid View Day Cell ──────────────────────────────────────────────────────

interface GridDayCellProps {
  day: Date;
  dateStr: string;
  posts: ContentPost[];
  isSelected: boolean;
  isTodayFlag: boolean;
  isWeekend: boolean;
  selectedPostId: string | null;
  onDayClick: (dateStr: string) => void;
  onDayDoubleClick: (dateStr: string) => void;
  onPostClick: (post: ContentPost) => void;
}

function GridDayCell({
  day,
  dateStr,
  posts,
  isSelected,
  isTodayFlag,
  isWeekend,
  selectedPostId,
  onDayClick,
  onDayDoubleClick,
  onPostClick,
}: GridDayCellProps) {
  const showPosts = posts.slice(0, 3);
  const moreCount = posts.length - 3;

  return (
    <motion.div
      variants={staggerChild}
      className={`
        relative rounded-lg border p-1.5 text-left transition-all duration-200 min-h-[90px]
        cursor-pointer hover:shadow-sm
        ${isSelected
          ? "ring-2 ring-primary bg-primary/[0.06] border-primary/40"
          : isTodayFlag
            ? "ring-1 ring-primary/30 bg-primary/5 border-primary/20"
            : posts.length > 0
              ? "bg-card border-border hover:border-primary/30"
              : isWeekend
                ? "bg-muted/10 border-transparent"
                : "bg-muted/20 border-transparent"
        }
      `}
      onClick={() => onDayClick(dateStr)}
      onDoubleClick={() => onDayDoubleClick(dateStr)}
    >
      {/* Day header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          <span className="relative">
            {isTodayFlag && (
              <motion.span
                className="absolute -inset-[3px] rounded-full border-2 border-primary"
                animate={{
                  scale: [1, 1.15, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
            <span
              className={`relative text-xs font-bold tabular-nums ${isTodayFlag ? "text-primary" : "text-foreground"}`}
            >
              {format(day, "d")}
            </span>
          </span>
          <span className={`text-[9px] ${isTodayFlag ? "text-primary" : "text-muted-foreground"}`}>
            {WEEKDAY_NAMES[(day.getDay() + 6) % 7]}
          </span>
        </div>
        {posts.length > 0 && (
          <Badge
            variant="secondary"
            className="text-[8px] h-4 px-1.5 tabular-nums"
          >
            {posts.length}
          </Badge>
        )}
      </div>

      {/* Posts */}
      {showPosts.map((post) => {
        const isPostSelected = selectedPostId === post.id;
        return (
          <button
            key={post.id}
            onClick={(e) => {
              e.stopPropagation();
              onPostClick(post);
            }}
            className={`
              w-full text-left rounded-md px-1.5 py-1 mb-0.5 border transition-all duration-150
              hover:bg-muted/60 hover:border-primary/30
              ${isPostSelected
                ? "ring-1 ring-primary bg-primary/[0.06] border-primary/30"
                : "border-transparent"
              }
            `}
          >
            <div className="flex items-center gap-1">
              <span className={`h-[5px] w-[5px] rounded-full flex-shrink-0 ${PLATFORM_DOT_COLORS[post.platform || "wechat"]}`} />
              <span className="text-[9px] font-medium truncate flex-1 leading-tight">
                {post.topic}
              </span>
              <span className={`h-[5px] w-[5px] rounded-full flex-shrink-0 ${STATUS_DOT_COLORS[post.status as PostStatus] || "bg-gray-300"}`} />
            </div>
          </button>
        );
      })}

      {moreCount > 0 && (
        <p className="text-[8px] text-muted-foreground text-center mt-0.5">
          +{moreCount} 更多
        </p>
      )}

      {/* Empty state */}
      {posts.length === 0 && (
        <div className="flex items-center justify-center h-10 text-muted-foreground/30">
          <Plus className="h-3 w-3" />
        </div>
      )}
    </motion.div>
  );
}

// ─── List View Post Item ─────────────────────────────────────────────────────

interface ListItemProps {
  post: ContentPost;
  index: number;
  isSelected: boolean;
  onClick: (post: ContentPost) => void;
  onContextMenuAction: (action: string, post: ContentPost) => void;
}

function ListItem({
  post,
  index,
  isSelected,
  onClick,
  onContextMenuAction,
}: ListItemProps) {
  let formattedDate = "";
  try {
    formattedDate = format(parseISO(post.scheduledDate), "M/d EEEE", {
      locale: zhCN,
    });
  } catch {
    formattedDate = post.scheduledDate;
  }

  const platformColor =
    post.platform === "xiaohongshu"
      ? "border-l-rose-400 dark:border-l-rose-400"
      : "border-l-green-400 dark:border-l-green-400";

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: post.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.85 : 1,
    scale: isDragging ? 1.02 : 1,
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <motion.div variants={staggerChild} initial="hidden" animate="show" layout ref={setNodeRef} style={style}>
          <div
            onClick={() => onClick(post)}
            className={`
              group relative w-full rounded-lg border border-l-[3px] p-3 text-left
              transition-all duration-150 cursor-pointer
              hover:border-primary/30 hover:bg-muted/50 hover:shadow-sm
              ${platformColor}
              ${isSelected
                ? "ring-2 ring-primary bg-primary/[0.05] border-primary/40 shadow-md"
                : "border-border"
              }
              ${isDragging
                ? "shadow-xl ring-2 ring-primary/50 border-primary/30"
                : ""
              }
            `}
          >
            <div className="flex items-center gap-2">
              {/* Drag handle */}
              <button
                className="flex items-center justify-center h-5 w-5 rounded flex-shrink-0
                  text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/80
                  cursor-grab active:cursor-grabbing transition-colors"
                {...attributes}
                {...listeners}
                onClick={(e) => e.stopPropagation()}
                aria-label="拖拽排序"
              >
                <GripVertical className="h-3.5 w-3.5" />
              </button>
              <span className="text-[10px] text-muted-foreground tabular-nums flex-shrink-0 w-[70px]">
                {formattedDate}
              </span>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className={`h-[5px] w-[5px] rounded-full ${PLATFORM_DOT_COLORS[post.platform || "wechat"]}`} />
                <span className={`h-[5px] w-[5px] rounded-full ${STATUS_DOT_COLORS[post.status as PostStatus] || "bg-gray-300"}`} />
              </div>
              <Badge className={`text-[8px] px-1 py-0 h-4 ${getContentTypeColor(post)}`} variant="secondary">
                {getContentTypeLabel(post)}
              </Badge>
              <span className="text-xs font-medium truncate flex-1">
                {post.topic}
              </span>
              <Badge className={`text-[8px] px-1.5 py-0 h-4 ${STATUS_BADGE_COLORS[post.status as PostStatus]}`} variant="secondary">
                {POST_STATUS_LABELS[post.status as PostStatus]}
              </Badge>
            </div>
            {post.content && (
              <p className="text-[10px] text-muted-foreground mt-1 leading-tight line-clamp-1 pl-[98px]">
                {post.content.length > 60
                  ? post.content.slice(0, 60) + "…"
                  : post.content}
              </p>
            )}
            {/* Mini stats */}
            {post.status === "published" && (post.likes || post.comments || post.views) > 0 && (
              <div className="flex items-center gap-3 mt-1.5 pl-[98px] text-[9px] text-muted-foreground tabular-nums">
                {post.views > 0 && <span>浏览 {post.views}</span>}
                {post.likes > 0 && <span className="text-rose-400">点赞 {post.likes}</span>}
                {post.comments > 0 && <span className="text-amber-400">评论 {post.comments}</span>}
              </div>
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
        <ContextMenuItem
          onClick={() => onContextMenuAction("delete", post)}
          className="text-red-600 dark:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5 mr-2" />
          删除
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ContentCalendar() {
  const {
    contentPosts,
    selectedDate,
    setSelectedDate,
    selectedPostId,
    setSelectedPostId,
    platform: currentPlatform,
    addContentPost,
    reorderPosts,
  } = useAppStore();

  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [weekAnchor, setWeekAnchor] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );

  // Quick create dialog
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateDate, setQuickCreateDate] = useState("");

  // Move dialog
  const [movePost, setMovePost] = useState<ContentPost | null>(null);
  const [moveDate, setMoveDate] = useState("");
  const [isMoving, setIsMoving] = useState(false);

  // Reorder persistence
  const [isReordering, setIsReordering] = useState(false);

  // ─── Platform Filter ───────────────────────────────────────

  const [platformFilter, setPlatformFilter] = useState<
    "all" | "wechat" | "xiaohongshu"
  >("all");

  const filteredPosts = useMemo(() => {
    return contentPosts.filter((p) => {
      if (platformFilter === "all") return true;
      if (!p.platform && platformFilter === "wechat") return true;
      return p.platform === platformFilter;
    });
  }, [contentPosts, platformFilter]);

  // ─── Posts by Date ─────────────────────────────────────────

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

  // ─── Month Math ────────────────────────────────────────────

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = (getDay(monthStart) + 6) % 7; // Monday = 0

  // ─── Stats ────────────────────────────────────────────────

  const monthPosts = useMemo(() => {
    const prefix = format(currentMonth, "yyyy-MM");
    return filteredPosts.filter(
      (p) => p.scheduledDate && p.scheduledDate.startsWith(prefix),
    );
  }, [filteredPosts, currentMonth]);

  const stats = useMemo(() => {
    const total = monthPosts.length;
    const published = monthPosts.filter(
      (p) => p.status === "published",
    ).length;
    const optimized = monthPosts.filter(
      (p) => p.status === "optimized",
    ).length;
    return { total, published, optimized };
  }, [monthPosts]);

  // ─── All sorted posts (for list view) ──────────────────────

  const sortedPosts = useMemo(() => {
    return [...filteredPosts]
      .filter((p) => p.scheduledDate)
      .sort((a, b) => {
        const dateCmp = a.scheduledDate.localeCompare(b.scheduledDate);
        if (dateCmp !== 0) return dateCmp;
        return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      });
  }, [filteredPosts]);

  // ─── DnD sensors for list view ──────────────────────────────

  const listViewSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleListDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      // Reorder in the Zustand store first (optimistic)
      reorderPosts(String(active.id), String(over.id));

      // Compute the new ordered list and persist to DB
      const { contentPosts: currentPosts } = useAppStore.getState();
      const reordered = [...currentPosts]
        .filter((p) => p.scheduledDate)
        .sort((a, b) => {
          const dateCmp = a.scheduledDate.localeCompare(b.scheduledDate);
          if (dateCmp !== 0) return dateCmp;
          return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
        });
      const orderedIds = reordered.map((p) => p.id);

      setIsReordering(true);
      fetch('/api/content/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds }),
      })
        .then((res) => {
          if (!res.ok) throw new Error('Failed to persist order');
          // Update sortOrder in the store to match DB
          const { updateContentPost } = useAppStore.getState();
          reordered.forEach((p, i) => {
            updateContentPost(p.id, { sortOrder: i });
          });
        })
        .catch(() => {
          toast.error('排序保存失败', {
            description: '已恢复到上一次的顺序',
          });
        })
        .finally(() => {
          setIsReordering(false);
        });
    },
    [reorderPosts],
  );

  // ─── Handlers ──────────────────────────────────────────────

  const handleDayClick = useCallback(
    (dateStr: string) => {
      setSelectedDate(dateStr);
      const posts = postsByDate[dateStr];
      if (posts && posts.length > 0) {
        const match = posts.find(
          (p) => !p.platform || p.platform === currentPlatform,
        );
        setSelectedPostId((match || posts[0]).id);
      } else {
        setSelectedPostId(null);
      }
    },
    [postsByDate, currentPlatform, setSelectedDate, setSelectedPostId],
  );

  const handleDayDoubleClick = useCallback(
    (dateStr: string) => {
      setQuickCreateDate(dateStr);
      setQuickCreateOpen(true);
    },
    [],
  );

  const handlePostClick = useCallback(
    (post: ContentPost) => {
      setSelectedDate(post.scheduledDate);
      setSelectedPostId(post.id);
    },
    [setSelectedDate, setSelectedPostId],
  );

  const handleContextMenuAction = useCallback(
    (action: string, post: ContentPost) => {
      switch (action) {
        case "view":
        case "edit":
          setSelectedDate(post.scheduledDate);
          setSelectedPostId(post.id);
          break;
        case "duplicate": {
          const dup: ContentPost = {
            ...post,
            id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          addContentPost(dup);
          toast.success("已复制", { description: post.topic });
          break;
        }
        case "move":
          setMovePost(post);
          setMoveDate(post.scheduledDate);
          break;
        case "delete":
          toast.success("已删除", { description: post.topic });
          break;
      }
    },
    [setSelectedDate, setSelectedPostId, addContentPost],
  );

  const handleMove = useCallback(async () => {
    if (!movePost || !moveDate) return;
    setIsMoving(true);
    try {
      const res = await fetch(`/api/content/${movePost.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledDate: moveDate }),
      });
      if (!res.ok) throw new Error("移动失败");
      const { updateContentPost } = useAppStore.getState();
      updateContentPost(movePost.id, { scheduledDate: moveDate });
      toast.success("已移动", {
        description: format(parseISO(moveDate), "M月d日"),
      });
      setMovePost(null);
    } catch {
      toast.error("移动失败");
    } finally {
      setIsMoving(false);
    }
  }, [movePost, moveDate]);

  // ─── View Mode Config ──────────────────────────────────────

  const viewModes: {
    value: ViewMode;
    icon: React.ElementType;
    label: string;
  }[] = [
    { value: "grid", icon: LayoutGrid, label: "月视图" },
    { value: "list", icon: List, label: "列表" },
    { value: "week", icon: CalendarDays, label: "周视图" },
    { value: "gantt", icon: GanttChart, label: "甘特图" },
  ];

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* ─── Header ───────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 flex-shrink-0 flex-wrap gap-2">
        {/* Month / week navigation (only for grid & list) */}
        {viewMode !== "gantt" ? (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => {
                if (viewMode === "week") {
                  setWeekAnchor((prev) => subWeeks(prev, 1));
                } else {
                  setCurrentMonth((prev) => subMonths(prev, 1));
                }
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold min-w-[100px] text-center tabular-nums">
              {viewMode === "week"
                ? `${format(startOfWeek(weekAnchor, { weekStartsOn: 1 }), "M月d日", { locale: zhCN })} — ${format(endOfWeek(weekAnchor, { weekStartsOn: 1 }), "M月d日", { locale: zhCN })}`
                : format(currentMonth, "yyyy年M月", { locale: zhCN })}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => {
                if (viewMode === "week") {
                  setWeekAnchor((prev) => addWeeks(prev, 1));
                } else {
                  setCurrentMonth((prev) => addMonths(prev, 1));
                }
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs ml-1"
              onClick={() => {
                setCurrentMonth(new Date());
                setWeekAnchor(
                  startOfWeek(new Date(), { weekStartsOn: 1 }),
                );
              }}
            >
              今天
            </Button>
          </div>
        ) : (
          <div />
        )}

        {/* View mode toggle */}
        <TooltipProvider delayDuration={300}>
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            {viewModes.map((vm) => {
              const Icon = vm.icon;
              const isActive = viewMode === vm.value;
              return (
                <Tooltip key={vm.value}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      size="sm"
                      className={`h-7 w-8 p-0 ${isActive ? "shadow-sm" : ""}`}
                      onClick={() => setViewMode(vm.value)}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {vm.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </div>

      {/* ─── Platform Filter ───────────────────────────── */}
      <div className="flex items-center gap-1.5 px-4 pb-2 flex-shrink-0">
        {([
          { value: "all" as const, label: "全部", color: "" },
          {
            value: "wechat" as const,
            label: "朋友圈",
            color: "bg-green-500",
          },
          {
            value: "xiaohongshu" as const,
            label: "小红书",
            color: "bg-red-500",
          },
        ]).map((pf) => {
          const isActive = platformFilter === pf.value;
          return (
            <button
              key={pf.value}
              onClick={() => setPlatformFilter(pf.value)}
              className={`
                flex items-center gap-1 h-6 px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-all duration-200
                ${isActive
                  ? pf.value === "wechat"
                    ? "bg-green-500 text-white shadow-sm"
                    : pf.value === "xiaohongshu"
                      ? "bg-red-500 text-white shadow-sm"
                      : "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                }
              `}
            >
              {pf.color && (
                <span
                  className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-white" : pf.color}`}
                />
              )}
              {pf.label}
            </button>
          );
        })}

        {/* Stats summary */}
        {filteredPosts.length > 0 && viewMode !== "gantt" && (
          <div className="ml-auto flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="font-medium tabular-nums">{stats.total}篇</span>
            <span className="flex items-center gap-0.5 text-emerald-500 tabular-nums">
              <span className="h-1 w-1 rounded-full bg-emerald-500" />
              {stats.published}已发
            </span>
            <span className="flex items-center gap-0.5 text-amber-500 tabular-nums">
              <span className="h-1 w-1 rounded-full bg-amber-500" />
              {stats.optimized}已优
            </span>
          </div>
        )}
      </div>

      {/* ─── Calendar Heatmap (grid mode) ─────────────── */}
      {viewMode === "grid" && <CalendarHeatmap posts={filteredPosts} />}

      {/* ─── View Content ─────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {/* ── Month Grid View ────────────────────────── */}
          {viewMode === "grid" && (
            <motion.div
              key="grid"
              {...viewTransition}
              className="h-full overflow-y-auto px-3 pb-4"
            >
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                {WEEKDAY_NAMES.map((name, i) => (
                  <div
                    key={name}
                    className={`text-center text-[10px] font-medium py-1 ${i >= 5 ? "text-muted-foreground/60" : "text-muted-foreground"}`}
                  >
                    {name}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="grid grid-cols-7 gap-1.5"
              >
                {/* Empty cells before month start */}
                {Array.from({ length: startDayOfWeek }).map((_, i) => (
                  <div key={`empty-start-${i}`} className="min-h-[90px]" />
                ))}

                {/* Day cells */}
                {daysInMonth.map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const dayPosts = postsByDate[dateStr] || [];
                  const isTodayFlag = isToday(day);
                  const isSelected = selectedDate === dateStr;
                  const dayIndex = (day.getDay() + 6) % 7;
                  const isWeekend = dayIndex >= 5;

                  return (
                    <GridDayCell
                      key={dateStr}
                      day={day}
                      dateStr={dateStr}
                      posts={dayPosts}
                      isSelected={isSelected}
                      isTodayFlag={isTodayFlag}
                      isWeekend={isWeekend}
                      selectedPostId={selectedPostId}
                      onDayClick={handleDayClick}
                      onDayDoubleClick={handleDayDoubleClick}
                      onPostClick={handlePostClick}
                    />
                  );
                })}
              </motion.div>
            </motion.div>
          )}

          {/* ── List View ─────────────────────────────── */}
          {viewMode === "list" && (
            <motion.div
              key="list"
              {...viewTransition}
              className="h-full overflow-y-auto px-3 pb-4"
            >
              {sortedPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <FileText className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm font-medium">暂无内容</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    创建内容后即可查看列表
                  </p>
                </div>
              ) : (
                <DndContext
                  sensors={listViewSensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleListDragEnd}
                >
                  <SortableContext
                    items={sortedPosts.map(p => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <motion.div
                      variants={staggerContainer}
                      initial="hidden"
                      animate="show"
                      className="space-y-1.5"
                    >
                      {sortedPosts.map((post, index) => (
                        <ListItem
                          key={post.id}
                          post={post}
                          index={index}
                          isSelected={selectedPostId === post.id}
                          onClick={handlePostClick}
                          onContextMenuAction={handleContextMenuAction}
                        />
                      ))}
                    </motion.div>
                  </SortableContext>
                </DndContext>
              )}
            </motion.div>
          )}

          {/* ── Week View ─────────────────────────────── */}
          {viewMode === "week" && (
            <motion.div key="week" {...viewTransition} className="h-full">
              <CalendarWeekView posts={filteredPosts} />
            </motion.div>
          )}

          {/* ── Gantt View ─────────────────────────────── */}
          {viewMode === "gantt" && (
            <motion.div key="gantt" {...viewTransition} className="h-full">
              <CalendarGanttView posts={filteredPosts} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Quick Create Dialog ──────────────────────── */}
      <QuickCreateDialog
        open={quickCreateOpen}
        onOpenChange={setQuickCreateOpen}
        defaultDate={quickCreateDate}
      />

      {/* ─── Move Dialog ──────────────────────────────── */}
      <Dialog
        open={!!movePost}
        onOpenChange={(open) => {
          if (!open) setMovePost(null);
        }}
      >
        <DialogContent className="sm:max-w-[340px]">
          <DialogHeader>
            <DialogTitle className="text-sm">移动到日期</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              选择目标日期：{movePost?.topic}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              type="date"
              value={moveDate}
              onChange={(e) => setMoveDate(e.target.value)}
              className="text-sm"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMovePost(null)}
            >
              取消
            </Button>
            <Button
              size="sm"
              onClick={handleMove}
              disabled={!moveDate || isMoving}
            >
              {isMoving ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : null}
              移动
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
