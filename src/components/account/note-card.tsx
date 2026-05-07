import { Heart, Bookmark, Star, Clock, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

function fmt(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

interface NoteCardProps {
  post: {
    id: string;
    title: string;
    coverUrl: string;
    postType: string;
    likes: number;
    comments: number;
    collects: number;
    publishDate: string;
    category?: string;
    aiScore?: number;
    detailScrapedAt?: string | null;
    accountId?: string;
  };
  onClick: () => void;
  compact?: boolean;
  onPublishDateUpdate?: (postId: string, publishDate: string) => Promise<void>;
}

export function NoteCard({ post, onClick, compact = false, onPublishDateUpdate }: NoteCardProps) {
  const detailStatus = post.detailScrapedAt;
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentPublishDate, setCurrentPublishDate] = useState(post.publishDate);

  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);

    if (newDate && post.accountId && onPublishDateUpdate) {
      setIsUpdating(true);
      try {
        await onPublishDateUpdate(post.id, newDate);
        setCurrentPublishDate(newDate);
        setShowDatePicker(false);
      } catch (error) {
        console.error('Failed to update publish date:', error);
        alert('更新发布日期失败，请重试');
      } finally {
        setIsUpdating(false);
      }
    }
  };

  if (compact) {
    return (
      <div
        className="flex gap-3 p-2 rounded-xl border border-border hover:border-xhs/30 hover:bg-muted/30 transition-all cursor-pointer"
        onClick={onClick}
      >
        {post.coverUrl ? (
          <img src={post.coverUrl} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" loading="lazy" />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground text-xs">
            无封面
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium line-clamp-2">{post.title || '无标题'}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" /> {fmt(post.likes)}</span>
            <span>
              {currentPublishDate || (
                showDatePicker ? (
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={handleDateChange}
                    disabled={isUpdating}
                    className="w-auto h-5 px-1 text-xs border rounded bg-background focus:outline-none focus:ring-1 focus:ring-xhs"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDatePicker(true);
                    }}
                    className="flex items-center gap-1 text-muted-foreground hover:text-xhs transition-colors"
                  >
                    <Calendar className="w-3 h-3" />
                    <span>设置</span>
                  </button>
                )
              )}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-border overflow-hidden hover:border-xhs/30 hover:shadow-sm transition-all cursor-pointer group"
      onClick={onClick}
    >
      {post.coverUrl ? (
        <div className="relative aspect-[4/3]">
          <img src={post.coverUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
          {post.postType === 'video' && (
            <div className="absolute top-1.5 right-1.5 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
              ▶ 视频
            </div>
          )}
          {/* Detail scrape status badge */}
          {detailStatus !== undefined && (
            <div className="absolute top-1.5 left-1.5">
              {detailStatus ? (
                <div className="bg-green-600/90 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <CheckCircle2 className="w-3 h-3" />
                  {fmtDate(detailStatus)}
                </div>
              ) : (
                <div className="bg-amber-500/90 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <AlertCircle className="w-3 h-3" />
                  待采集
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="aspect-[4/3] bg-muted flex items-center justify-center">
          <span className="text-muted-foreground text-xs">无封面</span>
        </div>
      )}
      <div className="p-2">
        <p className="text-sm font-medium line-clamp-2">{post.title || '无标题'}</p>
        <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
          <span>
            {currentPublishDate || (
              showDatePicker ? (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  disabled={isUpdating}
                  className="w-auto h-6 px-1 text-xs border rounded bg-background focus:outline-none focus:ring-1 focus:ring-xhs"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDatePicker(true);
                  }}
                  className="flex items-center gap-1 text-muted-foreground hover:text-xhs transition-colors"
                >
                  <Calendar className="w-3 h-3" />
                  <span>设置日期</span>
                </button>
              )
            )}
          </span>
          <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {fmt(post.likes)}</span>
        </div>
      </div>
    </div>
  );
}
