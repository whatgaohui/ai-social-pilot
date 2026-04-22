"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CalendarDays,
  Eye,
  Pencil,
  ChevronDown,
  Rocket,
  TrendingUp,
  MessageSquare,
  Wand2,
  FileUp,
  CalendarPlus,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { useAppStore } from "@/store/app-store";

import { PostDetailHeader } from "@/components/right-panel/post-detail-header";
import { ContentEditor } from "@/components/right-panel/content-editor";
import { PostActions } from "@/components/right-panel/post-actions";
import { EngagementCard } from "@/components/right-panel/engagement-card";
import { PolishTool } from "@/components/right-panel/polish-tool";
import { FragmentTool } from "@/components/right-panel/fragment-tool";
import { PublishToCalendar } from "@/components/right-panel/publish-to-calendar";
import { WeChatPreview } from "@/components/right-panel/wechat-preview";
import { XiaohongshuPreview } from "@/components/right-panel/xiaohongshu-preview";
import { PublishingAssistant } from "@/components/right-panel/publishing-assistant";
import { CrossPlatformPublish } from "@/components/right-panel/cross-platform-publish";
import { HashtagRecommender } from "@/components/right-panel/hashtag-recommender";
import { CoverImageGenerator } from "@/components/right-panel/cover-image-generator";
import { ViralInspiration } from "@/components/right-panel/viral-inspiration";

// ─── Animation Variants ─────────────────────────────────────────────────────

const fadeSlideIn = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.2 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
};

// ─── Section Collapsible Wrapper ────────────────────────────────────────────

