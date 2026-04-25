"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Type, MessageSquare } from "lucide-react";
import { useAppStore } from "@/store/app-store";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCharCountColor(count: number): { text: string; bg: string; bar: string } {
  if (count < 100) {
    return {
      text: "text-red-500",
      bg: "bg-red-50 dark:bg-red-950/30",
      bar: "bg-red-500",
    };
  }
  if (count <= 300) {
    return {
      text: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      bar: "bg-emerald-500",
    };
  }
  if (count <= 500) {
    return {
      text: "text-amber-500",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      bar: "bg-amber-500",
    };
  }
  return {
    text: "text-orange-500",
    bg: "bg-orange-50 dark:bg-orange-950/30",
    bar: "bg-orange-500",
  };
}

function getReadingTime(charCount: number): string {
  // Chinese reading speed: ~400 chars/minute
  if (charCount === 0) return "0秒";
  const minutes = charCount / 400;
  if (minutes < 1) return `~${Math.max(1, Math.ceil(charCount / 7))}秒`;
  return `~${Math.ceil(minutes)}分钟`;
}

interface PlatformIdeal {
  label: string;
  ideal: string;
  max: string;
  isInRange: boolean;
  color: string;
}

function getPlatformIdeal(
  platform: string,
  charCount: number
): PlatformIdeal {
  if (platform === "xiaohongshu") {
    const inRange = charCount >= 300 && charCount <= 500;
    return {
      label: "小红书",
      ideal: "300-500字",
      max: "1000字",
      isInRange: inRange,
      color: inRange ? "text-emerald-500" : "text-amber-500",
    };
  }
  // WeChat Moments
  const inRange = charCount > 0 && charCount <= 500;
  return {
    label: "朋友圈",
    ideal: "<500字",
    max: "不限",
    isInRange: inRange,
    color: inRange ? "text-emerald-500" : "text-amber-500",
  };
}

// ─── Progress Bar ────────────────────────────────────────────────────────────

function CountProgressBar({
  charCount,
  platform,
}: {
  charCount: number;
  platform: string;
}) {
  const { bar } = getCharCountColor(charCount);
  const platformInfo = getPlatformIdeal(platform, charCount);

  // Normalize to a percentage for the progress bar
  const maxChars = platform === "xiaohongshu" ? 1000 : 800;
  const progress = Math.min(100, (charCount / maxChars) * 100);

  return (
    <div className="h-1 w-full rounded-full bg-muted/60 overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${bar} transition-all duration-500 ease-out`}
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function WordCountIndicator() {
  const { contentPosts, selectedPostId, platform } = useAppStore();
  const selectedPost = contentPosts.find((p) => p.id === selectedPostId);

  const charCount = useMemo(() => {
    if (!selectedPost?.content) return 0;
    return selectedPost.content.length;
  }, [selectedPost?.content]);

  const readingTime = useMemo(() => getReadingTime(charCount), [charCount]);
  const charColors = useMemo(() => getCharCountColor(charCount), [charCount]);
  const platformInfo = useMemo(
    () => getPlatformIdeal(platform, charCount),
    [platform, charCount]
  );

  const isVisible = !!selectedPostId && charCount > 0;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="border-t border-border/20 bg-muted/20 px-4 py-2 space-y-1.5"
        >
          {/* Progress bar */}
          <CountProgressBar charCount={charCount} platform={platform} />

          {/* Info row */}
          <div className="flex items-center justify-between gap-2">
            {/* Character count */}
            <div className="flex items-center gap-1.5">
              <div
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md ${charColors.bg}`}
              >
                <Type className={`h-3 w-3 ${charColors.text}`} />
                <span className={`text-[10px] font-semibold tabular-nums ${charColors.text}`}>
                  {charCount}
                </span>
                <span className="text-[9px] text-muted-foreground">字</span>
              </div>
            </div>

            {/* Reading time */}
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span className="text-[10px] tabular-nums">{readingTime}</span>
            </div>

            {/* Platform ideal length */}
            <div className="flex items-center gap-1">
              <MessageSquare className={`h-3 w-3 ${platformInfo.color}`} />
              <span className={`text-[10px] font-medium ${platformInfo.color}`}>
                {platformInfo.label} {platformInfo.ideal}
              </span>
              <span className="text-[9px] text-muted-foreground">
                {platformInfo.isInRange ? "✓" : ""}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
