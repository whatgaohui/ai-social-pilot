"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

// ─── MorphingButton ────────────────────────────────────────────────────────
// 形状变形按钮：idle→hover 圆角变化+微微膨胀, hover→active 压缩, loading→done 勾号绘制

export interface MorphingButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** 按钮状态 */
  state?: "idle" | "loading" | "done";
  /** 圆角变化目标 */
  morphTo?: string;
  /** 子内容 */
  children?: ReactNode;
  /** 完成后自动重置延迟(ms) */
  doneResetDelay?: number;
}

export const MorphingButton = React.forwardRef<
  HTMLButtonElement,
  MorphingButtonProps
>(
  (
    {
      state = "idle",
      morphTo = "9999px",
      children,
      className,
      disabled,
      onClick,
      ...props
    },
    ref
  ) => {
    const isLoading = state === "loading";
    const isDone = state === "done";
    const isIdle = state === "idle";

    return (
      <motion.button
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center px-4 py-2 font-medium text-sm transition-colors focus-ring-glow-enhanced press-scale-enhanced select-none",
          className
        )}
        animate={{
          borderRadius: isLoading || isDone ? morphTo : "var(--radius-md, 8px)",
          scale: isLoading ? 1 : undefined,
          padding: isLoading ? "8px 16px" : undefined,
        }}
        transition={{
          borderRadius: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
          scale: { duration: 0.15 },
          padding: { duration: 0.2 },
        }}
        whileHover={
          isIdle
            ? {
                scale: 1.03,
                borderRadius: morphTo,
                paddingLeft: 20,
                paddingRight: 20,
              }
            : undefined
        }
        whileTap={
          isIdle ? { scale: 0.96 } : undefined
        }
        disabled={disabled || isLoading}
        onClick={(e) => {
          if (!isLoading && !isDone) onClick?.(e);
        }}
        {...props}
      >
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
              style={{ animation: "spin 0.6s linear infinite" }}
            />
          ) : isDone ? (
            <motion.svg
              key="done"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              exit={{ pathLength: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <motion.path d="M5 13l4 4L19 7" />
            </motion.svg>
          ) : (
            <motion.span
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {children}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Spin keyframe injected */}
        <style jsx>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </motion.button>
    );
  }
);
MorphingButton.displayName = "MorphingButton";

// ─── StaggerList ────────────────────────────────────────────────────────────
// 交错动画列表包装器：children 依次入场

export interface StaggerListProps {
  children: ReactNode;
  /** 子项之间的延迟(ms) */
  staggerDelay?: number;
  /** 动画类型 */
  animation?: "fade-up" | "fade-left" | "fade-right" | "scale" | "slide-up";
  /** 首项延迟(ms) */
  initialDelay?: number;
  /** 是否在视口内才触发 */
  viewportOnce?: boolean;
  /** className */
  className?: string;
}

const animationVariants: Record<string, { hidden: Variants["hidden"]; visible: Variants["visible"] }> = {
  "fade-up": {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
  },
  "fade-left": {
    hidden: { opacity: 0, x: -16 },
    visible: { opacity: 1, x: 0 },
  },
  "fade-right": {
    hidden: { opacity: 0, x: 16 },
    visible: { opacity: 1, x: 0 },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
  },
  "slide-up": {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0 },
  },
};

