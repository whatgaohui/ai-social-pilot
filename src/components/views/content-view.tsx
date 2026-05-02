"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/empty-state";
import { useAppStore } from "@/store/app-store";
import type { XhsAccountInfo, XhsPostInfo } from "@/types";
import { PostCard } from "@/components/post-card";
import { formatNumber } from "@/components/account-card";
import { cn } from "@/lib/utils";
import {
  FileText,
  Search,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Star,
  X,
  SlidersHorizontal,
  LayoutGrid,
  CalendarDays,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  PenLine,
  Sparkles,
  Filter,
  ArrowUpDown,
  Hash,
  Eye,
  Clock,
  Pencil,
  CheckCircle2,
  Plus,
} from "lucide-react";

type SortOption = "date" | "likes" | "comments" | "collects" | "aiScore";
type ViewMode = "grid" | "calendar" | "schedule";

// ─── Schedule Types ─────────────────────────────────────────────────────

type ScheduleStatus = "pending" | "published" | "draft";

interface ScheduledPost {
  id: string;
  postId?: string;
  title: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  accountId: string;
  status: ScheduleStatus;
  notes: string;
}

const POSTS_PER_PAGE = 12;

// ─── Helper: Date Grouping ──────────────────────────────────────────────

function getDateGroupLabel(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "今天";
  if (diffDays === 1) return "明天";
  if (diffDays > 1 && diffDays <= 6) return "本周";
  if (diffDays > 6 && diffDays <= 13) return "下周";
  return "更晚";
}

function getDateGroupOrder(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 0;
  if (diffDays === 1) return 1;
  if (diffDays > 1 && diffDays <= 6) return 2;
  if (diffDays > 6 && diffDays <= 13) return 3;
  return 4;
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const weekDays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return `${d.getMonth() + 1}月${d.getDate()}日 ${weekDays[d.getDay()]}`;
}

// ─── ContentCalendar Component ──────────────────────────────────────────

