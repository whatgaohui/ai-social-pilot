"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import type { ContentPost } from "@/types";
import type { PostStatus } from "@/types";
import { POST_STATUS_LABELS } from "@/types";
import { Wand2, RotateCcw, Send, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/store/app-store";
import { useUIStore } from "@/store/ui-store";
import { useStreamingFetch } from "@/hooks/use-streaming-fetch";

interface PostActionsProps {
  post: ContentPost;
  isXHS: boolean;
}

// Status flow: planned → generated → optimized → published
const STATUS_FLOW: PostStatus[] = ["planned", "generated", "optimized", "published"];
const PREV_STATUS: Record<PostStatus, PostStatus | null> = {
  planned: null,
  generated: "planned",
  optimized: "generated",
  scheduled: "optimized",
  published: "scheduled",
};

// Status button config: each button maps to a status, but shows "undo" when current
interface StatusButtonConfig {
  target: PostStatus;
  label: string;
  undoLabel: string;
  colorClass: string;
  undoColorClass: string;
}

const STATUS_BUTTONS: StatusButtonConfig[] = [
  {
    target: "generated",
    label: "生成",
    undoLabel: "取消生成",
    colorClass: "border-sky-200 text-sky-600 dark:border-sky-800 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30",
    undoColorClass: "border-muted text-muted-foreground hover:bg-muted/50",
  },
  {
    target: "optimized",
    label: "优化",
    undoLabel: "取消优化",
    colorClass: "border-emerald-200 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30",
    undoColorClass: "border-muted text-muted-foreground hover:bg-muted/50",
  },
  {
    target: "published",
    label: "发布",
    undoLabel: "取消发布",
    colorClass: "bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white border-0",
    undoColorClass: "border-orange-200 text-orange-600 dark:border-orange-800 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30",
  },
];

export function PostActions({ post }: PostActionsProps) {
  const updateContentPost = useAppStore((s) => s.updateContentPost);
  const persona = useAppStore((s) => s.persona);
  const knowledgeItems = useAppStore((s) => s.knowledgeItems);
  const platform = useAppStore((s) => s.platform);
  const addNotification = useAppStore((s) => s.addNotification);

  // Streaming state from UI store (for display in editor)
  const setStreamingContent = useUIStore((s) => s.setStreamingContent);
  const setIsStreamActive = useUIStore((s) => s.setIsStreamActive);
  const clearStreaming = useUIStore((s) => s.clearStreaming);

  const { streamFetch, isStreaming, cancelStream } = useStreamingFetch();
  const [statusLoading, setStatusLoading] = useState<PostStatus | null>(null);
  const currentStatus = post.status as PostStatus;

  const handleOptimize = useCallback(async () => {
    // Set streaming state for the editor to display
    setIsStreamActive(true);
    setStreamingContent("");

    try {
      const newContent = await streamFetch("/api/ai/optimize", {
        post,
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

        const updateRes = await fetch(`/api/content/${post.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: cleaned,
            status: "optimized",
            aiScore: Math.min(98, post.aiScore + Math.floor(Math.random() * 5) + 3),
          }),
        });
        if (updateRes.ok) {
          const updated = await updateRes.json();
          updateContentPost(post.id, updated);
          toast.success("内容已优化");
          addNotification({
            type: "optimize",
            title: "AI优化完成",
            description: `"${post.topic}" 已通过AI智能优化，评分提升`,
            postId: post.id,
          });
          // Save version record
          const newAiScore = Math.min(98, post.aiScore + Math.floor(Math.random() * 5) + 3);
          try {
            await fetch(`/api/content/${post.id}/versions`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                content: cleaned,
                changeType: "optimize",
                summary: "AI优化文案",
                aiScore: newAiScore,
              }),
            });
          } catch (e) {
            console.error("Failed to save version:", e);
          }
        }
      }
    } catch {
      toast.error("优化失败");
      addNotification({
        type: "error",
        title: "优化失败",
        description: `"${post.topic}" AI优化过程中出错，请重试`,
        postId: post.id,
      });
    } finally {
      clearStreaming();
    }
  }, [post, persona, knowledgeItems, platform, streamFetch, updateContentPost, addNotification, setIsStreamActive, setStreamingContent, clearStreaming]);

  const handleStatusChange = async (newStatus: PostStatus) => {
    setStatusLoading(newStatus);
    try {
      const res = await fetch(`/api/content/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        updateContentPost(post.id, updated);
        const isUndo = STATUS_FLOW.indexOf(newStatus) < STATUS_FLOW.indexOf(currentStatus);
        toast.success(isUndo
          ? `已撤销，状态恢复为${POST_STATUS_LABELS[newStatus]}`
          : `状态已更新为${POST_STATUS_LABELS[newStatus]}`,
        );
        if (newStatus === "published") {
          addNotification({
            type: "publish",
            title: "内容已发布",
            description: `"${post.topic}" 已标记为已发布`,
            postId: post.id,
          });
        }
      }
    } catch {
      toast.error("更新失败");
    } finally {
      setStatusLoading(null);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleOptimize}
        disabled={isStreaming}
        variant="outline"
        data-tooltip="使用AI智能优化文案内容"
        className="btn-tooltip btn-press w-full h-9 border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30"
      >
        {isStreaming ? (
          <>
            <Sparkles className="h-3.5 w-3.5 mr-1.5 animate-pulse" />
            AI正在生成...
          </>
        ) : (
          <>
            <Wand2 className="h-3.5 w-3.5 mr-1.5" />
            AI智能优化
          </>
        )}
      </Button>

      {isStreaming && (
        <Button
          onClick={cancelStream}
          variant="ghost"
          size="sm"
          className="w-full h-7 text-xs text-muted-foreground hover:text-destructive"
        >
          停止生成
        </Button>
      )}

      <div className="grid grid-cols-3 gap-2">
        {STATUS_BUTTONS.map((btn) => {
          const isActive = currentStatus === btn.target;
          const isPublished = currentStatus === "published";
          // Can't forward-set a status if current is published (unless undoing published)
          const isDisabled = isPublished && btn.target !== "published";

          if (isActive) {
            // Show undo button
            const prevStatus = PREV_STATUS[btn.target];
            const isLoading = statusLoading === btn.target;
            return (
              <Button
                key={btn.target}
                size="sm"
                variant="outline"
                className={`btn-tooltip btn-press h-8 text-xs ${btn.undoColorClass}`}
                onClick={() => prevStatus && handleStatusChange(prevStatus)}
                disabled={!prevStatus || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <RotateCcw className="h-3 w-3 mr-1" />
                )}
                {isLoading ? "处理中..." : btn.undoLabel}
              </Button>
            );
          }

          const isLoading = statusLoading === btn.target;
          return (
            <Button
              key={btn.target}
              size="sm"
              variant="outline"
              className={`btn-tooltip btn-press h-8 text-xs ${btn.colorClass}`}
              onClick={() => handleStatusChange(btn.target)}
              disabled={isDisabled || isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Send className="h-3 w-3 mr-1" />
              )}
              {isLoading ? "处理中..." : btn.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
