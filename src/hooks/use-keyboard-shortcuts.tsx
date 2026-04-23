"use client";

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useRef,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import { useAppStore } from "@/store/app-store";

// ─── Types ─────────────────────────────────────────────────────────────────────

/** Key combination representation */
export interface KeyCombo {
  /** Ctrl (Windows/Linux) or Meta/Cmd (macOS) */
  mod?: boolean;
  /** Shift key */
  shift?: boolean;
  /** Alt/Option key */
  alt?: boolean;
  /** The key to match (e.g. "k", "/", "1", "Enter") */
  key: string;
}

/** A registered shortcut */
export interface ShortcutRegistration {
  /** Unique identifier */
  id: string;
  /** Key combination */
  combo: KeyCombo;
  /** Human-readable label */
  label: string;
  /** Category for grouping */
  category: "全局" | "日历" | "编辑" | "导航" | "AI" | "平台" | "设置";
  /** Brief description */
  description: string;
  /** Handler function */
  handler: () => void;
  /** Whether to skip when input/textarea is focused (default: true) */
  skipInInput?: boolean;
  /** Priority (higher = checked first, default: 0) */
  priority?: number;
  /** Whether this shortcut is currently enabled */
  enabled?: boolean;
}

/** Callbacks for the main keyboard hook */
interface ShortcutCallbacks {
  onOpenCommandPalette?: () => void;
  onOpenShortcuts?: () => void;
  onTogglePlatform?: () => void;
  onSave?: () => void;
  onSaveAndClose?: () => void;
  onToggleBold?: () => void;
}

interface ShortcutManagerState {
  registrations: ShortcutRegistration[];
  register: (shortcut: ShortcutRegistration) => () => void;
  unregister: (id: string) => void;
  /** Check if a key combo conflicts with existing shortcuts */
  getConflicts: (combo: KeyCombo, excludeId?: string) => ShortcutRegistration[];
  /** Get all shortcuts as display data */
  getAllShortcuts: () => Array<{
    keys: string[];
    label: string;
    description: string;
    category: string;
  }>;
}

// ─── Context ───────────────────────────────────────────────────────────────────

const ShortcutManagerContext = createContext<ShortcutManagerState | null>(null);

