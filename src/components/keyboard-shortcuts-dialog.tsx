"use client";

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
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ShortcutItem {
  keys: string[];
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface ShortcutCategory {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  shortcuts: ShortcutItem[];
}

// ─── Data ──────────────────────────────────────────────────────────────────────

const CATEGORIES: ShortcutCategory[] = [
  {
    id: "general",
    label: "通用",
    icon: Command,
    color: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
    shortcuts: [
      { keys: ["⌘", "K"], description: "搜索 / 命令面板", icon: Search },
      { keys: ["⌘", "/"], description: "快捷键帮助", icon: Command },
      { keys: ["⌘", ","], description: "设置中心", icon: Settings },
      { keys: ["Esc"], description: "关闭弹窗 / 取消操作", icon: CircleX },
    ],
  },
  {
    id: "content",
    label: "内容",
    icon: FileText,
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    shortcuts: [
      { keys: ["⌘", "N"], description: "新建帖子", icon: Plus },
      { keys: ["⌘", "S"], description: "保存草稿", icon: Save },
      { keys: ["⌘", "⏎"], description: "AI 生成内容", icon: Sparkles },
    ],
  },
  {
    id: "view",
    label: "视图",
    icon: LayoutGrid,
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    shortcuts: [
      { keys: ["⌘", "1"], description: "人设面板（知识库）", icon: User },
      { keys: ["⌘", "2"], description: "日历面板", icon: CalendarDays },
      { keys: ["⌘", "3"], description: "工作台", icon: FileText },
      { keys: ["⌘", "4"], description: "数据面板", icon: BarChart3 },
    ],
  },
  {
    id: "platform",
    label: "平台",
    icon: Repeat,
    color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    shortcuts: [
      { keys: ["⌘", "⇧", "P"], description: "切换平台（朋友圈 / 小红书）", icon: ArrowLeftRight },
    ],
  },
  {
    id: "nav",
    label: "导航",
    icon: ArrowLeft,
    color: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    shortcuts: [
      { keys: ["←", "→"], description: "切换 Tab 标签页", icon: ArrowLeft },
      { keys: ["↑", "↓"], description: "选择列表项", icon: ArrowUp },
    ],
  },
  {
    id: "calendar",
    label: "日历",
    icon: CalendarDays,
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    shortcuts: [
      { keys: ["←", "→"], description: "切换月份 / 周", icon: ArrowLeft },
      { keys: ["T"], description: "回到今天", icon: CalendarDays },
      { keys: ["G"], description: "切换网格 / 列表视图", icon: LayoutGrid },
    ],
  },
];

// ─── Component ─────────────────────────────────────────────────────────────────

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden gap-0">
        {/* Gradient header */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 dark:from-violet-700 dark:via-purple-700 dark:to-fuchsia-700">
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle_at_30%_20%,white_1px,transparent_1px),radial-gradient(circle_at_70%_60%,white_1px,transparent_1px)] bg-[length:20px_20px]" />

          <DialogHeader className="relative">
            <DialogTitle className="flex items-center gap-2.5 text-base text-white">
              <div className="h-8 w-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <Command className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold">键盘快捷键</span>
            </DialogTitle>
            <DialogDescription className="text-[11px] text-white/70 mt-1">
              使用快捷键提升操作效率 &middot; 按{" "}
              <kbd className="inline-flex items-center h-5 px-1.5 rounded border border-white/30 bg-white/15 backdrop-blur-sm text-[10px] font-mono text-white mx-0.5">
                ⌘/
              </kbd>{" "}
              随时打开此面板
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Shortcut groups */}
        <div className="px-4 py-4 max-h-[55vh] overflow-y-auto">
          {CATEGORIES.map((category, catIndex) => {
            const CategoryIcon = category.icon;
            return (
              <div key={category.id}>
                {catIndex > 0 && <Separator className="my-3" />}
                {/* Category header */}
                <div className="flex items-center gap-2 mb-2.5 px-2">
                  <CategoryIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-2 py-0 font-semibold border ${category.color}`}
                  >
                    {category.label}
                  </Badge>
                </div>
                {/* Shortcut rows */}
                <div className="space-y-0.5">
                  {category.shortcuts.map((shortcut) => {
                    const Icon = shortcut.icon;
                    return (
                      <div
                        key={`${category.id}-${shortcut.description}`}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                          <span className="text-[13px] text-foreground/80 truncate">
                            {shortcut.description}
                          </span>
                        </div>
                        {/* Keyboard badges */}
                        <div className="flex items-center gap-0.5 flex-shrink-0 ml-3">
                          {shortcut.keys.map((key, i) => (
                            <span key={i} className="flex items-center gap-0.5">
                              <kbd className="inline-flex items-center justify-center h-6 min-w-[24px] px-1.5 rounded-md border border-border bg-muted/80 text-[11px] font-mono font-medium text-foreground/70 shadow-[0_1px_0_1px] shadow-black/[0.04]">
                                {key}
                              </kbd>
                              {i < shortcut.keys.length - 1 && (
                                <span className="text-[10px] text-muted-foreground/50 mx-0.5">
                                  +
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer hint */}
        <div className="px-6 py-3 border-t bg-muted/30">
          <p className="text-[10px] text-muted-foreground text-center">
            macOS 使用 <kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono border border-border">⌘</kbd> 键 &middot; Windows/Linux 使用 <kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono border border-border">Ctrl</kbd> 键
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
