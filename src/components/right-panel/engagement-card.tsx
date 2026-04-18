"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ContentPost } from "@/types";
import { MessageSquare, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/store/app-store";

interface EngagementCardProps {
  post: ContentPost;
  isXHS: boolean;
}

export function EngagementCard({ post, isXHS }: EngagementCardProps) {
  const updateContentPost = useAppStore((s) => s.updateContentPost);

  const handleSimulateData = async () => {
    const data = {
      views: Math.floor(Math.random() * 500) + 100,
      likes: Math.floor(Math.random() * 50) + 5,
      comments: Math.floor(Math.random() * 20),
      shares: Math.floor(Math.random() * 10),
      ...(isXHS ? { favorites: Math.floor(Math.random() * 30) + 2 } : {}),
    };
    const res = await fetch(`/api/content/${post.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const updated = await res.json();
      updateContentPost(post.id, updated);
      toast.success("已生成模拟互动数据");
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            互动数据
          </CardTitle>
          {(post.views === 0 || !post.views) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] text-muted-foreground"
              onClick={handleSimulateData}
            >
              <Sparkles className="h-3 w-3 mr-0.5" />
              模拟数据
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className={`grid gap-2 ${isXHS ? 'grid-cols-5' : 'grid-cols-4'}`}>
          {[
            { label: "浏览", value: post.views || "—" },
            { label: "点赞", value: post.likes || "—" },
            { label: "评论", value: post.comments || "—" },
            ...(isXHS ? [{ label: "收藏", value: post.favorites || "—" }] : []),
            { label: "转发", value: post.shares || "—" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-lg font-semibold">{stat.value}</div>
              <div className="text-[10px] text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
