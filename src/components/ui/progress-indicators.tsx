"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════════════
// CircularProgress — SVG circular progress bar
// ═══════════════════════════════════════════════════════════════════════════════

export interface CircularProgressProps {
  /** Progress value 0-100 */
  value: number;
  /** SVG size in pixels */
  size?: number;
  /** Stroke width in pixels */
  strokeWidth?: number;
  /** Track stroke color */
  trackColor?: string;
  /** Progress stroke color (or gradient start) */
  color?: string;
  /** Gradient end color (if different from start) */
  colorEnd?: string;
  /** Show percentage text in center */
  showLabel?: boolean;
  /** Custom label render */
  label?: React.ReactNode;
  /** Animation duration in seconds */
  animationDuration?: number;
  /** Additional class name */
  className?: string;
}

export function CircularProgress({
  value,
  size = 80,
  strokeWidth = 6,
  trackColor,
  color = "#8b5cf6",
  colorEnd,
  showLabel = true,
  label,
  animationDuration = 1,
  className,
}: CircularProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference;
  const center = size / 2;

  const gradientId = React.useId();

  const defaultTrackColor =
    typeof trackColor === "string"
      ? trackColor
      : "var(--muted, oklch(0.97 0 0))";

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <motion.svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-label={`${clampedValue}%`}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <defs>
          <linearGradient
            id={gradientId}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor={color} />
            {colorEnd && <stop offset="100%" stopColor={colorEnd} />}
          </linearGradient>
        </defs>

        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={defaultTrackColor}
          strokeWidth={strokeWidth}
          className="dark:opacity-20"
        />

        {/* Progress arc */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={colorEnd ? `url(#${gradientId})` : color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{
            duration: animationDuration,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      </motion.svg>

      {/* Center label */}
      {(showLabel || label) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-foreground tabular-nums">
            {label ?? `${Math.round(clampedValue)}%`}
          </span>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LinearProgress — Linear progress bar
// ═══════════════════════════════════════════════════════════════════════════════

export interface LinearProgressProps {
  /** Progress value 0-100 */
  value: number;
  /** Bar height in pixels */
  height?: number;
  /** Track color */
  trackColor?: string;
  /** Progress bar color */
  color?: string;
  /** Gradient end color */
  colorEnd?: string;
  /** Segmented mode — divides bar into N equal segments */
  segments?: number;
  /** Show percentage label */
  showLabel?: boolean;
  /** Animation duration in seconds */
  animationDuration?: number;
  /** Rounded bar ends */
  rounded?: boolean;
  /** Additional class name */
  className?: string;
}

export function LinearProgress({
  value,
  height = 8,
  trackColor,
  color = "#8b5cf6",
  colorEnd,
  segments,
  showLabel = false,
  animationDuration = 0.8,
  rounded = true,
  className,
}: LinearProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  const bgStyle = colorEnd
    ? { background: `linear-gradient(90deg, ${color}, ${colorEnd})` }
    : { backgroundColor: color };

  return (
    <div className={cn("w-full", className)}>
      {/* Track */}
      <div
        className={cn(
          "w-full overflow-hidden",
          rounded ? "rounded-full" : "rounded-sm"
        )}
        style={{
          height,
          backgroundColor: trackColor || "var(--muted, oklch(0.97 0 0))",
        }}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${clampedValue}%`}
      >
        {segments ? (
          // Segmented mode
          <div className="flex h-full gap-0.5 p-0.5">
            {Array.from({ length: segments }).map((_, i) => {
              const segmentThreshold = ((i + 1) / segments) * 100;
              const isActive = clampedValue >= segmentThreshold;
              const isPartial =
                clampedValue >= (i / segments) * 100 &&
                clampedValue < segmentThreshold;
              const partialFill = isPartial
                ? ((clampedValue - (i / segments) * 100) / (100 / segments)) * 100
                : 0;

              return (
                <motion.div
                  key={i}
                  className="flex-1 h-full rounded-sm"
                  style={isActive || isPartial ? bgStyle : undefined}
                  initial={{ opacity: 0.2 }}
                  animate={{
                    opacity: isActive ? 1 : 0.2,
                    scaleX: isPartial ? partialFill / 100 : isActive ? 1 : 1,
                    transformOrigin: "left",
                  }}
                  transition={{
                    duration: animationDuration,
                    delay: i * 0.05,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                />
              );
            })}
          </div>
        ) : (
          // Continuous mode
          <motion.div
            className={cn(
              "h-full",
              rounded ? "rounded-full" : "rounded-sm"
            )}
            style={bgStyle}
            initial={{ width: 0 }}
            animate={{ width: `${clampedValue}%` }}
            transition={{
              duration: animationDuration,
              ease: [0.22, 1, 0.36, 1],
            }}
          />
        )}
      </div>

      {/* Label */}
      {showLabel && (
        <p className="mt-1 text-[11px] text-muted-foreground text-right tabular-nums">
          {Math.round(clampedValue)}%
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// StepProgress — Step progress indicator
// ═══════════════════════════════════════════════════════════════════════════════

export interface StepProgressProps {
  /** Current step (1-based) */
  currentStep: number;
  /** Total number of steps */
  totalSteps: number;
  /** Step labels */
  labels?: string[];
  /** Color for completed/active steps */
  color?: string;
  /** Size of step circles */
  size?: "sm" | "md" | "lg";
  /** Layout direction */
  direction?: "horizontal" | "vertical";
  /** Animation duration in seconds */
  animationDuration?: number;
  /** Additional class name */
  className?: string;
}

export function StepProgress({
  currentStep,
  totalSteps,
  labels,
  color = "#8b5cf6",
  size = "md",
  direction = "horizontal",
  animationDuration = 0.5,
  className,
}: StepProgressProps) {
  const clampedStep = Math.min(currentStep, totalSteps);

  const sizeMap = {
    sm: { circle: "h-6 w-6", text: "text-[10px]", label: "text-[10px]", lineWidth: "w-6" },
    md: { circle: "h-8 w-8", text: "text-xs", label: "text-xs", lineWidth: "w-8" },
    lg: { circle: "h-10 w-10", text: "text-sm", label: "text-sm", lineWidth: "w-10" },
  };

  const sizeConfig = sizeMap[size];
  const isVertical = direction === "vertical";

  return (
    <div
      className={cn(
        isVertical ? "flex flex-col gap-1" : "flex items-center",
        className
      )}
      role="progressbar"
      aria-valuenow={clampedStep}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-label={`步骤 ${clampedStep} / ${totalSteps}`}
    >
      {Array.from({ length: totalSteps }).map((_, i) => {
        const stepNum = i + 1;
        const isCompleted = stepNum < clampedStep;
        const isCurrent = stepNum === clampedStep;
        const isFuture = stepNum > clampedStep;

        return (
          <React.Fragment key={i}>
            {/* Step circle + label */}
            <div className={cn("flex flex-col items-center gap-1", isVertical && "flex-row gap-2")}>
              <motion.div
                className={cn(
                  "flex items-center justify-center rounded-full font-semibold transition-colors",
                  sizeConfig.circle,
                  isCompleted && "text-white",
                  isCurrent && "text-white ring-2 ring-offset-2 ring-offset-background",
                  isFuture && "text-muted-foreground bg-muted"
                )}
                style={
                  isCompleted || isCurrent
                    ? {
                        backgroundColor: color,
                        ...(isCurrent
                          ? { ringColor: color, boxShadow: `0 0 12px ${color}40` }
                          : {}),
                      }
                    : undefined
                }
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{
                  scale: 1,
                  opacity: 1,
                }}
                transition={{
                  duration: animationDuration,
                  delay: i * 0.1,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {isCompleted ? (
                  <svg
                    width={size === "sm" ? 12 : size === "md" ? 14 : 18}
                    height={size === "sm" ? 12 : size === "md" ? 14 : 18}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                ) : (
                  <span className={sizeConfig.text}>{stepNum}</span>
                )}
              </motion.div>

              {/* Label */}
              {labels && labels[i] && (
                <span
                  className={cn(
                    sizeConfig.label,
                    "text-center max-w-[80px]",
                    isCompleted || isCurrent
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {labels[i]}
                </span>
              )}
            </div>

            {/* Connector line */}
            {i < totalSteps - 1 && (
              <div
                className={cn(
                  isVertical ? "h-4 ml-[50%] w-0.5" : "flex-1 mx-1",
                  isVertical ? "self-start" : ""
                )}
              >
                <div
                  className={cn(
                    isVertical ? "h-full" : "h-0.5",
                    "rounded-full bg-muted"
                  )}
                >
                  <motion.div
                    className={cn(
                      isVertical ? "h-full" : "h-0.5",
                      "rounded-full"
                    )}
                    style={{ backgroundColor: color }}
                    initial={{ scale: 0 }}
                    animate={{
                      scale: isCompleted ? 1 : 0,
                      transformOrigin: isVertical ? "top" : "left",
                    }}
                    transition={{
                      duration: animationDuration,
                      delay: i * 0.1 + 0.1,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  />
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ScoreGauge — Score gauge dashboard (0-100)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ScoreGaugeProps {
  /** Score value 0-100 */
  score: number;
  /** SVG size in pixels */
  size?: number;
  /** Stroke width in pixels */
  strokeWidth?: number;
  /** Custom label */
  label?: string;
  /** Custom description */
  description?: string;
  /** Override color zones */
  colorZones?: {
    low: string;
    medium: string;
    high: string;
  };
  /** Animation duration in seconds */
  animationDuration?: number;
  /** Additional class name */
  className?: string;
}

export function ScoreGauge({
  score,
  size = 120,
  strokeWidth = 10,
  label,
  description,
  colorZones,
  animationDuration = 1.2,
  className,
}: ScoreGaugeProps) {
  const clampedScore = Math.min(100, Math.max(0, score));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75; // 270-degree arc
  const gap = circumference * 0.25; // 90-degree gap

  const offset = clampedScore * (arcLength / 100);

  // Color based on score zones
  const zones = colorZones || {
    low: "#ef4444",     // Red: 0-39
    medium: "#f59e0b",  // Amber: 40-69
    high: "#10b981",    // Green: 70-100
  };

  const gaugeColor =
    clampedScore < 40 ? zones.low : clampedScore < 70 ? zones.medium : zones.high;

  const scoreLabel = clampedScore < 40 ? "低" : clampedScore < 70 ? "中" : "高";

  return (
    <motion.div
      className={cn("flex flex-col items-center gap-2", className)}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="relative inline-flex items-center justify-center">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="overflow-visible"
          role="meter"
          aria-valuenow={clampedScore}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`评分 ${Math.round(clampedScore)}`}
        >
          {/* Background arc (track) */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--muted, oklch(0.97 0 0))"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={arcLength}
            strokeDashoffset={-gap / 2}
            className="dark:opacity-20"
            style={{
              transform: "rotate(135deg)",
              transformOrigin: "50% 50%",
            }}
          />

          {/* Progress arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={gaugeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={arcLength}
            initial={{ strokeDashoffset: -gap / 2 }}
            animate={{ strokeDashoffset: -(gap / 2) + offset }}
            transition={{
              duration: animationDuration,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              transform: "rotate(135deg)",
              transformOrigin: "50% 50%",
              filter: `drop-shadow(0 0 6px ${gaugeColor}50)`,
            }}
          />

          {/* Decorative glow dot at the tip of the arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={strokeWidth / 2 + 1}
            fill="white"
            initial={{ opacity: 0 }}
            animate={{ opacity: clampedScore > 0 ? 0.9 : 0 }}
            transition={{ delay: animationDuration * 0.8, duration: 0.3 }}
            style={{
              // Position at the tip of the progress arc
              // For a 270-degree arc starting from 135 degrees
              transform: `rotate(${135 + (clampedScore / 100) * 270}deg) translateX(${radius}px)`,
              transformOrigin: "0 0",
              filter: `drop-shadow(0 0 4px ${gaugeColor})`,
            }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-2xl font-bold tabular-nums"
            style={{ color: gaugeColor }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            {Math.round(clampedScore)}
          </motion.span>
          <span className="text-[10px] text-muted-foreground font-medium">
            {label ?? scoreLabel}
          </span>
        </div>
      </div>

      {/* Description */}
      {description && (
        <p className="text-[11px] text-muted-foreground text-center max-w-[160px]">
          {description}
        </p>
      )}
    </motion.div>
  );
}
