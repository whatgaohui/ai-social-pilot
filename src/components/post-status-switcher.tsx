"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import type { ContentPost } from "@/types";
import { POST_STATUS_LABELS, PostStatus } from "@/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

// --- Status option metadata ---

const STATUS_OPTIONS: {
  value: PostStatus;
  label: string;
  description: string;
  dotColor: string;
  bgHover: string;
}[] = [
  {
    value: "planned",
    label: POST_STATUS_LABELS.planned,
    description: "待生成内容",
    dotColor: "bg-gray-400",
    bgHover: "hover:bg-gray-50 dark:hover:bg-gray-900/40",
  },
  {
    value: "generated",
    label: POST_STATUS_LABELS.generated,
    description: "AI 已生成初稿",
    dotColor: "bg-violet-500",
    bgHover: "hover:bg-violet-50 dark:hover:bg-violet-900/30",
  },
  {
    value: "optimized",
    label: POST_STATUS_LABELS.optimized,
    description: "内容已优化润色",
    dotColor: "bg-emerald-500",
    bgHover: "hover:bg-emerald-50 dark:hover:bg-emerald-900/30",
  },
  {
    value: "scheduled",
    label: POST_STATUS_LABELS.scheduled,
    description: "已排入发布队列",
    dotColor: "bg-cyan-500",
    bgHover: "hover:bg-cyan-50 dark:hover:bg-cyan-900/30",
  },
  {
    value: "published",
    label: POST_STATUS_LABELS.published,
    description: "已发布到平台",
    dotColor: "bg-purple-500",
    bgHover: "hover:bg-purple-50 dark:hover:bg-purple-900/30",
  },
];

// Current status badge color map
const CURRENT_BADGE: Record<PostStatus, string> = {
  planned: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  generated: "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300",
  optimized: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300",
  scheduled: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  published: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300",
};

const CURRENT_DOT: Record<PostStatus, string> = {
  planned: "bg-gray-400",
  generated: "bg-violet-500",
  optimized: "bg-emerald-500",
  scheduled: "bg-cyan-500",
  published: "bg-purple-500",
};

// --- Animation variants ---

const popoverAnimation = {
  initial: { opacity: 0, y: -4, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.15, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -4, scale: 0.96, transition: { duration: 0.1 } },
};

// --- Props ---

interface PostStatusSwitcherProps {
  post: ContentPost;
  onUpdate?: () => void;
}

// --- Component ---

export function PostStatusSwitcher({ post, onUpdate }: PostStatusSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const { updateContentPost } = useAppStore();

  const currentStatus = post.status as PostStatus;

  const handleSwitchStatus = useCallback(
    async (newStatus: PostStatus) => {
      if (newStatus === currentStatus || switching) return;

      setSwitching(true);
      try {
        const res = await fetch(`/api/content/${post.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) throw new Error("状态更新失败");

        // Optimistic local update
        updateContentPost(post.id, {
          status: newStatus,
          updatedAt: new Date().toISOString(),
        });

        toast.success("状态已更新", {
          description: `${POST_STATUS_LABELS[currentStatus]} → ${POST_STATUS_LABELS[newStatus]}`,
        });

        onUpdate?.();
        setOpen(false);
      } catch {
        toast.error("更新失败", { description: "无法修改内容状态" });
      } finally {
        setSwitching(false);
      }
    },
    [post.id, currentStatus, switching, updateContentPost, onUpdate],
  );

  const currentBadge = CURRENT_BADGE[currentStatus] || CURRENT_BADGE.planned;
  const currentDot = CURRENT_DOT[currentStatus] || CURRENT_DOT.planned;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className={`
            inline-flex items-center gap-1 px-1.5 py-[2px] rounded-full text-[8px] font-medium
            cursor-pointer select-none transition-colors duration-150
            ${currentBadge}
            ${switching ? "opacity-60 pointer-events-none" : "hover:ring-1 hover:ring-primary/30"}
          `}
          disabled={switching}
        >
          <span className={`h-[5px] w-[5px] rounded-full ${currentDot}`} />
          {POST_STATUS_LABELS[currentStatus]}
          {switching && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
        </motion.button>
      </PopoverTrigger>

      <PopoverContent
        className="w-52 p-1.5"
        align="start"
        sideOffset={4}
        asChild
      >
        <motion.div {...popoverAnimation}>
          <AnimatePresence mode="wait">
            {open && (
              <div className="space-y-0.5">
                <p className="text-[9px] text-muted-foreground font-medium px-1.5 py-1">
                  切换状态
                </p>
                {STATUS_OPTIONS.map((option) => {
                  const isSelected = option.value === currentStatus;
                  return (
                    <motion.button
                      key={option.value}
                      whileHover={{ x: 1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSwitchStatus(option.value)}
                      disabled={switching}
                      className={`
                        w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left
                        transition-colors duration-100 cursor-pointer select-none
                        ${option.bgHover}
                        ${isSelected ? "bg-primary/5 dark:bg-primary/10" : ""}
                        ${switching ? "opacity-50 pointer-events-none" : ""}
                      `}
                    >
                      {/* Colored dot */}
                      <span
                        className={`h-[7px] w-[7px] rounded-full flex-shrink-0 ${option.dotColor}`}
                      />

                      {/* Label + description */}
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-medium leading-tight">
                          {option.label}
                        </div>
                        <div className="text-[8px] text-muted-foreground leading-tight">
                          {option.description}
                        </div>
                      </div>

                      {/* Checkmark for selected */}
                      {isSelected && (
                        <Check className="h-3 w-3 text-primary flex-shrink-0" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </PopoverContent>
    </Popover>
  );
}

export default PostStatusSwitcher;
