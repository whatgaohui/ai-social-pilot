"use client";

import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Eye,
  Pencil,
  Sparkles,
  Rocket,
  Bot,
  History,
  MessageSquare,
  ThumbsUp,
  Repeat2,
  Eye as EyeIcon,
  Star,
  Loader2,
  FileText,
  Lightbulb,
  ClipboardList,
  Link2,
  CalendarClock,
  Table,
  ImageIcon,
  Download,
  Layers,
  ChevronRight,
  Activity,
  Wand2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useSuccessToast, useErrorToast } from "@/hooks/use-toast-operations";
import { useAutoSave, formatRelativeTime } from "@/hooks/use-auto-save";
import { useAppStore } from "@/store/app-store";
import type { PostStatus } from "@/types";

import { PostDetailHeader } from "@/components/right-panel/post-detail-header";
import { ContentEditor } from "@/components/right-panel/content-editor";
import { EnhancedContentEditor } from "@/components/right-panel/enhanced-content-editor";
import { PostActions } from "@/components/right-panel/post-actions";
import { WeChatPreview } from "@/components/right-panel/wechat-preview";
import { XiaohongshuPreview } from "@/components/right-panel/xiaohongshu-preview";
import { PublishingAssistant } from "@/components/right-panel/publishing-assistant";
import { HashtagRecommender } from "@/components/right-panel/hashtag-recommender";
import { CoverImageGenerator } from "@/components/right-panel/cover-image-generator";
import { TitleABTest } from "@/components/right-panel/title-ab-test";
import { QualityScorer } from "@/components/right-panel/quality-scorer";
import { ContentSpellcheck } from "@/components/right-panel/content-spellcheck";
import { ContentHistory } from "@/components/right-panel/content-history";
import { ViralInspiration } from "@/components/right-panel/viral-inspiration";
import { PublishWorkflow } from "@/components/right-panel/publish-workflow";
import { AIWritingAssistantEnhanced } from "@/components/right-panel/ai-writing-assistant-enhanced";
import { ContentPipeline } from "@/components/right-panel/content-pipeline";
import { ContentQuickActions } from "@/components/right-panel/content-quick-actions";
import { AIQuickActionsBar } from "@/components/right-panel/ai-quick-actions-bar";
import { WorkspaceQuickBar } from "@/components/right-panel/workspace-quick-bar";
import { WorkspaceEmptyState } from "@/components/right-panel/workspace-empty-state";
import { WordCountIndicator } from "@/components/right-panel/word-count-indicator";
import { AISchedulingAssistant } from "@/components/right-panel/ai-scheduling-assistant";
import { SchedulingAssistantEnhanced } from "@/components/right-panel/scheduling-assistant-enhanced";
import { AIScheduleOptimizer } from "@/components/right-panel/ai-schedule-optimizer";
import { ContentScheduler } from "@/components/right-panel/content-scheduler";
import { AIContentRewriter } from "@/components/right-panel/ai-content-rewriter";
import { EmojiPicker } from "@/components/right-panel/emoji-picker";
import { PublishChecklist } from "@/components/right-panel/publish-checklist";
import { ScheduledPublish } from "@/components/right-panel/scheduled-publish";
import { QuickActionsToolbar } from "@/components/right-panel/quick-actions-toolbar";
import { AIBatchOperations } from "@/components/right-panel/ai-batch-operations";
import { ContentHealthDashboard } from "@/components/right-panel/content-health-dashboard";
import { PublishingQueue } from "@/components/right-panel/publishing-queue";

// ─── Dynamic Imports (iteration 41 components, ssr:false to avoid OOM) ──────

function SkeletonBox({ className = "" }: { className?: string }) {
  return <div className={`rounded-xl bg-muted/60 animate-pulse ${className}`} />;
}

const ContentPipelineKanban = dynamic(
  () => import("@/components/right-panel/content-pipeline-kanban").then((m) => ({ default: m.ContentPipelineKanban })),
  { ssr: false, loading: () => <SkeletonBox className="h-64" /> },
);

