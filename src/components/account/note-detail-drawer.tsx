'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { X, Heart, MessageCircle, Bookmark, Share2, Eye, Star, FileText, BarChart3 } from 'lucide-react';

function fmt(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

function getTypeLabel(type: string) {
  return type === 'video' ? '视频笔记' : '图文笔记';
}

interface NoteDetail {
  id: string;
  title: string;
  content: string;
  coverUrl: string;
  imageUrls: string[];
  postType: string;
  likes: number;
  comments: number;
  collects: number;
  shares: number;
  views: number;
  engagementRate: number;
  tags: string[];
  category: string;
  aiScore: number;
  aiAnalysis: string;
  publishDate: string;
  publishTime: string;
}

export function NoteDetailDrawer({ accountId, noteId, onClose }: { accountId: string; noteId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<NoteDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/accounts/${accountId}/notes?noteId=${noteId}`)
      .then((r) => r.json())
      .then((json) => { if (json.success) setDetail(json.data); })
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [accountId, noteId]);

  if (!detail && !loading) return null;

  return (
    <div className="flex flex-col h-full bg-background" onClick={(e) => e.stopPropagation()}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">笔记详情</h3>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">加载中...</div>
        ) : detail ? (
          <>
            {/* Cover */}
            {detail.coverUrl && (
              <div className="rounded-xl border bg-muted/30 overflow-hidden mb-4">
                <img src={detail.coverUrl} alt={detail.title} className="w-full max-h-64 object-contain" />
              </div>
            )}

            {/* Title */}
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">{getTypeLabel(detail.postType)}</Badge>
                {detail.category && <Badge variant="secondary" className="text-[10px]">{detail.category}</Badge>}
                {detail.aiScore > 0 && (
                  <Badge className="text-[10px] bg-xhs-light/80 text-xhs border-0">
                    <Star className="w-2.5 h-2.5 mr-0.5" /> AI {Math.round(detail.aiScore)}
                  </Badge>
                )}
              </div>
              <h4 className="text-base font-semibold mt-2">{detail.title}</h4>
              <p className="text-xs text-muted-foreground mt-1">{detail.publishDate}{detail.publishTime && ` ${detail.publishTime}`}</p>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="p-2 bg-muted/50 rounded-lg text-center">
                <Eye className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-sm font-semibold">{fmt(detail.views)}</p>
                <p className="text-[10px] text-muted-foreground">浏览</p>
              </div>
              <div className="p-2 bg-muted/50 rounded-lg text-center">
                <Heart className="w-4 h-4 mx-auto mb-1 text-pink-500" />
                <p className="text-sm font-semibold">{fmt(detail.likes)}</p>
                <p className="text-[10px] text-muted-foreground">点赞</p>
              </div>
              <div className="p-2 bg-muted/50 rounded-lg text-center">
                <MessageCircle className="w-4 h-4 mx-auto mb-1 text-blue-500" />
                <p className="text-sm font-semibold">{fmt(detail.comments)}</p>
                <p className="text-[10px] text-muted-foreground">评论</p>
              </div>
              <div className="p-2 bg-muted/50 rounded-lg text-center">
                <Bookmark className="w-4 h-4 mx-auto mb-1 text-amber-500" />
                <p className="text-sm font-semibold">{fmt(detail.collects)}</p>
                <p className="text-[10px] text-muted-foreground">收藏</p>
              </div>
              <div className="p-2 bg-muted/50 rounded-lg text-center">
                <Share2 className="w-4 h-4 mx-auto mb-1 text-emerald-500" />
                <p className="text-sm font-semibold">{fmt(detail.shares)}</p>
                <p className="text-[10px] text-muted-foreground">分享</p>
              </div>
              <div className="p-2 bg-muted/50 rounded-lg text-center">
                <BarChart3 className="w-4 h-4 mx-auto mb-1 text-xhs" />
                <p className="text-sm font-semibold">{detail.engagementRate > 0 ? `${detail.engagementRate.toFixed(1)}%` : '—'}</p>
                <p className="text-[10px] text-muted-foreground">互动率</p>
              </div>
            </div>

            {/* Engagement bar */}
            <div className="mb-4">
              <label className="text-xs text-muted-foreground mb-1.5 block">互动分布</label>
              <div className="flex items-center gap-2">
                {[
                  { label: '赞', value: detail.likes, color: 'bg-pink-500' },
                  { label: '评', value: detail.comments, color: 'bg-blue-500' },
                  { label: '藏', value: detail.collects, color: 'bg-amber-500' },
                  { label: '享', value: detail.shares, color: 'bg-emerald-500' },
                ].map((item) => {
                  const max = Math.max(detail.likes, detail.comments, detail.collects, detail.shares, 1);
                  const pct = Math.round((item.value / max) * 100);
                  return (
                    <div key={item.label} className="flex-1">
                      <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                        <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[10px] text-center text-muted-foreground mt-0.5">{item.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tags */}
            {detail.tags.length > 0 && (
              <div className="mb-4">
                <label className="text-xs text-muted-foreground mb-1.5 block">标签</label>
                <div className="flex flex-wrap gap-1.5">
                  {detail.tags.slice(0, 8).map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Content preview */}
            {detail.content && (
              <>
                <Separator className="mb-3" />
                <div className="mb-4">
                  <label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1">
                    <FileText className="w-3 h-3" />内容预览
                  </label>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground bg-muted/30 p-3 rounded-lg">
                    {detail.content}
                  </div>
                </div>
              </>
            )}

            {/* AI analysis */}
            {detail.aiAnalysis && (
              <div className="mb-4">
                <label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-500" />AI 分析
                </label>
                <div className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground bg-xhs-light/5 p-3 rounded-lg">
                  {detail.aiAnalysis}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-40 text-muted-foreground">加载失败</div>
        )}
      </div>
    </div>
  );
}