export function useShortcutManager() {
  const ctx = useContext(ShortcutManagerContext);
  if (!ctx) {
    throw new Error("useShortcutManager must be used within <ShortcutManagerProvider>");
  }
  return ctx;
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

/** Convert a combo to a unique string key for comparison */
export function comboToKey(combo: KeyCombo): string {
  const parts: string[] = [];
  if (combo.mod) parts.push("mod");
  if (combo.shift) parts.push("shift");
  if (combo.alt) parts.push("alt");
  parts.push(combo.key.toLowerCase());
  return parts.join("+");
}

/** Convert combo to human-readable key display */
function comboToDisplay(combo: KeyCombo): string[] {
  const keys: string[] = [];
  if (combo.mod) keys.push("⌘");
  if (combo.shift) keys.push("⇧");
  if (combo.alt) keys.push("⌥");
  if (combo.key === "Enter") keys.push("⏎");
  else if (combo.key === "Escape") keys.push("Esc");
  else if (combo.key === "/") keys.push("/");
  else if (combo.key === " ") keys.push("Space");
  else if (combo.key.length === 1) keys.push(combo.key.toUpperCase());
  else keys.push(combo.key);
  return keys;
}

/** Match a keyboard event against a combo */
function matchesCombo(e: KeyboardEvent, combo: KeyCombo): boolean {
  const mod = e.metaKey || e.ctrlKey;
  if (combo.mod ? !mod : mod) return false;
  if (combo.shift ? !e.shiftKey : e.shiftKey) return false;
  if (combo.alt ? !e.altKey : e.altKey) return false;

  const eventKey = e.key;
  const comboKey = combo.key;

  // Handle special keys
  if (comboKey === "Enter") return eventKey === "Enter";
  if (comboKey === "Escape") return eventKey === "Escape";
  if (comboKey === " ") return eventKey === " ";
  if (comboKey.length === 1) return eventKey.toLowerCase() === comboKey.toLowerCase();
  return eventKey === comboKey;
}

// ─── Provider ──────────────────────────────────────────────────────────────────

export function ShortcutManagerProvider({ children }: { children: ReactNode }) {
  const registrationsRef = useRef<Map<string, ShortcutRegistration>>(new Map());
  const [registrations, setRegistrations] = useState<ShortcutRegistration[]>([]);

  const register = useCallback((shortcut: ShortcutRegistration) => {
    registrationsRef.current.set(shortcut.id, shortcut);
    setRegistrations(Array.from(registrationsRef.current.values()));
    // Return unregister function
    return () => {
      registrationsRef.current.delete(shortcut.id);
      setRegistrations(Array.from(registrationsRef.current.values()));
    };
  }, []);

  const unregister = useCallback((id: string) => {
    registrationsRef.current.delete(id);
    setRegistrations(Array.from(registrationsRef.current.values()));
  }, []);

  const getConflicts = useCallback(
    (combo: KeyCombo, excludeId?: string): ShortcutRegistration[] => {
      const targetKey = comboToKey(combo);
      const conflicts: ShortcutRegistration[] = [];
      for (const [id, reg] of registrationsRef.current.entries()) {
        if (id === excludeId) continue;
        if (reg.comboToKey === targetKey) {
          if (matchesCombo({} as KeyboardEvent, combo)) {
            conflicts.push(reg);
          }
        }
      }
      return conflicts;
    },
    [],
  );

  const getAllShortcuts = useCallback(() => {
    return Array.from(registrationsRef.current.values())
      .filter((r) => r.enabled !== false)
      .map((r) => ({
        keys: comboToDisplay(r.combo),
        label: r.label,
        description: r.description,
        category: r.category,
      }));
  }, []);

  const value = useMemo(
    () => ({ registrations, register, unregister, getConflicts, getAllShortcuts }),
    [registrations, register, unregister, getConflicts, getAllShortcuts],
  );

  return (
    <ShortcutManagerContext.Provider value={value}>
      {children}
    </ShortcutManagerContext.Provider>
  );
}

// ─── Main Keyboard Shortcuts Hook ─────────────────────────────────────────────

/**
 * Global keyboard shortcuts hook.
 *
 * Global (when no input is focused):
 *   Cmd/Ctrl + K       → command palette
 *   Cmd/Ctrl + /       → shortcuts help
 *   Cmd/Ctrl + ,       → settings
 *   Cmd/Ctrl + Shift+P → toggle platform
 *   Cmd/Ctrl + 1-4     → panel switching
 *
 * Context (when editing — always fires):
 *   Cmd/Ctrl + S       → save
 *   Cmd/Ctrl + Enter   → save & close
 *   Cmd/Ctrl + B       → bold
 */
export function useKeyboardShortcuts(callbacks: ShortcutCallbacks) {
  const {
    setRightPanelTab,
    setLeftPanelTab,
    setPlatform,
    platform,
    setSettingsCenterOpen,
  } = useAppStore();
  const callbacksRef = useRef(callbacks);

  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const inInput = isEditableTarget(e);

      // ── Escape: delegate to native dialog dismiss ───────────────────────
      if (e.key === "Escape") return;

      // ── Global bindings (skipped in input) ─────────────────────────────
      if (!inInput) {
        const globalChecks: Array<{ combo: KeyCombo; handler: () => void }> = [
          { combo: { mod: true, key: "k" }, handler: () => callbacksRef.current.onOpenCommandPalette?.() },
          { combo: { mod: true, key: "/" }, handler: () => callbacksRef.current.onOpenShortcuts?.() },
          { combo: { mod: true, key: "," }, handler: () => setSettingsCenterOpen(true) },
          { combo: { mod: true, shift: true, key: "P" }, handler: () => setPlatform(platform === "wechat" ? "xiaohongshu" : "wechat") },
          { combo: { mod: true, key: "1" }, handler: () => setLeftPanelTab("knowledge") },
          { combo: { mod: true, key: "2" }, handler: () => setLeftPanelTab("calendar") },
          { combo: { mod: true, key: "3" }, handler: () => setRightPanelTab("workspace") },
          { combo: { mod: true, key: "4" }, handler: () => setRightPanelTab("data") },
          { combo: { mod: true, key: "n" }, handler: () => { setRightPanelTab("workspace"); } },
        ];

        for (const check of globalChecks) {
          if (matchesCombo(e, check.combo)) {
            e.preventDefault();
            check.handler();
            return;
          }
        }
      }

      // ── Context bindings (fire even in input) ──────────────────────────
      const contextChecks: Array<{ combo: KeyCombo; handler: () => void; always: boolean }> = [
        { combo: { mod: true, key: "s" }, handler: () => { e.preventDefault(); callbacksRef.current.onSave?.(); }, always: true },
        { combo: { mod: true, key: "Enter" }, handler: () => callbacksRef.current.onSaveAndClose?.(), always: true },
        { combo: { mod: true, key: "b" }, handler: () => callbacksRef.current.onToggleBold?.(), always: true },
      ];

      for (const check of contextChecks) {
        if (check.always || inInput) {
          if (matchesCombo(e, check.combo)) {
            check.handler();
            return;
          }
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

// ─── Shortcut conflict detection hook ─────────────────────────────────────────

export function useShortcutConflict(combo: KeyCombo | null, excludeId?: string) {
  const { getConflicts } = useShortcutManager();

  const conflicts = useMemo(() => {
    if (!combo) return [];
    return getConflicts(combo, excludeId);
  }, [combo, excludeId, getConflicts]);

  return conflicts;
}

/** Human-readable shortcut descriptions for the help panel. */
export const SHORTCUT_LIST = [
  { keys: ["⌘", "K"], label: "命令面板", description: "搜索命令、内容和操作", category: "全局" },
  { keys: ["⌘", "/"], label: "快捷键帮助", description: "显示所有快捷键", category: "全局" },
  { keys: ["⌘", ","], label: "设置中心", description: "打开应用设置", category: "全局" },
  { keys: ["Esc"], label: "关闭弹窗", description: "关闭对话框或面板", category: "全局" },
  { keys: ["?"], label: "快捷键帮助", description: "快速打开帮助面板", category: "全局" },
  { keys: ["⌘", "N"], label: "新建内容", description: "创建新内容草稿", category: "编辑" },
  { keys: ["⌘", "S"], label: "保存草稿", description: "保存当前编辑内容", category: "编辑" },
  { keys: ["⌘", "Enter"], label: "AI 生成", description: "AI 生成/优化内容", category: "AI" },
  { keys: ["⌘", "1"], label: "知识库面板", description: "切换到知识库/人设", category: "导航" },
  { keys: ["⌘", "2"], label: "日历面板", description: "切换到日历视图", category: "导航" },
  { keys: ["⌘", "3"], label: "工作台", description: "切换到内容工作台", category: "导航" },
  { keys: ["⌘", "4"], label: "数据面板", description: "切换到数据与报告", category: "导航" },
  { keys: ["⌘", "⇧", "P"], label: "切换平台", description: "朋友圈 ↔ 小红书", category: "平台" },
  { keys: ["←", "→"], label: "切换Tab", description: "导航切换面板标签", category: "导航" },
  { keys: ["↑", "↓"], label: "选择列表项", description: "上下选择内容", category: "导航" },
  { keys: ["T"], label: "回到今天", description: "日历中回到当天", category: "日历" },
  { keys: ["G"], label: "切换视图", description: "日历中切换网格/列表视图", category: "日历" },
] as const;
