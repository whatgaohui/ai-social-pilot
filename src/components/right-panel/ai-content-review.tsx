"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  Loader2,
  RefreshCw,
  Target,
  Heart,
  BookOpen,
  Share2,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/store/app-store";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────────

interface DimensionScore {
  score: number;
  analysis: string;
  suggestions: string[];
}

interface ReviewResult {
  overallScore: number;
  dimensions: {
    structure: DimensionScore;
    emotion: DimensionScore;
    platform: DimensionScore;
    readability: DimensionScore;
    engagement: DimensionScore;
  };
  strengths: string[];
  improvements: string[];
  rewriteSuggestion: string;
}

// ── Dimension config ───────────────────────────────────────────────────────

interface DimensionConfig {
  key: string;
  label: string;
  icon: React.ElementType;
  color: string;
  gradient: string;
  barFrom: string;
  barTo: string;
}

const DIMENSIONS: DimensionConfig[] = [
  { key: "structure", label: "内容结构", icon: Target, color: "text-violet-500", gradient: "from-violet-500 to-purple-600", barFrom: "#8b5cf6", barTo: "#a78bfa" },
  { key: "emotion", label: "情感共鸣", icon: Heart, color: "text-rose-500", gradient: "from-rose-500 to-pink-600", barFrom: "#f43f5e", barTo: "#fb7185" },
  { key: "platform", label: "平台优化", icon: Share2, color: "text-emerald-500", gradient: "from-emerald-500 to-teal-600", barFrom: "#10b981", barTo: "#34d399" },
  { key: "readability", label: "可读性", icon: BookOpen, color: "text-amber-500", gradient: "from-amber-500 to-orange-600", barFrom: "#f59e0b", barTo: "#fbbf24" },
  { key: "engagement", label: "互动潜力", icon: TrendingUp, color: "text-cyan-500", gradient: "from-cyan-500 to-blue-600", barFrom: "#06b6d4", barTo: "#22d3ee" },
];

// ── Animation variants ─────────────────────────────────────────────────────

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } },
};

// ── Score Ring SVG Component ───────────────────────────────────────────────

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const center = size / 2;

  const getScoreColor = (s: number) => {
    if (s >= 80) return { stroke: "url(#scoreGradientHigh)", text: "text-emerald-500" };
    if (s >= 60) return { stroke: "url(#scoreGradientMid)", text: "text-amber-500" };
    return { stroke: "url(#scoreGradientLow)", text: "text-rose-500" };
  };

  const colors = getScoreColor(score);

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="score-ring-glow -rotate-90">
        <defs>
          <linearGradient id="scoreGradientHigh" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
          <linearGradient id="scoreGradientMid" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
          <linearGradient id="scoreGradientLow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#fb7185" />
          </linearGradient>
        </defs>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className={`text-3xl font-bold tabular-nums ${colors.text}`}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          {score}
        </motion.span>
        <span className="text-[10px] text-muted-foreground mt-0.5">综合评分</span>
      </div>
    </div>
  );
}

// ── Dimension Card Component ───────────────────────────────────────────────

