"use client";

import { useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Pencil,
  Copy,
  Trash2,
  Sparkles,
  BarChart3,
  CalendarPlus,
  Search,
  Tag,
  Eye,
  ArrowRight,
  ChevronRight,
  Wand2,
  FileText,
  RefreshCw,
  BookOpen,
  Bot,
  type LucideIcon,
} from "lucide-react";

/* ─── Types ───────────────────────────────────────────────────── */

interface ContextMenuItemDef {
  id: string;
  label: string;
  icon?: LucideIcon;
  shortcut?: string;
  disabled?: boolean;
  variant?: "default" | "destructive";
  separator?: boolean;
  onClick?: () => void;
  submenu?: ContextMenuItemDef[];
}

type ContextMenuType = "post" | "calendar" | "knowledge" | "general";

/* ─── Menu Definitions ────────────────────────────────────────── */

const POST_MENU: ContextMenuItemDef[] = [
  { id: "edit", label: "编辑", icon: Pencil, shortcut: "⌘E" },
  { id: "copy", label: "复制", icon: Copy, shortcut: "⌘C" },
  { id: "delete", label: "删除", icon: Trash2, variant: "destructive", separator: true },
  { id: "optimize", label: "AI优化", icon: Wand2, shortcut: "⌘O", separator: true },
  { id: "score", label: "AI评分", icon: BarChart3, shortcut: "⌘E" },
  { id: "alt-version", label: "生成替代版本", icon: Sparkles },
  { id: "schedule", label: "调度发布", icon: CalendarPlus, shortcut: "⌘⇧S", separator: true },
  { id: "move-date", label: "移至其他日期", icon: ArrowRight, submenu: [] },
  { id: "add-tag", label: "添加标签", icon: Tag, shortcut: "⌘T", separator: true },
  { id: "view-related", label: "查看相关", icon: Search },
];

const CALENDAR_MENU: ContextMenuItemDef[] = [
  { id: "new-content", label: "新建内容", icon: FileText, shortcut: "⌘N" },
  { id: "ai-generate", label: "AI生成内容", icon: Bot, shortcut: "⌘⏎", separator: true },
  { id: "view-stats", label: "查看当日统计", icon: BarChart3 },
];

const KNOWLEDGE_MENU: ContextMenuItemDef[] = [
  { id: "edit", label: "编辑", icon: Pencil, shortcut: "⌘E" },
  { id: "copy", label: "复制", icon: Copy, shortcut: "⌘C" },
  { id: "delete", label: "删除", icon: Trash2, variant: "destructive", separator: true },
  { id: "ai-generate", label: "使用AI生成", icon: Sparkles, shortcut: "⌘⏎", separator: true },
  { id: "find-related", label: "查找相关", icon: Search },
];

const MENU_MAP: Record<ContextMenuType, ContextMenuItemDef[]> = {
  post: POST_MENU,
  calendar: CALENDAR_MENU,
  knowledge: KNOWLEDGE_MENU,
  general: [],
};

/* ─── Context Menu Component ──────────────────────────────────── */

interface AppContextMenuProps {
  children: ReactNode;
  type: ContextMenuType;
  onAction?: (actionId: string, data?: unknown) => void;
  extraItems?: ContextMenuItemDef[];
  disabled?: boolean;
  className?: string;
}

