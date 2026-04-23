"use client";

import React, { useState, useEffect, useRef, type HTMLAttributes } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════════════
// OnlineStatusDot
// ═══════════════════════════════════════════════════════════════════════════════

type OnlineStatus = "online" | "offline" | "busy" | "away";

interface OnlineStatusDotProps extends HTMLAttributes<HTMLSpanElement> {
  status?: OnlineStatus;
  /** Dot size in pixels (default: 8) */
  size?: number;
  /** Show text label (default: false) */
  showLabel?: boolean;
  className?: string;
}

const statusConfig: Record<OnlineStatus, { color: string; label: string; pulseColor: string }> = {
  online: { color: "#22c55e", label: "在线", pulseColor: "rgba(34, 197, 94, 0.4)" },
  offline: { color: "#9ca3af", label: "离线", pulseColor: "rgba(156, 163, 175, 0.3)" },
  busy: { color: "#ef4444", label: "忙碌", pulseColor: "rgba(239, 68, 68, 0.4)" },
  away: { color: "#f59e0b", label: "离开", pulseColor: "rgba(245, 158, 11, 0.4)" },
};

/**
 * OnlineStatusDot — Status indicator with pulse animation.
 *
 * @example
 * ```tsx
 * <OnlineStatusDot status="online" showLabel />
 * <OnlineStatusDot status="busy" size={10} />
 * ```
 */
