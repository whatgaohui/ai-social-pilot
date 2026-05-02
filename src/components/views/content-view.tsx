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
} from "lucide-react";

type SortOption = "date" | "likes" | "comments" | "collects" | "aiScore";
type ViewMode = "grid" | "calendar";

const POSTS_PER_PAGE = 12;

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
    // In a real app, this would call an API. For now, remove from local state.
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setSelectedPost(null);
  };

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
          <p className="text-sm text-muted-foreground mt-0.5">浏览和管理笔记 · 共 {filteredPosts.length} 篇</p>
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
        </div>
      </div>

      {/* Search */}
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

      {/* Filters */}
      {showFilters && (
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
    </div>
  );
}
