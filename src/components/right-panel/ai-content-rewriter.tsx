"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/store/app-store";
import type { ContentPost } from "@/types";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  Copy,
  RefreshCw,
  Wand2,
  Pen,
  FileText,
  Minimize2,
  Type,
} from "lucide-react";
import { toast } from "sonner";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

// ─── Types ──────────────────────────────────────────────────────────────────

type RewriteMode = "style_rewrite" | "expand" | "condense";
type StylePreset = "professional" | "humorous" | "emotional" | "sharp";
type ExpandMode = "details" | "examples" | "deepen";
type CondenseMode = "essential" | "oneline";

interface RewriteConfig {
  mode: RewriteMode;
  label: string;
  icon: React.ElementType;
  color: string;
  gradient: string;
  description: string;
}

// ─── Config ─────────────────────────────────────────────────────────────────

const REWRITE_MODES: RewriteConfig[] = [
  {
    mode: "style_rewrite",
    label: "文风改写",
    icon: Pen,
    color: "text-violet-500",
    gradient: "from-violet-500 to-purple-500",
    description: "改变语气风格，保留原意",
  },
  {
    mode: "expand",
    label: "内容扩写",
    icon: FileText,
    color: "text-emerald-500",
    gradient: "from-emerald-500 to-teal-500",
    description: "扩展为更丰富的内容",
  },
  {
    mode: "condense",
    label: "内容缩写",
    icon: Minimize2,
    color: "text-amber-500",
    gradient: "from-amber-500 to-orange-500",
    description: "压缩为精炼版本",
  },
];

const STYLE_PRESETS: {
  key: StylePreset;
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  wechatLabel: string;
  xhsLabel: string;
}[] = [
  {
    key: "professional",
    label: "专业正式",
    icon: Type,
    color: "text-slate-600 dark:text-slate-300",
    bg: "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700",
    wechatLabel: "职场精英",
    xhsLabel: "干货博主",
  },
  {
    key: "humorous",
    label: "轻松幽默",
    icon: Sparkles,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
    wechatLabel: "段子手",
    xhsLabel: "搞笑博主",
  },
  {
    key: "emotional",
    label: "温情走心",
    icon: Sparkles,
    color: "text-rose-500 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800",
    wechatLabel: "文艺青年",
    xhsLabel: "情感博主",
  },
  {
    key: "sharp",
    label: "犀利毒舌",
    icon: Sparkles,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800",
    wechatLabel: "毒舌达人",
    xhsLabel: "吐槽博主",
  },
];

const EXPAND_SUBMODES: {
  key: ExpandMode;
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  description: string;
}[] = [
  {
    key: "details",
    label: "补充细节",
    icon: FileText,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
    description: "添加数据、场景等细节",
  },
  {
    key: "examples",
    label: "增加案例",
    icon: FileText,
    color: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800",
    description: "加入真实案例和故事",
  },
  {
    key: "deepen",
    label: "深化观点",
    icon: FileText,
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-800",
    description: "深入分析原因和趋势",
  },
];

const CONDENSE_SUBMODES: {
  key: CondenseMode;
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  description: string;
}[] = [
  {
    key: "essential",
    label: "精简提炼",
    icon: Minimize2,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
    description: "去除冗余，保留精华",
  },
  {
    key: "oneline",
    label: "一句话总结",
    icon: Type,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800",
    description: "压缩为一句话（≤30字）",
  },
];

// ─── Animation Variants ─────────────────────────────────────────────────────

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 8, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const },
  },
};

// ─── Shimmer Loading ────────────────────────────────────────────────────────

