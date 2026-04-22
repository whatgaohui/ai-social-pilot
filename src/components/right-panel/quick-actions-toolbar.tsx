"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useAppStore } from "@/store/app-store";
import {
  Copy,
  RefreshCw,
  CheckCircle2,
  CalendarPlus,
  Loader2,
} from "lucide-react";

// ─── Action Config ──────────────────────────────────────────────────────────

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: typeof Copy;
  color: string;       // text color class
  hoverBg: string;     // hover background class
  handler: () => Promise<string>;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function QuickActionsToolbar() {
  const {
    selectedPostId,
    contentPosts,
    updateContentPost,
    persona,
    knowledgeItems,
    platform,
    addNotification,
  } = useAppStore();

  const [actionStates, setActionStates] = useState<Record<string, boolean>>({});

  const selectedPost = contentPosts.find((p) => p.id === selectedPostId);
  const isVisible = !!selectedPostId && !!selectedPost;

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleCopy = useCallback(async (): Promise<string> => {
    if (!selectedPost?.content) return "暂无内容可复制";

    try {
      await navigator.clipboard.writeText(selectedPost.content);
      return "内容已复制到剪贴板";
    } catch {
      // Fallback for older browsers
      try {
        const textarea = document.createElement("textarea");
        textarea.value = selectedPost.content;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        return "内容已复制到剪贴板";
      } catch {
        return "复制失败";
      }
    }
  }, [selectedPost]);

  const handleRegenerate = useCallback(async (): Promise<string> => {
    if (!selectedPost) return "";

    const res = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "auto",
        topic: selectedPost.topic,
        platform,
        persona,
        knowledgeItems,
      }),
    });

    if (!res.ok) throw new Error("生成失败");
    const data = await res.json();
    const newContent = data.content || data.result || data.text || "";

    if (newContent) {
      const updateRes = await fetch(`/api/content/${selectedPost.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent, status: "generated" }),
      });
      if (updateRes.ok) {
        const updated = await updateRes.json();
        updateContentPost(selectedPost.id, updated);
      }
    }
    return "内容已重新生成";
  }, [selectedPost, platform, persona, knowledgeItems, updateContentPost]);

  const handleMarkComplete = useCallback(async (): Promise<string> => {
    if (!selectedPost) return "";

    const res = await fetch(`/api/content/${selectedPost.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published" }),
    });

    if (!res.ok) throw new Error("操作失败");
    const updated = await res.json();
    updateContentPost(selectedPost.id, updated);
    addNotification({
      type: "publish",
      title: "内容已发布",
      description: `"${selectedPost.topic}" 已标记为已发布`,
      postId: selectedPost.id,
    });
    return "已标记为已发布";
  }, [selectedPost, updateContentPost, addNotification]);

  const handleOpenCalendar = useCallback(async (): Promise<string> => {
    if (!selectedPost) return "";

    // Set scheduledDate to now + 1 hour as a default
    const scheduledDate = new Date();
    scheduledDate.setHours(scheduledDate.getHours() + 1, 0, 0, 0);

    const res = await fetch(`/api/content/${selectedPost.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledDate: scheduledDate.toISOString() }),
    });

    if (!res.ok) throw new Error("操作失败");
    const updated = await res.json();
    updateContentPost(selectedPost.id, updated);
    return "已添加到发布日历";
  }, [selectedPost, updateContentPost]);

  // ── Actions array ──────────────────────────────────────────────────────

  const actions: QuickAction[] = [
    {
      id: "copy",
      label: "复制内容",
      description: "一键复制当前编辑的内容到剪贴板",
      icon: Copy,
      color: "text-slate-600 dark:text-slate-400",
      hoverBg: "hover:bg-slate-100 dark:hover:bg-slate-800",
      handler: handleCopy,
    },
    {
      id: "regenerate",
      label: "重新生成",
      description: "AI重新生成当前内容",
      icon: RefreshCw,
      color: "text-violet-600 dark:text-violet-400",
      hoverBg: "hover:bg-violet-100 dark:hover:bg-violet-900/30",
      handler: handleRegenerate,
    },
    {
      id: "complete",
      label: "标记完成",
      description: "快速将状态改为已发布",
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      hoverBg: "hover:bg-emerald-100 dark:hover:bg-emerald-900/30",
      handler: handleMarkComplete,
    },
    {
      id: "calendar",
      label: "发布到日历",
      description: "添加到发布日历（默认1小时后）",
      icon: CalendarPlus,
      color: "text-rose-600 dark:text-rose-400",
      hoverBg: "hover:bg-rose-100 dark:hover:bg-rose-900/30",
      handler: handleOpenCalendar,
    },
  ];

  const executeAction = useCallback(async (action: QuickAction) => {
    setActionStates((prev) => ({ ...prev, [action.id]: true }));

    try {
      const msg = await action.handler();
      toast.success(msg);
    } catch {
      toast.error("操作失败，请重试");
    } finally {
      setTimeout(() => {
        setActionStates((prev) => ({ ...prev, [action.id]: false }));
      }, 1200);
    }
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 32,
          }}
          className="absolute bottom-0 left-0 right-0 z-40 px-4 pb-3 pointer-events-none"
        >
          <div className="relative max-w-md mx-auto pointer-events-auto">
            {/* Glow backdrop */}
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-slate-500/10 via-violet-500/10 to-rose-500/10 blur-xl opacity-50" />

            <div className="relative flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-background/80 backdrop-blur-xl border border-border/60 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
              <TooltipProvider delayDuration={300}>
                {actions.map((action, idx) => {
                  const Icon = action.icon;
                  const isLoading = actionStates[action.id] ?? false;

                  return (
                    <Tooltip key={action.id}>
                      <TooltipTrigger asChild>
                        <motion.button
                          initial={{ opacity: 0, scale: 0.7, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{
                            delay: idx * 0.07,
                            type: "spring",
                            stiffness: 500,
                            damping: 28,
                          }}
                          whileHover={{ y: -3, transition: { duration: 0.15 } }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => executeAction(action)}
                          disabled={isLoading}
                          className={`flex items-center justify-center gap-1.5 h-8 w-8 sm:h-9 sm:w-auto sm:px-3 rounded-lg ${action.hoverBg} ${action.color} transition-colors disabled:opacity-60 cursor-pointer`}
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                          <span className="hidden sm:inline text-xs font-medium">{action.label}</span>
                        </motion.button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="text-xs max-w-[180px] text-center"
                      >
                        <p className="font-medium">{action.label}</p>
                        <p className="text-muted-foreground mt-0.5 text-[10px]">{action.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </TooltipProvider>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
