"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type ChangeType = "increase" | "decrease" | "neutral";

type StatVariant = "default" | "minimal" | "glass" | "gradient" | "outline";

interface SparklineData {
  values: number[];
  color?: string;
}

export interface StatCardProps {
  /** Card variant */
  variant?: StatVariant;
  /** Stat title */
  title: string;
  /** Stat value — can be string or number */
  value: string | number;
  /** Change value (e.g. "+12.5%", "-3.2%") */
  change?: string;
  /** Change direction */
  changeType?: ChangeType;
  /** Description text */
  description?: string;
  /** Icon component */
  icon?: LucideIcon;
  /** Icon background color (Tailwind class) */
  iconColor?: string;
  /** Optional sparkline mini chart data */
  sparkline?: SparklineData;
  /** Additional class name */
  className?: string;
  /** Animation delay for staggered entry */
  delay?: number;
  /** Click handler */
  onClick?: () => void;
}

// ─── Sparkline Component ──────────────────────────────────────────────────────

function Sparkline({
  data,
  className,
}: {
  data: SparklineData;
  className?: string;
}) {
  const { values, color = "#8b5cf6" } = data;
  if (!values || values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const width = 80;
  const height = 28;
  const padding = 2;

  const points = values
    .map((v, i) => {
      const x = padding + (i / (values.length - 1)) * (width - padding * 2);
      const y = height - padding - ((v - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const gradientId = `sparkline-${Math.random().toString(36).slice(2, 8)}`;

  // Create area fill path
  const firstX = padding;
  const lastX = padding + ((values.length - 1) / (values.length - 1)) * (width - padding * 2);
  const areaPath = `M${firstX},${height} L${points.split(" ").join(" L")} L${lastX},${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("w-20 h-7", className)}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Trend Badge ──────────────────────────────────────────────────────────────

function TrendBadge({
  change,
  changeType,
}: {
  change: string;
  changeType: ChangeType;
}) {
  const config = {
    increase: {
      icon: TrendingUp,
      className: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200/60 dark:border-emerald-800/40",
    },
    decrease: {
      icon: TrendingDown,
      className: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border-rose-200/60 dark:border-rose-800/40",
    },
    neutral: {
      icon: Minus,
      className: "text-muted-foreground bg-muted/50 border-border/20",
    },
  };

  const { icon: TrendIcon, className } = config[changeType];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-medium border tabular-nums",
        className
      )}
    >
      <TrendIcon className="h-3 w-3" />
      {change}
    </span>
  );
}

// ─── Variant Wrapper Styles ───────────────────────────────────────────────────

const variantStyles: Record<StatVariant, string> = {
  default:
    "bg-card text-card-foreground border border-border/20 shadow-sm hover:shadow-md",
  minimal: "bg-transparent hover:bg-muted/30",
  glass:
    "glass-card backdrop-blur-xl bg-white/60 dark:bg-white/5 border border-white/20 dark:border-white/10 shadow-sm",
  gradient:
    "bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-fuchsia-500/10 border border-violet-200/40 dark:border-violet-700/30",
  outline:
    "bg-transparent border-2 border-dashed border-border/20 hover:border-violet-300/60 dark:hover:border-violet-600/40",
};

// ─── Main Component ──────────────────────────────────────────────────────────

export function StatCard({
  variant = "default",
  title,
  value,
  change,
  changeType = "neutral",
  description,
  icon: Icon,
  iconColor = "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400",
  sparkline,
  className,
  delay = 0,
  onClick,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ y: -2 }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={cn(
        "relative rounded-xl p-4 transition-all duration-200",
        variantStyles[variant],
        onClick && "cursor-pointer",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Title + Value + Meta */}
        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground truncate">
            {title}
          </p>

          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "text-xl font-bold tabular-nums tracking-tight truncate",
                variant === "glass" && "text-foreground"
              )}
            >
              {typeof value === "number" ? value.toLocaleString() : value}
            </span>

            {change && changeType && (
              <TrendBadge change={change} changeType={changeType} />
            )}
          </div>

          {description && (
            <p className="text-[11px] text-muted-foreground/70 line-clamp-2">
              {description}
            </p>
          )}
        </div>

        {/* Right: Icon + Sparkline */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {Icon && (
            <div
              className={cn(
                "flex items-center justify-center h-9 w-9 rounded-lg",
                iconColor
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
          )}

          {sparkline && (
            <Sparkline
              data={{
                values: sparkline.values,
                color:
                  sparkline.color ||
                  (changeType === "increase"
                    ? "#10b981"
                    : changeType === "decrease"
                      ? "#ef4444"
                      : "#8b5cf6"),
              }}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}
