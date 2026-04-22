"use client";

import { useEffect, useCallback, useRef } from "react";
import { useAppStore } from "@/store/app-store";

interface ShortcutCallbacks {
  /** Open the command palette */
  onOpenCommandPalette?: () => void;
  /** Save content (context shortcut) */
  onSave?: () => void;
  /** Save and close editor (context shortcut) */
  onSaveAndClose?: () => void;
  /** Toggle bold in editor (context shortcut) */
  onToggleBold?: () => void;
}

/**
 * Global keyboard shortcuts hook.
 *
 * Global:
 *   Cmd/Ctrl + K   → command palette
 *   Cmd/Ctrl + /   → toggle dark mode
 *   Cmd/Ctrl + 1   → focus left panel
 *   Cmd/Ctrl + 2   → focus main panel
 *   Cmd/Ctrl + 3   → focus right panel (data)
 *   Escape          → delegates to native dialog dismiss
 *
 * Context (when editing):
 *   Cmd/Ctrl + S       → save
 *   Cmd/Ctrl + Enter   → save & close
 *   Cmd/Ctrl + B       → bold
 */
export function useKeyboardShortcuts(callbacks: ShortcutCallbacks) {
  const { setRightPanelTab, setLeftPanelTab } = useAppStore();
  const callbacksRef = useRef(callbacks);

  // Keep ref in sync
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // ── Cmd/Ctrl + K: command palette ──────────────────────────────────
      if (mod && e.key === "k") {
        e.preventDefault();
        callbacksRef.current.onOpenCommandPalette?.();
        return;
      }

      // ── Cmd/Ctrl + /: toggle dark mode ─────────────────────────────────
      if (mod && e.key === "/") {
        e.preventDefault();
        document.documentElement.classList.toggle("dark");
        return;
      }

      // ── Cmd/Ctrl + 1: left panel ──────────────────────────────────────
      if (mod && e.key === "1") {
        e.preventDefault();
        setLeftPanelTab("knowledge");
        return;
      }

      // ── Cmd/Ctrl + 2: main / workspace ────────────────────────────────
      if (mod && e.key === "2") {
        e.preventDefault();
        setRightPanelTab("workspace");
        return;
      }

      // ── Cmd/Ctrl + 3: data tab ────────────────────────────────────────
      if (mod && e.key === "3") {
        e.preventDefault();
        setRightPanelTab("data");
        return;
      }

      // ── Cmd/Ctrl + S: save ────────────────────────────────────────────
      if (mod && e.key === "s") {
        e.preventDefault();
        callbacksRef.current.onSave?.();
        return;
      }

      // ── Cmd/Ctrl + Enter: save & close ────────────────────────────────
      if (mod && e.key === "Enter") {
        e.preventDefault();
        callbacksRef.current.onSaveAndClose?.();
        return;
      }

      // ── Cmd/Ctrl + B: bold ────────────────────────────────────────────
      if (mod && e.key === "b") {
        e.preventDefault();
        callbacksRef.current.onToggleBold?.();
        return;
      }
    },
    [setRightPanelTab, setLeftPanelTab],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Show shortcut hint toast on first visit
  useEffect(() => {
    const seen = localStorage.getItem("shortcut-hint-seen");
    if (!seen) {
      const timer = setTimeout(() => {
        localStorage.setItem("shortcut-hint-seen", "true");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);
}

/** Human-readable shortcut descriptions for the help panel. */
export const SHORTCUT_LIST = [
  { keys: ["⌘", "K"], label: "打开命令面板", description: "搜索内容和快速操作" },
  { keys: ["⌘", "/"], label: "切换深色模式", description: "明暗主题切换" },
  { keys: ["⌘", "1"], label: "切换到知识库", description: "左侧面板" },
  { keys: ["⌘", "2"], label: "切换到工作台", description: "主要内容面板" },
  { keys: ["⌘", "3"], label: "切换到数据", description: "数据与报告" },
  { keys: ["⌘", "S"], label: "保存内容", description: "编辑时保存" },
  { keys: ["⌘", "Enter"], label: "保存并关闭", description: "编辑器" },
  { keys: ["⌘", "B"], label: "加粗", description: "编辑器" },
  { keys: ["Esc"], label: "关闭弹窗", description: "关闭对话框或面板" },
] as const;
