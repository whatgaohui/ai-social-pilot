"use client";

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
  type JSX,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GripVertical, ArrowDownUp, CalendarDays } from "lucide-react";
import type { ContentPost } from "@/types";

// ─── Types ───────────────────────────────────────────────────────────────────

/** Describes the visual position where the drop indicator should appear. */
export type DropPosition = "before" | "after" | null;

/** State tracked internally by the hook. */
export interface DragState {
  /** Index of the item currently being dragged, or null when idle. */
  draggedIndex: number | null;
  /** Index of the item currently being hovered over, or null. */
  overIndex: number | null;
  /** Whether a drag operation is active. */
  isDragging: boolean;
  /** Whether the drop indicator should appear above or below the hovered item. */
  dropPosition: DropPosition;
}

/** Drag event handlers returned by the hook — spread onto each SortableItem. */
export interface DragHandlers {
  /** Attach to the draggable wrapper element. */
  onDragStart: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragEnd: () => void;
}

/** Return type of the `useDragSort` hook. */
export interface UseDragSortReturn<T> {
  dragHandlers: DragHandlers;
  dragState: DragState;
  /** Programmatically reorder items in-place (swap two indices). */
  reorder: (fromIndex: number, toIndex: number) => void;
  /** Reference to the live items array (useful for external save logic). */
  items: T[];
  /** IDs that were just reordered — used for hint animation. */
  reorderedIds: Set<string>;
  /** Clear reorder hints. */
  clearReorderHints: () => void;
}

/** Props accepted by the `SortableItem` wrapper component. */
export interface SortableItemProps {
  index: number;
  children: ReactNode;
  dragHandlers: DragHandlers;
  dragState: DragState;
  /** Optional extra classes applied to the outer wrapper. */
  className?: string;
  /** Optional click handler on the item (won't fire during drag). */
  onClick?: () => void;
  /** Whether the item is currently selected (affects ring style). */
  isSelected?: boolean;
  /** Platform for color-aware styling ("wechat" | "xiaohongshu"). */
  platform?: string;
  /** Unique identifier for sort hint animation. */
  sortHintId?: string;
  /** Whether to show sort hint animation on this item. */
  showSortHint?: boolean;
}

// ─── Platform-aware color helpers ────────────────────────────────────────────

function getDropIndicatorClass(platform?: string): string {
  if (platform === "xiaohongshu") {
    return "bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500";
  }
  return "bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500";
}

function getDropIndicatorGlow(platform?: string): string {
  if (platform === "xiaohongshu") {
    return "shadow-[0_0_8px_rgba(244,63,94,0.4)]";
  }
  return "shadow-[0_0_8px_rgba(34,197,94,0.4)]";
}

function getOverBgClass(platform?: string): string {
  if (platform === "xiaohongshu") {
    return "bg-rose-50/60 dark:bg-rose-900/15 border-rose-300 dark:border-rose-700";
  }
  return "bg-green-50/60 dark:bg-green-900/15 border-green-300 dark:border-green-700";
}

function getPlaceholderBgClass(platform?: string): string {
  if (platform === "xiaohongshu") {
    return "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-800/40";
  }
  return "bg-green-50/40 dark:bg-green-950/20 border-green-200/60 dark:border-green-800/40";
}

// ─── Within-list Drag Sort Hook ──────────────────────────────────────────────

/**
 * A generic, reusable drag-and-drop reordering hook built on the HTML5 Drag
 * and Drop API. It manages `draggedIndex`, `overIndex`, and `dropPosition`
 * (top vs bottom half of the target) so the consumer can show a precise
 * coloured drop-indicator line.
 */
