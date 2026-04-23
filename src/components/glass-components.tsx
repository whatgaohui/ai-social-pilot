"use client";

import React, { forwardRef, type ReactNode, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════════════
// Glass Morphism Component Library
// ═══════════════════════════════════════════════════════════════════════════════

/** Glass intensity variants */
type GlassVariant = "subtle" | "default" | "strong" | "elevated";

interface GlassBaseProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  variant?: GlassVariant;
  /** Backdrop blur amount in px (default varies by variant) */
  blur?: number;
  /** Background opacity 0-1 (default varies by variant) */
  bgOpacity?: number;
  /** Border opacity 0-1 (default varies by variant) */
  borderOpacity?: number;
}

const variantConfig: Record<GlassVariant, { blur: number; bg: number; border: number; shadow: string; darkShadow: string }> = {
  subtle: {
    blur: 8,
    bg: 0.4,
    border: 0.15,
    shadow: "0 1px 3px rgba(0,0,0,0.04)",
    darkShadow: "0 1px 3px rgba(0,0,0,0.2)",
  },
  default: {
    blur: 16,
    bg: 0.65,
    border: 0.3,
    shadow: "0 4px 16px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)",
    darkShadow: "0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
  },
  strong: {
    blur: 24,
    bg: 0.85,
    border: 0.45,
    shadow: "0 8px 32px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
    darkShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
  },
  elevated: {
    blur: 20,
    bg: 0.75,
    border: 0.35,
    shadow: "0 12px 40px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.05)",
    darkShadow: "0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
  },
};

