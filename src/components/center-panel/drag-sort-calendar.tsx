"use client";

import React, { useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { motion } from "framer-motion";
import { GripVertical } from "lucide-react";

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
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * A generic, reusable drag-and-drop reordering hook built on the HTML5 Drag
 * and Drop API.  It manages `draggedIndex`, `overIndex`, and `dropPosition`
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

      // Determine whether the cursor is in the top or bottom half of the
      // target element so we can show the indicator line accordingly.
      const rect = e.currentTarget.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const pos: DropPosition = e.clientY < midY ? "before" : "after";

      setOverIndex(index);
      setDropPosition(pos);
    },
    [],
  );

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    // Only clear when the cursor truly leaves the element (not when entering a
    // child node).
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

      // Build a new array with the dragged element removed from its original
      // position and inserted at the target position.
      const items = itemsRef.current;
      const updated = [...items];
      const [removed] = updated.splice(from, 1);

      // Compute the correct insertion index after the splice above.
      const insertAt = from < index ? index - 1 : index;

      // If the drop position is "after", insert after the target index.
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

  /** Imperative reorder helper — swaps two items by index (useful for the
   *  "swap scheduledDate" pattern used in the content calendar). */
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

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * A wrapper component that adds drag-and-drop capability to any calendar list
 * item.  It renders a `GripVertical` drag handle, applies opacity / scale
 * transforms to the dragged item, and shows a coloured drop-indicator line
 * above or below the hovered target.
 *
 * Usage (inside a `.map()` loop):
 * ```tsx
 * const { dragHandlers, dragState, reorder } = useDragSort(posts, setPosts);
 *
 * {posts.map((post, i) => (
 *   <SortableItem key={post.id} index={i} dragHandlers={dragHandlers} dragState={dragState}>
 *     <PostCard post={post} />
 *   </SortableItem>
 * ))}
 * ```
 */
export function SortableItem({
  index,
  children,
  dragHandlers,
  dragState,
  className = "",
  onClick,
  isSelected = false,
}: SortableItemProps): ReactNode {
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
      // Prevent click firing right after a drag-end.
      didDragRef.current = false;
      return;
    }
    onClick?.();
  }, [onClick]);

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
        type: "spring",
        stiffness: 350,
        damping: 28,
      }}
      className={`relative ${className}`}
    >
      {/* ── Drop indicator line (above) ── */}
      {showLineAbove && (
        <motion.div
          layoutId="drop-indicator-top"
          className="absolute top-0 left-0 right-0 h-[3px] z-30 rounded-full bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500"
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
          className="absolute bottom-0 left-0 right-0 h-[3px] z-30 rounded-full bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500"
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
          ${isThisOver ? "bg-violet-50/50 dark:bg-violet-900/10 border-violet-300 dark:border-violet-700" : ""}
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
