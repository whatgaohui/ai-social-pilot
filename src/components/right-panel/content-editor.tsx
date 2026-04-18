"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ContentPost } from "@/types";
import { Copy, Edit3, Check } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/store/app-store";

interface ContentEditorProps {
  post: ContentPost;
  isXHS: boolean;
}

export function ContentEditor({ post, isXHS }: ContentEditorProps) {
  const updateContentPost = useAppStore((s) => s.updateContentPost);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");

  const startEdit = () => {
    setEditContent(post.content);
    setEditing(true);
  };

  const saveEdit = async () => {
    try {
      const res = await fetch(`/api/content/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      if (res.ok) {
        const updated = await res.json();
        updateContentPost(post.id, updated);
        setEditing(false);
        toast.success("内容已更新");
      }
    } catch {
      toast.error("更新失败");
    }
  };

  const handleCopy = () => {
    if (post.content) {
      navigator.clipboard.writeText(post.content);
      toast.success("已复制到剪贴板");
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        {editing ? (
          <div className="space-y-3">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[150px] text-sm leading-relaxed resize-none"
            />
            <div className="flex gap-2">
              <Button onClick={saveEdit} size="sm" className="flex-1">
                <Check className="h-3.5 w-3.5 mr-1" />
                保存
              </Button>
              <Button onClick={() => setEditing(false)} variant="outline" size="sm">
                取消
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative group">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
            <div className="absolute top-0 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="secondary"
                size="sm"
                className="h-7 px-2 shadow-sm"
                onClick={handleCopy}
              >
                <Copy className="h-3 w-3" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-7 px-2 shadow-sm"
                onClick={startEdit}
              >
                <Edit3 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
        {/* Character count for Xiaohongshu */}
        {isXHS && (
          <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
            <span>字数统计</span>
            <span className={post.content.length > 500 ? 'text-amber-500' : post.content.length < 200 ? 'text-red-400' : 'text-emerald-500'}>
              {post.content.length} 字 {post.content.length < 200 ? '(偏短)' : post.content.length > 500 ? '(偏长)' : '(合适)'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
