"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import {
  Wand2,
  Plus,
  Search,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ActionItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  onClick: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function FloatingActionBar() {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { setCommandPaletteOpen, setRightPanelTab, setSettingsCenterOpen } =
    useAppStore();

  const actions: ActionItem[] = [
    {
      icon: Wand2,
      label: "AI 生成",
      color: "bg-violet-500 hover:bg-violet-600",
      onClick: () => setCommandPaletteOpen(true),
    },
    {
      icon: Plus,
      label: "新建内容",
      color: "bg-emerald-500 hover:bg-emerald-600",
      onClick: () => setRightPanelTab("workspace"),
    },
    {
      icon: Search,
      label: "搜索",
      color: "bg-blue-500 hover:bg-blue-600",
      onClick: () => setCommandPaletteOpen(true),
    },
    {
      icon: BarChart3,
      label: "数据分析",
      color: "bg-amber-500 hover:bg-amber-600",
      onClick: () => setRightPanelTab("data"),
    },
    {
      icon: Settings,
      label: "设置",
      color: "bg-slate-500 hover:bg-slate-600",
      onClick: () => setSettingsCenterOpen(true),
    },
  ];

  // Hidden on mobile or when dismissed
  if (dismissed) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <motion.div
        initial={{ x: 80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 80, opacity: 0 }}
        transition={{
          delay: 1.5,
          duration: 0.4,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="fixed right-3 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col items-center gap-1"
      >
        {/* Dismiss button — visible on hover of the bar */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute -top-2 -left-1 h-4 w-4 rounded-full bg-muted border border-border text-muted-foreground flex items-center justify-center text-[8px] opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
          aria-label="关闭快捷栏"
        >
          ✕
        </button>

        {/* Main container — glass morphism pill */}
        <div
          className={`flex flex-col items-center gap-1 p-1.5 rounded-2xl bg-background/80 backdrop-blur-xl border border-border/50 shadow-lg transition-all duration-300 ${
            expanded ? "shadow-xl" : ""
          }`}
        >
          {actions.map((action, i) => {
            const Icon = action.icon;
            return (
              <Tooltip key={action.label}>
                <TooltipTrigger asChild>
                  <motion.button
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: 1.6 + i * 0.1,
                      duration: 0.3,
                    }}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={action.onClick}
                    className={`h-9 w-9 rounded-xl ${action.color} text-white flex items-center justify-center shadow-sm transition-all duration-200 cursor-pointer`}
                    aria-label={action.label}
                  >
                    <Icon className="h-4 w-4" />
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">
                  {action.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Expand / Collapse toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1 h-6 w-6 rounded-full bg-muted/80 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          aria-label={expanded ? "收起" : "展开"}
        >
          {expanded ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>
      </motion.div>
    </TooltipProvider>
  );
}
