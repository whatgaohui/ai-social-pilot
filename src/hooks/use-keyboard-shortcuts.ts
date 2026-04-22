"use client";

import { useEffect, useCallback, useRef } from "react";
import { useAppStore } from "@/store/app-store";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ShortcutCallbacks {
  /** Open the command palette */
  onOpenCommandPalette?: () => void;
  /** Open keyboard shortcuts help */
  onOpenShortcuts?: () => void;
  /** Toggle platform (wechat ↔ xiaohongshu) */
  onTogglePlatform?: () => void;
  /** Save content (context shortcut) */
  onSave?: () => void;
  /** Save and close editor (context shortcut) */
  onSaveAndClose?: () => void;
  /** Toggle bold in editor (context shortcut) */
  onToggleBold?: () => void;
}

interface KeyBinding {
  /** modifier keys: meta (macOS) or ctrl (Windows/Linux) */
  mod?: boolean;
  /** shift key */
  shift?: boolean;
  /** the key to match (e.g. "k", "/", "1") */
  key: string;
  /** callback when triggered */
  handler: () => void;
  /** whether to skip when input/textarea is focused (default: true) */
  skipInInput?: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const INPUT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);
const EDITABLE_ROLES = new Set(["textbox", "search", "combobox", "spinbutton"]);

function isEditableTarget(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement;
  if (!target) return false;
  if (INPUT_TAGS.has(target.tagName)) return true;
  if (target.isContentEditable) return true;
  if (EDITABLE_ROLES.has(target.getAttribute("role") || "")) return true;
  return false;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Global keyboard shortcuts hook.
 *
 * Global (when no input is focused):
 *   Cmd/Ctrl + K       → command palette
 *   Cmd/Ctrl + /       → shortcuts help
 *   Cmd/Ctrl + ,       → settings
 *   Cmd/Ctrl + Shift+P → toggle platform
 *   Cmd/Ctrl + 1       → left panel: knowledge tab
 *   Cmd/Ctrl + 2       → left panel: calendar tab
 *   Cmd/Ctrl + 3       → right panel: workspace tab
 *   Cmd/Ctrl + 4       → right panel: data tab
 *   Escape              → delegates to native dialog dismiss
 *
 * Context (when editing — always fires):
 *   Cmd/Ctrl + S       → save
 *   Cmd/Ctrl + Enter   → save & close
 *   Cmd/Ctrl + B       → bold
 */
export function useKeyboardShortcuts(callbacks: ShortcutCallbacks) {
  const { setRightPanelTab, setLeftPanelTab, setPlatform, platform, setSettingsCenterOpen } =
    useAppStore();
  const callbacksRef = useRef(callbacks);

  // Keep ref in sync
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const inInput = isEditableTarget(e);

      // ── Escape: close any open dialog/sheet ───────────────────────────
      if (e.key === "Escape") {
        // Native Dialog/Sheet from radix handles Escape itself.
        // Only handle if nothing consumed it.
        // Let the browser handle native dismissal; no preventDefault.
        return;
      }

      // ── Build key binding list ────────────────────────────────────────

      // These shortcuts are skipped when an input/textarea is focused
      const globalBindings: KeyBinding[] = [
        {
          mod: true,
          key: "k",
          handler: () => callbacksRef.current.onOpenCommandPalette?.(),
        },
        {
          mod: true,
          key: "/",
          handler: () => callbacksRef.current.onOpenShortcuts?.(),
        },
        {
          mod: true,
          key: ",",
          handler: () => setSettingsCenterOpen(true),
        },
        {
          mod: true,
          shift: true,
          key: "P",
          handler: () => {
            setPlatform(platform === "wechat" ? "xiaohongshu" : "wechat");
          },
        },
        {
          mod: true,
          key: "1",
          handler: () => setLeftPanelTab("knowledge"),
        },
        {
          mod: true,
          key: "2",
          handler: () => setLeftPanelTab("calendar"),
        },
        {
          mod: true,
          key: "3",
          handler: () => setRightPanelTab("workspace"),
        },
        {
          mod: true,
          key: "4",
          handler: () => setRightPanelTab("data"),
        },
      ];

      // These shortcuts fire even in input/textarea (for editor context)
      const contextBindings: KeyBinding[] = [
        {
          mod: true,
          key: "s",
          handler: () => {
            e.preventDefault();
            callbacksRef.current.onSave?.();
          },
          skipInInput: false,
        },
        {
          mod: true,
          key: "Enter",
          handler: () => {
            callbacksRef.current.onSaveAndClose?.();
          },
          skipInInput: false,
        },
        {
          mod: true,
          key: "b",
          handler: () => {
            callbacksRef.current.onToggleBold?.();
          },
          skipInInput: false,
        },
      ];

      // ── Check global bindings ─────────────────────────────────────────
      if (!inInput) {
        for (const binding of globalBindings) {
          const modMatch = binding.mod ? mod : !mod;
          const shiftMatch = binding.shift ? e.shiftKey : !e.shiftKey;
          const keyMatch = e.key === binding.key;

          if (modMatch && shiftMatch && keyMatch) {
            e.preventDefault();
            binding.handler();
            return;
          }
        }
      }

      // ── Check context bindings ────────────────────────────────────────
      for (const binding of contextBindings) {
        if (binding.skipInInput === false && !inInput) continue; // skip if NOT in input

        const modMatch = binding.mod ? mod : !mod;
        const shiftMatch = binding.shift ? e.shiftKey : !e.shiftKey;
        const keyMatch = e.key === binding.key;

        if (modMatch && shiftMatch && keyMatch) {
          binding.handler();
          return;
        }
      }
    },
    [setRightPanelTab, setLeftPanelTab, setPlatform, platform, setSettingsCenterOpen],
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
  { keys: ["⌘", "K"], label: "打开命令面板", description: "搜索内容和快速操作", category: "通用" },
  { keys: ["⌘", "/"], label: "快捷键帮助", description: "显示所有快捷键", category: "通用" },
  { keys: ["⌘", ","], label: "打开设置", description: "设置中心", category: "通用" },
  { keys: ["Esc"], label: "关闭弹窗", description: "关闭对话框或面板", category: "通用" },
  { keys: ["⌘", "N"], label: "新建帖子", description: "创建新内容", category: "内容" },
  { keys: ["⌘", "S"], label: "保存草稿", description: "保存当前编辑", category: "内容" },
  { keys: ["⌘", "Enter"], label: "AI生成", description: "AI生成/优化内容", category: "内容" },
  { keys: ["⌘", "1"], label: "人设面板", description: "切换到知识库/人设", category: "视图" },
  { keys: ["⌘", "2"], label: "日历面板", description: "切换到日历", category: "视图" },
  { keys: ["⌘", "3"], label: "工作台", description: "切换到内容工作台", category: "视图" },
  { keys: ["⌘", "4"], label: "数据面板", description: "切换到数据与报告", category: "视图" },
  { keys: ["⌘", "⇧", "P"], label: "切换平台", description: "朋友圈 ↔ 小红书", category: "平台" },
  { keys: ["←", "→"], label: "切换Tab", description: "导航切换面板标签", category: "导航" },
  { keys: ["↑", "↓"], label: "选择列表项", description: "上下选择内容", category: "导航" },
  { keys: ["←", "→"], label: "切换月/周", description: "日历中切换月份或周", category: "日历" },
  { keys: ["T"], label: "回到今天", description: "日历中回到当天", category: "日历" },
  { keys: ["G"], label: "切换视图", description: "日历中切换网格/列表视图", category: "日历" },
] as const;
