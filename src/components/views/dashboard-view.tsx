"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { AccountCard, formatNumber } from "@/components/account-card";
import { useAppStore } from "@/store/app-store";
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

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="p-4 md:p-6">
        <EmptyState
          icon={Users}
          title="还没有添加账号"
          description="添加你的第一个小红书账号，开始智能运营之旅"
          actionLabel="添加账号"
          onAction={() => setAddAccountDialogOpen(true)}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 custom-scrollbar overflow-y-auto h-full pb-20 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">仪表盘</h2>
          <p className="text-sm text-muted-foreground">运营数据概览</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddAccountDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            添加账号
          </Button>
          <Button
            size="sm"
            className="bg-xhs hover:bg-xhs-dark text-white"
            onClick={() => setActiveTab("creator")}
          >
            <PenLine className="w-4 h-4 mr-1" />
            创作内容
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">管理账号</p>
                <p className="text-xl font-bold">{totalAccounts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                <FileText className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">采集笔记</p>
                <p className="text-xl font-bold">{totalPosts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">平均互动</p>
                <p className="text-xl font-bold">{formatNumber(avgEngagement)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-xhs-light flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-xhs" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">AI创作</p>
                <p className="text-xl font-bold">就绪</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account List */}
      <div>
        <h3 className="text-sm font-semibold mb-3">我的账号</h3>
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
              className="text-xs text-xhs"
              onClick={() => setActiveTab("content")}
            >
              查看全部
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentPosts.map((post) => (
              <Card key={post.id} className="overflow-hidden">
                <div className="aspect-[16/9] bg-muted relative">
                  {post.coverUrl ? (
                    <img
                      src={post.coverUrl}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileText className="w-8 h-8 text-muted-foreground" />
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
