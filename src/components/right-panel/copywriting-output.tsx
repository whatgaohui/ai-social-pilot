"use client";

import { motion } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { FileText } from "lucide-react";
import { ABComparison } from "@/components/right-panel/ab-comparison";
import { HashtagRecommender } from "@/components/right-panel/hashtag-recommender";
import { CoverImageGenerator } from "@/components/right-panel/cover-image-generator";
import { TitleABTest } from "@/components/right-panel/title-ab-test";
import { CrossPlatformPublish } from "@/components/right-panel/cross-platform-publish";
import { QualityScorer } from "@/components/right-panel/quality-scorer";
import { ContentHistory } from "@/components/right-panel/content-history";
import { PostDetailHeader } from "@/components/right-panel/post-detail-header";
import { ContentEditor } from "@/components/right-panel/content-editor";
import { PostActions } from "@/components/right-panel/post-actions";
import { EngagementCard } from "@/components/right-panel/engagement-card";
import { PolishTool } from "@/components/right-panel/polish-tool";
import { FragmentTool } from "@/components/right-panel/fragment-tool";
import { PublishToCalendar } from "@/components/right-panel/publish-to-calendar";

export function CopywritingOutput() {
  const {
    contentPosts, selectedPostId,
    setSelectedPostId, platform,
  } = useAppStore();
  const isXHS = platform === 'xiaohongshu';

  const selectedPost = contentPosts.find(p => p.id === selectedPostId);

  // No post selected - show quick tools
  if (!selectedPost) {
    return (
      <div className="flex flex-col h-full">
        <ScrollArea className="flex-1 px-4 py-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Quick Polish Tool */}
            <PolishTool isXHS={isXHS} mode="standalone" />

            {/* Fragment to Copy */}
            <FragmentTool isXHS={isXHS} mode="standalone" />

            {/* Publish to Calendar */}
            <PublishToCalendar isXHS={isXHS} mode="standalone" />

            {/* Hint */}
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <FileText className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm text-center">点击日历中的日期查看文案详情</p>
              <p className="text-xs mt-1 text-center">选中某天的内容后可以查看、编辑和AI优化</p>
            </div>
          </motion.div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-4 py-4">
        <motion.div
          key={selectedPost.id}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          {/* Post Header */}
          <PostDetailHeader post={selectedPost} isXHS={isXHS} />

          {/* Content Area */}
          <ContentEditor post={selectedPost} isXHS={isXHS} />

          {/* Action Buttons */}
          <PostActions post={selectedPost} isXHS={isXHS} />

          <Separator />

          {/* Engagement Data (simulated) */}
          <EngagementCard post={selectedPost} isXHS={isXHS} />

          <Separator />

          {/* A/B Comparison Test */}
          <ABComparison post={selectedPost} />

          {/* Title A/B Test - Xiaohongshu only */}
          <TitleABTest post={selectedPost} />

          {/* Quality Scorer */}
          <QualityScorer post={selectedPost} />

          {/* Content Version History */}
          <ContentHistory post={selectedPost} />

          {/* Cross-Platform Publish */}
          <CrossPlatformPublish />

          {/* Hashtag Recommender - Xiaohongshu only */}
          {isXHS && (
            <HashtagRecommender
              postTopic={selectedPost.topic}
              postContent={selectedPost.content}
            />
          )}

          {/* Cover Image Generator - Xiaohongshu only */}
          {isXHS && (
            <CoverImageGenerator
              postTopic={selectedPost.topic}
              postContent={selectedPost.content}
            />
          )}

          {/* Quick Tools - Collapsible */}
          <PolishTool isXHS={isXHS} mode="collapsible" />
          <FragmentTool isXHS={isXHS} mode="collapsible" />

          {/* Publish to Calendar - Collapsible in selected post view */}
          <PublishToCalendar isXHS={isXHS} mode="collapsible" />

        </motion.div>
      </ScrollArea>
    </div>
  );
}
