"use client";

import { motion } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sparkles } from "lucide-react";
import { ABComparison } from "@/components/right-panel/ab-comparison";
import { TitleABTest } from "@/components/right-panel/title-ab-test";
import { QualityScorer } from "@/components/right-panel/quality-scorer";
import { ContentHistory } from "@/components/right-panel/content-history";
import { PolishTool } from "@/components/right-panel/polish-tool";
import { FragmentTool } from "@/components/right-panel/fragment-tool";
import { FormattingOptimizer } from "@/components/right-panel/formatting-optimizer";

export function AIOptimizePanel() {
  const {
    contentPosts, selectedPostId, platform,
    updateContentPost, addNotification,
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
            <Sparkles className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-sm text-center">请先在日历中选择一条内容</p>
            <p className="text-xs mt-1 text-center">选中内容后即可使用AI优化工具</p>
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
          {/* A/B Comparison Test */}
          <ABComparison post={selectedPost} />

          {/* Title A/B Test - Xiaohongshu only */}
          {isXHS && <TitleABTest post={selectedPost} />}

          {/* Quality Scorer */}
          <QualityScorer post={selectedPost} />

          {/* Content Version History */}
          <ContentHistory post={selectedPost} />

          <Separator />

          {/* Formatting Optimizer */}
          <FormattingOptimizer
            post={selectedPost}
            onApply={(formattedContent: string) => {
              updateContentPost(selectedPost.id, { content: formattedContent });
              addNotification({
                type: 'optimize',
                title: '排版优化已应用',
                description: isXHS ? '小红书笔记排版已优化' : '朋友圈文案排版已优化',
                postId: selectedPost.id,
              });
            }}
          />

          <Separator />

          {/* Quick Tools - Collapsible */}
          <PolishTool isXHS={isXHS} mode="collapsible" />
          <FragmentTool isXHS={isXHS} mode="collapsible" />
        </motion.div>
      </ScrollArea>
    </div>
  );
}
