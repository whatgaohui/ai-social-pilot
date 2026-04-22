"use client";

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
  type JSX,
} from "react";
import { motion } from "framer-motion";
import { GripVertical } from "lucide-react";
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
}

// ─── Platform-aware color helpers ────────────────────────────────────────────

function getDropIndicatorClass(platform?: string): string {
  if (platform === "xiaohongshu") {
    return "bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500";
  }
  // Default: wechat (violet)
  return "bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500";
}

function getOverBgClass(platform?: string): string {
  if (platform === "xiaohongshu") {
    return "bg-rose-50/50 dark:bg-rose-900/10 border-rose-300 dark:border-rose-700";
  }
  return "bg-green-50/50 dark:bg-green-900/10 border-green-300 dark:border-green-700";
}

// ─── Within-list Drag Sort Hook ──────────────────────────────────────────────

/**
 * A generic, reusable drag-and-drop reordering hook built on the HTML5 Drag
 * and Drop API. It manages `draggedIndex`, `overIndex`, and `dropPosition`
 * (top vs bottom half of the target) so the consumer can show a precise
 * coloured drop-indicator line.
 *
 * When a successful drop occurs the hook calls `onReorder(newItems)` where
 * `newItems` is a new array with the dragged element inserted at the target
 * position (not a simple swap — this gives intuitive list-reordering).
 *
 * @typeParam T - The element type of the items array.
 * @param initialItems - The current ordered array of items.
 * @param onReorder - Callback receiving the reordered array after a drop.
 */
export function useDragSort<T>(
  initialItems: T[],
  onReorder: (newItems: T[]) => void,
): UseDragSortReturn<T> {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<DropPosition>(null);

  // Keep a ref so callbacks always see the latest items snapshot.
  const itemsRef = useRef(initialItems);
  useEffect(() => {
    itemsRef.current = initialItems;
  });

  const isDragging = draggedIndex !== null;

  // ── Handlers ───────────────────────────────────────────────────────────

  const onDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, index: number) => {
      setDraggedIndex(index);
      e.dataTransfer.effectAllowed = "move";
      // Briefly delay so the browser captures the ghost image first.
      requestAnimationFrame(() => {
        (e.currentTarget as HTMLElement).style.opacity = "0.5";
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

  /** Imperative reorder helper — swaps two items by index. */
  const reorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      const items = itemsRef.current;
      const updated = [...items];
      const [removed] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, removed);
      onReorder(updated);
    },
    [onReorder],
  );

  return {
    dragHandlers: { onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd },
    dragState: { draggedIndex, overIndex, isDragging, dropPosition },
    reorder,
    items: initialItems,
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
}

export interface CalendarDragHandlers {
  /** Attach to each draggable post item. */
  onPostDragStart: (e: React.DragEvent<HTMLElement>, post: ContentPost) => void;
  /** Attach to each date cell drop zone. */
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
 * Hook for cross-date drag-and-drop in a calendar context.
 * Allows dragging a ContentPost from one date to another.
 * On drop, calls onDateChange(postId, newDate) for the consumer to persist.
 */
export function useCalendarDragSort(
  posts: ContentPost[],
  onDateChange: (postId: string, newScheduledDate: string) => Promise<void> | void,
): UseCalendarDragSortReturn {
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null);
  const [draggedPostOriginalDate, setDraggedPostOriginalDate] = useState<string | null>(null);
  const [overDate, setOverDate] = useState<string | null>(null);

  // Map posts by id for quick lookup
  const postsMapRef = useRef<Map<string, ContentPost>>(new Map());
  useEffect(() => {
    const m = new Map<string, ContentPost>();
    for (const p of posts) m.set(p.id, p);
    postsMapRef.current = m;
  }, [posts]);

  const isDragging = draggedPostId !== null;

  // ── Handlers ───────────────────────────────────────────────────────────

  const onPostDragStart = useCallback(
    (e: React.DragEvent<HTMLElement>, post: ContentPost) => {
      setDraggedPostId(post.id);
      setDraggedPostOriginalDate(post.scheduledDate);
      e.dataTransfer.effectAllowed = "move";
      // Store the post ID in dataTransfer for identification
      e.dataTransfer.setData("text/plain", post.id);
      e.dataTransfer.setData("application/post-date", post.scheduledDate);
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
      // Only clear when truly leaving the element
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

      // Don't do anything if dropped on the same date
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

      // Persist the date change
      await onDateChange(postId, dateStr);
    },
    [onDateChange],
  );

