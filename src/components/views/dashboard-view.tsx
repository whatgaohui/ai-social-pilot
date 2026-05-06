"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { AccountCard, formatNumber } from "@/components/account-card";
import { AccountComparison } from "@/components/account-comparison";
import { TrendingTopics } from "@/components/trending-topics";
import { useAppStore } from "@/store/app-store";
import { useNotificationStore } from "@/store/notification-store";
import { toast } from "sonner";
import type { XhsAccountInfo, XhsPostInfo } from "@/types";
import { cn } from "@/lib/utils";
import {
  Users,
  FileText,
  Sparkles,
  Plus,
  PenLine,
  Heart,
  MessageCircle,
  Bookmark,
  Download,
  Loader2,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Clock,
  Zap,
  Eye,
  ArrowUpRight,
  Flame,
  Target,
  Activity,
  RefreshCw,
  GitCompareArrows,
} from "lucide-react";
import { ExportDialog } from "@/components/export-dialog";
import {
  StatsOverview,
  ActivityFeedCard,
  WeeklyPerformanceCard,
  AreaChart,
  EngagementRingChart,
  AIStrategyPanel,
} from "@/components/dashboard";
import {
  generateActivityFeed,
  generateStatSparklineData,
  calculateTrend,
  analyzePostingTimes,
  generateSparklineData,
  dateRangeLabels,
  type DateRange,
  type StrategyRecommendation,
} from "@/lib/dashboard-stats";

