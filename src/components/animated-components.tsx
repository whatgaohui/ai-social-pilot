"use client";

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from "framer-motion";

// ═══════════════════════════════════════════════════════════════════════════════
// AnimatedCounter — Number counting animation with spring physics
// ═══════════════════════════════════════════════════════════════════════════════

/** Format modes for AnimatedCounter display */
type CounterFormat = "number" | "percent" | "score" | "compact";

interface AnimatedCounterProps {
  /** Target number to animate to */
  value: number;
  /** Animation duration in seconds (default: 1) */
  duration?: number;
  /** Display format: "number" | "percent" | "score" | "compact" */
  format?: CounterFormat;
  /** Text before the number (e.g. "¥") */
  prefix?: string;
  /** Text after the number (e.g. "%", "篇") */
  suffix?: string;
  /** Additional CSS classes */
  className?: string;
  /** Trigger animation when this value changes (default: value) */
  keyProp?: string | number;
}

/** Format a number with locale-aware comma separation */
function formatNumber(n: number, fmt: CounterFormat): string {
  switch (fmt) {
    case "percent":
      return `${(n * 100).toFixed(1)}`;
    case "score":
      return n.toFixed(1);
    case "compact": {
      if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
      if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
      return Math.round(n).toLocaleString();
    }
    default:
      return Math.round(n).toLocaleString();
  }
}

/**
 * AnimatedCounter — Displays a number that counts up/down with spring physics.
 * Uses framer-motion's useMotionValue + useTransform for smooth 60fps animation.
 *
 * @example
 * ```tsx
 * <AnimatedCounter value={1283} format="compact" prefix="¥" duration={1.5} />
 * <AnimatedCounter value={0.87} format="percent" suffix="%" />
 * ```
 */
