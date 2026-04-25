"use client";

import { useCallback, useRef, type MouseEvent } from "react";

/**
 * useRipple — attaches a click handler that sets CSS custom properties
 * --ripple-x and --ripple-y on the target element, enabling the
 * .btn-ripple CSS animation to originate from the exact click position.
 *
 * Also provides createRipple for DOM-based ripple effects via .ripple-click class.
 */
export function useRipple<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null);

  const handleClick = useCallback((e: MouseEvent<T>) => {
    const el = ref.current ?? (e.currentTarget as T);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 2;

    el.style.setProperty("--ripple-x", `${x}px`);
    el.style.setProperty("--ripple-y", `${y}px`);
    el.style.setProperty("--ripple-size", `${size}px`);

    // Force reflow so the animation restarts
    el.classList.remove("ripple-active");
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    el.offsetWidth;
    el.classList.add("ripple-active");

    const cleanup = () => {
      el.classList.remove("ripple-active");
      el.removeEventListener("animationend", cleanup);
    };
    el.addEventListener("animationend", cleanup);
  }, []);

  /**
   * createRipple — creates a DOM-based ripple element (.ripple-click)
   * at the click position. Use on elements with `ripple-container` class.
   */
  const createRipple = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const ripple = document.createElement("span");
    ripple.className = "ripple-click";
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }, []);

  return { ref, onClick: handleClick, createRipple };
}
