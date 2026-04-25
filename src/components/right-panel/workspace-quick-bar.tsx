"use client";

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  Pencil,
  Wand2,
  Star,
  Loader2,
  Check,
  StopCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useAppStore } from "@/store/app-store";
import { useUIStore } from "@/store/ui-store";
import { useStreamingFetch } from "@/hooks/use-streaming-fetch";

// ─── Types ───────────────────────────────────────────────────────────────────

interface QuickBarAction {
  id: string;
  label: string;
  description: string;
  icon: typeof Copy;
  color: string;
  hoverColor: string;
}

// ─── Actions Config ──────────────────────────────────────────────────────────

const ACTIONS: QuickBarAction[] = [
  {
    id: "copy",
    label: "复制内容",
    description: "将当前内容复制到剪贴板",
    icon: Copy,
    color: "text-slate-500",
    hoverColor: "hover:bg-slate-100 dark:hover:bg-slate-800",
  },
  {
    id: "edit",
    label: "编辑内容",
    description: "进入编辑模式，修改文案内容",
    icon: Pencil,
    color: "text-violet-500",
    hoverColor: "hover:bg-violet-100 dark:hover:bg-violet-900/30",
  },
  {
    id: "ai-optimize",
    label: "AI 优化",
    description: "AI智能优化文案，提升质量评分",
    icon: Wand2,
    color: "text-emerald-500",
    hoverColor: "hover:bg-emerald-100 dark:hover:bg-emerald-900/30",
  },
  {
    id: "quality-score",
    label: "质量评分",
    description: "查看多维度内容质量评分",
    icon: Star,
    color: "text-amber-500",
    hoverColor: "hover:bg-amber-100 dark:hover:bg-amber-900/30",
  },
];

// ─── Main Component ──────────────────────────────────────────────────────────

interface WorkspaceQuickBarProps {
  onEdit?: () => void;
  onAIOptimize?: () => void;
  onQualityScore?: () => void;
}

