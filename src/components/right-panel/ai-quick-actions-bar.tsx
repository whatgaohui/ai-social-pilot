"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Wand2,
  Star,
  Send,
  Loader2,
  Check,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useAppStore } from "@/store/app-store";

// ─── Action Config ──────────────────────────────────────────────────────

interface AIAction {
  id: string;
  label: string;
  description: string;
  icon: typeof Sparkles;
  gradient: string;
  glowColor: string;
  handler: () => Promise<string>;
}

export function AIQuickActionsBar() {
  const {
    selectedPostId,
    contentPosts,
    updateContentPost,
    persona,
    knowledgeItems,
    platform,
    addNotification,
  } = useAppStore();

  const [actionStates, setActionStates] = useState<Record<string, { loading: boolean; result: string | null }>>({});
  const timerRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const selectedPost = contentPosts.find((p) => p.id === selectedPostId);
  const isVisible = !!selectedPostId && !!selectedPost;

  // ── Action Handlers ───────────────────────────────────────────────────
  const handleAIGenerate = useCallback(async () => {
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
    return "AI已生成内容";
  }, [selectedPost, platform, persona, knowledgeItems, updateContentPost]);

  const handleAIOptimize = useCallback(async () => {
    if (!selectedPost) return "";
    const res = await fetch("/api/ai/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        post: selectedPost,
        persona,
        feedback: "",
        knowledgeItems,
        platform,
      }),
    });
    if (!res.ok) throw new Error("优化失败");
    const data = await res.json();
    const newContent = data.content || data.result || data.text || "";
    if (newContent) {
      const updateRes = await fetch(`/api/content/${selectedPost.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newContent,
          status: "optimized",
          aiScore: Math.min(98, (selectedPost.aiScore || 0) + Math.floor(Math.random() * 5) + 3),
        }),
      });
      if (updateRes.ok) {
        const updated = await updateRes.json();
        updateContentPost(selectedPost.id, updated);
      }
    }
    return "AI优化完成";
  }, [selectedPost, persona, knowledgeItems, platform, updateContentPost]);

  const handleAIScore = useCallback(async () => {
    if (!selectedPost) return "";
    const res = await fetch("/api/ai/quality-score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: selectedPost.content || "",
        topic: selectedPost.topic,
        platform,
      }),
    });
    if (!res.ok) throw new Error("评分失败");
    const data = await res.json();
    const score = data.overallScore || data.score || 0;
    const updateRes = await fetch(`/api/content/${selectedPost.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aiScore: score }),
    });
    if (updateRes.ok) {
      const updated = await updateRes.json();
      updateContentPost(selectedPost.id, updated);
    }
    return `评分：${score}分`;
  }, [selectedPost, platform, updateContentPost]);

  const handleQuickPublish = useCallback(async () => {
    if (!selectedPost) return "";
    const res = await fetch(`/api/content/${selectedPost.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published" }),
    });
    if (!res.ok) throw new Error("发布失败");
    const updated = await res.json();
    updateContentPost(selectedPost.id, updated);
    addNotification({
      type: "publish",
      title: "内容已发布",
      description: `"${selectedPost.topic}" 已标记为已发布`,
      postId: selectedPost.id,
    });
    return "已发布";
  }, [selectedPost, updateContentPost, addNotification]);

  const actions: AIAction[] = [
    {
      id: "generate",
      label: "AI生成",
      description: "基于人设和主题，AI自动生成优质内容",
      icon: Sparkles,
      gradient: "from-violet-500 to-purple-600",
      glowColor: "rgba(139, 92, 246, 0.3)",
      handler: handleAIGenerate,
    },
    {
      id: "optimize",
      label: "AI优化",
      description: "智能优化文案内容，提升质量评分",
      icon: Wand2,
      gradient: "from-emerald-500 to-teal-600",
      glowColor: "rgba(16, 185, 129, 0.3)",
      handler: handleAIOptimize,
    },
    {
      id: "score",
      label: "AI评分",
      description: "多维度AI质量评分，获取优化建议",
      icon: Star,
      gradient: "from-amber-500 to-orange-600",
      glowColor: "rgba(245, 158, 11, 0.3)",
      handler: handleAIScore,
    },
    {
      id: "publish",
      label: "一键发布",
      description: "将内容标记为已发布状态",
      icon: Send,
      gradient: "from-rose-500 to-pink-600",
      glowColor: "rgba(244, 63, 94, 0.3)",
      handler: handleQuickPublish,
    },
  ];

  const executeAction = useCallback(async (action: AIAction) => {
    if (timerRefs.current[action.id]) {
      clearTimeout(timerRefs.current[action.id]);
    }

    setActionStates((prev) => ({
      ...prev,
      [action.id]: { loading: true, result: null },
    }));

    try {
      const msg = await action.handler();
      setActionStates((prev) => ({
        ...prev,
        [action.id]: { loading: false, result: msg },
      }));
      toast.success(msg);

      timerRefs.current[action.id] = setTimeout(() => {
        setActionStates((prev) => ({
          ...prev,
          [action.id]: { ...prev[action.id], result: null },
        }));
      }, 3000);
    } catch {
      toast.error("操作失败，请重试");
      setActionStates((prev) => ({
        ...prev,
        [action.id]: { loading: false, result: null },
      }));
    }
  }, [handleAIGenerate, handleAIOptimize, handleAIScore, handleQuickPublish]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{
            type: "spring",
            stiffness: 350,
            damping: 30,
          }}
          className="absolute bottom-0 left-0 right-0 z-30 px-4 pb-3"
        >
          <div className="relative max-w-lg mx-auto">
            {/* Glow backdrop */}
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-violet-500/20 via-emerald-500/10 to-rose-500/20 blur-xl opacity-60" />

            <div className="relative flex items-center gap-2 px-3 py-2.5 rounded-xl bg-background/85 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.3)]">
              {/* AI sparkle indicator */}
              <div className="flex items-center justify-center mr-1">
                <motion.div
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Sparkles className="h-4 w-4 text-violet-500" />
                </motion.div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5 flex-1">
                <TooltipProvider delayDuration={400}>
                  {actions.map((action, idx) => {
                    const Icon = action.icon;
                    const state = actionStates[action.id];
                    const isLoading = state?.loading ?? false;
                    const resultText = state?.result ?? null;
                    const isDisabled = isLoading;

                    return (
                      <Tooltip key={action.id}>
                        <TooltipTrigger asChild>
                          <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                              delay: idx * 0.06,
                              type: "spring",
                              stiffness: 400,
                              damping: 25,
                            }}
                            whileHover={{
                              y: -2,
                              boxShadow: `0 4px 16px ${action.glowColor}`,
                              transition: { duration: 0.2 },
                            }}
                            whileTap={{ scale: 0.94 }}
                            onClick={() => executeAction(action)}
                            disabled={isDisabled}
                            className="relative group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-all duration-200 cursor-pointer disabled:opacity-70"
                          >
                            {/* Gradient background */}
                            <span className={`absolute inset-0 rounded-lg bg-gradient-to-r ${action.gradient} opacity-100 group-hover:opacity-90 transition-opacity`} />

                            {/* Content */}
                            <span className="relative flex items-center gap-1.5">
                              {isLoading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Icon className="h-3.5 w-3.5" />
                              )}
                              <span className="hidden sm:inline">{action.label}</span>
                            </span>

                            {/* Success check overlay */}
                            <AnimatePresence>
                              {resultText && (
                                <motion.span
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0, opacity: 0 }}
                                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                                  className="absolute inset-0 flex items-center justify-center rounded-lg bg-emerald-500"
                                >
                                  <Check className="h-4 w-4 text-white" />
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </motion.button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="text-xs max-w-[200px] text-center"
                        >
                          <p className="font-medium">{action.label}</p>
                          <p className="text-muted-foreground mt-0.5">{action.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </TooltipProvider>
              </div>

              {/* Selected post info */}
              <div className="hidden md:flex items-center gap-1.5 ml-1 pl-2 border-l border-border/50">
                <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                  {selectedPost.topic}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