function getGlassStyles(
  variant: GlassVariant,
  blur?: number,
  bgOpacity?: number,
  borderOpacity?: number,
) {
  const config = variantConfig[variant];
  const b = blur ?? config.blur;
  const bg = bgOpacity ?? config.bg;
  const bd = borderOpacity ?? config.border;
  return {
    backdropFilter: `blur(${b}px) saturate(180%)`,
    WebkitBackdropFilter: `blur(${b}px) saturate(180%)`,
    boxShadow: config.shadow,
  } as React.CSSProperties;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GlassCard
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GlassCard — Frosted glass card with backdrop blur.
 * Supports 4 variants: subtle, default, strong, elevated.
 *
 * @example
 * ```tsx
 * <GlassCard variant="strong" className="p-6">
 *   <h3>Content</h3>
 * </GlassCard>
 * ```
 */
export const GlassCard = forwardRef<HTMLDivElement, GlassBaseProps>(
  function GlassCard(
    { children, className, variant = "default", blur, bgOpacity, borderOpacity, style, ...props },
    ref,
  ) {
    const config = variantConfig[variant];
    const b = blur ?? config.blur;
    const bg = bgOpacity ?? config.bg;
    const bd = borderOpacity ?? config.border;

    return (
      <div
        ref={ref}
        className={cn("rounded-xl transition-all duration-200", className)}
        style={{
          backdropFilter: `blur(${b}px) saturate(180%)`,
          WebkitBackdropFilter: `blur(${b}px) saturate(180%)`,
          background: `rgba(255, 255, 255, ${bg})`,
          border: `1px solid rgba(255, 255, 255, ${bd})`,
          boxShadow: config.shadow,
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// GlassPanel
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GlassPanel — Full glass panel for sidebars, modal backdrops, etc.
 * Fills its container by default.
 */
export const GlassPanel = forwardRef<HTMLDivElement, GlassBaseProps>(
  function GlassPanel(
    { children, className, variant = "default", blur, bgOpacity, borderOpacity, style, ...props },
    ref,
  ) {
    const config = variantConfig[variant];
    const b = blur ?? config.blur;
    const bg = bgOpacity ?? config.bg;
    const bd = borderOpacity ?? config.border;

    return (
      <div
        ref={ref}
        className={cn("w-full h-full", className)}
        style={{
          backdropFilter: `blur(${b}px) saturate(180%)`,
          WebkitBackdropFilter: `blur(${b}px) saturate(180%)`,
          background: `rgba(255, 255, 255, ${bg})`,
          borderRight: `1px solid rgba(255, 255, 255, ${bd})`,
          boxShadow: config.shadow,
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// GlassHeader
// ═══════════════════════════════════════════════════════════════════════════════

interface GlassHeaderProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  className?: string;
  /** Blur amount in px (default: 16) */
  blur?: number;
  /** Background opacity (default: 0.7) */
  bgOpacity?: number;
  /** Whether to blur on scroll (default: false — always blurred) */
  scrollBlur?: boolean;
}

/**
 * GlassHeader — Transparent header that blurs on scroll.
 * Set scrollBlur=true to only apply blur after scrolling.
 */
export const GlassHeader = forwardRef<HTMLElement, GlassHeaderProps>(
  function GlassHeader(
    { children, className, blur = 16, bgOpacity = 0.7, scrollBlur = false, style, ...props },
    ref,
  ) {
    return (
      <header
        ref={ref}
        className={cn(
          "sticky top-0 z-50 transition-all duration-300",
          scrollBlur ? "data-[scrolled=true]:glass-header-scrolled" : "",
          className,
        )}
        style={{
          backdropFilter: `blur(${blur}px) saturate(180%)`,
          WebkitBackdropFilter: `blur(${blur}px) saturate(180%)`,
          background: `rgba(255, 255, 255, ${bgOpacity})`,
          borderBottom: `1px solid rgba(255, 255, 255, 0.2)`,
          ...style,
        }}
        {...props}
      >
        {children}
      </header>
    );
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// GlassBadge
// ═══════════════════════════════════════════════════════════════════════════════

interface GlassBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  className?: string;
  /** Color variant for the badge */
  color?: "default" | "violet" | "emerald" | "amber" | "rose";
}

const badgeColors = {
  default: {
    bg: "rgba(0, 0, 0, 0.06)",
    border: "rgba(0, 0, 0, 0.1)",
    darkBg: "rgba(255, 255, 255, 0.08)",
    darkBorder: "rgba(255, 255, 255, 0.12)",
  },
  violet: {
    bg: "rgba(139, 92, 246, 0.1)",
    border: "rgba(139, 92, 246, 0.2)",
    darkBg: "rgba(139, 92, 246, 0.15)",
    darkBorder: "rgba(139, 92, 246, 0.25)",
  },
  emerald: {
    bg: "rgba(16, 185, 129, 0.1)",
    border: "rgba(16, 185, 129, 0.2)",
    darkBg: "rgba(16, 185, 129, 0.15)",
    darkBorder: "rgba(16, 185, 129, 0.25)",
  },
  amber: {
    bg: "rgba(245, 158, 11, 0.1)",
    border: "rgba(245, 158, 11, 0.2)",
    darkBg: "rgba(245, 158, 11, 0.15)",
    darkBorder: "rgba(245, 158, 11, 0.25)",
  },
  rose: {
    bg: "rgba(244, 63, 94, 0.1)",
    border: "rgba(244, 63, 94, 0.2)",
    darkBg: "rgba(244, 63, 94, 0.15)",
    darkBorder: "rgba(244, 63, 94, 0.25)",
  },
};

/**
 * GlassBadge — Frosted glass badge for status/tag display.
 */
export const GlassBadge = forwardRef<HTMLSpanElement, GlassBadgeProps>(
  function GlassBadge({ children, className, color = "default", style, ...props }, ref) {
    const colors = badgeColors[color];
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium backdrop-blur-md",
          className,
        )}
        style={{
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          ...style,
        }}
        {...props}
      >
        {children}
      </span>
    );
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// GlassTooltip
// ═══════════════════════════════════════════════════════════════════════════════

interface GlassTooltipProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  /** Side of the tooltip */
  side?: "top" | "bottom" | "left" | "right";
}

const tooltipPositions = {
  top: { bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" },
  bottom: { top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" },
  left: { right: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" },
  right: { left: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" },
};

/**
 * GlassTooltip — Frosted glass tooltip with directional arrow support.
 */
export const GlassTooltip = forwardRef<HTMLDivElement, GlassTooltipProps>(
  function GlassTooltip({ children, className, side = "top", style, ...props }, ref) {
    const pos = tooltipPositions[side];
    return (
      <div
        ref={ref}
        className={cn("absolute z-50 pointer-events-none whitespace-nowrap", className)}
        style={{
          ...pos,
          backdropFilter: "blur(16px) saturate(180%)",
          WebkitBackdropFilter: "blur(16px) saturate(180%)",
          background: "rgba(255, 255, 255, 0.85)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          borderRadius: "8px",
          padding: "6px 10px",
          fontSize: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  },
);

export { type GlassVariant, type GlassBaseProps, type GlassHeaderProps, type GlassBadgeProps, type GlassTooltipProps };