export function useDragSort<T extends { id?: string }>(
  initialItems: T[],
  onReorder: (newItems: T[]) => void,
): UseDragSortReturn<T> {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<DropPosition>(null);
  const [reorderedIds, setReorderedIds] = useState<Set<string>>(new Set());

  const itemsRef = useRef(initialItems);
  useEffect(() => {
    itemsRef.current = initialItems;
  });

  const isDragging = draggedIndex !== null;

  const onDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, index: number) => {
      setDraggedIndex(index);
      e.dataTransfer.effectAllowed = "move";
      requestAnimationFrame(() => {
        (e.currentTarget as HTMLElement).style.opacity = "0.4";
      });
    },
    [],
  );

  const onDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";

      const rect = e.currentTarget.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const pos: DropPosition = e.clientY < midY ? "before" : "after";

      setOverIndex(index);
      setDropPosition(pos);
    },
    [],
  );

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const { clientX: x, clientY: y } = e;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setOverIndex(null);
      setDropPosition(null);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, index: number) => {
      e.preventDefault();

      const from = draggedIndex;
      if (from === null || from === index) {
        setDraggedIndex(null);
        setOverIndex(null);
        setDropPosition(null);
        return;
      }

      const items = itemsRef.current;
      const updated = [...items];
      const [removed] = updated.splice(from, 1);

      const insertAt = from < index ? index - 1 : index;
      const finalIndex = dropPosition === "after" ? insertAt + 1 : insertAt;
      updated.splice(Math.min(finalIndex, updated.length), 0, removed);

      onReorder(updated);

      // Track reordered items for hint animation
      if (removed.id) {
        setReorderedIds(new Set([String(removed.id)]));
        // Auto-clear after 2 seconds
        setTimeout(() => setReorderedIds(new Set()), 2000);
      }

      setDraggedIndex(null);
      setOverIndex(null);
      setDropPosition(null);
    },
    [draggedIndex, dropPosition, onReorder],
  );

  const onDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setOverIndex(null);
    setDropPosition(null);
  }, []);

  const reorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      const items = itemsRef.current;
      const updated = [...items];
      const [removed] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, removed);
      onReorder(updated);

      if (removed.id) {
        setReorderedIds(new Set([String(removed.id)]));
        setTimeout(() => setReorderedIds(new Set()), 2000);
      }
    },
    [onReorder],
  );

  const clearReorderHints = useCallback(() => {
    setReorderedIds(new Set());
  }, []);

  return {
    dragHandlers: { onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd },
    dragState: { draggedIndex, overIndex, isDragging, dropPosition },
    reorder,
    items: initialItems,
    reorderedIds,
    clearReorderHints,
  };
}

// ─── Cross-Date Calendar Drag Hook ──────────────────────────────────────────

export interface CalendarDragState {
  /** The post ID currently being dragged, or null. */
  draggedPostId: string | null;
  /** The original scheduledDate of the dragged post. */
  draggedPostOriginalDate: string | null;
  /** The date string currently being hovered as a drop target, or null. */
  overDate: string | null;
  /** Whether a drag is in progress. */
  isDragging: boolean;
  /** Whether a drop just happened (for flash animation). */
  justDropped: boolean;
}

export interface CalendarDragHandlers {
  onPostDragStart: (e: React.DragEvent<HTMLElement>, post: ContentPost) => void;
  onDateDragOver: (e: React.DragEvent<HTMLElement>, dateStr: string) => void;
  onDateDragEnter: (e: React.DragEvent<HTMLElement>, dateStr: string) => void;
  onDateDragLeave: (e: React.DragEvent<HTMLElement>, dateStr: string) => void;
  onDateDrop: (e: React.DragEvent<HTMLElement>, dateStr: string) => void;
  onPostDragEnd: () => void;
}

export interface UseCalendarDragSortReturn {
  dragState: CalendarDragState;
  handlers: CalendarDragHandlers;
}

/**
 * Enhanced hook for cross-date drag-and-drop in a calendar context.
 * Adds drop flash animation state and better edge-case handling.
 */
