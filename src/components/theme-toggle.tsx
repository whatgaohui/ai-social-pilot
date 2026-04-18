"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";

function getThemeSnapshot(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return (localStorage.getItem("theme") as "light" | "dark") ??
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}

function getServerSnapshot(): "light" | "dark" {
  return "light";
}

function subscribeToTheme(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  mql.addEventListener("change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    mql.removeEventListener("change", callback);
  };
}

let listeners: Array<() => void> = [];

function emitThemeChange() {
  for (const listener of listeners) {
    listener();
  }
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(
    (callback) => {
      listeners.push(callback);
      return () => {
        listeners = listeners.filter((l) => l !== callback);
      };
    },
    getThemeSnapshot,
    getServerSnapshot,
  );

  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
  }, [theme]);

  const toggle = useCallback(() => {
    const next = theme === "light" ? "dark" : "light";
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
    emitThemeChange();
  }, [theme]);

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0 rounded-full"
      onClick={toggle}
      aria-label="切换主题"
    >
      <motion.div
        key={theme}
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 10 }}
      >
        {theme === "light" ? (
          <Moon className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Sun className="h-4 w-4 text-amber-400" />
        )}
      </motion.div>
    </Button>
  );
}
