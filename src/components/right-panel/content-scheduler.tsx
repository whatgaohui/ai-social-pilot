"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import type { ContentPost } from "@/types";
import {
  CONTENT_TYPE_LABELS,
  XHS_CONTENT_TYPE_LABELS,
  POST_STATUS_LABELS,
  Platform,
} from "@/types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  CalendarClock,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Loader2,
  Undo2,
  Calendar,
  FileText,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, isSameDay } from "date-fns";
import { zhCN } from "date-fns/locale";

// ─── Types ───────────────────────────────────────────────────────────────

interface DateGroup {
  date: string;
  posts: ContentPost[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function getStatusColor(status: string): string {
  switch (status) {
    case "published":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
    case "optimized":
      return "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200 dark:border-violet-800";
    case "generated":
      return "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 border-sky-200 dark:border-sky-800";
    case "planned":
    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-800/30 dark:text-slate-400 border-slate-200 dark:border-slate-700";
  }
}

function getStatusDot(status: string): string {
  switch (status) {
    case "published":
      return "bg-emerald-500";
    case "optimized":
      return "bg-violet-500";
    case "generated":
      return "bg-sky-500";
    case "planned":
    default:
      return "bg-slate-400";
  }
}

function getScoreColor(score: number): string {
  if (score >= 85) return "text-emerald-500";
  if (score >= 70) return "text-amber-500";
  if (score >= 50) return "text-orange-500";
  return "text-red-500";
}

function getContentTypeLabel(type: string, platform: Platform): string {
  if (platform === "xiaohongshu") {
    return XHS_CONTENT_TYPE_LABELS[type as keyof typeof XHS_CONTENT_TYPE_LABELS] || type;
  }
  return CONTENT_TYPE_LABELS[type as keyof typeof CONTENT_TYPE_LABELS] || type;
}

function formatDateLabel(dateStr: string): { label: string; weekday: string } {
  try {
    const date = parseISO(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let prefix = "";
    if (isSameDay(date, today)) prefix = "今天 ";
    else if (isSameDay(date, tomorrow)) prefix = "明天 ";

    return {
      label: `${prefix}${format(date, "M月d日")}`,
      weekday: format(date, "EEE", { locale: zhCN }),
    };
  } catch {
    return { label: dateStr, weekday: "" };
  }
}

// ─── Animation Variants ──────────────────────────────────────────────────

const itemVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

// ─── Draggable Post Item ─────────────────────────────────────────────────

interface PostItemProps {
  post: ContentPost;
  platform: Platform;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, postId: string) => void;
  onDragEnd: () => void;
  onClick: () => void;
}

function PostItem({ post, platform, isDragging, onDragStart, onDragEnd, onClick }: PostItemProps) {
  const isXHS = platform === "xiaohongshu";

  return (
    <motion.div
      variants={itemVariants}
      layout
      layoutId={post.id}
      onClick={onClick}
      draggable
      onDragStart={(e) => onDragStart(e, post.id)}
      onDragEnd={onDragEnd}
      className={`
        group relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg
        border transition-all duration-200 cursor-grab active:cursor-grabbing select-none
        ${isDragging
          ? "opacity-40 scale-95 border-primary/40 bg-primary/5 shadow-lg z-50"
          : "border-border/60 bg-background hover:border-border hover:shadow-sm"
        }
        ${isXHS
          ? "hover:bg-red-50/50 dark:hover:bg-red-950/10"
          : "hover:bg-emerald-50/50 dark:hover:bg-emerald-950/10"
        }
      `}
      whileHover={!isDragging ? { y: -1 } : undefined}
      whileTap={!isDragging ? { scale: 0.99 } : undefined}
    >
      {/* Drag Handle */}
      <div className="flex-shrink-0">
        <GripVertical className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors" />
      </div>

      {/* Status dot */}
      <div className={`h-2 w-2 rounded-full flex-shrink-0 ${getStatusDot(post.status)}`} />

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Topic */}
        <p className="text-xs font-medium truncate leading-tight">
          {post.topic || "未命名内容"}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge
            variant="outline"
            className={`text-[9px] px-1.5 py-0 h-4 font-normal ${getStatusColor(post.status)}`}
          >
            {POST_STATUS_LABELS[post.status as keyof typeof POST_STATUS_LABELS] || post.status}
          </Badge>

          <Badge
            variant="secondary"
            className={`text-[9px] px-1.5 py-0 h-4 font-normal ${
              isXHS
                ? "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
            }`}
          >
            {getContentTypeLabel(post.contentType, platform)}
          </Badge>

          {post.aiScore > 0 && (
            <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${getScoreColor(post.aiScore)}`}>
              <Star className="h-2.5 w-2.5" />
              {Math.round(post.aiScore)}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────

export function ContentScheduler() {
  const { contentPosts, platform, selectedPostId, setSelectedPostId, setContentPosts } = useAppStore();

  const [isOpen, setIsOpen] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null);
  const [dropTargetDate, setDropTargetDate] = useState<string | null>(null);
  const [undoState, setUndoState] = useState<{ previousPosts: ContentPost[]; timeout: ReturnType<typeof setTimeout> } | null>(null);

  // ─── Group posts by date ─────────────────────────────────────────────
  const dateGroups = useMemo((): DateGroup[] => {
    const sorted = [...contentPosts].sort((a, b) => {
      return a.scheduledDate.localeCompare(b.scheduledDate) || a.createdAt.localeCompare(b.createdAt);
    });

    const groupMap = new Map<string, ContentPost[]>();
    for (const post of sorted) {
      const existing = groupMap.get(post.scheduledDate) || [];
      existing.push(post);
      groupMap.set(post.scheduledDate, existing);
    }

    const groups: DateGroup[] = [];
    for (const [date, posts] of groupMap) {
      groups.push({ date, posts });
    }

    return groups.sort((a, b) => a.date.localeCompare(b.date));
  }, [contentPosts]);

  const totalPosts = contentPosts.length;

  // ─── Drag and Drop Handlers ──────────────────────────────────────────
  const handleDragStart = useCallback((e: React.DragEvent, postId: string) => {
    setDraggedPostId(postId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", postId);

    // Set a transparent drag image (optional, native ghost is fine)
    try {
      const img = new Image();
      img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
      e.dataTransfer.setDragImage(img, 0, 0);
    } catch {
      // fallback: use default drag image
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTargetDate((prev) => (prev === targetDate ? prev : targetDate));
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the group entirely (not entering a child)
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    const currentTarget = e.currentTarget as HTMLElement;
    if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
      setDropTargetDate(null);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetDate(null);

    const postId = e.dataTransfer.getData("text/plain");
    setDraggedPostId(null);

    if (!postId) return;

    const post = contentPosts.find((p) => p.id === postId);
    if (!post || post.scheduledDate === targetDate) return;

    // Build reorder items — include all posts at target date + the moved post
    const targetGroupPosts = contentPosts
      .filter((p) => p.scheduledDate === targetDate)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    const items = [
      ...targetGroupPosts.map((p, idx) => ({
        id: p.id,
        scheduledDate: targetDate,
        sortOrder: idx,
      })),
      {
        id: postId,
        scheduledDate: targetDate,
        sortOrder: targetGroupPosts.length,
      },
    ];

    setIsReordering(true);

    try {
      const res = await fetch("/api/content/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      if (res.ok) {
        const data = await res.json();
        const updatedPosts = data.posts as ContentPost[];

        // Save previous state for undo
        const previousPosts = [...contentPosts];
        if (undoState?.timeout) clearTimeout(undoState.timeout);

        // Update the moved post in store
        const newPosts = contentPosts.map((p) => {
          if (p.id === postId) {
            const updated = updatedPosts.find((up) => up.id === postId);
            return updated ? { ...p, scheduledDate: targetDate } : p;
          }
          return p;
        });
        setContentPosts(newPosts);

        // Set undo timeout (5 seconds)
        const timeout = setTimeout(() => {
          setUndoState(null);
        }, 5000);
        setUndoState({ previousPosts, timeout });

        toast.success("排期已更新", {
          description: `"${post.topic || "未命名"}" 已移至 ${targetDate}`,
          action: {
            label: "撤销",
            onClick: () => {
              if (undoState) {
                clearTimeout(undoState.timeout);
                setContentPosts(undoState.previousPosts);
                setUndoState(null);
                toast.success("已撤销排期变更");
              }
            },
          },
          duration: 5000,
        });
      } else {
        toast.error("排期更新失败，请重试");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setIsReordering(false);
    }
  }, [contentPosts, undoState, setContentPosts]);

  const handleDragEnd = useCallback(() => {
    setDraggedPostId(null);
    setDropTargetDate(null);
  }, []);

  // ─── Undo handler ────────────────────────────────────────────────────
  const handleUndo = useCallback(() => {
    if (!undoState) return;
    clearTimeout(undoState.timeout);
    setContentPosts(undoState.previousPosts);
    setUndoState(null);
    toast.success("已撤销排期变更");
  }, [undoState, setContentPosts]);

  // ─── Empty state ─────────────────────────────────────────────────────
  if (contentPosts.length === 0) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full">
          <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-cyan-500/15 to-teal-500/15 flex items-center justify-center">
                  <CalendarClock className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                </div>
                <span className="text-sm font-medium">内容排期</span>
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </CardContent>
          </Card>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-1 pb-3">
            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
              <FileText className="h-8 w-8 mb-2 text-muted-foreground/40" />
              <p className="text-xs">暂无内容，请先创建内容计划</p>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group/trig">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-cyan-500/15 to-teal-500/15 flex items-center justify-center">
                <CalendarClock className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">内容排期</span>
                <span className="text-[10px] text-muted-foreground">
                  {totalPosts} 条内容 · {dateGroups.length} 天
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isReordering && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              )}
              {undoState && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800 cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                  onClick={(e) => { e.stopPropagation(); handleUndo(); }}
                >
                  <Undo2 className="h-2.5 w-2.5 mr-0.5" />
                  撤销
                </Badge>
              )}
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CardContent>
        </Card>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="px-1 pb-3 space-y-3">
          {/* Instruction */}
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <GripVertical className="h-3 w-3" />
            拖拽内容卡片到不同日期组以调整排期
          </p>

          {/* Loading overlay */}
          <div className="relative">
            <AnimatePresence>
              {isReordering && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 bg-muted/20 backdrop-blur-[1px] rounded-lg flex items-center justify-center"
                >
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Date groups */}
            <ScrollArea className="max-h-[420px]">
              <div className="space-y-3 pr-1">
                {dateGroups.map((group, groupIdx) => {
                  const { label, weekday } = formatDateLabel(group.date);
                  const isXHS = platform === "xiaohongshu";
                  const isDropTarget = dropTargetDate === group.date && draggedPostId !== null;

                  return (
                    <motion.div
                      key={group.date}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: groupIdx * 0.05, duration: 0.3, ease: [0.22, 1, 0.36, 1] as const }}
                      className={`rounded-lg transition-all duration-200 p-1 ${
                        isDropTarget
                          ? "ring-2 ring-primary/30 bg-primary/5"
                          : ""
                      }`}
                      onDragOver={(e) => handleDragOver(e, group.date)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, group.date)}
                    >
                      {/* Date header */}
                      <div className={`flex items-center gap-2 px-2 py-1.5 ${
                        isXHS
                          ? "border-l-2 border-red-400 dark:border-red-600"
                          : "border-l-2 border-emerald-400 dark:border-emerald-600"
                      }`}>
                        <Calendar className={`h-3.5 w-3.5 ${isXHS ? "text-red-500" : "text-emerald-500"}`} />
                        <span className="text-xs font-semibold">{label}</span>
                        <span className="text-[10px] text-muted-foreground">{weekday}</span>
                        <Badge
                          variant="secondary"
                          className="text-[9px] px-1.5 py-0 h-4 ml-auto"
                        >
                          {group.posts.length} 条
                        </Badge>
                      </div>

                      {/* Posts in this date group */}
                      <div className="space-y-1 mt-1">
                        <AnimatePresence mode="popLayout">
                          {group.posts.map((post) => (
                            <PostItem
                              key={post.id}
                              post={post}
                              platform={platform}
                              isDragging={draggedPostId === post.id}
                              onDragStart={handleDragStart}
                              onDragEnd={handleDragEnd}
                              onClick={() => setSelectedPostId(post.id)}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Summary footer */}
          <Separator />
          <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
            <span>
              {dateGroups.length} 天安排了 {totalPosts} 条内容
            </span>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                已发布
              </span>
              <span className="flex items-center gap-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                已优化
              </span>
              <span className="flex items-center gap-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                已生成
              </span>
              <span className="flex items-center gap-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                待生成
              </span>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
