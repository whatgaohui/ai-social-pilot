"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { motion, type HTMLMotionProps } from "framer-motion";

// ─── GlowPanel ─────────────────────────────────────────────────────────────
// 带微妙发光边框的面板容器，3种变体：subtle / default / intense

export interface GlowPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 发光强度：subtle(微光) / default(标准) / intense(强烈) */
  variant?: "subtle" | "default" | "intense";
  /** 发光颜色主题：purple / green / amber */
  glowColor?: "purple" | "green" | "amber";
  /** 是否使用渐变背景 */
  gradient?: boolean;
  /** 是否启用悬浮增强 */
  hoverEnhance?: boolean;
  /** framer-motion 动画 */
  as?: React.ElementType;
}

const glowColorMap = {
  purple: {
    subtle: {
      shadow: "0 0 8px var(--glow-purple), var(--shadow-sm)",
      hoverShadow:
        "0 0 16px var(--glow-purple), 0 0 32px rgba(139,92,246,0.06), var(--shadow-md)",
      border: "rgba(139,92,246,0.08)",
      gradient: "from-purple-500/[0.02] to-transparent",
    },
    default: {
      shadow:
        "0 0 12px var(--glow-purple), 0 0 24px rgba(139,92,246,0.06), var(--shadow-md)",
      hoverShadow:
        "0 0 20px var(--glow-purple), 0 0 48px rgba(139,92,246,0.1), var(--shadow-lg)",
      border: "rgba(139,92,246,0.12)",
      gradient: "from-purple-500/[0.04] to-transparent",
    },
    intense: {
      shadow:
        "0 0 16px var(--glow-purple), 0 0 40px rgba(139,92,246,0.12), var(--shadow-lg)",
      hoverShadow:
        "0 0 28px var(--glow-purple), 0 0 64px rgba(139,92,246,0.16), 0 0 96px rgba(139,92,246,0.06)",
      border: "rgba(139,92,246,0.18)",
      gradient: "from-purple-500/[0.06] to-transparent",
    },
  },
  green: {
    subtle: {
      shadow: "0 0 8px var(--glow-green), var(--shadow-sm)",
      hoverShadow:
        "0 0 16px var(--glow-green), 0 0 32px rgba(16,185,129,0.06), var(--shadow-md)",
      border: "rgba(16,185,129,0.08)",
      gradient: "from-emerald-500/[0.02] to-transparent",
    },
    default: {
      shadow:
        "0 0 12px var(--glow-green), 0 0 24px rgba(16,185,129,0.06), var(--shadow-md)",
      hoverShadow:
        "0 0 20px var(--glow-green), 0 0 48px rgba(16,185,129,0.1), var(--shadow-lg)",
      border: "rgba(16,185,129,0.12)",
      gradient: "from-emerald-500/[0.04] to-transparent",
    },
    intense: {
      shadow:
        "0 0 16px var(--glow-green), 0 0 40px rgba(16,185,129,0.12), var(--shadow-lg)",
      hoverShadow:
        "0 0 28px var(--glow-green), 0 0 64px rgba(16,185,129,0.16), 0 0 96px rgba(16,185,129,0.06)",
      border: "rgba(16,185,129,0.18)",
      gradient: "from-emerald-500/[0.06] to-transparent",
    },
  },
  amber: {
    subtle: {
      shadow: "0 0 8px var(--glow-amber), var(--shadow-sm)",
      hoverShadow:
        "0 0 16px var(--glow-amber), 0 0 32px rgba(245,158,11,0.06), var(--shadow-md)",
      border: "rgba(245,158,11,0.08)",
      gradient: "from-amber-500/[0.02] to-transparent",
    },
    default: {
      shadow:
        "0 0 12px var(--glow-amber), 0 0 24px rgba(245,158,11,0.06), var(--shadow-md)",
      hoverShadow:
        "0 0 20px var(--glow-amber), 0 0 48px rgba(245,158,11,0.1), var(--shadow-lg)",
      border: "rgba(245,158,11,0.12)",
      gradient: "from-amber-500/[0.04] to-transparent",
    },
    intense: {
      shadow:
        "0 0 16px var(--glow-amber), 0 0 40px rgba(245,158,11,0.12), var(--shadow-lg)",
      hoverShadow:
        "0 0 28px var(--glow-amber), 0 0 64px rgba(245,158,11,0.16), 0 0 96px rgba(245,158,11,0.06)",
      border: "rgba(245,158,11,0.18)",
      gradient: "from-amber-500/[0.06] to-transparent",
    },
  },
} as const;

