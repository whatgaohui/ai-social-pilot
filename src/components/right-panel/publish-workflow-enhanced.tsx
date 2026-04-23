"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import type { ContentPost } from "@/types";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  PenLine,
  Sparkles,
  ClipboardCheck,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Zap,
  Filter,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkflowStep {
  key: WorkflowStage;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  activeBg: string;
  borderActive: string;
  batchAction: string;
}

type WorkflowStage =
  | "draft"
  | "ai_optimize"
  | "quality_review"
  | "scheduled"
  | "published";

const WORKFLOW_STAGES: WorkflowStage[] = [
  "draft",
  "ai_optimize",
  "quality_review",
  "scheduled",
  "published",
];

const STEP_CONFIGS: WorkflowStep[] = [
  {
    key: "draft",
    label: "内容创作",
    description: "草稿和新创作的内容",
    icon: PenLine,
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-100 dark:bg-violet-900/30",
    activeBg: "bg-violet-50 dark:bg-violet-950/20",
    borderActive: "border-violet-300 dark:border-violet-700",
    batchAction: "批量生成",
  },
  {
    key: "ai_optimize",
    label: "AI优化",
    description: "等待AI优化处理",
    icon: Sparkles,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    activeBg: "bg-amber-50 dark:bg-amber-950/20",
    borderActive: "border-amber-300 dark:border-amber-700",
    batchAction: "全部优化",
  },
  {
    key: "quality_review",
    label: "质量审核",
    description: "已优化待审核内容",
    icon: ClipboardCheck,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    activeBg: "bg-emerald-50 dark:bg-emerald-950/20",
    borderActive: "border-emerald-300 dark:border-emerald-700",
    batchAction: "批量通过",
  },
  {
    key: "scheduled",
    label: "排期安排",
    description: "已审核等待发布",
    icon: CalendarClock,
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
    activeBg: "bg-cyan-50 dark:bg-cyan-950/20",
    borderActive: "border-cyan-300 dark:border-cyan-700",
    batchAction: "立即发布",
  },
  {
    key: "published",
    label: "发布完成",
    description: "已成功发布的内容",
    icon: CheckCircle2,
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-100 dark:bg-rose-900/30",
    activeBg: "bg-rose-50 dark:bg-rose-950/20",
    borderActive: "border-rose-300 dark:border-rose-700",
    batchAction: "查看数据",
  },
];

