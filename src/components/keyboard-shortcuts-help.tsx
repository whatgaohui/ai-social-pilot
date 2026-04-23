"use client";

import { useState, useEffect, useCallback, useMemo, useRef, type ComponentType } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  CalendarDays,
  FileText,
  BarChart3,
  User,
  Settings,
  CircleX,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Plus,
  Save,
  Sparkles,
  ArrowLeftRight,
  Repeat,
  LayoutGrid,
  Command,
  HelpCircle,
  Pencil,
  Sliders,
  X,
  Check,
  BrainCircuit,
  Globe,
  Zap,
  Download,
  Upload,
  FileSearch,
  Moon,
  SunMedium,
  List,
  BookOpen,
} from "lucide-react";
import { SHORTCUT_LIST } from "@/hooks/use-keyboard-shortcuts";

/* ─── Types ───────────────────────────────────────────────────── */

interface ShortcutItem {
  id: string;
  keys: string[];
  description: string;
  icon: ComponentType<{ className?: string }>;
  category: string;
  context?: string;
}

interface ShortcutCategory {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  color: string;
}

/* ─── Constants ───────────────────────────────────────────────── */

const CUSTOM_SHORTCUTS_KEY = "custom-shortcuts";
const SHORTCUT_TIPS_DISMISSED_KEY = "shortcut-tips-dismissed";

