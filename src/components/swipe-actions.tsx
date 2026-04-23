"use client";

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────

export interface SwipeActionItem {
  key: string;
  icon: LucideIcon;
  label: string;
  color?: string;
  bgColor?: string;
  onClick: () => void;
}

export interface SwipeActionsProps {
  children: ReactNode;
  /** Actions revealed on LEFT swipe (swipe content left) */
  leftActions?: SwipeActionItem[];
  /** Actions revealed on RIGHT swipe (swipe content right) */
  rightActions?: SwipeActionItem[];
  /** Threshold (0-1) of swipe width to auto-reveal */
  threshold?: number;
  /** Width of revealed action area per item (px) */
  actionWidth?: number;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────

export function SwipeActions({
  children,
  leftActions = [],
  rightActions = [],
  threshold = 0.3,
  actionWidth = 64,
  className = "",
}: SwipeActionsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftOffset, setLeftOffset] = useState(0);
  const [isRevealed, setIsRevealed] = useState<"left" | "right" | null>(null);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const isRevealedRef = useRef<"left" | "right" | null>(null);

  // Keep refs in sync
  useEffect(() => {
    isRevealedRef.current = isRevealed;
  }, [isRevealed]);

  const leftTotalWidth = leftActions.length * actionWidth;
  const rightTotalWidth = rightActions.length * actionWidth;
  const totalWidth = leftTotalWidth + rightTotalWidth;

  const reset = useCallback(() => {
    setLeftOffset(0);
    setIsRevealed(null);
    isDraggingRef.current = false;
  }, []);

  const handleStart = useCallback((clientX: number) => {
    isDraggingRef.current = true;
    startXRef.current = clientX;
    currentXRef.current = 0;
  }, []);

  const handleMove = useCallback(
    (clientX: number) => {
      if (!isDraggingRef.current) return;
      const delta = clientX - startXRef.current;
      currentXRef.current = delta;

      // Calculate offset: positive = swipe right (show left actions), negative = swipe left (show right actions)
      let newOffset = delta;

      if (isRevealedRef.current === "left") {
        newOffset = delta + leftTotalWidth;
      } else if (isRevealedRef.current === "right") {
        newOffset = delta - rightTotalWidth;
      }

      // Apply boundaries with rubber-band effect
      if (newOffset > 0) {
        newOffset = newOffset > leftTotalWidth + 20
          ? leftTotalWidth + 20 + (newOffset - leftTotalWidth - 20) * 0.2
          : newOffset;
      } else if (newOffset < 0) {
        newOffset = newOffset < -(rightTotalWidth + 20)
          ? -(rightTotalWidth + 20) + (newOffset + rightTotalWidth + 20) * 0.2
          : newOffset;
      }

      setLeftOffset(newOffset);
    },
    [leftTotalWidth, rightTotalWidth],
  );

  const handleEnd = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const delta = currentXRef.current;
    const absDelta = Math.abs(delta);
    const pct = totalWidth > 0 ? absDelta / totalWidth : 0;
    const revealed = isRevealedRef.current;

    if (delta > 0 && leftActions.length > 0) {
      if (pct > threshold || (revealed === "left" && absDelta < 10)) {
        setLeftOffset(leftTotalWidth);
        setIsRevealed("left");
      } else {
        reset();
      }
    } else if (delta < 0 && rightActions.length > 0) {
      if (pct > threshold || (revealed === "right" && absDelta < 10)) {
        setLeftOffset(-rightTotalWidth);
        setIsRevealed("right");
      } else {
        reset();
      }
    } else {
      reset();
    }
  }, [leftActions.length, rightActions.length, threshold, totalWidth, leftTotalWidth, rightTotalWidth, reset]);

  const handleActionClick = useCallback(
    (action: SwipeActionItem) => {
      action.onClick();
      reset();
    },
    [reset],
  );

  const onPointerDown = useCallback(
    (e: ReactTouchEvent) => {
      handleStart(e.touches[0].clientX);
    },
    [handleStart],
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      handleStart(e.clientX);
    },
    [handleStart],
  );

  return (
    <div
      ref={containerRef}
      className={`swipe-actions relative overflow-hidden ${className}`}
    >
      {/* Left Actions (behind, revealed by swiping right) */}
      <div
        className="absolute inset-y-0 left-0 flex z-0"
        style={{ width: leftTotalWidth }}
      >
        {leftActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.key}
              onClick={() => handleActionClick(action)}
              className="swipe-action-btn flex-1 flex flex-col items-center justify-center gap-0.5 tap-target"
              style={{
                backgroundColor: action.bgColor || "hsl(var(--primary))",
                color: action.color || "white",
              }}
              aria-label={action.label}
            >
              <Icon className="h-4 w-4" />
              <span className="text-[9px] font-medium leading-none">{action.label}</span>
            </button>
          );
        })}
      </div>

      {/* Right Actions (behind, revealed by swiping left) */}
      <div
        className="absolute inset-y-0 right-0 flex z-0 flex-row-reverse"
        style={{ width: rightTotalWidth }}
      >
        {rightActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.key}
              onClick={() => handleActionClick(action)}
              className="swipe-action-btn flex-1 flex flex-col items-center justify-center gap-0.5 tap-target"
              style={{
                backgroundColor: action.bgColor || "hsl(var(--primary))",
                color: action.color || "white",
              }}
              aria-label={action.label}
            >
              <Icon className="h-4 w-4" />
              <span className="text-[9px] font-medium leading-none">{action.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <motion.div
        animate={{ x: leftOffset }}
        transition={{ type: "spring", stiffness: 500, damping: 40 }}
        className="relative z-10 bg-background"
        style={{ touchAction: "pan-y" }}
        onTouchStart={onPointerDown}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
        onMouseDown={onMouseDown}
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseUp={handleEnd}
        onMouseLeave={() => {
          if (isDraggingRef.current) handleEnd();
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
