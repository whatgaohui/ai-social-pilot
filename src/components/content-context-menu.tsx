"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ContentPost } from "@/types";
import { useAppStore } from "@/store/app-store";
import {
  Copy,
  Sparkles,
  Wand2,
  Star,
  History,
  Globe,
  Pencil,
  CheckCircle2,
  Trash2,
  CalendarClock,
  ClipboardCopy,
  type LucideIcon,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

/* ─── Types ───────────────────────────────────────────────────── */

interface ContextMenuState {
  x: number;
  y: number;
  post: ContentPost | null;
}

interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
  destructive?: boolean;
}

/* ─── Static Menu Definitions ─────────────────────────────────── */

const GROUP_1: MenuItem[] = [
  { id: "copy", label: "复制文案", icon: Copy, shortcut: "⌘C" },
  { id: "ai-optimize", label: "AI优化", icon: Sparkles, shortcut: "⌘O" },
  { id: "ai-polish", label: "AI润色", icon: Wand2 },
  { id: "quality-score", label: "质量评分", icon: Star },
];

const GROUP_2: MenuItem[] = [
  { id: "version-history", label: "版本历史", icon: History, shortcut: "⌘H" },
  { id: "cross-platform", label: "跨平台发布", icon: Globe },
];

const GROUP_3: MenuItem[] = [
  { id: "edit", label: "编辑详情", icon: Pencil, shortcut: "⌘E" },
  { id: "duplicate", label: "复制一条", icon: ClipboardCopy },
  { id: "move", label: "移动到日期…", icon: CalendarClock },
  { id: "mark-published", label: "标记已发布", icon: CheckCircle2 },
  { id: "delete", label: "删除", icon: Trash2, destructive: true },
];

const ALL_ITEMS: MenuItem[] = [...GROUP_1, ...GROUP_2, ...GROUP_3];

const SEPARATOR_AFTER = new Set([GROUP_1.length, GROUP_1.length + GROUP_2.length]);

/* ─── Platform color accent helpers ──────────────────────────── */

function getPlatformAccentClass(platform?: string): string {
  if (platform === "xiaohongshu") {
    return "border-l-rose-500/60";
  }
  return "border-l-green-500/60";
}

function getPlatformDotClass(platform?: string): string {
  if (platform === "xiaohongshu") {
    return "bg-rose-500";
  }
  return "bg-green-500";
}

/* ─── Hook ────────────────────────────────────────────────────── */

export function useContentContextMenu() {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    x: 0,
    y: 0,
    post: null,
  });

  const handleContextMenu = useCallback((e: React.MouseEvent, post: ContentPost) => {
    e.preventDefault();
    e.stopPropagation();
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - 360);
    setContextMenu({ x, y, post });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu({ x: 0, y: 0, post: null });
  }, []);

  return { contextMenu, handleContextMenu, closeContextMenu };
}

/* ─── Component ───────────────────────────────────────────────── */

interface ContentContextMenuProps {
  contextMenu: ContextMenuState;
  closeContextMenu: () => void;
  onAction?: (actionId: string, post: ContentPost) => void;
}

export function ContentContextMenu({
  contextMenu,
  closeContextMenu,
  onAction,
}: ContentContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { deleteContentPost } = useAppStore();

  useEffect(() => {
    if (!contextMenu.post) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeContextMenu();
    };

    // Delay listener attachment by 1 frame to avoid the right-click event itself closing the menu
    const rafId = requestAnimationFrame(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    });

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [contextMenu.post, closeContextMenu]);

  const handleItemClick = useCallback(
    (item: MenuItem) => {
      if (!contextMenu.post) return;

      if (item.id === "delete") {
        deleteContentPost(contextMenu.post.id);
        closeContextMenu();
        return;
      }

      onAction?.(item.id, contextMenu.post);
      closeContextMenu();
    },
    [contextMenu.post, onAction, closeContextMenu, deleteContentPost],
  );

  if (!contextMenu.post) return null;

  const post = contextMenu.post;
  const platformAccent = getPlatformAccentClass(post.platform);
  const platformDot = getPlatformDotClass(post.platform);

  return (
    <div
      ref={menuRef}
      className={cn(
        "context-menu-enter fixed z-[9999] w-52 rounded-xl glass-card p-1.5 shadow-xl",
        "border-l-[3px]",
        platformAccent,
      )}
      style={{ left: contextMenu.x, top: contextMenu.y }}
      role="menu"
      aria-orientation="vertical"
    >
      {/* Post topic header */}
      <div className="flex items-center gap-1.5 px-2 py-1 mb-0.5">
        <span className={cn("h-2 w-2 rounded-full shrink-0", platformDot)} />
        <span className="text-[11px] font-medium text-foreground/80 truncate max-w-[160px]">
          {post.topic}
        </span>
      </div>
      <Separator className="my-0.5 opacity-40" />

      {ALL_ITEMS.map((item, index) => {
        const Icon = item.icon;
        const showSeparator = SEPARATOR_AFTER.has(index);

        return (
          <div key={item.id}>
            {showSeparator && <Separator className="my-1 opacity-40" />}
            <button
              role="menuitem"
              onClick={() => handleItemClick(item)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors cursor-pointer",
                item.destructive
                  ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                  : "hover:bg-accent/60",
              )}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-70" />
              <span className="flex-1 text-left truncate">{item.label}</span>
              {item.shortcut && (
                <span className="ml-auto text-[10px] text-muted-foreground/50 tabular-nums">
                  {item.shortcut}
                </span>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