export function OnlineStatusDot({
  status = "online",
  size = 8,
  showLabel = false,
  className,
  ...props
}: OnlineStatusDotProps) {
  const config = statusConfig[status];
  const showPulse = status === "online" || status === "busy";

  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      {...props}
      role="status"
      aria-label={config.label}
    >
      <span className="relative inline-flex" style={{ width: size, height: size }}>
        {/* Pulse ring */}
        {showPulse && (
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: config.pulseColor }}
            animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        {/* Core dot */}
        <span
          className="relative rounded-full"
          style={{
            width: size,
            height: size,
            backgroundColor: config.color,
            boxShadow: `0 0 6px ${config.color}`,
          }}
        />
      </span>
      {showLabel && (
        <span className="text-xs text-muted-foreground">{config.label}</span>
      )}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SyncStatusIndicator
// ═══════════════════════════════════════════════════════════════════════════════

type SyncStatus = "syncing" | "synced" | "error" | "idle";

interface SyncStatusIndicatorProps extends HTMLAttributes<HTMLDivElement> {
  status?: SyncStatus;
  /** Status text label */
  label?: string;
  className?: string;
}

/**
 * SyncStatusIndicator — Cloud sync animation with rotating arrows, check, or error.
 *
 * @example
 * ```tsx
 * <SyncStatusIndicator status="syncing" label="同步中..." />
 * <SyncStatusIndicator status="synced" label="已同步" />
 * ```
 */
export function SyncStatusIndicator({
  status = "idle",
  label,
  className,
  ...props
}: SyncStatusIndicatorProps) {
  return (
    <div className={cn("inline-flex items-center gap-2", className)} {...props} role="status">
      <span className="relative flex h-4 w-4 items-center justify-center">
        <AnimatePresence mode="wait">
          {status === "syncing" && (
            <motion.svg
              key="syncing"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              initial={{ rotate: 0, opacity: 0 }}
              animate={{ rotate: 360, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ rotate: { duration: 1.5, repeat: Infinity, ease: "linear" }, opacity: { duration: 0.2 } }}
              className="text-violet-500"
            >
              <path
                d="M13.65 2.35A8 8 0 1 0 15 8h-2a6 6 0 1 1-1.76-4.24L10 5h5V0l-1.35 2.35z"
                fill="currentColor"
              />
            </motion.svg>
          )}
          {status === "synced" && (
            <motion.svg
              key="synced"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="text-emerald-500"
            >
              <circle cx="8" cy="8" r="7" fill="currentColor" opacity="0.15" />
              <path
                d="M5.5 8.5L7 10l3.5-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.svg>
          )}
          {status === "error" && (
            <motion.svg
              key="error"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              initial={{ x: 0 }}
              animate={{ x: [0, -3, 3, -2, 2, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="text-destructive"
            >
              <circle cx="8" cy="8" r="7" fill="currentColor" opacity="0.15" />
              <path
                d="M8 5v3M8 10.5v.01"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </motion.svg>
          )}
          {status === "idle" && (
            <motion.svg
              key="idle"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              className="text-muted-foreground"
            >
              <path
                d="M14 1v7.5A5.5 5.5 0 1 1 7.5 3H12L9 0l1.5-1.5L14 1z"
                fill="currentColor"
                opacity="0.5"
                transform="translate(-2, 3) scale(0.85)"
              />
            </motion.svg>
          )}
        </AnimatePresence>
      </span>
      {label && (
        <span className="text-xs text-muted-foreground">{label}</span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LoadingStatus — Multi-step loading indicator
// ═══════════════════════════════════════════════════════════════════════════════

type StepState = "pending" | "active" | "completed" | "error";

interface Step {
  label: string;
  state?: StepState;
}

interface LoadingStatusProps extends HTMLAttributes<HTMLDivElement> {
  steps: Step[];
  /** Current active step index (auto-sets state) */
  activeStep?: number;
  className?: string;
}

/**
 * LoadingStatus — Multi-step loading indicator with progress line.
 *
 * @example
 * ```tsx
 * <LoadingStatus steps={[
 *   { label: "分析内容", state: "completed" },
 *   { label: "生成文案", state: "active" },
 *   { label: "优化排版", state: "pending" },
 * ]} />
 * ```
 */
export function LoadingStatus({
  steps,
  activeStep,
  className,
  ...props
}: LoadingStatusProps) {
  const resolvedSteps = steps.map((step, i) => {
    if (step.state) return { ...step, state: step.state };
    if (activeStep !== undefined) {
      if (i < activeStep) return { ...step, state: "completed" as StepState };
      if (i === activeStep) return { ...step, state: "active" as StepState };
      return { ...step, state: "pending" as StepState };
    }
    return { ...step, state: step.state ?? ("pending" as StepState) };
  });

  return (
    <div className={cn("flex flex-col gap-1", className)} {...props} role="progressbar">
      <div className="flex items-center gap-0">
        {resolvedSteps.map((step, i) => (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center gap-1 min-w-0">
              <div
                className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium transition-all duration-300",
                  step.state === "completed" && "bg-emerald-500 text-white",
                  step.state === "active" && "bg-violet-500 text-white",
                  step.state === "error" && "bg-destructive text-white",
                  step.state === "pending" && "bg-muted text-muted-foreground",
                )}
              >
                <AnimatePresence mode="wait">
                  {step.state === "completed" && (
                    <motion.span
                      key="check"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      ✓
                    </motion.span>
                  )}
                  {step.state === "active" && (
                    <motion.span
                      key="spinner"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, rotate: 360 }}
                      transition={{ rotate: { duration: 1, repeat: Infinity, ease: "linear" } }}
                    >
                      ◌
                    </motion.span>
                  )}
                  {step.state === "error" && (
                    <motion.span
                      key="err"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      !
                    </motion.span>
                  )}
                  {step.state === "pending" && (
                    <motion.span
                      key="num"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.5 }}
                    >
                      {i + 1}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <span
                className={cn(
                  "text-[10px] text-center max-w-[60px] truncate transition-colors duration-300",
                  step.state === "active" ? "text-violet-600 dark:text-violet-400 font-medium" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
            {i < resolvedSteps.length - 1 && (
              <div className="flex-1 mx-1 mb-4">
                <div className="h-[2px] bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: "0%" }}
                    animate={{
                      width:
                        step.state === "completed"
                          ? "100%"
                          : step.state === "active"
                            ? "50%"
                            : "0%",
                      backgroundColor:
                        step.state === "completed"
                          ? "#22c55e"
                          : step.state === "active"
                            ? "#8b5cf6"
                            : "transparent",
                    }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HealthStatus
// ═══════════════════════════════════════════════════════════════════════════════

type HealthLevel = "good" | "warning" | "error" | "info";

interface HealthStatusProps extends HTMLAttributes<HTMLDivElement> {
  level?: HealthLevel;
  /** Message to display */
  message?: string;
  /** Optional icon element */
  icon?: React.ReactNode;
  className?: string;
}

const healthConfig: Record<HealthLevel, { bg: string; border: string; text: string; icon: string }> = {
  good: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800/40",
    text: "text-emerald-700 dark:text-emerald-400",
    icon: "✓",
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800/40",
    text: "text-amber-700 dark:text-amber-400",
    icon: "⚠",
  },
  error: {
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800/40",
    text: "text-red-700 dark:text-red-400",
    icon: "✕",
  },
  info: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800/40",
    text: "text-blue-700 dark:text-blue-400",
    icon: "ℹ",
  },
};

/**
 * HealthStatus — Color-coded status bar with icon and message.
 * Smooth color transitions between states.
 *
 * @example
 * ```tsx
 * <HealthStatus level="good" message="所有系统运行正常" />
 * <HealthStatus level="warning" message="内容质量需要关注" icon={<AlertTriangle />} />
 * ```
 */
export function HealthStatus({
  level = "good",
  message,
  icon,
  className,
  ...props
}: HealthStatusProps) {
  const config = healthConfig[level];

  return (
    <motion.div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors duration-300",
        config.bg,
        config.border,
        config.text,
        className,
      )}
      layout
      transition={{ duration: 0.3 }}
      {...props}
      role="alert"
    >
      <span className="flex-shrink-0 text-base">
        {icon ?? config.icon}
      </span>
      {message && <span>{message}</span>}
    </motion.div>
  );
}

export { type OnlineStatus, type SyncStatus, type StepState, type HealthLevel };
