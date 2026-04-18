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
} from "lucide-react";
import { toast } from "sonner";

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
  const gradientId = `score-gradient-${score}`;

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
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        {/* Progress circle */}
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

export function QualityScorer({ post }: { post: ContentPost }) {
  const { platform, updateContentPost } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [result, setResult] = useState<QualityScoreResult | null>(null);

  const handleScore = async () => {
    if (!post.content) {
      toast.error("请先生成内容后再评分");
      return;
    }

    setScoring(true);
    setResult(null);
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
        toast.success("AI质量评分完成");
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

  const handleApplyScore = () => {
    if (!result) return;
    updateContentPost(post.id, { aiScore: result.overallScore });
    toast.success(`已应用评分：${result.overallScore}分`);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-0 shadow-sm">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full h-auto p-4 hover:bg-muted/50 rounded-lg"
            onClick={(e) => {
              if (!isOpen && !result && !scoring) {
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
                {result && (
                  <span className={`text-xs font-bold ${getScoreColor(result.overallScore)}`}>
                    {result.overallScore}分
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {scoring && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
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

            {/* Score Result */}
            <AnimatePresence>
              {!scoring && result && (
                <motion.div
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

                  {/* Apply Score Button */}
                  <Button
                    onClick={handleApplyScore}
                    size="sm"
                    className="w-full h-9 text-xs gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    应用评分
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty State - Re-score */}
            {!scoring && !result && isOpen && (
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
                  className="h-8 text-xs gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
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