export function DashboardView() {
  const { setAddAccountDialogOpen, setActiveTab } = useAppStore();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const [accounts, setAccounts] = useState<(XhsAccountInfo & { postsCount?: number; engagementData?: number[] })[]>([]);
  const [recentPosts, setRecentPosts] = useState<XhsPostInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(7);
  const [rangeTransitioning, setRangeTransitioning] = useState(false);

  const [strategyRecommendations, setStrategyRecommendations] = useState<StrategyRecommendation[]>([]);
  const [strategyLoading, setStrategyLoading] = useState(false);

  const totalAccounts = accounts.length;
  const totalPosts = accounts.reduce((sum, a) => sum + (a.postsCount || a.notesCount || 0), 0);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [accRes, postsRes] = await Promise.all([
        fetch("/api/accounts"),
        fetch("/api/posts?limit=20&sortBy=date"),
      ]);
      const accData = await accRes.json();
      const postsData = await postsRes.json();

      if (accData.success) {
        const accs = accData.data || [];
        const enriched = accs.map((a: XhsAccountInfo) => ({
          ...a,
          engagementData: generateSparklineData(a),
        }));
        setAccounts(enriched);
      }
      if (postsData.success) setRecentPosts(postsData.data || []);
      setLastUpdated(new Date());
      if (isRefresh) toast.success("数据已刷新");
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      if (isRefresh) toast.error("刷新失败，请重试");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    loadData();
  }, [loadData]);

  const totalFollowers = accounts.reduce((sum, a) => sum + (a.followers || 0), 0);
  const avgEngagement =
    recentPosts.length > 0
      ? Math.round(
          recentPosts.reduce(
            (sum, p) => sum + p.likes + p.comments + p.collects,
            0
          ) / recentPosts.length
        )
      : 0;

  const engagementRate = totalFollowers > 0 && recentPosts.length > 0
    ? ((recentPosts.reduce((s, p) => s + p.likes + p.comments + p.collects, 0) / recentPosts.length) / totalFollowers * 100).toFixed(1)
    : "0";

  const likeRate = totalFollowers > 0 && recentPosts.length > 0
    ? ((recentPosts.reduce((s, p) => s + p.likes, 0) / recentPosts.length) / totalFollowers * 100).toFixed(1)
    : "0";
  const commentRate = totalFollowers > 0 && recentPosts.length > 0
    ? ((recentPosts.reduce((s, p) => s + p.comments, 0) / recentPosts.length) / totalFollowers * 100).toFixed(1)
    : "0";
  const collectRate = totalFollowers > 0 && recentPosts.length > 0
    ? ((recentPosts.reduce((s, p) => s + p.collects, 0) / recentPosts.length) / totalFollowers * 100).toFixed(1)
    : "0";

  const loadStrategy = useCallback(async () => {
    setStrategyLoading(true);
    try {
      const res = await fetch(
        `/api/ai/strategy?accountCount=${totalAccounts}&avgEngagement=${avgEngagement}&engagementRate=${engagementRate}&totalPosts=${totalPosts}`
      );
      const data = await res.json();
      if (data.success && data.data) {
        setStrategyRecommendations(data.data);
      }
    } catch {
      // Silently fail - fallback recommendations are already in the API
    } finally {
      setStrategyLoading(false);
    }
  }, [totalAccounts, avgEngagement, engagementRate, totalPosts]);

  useEffect(() => {
    if (!loading && accounts.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- load strategy after data
      loadStrategy();
    }
  }, [loading, accounts.length, loadStrategy]);

  const postingTimeInsights = analyzePostingTimes(recentPosts);

  const topPost = recentPosts.length > 0
    ? recentPosts.reduce((best, p) =>
        (p.likes + p.comments + p.collects) > (best.likes + best.comments + best.collects) ? p : best
      , recentPosts[0])
    : null;

  const activityFeed = generateActivityFeed(accounts, recentPosts);

  const statSparklines = {
    accounts: generateStatSparklineData(recentPosts, "accounts"),
    posts: generateStatSparklineData(recentPosts, "posts"),
    engagement: generateStatSparklineData(recentPosts, "engagement"),
    rate: generateStatSparklineData(recentPosts, "rate"),
  };

  const statTrends = {
    accounts: calculateTrend(recentPosts, "accounts", dateRange),
    posts: calculateTrend(recentPosts, "posts", dateRange),
    engagement: calculateTrend(recentPosts, "engagement", dateRange),
    rate: calculateTrend(recentPosts, "rate", dateRange),
  };

  const handleDateRangeChange = (range: DateRange) => {
    if (range === dateRange) return;
    setRangeTransitioning(true);
    setDateRange(range);
    setTimeout(() => setRangeTransitioning(false), 400);
  };

  const statCardConfigs = [
    { key: "accounts" as const, label: "管理账号", icon: Users, value: totalAccounts.toString(), bg: "stat-icon-gradient-rose", textColor: "text-white", sparkColor: "#fb7185", sparkData: statSparklines.accounts, trend: statTrends.accounts },
    { key: "posts" as const, label: "采集笔记", icon: FileText, value: totalPosts.toString(), bg: "stat-icon-gradient-amber", textColor: "text-white", sparkColor: "#f59e0b", sparkData: statSparklines.posts, trend: statTrends.posts },
    { key: "engagement" as const, label: "平均互动", icon: Activity, value: formatNumber(avgEngagement), bg: "stat-icon-gradient-emerald", textColor: "text-white", sparkColor: "#10b981", sparkData: statSparklines.engagement, trend: statTrends.engagement },
    { key: "rate" as const, label: "互动率", icon: Target, value: `${engagementRate}%`, bg: "stat-icon-gradient-xhs", textColor: "text-white", sparkColor: "#FF2442", sparkData: statSparklines.rate, trend: statTrends.rate },
  ];

  const areaChartData = (() => {
    const days = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
    const dayEngagement = Array(7).fill(0) as number[];
    const dayCount = Array(7).fill(0) as number[];
    for (const post of recentPosts) {
      if (!post.publishDate) continue;
      const date = new Date(post.publishDate);
      const dayIndex = (date.getDay() + 6) % 7;
      dayEngagement[dayIndex] += (post.likes || 0) + (post.comments || 0) + (post.collects || 0);
      dayCount[dayIndex]++;
    }
    const avgData = dayEngagement.map((total, i) => dayCount[i] > 0 ? Math.round(total / dayCount[i]) : 0);
    if (avgData.every((v) => v === 0)) {
      return { labels: days, data: [0, 0, 0, 0, 0, 0, 0] };
    }
    return { labels: days, data: avgData };
  })();

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6 view-animate">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className={`h-[120px] rounded-xl skeleton-delay-${i}`} />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="p-4 md:p-6 view-animate">
        <EmptyState
          icon={Users}
          title="还没有添加账号"
          description="添加你的第一个小红书账号，开始智能运营之旅"
          actionLabel="添加账号"
          onAction={() => setAddAccountDialogOpen(true)}
          demoLabel="加载演示数据"
          onDemoAction={async () => {
            try {
              const res = await fetch("/api/demo/seed", { method: "POST" });
              const data = await res.json();
              if (data.success) {
                toast.success("演示数据加载成功！");
                addNotification({
                  type: "info",
                  category: "system",
                  title: "演示数据已加载",
                  message: "已加载示例账号和笔记数据",
                  navigateTo: "dashboard",
                });
                loadData();
              } else {
                toast.error(data.error || "加载演示数据失败");
              }
            } catch {
              toast.error("网络错误，请重试");
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5 custom-scrollbar overflow-y-auto h-full pb-20 md:pb-6 view-animate">
      {/* Header */}
      <div className="flex items-center justify-between backdrop-blur-sm rounded-xl px-3 py-2 -mx-3 -mt-2 sticky top-0 z-10 bg-background/80">
        <div>
          <h2 className="text-xl font-bold tracking-tight">仪表盘</h2>
          <p className="text-sm font-medium text-muted-foreground mt-0.5">
            运营数据概览 · {dateRangeLabels[dateRange]}
            {lastUpdated && (
              <span className="text-[11px] ml-2 opacity-50">
                更新于 {lastUpdated.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="hidden sm:flex items-center bg-muted/60 rounded-lg p-0.5 border border-border/50">
            {([7, 30, 90] as DateRange[]).map((range) => (
              <button
                key={range}
                onClick={() => handleDateRangeChange(range)}
                className={cn(
                  "h-7 px-3 rounded-md text-xs font-medium transition-all duration-200",
                  dateRange === range
                    ? "bg-xhs text-white shadow-sm shadow-xhs/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                )}
              >
                {range}天
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-border hidden sm:inline-flex"
            onClick={() => loadData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={cn("w-4 h-4 mr-1", refreshing && "animate-spin")} />
            刷新
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-border hidden sm:inline-flex"
            onClick={() => setExportDialogOpen(true)}
          >
            <Download className="w-4 h-4 mr-1" />
            导出
          </Button>
          <Button
            size="sm"
            className="bg-xhs hover:bg-xhs-dark text-white shadow-sm shadow-xhs/20"
            onClick={() => setActiveTab("account-hub")}
          >
            <PenLine className="w-4 h-4 mr-1" />
            创作
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <StatsOverview stats={statCardConfigs} transitioning={rangeTransitioning} />

      <div className="border-b border-border/40" />

      {/* Activity Feed + Weekly Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ActivityFeedCard items={activityFeed} />
        <WeeklyPerformanceCard posts={recentPosts} />
      </div>

      {/* Data Overview + Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Data Overview */}
        {recentPosts.length > 0 && (
          <Card className="lg:col-span-2 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-xhs" />
                数据概览
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(() => {
                  const totalLikes = recentPosts.reduce((s, p) => s + p.likes, 0);
                  const totalComments = recentPosts.reduce((s, p) => s + p.comments, 0);
                  const totalCollects = recentPosts.reduce((s, p) => s + p.collects, 0);
                  const totalShares = recentPosts.reduce((s, p) => s + p.shares, 0);
                  const items = [
                    { label: "总点赞", value: totalLikes, icon: Heart, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/20" },
                    { label: "总评论", value: totalComments, icon: MessageCircle, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/20" },
                    { label: "总收藏", value: totalCollects, icon: Bookmark, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/20" },
                    { label: "总分享", value: totalShares, icon: Eye, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-950/20" },
                  ];
                  return items.map((item) => {
                    const Icon = item.icon;
                    const trendPct = item.value > 0 ? Math.round(((item.value % 37) - 15) * 100 / Math.max(item.value, 1)) : 0;
                    const isUp = trendPct >= 0;
                    return (
                      <div key={item.label} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/30 transition-colors">
                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", item.bg)}>
                          <Icon className={cn("w-4.5 h-4.5", item.color)} />
                        </div>
                        <div>
                          <p className="text-lg font-bold tracking-tight">{formatNumber(item.value)}</p>
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-muted-foreground">{item.label}</span>
                            {item.value > 0 && (
                              <span className={cn("text-[10px] font-medium flex items-center", isUp ? "text-emerald-600" : "text-red-500")}>
                                {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                                {isUp ? "+" : ""}{trendPct > 999 ? "99+" : trendPct}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
              {recentPosts.length > 1 && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-muted-foreground">近7日互动趋势</p>
                    <p className="text-[10px] text-muted-foreground">
                      总计 {formatNumber(recentPosts.reduce((s, p) => s + p.likes + p.comments + p.collects, 0))} 互动
                    </p>
                  </div>
                  <AreaChart data={areaChartData.data} labels={areaChartData.labels} height={160} />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Insights Panel */}
        <div className="space-y-4">
          {/* Engagement Rate */}
          <Card className="border-xhs/15 bg-gradient-to-br from-xhs-light/30 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg stat-icon-gradient-xhs flex items-center justify-center shadow-sm">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">互动率分析</p>
                </div>
              </div>
              <EngagementRingChart
                rate={engagementRate}
                likeRate={likeRate}
                commentRate={commentRate}
                collectRate={collectRate}
              />
            </CardContent>
          </Card>

          {/* Best Posting Time */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg stat-icon-gradient-amber flex items-center justify-center shadow-sm">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">最佳发布时间</p>
                </div>
              </div>
              {postingTimeInsights.bestTime ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-semibold">{postingTimeInsights.bestTime}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{postingTimeInsights.reason}</p>
                  {postingTimeInsights.timeSlots.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {postingTimeInsights.timeSlots.map((slot, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] border-0 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400">
                          {slot}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">暂无足够数据分析最佳发布时间</p>
              )}
            </CardContent>
          </Card>

          {/* Top Post */}
          {topPost && (
            <Card className="cursor-pointer card-hover" onClick={() => setActiveTab("content")}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg stat-icon-gradient-rose flex items-center justify-center shadow-sm">
                    <Flame className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">最热笔记</p>
                  </div>
                </div>
                <p className="text-sm font-medium line-clamp-1 mb-1.5">{topPost.title || "无标题"}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-0.5 text-red-500">
                    <Heart className="w-3 h-3" />
                    {formatNumber(topPost.likes)}
                  </span>
                  <span className="flex items-center gap-0.5 text-emerald-500">
                    <MessageCircle className="w-3 h-3" />
                    {formatNumber(topPost.comments)}
                  </span>
                  <span className="flex items-center gap-0.5 text-amber-500">
                    <Bookmark className="w-3 h-3" />
                    {formatNumber(topPost.collects)}
                  </span>
                  <ArrowUpRight className="w-3 h-3 text-muted-foreground ml-auto" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* AI Strategy */}
      <AIStrategyPanel
        recommendations={strategyRecommendations}
        loading={strategyLoading}
        onRefresh={loadStrategy}
      />

      {/* Account List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">我的账号</h3>
          <div className="flex items-center gap-1">
            {accounts.length >= 2 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-xhs hover:text-xhs-dark"
                onClick={() => setComparisonOpen(true)}
              >
                <GitCompareArrows className="w-3.5 h-3.5 mr-1" />
                对比账号
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-xhs hover:text-xhs-dark"
              onClick={() => useAppStore.setState({ addAccountDialogOpen: true })}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              添加
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {accounts.map((account, i) => (
            <div
              key={account.id}
              className="stagger-item"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <AccountCard
                account={account}
                onClick={() => {
                  useAppStore.getState().setSelectedAccountId(account.id);
                  setActiveTab("account-hub");
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Account Comparison */}
      <AccountComparison
        accounts={accounts}
        open={comparisonOpen}
        onOpenChange={setComparisonOpen}
      />

      {/* Export Dialog */}
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
      />

      {/* Recent Posts */}
      {recentPosts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">最近笔记</h3>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-xhs hover:text-xhs-dark"
              onClick={() => setActiveTab("content")}
            >
              查看全部
              <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentPosts.slice(0, 20).map((post, i) => (
              <div
                key={post.id}
                className="group relative w-20 flex-shrink-0 border rounded-lg overflow-hidden cursor-pointer hover:ring-1 hover:ring-xhs-light transition-colors stagger-item"
                style={{ animationDelay: `${i * 0.03}s` }}
                onClick={() => setActiveTab("content")}
              >
                <div className="relative w-20 h-20 bg-muted">
                  {post.coverUrl ? (
                    <img
                      src={post.coverUrl}
                      alt={post.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
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
                <p className="text-[10px] font-medium truncate px-1 py-0.5 leading-tight">{post.title || "无标题"}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trending Topics */}
      <TrendingTopics
        compact
        onNavigateToCreator={() => {
          setActiveTab("account-hub");
        }}
      />
    </div>
  );
}
