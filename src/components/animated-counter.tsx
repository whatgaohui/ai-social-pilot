"use client";

import React, { useEffect, useRef, useState, useCallback, type RefObject } from "react";
import { motion, useMotionValue, useTransform, animate, useInView } from "framer-motion";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════════════
// useAnimatedCounter Hook
// ═══════════════════════════════════════════════════════════════════════════════

type EasingType = "spring" | "easeOut" | "linear";

interface UseAnimatedCounterOptions {
  /** Target value */
  to: number;
  /** Starting value (default: 0) */
  from?: number;
  /** Duration in seconds (default: 1) */
  duration?: number;
  /** Animation easing (default: "spring") */
  easing?: EasingType;
  /** Delay before animation starts in seconds (default: 0) */
  delay?: number;
  /** Whether to trigger on intersection (default: false) */
  triggerOnView?: boolean;
}

/**
 * useAnimatedCounter — Reusable hook for animated number counting.
 * Uses framer-motion's useMotionValue for 60fps performance.
 *
 * @example
 * ```tsx
 * const { ref, value } = useAnimatedCounter({ to: 1283, easing: "spring", triggerOnView: true });
 * return <span ref={ref}>{value}</span>;
 * ```
 */
export function useAnimatedCounter(options: UseAnimatedCounterOptions): {
  ref: RefObject<HTMLSpanElement | null>;
  value: string;
  start: () => void;
} {
  const { to, from = 0, duration = 1, easing = "spring", delay = 0, triggerOnView = false } = options;
  const ref = useRef<HTMLSpanElement | null>(null);
  const motionVal = useMotionValue(from);
  const [displayText, setDisplayText] = useState(String(from));
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const hasStarted = useRef(false);

  const start = useCallback(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const animConfig =
      easing === "spring"
        ? { type: "spring" as const, stiffness: 100, damping: 20 }
        : easing === "easeOut"
          ? { duration, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }
          : { duration, ease: "linear" as const };

    const controls = animate(motionVal, to, {
      ...animConfig,
      delay,
    });

    return () => controls.stop();
  }, [motionVal, to, duration, easing, delay]);

  useEffect(() => {
    if (triggerOnView && isInView) {
      start();
    } else if (!triggerOnView) {
      start();
    }
  }, [isInView, start, triggerOnView]);

  useEffect(() => {
    const unsubscribe = motionVal.on("change", (v) => {
      setDisplayText(String(Math.round(v)));
    });
    return () => unsubscribe();
  }, [motionVal]);

  return { ref, value: displayText, start };
}

// ═══════════════════════════════════════════════════════════════════════════════
// NumberCounter
// ═══════════════════════════════════════════════════════════════════════════════

interface NumberCounterProps {
  /** Target number */
  value: number;
  /** Starting number (default: 0) */
  from?: number;
  /** Animation duration in seconds (default: 1) */
  duration?: number;
  /** Text before the number (e.g. "¥") */
  prefix?: string;
  /** Text after the number (e.g. "%") */
  suffix?: string;
  /** Number of decimal places (default: 0) */
  decimals?: number;
  /** Thousands separator (default: ",") */
  separator?: string;
  /** Easing type (default: "spring") */
  easing?: EasingType;
  /** Trigger animation when visible (default: true) */
  triggerOnView?: boolean;
  className?: string;
}

function formatNumberWithSeparator(n: number, decimals: number, separator: string): string {
  const parts = n.toFixed(decimals).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  return parts.join(".");
}

/**
 * NumberCounter — Animated number counting with spring physics.
 *
 * @example
 * ```tsx
 * <NumberCounter value={1283} prefix="¥" separator="," />
 * <NumberCounter value={87.5} decimals={1} suffix="%" easing="easeOut" />
 * ```
 */
