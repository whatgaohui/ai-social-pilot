"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronUp,
  Sparkles,
  Copy,
  Loader2,
  Flame,
  TrendingUp,
  Lightbulb,
  PenTool,
  Zap,
  Hash,
  Send,
  Eye,
  ArrowRight,
  RefreshCw,
  Check,
  MessageCircle,
  Target,
  Layers,
  Quote,
  BookOpen,
  Heart,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import type { Platform } from "@/types";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TitleFormula {
  id: string;
  name: string;
  example: string;
  exampleXHS: string;
  category: "suspense" | "number" | "emotion" | "contrast";
  usageCount: number;
  gradient: string;
}

interface TrendingTopic {
  id: string;
  tag: string;
  heat: number;
  category: string;
}

interface InspirationIdea {
  id: string;
  title: string;
  description: string;
  contentType: string;
  gradient: string;
}

interface WritingPrompt {
  id: string;
  question: string;
  angle: string;
  gradient: string;
  icon: typeof Lightbulb;
}

// ─── Data ───────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG = {
  suspense: {
    label: "悬念好奇",
    gradient: "from-rose-500 to-pink-600",
    badgeColor:
      "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    icon: Eye,
  },
  number: {
    label: "数字清单",
    gradient: "from-amber-500 to-orange-600",
    badgeColor:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    icon: Layers,
  },
  emotion: {
    label: "情感共鸣",
    gradient: "from-emerald-500 to-teal-600",
    badgeColor:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    icon: Heart,
  },
  contrast: {
    label: "对比反差",
    gradient: "from-violet-500 to-purple-600",
    badgeColor:
      "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
    icon: Target,
  },
} as const;

const TITLE_FORMULAS: TitleFormula[] = [
  // 悬念好奇类
  {
    id: "s1",
    name: "这个方法让我...",
    example: "这个方法让我一个月涨粉3000，同行都以为我花钱了",
    exampleXHS: "这个方法让我从0到1w粉！纯干货分享",
    category: "suspense",
    usageCount: 2847,
    gradient: "from-rose-500 to-pink-500",
  },
  {
    id: "s2",
    name: "没想到...竟然...",
    example: "没想到早起这个习惯竟然改变了我整个人的气质",
    exampleXHS: "没想到这件平价单品竟然比大牌还好用！",
    category: "suspense",
    usageCount: 3215,
    gradient: "from-rose-400 to-pink-500",
  },
  {
    id: "s3",
    name: "99%的人都不知道...",
    example: "99%的人都不知道，微信朋友圈这样发才能引流",
    exampleXHS: "99%的人都不知道！这个隐藏功能太强大了",
    category: "suspense",
    usageCount: 4102,
    gradient: "from-rose-600 to-red-500",
  },
  // 数字清单类
  {
    id: "n1",
    name: "10个...",
    example: "10个让你朋友圈更有吸引力的秘密，第5个太实用了",
    exampleXHS: "10个相见恨晚的APP！用完效率直接翻倍",
    category: "number",
    usageCount: 3651,
    gradient: "from-amber-500 to-orange-500",
  },
  {
    id: "n2",
    name: "5分钟学会...",
    example: "5分钟学会一条高赞朋友圈，亲测点赞率提升200%",
    exampleXHS: "5分钟学会！零基础也能画出的氛围感妆容",
    category: "number",
    usageCount: 2534,
    gradient: "from-amber-400 to-yellow-500",
  },
  {
    id: "n3",
    name: "月薪过万的3个习惯",
    example: "月薪过万的3个习惯，坚持了一个月彻底改变了我",
    exampleXHS: "月薪过万的3个副业习惯！学生党也能做",
    category: "number",
    usageCount: 3890,
    gradient: "from-orange-500 to-amber-500",
  },
  // 情感共鸣类
  {
    id: "e1",
    name: "终于有人说了...",
    example: "终于有人说出来了，做自媒体最难的不是创作，是坚持",
    exampleXHS: "终于有人说出来了！这些职场潜规则太真实了",
    category: "emotion",
    usageCount: 2103,
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    id: "e2",
    name: "每个XX都应该...",
    example: "每个做自媒体的人都应该知道的10条铁律",
    exampleXHS: "每个女生都应该知道的抗老真相！别再交智商税了",
    category: "emotion",
    usageCount: 1876,
    gradient: "from-emerald-400 to-green-500",
  },
  {
    id: "e3",
    name: "XX年的今天...",
    example: "5年前的今天我还在迷茫，今天这些改变让我想哭",
    exampleXHS: "毕业3年的今天，我终于活成了自己想要的样子",
    category: "emotion",
    usageCount: 1542,
    gradient: "from-teal-500 to-emerald-500",
  },
  // 对比反差类
  {
    id: "c1",
    name: "从XX到XX",
    example: "从月薪3000到月入5万，我做对了这3件事",
    exampleXHS: "从路人甲到精致女孩！我的变美逆袭之路",
    category: "contrast",
    usageCount: 2967,
    gradient: "from-violet-500 to-purple-500",
  },
  {
    id: "c2",
    name: "别人家的vs我家的",
    example: "别人家的朋友圈vs我发的朋友圈，差距到底在哪",
    exampleXHS: "别人家的vs我家的！改造完我哭了",
    category: "contrast",
    usageCount: 2234,
    gradient: "from-violet-400 to-fuchsia-500",
  },
  {
    id: "c3",
    name: "别再...了",
    example: "别再这样发朋友圈了，聪明人都在用这些方法",
    exampleXHS: "别再用这个洗面奶了！皮肤科医生说真的伤脸",
    category: "contrast",
    usageCount: 3456,
    gradient: "from-purple-500 to-violet-500",
  },
];