interface WorkspaceSectionProps {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  gradient: string;
  badge?: { text: string; className: string };
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function WorkspaceSection({
  id,
  title,
  subtitle,
  icon: Icon,
  gradient,
  badge,
  defaultOpen = false,
  children,
}: WorkspaceSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full">
        <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group/trigger">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`h-7 w-7 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}
              >
                <Icon className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">{title}</span>
                <span className="text-[10px] text-muted-foreground leading-tight">
                  {subtitle}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {badge && (
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 ${badge.className}`}
                >
                  {badge.text}
                </Badge>
              )}
              <motion.div
                animate={{ rotate: open ? 180 : 0 }}
                transition={{ duration: 0.25 }}
              >
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.25 }}
          className="space-y-2 mt-1"
        >
          {children}
        </motion.div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Empty State ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12 px-6 text-center"
    >
      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 flex items-center justify-center mb-4">
        <CalendarDays className="h-8 w-8 text-violet-500" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1.5">
        内容工作台
      </h3>
      <p className="text-sm text-muted-foreground max-w-[220px] leading-relaxed">
        从左侧日历中选择一个日期，即可开始编辑和管理内容
      </p>
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function ContentWorkspace() {
  const {
    contentPosts,
    selectedPostId,
    platform,
    persona,
    setAccountPanelOpen,
  } = useAppStore();

  const isXHS = platform === "xiaohongshu";
  const [previewMode, setPreviewMode] = useState(false);

  const selectedPost = useMemo(
    () => contentPosts.find((p) => p.id === selectedPostId) ?? null,
    [contentPosts, selectedPostId]
  );

  const personaName = persona?.name || "我";

  const handlePlatformConnect = () => {
    setAccountPanelOpen(true);
  };

  // ── No post selected: empty state + inspiration + tools ──────────────────
  if (!selectedPost) {
    return (
      <ScrollArea className="h-full">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="p-4 space-y-4"
        >
          <motion.div variants={staggerItem}>
            <EmptyState />
          </motion.div>

          {/* 灵感库 */}
          <motion.div variants={staggerItem}>
            <WorkspaceSection
              id="inspiration"
              title="灵感库"
              subtitle="标题公式、话题灵感、热门趋势"
              icon={Lightbulb}
              gradient="from-amber-500 to-orange-500"
              defaultOpen={false}
            >
              <div className="px-1 pb-2">
                <ViralInspiration />
              </div>
            </WorkspaceSection>
          </motion.div>

          {/* PolishTool - standalone */}
          <motion.div variants={staggerItem}>
            <PolishTool isXHS={isXHS} mode="standalone" />
          </motion.div>

          {/* FragmentTool - standalone */}
          <motion.div variants={staggerItem}>
            <FragmentTool isXHS={isXHS} mode="standalone" />
          </motion.div>
        </motion.div>
      </ScrollArea>
    );
  }

  // ── Post selected: main workspace ────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Scrollable content area */}
      <ScrollArea className="flex-1">
        <motion.div
          key={selectedPost.id}
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={staggerContainer}
          className="p-4 space-y-3"
        >
          {/* ── Header ─────────────────────────────────────────────────── */}
          <motion.div variants={staggerItem} className="space-y-3">
            <PostDetailHeader post={selectedPost} isXHS={isXHS} />

            {/* Preview toggle */}
            <div className="flex items-center justify-center">
              <div className="inline-flex items-center rounded-full bg-muted/60 p-0.5">
                <Button
                  size="sm"
                  variant={!previewMode ? "secondary" : "ghost"}
                  className={`h-7 text-xs gap-1.5 rounded-full px-3 transition-all ${
                    !previewMode
                      ? "shadow-sm"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setPreviewMode(false)}
                >
                  <Pencil className="h-3 w-3" />
                  编辑
                </Button>
                <Button
                  size="sm"
                  variant={previewMode ? "secondary" : "ghost"}
                  className={`h-7 text-xs gap-1.5 rounded-full px-3 transition-all ${
                    previewMode
                      ? "shadow-sm"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setPreviewMode(true)}
                >
                  <Eye className="h-3 w-3" />
                  预览
                </Button>
              </div>
            </div>
          </motion.div>

          {/* ── Editor / Preview ───────────────────────────────────────── */}
          <motion.div variants={staggerItem}>
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
                  <ContentEditor post={selectedPost} isXHS={isXHS} />
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
                    <XiaohongshuPreview
                      post={selectedPost}
                      personaName={personaName}
                    />
                  ) : (
                    <WeChatPreview
                      post={selectedPost}
                      personaName={personaName}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <Separator className="my-1" />

          {/* ── Collapsible Sections ───────────────────────────────────── */}
          <motion.div variants={staggerItem} className="space-y-2">
            {/* 1. 发布工具 */}
            <WorkspaceSection
              id="publish-tools"
              title="发布工具"
              subtitle="AI发布助手、跨平台同步"
              icon={Rocket}
              gradient="from-violet-500 to-purple-500"
            >
              <div className="space-y-2 px-1 pb-2">
                <PublishingAssistant
                  post={selectedPost}
                  onPlatformConnect={handlePlatformConnect}
                />
                <CrossPlatformPublish />

                {/* XHS-only tools */}
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
              </div>
            </WorkspaceSection>

            {/* 2. 灵感参考 */}
            <WorkspaceSection
              id="inspiration-ref"
              title="灵感参考"
              subtitle="标题公式、AI话题灵感"
              icon={Sparkles}
              gradient="from-amber-500 to-emerald-500"
            >
              <div className="px-1 pb-2">
                <ViralInspiration />
              </div>
            </WorkspaceSection>

            {/* 3. 互动数据 */}
            <WorkspaceSection
              id="engagement"
              title="互动数据"
              subtitle="浏览、点赞、评论、收藏"
              icon={MessageSquare}
              gradient="from-emerald-500 to-teal-500"
            >
              <div className="px-1 pb-2">
                <EngagementCard post={selectedPost} isXHS={isXHS} />
              </div>
            </WorkspaceSection>

            {/* 4. 润色工具 */}
            <WorkspaceSection
              id="polish"
              title="润色工具"
              subtitle="口水话一键润色优化"
              icon={Wand2}
              gradient="from-amber-500 to-orange-500"
            >
              <div className="px-1 pb-2">
                <PolishTool isXHS={isXHS} mode="collapsible" defaultOpen={true} />
              </div>
            </WorkspaceSection>

            {/* 5. 碎片转文案 */}
            <WorkspaceSection
              id="fragment"
              title="碎片转文案"
              subtitle="对话/经历/疑问转化为文案"
              icon={FileUp}
              gradient="from-sky-500 to-cyan-500"
            >
              <div className="px-1 pb-2">
                <FragmentTool isXHS={isXHS} mode="collapsible" defaultOpen={true} />
              </div>
            </WorkspaceSection>

            {/* 6. 发布到日历 */}
            <WorkspaceSection
              id="publish-calendar"
              title="发布到日历"
              subtitle="创建新内容到内容日历"
              icon={CalendarPlus}
              gradient="from-emerald-500 to-teal-500"
            >
              <div className="px-1 pb-2">
                <PublishToCalendar
                  isXHS={isXHS}
                  mode="collapsible"
                  defaultOpen={true}
                />
              </div>
            </WorkspaceSection>
          </motion.div>

          {/* Bottom spacing for scroll comfort */}
          <div className="h-4" />
        </motion.div>
      </ScrollArea>
    </div>
  );
}
