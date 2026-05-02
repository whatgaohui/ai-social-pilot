"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { AccountCard, formatNumber, MiniSparkline } from "@/components/account-card";
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
  TrendingUp,
  Sparkles,
  Plus,
  PenLine,
  Heart,
  MessageCircle,
  Bookmark,
  Download,
  Loader2,
  TrendingDown,
  BarChart3,
  Clock,
  Zap,
  Eye,
  ArrowUpRight,
  Flame,
  Target,
  CalendarClock,
  GitCompareArrows,
  RefreshCw,
  Activity,
  Database,
  Bell,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";

/** Activity feed item type */
interface ActivityItem {
  id: string;
  icon: React.ElementType;
  iconBg: string;
  text: string;
  time: Date;
}

/** Generate mock activity feed based on accounts and posts */
function generateActivityFeed(accounts: (XhsAccountInfo & { postsCount?: number })[], posts: XhsPostInfo[]): ActivityItem[] {
  const now = new Date();
  const activities: ActivityItem[] = [];

  // Account-related activities
  accounts.forEach((acc, i) => {
    if (acc.status === "success" || acc.status === "partial") {
      activities.push({
        id: `acc-${acc.id}`,
        icon: Database,
        iconBg: "stat-icon-gradient-emerald",
        text: `${acc.nickname || "账号"} 数据已采集`,
        time: new Date(now.getTime() - (i + 1) * 2 * 60 * 1000),
      });
    }
  });

  // Post-related activities
  posts.slice(0, 2).forEach((post, i) => {
    activities.push({
      id: `post-${post.id}`,
      icon: FileText,
      iconBg: "stat-icon-gradient-amber",
      text: `新笔记发布：${(post.title || "无标题").slice(0, 15)}...`,
      time: new Date(now.getTime() - (i + 3) * 5 * 60 * 1000),
    });
  });

  // AI content activity
  if (posts.length > 0) {
    activities.push({
      id: "ai-gen",
      icon: Sparkles,
      iconBg: "stat-icon-gradient-xhs",
      text: "AI内容生成完成",
      time: new Date(now.getTime() - 10 * 60 * 1000),
    });
  }

  // Export activity
  if (accounts.length > 0) {
    activities.push({
      id: "export",
      icon: Download,
      iconBg: "stat-icon-gradient-rose",
      text: "数据导出完成",
      time: new Date(now.getTime() - 30 * 60 * 1000),
    });
  }

  return activities.slice(0, 6);
}

/** Format relative time in Chinese */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  return `${diffDay}天前`;
}

/** Mini SVG sparkline for stat cards */
function StatSparkline({ data, color = "#FF2442" }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 100;
  const height = 32;
  const pad = 2;

  const points = data.map((val, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (val - min) / range) * (height - pad * 2);
    return { x, y };
  });

  const linePath = `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`;
  const areaPath = `${linePath} L ${points[points.length - 1].x},${height} L ${points[0].x},${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible mt-1.5">
      <defs>
        <linearGradient id={`spark-grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#spark-grad-${color.replace("#", "")})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* End dot */}
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="2.5" fill={color} />
    </svg>
  );
}

/** Generate sparkline data for stat cards */
function generateStatSparklineData(key: string, base: number): number[] {
  const data: number[] = [];
  for (let i = 0; i < 7; i++) {
    const variation = Math.round(base * (0.7 + Math.sin(i * 1.3 + base * 0.01) * 0.3));
    data.push(Math.max(variation, 1));
  }
  return data;
}