export function NumberCounter({
  value,
  from = 0,
  duration = 1,
  prefix = "",
  suffix = "",
  decimals = 0,
  separator = ",",
  easing = "spring",
  triggerOnView = true,
  className,
}: NumberCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionVal = useMotionValue(from);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const display = useTransform(motionVal, (v) =>
    `${prefix}${formatNumberWithSeparator(v, decimals, separator)}${suffix}`,
  );
  const spanRef = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const shouldStart = triggerOnView ? isInView : true;
    if (!shouldStart || hasAnimated.current) return;
    hasAnimated.current = true;

    const animConfig =
      easing === "spring"
        ? { type: "spring" as const, stiffness: 100, damping: 20 }
        : easing === "easeOut"
          ? { duration, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }
          : { duration, ease: "linear" as const };

    const controls = animate(motionVal, value, animConfig);
    return () => controls.stop();
  }, [motionVal, value, duration, easing, isInView, triggerOnView]);

  useEffect(() => {
    const unsubscribe = display.on("change", (v) => {
      if (spanRef.current) spanRef.current.textContent = v;
    });
    return () => unsubscribe();
  }, [display]);

  return (
    <span
      ref={(node) => {
        (ref as React.MutableRefObject<HTMLSpanElement | null>).current = node;
        (spanRef as React.MutableRefObject<HTMLSpanElement | null>).current = node;
      }}
      className={cn("tabular-nums", className)}
      aria-label={`${prefix}${formatNumberWithSeparator(value, decimals, separator)}${suffix}`}
    >
      {formatNumberWithSeparator(from, decimals, separator)}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PercentageCounter — 0-100% with circular progress
// ═══════════════════════════════════════════════════════════════════════════════

interface PercentageCounterProps {
  /** Percentage value 0-100 */
  value: number;
  /** Size in pixels (default: 80) */
  size?: number;
  /** Stroke width (default: 6) */
  strokeWidth?: number;
  /** Track color */
  trackColor?: string;
  /** Progress color */
  progressColor?: string;
  /** Label text inside circle */
  label?: string;
  /** Animation duration in seconds (default: 1.5) */
  duration?: number;
  className?: string;
}

/**
 * PercentageCounter — Circular progress with animated percentage.
 *
 * @example
 * ```tsx
 * <PercentageCounter value={87} progressColor="#8b5cf6" />
 * ```
 */
export function PercentageCounter({
  value,
  size = 80,
  strokeWidth = 6,
  trackColor = "rgba(0,0,0,0.06)",
  progressColor = "#8b5cf6",
  label,
  duration = 1.5,
  className,
}: PercentageCounterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [displayedPercent, setDisplayedPercent] = useState(0);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayedPercent / 100) * circumference;

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(0, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplayedPercent(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, duration, isInView]);

  return (
    <div ref={ref} className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-semibold tabular-nums">{displayedPercent}%</span>
        {label && <span className="text-[10px] text-muted-foreground">{label}</span>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TimeCounter — Animated time display (counting up)
// ═══════════════════════════════════════════════════════════════════════════════

interface TimeCounterProps {
  /** Starting time in seconds (default: 0) */
  startTime?: number;
  /** Whether to start counting immediately (default: false) */
  running?: boolean;
  /** Format: "mm:ss" | "hh:mm:ss" | "seconds" (default: "mm:ss") */
  format?: "mm:ss" | "hh:mm:ss" | "seconds";
  className?: string;
}

function formatTime(totalSeconds: number, format: "mm:ss" | "hh:mm:ss" | "seconds"): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const pad = (n: number) => String(n).padStart(2, "0");

  switch (format) {
    case "hh:mm:ss":
      return `${pad(h)}:${pad(m)}:${pad(s)}`;
    case "seconds":
      return String(totalSeconds);
    default:
      return `${pad(m)}:${pad(s)}`;
  }
}

/**
 * TimeCounter — Animated counting time display.
 *
 * @example
 * ```tsx
 * <TimeCounter running format="mm:ss" />
 * ```
 */
export function TimeCounter({
  startTime = 0,
  running = false,
  format = "mm:ss",
  className,
}: TimeCounterProps) {
  const [elapsed, setElapsed] = useState(startTime);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [running]);

  return (
    <span className={cn("tabular-nums font-mono", className)}>
      {formatTime(elapsed, format)}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CurrencyCounter — Number with currency formatting
// ═══════════════════════════════════════════════════════════════════════════════

interface CurrencyCounterProps {
  /** Target amount */
  value: number;
  /** Currency symbol (default: "¥") */
  symbol?: string;
  /** Currency code position: "before" | "after" (default: "before") */
  position?: "before" | "after";
  /** Number of decimal places (default: 2) */
  decimals?: number;
  /** Animation duration (default: 1) */
  duration?: number;
  /** Trigger on intersection (default: true) */
  triggerOnView?: boolean;
  className?: string;
}

/**
 * CurrencyCounter — Animated number with currency formatting.
 *
 * @example
 * ```tsx
 * <CurrencyCounter value={128300} symbol="¥" />
 * <CurrencyCounter value={99.99} symbol="$" decimals={2} />
 * ```
 */
export function CurrencyCounter({
  value,
  symbol = "¥",
  position = "before",
  decimals = 2,
  duration = 1,
  triggerOnView = true,
  className,
}: CurrencyCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionVal = useMotionValue(0);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const display = useTransform(motionVal, (v) => {
    const formatted = v.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return position === "before" ? `${symbol}${formatted}` : `${formatted}${symbol}`;
  });
  const spanRef = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const shouldStart = triggerOnView ? isInView : true;
    if (!shouldStart || hasAnimated.current) return;
    hasAnimated.current = true;

    const controls = animate(motionVal, value, {
      type: "spring",
      stiffness: 80,
      damping: 20,
      duration,
    });
    return () => controls.stop();
  }, [motionVal, value, duration, isInView, triggerOnView]);

  useEffect(() => {
    const unsubscribe = display.on("change", (v) => {
      if (spanRef.current) spanRef.current.textContent = v;
    });
    return () => unsubscribe();
  }, [display]);

  const initialText = position === "before" ? `${symbol}${(0).toFixed(decimals)}` : `${(0).toFixed(decimals)}${symbol}`;

  return (
    <span
      ref={(node) => {
        (ref as React.MutableRefObject<HTMLSpanElement | null>).current = node;
        (spanRef as React.MutableRefObject<HTMLSpanElement | null>).current = node;
      }}
      className={cn("tabular-nums", className)}
      aria-label={`${symbol}${value.toFixed(decimals)}`}
    >
      {initialText}
    </span>
  );
}

export { type EasingType };
