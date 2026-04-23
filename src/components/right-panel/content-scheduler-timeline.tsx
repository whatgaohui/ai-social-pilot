"use client";

import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  GripVertical,
  Sparkles,
  Edit2,
  Trash2,
  Send,
  Clock,
  Filter,
  ChevronDown,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppStore } from "@/store/app-store";
import type { ContentPost, PostStatus, Platform } from "@/types";
import { toast } from "sonner";

// ─── Constants ──────────────────────────────────────────────────────────────────

const STATUS_FLOW: PostStatus[] = ["planned", "generated", "optimized", "scheduled", "published"];

const STATUS_LABELS: Record<PostStatus, string> = {
  planned: "待生成",
  generated: "已生成",
  optimized: "已优化",
  scheduled: "已排期",
  published: "已发布",
};

const STATUS_COLORS: Record<PostStatus, string> = {
  planned: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  generated: "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",
  optimized: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  scheduled: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  published: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
};

const STATUS_DOT_COLORS: Record<PostStatus, string> = {
  planned: "bg-slate-400",
  generated: "bg-violet-500",
  optimized: "bg-emerald-500",
  scheduled: "bg-blue-500",
  published: "bg-purple-500",
};

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

const STAT_COLORS: Record<string, string> = {
  planned: "bg-slate-400",
  generated: "bg-violet-500",
  optimized: "bg-emerald-500",
  scheduled: "bg-blue-500",
  published: "bg-purple-500",
};

type StatusFilter = "all" | PostStatus;
type PlatformFilter = "all" | Platform;
type ScoreFilter = "all" | "high" | "medium" | "low";

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function formatDateWeekday(dateStr: string): string {
  const d = new Date(dateStr);
  return `周${WEEKDAYS[d.getDay()]}`;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-amber-500";
  return "text-rose-500";
}

function getScoreBg(score: number): string {
  if (score >= 80) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  if (score >= 60) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300";
}

function getPlatformColor(platform: string | undefined): string {
  if (platform === "xiaohongshu") return "bg-red-500";
  return "bg-green-500";
}

function getPlatformLabel(platform: string | undefined): string {
  if (platform === "xiaohongshu") return "小红书";
  return "朋友圈";
}

function groupPostsByDate(posts: ContentPost[]): { date: string; posts: ContentPost[] }[] {
  const grouped = new Map<string, ContentPost[]>();
  const unscheduled: ContentPost[] = [];

  for (const post of posts) {
    if (post.scheduledDate) {
      const dateKey = post.scheduledDate.slice(0, 10);
      if (!grouped.has(dateKey)) grouped.set(dateKey, []);
      grouped.get(dateKey)!.push(post);
    } else {
      unscheduled.push(post);
    }
  }

  const sorted = Array.from(grouped.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, posts]) => ({ date, posts }));

  if (unscheduled.length > 0) {
    sorted.push({ date: "__unscheduled__", posts: unscheduled });
  }

  return sorted;
}

// ─── Animation Variants ─────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
};

// ─── Mini Status Flow ──────────────────────────────────────────────────────────