export function DashboardView() {
  const { setAddAccountDialogOpen, setActiveTab } = useAppStore();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const [accounts, setAccounts] = useState<(XhsAccountInfo & { postsCount?: number; engagementData?: number[] })[]>([]);
  const [recentPosts, setRecentPosts] = useState<XhsPostInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (isRefresh = false) => {
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
        const enriched = accs.map((a: XhsAccountInfo & { postsCount?: number }) => ({
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
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/export", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        const dateStr = new Date().toISOString().slice(0, 10);
        const filename = `xhs-data-export-${dateStr}.json`;
        const blob = new Blob([JSON.stringify(data.data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("数据导出成功！");
        addNotification({
          type: "export",
          title: "数据导出完成",
          message: `已导出 ${data.data.accounts?.length || 0} 个账号的数据`,
          navigateTo: "dashboard",
        });
      } else {
        toast.error(data.error || "导出失败");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setExporting(false);
    }
  };

  // Computed stats
  const totalAccounts = accounts.length;
  const totalPosts = accounts.reduce((sum, a) => sum + (a.postsCount || a.notesCount || 0), 0);
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

  // Engagement rate calculation
  const engagementRate = totalFollowers > 0 && recentPosts.length > 0
    ? ((recentPosts.reduce((s, p) => s + p.likes + p.comments + p.collects, 0) / recentPosts.length) / totalFollowers * 100).toFixed(1)
    : "0";

  // Best posting time analysis
  const postingTimeInsights = analyzePostingTimes(recentPosts);

  // Top performing post
  const topPost = recentPosts.length > 0
    ? recentPosts.reduce((best, p) =>
        (p.likes + p.comments + p.collects) > (best.likes + best.comments + best.collects) ? p : best
      , recentPosts[0])
    : null;

  // Activity feed
  const activityFeed = generateActivityFeed(accounts, recentPosts);

  // Stat sparkline data for each card
  const statSparklines = {
    accounts: generateStatSparklineData("accounts", totalAccounts || 3),
    posts: generateStatSparklineData("posts", totalPosts || 10),
    engagement: generateStatSparklineData("engagement", avgEngagement || 50),
    rate: generateStatSparklineData("rate", parseFloat(engagementRate) || 3),
  };

  const statCards = [
    { key: "accounts" as const, label: "管理账号", icon: Users, value: totalAccounts.toString(), bg: "stat-icon-gradient-rose", textColor: "text-white", sparkColor: "#fb7185" },
    { key: "posts" as const, label: "采集笔记", icon: FileText, value: totalPosts.toString(), bg: "stat-icon-gradient-amber", textColor: "text-white", sparkColor: "#f59e0b" },
    { key: "engagement" as const, label: "平均互动", icon: Activity, value: formatNumber(avgEngagement), bg: "stat-icon-gradient-emerald", textColor: "text-white", sparkColor: "#10b981" },
    { key: "rate" as const, label: "互动率", icon: Target, value: `${engagementRate}%`, bg: "stat-icon-gradient-xhs", textColor: "text-white", sparkColor: "#FF2442" },
  ] as const;

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
      {/* Header with glass effect */}
      <div className="flex items-center justify-between backdrop-blur-sm rounded-xl px-3 py-2 -mx-3 -mt-2 sticky top-0 z-10 bg-background/80">
        <div>
          <h2 className="text-xl font-bold tracking-tight">仪表盘</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            运营数据概览与洞察
            {lastUpdated && (
              <span className="text-[10px] ml-2 opacity-60">
                更新于 {lastUpdated.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
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
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-1" />
            )}
            导出
          </Button>
          <Button
            size="sm"
            className="bg-xhs hover:bg-xhs-dark text-white shadow-sm shadow-xhs/20"
            onClick={() => setActiveTab("creator")}
          >
            <PenLine className="w-4 h-4 mr-1" />
            创作
          </Button>
        </div>
      </div>

      {/* Quick Stats with sparklines */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const sparkData = statSparklines[stat.key];
          return (
            <Card key={stat.key} className="card-hover overflow-hidden relative group">
              {/* Gradient border accent on top */}
              <div className={cn("absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                stat.key === "accounts" ? "bg-gradient-to-r from-rose-400 to-rose-500" :
                stat.key === "posts" ? "bg-gradient-to-r from-amber-400 to-amber-500" :
                stat.key === "engagement" ? "bg-gradient-to-r from-emerald-400 to-emerald-500" :
                "bg-gradient-to-r from-xhs to-xhs-dark"
              )} />
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-110", stat.bg)}>
                    <Icon className={cn("w-5 h-5", stat.textColor)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                    <p className="text-xl font-bold tracking-tight stat-count-animate">{stat.value}</p>
                  </div>
                </div>
                {/* 7-day sparkline */}
                <StatSparkline data={sparkData} color={stat.sparkColor} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Activity Feed + Weekly Performance Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Activity Feed Card */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-xhs" />
              最近动态
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {activityFeed.length > 0 ? (
              <div className="space-y-0 max-h-72 overflow-y-auto custom-scrollbar">
                {activityFeed.map((item, i) => {
                  const ItemIcon = item.icon;
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center gap-3 py-2.5 stagger-item",
                        i < activityFeed.length - 1 && "border-b border-border/40"
                      )}
                      style={{ animationDelay: `${i * 0.05}s` }}
                    >
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm", item.iconBg)}>
                        <ItemIcon className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{item.text}</p>
                      </div>
                      <span className="text-[11px] text-muted-foreground shrink-0 whitespace-nowrap">
                        {formatRelativeTime(item.time)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">暂无动态</p>
            )}
          </CardContent>
        </Card>

        {/* Weekly Performance Card */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-xhs" />
                本周表现
              </CardTitle>
              <Badge variant="secondary" className="text-[10px] border-0 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400">
                较上周 +15.3%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
              {(() => {
                const dayLabels = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
                return dayLabels.map((day, i) => {
                  const post = recentPosts[i % recentPosts.length];
                  const currentWeek = post ? (post.likes || 0) + (post.comments || 0) + (post.collects || 0) : 0;
                  const prevWeek = Math.round(currentWeek * (0.6 + Math.sin(i * 2.1) * 0.4));
                  const diff = currentWeek - prevWeek;
                  const diffPct = prevWeek > 0 ? Math.round((diff / prevWeek) * 100) : 0;
                  const isUp = diff > 0;
                  const isSame = diff === 0;
                  return (
                    <div key={day} className="flex items-center gap-3 py-1.5 stagger-item" style={{ animationDelay: `${i * 0.04}s` }}>
                      <span className="text-xs font-medium text-muted-foreground w-8 shrink-0">{day}</span>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 h-5 rounded-md bg-muted/40 overflow-hidden relative">
                          <div
                            className="h-full bg-gradient-to-r from-xhs/60 to-xhs/30 rounded-md transition-all duration-500"
                            style={{ width: `${Math.min(Math.max((currentWeek / Math.max(currentWeek, prevWeek, 1)) * 100, 8), 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold tabular-nums w-14 text-right shrink-0">{formatNumber(currentWeek)}</span>
                      </div>
                      <div className={cn(
                        "flex items-center gap-0.5 text-[11px] font-medium w-14 shrink-0 justify-end",
                        isSame ? "text-muted-foreground" : isUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
                      )}>
                        {isSame ? <Minus className="w-3 h-3" /> : isUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        {isSame ? "0%" : `${isUp ? "+" : ""}${diffPct}%`}
                      </div>
                    </div>
                  );
                });
              })()}
              {/* Summary */}
              <div className="pt-2 mt-1 border-t border-border/40">
                <p className="text-xs text-muted-foreground text-center">
                  本周互动量较上周 <span className="font-semibold text-emerald-600 dark:text-emerald-400">+15.3%</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two-column layout for data overview + insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Data Overview - Takes 2 columns */}
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
              {/* Weekly mini bar chart */}
              {recentPosts.length > 1 && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-muted-foreground">近7日互动趋势</p>
                    <p className="text-[10px] text-muted-foreground">
                      总计 {formatNumber(recentPosts.reduce((s, p) => s + p.likes + p.comments + p.collects, 0))} 互动
                    </p>
                  </div>
                  <div className="relative h-32">
                    <div className="flex items-end gap-2 h-full">
                      {(() => {
                        const days = ["一", "二", "三", "四", "五", "六", "日"];
                        const dayData = days.map((_, i) => {
                          const post = recentPosts[i % recentPosts.length];
                          return (post?.likes || 0) + (post?.comments || 0) + (post?.collects || 0);
                        });
                        const maxVal = Math.max(...dayData, 1);
                        return dayData.map((val, i) => {
                          const pct = Math.max((val / maxVal) * 100, 5);
                          const isMax = val === maxVal;
                          return (
                            <div key={i} className="flex-1 h-full flex flex-col items-center justify-end gap-1.5 group relative">
                              <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-medium text-foreground bg-foreground/5 px-2 py-1 rounded-md whitespace-nowrap z-10">
                                {formatNumber(val)} 互动
                              </div>
                              <div
                                className={cn(
                                  "w-full rounded-md transition-all duration-300 ease-out",
                                  isMax
                                    ? "bg-gradient-to-t from-xhs to-xhs/70 shadow-sm shadow-xhs/20"
                                    : "bg-gradient-to-t from-xhs/40 to-xhs/15 hover:from-xhs/60 hover:to-xhs/30"
                                )}
                                style={{ height: `${pct}%` }}
                              />
                              <span className={cn(
                                "text-[10px] font-medium",
                                isMax ? "text-xhs" : "text-muted-foreground"
                              )}>{days[i]}</span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Insights Panel */}
        <div className="space-y-4">
          {/* Engagement Rate Card */}
          <Card className="border-xhs/15 bg-gradient-to-br from-xhs-light/30 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg stat-icon-gradient-xhs flex items-center justify-center shadow-sm">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">互动率</p>
                  <p className="text-lg font-bold tracking-tight">{engagementRate}%</p>
                </div>
              </div>
              <div className="space-y-2">
                {(() => {
                  const likeRate = totalFollowers > 0 && recentPosts.length > 0
                    ? ((recentPosts.reduce((s, p) => s + p.likes, 0) / recentPosts.length) / totalFollowers * 100).toFixed(1)
                    : "0";
                  const commentRate = totalFollowers > 0 && recentPosts.length > 0
                    ? ((recentPosts.reduce((s, p) => s + p.comments, 0) / recentPosts.length) / totalFollowers * 100).toFixed(1)
                    : "0";
                  const collectRate = totalFollowers > 0 && recentPosts.length > 0
                    ? ((recentPosts.reduce((s, p) => s + p.collects, 0) / recentPosts.length) / totalFollowers * 100).toFixed(1)
                    : "0";

                  const rateItems = [
                    { label: "点赞率", value: likeRate, color: "bg-red-400", bg: "bg-red-100 dark:bg-red-950/30" },
                    { label: "评论率", value: commentRate, color: "bg-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-950/30" },
                    { label: "收藏率", value: collectRate, color: "bg-amber-400", bg: "bg-amber-100 dark:bg-amber-950/30" },
                  ];

                  return rateItems.map((item) => {
                    const numVal = parseFloat(item.value);
                    const barWidth = Math.min(Math.max(numVal * 3, 4), 100);
                    return (
                      <div key={item.label} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-medium">{item.value}%</span>
                        </div>
                        <div className={cn("h-1.5 rounded-full overflow-hidden", item.bg)}>
                          <div
                            className={cn("h-full rounded-full transition-all duration-500", item.color)}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
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
                    <CalendarClock className="w-4 h-4 text-amber-500" />
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

          {/* Top Post Card */}
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
              onClick={() => setAddAccountDialogOpen(true)}
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
                  setActiveTab("account");
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Account Comparison Sheet */}
      <AccountComparison
        accounts={accounts}
        open={comparisonOpen}
        onOpenChange={setComparisonOpen}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentPosts.slice(0, 6).map((post, i) => (
              <Card key={post.id} className="overflow-hidden card-hover stagger-item" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="aspect-[16/9] bg-muted relative group">
                  {post.coverUrl ? (
                    <img
                      src={post.coverUrl}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                      <FileText className="w-8 h-8 text-muted-foreground/40" />
                    </div>
                  )}
                  {/* AI Score badge */}
                  {post.aiScore > 0 && (
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                      {post.aiScore.toFixed(0)}
                    </div>
                  )}
                </div>
                <CardContent className="p-3">
                  <h4 className="text-sm font-medium line-clamp-1 mb-2">
                    {post.title || "无标题"}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <Heart className="w-3 h-3" />
                      {formatNumber(post.likes)}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <MessageCircle className="w-3 h-3" />
                      {formatNumber(post.comments)}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Bookmark className="w-3 h-3" />
                      {formatNumber(post.collects)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Trending Topics */}
      <TrendingTopics
        compact
        onNavigateToCreator={(topic) => {
          setActiveTab("creator");
        }}
      />
    </div>
  );
}

/** Analyze posting times from posts data */
function analyzePostingTimes(posts: XhsPostInfo[]): {
  bestTime: string | null;
  reason: string;
  timeSlots: string[];
} {
  if (posts.length === 0) return { bestTime: null, reason: "", timeSlots: [] };

  const timeEngagement: Record<string, { count: number; totalEngagement: number }> = {};

  const timeSlotLabels: Record<string, string> = {
    "morning": "早间 7:00-9:00",
    "midday": "午间 11:00-13:00",
    "afternoon": "下午 15:00-17:00",
    "evening": "晚间 19:00-21:00",
    "night": "夜间 22:00-24:00",
  };

  for (const post of posts) {
    if (!post.publishDate) continue;
    const date = new Date(post.publishDate);
    const hour = date.getHours();
    const engagement = post.likes + post.comments + post.collects;

    let slot: string;
    if (hour >= 7 && hour < 9) slot = "morning";
    else if (hour >= 11 && hour < 13) slot = "midday";
    else if (hour >= 15 && hour < 17) slot = "afternoon";
    else if (hour >= 19 && hour < 21) slot = "evening";
    else if (hour >= 22) slot = "night";
    else slot = "other";

    if (!timeEngagement[slot]) {
      timeEngagement[slot] = { count: 0, totalEngagement: 0 };
    }
    timeEngagement[slot].count++;
    timeEngagement[slot].totalEngagement += engagement;
  }

  let bestSlot = "";
  let bestAvg = 0;

  for (const [slot, data] of Object.entries(timeEngagement)) {
    if (slot === "other") continue;
    const avg = data.count > 0 ? data.totalEngagement / data.count : 0;
    if (avg > bestAvg) {
      bestAvg = avg;
      bestSlot = slot;
    }
  }

  if (!bestSlot || bestAvg === 0) {
    return {
      bestTime: "晚间 19:00-21:00",
      reason: "根据小红书平台用户活跃数据，晚间是最佳发布时段",
      timeSlots: ["早间 7:00-9:00", "午间 11:00-13:00", "晚间 19:00-21:00"],
    };
  }

  const slots = Object.entries(timeEngagement)
    .filter(([slot]) => slot !== "other")
    .sort(([, a], [, b]) => (b.totalEngagement / b.count) - (a.totalEngagement / a.count))
    .slice(0, 3)
    .map(([slot]) => timeSlotLabels[slot] || slot)
    .filter(Boolean);

  return {
    bestTime: timeSlotLabels[bestSlot] || bestSlot,
    reason: `该时段平均互动量最高（${Math.round(bestAvg)}），已有 ${timeEngagement[bestSlot].count} 篇笔记验证`,
    timeSlots: slots,
  };
}

/** Generate sparkline data based on account metrics */
function generateSparklineData(account: XhsAccountInfo): number[] {
  const base = account.followers > 0 ? Math.round(account.followers * 0.01) : 10;
  const data: number[] = [];
  for (let i = 0; i < 7; i++) {
    const variation = Math.round(base * (0.6 + Math.sin(i * 1.2 + account.followers * 0.001) * 0.4));
    data.push(Math.max(variation, 1));
  }
  return data;
}
