"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Keyboard, X } from "lucide-react";

const SHORTCUTS = [
  { keys: ["⌘", "K"], label: "搜索" },
  { keys: ["⌘", "/"], label: "快捷键" },
  { keys: ["⌘", "⇧", "P"], label: "切换平台" },
  { keys: ["⌘", "B"], label: "知识库" },
  { keys: ["⌘", "C"], label: "日历" },
];

export function KeyboardShortcutHint() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-auto pt-2 px-1">
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-2"
          >
            <div className="space-y-1 p-2 rounded-lg bg-muted/40 border border-border/20">
              {SHORTCUTS.map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{s.label}</span>
                  <div className="flex items-center gap-0.5">
                    {s.keys.map((key, i) => (
                      <kbd
                        key={i}
                        className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded border border-border/20 bg-background/80 text-[8px] font-mono text-muted-foreground"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors cursor-pointer"
        aria-label="显示键盘快捷键"
      >
        {expanded ? (
          <>
            <X className="h-3 w-3" />
            <span>收起</span>
          </>
        ) : (
          <>
            <Keyboard className="h-3 w-3" />
            <span>快捷键</span>
          </>
        )}
      </button>
    </div>
  );
}
