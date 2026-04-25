"use client";

import React from "react";
import { cn } from "@/lib/utils";

// ─── Spinner Component ──────────────────────────────────────────────────────

type SpinnerSize = "sm" | "md" | "lg";
type SpinnerColor = "violet" | "emerald" | "amber" | "rose" | "cyan" | "foreground";

interface SpinnerProps {
  size?: SpinnerSize;
  color?: SpinnerColor;
  className?: string;
  label?: string;
}

const SIZE_MAP: Record<SpinnerSize, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-10 w-10 border-[3px]",
};

const COLOR_MAP: Record<SpinnerColor, string> = {
  violet: "border-violet-500/30 border-t-violet-500",
  emerald: "border-emerald-500/30 border-t-emerald-500",
  amber: "border-amber-500/30 border-t-amber-500",
  rose: "border-rose-500/30 border-t-rose-500",
  cyan: "border-cyan-500/30 border-t-cyan-500",
  foreground: "border-muted-foreground/30 border-t-foreground",
};

export function Spinner({
  size = "md",
  color = "violet",
  className,
  label,
}: SpinnerProps) {
  return (
    <div className={cn("inline-flex items-center gap-2", className)} role="status">
      <div
        className={cn(
          "rounded-full animate-spin",
          SIZE_MAP[size],
          COLOR_MAP[color],
        )}
      />
      {label && (
        <span className="text-sm text-muted-foreground">{label}</span>
      )}
      <span className="sr-only">{label || "加载中"}</span>
    </div>
  );
}

// ─── Dots Indicator ─────────────────────────────────────────────────────────

interface DotsProps {
  count?: number;
  size?: "sm" | "md" | "lg";
  color?: string;
  className?: string;
  label?: string;
}

const DOTS_SIZE_MAP = {
  sm: "h-1.5 w-1.5",
  md: "h-2 w-2",
  lg: "h-3 w-3",
};

export function Dots({
  count = 3,
  size = "md",
  color = "bg-violet-500",
  className,
  label,
}: DotsProps) {
  return (
    <div className={cn("inline-flex items-center gap-1.5", className)} role="status">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "rounded-full typing-dot",
            `dot-bounce-${i + 1}`,
            DOTS_SIZE_MAP[size],
            color,
          )}
        />
      ))}
      {label && (
        <span className="text-sm text-muted-foreground ml-1">{label}</span>
      )}
      <span className="sr-only">{label || "加载中"}</span>
    </div>
  );
}

// ─── Progress Bar ───────────────────────────────────────────────────────────

interface ProgressBarProps {
  /** 0-100 for determinate, undefined for indeterminate */
  value?: number;
  size?: "sm" | "md" | "lg";
  color?: string;
  showPercentage?: boolean;
  label?: string;
  className?: string;
  animated?: boolean;
}

const PROGRESS_SIZE_MAP = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3",
};

export function ProgressBar({
  value,
  size = "md",
  color = "bg-violet-500",
  showPercentage = false,
  label,
  className,
  animated = true,
}: ProgressBarProps) {
  const isIndeterminate = value === undefined;
  const displayValue = Math.min(100, Math.max(0, value ?? 0));

  return (
    <div className={cn("w-full space-y-1", className)} role="progressbar" aria-valuenow={displayValue} aria-valuemin={0} aria-valuemax={100}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between">
          {label && <span className="text-xs text-muted-foreground">{label}</span>}
          {showPercentage && !isIndeterminate && (
            <span className="text-xs text-muted-foreground tabular-nums">{Math.round(displayValue)}%</span>
          )}
        </div>
      )}
      <div className={cn("w-full rounded-full bg-muted overflow-hidden", PROGRESS_SIZE_MAP[size])}>
        {isIndeterminate ? (
          <div
            className={cn(
              "h-full rounded-full",
              color,
              animated && "loading-bar-animated",
            )}
            style={animated ? {
              background: "linear-gradient(90deg, transparent 0%, #8b5cf6 50%, transparent 100%)",
              backgroundSize: "200% 100%",
              width: "40%",
            } : { width: "30%" }}
          />
        ) : (
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300 ease-out",
              color,
            )}
            style={{ width: `${displayValue}%` }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Pulse Loading (Content Placeholder) ────────────────────────────────────

interface PulseLoadingProps {
  lines?: number;
  className?: string;
}

export function PulseLoading({
  lines = 3,
  className,
}: PulseLoadingProps) {
  return (
    <div className={cn("space-y-2 pulse-content", className)} role="status">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 rounded bg-muted pulse-content-line"
          style={{
            width: i === lines - 1 ? "65%" : "100%",
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
      <span className="sr-only">加载中</span>
    </div>
  );
}

// ─── Typing Indicator (AI Response) ─────────────────────────────────────────

interface TypingIndicatorProps {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

const TYPING_SIZE_MAP = {
  sm: { dot: "h-1 w-1", gap: "gap-1" },
  md: { dot: "h-1.5 w-1.5", gap: "gap-1.5" },
  lg: { dot: "h-2 w-2", gap: "gap-2" },
};

export function TypingIndicator({
  size = "md",
  label,
  className,
}: TypingIndicatorProps) {
  const sizeConfig = TYPING_SIZE_MAP[size];

  return (
    <div className={cn("inline-flex items-center gap-2", className)} role="status" aria-label={label || "AI正在输入"}>
      <div className={cn("flex items-center p-1.5 rounded-2xl bg-muted/50", sizeConfig.gap)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "rounded-full bg-violet-400 typing-dot",
              `typing-dot-${i + 1}`,
              sizeConfig.dot,
            )}
          />
        ))}
      </div>
      {label && (
        <span className="text-xs text-muted-foreground">{label}</span>
      )}
      <span className="sr-only">{label || "AI正在输入"}</span>
    </div>
  );
}

// ─── Inline Loading Wrapper ─────────────────────────────────────────────────

interface InlineLoadingProps {
  isLoading: boolean;
  children: React.ReactNode;
  /** Type of inline loading indicator */
  type?: "spinner" | "dots" | "pulse" | "typing";
  /** Size for the indicator */
  size?: "sm" | "md" | "lg";
  /** Color for the indicator */
  color?: string;
  /** Label text */
  label?: string;
  /** Center the loading indicator */
  center?: boolean;
  className?: string;
}

export function InlineLoading({
  isLoading,
  children,
  type = "spinner",
  size = "md",
  color,
  label,
  center = false,
  className,
}: InlineLoadingProps) {
  if (!isLoading) return <>{children}</>;

  const indicator = (() => {
    switch (type) {
      case "spinner":
        return (
          <Spinner
            size={size}
            color={(color as SpinnerColor) || undefined}
            label={label}
          />
        );
      case "dots":
        return <Dots size={size} color={color} label={label} />;
      case "pulse":
        return <PulseLoading className={label ? undefined : undefined} />;
      case "typing":
        return <TypingIndicator size={size} label={label} />;
      default:
        return <Spinner size={size} label={label} />;
    }
  })();

  if (center) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        {indicator}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {indicator}
    </div>
  );
}
