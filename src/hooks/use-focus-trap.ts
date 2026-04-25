"use client";

import { useEffect, useRef, useCallback, useState } from "react";

/**
 * Focus trap hook for Dialog/Modal components.
 * Traps Tab key within a container, cycles focus between focusable elements,
 * and calls onClose on Escape.
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  options: {
    /** Whether the trap is active */
    active: boolean;
    /** Called when Escape is pressed */
    onClose?: () => void;
    /** Initial element to focus when trap activates */
    initialFocusRef?: React.RefObject<HTMLElement | null>;
    /** Element to return focus to when trap deactivates */
    restoreFocusRef?: React.RefObject<HTMLElement | null>;
  } = { active: false },
) {
  const { active, onClose, initialFocusRef, restoreFocusRef } = options;
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Save previously focused element and focus initial
  useEffect(() => {
    if (!active) return;

    // Save the element that had focus before trap
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus the initial element after a tick
    const timer = setTimeout(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else if (containerRef.current) {
        const firstFocusable = getFirstFocusable(containerRef.current);
        if (firstFocusable) firstFocusable.focus();
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      // Restore focus to previous element
      if (previousFocusRef.current && !previousFocusRef.current.closest('[aria-hidden="true"]')) {
        previousFocusRef.current.focus();
      }
    };
  }, [active, containerRef, initialFocusRef]);

  // Handle Tab cycling and Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!active || !containerRef.current) return;

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose?.();
        return;
      }

      if (e.key === "Tab") {
        const focusableElements = getFocusableElements(containerRef.current);
        if (focusableElements.length === 0) return;

        const firstEl = focusableElements[0];
        const lastEl = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          // Shift+Tab: if on first element, wrap to last
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          // Tab: if on last element, wrap to first
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    },
    [active, containerRef, onClose],
  );

  useEffect(() => {
    if (!active) return;
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [active, handleKeyDown]);
}

/** Get all focusable elements inside a container */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'textarea:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(", ");

  const elements = Array.from(container.querySelectorAll<HTMLElement>(selector));
  // Filter out elements that are hidden
  return elements.filter((el) => {
    if (el.offsetParent === null && el.style.position !== "fixed") return false;
    if (el.getAttribute("aria-hidden") === "true") return false;
    if (el.closest('[aria-hidden="true"]')) return false;
    return true;
  });
}

/** Get the first focusable element in a container */
function getFirstFocusable(container: HTMLElement): HTMLElement | null {
  const elements = getFocusableElements(container);
  return elements[0] || null;
}

/**
 * Auto-focus trap for Dialog components.
 * A simpler hook that just ensures focus is properly managed.
 */
export function useDialogFocusTrap(
  isOpen: boolean,
  dialogRef: React.RefObject<HTMLElement | null>,
) {
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      returnFocusRef.current = document.activeElement as HTMLElement;

      const timer = setTimeout(() => {
        if (dialogRef.current) {
          const firstFocusable = getFirstFocusable(dialogRef.current);
          if (firstFocusable) {
            firstFocusable.focus();
          }
        }
      }, 100);

      return () => clearTimeout(timer);
    } else {
      // Restore focus when dialog closes
      const timer = setTimeout(() => {
        if (returnFocusRef.current) {
          returnFocusRef.current.focus();
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isOpen, dialogRef]);
}
