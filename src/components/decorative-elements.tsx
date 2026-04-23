"use client";

import React, { useMemo, type HTMLAttributes, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════════════
// GradientOrbs — Floating gradient circles for background decoration
// ═══════════════════════════════════════════════════════════════════════════════

interface GradientOrbsProps extends HTMLAttributes<HTMLDivElement> {
  /** Number of orbs (default: 3) */
  count?: number;
  /** Orb colors (default: violet, pink, amber) */
  colors?: string[];
  /** Min size in px (default: 200) */
  minSize?: number;
  /** Max size in px (default: 400) */
  maxSize?: number;
  /** Blur amount in px (default: 60) */
  blur?: number;
  /** Opacity (default: 0.15) */
  opacity?: number;
  className?: string;
}

/**
 * GradientOrbs — Decorative floating gradient circles for backgrounds.
 * CSS-only animations for performance.
 *
 * @example
 * ```tsx
 * <GradientOrbs count={4} colors={["#8b5cf6", "#ec4899", "#f59e0b"]} className="fixed inset-0 -z-10" />
 * ```
 */
export function GradientOrbs({
  count = 3,
  colors,
  minSize = 200,
  maxSize = 400,
  blur = 60,
  opacity = 0.15,
  className,
  ...props
}: GradientOrbsProps) {
  const defaultColors = ["#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"];
  const orbColors = colors ?? defaultColors;

  const orbs = useMemo(() => {
    // Use deterministic positions based on index for SSR consistency
    return Array.from({ length: count }).map((_, i) => {
      const size = minSize + ((i * 73 + 37) % (maxSize - minSize));
      const x = ((i * 31 + 15) % 80) + 10; // 10-90%
      const y = ((i * 47 + 23) % 80) + 10;
      const color = orbColors[i % orbColors.length];
      const delay = (i * 1.3) % 6;

      return {
        width: size,
        height: size,
        left: `${x}%`,
        top: `${y}%`,
        backgroundColor: color,
        animationDelay: `${delay}s`,
        animationDuration: `${8 + (i % 4)}s`,
      };
    });
  }, [count, orbColors, minSize, maxSize]);

  return (
    <div
      className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}
      aria-hidden="true"
      {...props}
    >
      {orbs.map((orb, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-drift"
          style={{
            width: orb.width,
            height: orb.height,
            left: orb.left,
            top: orb.top,
            backgroundColor: orb.backgroundColor,
            opacity,
            filter: `blur(${blur}px)`,
            animationDelay: orb.animationDelay,
            animationDuration: orb.animationDuration,
          }}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ParticleField — CSS-only animated particle dots
// ═══════════════════════════════════════════════════════════════════════════════

interface ParticleFieldProps extends HTMLAttributes<HTMLDivElement> {
  /** Number of particles (default: 20) */
  density?: number;
  /** Particle size in px (default: 2) */
  size?: number;
  /** Particle color (default: current text color) */
  color?: string;
  /** Animation speed multiplier (default: 1) */
  speed?: number;
  className?: string;
}

/**
 * ParticleField — Subtle animated particle dots using pure CSS.
 *
 * @example
 * ```tsx
 * <ParticleField density={30} size={1.5} color="#8b5cf6" className="absolute inset-0" />
 * ```
 */
export function ParticleField({
  density = 20,
  size = 2,
  color,
  speed = 1,
  className,
  ...props
}: ParticleFieldProps) {
  const particles = useMemo(() => {
    return Array.from({ length: density }).map((_, i) => {
      const x = ((i * 31 + 17) % 100);
      const y = ((i * 47 + 29) % 100);
      const delay = ((i * 0.7) % 5);
      const duration = (3 + (i % 4)) / speed;

      return {
        left: `${x}%`,
        top: `${y}%`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      };
    });
  }, [density, speed]);

  return (
    <div
      className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}
      aria-hidden="true"
      {...props}
    >
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-particle-float"
          style={{
            width: size,
            height: size,
            left: p.left,
            top: p.top,
            backgroundColor: color ?? "currentColor",
            opacity: 0.3,
            animationDelay: p.animationDelay,
            animationDuration: p.animationDuration,
          }}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GridPattern — SVG dot grid or line grid background
// ═══════════════════════════════════════════════════════════════════════════════

interface GridPatternProps extends HTMLAttributes<HTMLDivElement> {
  /** Grid type (default: "dots") */
  type?: "dots" | "lines";
  /** Spacing between grid points/lines in px (default: 24) */
  spacing?: number;
  /** Dot/line size in px (default: 1) */
  size?: number;
  /** Color (default: current border color) */
  color?: string;
  /** Opacity (default: 0.4) */
  opacity?: number;
  className?: string;
}

/**
 * GridPattern — SVG-based dot grid or line grid background.
 *
 * @example
 * ```tsx
 * <GridPattern type="dots" spacing={20} color="#8b5cf6" opacity={0.2} />
 * <GridPattern type="lines" spacing={32} />
 * ```
 */
export function GridPattern({
  type = "dots",
  spacing = 24,
  size = 1,
  color,
  opacity = 0.4,
  className,
  ...props
}: GridPatternProps) {
  const patternId = `grid-${type}-${spacing}`;

  return (
    <div
      className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}
      aria-hidden="true"
      {...props}
    >
      <svg
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id={patternId}
            width={spacing}
            height={spacing}
            patternUnits="userSpaceOnUse"
          >
            {type === "dots" ? (
              <circle
                cx={spacing / 2}
                cy={spacing / 2}
                r={size}
                fill={color ?? "currentColor"}
                opacity={opacity}
              />
            ) : (
              <>
                <path
                  d={`M ${spacing} 0 L 0 0 0 ${spacing}`}
                  fill="none"
                  stroke={color ?? "currentColor"}
                  strokeWidth={size}
                  opacity={opacity}
                />
              </>
            )}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NoiseTexture — CSS noise texture overlay
// ═══════════════════════════════════════════════════════════════════════════════

interface NoiseTextureProps extends HTMLAttributes<HTMLDivElement> {
  /** Opacity of the noise overlay (default: 0.03) */
  opacity?: number;
  /** Whether to use as a blend overlay (default: true) */
  blend?: boolean;
  className?: string;
}

/**
 * NoiseTexture — CSS noise texture overlay for adding visual depth.
 *
 * @example
 * ```tsx
 * <NoiseTexture opacity={0.04} className="absolute inset-0 -z-10" />
 * ```
 */
export function NoiseTexture({
  opacity = 0.03,
  blend = true,
  className,
  ...props
}: NoiseTextureProps) {
  return (
    <div
      className={cn("absolute inset-0 pointer-events-none bg-noise", className)}
      style={{
        opacity,
        mixBlendMode: blend ? "overlay" : "normal",
      }}
      aria-hidden="true"
      {...props}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DividerEnhanced — Decorative dividers
// ═══════════════════════════════════════════════════════════════════════════════

type DividerVariant = "gradient" | "dotted" | "icon-center" | "label-center";

interface DividerEnhancedProps extends HTMLAttributes<HTMLDivElement> {
  variant?: DividerVariant;
  /** Icon element for icon-center variant */
  icon?: React.ReactNode;
  /** Label text for label-center variant */
  label?: string;
  /** Gradient colors for gradient variant */
  gradientColors?: string;
  className?: string;
}

/**
 * DividerEnhanced — Decorative divider lines with various styles.
 *
 * @example
 * ```tsx
 * <DividerEnhanced variant="gradient" />
 * <DividerEnhanced variant="icon-center" icon={<Sparkles />} />
 * <DividerEnhanced variant="label-center" label="OR" />
 * ```
 */
export function DividerEnhanced({
  variant = "gradient",
  icon,
  label,
  gradientColors = "rgba(139,92,246,0.3), rgba(236,72,153,0.2), rgba(245,158,11,0.15)",
  className,
  ...props
}: DividerEnhancedProps) {
  if (variant === "dotted") {
    return (
      <div
        className={cn("w-full border-t border-dotted border-border/50", className)}
        role="separator"
        {...props}
      />
    );
  }

  if (variant === "icon-center") {
    return (
      <div
        className={cn("flex items-center gap-3 w-full", className)}
        role="separator"
        {...props}
      >
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <span className="flex-shrink-0 text-muted-foreground/60">{icon}</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>
    );
  }

  if (variant === "label-center") {
    return (
      <div
        className={cn("flex items-center gap-3 w-full", className)}
        role="separator"
        {...props}
      >
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <span className="flex-shrink-0 text-xs text-muted-foreground px-2">{label}</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>
    );
  }

  // Gradient variant (default)
  return (
    <div
      className={cn("w-full h-px", className)}
      style={{
        background: `linear-gradient(90deg, transparent, ${gradientColors}, transparent)`,
      }}
      role="separator"
      {...props}
    />
  );
}

export { type DividerVariant };
