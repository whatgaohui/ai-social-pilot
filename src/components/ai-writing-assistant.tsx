"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  Copy,
  Loader2,
  Lightbulb,
  FileText,
  PenTool,
  MessageCircle,
  Heart,
  Zap,
  BookOpen,
  Megaphone,
  RotateCcw,
  Wand2,
  BarChart3,
  Type,
} from "lucide-react";
import { toast } from "sonner";

// ─── Animation Variants ──────────────────────────────────────────────────────

const fadeSlideIn = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.15 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const } },
};

// ─── Tone Presets ─────────────────────────────────────────────────────────────

interface TonePreset {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgClass: string;
  borderClass: string;
  preview: string;
  description: string;
}

const TONE_PRESETS: TonePreset[] = [
  {
    id: "professional",
    name: "专业严谨",
    icon: BookOpen,
    color: "text-sky-600 dark:text-sky-400",
    bgClass: "bg-sky-50 dark:bg-sky-950/20",
    borderClass: "border-sky-200 dark:border-sky-800",
    preview: "经过深入分析，我们发现……核心数据表明……",
    description: "适合行业干货、专业观点",
  },
  {
    id: "humorous",
    name: "轻松幽默",
    icon: MessageCircle,
    color: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-50 dark:bg-amber-950/20",
    borderClass: "border-amber-200 dark:border-amber-800",
    preview: "今天又学到了一个宝藏技能！小伙伴们冲冲冲！",
    description: "适合轻松日常、种草分享",
  },
  {
    id: "warm",
    name: "温馨治愈",
    icon: Heart,
    color: "text-rose-600 dark:text-rose-400",
    bgClass: "bg-rose-50 dark:bg-rose-950/20",
    borderClass: "border-rose-200 dark:border-rose-800",
    preview: "生活很苦，但总有一些小确幸值得记录……",
    description: "适合情感记录、生活感悟",
  },
  {
    id: "inspirational",
    name: "励志正能量",
    icon: Zap,
    color: "text-orange-600 dark:text-orange-400",
    bgClass: "bg-orange-50 dark:bg-orange-950/20",
    borderClass: "border-orange-200 dark:border-orange-800",
    preview: "每一次突破都是从第一步开始，今天也要加油！💪",
    description: "适合早安打卡、成长记录",
  },
  {
    id: "drygoods",
    name: "干货分享",
    icon: BarChart3,
    color: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/20",
    borderClass: "border-emerald-200 dark:border-emerald-800",
    preview: "3个实用技巧帮你提升效率：1️⃣ … 2️⃣ … 3️⃣ …",
    description: "适合教程攻略、技巧总结",
  },
  {
    id: "storytelling",
    name: "故事叙述",
    icon: PenTool,
    color: "text-violet-600 dark:text-violet-400",
    bgClass: "bg-violet-50 dark:bg-violet-950/20",
    borderClass: "border-violet-200 dark:border-violet-800",
    preview: "上周末我去了一家隐藏在小巷里的咖啡馆……",
    description: "适合探店分享、旅行日志",
  },
  {
    id: "interactive",
    name: "互动提问",
    icon: Megaphone,
    color: "text-pink-600 dark:text-pink-400",
    bgClass: "bg-pink-50 dark:bg-pink-950/20",
    borderClass: "border-pink-200 dark:border-pink-800",
    preview: "你们觉得A好还是B好？评论区告诉我！👇",
    description: "适合投票互动、话题讨论",
  },
  {
    id: "emotional",
    name: "情感共鸣",
    icon: Lightbulb,
    color: "text-cyan-600 dark:text-cyan-400",
    bgClass: "bg-cyan-50 dark:bg-cyan-950/20",
    borderClass: "border-cyan-200 dark:border-cyan-800",
    preview: "成年人的世界里，学会说「不」是最难的一课……",
    description: "适合情感文案、深夜话题",
  },
];

// ─── Quick Templates ─────────────────────────────────────────────────────────