const TRENDING_TOPICS: TrendingTopic[] = [
  { id: "t1", tag: "职场成长", heat: 98, category: "职场" },
  { id: "t2", tag: "个人品牌打造", heat: 95, category: "营销" },
  { id: "t3", tag: "AI工具效率", heat: 92, category: "科技" },
  { id: "t4", tag: "副业赚钱", heat: 89, category: "财务" },
  { id: "t5", tag: "读书学习", heat: 86, category: "成长" },
  { id: "t6", tag: "健康养生", heat: 84, category: "生活" },
  { id: "t7", tag: "情绪管理", heat: 81, category: "心理" },
  { id: "t8", tag: "穿搭美学", heat: 78, category: "时尚" },
];

const WRITING_PROMPTS: WritingPrompt[] = [
  {
    id: "w1",
    question: "如果只能给读者一个建议，你会说什么？围绕这个建议展开一个真实故事",
    angle: "观点+故事",
    gradient: "from-rose-500 to-pink-500",
    icon: Lightbulb,
  },
  {
    id: "w2",
    question: "回忆你最近的一次'顿悟时刻'，把当时的想法和感受写下来",
    angle: "感悟+共鸣",
    gradient: "from-amber-500 to-orange-500",
    icon: Zap,
  },
  {
    id: "w3",
    question: "分享一个让你'早知道就好了'的经验，帮读者少走弯路",
    angle: "经验+避坑",
    gradient: "from-emerald-500 to-teal-500",
    icon: Target,
  },
  {
    id: "w4",
    question: "用'从前我...现在我...'的句式，写出你的成长变化故事",
    angle: "对比+成长",
    gradient: "from-violet-500 to-purple-500",
    icon: Layers,
  },
  {
    id: "w5",
    question: "描述一个你最近看到的有趣现象，并给出你的独特解读",
    angle: "观察+洞察",
    gradient: "from-pink-500 to-rose-500",
    icon: Eye,
  },
  {
    id: "w6",
    question: "如果让你向5年前的自己说一句话，你会说什么？以此展开",
    angle: "时间+反思",
    gradient: "from-orange-500 to-amber-500",
    icon: Star,
  },
];

const TOPIC_CONTENT_TYPES = [
  "观点洞察",
  "经验分享",
  "故事叙述",
  "互动话题",
  "干货知识",
  "日常分享",
];

// ─── Animation Variants ────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

const shimmerVariants = {
  initial: { backgroundPosition: "-200% 0" },
  animate: {
    backgroundPosition: "200% 0",
    transition: { repeat: Infinity, duration: 2, ease: "linear" as const },
  },
};

