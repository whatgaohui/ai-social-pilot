"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useAppStore } from "@/store/app-store";
import type { ContentPost } from "@/types";
import {
  Bot,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  Star,
  ImageIcon,
  ArrowUpDown,
  Play,
  Pause,
  RotateCcw,
  Download,
  ShieldCheck,
  Zap,
  Calendar,
  BarChart3,
  ListOrdered,
} from "lucide-react";
import { toast } from "sonner";

// ─── Animation variants ──────────────────────────────────────────────
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const },
  },
};

// ─── Type definitions ────────────────────────────────────────────────

interface BatchResult {
  success: number;
  skipped: number;
  failed: number;
  errors: string[];
}

interface ScoreDistribution {
  excellent: number; // 85+
  good: number;      // 70-84
  average: number;   // 50-69
  poor: number;      // <50
}

interface CoverResult {
  postId: string;
  topic: string;
  imageUrl: string;
}

interface ReorderItem {
  id: string;
  topic: string;
  originalDate: string;
  suggestedDate: string;
}

// ─── Operation Card Component ────────────────────────────────────────

function OperationCard({
  icon: Icon,
  title,
  description,
  color,
  children,
  isOpen,
  onToggle,
  loading,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  loading?: boolean;
}) {
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <Card className="border-0 shadow-sm overflow-hidden">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full h-auto p-3 hover:bg-muted/50 rounded-lg"
            disabled={loading}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2.5">
                <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div className="text-left">
                  <span className="text-sm font-semibold block">{title}</span>
                  <span className="text-[11px] text-muted-foreground">{description}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
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
          <CardContent className="px-3 pb-3 pt-0">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// ─── Mini Bar Chart (Score Distribution) ─────────────────────────────

function ScoreDistributionChart({ distribution, total }: { distribution: ScoreDistribution; total: number }) {
  const bars = [
    { label: "优秀", count: distribution.excellent, color: "bg-emerald-500", textColor: "text-emerald-500" },
    { label: "良好", count: distribution.good, color: "bg-amber-500", textColor: "text-amber-500" },
    { label: "中等", count: distribution.average, color: "bg-orange-500", textColor: "text-orange-500" },
    { label: "待改进", count: distribution.poor, color: "bg-red-500", textColor: "text-red-500" },
  ];

  const maxCount = Math.max(...bars.map((b) => b.count), 1);

  return (
    <div className="space-y-2 mt-3">
      <div className="text-xs font-medium text-muted-foreground">分数分布</div>
      <div className="flex items-end gap-3 h-24">
        {bars.map((bar) => {
          const height = total > 0 ? (bar.count / maxCount) * 100 : 0;
          return (
            <div key={bar.label} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] font-semibold tabular-nums">{bar.count}</span>
              <div className="w-full h-16 bg-muted/50 rounded-sm relative overflow-hidden">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={`absolute bottom-0 left-0 right-0 ${bar.color} rounded-sm`}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{bar.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Cover Grid ──────────────────────────────────────────────────────

function CoverGrid({
  covers,
  onDownload,
}: {
  covers: CoverResult[];
  onDownload: (cover: CoverResult) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 mt-3">
      {covers.map((cover, i) => (
        <motion.div
          key={cover.postId}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
          className="group relative rounded-lg overflow-hidden border border-border/20"
        >
          <img
            src={cover.imageUrl}
            alt={cover.topic}
            className="w-full aspect-[3/4] object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute bottom-0 left-0 right-0 p-2">
              <p className="text-[10px] text-white font-medium line-clamp-2">{cover.topic}</p>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-full mt-1 text-[10px] text-white hover:bg-white/20"
                onClick={() => onDownload(cover)}
              >
                <Download className="h-3 w-3 mr-1" />
                下载
              </Button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Reorder Comparison ──────────────────────────────────────────────

function ReorderComparison({
  items,
  onApply,
  applying,
}: {
  items: ReorderItem[];
  onApply: () => void;
  applying: boolean;
}) {
  return (
    <div className="space-y-3 mt-3">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <ListOrdered className="h-3.5 w-3.5" />
        建议排期调整
      </div>
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {items.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-2 p-2 rounded-md bg-muted/30 text-xs"
          >
            <ArrowUpDown className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="flex-1 truncate font-medium">{item.topic}</span>
            <span className="text-muted-foreground line-through text-[10px]">{item.originalDate}</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[10px]">{item.suggestedDate}</span>
          </motion.div>
        ))}
      </div>
      <Button
        onClick={onApply}
        disabled={applying}
        size="sm"
        className="w-full h-8 text-xs gap-1.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white"
      >
        {applying ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            应用中...
          </>
        ) : (
          <>
            <CheckCircle2 className="h-3 w-3" />
            应用排期
          </>
        )}
      </Button>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function AIBatchOperations() {
  const contentPosts = useAppStore((s) => s.contentPosts);
  const platform = useAppStore((s) => s.platform);
  const updateContentPost = useAppStore((s) => s.updateContentPost);
  const setContentPosts = useAppStore((s) => s.setContentPosts);

  // Panel state
  const [openPanel, setOpenPanel] = useState<string | null>("optimize");

  // Batch optimize state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeProgress, setOptimizeProgress] = useState({ current: 0, total: 0 });
  const [optimizeResult, setOptimizeResult] = useState<BatchResult | null>(null);
  const optimizeAbortRef = useRef(false);

  // Batch score state
  const [scoring, setScoring] = useState(false);
  const [scoreProgress, setScoreProgress] = useState({ current: 0, total: 0 });
  const [scoreDistribution, setScoreDistribution] = useState<ScoreDistribution | null>(null);
  const [lowScoreIds, setLowScoreIds] = useState<Set<string>>(new Set());
  const scoreAbortRef = useRef(false);

  // Batch cover state
  const [generatingCovers, setGeneratingCovers] = useState(false);
  const [coverProgress, setCoverProgress] = useState({ current: 0, total: 0 });
  const [generatedCovers, setGeneratedCovers] = useState<CoverResult[]>([]);
  const coverAbortRef = useRef(false);

  // Smart reorder state
  const [reordering, setReordering] = useState(false);
  const [reorderItems, setReorderItems] = useState<ReorderItem[]>([]);
  const [applyingReorder, setApplyingReorder] = useState(false);

  // Computed: posts that can be optimized (have content)
  const optimizablePosts = useMemo(
    () => contentPosts.filter((p) => p.content && p.content.trim().length > 10),
    [contentPosts],
  );

  // Posts without scores
  const unscoredPosts = useMemo(
    () => contentPosts.filter((p) => !p.aiScore && p.content && p.content.trim().length > 10),
    [contentPosts],
  );

  // Posts without covers
  const postsWithoutCovers = useMemo(
    () => contentPosts.filter((p) => p.content && p.topic && p.contentType),
    [contentPosts],
  );

  // Toggle selection
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(optimizablePosts.map((p) => p.id)));
  }, [optimizablePosts]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // ── Batch Optimize ────────────────────────────────────────────────

  const handleBatchOptimize = useCallback(async () => {
    if (selectedIds.size === 0) {
      toast.warning("请先选择要优化的内容");
      return;
    }

    setOptimizing(true);
    setOptimizeProgress({ current: 0, total: selectedIds.size });
    setOptimizeResult(null);
    optimizeAbortRef.current = false;

    const result: BatchResult = { success: 0, skipped: 0, failed: 0, errors: [] };
    const ids = Array.from(selectedIds);

    for (let i = 0; i < ids.length; i++) {
      if (optimizeAbortRef.current) break;

      const postId = ids[i];
      const post = contentPosts.find((p) => p.id === postId);
      if (!post || !post.content) {
        result.skipped++;
        setOptimizeProgress({ current: i + 1, total: ids.length });
        continue;
      }

      try {
        const res = await fetch("/api/ai/optimize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            post: { content: post.content, contentType: post.contentType, topic: post.topic, id: post.id },
            persona: useAppStore.getState().persona,
            knowledgeItems: useAppStore.getState().knowledgeItems,
            platform,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.content) {
            // Update post content
            updateContentPost(postId, { content: data.content, status: "optimized" });
            result.success++;
          } else {
            result.skipped++;
          }
        } else {
          result.failed++;
          result.errors.push(post.topic || postId);
        }
      } catch {
        result.failed++;
        result.errors.push(post.topic || postId);
      }

      setOptimizeProgress({ current: i + 1, total: ids.length });
    }

    setOptimizeResult(result);
    setOptimizing(false);

    toast.success(`批量优化完成：✅${result.success}条成功，⚠️${result.skipped}条跳过，❌${result.failed}条失败`);
  }, [selectedIds, contentPosts, platform, updateContentPost]);

  // ── Batch Score ───────────────────────────────────────────────────

  const handleBatchScore = useCallback(async () => {
    if (unscoredPosts.length === 0) {
      toast.info("所有内容均已评分");
      return;
    }

    setScoring(true);
    setScoreProgress({ current: 0, total: unscoredPosts.length });
    setScoreDistribution(null);
    setLowScoreIds(new Set());
    scoreAbortRef.current = false;

    const distribution: ScoreDistribution = { excellent: 0, good: 0, average: 0, poor: 0 };
    const lowIds = new Set<string>();
    const postsToScore = [...unscoredPosts];

    for (let i = 0; i < postsToScore.length; i++) {
      if (scoreAbortRef.current) break;

      const post = postsToScore[i];
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
          const score = data.overallScore || 0;
          updateContentPost(post.id, { aiScore: score });

          if (score >= 85) distribution.excellent++;
          else if (score >= 70) distribution.good++;
          else if (score >= 50) distribution.average++;
          else distribution.poor++;

          if (score < 60) lowIds.add(post.id);
        }
      } catch {
        // skip failed
      }

      setScoreProgress({ current: i + 1, total: postsToScore.length });
    }

    setScoreDistribution(distribution);
    setLowScoreIds(lowIds);
    setScoring(false);

    const total = distribution.excellent + distribution.good + distribution.average + distribution.poor;
    toast.success(`批量评分完成：共${total}条内容已评分`);
  }, [unscoredPosts, platform, updateContentPost]);

  // ── Batch Cover ───────────────────────────────────────────────────

  const handleBatchCover = useCallback(async () => {
    if (postsWithoutCovers.length === 0) {
      toast.info("没有需要生成封面的内容");
      return;
    }

    setGeneratingCovers(true);
    setCoverProgress({ current: 0, total: postsWithoutCovers.length });
    setGeneratedCovers([]);
    coverAbortRef.current = false;

    const covers: CoverResult[] = [];
    const postsToProcess = postsWithoutCovers.slice(0, 8); // Limit to 8

    for (let i = 0; i < postsToProcess.length; i++) {
      if (coverAbortRef.current) break;

      const post = postsToProcess[i];
      try {
        const res = await fetch("/api/ai/cover-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `一张精美的${platform === "xiaohongshu" ? "小红书风格" : "社交媒体"}封面图，主题：${post.topic}。${post.content ? `内容概要：${post.content.slice(0, 50)}` : ""}`,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.imageUrl) {
            covers.push({ postId: post.id, topic: post.topic, imageUrl: data.imageUrl });
          }
        }
      } catch {
        // skip failed
      }

      setCoverProgress({ current: i + 1, total: postsToProcess.length });
    }

    setGeneratedCovers(covers);
    setGeneratingCovers(false);

    toast.success(`批量封面生成完成：${covers.length}张`);
  }, [postsWithoutCovers, platform]);

  const handleDownloadCover = useCallback((cover: CoverResult) => {
    const link = document.createElement("a");
    link.href = cover.imageUrl;
    link.download = `cover-${cover.topic.slice(0, 10)}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // ── Smart Reorder ─────────────────────────────────────────────────

  const handleSmartReorder = useCallback(async () => {
    if (contentPosts.length < 2) {
      toast.info("内容太少，无需重排");
      return;
    }

    setReordering(true);
    setReorderItems([]);

    try {
      const weekPosts = contentPosts
        .filter((p) => p.scheduledDate)
        .slice(0, 14);

      if (weekPosts.length < 2) {
        toast.info("本周排期内容不足，无需重排");
        setReordering(false);
        return;
      }

      // Use AI analyze endpoint for smart reordering suggestions
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          posts: weekPosts.map((p) => ({
            id: p.id,
            topic: p.topic,
            contentType: p.contentType,
            scheduledDate: p.scheduledDate,
            aiScore: p.aiScore,
          })),
          action: "reorder",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.suggestions && Array.isArray(data.suggestions)) {
          setReorderItems(
            data.suggestions.map((s: { id: string; topic: string; originalDate: string; suggestedDate: string }) => ({
              id: s.id,
              topic: s.topic,
              originalDate: s.originalDate,
              suggestedDate: s.suggestedDate,
            })),
          );
          toast.success("智能排期建议已生成");
        } else {
          // Generate mock reorder suggestions as fallback
          generateFallbackReorder(weekPosts);
        }
      } else {
        generateFallbackReorder(weekPosts);
      }
    } catch {
      const weekPosts = contentPosts.filter((p) => p.scheduledDate).slice(0, 14);
      generateFallbackReorder(weekPosts);
    } finally {
      setReordering(false);
    }
  }, [contentPosts]);

  const generateFallbackReorder = (posts: typeof contentPosts) => {
    // Sort by aiScore descending, then redistribute dates
    const sorted = [...posts].sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));
    const dates = posts.map((p) => p.scheduledDate).sort();
    const items: ReorderItem[] = sorted.map((p, i) => ({
      id: p.id,
      topic: p.topic,
      originalDate: p.scheduledDate,
      suggestedDate: dates[i] || p.scheduledDate,
    }));
    setReorderItems(items);
    toast.success("智能排期建议已生成（基于评分排序）");
  };

  const handleApplyReorder = useCallback(async () => {
    if (reorderItems.length === 0) return;

    setApplyingReorder(true);
    try {
      const items = reorderItems.map((item, i) => ({
        id: item.id,
        scheduledDate: item.suggestedDate,
        sortOrder: i,
      }));

      const res = await fetch("/api/content/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.posts) {
          // Update local state
          data.posts.forEach((updated: ContentPost) => {
            updateContentPost(updated.id, { scheduledDate: updated.scheduledDate });
          });
        }
        setReorderItems([]);
        toast.success("排期已应用");
      } else {
        toast.error("应用排期失败");
      }
    } catch {
      toast.error("应用排期失败，请重试");
    } finally {
      setApplyingReorder(false);
    }
  }, [reorderItems, updateContentPost]);

  // ── Total operations available ────────────────────────────────────
  const totalOperations = useMemo(() => {
    let count = 0;
    if (optimizablePosts.length > 0) count++;
    if (unscoredPosts.length > 0) count++;
    if (postsWithoutCovers.length > 0) count++;
    if (contentPosts.length >= 2) count++;
    return count;
  }, [optimizablePosts, unscoredPosts, postsWithoutCovers, contentPosts]);

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-2"
    >
      {/* Header */}
      <motion.div variants={staggerItem} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold">AI 批量操作</span>
        </div>
        <Badge variant="secondary" className="text-[10px] h-5 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 border-0">
          {totalOperations} 项可用
        </Badge>
      </motion.div>

      {/* ── Batch Optimize ────────────────────────────────────────── */}
      <motion.div variants={staggerItem}>
        <OperationCard
          icon={Sparkles}
          title="批量优化"
          description={`${optimizablePosts.length}条内容可优化`}
          color="from-violet-500 to-purple-500"
          isOpen={openPanel === "optimize"}
          onToggle={() => setOpenPanel(openPanel === "optimize" ? null : "optimize")}
          loading={optimizing}
        >
          <div className="space-y-3">
            {/* Selection controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] gap-1 px-2"
                  onClick={selectAll}
                  disabled={optimizing}
                >
                  全选
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px] text-muted-foreground px-2"
                  onClick={clearSelection}
                  disabled={optimizing}
                >
                  清除
                </Button>
              </div>
              {selectedIds.size > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5">
                  已选 {selectedIds.size} 条
                </Badge>
              )}
            </div>

            {/* Post list with checkboxes */}
            <div className="max-h-40 overflow-y-auto space-y-1 rounded-md border border-border/20 p-2">
              {optimizablePosts.length === 0 ? (
                <p className="text-[11px] text-muted-foreground text-center py-4">暂无可优化的内容</p>
              ) : (
                optimizablePosts.map((post) => (
                  <label
                    key={post.id}
                    className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedIds.has(post.id)}
                      onCheckedChange={() => toggleSelect(post.id)}
                      disabled={optimizing}
                    />
                    <span className="text-xs truncate flex-1">{post.topic || "未命名"}</span>
                    {post.aiScore > 0 && (
                      <span className={`text-[10px] font-medium ${post.aiScore >= 80 ? "text-emerald-500" : post.aiScore >= 60 ? "text-amber-500" : "text-red-500"}`}>
                        {post.aiScore}分
                      </span>
                    )}
                  </label>
                ))
              )}
            </div>

            {/* Progress */}
            {optimizing && (
              <div className="space-y-2">
                <Progress value={(optimizeProgress.current / optimizeProgress.total) * 100} className="h-2" />
                <p className="text-[11px] text-muted-foreground text-center">
                  正在优化 {optimizeProgress.current}/{optimizeProgress.total}...
                </p>
              </div>
            )}

            {/* Results */}
            {optimizeResult && !optimizing && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 text-xs p-2 rounded-lg bg-muted/40"
              >
                <span className="text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5 inline mr-0.5" />
                  {optimizeResult.success}条成功
                </span>
                {optimizeResult.skipped > 0 && (
                  <span className="text-amber-500">
                    <AlertTriangle className="h-3.5 w-3.5 inline mr-0.5" />
                    {optimizeResult.skipped}条跳过
                  </span>
                )}
                {optimizeResult.failed > 0 && (
                  <span className="text-red-500">
                    <XCircle className="h-3.5 w-3.5 inline mr-0.5" />
                    {optimizeResult.failed}条失败
                  </span>
                )}
              </motion.div>
            )}

            {/* Execute button */}
            <Button
              onClick={handleBatchOptimize}
              disabled={selectedIds.size === 0 || optimizing}
              size="sm"
              className="w-full h-8 text-xs gap-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
            >
              {optimizing ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  优化中 {optimizeProgress.current}/{optimizeProgress.total}
                </>
              ) : (
                <>
                  <Play className="h-3 w-3" />
                  开始优化 ({selectedIds.size}条)
                </>
              )}
            </Button>
          </div>
        </OperationCard>
      </motion.div>

      {/* ── Batch Score ───────────────────────────────────────────── */}
      <motion.div variants={staggerItem}>
        <OperationCard
          icon={Star}
          title="批量打分"
          description={`${unscoredPosts.length}条未评分`}
          color="from-amber-500 to-orange-500"
          isOpen={openPanel === "score"}
          onToggle={() => setOpenPanel(openPanel === "score" ? null : "score")}
          loading={scoring}
        >
          <div className="space-y-3">
            {scoring && (
              <div className="space-y-2">
                <Progress value={(scoreProgress.current / scoreProgress.total) * 100} className="h-2" />
                <p className="text-[11px] text-muted-foreground text-center">
                  正在评分 {scoreProgress.current}/{scoreProgress.total}...
                </p>
              </div>
            )}

            {scoreDistribution && !scoring && (
              <>
                <ScoreDistributionChart
                  distribution={scoreDistribution}
                  total={scoreDistribution.excellent + scoreDistribution.good + scoreDistribution.average + scoreDistribution.poor}
                />
                {lowScoreIds.size > 0 && (
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span className="text-[11px] text-amber-700 dark:text-amber-400">
                      {lowScoreIds.size}条内容评分低于60分，建议优化
                    </span>
                  </div>
                )}
              </>
            )}

            <Button
              onClick={handleBatchScore}
              disabled={unscoredPosts.length === 0 || scoring}
              size="sm"
              className="w-full h-8 text-xs gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
            >
              {scoring ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  评分中 {scoreProgress.current}/{scoreProgress.total}
                </>
              ) : (
                <>
                  <Zap className="h-3 w-3" />
                  一键评分 ({unscoredPosts.length}条)
                </>
              )}
            </Button>
          </div>
        </OperationCard>
      </motion.div>

      {/* ── Batch Cover ───────────────────────────────────────────── */}
      <motion.div variants={staggerItem}>
        <OperationCard
          icon={ImageIcon}
          title="批量生成封面"
          description={`为${postsWithoutCovers.length}条内容生成封面`}
          color="from-emerald-500 to-teal-500"
          isOpen={openPanel === "cover"}
          onToggle={() => setOpenPanel(openPanel === "cover" ? null : "cover")}
          loading={generatingCovers}
        >
          <div className="space-y-3">
            {generatingCovers && (
              <div className="space-y-2">
                <Progress value={(coverProgress.current / coverProgress.total) * 100} className="h-2" />
                <p className="text-[11px] text-muted-foreground text-center">
                  正在生成 {coverProgress.current}/{coverProgress.total}...
                </p>
              </div>
            )}

            {generatedCovers.length > 0 && !generatingCovers && (
              <CoverGrid covers={generatedCovers} onDownload={handleDownloadCover} />
            )}

            <Button
              onClick={handleBatchCover}
              disabled={postsWithoutCovers.length === 0 || generatingCovers}
              size="sm"
              className="w-full h-8 text-xs gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
            >
              {generatingCovers ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  生成中 {coverProgress.current}/{coverProgress.total}
                </>
              ) : (
                <>
                  <ImageIcon className="h-3 w-3" />
                  批量生成封面 (最多8张)
                </>
              )}
            </Button>
          </div>
        </OperationCard>
      </motion.div>

      {/* ── Smart Reorder ─────────────────────────────────────────── */}
      <motion.div variants={staggerItem}>
        <OperationCard
          icon={ArrowUpDown}
          title="智能重排"
          description="AI建议最优发布顺序"
          color="from-cyan-500 to-sky-500"
          isOpen={openPanel === "reorder"}
          onToggle={() => setOpenPanel(openPanel === "reorder" ? null : "reorder")}
          loading={reordering}
        >
          <div className="space-y-3">
            {reordering && (
              <div className="flex items-center justify-center py-4 space-y-2">
                <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
                <p className="text-[11px] text-muted-foreground">AI正在分析内容并生成排期建议...</p>
              </div>
            )}

            {reorderItems.length > 0 && !reordering && (
              <ReorderComparison
                items={reorderItems}
                onApply={handleApplyReorder}
                applying={applyingReorder}
              />
            )}

            <Button
              onClick={handleSmartReorder}
              disabled={contentPosts.length < 2 || reordering}
              size="sm"
              className="w-full h-8 text-xs gap-1.5 bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-700 hover:to-sky-700 text-white"
            >
              {reordering ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  分析中...
                </>
              ) : (
                <>
                  <ArrowUpDown className="h-3 w-3" />
                  生成排期建议
                </>
              )}
            </Button>
          </div>
        </OperationCard>
      </motion.div>
    </motion.div>
  );
}
