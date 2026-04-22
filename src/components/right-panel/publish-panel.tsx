"use client";

import { motion } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Send } from "lucide-react";
import { PublishingAssistant } from "@/components/right-panel/publishing-assistant";
import { CrossPlatformPublish } from "@/components/right-panel/cross-platform-publish";
import { HashtagRecommender } from "@/components/right-panel/hashtag-recommender";
import { CoverImageGenerator } from "@/components/right-panel/cover-image-generator";
import { PublishToCalendar } from "@/components/right-panel/publish-to-calendar";

export function PublishPanel() {
  const {
    contentPosts, selectedPostId, platform,
    setAccountPanelOpen,
  } = useAppStore();
  const isXHS = platform === 'xiaohongshu';
  const selectedPost = contentPosts.find(p => p.id === selectedPostId);

  // No post selected - show empty state
  if (!selectedPost) {
    return (
      <div className="flex flex-col h-full">
        <ScrollArea className="flex-1 px-4 py-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-muted-foreground"
          >
            <Send className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-sm text-center">请先在日历中选择一条内容</p>
            <p className="text-xs mt-1 text-center">选中内容后即可使用发布工具</p>
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
          {/* AI Publishing Assistant */}
          <PublishingAssistant
            post={selectedPost}
            onPlatformConnect={() => setAccountPanelOpen(true)}
          />

          <Separator />

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

          <Separator />

          {/* Publish to Calendar - Collapsible in selected post view */}
          <PublishToCalendar isXHS={isXHS} mode="collapsible" />
        </motion.div>
      </ScrollArea>
    </div>
  );
}