export function useCalendarDragSort(
  posts: ContentPost[],
  onDateChange: (postId: string, newScheduledDate: string) => Promise<void> | void,
): UseCalendarDragSortReturn {
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null);
  const [draggedPostOriginalDate, setDraggedPostOriginalDate] = useState<string | null>(null);
  const [overDate, setOverDate] = useState<string | null>(null);
  const [justDropped, setJustDropped] = useState(false);
  const justDroppedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const postsMapRef = useRef<Map<string, ContentPost>>(new Map());
  useEffect(() => {
    const m = new Map<string, ContentPost>();
    for (const p of posts) m.set(p.id, p);
    postsMapRef.current = m;
  }, [posts]);

  const isDragging = draggedPostId !== null;

  const triggerDropFlash = useCallback(() => {
    setJustDropped(true);
    if (justDroppedTimerRef.current) clearTimeout(justDroppedTimerRef.current);
    justDroppedTimerRef.current = setTimeout(() => setJustDropped(false), 800);
  }, []);

  const onPostDragStart = useCallback(
    (e: React.DragEvent<HTMLElement>, post: ContentPost) => {
      setDraggedPostId(post.id);
      setDraggedPostOriginalDate(post.scheduledDate);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", post.id);
      e.dataTransfer.setData("application/post-date", post.scheduledDate);
      e.dataTransfer.setData("application/post-topic", post.topic || "");
    },
    [],
  );

  const onDateDragOver = useCallback(
    (e: React.DragEvent<HTMLElement>, _dateStr: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    },
    [],
  );

  const onDateDragEnter = useCallback(
    (e: React.DragEvent<HTMLElement>, dateStr: string) => {
      e.preventDefault();
      setOverDate(dateStr);
    },
    [],
  );

  const onDateDragLeave = useCallback(
    (e: React.DragEvent<HTMLElement>, dateStr: string) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const { clientX: x, clientY: y } = e;
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        if (overDate === dateStr) {
          setOverDate(null);
        }
      }
    },
    [overDate],
  );

  const onDateDrop = useCallback(
    async (e: React.DragEvent<HTMLElement>, dateStr: string) => {
      e.preventDefault();
      const postId = e.dataTransfer.getData("text/plain");
      if (!postId) {
        setDraggedPostId(null);
        setDraggedPostOriginalDate(null);
        setOverDate(null);
        return;
      }

      const originalDate = e.dataTransfer.getData("application/post-date");
      if (originalDate === dateStr) {
        setDraggedPostId(null);
        setDraggedPostOriginalDate(null);
        setOverDate(null);
        return;
      }

      setDraggedPostId(null);
      setDraggedPostOriginalDate(null);
      setOverDate(null);

      triggerDropFlash();
      await onDateChange(postId, dateStr);
    },
    [onDateChange, triggerDropFlash],
  );

  const onPostDragEnd = useCallback(() => {
    setDraggedPostId(null);
    setDraggedPostOriginalDate(null);
    setOverDate(null);
  }, []);

  return {
    dragState: { draggedPostId, draggedPostOriginalDate, overDate, isDragging, justDropped },
    handlers: {
      onPostDragStart,
      onDateDragOver,
      onDateDragEnter,
      onDateDragLeave,
      onDateDrop,
      onPostDragEnd,
    },
  };
}

// ─── Drag Placeholder Component ─────────────────────────────────────────────

export interface DragPlaceholderProps {
  /** Whether the placeholder should be visible. */
  show: boolean;
  /** Platform for color-aware styling. */
  platform?: string;
  /** Optional label text shown in the placeholder. */
  label?: string;
  /** Height of the placeholder. */
  height?: number;
}

/**
 * A dashed placeholder shown where a dragged item was removed from.
 * Animates in/out smoothly.
 */