function StatusFlowMini({ status }: { status: PostStatus }) {
  const currentIndex = STATUS_FLOW.indexOf(status);
  return (
    <div className="flex items-center gap-1">
      {STATUS_FLOW.map((s, i) => (
        <React.Fragment key={s}>
          <div
            className={`status-flow-dot w-2 h-2 rounded-full transition-all ${
              i <= currentIndex ? STATUS_DOT_COLORS[s] : "bg-muted-foreground/20"
            } ${i === currentIndex ? "status-flow-dot-active" : ""}`}
          />
          {i < STATUS_FLOW.length - 1 && (
            <div
              className={`w-3 h-[2px] rounded-full transition-all ${
                i < currentIndex ? "bg-violet-400" : "bg-muted-foreground/15"
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Post Card ─────────────────────────────────────────────────────────────────

function PostTimelineCard({ post, isSelected, onSelect, onDelete }: {
  post: ContentPost;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const postStatus = post.status as PostStatus;
  const platformColor = getPlatformColor(post.platform);
  const platformLabel = getPlatformLabel(post.platform);

  return (
    <motion.div
      variants={cardVariants}
      layout
      className={`group relative flex items-start gap-2 p-3 rounded-xl border transition-all cursor-pointer ${
        isSelected
          ? "border-violet-300 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-950/20 shadow-sm"
          : "border-border/60 bg-card/80 hover:border-violet-200/60 dark:hover:border-violet-800/40 hover:bg-muted/30"
      }`}
      onClick={onSelect}
    >
      {/* Drag handle */}
      <div className="drag-handle flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing rounded p-0.5">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Top row: badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-5 border-0 ${STATUS_COLORS[postStatus]}`}>
            {STATUS_LABELS[postStatus]}
          </Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${platformColor} mr-1`} />
            {platformLabel}
          </Badge>
          {post.aiScore > 0 && (
            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-5 border-0 ${getScoreBg(post.aiScore)}`}>
              {post.aiScore}分
            </Badge>
          )}
        </div>

        {/* Topic */}
        <p className="text-xs font-medium leading-snug line-clamp-2 text-foreground/90">
          {post.topic || "未设置标题"}
        </p>

        {/* Status flow */}
        <StatusFlowMini status={postStatus} />

        {/* Schedule info */}
        {post.scheduledDate && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{post.scheduledDate.slice(5, 16).replace("T", " ")}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-violet-600"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          <Edit2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-500"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function ContentSchedulerTimeline() {
  const contentPosts = useAppStore((s) => s.contentPosts);
  const selectedPostId = useAppStore((s) => s.selectedPostId);
  const setSelectedPostId = useAppStore((s) => s.setSelectedPostId);
  const updateContentPost = useAppStore((s) => s.updateContentPost);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Filter posts
  const filteredPosts = useMemo(() => {
    let posts = [...contentPosts];

    if (statusFilter !== "all") {
      posts = posts.filter((p) => p.status === statusFilter);
    }
    if (platformFilter !== "all") {
      posts = posts.filter((p) => p.platform === platformFilter);
    }
    if (scoreFilter !== "all") {
      posts = posts.filter((p) => {
        const score = p.aiScore || 0;
        if (scoreFilter === "high") return score >= 80;
        if (scoreFilter === "medium") return score >= 60 && score < 80;
        return score < 60;
      });
    }

    return posts;
  }, [contentPosts, statusFilter, platformFilter, scoreFilter]);

  // Group by date
  const dateGroups = useMemo(() => groupPostsByDate(filteredPosts), [filteredPosts]);

  // Stats by status
  const statusStats = useMemo(() => {
    const stats: Record<string, number> = {};
    for (const post of contentPosts) {
      stats[post.status] = (stats[post.status] || 0) + 1;
    }
    return stats;
  }, [contentPosts]);

  const handleDelete = useCallback(
    (postId: string) => {
      try {
        fetch(`/api/content/${postId}`, { method: "DELETE" });
        // Update local store optimistically
        const updated = contentPosts.filter((p) => p.id !== postId);
        useAppStore.getState().setContentPosts(updated);
        if (selectedPostId === postId) {
          setSelectedPostId(null);
        }
        toast.success("内容已删除");
      } catch {
        toast.error("删除失败");
      }
    },
    [contentPosts, selectedPostId, setSelectedPostId],
  );

  const handlePublish = useCallback(
    async (post: ContentPost) => {
      try {
        const res = await fetch(`/api/content/${post.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "published", publishedAt: new Date().toISOString() }),
        });
        if (res.ok) {
          const updated = await res.json();
          updateContentPost(post.id, updated);
          toast.success("已发布", { description: post.topic });
        }
      } catch {
        toast.error("发布失败");
      }
    },
    [updateContentPost],
  );

  return (
    <div className="space-y-3">
      {/* ── Statistics Bar ──────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap p-3 rounded-xl bg-muted/30 border border-border/40">
        <span className="text-[10px] text-muted-foreground font-medium">状态分布</span>
        <div className="flex items-center gap-2">
          {STATUS_FLOW.map((status) => {
            const count = statusStats[status] || 0;
            return (
              <div key={status} className="flex items-center gap-1">
                <span className={`inline-block w-2 h-2 rounded-full ${STAT_COLORS[status]}`} />
                <span className="text-[10px] text-muted-foreground tabular-nums">{count}</span>
              </div>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="tabular-nums font-medium">{contentPosts.length}</span>
          <span>条内容</span>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────── */}
      <div className="space-y-2">
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Filter className="h-3.5 w-3.5" />
          <span>筛选</span>
          {(statusFilter !== "all" || platformFilter !== "all" || scoreFilter !== "all") && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[9px] bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400 border-0">
              已筛选
            </Badge>
          )}
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-200 ${showFilters ? "rotate-180" : ""}`}
          />
        </button>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-2 p-3 rounded-lg bg-muted/20 border border-border/30 space-y-2">
                {/* Status filter */}
                <div className="flex items-center gap-1.5 overflow-x-auto filter-bar-scroll pb-1">
                  <span className="text-[10px] text-muted-foreground flex-shrink-0 w-10">状态</span>
                  <div className="flex gap-1">
                    {(["all", ...STATUS_FLOW] as StatusFilter[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`text-[10px] px-2 py-1 rounded-full border transition-colors flex-shrink-0 ${
                          statusFilter === s
                            ? "bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700"
                            : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                        }`}
                      >
                        {s === "all" ? "全部" : STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Platform filter */}
                <div className="flex items-center gap-1.5 overflow-x-auto filter-bar-scroll pb-1">
                  <span className="text-[10px] text-muted-foreground flex-shrink-0 w-10">平台</span>
                  <div className="flex gap-1">
                    {(["all", "wechat", "xiaohongshu"] as PlatformFilter[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPlatformFilter(p)}
                        className={`text-[10px] px-2 py-1 rounded-full border transition-colors flex-shrink-0 ${
                          platformFilter === p
                            ? "bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700"
                            : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                        }`}
                      >
                        {p === "all" ? "全部" : p === "wechat" ? "朋友圈" : "小红书"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Score filter */}
                <div className="flex items-center gap-1.5 overflow-x-auto filter-bar-scroll pb-1">
                  <span className="text-[10px] text-muted-foreground flex-shrink-0 w-10">评分</span>
                  <div className="flex gap-1">
                    {([
                      { key: "all", label: "全部" },
                      { key: "high", label: "≥80" },
                      { key: "medium", label: "60-79" },
                      { key: "low", label: "<60" },
                    ] as { key: ScoreFilter; label: string }[]).map((s) => (
                      <button
                        key={s.key}
                        onClick={() => setScoreFilter(s.key)}
                        className={`text-[10px] px-2 py-1 rounded-full border transition-colors flex-shrink-0 ${
                          scoreFilter === s.key
                            ? "bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700"
                            : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clear filters */}
                {(statusFilter !== "all" || platformFilter !== "all" || scoreFilter !== "all") && (
                  <button
                    onClick={() => {
                      setStatusFilter("all");
                      setPlatformFilter("all");
                      setScoreFilter("all");
                    }}
                    className="text-[10px] text-violet-500 hover:text-violet-600 transition-colors self-end"
                  >
                    清除筛选
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Timeline ────────────────────────────────────────────── */}
      {dateGroups.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 px-4"
        >
          <div className="h-16 w-16 rounded-2xl bg-muted/40 flex items-center justify-center mb-4">
            <Calendar className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground mb-1">暂无排期内容</p>
          <p className="text-xs text-muted-foreground/60">设置内容的排期日期后将在此显示</p>
        </motion.div>
      ) : (
        <div className="relative pl-6">
          {/* Timeline vertical line */}
          <div className="absolute left-[11px] top-2 bottom-2 w-[2px] rounded-full timeline-connector" />

          <AnimatePresence mode="popLayout">
            <motion.div
              key={`${statusFilter}-${platformFilter}-${scoreFilter}`}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="space-y-4"
            >
              {dateGroups.map((group) => {
                const isUnscheduled = group.date === "__unscheduled__";
                const today = new Date().toISOString().slice(0, 10);
                const isToday = group.date === today;
                const isFuture = group.date > today;
                const isPast = group.date < today;

                return (
                  <motion.div key={group.date} variants={cardVariants} layout className="relative">
                    {/* Timeline node */}
                    <div className="absolute -left-6 top-3 flex items-center justify-center">
                      <div
                        className={`w-[10px] h-[10px] rounded-full border-2 border-background ${
                          isUnscheduled
                            ? "bg-muted-foreground/30 border-muted-foreground/50"
                            : isToday
                              ? "bg-violet-500 border-violet-500 timeline-node-active"
                              : isFuture
                                ? "bg-emerald-500 border-emerald-500"
                                : "bg-slate-300 dark:bg-slate-600 border-slate-300 dark:border-slate-600"
                        }`}
                      />
                    </div>

                    {/* Date label */}
                    <div className="flex items-center gap-2 mb-2">
                      {isUnscheduled ? (
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-semibold text-muted-foreground">未排期</span>
                        </div>
                      ) : (
                        <>
                          <span className="text-xs font-semibold text-foreground">
                            {formatDateLabel(group.date)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDateWeekday(group.date)}
                          </span>
                          {isToday && (
                            <Badge className="text-[9px] px-1.5 py-0 h-4 bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400 border-0">
                              今天
                            </Badge>
                          )}
                        </>
                      )}
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 border-0 bg-muted/60 text-muted-foreground">
                        {group.posts.length}条
                      </Badge>
                    </div>

                    {/* Post cards */}
                    <div className="space-y-2">
                      {group.posts.map((post) => (
                        <PostTimelineCard
                          key={post.id}
                          post={post}
                          isSelected={post.id === selectedPostId}
                          onSelect={() => setSelectedPostId(post.id)}
                          onDelete={() => handleDelete(post.id)}
                        />
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
