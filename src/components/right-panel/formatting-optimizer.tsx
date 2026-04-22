"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAppStore } from "@/store/app-store";
import type { ContentPost } from "@/types";
import {
  LayoutGrid,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  Sparkles,
  Type,
  Smile,
  Hash,
  AlignLeft,
  AtSign,
  Heading,
  Target,
  Quote,
  ArrowRight,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

interface FormattingOptimizerProps {
  post?: ContentPost | null;
  onApply: (formattedContent: string) => void;
}

interface FormatChange {
  icon: React.ReactNode;
  label: string;
  description: string;
}

function getFormatChanges(platform: string): FormatChange[] {
  if (platform === "xiaohongshu") {
    return [
      {
        icon: <Heading className="h-3.5 w-3.5 text-rose-500" />,
        label: "标题优化",
        description: "优化标题长度(15-25字)，添加强力词",
      },
      {
        icon: <AlignLeft className="h-3.5 w-3.5 text-rose-500" />,
        label: "正文排版",
        description: "优化段落间距，提升可读性",
      },
      {
        icon: <Smile className="h-3.5 w-3.5 text-rose-500" />,
        label: "Emoji密度",
        description: "优化表情频率(每50-80字1个)",
      },
      {
        icon: <Hash className="h-3.5 w-3.5 text-rose-500" />,
        label: "话题标签",
        description: "确保3-5个相关话题标签",
      },
      {
        icon: <Target className="h-3.5 w-3.5 text-rose-500" />,
        label: "首行吸引",
        description: "优化首行提升点击率",
      },
      {
        icon: <Quote className="h-3.5 w-3.5 text-rose-500" />,
        label: "空行节奏",
        description: "添加适当的章节间距",
      },
    ];
  }

  return [
    {
      icon: <AlignLeft className="h-3.5 w-3.5 text-emerald-500" />,
      label: "段落优化",
      description: "拆分为2-3个段落，合理间距",
    },
    {
      icon: <Smile className="h-3.5 w-3.5 text-emerald-500" />,
      label: "Emoji优化",
      description: "策略性添加/删除表情",
    },
    {
      icon: <Hash className="h-3.5 w-3.5 text-emerald-500" />,
      label: "话题标签",
      description: "添加1-2个相关标签",
    },
    {
      icon: <LayoutGrid className="h-3.5 w-3.5 text-emerald-500" />,
      label: "排版美化",
      description: "优化换行，去除多余空行",
    },
    {
      icon: <AtSign className="h-3.5 w-3.5 text-emerald-500" />,
      label: "@提及优化",
      description: "建议相关人@提及",
    },
  ];
}

export function FormattingOptimizer({ post, onApply }: FormattingOptimizerProps) {
  const { platform } = useAppStore();
  const isXHS = platform === "xiaohongshu";

  const [isOpen, setIsOpen] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [formattedContent, setFormattedContent] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const { copied, copy } = useCopyToClipboard();

  const formatChanges = getFormatChanges(platform);

  const handleOptimize = async () => {
    if (!post?.content?.trim()) {
      toast.error("暂无内容可优化，请先生成内容");
      return;
    }

    setOptimizing(true);
    setFormattedContent(null);
    setApplied(false);

    try {
      const res = await fetch("/api/ai/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "format",
          post,
          platform,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setFormattedContent(data.content);
        toast.success(isXHS ? "笔记排版优化完成" : "文案排版优化完成");
      } else {
        const errData = await res.json();
        toast.error(errData.error || "优化失败，请重试");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setOptimizing(false);
    }
  };

  const handleApply = () => {
    if (!formattedContent) return;
    onApply(formattedContent);
    setApplied(true);
    toast.success("已应用排版优化");
  };

  const handleCopy = () => {
    if (!formattedContent) return;
    copy(formattedContent);
  };

  const gradientClass = isXHS
    ? "from-rose-500 to-pink-600"
    : "from-emerald-500 to-green-600";

  const lightBgClass = isXHS
    ? "from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20"
    : "from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20";

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-0 shadow-sm">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full h-auto p-4 hover:bg-muted/50 rounded-lg"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div
                  className={`h-6 w-6 rounded bg-gradient-to-br ${gradientClass} flex items-center justify-center`}
                >
                  <LayoutGrid className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-semibold">
                  {isXHS ? "笔记排版优化" : "文案排版优化"}
                </span>
                {formattedContent && (
                  <Badge
                    variant="secondary"
                    className="h-4 px-1.5 text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                  >
                    <Check className="h-2.5 w-2.5 mr-0.5" />
                    已优化
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {optimizing && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="px-4 pb-4 space-y-4">
            {/* Feature list */}
            <div className="grid grid-cols-1 gap-2">
              {formatChanges.map((change, index) => (
                <motion.div
                  key={change.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/30"
                >
                  <div className="shrink-0">{change.icon}</div>
                  <div className="min-w-0">
                    <span className="text-xs font-medium">{change.label}</span>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      {change.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Optimize button */}
            <Button
              onClick={handleOptimize}
              disabled={optimizing || !post?.content?.trim()}
              size="sm"
              className={`w-full h-9 text-xs gap-1.5 bg-gradient-to-r ${gradientClass} hover:opacity-90 text-white shadow-sm`}
            >
              {optimizing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {isXHS ? "笔记优化中..." : "文案优化中..."}
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  一键排版优化
                </>
              )}
            </Button>

            {/* Loading skeleton */}
            <AnimatePresence>
              {optimizing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 py-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      AI正在分析内容排版...
                    </div>
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-4 rounded bg-muted animate-pulse"
                          style={{ width: `${90 - i * 15}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Before / After comparison */}
            <AnimatePresence>
              {!optimizing && formattedContent && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <Type className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-semibold">优化对比</span>
                  </div>

                  {/* Before */}
                  <div className="rounded-lg border p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                        优化前
                      </span>
                    </div>
                    <ScrollArea className="max-h-32">
                      <p className="text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
                        {post?.content || ""}
                      </p>
                    </ScrollArea>
                  </div>

                  {/* Arrow */}
                  <div className="flex justify-center">
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <ArrowRight
                        className={`h-4 w-4 ${isXHS ? "text-rose-400" : "text-emerald-400"}`}
                      />
                    </motion.div>
                  </div>

                  {/* After */}
                  <div
                    className={`rounded-lg border p-3 space-y-1.5 bg-gradient-to-br ${lightBgClass}`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          isXHS
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                        }`}
                      >
                        优化后
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-5 px-1.5 text-[10px] ${copied ? "text-emerald-600" : ""}`}
                        onClick={handleCopy}
                      >
                        {copied ? <Check className="h-2.5 w-2.5 mr-0.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5 mr-0.5" />}
                        {copied ? "已复制" : "复制"}
                      </Button>
                    </div>
                    <ScrollArea className="max-h-48">
                      <p className="text-xs leading-relaxed whitespace-pre-wrap">
                        {formattedContent}
                      </p>
                    </ScrollArea>
                  </div>

                  <Separator />

                  {/* Apply button */}
                  <Button
                    onClick={handleApply}
                    disabled={applied}
                    size="sm"
                    className={`w-full h-9 text-xs gap-1.5 ${
                      applied
                        ? "bg-emerald-500 hover:bg-emerald-500 text-white"
                        : `bg-gradient-to-r ${gradientClass} hover:opacity-90 text-white shadow-sm`
                    }`}
                  >
                    {applied ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        已应用优化
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        应用优化
                      </>
                    )}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
