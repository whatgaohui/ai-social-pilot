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
import { ArrowDown, Loader2, CheckCircle2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────

export interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  /** Pull distance threshold to trigger refresh (px) */
  pullThreshold?: number;
  /** Max pull distance (px) */
  maxPullDistance?: number;
  className?: string;
  /** Whether the component is inside a scroll container */
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

type RefreshState = "idle" | "pulling" | "ready" | "refreshing" | "success";

// ─── Component ────────────────────────────────────────────────────────────

export function PullToRefresh({
  children,
  onRefresh,
  pullThreshold = 60,
  maxPullDistance = 120,
  className = "",
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<RefreshState>("idle");
  const [pullDistance, setPullDistance] = useState(0);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  const reset = useCallback(() => {
    setPullDistance(0);
    setState("idle");
    isPullingRef.current = false;
  }, []);

  const handleTouchStart = useCallback((e: ReactTouchEvent) => {
    const scrollTop = containerRef.current?.scrollTop ?? 0;
    // Only pull when at the very top
    if (scrollTop <= 0) {
      isPullingRef.current = true;
      startYRef.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: ReactTouchEvent) => {
      if (!isPullingRef.current || isRefreshingRef.current) return;

      const scrollTop = containerRef.current?.scrollTop ?? 0;
      if (scrollTop > 0) {
        isPullingRef.current = false;
        setPullDistance(0);
        setState("idle");
        return;
      }

      const delta = e.touches[0].clientY - startYRef.current;

      if (delta <= 0) {
        setPullDistance(0);
        setState("idle");
        return;
      }

      // Rubber band effect: slow down past max
      const clampedDelta = delta > maxPullDistance
        ? maxPullDistance + (delta - maxPullDistance) * 0.15
        : delta;

      setPullDistance(clampedDelta);
      setState(clampedDelta >= pullThreshold ? "ready" : "pulling");
    },
    [maxPullDistance, pullThreshold],
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;

    if (pullDistance >= pullThreshold && !isRefreshingRef.current) {
      isRefreshingRef.current = true;
      setState("refreshing");
      setPullDistance(pullThreshold);

      try {
        await onRefresh();
        setState("success");
        successTimerRef.current = setTimeout(() => {
          isRefreshingRef.current = false;
          reset();
        }, 800);
      } catch {
        isRefreshingRef.current = false;
        reset();
      }
    } else {
      reset();
    }
  }, [pullDistance, pullThreshold, onRefresh, reset]);

  const pullProgress = Math.min(pullDistance / pullThreshold, 1);
  const indicatorHeight = Math.min(pullDistance, pullThreshold + 10);

  return (
    <div
      ref={containerRef}
      className={`pull-refresh relative overflow-y-auto overscroll-contain smooth-scroll ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="pull-refresh-indicator flex items-center justify-center overflow-hidden transition-none"
        style={{ height: indicatorHeight }}
      >
        <div className="flex flex-col items-center gap-1">
          <AnimatePresence mode="wait">
            {state === "pulling" && (
              <motion.div
                key="pulling"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <motion.div
                  animate={{ rotate: pullProgress * 180 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  <ArrowDown className="h-4 w-4 text-muted-foreground" />
                </motion.div>
              </motion.div>
            )}

            {state === "ready" && (
              <motion.div
                key="ready"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <ArrowDown className="h-4 w-4 text-primary rotate-180" />
              </motion.div>
            )}

            {state === "refreshing" && (
              <motion.div
                key="refreshing"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
              </motion.div>
            )}

            {state === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </motion.div>
            )}
          </AnimatePresence>

          {(state === "pulling" || state === "ready" || state === "refreshing" || state === "success") && (
            <motion.span
              key={state}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-[10px] text-muted-foreground font-medium"
            >
              {state === "pulling" && "下拉刷新"}
              {state === "ready" && "释放刷新"}
              {state === "refreshing" && "刷新中..."}
              {state === "success" && "刷新完成"}
            </motion.span>
          )}
        </div>
      </div>

      {/* Main content */}
      <motion.div
        animate={{ opacity: state === "refreshing" ? 0.6 : 1 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
