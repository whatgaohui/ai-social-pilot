"use client";

import { useEffect, useState, useCallback } from "react";

/**
 * Screen reader detection and accessibility preference hooks.
 */

/** Detect if a screen reader is active */
export function useScreenReader() {
  const [isScreenReader, setIsScreenReader] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    // Method 1: Check for screen reader-specific media query
    const mqString = "(prefers-reduced-motion: reduce)";
    const mq = window.matchMedia(mqString);

    const handleMQChange = (e: MediaQueryListEvent) => {
      if (e.matches) setIsScreenReader(true);
    };

    // Simple heuristic: check for common screen reader indicators
    const checkFocusVisible = () => {
      let hasMouse = false;
      const handleMouse = () => {
        hasMouse = true;
      };
      window.addEventListener("mousemove", handleMouse, { once: true });

      const timer = setTimeout(() => {
        if (!hasMouse) {
          setIsScreenReader(true);
        }
        window.removeEventListener("mousemove", handleMouse);
      }, 5000);

      return () => {
        clearTimeout(timer);
        window.removeEventListener("mousemove", handleMouse);
      };
    };

    mq.addEventListener("change", handleMQChange);
    const mouseCleanup = checkFocusVisible();

    return () => {
      mq.removeEventListener("change", handleMQChange);
      mouseCleanup();
    };
  }, []);

  return isScreenReader;
}

/** Detect high contrast mode preference */
export function useHighContrast() {
  const [isHighContrast, setIsHighContrast] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(forced-colors: active)").matches;
  });

  useEffect(() => {
    const mq = window.matchMedia("(forced-colors: active)");

    const handler = (e: MediaQueryListEvent) => {
      setIsHighContrast(e.matches);
    };

    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isHighContrast;
}

/** Detect prefers-reduced-motion preference */
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return prefersReducedMotion;
}

/** Detect keyboard navigation */
export function useKeyboardNav() {
  const [isKeyboardNav, setIsKeyboardNav] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Tab key indicates keyboard navigation
      if (e.key === "Tab") {
        setIsKeyboardNav(true);
        document.body.setAttribute("data-keyboard-nav", "true");
      }
    };

    const handleMouseDown = () => {
      setIsKeyboardNav(false);
      document.body.removeAttribute("data-keyboard-nav");
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleMouseDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  return isKeyboardNav;
}

/** Combined accessibility preferences hook */
export function useAccessibilityPrefs() {
  const screenReader = useScreenReader();
  const highContrast = useHighContrast();
  const reducedMotion = useReducedMotion();
  const keyboardNav = useKeyboardNav();

  return {
    screenReader,
    highContrast,
    reducedMotion,
    keyboardNav,
    /** Whether to simplify animations for accessibility */
    shouldReduceMotion: reducedMotion || screenReader,
    /** Whether to enhance visual contrast */
    shouldEnhanceContrast: highContrast || screenReader,
  };
}

/**
 * Hook to manage skip navigation links.
 * Returns props for a skip-to-content link.
 */
export function useSkipNavigation(contentId: string = "main-content") {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      const target = document.getElementById(contentId);
      if (target) {
        target.focus();
        target.scrollIntoView({ behavior: "smooth" });
      }
    },
    [contentId],
  );

  return {
    href: `#${contentId}`,
    onClick: handleClick,
    children: "跳到主要内容",
    className:
      "sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:border focus:border-border focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:text-sm",
  };
}