const AISmartBatchPanel = dynamic(
  () => import("@/components/right-panel/ai-smart-batch-panel").then((m) => ({ default: m.AISmartBatchPanel })),
  { ssr: false, loading: () => <SkeletonBox className="h-64" /> },
);

const ContentHealthCard = dynamic(
  () => import("@/components/right-panel/content-health-card").then((m) => ({ default: m.ContentHealthCard })),
  { ssr: false, loading: () => <SkeletonBox className="h-48" /> },
);

const AIWritingCoach = dynamic(
  () => import("@/components/right-panel/ai-writing-coach").then((m) => ({ default: m.AIWritingCoach })),
  { ssr: false, loading: () => <SkeletonBox className="h-64" /> },
);

// ─── Collapsible Section Header ────────────────────────────────────────────

interface CollapsibleSectionConfig {
  id: string;
  title: string;
  icon: React.ElementType;
  gradient: string;
  badgeText: string;
  badgeBg: string;
  badgeTextClass: string;
}

function CollapsibleSectionHeader({
  section,
  isOpen,
  onToggle,
}: {
  section: CollapsibleSectionConfig;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const Icon = section.icon;
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl border border-border/60 bg-card/80 hover:bg-muted/40 transition-colors cursor-pointer group hover-glow-violet"
    >
      <div className={`h-7 w-7 rounded-lg bg-gradient-to-br ${section.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
        <Icon className="h-3.5 w-3.5 text-white" />
      </div>
      <span className="text-xs font-semibold flex-1 text-left">{section.title}</span>
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border-0 ${section.badgeBg} ${section.badgeTextClass}`}>
        {section.badgeText}
      </span>
      <motion.div
        animate={{ rotate: isOpen ? 90 : 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </motion.div>
    </button>
  );
}

// ─── Animation Variants ─────────────────────────────────────────────────────

const fadeSlideIn = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.15 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const } },
};

// Smooth expand/collapse animation for workspace sections
const expandCollapse = {
  hidden: { opacity: 0, height: 0, marginTop: 0 },
  visible: { opacity: 1, height: 'auto', marginTop: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, height: 0, marginTop: 0, transition: { duration: 0.2 } },
};

// ─── Inline Engagement Bar ──────────────────────────────────────────────────
// Compact inline stats bar replacing the old full-width EngagementCard section.

