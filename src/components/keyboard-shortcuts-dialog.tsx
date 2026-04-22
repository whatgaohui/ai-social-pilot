"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Command,
  Search,
  CalendarDays,
  FileText,
  BarChart3,
  User,
  Settings,
  Sun,
  Moon,
  CircleX,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

interface ShortcutItem {
  keys: string[];
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
}

const SHORTCUTS: ShortcutItem[] = [
  // Navigation
  { keys: ["⌘", "K"], description: "打开命令面板", icon: Command, category: "导航" },
  { keys: ["?"], description: "显示快捷键帮助", icon: Command, category: "导航" },
  // Panels
  { keys: ["1"], description: "切换到人设/知识库面板", icon: User, category: "面板" },
  { keys: ["2"], description: "切换到日历面板", icon: CalendarDays, category: "面板" },
  { keys: ["3"], description: "切换到工作台面板", icon: FileText, category: "面板" },
  { keys: ["4"], description: "切换到数据分析面板", icon: BarChart3, category: "面板" },
  // Actions
  { keys: ["⌘", "Enter"], description: "AI生成/优化内容", icon: FileText, category: "操作" },
  { keys: ["⌘", "S"], description: "保存当前编辑", icon: FileText, category: "操作" },
  { keys: ["Escape"], description: "关闭弹窗/取消操作", icon: CircleX, category: "操作" },
  // Display
  { keys: ["⌘", "D"], description: "切换深色/浅色模式", icon: Moon, category: "显示" },
  { keys: ["⌘", ","], description: "打开设置", icon: Settings, category: "显示" },
  // Calendar
  { keys: ["←", "→"], description: "切换上/下月", icon: ArrowLeft, category: "日历" },
  { keys: ["G"], description: "回到今天", icon: CalendarDays, category: "日历" },
];

const CATEGORIES = ["导航", "面板", "操作", "显示", "日历"];

const CATEGORY_COLORS: Record<string, string> = {
  "导航": "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  "面板": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "操作": "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  "显示": "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  "日历": "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Command className="h-3.5 w-3.5 text-white" />
            </div>
            键盘快捷键
          </DialogTitle>
          <DialogDescription className="text-xs">
            使用快捷键提升操作效率，按 <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">?</kbd> 随时打开此面板
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-5 max-h-[60vh] overflow-y-auto">
          {CATEGORIES.map((category, catIndex) => (
            <div key={category}>
              {catIndex > 0 && <Separator className="my-3" />}
              <div className="flex items-center gap-2 mb-2.5">
                <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${CATEGORY_COLORS[category]}`}>
                  {category}
                </Badge>
              </div>
              <div className="space-y-1">
                {SHORTCUTS.filter(s => s.category === category).map((shortcut) => {
                  const Icon = shortcut.icon;
                  return (
                    <div
                      key={shortcut.description}
                      className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                        <span className="text-sm text-foreground/80">{shortcut.description}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {shortcut.keys.map((key, i) => (
                          <span key={i}>
                            <kbd className="inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-md border border-border bg-muted/80 text-[10px] font-mono font-medium text-foreground/70 shadow-sm">
                              {key}
                            </kbd>
                            {i < shortcut.keys.length - 1 && (
                              <span className="mx-0.5 text-[10px] text-muted-foreground">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
