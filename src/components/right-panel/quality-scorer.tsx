"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAppStore } from "@/store/app-store";
import type { ContentPost } from "@/types";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  AlertTriangle,
  Award,
  TrendingUp,
  Star,
  Wand2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Copy,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

interface DimensionScore {
  name: string;
  score: number;
  suggestion: string;
}

interface QualityScoreResult {
  overallScore: number;
  dimensions: DimensionScore[];
  strengths: string[];
  improvements: string[];
}

function getScoreColor(score: number): string {
  if (score >= 85) return "text-emerald-500";
  if (score >= 70) return "text-amber-500";
  if (score >= 50) return "text-orange-500";
  return "text-red-500";
}

function getScoreGradient(score: number): string {
  if (score >= 85) return "from-emerald-500 to-teal-400";
  if (score >= 70) return "from-amber-500 to-yellow-400";
  if (score >= 50) return "from-orange-500 to-amber-400";
  return "from-red-500 to-rose-400";
}

function getScoreLabel(score: number): string {
  if (score >= 90) return "优秀";
  if (score >= 80) return "良好";
  if (score >= 70) return "中等";
  if (score >= 60) return "及格";
  return "待改进";
}

function CircularProgress({ score, size = 120, strokeWidth = 8 }: { score: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const gradientId = `score-gradient-${score}-${Math.random().toString(36).slice(2, 6)}`;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop
              offset="0%"
              className={score >= 85
                ? "text-emerald-500"
                : score >= 70
                  ? "text-amber-500"
                  : "text-red-500"
              }
              style={{ stopColor: "currentColor" }}
            />
            <stop
              offset="100%"
              className={score >= 85
                ? "text-teal-400"
                : score >= 70
                  ? "text-yellow-400"
                  : "text-rose-400"
              }
              style={{ stopColor: "currentColor" }}
            />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          stroke={`url(#${gradientId})`}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className={`text-3xl font-bold ${getScoreColor(score)}`}
        >
          {score}
        </motion.span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-[10px] text-muted-foreground mt-0.5"
        >
          {getScoreLabel(score)}
        </motion.span>
      </div>
    </div>
  );
}

function DimensionBar({
  dimension,
  index,
}: {
  dimension: DimensionScore;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.1 + index * 0.08 }}
      className="space-y-1.5"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{dimension.name}</span>
        <span className={`text-xs font-semibold ${getScoreColor(dimension.score)}`}>
          {dimension.score}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${dimension.score}%` }}
          transition={{ duration: 0.6, delay: 0.15 + index * 0.08, ease: "easeOut" }}
          className={`h-full rounded-full bg-gradient-to-r ${getScoreGradient(dimension.score)}`}
        />
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {dimension.suggestion}
      </p>
    </motion.div>
  );
}

// Optimization plan preview with before/after comparison
function OptimizationPreview({
  originalContent,
  optimizedContent,
  scoreBefore,
  onApply,
  onDiscard,
  applying,
}: {
  originalContent: string;
  optimizedContent: string;
  scoreBefore: number;
  onApply: () => void;
  onDiscard: () => void;
  applying: boolean;
}) {
  const { copy } = useCopyToClipboard();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35 }}
      className="space-y-3"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 rounded bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
          <Wand2 className="h-3 w-3 text-white" />
        </div>
        <span className="text-xs font-semibold">优化方案预览</span>
        <Badge variant="outline" className="text-[10px] h-5 border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400">
          原评分 {scoreBefore}分
        </Badge>
      </div>

      {/* Comparison Cards */}
      <div className="grid grid-cols-1 gap-2">
        {/* Before */}
        <div className="rounded-lg border border-border p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] h-5 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400">
                原文
              </Badge>
              <span className="text-[10px] text-muted-foreground">{originalContent.length}字</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
              onClick={() => copy(originalContent)}
            >
              <Copy className="h-2.5 w-2.5" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4 whitespace-pre-wrap">
            {originalContent}
          </p>
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <div className="h-5 w-5 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <ArrowRight className="h-3 w-3 text-violet-500" />
          </div>
        </div>

        {/* After */}
        <div className="rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50/30 dark:bg-violet-950/10 p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Badge className="text-[10px] h-5 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 border-0">
                优化后
              </Badge>
              <span className="text-[10px] text-muted-foreground">{optimizedContent.length}字</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
              onClick={() => copy(optimizedContent)}
            >
              <Copy className="h-2.5 w-2.5" />
            </Button>
          </div>
          <p className="text-xs text-foreground/90 leading-relaxed line-clamp-6 whitespace-pre-wrap">
            {optimizedContent}
          </p>
        </div>
      </div>

      <Separator />

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <Button
          onClick={onApply}
          disabled={applying}
          size="sm"
          className="flex-1 h-9 text-xs gap-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-sm btn-press"
        >
          {applying ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              应用中...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" />
              应用优化方案
            </>
          )}
        </Button>
        <Button
          onClick={onDiscard}
          disabled={applying}
          variant="outline"
          size="sm"
          className="h-9 text-xs gap-1.5 text-muted-foreground hover:text-foreground btn-press"
        >
          <XCircle className="h-3.5 w-3.5" />
          放弃
        </Button>
      </div>
    </motion.div>
  );
}

export function QualityScorer({ post }: { post: ContentPost }) {
  const { platform, updateContentPost } = useAppStore();
  const { copy } = useCopyToClipboard();
  const [isOpen, setIsOpen] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [result, setResult] = useState<QualityScoreResult | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [optimizedContent, setOptimizedContent] = useState<string | null>(null);

  // Track the content that was last scored, so we can detect changes
  const lastScoredContentRef = useRef<string | null>(null);

  // Detect if content has changed since last score
  const contentChanged = result && lastScoredContentRef.current !== post.content;

  const handleScore = async () => {
    if (!post.content) {
      toast.error("请先生成内容后再评分");
      return;
    }

    setScoring(true);
    setResult(null);
    setOptimizedContent(null);
    setIsOpen(true);

    try {
      const res = await fetch("/api/ai/quality-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: post.content,
          topic: post.topic,
          platform,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
        lastScoredContentRef.current = post.content;
        // Auto-save score to post
        updateContentPost(post.id, { aiScore: data.overallScore });
        toast.success(`AI质量评分完成：${data.overallScore}分`);
      } else {
        const errData = await res.json();
        toast.error(errData.error || "评分失败，请重试");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setScoring(false);
    }
  };

  // Generate optimization plan based on improvement suggestions
  const handleGenerateOptimization = async () => {
    if (!result || !post.content) return;

    setOptimizing(true);
    setOptimizedContent(null);

    // Build a focused optimization prompt from score results
    const improvementsText = result.improvements.join("\n- ");
    const weakDimensions = result.dimensions
      .filter((d) => d.score < 70)
      .map((d) => `${d.name}（${d.score}分）：${d.suggestion}`)
      .join("\n");

    try {
      const res = await fetch("/api/ai/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post: { content: post.content, contentType: post.contentType, topic: post.topic },
          persona: useAppStore.getState().persona,
          feedback: `请根据以下AI评分的改进建议，进行针对性优化改写（不要重复输出原文）：

