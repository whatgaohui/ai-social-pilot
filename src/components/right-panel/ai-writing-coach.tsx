"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Wand2,
  Loader2,
  Check,
  Type,
  Layout,
  Heart,
  Megaphone,
  Smartphone,
  Search,
} from "lucide-react";
import { toast } from "sonner";

// ─── Animation Variants ──────────────────────────────────────────────

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const },
  },
};

// ─── Coaching Category Types ─────────────────────────────────────────

interface WritingSuggestion {
  id: string;
  text: string;
  priority: "high" | "medium" | "low";
}

interface CoachingCategory {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  color: string;
  gradient: string;
  emoji: string;
  analyze: (content: string, platform: string, topic?: string) => {
    score: number;
    suggestions: WritingSuggestion[];
  };
}

// ─── Analysis Functions ──────────────────────────────────────────────

function analyzeHookQuality(content: string, _platform: string, topic?: string): { score: number; suggestions: WritingSuggestion[] } {
  const suggestions: WritingSuggestion[] = [];
  let score = 50;

  if (!content) {
    return { score: 0, suggestions: [{ id: "h-empty", text: "内容为空，无法分析开头吸引力", priority: "high" }] };
  }

  const firstLine = content.split("\n")[0] || "";
  const firstChars = firstLine.slice(0, 30);

  // Check for question hook
  if (firstChars.includes("?") || firstChars.includes("？") || firstChars.includes("吗") || firstChars.includes("呢")) {
    score += 20;
  } else {
    suggestions.push({ id: "h-question", text: "开头缺少疑问句式，建议用提问吸引读者注意", priority: "high" });
  }

  // Check for emotional trigger words
  const emotionWords = ["太", "终于", "竟然", "突然", "超级", "绝了", "真的", "最", "第一次", "居然"];
  const hasEmotion = emotionWords.some((w) => firstChars.includes(w));
  if (hasEmotion) {
    score += 15;
  } else {
    suggestions.push({ id: "h-emotion", text: "开头缺少情感词，建议加入「太」「竟然」「超级」等情绪词", priority: "medium" });
  }

  // Check for numbers
  if (/\d/.test(firstChars)) {
    score += 10;
  } else {
    suggestions.push({ id: "h-number", text: "开头缺少数字，用具体数字更有说服力（如「3个方法」）", priority: "medium" });
  }

  // Check length
  if (firstLine.length > 50) {
    score -= 10;
    suggestions.push({ id: "h-length", text: "开头过长（>50字），建议精简到30字以内", priority: "low" });
  }

  // Check topic relevance
  if (topic && firstLine.includes(topic.slice(0, 4))) {
    score += 5;
  }

  return { score: Math.min(100, Math.max(0, score)), suggestions };
}

