"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { EmptyState } from "@/components/empty-state";
import { AccountCard, formatNumber } from "@/components/account-card";
import { EditAccountDialog } from "@/components/edit-account-dialog";
import { useAppStore } from "@/store/app-store";
import { toast } from "sonner";
import type { XhsAccountInfo, AccountAnalysis } from "@/types";
import {
  Users,
  Heart,
  MessageCircle,
  Bookmark,
  RefreshCw,
  Loader2,
  TrendingUp,
  Lightbulb,
  FileText,
  ArrowLeft,
  Pencil,
  AlertTriangle,
  XCircle,
} from "lucide-react";

export function AccountView() {
  const { selectedAccountId, setSelectedAccountId, setAddAccountDialogOpen } = useAppStore();
  const [accounts, setAccounts] = useState<(XhsAccountInfo & { postsCount?: number })[]>([]);
  const [accountDetail, setAccountDetail] = useState<XhsAccountInfo | null>(null);
  const [analysis, setAnalysis] = useState<AccountAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      loadAnalysis(selectedAccountId);
    } else {
      setLoading(false);
    }
  }, [selectedAccountId]);

  const loadAccounts = async () => {
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      if (data.success) {
        setAccounts(data.data || []);
        if (!selectedAccountId && data.data?.length > 0) {
          setSelectedAccountId(data.data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load accounts:", err);
    }
  };

  const loadAnalysis = async (accountId: string) => {
    setAnalysisLoading(true);
    setLoading(true);
    try {
      const [detailRes, analysisRes] = await Promise.all([
        fetch(`/api/accounts/${accountId}`),
        fetch(`/api/accounts/${accountId}/analysis`),
      ]);
      const detailData = await detailRes.json();
      const analysisData = await analysisRes.json();

      if (detailData.success) setAccountDetail(detailData.data);
      if (analysisData.success) setAnalysis(analysisData.data);
    } catch (err) {
      console.error("Failed to load analysis:", err);
    } finally {
      setLoading(false);
      setAnalysisLoading(false);
    }
  };

  const handleScrape = async () => {
    if (!selectedAccountId) return;
    setScraping(true);
    try {
      const res = await fetch(`/api/accounts/${selectedAccountId}/scrape`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        if (data.data?.partialData) {
          loadAnalysis(selectedAccountId);
        } else {
          loadAnalysis(selectedAccountId);
        }
      }
    } catch {
      console.error("Scrape failed");
    } finally {
      setScraping(false);
    }
  };

  const handleEditSuccess = () => {
    if (selectedAccountId) {
      loadAnalysis(selectedAccountId);
      loadAccounts();
    }
  };

  if (loading && !analysis) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-32 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="p-4 md:p-6">
        <EmptyState
          icon={Users}
          title="还没有添加账号"
          description="添加你的第一个小红书账号，开始数据分析"
          actionLabel="添加账号"
          onAction={() => setAddAccountDialogOpen(true)}
          demoLabel="加载演示数据"
          onDemoAction={async () => {
            try {
              const res = await fetch("/api/demo/seed", { method: "POST" });
              const data = await res.json();
              if (data.success) {
                toast.success("演示数据加载成功！");
                loadAccounts();
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

  // No account selected - show list to pick
  if (!selectedAccountId) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <h2 className="text-lg font-bold">选择账号</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onClick={() => setSelectedAccountId(account.id)}
            />
          ))}
        </div>
      </div>
    );
  }

  const account = accountDetail || accounts.find((a) => a.id === selectedAccountId);

  return (
    <div className="p-4 md:p-6 space-y-6 custom-scrollbar overflow-y-auto h-full pb-20 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setSelectedAccountId(null)}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-bold">账号分析</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditDialogOpen(true)}
            disabled={!account}
          >
            <Pencil className="w-4 h-4 mr-1" />
            编辑账号
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleScrape}
            disabled={scraping}
          >
            {scraping ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                采集中...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-1" />
                重新采集
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Warning banner for partial data */}
      {account?.status === "partial" && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">数据采集不完整</p>
            <p className="text-xs mt-0.5">小红书网站限制了直接访问。部分信息需要手动补充。</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-amber-700 border-amber-300 hover:bg-amber-100 text-xs h-7"
            onClick={() => setEditDialogOpen(true)}
          >
            去补充
          </Button>
        </div>
      )}

      {/* Error banner for error status */}
      {account?.status === "error" && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 flex items-start gap-2">
          <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">采集失败</p>
            <p className="text-xs mt-0.5">
              {account.errorMessage || "小红书网站限制了访问，数据采集失败。你可以手动补充账号信息。"}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-red-700 border-red-300 hover:bg-red-100 text-xs h-7"
            onClick={() => setEditDialogOpen(true)}
          >
            手动补充
          </Button>
        </div>
      )}

      {/* Account Profile Card */}
      {account && (
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-start gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={account.avatarUrl} alt={account.nickname} />
                <AvatarFallback className="bg-xhs-light text-xhs text-xl font-medium">
                  {(account.nickname || "用户").slice(0, 1)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold">{account.nickname || "未命名用户"}</h3>
                {account.bio && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{account.bio}</p>
                )}
                {account.location && (
                  <p className="text-xs text-muted-foreground mt-1">📍 {account.location}</p>
                )}
                <div className="flex items-center gap-4 mt-3">
                  <div className="text-center">
                    <p className="text-lg font-bold">{formatNumber(account.followers)}</p>
                    <p className="text-xs text-muted-foreground">粉丝</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold">{formatNumber(account.following)}</p>
                    <p className="text-xs text-muted-foreground">关注</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold">{formatNumber(account.likedCollected)}</p>
                    <p className="text-xs text-muted-foreground">获赞与收藏</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      {analysis && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <FileText className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <p className="text-xl font-bold">{analysis.totalPosts}</p>
                <p className="text-xs text-muted-foreground">总笔记数</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Heart className="w-5 h-5 text-red-500 mx-auto mb-1" />
                <p className="text-xl font-bold">{formatNumber(analysis.avgLikes)}</p>
                <p className="text-xs text-muted-foreground">平均点赞</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <MessageCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
                <p className="text-xl font-bold">{formatNumber(analysis.avgComments)}</p>
                <p className="text-xs text-muted-foreground">平均评论</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Bookmark className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
                <p className="text-xl font-bold">{formatNumber(analysis.avgCollects)}</p>
                <p className="text-xs text-muted-foreground">平均收藏</p>
              </CardContent>
            </Card>
          </div>

          {/* Engagement Trend (simple bar chart) */}
          {analysis.engagementTrend.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-xhs" />
                  互动趋势
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-1 h-32">
                  {analysis.engagementTrend.slice(-14).map((item, i) => {
                    const maxVal = Math.max(
                      ...analysis.engagementTrend.slice(-14).map(
                        (d) => d.likes + d.comments + d.collects
                      )
                    );
                    const total = item.likes + item.comments + item.collects;
                    const height = maxVal > 0 ? (total / maxVal) * 100 : 0;
                    return (
                      <div
                        key={i}
                        className="flex-1 flex flex-col items-center gap-1"
                        title={`${item.date}: ${total} 互动`}
                      >
                        <div
                          className="w-full bg-xhs/70 rounded-t hover:bg-xhs transition-colors"
                          style={{ height: `${Math.max(height, 2)}%` }}
                        />
                        {i % 2 === 0 && (
                          <span className="text-[9px] text-muted-foreground">
                            {item.date.slice(5)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Content Categories */}
          {analysis.contentCategories.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">内容分类</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analysis.contentCategories.slice(0, 6).map((cat, i) => {
                    const maxCount = Math.max(
                      ...analysis.contentCategories.map((c) => c.count)
                    );
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs w-20 truncate text-right">
                          {cat.name}
                        </span>
                        <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-xhs/60 rounded-full transition-all"
                            style={{
                              width: `${(cat.count / maxCount) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-16">
                          {cat.count}篇
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Posts */}
          {analysis.topPosts.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">热门笔记 Top 5</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysis.topPosts.slice(0, 5).map((post, i) => (
                    <div
                      key={post.id}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-lg font-bold text-xhs w-6 text-center shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1">
                          {post.title || "无标题"}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
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
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Content Themes */}
          {analysis.contentThemes.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">热门标签</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analysis.contentThemes.slice(0, 15).map((theme, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="text-xs"
                    >
                      {theme.theme}
                      <span className="ml-1 text-muted-foreground">×{theme.count}</span>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Insights */}
          {analysis.aiInsights && (
            <Card className="border-xhs/20 bg-xhs-light/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-xhs" />
                  AI 洞察
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                  {analysis.aiInsights}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Edit Account Dialog */}
      <EditAccountDialog
        account={account || null}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}
