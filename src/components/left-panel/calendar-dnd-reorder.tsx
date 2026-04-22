"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
} from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  GripVertical,
  X,
  ArrowUpDown,
  CheckCircle2,
  Loader2,
} from "lucide-react";

// --- Color maps ---

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

// --- Helpers ---

function getContentTypeLabel(post: ContentPost) {
  if (post.platform === "xiaohongshu")
    return XHS_CONTENT_TYPE_LABELS[post.contentType as XHSContentType] || post.contentType;
  return CONTENT_TYPE_LABELS[post.contentType as ContentType] || post.contentType;
}

function getContentTypeColor(post: ContentPost) {
  if (post.platform === "xiaohongshu")
    return XHS_CONTENT_TYPE_COLORS[post.contentType as XHSContentType] || "";
  return CONTENT_TYPE_COLORS[post.contentType as ContentType] || "";
}

// --- Types ---

interface SortablePostItem {
  id: UniqueIdentifier;
  post: ContentPost;
  groupDate: string;
}

interface ReorderUpdate {
  id: string;
  scheduledDate: string;
  sortOrder: number;
}

interface CalendarDndReorderProps {
  groupedPosts: { dateStr: string; label: string; posts: ContentPost[] }[];
  isActive: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onReorder: (updates: ReorderUpdate[]) => void;
}

// --- Sortable Item Component ---

function SortableItem({ data, index }: { data: SortablePostItem; index: number }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: data.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  const post = data.post;
  const platformColor =
    post.platform === "xiaohongshu"
      ? "border-l-rose-400 dark:border-l-rose-500"
      : "border-l-green-400 dark:border-l-green-500";

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={`
          group relative flex items-center gap-1.5 rounded-md border border-l-[3px]
          ${platformColor}
          bg-card hover:bg-muted/50 p-1.5 cursor-grab active:cursor-grabbing
          transition-all duration-200 hover:shadow-sm select-none
          ${isDragging ? "shadow-lg ring-2 ring-primary/30" : ""}
        `}
      >
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className={`
            flex-shrink-0 flex items-center justify-center w-4 h-4
            opacity-0 group-hover:opacity-100 transition-opacity duration-200
            text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing
          `}
        >
          <GripVertical className="h-3 w-3" />
        </div>

        {/* Order number */}
        <span className="text-[8px] text-muted-foreground/60 tabular-nums w-3 text-center flex-shrink-0">
          {index + 1}
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

        {/* Content type */}
        <Badge
          className={`text-[7px] px-1 py-0 h-3 leading-3 flex-shrink-0 ${getContentTypeColor(post)}`}
          variant="secondary"
        >
          {getContentTypeLabel(post)}
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
    </div>
  );
}

// --- Drag Overlay Card ---

function DragOverlayCard({ post }: { post: ContentPost }) {
  const platformColor =
    post.platform === "xiaohongshu"
      ? "border-l-rose-400 dark:border-l-rose-500"
      : "border-l-green-400 dark:border-l-green-500";

  return (
    <div
      className={`
        flex items-center gap-1.5 rounded-md border border-l-[3px]
        ${platformColor}
        bg-card shadow-xl ring-2 ring-primary/30 p-1.5
        w-[260px] max-w-[260px]
      `}
    >
      <GripVertical className="h-3 w-3 text-muted-foreground flex-shrink-0" />
      <div className="flex items-center gap-[2px] flex-shrink-0">
        <span
          className={`h-[4px] w-[4px] rounded-full ${PLATFORM_DOT_COLORS[post.platform || "wechat"]}`}
        />
        <span
          className={`h-[4px] w-[4px] rounded-full ${STATUS_DOT_COLORS[post.status as PostStatus]}`}
        />
      </div>
      <Badge
        className={`text-[7px] px-1 py-0 h-3 leading-3 flex-shrink-0 ${getContentTypeColor(post)}`}
        variant="secondary"
      >
        {getContentTypeLabel(post)}
      </Badge>
      <span className="text-[10px] font-medium truncate flex-1 leading-tight">
        {post.topic}
      </span>
      <Badge
        className={`text-[7px] px-1 py-0 h-3 leading-3 flex-shrink-0 ${STATUS_BADGE_COLORS[post.status as PostStatus]}`}
        variant="secondary"
      >
        {POST_STATUS_LABELS[post.status as PostStatus]}
      </Badge>
    </div>
  );
}

// --- Main Component ---