function ShimmerLoader() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 rounded bg-gradient-to-br from-violet-500 to-purple-500 animate-pulse" />
        <div className="h-3 w-24 rounded bg-muted animate-pulse" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-3 rounded bg-muted animate-pulse"
            style={{ width: `${90 - i * 15}%`, animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground text-center py-2">
        AI 正在精心改写中...
      </p>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function AIContentRewriter({
  post,
}: {
  post: ContentPost | null;
}) {
  const { platform, persona, updateContentPost } = useAppStore();
  const { copy, copied } = useCopyToClipboard();
  const isXHS = platform === "xiaohongshu";

  const [isOpen, setIsOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<RewriteMode>("style_rewrite");
  const [stylePreset, setStylePreset] = useState<StylePreset>("professional");
  const [expandMode, setExpandMode] = useState<ExpandMode>("details");
  const [condenseMode, setCondenseMode] = useState<CondenseMode>("essential");

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [editedResult, setEditedResult] = useState<string>("");
  const [applying, setApplying] = useState(false);
  const [originalLength, setOriginalLength] = useState(0);
  const [resultLength, setResultLength] = useState(0);

  const hasContent = post && post.content && post.content.trim().length > 0;

  const handleGenerate = useCallback(async () => {
    if (!post || !post.content) {
      toast.error("请先选择有内容的帖子");
      return;
    }

    setGenerating(true);
    setResult(null);
    setEditedResult("");
    setIsOpen(true);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: activeMode,
          existingContent: post.content,
          platform,
          persona,
          stylePreset: activeMode === "style_rewrite" ? stylePreset : undefined,
          expandMode: activeMode === "expand" ? expandMode : undefined,
          condenseMode: activeMode === "condense" ? condenseMode : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data.content);
        setEditedResult(data.content);
        setOriginalLength(data.originalLength || post.content.length);
        setResultLength(data.resultLength || data.content.length);
        toast.success("AI改写完成");
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || "生成失败，请重试");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setGenerating(false);
    }
  }, [post, activeMode, platform, persona, stylePreset, expandMode, condenseMode]);

  const handleApply = useCallback(async () => {
    if (!post || !editedResult) return;
    setApplying(true);
    try {
      const res = await fetch(`/api/content/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editedResult }),
      });
      if (res.ok) {
        const updated = await res.json();
        updateContentPost(post.id, updated);
        toast.success("已应用改写结果");
      } else {
        toast.error("应用失败，请重试");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setApplying(false);
    }
  }, [post, editedResult, updateContentPost]);

  const handleCopy = useCallback(() => {
    if (result) copy(result);
  }, [result, copy]);

  const handleRegenerate = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  const getWordCountBadge = () => {
    if (activeMode === "expand" && originalLength > 0 && resultLength > 0) {
      const diff = resultLength - originalLength;
      const pct = originalLength > 0 ? Math.round((diff / originalLength) * 100) : 0;
      return (
        <Badge
          variant="outline"
          className="text-[10px] h-5 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400"
        >
          {originalLength} → {resultLength} 字 (+{pct}%)
        </Badge>
      );
    }
    if (activeMode === "condense" && originalLength > 0 && resultLength > 0) {
      const diff = originalLength - resultLength;
      const pct = originalLength > 0 ? Math.round((diff / originalLength) * 100) : 0;
      return (
        <Badge
          variant="outline"
          className="text-[10px] h-5 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400"
        >
          {originalLength} → {resultLength} 字 (-{pct}%)
        </Badge>
      );
    }
    if (activeMode === "style_rewrite" && resultLength > 0) {
      return (
        <Badge
          variant="outline"
          className="text-[10px] h-5 border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400"
        >
          {resultLength} 字
        </Badge>
      );
    }
    return null;
  };

  const activeConfig = REWRITE_MODES.find((m) => m.mode === activeMode)!;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-0 shadow-sm">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full h-auto p-4 hover:bg-muted/50 rounded-lg"
            onClick={(e) => {
              if (!isOpen && result) {
                // Just toggle open to show existing result
              } else if (!isOpen && hasContent) {
                e.preventDefault();
                handleGenerate();
              }
            }}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded bg-gradient-to-br from-violet-500 via-fuchsia-500 to-rose-500 flex items-center justify-center">
                  <Wand2 className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-semibold">AI润色增强</span>
                {result && (
                  <Badge
                    variant="outline"
                    className="text-[10px] h-5 border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400"
                  >
                    <Check className="h-2.5 w-2.5 mr-0.5" />
                    已生成
                  </Badge>
                )}
                {!hasContent && (
                  <Badge
                    variant="outline"
                    className="text-[10px] h-5 border-muted-foreground/30 text-muted-foreground"
                  >
                    无内容
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {generating && (
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
            {/* Loading State */}
            {generating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-4"
              >
                <ShimmerLoader />
              </motion.div>
            )}

            {/* Mode Selector */}
            {!generating && (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="space-y-3"
              >
                {/* Mode Cards */}
                <div className="grid grid-cols-3 gap-2">
                  {REWRITE_MODES.map((modeConfig) => {
                    const Icon = modeConfig.icon;
                    const isActive = activeMode === modeConfig.mode;
                    return (
                      <motion.button
                        key={modeConfig.mode}
                        variants={staggerItem}
                        onClick={() => setActiveMode(modeConfig.mode)}
                        className={`relative flex flex-col items-center gap-1.5 p-2.5 rounded-lg border transition-all duration-200 ${
                          isActive
                            ? `${modeConfig.bg} border-current/20 shadow-sm`
                            : "border-transparent hover:bg-muted/50"
                        }`}
                      >
                        <div
                          className={`h-7 w-7 rounded-md flex items-center justify-center ${
                            isActive
                              ? `bg-gradient-to-br ${modeConfig.gradient} text-white`
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span
                          className={`text-[11px] font-medium ${
                            isActive ? modeConfig.color : "text-muted-foreground"
                          }`}
                        >
                          {modeConfig.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Sub-mode Selector */}
                <AnimatePresence mode="wait">
                  {activeMode === "style_rewrite" && (
                    <motion.div
                      key="style-presets"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-2"
                    >
                      <p className="text-[10px] text-muted-foreground font-medium px-0.5">
                        选择文风
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {STYLE_PRESETS.map((preset, idx) => {
                          const Icon = preset.icon;
                          const isActive = stylePreset === preset.key;
                          return (
                            <motion.button
                              key={preset.key}
                              variants={staggerItem}
                              initial="hidden"
                              animate="visible"
                              transition={{ delay: idx * 0.05 }}
                              onClick={() => setStylePreset(preset.key)}
                              className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                                isActive
                                  ? `${preset.bg} shadow-sm`
                                  : "border-transparent hover:bg-muted/50"
                              }`}
                            >
                              <Icon
                                className={`h-3.5 w-3.5 shrink-0 ${
                                  isActive ? preset.color : "text-muted-foreground"
                                }`}
                              />
                              <div className="min-w-0">
                                <p
                                  className={`text-xs font-medium truncate ${
                                    isActive
                                      ? preset.color
                                      : "text-foreground"
                                  }`}
                                >
                                  {preset.label}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {isXHS ? preset.xhsLabel : preset.wechatLabel}
                                </p>
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {activeMode === "expand" && (
                    <motion.div
                      key="expand-modes"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-2"
                    >
                      <p className="text-[10px] text-muted-foreground font-medium px-0.5">
                        扩写方式
                      </p>
                      <div className="space-y-1.5">
                        {EXPAND_SUBMODES.map((sub, idx) => {
                          const Icon = sub.icon;
                          const isActive = expandMode === sub.key;
                          return (
                            <motion.button
                              key={sub.key}
                              variants={staggerItem}
                              initial="hidden"
                              animate="visible"
                              transition={{ delay: idx * 0.05 }}
                              onClick={() => setExpandMode(sub.key)}
                              className={`flex items-center gap-2 w-full p-2 rounded-lg border text-left transition-all ${
                                isActive
                                  ? `${sub.bg} shadow-sm`
                                  : "border-transparent hover:bg-muted/50"
                              }`}
                            >
                              <Icon
                                className={`h-3.5 w-3.5 shrink-0 ${
                                  isActive ? sub.color : "text-muted-foreground"
                                }`}
                              />
                              <div>
                                <p
                                  className={`text-xs font-medium ${
                                    isActive ? sub.color : "text-foreground"
                                  }`}
                                >
                                  {sub.label}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {sub.description}
                                </p>
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {activeMode === "condense" && (
                    <motion.div
                      key="condense-modes"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-2"
                    >
                      <p className="text-[10px] text-muted-foreground font-medium px-0.5">
                        缩写方式
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {CONDENSE_SUBMODES.map((sub, idx) => {
                          const Icon = sub.icon;
                          const isActive = condenseMode === sub.key;
                          return (
                            <motion.button
                              key={sub.key}
                              variants={staggerItem}
                              initial="hidden"
                              animate="visible"
                              transition={{ delay: idx * 0.05 }}
                              onClick={() => setCondenseMode(sub.key)}
                              className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-center transition-all ${
                                isActive
                                  ? `${sub.bg} shadow-sm`
                                  : "border-transparent hover:bg-muted/50"
                              }`}
                            >
                              <Icon
                                className={`h-4 w-4 ${
                                  isActive ? sub.color : "text-muted-foreground"
                                }`}
                              />
                              <span
                                className={`text-xs font-medium ${
                                  isActive ? sub.color : "text-foreground"
                                }`}
                              >
                                {sub.label}
                              </span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Generate Button */}
                {!result && (
                  <Button
                    onClick={handleGenerate}
                    disabled={!hasContent || generating}
                    size="sm"
                    className={`w-full h-9 text-xs gap-1.5 bg-gradient-to-r ${activeConfig.gradient} hover:opacity-90 text-white shadow-sm btn-press`}
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    {activeConfig.label}
                    <span className="opacity-70">·</span>
                    <span className="opacity-70 text-[10px]">
                      {activeMode === "style_rewrite"
                        ? STYLE_PRESETS.find((p) => p.key === stylePreset)?.label
                        : activeMode === "expand"
                          ? EXPAND_SUBMODES.find((s) => s.key === expandMode)?.label
                          : CONDENSE_SUBMODES.find((s) => s.key === condenseMode)?.label}
                    </span>
                  </Button>
                )}

                {/* Result Area */}
                <AnimatePresence>
                  {result && !generating && (
                    <motion.div
                      key="rewrite-result"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-3"
                    >
                      {/* Result Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-5 w-5 rounded bg-gradient-to-br ${activeConfig.gradient} flex items-center justify-center`}
                          >
                            <activeConfig.icon className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-xs font-semibold">
                            改写结果
                          </span>
                          {getWordCountBadge()}
                        </div>
                      </div>

                      {/* Editable Result Textarea */}
                      <Textarea
                        value={editedResult}
                        onChange={(e) => setEditedResult(e.target.value)}
                        className="min-h-[120px] text-sm leading-relaxed resize-none"
                        placeholder="改写结果将显示在这里..."
                      />

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={handleApply}
                          disabled={applying || !editedResult.trim()}
                          size="sm"
                          className={`flex-1 h-9 text-xs gap-1.5 bg-gradient-to-r ${activeConfig.gradient} hover:opacity-90 text-white shadow-sm btn-press`}
                        >
                          {applying ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              应用中...
                            </>
                          ) : (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              应用
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={handleCopy}
                          variant="outline"
                          size="sm"
                          className="h-9 text-xs gap-1.5 btn-press"
                        >
                          {copied ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          复制
                        </Button>
                        <Button
                          onClick={handleRegenerate}
                          variant="outline"
                          size="sm"
                          className="h-9 text-xs gap-1.5 btn-press"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Regenerate button when result exists */}
                {result && !generating && (
                  <Button
                    onClick={handleRegenerate}
                    variant="ghost"
                    size="sm"
                    className="w-full h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className="h-3 w-3" />
                    重新生成
                  </Button>
                )}
              </motion.div>
            )}

            {/* Empty State */}
            {!generating && !result && isOpen && !hasContent && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-6 space-y-2"
              >
                <Wand2 className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">
                  请先选择有内容的帖子
                </p>
              </motion.div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
