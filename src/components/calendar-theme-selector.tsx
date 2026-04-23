"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Palette,
  Check,
  Undo2,
  Sparkles,
  Sun,
  Droplets,
  TreePine,
  Sunset,
  Moon,
  Minimize2,
  Circle,
} from "lucide-react";
import { toast } from "sonner";

// ─── Theme Types ──────────────────────────────────────────────────────────────

export interface CalendarTheme {
  id: string;
  name: string;
  description: string;
  accent: string;
  accentLight: string;
  todayBg: string;
  todayText: string;
  selectedBg: string;
  selectedBorder: string;
  publishedBg: string;
  publishedBorder: string;
  headerGradient: string;
  darkAccent: string;
  darkAccentLight: string;
  darkTodayBg: string;
  darkTodayText: string;
  darkSelectedBg: string;
  darkSelectedBorder: string;
  darkPublishedBg: string;
  darkPublishedBorder: string;
  darkHeaderGradient: string;
  icon: React.ComponentType<{ className?: string }>;
  previewColors: string[];
}

// ─── Built-in Themes ─────────────────────────────────────────────────────────

export const CALENDAR_THEMES: CalendarTheme[] = [
  {
    id: "default",
    name: "经典紫蓝",
    description: "默认紫色系主题",
    accent: "#8b5cf6",
    accentLight: "#ede9fe",
    todayBg: "bg-violet-100 dark:bg-violet-950/50",
    todayText: "text-violet-700 dark:text-violet-300",
    selectedBg: "ring-2 ring-primary bg-primary/[0.06] border-primary/40",
    selectedBorder: "border-primary/40",
    publishedBg: "bg-violet-100 dark:bg-violet-950/50",
    publishedBorder: "border-l-2 border-l-violet-500",
    headerGradient: "from-violet-500 to-purple-600",
    darkAccent: "#a78bfa",
    darkAccentLight: "#4c1d95",
    darkTodayBg: "dark:bg-violet-950/50",
    darkTodayText: "dark:text-violet-300",
    darkSelectedBg: "dark:bg-primary/[0.06]",
    darkSelectedBorder: "dark:border-primary/40",
    darkPublishedBg: "dark:bg-violet-950/50",
    darkPublishedBorder: "dark:border-l-violet-500",
    darkHeaderGradient: "dark:from-violet-600 dark:to-purple-700",
    icon: Sparkles,
    previewColors: ["#8b5cf6", "#a78bfa", "#ede9fe"],
  },
  {
    id: "warm",
    name: "暖阳橙金",
    description: "温暖橙色渐变",
    accent: "#f59e0b",
    accentLight: "#fef3c7",
    todayBg: "bg-amber-100 dark:bg-amber-950/50",
    todayText: "text-amber-700 dark:text-amber-300",
    selectedBg: "ring-2 ring-amber-500 bg-amber-500/[0.06] border-amber-500/40",
    selectedBorder: "border-amber-500/40",
    publishedBg: "bg-amber-100 dark:bg-amber-950/50",
    publishedBorder: "border-l-2 border-l-amber-500",
    headerGradient: "from-orange-500 to-amber-500",
    darkAccent: "#fbbf24",
    darkAccentLight: "#78350f",
    darkTodayBg: "dark:bg-amber-950/50",
    darkTodayText: "dark:text-amber-300",
    darkSelectedBg: "dark:bg-amber-500/[0.06]",
    darkSelectedBorder: "dark:border-amber-500/40",
    darkPublishedBg: "dark:bg-amber-950/50",
    darkPublishedBorder: "dark:border-l-amber-500",
    darkHeaderGradient: "dark:from-orange-600 dark:to-amber-600",
    icon: Sun,
    previewColors: ["#f59e0b", "#fbbf24", "#fef3c7"],
  },
  {
    id: "ocean",
    name: "深海青蓝",
    description: "清透的海洋色调",
    accent: "#0891b2",
    accentLight: "#cffafe",
    todayBg: "bg-cyan-100 dark:bg-cyan-950/50",
    todayText: "text-cyan-700 dark:text-cyan-300",
    selectedBg: "ring-2 ring-cyan-500 bg-cyan-500/[0.06] border-cyan-500/40",
    selectedBorder: "border-cyan-500/40",
    publishedBg: "bg-cyan-100 dark:bg-cyan-950/50",
    publishedBorder: "border-l-2 border-l-cyan-500",
    headerGradient: "from-teal-500 to-cyan-500",
    darkAccent: "#22d3ee",
    darkAccentLight: "#164e63",
    darkTodayBg: "dark:bg-cyan-950/50",
    darkTodayText: "dark:text-cyan-300",
    darkSelectedBg: "dark:bg-cyan-500/[0.06]",
    darkSelectedBorder: "dark:border-cyan-500/40",
    darkPublishedBg: "dark:bg-cyan-950/50",
    darkPublishedBorder: "dark:border-l-cyan-500",
    darkHeaderGradient: "dark:from-teal-600 dark:to-cyan-600",
    icon: Droplets,
    previewColors: ["#0891b2", "#22d3ee", "#cffafe"],
  },
  {
    id: "forest",
    name: "翠林碧绿",
    description: "清新的森林绿意",
    accent: "#059669",
    accentLight: "#d1fae5",
    todayBg: "bg-emerald-100 dark:bg-emerald-950/50",
    todayText: "text-emerald-700 dark:text-emerald-300",
    selectedBg: "ring-2 ring-emerald-500 bg-emerald-500/[0.06] border-emerald-500/40",
    selectedBorder: "border-emerald-500/40",
    publishedBg: "bg-emerald-100 dark:bg-emerald-950/50",
    publishedBorder: "border-l-2 border-l-emerald-500",
    headerGradient: "from-emerald-500 to-green-500",
    darkAccent: "#34d399",
    darkAccentLight: "#064e3b",
    darkTodayBg: "dark:bg-emerald-950/50",
    darkTodayText: "dark:text-emerald-300",
    darkSelectedBg: "dark:bg-emerald-500/[0.06]",
    darkSelectedBorder: "dark:border-emerald-500/40",
    darkPublishedBg: "dark:bg-emerald-950/50",
    darkPublishedBorder: "dark:border-l-emerald-500",
    darkHeaderGradient: "dark:from-emerald-600 dark:to-green-600",
    icon: TreePine,
    previewColors: ["#059669", "#34d399", "#d1fae5"],
  },
  {
    id: "sunset",
    name: "晚霞粉红",
    description: "浪漫的日落色调",
    accent: "#e11d48",
    accentLight: "#ffe4e6",
    todayBg: "bg-rose-100 dark:bg-rose-950/50",
    todayText: "text-rose-700 dark:text-rose-300",
    selectedBg: "ring-2 ring-rose-500 bg-rose-500/[0.06] border-rose-500/40",
    selectedBorder: "border-rose-500/40",
    publishedBg: "bg-rose-100 dark:bg-rose-950/50",
    publishedBorder: "border-l-2 border-l-rose-500",
    headerGradient: "from-rose-500 to-pink-500",
    darkAccent: "#fb7185",
    darkAccentLight: "#881337",
    darkTodayBg: "dark:bg-rose-950/50",
    darkTodayText: "dark:text-rose-300",
    darkSelectedBg: "dark:bg-rose-500/[0.06]",
    darkSelectedBorder: "dark:border-rose-500/40",
    darkPublishedBg: "dark:bg-rose-950/50",
    darkPublishedBorder: "dark:border-l-rose-500",
    darkHeaderGradient: "dark:from-rose-600 dark:to-pink-600",
    icon: Sunset,
    previewColors: ["#e11d48", "#fb7185", "#ffe4e6"],
  },
  {
    id: "minimalist",
    name: "极简灰调",
    description: "干净清爽的极简风格",
    accent: "#64748b",
    accentLight: "#f1f5f9",
    todayBg: "bg-slate-100 dark:bg-slate-800",
    todayText: "text-slate-700 dark:text-slate-300",
    selectedBg: "ring-2 ring-slate-500 bg-slate-500/[0.06] border-slate-500/40",
    selectedBorder: "border-slate-500/40",
    publishedBg: "bg-slate-100 dark:bg-slate-800",
    publishedBorder: "border-l-2 border-l-slate-500",
    headerGradient: "from-slate-600 to-slate-500",
    darkAccent: "#94a3b8",
    darkAccentLight: "#1e293b",
    darkTodayBg: "dark:bg-slate-800",
    darkTodayText: "dark:text-slate-300",
    darkSelectedBg: "dark:bg-slate-500/[0.06]",
    darkSelectedBorder: "dark:border-slate-500/40",
    darkPublishedBg: "dark:bg-slate-800",
    darkPublishedBorder: "dark:border-l-slate-500",
    darkHeaderGradient: "dark:from-slate-700 dark:to-slate-600",
    icon: Minimize2,
    previewColors: ["#64748b", "#94a3b8", "#f1f5f9"],
  },
  {
    id: "dark-pro",
    name: "深空暗夜",
    description: "专业的深色主题",
    accent: "#7c3aed",
    accentLight: "#1e1b4b",
    todayBg: "bg-violet-950/80 dark:bg-violet-950/80",
    todayText: "text-violet-300 dark:text-violet-300",
    selectedBg: "ring-2 ring-violet-600 bg-violet-600/10 border-violet-600/40",
    selectedBorder: "border-violet-600/40",
    publishedBg: "bg-violet-950/60 dark:bg-violet-950/60",
    publishedBorder: "border-l-2 border-l-violet-600",
    headerGradient: "from-violet-700 to-purple-800",
    darkAccent: "#a78bfa",
    darkAccentLight: "#2e1065",
    darkTodayBg: "dark:bg-violet-950/80",
    darkTodayText: "dark:text-violet-300",
    darkSelectedBg: "dark:bg-violet-600/10",
    darkSelectedBorder: "dark:border-violet-600/40",
    darkPublishedBg: "dark:bg-violet-950/60",
    darkPublishedBorder: "dark:border-l-violet-600",
    darkHeaderGradient: "dark:from-violet-800 dark:to-purple-900",
    icon: Moon,
    previewColors: ["#7c3aed", "#a78bfa", "#1e1b4b"],
  },
];

