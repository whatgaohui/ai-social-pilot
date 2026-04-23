"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import type { Platform, ContentType, XHSContentType } from "@/types";
import {
  PLATFORM_LABELS,
  PLATFORM_COLORS,
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_COLORS,
  XHS_CONTENT_TYPE_LABELS,
  XHS_CONTENT_TYPE_COLORS,
} from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  Copy,
  Globe,
  ArrowRight,
  CalendarPlus,
} from "lucide-react";
import { toast } from "sonner";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { safeFormat } from "@/lib/safe-date";

export function CrossPlatformPublish() {
  const {
    contentPosts,
    selectedPostId,
    currentPlan,
    addContentPost,
    platform,
    persona,
    knowledgeItems,
    setSelectedPostId,
  } = useAppStore();

  const [isOpen, setIsOpen] = useState(false);
  const [adapting, setAdapting] = useState(false);
  const [adaptedContent, setAdaptedContent] = useState("");
  const [adaptedContentType, setAdaptedContentType] = useState<string>("text");
  const [adaptedDate, setAdaptedDate] = useState("");
  const [publishing, setPublishing] = useState(false);
  const { copied, copy } = useCopyToClipboard();

  // Determine target platform (the OTHER platform)
  const targetPlatform: Platform = platform === "wechat" ? "xiaohongshu" : "wechat";
  const sourcePlatform: Platform = platform;

  // Find the currently selected post
  const selectedPost = useMemo(
    () => contentPosts.find((p) => p.id === selectedPostId),
    [contentPosts, selectedPostId]
  );

  // Check if a cross-platform version already exists (same scheduledDate, different platform)
  const crossPlatformVersion = useMemo(() => {
    if (!selectedPost) return null;
    return contentPosts.find(
      (p) =>
        p.id !== selectedPost.id &&
        p.scheduledDate === selectedPost.scheduledDate &&
        p.platform !== selectedPost.platform &&
        (p.platform === targetPlatform || (!p.platform && targetPlatform === platform) === false)
    );
  }, [contentPosts, selectedPost, targetPlatform, platform]);

  // Content type options for the target platform
  const contentTypeOptions = useMemo(() => {
    if (targetPlatform === "xiaohongshu") {
      return (Object.entries(XHS_CONTENT_TYPE_LABELS) as [XHSContentType, string][]).map(
        ([value, label]) => ({ value, label })
      );
    }
    return (Object.entries(CONTENT_TYPE_LABELS) as [ContentType, string][]).map(
      ([value, label]) => ({ value, label })
    );
  }, [targetPlatform]);

  const getContentTypeColor = (ct: string) => {
    if (targetPlatform === "xiaohongshu")
      return XHS_CONTENT_TYPE_COLORS[ct as XHSContentType] || "";
    return CONTENT_TYPE_COLORS[ct as ContentType] || "";
  };

  const getContentTypeLabel = (ct: string) => {
    if (targetPlatform === "xiaohongshu")
      return XHS_CONTENT_TYPE_LABELS[ct as XHSContentType] || ct;
    return CONTENT_TYPE_LABELS[ct as ContentType] || ct;
  };

  // Get platform badge color
  const getTargetBadgeStyle = () => {
    if (targetPlatform === "wechat") {
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800";
    }
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800";
  };

  const getSourceBadgeStyle = () => {
    if (sourcePlatform === "wechat") {
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800";
    }
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800";
  };

  // Build the platform-specific prompt for adaptation
  const buildAdaptPrompt = (post: NonNullable<typeof selectedPost>) => {
    const sourcePlatformName = PLATFORM_LABELS[sourcePlatform];
    const targetPlatformName = PLATFORM_LABELS[targetPlatform];
    return `你是一个多平台内容运营专家。请将以下${sourcePlatformName}内容改编为${targetPlatformName}风格。

原始内容：
${post.content}
原始主题：${post.topic}

改编要求：
${targetPlatform === "xiaohongshu" ? "小红书风格：emoji丰富、话题标签(#标签)、15-25字标题、种草语气" : "朋友圈风格：简洁自然、情感共鸣、避免过度营销感"}

请直接输出改编后的完整内容，不要解释。`;
  };

  // Handle the cross-platform adaptation
  const handleAdapt = async () => {
    if (!selectedPost) return;
    setAdapting(true);
    setAdaptedContent("");

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "auto",
          platform: targetPlatform,
          persona,
          knowledgeItems,
          existingContent: buildAdaptPrompt(selectedPost),
          topic: selectedPost.topic,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAdaptedContent(data.content);
        // Set default date to match original post
        if (selectedPost.scheduledDate) {
          setAdaptedDate(selectedPost.scheduledDate);
        }
        // Set a sensible default content type
        if (targetPlatform === "xiaohongshu") {
          setAdaptedContentType("seeding");
        } else {
          setAdaptedContentType("text");
        }
        toast.success("内容改编完成");
      } else {
        toast.error("改编失败，请重试");
      }
    } catch {
      toast.error("改编失败");
    } finally {
      setAdapting(false);
    }
  };

  // Handle saving the adapted content to the calendar
  const handlePublishToCalendar = async () => {
    if (!adaptedContent.trim()) {
      toast.error("请先生成改编内容");
      return;
    }
    if (!adaptedDate) {
      toast.error("请选择发布日期");
      return;
    }
    if (!currentPlan?.id) {
      toast.error("请先生成内容计划");
      return;
    }

    setPublishing(true);
    try {
      const dateStr = safeFormat(new Date(adaptedDate), "yyyy-MM-dd");
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: currentPlan.id,
          scheduledDate: dateStr,
          contentType: adaptedContentType,
          topic: selectedPost?.topic || "跨平台同步",
          content: adaptedContent,
          platform: targetPlatform,
          status: "generated",
          generationType: "auto",
          likes: 0,
          comments: 0,
          shares: 0,
          views: 0,
          favorites: 0,
          aiScore: 0,
          feedback: "",
        }),
      });

      if (res.ok) {
        const newPost = await res.json();
        addContentPost(newPost);
        toast.success(`已成功发布到${PLATFORM_LABELS[targetPlatform]}日历！`);
        setAdaptedContent("");
        setAdaptedDate("");
        // Auto-save version record for cross-platform adapted content
        if (selectedPost?.id) {
          try {
            await fetch(`/api/content/${selectedPost.id}/versions`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                content: adaptedContent,
                changeType: "ai_generate",
                summary: `跨平台改编为${PLATFORM_LABELS[targetPlatform]}`,
                aiScore: selectedPost.aiScore,
              }),
            });
          } catch (e) {
            console.error("Failed to save version:", e);
          }
        }
      } else {
        toast.error("发布失败，请重试");
      }
    } catch {
      toast.error("发布失败");
    } finally {
      setPublishing(false);
    }
  };

  // Copy adapted content
  const handleCopy = () => {
    if (adaptedContent) {
      copy(adaptedContent);
    }
  };

  // Don't render if no post is selected
  if (!selectedPost) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group/trig content-card-hover">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-cyan-500/10 to-violet-500/10 flex items-center justify-center">
                <Globe className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">多平台同步发布</span>
                <span className="text-[10px] text-muted-foreground">
                  {crossPlatformVersion
                    ? `已有${PLATFORM_LABELS[targetPlatform]}版本`
                    : `一键改编为${PLATFORM_LABELS[targetPlatform]}风格`}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {crossPlatformVersion && (
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 ${getTargetBadgeStyle()}`}
                >
                  <Check className="h-2.5 w-2.5 mr-0.5" />
                  已同步
                </Badge>
              )}
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CardContent>
        </Card>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-1 pb-3 space-y-3">
          {/* Source info */}
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 ${getSourceBadgeStyle()}`}
            >
              {PLATFORM_LABELS[sourcePlatform]}
            </Badge>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 ${getTargetBadgeStyle()}`}
            >
              {PLATFORM_LABELS[targetPlatform]}
            </Badge>
            <span className="text-[10px] text-muted-foreground ml-auto truncate max-w-[120px]">
              {selectedPost.topic}
            </span>
          </div>

          {/* If cross-platform version already exists */}
          {crossPlatformVersion && !adaptedContent && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Check className="h-3 w-3" />
                  已有{PLATFORM_LABELS[targetPlatform]}版本
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                {crossPlatformVersion.content.slice(0, 100)}
                {crossPlatformVersion.content.length > 100 ? "..." : ""}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="w-full h-8 text-xs focus-ring-soft"
                onClick={() => {
                  setSelectedPostId(crossPlatformVersion.id);
                }}
              >
                <Globe className="h-3 w-3 mr-1.5" />
                查看该版本
              </Button>
            </motion.div>
          )}

          {/* Adapt button */}
          {!crossPlatformVersion && !adaptedContent && (
            <Button
              onClick={handleAdapt}
              disabled={adapting}
              className="w-full h-9 bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-600 hover:to-violet-600 text-white focus-ring-soft"
            >
              {adapting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  AI改编中...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  同步发布到{PLATFORM_LABELS[targetPlatform]}
                </>
              )}
            </Button>
          )}

          {/* Loading skeleton */}
          {adapting && (
            <div className="space-y-2">
              <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
              <div className="h-3 bg-muted rounded w-full animate-pulse" />
              <div className="h-3 bg-muted rounded w-5/6 animate-pulse" />
              <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
            </div>
          )}

          {/* Adapted content preview */}
          <AnimatePresence>
            {adaptedContent && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {/* Target platform badge */}
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 ${getTargetBadgeStyle()}`}
                  >
                    <Globe className="h-2.5 w-2.5 mr-0.5" />
                    {PLATFORM_LABELS[targetPlatform]}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {adaptedContent.length} 字
                  </span>
                </div>

                {/* Content preview */}
                <div className="rounded-lg bg-background border p-3 relative group content-card-hover">
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="secondary"
                      size="sm"
                      className={`h-6 px-2 text-[10px] shadow-sm micro-hover focus-ring-soft ${copied ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" : ""}`}
                      onClick={handleCopy}
                    >
                      {copied ? (
                        <Check className="h-2.5 w-2.5 mr-0.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-2.5 w-2.5 mr-0.5" />
                      )}
                      {copied ? "已复制" : "复制"}
                    </Button>
                  </div>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap pr-16">
                    {adaptedContent}
                  </p>
                </div>

                <Separator />

                {/* Content type selector */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-muted-foreground font-medium">
                    内容类型
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {contentTypeOptions.map((ct) => (
                      <Button
                        key={ct.value}
                        variant={
                          adaptedContentType === ct.value ? "secondary" : "ghost"
                        }
                        size="sm"
                        className={`h-6 px-2 text-[10px] micro-hover focus-ring-soft ${
                          adaptedContentType === ct.value
                            ? getContentTypeColor(ct.value)
                            : ""
                        }`}
                        onClick={() => setAdaptedContentType(ct.value)}
                      >
                        {ct.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Date picker */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-muted-foreground font-medium">
                    发布日期
                  </span>
                  <Input
                    type="date"
                    value={adaptedDate}
                    onChange={(e) => setAdaptedDate(e.target.value)}
                    className="text-sm h-8 focus-ring-soft"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={handlePublishToCalendar}
                    disabled={
                      publishing || !adaptedContent.trim() || !adaptedDate
                    }
                    size="sm"
                    className={`flex-1 bg-gradient-to-r focus-ring-soft ${
                      targetPlatform === "wechat"
                        ? "from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                        : "from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700"
                    } text-white`}
                  >
                    {publishing ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                        发布中...
                      </>
                    ) : (
                      <>
                        <CalendarPlus className="h-3 w-3 mr-1.5" />
                        发布到日历
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setAdaptedContent("");
                      setAdaptedDate("");
                    }}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs focus-ring-soft"
                  >
                    重新改编
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