export function CalendarDndReorder({
  groupedPosts,
  isActive,
  onActivate,
  onDeactivate,
  onReorder,
}: CalendarDndReorderProps) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastReorderUpdates, setLastReorderUpdates] = useState<ReorderUpdate[] | null>(null);

  // Build flat sortable items from grouped posts
  const sortableItems = useMemo<SortablePostItem[]>(() => {
    const items: SortablePostItem[] = [];
    let globalOrder = 0;
    for (const group of groupedPosts) {
      for (const post of group.posts) {
        items.push({
          id: post.id,
          post,
          groupDate: group.dateStr,
        });
        globalOrder++;
      }
    }
    return items;
  }, [groupedPosts]);

  const postMap = useMemo(() => {
    const map = new Map<string, ContentPost>();
    for (const item of sortableItems) {
      map.set(item.id as string, item.post);
    }
    return map;
  }, [sortableItems]);

  // Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Track drag state for cross-date drop detection
  const dragOverDateRef = useRef<string | null>(null);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      // Detect which date group the over item belongs to
      const overItem = sortableItems.find((item) => item.id === over.id);
      if (overItem) {
        dragOverDateRef.current = overItem.groupDate;
      }
    },
    [sortableItems],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      dragOverDateRef.current = null;

      if (!over || active.id === over.id) return;

      const items = [...sortableItems];
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      // Reorder
      const [moved] = items.splice(oldIndex, 1);
      items.splice(newIndex, 0, moved);

      // Calculate updates based on new position
      const updates: ReorderUpdate[] = [];
      let currentDate = "";
      let orderInDate = 0;

      for (const item of items) {
        if (item.groupDate !== currentDate) {
          currentDate = item.groupDate;
          orderInDate = 0;
        }
        const movedId = active.id as string;
        if (item.id === movedId || moved.id === item.id) {
          // Only include items that changed date
          const originalPost = postMap.get(item.id as string);
          if (originalPost && originalPost.scheduledDate !== currentDate) {
            updates.push({
              id: item.id as string,
              scheduledDate: currentDate,
              sortOrder: orderInDate,
            });
          } else if (item.id === movedId) {
            updates.push({
              id: item.id as string,
              scheduledDate: currentDate,
              sortOrder: orderInDate,
            });
          }
        }
        orderInDate++;
      }

      if (updates.length > 0) {
        setIsSaving(true);
        // Persist via API
        fetch("/api/content/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: updates }),
        })
          .then((res) => {
            if (!res.ok) throw new Error("排序失败");
            return res.json();
          })
          .then(() => {
            onReorder(updates);
            setLastReorderUpdates(updates);
            toast.success("排序已更新");
            // Auto-clear
            setTimeout(() => setLastReorderUpdates(null), 5000);
          })
          .catch(() => {
            toast.error("排序更新失败，请重试");
          })
          .finally(() => {
            setIsSaving(false);
          });
      }
    },
    [sortableItems, postMap, onReorder],
  );

  // Undo handler
  const handleUndo = useCallback(async () => {
    if (!lastReorderUpdates) return;
    setIsSaving(true);
    try {
      const undoUpdates = lastReorderUpdates.map((u) => ({
        id: u.id,
        scheduledDate: u.scheduledDate,
        sortOrder: u.sortOrder,
      }));
      const res = await fetch("/api/content/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: undoUpdates }),
      });
      if (!res.ok) throw new Error("撤销失败");
      onReorder(undoUpdates);
      toast.success("已撤销");
      setLastReorderUpdates(null);
    } catch {
      toast.error("撤销失败");
    } finally {
      setIsSaving(false);
    }
  }, [lastReorderUpdates, onReorder]);

  // ESC to deactivate
  useEffect(() => {
    if (!isActive) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onDeactivate();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, onDeactivate]);

  // Loading/saving indicator
  if (isSaving) {
    return (
      <div className="flex items-center justify-center gap-2 py-8">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">保存排序中…</span>
      </div>
    );
  }

  // Toggle button (inactive state)
  if (!isActive) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-6 px-2 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
        onClick={onActivate}
      >
        <ArrowUpDown className="h-3 w-3" />
        排序模式
      </Button>
    );
  }

  // Active reorder mode
  const activePost = activeId ? postMap.get(activeId as string) : null;

  return (
    <div className="space-y-2">
      {/* Active mode banner */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800/40">
          <div className="flex-shrink-0 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
            <ArrowUpDown className="h-2.5 w-2.5 text-white" />
          </div>
          <span className="text-[10px] font-medium text-violet-700 dark:text-violet-300">
            拖拽排序模式
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
          onClick={onDeactivate}
        >
          <X className="h-3 w-3" />
          退出
        </Button>
      </div>

      {/* DnD Context */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortableItems.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-1"
          >
            {groupedPosts.map((group) => (
              <div key={group.dateStr} className="space-y-1">
                {/* Date group header */}
                <div className="flex items-center gap-2 px-1 py-1">
                  <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">
                    {group.label}
                  </span>
                  <span className="text-[9px] text-muted-foreground/60">
                    {group.posts.length} 条
                  </span>
                  {dragOverDateRef.current === group.dateStr && activeId && (
                    <motion.span
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-[9px] font-medium text-violet-600 dark:text-violet-400"
                    >
                      放置到此处 ↑
                    </motion.span>
                  )}
                </div>
                {/* Posts in this date group */}
                {group.posts.map((post, idx) => (
                  <SortableItem
                    key={post.id}
                    data={{ id: post.id, post, groupDate: group.dateStr }}
                    index={idx}
                  />
                ))}
              </div>
            ))}
          </motion.div>
        </SortableContext>

        {/* Drag Overlay */}
        <DragOverlay dropAnimation={null}>
          {activePost ? <DragOverlayCard post={activePost} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Undo toast area */}
      <AnimatePresence>
        {lastReorderUpdates && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/60 border border-border/40"
          >
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-[10px] text-muted-foreground">
                已更新 {lastReorderUpdates.length} 条内容排序
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-2 text-[9px] text-primary hover:text-primary"
              onClick={handleUndo}
            >
              撤销
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
