'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageCircle, Bookmark, Share2, TrendingUp } from 'lucide-react';

function fmt(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

interface Post {
  id: string;
  title: string;
  publishDate: string;
  likes: number;
  comments: number;
  collects: number;
  shares: number;
  category?: string;
  aiScore?: number;
}

export function ActivityTimeline({ posts }: { posts: Post[] }) {
  const recentPosts = posts.slice(0, 10);

  if (recentPosts.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-500" />最近笔记动态
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />

          <div className="space-y-3">
            {recentPosts.map((post) => {
              const engagement = post.likes + post.comments + post.collects + post.shares;
              return (
                <div key={post.id} className="relative pl-7">
                  {/* Timeline dot */}
                  <div className="absolute left-0.5 top-1.5 w-3 h-3 rounded-full bg-xhs-light border-2 border-background" />

                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{post.title || '无标题'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{post.publishDate}{post.category && ` · ${post.category}`}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        <Heart className="w-2.5 h-2.5 mr-0.5 text-pink-500" />
                        {fmt(post.likes)}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        <MessageCircle className="w-2.5 h-2.5 mr-0.5 text-blue-500" />
                        {fmt(post.comments)}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        <Bookmark className="w-2.5 h-2.5 mr-0.5 text-amber-500" />
                        {fmt(post.collects)}
                      </Badge>
                      {engagement > 0 && (
                        <span className="text-[10px] text-muted-foreground">{fmt(engagement)}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
