"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import type { ContentPost } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  Copy,
  RotateCcw,
  Type,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

// ---------- helpers ----------

interface TitleVariant {
  label: string;
  text: string;
  isOriginal: boolean;
}

/** Count emoji characters in a string */
function countEmojis(str: string): number {
  const emojiRegex = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu;
  return (str.match(emojiRegex) || []).length;
}

/** Emoji density = emoji count / total characters, returns 0‑100 */
function emojiDensity(str: string): number {
  const total = str.length;
  if (total === 0) return 0;
  return Math.round((countEmojis(str) / total) * 100);
}

/** Simple quality score heuristic for XHS titles (0‑100) */
function qualityScore(str: string): number {
  let score = 50;
  const len = str.length;

  // Ideal length 15‑25 chars
  if (len >= 15 && len <= 25) score += 20;
  else if (len >= 10 && len <= 30) score += 10;

  // Contains emoji
  if (countEmojis(str) > 0) score += 10;

  // Contains numbers
  if (/\d/.test(str)) score += 10;

  // Contains punctuation that implies hooks / suspense
  if (/[？?!！…]/.test(str)) score += 5;

  // Contains common XHS power words
  const powerWords = [
    "必备",
    "绝了",
    "后悔",
    "宝藏",
    "推荐",
    "攻略",
    "省钱",
    "分享",
    "建议",
    "技巧",
    "终于",
    "原来",
    "一定",
    "真相",
  ];
  if (powerWords.some((w) => str.includes(w))) score += 5;

  return Math.min(score, 100);
}

const LABEL_STYLES = [
  {
    // A — violet (current)
    badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    border: "border-violet-500",
    bg: "bg-violet-50 dark:bg-violet-950/20",
    ring: "ring-violet-500/30",
    hover: "hover:border-violet-300 dark:hover:border-violet-700",
    text: "text-violet-600 dark:text-violet-400",
    outlineBtn: "border-violet-200 dark:border-violet-800",
    icon: "text-violet-500",
    gradient: "from-violet-500/10 to-purple-500/10",
  },
  {
    // B — emerald
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    border: "border-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
    ring: "ring-emerald-500/30",
    hover: "hover:border-emerald-300 dark:hover:border-emerald-700",
    text: "text-emerald-600 dark:text-emerald-400",
    outlineBtn: "border-emerald-200 dark:border-emerald-800",
    icon: "text-emerald-500",
    gradient: "from-emerald-500/10 to-teal-500/10",
  },
  {
    // C — sky / blue
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    border: "border-sky-500",
    bg: "bg-sky-50 dark:bg-sky-950/20",
    ring: "ring-sky-500/30",
    hover: "hover:border-sky-300 dark:hover:border-sky-700",
    text: "text-sky-600 dark:text-sky-400",
    outlineBtn: "border-sky-200 dark:border-sky-800",
    icon: "text-sky-500",
    gradient: "from-sky-500/10 to-blue-500/10",
  },
  {
    // D — amber
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    border: "border-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/20",
    ring: "ring-amber-500/30",
    hover: "hover:border-amber-300 dark:hover:border-amber-700",
    text: "text-amber-600 dark:text-amber-400",
    outlineBtn: "border-amber-200 dark:border-amber-800",
    icon: "text-amber-500",
    gradient: "from-amber-500/10 to-orange-500/10",
  },
];

const LABELS = ["A", "B", "C", "D"];

// ---------- component ----------

export function TitleABTest({ post }: { post: ContentPost }) {
  const { persona, knowledgeItems, updateContentPost, platform } =
    useAppStore();

  // Only show for xiaohongshu
  if (platform !== "xiaohongshu") return null;

  return <TitleABTestInner post={post} />;
}