  const onPostDragEnd = useCallback(() => {
    setDraggedPostId(null);
    setDraggedPostOriginalDate(null);
    setOverDate(null);
  }, []);

  return {
    dragState: { draggedPostId, draggedPostOriginalDate, overDate, isDragging },
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

// ─── SortableItem Component ─────────────────────────────────────────────────

/**
 * A wrapper component that adds drag-and-drop capability to any calendar list
 * item. It renders a `GripVertical` drag handle, applies opacity / scale
 * transforms to the dragged item, and shows a platform-aware coloured
 * drop-indicator line above or below the hovered target.
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
}: SortableItemProps): JSX.Element {
  const { draggedIndex, overIndex, isDragging, dropPosition } = dragState;
  const { onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd } = dragHandlers;

  const isThisDragged = draggedIndex === index;
  const isThisOver = overIndex === index && draggedIndex !== index;

  // Drop-indicator line positioning
  const showLineAbove = isThisOver && dropPosition === "before";
  const showLineBelow = isThisOver && dropPosition === "after";

  // Track whether a drag started on this item so we can suppress click.
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

  const indicatorClass = getDropIndicatorClass(platform);
  const overBgClass = getOverBgClass(platform);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{
        opacity: isThisDragged ? 0.5 : 1,
        y: 0,
        scale: isThisDragged ? 0.95 : 1,
      }}
      transition={{
        type: "spring" as const,
        stiffness: 350,
        damping: 28,
      }}
      className={`relative ${className}`}
    >
      {/* ── Drop indicator line (above) ── */}
      {showLineAbove && (
        <motion.div
          layoutId="drop-indicator-top"
          className={`absolute top-0 left-0 right-0 h-[3px] z-30 rounded-full ${indicatorClass}`}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          exit={{ scaleX: 0, opacity: 0 }}
          transition={{ duration: 0.15 }}
        />
      )}

      {/* ── Drop indicator line (below) ── */}
      {showLineBelow && (
        <motion.div
          layoutId="drop-indicator-bottom"
          className={`absolute bottom-0 left-0 right-0 h-[3px] z-30 rounded-full ${indicatorClass}`}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          exit={{ scaleX: 0, opacity: 0 }}
          transition={{ duration: 0.15 }}
        />
      )}

      {/* ── Draggable wrapper ── */}
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
          ${isThisDragged ? "z-50" : ""}
          ${isThisOver ? overBgClass : ""}
          ${isSelected ? "ring-2 ring-primary bg-primary/[0.03] border-primary/40 shadow-md" : "bg-card border-border"}
        `}
      >
        {/* ── Drag Handle ── */}
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

        {/* ── Item content ── */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </motion.div>
  );
}

// ─── Calendar Date Drop Zone Component ──────────────────────────────────────

export interface CalendarDateDropZoneProps {
  dateStr: string;
  posts: ContentPost[];
  overDate: string | null;
  draggedPostId: string | null;
  isDragging: boolean;
  children?: ReactNode;
  className?: string;
}

/**
 * A wrapper for each calendar date cell that acts as a drop target during
 * drag mode.  Shows platform-aware highlighted border when hovered during a
 * drag operation.
 */
export function CalendarDateDropZone({
  dateStr,
  posts,
  overDate,
  draggedPostId,
  isDragging,
  children,
  className = "",
}: CalendarDateDropZoneProps): JSX.Element {
  const isOverThis = isDragging && overDate === dateStr;
  const hasPosts = posts.length > 0;
  const isDraggedPostInThisDate = hasPosts && posts.some((p) => p.id === draggedPostId);

  // Determine platform color for the drop highlight
  const primaryPlatform = posts?.[0]?.platform || "wechat";
  const borderHighlight =
    primaryPlatform === "xiaohongshu"
      ? "border-rose-400 dark:border-rose-500 ring-rose-200 dark:ring-rose-800"
      : "border-green-400 dark:border-green-500 ring-green-200 dark:ring-green-800";

  return (
    <div
      className={`
        rounded-lg transition-all duration-200 p-0.5
        ${isOverThis && !isDraggedPostInThisDate ? `border-2 ${borderHighlight} ring-2` : "border-2 border-transparent"}
        ${isOverThis && !isDraggedPostInThisDate ? "bg-primary/[0.04] dark:bg-primary/[0.08] scale-[1.02]" : ""}
        ${className}
      `}
    >
      {children}
      {/* Drop zone placeholder when hovering and this date has no posts */}
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
    </div>
  );
}