export function AppContextMenu({
  children,
  type,
  onAction,
  extraItems,
  disabled = false,
  className,
}: AppContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const items = extraItems
    ? [...MENU_MAP[type], ...extraItems]
    : MENU_MAP[type];

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setActiveSubmenu(null);
    setFocusedIndex(0);
  }, []);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();

      const x = Math.min(e.clientX, window.innerWidth - 220);
      const y = Math.min(e.clientY, window.innerHeight - items.length * 36 - 20);

      setPosition({ x, y });
      setIsOpen(true);
      setFocusedIndex(0);
    },
    [disabled, items.length]
  );

  const handleAction = useCallback(
    (item: ContextMenuItemDef) => {
      if (item.disabled || item.submenu) return;
      onAction?.(item.id);
      handleClose();
    },
    [onAction, handleClose]
  );

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, handleClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const visibleItems = items.filter((i) => !i.disabled);
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((prev) => (prev + 1) % visibleItems.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) => (prev - 1 + visibleItems.length) % visibleItems.length);
          break;
        case "ArrowRight": {
          const focused = visibleItems[focusedIndex];
          if (focused?.submenu) {
            setActiveSubmenu(focused.id);
          }
          break;
        }
        case "ArrowLeft":
          setActiveSubmenu(null);
          break;
        case "Enter": {
          e.preventDefault();
          const focused = visibleItems[focusedIndex];
          if (focused) handleAction(focused);
          break;
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, focusedIndex, items, handleAction]);

  // Auto-scroll focused item into view
  useEffect(() => {
    if (!isOpen) return;
    const el = containerRef.current?.querySelector(`[data-menu-index="${focusedIndex}"]`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [isOpen, focusedIndex]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div onContextMenu={handleContextMenu}>{children}</div>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for closing */}
            <div className="fixed inset-0 z-[9990]" onClick={handleClose} />

            {/* Menu */}
            <motion.div
              className="context-menu-enter fixed z-[9999] min-w-[180px] max-w-[260px] py-1 rounded-lg bg-popover border border-border/20 shadow-xl"
              style={{ left: position.x, top: position.y }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              role="menu"
              aria-orientation="vertical"
            >
              {items.map((item, index) => {
                const visibleIndex = items.slice(0, index + 1).filter((i) => !i.disabled).length - 1;
                const Icon = item.icon;
                const isFocused = focusedIndex === visibleIndex && !item.disabled;
                const hasSubmenu = item.submenu !== undefined;

                return (
                  <div key={item.id}>
                    {item.separator && index > 0 && (
                      <div className="ctx-separator" />
                    )}
                    <div
                      role="menuitem"
                      data-menu-index={visibleIndex}
                      className={cn(
                        "flex items-center gap-2 px-2.5 py-1.5 text-[13px] cursor-default select-none rounded-md mx-0.5 transition-colors",
                        item.disabled
                          ? "opacity-40 cursor-not-allowed"
                          : isFocused
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent/50 text-foreground",
                        item.variant === "destructive" && !item.disabled && "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
                      )}
                      onClick={() => !item.disabled && handleAction(item)}
                      onMouseEnter={() => {
                        if (!item.disabled) setFocusedIndex(visibleIndex);
                        if (hasSubmenu) setActiveSubmenu(item.id);
                        else setActiveSubmenu(null);
                      }}
                    >
                      {Icon && (
                        <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      )}
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.shortcut && (
                        <span className="shortcut-badge ml-2">{item.shortcut}</span>
                      )}
                      {hasSubmenu && (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 flex-shrink-0" />
                      )}
                    </div>

                    {/* Submenu */}
                    <AnimatePresence>
                      {activeSubmenu === item.id && item.submenu && (
                        <motion.div
                          className="context-menu-enter fixed z-[10000] min-w-[160px] py-1 rounded-lg bg-popover border border-border/20 shadow-xl"
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -4 }}
                          style={{
                            left: position.x + 200,
                            top: position.y + (visibleIndex > 0 ? visibleIndex * 32 + 8 : 8),
                          }}
                          role="menu"
                        >
                          {item.submenu.length === 0 && (
                            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                              <BookOpen className="h-4 w-4 mx-auto mb-1 opacity-30" />
                              暂无可用选项
                            </div>
                          )}
                          {item.submenu.map((sub) => {
                            const SubIcon = sub.icon;
                            return (
                              <div
                                key={sub.id}
                                role="menuitem"
                                className={cn(
                                  "flex items-center gap-2 px-2.5 py-1.5 text-[13px] cursor-default select-none rounded-md mx-0.5 transition-colors",
                                  sub.disabled
                                    ? "opacity-40 cursor-not-allowed"
                                    : "hover:bg-accent/50 text-foreground"
                                )}
                                onClick={() => {
                                  if (!sub.disabled) {
                                    onAction?.(`${item.id}:${sub.id}`);
                                    handleClose();
                                  }
                                }}
                              >
                                {SubIcon && <SubIcon className="h-4 w-4 text-muted-foreground" />}
                                <span className="flex-1 truncate">{sub.label}</span>
                                {sub.shortcut && (
                                  <span className="shortcut-badge ml-2">{sub.shortcut}</span>
                                )}
                              </div>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Convenience Wrappers ────────────────────────────────────── */

export function PostContextMenu({
  children,
  postId,
  onAction,
}: {
  children: ReactNode;
  postId?: string;
  onAction?: (actionId: string, data?: unknown) => void;
}) {
  const handleAction = useCallback(
    (actionId: string) => {
      onAction?.(actionId, postId);
    },
    [onAction, postId]
  );
  return (
    <AppContextMenu type="post" onAction={handleAction}>
      {children}
    </AppContextMenu>
  );
}

export function CalendarContextMenu({
  children,
  date,
  onAction,
}: {
  children: ReactNode;
  date?: string;
  onAction?: (actionId: string, data?: unknown) => void;
}) {
  const handleAction = useCallback(
    (actionId: string) => {
      onAction?.(actionId, date);
    },
    [onAction, date]
  );
  return (
    <AppContextMenu type="calendar" onAction={handleAction}>
      {children}
    </AppContextMenu>
  );
}

export function KnowledgeContextMenu({
  children,
  itemId,
  onAction,
}: {
  children: ReactNode;
  itemId?: string;
  onAction?: (actionId: string, data?: unknown) => void;
}) {
  const handleAction = useCallback(
    (actionId: string) => {
      onAction?.(actionId, itemId);
    },
    [onAction, itemId]
  );
  return (
    <AppContextMenu type="knowledge" onAction={handleAction}>
      {children}
    </AppContextMenu>
  );
}
