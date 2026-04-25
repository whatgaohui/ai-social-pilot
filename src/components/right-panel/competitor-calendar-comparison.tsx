"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Layers,
  Clock,
  Eye,
  Heart,
  MessageSquare,
  Share2,
  Sparkles,
  Users,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CalendarEntry {
  date: string;
  ownPosts: PostEntry[];
  compPosts: PostEntry[];
  isOverlap: boolean;
}

interface PostEntry {
  id: string;
  topic: string;
  contentType: string;
  likes: number;
  comments: number;
  shares: number;
  source: "own" | "competitor";
  nickname?: string;
  platform?: string;
}

interface AnalysisResponse {
  competitors: Array<{
    id: string;
    nickname: string;
    platform: string;
    trendData: Array<{ date: string; postCount: number; engagementRate: number }>;
    topContent: Array<{
      id: string;
      topic: string;
      contentType: string;
      likes: number;
      comments: number;
      shares: number;
      scheduledDate: string;
    }>;
  }>;
  own: {
    trendData: Array<{ date: string; postCount: number; engagementRate: number }>;
  };
}

// ─── Constants ──────────────────────────────────────────────────────────────

const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

const CONTENT_TYPE_COLORS: Record<string, string> = {
  text: "bg-violet-200 dark:bg-violet-800 text-violet-700 dark:text-violet-200",
  image: "bg-emerald-200 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-200",
  video: "bg-rose-200 dark:bg-rose-800 text-rose-700 dark:text-rose-200",
  mixed: "bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-200",
  story: "bg-pink-200 dark:bg-pink-800 text-pink-700 dark:text-pink-200",
  insight: "bg-cyan-200 dark:bg-cyan-800 text-cyan-700 dark:text-cyan-200",
  interaction: "bg-orange-200 dark:bg-orange-800 text-orange-700 dark:text-orange-200",
  seeding: "bg-pink-200 dark:bg-pink-800 text-pink-700 dark:text-pink-200",
  review: "bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-200",
  tutorial: "bg-sky-200 dark:bg-sky-800 text-sky-700 dark:text-sky-200",
  drygoods: "bg-violet-200 dark:bg-violet-800 text-violet-700 dark:text-violet-200",
  vlog: "bg-teal-200 dark:bg-teal-800 text-teal-700 dark:text-teal-200",
  daily: "bg-orange-200 dark:bg-orange-800 text-orange-700 dark:text-orange-200",
  recommend: "bg-rose-200 dark:bg-rose-800 text-rose-700 dark:text-rose-200",
  collection: "bg-fuchsia-200 dark:bg-fuchsia-800 text-fuchsia-700 dark:text-fuchsia-200",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatNum(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function getDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ─── Post Detail Dialog ─────────────────────────────────────────────────────

function PostDetailCard({ post, onClose }: { post: PostEntry; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-lg border p-3 space-y-2 bg-muted/20"
    >
      <div className="flex items-center justify-between">
        <Badge
          className={`text-[9px] px-1.5 h-4 ${
            post.source === "own"
              ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border-0"
              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-0"
          }`}
        >
          {post.source === "own" ? "我" : post.nickname || "竞品"}
        </Badge>
        <button
          onClick={onClose}
          className="text-[10px] text-muted-foreground hover:text-foreground"
        >
          关闭
        </button>
      </div>
      <p className="text-xs font-medium">{post.topic || "未命名"}</p>
      <div className="flex items-center gap-1">
        <Badge className={`text-[8px] px-1.5 h-4 border-0 ${
          CONTENT_TYPE_COLORS[post.contentType] || "bg-muted text-muted-foreground"
        }`}>
          {post.contentType}
        </Badge>
        {post.platform && (
          <Badge className={`text-[8px] px-1.5 h-4 border-0 ${
            post.platform === "wechat"
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
          }`}>
            {post.platform === "wechat" ? "朋友圈" : "小红书"}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-0.5">
          <Heart className="h-2.5 w-2.5 text-rose-400" />
          {formatNum(post.likes)}
        </span>
        <span className="flex items-center gap-0.5">
          <MessageSquare className="h-2.5 w-2.5 text-amber-400" />
          {formatNum(post.comments)}
        </span>
        <span className="flex items-center gap-0.5">
          <Share2 className="h-2.5 w-2.5 text-emerald-400" />
          {formatNum(post.shares)}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Day Cell ───────────────────────────────────────────────────────────────

function DayCell({
  date,
  day,
  entry,
  onSelect,
}: {
  date: string;
  day: number;
  entry: CalendarEntry | undefined;
  onSelect: (date: string, entry: CalendarEntry | undefined) => void;
}) {
  const isToday = date === new Date().toISOString().slice(0, 10);
  const hasOwn = entry && entry.ownPosts.length > 0;
  const hasComp = entry && entry.compPosts.length > 0;
  const isOverlap = entry?.isOverlap;

  const bgClass = isOverlap
    ? "bg-gradient-to-br from-violet-100/60 to-emerald-100/60 dark:from-violet-900/20 dark:to-emerald-900/20"
    : hasOwn
      ? "bg-violet-50/80 dark:bg-violet-900/20"
      : hasComp
        ? "bg-emerald-50/60 dark:bg-emerald-900/15"
        : "bg-muted/20";

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            onClick={() => onSelect(date, entry)}
            className={`relative flex flex-col items-center p-1 rounded-lg transition-all hover:shadow-md border border-transparent hover:border-border/20 ${bgClass}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <span
              className={`text-[10px] font-medium ${
                isToday
                  ? "text-violet-600 dark:text-violet-400"
                  : "text-foreground/70"
              }`}
            >
              {day}
            </span>
            {isToday && (
              <span className="h-1 w-1 rounded-full bg-violet-500 mt-0.5" />
            )}
            <div className="flex gap-0.5 mt-0.5">
              {hasOwn && (
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              )}
              {hasComp && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              )}
            </div>
          </motion.button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-[10px] p-2 max-w-[220px]">
          <p className="font-semibold">{date}</p>
          {hasOwn && <p className="text-violet-600 dark:text-violet-400">我的发布 {entry.ownPosts.length} 条</p>}
          {hasComp && <p className="text-emerald-600 dark:text-emerald-400">竞品发布 {entry.compPosts.length} 条</p>}
          {isOverlap && <p className="text-amber-600 dark:text-amber-400 mt-0.5">⚡ 同日竞争</p>}
          {entry?.ownPosts.slice(0, 1).map((p) => (
            <p key={p.id} className="text-muted-foreground truncate mt-0.5">我: {p.topic || "未命名"}</p>
          ))}
          {entry?.compPosts.slice(0, 2).map((p) => (
            <p key={p.id} className="text-muted-foreground truncate">竞品: {p.topic || "未命名"}</p>
          ))}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── Calendar View (One Column) ─────────────────────────────────────────────

function CalendarMonth({
  year,
  month,
  entries,
  onDaySelect,
  selectedDate,
}: {
  year: number;
  month: number;
  entries: Map<string, CalendarEntry>;
  onDaySelect: (date: string, entry: CalendarEntry | undefined) => void;
  selectedDate: string | null;
}) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const cells: { day: number; date: string }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, date: getDateKey(year, month, d) });
  }

  // Fill blank cells before first day
  const blanks = Array.from({ length: firstDay }, (_, i) => ({ id: `blank-${i}`, isBlank: true }));
  // Days array
  const days = cells.map((c) => ({ id: c.date, ...c, isBlank: false }));

  return (
    <div className="space-y-2">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="text-center text-[9px] text-muted-foreground font-medium py-1">
            {label}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {blanks.map((b) => (
          <div key={b.id} />
        ))}
        {days.map((c, idx) => (
          <DayCell
            key={c.date}
            date={c.date}
            day={c.day}
            entry={entries.get(c.date)}
            onSelect={onDaySelect}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function CompetitorCalendarComparison() {
  const { platform } = useAppStore();
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<PostEntry | null>(null);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch("/api/competitor-analysis?period=quarter");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [platform]);

  // Build calendar entries
  const calendarEntries = useMemo(() => {
    const entryMap = new Map<string, CalendarEntry>();

    if (!data) return entryMap;

    // Add own posts
    if (data.own?.trendData) {
      data.own.trendData.forEach((d) => {
        const key = d.date;
        if (!entryMap.has(key)) {
          entryMap.set(key, { date: key, ownPosts: [], compPosts: [], isOverlap: false });
        }
        const entry = entryMap.get(key)!;
        for (let i = 0; i < (d.postCount || 0); i++) {
          entry.ownPosts.push({
            id: `own-${key}-${i}`,
            topic: `我的内容 ${i + 1}`,
            contentType: "text",
            likes: Math.round(d.engagementRate * 5 * (i + 1)),
            comments: Math.round(d.engagementRate * 2 * (i + 1)),
            shares: Math.round(d.engagementRate * (i + 1)),
            source: "own",
          });
        }
      });
    }

    // Add competitor posts
    data.competitors.forEach((comp) => {
      // From trendData
      comp.trendData.forEach((d) => {
        const key = d.date;
        if (!entryMap.has(key)) {
          entryMap.set(key, { date: key, ownPosts: [], compPosts: [], isOverlap: false });
        }
        const entry = entryMap.get(key)!;
        for (let i = 0; i < (d.postCount || 0); i++) {
          entry.compPosts.push({
            id: `${comp.id}-${key}-${i}`,
            topic: comp.nickname,
            contentType: "image",
            likes: Math.round(d.engagementRate * 8 * (i + 1)),
            comments: Math.round(d.engagementRate * 3 * (i + 1)),
            shares: Math.round(d.engagementRate * 1.5 * (i + 1)),
            source: "competitor",
            nickname: comp.nickname,
            platform: comp.platform,
          });
        }
      });

      // From topContent
      comp.topContent?.forEach((tc) => {
        const key = (tc.scheduledDate || "").slice(0, 10);
        if (!key) return;
        if (!entryMap.has(key)) {
          entryMap.set(key, { date: key, ownPosts: [], compPosts: [], isOverlap: false });
        }
        const entry = entryMap.get(key)!;
        entry.compPosts.push({
          id: tc.id,
          topic: tc.topic || "未命名",
          contentType: tc.contentType || "text",
          likes: tc.likes || 0,
          comments: tc.comments || 0,
          shares: tc.shares || 0,
          source: "competitor",
          nickname: comp.nickname,
          platform: comp.platform,
        });
      });
    });

    // Mark overlaps
    entryMap.forEach((entry) => {
      entry.isOverlap = entry.ownPosts.length > 0 && entry.compPosts.length > 0;
    });

    return entryMap;
  }, [data]);

  // Statistics
  const stats = useMemo(() => {
    const entries = Array.from(calendarEntries.values());
    const ownDays = entries.filter((e) => e.ownPosts.length > 0).length;
    const compDays = entries.filter((e) => e.compPosts.length > 0).length;
    const overlapDays = entries.filter((e) => e.isOverlap).length;
    const ownTotal = entries.reduce((s, e) => s + e.ownPosts.length, 0);
    const compTotal = entries.reduce((s, e) => s + e.compPosts.length, 0);
    return { ownDays, compDays, overlapDays, ownTotal, compTotal };
  }, [calendarEntries]);

  const navigateMonth = (dir: number) => {
    setCurrentMonth((prev) => {
      let m = prev.month + dir;
      let y = prev.year;
      if (m < 0) { m = 11; y--; }
      if (m > 11) { m = 0; y++; }
      return { year: y, month: m };
    });
    setSelectedDate(null);
    setSelectedPost(null);
  };

  const handleDaySelect = (date: string, entry: CalendarEntry | undefined) => {
    setSelectedDate(selectedDate === date ? null : date);
    setSelectedPost(null);
  };

  const selectedEntry = selectedDate ? calendarEntries.get(selectedDate) : undefined;
  const monthLabel = `${currentMonth.year}年${currentMonth.month + 1}月`;

  // Loading
  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 px-4 pt-3">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-amber-500/10 flex items-center justify-center">
              <Calendar className="h-3.5 w-3.5 text-amber-500" />
            </div>
            内容日历对比
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2 px-4 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Calendar className="h-3.5 w-3.5 text-white" />
            </div>
            内容日历对比
          </CardTitle>
          <Badge variant="secondary" className="text-[8px] h-4 px-1.5">
            {data?.competitors.length || 0} 个竞品
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "我发布", value: stats.ownTotal, unit: "条", color: "text-violet-500" },
            { label: "竞品发布", value: stats.compTotal, unit: "条", color: "text-emerald-500" },
            { label: "发布天数", value: stats.compDays, unit: "天", color: "text-amber-500" },
            { label: "竞争日", value: stats.overlapDays, unit: "天", color: "text-rose-500" },
          ].map((s) => (
            <div key={s.label} className="text-center p-1.5 rounded-md bg-muted/30">
              <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[8px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => navigateMonth(-1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs font-semibold">{monthLabel}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => navigateMonth(1)}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-violet-50 border border-violet-200 dark:bg-violet-900/20 dark:border-violet-800" />
            我的发布
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800" />
            竞品发布
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-br from-violet-100/60 to-emerald-100/60 border border-muted dark:from-violet-900/20 dark:to-emerald-900/20" />
            同日竞争
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="rounded-lg border p-2">
          <CalendarMonth
            year={currentMonth.year}
            month={currentMonth.month}
            entries={calendarEntries}
            onDaySelect={handleDaySelect}
            selectedDate={selectedDate}
          />
        </div>

        {/* Selected Day Detail */}
        <AnimatePresence mode="wait">
          {selectedDate && selectedEntry && (
            <motion.div
              key={selectedDate}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 overflow-hidden"
            >
              <Separator />
              <div className="flex items-center gap-2 text-xs font-semibold">
                <Eye className="h-3.5 w-3.5 text-violet-500" />
                {selectedDate} 内容详情
              </div>

              {/* Own posts */}
              {selectedEntry.ownPosts.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-[10px] text-violet-500 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                    我的发布 ({selectedEntry.ownPosts.length})
                  </div>
                  <div className="space-y-1">
                    {selectedEntry.ownPosts.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPost(selectedPost?.id === p.id ? null : p)}
                        className={`w-full text-left rounded-md p-2 transition-all ${
                          selectedPost?.id === p.id
                            ? "bg-violet-100/80 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800"
                            : "bg-muted/30 hover:bg-muted/50 border border-transparent"
                        }`}
                      >
                        <p className="text-[11px] font-medium truncate">{p.topic}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[9px] text-muted-foreground">
                          <Badge className={`text-[7px] px-1 h-3 border-0 ${CONTENT_TYPE_COLORS[p.contentType] || "bg-muted text-muted-foreground"}`}>
                            {p.contentType}
                          </Badge>
                          <span className="flex items-center gap-0.5">
                            <Heart className="h-2 w-2 text-rose-400" />
                            {formatNum(p.likes)}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <MessageSquare className="h-2 w-2 text-amber-400" />
                            {formatNum(p.comments)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Competitor posts */}
              {selectedEntry.compPosts.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    竞品发布 ({selectedEntry.compPosts.length})
                  </div>
                  <div className="space-y-1">
                    {selectedEntry.compPosts.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPost(selectedPost?.id === p.id ? null : p)}
                        className={`w-full text-left rounded-md p-2 transition-all ${
                          selectedPost?.id === p.id
                            ? "bg-emerald-100/80 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800"
                            : "bg-muted/30 hover:bg-muted/50 border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <p className="text-[11px] font-medium truncate flex-1">{p.topic}</p>
                          {p.nickname && p.nickname !== p.topic && (
                            <Badge className="text-[7px] px-1 h-3 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-0">
                              {p.nickname.length > 4 ? p.nickname.slice(0, 4) + "…" : p.nickname}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[9px] text-muted-foreground">
                          <Badge className={`text-[7px] px-1 h-3 border-0 ${CONTENT_TYPE_COLORS[p.contentType] || "bg-muted text-muted-foreground"}`}>
                            {p.contentType}
                          </Badge>
                          {p.platform && (
                            <Badge className={`text-[7px] px-1 h-3 border-0 ${
                              p.platform === "wechat"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                            }`}>
                              {p.platform === "wechat" ? "朋友圈" : "小红书"}
                            </Badge>
                          )}
                          <span className="flex items-center gap-0.5">
                            <Heart className="h-2 w-2 text-rose-400" />
                            {formatNum(p.likes)}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Share2 className="h-2 w-2 text-emerald-400" />
                            {formatNum(p.shares)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedEntry.ownPosts.length === 0 && selectedEntry.compPosts.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">当天无发布记录</p>
              )}

              {/* Post detail card */}
              <AnimatePresence>
                {selectedPost && (
                  <PostDetailCard
                    post={selectedPost}
                    onClose={() => setSelectedPost(null)}
                  />
                )}
              </AnimatePresence>

              {/* AI Insight */}
              {selectedEntry.isOverlap && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg bg-gradient-to-r from-violet-50 to-amber-50 dark:from-violet-950/20 dark:to-amber-950/20 border p-2.5"
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-medium">
                    <Sparkles className="h-3 w-3 text-violet-500" />
                    竞争洞察
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                    当天你和竞品均有内容发布，建议错开高峰时段，选择差异化内容策略以减少直接竞争。
                    {selectedEntry.compPosts.length > selectedEntry.ownPosts.length && (
                      <span className="text-rose-500 font-medium"> 竞品发布更密集，需注意内容质量。</span>
                    )}
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