export const GlowPanel = React.forwardRef<HTMLDivElement, GlowPanelProps>(
  (
    {
      variant = "default",
      glowColor = "purple",
      gradient = false,
      hoverEnhance = true,
      className,
      children,
      style,
      ...props
    },
    ref
  ) => {
    const config = glowColorMap[glowColor][variant];

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl p-4 transition-all duration-300 ease-out",
          gradient && `bg-gradient-to-br ${config.gradient}`,
          className
        )}
        style={{
          border: `1px solid ${config.border}`,
          boxShadow: config.shadow,
          ...style,
        }}
        onMouseEnter={(e) => {
          if (hoverEnhance) {
            (e.currentTarget as HTMLDivElement).style.boxShadow =
              config.hoverShadow;
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = config.shadow;
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);
GlowPanel.displayName = "GlowPanel";

// ─── GradientDivider ───────────────────────────────────────────────────────
// 渐变分割线：水平/垂直，多种预设，可选闪烁动画

export interface GradientDividerProps {
  /** 方向：horizontal / vertical */
  direction?: "horizontal" | "vertical";
  /** 预设渐变色 */
  preset?:
    | "purple-pink"
    | "green-teal"
    | "amber-orange"
    | "rainbow"
    | "purple-green"
    | "subtle";
  /** 是否启用闪烁动画 */
  shimmer?: boolean;
  /** 厚度（px） */
  thickness?: number;
  /** 长度（px 或 CSS 值），仅 horizontal */
  width?: string;
  /** 高度（px 或 CSS 值），仅 vertical */
  height?: string;
  /** 自定义 className */
  className?: string;
}

const presetGradients: Record<string, string> = {
  "purple-pink":
    "linear-gradient(90deg, transparent, #8b5cf6, #ec4899, transparent)",
  "green-teal":
    "linear-gradient(90deg, transparent, #10b981, #14b8a6, transparent)",
  "amber-orange":
    "linear-gradient(90deg, transparent, #f59e0b, #f97316, transparent)",
  rainbow:
    "linear-gradient(90deg, transparent, #8b5cf6, #ec4899, #f59e0b, #10b981, transparent)",
  "purple-green":
    "linear-gradient(90deg, transparent, #8b5cf6, #10b981, transparent)",
  subtle:
    "linear-gradient(90deg, transparent, var(--border-default), transparent)",
};

const presetGradientsVertical: Record<string, string> = {
  "purple-pink":
    "linear-gradient(180deg, transparent, #8b5cf6, #ec4899, transparent)",
  "green-teal":
    "linear-gradient(180deg, transparent, #10b981, #14b8a6, transparent)",
  "amber-orange":
    "linear-gradient(180deg, transparent, #f59e0b, #f97316, transparent)",
  rainbow:
    "linear-gradient(180deg, transparent, #8b5cf6, #ec4899, #f59e0b, #10b981, transparent)",
  "purple-green":
    "linear-gradient(180deg, transparent, #8b5cf6, #10b981, transparent)",
  subtle:
    "linear-gradient(180deg, transparent, var(--border-default), transparent)",
};

export function GradientDivider({
  direction = "horizontal",
  preset = "purple-pink",
  shimmer = false,
  thickness = 1,
  width = "100%",
  height = "100%",
  className,
}: GradientDividerProps) {
  const isHorizontal = direction === "horizontal";
  const gradientMap = isHorizontal
    ? presetGradients
    : presetGradientsVertical;
  const gradient = gradientMap[preset] || gradientMap["subtle"];

  return (
    <div
      className={cn(
        "shrink-0",
        isHorizontal ? "w-full" : "h-full",
        shimmer && "animate-glow-pulse",
        className
      )}
      style={{
        width: isHorizontal ? width : undefined,
        height: isHorizontal ? `${thickness}px` : height,
        background: gradient,
        opacity: preset === "subtle" ? 0.6 : 0.5,
        borderRadius: isHorizontal ? "1px" : "1px",
      }}
      role="separator"
      aria-orientation={direction}
    />
  );
}

// ─── SectionHeader ─────────────────────────────────────────────────────────
// 增强版区域标题：左侧渐变色条 + 标题/副标题 + 右侧操作区 + 底部渐变阴影

export interface SectionHeaderProps {
  /** 标题 */
  title: string;
  /** 副标题 */
  subtitle?: string;
  /** 右侧操作按钮区域 */
  actions?: React.ReactNode;
  /** 左侧渐变色条颜色 */
  accentColor?: "purple" | "green" | "amber" | "rose" | "sky";
  /** 是否显示底部渐变阴影 */
  bottomGlow?: boolean;
  /** 自定义 className */
  className?: string;
}

const accentColorMap = {
  purple: "from-purple-500 to-violet-600",
  green: "from-emerald-500 to-teal-600",
  amber: "from-amber-500 to-orange-600",
  rose: "from-rose-500 to-pink-600",
  sky: "from-sky-500 to-cyan-600",
};

export function SectionHeader({
  title,
  subtitle,
  actions,
  accentColor = "purple",
  bottomGlow = false,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "relative pb-4",
        bottomGlow && "mb-2",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {/* 左侧渐变色条 */}
          <div
            className={cn(
              "w-1 rounded-full self-stretch mt-0.5 flex-shrink-0",
              `bg-gradient-to-b ${accentColorMap[accentColor]}`
            )}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-tight tracking-tight text-[var(--text-primary)]">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* 右侧操作按钮区域 */}
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* 底部渐变阴影 */}
      {bottomGlow && (
        <div
          className="absolute bottom-0 left-0 right-0 h-px opacity-30"
          style={{
            background:
              "linear-gradient(90deg, transparent, var(--border-default), transparent)",
          }}
        />
      )}
    </div>
  );
}