export function StaggerList({
  children,
  staggerDelay = 60,
  animation = "fade-up",
  initialDelay = 0,
  viewportOnce = true,
  className,
}: StaggerListProps) {
  const variant = animationVariants[animation] || animationVariants["fade-up"];

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: viewportOnce, margin: "-30px" }}
      transition={{ staggerChildren: staggerDelay / 1000, delayChildren: initialDelay / 1000 }}
    >
      {React.Children.map(children, (child) => (
        <motion.div
          variants={variant}
          transition={{
            duration: 0.35,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

// ─── RevealOnScroll ─────────────────────────────────────────────────────────
// 滚动揭示动画：IntersectionObserver 实现

export interface RevealOnScrollProps {
  children: ReactNode;
  /** 揭示效果类型 */
  effect?: "fade-up" | "slide-left" | "scale" | "rotate" | "fade";
  /** 延迟(ms) */
  delay?: number;
  /** 动画时长(ms) */
  duration?: number;
  /** 仅触发一次 */
  once?: boolean;
  /** 触发阈值(0~1) */
  threshold?: number;
  /** className */
  className?: string;
}

const revealPresets: Record<
  string,
  { initial: object; animate: object; transition?: object }
> = {
  "fade-up": {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
  },
  "slide-left": {
    initial: { opacity: 0, x: -40 },
    animate: { opacity: 1, x: 0 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.85 },
    animate: { opacity: 1, scale: 1 },
  },
  rotate: {
    initial: { opacity: 0, rotate: -5, scale: 0.95 },
    animate: { opacity: 1, rotate: 0, scale: 1 },
  },
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
  },
};

export function RevealOnScroll({
  children,
  effect = "fade-up",
  delay = 0,
  duration = 500,
  once = true,
  threshold = 0.1,
  className,
}: RevealOnScrollProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.unobserve(el);
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [once, threshold]);

  const preset = revealPresets[effect] || revealPresets["fade-up"];

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={preset.initial}
      animate={isVisible ? preset.animate : preset.initial}
      transition={{
        duration: duration / 1000,
        delay: delay / 1000,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

// ─── NumberRoll ─────────────────────────────────────────────────────────────
// 数字滚动效果：从旧值到新值的数字动画，支持小数点和千分位

export interface NumberRollProps {
  /** 目标值 */
  value: number;
  /** 初始值（不设置则从0开始） */
  from?: number;
  /** 小数位数 */
  decimals?: number;
  /** 是否显示千分位 */
  thousands?: boolean;
  /** 动画时长(ms) */
  duration?: number;
  /** 前缀 */
  prefix?: string;
  /** 后缀 */
  suffix?: string;
  /** className */
  className?: string;
  /** 动画缓动 */
  easing?: (t: number) => number;
}

export function NumberRoll({
  value,
  from,
  decimals = 0,
  thousands = true,
  duration = 800,
  prefix = "",
  suffix = "",
  className,
  easing = (t: number) => 1 - Math.pow(1 - t, 3), // easeOutCubic
}: NumberRollProps) {
  const [displayValue, setDisplayValue] = useState(from ?? 0);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const startValRef = useRef<number>(from ?? 0);

  const formatNumber = useCallback(
    (num: number) => {
      const fixed = num.toFixed(decimals);
      if (!thousands) return `${prefix}${fixed}${suffix}`;
      const parts = fixed.split(".");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      return `${prefix}${parts.join(".")}${suffix}`;
    },
    [decimals, thousands, prefix, suffix]
  );

  useEffect(() => {
    const targetValue = value;
    startValRef.current = displayValue;
    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easing(progress);
      const current =
        startValRef.current +
        (targetValue - startValRef.current) * easedProgress;

      setDisplayValue(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [value, duration, easing]);

  return (
    <span className={cn("tabular-nums", className)} aria-label={formatNumber(value)}>
      {formatNumber(displayValue)}
    </span>
  );
}

// ─── ShimmerOverlay ─────────────────────────────────────────────────────────
// 光泽扫过效果：用于加载占位，对角线渐变动画

export interface ShimmerOverlayProps {
  /** 是否正在加载 */
  loading?: boolean;
  /** 子内容（loading=false 时显示） */
  children?: ReactNode;
  /** 光泽颜色 */
  shimmerColor?: string;
  /** 动画时长(ms) */
  duration?: number;
  /** 圆角 */
  rounded?: "sm" | "md" | "lg" | "full";
  /** 自定义 className */
  className?: string;
  /** 占位区域高度（加载时显示） */
  placeholderHeight?: string;
}

const roundedMap = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  full: "rounded-full",
};

export function ShimmerOverlay({
  loading = true,
  children,
  shimmerColor = "rgba(139, 92, 246, 0.08)",
  duration = 1800,
  rounded = "md",
  className,
  placeholderHeight = "80px",
}: ShimmerOverlayProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden",
        roundedMap[rounded],
        className
      )}
      style={{ minHeight: loading ? placeholderHeight : undefined }}
    >
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="shimmer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
            style={{
              background: `linear-gradient(
                135deg,
                var(--bg-tertiary, #f5f5f5) 25%,
                var(--shimmer-color, ${shimmerColor}) 50%,
                var(--bg-tertiary, #f5f5f5) 75%
              )`,
              backgroundSize: "400% 400%",
              animation: `shimmer-slide ${duration}ms ease-in-out infinite`,
            }}
          />
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