function TitleABTestInner({ post }: { post: ContentPost }) {
  const { persona, knowledgeItems, updateContentPost } = useAppStore();

  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [applying, setApplying] = useState(false);
  const { copied: copiedOne, copy: copyOne } = useCopyToClipboard();
  const { copied: copiedAll, copy: copyAll } = useCopyToClipboard();

  // Build the 4 title variants: A (current) + B/C/D (generated)
  const variants: TitleVariant[] = useMemo(() => {
    const base: TitleVariant[] = [
      { label: "A", text: post.topic || "", isOriginal: true },
    ];
    for (let i = 0; i < alternatives.length; i++) {
      base.push({
        label: LABELS[i + 1],
        text: alternatives[i],
        isOriginal: false,
      });
    }
    return base;
  }, [post.topic, alternatives]);

  // ---------- generate titles ----------

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setAlternatives([]);
    setSelectedIndex(null);

    try {
      const prompt = `你是一个小红书标题优化专家。请为以下笔记生成3个替代标题。

当前标题：${post.topic}
笔记内容摘要：${post.content.slice(0, 100)}
人设调性：${persona?.tone || "专业"}

要求：
1. 每个标题15-25字
2. 包含数字、emoji或悬念元素
3. 符合小红书爆款标题特征
4. 每个标题风格不同（如：种草风、悬念风、数字风）

请直接输出3个标题，每个标题一行，不要序号或其他文字。`;

      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "auto",
          persona,
          knowledgeItems,
          topic: prompt,
          tone: persona?.tone || "专业",
          style: persona?.style || "均衡兼顾",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const raw = (data.content || "").trim();
        // Parse lines — ignore empty ones
        const lines = raw
          .split("\n")
          .map((l: string) => l.trim().replace(/^\d+[\.\、\)）]\s*/, ""))
          .filter((l: string) => l.length > 0);
        setAlternatives(lines.slice(0, 3));
        toast.success("已生成 3 个替代标题");
      } else {
        toast.error("生成失败，请重试");
      }
    } catch {
      toast.error("生成失败，请重试");
    } finally {
      setGenerating(false);
    }
  }, [post.topic, post.content, persona, knowledgeItems]);

  // ---------- apply selected ----------

  const handleApply = useCallback(async () => {
    if (selectedIndex === null) return;
    const title = variants[selectedIndex].text;
    if (!title) return;

    setApplying(true);
    try {
      const res = await fetch(`/api/content/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: title }),
      });
      if (res.ok) {
        const updated = await res.json();
        updateContentPost(post.id, updated);
        toast.success(`已应用 ${variants[selectedIndex].label} 标题`);
        setSelectedIndex(null);
        setOpen(false);
      } else {
        toast.error("应用失败");
      }
    } catch {
      toast.error("应用失败");
    } finally {
      setApplying(false);
    }
  }, [selectedIndex, variants, post.id, updateContentPost]);

  // ---------- copy helpers ----------

  const handleCopyOne = useCallback((text: string) => {
    copyOne(text);
  }, [copyOne]);

  const handleCopyAll = useCallback(() => {
    const all = variants.map((v) => `${v.label}. ${v.text}`).join("\n");
    copyAll(all);
  }, [variants, copyAll]);

  // ---------- render ----------

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full">
        <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group/trig">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-red-500/10 to-rose-500/10 flex items-center justify-center">
                <Type className="h-4 w-4 text-red-500" />
              </div>
              <span className="text-sm font-medium">标题 A/B 测试</span>
              <Badge
                variant="secondary"
                className="text-[10px] h-5 bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"
              >
                小红书
              </Badge>
            </div>
            {open ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </CardContent>
        </Card>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="px-1 pb-3 space-y-3">
          <p className="text-[11px] text-muted-foreground">
            AI 为当前笔记标题生成 3 个替代方案，对比选择最吸睛的标题
          </p>

          {/* Generate button */}
          {alternatives.length === 0 && (
            <Button
              onClick={handleGenerate}
              disabled={generating}
              size="sm"
              className="w-full h-8 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white"
            >
              {generating ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                  生成标题中...
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3 mr-1.5" />
                  生成 3 个替代标题
                </>
              )}
            </Button>
          )}

          {/* Title cards */}
          <AnimatePresence mode="wait">
            {variants.length > 1 && (
              <motion.div
                key="variants"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1"
              >
                {variants.map((v, idx) => {
                  const style = LABEL_STYLES[idx] ?? LABEL_STYLES[0];
                  const isSelected = selectedIndex === idx;
                  const score = qualityScore(v.text);
                  const emojis = countEmojis(v.text);
                  const density = emojiDensity(v.text);

                  return (
                    <motion.div
                      key={v.label}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.06 }}
                      onClick={() => setSelectedIndex(idx)}
                      className={`
                        relative rounded-lg border-2 p-3 cursor-pointer transition-all duration-200
                        ${
                          isSelected
                            ? `${style.border} ${style.bg} ring-2 ${style.ring}`
                            : `border-border/20 ${style.hover}`
                        }
                      `}
                    >
                      {/* Header row */}
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            className={`text-[10px] h-5 ${style.badge}`}
                            variant="secondary"
                          >
                            {v.label}{" "}
                            {v.isOriginal ? "(当前)" : "(AI生成)"}
                          </Badge>

                          {/* Selected crown */}
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0, rotate: -20 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{
                                type: "spring",
                                stiffness: 400,
                                damping: 15,
                              }}
                            >
                              <Crown
                                className={`h-3.5 w-3.5 ${style.text}`}
                              />
                            </motion.div>
                          )}

                          {/* Quality score */}
                          <Badge
                            className={`text-[10px] h-5 ${
                              score >= 80
                                ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                                : score >= 60
                                  ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
                                  : "bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400"
                            }`}
                            variant="secondary"
                          >
                            {score}分
                          </Badge>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-5 px-1.5 ${copiedOne ? "text-emerald-600" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyOne(v.text);
                          }}
                        >
                          {copiedOne ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
                        </Button>
                      </div>

                      {/* Title text */}
                      <p className="text-xs leading-relaxed font-medium mb-2 line-clamp-2">
                        {v.text}
                      </p>

                      {/* Meta row */}
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>{v.text.length} 字</span>
                        <span className="flex items-center gap-0.5">
                          {emojis > 0 ? (
                            <>
                              <span>{emojis} emoji</span>
                              <span
                                className={`inline-block h-1.5 w-1.5 rounded-full ${
                                  density > 10
                                    ? "bg-amber-400"
                                    : density > 5
                                      ? "bg-green-400"
                                      : "bg-gray-300"
                                }`}
                              />
                            </>
                          ) : (
                            <span className="text-muted-foreground/60">
                              无 emoji
                            </span>
                          )}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          {variants.length > 1 && (
            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleApply}
                disabled={applying || selectedIndex === null}
                size="sm"
                className="flex-1 h-8 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white disabled:opacity-50"
              >
                {applying ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Check className="h-3 w-3 mr-1" />
                )}
                应用选中标题
              </Button>
              <Button
                onClick={handleCopyAll}
                size="sm"
                variant="outline"
                className={`h-8 text-xs ${copiedAll ? "border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400" : ""}`}
              >
                {copiedAll ? <Check className="h-3 w-3 mr-1 text-emerald-500" /> : <Copy className="h-3 w-3 mr-1" />}
                {copiedAll ? "已复制" : "复制全部标题"}
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={generating || applying}
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                title="重新生成"
              >
                <RotateCcw
                  className={`h-3 w-3 ${generating ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
