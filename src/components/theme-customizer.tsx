"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Palette,
  Check,
  RotateCcw,
  Minimize2,
  Type,
  Maximize2,
} from "lucide-react";

/* ─── Types ───────────────────────────────────────────────────── */

interface AccentPreset {
  id: string;
  label: string;
  hue: number;
  color: string;
}

interface ThemePreferences {
  accentColor: string;
  fontSize: "small" | "medium" | "large";
  borderRadius: number;
  compactSpacing: boolean;
}

/* ─── Constants ───────────────────────────────────────────────── */

const THEME_PREFS_KEY = "theme-preferences";

const ACCENT_PRESETS: AccentPreset[] = [
  { id: "violet", label: "紫罗兰", hue: 262, color: "hsl(262, 83%, 58%)" },
  { id: "rose", label: "玫瑰红", hue: 350, color: "hsl(350, 89%, 60%)" },
  { id: "emerald", label: "翡翠绿", hue: 160, color: "hsl(160, 84%, 39%)" },
  { id: "amber", label: "琥珀色", hue: 38, color: "hsl(38, 92%, 50%)" },
  { id: "cyan", label: "青蓝色", hue: 188, color: "hsl(188, 94%, 43%)" },
  { id: "fuchsia", label: "品红色", hue: 292, color: "hsl(292, 84%, 51%)" },
];

const FONT_SIZE_SCALE: Record<string, number> = {
  small: 0.875,
  medium: 1,
  large: 1.125,
};

const FONT_SIZE_LABELS: Record<string, string> = {
  small: "小",
  medium: "中",
  large: "大",
};

const DEFAULT_PREFS: ThemePreferences = {
  accentColor: "violet",
  fontSize: "medium",
  borderRadius: 1,
  compactSpacing: false,
};

/* ─── CSS Variable Updater ────────────────────────────────────── */

function applyThemeToDOM(prefs: ThemePreferences) {
  const root = document.documentElement;

  // Accent color
  const preset = ACCENT_PRESETS.find((p) => p.id === prefs.accentColor) || ACCENT_PRESETS[0];
  const accent = `hsl(${preset.hue}, 83%, 58%)`;
  const accentHover = `hsl(${preset.hue}, 83%, 52%)`;
  const accentMuted = `hsl(${preset.hue}, 83%, 58%, 0.12)`;

  root.style.setProperty("--accent-color", accent);
  root.style.setProperty("--accent-hover", accentHover);
  root.style.setProperty("--accent-muted", accentMuted);

  // Font size scale
  root.style.setProperty("--font-size-scale", String(FONT_SIZE_SCALE[prefs.fontSize]));

  // Border radius scale
  root.style.setProperty("--radius-scale", String(prefs.borderRadius));

  // Spacing scale
  root.style.setProperty("--spacing-scale", prefs.compactSpacing ? "0.8" : "1");
}

/* ─── Theme Preview ───────────────────────────────────────────── */

