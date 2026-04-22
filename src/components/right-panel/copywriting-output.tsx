"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { FileText, Eye, Pencil, ClipboardList } from "lucide-react";
import { PostDetailHeader } from "@/components/right-panel/post-detail-header";
import { ContentEditor } from "@/components/right-panel/content-editor";
import { PostActions } from "@/components/right-panel/post-actions";
import { EngagementCard } from "@/components/right-panel/engagement-card";
import { PolishTool } from "@/components/right-panel/polish-tool";
import { FragmentTool } from "@/components/right-panel/fragment-tool";
import { PublishToCalendar } from "@/components/right-panel/publish-to-calendar";
import { WeChatPreview } from "@/components/right-panel/wechat-preview";
import { XiaohongshuPreview } from "@/components/right-panel/xiaohongshu-preview";
import { EmptyState } from "@/components/ui/empty-state";

export function CopywritingOutput() {
  const {
    contentPosts, selectedPostId, platform, persona,
  } = useAppStore();
  const isXHS = platform === 'xiaohongshu';
  const selectedPost = contentPosts.find(p => p.id === selectedPostId);
  const personaName = persona?.name || "我";

  const [showPreview, setShowPreview] = useState(false);

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
            <EmptyState
              icon={FileText}
              title="点击日历中的日期查看文案详情"
              description="选中某天的内容后可以查看、编辑和AI优化"
              variant="muted"
              size="sm"
            />
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
          className={`space-y-4 card-accent-left card-shine rounded-r-lg p-1 pl-4 ${
            selectedPost.status === 'planned' ? 'border-l-gray-300 dark:border-l-gray-600' :
            selectedPost.status === 'generated' ? 'border-l-violet-500' :
            selectedPost.status === 'optimized' ? 'border-l-emerald-500' :
            selectedPost.status === 'published' ? 'border-l-emerald-500' :
            ''
          }`}
        >
          {/* Post Header with Preview Toggle */}
          <div className="flex items-center justify-between">
            <PostDetailHeader post={selectedPost} isXHS={isXHS} />
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-2"
            >
              {showPreview ? (
                <>
                  <Pencil className="h-3.5 w-3.5" />
                  编辑
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  预览
                </>
              )}
            </button>
          </div>

          {showPreview ? (
            /* Preview Mode */
            <>
              {isXHS ? (
                <XiaohongshuPreview post={selectedPost} personaName={personaName} />
              ) : (
                <WeChatPreview post={selectedPost} personaName={personaName} />
              )}
            </>
          ) : (
            /* Edit Mode */
            <>
              {/* Content Area */}
              <ContentEditor post={selectedPost} isXHS={isXHS} />

              {/* Action Buttons */}
              <PostActions post={selectedPost} isXHS={isXHS} />

              <Separator />

              {/* Engagement Data (simulated) */}
              <EngagementCard post={selectedPost} isXHS={isXHS} />
            </>
          )}
        </motion.div>
      </ScrollArea>
    </div>
  );
}
