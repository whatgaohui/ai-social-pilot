'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { X, Heart, MessageCircle, Bookmark, Share2, Eye, Star, FileText, BarChart3, ChevronLeft, ChevronRight, Play } from 'lucide-react';

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
  videoUrl: string;
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
  detailScrapedAt: string | null;
}

export function NoteDetailModal({ accountId, noteId, open, onClose }: { accountId: string; noteId: string; open: boolean; onClose: () => void }) {
  const [detail, setDetail] = useState<NoteDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !noteId) return;
    setLoading(true);
    setDetail(null);
    fetch(`/api/accounts/${accountId}/notes?noteId=${noteId}`)
      .then((r) => r.json())
      .then((json) => { if (json.success) setDetail(json.data); })
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [accountId, noteId, open]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0">
        {/* Header */}
        <DialogHeader className="px-8 pt-6 pb-4">
          <DialogTitle className="flex items-center justify-between">
            <span className="text-lg font-bold">笔记详情</span>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7"><X className="w-4 h-4" /></Button>
          </DialogTitle>
        </DialogHeader>

        <div className="px-8 pb-8">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">加载中...</div>
          ) : detail ? (
            <>
              {/* Media: Video player or Image carousel */}
              <div className="rounded-xl border bg-muted/30 overflow-hidden mb-4">
                {detail.videoUrl ? (
                  <video
                    key={detail.videoUrl}
                    src={detail.videoUrl}
                    controls
                    className="w-full max-h-[28rem] bg-black"
                    preload="metadata"
                  />
                ) : detail.imageUrls.length > 0 ? (
                  <ImageCarousel images={detail.imageUrls} />
                ) : detail.coverUrl ? (
                  <div className="flex justify-center">
                    <img src={detail.coverUrl} alt={detail.title} className="max-h-[28rem] w-auto object-contain" />
                  </div>
                ) : null}
              </div>

              {/* Title + metadata */}
              <div className="mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs">{getTypeLabel(detail.postType)}</Badge>
                  {detail.category && <Badge variant="secondary" className="text-xs">{detail.category}</Badge>}
                  {detail.aiScore > 0 && (
                    <Badge className="text-xs bg-xhs-light/80 text-xhs border-0">
                      <Star className="w-3 h-3 mr-1" /> AI {Math.round(detail.aiScore)}
                    </Badge>
                  )}
                </div>
                <h4 className="text-lg font-bold mt-2">{detail.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{detail.publishDate}{detail.publishTime && ` ${detail.publishTime}`}</p>
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-4">
                {[
                  { icon: Eye, label: '浏览', value: fmt(detail.views), color: 'text-muted-foreground' },
                  { icon: Heart, label: '点赞', value: fmt(detail.likes), color: 'text-pink-500' },
                  { icon: MessageCircle, label: '评论', value: fmt(detail.comments), color: 'text-blue-500' },
                  { icon: Bookmark, label: '收藏', value: fmt(detail.collects), color: 'text-amber-500' },
                  { icon: Share2, label: '分享', value: fmt(detail.shares), color: 'text-emerald-500' },
                  { icon: BarChart3, label: '互动率', value: detail.engagementRate > 0 ? `${detail.engagementRate.toFixed(1)}%` : '—', color: 'text-xhs' },
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <div key={m.label} className="p-3 bg-muted/50 rounded-xl text-center">
                      <Icon className={`w-5 h-5 mx-auto mb-1.5 ${m.color}`} />
                      <p className="text-base font-bold">{m.value}</p>
                      <p className="text-[10px] text-muted-foreground">{m.label}</p>
                    </div>
                  );
                })}
              </div>

              {/* Engagement bar */}
              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-2">互动分布</p>
                <div className="flex items-center gap-3">
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
                        <div className="h-2.5 rounded-full bg-muted/50 overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${item.color}`} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[10px] text-center text-muted-foreground mt-1">{item.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tags */}
              {detail.tags.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2">标签</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Content */}
              {detail.content && (
                <>
                  <Separator className="mb-4" />
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />内容
                    </p>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap bg-muted/30 p-4 rounded-xl">
                      {detail.content}
                    </div>
                  </div>
                </>
              )}

              {/* AI analysis */}
              {detail.aiAnalysis && (
                <>
                  <Separator className="mb-4" />
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-500" />AI 分析
                    </p>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap bg-xhs-light/5 p-4 rounded-xl">
                      {detail.aiAnalysis}
                    </div>
                  </div>
                </>
              )}

              {/* Detail scrape status */}
              {detail.detailScrapedAt ? (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-200 dark:border-green-800">
                  <p className="text-xs text-green-700 dark:text-green-400">
                    ✅ 笔记详情已采集 · {new Date(detail.detailScrapedAt).toLocaleString('zh-CN')}
                  </p>
                </div>
              ) : (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    ⏳ 笔记详情待采集 — 仅列表页数据，正文/图片/视频需重新采集获取
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-muted-foreground">加载失败</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Image Carousel Component ─────────────────────────────────────────────

function ImageCarousel({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0);
  const go = (dir: number) => setIndex((prev) => (prev + dir + images.length) % images.length);

  return (
    <div className="relative">
      <div className="flex justify-center">
        <img
          key={images[index]}
          src={images[index]}
          alt={`图片 ${index + 1}`}
          className="max-h-[28rem] w-auto object-contain"
          loading="lazy"
        />
      </div>
      {images.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full h-8 w-8"
            onClick={() => go(-1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full h-8 w-8"
            onClick={() => go(1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${i === index ? 'bg-white w-4' : 'bg-white/50'}`}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        </>
      )}
      <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full">
        {index + 1} / {images.length}
      </div>
    </div>
  );
}
