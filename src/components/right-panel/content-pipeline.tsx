"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import type { PostStatus, ContentPost } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Lightbulb,
  Pencil,
  Bot,
  BarChart3,
  Calendar,
  Rocket,
  ArrowRight,
  AlertTriangle,
  ChevronRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import type { WorkflowRun } from "@/app/api/content-workflow/engine";

// ─── Animation Variants ──────────────────────────────────────────────────────

const fadeSlideIn = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.15 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const } },
};

// ─── Pipeline Stages ─────────────────────────────────────────────────────────

interface PipelineStage {
  id: PostStatus | "idea";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgClass: string;
  borderClass: string;
  emoji: string;
  description: string;
}

const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: "idea",
    label: "创意",
    icon: Lightbulb,
    color: "text-amber-500",
    bgClass: "bg-amber-50 dark:bg-amber-950/20",
    borderClass: "border-amber-200 dark:border-amber-800",
    emoji: "💡",
    description: "待生成内容",
  },
  {
    id: "planned",
    label: "草稿",
    icon: Pencil,
    color: "text-slate-500",
    bgClass: "bg-slate-50 dark:bg-slate-950/20",
    borderClass: "border-slate-200 dark:border-slate-800",
    emoji: "✍️",
    description: "已计划待处理",
  },
  {
    id: "generated",
    label: "已生成",
    icon: Bot,
    color: "text-violet-500",
    bgClass: "bg-violet-50 dark:bg-violet-950/20",
    borderClass: "border-violet-200 dark:border-violet-800",
    emoji: "🤖",
    description: "AI生成内容",
  },
  {
    id: "optimized",
    label: "AI优化",
    icon: Sparkles,
    color: "text-emerald-500",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/20",
    borderClass: "border-emerald-200 dark:border-emerald-800",
    emoji: "✨",
    description: "已优化内容",
  },
  {
    id: "scheduled",
    label: "排期",
    icon: Calendar,
    color: "text-cyan-500",
    bgClass: "bg-cyan-50 dark:bg-cyan-950/20",
    borderClass: "border-cyan-200 dark:border-cyan-800",
    emoji: "📅",
    description: "已排期待发布",
  },
  {
    id: "published",
    label: "发布",
    icon: Rocket,
    color: "text-rose-500",
    bgClass: "bg-rose-50 dark:bg-rose-950/20",
    borderClass: "border-rose-200 dark:border-rose-800",
    emoji: "🚀",
    description: "已发布内容",
  },
];

// ─── Pipeline SVG Visualization ───────────────────────────────────────────────

