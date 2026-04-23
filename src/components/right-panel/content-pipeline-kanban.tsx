"use client";

import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAppStore } from "@/store/app-store";
import { Badge } from "@/components/ui/badge";
import type { ContentPost } from "@/types";
import {
  GripVertical,
  Sparkles,
  Clock,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Video,
  Bot,
  ArrowRight,
  Star,
  MessageSquare,
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

// ─── Lane Types ──────────────────────────────────────────────────────

type KanbanLane = "pending" | "reviewing" | "scheduled";

interface LaneConfig {
  id: KanbanLane;
  label: string;
  icon: React.ElementType;
  gradient: string;
  borderAccent: string;
  badgeBg: string;
  badgeText: string;
  emptyText: string;
  emptyIcon: React.ElementType;
  headerEmoji: string;
}

const LANE_CONFIG: LaneConfig[] = [
  {
    id: "pending",
    label: "待创作",
    icon: FileText,
    gradient: "from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20",
    borderAccent: "border-t-amber-400",
    badgeBg: "bg-amber-100 dark:bg-amber-900/30",
    badgeText: "text-amber-700 dark:text-amber-300",
    emptyText: "暂无待创作内容",
    emptyIcon: FileText,
    headerEmoji: "✏️",
  },
  {
    id: "reviewing",
    label: "审核中",
    icon: Sparkles,
    gradient: "from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20",
    borderAccent: "border-t-violet-400",
    badgeBg: "bg-violet-100 dark:bg-violet-900/30",
    badgeText: "text-violet-700 dark:text-violet-300",
    emptyText: "暂无审核中内容",
    emptyIcon: Bot,
    headerEmoji: "🔍",
  },
  {
    id: "scheduled",
    label: "已排期",
    icon: CheckCircle2,
    gradient: "from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20",
    borderAccent: "border-t-emerald-400",
    badgeBg: "bg-emerald-100 dark:bg-emerald-900/30",
    badgeText: "text-emerald-700 dark:text-emerald-300",
    emptyText: "暂无已排期内容",
    emptyIcon: Clock,
    headerEmoji: "📅",
  },
];

// ─── Helper: classify post into lane ─────────────────────────────────

function classifyPost(post: ContentPost): KanbanLane {
  if (
    post.status === "scheduled" ||
    post.status === "published" ||
    post.status === "optimized"
  ) {
    return "scheduled";
  }
  if (
    post.status === "generated" ||
    post.status === "planned"
  ) {
    return "reviewing";
  }
  return "pending";
}

// ─── Content type icon helper ────────────────────────────────────────

function ContentTypeIcon({ type }: { type: string }) {
  if (type === "video" || type === "vlog") {
    return <Video className="h-3 w-3 text-rose-500" />;
  }
  if (type === "image" || type === "mixed") {
    return <ImageIcon className="h-3 w-3 text-emerald-500" />;
  }
  return <FileText className="h-3 w-3 text-violet-500" />;
}

// ─── Platform badge ──────────────────────────────────────────────────

function PlatformBadge({ platform }: { platform?: string }) {
  if (!platform) return null;
  const isWeChat = platform === "wechat";
  return (
    <Badge
      variant="outline"
      className={`text-[8px] px-1 py-0 h-3.5 border-0 ${
        isWeChat
          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
          : "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300"
      }`}
    >
      {isWeChat ? "朋友圈" : "小红书"}
    </Badge>
  );
}

// ─── Score badge ─────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
      : score >= 60
        ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
        : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300";

  return (
    <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full ${color}`}>
      <Star className="h-2.5 w-2.5" />
      <span className="text-[9px] font-semibold tabular-nums">{score}</span>
    </div>
  );
}

// ─── Sortable Card ───────────────────────────────────────────────────

interface SortableCardProps {
  post: ContentPost;
  onSelect: (id: string) => void;
  isSelected: boolean;
  onMoveToLane: (id: string, lane: KanbanLane) => void;
}

function SortableCard({ post, onSelect, isSelected, onMoveToLane }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: post.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  const lane = classifyPost(post);
  const nextLane: KanbanLane | null =
    lane === "pending" ? "reviewing" : lane === "reviewing" ? "scheduled" : null;
  const nextLabel =
    lane === "pending"
      ? "送审"
      : lane === "reviewing"
        ? "排期"
        : "";

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] as const }}
      className={`group relative rounded-lg border p-2.5 cursor-pointer transition-all duration-200 ${
        isSelected
          ? "border-violet-300 dark:border-violet-700 bg-violet-50/80 dark:bg-violet-950/20 shadow-sm"
          : "border-border/20 bg-card hover:border-border/20 hover:shadow-sm"
      }`}
      onClick={() => onSelect(post.id)}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      </div>

      {/* Topic row */}
      <div className="flex items-start gap-2 ml-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold truncate leading-tight">
            {post.topic || "未命名内容"}
          </p>
          <p className="text-[9px] text-muted-foreground truncate mt-0.5 leading-tight">
            {post.content
              ? `${post.content.slice(0, 50)}${post.content.length > 50 ? "…" : ""}`
              : "暂无内容"}
          </p>
        </div>
      </div>

      {/* Badges row */}
      <div className="flex items-center gap-1.5 mt-2 ml-3 flex-wrap">
        <ContentTypeIcon type={post.contentType} />
        <PlatformBadge platform={post.platform} />
        {post.aiScore > 0 && <ScoreBadge score={post.aiScore} />}
        <span className="ml-auto">
          {nextLane && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveToLane(post.id, nextLane);
              }}
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium text-muted-foreground hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-colors"
            >
              {nextLabel}
              <ArrowRight className="h-2.5 w-2.5" />
            </button>
          )}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Drag Overlay Card ───────────────────────────────────────────────

function DragOverlayCard({ post }: { post: ContentPost }) {
  return (
    <div className="rounded-lg border border-violet-300 dark:border-violet-700 bg-card p-2.5 shadow-lg rotate-2">
      <p className="text-[11px] font-semibold truncate">{post.topic || "未命名内容"}</p>
      <p className="text-[9px] text-muted-foreground truncate mt-0.5">
        {post.content ? `${post.content.slice(0, 40)}…` : "暂无内容"}
      </p>
    </div>
  );
}

// ─── Kanban Lane Column ──────────────────────────────────────────────

interface LaneColumnProps {
  config: LaneConfig;
  posts: ContentPost[];
  selectedPostId: string | null;
  onSelectPost: (id: string) => void;
  onMoveToLane: (id: string, lane: KanbanLane) => void;
}

function LaneColumn({
  config,
  posts,
  selectedPostId,
  onSelectPost,
  onMoveToLane,
}: LaneColumnProps) {
  const Icon = config.icon;
  const EmptyIcon = config.emptyIcon;

  return (
    <div className="flex-1 min-w-0 flex flex-col">
      {/* Lane Header */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-t-xl bg-gradient-to-b ${config.gradient} ${config.borderAccent} border-t-2`}>
        <span className="text-sm">{config.headerEmoji}</span>
        <span className="text-xs font-semibold flex-1">{config.label}</span>
        <Badge
          variant="outline"
          className={`text-[9px] px-1.5 py-0 h-5 border-0 ${config.badgeBg} ${config.badgeText}`}
        >
          {posts.length}
        </Badge>
      </div>

      {/* Cards list */}
      <div className="flex-1 bg-muted/20 rounded-b-xl p-2 space-y-2 min-h-[200px] max-h-[400px] overflow-y-auto">
        <AnimatePresence>
          {posts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-32 text-muted-foreground"
            >
              <EmptyIcon className="h-8 w-8 mb-2 opacity-30" />
              <span className="text-[10px]">{config.emptyText}</span>
            </motion.div>
          ) : (
            <SortableContext
              items={posts.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              {posts.map((post) => (
                <SortableCard
                  key={post.id}
                  post={post}
                  onSelect={onSelectPost}
                  isSelected={post.id === selectedPostId}
                  onMoveToLane={onMoveToLane}
                />
              ))}
            </SortableContext>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function ContentPipelineKanban() {
  const { contentPosts, selectedPostId, setSelectedPostId, updateContentPost } =
    useAppStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [movingPostId, setMovingPostId] = useState<string | null>(null);

  // ── Classify posts into lanes ──
  const lanePosts = useMemo(() => {
    const pending: ContentPost[] = [];
    const reviewing: ContentPost[] = [];
    const scheduled: ContentPost[] = [];
    for (const post of contentPosts) {
      const lane = classifyPost(post);
      if (lane === "pending") pending.push(post);
      else if (lane === "reviewing") reviewing.push(post);
      else scheduled.push(post);
    }
    return { pending, reviewing, scheduled };
  }, [contentPosts]);

  // ── DnD sensors ──
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  // ── Handle drag start ──
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  // ── Handle drag end ──
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const postId = String(active.id);
      const overPostId = String(over.id);
      const post = contentPosts.find((p) => p.id === postId);
      const overPost = contentPosts.find((p) => p.id === overPostId);

      if (!post || !overPost) return;

      const targetLane = classifyPost(overPost);
      const currentLane = classifyPost(post);
      if (targetLane === currentLane) return;

      moveToLane(postId, targetLane);
    },
    [contentPosts],
  );

  // ── Move post to a different lane via button ──
  const moveToLane = useCallback(
    async (postId: string, targetLane: KanbanLane) => {
      setMovingPostId(postId);

      const statusMap: Record<KanbanLane, string> = {
        pending: "planned",
        reviewing: "generated",
        scheduled: "scheduled",
      };

      try {
        const res = await fetch(`/api/content/${postId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: statusMap[targetLane] }),
        });
        if (res.ok) {
          const updated = await res.json();
          updateContentPost(postId, updated);
          const laneLabel =
            LANE_CONFIG.find((l) => l.id === targetLane)?.label || targetLane;
          toast.success(`已移至「${laneLabel}」`);
        }
      } catch {
        toast.error("移动失败，请重试");
      } finally {
        setMovingPostId(null);
      }
    },
    [updateContentPost],
  );

  // ── Handle select post ──
  const handleSelectPost = useCallback(
    (id: string) => {
      setSelectedPostId(id);
    },
    [setSelectedPostId],
  );

  // ── Find active post for drag overlay ──
  const activePost = activeId
    ? contentPosts.find((p) => p.id === activeId)
    : null;

  // ── Collect all post IDs for DnD context ──
  const allPostIds = contentPosts.map((p) => p.id);

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
            <FileText className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold">内容管线看板</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px] h-5">
            共 {contentPosts.length} 条
          </Badge>
        </div>
      </motion.div>

      {/* Kanban Board */}
      <motion.div variants={staggerItem}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 overflow-x-auto pb-2">
            {LANE_CONFIG.map((config) => (
              <LaneColumn
                key={config.id}
                config={config}
                posts={lanePosts[config.id]}
                selectedPostId={selectedPostId}
                onSelectPost={handleSelectPost}
                onMoveToLane={moveToLane}
              />
            ))}
          </div>

          <DragOverlay>
            {activePost ? <DragOverlayCard post={activePost} /> : null}
          </DragOverlay>
        </DndContext>
      </motion.div>

      {/* Summary footer */}
      <motion.div variants={staggerItem}>
        <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-amber-400" />
            待创作 {lanePosts.pending.length}
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-violet-400" />
            审核中 {lanePosts.reviewing.length}
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            已排期 {lanePosts.scheduled.length}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