interface QuickTemplate {
  id: string;
  title: string;
  icon: React.ReactNode;
  structure: string;
  suggestedLength: string;
  toneId: string;
  prompt: string;
}

const QUICK_TEMPLATES: QuickTemplate[] = [
  {
    id: "morning-greeting",
    title: "早安打卡",
    icon: <Zap className="h-4 w-4 text-orange-500" />,
    structure: "问候 + 今日目标 + 励志语",
    suggestedLength: "50-100字",
    toneId: "inspirational",
    prompt: "生成一条朋友圈早安打卡文案，积极向上，有目标感",
  },
  {
    id: "knowledge-share",
    title: "知识分享",
    icon: <BookOpen className="h-4 w-4 text-emerald-500" />,
    structure: "主题 + 核心观点 + 案例 + 总结",
    suggestedLength: "200-400字",
    toneId: "drygoods",
    prompt: "生成一篇知识分享内容，结构清晰，有实际案例支撑",
  },
  {
    id: "product-review",
    title: "好物测评",
    icon: <Sparkles className="h-4 w-4 text-amber-500" />,
    structure: "引入 + 体验 + 优缺点 + 推荐",
    suggestedLength: "300-600字",
    toneId: "humorous",
    prompt: "生成一篇好物测评内容，真实有趣，有购买建议",
  },
  {
    id: "daily-life",
    title: "日常分享",
    icon: <Heart className="h-4 w-4 text-rose-500" />,
    structure: "场景描述 + 感受 + 感悟",
    suggestedLength: "100-300字",
    toneId: "warm",
    prompt: "生成一条日常分享文案，温馨有共鸣",
  },
  {
    id: "work-tips",
    title: "职场干货",
    icon: <BarChart3 className="h-4 w-4 text-sky-500" />,
    structure: "问题 + 方法 + 步骤 + 效果",
    suggestedLength: "200-400字",
    toneId: "professional",
    prompt: "生成一篇职场技巧分享，实用专业",
  },
  {
    id: "travel-log",
    title: "旅行日志",
    icon: <PenTool className="h-4 w-4 text-violet-500" />,
    structure: "目的地 + 路线 + 体验 + 建议",
    suggestedLength: "300-600字",
    toneId: "storytelling",
    prompt: "生成一篇旅行记录，有画面感和故事性",
  },
  {
    id: "weekly-summary",
    title: "周总结",
    icon: <FileText className="h-4 w-4 text-cyan-500" />,
    structure: "回顾 + 亮点 + 反思 + 展望",
    suggestedLength: "200-400字",
    toneId: "professional",
    prompt: "生成一条周总结文案，回顾本周成就，展望下周",
  },
  {
    id: "poll-discussion",
    title: "话题讨论",
    icon: <Megaphone className="h-4 w-4 text-pink-500" />,
    structure: "话题引入 + 观点A + 观点B + 互动引导",
    suggestedLength: "100-300字",
    toneId: "interactive",
    prompt: "生成一条互动话题文案，引发评论区讨论",
  },
  {
    id: "food-share",
    title: "美食分享",
    icon: <MessageCircle className="h-4 w-4 text-amber-500" />,
    structure: "店铺 + 推荐 + 口感 + 评分",
    suggestedLength: "200-400字",
    toneId: "humorous",
    prompt: "生成一条美食分享文案，让人垂涎欲滴",
  },
  {
    id: "deep-night",
    title: "深夜走心",
    icon: <Lightbulb className="h-4 w-4 text-cyan-500" />,
    structure: "场景 + 回忆 + 情感 + 升华",
    suggestedLength: "100-300字",
    toneId: "emotional",
    prompt: "生成一条深夜走心文案，引发情感共鸣",
  },
];

// ─── Multi-Step Generation ───────────────────────────────────────────────────

type GenerationStep = "outline" | "expand" | "polish";
const STEP_LABELS: Record<GenerationStep, string> = {
  outline: "生成大纲",
  expand: "扩展内容",
  polish: "润色定稿",
};