const CATEGORIES: ShortcutCategory[] = [
  { id: "global", label: "全局", icon: Command, color: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20" },
  { id: "edit", label: "编辑", icon: FileText, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  { id: "ai", label: "AI", icon: Sparkles, color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  { id: "nav", label: "导航", icon: LayoutGrid, color: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20" },
  { id: "platform", label: "平台", icon: Repeat, color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
  { id: "calendar", label: "日历", icon: CalendarDays, color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  { id: "settings", label: "设置", icon: Settings, color: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20" },
];

const DEFAULT_SHORTCUTS: ShortcutItem[] = [
  { id: "search", keys: ["⌘", "K"], description: "命令面板", icon: Search, category: "global" },
  { id: "help", keys: ["⌘", "/"], description: "快捷键帮助", icon: Command, category: "global" },
  { id: "help-question", keys: ["?"], description: "快捷键帮助", icon: HelpCircle, category: "global" },
  { id: "settings", keys: ["⌘", ","], description: "设置中心", icon: Settings, category: "global" },
  { id: "escape", keys: ["Esc"], description: "关闭弹窗 / 取消操作", icon: CircleX, category: "global" },
  { id: "new-post", keys: ["⌘", "N"], description: "新建内容", icon: Plus, category: "edit" },
  { id: "save", keys: ["⌘", "S"], description: "保存草稿", icon: Save, category: "edit" },
  { id: "ai-generate", keys: ["⌘", "⏎"], description: "AI 生成内容", icon: Sparkles, category: "ai" },
  { id: "ai-optimize", keys: ["⌘", "O"], description: "AI 优化内容", icon: BrainCircuit, category: "ai" },
  { id: "ai-score", keys: ["⌘", "E"], description: "AI 质量评分", icon: BarChart3, category: "ai" },
  { id: "panel-persona", keys: ["⌘", "1"], description: "知识库 / 人设面板", icon: User, category: "nav" },
  { id: "panel-calendar", keys: ["⌘", "2"], description: "日历面板", icon: CalendarDays, category: "nav" },
  { id: "panel-workspace", keys: ["⌘", "3"], description: "工作台", icon: FileText, category: "nav" },
  { id: "panel-data", keys: ["⌘", "4"], description: "数据与报告", icon: BarChart3, category: "nav" },
  { id: "switch-platform", keys: ["⌘", "⇧", "P"], description: "切换平台（朋友圈 / 小红书）", icon: ArrowLeftRight, category: "platform" },
  { id: "tab-prev", keys: ["←"], description: "切换 Tab 标签页", icon: ArrowLeft, category: "nav", context: "calendar" },
  { id: "tab-next", keys: ["→"], description: "切换 Tab 标签页", icon: ArrowRight, category: "nav", context: "calendar" },
  { id: "list-up", keys: ["↑"], description: "选择列表项", icon: ArrowUp, category: "nav" },
  { id: "list-down", keys: ["↓"], description: "选择列表项", icon: ArrowDown, category: "nav" },
  { id: "today", keys: ["T"], description: "回到今天", icon: CalendarDays, category: "calendar", context: "calendar" },
  { id: "view-toggle", keys: ["G"], description: "切换网格 / 列表视图", icon: LayoutGrid, category: "calendar", context: "calendar" },
  { id: "dark-mode", keys: ["⌘", "D"], description: "切换暗黑模式", icon: Moon, category: "settings" },
  { id: "export", keys: ["⌘", "⇧", "E"], description: "导出数据", icon: Download, category: "settings" },
  { id: "search-content", keys: ["⌘", "F"], description: "搜索内容", icon: FileSearch, category: "global" },
  { id: "knowledge", keys: ["⌘", "⇧", "K"], description: "搜索知识库", icon: BookOpen, category: "ai" },
  { id: "batch-generate", keys: ["⌘", "G"], description: "批量生成内容", icon: Zap, category: "ai" },
];

const TOP_SHORTCUTS = DEFAULT_SHORTCUTS.slice(0, 6);

/* ─── Custom localStorage hook ────────────────────────────────── */

function useCustomShortcuts() {
  const [custom, setCustom] = useState<Record<string, string[]>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const stored = localStorage.getItem(CUSTOM_SHORTCUTS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const setShortcut = useCallback((id: string, keys: string[]) => {
    setCustom((prev) => {
      const next = { ...prev, [id]: keys };
      localStorage.setItem(CUSTOM_SHORTCUTS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetShortcut = useCallback((id: string) => {
    setCustom((prev) => {
      const next = { ...prev };
      delete next[id];
      localStorage.setItem(CUSTOM_SHORTCUTS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const getKeys = useCallback(
    (id: string) => {
      return custom[id] || DEFAULT_SHORTCUTS.find((s) => s.id === id)?.keys || [];
    },
    [custom],
  );

  return { custom, setShortcut, resetShortcut, getKeys };
}

/* ─── Keyboard Key Cap Display ────────────────────────────────── */

function KeyCap({ children }: { children: string }) {
  return (
    <kbd className="keyboard-key">
      {children}
    </kbd>
  );
}

/* ─── Shortcut Row ────────────────────────────────────────────── */

function ShortcutRow({
  shortcut,
  currentKeys,
  onStartEdit,
  onReset,
}: {
  shortcut: ShortcutItem;
  currentKeys: string[];
  onStartEdit: () => void;
  onReset: () => void;
}) {
  const Icon = shortcut.icon;
  const isCustomized =
    currentKeys.join("+") !== shortcut.keys.join("+");

  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors group">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-7 w-7 rounded-md bg-muted/60 flex items-center justify-center flex-shrink-0">
          <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>
        <div className="min-w-0">
          <span className="text-[13px] text-foreground/80 truncate block">
            {shortcut.description}
          </span>
          {shortcut.context && (
            <span className="text-[10px] text-muted-foreground/50">仅限 {shortcut.context} 视图</span>
          )}
        </div>
        {isCustomized && (
          <Badge
            variant="outline"
            className="text-[9px] px-1.5 py-0 h-4 bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400 flex-shrink-0"
          >
            自定义
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 ml-3">
        {currentKeys.map((key, i) => (
          <span key={i} className="flex items-center gap-0.5">
            <KeyCap>{key}</KeyCap>
            {i < currentKeys.length - 1 && (
              <span className="text-[10px] text-muted-foreground/50 mx-0.5">+</span>
            )}
          </span>
        ))}
        <button
          className="ml-1 h-6 w-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
          onClick={onStartEdit}
          title="自定义快捷键"
          aria-label={`自定义 ${shortcut.description} 的快捷键`}
        >
          <Pencil className="h-3 w-3 text-muted-foreground" />
        </button>
        {isCustomized && (
          <button
            className="h-6 w-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
            onClick={onReset}
            title="恢复默认"
            aria-label={`恢复 ${shortcut.description} 的默认快捷键`}
          >
            <Sliders className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Key Recorder Dialog ─────────────────────────────────────── */

function KeyRecorderDialog({
  shortcutId,
  currentKeys,
  isOpen,
  onClose,
  onSave,
}: {
  shortcutId: string;
  currentKeys: string[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (keys: string[]) => void;
}) {
  const [recordedKeys, setRecordedKeys] = useState<string[]>(currentKeys);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const raf = requestAnimationFrame(() => {
      setRecordedKeys(currentKeys);
      setIsRecording(true);
    });
    return () => cancelAnimationFrame(raf);
  }, [isOpen, currentKeys]);

  useEffect(() => {
    if (!isRecording) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const keys: string[] = [];
      if (e.metaKey || e.ctrlKey) keys.push("⌘");
      if (e.shiftKey) keys.push("⇧");
      if (e.altKey) keys.push("⌥");
      if (!["Meta", "Control", "Shift", "Alt", "Escape"].includes(e.key)) {
        let keyLabel = e.key;
        if (keyLabel === " ") keyLabel = "Space";
        else if (keyLabel === "Enter") keyLabel = "⏎";
        else if (keyLabel === "Backspace") keyLabel = "⌫";
        else if (keyLabel === "Tab") keyLabel = "⇥";
        else if (keyLabel.length === 1) keyLabel = keyLabel.toUpperCase();
        keys.push(keyLabel);
      }
      if (keys.length > 0 && keys[keys.length - 1] !== "⌘" && keys[keys.length - 1] !== "⇧") {
        setRecordedKeys(keys);
        setIsRecording(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isRecording]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[360px] p-0 overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <DialogHeader>
            <DialogTitle className="text-sm">录制快捷键</DialogTitle>
            <DialogDescription className="text-[11px] mt-1">
              {isRecording ? "请按下新的快捷键组合..." : "已捕获快捷键"}
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="px-6 pb-4">
          <div className="flex items-center justify-center gap-2 py-6 rounded-lg bg-muted/30 border border-dashed border-border">
            {recordedKeys.length > 0 ? (
              recordedKeys.map((key, i) => (
                <span key={i} className="flex items-center gap-1">
                  <KeyCap>{key}</KeyCap>
                  {i < recordedKeys.length - 1 && <span className="text-muted-foreground/50">+</span>}
                </span>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">{isRecording ? "等待输入..." : "无"}</span>
            )}
            {isRecording && (
              <motion.div
                className="h-2 w-2 rounded-full bg-violet-500"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
          </div>
        </div>
        <div className="px-6 pb-6 flex items-center gap-2 justify-end">
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onClose}>
            取消
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white"
            onClick={() => onSave(recordedKeys)}
            disabled={recordedKeys.length === 0 || isRecording}
          >
            保存
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── KeyboardShortcutsHelp Component ─────────────────────────── */

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsHelp({ open, onOpenChange }: KeyboardShortcutsHelpProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { setShortcut, resetShortcut, getKeys } = useCustomShortcuts();

  const filteredShortcuts = useMemo(() => {
    let result = DEFAULT_SHORTCUTS;

    if (activeCategory) {
      result = result.filter((s) => s.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.description.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          s.keys.join("+").toLowerCase().includes(q),
      );
    }

    return result;
  }, [searchQuery, activeCategory]);

  // Group filtered shortcuts by category
  const groupedShortcuts = useMemo(() => {
    const groups = new Map<string, ShortcutItem[]>();
    for (const s of filteredShortcuts) {
      const cat = s.category;
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(s);
    }
    return groups;
  }, [filteredShortcuts]);

  const handleSaveKeys = useCallback(
    (id: string, keys: string[]) => {
      setShortcut(id, keys);
      setEditingId(null);
    },
    [setShortcut],
  );

  const handleResetKeys = useCallback(
    (id: string) => {
      resetShortcut(id);
    },
    [resetShortcut],
  );

  // Focus search input when dialog opens
  const searchInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[580px] p-0 overflow-hidden gap-0">
          {/* Gradient header */}
          <div className="relative px-6 pt-6 pb-4 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 dark:from-violet-700 dark:via-purple-700 dark:to-fuchsia-700">
            <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle_at_30%_20%,white_1px,transparent_1px),radial-gradient(circle_at_70%_60%,white_1px,transparent_1px)] bg-[length:20px_20px]" />
            <DialogHeader className="relative">
              <DialogTitle className="flex items-center gap-2.5 text-base text-white">
                <div className="h-8 w-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
                  <Command className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold">键盘快捷键</span>
                <span className="ml-auto text-[10px] text-white/50 font-normal">
                  {DEFAULT_SHORTCUTS.length} 个快捷键
                </span>
              </DialogTitle>
              <DialogDescription className="text-[11px] text-white/70 mt-1">
                使用快捷键提升操作效率 · 点击
                <Pencil className="inline h-3 w-3 mx-0.5" />
                可自定义
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Search */}
          <div className="px-4 pt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索快捷键..."
                className="pl-9 h-9 text-xs bg-muted/30"
                aria-label="搜索快捷键"
              />
              {searchQuery && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full flex items-center justify-center hover:bg-muted"
                  onClick={() => setSearchQuery("")}
                  aria-label="清除搜索"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Category filters */}
          {!searchQuery && (
            <div className="flex gap-1 px-4 pt-2 overflow-x-auto scrollbar-none pb-1" role="tablist" aria-label="快捷键分类">
              <button
                className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${
                  !activeCategory
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                onClick={() => setActiveCategory(null)}
                role="tab"
                aria-selected={!activeCategory}
              >
                全部
              </button>
              {CATEGORIES.map((cat) => {
                const CatIcon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${
                      activeCategory === cat.id
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                    onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                    role="tab"
                    aria-selected={activeCategory === cat.id}
                  >
                    <CatIcon className="h-3 w-3" />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Shortcut groups */}
          <ScrollArea className="max-h-[50vh]">
            <div className="px-4 py-3" role="tabpanel">
              {Array.from(groupedShortcuts.entries()).map(([catId, shortcuts], catIndex) => {
                const cat = CATEGORIES.find((c) => c.id === catId);
                if (!cat) return null;
                const CatIcon = cat.icon;
                return (
                  <div key={catId}>
                    {catIndex > 0 && <Separator className="my-3" />}
                    <div className="flex items-center gap-2 mb-2.5 px-2">
                      <CatIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 py-0 font-semibold border ${cat.color}`}
                      >
                        {cat.label}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground/60">
                        {shortcuts.length} 个
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {shortcuts.map((shortcut) => (
                        <ShortcutRow
                          key={shortcut.id}
                          shortcut={shortcut}
                          currentKeys={getKeys(shortcut.id)}
                          onStartEdit={() => setEditingId(shortcut.id)}
                          onReset={() => handleResetKeys(shortcut.id)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
              {filteredShortcuts.length === 0 && (
                <div className="flex flex-col items-center py-8 text-muted-foreground">
                  <Search className="h-6 w-6 mb-2 opacity-30" />
                  <span className="text-xs">未找到匹配的快捷键</span>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="px-6 py-3 border-t bg-muted/30">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground">
                macOS: <kbd className="keyboard-key text-[9px]">⌘</kbd> · Windows: <kbd className="keyboard-key text-[9px]">Ctrl</kbd>
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] text-amber-600 dark:text-amber-400"
                onClick={() => {
                  localStorage.removeItem(CUSTOM_SHORTCUTS_KEY);
                  window.location.reload();
                }}
              >
                <Sliders className="h-3 w-3 mr-1" />
                重置所有
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Key recorder */}
      {editingId && (
        <KeyRecorderDialog
          shortcutId={editingId}
          currentKeys={getKeys(editingId)}
          isOpen={editingId !== null}
          onClose={() => setEditingId(null)}
          onSave={(keys) => handleSaveKeys(editingId, keys)}
        />
      )}
    </>
  );
}