function ContentCalendar({
  posts,
  onPostClick,
  currentMonth,
  onPrevMonth,
  onNextMonth,
}: {
  posts: XhsPostInfo[];
  onPostClick: (post: XhsPostInfo) => void;
  currentMonth: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  const today = new Date();
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const postsByDate = useMemo(() => {
    const map: Record<string, XhsPostInfo[]> = {};
    for (const post of posts) {
      const dateStr = post.publishDate ? post.publishDate.slice(0, 10) : "";
      if (dateStr) {
        if (!map[dateStr]) map[dateStr] = [];
        map[dateStr].push(post);
      }
    }
    return map;
  }, [posts]);

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const totalCells = Math.ceil((startPad + daysInMonth) / 7) * 7;

  const monthLabel = `${year}年${month + 1}月`;
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];

  const cells: { day: number | null; dateStr: string; isToday: boolean }[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startPad + 1;
    if (dayNum < 1 || dayNum > daysInMonth) {
      cells.push({ day: null, dateStr: "", isToday: false });
    } else {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      cells.push({ day: dayNum, dateStr, isToday: dateStr === todayStr });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{monthLabel}</h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onPrevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => {}}>
            今天
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((d) => (
          <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          const dayPosts = cell.dateStr ? postsByDate[cell.dateStr] || [] : [];
          return (
            <div
              key={i}
              className={cn(
                "min-h-[72px] border border-border/50 rounded-lg p-1 transition-colors",
                cell.day === null && "bg-muted/20",
                cell.isToday && "bg-xhs-light/30 border-xhs/30",
                cell.day !== null && !cell.isToday && "bg-white dark:bg-neutral-950"
              )}
            >
              {cell.day !== null && (
                <>
                  <span
                    className={cn(
                      "text-xs font-medium inline-flex items-center justify-center w-5 h-5 rounded-full",
                      cell.isToday && "bg-xhs text-white"
                    )}
                  >
                    {cell.day}
                  </span>
                  <div className="mt-0.5 space-y-0.5">
                    {dayPosts.slice(0, 2).map((post) => (
                      <button
                        key={post.id}
                        className="w-full text-left text-[10px] leading-tight px-1 py-0.5 rounded bg-xhs/10 text-xhs hover:bg-xhs/20 transition-colors truncate"
                        onClick={() => onPostClick(post)}
                        title={post.title || "无标题"}
                      >
                        {post.title || "无标题"}
                      </button>
                    ))}
                    {dayPosts.length > 2 && (
                      <span className="text-[10px] text-muted-foreground px-1">
                        +{dayPosts.length - 2}更多
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Status Badge Component ─────────────────────────────────────────────

function ScheduleStatusBadge({ status }: { status: ScheduleStatus }) {
  const config: Record<ScheduleStatus, { label: string; className: string }> = {
    pending: {
      label: "待发布",
      className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50",
    },
    published: {
      label: "已发布",
      className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50",
    },
    draft: {
      label: "草稿",
      className: "bg-muted text-muted-foreground border-border",
    },
  };
  const { label, className } = config[status];
  return (
    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 font-medium border", className)}>
      {label}
    </Badge>
  );
}

// ─── Schedule Timeline Component ────────────────────────────────────────

function ScheduleTimeline({
  scheduledPosts,
  accounts,
  onEdit,
  onDelete,
  onMarkPublished,
}: {
  scheduledPosts: ScheduledPost[];
  accounts: (XhsAccountInfo & { postsCount?: number })[];
  onEdit: (post: ScheduledPost) => void;
  onDelete: (id: string) => void;
  onMarkPublished: (id: string) => void;
}) {
  // Group by date group
  const groupedPosts = useMemo(() => {
    const groups: Record<string, ScheduledPost[]> = {};
    const groupOrder: string[] = ["今天", "明天", "本周", "下周", "更晚"];

    for (const post of scheduledPosts) {
      const label = getDateGroupLabel(post.scheduledDate);
      if (!groups[label]) groups[label] = [];
      groups[label].push(post);
    }

    // Sort posts within each group by scheduledTime
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
    }

    // Return in order
    return groupOrder
      .filter((label) => groups[label])
      .map((label) => ({ label, posts: groups[label] }));
  }, [scheduledPosts]);

  const getAccount = useCallback(
    (accountId: string) => accounts.find((a) => a.id === accountId),
    [accounts]
  );

  const statusAccentColor = (status: ScheduleStatus) => {
    switch (status) {
      case "pending":
        return "border-l-amber-400 dark:border-l-amber-500";
      case "published":
        return "border-l-emerald-400 dark:border-l-emerald-500";
      case "draft":
        return "border-l-muted-foreground/40";
    }
  };

  const dotColor = (status: ScheduleStatus) => {
    switch (status) {
      case "pending":
        return "bg-amber-400 dark:bg-amber-500";
      case "published":
        return "bg-emerald-400 dark:bg-emerald-500";
      case "draft":
        return "bg-muted-foreground/50";
    }
  };

  if (scheduledPosts.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="暂无排期内容"
        description="点击「新建排期」按钮，为笔记安排发布时间"
        className="py-12"
      />
    );
  }

  return (
    <div className="space-y-0">
      {groupedPosts.map((group, gi) => (
        <div key={group.label} className="relative">
          {/* Sticky Date Group Header */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50 py-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{group.label}</span>
              {group.label === "今天" && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-xhs-light/60 text-xhs border-0">
                  {group.posts.length}篇
                </Badge>
              )}
              {group.label !== "今天" && group.posts.length > 0 && (
                <span className="text-[10px] text-muted-foreground">{group.posts.length}篇</span>
              )}
              {group.posts.length > 0 && group.label !== "今天" && group.label !== "明天" && (
                <span className="text-[10px] text-muted-foreground">
                  · {formatDateDisplay(group.posts[0].scheduledDate)}
                </span>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="relative ml-4">
            {/* Vertical line */}
            <div className="absolute left-[7px] top-0 bottom-0 w-px bg-border/70" />

            <div className="space-y-2 pb-4">
              {group.posts.map((post) => {
                const account = getAccount(post.accountId);
                return (
                  <div key={post.id} className="relative pl-7 group">
                    {/* Timeline dot */}
                    <div
                      className={cn(
                        "absolute left-0 top-3.5 w-[15px] h-[15px] rounded-full border-[2.5px] border-background z-[1]",
                        dotColor(post.status)
                      )}
                    />

                    {/* Content Card */}
                    <div
                      className={cn(
                        "rounded-lg border border-border/60 bg-white dark:bg-neutral-950 p-3 transition-all duration-200",
                        "hover:shadow-md hover:border-border",
                        "border-l-[3px]",
                        statusAccentColor(post.status)
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {/* Time + Status */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {post.scheduledTime}
                            </span>
                            <ScheduleStatusBadge status={post.status} />
                          </div>

                          {/* Title */}
                          <p className="text-sm font-medium truncate mb-1">
                            {post.title}
                          </p>

                          {/* Account + Notes */}
                          <div className="flex items-center gap-2">
                            {account && (
                              <div className="flex items-center gap-1.5">
                                <Avatar size="sm">
                                  <AvatarImage src={account.avatarUrl} alt={account.nickname} />
                                  <AvatarFallback className="bg-xhs-light text-xhs text-[8px]">
                                    {(account.nickname || "用").slice(0, 1)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-[11px] text-muted-foreground truncate max-w-[80px]">
                                  {account.nickname || "未命名"}
                                </span>
                              </div>
                            )}
                            {post.notes && (
                              <span className="text-[11px] text-muted-foreground/70 truncate max-w-[120px]">
                                · {post.notes}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          {post.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                              onClick={() => onMarkPublished(post.id)}
                              title="标记为已发布"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => onEdit(post)}
                            title="编辑"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                            onClick={() => onDelete(post.id)}
                            title="删除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Empty within group */}
              {group.posts.length === 0 && (
                <div className="relative pl-7">
                  <div className="absolute left-0 top-3 w-[15px] h-[15px] rounded-full border-[2.5px] border-background bg-muted-foreground/20 z-[1]" />
                  <p className="text-xs text-muted-foreground py-2">暂无排期内容</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Schedule Post Dialog ───────────────────────────────────────────────

function SchedulePostDialog({
  open,
  onOpenChange,
  posts,
  accounts,
  onSchedule,
  editingPost,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  posts: XhsPostInfo[];
  accounts: (XhsAccountInfo & { postsCount?: number })[];
  onSchedule: (data: Omit<ScheduledPost, "id">) => void;
  editingPost: ScheduledPost | null;
}) {
  // Compute initial values based on editingPost
  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const [title, setTitle] = useState(editingPost?.title ?? "");
  const [selectedPostId, setSelectedPostId] = useState(editingPost?.postId ?? "");
  const [scheduledDate, setScheduledDate] = useState(editingPost?.scheduledDate ?? tomorrow);
  const [scheduledTime, setScheduledTime] = useState(editingPost?.scheduledTime ?? "19:00");
  const [selectedAccountId, setSelectedAccountId] = useState(
    editingPost?.accountId ?? (accounts.length > 0 ? accounts[0].id : "")
  );
  const [notes, setNotes] = useState(editingPost?.notes ?? "");

  // Auto-fill title when selecting a draft - handled in onChange instead of effect

  const handleSubmit = () => {
    if (!title.trim() || !scheduledDate || !scheduledTime) return;
    onSchedule({
      postId: selectedPostId || undefined,
      title: title.trim(),
      scheduledDate,
      scheduledTime,
      accountId: selectedAccountId,
      status: editingPost?.status || "pending",
      notes,
    });
    onOpenChange(false);
  };

  // Available time slots
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let h = 6; h <= 23; h++) {
      slots.push(`${String(h).padStart(2, "0")}:00`);
      slots.push(`${String(h).padStart(2, "0")}:30`);
    }
    return slots;
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingPost ? "编辑排期" : "新建排期"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Select from existing drafts */}
          <div className="space-y-1.5">
            <Label className="text-xs">从笔记中选择</Label>
            <Select value={selectedPostId} onValueChange={(val) => {
              setSelectedPostId(val);
              if (val && val !== "manual") {
                const found = posts.find((p) => p.id === val);
                if (found) setTitle(found.title || "无标题");
              }
            }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择已有笔记（可选）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">手动输入标题</SelectItem>
                {posts.slice(0, 20).map((post) => (
                  <SelectItem key={post.id} value={post.id}>
                    {post.title || "无标题"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs">标题</Label>
            <Input
              placeholder="输入笔记标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9"
            />
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">日期</Label>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">时间</Label>
              <Select value={scheduledTime} onValueChange={setScheduledTime}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Account */}
          <div className="space-y-1.5">
            <Label className="text-xs">发布账号</Label>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择账号" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.nickname || "未命名"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs">备注</Label>
            <Textarea
              placeholder="添加备注（可选）"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[60px] text-sm resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            取消
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!title.trim() || !scheduledDate || !scheduledTime}
            className="text-xs bg-xhs hover:bg-xhs-dark text-white"
          >
            {editingPost ? "保存修改" : "确认排期"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main ContentView Component ─────────────────────────────────────────

export function ContentView() {
  const { setAddAccountDialogOpen, setActiveTab } = useAppStore();
  const [posts, setPosts] = useState<XhsPostInfo[]>([]);
  const [accounts, setAccounts] = useState<(XhsAccountInfo & { postsCount?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [filterAccountId, setFilterAccountId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPost, setSelectedPost] = useState<XhsPostInfo | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const [copied, setCopied] = useState(false);

  // Schedule state
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [editingScheduledPost, setEditingScheduledPost] = useState<ScheduledPost | null>(null);

  // Generate sample schedule data from posts
  const generateSampleSchedule = useCallback(
    (loadedPosts: XhsPostInfo[], loadedAccounts: (XhsAccountInfo & { postsCount?: number })[]) => {
      if (loadedPosts.length === 0) return [];
      const now = new Date();
      const samples: ScheduledPost[] = [];
      const timeSlots = ["08:00", "12:00", "18:30", "19:00", "20:00", "20:30", "21:00"];

      // Create sample entries from existing posts
      const usedPosts = loadedPosts.slice(0, 6);
      usedPosts.forEach((post, i) => {
        const dayOffset = Math.floor(i / 2);
        const date = new Date(now);
        date.setDate(date.getDate() + dayOffset);
        const dateStr = date.toISOString().slice(0, 10);

        const statuses: ScheduleStatus[] = ["pending", "published", "draft"];
        const statusIndex = i % 3;
        // Past dates should be more likely published
        const status: ScheduleStatus = dayOffset === 0 && i < 2 ? statuses[statusIndex] : "pending";

        samples.push({
          id: `schedule-${Date.now()}-${i}`,
          postId: post.id,
          title: post.title || "无标题笔记",
          scheduledDate: dateStr,
          scheduledTime: timeSlots[i % timeSlots.length],
          accountId: post.accountId || (loadedAccounts[0]?.id ?? ""),
          status,
          notes: i % 3 === 0 ? "黄金时段发布" : i % 3 === 1 ? "周末特辑" : "",
        });
      });

      return samples;
    },
    []
  );

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    loadPosts();
  }, [sortBy, filterAccountId]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, filterAccountId, searchQuery]);

  const loadAccounts = async () => {
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      if (data.success) setAccounts(data.data || []);
    } catch (err) {
      console.error("Failed to load accounts:", err);
    }
  };

  const loadPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sortBy, limit: "100" });
      if (filterAccountId !== "all") params.set("accountId", filterAccountId);
      const res = await fetch(`/api/posts?${params}`);
      const data = await res.json();
      if (data.success) {
        const loadedPosts = data.data || [];
        setPosts(loadedPosts);
      }
    } catch (err) {
      console.error("Failed to load posts:", err);
    } finally {
      setLoading(false);
    }
  };

  // Generate sample schedule data once posts and accounts are loaded
  useEffect(() => {
    if (posts.length > 0 && accounts.length > 0 && scheduledPosts.length === 0) {
      setScheduledPosts(generateSampleSchedule(posts, accounts));
    }
  }, [posts, accounts, scheduledPosts.length, generateSampleSchedule]);

  const filteredPosts = posts.filter((post) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (post.title || "").toLowerCase().includes(q) ||
      (post.content || "").toLowerCase().includes(q) ||
      (post.tags || []).some((tag) => tag.toLowerCase().includes(q))
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE
  );

  const sortOptions: { value: SortOption; label: string; icon: typeof ArrowUpDown }[] = [
    { value: "date", label: "最新", icon: Clock },
    { value: "likes", label: "点赞", icon: Heart },
    { value: "comments", label: "评论", icon: MessageCircle },
    { value: "collects", label: "收藏", icon: Bookmark },
    { value: "aiScore", label: "AI评分", icon: Sparkles },
  ];

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const handleCopyContent = async () => {
    if (!selectedPost) return;
    const text = `${selectedPost.title}\n\n${selectedPost.content || ""}\n\n${(selectedPost.tags || []).map((t) => `#${t}`).join(" ")}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeletePost = async (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setSelectedPost(null);
  };

  // Schedule handlers
  const handleSchedulePost = useCallback(
    (data: Omit<ScheduledPost, "id">) => {
      if (editingScheduledPost) {
        // Update existing
        setScheduledPosts((prev) =>
          prev.map((sp) => (sp.id === editingScheduledPost.id ? { ...sp, ...data } : sp))
        );
        setEditingScheduledPost(null);
      } else {
        // Add new
        const newPost: ScheduledPost = {
          ...data,
          id: `schedule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        };
        setScheduledPosts((prev) => [...prev, newPost]);
      }
    },
    [editingScheduledPost]
  );

  const handleDeleteScheduledPost = useCallback((id: string) => {
    setScheduledPosts((prev) => prev.filter((sp) => sp.id !== id));
  }, []);

  const handleMarkPublished = useCallback((id: string) => {
    setScheduledPosts((prev) =>
      prev.map((sp) => (sp.id === id ? { ...sp, status: "published" as ScheduleStatus } : sp))
    );
  }, []);

  const handleEditScheduledPost = useCallback((post: ScheduledPost) => {
    setEditingScheduledPost(post);
    setScheduleDialogOpen(true);
  }, []);

  // Schedule stats
  const scheduleStats = useMemo(() => {
    const pending = scheduledPosts.filter((sp) => sp.status === "pending").length;
    const published = scheduledPosts.filter((sp) => sp.status === "published").length;
    const draft = scheduledPosts.filter((sp) => sp.status === "draft").length;
    const today = scheduledPosts.filter((sp) => getDateGroupLabel(sp.scheduledDate) === "今天").length;
    return { pending, published, draft, today, total: scheduledPosts.length };
  }, [scheduledPosts]);

  if (loading && posts.length === 0) {
    return (
      <div className="p-4 md:p-6 space-y-6 view-animate">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 flex-1 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (posts.length === 0 && accounts.length === 0) {
    return (
      <div className="p-4 md:p-6 view-animate">
        <EmptyState
          icon={FileText}
          title="还没有笔记数据"
          description="先添加小红书账号并采集数据，即可在此查看笔记内容"
          actionLabel="添加账号"
          onAction={() => setAddAccountDialogOpen(true)}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 custom-scrollbar overflow-y-auto h-full pb-20 md:pb-6 view-animate">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">内容库</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {viewMode === "schedule"
              ? `排期管理 · ${scheduleStats.today}篇今天发布`
              : `浏览和管理笔记 · 共 ${filteredPosts.length} 篇`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-2.5 rounded-none text-xs",
                viewMode === "grid" ? "bg-xhs text-white hover:bg-xhs-dark hover:text-white" : "text-muted-foreground"
              )}
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="w-3.5 h-3.5 mr-1" />
              网格
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-2.5 rounded-none text-xs",
                viewMode === "calendar" ? "bg-xhs text-white hover:bg-xhs-dark hover:text-white" : "text-muted-foreground"
              )}
              onClick={() => setViewMode("calendar")}
            >
              <CalendarDays className="w-3.5 h-3.5 mr-1" />
              日历
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-2.5 rounded-none text-xs",
                viewMode === "schedule" ? "bg-xhs text-white hover:bg-xhs-dark hover:text-white" : "text-muted-foreground"
              )}
              onClick={() => setViewMode("schedule")}
            >
              <CalendarClock className="w-3.5 h-3.5 mr-1" />
              排期
            </Button>
          </div>
          {viewMode !== "schedule" && (
            <Button
              variant={showFilters ? "default" : "ghost"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "text-xs",
                showFilters ? "bg-xhs hover:bg-xhs-dark text-white" : "text-muted-foreground"
              )}
            >
              <Filter className="w-3.5 h-3.5 mr-1" />
              筛选
            </Button>
          )}
        </div>
      </div>

      {/* Schedule View */}
      {viewMode === "schedule" && (
        <div className="space-y-4 view-animate">
          {/* Schedule Stats Bar */}
          <div className="grid grid-cols-4 gap-3">
            <Card className="border-border/60 shadow-sm">
              <CardContent className="p-3 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-lg font-bold leading-none">{scheduleStats.pending}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">待发布</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-sm">
              <CardContent className="p-3 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-lg font-bold leading-none">{scheduleStats.published}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">已发布</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-sm">
              <CardContent className="p-3 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-lg font-bold leading-none">{scheduleStats.draft}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">草稿</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-sm">
              <CardContent className="p-3 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-xhs-light/60 flex items-center justify-center shrink-0">
                  <CalendarClock className="w-4 h-4 text-xhs" />
                </div>
                <div>
                  <p className="text-lg font-bold leading-none">{scheduleStats.total}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">全部排期</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* New Schedule Button */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              按日期分组显示排期内容，拖拽调整发布时间
            </p>
            <Button
              size="sm"
              className="text-xs bg-xhs hover:bg-xhs-dark text-white"
              onClick={() => {
                setEditingScheduledPost(null);
                setScheduleDialogOpen(true);
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              新建排期
            </Button>
          </div>

          {/* Schedule Timeline */}
          <Card className="border border-border shadow-sm">
            <CardContent className="p-4 max-h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar">
              <ScheduleTimeline
                scheduledPosts={scheduledPosts}
                accounts={accounts}
                onEdit={handleEditScheduledPost}
                onDelete={handleDeleteScheduledPost}
                onMarkPublished={handleMarkPublished}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search (hidden in schedule view) */}
      {viewMode !== "schedule" && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索笔记标题、内容、标签..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 h-10 bg-white dark:bg-neutral-950"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      )}

      {/* Filters (hidden in schedule view) */}
      {viewMode !== "schedule" && showFilters && (
        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-3 space-y-3">
            {/* Account filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">账号</span>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  variant={filterAccountId === "all" ? "default" : "outline"}
                  className={cn(
                    "h-7 text-xs",
                    filterAccountId === "all" ? "bg-xhs hover:bg-xhs-dark text-white" : "border-border"
                  )}
                  onClick={() => setFilterAccountId("all")}
                >
                  全部
                </Button>
                {accounts.map((acc) => (
                  <Button
                    key={acc.id}
                    size="sm"
                    variant={filterAccountId === acc.id ? "default" : "outline"}
                    className={cn(
                      "h-7 text-xs",
                      filterAccountId === acc.id ? "bg-xhs hover:bg-xhs-dark text-white" : "border-border"
                    )}
                    onClick={() => setFilterAccountId(acc.id)}
                  >
                    {acc.nickname || "未命名"}
                  </Button>
                ))}
              </div>
            </div>

            <Separator className="opacity-50" />

            {/* Sort options */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">排序</span>
              <div className="flex flex-wrap gap-1.5">
                {sortOptions.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <Button
                      key={opt.value}
                      size="sm"
                      variant={sortBy === opt.value ? "default" : "outline"}
                      className={cn(
                        "h-7 text-xs gap-1",
                        sortBy === opt.value
                          ? "bg-xhs hover:bg-xhs-dark text-white"
                          : "border-border"
                      )}
                      onClick={() => setSortBy(opt.value)}
                    >
                      <Icon className="w-3 h-3" />
                      {opt.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content area: Grid or Calendar */}
      {viewMode === "calendar" ? (
        <Card className="border border-border view-animate">
          <CardContent className="p-4">
            <ContentCalendar
              posts={filteredPosts}
              onPostClick={setSelectedPost}
              currentMonth={currentMonth}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
            />
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        filteredPosts.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="没有找到笔记"
            description={searchQuery ? "尝试修改搜索关键词" : "该账号暂无笔记数据"}
            className="py-8"
          />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {paginatedPosts.map((post, i) => (
                <div
                  key={post.id}
                  className="stagger-item"
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <PostCard
                    post={post}
                    onClick={() => setSelectedPost(post)}
                  />
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-border"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  上一页
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "ghost"}
                        size="sm"
                        className={cn(
                          "h-8 w-8 p-0 text-xs",
                          currentPage === pageNum && "bg-xhs hover:bg-xhs-dark text-white"
                        )}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-border"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  下一页
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
                <span className="text-xs text-muted-foreground ml-2">
                  共 {filteredPosts.length} 篇
                </span>
              </div>
            )}
          </>
        )
      ) : null}

      {/* Post Detail Modal */}
      <Dialog
        open={!!selectedPost}
        onOpenChange={(open) => !open && setSelectedPost(null)}
      >
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedPost && (
            <>
              <DialogHeader>
                <DialogTitle className="text-left text-lg">
                  {selectedPost.title || "无标题"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Engagement stats with labels */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="flex flex-col items-center p-2.5 rounded-xl bg-red-50 dark:bg-red-950/20">
                    <Heart className="w-4 h-4 text-red-500 mb-1" />
                    <span className="text-sm font-bold">{formatNumber(selectedPost.likes)}</span>
                    <span className="text-[10px] text-muted-foreground">点赞</span>
                  </div>
                  <div className="flex flex-col items-center p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20">
                    <MessageCircle className="w-4 h-4 text-emerald-500 mb-1" />
                    <span className="text-sm font-bold">{formatNumber(selectedPost.comments)}</span>
                    <span className="text-[10px] text-muted-foreground">评论</span>
                  </div>
                  <div className="flex flex-col items-center p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20">
                    <Bookmark className="w-4 h-4 text-amber-500 mb-1" />
                    <span className="text-sm font-bold">{formatNumber(selectedPost.collects)}</span>
                    <span className="text-[10px] text-muted-foreground">收藏</span>
                  </div>
                  <div className="flex flex-col items-center p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/20">
                    <Share2 className="w-4 h-4 text-rose-400 mb-1" />
                    <span className="text-sm font-bold">{formatNumber(selectedPost.shares)}</span>
                    <span className="text-[10px] text-muted-foreground">分享</span>
                  </div>
                </div>

                {/* AI Score */}
                {selectedPost.aiScore > 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-amber-50/0 dark:from-amber-950/20 dark:to-transparent border border-amber-200/50 dark:border-amber-900/30">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">AI评分</p>
                      <p className="text-sm font-bold">{selectedPost.aiScore.toFixed(0)} 分</p>
                    </div>
                  </div>
                )}

                {/* Tags */}
                {selectedPost.tags && selectedPost.tags.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Hash className="w-3 h-3" />
                      标签
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedPost.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-xs border-0 bg-xhs-light/60 text-xhs/80 hover:bg-xhs-light">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Content */}
                {selectedPost.content && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                      正文内容
                    </p>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {selectedPost.content}
                    </p>
                  </div>
                )}

                {/* AI Analysis */}
                {selectedPost.aiAnalysis && (
                  <div className="bg-xhs-light/30 rounded-xl p-4 border border-xhs/10">
                    <p className="text-xs font-semibold flex items-center gap-1.5 mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-xhs" />
                      AI 分析
                    </p>
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                      {selectedPost.aiAnalysis}
                    </p>
                  </div>
                )}

                {/* Images */}
                {selectedPost.imageUrls && selectedPost.imageUrls.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                      图片
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedPost.imageUrls.map((url, i) => (
                        <div key={i} className="aspect-square rounded-xl overflow-hidden bg-muted">
                          <img
                            src={url}
                            alt={`图片 ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Meta */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                  {selectedPost.publishDate && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {selectedPost.publishDate.slice(0, 10)}
                    </span>
                  )}
                  {selectedPost.category && (
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {selectedPost.category}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Footer */}
              <DialogFooter className="flex-row gap-2 sm:justify-between border-t border-border/50 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs border-border"
                  onClick={() => {
                    setSelectedPost(null);
                    setActiveTab("creator");
                  }}
                >
                  <PenLine className="w-3.5 h-3.5 mr-1" />
                  参考创作
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs border-border"
                    onClick={handleCopyContent}
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 mr-1" />
                    )}
                    {copied ? "已复制" : "复制内容"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeletePost(selectedPost.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    删除
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Schedule Post Dialog - key forces remount on editingPost change */}
      <SchedulePostDialog
        key={editingScheduledPost?.id ?? "new"}
        open={scheduleDialogOpen}
        onOpenChange={(open) => {
          setScheduleDialogOpen(open);
          if (!open) setEditingScheduledPost(null);
        }}
        posts={posts}
        accounts={accounts}
        onSchedule={handleSchedulePost}
        editingPost={editingScheduledPost}
      />
    </div>
  );
}