export function DragPlaceholder({
  show,
  platform,
  label = "拖拽到此处",
  height = 44,
}: DragPlaceholderProps): JSX.Element {
  const bgClass = getPlaceholderBgClass(platform);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
          animate={{
            opacity: 1,
            height,
            marginTop: 4,
            marginBottom: 4,
          }}
          exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className={`rounded-lg border-2 border-dashed flex items-center justify-center gap-1.5 overflow-hidden ${bgClass}`}
        >
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40" />
          </motion.div>
          <span className="text-[10px] text-muted-foreground/70 font-medium">
            {label}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Drop Indicator Line ─────────────────────────────────────────────────────

export interface DropIndicatorLineProps {
  /** Position: "top" or "bottom" of the target item. */
  position: "top" | "bottom";
  /** Whether the line is visible. */
  show: boolean;
  /** Platform for color-aware styling. */
  platform?: string;
}

/**
 * An animated drop indicator line with glow effect.
 * Used to show where a dragged item will be inserted.
 */
export function DropIndicatorLine({
  position,
  show,
  platform,
}: DropIndicatorLineProps): JSX.Element {
  const indicatorClass = getDropIndicatorClass(platform);
  const glowClass = getDropIndicatorGlow(platform);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          exit={{ scaleX: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={`
            absolute left-0 right-0 h-[3px] z-30 rounded-full ${indicatorClass} ${glowClass}
            ${position === "top" ? "top-0" : "bottom-0"}
          `}
        >
          {/* Animated dot at the leading edge */}
          <motion.div
            animate={{ x: ["0%", "100%", "0%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className={`
              absolute top-1/2 -translate-y-1/2 h-[5px] w-[5px] rounded-full bg-white shadow-sm
            `}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Sort Hint Badge ─────────────────────────────────────────────────────────

export interface SortHintBadgeProps {
  /** Whether the hint is visible. */
  show: boolean;
  /** The action that triggered the hint. */
  action?: "moved" | "new" | "rescheduled";
}

/**
 * A small animated badge that briefly appears after a sort/reorder action,
 * providing visual confirmation to the user.
 */
export function SortHintBadge({
  show,
  action = "moved",
}: SortHintBadgeProps): JSX.Element {
  const labels = {
    moved: "已移动",
    new: "新增",
    rescheduled: "已排期",
  };
  const colors = {
    moved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    new: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
    rescheduled: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, x: -10, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 10, scale: 0.8 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium ${colors[action]}`}
        >
          <ArrowDownUp className="h-2.5 w-2.5" />
          {labels[action]}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── SortableItem Component (Enhanced) ──────────────────────────────────────

/**
 * Enhanced wrapper that adds drag-and-drop capability with improved visual
 * feedback: animated drop indicators with glow, placeholder slot, sort hint
 * badge, and better drag handle visibility.
 */
export function SortableItem({
  index,
  children,
  dragHandlers,
  dragState,
  className = "",
  onClick,
  isSelected = false,
  platform,
  sortHintId,
  showSortHint = false,
}: SortableItemProps): JSX.Element {
  const { draggedIndex, overIndex, isDragging, dropPosition } = dragState;
  const { onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd } = dragHandlers;

  const isThisDragged = draggedIndex === index;
  const isThisOver = overIndex === index && draggedIndex !== index;

  const showLineAbove = isThisOver && dropPosition === "before";
  const showLineBelow = isThisOver && dropPosition === "after";

  const didDragRef = useRef(false);
  const handleDragStartLocal = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      didDragRef.current = true;
      onDragStart(e, index);
    },
    [index, onDragStart],
  );
  const handleClick = useCallback(() => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    onClick?.();
  }, [onClick]);

  const overBgClass = getOverBgClass(platform);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{
        opacity: isThisDragged ? 0.35 : 1,
        y: 0,
        scale: isThisDragged ? 0.96 : 1,
      }}
      transition={{
        type: "spring" as const,
        stiffness: 350,
        damping: 28,
      }}
      className={`relative ${className}`}
    >
      {/* Drop indicator lines with glow */}
      <DropIndicatorLine position="top" show={showLineAbove} platform={platform} />
      <DropIndicatorLine position="bottom" show={showLineBelow} platform={platform} />

      {/* Sort hint badge */}
      {showSortHint && !isThisDragged && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute -right-1 -top-1 z-20"
        >
          <SortHintBadge show={showSortHint} action="moved" />
        </motion.div>
      )}

      {/* Draggable wrapper */}
      <div
        draggable
        onDragStart={handleDragStartLocal}
        onDragOver={(e) => onDragOver(e, index)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, index)}
        onDragEnd={onDragEnd}
        onClick={handleClick}
        className={`
          group relative flex items-start gap-3 rounded-lg border p-3
          cursor-pointer transition-all duration-200 select-none
          hover:shadow-md hover:border-primary/30
          ${isThisDragged ? "z-50 shadow-xl" : ""}
          ${isThisOver ? `${overBgClass} shadow-sm` : ""}
          ${isSelected ? "ring-2 ring-primary bg-primary/[0.03] border-primary/40 shadow-md" : "bg-card border-border/20"}
        `}
      >
        {/* Drag Handle */}
        <div
          className={`
            flex-shrink-0 flex items-center justify-center w-5 h-8
            opacity-0 group-hover:opacity-100
            ${isDragging ? "!opacity-100" : ""}
            transition-opacity duration-200
            text-muted-foreground hover:text-foreground
            cursor-grab active:cursor-grabbing
          `}
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Item content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </motion.div>
  );
}

