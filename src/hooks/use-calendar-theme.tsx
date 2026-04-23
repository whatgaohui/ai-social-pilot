"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { CALENDAR_THEMES, type CalendarTheme } from "@/components/calendar-theme-selector";

const STORAGE_KEY = "calendar-theme";

interface SavedTheme {
  id: string;
  customAccent?: string;
  customName?: string;
}

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
    icon: (() => {
      // Return a simple function that renders nothing special for custom
      const Circle = ({ className: cls }: { className?: string }) => (
        <div
          className={cls}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            backgroundColor: accent,
          }}
        />
      );
      return Circle;
    })() as React.ComponentType<{ className?: string }>,
    previewColors: [accent, `${accent}80`, `${accent}20`],
  };
}

/**
 * Hook for accessing and managing the calendar theme.
 * Persists selection in localStorage and dispatches custom events
 * so other components can reactively update.
 */
export function useCalendarTheme() {
  const [themeId, setThemeId] = useState<string>(() => {
    if (typeof window === "undefined") return "default";
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: SavedTheme = JSON.parse(saved);
        return parsed.id || "default";
      }
    } catch {
      // ignore
    }
    return "default";
  });

  const [customAccent, setCustomAccent] = useState<string>(() => {
    if (typeof window === "undefined") return "#8b5cf6";
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: SavedTheme = JSON.parse(saved);
        return parsed.customAccent || "#8b5cf6";
      }
    } catch {
      // ignore
    }
    return "#8b5cf6";
  });

  const [customName, setCustomName] = useState<string>(() => {
    if (typeof window === "undefined") return "自定义主题";
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: SavedTheme = JSON.parse(saved);
        return parsed.customName || "自定义主题";
      }
    } catch {
      // ignore
    }
    return "自定义主题";
  });

  // Listen for theme changes dispatched by CalendarThemeSelector
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<CalendarTheme>;
      const theme = customEvent.detail;
      if (theme) {
        setThemeId(theme.id);
        if (theme.id === "custom") {
          setCustomAccent(theme.accent);
          setCustomName(theme.name);
        }
      }
    };

    window.addEventListener("calendar-theme-change", handler);
    return () => window.removeEventListener("calendar-theme-change", handler);
  }, []);

  const activeTheme = useMemo(() => {
    if (themeId === "custom") {
      return createCustomTheme(customAccent, customName);
    }
    return CALENDAR_THEMES.find((t) => t.id === themeId) || CALENDAR_THEMES[0];
  }, [themeId, customAccent, customName]);

  const setTheme = useCallback(
    (theme: CalendarTheme) => {
      setThemeId(theme.id);
      if (typeof window !== "undefined") {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            id: theme.id,
            customAccent: theme.id === "custom" ? customAccent : undefined,
            customName: theme.id === "custom" ? customName : undefined,
          })
        );
        window.dispatchEvent(new CustomEvent("calendar-theme-change", { detail: theme }));
      }
    },
    [customAccent, customName]
  );

  const setCustomTheme = useCallback(
    (accent: string, name: string) => {
      const theme = createCustomTheme(accent, name);
      setCustomAccent(accent);
      setCustomName(name);
      setTheme(theme);
    },
    [setTheme]
  );

  const resetTheme = useCallback(() => {
    const defaultTheme = CALENDAR_THEMES[0];
    setTheme(defaultTheme);
  }, [setTheme]);

  return {
    activeTheme,
    themeId,
    customAccent,
    customName,
    setTheme,
    setCustomTheme,
    resetTheme,
    allThemes: CALENDAR_THEMES,
  };
}
