"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import React, { useState, useCallback } from "react";

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

type Direction = "forward" | "backward" | "default";

/**
 * PageTransition — Enhanced page transition wrapper with:
 * - Direction-aware slide animations (left/right based on navigation)
 * - Subtle progress indicator bar during transitions
 * - Fade-through effect for smooth content swaps
 */
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const [prevPath, setPrevPath] = useState(pathname);
  const [direction, setDirection] = useState<Direction>("default");
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Detect path change and determine direction
  // Using functional setState to avoid stale closure issues
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    const isForward = pathname > prevPath;
    setDirection(isForward ? "forward" : "backward");
    setIsTransitioning(true);
  }

  const handleAnimationComplete = useCallback(() => {
    setIsTransitioning(false);
  }, []);

  const currentVariants = pageVariants[direction];

  return (
    <div className="relative min-h-0 flex-1">
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

      {/* Fade-through overlay for seamless content swap */}
      <AnimatePresence mode="wait">
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
    </div>
  );
}
