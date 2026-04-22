"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface AILoadingSkeletonProps {
  /** Optional message override, defaults to "AI 思考中..." */
  message?: string;
  /** Optional additional class names */
  className?: string;
  /** Show shimmer bar, defaults to true */
  shimmer?: boolean;
}

/**
 * A compact, reusable loading skeleton for AI operations.
 * Features:
 * - 3 animated typing dots
 * - "AI 思考中..." text (customizable)
 * - A progress-like shimmer bar
 * - Compact size for embedding in cards and panels
 */
export function AILoadingSkeleton({
  message = "AI 思考中...",
  className,
  shimmer = true,
}: AILoadingSkeletonProps) {
  return (
    <div className={cn("flex flex-col gap-2 py-1", className)}>
      {/* Typing indicator row: icon + dots + text */}
      <div className="flex items-center gap-2">
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="shrink-0"
        >
          <Sparkles className="h-3.5 w-3.5 text-violet-500" />
        </motion.div>

        {/* Three bouncing dots */}
        <div className="flex items-center gap-0.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-violet-500"
              animate={{ y: [0, -4, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.15,
              }}
            />
          ))}
        </div>

        <span className="text-xs text-muted-foreground font-medium">
          {message}
        </span>
      </div>

      {/* Shimmer progress bar */}
      {shimmer && (
        <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full w-1/3 rounded-full bg-gradient-to-r from-violet-500/0 via-violet-500/80 to-violet-500/0"
            animate={{ x: ["-100%", "400%"] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>
      )}
    </div>
  );
}
