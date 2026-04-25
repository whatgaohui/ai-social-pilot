"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Bookmark, Star } from "lucide-react";
import type { XhsPostInfo } from "@/types";

interface PostCardProps {
  post: XhsPostInfo & { accountNickname?: string; accountAvatar?: string };
  onClick?: () => void;
  className?: string;
}

function formatNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + "万";
  if (num >= 1000) return (num / 1000).toFixed(1) + "k";
  return num.toString();
}

export function PostCard({ post, onClick, className }: PostCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md overflow-hidden",
        className
      )}
      onClick={onClick}
    >
      {/* Cover image */}
      <div className="aspect-[4/3] bg-muted relative overflow-hidden">
        {post.coverUrl ? (
          <img
            src={post.coverUrl}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <span className="text-4xl">📝</span>
          </div>
        )}
        {post.aiScore > 0 && (
          <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-400" />
            {post.aiScore.toFixed(0)}
          </div>
        )}
      </div>

      <CardContent className="p-3">
        <h3 className="text-sm font-medium line-clamp-2 mb-2 leading-snug">
          {post.title || "无标题"}
        </h3>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {post.tags.slice(0, 3).map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-xs px-1.5 py-0 h-5">
                {tag}
              </Badge>
            ))}
            {post.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
                +{post.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Engagement stats */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <Heart className="w-3 h-3" />
            {formatNumber(post.likes)}
          </span>
          <span className="flex items-center gap-0.5">
            <MessageCircle className="w-3 h-3" />
            {formatNumber(post.comments)}
          </span>
          <span className="flex items-center gap-0.5">
            <Bookmark className="w-3 h-3" />
            {formatNumber(post.collects)}
          </span>
        </div>

        {/* Publish date */}
        {post.publishDate && (
          <p className="text-xs text-muted-foreground mt-1.5">
            {post.publishDate.slice(0, 10)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
