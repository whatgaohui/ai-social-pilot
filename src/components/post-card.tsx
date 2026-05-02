"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Bookmark, Star, Clock, Eye } from "lucide-react";
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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "今天";
  if (diffDays === 1) return "昨天";
  if (diffDays < 7) return `${diffDays}天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${month}月${day}日`;
}

export function PostCard({ post, onClick, className }: PostCardProps) {
  // Calculate engagement score for visual indicator
  const totalEngagement = post.likes + post.comments + post.collects;
  const engagementLevel = totalEngagement > 10000 ? "hot" : totalEngagement > 1000 ? "warm" : "normal";

  return (
    <Card
      className={cn(
        "cursor-pointer card-glow overflow-hidden group active:scale-[0.97]",
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
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-xhs-light/60 via-muted to-muted/50">
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-3xl opacity-40">📝</span>
              <span className="text-[10px] text-muted-foreground/60">暂无封面</span>
            </div>
          </div>
        )}

        {/* Top badges row */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
          {/* AI Score badge */}
          {post.aiScore > 0 && (
            <div className="bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              {post.aiScore.toFixed(0)}
            </div>
          )}
          <div />
          {/* Engagement level indicator */}
          {engagementLevel === "hot" && (
            <div className="bg-xhs/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
              🔥 爆款
            </div>
          )}
          {engagementLevel === "warm" && (
            <div className="bg-amber-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
              📈 热门
            </div>
          )}
        </div>

        {/* Bottom gradient overlay with date */}
        {post.publishDate && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent pt-6 pb-2 px-2.5">
            <div className="flex items-center gap-1 text-white/90">
              <Clock className="w-3 h-3" />
              <span className="text-[10px] font-medium">{formatDate(post.publishDate)}</span>
            </div>
          </div>
        )}
      </div>

      <CardContent className="p-3 space-y-2">
        {/* Title */}
        <h3 className="text-sm font-medium line-clamp-2 leading-snug min-h-[2.5rem]">
          {post.title || "无标题"}
        </h3>

        {/* Content excerpt */}
        {post.content && (
          <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
            {post.content.slice(0, 50)}{post.content.length > 50 ? "..." : ""}
          </p>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.tags.slice(0, 2).map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0 h-[18px] border-0 bg-xhs-light/60 text-xhs/80 hover:bg-xhs-light">
                #{tag}
              </Badge>
            ))}
            {post.tags.length > 2 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-[18px] border-0 bg-muted/60">
                +{post.tags.length - 2}
              </Badge>
            )}
          </div>
        )}

        {/* Engagement stats with labels */}
        <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1 hover:text-red-500 transition-colors">
            <Heart className="w-3 h-3" />
            <span className="font-medium">{formatNumber(post.likes)}</span>
          </span>
          <span className="flex items-center gap-1 hover:text-emerald-500 transition-colors">
            <MessageCircle className="w-3 h-3" />
            <span className="font-medium">{formatNumber(post.comments)}</span>
          </span>
          <span className="flex items-center gap-1 hover:text-amber-500 transition-colors">
            <Bookmark className="w-3 h-3" />
            <span className="font-medium">{formatNumber(post.collects)}</span>
          </span>
          {post.shares > 0 && (
            <span className="flex items-center gap-1 ml-auto">
              <Eye className="w-3 h-3" />
              <span className="font-medium">{formatNumber(post.shares)}</span>
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
