"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  MessageCircle,
  Star,
  Share2,
  Bookmark,
  MoreHorizontal,
  Play,
  ImageIcon,
} from "lucide-react";
import type { ContentPost } from "@/types";
import { parseXHSNote } from "@/types";

interface XiaohongshuPreviewProps {
  post: ContentPost;
  personaName: string;
}

export function XiaohongshuPreview({ post, personaName }: XiaohongshuPreviewProps) {
  const note = parseXHSNote(post.content);
  const favorites = (post as unknown as Record<string, unknown>).favorites as number || 0;

  const formatCount = (count: number): string => {
    if (count >= 10000) return `${(count / 10000).toFixed(1)}w`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count > 0 ? String(count) : "";
  };

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-red-500/10 flex items-center justify-center">
            <span className="text-red-500 text-xs font-bold">书</span>
          </div>
          小红书笔记预览
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

          {/* Xiaohongshu App Header */}
          <div className="bg-gradient-to-r from-red-500 to-rose-500 px-3 py-2.5 flex items-center gap-2">
            <span className="text-white text-[15px] font-bold tracking-wide">小红书</span>
            {/* Search bar placeholder */}
            <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full border border-white/60 flex items-center justify-center">
                <div className="h-1 w-0.5 bg-white/60 rounded-full rotate-45" />
              </div>
              <span className="text-[10px] text-white/70">搜索小红书</span>
            </div>
            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
              <MoreHorizontal className="h-3 w-3 text-white" />
            </div>
          </div>

          {/* Tab bar */}
          <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-3 py-1.5 flex items-center gap-4">
            <span className="text-[11px] font-semibold text-red-500 border-b-2 border-red-500 pb-1">关注</span>
            <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 pb-1">发现</span>
            <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 pb-1">附近</span>
          </div>

          {/* Note feed area */}
          <div className="bg-gray-50 dark:bg-gray-900 px-2.5 py-2.5">
            {/* Note Card - Two column layout */}
            <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm">
              <div className="flex gap-2.5 p-2.5">
                {/* Left - Cover Image (60% width) */}
                <div className="w-[58%] flex-shrink-0">
                  <div className="relative aspect-[3/4] rounded-lg overflow-hidden">
                    {post.contentType === "video" ? (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center">
                            <Play className="h-4 w-4 text-white fill-white ml-0.5" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-br from-rose-200 via-orange-100 to-amber-100 dark:from-rose-900/40 dark:via-orange-900/30 dark:to-amber-900/30" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                          <ImageIcon className="h-6 w-6 text-gray-400/60" />
                          <span className="text-[9px] text-gray-400/60">笔记配图</span>
                        </div>
                      </>
                    )}
                    {post.contentType === "video" && (
                      <div className="absolute top-1.5 left-1.5 bg-black/50 backdrop-blur-sm rounded px-1 py-0.5 flex items-center gap-0.5">
                        <Play className="h-2 w-2 text-white fill-white" />
                        <span className="text-[8px] text-white font-medium">视频</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right - Note Info */}
                <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
                  <div>
                    {/* Title */}
                    <h3 className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2 mb-2">
                      {note.title}
                    </h3>

                    {/* Author row */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="h-4 w-4 rounded-full bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-[7px] text-white font-bold">{personaName.charAt(0)}</span>
                      </div>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{personaName}</span>
                    </div>
                  </div>

                  {/* Interaction counts */}
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-0.5 text-gray-400">
                      <Heart className="h-3 w-3 fill-red-500 text-red-500" />
                      <span className="text-[9px]">{formatCount(post.likes)}</span>
                    </div>
                    <div className="flex items-center gap-0.5 text-gray-400">
                      <Star className="h-3 w-3 text-amber-500" />
                      <span className="text-[9px]">{formatCount(favorites)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom engagement bar */}
              <div className="border-t border-gray-50 dark:border-gray-700/50 px-2.5 py-1.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors cursor-pointer">
                    <Heart className="h-4 w-4" />
                    <span className="text-[10px]">{formatCount(post.likes)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400 hover:text-blue-500 transition-colors cursor-pointer">
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-[10px]">{formatCount(post.comments)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400 hover:text-amber-500 transition-colors cursor-pointer">
                    <Star className="h-4 w-4" />
                    <span className="text-[10px]">{formatCount(favorites)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer">
                    <Bookmark className="h-4 w-4" />
                  </div>
                  <div className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer">
                    <Share2 className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* Hashtags section */}
            {note.hashtags.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {note.hashtags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center text-[10px] font-medium text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-full px-2 py-0.5 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors cursor-pointer"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Body text preview */}
            {note.body && (
              <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3">
                {note.body}
              </div>
            )}
          </div>

          {/* Bottom nav bar */}
          <div className="bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 px-4 py-2 flex items-center justify-around">
            {[
              { label: "首页", active: true },
              { label: "购物", active: false },
              { label: "+", active: false, isCenter: true },
              { label: "消息", active: false },
              { label: "我", active: false },
            ].map((tab) =>
              tab.isCenter ? (
                <div
                  key={tab.label}
                  className="h-7 w-7 rounded-full bg-gradient-to-r from-red-500 to-rose-500 flex items-center justify-center shadow-md shadow-red-500/30"
                >
                  <span className="text-white text-sm font-bold leading-none">+</span>
                </div>
              ) : (
                <div key={tab.label} className="flex flex-col items-center gap-0.5">
                  <div
                    className={`h-4 w-4 rounded-sm ${tab.active ? "bg-red-500" : "bg-gray-300 dark:bg-gray-600"}`}
                  />
                  <span
                    className={`text-[8px] ${tab.active ? "text-red-500 font-medium" : "text-gray-400"}`}
                  >
                    {tab.label}
                  </span>
                </div>
              )
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex items-center justify-center mt-3 gap-2 text-[10px] text-muted-foreground">
          <span>模拟预览，实际效果以小红书为准</span>
        </div>
      </CardContent>
    </Card>
  );
}