function classifyPost(post: ContentPost): WorkflowStage {
  if (post.status === "published") return "published";
  if (post.status === "scheduled") return "scheduled";
  if (post.aiScore >= 70 && post.content && post.content.length > 20) return "quality_review";
  if (post.content && post.content.length > 10 && post.aiScore > 0) return "ai_optimize";
  return "draft";
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function PublishWorkflowEnhanced() {
  const contentPosts = useAppStore((s) => s.contentPosts);
  const setSelectedPostId = useAppStore((s) => s.setSelectedPostId);
  const setRightPanelTab = useAppStore((s) => s.setRightPanelTab);

  const [activeStage, setActiveStage] = useState<WorkflowStage | null>(null);
  const [batchLoading, setBatchLoading] = useState<WorkflowStage | null>(null);

  // ── Count posts per stage ─────────────────────────────────────────────
  const stageCounts = useMemo(() => {
    const counts: Record<WorkflowStage, number> = {
      draft: 0,
      ai_optimize: 0,
      quality_review: 0,
      scheduled: 0,
      published: 0,
    };
    contentPosts.forEach((p) => {
      const stage = classifyPost(p);
      counts[stage]++;
    });
    return counts;
  }, [contentPosts]);

  // ── Filtered posts ────────────────────────────────────────────────────
  const filteredPosts = useMemo(() => {
    if (!activeStage) return [];
    return contentPosts.filter((p) => classifyPost(p) === activeStage);
  }, [contentPosts, activeStage]);

  // ── Completion rate ───────────────────────────────────────────────────
  const totalPosts = contentPosts.length;
  const publishedCount = stageCounts.published;
  const completionRate =
    totalPosts > 0 ? Math.round((publishedCount / totalPosts) * 100) : 0;

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleStepClick = useCallback(
    (stage: WorkflowStage) => {
      setActiveStage((prev) => (prev === stage ? null : stage));
    },
    []
  );

  const handleBatchAction = useCallback(
    async (stage: WorkflowStage) => {
      setBatchLoading(stage);
      const posts = contentPosts.filter((p) => classifyPost(p) === stage);

      try {
        if (stage === "ai_optimize") {
          toast.info(`正在优化 ${posts.length} 条内容...`);
          await new Promise((r) => setTimeout(r, 1500));
          toast.success(`已完成 ${Math.min(posts.length, 3)} 条内容优化`);
        } else if (stage === "quality_review") {
          toast.info(`正在批量审核 ${posts.length} 条内容...`);
          await new Promise((r) => setTimeout(r, 1200));
          toast.success(`已通过 ${posts.length} 条内容审核`);
        } else if (stage === "scheduled") {
          toast.info(`正在发布 ${posts.length} 条排期内容...`);
          await new Promise((r) => setTimeout(r, 1000));
          toast.success(`已发布 ${Math.min(posts.length, 2)} 条内容`);
        } else if (stage === "draft") {
          toast.info("AI正在批量生成内容...");
          await new Promise((r) => setTimeout(r, 2000));
          toast.success("内容生成完成");
        } else if (stage === "published") {
          setRightPanelTab("data");
          toast.info("切换到数据分析面板");
        }
      } catch {
        toast.error("操作失败，请重试");
      } finally {
        setBatchLoading(null);
      }
    },
    [contentPosts, setRightPanelTab]
  );

  const handlePostClick = useCallback(
    (postId: string) => {
      setSelectedPostId(postId);
      setRightPanelTab("workspace");
    },
    [setSelectedPostId, setRightPanelTab]
  );

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4 p-4">
        {/* ─── Header ─── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500/15 to-emerald-500/15 flex items-center justify-center">
              <ArrowRight className="h-4.5 w-4.5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">发布工作流</h2>
              <p className="text-[10px] text-muted-foreground">
                内容全生命周期管理
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
          >
            完成率 {completionRate}%
          </Badge>
        </div>

        {/* ─── Stepper ─── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardContent className="p-4">
              {/* Progress bar */}
              <div className="relative mb-5">
                <div className="h-1 bg-muted/50 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 via-emerald-500 to-rose-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${completionRate}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Steps */}
              <div className="relative">
                {STEP_CONFIGS.map((step, idx) => {
                  const Icon = step.icon;
                  const count = stageCounts[step.key];
                  const isActive = activeStage === step.key;
                  const isFirst = idx === 0;
                  const isLast = idx === STEP_CONFIGS.length - 1;

                  return (
                    <div key={step.key} className="relative">
                      {/* Step row */}
                      <motion.button
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer group text-left ${
                          isActive
                            ? `${step.activeBg} ${step.borderActive} border`
                            : "border-transparent hover:bg-muted/30"
                        }`}
                        onClick={() => handleStepClick(step.key)}
                        whileTap={{ scale: 0.98 }}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 + idx * 0.06 }}
                      >
                        {/* Step number + icon */}
                        <div className="relative flex-shrink-0">
                          <div
                            className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all ${
                              isActive
                                ? `${step.bgColor} shadow-sm`
                                : "bg-muted/50"
                            }`}
                          >
                            <Icon
                              className={`h-4 w-4 ${isActive ? step.color : "text-muted-foreground"}`}
                            />
                          </div>
                          {/* Connector line */}
                          {!isLast && (
                            <div className="absolute top-1/2 left-full w-3 -translate-y-1/2 ml-1 hidden lg:block">
                              <div
                                className={`w-3 h-0.5 ${
                                  idx < STEP_CONFIGS.length - 1
                                    ? "bg-muted/30"
                                    : ""
                                }`}
                              />
                            </div>
                          )}
                          {/* Count badge */}
                          <AnimatePresence>
                            {count > 0 && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className={`absolute -top-1.5 -right-1.5 h-4.5 min-w-[18px] px-1 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                  isActive
                                    ? `${step.bgColor} ${step.color}`
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {count}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Step info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-xs font-semibold ${
                                isActive ? "text-foreground" : "text-muted-foreground"
                              }`}
                            >
                              {step.label}
                            </span>
                            {isFirst && (
                              <span className="text-[8px] text-muted-foreground">
                                STEP {idx + 1}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {step.description}
                          </p>
                        </div>

                        {/* Right side */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {/* Batch action button */}
                          {count > 0 && step.key !== "published" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className={`h-7 px-2 text-[10px] ${step.color} hover:${step.bgColor} opacity-0 group-hover:opacity-100 transition-opacity`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBatchAction(step.key);
                              }}
                              disabled={batchLoading === step.key}
                            >
                              {batchLoading === step.key ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-0.5" />
                              ) : (
                                <Zap className="h-3 w-3 mr-0.5" />
                              )}
                              {step.batchAction}
                            </Button>
                          )}

                          {/* Expand indicator */}
                          <motion.div
                            animate={{ rotate: isActive ? 90 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronRight
                              className={`h-4 w-4 transition-colors ${
                                isActive
                                  ? step.color
                                  : "text-muted-foreground/30"
                              }`}
                            />
                          </motion.div>
                        </div>
                      </motion.button>

                      {/* Expanded content list */}
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <div className="ml-12 mr-2 mb-2">
                              <ScrollArea className="max-h-48">
                                {filteredPosts.length === 0 ? (
                                  <div className="py-4 text-center text-[11px] text-muted-foreground">
                                    暂无内容
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    {filteredPosts.slice(0, 20).map((post, pi) => (
                                      <motion.div
                                        key={post.id}
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: pi * 0.03 }}
                                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/30 cursor-pointer transition-colors group/item"
                                        onClick={() => handlePostClick(post.id)}
                                      >
                                        <div className="flex-1 min-w-0">
                                          <p className="text-[11px] font-medium truncate">
                                            {post.topic || "未命名"}
                                          </p>
                                          <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[9px] text-muted-foreground">
                                              {post.contentType}
                                            </span>
                                            {post.aiScore > 0 && (
                                              <span
                                                className={`text-[9px] font-medium ${
                                                  post.aiScore >= 70
                                                    ? "text-emerald-500"
                                                    : "text-amber-500"
                                                }`}
                                              >
                                                AI {post.aiScore}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <ChevronRight className="h-3 w-3 text-muted-foreground/30 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                      </motion.div>
                                    ))}
                                  </div>
                                )}
                              </ScrollArea>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ─── Summary Stats ─── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] font-medium text-muted-foreground">
                  各阶段分布
                </span>
              </div>
              <div className="flex items-center gap-1">
                {STEP_CONFIGS.map((step, idx) => {
                  const count = stageCounts[step.key];
                  const pct =
                    totalPosts > 0 ? (count / totalPosts) * 100 : 0;

                  return (
                    <Tooltip key={step.key}>
                      <TooltipTrigger asChild>
                        <motion.button
                          className="flex-1 flex flex-col items-center gap-1 p-1.5 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => handleStepClick(step.key)}
                          whileHover={{ y: -1 }}
                        >
                          <div
                            className="w-full h-8 rounded-md transition-all"
                            style={{
                              minHeight: `${Math.max(8, pct * 0.32)}px`,
                              backgroundColor: STEP_CONFIGS[idx]
                                ? getBarColor(step.key, idx)
                                : undefined,
                              opacity: pct > 0 ? 1 : 0.15,
                            }}
                          />
                          <span className="text-[9px] text-muted-foreground tabular-nums">
                            {count}
                          </span>
                          <span className="text-[7px] text-muted-foreground">
                            {step.label}
                          </span>
                        </motion.button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        className="text-[10px]"
                      >
                        {step.label}: {count} 条 ({Math.round(pct)}%)
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </TooltipProvider>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getBarColor(key: WorkflowStage, _idx: number): string {
  switch (key) {
    case "draft":
      return "#8b5cf6";
    case "ai_optimize":
      return "#f59e0b";
    case "quality_review":
      return "#10b981";
    case "scheduled":
      return "#06b6d4";
    case "published":
      return "#f43f5e";
    default:
      return "#94a3b8";
  }
}