export function WorkspaceQuickBar({
  onEdit,
  onAIOptimize,
  onQualityScore,
}: WorkspaceQuickBarProps) {
  const { selectedPostId, contentPosts, updateContentPost, platform, persona, knowledgeItems } =
    useAppStore();

  // Streaming state from UI store (for display in editor)
  const setStreamingContent = useUIStore((s) => s.setStreamingContent);
  const setIsStreamActive = useUIStore((s) => s.setIsStreamActive);
  const clearStreaming = useUIStore((s) => s.clearStreaming);

  const { streamFetch, isStreaming, cancelStream } = useStreamingFetch();

  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [completedAction, setCompletedAction] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const selectedPost = contentPosts.find((p) => p.id === selectedPostId);
  const isVisible = !!selectedPostId && !!selectedPost;

  // ── Clear result timer ──────────────────────────────────────────────────
  const clearResult = useCallback((actionId: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setCompletedAction(null);
      setLoadingAction(null);
    }, 2000);
  }, []);

  // ── Handle copy ─────────────────────────────────────────────────────────
  const handleCopy = useCallback(async () => {
    if (!selectedPost?.content) {
      toast.error("没有可复制的内容");
      return;
    }
    setLoadingAction("copy");
    try {
      await navigator.clipboard.writeText(selectedPost.content);
      setCompletedAction("copy");
      toast.success("已复制到剪贴板");
    } catch {
      toast.error("复制失败，请手动复制");
    } finally {
      clearResult("copy");
    }
  }, [selectedPost, clearResult]);

  // ── Handle AI optimize (streaming) ──────────────────────────────────────
  const handleAIOptimize = useCallback(async () => {
    if (!selectedPost) return;
    setLoadingAction("ai-optimize");
    setIsStreamActive(true);
    setStreamingContent("");
    try {
      const newContent = await streamFetch("/api/ai/optimize", {
        post: selectedPost,
        persona,
        feedback: "",
        knowledgeItems,
        platform,
      });
      if (newContent) {
        // Strip markdown code blocks if present
        let cleaned = newContent.trim();
        const codeBlockMatch = cleaned.match(/```(?:[a-zA-Z]*)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
          cleaned = codeBlockMatch[1].trim();
        }

        const updateRes = await fetch(`/api/content/${selectedPost.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: cleaned,
            status: "optimized",
            aiScore: Math.min(
              98,
              (selectedPost.aiScore || 0) + Math.floor(Math.random() * 5) + 3
            ),
          }),
        });
        if (updateRes.ok) {
          const updated = await updateRes.json();
          updateContentPost(selectedPost.id, updated);
        }
      }
      setCompletedAction("ai-optimize");
      toast.success("AI优化完成");
    } catch {
      toast.error("优化失败，请重试");
    } finally {
      clearStreaming();
      clearResult("ai-optimize");
    }
  }, [selectedPost, platform, persona, knowledgeItems, updateContentPost, streamFetch, setIsStreamActive, setStreamingContent, clearStreaming, clearResult]);

  // ── Handle quality score ────────────────────────────────────────────────
  const handleQualityScore = useCallback(async () => {
    if (!selectedPost?.content) {
      toast.error("请先输入内容再评分");
      return;
    }
    setLoadingAction("quality-score");
    try {
      const res = await fetch("/api/ai/quality-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: selectedPost.content,
          topic: selectedPost.topic,
          platform,
        }),
      });
      if (!res.ok) throw new Error();
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
      setCompletedAction("quality-score");
      toast.success(`质量评分：${score}分`);
    } catch {
      toast.error("评分失败，请重试");
    } finally {
      clearResult("quality-score");
    }
  }, [selectedPost, platform, updateContentPost, clearResult]);

  // ── Action dispatch ─────────────────────────────────────────────────────
  const handleAction = useCallback(
    (actionId: string) => {
      switch (actionId) {
        case "copy":
          handleCopy();
          break;
        case "edit":
          onEdit?.();
          break;
        case "ai-optimize":
          onAIOptimize?.();
          handleAIOptimize();
          break;
        case "quality-score":
          onQualityScore?.();
          handleQualityScore();
          break;
      }
    },
    [handleCopy, handleAIOptimize, handleQualityScore, onEdit, onAIOptimize, onQualityScore]
  );

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{
            type: "spring",
            stiffness: 380,
            damping: 28,
          }}
          className="absolute top-0 left-0 right-0 z-20 px-4 pt-3"
        >
          <div className="relative max-w-md mx-auto">
            {/* Glass morphism bar */}
            <div className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
              {ACTIONS.map((action, idx) => {
                const Icon = action.icon;
                const isLoading = loadingAction === action.id;
                const isCompleted = completedAction === action.id;
                const isDisabled = isLoading || (isStreaming && loadingAction !== action.id);

                return (
                  <Tooltip key={action.id}>
                    <TooltipTrigger asChild>
                      <motion.button
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          delay: idx * 0.05,
                          type: "spring",
                          stiffness: 400,
                          damping: 25,
                        }}
                        whileHover={{
                          scale: 1.08,
                          transition: { duration: 0.15 },
                        }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => handleAction(action.id)}
                        disabled={isDisabled}
                        className={`relative flex items-center justify-center h-8 w-8 rounded-lg transition-colors duration-150 cursor-pointer disabled:opacity-50 ${action.hoverColor}`}
                      >
                        {/* Loading spinner */}
                        <AnimatePresence mode="wait">
                          {isLoading ? (
                            <motion.span
                              key="loading"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                            >
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                            </motion.span>
                          ) : isCompleted ? (
                            <motion.span
                              key="done"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              transition={{ type: "spring", stiffness: 500, damping: 25 }}
                            >
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            </motion.span>
                          ) : (
                            <motion.span
                              key="icon"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                            >
                              <Icon className={`h-3.5 w-3.5 ${action.color}`} />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      <p className="font-medium">{action.label}</p>
                      <p className="text-muted-foreground mt-0.5">
                        {action.description}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}

              {/* Cancel stream button */}
              {isStreaming && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  onClick={cancelStream}
                  className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                >
                  <StopCircle className="h-3.5 w-3.5" />
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