function DimensionCard({
  config,
  data,
  defaultOpen = false,
}: {
  config: DimensionConfig;
  data: DimensionScore;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const Icon = config.icon;

  return (
    <div className="review-card-border rounded-xl bg-card overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2.5 py-2.5 px-3 hover:bg-muted/30 transition-colors"
      >
        <div className={`h-6 w-6 rounded-md bg-gradient-to-br ${config.gradient} flex items-center justify-center shrink-0`}>
          <Icon className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-xs font-semibold flex-1 text-left">{config.label}</span>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold tabular-nums ${config.color}`}>{data.score}</span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </motion.div>
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                <motion.div
                  className="h-full rounded-full dimension-bar"
                  style={{ "--bar-from": config.barFrom, "--bar-to": config.barTo } as React.CSSProperties}
                  initial={{ width: "0%" }}
                  animate={{ width: `${data.score}%` }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{data.analysis}</p>
              {data.suggestions.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">优化建议</span>
                  {data.suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className="text-[9px] text-muted-foreground mt-1 shrink-0">•</span>
                      <span className="text-[11px] text-foreground/80">{s}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export function AIContentReview() {
  const selectedPostId = useAppStore((s) => s.selectedPostId);
  const contentPosts = useAppStore((s) => s.contentPosts);
  const platform = useAppStore((s) => s.platform);
  const persona = useAppStore((s) => s.persona);
  const updateContentPost = useAppStore((s) => s.updateContentPost);

  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [expandedDimensions, setExpandedDimensions] = useState<Record<string, boolean>>({});

  const selectedPost = contentPosts.find((p) => p.id === selectedPostId) ?? null;
  const platformLabel = platform === "wechat" ? "朋友圈" : "小红书";

  const parseAIResponse = (text: string): ReviewResult | null => {
    let cleaned = text.trim();
    const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      cleaned = jsonMatch[1].trim();
    }
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
    }
    try {
      const parsed = JSON.parse(cleaned) as ReviewResult;
      if (typeof parsed.overallScore === "number" && parsed.dimensions) {
        return parsed;
      }
    } catch {
      // Try fixing common AI response issues
      try {
        const fixed = cleaned.replace(/(\w+)\s*:/g, '"$1":').replace(/'/g, '"');
        const parsed = JSON.parse(fixed) as ReviewResult;
        if (typeof parsed.overallScore === "number" && parsed.dimensions) {
          return parsed;
        }
      } catch {
        return null;
      }
    }
    return null;
  };

  const handleReview = useCallback(async () => {
    if (!selectedPost?.content) {
      toast.error("请先输入内容再进行AI评审");
      return;
    }

    setLoading(true);
    setReview(null);

    const prompt = `请对以下${platformLabel}内容进行全面评审分析。以JSON格式返回：
{{
  "overallScore": 85,
  "dimensions": {{
    "structure": {{ "score": 80, "analysis": "对开篇吸引力、叙事节奏和结尾力量的详细分析...", "suggestions": ["建议1", "建议2"] }},
    "emotion": {{ "score": 75, "analysis": "对情感诉求、共情触发点和共鸣性的分析...", "suggestions": ["建议1", "建议2"] }},
    "platform": {{ "score": 90, "analysis": "对平台适配性、话题标签效果和CTA强度的分析...", "suggestions": ["建议1", "建议2"] }},
    "readability": {{ "score": 85, "analysis": "对句子长度、词汇多样性和段落节奏的分析...", "suggestions": ["建议1", "建议2"] }},
    "engagement": {{ "score": 88, "analysis": "对预估互动潜力、传播系数和分享性的分析...", "suggestions": ["建议1", "建议2"] }}
  }},
  "strengths": ["亮点1", "亮点2", "亮点3"],
  "improvements": ["改进建议1", "改进建议2", "改进建议3"],
  "rewriteSuggestion": "基于最佳改进建议的改写版本..."
}}

待评审内容：
---
${selectedPost.content}
---

${persona ? `人设信息：${persona.name}，${persona.title}，风格：${persona.style}` : ""}`;

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "content-review", prompt }),
      });
      if (!res.ok) throw new Error("AI评审请求失败");
      const data = await res.json();
      const text = data.content || data.text || data.result || "";
      const result = parseAIResponse(text);
      if (result) {
        setReview(result);
        toast.success("AI评审完成", { description: `综合评分 ${result.overallScore} 分` });
      } else {
        toast.error("解析AI评审结果失败，请重试");
      }
    } catch (err) {
      toast.error("AI评审失败", { description: err instanceof Error ? err.message : "请稍后重试" });
    } finally {
      setLoading(false);
    }
  }, [selectedPost, platformLabel, persona]);

  const handleApplySuggestion = useCallback(async () => {
    if (!review?.rewriteSuggestion || !selectedPost) return;
    try {
      const res = await fetch(`/api/content/${selectedPost.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: review.rewriteSuggestion }),
      });
      if (res.ok) {
        const updated = await res.json();
        updateContentPost(selectedPost.id, updated);
        toast.success("已应用AI改写建议");
      }
    } catch {
      toast.error("应用改写建议失败");
    }
  }, [review, selectedPost, updateContentPost]);

  const toggleDimension = (key: string) => {
    setExpandedDimensions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return { text: "优秀", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" };
    if (score >= 75) return { text: "良好", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" };
    if (score >= 60) return { text: "一般", color: "text-orange-500 bg-orange-500/10 border-orange-500/20" };
    return { text: "待改进", color: "text-rose-500 bg-rose-500/10 border-rose-500/20" };
  };

  if (!selectedPost) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Shield className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-xs text-muted-foreground">请先选择一篇内容进行AI评审</p>
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-3"
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <motion.div variants={staggerItem} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">AI内容评审</h3>
            <p className="text-[10px] text-muted-foreground">多维度深度分析，获取优化建议</p>
          </div>
        </div>
        <Button
          size="sm"
          className="h-7 gap-1.5 text-xs bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-md shadow-violet-500/20"
          onClick={handleReview}
          disabled={loading || !selectedPost.content}
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : review ? (
            <RefreshCw className="h-3 w-3" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          {loading ? "评审中..." : review ? "重新评审" : "开始评审"}
        </Button>
      </motion.div>

      {/* ── Loading skeleton ────────────────────────────────────── */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-center py-6">
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-violet-500" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-violet-400" />
                </div>
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-violet-500">AI正在深度分析内容...</p>
              <p className="text-[10px] text-muted-foreground mt-1">正在评估内容结构、情感共鸣、平台优化等维度</p>
            </div>
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-12 rounded-xl bg-muted/40 animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Review Results ──────────────────────────────────────── */}
      <AnimatePresence>
        {review && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            variants={staggerContainer}
            className="space-y-3"
          >
            {/* ── Overall Score ─────────────────────────────────── */}
            <motion.div variants={staggerItem}>
              <Card className="p-4 dna-shimmer">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">综合评审</span>
                        <Badge variant="outline" className={getScoreLabel(review.overallScore).color}>
                          {getScoreLabel(review.overallScore).text}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground max-w-[160px] leading-relaxed">
                        基于5个维度对内容质量进行全面评估
                      </p>
                    </div>
                    <ScoreRing score={review.overallScore} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* ── Dimension Cards ────────────────────────────────── */}
            <motion.div variants={staggerItem} className="space-y-1.5">
              {DIMENSIONS.map((dim) => {
                const dimData = review.dimensions[dim.key as keyof typeof review.dimensions];
                if (!dimData) return null;
                return (
                  <DimensionCard
                    key={dim.key}
                    config={dim}
                    data={dimData}
                    defaultOpen={expandedDimensions[dim.key] ?? false}
                  />
                );
              })}
            </motion.div>

            {/* ── Strengths ─────────────────────────────────────── */}
            {review.strengths.length > 0 && (
              <motion.div variants={staggerItem}>
                <Card className="border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/30 dark:bg-emerald-950/10">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">内容亮点</span>
                      <Badge variant="secondary" className="ml-auto text-[9px] h-4 px-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        {review.strengths.length}项
                      </Badge>
                    </div>
                    <div className="space-y-1.5">
                      {review.strengths.map((s, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 1.0 + i * 0.1 }}
                          className="flex items-start gap-1.5 suggestion-card-hover rounded-lg p-1.5 cursor-default"
                        >
                          <CheckCircle className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
                          <span className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">{s}</span>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ── Improvement Suggestions ────────────────────────── */}
            {review.improvements.length > 0 && (
              <motion.div variants={staggerItem}>
                <Card className="border-amber-200/60 dark:border-amber-800/40 bg-amber-50/30 dark:bg-amber-950/10">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">优化建议</span>
                      <Badge variant="secondary" className="ml-auto text-[9px] h-4 px-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        {review.improvements.length}项
                      </Badge>
                    </div>
                    <div className="space-y-1.5">
                      {review.improvements.map((s, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 1.3 + i * 0.1 }}
                          className="flex items-start gap-1.5 suggestion-card-hover rounded-lg p-1.5 cursor-default"
                        >
                          <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                          <span className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">{s}</span>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ── One-click Apply ────────────────────────────────── */}
            {review.rewriteSuggestion && (
              <motion.div variants={staggerItem}>
                <Card className="border-violet-200/60 dark:border-violet-800/40 bg-violet-50/30 dark:bg-violet-950/10">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Sparkles className="h-4 w-4 text-violet-500" />
                      <span className="text-xs font-semibold text-violet-700 dark:text-violet-400">AI优化改写</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mb-2 line-clamp-3">
                      {review.rewriteSuggestion}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-7 text-xs border-violet-300/60 dark:border-violet-700/40 text-violet-600 dark:text-violet-400 hover:bg-violet-100/50 dark:hover:bg-violet-900/30 gap-1.5"
                      onClick={handleApplySuggestion}
                    >
                      <Sparkles className="h-3 w-3" />
                      一键应用改写
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Empty state ─────────────────────────────────────────── */}
      {!review && !loading && (
        <motion.div
          variants={staggerItem}
          className="text-center py-8"
        >
          <div className="relative inline-block mb-3">
            <Shield className="h-12 w-12 text-muted-foreground/30" />
            <Sparkles className="h-4 w-4 text-violet-400 absolute -top-1 -right-1" />
          </div>
          <p className="text-xs text-muted-foreground mb-1">AI深度内容评审</p>
          <p className="text-[10px] text-muted-foreground/70 max-w-[200px] mx-auto">
            从内容结构、情感共鸣、平台优化等5个维度全面评估内容质量
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