// ─── Section Header Component ───────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  gradient,
  isOpen,
}: {
  icon: typeof Sparkles;
  title: string;
  subtitle: string;
  gradient: string;
  isOpen: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div
          className={`h-8 w-8 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}
        >
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold leading-tight">{title}</h3>
          <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>
      <motion.div
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ duration: 0.25 }}
      >
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </motion.div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function ViralInspiration() {
  const { platform, persona } = useAppStore();
  const isXHS = platform === "xiaohongshu";

  // Collapsible states
  const [showTitleFormulas, setShowTitleFormulas] = useState(true);
  const [showAIInspiration, setShowAIInspiration] = useState(false);
  const [showTrending, setShowTrending] = useState(false);
  const [showWritingPrompts, setShowWritingPrompts] = useState(false);

  // Title formulas state
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [rewritingFormula, setRewritingFormula] = useState<string | null>(null);
  const [rewriteResult, setRewriteResult] = useState<string>("");

  // AI inspiration state
  const [inspirationKeyword, setInspirationKeyword] = useState("");
  const [isGeneratingInspiration, setIsGeneratingInspiration] = useState(false);
  const [inspirationIdeas, setInspirationIdeas] = useState<InspirationIdea[]>([]);

  // Writing prompts state
  const [expandingPrompt, setExpandingPrompt] = useState<string | null>(null);
  const [expandResult, setExpandResult] = useState<string>("");

  // Copy feedback hooks
  const { copied: formulaCopied, copy: copyFormula } = useCopyToClipboard();
  const { copied: hashtagCopied, copy: copyHashtag } = useCopyToClipboard();
  const { copied: otherCopied, copy: copyOther } = useCopyToClipboard();

  // Category filter
  const filteredFormulas =
    activeCategory === "all"
      ? TITLE_FORMULAS
      : TITLE_FORMULAS.filter((f) => f.category === activeCategory);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleCopyFormula = (text: string) => {
    copyFormula(text);
  };

  const handleAIRewrite = async (formula: TitleFormula) => {
    setRewritingFormula(formula.id);
    setRewriteResult("");
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "inspiration",
          persona: useAppStore.getState().persona,
          knowledgeItems: [],
          topic: `使用标题公式"${formula.name}"，为${isXHS ? "小红书笔记" : "朋友圈"}生成一个吸引眼球的标题`,
          platform: useAppStore.getState().platform,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRewriteResult(data.content);
        toast.success("AI已生成定制标题");
      }
    } catch {
      toast.error("AI生成失败，请重试");
    } finally {
      setRewritingFormula(null);
    }
  };

  const handleGenerateInspiration = async () => {
    if (!inspirationKeyword.trim()) {
      toast.error("请输入关键词或话题");
      return;
    }
    setIsGeneratingInspiration(true);
    setInspirationIdeas([]);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "inspiration",
          persona: useAppStore.getState().persona,
          knowledgeItems: [],
          topic: inspirationKeyword,
          platform: useAppStore.getState().platform,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        // Parse the AI response into structured ideas
        const ideas = parseInspirationResponse(data.content);
        setInspirationIdeas(ideas);
        toast.success("灵感已生成");
      }
    } catch {
      toast.error("生成失败，请重试");
    } finally {
      setIsGeneratingInspiration(false);
    }
  };

  const handleCopyHashtag = (tag: string) => {
    const text = isXHS ? `#${tag}` : tag;
    copyHashtag(text);
  };

  const handleUseTopic = (idea: InspirationIdea) => {
    copyOther(`${idea.title}\n${idea.description}`);
  };

  const handleAIExpand = async (prompt: WritingPrompt) => {
    setExpandingPrompt(prompt.id);
    setExpandResult("");
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "inspiration",
          persona: useAppStore.getState().persona,
          knowledgeItems: [],
          topic: `根据写作提示"${prompt.question}"，展开写一篇${isXHS ? "小红书笔记" : "朋友圈文案"}`,
          platform: useAppStore.getState().platform,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setExpandResult(data.content);
        toast.success("AI已展开完整内容");
      }
    } catch {
      toast.error("展开失败，请重试");
    } finally {
      setExpandingPrompt(null);
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const parseInspirationResponse = (content: string): InspirationIdea[] => {
    const gradients = [
      "from-rose-500 to-pink-500",
      "from-amber-500 to-orange-500",
      "from-emerald-500 to-teal-500",
      "from-violet-500 to-purple-500",
      "from-pink-500 to-rose-500",
    ];
    const contentTypes = TOPIC_CONTENT_TYPES;

    // Try to parse numbered list or separate by newlines
    const lines = content.split("\n").filter((l) => l.trim());
    const ideas: InspirationIdea[] = [];

    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const line = lines[i].trim();
      // Remove leading numbers/bullets
      const cleaned = line.replace(/^[\d\.\-\*]+\s*/, "").trim();
      if (cleaned) {
        const parts = cleaned.split(/[：:]/);
        const title = (parts[0] || cleaned).substring(0, 30);
        const description = parts.slice(1).join("：").substring(0, 80) || "点击查看详情";
        ideas.push({
          id: `idea-${i}`,
          title,
          description: description || "由AI生成的创意话题",
          contentType: contentTypes[i % contentTypes.length],
          gradient: gradients[i % gradients.length],
        });
      }
    }

    // Fallback if parsing didn't work well
    if (ideas.length === 0) {
      const sentences = content.split(/[。！？\n]/).filter((s) => s.trim().length > 5);
      for (let i = 0; i < Math.min(sentences.length, 5); i++) {
        ideas.push({
          id: `idea-${i}`,
          title: sentences[i].trim().substring(0, 30),
          description: sentences[i].trim().substring(0, 80) || "由AI生成的创意话题",
          contentType: contentTypes[i % contentTypes.length],
          gradient: gradients[i % gradients.length],
        });
      }
    }

    return ideas;
  };

  const getHeatEmoji = (heat: number) => {
    if (heat >= 95) return "🔥🔥🔥";
    if (heat >= 90) return "🔥🔥";
    if (heat >= 85) return "🔥";
    return "⭐";
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <ScrollArea className="h-full px-4 py-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        {/* ── Section 1: 爆款标题公式库 ──────────────────────────────── */}
        <Collapsible open={showTitleFormulas} onOpenChange={setShowTitleFormulas}>
          <CollapsibleTrigger className="w-full">
            <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group">
              <CardContent className="p-4">
                <SectionHeader
                  icon={Zap}
                  title="爆款标题公式库"
                  subtitle={
                    isXHS
                      ? "12个小红书爆款标题公式，点击即用"
                      : "12个朋友圈高赞标题公式，点击即用"
                  }
                  gradient="from-rose-500 to-orange-500"
                  isOpen={showTitleFormulas}
                />
              </CardContent>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.3 }}
              className="space-y-3 mt-2"
            >
              {/* Category Filter */}
              <div className="flex gap-1.5 flex-wrap">
                <Button
                  variant={activeCategory === "all" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs px-2.5"
                  onClick={() => setActiveCategory("all")}
                >
                  全部
                </Button>
                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <Button
                      key={key}
                      variant={activeCategory === key ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 text-xs px-2.5 gap-1"
                      onClick={() => setActiveCategory(key)}
                    >
                      <Icon className="h-3 w-3" />
                      {config.label}
                    </Button>
                  );
                })}
              </div>

              {/* Formula Cards */}
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                key={`cat-${activeCategory}`}
                className="space-y-2"
              >
                <AnimatePresence mode="popLayout">
                  {filteredFormulas.map((formula, idx) => {
                    const catConfig = CATEGORY_CONFIG[formula.category];
                    const isRewriting = rewritingFormula === formula.id;
                    const example = isXHS ? formula.exampleXHS : formula.example;

                    return (
                      <motion.div
                        key={formula.id}
                        variants={itemVariants}
                        layout
                        initial={{ opacity: 0, y: 12, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.98 }}
                        transition={{
                          duration: 0.3,
                          delay: idx * 0.04,
                        }}
                      >
                        <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 group/card overflow-hidden relative">
                          {/* Gradient top accent */}
                          <div
                            className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${formula.gradient}`}
                          />
                          <CardContent className="p-3 pt-3.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <h4 className="text-sm font-semibold">
                                    {formula.name}
                                  </h4>
                                  <Badge
                                    variant="secondary"
                                    className={`text-[10px] px-1.5 py-0 shrink-0 ${catConfig.badgeColor}`}
                                  >
                                    {catConfig.label}
                                  </Badge>
                                </div>
                                {/* Example Title */}
                                <motion.button
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => handleCopyFormula(example)}
                                  className="text-left w-full group/example"
                                >
                                  <p className="text-xs leading-relaxed text-muted-foreground group-hover/example:text-foreground transition-colors line-clamp-2">
                                    {example}
                                  </p>
                                </motion.button>
                                {/* Usage count */}
                                <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
                                  <Eye className="h-3 w-3" />
                                  <span>{formula.usageCount.toLocaleString()} 次使用</span>
                                </div>

                                {/* AI Rewrite Result */}
                                <AnimatePresence>
                                  {rewriteResult &&
                                    rewritingFormula !== formula.id &&
                                    idx ===
                                      filteredFormulas.findIndex(
                                        (f) => f.id === formula.id
                                      ) &&
                                    false && (
                                      <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -4 }}
                                        className="mt-2"
                                      >
                                        <div className="rounded-lg bg-muted/50 p-2.5 border">
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                              ✨ AI定制标题
                                            </span>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className={`h-5 px-1.5 text-[10px] ${otherCopied ? "text-emerald-600" : ""}`}
                                              onClick={() => {
                                                copyOther(rewriteResult);
                                              }}
                                            >
                                              {otherCopied ? <Check className="h-2.5 w-2.5 mr-0.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5 mr-0.5" />}
                                              {otherCopied ? "已复制" : "复制"}
                                            </Button>
                                          </div>
                                          <p className="text-xs leading-relaxed">
                                            {rewriteResult}
                                          </p>
                                        </div>
                                      </motion.div>
                                    )}
                                </AnimatePresence>
                              </div>

                              {/* Action buttons */}
                              <div className="flex flex-col gap-1.5 shrink-0">
                                <motion.div whileTap={{ scale: 0.9 }}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`h-7 w-7 p-0 ${formulaCopied ? "text-emerald-500" : "text-muted-foreground hover:text-foreground"}`}
                                    onClick={() => handleCopyFormula(example)}
                                  >
                                    {formulaCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                  </Button>
                                </motion.div>
                                <motion.div whileTap={{ scale: 0.9 }}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`h-7 w-7 p-0 ${isRewriting ? "text-amber-500" : "text-muted-foreground hover:text-amber-500"}`}
                                    onClick={() => handleAIRewrite(formula)}
                                    disabled={isRewriting}
                                  >
                                    {isRewriting ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Sparkles className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                </motion.div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>

              {/* AI Rewrite Result (shown at bottom of section) */}
              <AnimatePresence>
                {rewriteResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    <Card className="border-0 shadow-sm overflow-hidden">
                      <div className="h-0.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                              AI定制标题
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-6 px-2 text-[10px] ${otherCopied ? "text-emerald-600" : ""}`}
                              onClick={() => {
                                copyOther(rewriteResult);
                              }}
                            >
                              {otherCopied ? <Check className="h-2.5 w-2.5 mr-0.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5 mr-0.5" />}
                              {otherCopied ? "已复制" : "复制"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-[10px]"
                              onClick={() => setRewriteResult("")}
                            >
                              关闭
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {rewriteResult}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </CollapsibleContent>
        </Collapsible>

        {/* ── Section 2: AI话题灵感 ──────────────────────────────────── */}
        <Collapsible open={showAIInspiration} onOpenChange={setShowAIInspiration}>
          <CollapsibleTrigger className="w-full">
            <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group">
              <CardContent className="p-4">
                <SectionHeader
                  icon={Lightbulb}
                  title="AI话题灵感"
                  subtitle="输入关键词，AI帮你生成创意话题"
                  gradient="from-amber-500 to-emerald-500"
                  isOpen={showAIInspiration}
                />
              </CardContent>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-3 mt-2"
            >
              {/* Input Area */}
              <Card className="border-0 shadow-sm overflow-hidden">
                <div className="h-0.5 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400" />
                <CardContent className="p-3 space-y-2.5">
                  <p className="text-xs text-muted-foreground">
                    输入行业、关键词或话题方向，AI将为你生成5个创意内容话题
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="例如：健身、美食、职场、副业..."
                      value={inspirationKeyword}
                      onChange={(e) => setInspirationKeyword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleGenerateInspiration();
                      }}
                      className="text-sm h-9 flex-1"
                    />
                    <motion.div whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={handleGenerateInspiration}
                        disabled={
                          isGeneratingInspiration || !inspirationKeyword.trim()
                        }
                        size="sm"
                        className="h-9 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm"
                      >
                        {isGeneratingInspiration ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-1.5" />
                            生成灵感
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </div>
                  {/* Quick suggestion chips */}
                  <div className="flex gap-1.5 flex-wrap">
                    {["个人成长", "副业赚钱", "生活方式", "职场干货", "好物分享"].map(
                      (chip) => (
                        <motion.button
                          key={chip}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="px-2 py-0.5 rounded-full text-[10px] bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setInspirationKeyword(chip)}
                        >
                          {chip}
                        </motion.button>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Loading shimmer */}
              {isGeneratingInspiration && (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-2"
                >
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      variants={itemVariants}
                      className="h-24 rounded-xl overflow-hidden"
                    >
                      <motion.div
                        variants={shimmerVariants}
                        initial="initial"
                        animate="animate"
                        className="h-full w-full bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] rounded-xl"
                      />
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* Generated Ideas */}
              <AnimatePresence>
                {inspirationIdeas.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      className="space-y-2"
                    >
                      {inspirationIdeas.map((idea, idx) => (
                        <motion.div
                          key={idea.id}
                          variants={itemVariants}
                          transition={{ delay: idx * 0.08 }}
                        >
                          <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 group/idea overflow-hidden">
                            <div
                              className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${idea.gradient}`}
                            />
                            <CardContent className="p-3 pl-4">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span
                                      className={`text-sm font-semibold bg-clip-text text-transparent bg-gradient-to-r ${idea.gradient}`}
                                    >
                                      {idea.title}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                    {idea.description}
                                  </p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] px-1.5 py-0"
                                    >
                                      {idea.contentType}
                                    </Badge>
                                  </div>
                                </div>
                                <motion.div
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-[10px] shrink-0 text-muted-foreground hover:text-foreground"
                                    onClick={() => handleUseTopic(idea)}
                                  >
                                    <Send className="h-3 w-3 mr-0.5" />
                                    使用
                                  </Button>
                                </motion.div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </motion.div>

                    {/* Regenerate button */}
                    <div className="flex justify-center pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground"
                        onClick={handleGenerateInspiration}
                        disabled={isGeneratingInspiration}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        换一批灵感
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </CollapsibleContent>
        </Collapsible>

        {/* ── Section 3: 热门话题趋势 ─────────────────────────────────── */}
        <Collapsible open={showTrending} onOpenChange={setShowTrending}>
          <CollapsibleTrigger className="w-full">
            <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group">
              <CardContent className="p-4">
                <SectionHeader
                  icon={Flame}
                  title="热门话题趋势"
                  subtitle="当前热门话题，点击复制话题标签"
                  gradient="from-orange-500 to-red-500"
                  isOpen={showTrending}
                />
              </CardContent>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-2"
            >
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-2 gap-2"
              >
                {TRENDING_TOPICS.map((topic, idx) => {
                  const heatLevel =
                    topic.heat >= 95
                      ? "from-red-500 to-rose-600"
                      : topic.heat >= 90
                        ? "from-orange-500 to-amber-500"
                        : topic.heat >= 85
                          ? "from-amber-500 to-yellow-500"
                          : "from-emerald-500 to-teal-500";

                  return (
                    <motion.div
                      key={topic.id}
                      variants={itemVariants}
                      transition={{ delay: idx * 0.06 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden">
                        <div
                          className={`h-0.5 bg-gradient-to-r ${heatLevel}`}
                        />
                        <CardContent
                          className="p-2.5"
                          onClick={() => handleCopyHashtag(topic.tag)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {topic.category}
                            </Badge>
                            <span className="text-[10px] font-medium text-muted-foreground">
                              {getHeatEmoji(topic.heat)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Hash className="h-3 w-3 text-orange-500 shrink-0" />
                            <span className="text-xs font-medium truncate">
                              {topic.tag}
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{
                                  width: `${topic.heat}%`,
                                }}
                                transition={{
                                  duration: 0.8,
                                  delay: 0.3 + idx * 0.1,
                                  ease: "easeOut",
                                }}
                                className={`h-full rounded-full bg-gradient-to-r ${heatLevel}`}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              {topic.heat}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* Copy all button */}
              <div className="flex justify-center pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-xs ${hashtagCopied ? "text-emerald-600" : "text-muted-foreground"}`}
                  onClick={() => {
                    const allTags = TRENDING_TOPICS.map((t) =>
                      isXHS ? `#${t.tag}` : t.tag
                    ).join(" ");
                    copyHashtag(allTags);
                  }}
                >
                  {hashtagCopied ? <Check className="h-3 w-3 mr-1 text-emerald-500" /> : <Copy className="h-3 w-3 mr-1" />}
                  {hashtagCopied ? "已复制" : "复制全部话题标签"}
                </Button>
              </div>
            </motion.div>
          </CollapsibleContent>
        </Collapsible>

        {/* ── Section 4: 创意写作提示 ──────────────────────────────────── */}
        <Collapsible
          open={showWritingPrompts}
          onOpenChange={setShowWritingPrompts}
        >
          <CollapsibleTrigger className="w-full">
            <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group">
              <CardContent className="p-4">
                <SectionHeader
                  icon={PenTool}
                  title="创意写作提示"
                  subtitle="6个灵感角度，帮你打开创作思路"
                  gradient="from-emerald-500 to-teal-500"
                  isOpen={showWritingPrompts}
                />
              </CardContent>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-2 mt-2"
            >
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-2"
              >
                {WRITING_PROMPTS.map((prompt, idx) => {
                  const Icon = prompt.icon;
                  const isExpanding = expandingPrompt === prompt.id;

                  return (
                    <motion.div
                      key={prompt.id}
                      variants={itemVariants}
                      transition={{ delay: idx * 0.06 }}
                    >
                      <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 group/prompt overflow-hidden">
                        <div
                          className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${prompt.gradient}`}
                        />
                        <CardContent className="p-3">
                          <div className="flex items-start gap-2.5">
                            <div
                              className={`h-8 w-8 rounded-xl bg-gradient-to-br ${prompt.gradient} flex items-center justify-center shrink-0 shadow-sm`}
                            >
                              <Icon className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0"
                                >
                                  {prompt.angle}
                                </Badge>
                              </div>
                              <p className="text-xs leading-relaxed text-muted-foreground group-hover/prompt:text-foreground transition-colors">
                                {prompt.question}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <motion.div whileTap={{ scale: 0.95 }}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`h-7 px-2.5 text-[10px] gap-1 ${isExpanding ? "text-emerald-500" : "text-muted-foreground hover:text-emerald-500"}`}
                                    onClick={() => handleAIExpand(prompt)}
                                    disabled={isExpanding}
                                  >
                                    {isExpanding ? (
                                      <>
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        AI展开中...
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="h-3 w-3" />
                                        AI展开
                                      </>
                                    )}
                                  </Button>
                                </motion.div>
                              </div>

                              {/* Expand Result */}
                              <AnimatePresence>
                                {expandResult &&
                                  expandingPrompt !== prompt.id &&
                                  false && (
                                    <motion.div
                                      initial={{ opacity: 0, y: 8 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -4 }}
                                      className="mt-2"
                                    >
                                      <div className="rounded-lg bg-muted/50 p-2.5 border relative group/result">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className={`absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover/result:opacity-100 transition-opacity ${otherCopied ? "text-emerald-500" : ""}`}
                                          onClick={() => {
                                            copyOther(expandResult);
                                          }}
                                        >
                                          {otherCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                        </Button>
                                        <p className="text-xs leading-relaxed whitespace-pre-wrap pr-6">
                                          {expandResult}
                                        </p>
                                      </div>
                                    </motion.div>
                                  )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* AI Expand Result (global) */}
              <AnimatePresence>
                {expandResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    <Card className="border-0 shadow-sm overflow-hidden">
                      <div className="h-0.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              AI展开内容
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-6 px-2 text-[10px] ${otherCopied ? "text-emerald-600" : ""}`}
                              onClick={() => {
                                copyOther(expandResult);
                              }}
                            >
                              {otherCopied ? <Check className="h-2.5 w-2.5 mr-0.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5 mr-0.5" />}
                              {otherCopied ? "已复制" : "复制"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-[10px]"
                              onClick={() => setExpandResult("")}
                            >
                              关闭
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {expandResult}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </CollapsibleContent>
        </Collapsible>

        {/* Bottom spacing */}
        <div className="h-4" />
      </motion.div>
    </ScrollArea>
  );
}
