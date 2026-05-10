'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ImageCarousel } from '@/components/ui/image-carousel';
import {
  BarChart3,
  Bookmark,
  ExternalLink,
  Eye,
  FileText,
  Heart,
  ImageOff,
  MessageCircle,
  Share2,
  Star,
  Video,
  X,
} from 'lucide-react';

function fmt(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString('zh-CN');
}

function getTypeLabel(type: string) {
  return type === 'video' ? '视频笔记' : '图文笔记';
}

function safeJsonText(value: string) {
  if (!value) return '';
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === 'string') return parsed;
    if (Array.isArray(parsed)) return parsed.join('\n');
    return JSON.stringify(parsed, null, 2);
  } catch {
    return value;
  }
}

interface NoteDetail {
  id: string;
  title: string;
  content: string;
  coverUrl: string;
  imageUrls: string[];
  imagePaths?: string[];
  videoUrl: string;
  videoPath?: string;
  videoThumbnail?: string;
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

export function NoteDetailModal({
  accountId,
  noteId,
  open,
  onClose,
}: {
  accountId: string;
  noteId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<NoteDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !noteId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setDetail(null);
    fetch(`/api/accounts/${accountId}/notes?noteId=${noteId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setDetail(json.data);
      })
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [accountId, noteId, open]);

  const mediaImages = useMemo(() => {
    if (!detail) return [];
    const merged = [...(detail.imagePaths || []), ...(detail.imageUrls || [])].filter(Boolean);
    return Array.from(new Set(merged));
  }, [detail]);

  const videoSource = detail?.videoPath || detail?.videoUrl || '';
  const coverSource = detail?.videoThumbnail || detail?.coverUrl || mediaImages[0] || '';
  const aiAnalysis = safeJsonText(detail?.aiAnalysis || '');

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent
        className="w-[min(96vw,1280px)] sm:max-w-[1280px] max-h-[92vh] overflow-hidden p-0"
        showCloseButton={false}
      >
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="flex items-center justify-between gap-4">
            <span className="text-lg font-semibold">笔记详情</span>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 shrink-0" aria-label="关闭">
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[calc(92vh-73px)] overflow-y-auto p-6">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-muted-foreground">正在加载笔记详情...</div>
          ) : detail ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_420px]">
              <section className="min-w-0">
                <div className="overflow-hidden rounded-lg border bg-muted/30">
                  {videoSource ? (
                    <video
                      key={videoSource}
                      src={videoSource}
                      poster={coverSource}
                      controls
                      className="h-[min(70vh,720px)] w-full bg-black object-contain"
                      preload="metadata"
                    />
                  ) : mediaImages.length > 0 ? (
                    <div className="[&_img]:max-h-[min(70vh,720px)] [&_img]:w-auto">
                      <ImageCarousel images={mediaImages} />
                    </div>
                  ) : coverSource ? (
                    <div className="flex h-[min(70vh,720px)] items-center justify-center bg-black">
                      <img src={coverSource} alt={detail.title} className="max-h-full w-auto object-contain" />
                    </div>
                  ) : (
                    <div className="flex h-[420px] flex-col items-center justify-center gap-2 text-muted-foreground">
                      <ImageOff className="h-10 w-10 opacity-50" />
                      <p className="text-sm">这条笔记还没有采集到图片或视频</p>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {videoSource && (
                    <Button variant="outline" size="sm" onClick={() => window.open(videoSource, '_blank')}>
                      <ExternalLink className="mr-1.5 h-4 w-4" />
                      打开视频源文件
                    </Button>
                  )}
                  {mediaImages.length > 0 && (
                    <Button variant="outline" size="sm" onClick={() => window.open(mediaImages[0], '_blank')}>
                      <ExternalLink className="mr-1.5 h-4 w-4" />
                      打开图片源文件
                    </Button>
                  )}
                </div>
              </section>

              <aside className="min-w-0 space-y-5">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{getTypeLabel(detail.postType)}</Badge>
                    {detail.category && <Badge variant="secondary">{detail.category}</Badge>}
                    {detail.aiScore > 0 && (
                      <Badge className="border-0 bg-xhs-light/80 text-xhs">
                        <Star className="mr-1 h-3 w-3" />
                        AI {Math.round(detail.aiScore)}
                      </Badge>
                    )}
                  </div>
                  <h2 className="break-words text-2xl font-semibold leading-snug">{detail.title || '未命名笔记'}</h2>
                  <p className="text-sm text-muted-foreground">
                    {detail.publishDate || '未知日期'}{detail.publishTime ? ` ${detail.publishTime}` : ''}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: Eye, label: '浏览', value: fmt(detail.views), color: 'text-muted-foreground' },
                    { icon: Heart, label: '点赞', value: fmt(detail.likes), color: 'text-pink-500' },
                    { icon: MessageCircle, label: '评论', value: fmt(detail.comments), color: 'text-blue-500' },
                    { icon: Bookmark, label: '收藏', value: fmt(detail.collects), color: 'text-amber-500' },
                    { icon: Share2, label: '分享', value: fmt(detail.shares), color: 'text-emerald-500' },
                    { icon: BarChart3, label: '互动率', value: detail.engagementRate > 0 ? `${detail.engagementRate.toFixed(1)}%` : '-', color: 'text-xhs' },
                  ].map((metric) => {
                    const Icon = metric.icon;
                    return (
                      <div key={metric.label} className="flex min-h-[86px] flex-col items-center justify-center rounded-lg bg-muted/50 p-3 text-center">
                        <Icon className={`mb-1 h-4 w-4 ${metric.color}`} />
                        <p className="max-w-full truncate text-base font-semibold leading-tight">{metric.value}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{metric.label}</p>
                      </div>
                    );
                  })}
                </div>

                <div>
                  <p className="mb-2 text-xs text-muted-foreground">互动分布</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: '赞', value: detail.likes, color: 'bg-pink-500' },
                      { label: '评', value: detail.comments, color: 'bg-blue-500' },
                      { label: '藏', value: detail.collects, color: 'bg-amber-500' },
                      { label: '享', value: detail.shares, color: 'bg-emerald-500' },
                    ].map((item) => {
                      const max = Math.max(detail.likes, detail.comments, detail.collects, detail.shares, 1);
                      const pct = Math.max(4, Math.round((item.value / max) * 100));
                      return (
                        <div key={item.label}>
                          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                            <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                          </div>
                          <p className="mt-1 text-center text-[11px] text-muted-foreground">{item.label}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {detail.tags.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs text-muted-foreground">标签</p>
                    <div className="flex flex-wrap gap-1.5">
                      {detail.tags.map((tag, index) => (
                        <Badge key={`${tag}-${index}`} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {detail.content && (
                  <>
                    <Separator />
                    <div>
                      <p className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <FileText className="h-3.5 w-3.5" />
                        正文
                      </p>
                      <div className="max-h-52 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-muted/30 p-3 text-sm leading-6">
                        {detail.content}
                      </div>
                    </div>
                  </>
                )}

                {aiAnalysis && (
                  <>
                    <Separator />
                    <div>
                      <p className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="h-3.5 w-3.5 text-amber-500" />
                        AI 分析
                      </p>
                      <div className="max-h-52 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-xhs-light/5 p-3 text-sm leading-6">
                        {aiAnalysis}
                      </div>
                    </div>
                  </>
                )}

                <div className={`rounded-lg border p-3 ${detail.detailScrapedAt ? 'border-green-200 bg-green-50 text-green-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                  <p className="text-xs">
                    {detail.detailScrapedAt
                      ? `详情已采集：${new Date(detail.detailScrapedAt).toLocaleString('zh-CN')}`
                      : '详情未完整采集。如果视频或正文缺失，请重新抓取该账号。'}
                  </p>
                </div>

                {detail.postType === 'video' && !videoSource && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-700">
                    <Video className="mt-0.5 h-4 w-4 shrink-0" />
                    <p className="text-xs leading-5">这条笔记被识别为视频笔记，但当前没有拿到可播放的视频源文件。请重新采集后再检查。</p>
                  </div>
                )}
              </aside>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-muted-foreground">笔记详情加载失败</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