// ─── Mini Calendar Preview ───────────────────────────────────────────────────

function MiniCalendarPreview({ theme }: { theme: CalendarTheme }) {
  const days = ["一", "二", "三", "四", "五", "六", "日"];
  const todayIdx = 3; // Thursday for preview
  const hasPost = [1, 3, 5, 7, 8, 12, 15, 18, 20, 22, 25];

  return (
    <div className="theme-preview-mini rounded-lg border border-border/40 bg-background/50 p-2.5">
      <div className="grid grid-cols-7 gap-1 mb-1.5">
        {days.map((d) => (
          <div key={d} className="text-center text-[7px] text-muted-foreground font-medium">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {/* Blank cells for first week offset */}
        {Array.from({ length: 1 }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        {Array.from({ length: 30 }).map((_, i) => {
          const dayNum = i + 1;
          const isToday = dayNum === todayIdx;
          const hasContent = hasPost.includes(dayNum);

          return (
            <div
              key={dayNum}
              className={`aspect-square rounded-sm flex items-center justify-center text-[7px] font-medium transition-all ${
                isToday
                  ? `${theme.todayBg} ${theme.todayText} ring-1 scale-110`
                  : hasContent
                    ? `${theme.publishedBg} ${theme.todayText} opacity-80`
                    : "text-muted-foreground/60 hover:bg-muted/50"
              }`}
              style={isToday ? { boxShadow: `0 0 0 1px ${theme.accent}40` } : undefined}
            >
              {dayNum}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function CalendarThemeSelector() {
  const [showCustom, setShowCustom] = useState(false);

  // Load saved theme from localStorage (lazy initializer)
  const [activeThemeId, setActiveThemeId] = useState<string>(() => {
    if (typeof window === "undefined") return "default";
    try {
      const saved = localStorage.getItem("calendar-theme");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.id || "default";
      }
    } catch { /* ignore */ }
    return "default";
  });

  const [customAccent, setCustomAccent] = useState<string>(() => {
    if (typeof window === "undefined") return "#8b5cf6";
    try {
      const saved = localStorage.getItem("calendar-theme");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.customAccent || "#8b5cf6";
      }
    } catch { /* ignore */ }
    return "#8b5cf6";
  });

  const [customName, setCustomName] = useState<string>(() => {
    if (typeof window === "undefined") return "自定义主题";
    try {
      const saved = localStorage.getItem("calendar-theme");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.customName || "自定义主题";
      }
    } catch { /* ignore */ }
    return "自定义主题";
  });

  const activeTheme = useMemo(() => {
    if (activeThemeId === "custom") {
      return createCustomTheme(customAccent, customName);
    }
    return CALENDAR_THEMES.find((t) => t.id === activeThemeId) || CALENDAR_THEMES[0];
  }, [activeThemeId, customAccent, customName]);

  const applyTheme = useCallback((theme: CalendarTheme) => {
    setActiveThemeId(theme.id);
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "calendar-theme",
        JSON.stringify({
          id: theme.id,
          customAccent: theme.id === "custom" ? customAccent : undefined,
          customName: theme.id === "custom" ? customName : undefined,
        })
      );

      // Dispatch custom event for calendar to listen
      window.dispatchEvent(
        new CustomEvent("calendar-theme-change", { detail: theme })
      );
    }
    toast.success(`已切换到「${theme.name}」主题`);
  }, [customAccent, customName]);

  const handleReset = useCallback(() => {
    applyTheme(CALENDAR_THEMES[0]);
    setShowCustom(false);
    setCustomAccent("#8b5cf6");
    setCustomName("自定义主题");
  }, [applyTheme]);

  const handleApplyCustom = useCallback(() => {
    const theme = createCustomTheme(customAccent, customName);
    applyTheme(theme);
  }, [customAccent, customName, applyTheme]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <Palette className="h-3.5 w-3.5 text-white" />
        </div>
        <div>
          <h3 className="text-xs font-semibold">日历主题</h3>
          <p className="text-[10px] text-muted-foreground">自定义日历外观风格</p>
        </div>
      </div>

      {/* Theme Grid */}
      <div className="grid grid-cols-2 gap-3">
        {CALENDAR_THEMES.map((theme) => {
          const Icon = theme.icon;
          const isActive = activeThemeId === theme.id;

          return (
            <motion.button
              key={theme.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => applyTheme(theme)}
              className={`theme-option relative rounded-xl border-2 p-3 text-left transition-all duration-200 cursor-pointer ${
                isActive
                  ? "border-transparent shadow-md"
                  : "border-border/60 hover:border-border"
              }`}
              style={
                isActive
                  ? { borderColor: theme.accent }
                  : undefined
              }
            >
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 h-4 w-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: theme.accent }}
                >
                  <Check className="h-2.5 w-2.5 text-white" />
                </motion.div>
              )}

              {/* Theme info */}
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="h-6 w-6 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${theme.accent}20` }}
                >
                  <Icon className="h-3 w-3" style={{ color: theme.accent }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium truncate">{theme.name}</p>
                  <p className="text-[8px] text-muted-foreground truncate">{theme.description}</p>
                </div>
              </div>

              {/* Color preview dots */}
              <div className="flex items-center gap-1 mb-2">
                {theme.previewColors.map((color, i) => (
                  <div
                    key={i}
                    className="h-3 w-3 rounded-full border border-white/20 shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              {/* Mini preview */}
              <MiniCalendarPreview theme={theme} />
            </motion.button>
          );
        })}
      </div>

      {/* Custom Theme */}
      <div className="rounded-xl border border-border/60 bg-card/80 p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Circle className="h-3.5 w-3.5 text-violet-500" />
            <span className="text-xs font-semibold">自定义主题</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-[9px]"
            onClick={() => setShowCustom(!showCustom)}
          >
            {showCustom ? "收起" : "展开"}
          </Button>
        </div>

        <AnimatePresence>
          {showCustom && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <div className="space-y-1.5">
                <Label className="text-[10px]">主题名称</Label>
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="我的主题"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px]">强调色</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customAccent}
                    onChange={(e) => setCustomAccent(e.target.value)}
                    className="h-8 w-10 rounded-md border border-border cursor-pointer bg-transparent p-0.5"
                  />
                  <Input
                    value={customAccent}
                    onChange={(e) => setCustomAccent(e.target.value)}
                    placeholder="#8b5cf6"
                    className="h-8 text-xs font-mono flex-1"
                  />
                </div>
              </div>

              {/* Custom preview */}
              <MiniCalendarPreview theme={createCustomTheme(customAccent, customName)} />

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="flex-1 h-7 text-[10px]"
                  onClick={handleApplyCustom}
                >
                  <Check className="h-3 w-3 mr-1" />
                  应用自定义主题
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px]"
                  onClick={handleReset}
                >
                  <Undo2 className="h-3 w-3 mr-1" />
                  重置
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Helper: Create custom theme from color ──────────────────────────────────

function createCustomTheme(accent: string, name: string): CalendarTheme {
  return {
    id: "custom",
    name,
    description: "用户自定义主题",
    accent,
    accentLight: `${accent}15`,
    todayBg: "bg-muted",
    todayText: "text-foreground",
    selectedBg: "ring-2 ring-primary bg-primary/[0.06] border-primary/40",
    selectedBorder: "border-primary/40",
    publishedBg: "bg-muted",
    publishedBorder: "border-l-2",
    headerGradient: "from-primary to-primary/80",
    darkAccent: accent,
    darkAccentLight: `${accent}30`,
    darkTodayBg: "dark:bg-muted",
    darkTodayText: "dark:text-foreground",
    darkSelectedBg: "dark:bg-primary/[0.06]",
    darkSelectedBorder: "dark:border-primary/40",
    darkPublishedBg: "dark:bg-muted",
    darkPublishedBorder: "dark:border-l-2",
    darkHeaderGradient: "dark:from-primary dark:to-primary/80",
    icon: Circle,
    previewColors: [accent, `${accent}80`, `${accent}20`],
  };
}
