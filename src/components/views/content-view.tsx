"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type SortOption = "date" | "likes" | "comments" | "collects" | "aiScore";
type ViewMode = "grid" | "calendar";

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

  // Posts grouped by date string "YYYY-MM-DD"
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

  // Calendar grid calculation
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay(); // 0=Sun
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
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{monthLabel}</h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onPrevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => {
              // Reset to today's month - handled by parent
            }}
          >
            今天
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((d) => (
          <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar cells */}
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

export function ContentView() {
  const { setAddAccountDialogOpen } = useAppStore();
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

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    loadPosts();
  }, [sortBy, filterAccountId]);

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
      const params = new URLSearchParams({ sortBy, limit: "50" });
      if (filterAccountId !== "all") params.set("accountId", filterAccountId);
      const res = await fetch(`/api/posts?${params}`);
      const data = await res.json();
      if (data.success) setPosts(data.data || []);
    } catch (err) {
      console.error("Failed to load posts:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = posts.filter((post) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (post.title || "").toLowerCase().includes(q) ||
      (post.content || "").toLowerCase().includes(q) ||
      (post.tags || []).some((tag) => tag.toLowerCase().includes(q))
    );
  });

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "date", label: "最新发布" },
    { value: "likes", label: "最多点赞" },
    { value: "comments", label: "最多评论" },
    { value: "collects", label: "最多收藏" },
    { value: "aiScore", label: "AI评分" },
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

  if (loading && posts.length === 0) {
    return (
      <div className="p-4 md:p-6 space-y-6 view-animate">
        <Skeleton className="h-12 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
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
          <p className="text-sm text-muted-foreground mt-0.5">浏览和管理笔记</p>
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
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="text-muted-foreground"
          >
            <SlidersHorizontal className="w-4 h-4 mr-1" />
            筛选
          </Button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索笔记标题、内容、标签..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
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

        {showFilters && (
          <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-xl border border-border/50">
            {/* Account filter */}
            <select
              value={filterAccountId}
              onChange={(e) => setFilterAccountId(e.target.value)}
              className="text-sm border border-border rounded-lg px-3 py-1.5 bg-white dark:bg-neutral-950"
            >
              <option value="all">全部账号</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.nickname || "未命名用户"}
                </option>
              ))}
            </select>

            {/* Sort options */}
            {sortOptions.map((opt) => (
              <Button
                key={opt.value}
                size="sm"
                variant={sortBy === opt.value ? "default" : "outline"}
                className={
                  sortBy === opt.value
                    ? "bg-xhs hover:bg-xhs-dark text-white text-xs shadow-sm"
                    : "text-xs border-border"
                }
                onClick={() => setSortBy(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Content area: Grid or Calendar */}
      {viewMode === "calendar" ? (
        <Card className="border border-border">
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
      ) : (
        filteredPosts.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="没有找到笔记"
            description={searchQuery ? "尝试修改搜索关键词" : "该账号暂无笔记数据"}
            className="py-8"
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onClick={() => setSelectedPost(post)}
              />
            ))}
          </div>
        )
      )}

      {/* Post Detail Modal */}
      <Dialog
        open={!!selectedPost}
        onOpenChange={(open) => !open && setSelectedPost(null)}
      >
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedPost && (
            <>
              <DialogHeader>
                <DialogTitle className="text-left">
                  {selectedPost.title || "无标题"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Engagement stats */}
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="flex items-center gap-1 text-sm">
                    <Heart className="w-4 h-4 text-red-500" />
                    {formatNumber(selectedPost.likes)}
                  </span>
                  <span className="flex items-center gap-1 text-sm">
                    <MessageCircle className="w-4 h-4 text-emerald-500" />
                    {formatNumber(selectedPost.comments)}
                  </span>
                  <span className="flex items-center gap-1 text-sm">
                    <Bookmark className="w-4 h-4 text-amber-500" />
                    {formatNumber(selectedPost.collects)}
                  </span>
                  <span className="flex items-center gap-1 text-sm">
                    <Share2 className="w-4 h-4 text-rose-400" />
                    {formatNumber(selectedPost.shares)}
                  </span>
                  {selectedPost.aiScore > 0 && (
                    <span className="flex items-center gap-1 text-sm ml-auto">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      AI评分: {selectedPost.aiScore.toFixed(0)}
                    </span>
                  )}
                </div>

                {/* Tags */}
                {selectedPost.tags && selectedPost.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPost.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-xs border-0 bg-muted/80">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <Separator />

                {/* Content */}
                {selectedPost.content && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                      正文内容
                    </h4>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {selectedPost.content}
                    </p>
                  </div>
                )}

                {/* AI Analysis */}
                {selectedPost.aiAnalysis && (
                  <div className="bg-xhs-light/30 rounded-xl p-4 border border-xhs/10">
                    <h4 className="text-xs font-semibold flex items-center gap-1.5 mb-2">
                      <Star className="w-3.5 h-3.5 text-xhs" />
                      AI 分析
                    </h4>
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                      {selectedPost.aiAnalysis}
                    </p>
                  </div>
                )}

                {/* Images */}
                {selectedPost.imageUrls && selectedPost.imageUrls.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                      图片
                    </h4>
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
                    <span>发布: {selectedPost.publishDate.slice(0, 10)}</span>
                  )}
                  {selectedPost.category && <span>分类: {selectedPost.category}</span>}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
