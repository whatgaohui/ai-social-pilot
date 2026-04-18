"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ContentPost } from "@/types";
import type { PostStatus } from "@/types";
import { POST_STATUS_LABELS } from "@/types";
import { Wand2, FileText, Check, Send, Loader2, MessageSquare, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/store/app-store";

interface PostActionsProps {
  post: ContentPost;
  isXHS: boolean;
}

export function PostActions({ post }: PostActionsProps) {
  const updateContentPost = useAppStore((s) => s.updateContentPost);
  const persona = useAppStore((s) => s.persona);
  const knowledgeItems = useAppStore((s) => s.knowledgeItems);
  const platform = useAppStore((s) => s.platform);
  const addNotification = useAppStore((s) => s.addNotification);

  const [optimizing, setOptimizing] = useState(false);

  const handleOptimize = async () => {
    setOptimizing(true);
    try {
      const res = await fetch("/api/ai/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post,
          persona,
          feedback: "",
          knowledgeItems,
          platform,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const updateRes = await fetch(`/api/content/${post.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: data.content,
            status: "optimized",
            aiScore: Math.min(98, post.aiScore + Math.floor(Math.random() * 5) + 3),
          }),
        });
        if (updateRes.ok) {
          const updated = await updateRes.json();
          updateContentPost(post.id, updated);
          toast.success("AI优化完成");
          addNotification({
            type: "optimize",
            title: "AI优化完成",
            description: `"${post.topic}" 已通过AI智能优化，评分提升`,
            postId: post.id,
          });
          // Auto-save version snapshot before optimization
          try {
            await fetch(`/api/content/${post.id}/versions`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                content: post.content,
                changeType: "optimize",
                summary: "AI智能优化",
                aiScore: post.aiScore,
              }),
            });
          } catch (e) {
            console.error("Failed to save version snapshot:", e);
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
      setOptimizing(false);
    }
  };

  const handleStatusChange = async (status: PostStatus) => {
    try {
      const res = await fetch(`/api/content/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated = await res.json();
        updateContentPost(post.id, updated);
        toast.success(`状态已更新为${POST_STATUS_LABELS[status]}`);
        if (status === "published") {
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
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleOptimize}
        disabled={optimizing}
        variant="outline"
        className="w-full h-9 border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30"
      >
        {optimizing ? (
          <>
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            AI优化中...
          </>
        ) : (
          <>
            <Wand2 className="h-3.5 w-3.5 mr-1.5" />
            AI智能优化
          </>
        )}
      </Button>

      <div className="grid grid-cols-3 gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={() => handleStatusChange("generated")}
          disabled={post.status === "published"}
        >
          <FileText className="h-3 w-3 mr-1" />
          生成
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs border-emerald-200 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400"
          onClick={() => handleStatusChange("optimized")}
          disabled={post.status === "published"}
        >
          <Check className="h-3 w-3 mr-1" />
          优化
        </Button>
        <Button
          size="sm"
          className="h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white"
          onClick={() => handleStatusChange("published")}
        >
          <Send className="h-3 w-3 mr-1" />
          发布
        </Button>
      </div>
    </div>
  );
}
