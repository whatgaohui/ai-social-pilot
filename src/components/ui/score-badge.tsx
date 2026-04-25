"use client";

import { motion } from "framer-motion";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ScoreBadgeProps {
  score: number; // 0-100
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  animated?: boolean;
}

// ─── Size config ──────────────────────────────────────────────────────────────

const SIZE_CONFIG = {
  sm: { svgSize: 36, strokeWidth: 3, fontSize: 10, labelSize: "text-[9px]" },
  md: { svgSize: 52, strokeWidth: 4, fontSize: 14, labelSize: "text-[10px]" },
  lg: { svgSize: 72, strokeWidth: 5, fontSize: 20, labelSize: "text-xs" },
} as const;

// ─── Color config based on score ──────────────────────────────────────────────

function getScoreConfig(score: number) {
  if (score >= 80) {
    return {
      stroke: "#10b981",
      label: "优秀",
      textColor: "text-emerald-500 dark:text-emerald-400",
    };
  }
  if (score >= 60) {
    return {
      stroke: "#f59e0b",
      label: "良好",
      textColor: "text-amber-500 dark:text-amber-400",
    };
  }
  if (score >= 40) {
    return {
      stroke: "#f97316",
      label: "中等",
      textColor: "text-orange-500 dark:text-orange-400",
    };
  }
  return {
    stroke: "#f43f5e",
    label: "待改进",
    textColor: "text-rose-500 dark:text-rose-400",
  };
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ScoreBadge({
  score,
  size = "md",
  showLabel = true,
  animated = true,
}: ScoreBadgeProps) {
  const config = SIZE_CONFIG[size];
  const scoreConfig = getScoreConfig(score);
  const clampedScore = Math.min(Math.max(score, 0), 100);
  const displayScore = Math.round(clampedScore);
  const percentage = clampedScore / 100;

  const center = config.svgSize / 2;
  const radius = center - config.strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference * (1 - percentage);

  return (
    <div className="flex flex-col items-center gap-0.5">
      {/* Relative wrapper to overlay text on SVG */}
      <div className="relative" style={{ width: config.svgSize, height: config.svgSize }}>
        {/* SVG progress ring */}
        <svg
          width={config.svgSize}
          height={config.svgSize}
          viewBox={`0 0 ${config.svgSize} ${config.svgSize}`}
          className="transform -rotate-90"
        >
          {/* Background ring: current color at 15% opacity */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={scoreConfig.stroke}
            strokeOpacity={0.15}
            strokeWidth={config.strokeWidth}
          />

          {/* Progress ring */}
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={scoreConfig.stroke}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={
              animated
                ? { strokeDashoffset: circumference }
                : { strokeDashoffset: targetOffset }
            }
            animate={{ strokeDashoffset: targetOffset }}
            transition={
              animated
                ? {
                    duration: 0.8,
                    delay: 0.1,
                    ease: [0.22, 1, 0.36, 1],
                  }
                : { duration: 0 }
            }
          />
        </svg>

        {/* Score number centered over the ring */}
        <div
          className="absolute inset-0 flex items-center justify-center font-bold tabular-nums text-foreground"
          style={{ fontSize: config.fontSize }}
        >
          {displayScore}
        </div>
      </div>

      {/* Label below */}
      {showLabel && (
        <span
          className={`${config.labelSize} font-medium ${scoreConfig.textColor} leading-tight`}
        >
          {scoreConfig.label}
        </span>
      )}
    </div>
  );
}
