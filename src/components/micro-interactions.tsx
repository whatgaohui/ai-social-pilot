"use client";

import React, { useRef, useState, useEffect, type ReactNode, type HTMLAttributes } from "react";
import { motion, AnimatePresence, useAnimationControls } from "framer-motion";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════════════
// HoverLift — Wrapper with lift + shadow on hover
// ═══════════════════════════════════════════════════════════════════════════════

interface HoverLiftProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Lift distance in px (default: -4) */
  distance?: number;
  /** Shadow spread scale (default: 2) */
  shadowSpread?: number;
  className?: string;
}

/**
 * HoverLift — Wrapper that adds lift + shadow effect on hover.
 *
 * @example
 * ```tsx
 * <HoverLift distance={-6} shadowSpread={3}>
 *   <Card>Hover me</Card>
 * </HoverLift>
 * ```
 */
export function HoverLift({
  children,
  distance = -4,
  shadowSpread = 2,
  className,
  ...props
}: HoverLiftProps) {
  return (
    <motion.div
      className={cn("inline-block", className)}
      whileHover={{
        y: distance,
        boxShadow: `0 ${Math.abs(distance) * shadowSpread}px ${Math.abs(distance) * 3 * shadowSpread}px rgba(0,0,0,0.1)`,
      }}
      whileTap={{ y: distance / 2 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PressScale — Wrapper that scales down on press
// ═══════════════════════════════════════════════════════════════════════════════

interface PressScaleProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Scale amount on press (default: 0.95) */
  scale?: number;
  /** Spring stiffness (default: 400) */
  stiffness?: number;
  className?: string;
}

/**
 * PressScale — Wrapper that scales down on press with spring physics.
 *
 * @example
 * ```tsx
 * <PressScale scale={0.92}>
 *   <Button>Click me</Button>
 * </PressScale>
 * ```
 */
export function PressScale({
  children,
  scale = 0.95,
  stiffness = 400,
  className,
  ...props
}: PressScaleProps) {
  return (
    <motion.div
      className={cn("inline-block", className)}
      whileTap={{ scale }}
      transition={{ type: "spring", stiffness, damping: 20 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FocusGlow — Wrapper that adds glow on focus
// ═══════════════════════════════════════════════════════════════════════════════

interface FocusGlowProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Glow color (default: "#8b5cf6") */
  color?: string;
  /** Glow spread in px (default: 12) */
  spread?: number;
  /** Border radius (default: "inherit") */
  borderRadius?: string;
  className?: string;
}

/**
 * FocusGlow — Wrapper that adds animated glow effect on focus.
 *
 * @example
 * ```tsx
 * <FocusGlow color="#22c55e" spread={16}>
 *   <input className="..." />
 * </FocusGlow>
 * ```
 */
export function FocusGlow({
  children,
  color = "#8b5cf6",
  spread = 12,
  borderRadius = "inherit",
  className,
  ...props
}: FocusGlowProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div
      className={cn("relative inline-block", className)}
      onFocusCapture={() => setIsFocused(true)}
      onBlurCapture={() => setIsFocused(false)}
      style={{ borderRadius }}
      {...props}
    >
      <motion.div
        className="absolute inset-0 pointer-events-none -z-10"
        animate={{
          boxShadow: isFocused
            ? `0 0 ${spread}px 2px ${color}40, 0 0 ${spread * 2}px ${color}15`
            : "0 0 0px 0px transparent",
        }}
        transition={{ duration: 0.2 }}
        style={{ borderRadius }}
      />
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ShakeOnError — Trigger shake animation
// ═══════════════════════════════════════════════════════════════════════════════

interface ShakeOnErrorProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Whether to trigger the shake (default: false) */
  trigger?: boolean;
  /** Shake intensity in px (default: 4) */
  intensity?: number;
  /** Duration in ms (default: 400) */
  duration?: number;
  className?: string;
}

/**
 * ShakeOnError — Triggers a shake animation for form validation errors.
 *
 * @example
 * ```tsx
 * const [hasError, setHasError] = useState(false);
 * <ShakeOnError trigger={hasError}>
 *   <Input />
 * </ShakeOnError>
 * ```
 */
export function ShakeOnError({
  children,
  trigger = false,
  intensity = 4,
  duration = 400,
  className,
  ...props
}: ShakeOnErrorProps) {
  const controls = useAnimationControls();
  const prevTrigger = useRef(trigger);
  const shakeCountRef = useRef(0);

  useEffect(() => {
    if (trigger && !prevTrigger.current) {
      // Directly use motion controls to start/stop shake — no setState needed
      controls.start({
        x: [0, -intensity, intensity, -intensity * 0.7, intensity * 0.7, 0],
        transition: { duration: duration / 1000 },
      }).then(() => {
        controls.set({ x: 0 });
      });
      shakeCountRef.current += 1;
    }
    prevTrigger.current = trigger;
  }, [trigger, intensity, duration, controls]);

  return (
    <motion.div
      className={className}
      animate={controls}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SuccessCheck — Animated checkmark on success
// ═══════════════════════════════════════════════════════════════════════════════

interface SuccessCheckProps extends HTMLAttributes<HTMLDivElement> {
  /** Whether to show the checkmark (default: false) */
  show?: boolean;
  /** Size in px (default: 40) */
  size?: number;
  /** Checkmark color (default: "#22c55e") */
  color?: string;
  /** Background color (default: "#22c55e") */
  bgColor?: string;
  className?: string;
}

/**
 * SuccessCheck — Animated SVG checkmark with draw-path animation.
 *
 * @example
 * ```tsx
 * const [isSuccess, setIsSuccess] = useState(false);
 * <SuccessCheck show={isSuccess} />
 * ```
 */
export function SuccessCheck({
  show = false,
  size = 40,
  color = "#22c55e",
  bgColor = "#22c55e",
  className,
  ...props
}: SuccessCheckProps) {
  const checkPathLength = 24;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} {...props}>
      <AnimatePresence>
        {show && (
          <motion.svg
            width={size}
            height={size}
            viewBox="0 0 40 40"
            fill="none"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            {/* Background circle */}
            <motion.circle
              cx="20"
              cy="20"
              r="18"
              fill={bgColor}
              opacity={0.15}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
            />
            {/* Checkmark path */}
            <motion.path
              d="M12 20L18 26L28 14"
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              strokeDasharray={checkPathLength}
              initial={{ strokeDashoffset: checkPathLength }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
            />
          </motion.svg>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NumberBounce — Number bounce animation on value change
// ═══════════════════════════════════════════════════════════════════════════════

interface NumberBounceProps extends HTMLAttributes<HTMLSpanElement> {
  /** Current value */
  value: number;
  /** Optional formatter */
  formatter?: (n: number) => string;
  className?: string;
}

/**
 * NumberBounce — Number that bounces when value changes.
 * Uses framer-motion spring for natural feel.
 *
 * @example
 * ```tsx
 * const [count, setCount] = useState(0);
 * <NumberBounce value={count} formatter={(n) => n.toLocaleString()} />
 * ```
 */
export function NumberBounce({
  value,
  formatter,
  className,
  ...props
}: NumberBounceProps) {
  const prevValue = useRef(value);
  const controls = useAnimationControls();

  useEffect(() => {
    if (value !== prevValue.current) {
      prevValue.current = value;
      // Use motion controls directly — no setState
      controls.start({
        scale: [1, 1.25, 0.95, 1.08, 1],
        y: [0, -4, 0, -1, 0],
        transition: { type: "spring", stiffness: 400, damping: 15 },
      }).then(() => {
        controls.set({ scale: 1, y: 0 });
      });
    }
  }, [value, controls]);

  return (
    <motion.span
      className={cn("inline-block tabular-nums", className)}
      animate={controls}
      {...props}
    >
      {formatter ? formatter(value) : value}
    </motion.span>
  );
}

export {
  type HoverLiftProps,
  type PressScaleProps,
  type FocusGlowProps,
  type ShakeOnErrorProps,
  type SuccessCheckProps,
  type NumberBounceProps,
};
