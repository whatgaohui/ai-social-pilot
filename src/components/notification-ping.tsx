"use client";

import React from "react";
import { cn } from "@/lib/utils";

/* ─── 通知铃铛视觉 Ping 效果 ─── */

interface NotificationPingProps {
  /** 默认 violet，可选 amber / rose / emerald */
  color?: "violet" | "amber" | "rose" | "emerald";
  /** 额外 CSS 类名 */
  className?: string;
}

const PING_COLORS = {
  violet: {
    ring: "border-violet-400",
    dot: "bg-violet-500",
  },
  amber: {
    ring: "border-amber-400",
    dot: "bg-amber-500",
  },
  rose: {
    ring: "border-rose-400",
    dot: "bg-rose-500",
  },
  emerald: {
    ring: "border-emerald-400",
    dot: "bg-emerald-500",
  },
} as const;

export function NotificationPing({ color = "violet", className }: NotificationPingProps) {
  const colors = PING_COLORS[color];

  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center",
        className
      )}
    >
      {/* 扩散外环 */}
      <span
        className={cn(
          "absolute inline-flex h-full w-full rounded-full border-2 opacity-75 animate-ping",
          colors.ring
        )}
        aria-hidden="true"
      />
      {/* 中心小点 */}
      <span
        className={cn(
          "relative inline-flex h-2 w-2 rounded-full",
          colors.dot
        )}
        aria-hidden="true"
      />
    </span>
  );
}