const STEP_ORDER: GenerationStep[] = ["outline", "expand", "polish"];

// ─── Main Component ──────────────────────────────────────────────────────────

export function AIWritingAssistant() {
  const {
    selectedPostId,
    contentPosts,
    platform,
    persona,
    knowledgeItems,
    updateContentPost,
  } = useAppStore();

  const selectedPost = useMemo(
    () => contentPosts.find((p) => p.id === selectedPostId) ?? null,
    [contentPosts, selectedPostId],
  );

  const isXHS = platform === "xiaohongshu";

  // ── Tone State ──
  const [activeToneId, setActiveToneId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ai-writing-tone") || "professional";
    }
    return "professional";
  });
  const [showTonePreview, setShowTonePreview] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("ai-writing-tone", activeToneId);
    }
  }, [activeToneId]);

  const activeTone = useMemo(
    () => TONE_PRESETS.find((t) => t.id === activeToneId) || TONE_PRESETS[0],
    [activeToneId],
  );

  // ── Multi-Step State ──
  const [currentStep, setCurrentStep] = useState<GenerationStep>("outline");
  const [stepResults, setStepResults] = useState<Record<GenerationStep, string>>({
    outline: "",
    expand: "",
    polish: "",
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingStep, setGeneratingStep] = useState<GenerationStep | null>(null);

  // ── Variations State ──
  const [variations, setVariations] = useState<string[]>([]);
  const [activeVariation, setActiveVariation] = useState(0);
  const [isGeneratingVariations, setIsGeneratingVariations] = useState(false);

  // ── Word Count ──
  const [targetWordCount, setTargetWordCount] = useState(isXHS ? 500 : 300);

  useEffect(() => {
    setTargetWordCount(isXHS ? 500 : 300);
  }, [isXHS]);

  const currentContent = stepResults[currentStep] || "";
  const wordCount = currentContent.length;
  const wordCountPercent = Math.min(100, Math.round((wordCount / targetWordCount) * 100));

  // ── Context Detection ──
  const contextInfo = useMemo(() => {
    const contexts: string[] = [];
    if (selectedPost) {
      if (selectedPost.content) {
        contexts.push("已有内容 — 可续写/优化");
      } else if (selectedPost.topic) {
        contexts.push(`主题: ${selectedPost.topic}`);
      }
    }
    if (knowledgeItems.length > 0) {
      contexts.push(`${knowledgeItems.length}条知识库素材可用`);
    }
    return contexts;
  }, [selectedPost, knowledgeItems]);

  // ── AI Generation Handlers ──

  const handleGenerateStep = useCallback(
    async (step: GenerationStep, topic?: string) => {
      setIsGenerating(true);
      setGeneratingStep(step);

      try {
        const toneName = activeTone.name;
        let prompt = "";

        if (step === "outline") {
          prompt = `请为以下主题生成内容大纲（3-5个部分，每部分20字以内）。
主题：${topic || selectedPost?.topic || "日常分享"}
语气风格：${toneName}
平台：${isXHS ? "小红书" : "朋友圈"}
${knowledgeItems.length > 0 ? `参考素材：${knowledgeItems.slice(0, 2).map((k) => k.title).join("、")}` : ""}
请直接输出大纲内容。`;
        } else if (step === "expand") {
          prompt = `请根据以下大纲扩展为完整内容。
大纲：
${stepResults.outline || "无"}
语气风格：${toneName}
平台：${isXHS ? "小红书（300-800字）" : "朋友圈（200-500字）"}
${isXHS ? "适当添加emoji，结尾添加3-5个话题标签" : "适当添加emoji"}
${selectedPost?.content ? `已有内容参考：${selectedPost.content.slice(0, 200)}` : ""}
请直接输出扩展后的完整内容。`;
        } else if (step === "polish") {
          prompt = `请润色优化以下内容。
原文：
${stepResults.expand || stepResults.outline || "无内容"}
语气风格：${toneName}
平台：${isXHS ? "小红书" : "朋友圈"}
优化要求：提升文采、增强互动性、优化排版
请直接输出润色后的内容。`;
        }

        const res = await fetch("/api/ai/optimize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            post: {
              content: step === "outline" ? "" : stepResults[step === "expand" ? "outline" : "expand"] || "",
              contentType: selectedPost?.contentType || "text",
              topic: topic || selectedPost?.topic || "日常分享",
              id: selectedPost?.id,
            },
            persona: persona ? { name: persona.name, tone: toneName } : null,
            knowledgeItems: knowledgeItems.slice(0, 3),
            platform,
            feedback: prompt,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setStepResults((prev) => ({ ...prev, [step]: data.content || "" }));
          toast.success(`${STEP_LABELS[step]}完成`);
        } else {
          toast.error("生成失败，请重试");
        }
      } catch {
        toast.error("网络错误，请重试");
      } finally {
        setIsGenerating(false);
        setGeneratingStep(null);
      }
    },
    [activeTone, selectedPost, knowledgeItems, platform, persona, stepResults],
  );

  const handleNextStep = useCallback(() => {
    const idx = STEP_ORDER.indexOf(currentStep);
    if (idx < STEP_ORDER.length - 1) {
      setCurrentStep(STEP_ORDER[idx + 1]);
    }
  }, [currentStep]);

  const handlePrevStep = useCallback(() => {
    const idx = STEP_ORDER.indexOf(currentStep);
    if (idx > 0) {
      setCurrentStep(STEP_ORDER[idx - 1]);
    }
  }, [currentStep]);

  // ── Variation Handler ──
  const handleGenerateVariations = useCallback(async () => {
    const sourceContent = stepResults.polish || stepResults.expand || stepResults.outline || "";
    if (!sourceContent) {
      toast.error("请先生成内容");
      return;
    }

    setIsGeneratingVariations(true);
    try {
      const res = await fetch("/api/ai/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post: {
            content: sourceContent,
            contentType: selectedPost?.contentType || "text",
            topic: selectedPost?.topic || "日常分享",
            id: selectedPost?.id,
          },
          persona: persona ? { name: persona.name, tone: activeTone.name } : null,
          knowledgeItems: knowledgeItems.slice(0, 2),
          platform,
          feedback: `请生成3个不同风格版本的内容变体。
版本1：更活泼有趣
版本2：更专业深度
版本3：更感性走心

请用以下格式输出，用"---版本分隔---"分隔三个版本：
---版本分隔---
版本1内容
---版本分隔---
版本2内容
---版本分隔---
版本3内容`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.content || "";
        const parts = content.split("---版本分隔---").map((p: string) => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          setVariations(parts.slice(0, 3));
          setActiveVariation(0);
          toast.success("已生成3个版本");
        } else {
          // Single response — use as one variation
          setVariations([content]);
          setActiveVariation(0);
          toast.success("已生成1个版本");
        }
      }
    } catch {
      toast.error("生成变体失败");
    } finally {
      setIsGeneratingVariations(false);
    }
  }, [stepResults, selectedPost, persona, knowledgeItems, platform, activeTone]);

  // ── Apply Content ──
  const handleApplyContent = useCallback(
    async (content: string) => {
      if (!selectedPost) {
        toast.error("请先选择一条内容");
        return;
      }
      try {
        const res = await fetch(`/api/content/${selectedPost.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        if (res.ok) {
          const updated = await res.json();
          updateContentPost(selectedPost.id, updated);
          toast.success("内容已应用");
        }
      } catch {
        toast.error("应用失败");
      }
    },
    [selectedPost, updateContentPost],
  );

  const handleCopyContent = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("已复制到剪贴板");
  }, []);

  // ── Quick Template Handler ──
  const handleUseTemplate = useCallback(
    (template: QuickTemplate) => {
      setActiveToneId(template.toneId);
      handleGenerateStep("outline", template.prompt);
    },
    [handleGenerateStep],
  );

  // ── Merge Variations ──
  const handleMergeVariations = useCallback(async () => {
    if (variations.length < 2) {
      toast.error("至少需要2个版本才能合并");
      return;
    }

    setIsGeneratingVariations(true);
    try {
      const res = await fetch("/api/ai/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post: {
            content: variations.join("\n\n---\n\n"),
            contentType: selectedPost?.contentType || "text",
            topic: selectedPost?.topic || "日常分享",
            id: selectedPost?.id,
          },
          persona: persona ? { name: persona.name, tone: activeTone.name } : null,
          knowledgeItems: knowledgeItems.slice(0, 2),
          platform,
          feedback: `以下是同一主题的${variations.length}个不同版本。请取每个版本中最精彩的部分，融合成一篇最佳内容。保持语气风格一致：${activeTone.name}`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setStepResults((prev) => ({ ...prev, polish: data.content || "" }));
        setCurrentStep("polish");
        toast.success("合并完成，请查看润色结果");
      }
    } catch {
      toast.error("合并失败");
    } finally {
      setIsGeneratingVariations(false);
    }
  }, [variations, selectedPost, persona, knowledgeItems, platform, activeTone]);

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      {/* ── Context-Aware Suggestions ── */}
      {contextInfo.length > 0 && (
        <motion.div variants={staggerItem}>
          <div className="rounded-lg border border-violet-200/60 dark:border-violet-800/40 bg-violet-50/50 dark:bg-violet-950/10 p-3 content-card-hover micro-hover">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-violet-500" />
              <span className="text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                智能上下文
              </span>
            </div>
            <div className="space-y-1">
              {contextInfo.map((ctx, i) => (
                <p key={i} className="text-[10px] text-muted-foreground">
                  • {ctx}
                </p>
              ))}
            </div>
            {selectedPost && !selectedPost.content && selectedPost.topic && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 mt-2 text-[10px] text-violet-600 dark:text-violet-400 hover:text-violet-700"
                onClick={() => handleGenerateStep("outline")}
              >
                <Wand2 className="h-3 w-3 mr-1" />
                基于主题「{selectedPost.topic}」生成内容
              </Button>
            )}
            {selectedPost?.content && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 mt-2 text-[10px] text-violet-600 dark:text-violet-400 hover:text-violet-700"
                onClick={() => {
                  setStepResults((prev) => ({ ...prev, outline: selectedPost.content || "" }));
                  setCurrentStep("expand");
                  toast.info("已加载现有内容，可直接扩展或润色");
                }}
              >
                <PenTool className="h-3 w-3 mr-1" />
                为选中帖子续写/优化
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Tone Selector ── */}
      <motion.div variants={staggerItem}>
        <div className="rounded-lg border border-border/20 bg-card/80 p-3 content-card-hover micro-hover">
          <div className="flex items-center gap-1.5 mb-2">
            <Type className="h-3.5 w-3.5 text-violet-500" />
            <span className="text-[11px] font-semibold">语气风格</span>
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 tone-chip">
              {activeTone.name}
            </Badge>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {TONE_PRESETS.map((tone) => {
              const Icon = tone.icon;
              const isActive = tone.id === activeToneId;
              return (
                <button
                  key={tone.id}
                  onClick={() => setActiveToneId(tone.id)}
                  className={`relative flex flex-col items-center gap-1 p-2 rounded-lg border transition-all duration-200 press-scale cursor-pointer ${
                    isActive
                      ? `${tone.bgClass} ${tone.borderClass} border-2`
                      : "border-border/20 hover:border-border/20 bg-background/50"
                  }`}
                  onMouseEnter={() => setShowTonePreview(tone.id)}
                  onMouseLeave={() => setShowTonePreview(null)}
                >
                  <Icon className={`h-4 w-4 ${tone.color}`} />
                  <span className="text-[9px] font-medium leading-tight text-center">{tone.name}</span>
                  {isActive && (
                    <motion.div
                      layoutId="tone-active-indicator"
                      className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-violet-500 flex items-center justify-center"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    >
                      <Check className="h-2 w-2 text-white" />
                    </motion.div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tone Preview Tooltip */}
          <AnimatePresence>
            {showTonePreview && (
              <motion.div
                key={showTonePreview}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                className="mt-2 p-2 rounded-lg bg-muted/50 border border-border/20 tone-preview"
              >
                <p className="text-[10px] font-medium text-foreground mb-0.5">
                  {TONE_PRESETS.find((t) => t.id === showTonePreview)?.name}
                </p>
                <p className="text-[9px] text-muted-foreground">
                  {TONE_PRESETS.find((t) => t.id === showTonePreview)?.description}
                </p>
                <p className="text-[9px] text-muted-foreground italic mt-1">
                  「{TONE_PRESETS.find((t) => t.id === showTonePreview)?.preview}」
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── Multi-Step Generation ── */}
      <motion.div variants={staggerItem}>
        <div className="rounded-lg border border-border/20 bg-card/80 p-3 content-card-hover micro-hover">
          <div className="flex items-center gap-1.5 mb-3">
            <Sparkles className="h-3.5 w-3.5 text-violet-500" />
            <span className="text-[11px] font-semibold">分步生成</span>
          </div>

          {/* Step Progress */}
          <div className="flex items-center gap-1 mb-3">
            {STEP_ORDER.map((step, i) => {
              const isActive = currentStep === step;
              const hasContent = !!stepResults[step];
              const isDone = hasContent && !isActive;
              return (
                <React.Fragment key={step}>
                  {i > 0 && (
                    <div
                      className={`h-px flex-1 transition-colors ${
                        hasContent ? "bg-violet-400" : "bg-border"
                      } workflow-connector`}
                    />
                  )}
                  <button
                    onClick={() => setCurrentStep(step)}
                    className={`relative flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all duration-200 cursor-pointer ${
                      isActive
                        ? "bg-violet-500 text-white shadow-sm"
                        : isDone
                          ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
                          : "bg-muted text-muted-foreground"
                    } workflow-step`}
                  >
                    {isDone && <Check className="h-3 w-3" />}
                    {isGenerating && generatingStep === step ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <span className="w-3.5 text-center text-[9px]">{i + 1}</span>
                    )}
                    {STEP_LABELS[step]}
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          {/* Step Content */}
          <div className="space-y-2">
            {stepResults[currentStep] ? (
              <div className="relative">
                <Textarea
                  value={stepResults[currentStep]}
                  onChange={(e) =>
                    setStepResults((prev) => ({ ...prev, [currentStep]: e.target.value }))
                  }
                  className="min-h-[100px] max-h-[200px] text-xs resize-none"
                  placeholder="AI生成的内容（可编辑）"
                />
                {/* Word Count Bar */}
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${
                        wordCountPercent > 90
                          ? "bg-emerald-500"
                          : wordCountPercent > 50
                            ? "bg-violet-500"
                            : "bg-amber-500"
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${wordCountPercent}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground tabular-nums whitespace-nowrap">
                    {wordCount}/{targetWordCount}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <div className="text-center">
                  <Sparkles className="h-6 w-6 mx-auto mb-1 opacity-40" />
                  <p className="text-[10px]">
                    {currentStep === "outline"
                      ? "点击下方按钮生成大纲"
                      : currentStep === "expand"
                        ? "请先完成大纲生成"
                        : "请先完成内容扩展"}
                  </p>
                </div>
              </div>
            )}

            {/* Step Actions */}
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[10px]"
                onClick={handlePrevStep}
                disabled={STEP_ORDER.indexOf(currentStep) === 0}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                className="flex-1 h-7 text-[10px] bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white btn-ripple press-scale focus-ring-soft"
                onClick={() => handleGenerateStep(currentStep)}
                disabled={isGenerating}
              >
                {isGenerating && generatingStep === currentStep ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    生成中…
                  </>
                ) : (
                  <>
                    <Wand2 className="h-3 w-3 mr-1" />
                    {stepResults[currentStep] ? "重新生成" : STEP_LABELS[currentStep]}
                  </>
                )}
              </Button>
              {stepResults[currentStep] && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[10px]"
                  onClick={() => handleCopyContent(stepResults[currentStep])}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[10px]"
                onClick={handleNextStep}
                disabled={
                  STEP_ORDER.indexOf(currentStep) === STEP_ORDER.length - 1 ||
                  !stepResults[currentStep]
                }
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>

            {/* Apply final result */}
            {stepResults.polish && currentStep === "polish" && (
              <Button
                size="sm"
                className="w-full h-7 text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white btn-ripple press-scale focus-ring-soft"
                onClick={() => handleApplyContent(stepResults.polish)}
              >
                <Check className="h-3 w-3 mr-1" />
                应用到选中内容
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Content Variations ── */}
      <motion.div variants={staggerItem}>
        <div className="rounded-lg border border-border/20 bg-card/80 p-3 content-card-hover micro-hover">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <RotateCcw className="h-3.5 w-3.5 text-violet-500" />
              <span className="text-[11px] font-semibold">内容变体</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[10px] text-violet-600 dark:text-violet-400"
              onClick={handleGenerateVariations}
              disabled={isGeneratingVariations || (!stepResults.polish && !stepResults.expand && !stepResults.outline)}
            >
              {isGeneratingVariations ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-3 w-3 mr-1" />
                  生成3版本
                </>
              )}
            </Button>
          </div>

          {variations.length > 0 ? (
            <div className="space-y-2">
              {/* Variation Tabs */}
              <div className="flex gap-1">
                {variations.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveVariation(i)}
                    className={`flex-1 py-1 rounded-md text-[10px] font-medium transition-all duration-200 cursor-pointer variation-tab ${
                      i === activeVariation
                        ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    版本{i + 1}
                  </button>
                ))}
              </div>

              {/* Active Variation Content */}
              <div className="variation-content rounded-lg border border-border/20 p-2 max-h-40 overflow-y-auto">
                <p className="text-[10px] whitespace-pre-wrap">
                  {variations[activeVariation]}
                </p>
              </div>

              {/* Variation Actions */}
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 flex-1 text-[10px]"
                  onClick={() => handleApplyContent(variations[activeVariation])}
                >
                  <Check className="h-3 w-3 mr-1" />
                  使用此版本
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => handleCopyContent(variations[activeVariation])}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                {variations.length >= 2 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 flex-1 text-[10px] text-violet-600 dark:text-violet-400"
                    onClick={handleMergeVariations}
                    disabled={isGeneratingVariations}
                  >
                    {isGeneratingVariations ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <Wand2 className="h-3 w-3 mr-1" />
                        合并精华
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground text-center py-3">
              先生成分步内容，再生成多个风格变体
            </p>
          )}
        </div>
      </motion.div>

      {/* ── Quick Templates ── */}
      <motion.div variants={staggerItem}>
        <div className="rounded-lg border border-border/20 bg-card/80 p-3 content-card-hover micro-hover">
          <div className="flex items-center gap-1.5 mb-2">
            <FileText className="h-3.5 w-3.5 text-violet-500" />
            <span className="text-[11px] font-semibold">快速模板</span>
          </div>
          <ScrollArea className="max-h-64 overflow-y-auto">
            <div className="grid grid-cols-2 gap-1.5">
              {QUICK_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleUseTemplate(template)}
                  disabled={isGenerating}
                  className="quick-template flex items-start gap-2 p-2 rounded-lg border border-border/20 hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50/50 dark:hover:bg-violet-950/10 transition-all duration-200 text-left cursor-pointer press-scale disabled:opacity-50"
                >
                  <div className="mt-0.5 shrink-0">{template.icon}</div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium truncate">{template.title}</p>
                    <p className="text-[8px] text-muted-foreground truncate">{template.structure}</p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </motion.div>
    </motion.div>
  );
}