// ─── Calendar Date Drop Zone Component (Enhanced) ────────────────────────────

export interface CalendarDateDropZoneProps {
  dateStr: string;
  posts: ContentPost[];
  overDate: string | null;
  draggedPostId: string | null;
  draggedPostTopic?: string | null;
  isDragging: boolean;
  justDropped?: boolean;
  children?: ReactNode;
  className?: string;
  /** Show a conflict warning when too many posts exist on this date. */
  maxPostsPerDay?: number;
}

/**
 * Enhanced drop zone for calendar date cells with:
 * - Animated highlighted border on hover
 * - Ghost preview of the dragged post
 * - Drop success flash animation
 * - Conflict warning for > N posts per day
 */
export function CalendarDateDropZone({
  dateStr,
  posts,
  overDate,
  draggedPostId,
  draggedPostTopic,
  isDragging,
  justDropped = false,
  children,
  className = "",
  maxPostsPerDay = 3,
}: CalendarDateDropZoneProps): JSX.Element {
  const isOverThis = isDragging && overDate === dateStr;
  const hasPosts = posts.length > 0;
  const isDraggedPostInThisDate = hasPosts && posts.some((p) => p.id === draggedPostId);
  const hasConflict = posts.length >= maxPostsPerDay;

  const primaryPlatform = posts?.[0]?.platform || "wechat";
  const borderHighlight =
    primaryPlatform === "xiaohongshu"
      ? "border-rose-400 dark:border-rose-500 ring-rose-200/60 dark:ring-rose-800/40"
      : "border-green-400 dark:border-green-500 ring-green-200/60 dark:ring-green-800/40";

  return (
    <div
      className={`
        rounded-lg transition-all duration-200 p-0.5 relative
        ${isOverThis && !isDraggedPostInThisDate
          ? `border-2 ${borderHighlight} ring-2 scale-[1.02]`
          : "border-2 border-transparent"
        }
        ${isOverThis && !isDraggedPostInThisDate ? "bg-primary/[0.04] dark:bg-primary/[0.08]" : ""}
        ${className}
      `}
    >
      {children}

      {/* Drop success flash animation */}
      <AnimatePresence>
        {justDropped && (
          <motion.div
            initial={{ opacity: 0.5, scale: 0.95 }}
            animate={{ opacity: 0, scale: 1.05 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute inset-0 rounded-lg pointer-events-none z-20 overflow-hidden"
          >
            <div className={`absolute inset-0 rounded-lg ${
              primaryPlatform === "xiaohongshu"
                ? "bg-gradient-to-br from-rose-400/20 to-pink-400/20"
                : "bg-gradient-to-br from-green-400/20 to-emerald-400/20"
            }`} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drop zone: ghost preview of dragged post */}
      <AnimatePresence>
        {isOverThis && !isDraggedPostInThisDate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            {/* Ghost preview card */}
            <div className={`rounded-md border-2 border-dashed p-2 mt-0.5 ${
              primaryPlatform === "xiaohongshu"
                ? "border-rose-300/50 dark:border-rose-700/50 bg-rose-50/30 dark:bg-rose-950/10"
                : "border-green-300/50 dark:border-green-700/50 bg-green-50/30 dark:bg-green-950/10"
            }`}>
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <CalendarDays className={`h-3.5 w-3.5 ${
                    primaryPlatform === "xiaohongshu" ? "text-rose-400" : "text-green-400"
                  }`} />
                </motion.div>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {draggedPostTopic
                    ? `移动「${draggedPostTopic.length > 10 ? draggedPostTopic.slice(0, 10) + "…" : draggedPostTopic}」`
                    : "放置到此处"
                  }
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty drop zone placeholder */}
      <AnimatePresence>
        {isOverThis && !isDraggedPostInThisDate && !hasPosts && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="h-8 rounded-md border-2 border-dashed border-muted-foreground/30 flex items-center justify-center"
          >
            <span className="text-[10px] text-muted-foreground">放置到此处</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conflict warning */}
      {hasConflict && !isOverThis && (
        <motion.div
          initial={{ opacity: 0, x: 4 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute top-1 right-1 z-10"
        >
          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            {posts.length}条
          </span>
        </motion.div>
      )}
    </div>
  );
}

// ─── Cross-Date Drag Overlay ────────────────────────────────────────────────

export interface CrossDateDragOverlayProps {
  /** The post being dragged. */
  post: ContentPost | null;
  /** Whether dragging is active. */
  isDragging: boolean;
}

/**
 * A floating card that follows the cursor during cross-date dragging,
 * showing what content is being moved.
 */
export function CrossDateDragOverlay({
  post,
  isDragging,
}: CrossDateDragOverlayProps): JSX.Element {
  if (!post || !isDragging) {
    return <></>;
  }

  const platformColor =
    post.platform === "xiaohongshu"
      ? "border-l-rose-400 dark:border-l-rose-500"
      : "border-l-green-400 dark:border-l-green-500";

  return (
    <div
      className={`
        fixed top-4 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none
        flex items-center gap-2 px-3 py-2 rounded-xl
        border border-l-[3px] ${platformColor}
        bg-card/95 backdrop-blur-lg shadow-2xl
        max-w-[260px]
      `}
    >
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium truncate leading-tight">
          {post.topic || "未命名内容"}
        </p>
        <p className="text-[9px] text-muted-foreground">
          从 {post.scheduledDate} 移动
        </p>
      </div>
      <span className="text-[9px] text-primary font-medium flex-shrink-0 bg-primary/10 px-1.5 py-0.5 rounded-full">
        拖拽中
      </span>
    </div>
  );
}

// ─── Drag Mode Instruction Banner ───────────────────────────────────────────

export interface DragModeBannerProps {
  /** Whether drag mode is active. */
  isActive: boolean;
  /** Callback to deactivate drag mode. */
  onDeactivate: () => void;
  /** Total number of items. */
  totalItems?: number;
}

/**
 * A floating banner shown when drag-sort mode is active,
 * providing instructions and an exit button.
 */
export function DragModeBanner({
  isActive,
  onDeactivate,
  totalItems = 0,
}: DragModeBannerProps): JSX.Element {
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800/40"
        >
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: [0, 180] }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            >
              <ArrowDownUp className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
            </motion.div>
            <span className="text-[11px] font-medium text-violet-700 dark:text-violet-300">
              拖拽排序模式
            </span>
            {totalItems > 0 && (
              <span className="text-[10px] text-violet-500 dark:text-violet-400">
                · {totalItems} 条可排序
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-muted-foreground">拖拽卡片调整顺序</span>
            <button
              onClick={onDeactivate}
              className="text-[10px] text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 font-medium transition-colors"
            >
              完成
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
