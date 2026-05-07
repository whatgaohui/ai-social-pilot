'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { CalendarDays, Plus, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { XhsPostInfo } from '@/types';
import { toast } from 'sonner';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];
const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const NOTES_PER_PAGE = 20;

interface CalendarTabProps {
  accountId: string | null;
  onNoteClick: (noteId: string) => void;
  onCreateClick: () => void;
}

export function CalendarTab({ accountId, onNoteClick, onCreateClick }: CalendarTabProps) {
  const [posts, setPosts] = useState<XhsPostInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [notePage, setNotePage] = useState(0);
  const [noteSearch, setNoteSearch] = useState('');

  useEffect(() => {
    if (!accountId) return;
    setLoading(true);
    fetch(`/api/accounts/${accountId}/calendar`)
      .then(r => r.json())
      .then(data => { if (data.success && data.data) setPosts(data.data); })
      .catch(() => toast.error('加载笔记数据失败'))
      .finally(() => setLoading(false));
  }, [accountId]);

  const postsByDate = useMemo(() => {
    const map = new Map<string, XhsPostInfo[]>();
    for (const p of posts) {
      if (p.publishDate) {
        const key = p.publishDate.slice(0, 10);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(p);
      }
    }
    return map;
  }, [posts]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (number | null)[] = [];
    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);
    return { year, month, days };
  }, [currentMonth]);

  const prevMonth = () => setCurrentMonth(new Date(calendarDays.year, calendarDays.month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(calendarDays.year, calendarDays.month + 1, 1));

  const formatDate = (d: number) => {
    const y = calendarDays.year;
    const m = String(calendarDays.month + 1).padStart(2, '0');
    const day = String(d).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const engagementByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of posts) {
      if (p.publishDate) {
        const key = p.publishDate.slice(0, 10);
        const eng = (p.likes || 0) + (p.comments || 0) + (p.collects || 0) + (p.shares || 0);
        map.set(key, (map.get(key) || 0) + eng);
      }
    }
    return map;
  }, [posts]);

  const selectedDatePosts = selectedDate ? (postsByDate.get(selectedDate) || []) : [];

  const filteredNotes = useMemo(() => {
    if (!noteSearch.trim()) return posts;
    const q = noteSearch.toLowerCase();
    return posts.filter(p =>
      (p.title || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    );
  }, [posts, noteSearch]);

  const totalPages = Math.ceil(filteredNotes.length / NOTES_PER_PAGE);
  const pagedNotes = filteredNotes.slice(notePage * NOTES_PER_PAGE, (notePage + 1) * NOTES_PER_PAGE);

  const monthPostsCount = posts.filter(p => {
    if (!p.publishDate) return false;
    const d = new Date(p.publishDate);
    return d.getFullYear() === calendarDays.year && d.getMonth() === calendarDays.month;
  }).length;

  const monthActiveDays = new Set(posts.filter(p => {
    if (!p.publishDate) return false;
    const d = new Date(p.publishDate);
    return d.getFullYear() === calendarDays.year && d.getMonth() === calendarDays.month;
  }).map(p => p.publishDate.slice(0, 10))).size;

  if (loading) {
    return (
      <div className="flex gap-4 min-h-[420px]">
        <div className="w-72 flex-shrink-0"><Skeleton className="h-72 rounded-xl" /></div>
        <div className="flex-1"><Skeleton className="h-72 rounded-xl" /></div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="暂无笔记数据"
        description="采集账号后，笔记会展示在日历上"
        actionLabel="立即采集"
        onAction={() => toast.info('采集功能待实现')}
      />
    );
  }

  return (
    <div className="flex gap-4 min-h-[420px]">
      {/* Left: Compact Calendar */}
      <div className="w-72 flex-shrink-0">
        <Card className="sticky top-0">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <button onClick={prevMonth} className="p-1 rounded hover:bg-muted">
                <CalendarDays className="w-3.5 h-3.5" style={{ display: 'none' }} />
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <span className="font-bold text-sm">{calendarDays.year}年 {MONTH_NAMES[calendarDays.month]}</span>
              <button onClick={nextMonth} className="p-1 rounded hover:bg-muted">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {WEEKDAYS.map(d => (
                <div key={d} className="text-center text-[10px] text-muted-foreground py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {calendarDays.days.map((day, i) => {
                if (day === null) return <div key={i} className="h-8" />;
                const dateStr = formatDate(day);
                const dayPosts = postsByDate.get(dateStr) || [];
                const postCount = dayPosts.length;
                const dayEngagement = engagementByDate.get(dateStr) || 0;
                const isToday = dateStr === new Date().toISOString().slice(0, 10);
                const isSelected = dateStr === selectedDate;

                let dotColor = '';
                if (postCount > 0) {
                  if (dayEngagement > 1000) dotColor = 'bg-red-500';
                  else if (dayEngagement > 500) dotColor = 'bg-xhs-dark';
                  else if (dayEngagement > 100) dotColor = 'bg-xhs';
                  else dotColor = 'bg-xhs-light';
                }

                return (
                  <button
                    key={i}
                    onClick={() => { setSelectedDate(dateStr); setNotePage(0); }}
                    className={cn(
                      'flex flex-col items-center justify-center h-8 rounded-md text-xs transition-all',
                      isToday && 'bg-xhs/10 font-bold',
                      isSelected && 'bg-xhs-light/20 ring-1 ring-xhs',
                      postCount > 0 && 'hover:bg-muted/50',
                      postCount === 0 && 'hover:bg-muted/20'
                    )}
                  >
                    <span className="leading-none">{day}</span>
                    {postCount > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        <span className={cn('w-1 h-1 rounded-full', dotColor)} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Stats summary */}
            <div className="mt-3 pt-2 border-t text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>本月笔记</span>
                <span className="font-medium text-foreground">{monthPostsCount}篇</span>
              </div>
              <div className="flex justify-between">
                <span>有发布</span>
                <span className="font-medium text-foreground">{monthActiveDays}天</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right: Note list */}
      <div className="flex-1 min-w-0">
        <Card className="h-full">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold">
                  {selectedDate
                    ? `${selectedDate} · ${selectedDatePosts.length}篇`
                    : `全部笔记 (${posts.length}篇)`}
                </span>
                {selectedDate && (
                  <Button size="sm" variant="ghost" onClick={() => setSelectedDate(null)} className="h-6 text-xs">
                    查看全部
                  </Button>
                )}
              </div>
              <Button size="sm" onClick={() => onCreateClick()}>
                <Plus className="w-3.5 h-3.5 mr-1" />新建
              </Button>
            </div>
            {!selectedDate && (
              <div className="relative mt-1">
                <input
                  className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-ring pr-8"
                  placeholder="搜索笔记标题或分类..."
                  value={noteSearch}
                  onChange={(e) => { setNoteSearch(e.target.value); setNotePage(0); }}
                />
                {noteSearch && (
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => { setNoteSearch(''); setNotePage(0); }}>×</button>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent className="pt-2">
            {selectedDate && selectedDatePosts.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <CalendarDays className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">该日期暂无笔记</p>
              </div>
            )}
            {selectedDate && selectedDatePosts.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedDatePosts.map(post => (
                  <div
                    key={post.id}
                    className="group relative w-20 flex-shrink-0 border rounded-lg overflow-hidden cursor-pointer hover:ring-1 hover:ring-xhs-light transition-colors"
                    onClick={() => onNoteClick(post.id)}
                  >
                    <div className="relative w-20 h-20 bg-muted">
                      {post.coverUrl ? (
                        <img src={post.coverUrl} alt={post.title} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                          <FileText className="w-5 h-5 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] font-medium truncate px-1 py-0.5 leading-tight">{post.title || '无标题'}</p>
                  </div>
                ))}
              </div>
            )}
            {!selectedDate && (
              <>
                {pagedNotes.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {pagedNotes.map(post => (
                      <div
                        key={post.id}
                        className="group relative w-20 flex-shrink-0 border rounded-lg overflow-hidden cursor-pointer hover:ring-1 hover:ring-xhs-light transition-colors"
                        onClick={() => onNoteClick(post.id)}
                      >
                        <div className="relative w-20 h-20 bg-muted">
                          {post.coverUrl ? (
                            <img src={post.coverUrl} alt={post.title} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                              <FileText className="w-5 h-5 text-muted-foreground/40" />
                            </div>
                          )}
                          {post.aiScore > 0 && (
                            <div className="absolute top-0.5 right-0.5 bg-black/60 text-white text-[8px] font-medium px-1 py-0 rounded">
                              {Math.round(post.aiScore)}
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] font-medium truncate px-1 py-0.5 leading-tight">{post.title || '无标题'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <FileText className="w-8 h-8 mb-2 opacity-40" />
                    <p className="text-sm">未找到匹配的笔记</p>
                  </div>
                )}

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-4 pt-3 border-t">
                    <Button variant="outline" size="sm" disabled={notePage <= 0} onClick={() => setNotePage(p => p - 1)}>上一页</Button>
                    <span className="text-xs text-muted-foreground">{notePage + 1} / {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={notePage >= totalPages - 1} onClick={() => setNotePage(p => p + 1)}>下一页</Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