function PipelineVisualization({
  stageCounts,
  activeStage,
  onSelectStage,
}: {
  stageCounts: Record<string, number>;
  activeStage: string | null;
  onSelectStage: (stage: string) => void;
}) {
  return (
    <div className="relative overflow-x-auto scrollbar-none py-2">
      <svg viewBox="0 0 600 80" className="w-full min-w-[500px] pipeline-visual" preserveAspectRatio="xMidYMid meet">
        {/* Connections */}
        {PIPELINE_STAGES.slice(0, -1).map((stage, i) => {
          const x1 = 50 + i * 100;
          const x2 = 50 + (i + 1) * 100;
          const hasItems = (stageCounts[stage.id] || 0) > 0;
          return (
            <g key={`conn-${stage.id}`}>
              <line
                x1={x1 + 30}
                y1={40}
                x2={x2 - 30}
                y2={40}
                stroke="currentColor"
                className="text-border"
                strokeWidth="2"
                strokeDasharray={hasItems ? "0" : "4 4"}
              />
              {hasItems && (
                <circle r="3" cx={x1 + 80} cy={40} fill="currentColor" className="text-violet-400">
                  <animate
                    attributeName="opacity"
                    values="0.4;1;0.4"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
            </g>
          );
        })}

        {/* Stage Nodes */}
        {PIPELINE_STAGES.map((stage, i) => {
          const cx = 50 + i * 100;
          const cy = 40;
          const count = stageCounts[stage.id] || 0;
          const isActive = activeStage === stage.id;
          const isBottleneck = count > 0 && count === Math.max(...Object.values(stageCounts));

          return (
            <g
              key={stage.id}
              className="cursor-pointer"
              onClick={() => onSelectStage(stage.id)}
            >
              {/* Glow for active/bottleneck */}
              {isBottleneck && count > 1 && (
                <circle
                  r="28"
                  cx={cx}
                  cy={cy}
                  fill="currentColor"
                  className="text-amber-200 dark:text-amber-900/30 bottleneck-indicator"
                  opacity="0.5"
                >
                  <animate
                    attributeName="r"
                    values="28;32;28"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
              {/* Node circle */}
              <circle
                r="24"
                cx={cx}
                cy={cy}
                fill="currentColor"
                className={`${isActive ? "text-violet-100 dark:text-violet-900/40" : stage.bgClass.includes("dark") ? "text-transparent" : "text-background"}`}
                stroke="currentColor"
                className2={isActive ? "text-violet-400" : "text-border"}
                strokeWidth={isActive ? "2.5" : "1.5"}
                style={{
                  fill: isActive
                    ? undefined
                    : "hsl(var(--card))",
                  stroke: isActive
                    ? "rgb(139 92 246)"
                    : "hsl(var(--border))",
                }}
              />
              {/* Emoji */}
              <text
                x={cx}
                y={cy + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="16"
              >
                {stage.emoji}
              </text>
              {/* Count badge */}
              {count > 0 && (
                <>
                  <circle
                    r="9"
                    cx={cx + 18}
                    cy={cy - 18}
                    fill={isBottleneck && count > 1 ? "rgb(245 158 11)" : "rgb(139 92 246)"}
                  />
                  <text
                    x={cx + 18}
                    y={cy - 17}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="9"
                    fontWeight="bold"
                    fill="white"
                  >
                    {count}
                  </text>
                </>
              )}
              {/* Label */}
              <text
                x={cx}
                y={cy + 38}
                textAnchor="middle"
                fontSize="9"
                fill="currentColor"
                className="text-muted-foreground"
                fontWeight={isActive ? "600" : "400"}
              >
                {stage.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ContentPipeline() {
  const { contentPosts, platform, persona, selectedPostId, setSelectedPostId, updateContentPost } = useAppStore();
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>([]);

  // ── Compute stage counts ──
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const stage of PIPELINE_STAGES) {
      counts[stage.id] = 0;
    }
    // Count "idea" as posts with no content (planned + empty)
    counts.idea = contentPosts.filter(
      (p) => p.status === "planned" && !p.content,
    ).length;
    for (const post of contentPosts) {
      if (post.status === "planned" && post.content) {
        counts.planned = (counts.planned || 0) + 1;
      } else if (post.status in counts) {
        counts[post.status] = (counts[post.status] || 0) + 1;
      }
    }
    return counts;
  }, [contentPosts]);

  // ── Bottleneck detection ──
  const bottleneck = useMemo(() => {
    let maxCount = 0;
    let bottleneckStage: PipelineStage | null = null;
    for (const stage of PIPELINE_STAGES) {
      const count = stageCounts[stage.id] || 0;
      if (count > maxCount && count > 1) {
        maxCount = count;
        bottleneckStage = stage;
      }
    }
    return bottleneckStage;
  }, [stageCounts]);

  // ── Filtered posts by stage ──
  const filteredPosts = useMemo(() => {
    if (!activeStage) return [];
    if (activeStage === "idea") {
      return contentPosts.filter((p) => p.status === "planned" && !p.content);
    }
    return contentPosts.filter((p) => p.status === activeStage);
  }, [contentPosts, activeStage]);

  // ── Load workflow runs ──
  useEffect(() => {
    fetch("/api/content-workflow")
      .then((res) => res.json())
      .then((data) => {
        if (data.recentRuns) {
          setWorkflowRuns(data.recentRuns.slice(0, 5));
        }
      })
      .catch(() => {});
  }, []);

  // ── Stage click handler ──
  const handleSelectStage = useCallback((stageId: string) => {
    setActiveStage((prev) => (prev === stageId ? null : stageId));
  }, []);

  // ── Select a post ──
  const handleSelectPost = useCallback(
    (postId: string) => {
      setSelectedPostId(postId);
    },
    [setSelectedPostId],
  );

  // ── Advance all posts in active stage ──
  const handleAdvanceAll = useCallback(async () => {
    if (!activeStage) return;
    setIsAdvancing(true);

    const statusOrder: string[] = ["idea", "planned", "generated", "optimized", "scheduled", "published"];
    const currentIdx = statusOrder.indexOf(activeStage);
    if (currentIdx >= statusOrder.length - 1) {
      toast.info("已经是最终阶段");
      setIsAdvancing(false);
      return;
    }

    const nextStatus = statusOrder[currentIdx + 1] as PostStatus;
    const postsToAdvance =
      activeStage === "idea"
        ? contentPosts.filter((p) => p.status === "planned" && !p.content)
        : contentPosts.filter((p) => p.status === activeStage);

    let successCount = 0;
    for (const post of postsToAdvance) {
      try {
        const res = await fetch(`/api/content/${post.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        });
        if (res.ok) {
          const updated = await res.json();
          updateContentPost(post.id, updated);
          successCount++;
        }
      } catch {
        // skip
      }
    }

    setIsAdvancing(false);
    toast.success(`已将 ${successCount} 条内容推进到「${PIPELINE_STAGES.find((s) => s.id === nextStatus)?.label || nextStatus}」`);
  }, [activeStage, contentPosts, updateContentPost]);

  // ── Run workflow for selected posts ──
  const handleRunWorkflow = useCallback(
    async (templateId: string) => {
      if (!activeStage) return;

      const postsToProcess =
        activeStage === "idea"
          ? contentPosts.filter((p) => p.status === "planned" && !p.content)
          : contentPosts.filter((p) => p.status === activeStage);

      if (postsToProcess.length === 0) {
        toast.error("当前阶段没有可处理的内容");
        return;
      }

      setIsAdvancing(true);
      try {
        const res = await fetch("/api/content-workflow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId,
            context: {
              postId: postsToProcess[0].id,
              topic: postsToProcess[0].topic,
              content: postsToProcess[0].content,
              platform,
              persona: persona ? { name: persona.name, tone: persona.tone } : null,
            },
          }),
        });

        if (res.ok) {
          const run = await res.json();
          toast.success(`工作流完成，最终评分: ${run.steps.find((s: { aiScore?: number }) => s.aiScore)?.aiScore || "--"}`);
          // Refresh data
          const listRes = await fetch("/api/content-workflow");
          if (listRes.ok) {
            const data = await listRes.json();
            setWorkflowRuns(data.recentRuns?.slice(0, 5) || []);
          }
        }
      } catch {
        toast.error("工作流执行失败");
      } finally {
        setIsAdvancing(false);
      }
    },
    [activeStage, contentPosts, platform, persona],
  );

  return (
    <TooltipProvider delayDuration={300}>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        {/* ── Pipeline Visualization ── */}
        <motion.div variants={staggerItem}>
          <div className="rounded-xl border border-border/60 bg-card/80 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <div className="h-6 w-6 rounded-md bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <BarChart3 className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-xs font-semibold">内容流水线</span>
              </div>
              {bottleneck && stageCounts[bottleneck.id] > 1 && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 bottleneck-indicator">
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                  <span className="text-[9px] text-amber-700 dark:text-amber-300 font-medium">
                    {bottleneck.label}堆积 ({stageCounts[bottleneck.id]})
                  </span>
                </div>
              )}
            </div>

            <PipelineVisualization
              stageCounts={stageCounts}
              activeStage={activeStage}
              onSelectStage={handleSelectStage}
            />

            {/* Summary stats */}
            <div className="flex items-center justify-between mt-2 px-1">
              <div className="flex items-center gap-3">
                <span className="text-[9px] text-muted-foreground">
                  总计 {contentPosts.length} 条内容
                </span>
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400">
                  已发布 {stageCounts.published || 0}
                </span>
                <span className="text-[9px] text-amber-600 dark:text-amber-400">
                  待处理 {stageCounts.idea + stageCounts.planned + stageCounts.generated}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Stage Detail Panel ── */}
        <AnimatePresence>
          {activeStage && (
            <motion.div
              key={activeStage}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="rounded-xl border border-border/60 bg-card/80 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const stage = PIPELINE_STAGES.find((s) => s.id === activeStage);
                      const Icon = stage?.icon || BarChart3;
                      return (
                        <>
                          <Icon className={`h-4 w-4 ${stage?.color || "text-muted-foreground"}`} />
                          <span className="text-xs font-semibold">
                            {stage?.label} 阶段
                          </span>
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                            {filteredPosts.length} 条
                          </Badge>
                        </>
                      );
                    })()}
                  </div>
                  <button
                    onClick={() => setActiveStage(null)}
                    className="h-5 w-5 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
                  >
                    ✕
                  </button>
                </div>

                {/* Stage Posts List */}
                {filteredPosts.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {filteredPosts.map((post) => (
                      <button
                        key={post.id}
                        onClick={() => handleSelectPost(post.id)}
                        className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all duration-200 cursor-pointer hover:bg-muted/50 ${
                          post.id === selectedPostId
                            ? "bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800"
                            : "border border-transparent"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium truncate">
                            {post.topic || "未命名"}
                          </p>
                          <p className="text-[9px] text-muted-foreground truncate">
                            {post.content
                              ? `${post.content.slice(0, 40)}…`
                              : "暂无内容"}
                          </p>
                        </div>
                        <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground text-center py-4">
                    当前阶段暂无内容
                  </p>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-1.5 pt-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        className="flex-1 h-7 text-[10px] bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white btn-ripple press-scale"
                        onClick={handleAdvanceAll}
                        disabled={isAdvancing}
                      >
                        {isAdvancing ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <ArrowRight className="h-3 w-3 mr-1" />
                        )}
                        一键推进
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-[10px]">将当前阶段所有内容推进到下一阶段</p>
                    </TooltipContent>
                  </Tooltip>

                  {(activeStage === "planned" || activeStage === "idea") && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-7 text-[10px] border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400"
                          onClick={() => handleRunWorkflow("idea-to-content")}
                          disabled={isAdvancing}
                        >
                          {isAdvancing ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Bot className="h-3 w-3 mr-1" />
                          )}
                          AI全流程
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-[10px]">自动生成→优化→评分→排期</p>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {activeStage === "generated" && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-7 text-[10px] border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400"
                          onClick={() => handleRunWorkflow("draft-to-scheduled")}
                          disabled={isAdvancing}
                        >
                          {isAdvancing ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Sparkles className="h-3 w-3 mr-1" />
                          )}
                          优化排期
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-[10px]">自动优化→评分→排期发布</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Recent Workflow Runs ── */}
        {workflowRuns.length > 0 && (
          <motion.div variants={staggerItem}>
            <div className="rounded-xl border border-border/60 bg-card/80 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Bot className="h-3.5 w-3.5 text-violet-500" />
                <span className="text-[11px] font-semibold">最近工作流</span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {workflowRuns.map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div
                      className={`h-2 w-2 rounded-full flex-shrink-0 ${
                        run.status === "completed"
                          ? "bg-emerald-500"
                          : run.status === "running"
                            ? "bg-amber-500 animate-pulse"
                            : run.status === "error"
                              ? "bg-red-500"
                              : "bg-slate-400"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium truncate">{run.templateName}</p>
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] text-muted-foreground">
                          {run.steps.filter((s) => s.status === "completed").length}/{run.steps.length}步
                        </span>
                        <span className="text-[8px] text-muted-foreground">•</span>
                        <span className="text-[8px] text-muted-foreground">
                          {new Date(run.startedAt).toLocaleString("zh-CN", {
                            month: "numeric",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                    {run.steps.some((s) => s.aiScore) && (
                      <Badge
                        variant="secondary"
                        className={`text-[9px] px-1.5 py-0 h-4 ${
                          (run.steps.find((s) => s.aiScore)?.aiScore || 0) >= 70
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                        }`}
                      >
                        {run.steps.find((s) => s.aiScore)?.aiScore || 0}分
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </TooltipProvider>
  );
}
