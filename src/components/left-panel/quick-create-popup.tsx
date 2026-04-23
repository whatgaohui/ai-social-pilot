"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  CONTENT_TYPE_LABELS,
  XHS_CONTENT_TYPE_LABELS,
  type ContentType,
  type XHSContentType,
} from "@/types";
import { Plus, Loader2, Sparkles } from "lucide-react";

// --- Props ---

interface QuickCreatePopupProps {
  date: string;
  isOpen: boolean;
  onClose: () => void;
  platform: string;
  onCreate: (data: {
    topic: string;
    content: string;
    contentType: string;
    scheduledDate: string;
  }) => void;
}

// --- Content type options per platform ---

const WECHAT_TYPES: { value: ContentType; label: string }[] = (
  Object.entries(CONTENT_TYPE_LABELS) as [ContentType, string][]
).map(([value, label]) => ({ value, label }));

const XHS_TYPES: { value: XHSContentType; label: string }[] = (
  Object.entries(XHS_CONTENT_TYPE_LABELS) as [XHSContentType, string][]
).map(([value, label]) => ({ value, label }));

// --- Platform-aware color tokens ---

function getPlatformColors(platform: string) {
  if (platform === "xiaohongshu") {
    return {
      accent: "border-rose-400 dark:border-rose-500",
      accentBg: "bg-rose-50 dark:bg-rose-950/40",
      accentText: "text-rose-600 dark:text-rose-400",
      accentBtn:
        "bg-rose-600 hover:bg-rose-700 text-white dark:bg-rose-500 dark:hover:bg-rose-600",
      accentBadge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
      accentRing: "ring-rose-500/50",
      dot: "bg-rose-500",
    };
  }
  return {
    accent: "border-violet-400 dark:border-violet-500",
    accentBg: "bg-violet-50 dark:bg-violet-950/40",
    accentText: "text-violet-600 dark:text-violet-400",
    accentBtn:
      "bg-violet-600 hover:bg-violet-700 text-white dark:bg-violet-500 dark:hover:bg-violet-600",
    accentBadge: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    accentRing: "ring-violet-500/50",
    dot: "bg-violet-500",
  };
}

// --- Animation ---

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

const popupVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 420, damping: 26 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 4,
    transition: { duration: 0.12, ease: "easeIn" },
  },
};

// --- Component ---

export function QuickCreatePopup({
  date,
  isOpen,
  onClose,
  platform,
  onCreate,
}: QuickCreatePopupProps) {
  const colors = getPlatformColors(platform);
  const types = platform === "xiaohongshu" ? XHS_TYPES : WECHAT_TYPES;

  const [topic, setTopic] = useState("");
  const [contentType, setContentType] = useState<string>(
    platform === "xiaohongshu" ? "seeding" : "text",
  );
  const [content, setContent] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const topicRef = useRef<HTMLInputElement>(null);

  // Reset form and auto-focus when opened
  useEffect(() => {
    if (isOpen) {
      setTopic("");
      setContent("");
      setContentType(platform === "xiaohongshu" ? "seeding" : "text");
      setTimeout(() => topicRef.current?.focus(), 120);
    }
  }, [isOpen, platform]);

  const handleCreate = useCallback(() => {
    if (!topic.trim()) return;
    setIsCreating(true);
    try {
      onCreate({
        topic: topic.trim(),
        content: content.trim(),
        contentType,
        scheduledDate: date,
      });
    } finally {
      setIsCreating(false);
    }
  }, [topic, content, contentType, date, onCreate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        // In textarea allow shift+enter for newline
        if ((e.target as HTMLElement).tagName !== "TEXTAREA") {
          e.preventDefault();
          handleCreate();
        }
      }
      if (e.key === "Escape") {
        onClose();
      }
    },
    [handleCreate, onClose],
  );

  const platformLabel =
    platform === "wechat" ? "朋友圈" : "小红书";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm rounded-xl border-border/60 p-0 gap-0 overflow-hidden">
        {/* Colored accent bar at top */}
        <div className="relative">
          <motion.div
            className={`h-1 ${platform === "xiaohongshu" ? "bg-gradient-to-r from-rose-400 to-pink-500" : "bg-gradient-to-r from-violet-400 to-purple-500"}`}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{ transformOrigin: "left" }}
          />
        </div>

        <div className="px-5 pt-4 pb-2">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <motion.div
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
              >
                <Sparkles className={`h-4 w-4 ${colors.accentText}`} />
              </motion.div>
              快速创建内容
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
              {platformLabel} · {date}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Form body */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="px-5 pb-2 space-y-3"
              variants={popupVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* Topic */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  主题
                </label>
                <Input
                  ref={topicRef}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="输入内容主题..."
                  className="text-sm h-8 rounded-lg border-border/60 focus-visible:ring-1 focus-visible:ring-offset-0"
                  onKeyDown={handleKeyDown}
                />
              </div>

              {/* Content type selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">
                  内容类型
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {types.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setContentType(t.value)}
                      className={`
                        inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium
                        transition-all duration-150 border
                        ${
                          contentType === t.value
                            ? `${colors.accentBadge} border-current/20 ${colors.accentRing} ring-1`
                            : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
                        }
                      `}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content textarea */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  内容 <span className="text-muted-foreground/60">(可选)</span>
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="简要描述内容要点..."
                  rows={3}
                  className="
                    w-full text-sm rounded-lg border border-border/60 bg-background px-3 py-2
                    placeholder:text-muted-foreground/50
                    focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-offset-0
                    resize-none transition-colors
                  "
                  onKeyDown={handleKeyDown}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="px-5 pb-4 pt-2 flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs h-7 px-3 rounded-lg"
          >
            取消
          </Button>
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={!topic.trim() || isCreating}
            className={`text-xs h-7 px-3 rounded-lg ${colors.accentBtn}`}
          >
            {isCreating ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Plus className="h-3 w-3 mr-1" />
            )}
            创建
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
