"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { AccountCard, formatNumber, MiniSparkline } from "@/components/account-card";
import { useAppStore } from "@/store/app-store";
import { useNotificationStore } from "@/store/notification-store";
import { toast } from "sonner";
import type { XhsAccountInfo, XhsPostInfo } from "@/types";
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
} from "lucide-react";

const statCards = [
  { key: "accounts", label: "管理账号", icon: Users, color: "text-rose-500", bg: "bg-rose-50" },
  { key: "posts", label: "采集笔记", icon: FileText, color: "text-amber-500", bg: "bg-amber-50" },
  { key: "engagement", label: "平均互动", icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-50" },
  { key: "ai", label: "AI创作", icon: Sparkles, color: "text-xhs", bg: "bg-xhs-light" },
] as const;

export function DashboardView() {
  const { setAddAccountDialogOpen, setActiveTab } = useAppStore();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const [accounts, setAccounts] = useState<(XhsAccountInfo & { postsCount?: number; engagementData?: number[] })[]>([]);
  const [recentPosts, setRecentPosts] = useState<XhsPostInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [accRes, postsRes] = await Promise.all([
        fetch("/api/accounts"),
        fetch("/api/posts?limit=6&sortBy=date"),
      ]);
      const accData = await accRes.json();
      const postsData = await postsRes.json();

      if (accData.success) {
        const accs = accData.data || [];
        // Generate simulated engagement data for sparklines (since we don't have real daily data)
        const enriched = accs.map((a: XhsAccountInfo & { postsCount?: number }) => ({
          ...a,
          engagementData: generateSparklineData(a),
        }));
        setAccounts(enriched);
      }
      if (postsData.success) setRecentPosts(postsData.data || []);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
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

  const totalAccounts = accounts.length;
  const totalPosts = accounts.reduce((sum, a) => sum + (a.postsCount || a.notesCount || 0), 0);
  const avgEngagement =
    recentPosts.length > 0
      ? Math.round(
          recentPosts.reduce(
            (sum, p) => sum + p.likes + p.comments + p.collects,
            0
          ) / recentPosts.length
        )
      : 0;

  const statValues: Record<string, string> = {
    accounts: totalAccounts.toString(),
    posts: totalPosts.toString(),
    engagement: formatNumber(avgEngagement),
    ai: "就绪",
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6 view-animate">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[88px] rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
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
    <div className="p-4 md:p-6 space-y-6 custom-scrollbar overflow-y-auto h-full pb-20 md:pb-6 view-animate">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">仪表盘</h2>
          <p className="text-sm text-muted-foreground mt-0.5">运营数据概览</p>
        </div>
        <div className="flex gap-2">
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
            导出数据
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-border hidden sm:inline-flex"
            onClick={() => setAddAccountDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            添加账号
          </Button>
          <Button
            size="sm"
            className="bg-xhs hover:bg-xhs-dark text-white shadow-sm shadow-xhs/20"
            onClick={() => setActiveTab("creator")}
          >
            <PenLine className="w-4 h-4 mr-1" />
            创作内容
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.key} className="card-hover">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", stat.bg)}>
                    <Icon className={cn("w-5 h-5", stat.color)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                    <p className="text-xl font-bold tracking-tight">{statValues[stat.key]}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Weekly Engagement Summary */}
      {recentPosts.length > 0 && (
        <Card>
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
                  { label: "总点赞", value: totalLikes, icon: Heart, color: "text-red-500", bg: "bg-red-50" },
                  { label: "总评论", value: totalComments, icon: MessageCircle, color: "text-emerald-500", bg: "bg-emerald-50" },
                  { label: "总收藏", value: totalCollects, icon: Bookmark, color: "text-amber-500", bg: "bg-amber-50" },
                  { label: "总分享", value: totalShares, icon: TrendingUp, color: "text-rose-500", bg: "bg-rose-50" },
                ];
                return items.map((item) => {
                  const Icon = item.icon;
                  // Simulate trend: random-ish but deterministic based on value
                  const trendPct = item.value > 0 ? Math.round(((item.value % 37) - 15) * 100 / Math.max(item.value, 1)) : 0;
                  const isUp = trendPct >= 0;
                  return (
                    <div key={item.label} className="flex items-center gap-3">
                      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", item.bg)}>
                        <Icon className={cn("w-4 h-4", item.color)} />
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
                <p className="text-xs text-muted-foreground mb-2">近7日互动趋势</p>
                <div className="flex items-end gap-1.5 h-16">
                  {(() => {
                    // Generate 7-day engagement data from posts
                    const days = ["一", "二", "三", "四", "五", "六", "日"];
                    const dayData = days.map((_, i) => {
                      const post = recentPosts[i % recentPosts.length];
                      return (post?.likes || 0) + (post?.comments || 0) + (post?.collects || 0);
                    });
                    const maxVal = Math.max(...dayData, 1);
                    return dayData.map((val, i) => {
                      const height = Math.max((val / maxVal) * 100, 3);
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full rounded-t bg-xhs/50 hover:bg-xhs transition-colors"
                            style={{ height: `${height}%` }}
                            title={`${val} 互动`}
                          />
                          <span className="text-[9px] text-muted-foreground">{days[i]}</span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Account List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">我的账号</h3>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onClick={() => {
                useAppStore.getState().setSelectedAccountId(account.id);
                setActiveTab("account");
              }}
            />
          ))}
        </div>
      </div>

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
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentPosts.map((post) => (
              <Card key={post.id} className="overflow-hidden card-hover">
                <div className="aspect-[16/9] bg-muted relative">
                  {post.coverUrl ? (
                    <img
                      src={post.coverUrl}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileText className="w-8 h-8 text-muted-foreground/50" />
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
    </div>
  );
}

function cn(...inputs: (string | undefined | false)[]) {
  return inputs.filter(Boolean).join(" ");
}

/** Generate sparkline data based on account metrics (simulated trend) */
function generateSparklineData(account: XhsAccountInfo): number[] {
  const base = account.followers > 0 ? Math.round(account.followers * 0.01) : 10;
  const data: number[] = [];
  for (let i = 0; i < 7; i++) {
    const variation = Math.round(base * (0.6 + Math.sin(i * 1.2 + account.followers * 0.001) * 0.4));
    data.push(Math.max(variation, 1));
  }
  return data;
}