function analyzeStructure(content: string, platform: string, _topic?: string): { score: number; suggestions: WritingSuggestion[] } {
  const suggestions: WritingSuggestion[] = [];
  let score = 50;

  if (!content) {
    return { score: 0, suggestions: [{ id: "s-empty", text: "内容为空，无法分析结构", priority: "high" }] };
  }

  const lines = content.split("\n").filter((l) => l.trim());
  const paragraphs = content.split(/\n\s*\n/).filter((p) => p.trim());

  // Check paragraph count
  if (paragraphs.length >= 3) {
    score += 15;
  } else if (paragraphs.length === 2) {
    score += 5;
    suggestions.push({ id: "s-paragraphs", text: "段落偏少，建议增加1-2个段落，让内容更有层次", priority: "medium" });
  } else {
    suggestions.push({ id: "s-paragraphs", text: "缺少分段，建议拆分为多个段落，提升阅读体验", priority: "high" });
  }

  // Check for numbered lists
  if (/^\d+[.、）)]/m.test(content) || /[①②③④⑤]/.test(content)) {
    score += 15;
  } else {
    suggestions.push({ id: "s-list", text: "建议使用编号列表（1️⃣2️⃣3️⃣），让要点更清晰", priority: "medium" });
  }

  // Check for emoji
  const emojiCount = (content.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || []).length;
  if (platform === "xiaohongshu" && emojiCount >= 3) {
    score += 10;
  } else if (platform === "xiaohongshu" && emojiCount < 3) {
    suggestions.push({ id: "s-emoji", text: "小红书内容建议添加更多emoji表情，提升视觉效果", priority: "medium" });
  } else if (emojiCount > 0) {
    score += 5;
  }

  // Check for conclusion/call-to-action at end
  const lastLine = lines[lines.length - 1] || "";
  if (lastLine.includes("觉得") || lastLine.includes("大家") || lastLine.includes("推荐") || lastLine.includes("试试") || lastLine.includes("关注")) {
    score += 10;
  } else {
    suggestions.push({ id: "s-conclusion", text: "结尾缺少总结或互动引导，建议添加「觉得有用请点赞」之类的结语", priority: "medium" });
  }

  // Check line length uniformity
  if (lines.length > 0) {
    const avgLen = lines.reduce((s, l) => s + l.length, 0) / lines.length;
    if (avgLen > 80) {
      score -= 5;
      suggestions.push({ id: "s-linelength", text: "句子偏长，建议拆分为更短的句子，提升阅读体验", priority: "low" });
    }
  }

  return { score: Math.min(100, Math.max(0, score)), suggestions };
}

function analyzeEmotion(content: string, _platform: string, _topic?: string): { score: number; suggestions: WritingSuggestion[] } {
  const suggestions: WritingSuggestion[] = [];
  let score = 50;

  if (!content) {
    return { score: 0, suggestions: [{ id: "e-empty", text: "内容为空，无法分析情感共鸣", priority: "high" }] };
  }

  // Check for emotional keywords
  const positiveWords = ["喜欢", "开心", "幸福", "感动", "温暖", "美好", "收获", "成功", "值得", "推荐", "宝藏", "绝绝子", "冲"];
  const empathyWords = ["我", "我们", "你", "大家", "其实", "以前", "后来", "一直", "每次", "总"];
  const 痛点Words = ["困扰", "烦恼", "焦虑", "迷茫", "纠结", "后悔", "害怕", "压力"];

  const positiveCount = positiveWords.filter((w) => content.includes(w)).length;
  const empathyCount = empathyWords.filter((w) => content.includes(w)).length;
  const painCount = 痛点Words.filter((w) => content.includes(w)).length;

  if (positiveCount >= 2) score += 15;
  else suggestions.push({ id: "e-positive", text: "建议加入更多正面情感词（如「喜欢」「值得」「推荐」）", priority: "medium" });

  if (empathyCount >= 3) score += 15;
  else suggestions.push({ id: "e-empathy", text: "建议使用更多第一人称表达（如「我觉得」「我一直」），增强代入感", priority: "medium" });

  if (painCount >= 1) score += 10;
  else suggestions.push({ id: "e-pain", text: "缺少痛点描述，加入读者常见的困扰更能引发共鸣", priority: "low" });

  // Check for exclamation marks (enthusiasm)
  const exclCount = (content.match(/[!！]/g) || []).length;
  if (exclCount >= 1 && exclCount <= 5) score += 10;
  else if (exclCount > 5) {
    score -= 5;
    suggestions.push({ id: "e-excl", text: "感叹号过多，建议减少到2-3个，保持真诚感", priority: "low" });
  }

  return { score: Math.min(100, Math.max(0, score)), suggestions };
}