export function AnimatedCounter({
  value,
  duration = 1,
  format = "number",
  prefix = "",
  suffix = "",
  className = "",
  keyProp,
}: AnimatedCounterProps) {
  const motionVal = useMotionValue(0);
  const display = useTransform(motionVal, (v) => `${prefix}${formatNumber(v, format)}${suffix}`);
  const spanRef = useRef<HTMLSpanElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip initial mount animation if value is 0
    if (isFirstRender.current) {
      isFirstRender.current = false;
    }
    const controls = animate(motionVal, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [value, duration, keyProp, motionVal]);

  useEffect(() => {
    const unsubscribe = display.on("change", (v) => {
      if (spanRef.current) {
        spanRef.current.textContent = v;
      }
    });
    return () => unsubscribe();
  }, [display]);

  return (
    <span ref={spanRef} className={`tabular-nums ${className}`} aria-label={`${prefix}${value}${suffix}`}>
      {formatNumber(0, format)}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AnimatedGradientBorder — Rotating gradient border with glass morphism
// ═══════════════════════════════════════════════════════════════════════════════

interface AnimatedGradientBorderProps {
  children: ReactNode;
  className?: string;
  /** CSS gradient color stops, e.g. "#8b5cf6, #ec4899, #f59e0b" */
  gradientColors?: string;
  /** Rotation speed in seconds (default: 4) */
  speed?: number;
  /** Border width in pixels (default: 2) */
  borderWidth?: number;
}

/**
 * AnimatedGradientBorder — Wraps children with a rotating conic-gradient border.
 * Pure CSS animation (no JS overhead), with glassmorphism inner area.
 * Hover accelerates the gradient rotation.
 *
 * @example
 * ```tsx
 * <AnimatedGradientBorder gradientColors="#8b5cf6, #ec4899, #f59e0b" speed={3}>
 *   <Card>Content</Card>
 * </AnimatedGradientBorder>
 * ```
 */
export function AnimatedGradientBorder({
  children,
  className = "",
  gradientColors = "#8b5cf6, #ec4899, #f59e0b, #10b981, #8b5cf6",
  speed = 4,
  borderWidth = 2,
}: AnimatedGradientBorderProps) {
  const [isHovered, setIsHovered] = useState(false);
  const currentSpeed = isHovered ? Math.max(1, speed * 0.5) : speed;

  const animationStyle: React.CSSProperties = {
    "--agb-colors": gradientColors,
    "--agb-speed": `${currentSpeed}s`,
    "--agb-width": `${borderWidth}px`,
    animationDuration: `${currentSpeed}s`,
  } as React.CSSProperties;

  return (
    <div
      className={`animated-gradient-border ${isHovered ? "animated-gradient-border--fast" : ""} ${className}`}
      style={animationStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="animated-gradient-border__inner">
        {children}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MagneticButton — Button with magnetic hover effect
// ═══════════════════════════════════════════════════════════════════════════════

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  /** Magnetic pull strength in pixels (default: 8) */
  strength?: number;
  /** Click handler */
  onClick?: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Button element type */
  as?: "button" | "div";
}

/**
 * MagneticButton — Button whose content subtly follows the cursor on hover.
 * Features spring-back animation on leave and a scale+ripple effect on click.
 *
 * @example
 * ```tsx
 * <MagneticButton strength={10} onClick={handleClick}>
 *   <Sparkles className="h-4 w-4" />
 *   生成内容
 * </MagneticButton>
 * ```
 */
export function MagneticButton({
  children,
  className = "",
  strength = 8,
  onClick,
  disabled = false,
  as: Tag = "button",
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const pullX = ((e.clientX - centerX) / (rect.width / 2)) * strength;
      const pullY = ((e.clientY - centerY) / (rect.height / 2)) * strength;
      setOffset({ x: pullX, y: pullY });
    },
    [strength],
  );

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setOffset({ x: 0, y: 0 });
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      setIsClicking(true);
      onClick?.();
      setTimeout(() => setIsClicking(false), 300);
    },
    [onClick, disabled],
  );

  return (
    <Tag
      ref={ref}
      className={`magnetic-hover-zone relative inline-flex items-center justify-center ${className}`}
      style={{
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        transition: isHovered
          ? "transform 0.15s ease-out"
          : "transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      role={Tag === "div" ? "button" : undefined}
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
    >
      <motion.div
        animate={{
          scale: isClicking ? 0.93 : 1,
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 20,
        }}
      >
        {children}
      </motion.div>
      {/* Ripple effect on click */}
      <AnimatePresence>
        {isClicking && (
          <motion.div
            className="absolute inset-0 rounded-[inherit] pointer-events-none"
            initial={{ opacity: 0.3, scale: 0.8 }}
            animate={{ opacity: 0, scale: 1.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              background: "radial-gradient(circle, rgba(139,92,246,0.3), transparent 70%)",
            }}
          />
        )}
      </AnimatePresence>
    </Tag>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ShimmerText — Text with shimmer/shine animation
// ═══════════════════════════════════════════════════════════════════════════════

interface ShimmerTextProps {
  children: ReactNode;
  className?: string;
  /** Shimmer speed in seconds (default: 3) */
  speed?: number;
  /** Custom shimmer gradient colors */
  colors?: string;
}

/**
 * ShimmerText — Text with a moving gradient highlight (shimmer/shine effect).
 * Pure CSS animation for 60fps performance. Supports dark mode variants.
 *
 * @example
 * ```tsx
 * <ShimmerText speed={2} colors="#8b5cf6, #ec4899, #f59e0b">
 *   AI智能内容生成
 * </ShimmerText>
 * ```
 */
export function ShimmerText({
  children,
  className = "",
  speed = 3,
  colors,
}: ShimmerTextProps) {
  const style: React.CSSProperties = {
    "--shimmer-duration": `${speed}s`,
    ...(colors ? { "--shimmer-colors": colors } : {}),
  } as React.CSSProperties;

  return (
    <span
      className={`shimmer-text ${className}`}
      style={style}
      aria-label={typeof children === "string" ? children : undefined}
    >
      {children}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// StaggerContainer / StaggerItem — Staggered children animation
// ═══════════════════════════════════════════════════════════════════════════════

/** Available stagger animation variants */
type StaggerVariant = "fadeUp" | "fadeIn" | "slideIn" | "scaleIn";

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  /** Animation variant for children */
  variant?: StaggerVariant;
  /** Delay between each child in seconds (default: 0.05) */
  staggerDelay?: number;
  /** Initial delay before the first child animates (default: 0) */
  initialDelay?: number;
  /** Whether animation is enabled (default: true) */
  enabled?: boolean;
}

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

const staggerVariants: Record<StaggerVariant, { hidden: object; visible: object }> = {
  fadeUp: {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0 },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  slideIn: {
    hidden: { opacity: 0, x: -16 },
    visible: { opacity: 1, x: 0 },
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.92 },
    visible: { opacity: 1, scale: 1 },
  },
};

/**
 * StaggerContainer — Wraps children with staggered animation delays.
 * Each child (wrapped in StaggerItem) animates in sequence.
 *
 * @example
 * ```tsx
 * <StaggerContainer variant="fadeUp" staggerDelay={0.08}>
 *   <StaggerItem><Card>1</Card></StaggerItem>
 *   <StaggerItem><Card>2</Card></StaggerItem>
 *   <StaggerItem><Card>3</Card></StaggerItem>
 * </StaggerContainer>
 * ```
 */
export function StaggerContainer({
  children,
  className = "",
  variant = "fadeUp",
  staggerDelay = 0.05,
  initialDelay = 0,
  enabled = true,
}: StaggerContainerProps) {
  if (!enabled) {
    return <div className={className}>{children}</div>;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: initialDelay,
        staggerChildren: staggerDelay,
      },
    },
  };

  const itemVariant = staggerVariants[variant];

  const itemVariants = {
    hidden: itemVariant.hidden,
    visible: {
      ...itemVariant.visible,
      transition: {
        duration: 0.35,
        ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
      },
    },
  };

  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {React.Children.map(children, (child) => (
        <motion.div variants={itemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

/**
 * StaggerItem — Wraps a single child element for use inside StaggerContainer.
 * Standalone use is supported; it defaults to fadeUp behavior.
 */
export function StaggerItem({ children, className = "" }: StaggerItemProps) {
  return <div className={className}>{children}</div>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TooltipOnHover — Enhanced tooltip with delay, animation, and JSX support
// ═══════════════════════════════════════════════════════════════════════════════

interface TooltipOnHoverProps {
  children: ReactNode;
  /** Tooltip content — supports JSX */
  content: ReactNode;
  /** Preferred side: "top" | "bottom" | "left" | "right" (default: "top") */
  side?: "top" | "bottom" | "left" | "right";
  /** Show delay in milliseconds (default: 400) */
  delay?: number;
  className?: string;
}

/**
 * TooltipOnHover — Enhanced tooltip with configurable delay, smooth animations,
 * arrow pointer, and full JSX content support.
 *
 * @example
 * ```tsx
 * <TooltipOnHover content={<div><strong>AI Score:</strong> 87/100</div>} side="top" delay={200}>
 *   <Badge>87分</Badge>
 * </TooltipOnHover>
 * ```
 */
export function TooltipOnHover({
  children,
  content,
  side = "top",
  delay = 400,
  className = "",
}: TooltipOnHoverProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  }, [delay]);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Position classes based on side
  const sideClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-card-foreground/90 border-x-transparent border-b-transparent border-4",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-card-foreground/90 border-x-transparent border-t-transparent border-4",
    left: "left-full top-1/2 -translate-y-1/2 border-l-card-foreground/90 border-y-transparent border-r-transparent border-4",
    right: "right-full top-1/2 -translate-y-1/2 border-r-card-foreground/90 border-y-transparent border-l-transparent border-4",
  };

  const slideVariants = {
    top: { initial: { opacity: 0, y: 4 }, animate: { opacity: 1, y: 0 } },
    bottom: { initial: { opacity: 0, y: -4 }, animate: { opacity: 1, y: 0 } },
    left: { initial: { opacity: 0, x: 4 }, animate: { opacity: 1, x: 0 } },
    right: { initial: { opacity: 0, x: -4 }, animate: { opacity: 1, x: 0 } },
  };

  const slide = slideVariants[side];

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            className={`absolute z-50 pointer-events-none ${sideClasses[side]}`}
            initial={slide.initial}
            animate={slide.animate}
            exit={{ opacity: 0, ...slide.initial }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="px-2.5 py-1.5 rounded-md bg-card-foreground text-card-foreground text-xs shadow-lg max-w-[240px]">
              {content}
            </div>
            <div className={`absolute ${arrowClasses[side]}`} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SkeletonPulse — Enhanced skeleton loading component
// ═══════════════════════════════════════════════════════════════════════════════

interface SkeletonPulseProps {
  className?: string;
  /** Number of text lines to render (default: 3) */
  lines?: number;
  /** Show a circle skeleton (avatar) before the lines */
  circle?: boolean;
  /** Width of the circle in Tailwind classes (default: "w-10 h-10") */
  circleSize?: string;
}

/**
 * SkeletonPulse — Enhanced skeleton loading placeholder with gradient shimmer.
 * Supports multi-line text layout, circle avatar, and custom sizing.
 *
 * @example
 * ```tsx
 * <SkeletonPulse lines={4} circle />
 * <SkeletonPulse className="h-32 w-full" lines={0} />
 * ```
 */
export function SkeletonPulse({
  className = "",
  lines = 3,
  circle = false,
  circleSize = "w-10 h-10",
}: SkeletonPulseProps) {
  const lineHeights = ["h-3", "h-2.5", "h-2.5"];
  const lineWidths = ["w-full", "w-5/6", "w-4/6"];

  return (
    <div className={`skeleton-wave ${className}`} role="status" aria-label="加载中">
      <div className="space-y-2.5 animate-pulse">
        {circle && (
          <div className={`rounded-full bg-muted skeleton-shimmer ${circleSize}`} />
        )}
        {lines > 0 &&
          Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className={`rounded ${lineHeights[i % lineHeights.length]} ${i === lines - 1 ? lineWidths[2] : i === 0 ? lineWidths[0] : lineWidths[1]} bg-muted skeleton-shimmer`}
            />
          ))}
        {lines === 0 && (
          <div className="w-full h-full rounded bg-muted skeleton-shimmer" />
        )}
      </div>
      <span className="sr-only">加载中...</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CountUpBadge — Badge with animated number and threshold colors
// ═══════════════════════════════════════════════════════════════════════════════

interface CountUpBadgeProps {
  /** Current value to display */
  value: number;
  /** Maximum value for percentage calculation */
  max?: number;
  className?: string;
  /** Format mode */
  format?: CounterFormat;
  /** Custom label text */
  label?: string;
}

/**
 * CountUpBadge — Badge that counts up its number when it appears.
 * Color changes based on value thresholds (low/mid/high).
 * Bounce animation when value changes.
 *
 * @example
 * ```tsx
 * <CountUpBadge value={42} max={100} label="完成率" format="percent" />
 * <CountUpBadge value={1283} format="compact" label="浏览" />
 * ```
 */
export function CountUpBadge({
  value,
  max,
  className = "",
  format = "number",
  label,
}: CountUpBadgeProps) {
  const [displayedValue, setDisplayedValue] = useState(0);
  const [prevValue, setPrevValue] = useState(0);
  const [isBouncing, setIsBouncing] = useState(false);
  const isFirstRender = useRef(true);

  // Determine color tier based on value
  const getColorClass = useCallback(() => {
    if (max === undefined) return "badge-pop--neutral";
    const ratio = value / max;
    if (ratio < 0.3) return "badge-pop--low";
    if (ratio < 0.7) return "badge-pop--mid";
    return "badge-pop--high";
  }, [value, max]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
    } else {
      // Trigger bounce on value change
      setIsBouncing(true);
      const timeout = setTimeout(() => setIsBouncing(false), 400);
      return () => clearTimeout(timeout);
    }
  }, [value]);

  // Animate count-up
  useEffect(() => {
    const start = prevValue;
    const end = value;
    const diff = end - start;
    const steps = 30;
    const stepDuration = (800) / steps; // 800ms total
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      // Ease-out cubic
      const progress = 1 - Math.pow(1 - currentStep / steps, 3);
      setDisplayedValue(Math.round(start + diff * progress));

      if (currentStep >= steps) {
        setDisplayedValue(end);
        setPrevValue(end);
        clearInterval(timer);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value, displayedValue]);

  const displayStr = formatNumber(displayedValue, format);

  return (
    <motion.span
      className={`badge-pop inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${getColorClass()} ${className}`}
      animate={{
        scale: isBouncing ? [1, 1.2, 0.95, 1.05, 1] : 1,
      }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {label && <span className="text-[10px] opacity-70">{label}</span>}
      {displayStr}
      {format === "percent" && <span className="text-[10px]">%</span>}
    </motion.span>
  );
}
