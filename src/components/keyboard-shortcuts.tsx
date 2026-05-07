"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/app-store";

/**
 * Global keyboard shortcuts handler.
 *
 * Registered shortcuts:
 * - Cmd/Ctrl + 1-6: Navigate between views
 * - Cmd/Ctrl + N: New content (navigate to creator)
 * - Cmd/Ctrl + E: Export data
 * - Cmd/Ctrl + K is handled by CommandPalette component
 * - Escape: Close dialogs/command palette (handled by Dialog natively)
 */
export function KeyboardShortcuts() {
  const { setActiveTab, setAddAccountDialogOpen } = useAppStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only register shortcuts when not typing in an input/textarea
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      const isMeta = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl + 1-6: Navigate between views
      if (isMeta && !e.shiftKey && !e.altKey) {
        const tabMap: Record<string, Parameters<typeof setActiveTab>[0]> = {
          "1": "dashboard",
          "2": "account",
          "3": "content",
          "4": "persona",
          "5": "content",
          "6": "settings",
        };

        const tab = tabMap[e.key];
        if (tab) {
          e.preventDefault();
          setActiveTab(tab);
          return;
        }

        // Cmd/Ctrl + N: New content (navigate to content)
        if (e.key === "n" || e.key === "N") {
          e.preventDefault();
          setActiveTab("content");
          return;
        }

        // Cmd/Ctrl + E: Export data
        if (e.key === "e" || e.key === "E") {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("xhs-export"));
          return;
        }
      }

      // Don't register non-meta shortcuts while typing
      if (isTyping) return;
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setActiveTab, setAddAccountDialogOpen]);

  // This component doesn't render anything
  return null;
}