评分结果：${result.overallScore}分
改进建议：
- ${improvementsText}

${weakDimensions ? `需重点改进的维度：\n${weakDimensions}` : ""}

要求：
1. 针对每条改进建议进行实质性修改
2. 保留原文核心信息和风格
3. 直接输出优化后的完整文案，不要解释修改了什么`,
          knowledgeItems: useAppStore.getState().knowledgeItems,
          platform,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.content) {
          setOptimizedContent(data.content);
          toast.success("优化方案已生成，请预览后决定是否应用");
        } else {
          toast.error("AI返回内容为空，请重试");
        }
      } else {
        const errData = await res.json();
        toast.error(errData.error || "生成优化方案失败，请重试");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setOptimizing(false);
    }
  };

  // Apply the optimized content
  const handleApplyOptimization = async () => {
    if (!optimizedContent || !result) return;

    setApplying(true);

    try {
      // 1. Save version record for the optimized content
      try {
        await fetch(`/api/content/${post.id}/versions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: optimizedContent,
            changeType: "optimize",
            summary: `AI评分优化（原${result.overallScore}分）`,
            aiScore: 0,
          }),
        });
      } catch (e) {
        console.error("Failed to save version:", e);
      }

      // 2. Update content in database
      const updateRes = await fetch(`/api/content/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: optimizedContent,
          status: "optimized",
        }),
      });

      if (updateRes.ok) {
        const updated = await updateRes.json();
        updateContentPost(post.id, updated);
        // Clear optimization preview
        setOptimizedContent(null);
        // Clear scoring result since content changed
        setResult(null);
        lastScoredContentRef.current = null;
        toast.success("优化方案已应用");
      } else {
        toast.error("应用优化方案失败，请重试");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setApplying(false);
    }
  };

  // Discard the optimization preview
  const handleDiscardOptimization = () => {
    setOptimizedContent(null);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-0 shadow-sm">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full h-auto p-4 hover:bg-muted/50 rounded-lg"
            onClick={(e) => {
              // First click: auto-trigger scoring (when no result yet and not already scoring)
              if (!isOpen && !result && !scoring && !optimizedContent) {
                e.preventDefault();
                handleScore();
              }
            }}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <Star className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-semibold">AI质量评分</span>
                {result && !optimizedContent && (
                  <span className={`text-xs font-bold ${getScoreColor(result.overallScore)}`}>
                    {result.overallScore}分
                    {contentChanged && (
                      <span className="text-amber-500 ml-1 text-[10px] font-normal">（内容已变更）</span>
                    )}
                  </span>
                )}
                {optimizedContent && (
                  <Badge variant="outline" className="text-[10px] h-5 border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20">
                    <Wand2 className="h-2.5 w-2.5 mr-0.5" />
                    待确认
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {scoring && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                {optimizing && <Loader2 className="h-4 w-4 animate-spin text-violet-500" />}
                {contentChanged && !scoring && !optimizedContent && (
                  <RefreshCw className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
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
            {/* Loading State - Scoring */}
            {scoring && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-8 space-y-3"
              >
                <div className="relative">
                  <Loader2 className="h-10 w-10 animate-spin text-primary/60" />
                  <Sparkles className="h-5 w-5 text-amber-500 absolute -top-1 -right-1" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">AI正在分析内容质量...</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    多维度评分中，请稍候
                  </p>
                </div>
              </motion.div>
            )}

            {/* Loading State - Generating Optimization */}
            {!scoring && optimizing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-8 space-y-3"
              >
                <div className="relative">
                  <Loader2 className="h-10 w-10 animate-spin text-violet-500/60" />
                  <Wand2 className="h-5 w-5 text-violet-500 absolute -top-1 -right-1" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">AI正在生成优化方案...</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    根据改进建议针对性改写中
                  </p>
                </div>
              </motion.div>
            )}

            {/* Score Result */}
            <AnimatePresence>
              {!scoring && !optimizing && result && !optimizedContent && (
                <motion.div
                  key="score-result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-4"
                >
                  {/* Overall Score Card */}
                  <div className="flex flex-col items-center py-2 bg-gradient-to-b from-amber-50/50 to-transparent dark:from-amber-950/10 dark:to-transparent rounded-xl">
                    <CircularProgress score={result.overallScore} />
                    <div className="flex items-center gap-1.5 mt-3">
                      <Award className="h-4 w-4 text-amber-500" />
                      <span className="text-xs font-medium text-muted-foreground">
                        综合质量评分
                      </span>
                    </div>
                  </div>

                  {/* Dimension Scores */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold">维度评分</span>
                    </div>
                    {result.dimensions.map((dim, index) => (
                      <DimensionBar key={dim.name} dimension={dim} index={index} />
                    ))}
                  </div>

                  {/* Strengths & Improvements */}
                  <div className="grid grid-cols-1 gap-3">
                    {/* Strengths */}
                    <div className="bg-emerald-50/60 dark:bg-emerald-950/20 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Check className="h-4 w-4 text-emerald-500" />
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          优点
                        </span>
                      </div>
                      <ul className="space-y-1.5">
                        {result.strengths.map((s, i) => (
                          <motion.li
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.6 + i * 0.1 }}
                            className="flex items-start gap-2 text-xs text-emerald-700/80 dark:text-emerald-400/80"
                          >
                            <Check className="h-3 w-3 mt-0.5 shrink-0 text-emerald-500" />
                            <span>{s}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </div>

                    {/* Improvements */}
                    <div className="bg-amber-50/60 dark:bg-amber-950/20 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                          改进建议
                        </span>
                      </div>
                      <ul className="space-y-1.5">
                        {result.improvements.map((imp, i) => (
                          <motion.li
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.8 + i * 0.1 }}
                            className="flex items-start gap-2 text-xs text-amber-700/80 dark:text-amber-400/80"
                          >
                            <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0 text-amber-500" />
                            <span>{imp}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    {/* Generate Optimization Plan - main action */}
                    <Button
                      onClick={handleGenerateOptimization}
                      disabled={result.improvements.length === 0}
                      size="sm"
                      className="w-full h-9 text-xs gap-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-sm btn-press"
                    >
                      <Wand2 className="h-3.5 w-3.5" />
                      根据改进建议生成优化方案
                    </Button>

                    {/* Re-score button */}
                    <Button
                      onClick={handleScore}
                      variant="ghost"
                      size="sm"
                      className="w-full h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                    >
                      <RefreshCw className="h-3 w-3" />
                      重新评分
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Optimization Preview */}
            <AnimatePresence>
              {!scoring && !optimizing && optimizedContent && result && (
                <OptimizationPreview
                  originalContent={post.content}
                  optimizedContent={optimizedContent}
                  scoreBefore={result.overallScore}
                  onApply={handleApplyOptimization}
                  onDiscard={handleDiscardOptimization}
                  applying={applying}
                />
              )}
            </AnimatePresence>

            {/* Empty State - Re-score */}
            {!scoring && !optimizing && !result && !optimizedContent && isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-6 space-y-3"
              >
                <Sparkles className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">点击下方按钮开始评分</p>
                <Button
                  onClick={handleScore}
                  size="sm"
                  className="h-8 text-xs gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white btn-press"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  开始AI评分
                </Button>
              </motion.div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
