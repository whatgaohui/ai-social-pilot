"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, Heart, MessageCircle, MoreHorizontal } from "lucide-react";
import type { ContentPost } from "@/types";

interface WeChatPreviewProps {
  post: ContentPost;
  personaName: string;
}

export function WeChatPreview({ post, personaName }: WeChatPreviewProps) {
  const timeAgo = "刚刚";

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-green-500/10 flex items-center justify-center">
            <Smartphone className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
          朋友圈预览
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {/* Phone frame */}
        <div className="mx-auto max-w-[320px] bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
          {/* Status bar */}
          <div className="bg-gray-100 dark:bg-gray-800 px-4 py-1 flex items-center justify-between">
            <span className="text-[9px] text-gray-500 dark:text-gray-400 font-medium">9:41</span>
            <div className="flex items-center gap-1">
              <div className="flex gap-0.5">
                <div className="h-1.5 w-0.5 bg-gray-500 dark:bg-gray-400 rounded-sm" />
                <div className="h-2 w-0.5 bg-gray-500 dark:bg-gray-400 rounded-sm" />
                <div className="h-2.5 w-0.5 bg-gray-500 dark:bg-gray-400 rounded-sm" />
                <div className="h-3 w-0.5 bg-gray-300 dark:bg-gray-600 rounded-sm" />
              </div>
              <div className="h-2 w-4 border border-gray-500 dark:border-gray-400 rounded-sm relative">
                <div className="absolute inset-0.5 bg-green-500 rounded-[1px]" style={{ width: "60%" }} />
              </div>
            </div>
          </div>

          {/* Cover area */}
          <div className="h-24 bg-gradient-to-br from-emerald-400 to-cyan-500 relative">
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="absolute bottom-2 right-3 flex items-center gap-1">
              <div className="w-5 h-5 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <MoreHorizontal className="h-3 w-3 text-white" />
              </div>
            </div>
          </div>

          {/* Post content area */}
          <div className="bg-gray-50 dark:bg-gray-900 px-3 py-3 min-h-[180px]">
            {/* Avatar + Name */}
            <div className="flex items-center gap-2 mb-2.5">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                {personaName.charAt(0)}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {personaName}
                  {post.status === "published" && (
                    <span className="ml-1 text-[10px] text-gray-400 normal-case">刚刚发布</span>
                  )}
                </div>
              </div>
              <div className="ml-auto">
                <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <MoreHorizontal className="h-3 w-3 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Post text */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-2.5 shadow-sm mb-2">
              <p className="text-[13px] leading-[1.6] text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                {post.content}
              </p>
              {post.topic && (
                <p className="text-[10px] text-gray-400 mt-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-700">
                  # {post.topic}
                </p>
              )}
            </div>

            {/* Image placeholder */}
            {(post.contentType === "image" || post.contentType === "mixed") && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-2 overflow-hidden">
                <div className="h-28 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl mb-1">📷</div>
                    <span className="text-[10px] text-gray-400">配图区域</span>
                  </div>
                </div>
              </div>
            )}

            {/* Video placeholder */}
            {post.contentType === "video" && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-2 overflow-hidden">
                <div className="h-36 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <div className="w-0 h-0 border-l-[8px] border-l-white border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent ml-0.5" />
                  </div>
                </div>
              </div>
            )}

            {/* Interaction bar */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm px-2.5 py-1.5 flex items-center gap-3">
              <div className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors cursor-pointer">
                <Heart className="h-4 w-4" />
                {post.likes > 0 && <span className="text-[11px]">{post.likes}</span>}
              </div>
              <div className="flex items-center gap-1 text-gray-400 hover:text-blue-500 transition-colors cursor-pointer">
                <MessageCircle className="h-4 w-4" />
                {post.comments > 0 && <span className="text-[11px]">{post.comments}</span>}
              </div>
            </div>
          </div>

          {/* Bottom nav indicator */}
          <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 flex items-center justify-around">
            {["微信", "通讯录", "发现", "我"].map((tab, i) => (
              <div key={tab} className="flex flex-col items-center gap-0.5">
                <div className={`h-4 w-4 rounded-sm ${i === 2 ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"}`} />
                <span className={`text-[8px] ${i === 2 ? "text-blue-500 font-medium" : "text-gray-400"}`}>{tab}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="flex items-center justify-center mt-3 gap-2 text-[10px] text-muted-foreground">
          <span>模拟预览，实际效果以微信为准</span>
        </div>
      </CardContent>
    </Card>
  );
}