function analyzeCTA(content: string, platform: string, _topic?: string): { score: number; suggestions: WritingSuggestion[] } {
  const suggestions: WritingSuggestion[] = [];
  let score = 50;

  if (!content) {
    return { score: 0, suggestions: [{ id: "c-empty", text: "内容为空，无法分析CTA效果", priority: "high" }] };
  }

  const lines = content.split("\n").filter((l) => l.trim());
  const lastLines = lines.slice(-3).join("\n");

  // Check for action words
  const actionWords = ["点赞", "收藏", "关注", "转发", "评论", "试试", "分享", "告诉我", "留言", "关注我", "记得"];
  const hasAction = actionWords.some((w) => lastLines.includes(w));

  if (hasAction) {
    score += 20;
  } else {
    suggestions.push({ id: "c-action", text: "结尾缺少行动号召，建议添加「点赞收藏」「评论区告诉我」等引导", priority: "high" });
  }

  // Check for hashtag on XHS
  if (platform === "xiaohongshu") {
    const hashtagCount = (content.match(/#[\u4e00-\u9fa5a-zA-Z0-9]+/g) || []).length;
    if (hashtagCount >= 3) {
      score += 15;
    } else if (hashtagCount >= 1) {
      score += 5;
      suggestions.push({ id: "c-hashtag", text: "小红书建议添加3-5个话题标签（#话题），提升曝光率", priority: "medium" });
    } else {
      suggestions.push({ id: "c-hashtag", text: "小红书内容必须添加话题标签（#话题），否则曝光受限", priority: "high" });
    }
  }

  // Check for specific CTA patterns
  const ctaPatterns = ["❤️", "⭐", "👍", "📌", "有什么"];
  const hasPattern = ctaPatterns.some((p) => lastLines.includes(p));
  if (hasPattern) score += 10;
  else {
    suggestions.push({ id: "c-pattern", text: "建议在结尾使用emoji引导互动（如❤️⭐👍）", priority: "low" });
  }

  return { score: Math.min(100, Math.max(0, score)), suggestions };
}

function analyzePlatformFit(content: string, platform: string, _topic?: string): { score: number; suggestions: WritingSuggestion[] } {
  const suggestions: WritingSuggestion[] = [];
  let score = 60;

  if (!content) {
    return { score: 0, suggestions: [{ id: "p-empty", text: "内容为空，无法分析平台适配", priority: "high" }] };
  }

  const charCount = content.length;

  if (platform === "xiaohongshu") {
    // XHS prefers 300-800 chars
    if (charCount >= 300 && charCount <= 800) {
      score += 20;
    } else if (charCount < 300) {
      score -= 10;
      suggestions.push({ id: "p-xhs-length", text: "小红书内容偏短，建议扩展到300-800字", priority: "medium" });
    } else {
      suggestions.push({ id: "p-xhs-length", text: "内容较长，小红书读者偏好精简内容，建议精简到800字以内", priority: "low" });
    }

    // XHS needs title
    const firstLine = content.split("\n")[0] || "";
    if (firstLine.length > 5 && firstLine.length <= 25) {
      score += 10;
    } else if (firstLine.length > 25) {
      suggestions.push({ id: "p-xhs-title", text: "标题偏长（>25字），建议控制在20字以内更吸引点击", priority: "medium" });
    }

    // Check for product/brand mentions
    if (content.includes("推荐") || content.includes("分享") || content.includes("使用") || content.includes("体验")) {
      score += 10;
    }
  } else {
    // WeChat Moments: shorter is better, 50-300 chars
    if (charCount <= 300) {
      score += 20;
    } else if (charCount > 500) {
      score -= 15;
      suggestions.push({ id: "p-wx-length", text: "朋友圈内容过长（>500字），读者注意力有限，建议精简", priority: "high" });
    } else {
      score += 5;
      suggestions.push({ id: "p-wx-length", text: "朋友圈建议控制在300字以内，提升完读率", priority: "medium" });
    }

    // Check for casual tone
    const casualWords = ["哈哈", "笑死", "真的", "绝了", "哈哈", "无语"];
    if (casualWords.some((w) => content.includes(w))) {
      score += 10;
    }
  }

  return { score: Math.min(100, Math.max(0, score)), suggestions };
}

function analyzeSEO(content: string, platform: string, topic?: string): { score: number; suggestions: WritingSuggestion[] } {
  const suggestions: WritingSuggestion[] = [];
  let score = 50;

  if (!content) {
    return { score: 0, suggestions: [{ id: "seo-empty", text: "内容为空，无法分析SEO", priority: "high" }] };
  }

  // Check topic keyword inclusion
  if (topic && topic.length > 0) {
    const keywords = topic.split(/[,，、\s]+/).filter(Boolean);
    const includedKeywords = keywords.filter((kw) => content.includes(kw));
    if (keywords.length > 0) {
      const inclusionRate = includedKeywords.length / keywords.length;
      if (inclusionRate >= 0.7) {
        score += 20;
      } else if (inclusionRate >= 0.3) {
        score += 10;
        suggestions.push({ id: "seo-keywords", text: `主题关键词覆盖不足，建议在正文中更多提及「${keywords.slice(0, 2).join("」「")}」`, priority: "medium" });
      } else {
        suggestions.push({ id: "seo-keywords", text: "正文缺少主题关键词，影响搜索排名", priority: "high" });
      }
    }
  } else {
    suggestions.push({ id: "seo-topic", text: "未设置内容主题，建议填写主题以便SEO优化", priority: "medium" });
  }

  // Check for hashtag usage
  const hashtags = (content.match(/#[\u4e00-\u9fa5a-zA-Z0-9]+/g) || []);
  if (hashtags.length >= 3) {
    score += 10;
  } else if (hashtags.length > 0) {
    score += 5;
    suggestions.push({ id: "seo-hashtags", text: "话题标签偏少，建议添加3-5个相关话题标签", priority: "low" });
  } else {
    suggestions.push({ id: "seo-hashtags", text: "缺少话题标签，影响内容被搜索到的概率", priority: "medium" });
  }

  // Check for trending format
  const trendingFormats = ["合集", "攻略", "教程", "推荐", "清单", "必看", "避坑", "测评", "对比"];
  const hasTrending = trendingFormats.some((f) => content.includes(f));
  if (hasTrending) {
    score += 10;
  } else {
    suggestions.push({ id: "seo-trending", text: "可考虑加入热门格式词（如「合集」「攻略」「教程」），提升搜索曝光", priority: "low" });
  }

  if (platform === "xiaohongshu") {
    const titleFirst = content.split("\n")[0] || "";
    if (titleFirst.includes("|") || titleFirst.includes("｜")) {
      score += 5;
    }
  }

  return { score: Math.min(100, Math.max(0, score)), suggestions };
}

// ─── Coaching Categories ─────────────────────────────────────────────

const COACHING_CATEGORIES: CoachingCategory[] = [
  {
    id: "hook",
    label: "开头吸引力",
    icon: Type,
    description: "分析开头是否引人入胜",
    color: "text-amber-500",
    gradient: "from-amber-500 to-orange-500",
    emoji: "🎣",
    analyze: analyzeHookQuality,
  },
  {
    id: "structure",
    label: "内容结构",
    icon: Layout,
    description: "分析内容组织是否清晰",
    color: "text-violet-500",
    gradient: "from-violet-500 to-purple-500",
    emoji: "📐",
    analyze: analyzeStructure,
  },
  {
    id: "emotion",
    label: "情感共鸣",
    icon: Heart,
    description: "分析是否能引发读者共鸣",
    color: "text-rose-500",
    gradient: "from-rose-500 to-pink-500",
    emoji: "💖",
    analyze: analyzeEmotion,
  },
  {
    id: "cta",
    label: "CTA效果",
    icon: Megaphone,
    description: "分析行动号召效果",
    color: "text-emerald-500",
    gradient: "from-emerald-500 to-teal-500",
    emoji: "📣",
    analyze: analyzeCTA,
  },
  {
    id: "platform",
    label: "平台适配",
    icon: Smartphone,
    description: "分析内容与平台匹配度",
    color: "text-cyan-500",
    gradient: "from-cyan-500 to-teal-500",
    emoji: "📱",
    analyze: analyzePlatformFit,
  },
  {
    id: "seo",
    label: "SEO优化",
    icon: Search,
    description: "分析内容可搜索性",
    color: "text-orange-500",
    gradient: "from-orange-500 to-amber-500",
    emoji: "🔍",
    analyze: analyzeSEO,
  },
];

// ─── Score Badge ─────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
      : score >= 60
        ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
        : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300";

  return (
    <span className={`text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-full ${color}`}>
      {score}分
    </span>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function AIWritingCoach() {
  const { selectedPostId, contentPosts, platform, updateContentPost } = useAppStore();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [applyingSuggestion, setApplyingSuggestion] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const selectedPost = useMemo(
    () => contentPosts.find((p) => p.id === selectedPostId) ?? null,
    [contentPosts, selectedPostId],
  );

  const content = selectedPost?.content || "";
  const topic = selectedPost?.topic || "";
  const isXHS = platform === "xiaohongshu";

  // ── Analyze all categories ──
  const analysisResults = useMemo(() => {
    return COACHING_CATEGORIES.map((cat) => ({
      ...cat,
      ...cat.analyze(content, isXHS ? "xiaohongshu" : "wechat", topic),
    }));
  }, [content, isXHS, topic]);

  // ── Overall coaching score ──
  const overallScore = useMemo(() => {
    if (analysisResults.length === 0) return 0;
    const avg = analysisResults.reduce((s, r) => s + r.score, 0) / analysisResults.length;
    return Math.round(avg);
  }, [analysisResults]);

  // ── Toggle category expansion ──
  const toggleCategory = useCallback((id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── Auto-expand low-scoring categories when content changes ──
  useEffect(() => {
    if (content.length > 10) {
      const lowScoreIds = analysisResults
        .filter((r) => r.score < 70)
        .map((r) => r.id);
      setExpandedCategories(new Set(lowScoreIds));
    }
  }, [content.length, analysisResults]);

  // ── Apply suggestion via AI ──
  const handleApplySuggestion = useCallback(
    async (categoryLabel: string, suggestion: WritingSuggestion) => {
      if (!selectedPost) {
        toast.error("请先选择一条内容");
        return;
      }

      setApplyingSuggestion(suggestion.id);
      try {
        const res = await fetch("/api/ai/optimize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            post: {
              content: selectedPost.content,
              contentType: selectedPost.contentType,
              topic: selectedPost.topic,
              id: selectedPost.id,
            },
            persona: useAppStore.getState().persona,
            knowledgeItems: useAppStore.getState().knowledgeItems,
            platform,
            feedback: `请根据以下写作建议优化内容，只输出优化后的内容，不要加额外说明。\n\n建议类别：${categoryLabel}\n建议内容：${suggestion.text}\n\n原始内容：\n${selectedPost.content || "无内容"}`,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.content) {
            const updated = await fetch(`/api/content/${selectedPost.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ content: data.content }),
            });
            if (updated.ok) {
              const result = await updated.json();
              updateContentPost(selectedPost.id, result);
              toast.success("建议已应用，内容已更新");
            }
          } else {
            toast.error("AI未返回优化结果");
          }
        } else {
          toast.error("应用失败，请重试");
        }
      } catch {
        toast.error("网络错误，请重试");
      } finally {
        setApplyingSuggestion(null);
      }
    },
    [selectedPost, platform, updateContentPost],
  );

  // ── Re-analyze ──
  const handleReAnalyze = useCallback(() => {
    setIsAnalyzing(true);
    setTimeout(() => setIsAnalyzing(false), 600);
    toast.success("写作建议已刷新");
  }, []);

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      {/* Header */}
      <motion.div variants={staggerItem} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold">AI写作教练</span>
          <Badge
            variant="outline"
            className={`text-[9px] h-5 border-0 ${
              overallScore >= 80
                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                : overallScore >= 60
                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                  : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
            }`}
          >
            综合 {overallScore}分
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[10px] text-muted-foreground"
          onClick={handleReAnalyze}
          disabled={isAnalyzing}
        >
          <Sparkles className={`h-3 w-3 mr-1 ${isAnalyzing ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </motion.div>

      {/* No content state */}
      {!content && (
        <motion.div variants={staggerItem}>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Sparkles className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-[11px]">请先选择内容并输入文字</p>
            <p className="text-[10px] mt-1 opacity-60">AI教练将实时分析写作质量</p>
          </div>
        </motion.div>
      )}

      {/* Coaching Categories */}
      {content && (
        <motion.div variants={staggerItem} className="space-y-2">
          {analysisResults.map((result) => {
            const Icon = result.icon;
            const isExpanded = expandedCategories.has(result.id);

            return (
              <Collapsible
                key={result.id}
                open={isExpanded}
                onOpenChange={() => toggleCategory(result.id)}
              >
                <div className="rounded-xl border border-border/60 bg-card/80 overflow-hidden">
                  {/* Category Header */}
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors cursor-pointer">
                      <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${result.gradient} flex items-center justify-center shrink-0`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold">{result.label}</span>
                          <ScoreBadge score={result.score} />
                        </div>
                        <p className="text-[9px] text-muted-foreground mt-0.5">{result.description}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {result.suggestions.length > 0 && (
                          <Badge
                            variant="outline"
                            className={`text-[9px] h-4 px-1 border-0 ${
                              result.suggestions.some((s) => s.priority === "high")
                                ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                                : "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {result.suggestions.length}条建议
                          </Badge>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </div>
                    </button>
                  </CollapsibleTrigger>

                  {/* Expanded Suggestions */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] as const }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-3 space-y-2 border-t border-border/30">
                          {result.suggestions.length > 0 ? (
                            result.suggestions.map((suggestion) => {
                              const priorityColor =
                                suggestion.priority === "high"
                                  ? "border-l-red-400 bg-red-50/50 dark:bg-red-950/10"
                                  : suggestion.priority === "medium"
                                    ? "border-l-amber-400 bg-amber-50/50 dark:bg-amber-950/10"
                                    : "border-l-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/10";

                              const priorityLabel =
                                suggestion.priority === "high"
                                  ? "重要"
                                  : suggestion.priority === "medium"
                                    ? "建议"
                                    : "优化";

                              return (
                                <motion.div
                                  key={suggestion.id}
                                  initial={{ opacity: 0, x: -8 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className={`flex items-start gap-2 p-2 rounded-lg border-l-2 ${priorityColor}`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[10px] text-muted-foreground mb-1">{suggestion.text}</p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2 text-[9px] text-violet-600 dark:text-violet-400 hover:text-violet-700 shrink-0"
                                    onClick={() => handleApplySuggestion(result.label, suggestion)}
                                    disabled={!!applyingSuggestion}
                                  >
                                    {applyingSuggestion === suggestion.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <>
                                        <Wand2 className="h-3 w-3 mr-0.5" />
                                        应用
                                      </>
                                    )}
                                  </Button>
                                </motion.div>
                              );
                            })
                          ) : (
                            <div className="flex items-center gap-2 py-3 text-center">
                              <Check className="h-4 w-4 text-emerald-500" />
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                这项表现很好，暂时没有改进建议 ✨
                              </span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Collapsible>
            );
          })}
        </motion.div>
      )}

      {/* Platform context badge */}
      {content && (
        <motion.div variants={staggerItem}>
          <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
            <Smartphone className="h-3 w-3" />
            <span>
              当前平台：
              {isXHS ? "小红书" : "朋友圈"}
            </span>
            <span>•</span>
            <span>{content.length}字</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
