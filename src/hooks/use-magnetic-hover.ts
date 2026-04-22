"use client";

import { useCallback, useRef, type MouseEvent } from "react";

/**
 * useMagneticHover — element slightly follows the cursor on hover.
 * Sets CSS custom properties --magnetic-x and --magnetic-y.
 */
export function useMagneticHover<T extends HTMLElement = HTMLElement>(strength: number = 6) {
  const ref = useRef<T>(null);

  const handleMouseMove = useCallback(
    (e: MouseEvent<T>) => {
      const el = ref.current ?? (e.currentTarget as T);
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = (e.clientX - centerX) / (rect.width / 2);
      const deltaY = (e.clientY - centerY) / (rect.height / 2);

      const moveX = deltaX * strength;
      const moveY = deltaY * strength;

      el.style.setProperty("--magnetic-x", `${moveX}px`);
      el.style.setProperty("--magnetic-y", `${moveY}px`);
      el.style.transform = `translate(${moveX}px, ${moveY}px)`;
    },
    [strength],
  );

  const handleMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--magnetic-x", "0px");
    el.style.setProperty("--magnetic-y", "0px");
    el.style.transform = "";
  }, []);

  return { ref, onMouseMove: handleMouseMove, onMouseLeave: handleMouseLeave };
}
