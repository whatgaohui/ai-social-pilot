"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Hash, Sparkles, Copy, Loader2, Plus, X, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/store/app-store";

interface HashtagRecommenderProps {
  postTopic: string;
  postContent: string;
  onSelectHashtag?: (tag: string) => void;
}

const QUICK_TAGS = [
  "#好物推荐", "#生活日常", "#知识分享", "#干货", "#职场",
  "#美食", "#旅行", "#穿搭", "#护肤", "#健身",
  "#读书", "#自律", "#成长", "#省钱", "#测评",
];

export function HashtagRecommender({
  postTopic,
  postContent,
  onSelectHashtag,
}: HashtagRecommenderProps) {
  const { platform } = useAppStore();
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [generating, setGenerating] = useState(false);

  const formatTag = (tag: string) => {
    const t = tag.trim().replace(/^#+/, "");
    return t ? `#${t}` : "";
  };

  const addTag = useCallback((tag: string) => {
    const formatted = formatTag(tag);
    if (!formatted) return;
    setHashtags((prev) => {
      if (prev.includes(formatted)) return prev;
      return [...prev, formatted];
    });
    onSelectHashtag?.(formatted);
  }, [onSelectHashtag]);

  const removeTag = useCallback((tag: string) => {
    setHashtags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleCustomAdd = () => {
    if (!customInput.trim()) return;
    addTag(customInput);
    setCustomInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCustomAdd();
    }
  };

  const handleGenerateAI = async () => {
    if (!postTopic && !postContent) {
      toast.error("请先输入帖子主题或内容");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "auto",
          topic: "为以下内容推荐5-8个小红书热门话题标签",
          existingContent: postTopic + "\n" + postContent,
          platform: "xiaohongshu",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const generated = data.content || "";
        // Parse hashtags from the AI response (lines starting with #)
        const parsed = generated
          .split(/[\n,，、\s]+/)
          .map((s: string) => s.trim())
          .filter((s: string) => s.startsWith("#"))
          .map((s: string) => formatTag(s))
          .filter(Boolean);
        if (parsed.length > 0) {
          setHashtags(parsed);
          toast.success(`已生成 ${parsed.length} 个推荐标签`);
        } else {
          // Fallback: try extracting any #hashtags from the full text
          const matches = generated.match(/#[\u4e00-\u9fff\w]+/g);
          if (matches) {
            const fallback = [...new Set(matches.map(formatTag).filter(Boolean))];
            setHashtags(fallback);
            toast.success(`已生成 ${fallback.length} 个推荐标签`);
          } else {
            toast.error("未能解析到有效标签，请重试");
          }
        }
      } else {
        toast.error("AI生成失败，请重试");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyTag = (tag: string) => {
    navigator.clipboard.writeText(tag);
    toast.success(`已复制 ${tag}`);
  };

  const handleCopyAll = () => {
    if (hashtags.length === 0) {
      toast.error("暂无标签可复制");
      return;
    }
    navigator.clipboard.writeText(hashtags.join(" "));
    toast.success(`已复制 ${hashtags.length} 个标签`);
  };

  const isQuickTagSelected = (tag: string) => hashtags.includes(tag);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-red-500/10 flex items-center justify-center">
            <Hash className="h-3.5 w-3.5 text-red-500" />
          </div>
          话题标签推荐
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* AI Generate Button */}
        <Button
          onClick={handleGenerateAI}
          disabled={generating}
          size="sm"
          className="w-full h-8 text-xs gap-1.5 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white shadow-sm"
        >
          {generating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              AI推荐中...
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              AI智能推荐标签
            </>
          )}
        </Button>

        {/* Manual Input */}
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <Hash className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入自定义标签"
              className="h-7 pl-7 pr-2 text-xs"
            />
          </div>
          <Button
            onClick={handleCustomAdd}
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0 shrink-0 border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 dark:border-red-800 dark:hover:bg-red-950/30"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Selected Hashtags */}
        <AnimatePresence mode="popLayout">
          {hashtags.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-medium">
                  已选标签 ({hashtags.length})
                </span>
                <div className="flex gap-1">
                  <Button
                    onClick={() => setHashtags([])}
                    size="sm"
                    variant="ghost"
                    className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-red-500"
                  >
                    清空
                  </Button>
                  <Button
                    onClick={handleCopyAll}
                    size="sm"
                    variant="ghost"
                    className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-primary gap-0.5"
                  >
                    <Copy className="h-2.5 w-2.5" />
                    复制全部
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {hashtags.map((tag) => (
                  <motion.span
                    key={tag}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    layout
                  >
                    <Badge
                      className="cursor-pointer select-none gap-1 px-2 py-0.5 text-[11px] font-medium bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50 border border-red-200/50 dark:border-red-800/50 transition-colors"
                      onClick={() => handleCopyTag(tag)}
                    >
                      {tag}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTag(tag);
                        }}
                        className="ml-0.5 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  </motion.span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Tags */}
        <div className="space-y-1.5">
          <span className="text-[10px] text-muted-foreground font-medium">
            热门标签
          </span>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_TAGS.map((tag) => (
              <motion.button
                key={tag}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (isQuickTagSelected(tag)) {
                    removeTag(tag);
                  } else {
                    addTag(tag);
                  }
                }}
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                  isQuickTagSelected(tag)
                    ? "bg-red-500 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                }`}
              >
                {tag}
              </motion.button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