const InlineEngagementBar = React.memo(function InlineEngagementBar({ post, isXHS }: { post: ReturnType<typeof useAppStore.getState>["contentPosts"][0]; isXHS: boolean }) {
  const updateContentPost = useAppStore((s) => s.updateContentPost);
  const [simulating, setSimulating] = useState(false);

  const hasData = (post.views || 0) > 0;
  const stats = [
    { icon: EyeIcon, label: "浏览", value: post.views || 0, color: "text-cyan-500" },
    { icon: ThumbsUp, label: "赞", value: post.likes || 0, color: "text-rose-500" },
    { icon: MessageSquare, label: "评论", value: post.comments || 0, color: "text-amber-500" },
    { icon: Repeat2, label: "转发", value: post.shares || 0, color: "text-emerald-500" },
    ...(isXHS ? [{ icon: Star, label: "收藏", value: post.favorites || 0, color: "text-violet-500" }] : []),
  ];

  const handleSimulate = async () => {
    setSimulating(true);
    const data = {
      views: Math.floor(Math.random() * 500) + 100,
      likes: Math.floor(Math.random() * 50) + 5,
      comments: Math.floor(Math.random() * 20),
      shares: Math.floor(Math.random() * 10),
      ...(isXHS ? { favorites: Math.floor(Math.random() * 30) + 2 } : {}),
    };
    try {
      const res = await fetch(`/api/content/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        updateContentPost(post.id, updated);
        toast.success("已生成模拟互动数据", { description: "浏览量、点赞、评论、转发数据已更新" });
      }
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2.5 flex-1">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="flex items-center gap-1">
              <Icon className={`h-3 w-3 ${s.color}`} />
              <span className="text-[11px] font-medium tabular-nums">{s.value || "—"}</span>
            </div>
          );
        })}
      </div>
      {!hasData && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-violet-600"
          onClick={handleSimulate}
          disabled={simulating}
        >
          {simulating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 mr-0.5" />}
          模拟数据
        </Button>
      )}
    </div>
  );
});

// ─── Status Border Color Map ─────────────────────────────────────────────────

const STATUS_BORDER_COLORS: Record<PostStatus, string> = {
  planned: "border-l-slate-400",
  generated: "border-l-violet-500",
  optimized: "border-l-emerald-500",
  published: "border-l-purple-500",
};

// ─── Main Component ─────────────────────────────────────────────────────────

// Sub-tabs for the tool panel below the editor
// Using a different visual style (underline-style) to differentiate from action buttons above
const TOOL_TABS = [
  { value: "ai", icon: Sparkles, label: "智能分析", color: "text-amber-500" },
  { value: "batch", icon: Bot, label: "批量操作", color: "text-violet-500" },
  { value: "schedule", icon: CalendarClock, label: "智能排期", color: "text-cyan-500" },
  { value: "publish", icon: Rocket, label: "发布管理", color: "text-emerald-500" },
  { value: "queue", icon: Layers, label: "发布队列", color: "text-purple-500" },
  { value: "workflow", icon: ClipboardList, label: "发布流程", color: "text-rose-500" },
  { value: "ai-workflow", icon: Bot, label: "AI工作流", color: "text-violet-500" },
  { value: "pipeline", icon: Layers, label: "内容流水线", color: "text-cyan-500" },
  { value: "writing", icon: Sparkles, label: "写作助手", color: "text-emerald-500" },
  { value: "history", icon: History, label: "版本记录", color: "text-violet-500" },
  { value: "inspiration", icon: Lightbulb, label: "爆款灵感", color: "text-orange-500" },
] as const;

type ToolTab = (typeof TOOL_TABS)[number]["value"];

export function ContentWorkspace() {
  const contentPosts = useAppStore((s) => s.contentPosts);
  const selectedPostId = useAppStore((s) => s.selectedPostId);
  const platform = useAppStore((s) => s.platform);
  const persona = useAppStore((s) => s.persona);
  const setAccountPanelOpen = useAppStore((s) => s.setAccountPanelOpen);
  const updateContentPost = useAppStore((s) => s.updateContentPost);
  const addNotification = useAppStore((s) => s.addNotification);

  const isXHS = platform === "xiaohongshu";
  const [previewMode, setPreviewMode] = useState(false);
  const [toolTab, setToolTab] = useState<ToolTab>("ai");
  const [tabTransitioning, setTabTransitioning] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    kanban: false,
    batch: false,
    health: false,
    coach: false,
  });
  const qualityScorerRef = useRef<HTMLDivElement>(null);

  const toggleSection = useCallback((id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // ── Auto-save draft to localStorage (survives page close) ─────────────────
  const selectedPost = useMemo(
    () => contentPosts.find((p) => p.id === selectedPostId) ?? null,
    [contentPosts, selectedPostId],
  );

  const draftData = useMemo(
    () => (selectedPost ? { id: selectedPost.id, content: selectedPost.content, title: selectedPost.title } : null),
    [selectedPost],
  );

  const { clearSaved, loadSaved } = useAutoSave({
    data: draftData,
    key: `draft-${selectedPostId ?? "none"}`,
    interval: 30_000,
    enabled: !!selectedPost,
  });

  // On mount / post change, check for recoverable draft
  const draftCheckedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedPost) return;
    const postId = selectedPost.id;
    if (draftCheckedRef.current === postId) return;
    draftCheckedRef.current = postId;

    const saved = loadSaved();
    if (!saved || typeof saved !== "object") return;

    const draft = saved as { id?: string; content?: string; title?: string };
    if (draft.id !== postId) return;

    // Only prompt if the draft differs from the current post content
    if (draft.content && draft.content !== selectedPost.content) {
      try {
        const metaKey = `autosave-draft-${postId}.__meta`;
        const meta = localStorage.getItem(metaKey);
        let timeLabel = "之前";
        if (meta) {
          const parsed = JSON.parse(meta) as { savedAt: string };
          timeLabel = formatRelativeTime(new Date(parsed.savedAt));
        }

        toast("检测到未保存的草稿", {
          description: `保存于 ${timeLabel}，是否恢复？`,
          duration: 15_000,
          action: {
            label: "恢复草稿",
            onClick: async () => {
              try {
                const res = await fetch(`/api/content/${postId}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ content: draft.content }),
                });
                if (res.ok) {
                  const updated = await res.json();
                  updateContentPost(postId, updated);
                  clearSaved();
                  toast.success("草稿已恢复");
                } else {
                  toast.error("恢复失败");
                }
              } catch {
                toast.error("恢复失败");
              }
            },
          },
          cancel: {
            label: "忽略",
            onClick: () => {
              clearSaved();
            },
          },
        });
      } catch {
        // ignore parsing errors
      }
    }
  }, [selectedPost, loadSaved, clearSaved, updateContentPost]);

  // Brief skeleton flash on tab change
  const handleToolTabChange = useCallback((newTab: ToolTab) => {
    if (newTab !== toolTab) {
      setTabTransitioning(true);
      setToolTab(newTab);
      setShowHistory(false);
      setTimeout(() => setTabTransitioning(false), 150);
    }
  }, [toolTab]);

  const personaName = persona?.name || "我";

  const handlePlatformConnect = useCallback(() => setAccountPanelOpen(true), [setAccountPanelOpen]);

  // Scroll to quality scorer section when score badge is clicked
  const handleScoreBadgeClick = useCallback(() => {
    setToolTab("ai");
    setPreviewMode(false);
    // Wait for the tab content to render, then scroll
    setTimeout(() => {
      qualityScorerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  // ── Template quick-start handler ────────────────────────────────────────
  const handleImportFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && selectedPost) {
        const res = await fetch(`/api/content/${selectedPost.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text }),
        });
        if (res.ok) {
          const updated = await res.json();
          updateContentPost(selectedPost.id, updated);
          toast.success("已从剪贴板导入内容");
        }
      } else {
        toast.error("剪贴板为空");
      }
    } catch {
      toast.error("无法读取剪贴板，请手动粘贴");
    }
  }, [selectedPost, updateContentPost]);

  // ── No post selected ─────────────────────────────────────────────────────
  if (!selectedPost) {
    return (
      <div className="flex-1 overflow-y-auto min-h-0">
        <WorkspaceEmptyState />
      </div>
    );
  }

  // ── Status-based border color ─────────────────────────────────────────────
  const statusBorderColor = STATUS_BORDER_COLORS[(selectedPost.status as PostStatus)] || "border-l-slate-400";

  // ── Post selected ────────────────────────────────────────────────────────
  return (
    <div className={`flex flex-col h-full min-h-0 relative border-l-2 ${statusBorderColor} transition-colors duration-300`}>
      {/* Floating Quick Actions Bar (top) */}
      <WorkspaceQuickBar
        onEdit={() => { setPreviewMode(false); }}
        onQualityScore={handleScoreBadgeClick}
      />

      {/* Floating AI Quick Actions Bar (bottom) */}
      <AIQuickActionsBar />

      {/* Floating Quick Actions Toolbar */}
      <QuickActionsToolbar />

      <div className="flex-1 overflow-y-auto min-h-0 workspace-scroll">
        <motion.div
          key={selectedPost.id}
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="p-4 space-y-3"
        >
          {/* ── Quick Actions Bar ───────────────────────────────────────── */}
          <motion.div variants={staggerItem} className="card-glow rounded-lg">
            <ContentQuickActions />
          </motion.div>

          {/* ── Header + engagement bar ─────────────────────────────────── */}
          <motion.div variants={staggerItem} className="space-y-2 card-glow rounded-lg p-3 -mx-3">
            <PostDetailHeader post={selectedPost} isXHS={isXHS} />
            <InlineEngagementBar post={selectedPost} isXHS={isXHS} />
          </motion.div>

          {/* ── Editor / Preview ─────────────────────────────────────────── */}
          <motion.div variants={staggerItem} className="card-shine rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <div className="inline-flex items-center rounded-full bg-muted/60 p-0.5">
                <Button
                  size="sm"
                  variant={!previewMode ? "secondary" : "ghost"}
                  className={`h-7 text-xs gap-1.5 rounded-full px-3 transition-all duration-200 hover:shadow-md ${!previewMode ? "shadow-sm" : "text-muted-foreground"}`}
                  onClick={() => setPreviewMode(false)}
                >
                  <Pencil className="h-3 w-3" />
                  编辑
                </Button>
                <Button
                  size="sm"
                  variant={previewMode ? "secondary" : "ghost"}
                  className={`h-7 text-xs gap-1.5 rounded-full px-3 transition-all duration-200 hover:shadow-md ${previewMode ? "shadow-sm" : "text-muted-foreground"}`}
                  onClick={() => setPreviewMode(true)}
                >
                  <Eye className="h-3 w-3" />
                  预览
                </Button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {!previewMode ? (
                <motion.div
                  key="editor"
                  variants={fadeSlideIn}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-3"
                >
                  <EnhancedContentEditor post={selectedPost} isXHS={isXHS} onScoreBadgeClick={handleScoreBadgeClick} />

                  {/* ── Quick Emoji Picker Row ─────────────────────────── */}
                  <div className="flex items-center gap-1">
                    <EmojiPicker
                      onSelect={(emoji) => {
                        toast.success("表情已复制", { duration: 800, description: emoji });
                      }}
                    />
                    <span className="text-[10px] text-muted-foreground ml-1">点击选择表情</span>
                  </div>

                  {/* ── Template Quick Start (shown when content is empty) ── */}
                  <AnimatePresence>
                    {!selectedPost.content && (
                      <motion.div
                        key="template-quick-start"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: "easeOut" as const }}
                        className="overflow-hidden"
                      >
                        <div className="pt-1">
                          <p className="text-[10px] text-muted-foreground mb-2 px-0.5">快速开始</p>
                          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
                            {/* Empty Start */}
                            <button
                              onClick={() => {/* just let user type */}}
                              className="flex-shrink-0 flex flex-col items-center gap-1.5 w-[72px] rounded-lg border border-border/60 bg-background p-2.5 hover:bg-muted/50 hover:border-border transition-colors"
                            >
                              <div className="h-8 w-8 rounded-lg bg-muted/80 flex items-center justify-center">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <span className="text-[10px] font-medium text-center leading-tight">空白开始</span>
                            </button>

                            {/* AI Generate */}
                            <button
                              onClick={() => {
                                // Trigger the optimize/generate flow via PostActions
                                toast.info("请使用下方 AI智能优化 按钮生成内容");
                              }}
                              className="flex-shrink-0 flex flex-col items-center gap-1.5 w-[72px] rounded-lg border border-violet-200/60 dark:border-violet-800/40 bg-violet-50/50 dark:bg-violet-950/20 p-2.5 hover:bg-violet-100/50 dark:hover:bg-violet-950/30 hover:border-violet-300/60 dark:hover:border-violet-700/50 transition-colors"
                            >
                              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                                <Lightbulb className="h-4 w-4 text-violet-500" />
                              </div>
                              <span className="text-[10px] font-medium text-center leading-tight text-violet-600 dark:text-violet-400">AI生成</span>
                            </button>

                            {/* Use Template */}
                            <button
                              onClick={() => {
                                toast.info("模板库功能开发中，敬请期待");
                              }}
                              className="flex-shrink-0 flex flex-col items-center gap-1.5 w-[72px] rounded-lg border border-border/60 bg-background p-2.5 hover:bg-muted/50 hover:border-border transition-colors"
                            >
                              <div className="h-8 w-8 rounded-lg bg-muted/80 flex items-center justify-center">
                                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <span className="text-[10px] font-medium text-center leading-tight">使用模板</span>
                            </button>

                            {/* Import from Clipboard */}
                            <button
                              onClick={handleImportFromClipboard}
                              className="flex-shrink-0 flex flex-col items-center gap-1.5 w-[72px] rounded-lg border border-border/60 bg-background p-2.5 hover:bg-muted/50 hover:border-border transition-colors"
                            >
                              <div className="h-8 w-8 rounded-lg bg-muted/80 flex items-center justify-center">
                                <Link2 className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <span className="text-[10px] font-medium text-center leading-tight">导入内容</span>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="card-shine rounded-lg">
                    <PostActions post={selectedPost} isXHS={isXHS} />
                  </div>

                  {/* ── Version History (inline collapsible below actions) ── */}
                  <ContentHistory post={selectedPost} />

                  {/* ── Quick Export Row ────────────────────────────────── */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">导出</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
                          <Download className="h-3 w-3" />
                          选择格式
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-44">
                        <DropdownMenuItem
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/export?format=csv');
                              if (res.ok) {
                                const blob = await res.blob();
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `export-${new Date().toISOString().slice(0, 10)}.csv`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                                toast.success('CSV导出成功', { description: '数据已下载到本地' });
                              }
                            } catch { toast.error('导出失败', { description: '请检查网络后重试' }); }
                          }}
                          className="gap-2 text-xs cursor-pointer"
                        >
                          <Table className="h-3.5 w-3.5 text-emerald-500" />
                          CSV（Excel）
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/export/report-image?period=month');
                              if (res.ok) {
                                const blob = await res.blob();
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `report-${new Date().toISOString().slice(0, 10)}.png`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                                toast.success('PNG报告已导出', { description: '运营报告图片已下载' });
                              }
                            } catch { toast.error('导出失败', { description: '请检查网络后重试' }); }
                          }}
                          className="gap-2 text-xs cursor-pointer"
                        >
                          <ImageIcon className="h-3.5 w-3.5 text-violet-500" />
                          PNG图片报告
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/export?format=json');
                              if (res.ok) {
                                const blob = await res.blob();
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `export-${new Date().toISOString().slice(0, 10)}.json`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                                toast.success('JSON导出成功', { description: '完整数据已下载到本地' });
                              }
                            } catch { toast.error('导出失败', { description: '请检查网络后重试' }); }
                          }}
                          className="gap-2 text-xs cursor-pointer"
                        >
                          <FileText className="h-3.5 w-3.5 text-amber-500" />
                          JSON数据
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="preview"
                  variants={fadeSlideIn}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  {isXHS ? (
                    <XiaohongshuPreview post={selectedPost} personaName={personaName} />
                  ) : (
                    <WeChatPreview post={selectedPost} personaName={personaName} />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <Separator />

          {/* ── Tool Tabs (underline style, distinct from action buttons) ──── */}
          <motion.div variants={staggerItem}>
            <Tabs value={toolTab} onValueChange={(v) => { handleToolTabChange(v as ToolTab); }}>
              {/* Underline-style tab bar — visually distinct from the pill buttons above */}
              <div className="relative flex items-center border-b border-border">
                {TOOL_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = toolTab === tab.value;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setToolTab(tab.value as ToolTab)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors relative ${
                        isActive
                          ? `text-foreground ${tab.color}`
                          : "text-muted-foreground hover:text-foreground/70"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {tab.label}
                      {isActive && (
                        <motion.div
                          layoutId="tool-tab-indicator"
                          className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-current"
                          transition={{ type: "spring", stiffness: 500, damping: 35 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* ── AI Tools Tab ──────────────────────────────────────────── */}
              <div className="mt-3 space-y-3 relative">
                {/* Tab transition skeleton flash */}
                <AnimatePresence>
                  {tabTransitioning && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.1 }}
                      className="absolute inset-0 z-10 bg-muted/30 backdrop-blur-[1px] rounded-lg loading-skeleton-shimmer"
                    />
                  )}
                </AnimatePresence>

                {toolTab === "ai" && (
                  <motion.div
                    key="ai-panel"
                    variants={expandCollapse}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="space-y-3"
                  >
                    {isXHS && <TitleABTest post={selectedPost} />}
                    <AIContentRewriter post={selectedPost} />
                    <div ref={qualityScorerRef}>
                      <QualityScorer post={selectedPost} />
                    </div>
                    <ContentSpellcheck post={selectedPost} />
                    <Separator className="my-1" />
                    <ContentHealthDashboard />
                  </motion.div>
                )}

                {/* ── Publish Tab ─────────────────────────────────────────── */}
                {toolTab === "schedule" && (
                  <motion.div
                    key="schedule-panel"
                    variants={expandCollapse}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="space-y-3"
                  >
                    <ContentScheduler />
                    <AIScheduleOptimizer />
                    <SchedulingAssistantEnhanced />
                    <Separator className="my-1" />
                    <AISchedulingAssistant />
                  </motion.div>
                )}

                {/* ── Publish Tab ─────────────────────────────────────────── */}
                {toolTab === "publish" && (
                  <motion.div
                    key="publish-panel"
                    variants={expandCollapse}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="space-y-3"
                  >
                    <PublishChecklist post={selectedPost} />
                    <ScheduledPublish post={selectedPost} />
                    <PublishingAssistant
                      post={selectedPost}
                      onPlatformConnect={handlePlatformConnect}
                    />
                    {isXHS && (
                      <>
                        <HashtagRecommender
                          postTopic={selectedPost.topic}
                          postContent={selectedPost.content}
                        />
                        <CoverImageGenerator
                          postTopic={selectedPost.topic}
                          postContent={selectedPost.content}
                        />
                      </>
                    )}
                  </motion.div>
                )}

                {/* ── Batch Operations Tab ─────────────────────────────── */}
                {toolTab === "batch" && (
                  <motion.div
                    key="batch-ops-panel"
                    variants={expandCollapse}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <AIBatchOperations />
                  </motion.div>
                )}

                {/* ── Publishing Queue Tab ─────────────────────────────── */}
                {toolTab === "queue" && (
                  <motion.div
                    key="publish-queue-panel"
                    variants={expandCollapse}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <PublishingQueue />
                  </motion.div>
                )}

                {/* ── Workflow Tab ──────────────────────────────────────── */}
                {toolTab === "workflow" && (
                  <motion.div
                    key="workflow-panel"
                    variants={expandCollapse}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <PublishWorkflow selectedPost={selectedPost} />
                  </motion.div>
                )}

                {/* ── History Tab ─────────────────────────────────────────── */}
                {toolTab === "history" && (
                  <motion.div
                    key="history-panel"
                    variants={expandCollapse}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <ContentHistory post={selectedPost} />
                  </motion.div>
                )}

                {/* ── AI Workflow Tab ────────────────────────────────────── */}
                {toolTab === "ai-workflow" && (
                  <motion.div
                    key="ai-workflow-panel"
                    variants={expandCollapse}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <ContentPipeline />
                  </motion.div>
                )}

                {/* ── Pipeline Tab ───────────────────────────────────────── */}
                {toolTab === "pipeline" && (
                  <motion.div
                    key="pipeline-panel"
                    variants={expandCollapse}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <ContentPipeline />
                  </motion.div>
                )}

                {/* ── Writing Assistant Tab ─────────────────────────────── */}
                {toolTab === "writing" && (
                  <motion.div
                    key="writing-panel"
                    variants={expandCollapse}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <AIWritingAssistantEnhanced />
                  </motion.div>
                )}

                {/* ── Inspiration Tab ─────────────────────────────────────── */}
                {toolTab === "inspiration" && (
                  <motion.div
                    key="inspiration-panel"
                    variants={expandCollapse}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <ViralInspiration />
                  </motion.div>
                )}
              </div>
            </Tabs>
          </motion.div>

          {/* ── Iteration 41: Collapsible Enhancement Sections ──────── */}
          <motion.div variants={staggerItem} className="space-y-2">
            <Separator className="my-1" />
            <p className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase px-1">
              高级工具
            </p>

            {/* 内容管线看板 */}
            <CollapsibleSectionHeader
              section={{
                id: "kanban",
                title: "内容管线看板",
                icon: Layers,
                gradient: "from-violet-500 to-purple-600",
                badgeText: `${contentPosts.length} 条`,
                badgeBg: "bg-violet-100 dark:bg-violet-900/30",
                badgeTextClass: "text-violet-600 dark:text-violet-400",
              }}
              isOpen={expandedSections.kanban}
              onToggle={() => toggleSection("kanban")}
            />
            <AnimatePresence>
              {expandedSections.kanban && (
                <motion.div
                  key="section-kanban"
                  variants={expandCollapse}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="overflow-hidden"
                >
                  <ContentPipelineKanban />
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI批量操作 */}
            <CollapsibleSectionHeader
              section={{
                id: "batch",
                title: "AI批量操作",
                icon: Bot,
                gradient: "from-amber-500 to-orange-500",
                badgeText: "5 项",
                badgeBg: "bg-amber-100 dark:bg-amber-900/30",
                badgeTextClass: "text-amber-600 dark:text-amber-400",
              }}
              isOpen={expandedSections.batch}
              onToggle={() => toggleSection("batch")}
            />
            <AnimatePresence>
              {expandedSections.batch && (
                <motion.div
                  key="section-batch"
                  variants={expandCollapse}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="overflow-hidden"
                >
                  <AISmartBatchPanel />
                </motion.div>
              )}
            </AnimatePresence>

            {/* 内容健康度 */}
            <CollapsibleSectionHeader
              section={{
                id: "health",
                title: "内容健康度",
                icon: Activity,
                gradient: "from-emerald-500 to-teal-600",
                badgeText: "5 维度",
                badgeBg: "bg-emerald-100 dark:bg-emerald-900/30",
                badgeTextClass: "text-emerald-600 dark:text-emerald-400",
              }}
              isOpen={expandedSections.health}
              onToggle={() => toggleSection("health")}
            />
            <AnimatePresence>
              {expandedSections.health && (
                <motion.div
                  key="section-health"
                  variants={expandCollapse}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="overflow-hidden"
                >
                  <ContentHealthCard />
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI写作教练 */}
            <CollapsibleSectionHeader
              section={{
                id: "coach",
                title: "AI写作教练",
                icon: Wand2,
                gradient: "from-rose-500 to-pink-600",
                badgeText: "6 维度",
                badgeBg: "bg-rose-100 dark:bg-rose-900/30",
                badgeTextClass: "text-rose-600 dark:text-rose-400",
              }}
              isOpen={expandedSections.coach}
              onToggle={() => toggleSection("coach")}
            />
            <AnimatePresence>
              {expandedSections.coach && (
                <motion.div
                  key="section-coach"
                  variants={expandCollapse}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="overflow-hidden"
                >
                  <AIWritingCoach />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Bottom spacing — extra room for floating bars */}
          <div className="h-20 sm:h-24" />
        </motion.div>
      </div>

      {/* Word Count Indicator */}
      <WordCountIndicator />
    </div>
  );
}
