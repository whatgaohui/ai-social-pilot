"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  CalendarDays,
  Eye,
  Pencil,
  Sparkles,
  Rocket,
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
} from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/store/app-store";

import { PostDetailHeader } from "@/components/right-panel/post-detail-header";
import { ContentEditor } from "@/components/right-panel/content-editor";
import { PostActions } from "@/components/right-panel/post-actions";
import { WeChatPreview } from "@/components/right-panel/wechat-preview";
import { XiaohongshuPreview } from "@/components/right-panel/xiaohongshu-preview";
import { PublishingAssistant } from "@/components/right-panel/publishing-assistant";
// CrossPlatformPublish removed - feature simplified
import { HashtagRecommender } from "@/components/right-panel/hashtag-recommender";
import { CoverImageGenerator } from "@/components/right-panel/cover-image-generator";
import { TitleABTest } from "@/components/right-panel/title-ab-test";
import { QualityScorer } from "@/components/right-panel/quality-scorer";
import { ContentHistory } from "@/components/right-panel/content-history";

// ─── Animation Variants ─────────────────────────────────────────────────────

const fadeSlideIn = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" as const } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.15 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.03 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" as const } },
};

// ─── Inline Engagement Bar ──────────────────────────────────────────────────
// Compact inline stats bar replacing the old full-width EngagementCard section.

function InlineEngagementBar({ post, isXHS }: { post: ReturnType<typeof useAppStore.getState>["contentPosts"][0]; isXHS: boolean }) {
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
        toast.success("已生成模拟互动数据");
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
}

// ─── Empty State ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 flex items-center justify-center mb-4">
        <CalendarDays className="h-8 w-8 text-violet-500" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1.5">内容工作台</h3>
      <p className="text-sm text-muted-foreground max-w-[240px] leading-relaxed">
        从左侧日历中选择一个日期，即可开始编辑和发布内容
      </p>
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

// Sub-tabs for the tool panel below the editor
// Using a different visual style (underline-style) to differentiate from action buttons above
const TOOL_TABS = [
  { value: "ai", icon: Sparkles, label: "智能分析", color: "text-amber-500" },
  { value: "publish", icon: Rocket, label: "发布管理", color: "text-emerald-500" },
  { value: "history", icon: History, label: "版本记录", color: "text-violet-500" },
] as const;

type ToolTab = (typeof TOOL_TABS)[number]["value"];

export function ContentWorkspace() {
  const {
    contentPosts,
    selectedPostId,
    platform,
    persona,
    setAccountPanelOpen,
    updateContentPost,
    addNotification,
  } = useAppStore();

  const isXHS = platform === "xiaohongshu";
  const [previewMode, setPreviewMode] = useState(false);
  const [toolTab, setToolTab] = useState<ToolTab>("ai");
  const [showHistory, setShowHistory] = useState(false);
  const qualityScorerRef = useRef<HTMLDivElement>(null);

  const selectedPost = useMemo(
    () => contentPosts.find((p) => p.id === selectedPostId) ?? null,
    [contentPosts, selectedPostId],
  );

  const personaName = persona?.name || "我";

  const handlePlatformConnect = () => setAccountPanelOpen(true);

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
  const handleImportFromClipboard = async () => {
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
  };

  // ── No post selected ─────────────────────────────────────────────────────
  if (!selectedPost) {
    return (
      <div className="flex-1 overflow-y-auto min-h-0">
        <EmptyState />
      </div>
    );
  }

  // ── Post selected ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto min-h-0">
        <motion.div
          key={selectedPost.id}
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="p-4 space-y-3"
        >
          {/* ── Header + engagement bar ─────────────────────────────────── */}
          <motion.div variants={staggerItem} className="space-y-2">
            <PostDetailHeader post={selectedPost} isXHS={isXHS} />
            <InlineEngagementBar post={selectedPost} isXHS={isXHS} />
          </motion.div>

          {/* ── Editor / Preview ─────────────────────────────────────────── */}
          <motion.div variants={staggerItem}>
            <div className="flex items-center justify-center mb-2">
              <div className="inline-flex items-center rounded-full bg-muted/60 p-0.5">
                <Button
                  size="sm"
                  variant={!previewMode ? "secondary" : "ghost"}
                  className={`h-7 text-xs gap-1.5 rounded-full px-3 transition-all ${!previewMode ? "shadow-sm" : "text-muted-foreground"}`}
                  onClick={() => setPreviewMode(false)}
                >
                  <Pencil className="h-3 w-3" />
                  编辑
                </Button>
                <Button
                  size="sm"
                  variant={previewMode ? "secondary" : "ghost"}
                  className={`h-7 text-xs gap-1.5 rounded-full px-3 transition-all ${previewMode ? "shadow-sm" : "text-muted-foreground"}`}
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
                  <ContentEditor post={selectedPost} isXHS={isXHS} onScoreBadgeClick={handleScoreBadgeClick} />

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

                  <PostActions post={selectedPost} isXHS={isXHS} />
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
            <Tabs value={toolTab} onValueChange={(v) => { setToolTab(v as ToolTab); setShowHistory(false); }}>
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
              <div className="mt-3 space-y-3">
                {toolTab === "ai" && (
                  <motion.div
                    key="ai-panel"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3"
                  >
                    {isXHS && <TitleABTest post={selectedPost} />}
                    <div ref={qualityScorerRef}>
                      <QualityScorer post={selectedPost} />
                    </div>
                  </motion.div>
                )}

                {/* ── Publish Tab ─────────────────────────────────────────── */}
                {toolTab === "publish" && (
                  <motion.div
                    key="publish-panel"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3"
                  >
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

                {/* ── History Tab ─────────────────────────────────────────── */}
                {toolTab === "history" && (
                  <motion.div
                    key="history-panel"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ContentHistory post={selectedPost} />
                  </motion.div>
                )}
              </div>
            </Tabs>
          </motion.div>

          {/* Bottom spacing */}
          <div className="h-4" />
        </motion.div>
      </div>
    </div>
  );
}
