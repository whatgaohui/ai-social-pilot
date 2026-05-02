"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { AccountCard, formatNumber } from "@/components/account-card";
import { useAppStore } from "@/store/app-store";
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
} from "lucide-react";

const statCards = [
  { key: "accounts", label: "管理账号", icon: Users, color: "text-rose-500", bg: "bg-rose-50" },
  { key: "posts", label: "采集笔记", icon: FileText, color: "text-amber-500", bg: "bg-amber-50" },
  { key: "engagement", label: "平均互动", icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-50" },
  { key: "ai", label: "AI创作", icon: Sparkles, color: "text-xhs", bg: "bg-xhs-light" },
] as const;

export function DashboardView() {
  const { setAddAccountDialogOpen, setActiveTab } = useAppStore();
  const [accounts, setAccounts] = useState<(XhsAccountInfo & { postsCount?: number })[]>([]);
  const [recentPosts, setRecentPosts] = useState<XhsPostInfo[]>([]);
  const [loading, setLoading] = useState(true);

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

      if (accData.success) setAccounts(accData.data || []);
      if (postsData.success) setRecentPosts(postsData.data || []);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
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
