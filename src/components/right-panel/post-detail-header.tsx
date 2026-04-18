"use client";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { ContentPost } from "@/types";
import {
  CONTENT_TYPE_LABELS, CONTENT_TYPE_COLORS, POST_STATUS_LABELS,
  XHS_CONTENT_TYPE_LABELS, XHS_CONTENT_TYPE_COLORS,
  ContentType, PostStatus, XHSContentType,
} from "@/types";
import { Calendar, Sparkles } from "lucide-react";

interface PostDetailHeaderProps {
  post: ContentPost;
  isXHS: boolean;
}

function getContentTypeColor(ct: string, isXHS: boolean) {
  if (isXHS) return XHS_CONTENT_TYPE_COLORS[ct as XHSContentType] || '';
  return CONTENT_TYPE_COLORS[ct as ContentType] || '';
}

function getContentTypeLabel(ct: string, isXHS: boolean) {
  if (isXHS) return XHS_CONTENT_TYPE_LABELS[ct as XHSContentType] || ct;
  return CONTENT_TYPE_LABELS[ct as ContentType] || ct;
}

export function PostDetailHeader({ post, isXHS }: PostDetailHeaderProps) {
  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>{post.scheduledDate}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={getContentTypeColor(post.contentType, isXHS)} variant="secondary">
            {getContentTypeLabel(post.contentType, isXHS)}
          </Badge>
          <Badge variant="outline">{POST_STATUS_LABELS[post.status as PostStatus]}</Badge>
          {post.generationType === "auto" && (
            <Badge variant="outline" className="text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800">
              <Sparkles className="h-3 w-3 mr-0.5" />
              AI生成
            </Badge>
          )}
          {post.aiScore > 0 && (
            <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800">
              ★ {post.aiScore}分
            </Badge>
          )}
        </div>
        <h3 className="text-base font-semibold">{post.topic}</h3>
      </div>

      <Separator />
    </>
  );
}
