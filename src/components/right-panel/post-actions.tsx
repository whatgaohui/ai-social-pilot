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
        }
      }
    } catch {
      toast.error("优化失败");
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
