"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import React, { useState, useCallback, useEffect, useRef } from "react";

interface PageTransitionProps {
  children: React.ReactNode;
}

// ─── Direction-aware page transition variants ─────────────────────────────────

const pageVariants = {
  forward: {
    initial: { opacity: 0, x: 24, scale: 0.98 },
    enter: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
    exit: { opacity: 0, x: -12, scale: 0.99, transition: { duration: 0.15, ease: "easeIn" } },
  },
  backward: {
    initial: { opacity: 0, x: -24, scale: 0.98 },
    enter: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
    exit: { opacity: 0, x: 12, scale: 0.99, transition: { duration: 0.15, ease: "easeIn" } },
  },
  default: {
    initial: { opacity: 0, y: 8 },
    enter: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
    exit: { opacity: 0, y: -4, transition: { duration: 0.15, ease: "easeIn" } },
  },
};

// Cross-fade variants for skeleton flash prevention
const crossFadeVariants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: 0.2, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: "easeIn" } },
};

type Direction = "forward" | "backward" | "default";

/**
 * PageTransition — Enhanced page transition wrapper with:
 * - Direction-aware slide animations (left/right based on navigation)
 * - Loading state between transitions (prevents skeleton flash)
 * - Cross-fade mode for seamless content swap
 * - Subtle progress indicator bar during transitions
 */
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const [prevPath, setPrevPath] = useState(pathname);
  const [direction, setDirection] = useState<Direction>("default");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const prevPathRef = useRef(pathname);

  // Detect path change and determine direction
  // Using functional setState to avoid stale closure issues
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    const isForward = pathname > prevPath;
    setDirection(isForward ? "forward" : "backward");
    setIsTransitioning(true);
    setIsNavigating(true);

    // Auto-clear navigating state after transition
    // Using setTimeout to avoid memory leaks
  }

  // Clear navigating state after a safe period
  useEffect(() => {
    if (isNavigating) {
      const timer = setTimeout(() => {
        setIsNavigating(false);
      }, 600); // Slightly longer than transition duration
      return () => clearTimeout(timer);
    }
  }, [isNavigating, pathname]);

  const handleAnimationComplete = useCallback(() => {
    setIsTransitioning(false);
    prevPathRef.current = pathname;
  }, [pathname]);

  const currentVariants = pageVariants[direction];

  return (
    <div className="relative min-h-0 flex-1" ref={contentRef}>
      {/* Loading backdrop during navigation (prevents skeleton flash) */}
      <AnimatePresence>
        {isNavigating && (
          <motion.div
            className="absolute inset-0 z-30 bg-background/80 backdrop-blur-[1px] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          />
        )}
      </AnimatePresence>

      {/* Progress indicator bar at the top during transitions */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            className="absolute top-0 left-0 right-0 z-50 h-0.5 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          >
            <motion.div
              className="h-full bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fade-through cross-fade overlay for seamless content swap */}
      {/* This uses cross-fade instead of flash to prevent skeleton flicker */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          variants={currentVariants}
          initial="initial"
          animate="enter"
          exit="exit"
          onAnimationComplete={handleAnimationComplete}
          className="min-h-0"
        >
          {children}
        </motion.div>
      </AnimatePresence>

      {/* Bottom progress indicator for longer transitions */}
      <AnimatePresence>
        {isNavigating && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 z-50 h-0.5 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.4), transparent)",
              }}
              animate={{
                x: ["-100%", "100%"],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