function ThemePreview({ prefs }: { prefs: ThemePreferences }) {
  const preset = ACCENT_PRESETS.find((p) => p.id === prefs.accentColor) || ACCENT_PRESETS[0];
  const spacing = prefs.compactSpacing ? "p-1.5" : "p-2.5";
  const gap = prefs.compactSpacing ? "gap-1.5" : "gap-2.5";

  return (
    <div
      className="theme-preview-card border border-border shadow-sm overflow-hidden"
      style={{ borderRadius: `${12 * prefs.borderRadius}px` }}
    >
      {/* Preview header */}
      <div
        className="preview-header flex items-center px-3"
        style={{ background: `linear-gradient(135deg, ${preset.color}, hsl(${preset.hue}, 83%, 45%))`, height: `${40 * prefs.borderRadius}px` }}
      >
        <div className="flex gap-1">
          <div className="h-2 w-2 rounded-full bg-white/30" />
          <div className="h-2 w-2 rounded-full bg-white/30" />
          <div className="h-2 w-2 rounded-full bg-white/30" />
        </div>
        <span className="ml-auto text-[10px] text-white/80 font-medium">预览</span>
      </div>

      {/* Preview body */}
      <div className={cn("preview-body", spacing, gap, "space-y-2")}>
        <div
          className="h-2 rounded bg-muted"
          style={{
            width: `${60 + 20 * prefs.borderRadius}%`,
            borderRadius: `${4 * prefs.borderRadius}px`,
          }}
        />
        <div
          className={cn("space-y-1.5", gap)}
        >
          <div
            className="h-1.5 rounded bg-muted"
            style={{ width: "90%", borderRadius: `${3 * prefs.borderRadius}px` }}
          />
          <div
            className="h-1.5 rounded bg-muted"
            style={{ width: "75%", borderRadius: `${3 * prefs.borderRadius}px` }}
          />
          <div
            className="h-1.5 rounded bg-muted"
            style={{ width: "85%", borderRadius: `${3 * prefs.borderRadius}px` }}
          />
        </div>
        {/* Preview buttons */}
        <div className={cn("flex", gap, "pt-1")}>
          <div
            className="h-5 flex-1 rounded text-white text-[9px] flex items-center justify-center"
            style={{
              background: preset.color,
              borderRadius: `${4 * prefs.borderRadius}px`,
              fontSize: `${10 * FONT_SIZE_SCALE[prefs.fontSize]}px`,
            }}
          >
            主要按钮
          </div>
          <div
            className="h-5 flex-1 rounded border text-[9px] flex items-center justify-center text-muted-foreground"
            style={{
              borderRadius: `${4 * prefs.borderRadius}px`,
              fontSize: `${10 * FONT_SIZE_SCALE[prefs.fontSize]}px`,
            }}
          >
            次要按钮
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Theme Customizer ───────────────────────────────────── */

export function ThemeCustomizer() {
  const [prefs, setPrefs] = useState<ThemePreferences>(() => {
    if (typeof window === "undefined") return DEFAULT_PREFS;
    try {
      const stored = localStorage.getItem(THEME_PREFS_KEY);
      if (stored) {
        return JSON.parse(stored) as ThemePreferences;
      }
    } catch {
      // ignore
    }
    return DEFAULT_PREFS;
  });
  const initialized = useRef(false);

  // Load from localStorage on mount (apply to DOM)
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    applyThemeToDOM(prefs);
  }, [prefs]);

  const updatePrefs = useCallback((partial: Partial<ThemePreferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem(THEME_PREFS_KEY, JSON.stringify(next));
      applyThemeToDOM(next);
      return next;
    });
  }, []);

  const resetPrefs = useCallback(() => {
    setPrefs(DEFAULT_PREFS);
    localStorage.setItem(THEME_PREFS_KEY, JSON.stringify(DEFAULT_PREFS));
    applyThemeToDOM(DEFAULT_PREFS);
  }, []);

  return (
    <div className="space-y-5">
      {/* Accent Color */}
      <div>
        <Label className="text-xs font-medium text-muted-foreground mb-3 block">主题色</Label>
        <div className="flex items-center gap-3">
          {ACCENT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              className={cn(
                "color-swatch",
                prefs.accentColor === preset.id && "selected"
              )}
              style={{ backgroundColor: preset.color }}
              onClick={() => updatePrefs({ accentColor: preset.id })}
              title={preset.label}
              aria-label={`主题色: ${preset.label}`}
            />
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          当前: {ACCENT_PRESETS.find((p) => p.id === prefs.accentColor)?.label}
        </p>
      </div>

      {/* Font Size */}
      <div>
        <Label className="text-xs font-medium text-muted-foreground mb-3 block">字体大小</Label>
        <div className="flex items-center gap-2">
          {(["small", "medium", "large"] as const).map((size) => (
            <button
              key={size}
              className={cn(
                "flex-1 py-2 rounded-lg border text-xs font-medium transition-all",
                prefs.fontSize === size
                  ? "border-foreground bg-foreground/5 text-foreground"
                  : "border-border hover:bg-muted/50 text-muted-foreground"
              )}
              onClick={() => updatePrefs({ fontSize: size })}
            >
              {FONT_SIZE_LABELS[size]}
              <span className="block text-[9px] opacity-60 mt-0.5">
                {FONT_SIZE_SCALE[size]}x
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Border Radius */}
      <div>
        <Label className="text-xs font-medium text-muted-foreground mb-3 block">圆角大小</Label>
        <div className="flex items-center gap-3">
          <Minimize2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Slider
            value={[prefs.borderRadius]}
            onValueChange={([val]) => updatePrefs({ borderRadius: val })}
            min={0}
            max={2}
            step={0.25}
            className="flex-1"
          />
          <Maximize2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-muted-foreground">直角</span>
          <span className="text-[9px] text-muted-foreground tabular-nums">{prefs.borderRadius}x</span>
          <span className="text-[9px] text-muted-foreground">大圆角</span>
        </div>
      </div>

      {/* Compact Spacing */}
      <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20">
        <div className="flex items-center gap-2.5">
          <Type className="h-4 w-4 text-slate-500" />
          <div>
            <span className="text-sm font-medium">紧凑间距</span>
            <p className="text-[10px] text-muted-foreground">减少元素间距</p>
          </div>
        </div>
        <button
          className={cn(
            "relative h-6 w-11 rounded-full transition-colors",
            prefs.compactSpacing ? "bg-violet-500" : "bg-muted"
          )}
          onClick={() => updatePrefs({ compactSpacing: !prefs.compactSpacing })}
          role="switch"
          aria-checked={prefs.compactSpacing}
        >
          <motion.div
            className="absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm"
            animate={{ left: prefs.compactSpacing ? 24 : 4 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        </button>
      </div>

      <Separator />

      {/* Preview */}
      <div>
        <Label className="text-xs font-medium text-muted-foreground mb-3 block">实时预览</Label>
        <ThemePreview prefs={prefs} />
      </div>

      <Separator />

      {/* Reset */}
      <Button
        variant="outline"
        size="sm"
        className="w-full h-9 text-xs text-muted-foreground"
        onClick={resetPrefs}
      >
        <RotateCcw className="h-3.5 w-3.5 mr-2" />
        恢复默认主题设置
      </Button>
    </div>
  );
}
