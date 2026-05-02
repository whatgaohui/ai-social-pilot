"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/empty-state";
import { AccountCard, formatNumber } from "@/components/account-card";
import { EditAccountDialog } from "@/components/edit-account-dialog";
import { useAppStore } from "@/store/app-store";
import { toast } from "sonner";
import type { XhsAccountInfo, AccountAnalysis, EngagementTrend } from "@/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  Users,
  Heart,
  MessageCircle,
  Bookmark,
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  FileText,
  ArrowLeft,
  Pencil,
  AlertTriangle,
  XCircle,
  Trash2,
  Eye,
  Share2,
  Clock,
  BarChart3,
  Target,
  Zap,
  Activity,
  PieChart,
  CalendarDays,
  Sparkles,
  ArrowUpRight,
  Flame,
  Hash,
  Award,
  PenLine,
  Theater,
} from "lucide-react";

// SVG Line Chart Component
function TrendLineChart({ data, label, color = "#FF2442" }: { data: { date: string; value: number }[]; label: string; color?: string }) {
  if (data.length < 2) return null;

  const width = 320;
  const height = 120;
  const padding = { top: 10, right: 10, bottom: 24, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const minVal = Math.min(...data.map((d) => d.value));
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartW;
    const y = padding.top + (1 - (d.value - minVal) / range) * chartH;
    return { x, y, ...d };
  });

  const linePath = `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`;
  const areaPath = `${linePath} L ${points[points.length - 1].x},${padding.top + chartH} L ${points[0].x},${padding.top + chartH} Z`;

  // Trend calculation
  const firstVal = data[0]?.value || 0;
  const lastVal = data[data.length - 1]?.value || 0;
  const trendPct = firstVal > 0 ? Math.round(((lastVal - firstVal) / firstVal) * 100) : 0;
  const isUp = trendPct >= 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={cn("text-xs font-medium flex items-center gap-0.5", isUp ? "text-emerald-600" : "text-red-500")}>
          {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {isUp ? "+" : ""}{trendPct}%
        </span>
      </div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        {/* Area fill */}
        <path d={areaPath} fill={color} fillOpacity={0.08} />
        {/* Line */}
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Dots */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="white" stroke={color} strokeWidth="2" className="opacity-0 hover:opacity-100 transition-opacity" />
        ))}
        {/* X labels */}
        {points.filter((_, i) => i % Math.ceil(points.length / 5) === 0).map((p, i) => (
          <text key={i} x={p.x} y={height - 2} textAnchor="middle" className="text-[9px] fill-muted-foreground">
            {p.date.slice(5)}
          </text>
        ))}
        {/* Y labels */}
        <text x={padding.left - 4} y={padding.top + 4} textAnchor="end" className="text-[9px] fill-muted-foreground">
          {formatNumber(maxVal)}
        </text>
        <text x={padding.left - 4} y={padding.top + chartH + 4} textAnchor="end" className="text-[9px] fill-muted-foreground">
          {formatNumber(minVal)}
        </text>
      </svg>
    </div>
  );
}

// Heatmap for best posting times
function PostingTimeHeatmap({ data }: { data: { hour: number; avgEngagement: number }[] }) {
  if (data.length === 0) return null;

  const maxEng = Math.max(...data.map((d) => d.avgEngagement), 1);
  const hours = Array.from({ length: 24 }, (_, i) => {
    const found = data.find((d) => d.hour === i);
    return { hour: i, value: found?.avgEngagement || 0 };
  });

  const timeSlots = [
    { label: "凌晨", hours: [0, 1, 2, 3, 4, 5], icon: "🌙" },
    { label: "早间", hours: [6, 7, 8, 9], icon: "🌅" },
    { label: "午间", hours: [10, 11, 12, 13], icon: "☀️" },
    { label: "下午", hours: [14, 15, 16, 17], icon: "🌤️" },
    { label: "晚间", hours: [18, 19, 20, 21], icon: "🌆" },
    { label: "深夜", hours: [22, 23], icon: "🌃" },
  ];

  return (
    <div className="space-y-2">
      {timeSlots.map((slot) => {
        const slotHours = slot.hours.map((h) => hours.find((hr) => hr.hour === h)!);
        const avgEng = slotHours.reduce((s, h) => s + h.value, 0) / slotHours.length;
        const intensity = maxEng > 0 ? avgEng / maxEng : 0;

        return (
          <div key={slot.label} className="flex items-center gap-2">
            <span className="text-xs w-16 shrink-0 text-muted-foreground">
              {slot.icon} {slot.label}
            </span>
            <div className="flex-1 flex gap-1">
              {slotHours.map((h) => {
                const hIntensity = maxEng > 0 ? h.value / maxEng : 0;
                return (
                  <div key={h.hour} className="flex-1 group relative">
                    <div
                      className={cn(
                        "h-8 rounded-md transition-all duration-200",
                        hIntensity > 0.7 ? "bg-xhs" :
                        hIntensity > 0.4 ? "bg-xhs/60" :
                        hIntensity > 0.1 ? "bg-xhs/25" : "bg-xhs/8"
                      )}
                    />
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                      {h.hour}:00 · {formatNumber(h.value)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AccountView() {
  const { selectedAccountId, setSelectedAccountId, setAddAccountDialogOpen, setActiveTab } = useAppStore();
  const [accounts, setAccounts] = useState<(XhsAccountInfo & { postsCount?: number })[]>([]);
  const [accountDetail, setAccountDetail] = useState<XhsAccountInfo | null>(null);
  const [analysis, setAnalysis] = useState<AccountAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState("overview");

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
        loadAnalysis(selectedAccountId);
        toast.success("数据采集成功");
      }
    } catch {
      console.error("Scrape failed");
      toast.error("采集失败");
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

  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!selectedAccountId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/accounts/${selectedAccountId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("账号已删除");
        setSelectedAccountId(null);
        loadAccounts();
      } else {
        toast.error(data.error || "删除失败");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setDeleting(false);
    }
  };

  // Prepare trend data for charts
  const likesTrend = useMemo(() =>
    (analysis?.engagementTrend || []).map((d) => ({ date: d.date, value: d.likes })),
    [analysis]
  );
  const commentsTrend = useMemo(() =>
    (analysis?.engagementTrend || []).map((d) => ({ date: d.date, value: d.comments })),
    [analysis]
  );
  const collectsTrend = useMemo(() =>
    (analysis?.engagementTrend || []).map((d) => ({ date: d.date, value: d.collects })),
    [analysis]
  );

  // Overall engagement rate
  const engagementRate = useMemo(() => {
    if (!analysis || !accountDetail) return "0";
    const totalEng = analysis.avgLikes + analysis.avgComments + analysis.avgCollects;
    const rate = accountDetail.followers > 0 ? (totalEng / accountDetail.followers * 100).toFixed(1) : "0";
    return rate;
  }, [analysis, accountDetail]);

  if (loading && !analysis) {
    return (
      <div className="p-4 md:p-6 space-y-6 view-animate">
        <Skeleton className="h-32 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className={`h-24 rounded-xl skeleton-delay-${i}`} />
          ))}
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="p-4 md:p-6 view-animate">
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

  if (!selectedAccountId) {
    return (
      <div className="p-4 md:p-6 space-y-4 view-animate">
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
    <div className="p-4 md:p-6 space-y-5 custom-scrollbar overflow-y-auto h-full pb-20 md:pb-6 view-animate">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden -ml-2"
            onClick={() => setSelectedAccountId(null)}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight">账号分析</h2>
            <p className="text-sm text-muted-foreground mt-0.5">深度数据洞察</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="text-sm border border-border rounded-lg px-3 py-1.5 bg-white dark:bg-neutral-950 hidden sm:block"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.nickname || "未命名用户"}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="outline"
            className="border-border"
            onClick={() => setEditDialogOpen(true)}
            disabled={!account}
          >
            <Pencil className="w-4 h-4 mr-1" />
            编辑
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-border"
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
                采集
              </>
            )}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                disabled={deleting || !account}
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确定删除该账号？</AlertDialogTitle>
                <AlertDialogDescription>
                  所有相关数据（笔记、人设、草稿）将被永久删除。此操作无法撤销。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={handleDeleteAccount}>
                  确定删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Warning banner */}
      {account?.status === "partial" && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-amber-800 dark:text-amber-300 rounded-xl p-3 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">数据采集不完整</p>
            <p className="text-xs mt-0.5 text-amber-700 dark:text-amber-400">小红书网站限制了直接访问。部分信息需要手动补充。</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-amber-700 border-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-xs h-7 shrink-0"
            onClick={() => setEditDialogOpen(true)}
          >
            去补充
          </Button>
        </div>
      )}

      {account?.status === "error" && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-800 dark:text-red-300 rounded-xl p-3 flex items-start gap-2.5">
          <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">采集失败</p>
            <p className="text-xs mt-0.5 text-red-700 dark:text-red-400">
              {account.errorMessage || "小红书网站限制了访问，数据采集失败。你可以手动补充账号信息。"}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-red-700 border-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 text-xs h-7 shrink-0"
            onClick={() => setEditDialogOpen(true)}
          >
            手动补充
          </Button>
        </div>
      )}

      {/* Account Profile Card - Enhanced */}
      {account && (
        <Card className="overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-xhs via-xhs/70 to-amber-400" />
          <CardContent className="p-5 md:p-6">
            <div className="flex items-start gap-4">
              <Avatar className="w-16 h-16 shrink-0 ring-2 ring-xhs/10">
                <AvatarImage src={account.avatarUrl} alt={account.nickname} />
                <AvatarFallback className="bg-xhs-light text-xhs text-xl font-medium">
                  {(account.nickname || "用户").slice(0, 1)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold">{account.nickname || "未命名用户"}</h3>
                  <Badge variant="secondary" className={cn(
                    "text-[10px] border-0",
                    account.status === "success" ? "bg-emerald-50 text-emerald-600" :
                    account.status === "partial" ? "bg-amber-50 text-amber-600" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {account.status === "success" ? "✓ 已同步" :
                     account.status === "partial" ? "⚠ 部分采集" :
                     account.status === "scraping" ? "⟳ 采集中" : "○ 待采集"}
                  </Badge>
                </div>
                {account.bio && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{account.bio}</p>
                )}
                {account.location && (
                  <p className="text-xs text-muted-foreground mt-1">📍 {account.location}</p>
                )}
                <div className="flex items-center gap-5 mt-3">
                  <div className="text-center">
                    <p className="text-lg font-bold tracking-tight">{formatNumber(account.followers)}</p>
                    <p className="text-[11px] text-muted-foreground">粉丝</p>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div className="text-center">
                    <p className="text-lg font-bold tracking-tight">{formatNumber(account.following)}</p>
                    <p className="text-[11px] text-muted-foreground">关注</p>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div className="text-center">
                    <p className="text-lg font-bold tracking-tight">{formatNumber(account.likedCollected)}</p>
                    <p className="text-[11px] text-muted-foreground">获赞与收藏</p>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div className="text-center">
                    <p className="text-lg font-bold tracking-tight">{engagementRate}%</p>
                    <p className="text-[11px] text-muted-foreground">互动率</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Tabs */}
      {analysis && (
        <Tabs value={activeAnalysisTab} onValueChange={setActiveAnalysisTab}>
          <TabsList className="w-full grid grid-cols-4 h-9">
            <TabsTrigger value="overview" className="text-xs">数据总览</TabsTrigger>
            <TabsTrigger value="trends" className="text-xs">趋势分析</TabsTrigger>
            <TabsTrigger value="content" className="text-xs">内容洞察</TabsTrigger>
            <TabsTrigger value="ai" className="text-xs">AI建议</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: FileText, label: "总笔记数", value: analysis.totalPosts, bg: "stat-icon-gradient-rose" },
                { icon: Heart, label: "平均点赞", value: formatNumber(analysis.avgLikes), bg: "stat-icon-gradient-xhs" },
                { icon: MessageCircle, label: "平均评论", value: formatNumber(analysis.avgComments), bg: "stat-icon-gradient-emerald" },
                { icon: Bookmark, label: "平均收藏", value: formatNumber(analysis.avgCollects), bg: "stat-icon-gradient-amber" },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.label} className="card-hover">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shadow-sm", stat.bg)}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-lg font-bold tracking-tight stat-count-animate">{stat.value}</p>
                          <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Engagement Breakdown + Quick Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Engagement Composition */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-xhs" />
                    互动构成
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(() => {
                    const total = analysis.avgLikes + analysis.avgComments + analysis.avgCollects + analysis.avgShares;
                    if (total === 0) return <p className="text-xs text-muted-foreground">暂无数据</p>;
                    const items = [
                      { label: "点赞", value: analysis.avgLikes, color: "bg-red-400", pct: ((analysis.avgLikes / total) * 100).toFixed(1) },
                      { label: "评论", value: analysis.avgComments, color: "bg-emerald-400", pct: ((analysis.avgComments / total) * 100).toFixed(1) },
                      { label: "收藏", value: analysis.avgCollects, color: "bg-amber-400", pct: ((analysis.avgCollects / total) * 100).toFixed(1) },
                      { label: "分享", value: analysis.avgShares, color: "bg-rose-400", pct: ((analysis.avgShares / total) * 100).toFixed(1) },
                    ];
                    return (
                      <>
                        {/* Stacked bar */}
                        <div className="h-3 rounded-full overflow-hidden flex">
                          {items.map((item) => (
                            <div key={item.label} className={cn("h-full transition-all duration-500", item.color)} style={{ width: `${item.pct}%` }} />
                          ))}
                        </div>
                        {/* Legend */}
                        <div className="grid grid-cols-2 gap-2">
                          {items.map((item) => (
                            <div key={item.label} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                              <div className="flex items-center gap-2">
                                <div className={cn("w-2.5 h-2.5 rounded-full", item.color)} />
                                <span className="text-xs text-muted-foreground">{item.label}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-medium">{item.pct}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Top Posts Quick View */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-500" />
                      热门笔记
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="text-xs text-xhs hover:text-xhs-dark" onClick={() => setActiveTab("content")}>
                      查看全部 <ArrowUpRight className="w-3 h-3 ml-0.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {analysis.topPosts.length > 0 ? (
                    <div className="space-y-2">
                      {analysis.topPosts.slice(0, 5).map((post, i) => (
                        <div
                          key={post.id}
                          className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
                        >
                          <span className={cn(
                            "text-sm font-bold w-5 text-center shrink-0",
                            i === 0 ? "text-amber-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-orange-400" : "text-muted-foreground"
                          )}>
                            {i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium line-clamp-1">{post.title || "无标题"}</p>
                            <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-0.5 text-red-500">
                                <Heart className="w-3 h-3" />
                                {formatNumber(post.likes)}
                              </span>
                              <span className="flex items-center gap-0.5 text-emerald-500">
                                <MessageCircle className="w-3 h-3" />
                                {formatNumber(post.comments)}
                              </span>
                              <span className="flex items-center gap-0.5 text-amber-500">
                                <Bookmark className="w-3 h-3" />
                                {formatNumber(post.collects)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4">暂无热门笔记数据</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-500" />
                    点赞趋势
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TrendLineChart data={likesTrend} label="近14日点赞" color="#ef4444" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-emerald-500" />
                    评论趋势
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TrendLineChart data={commentsTrend} label="近14日评论" color="#10b981" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-amber-500" />
                    收藏趋势
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TrendLineChart data={collectsTrend} label="近14日收藏" color="#f59e0b" />
                </CardContent>
              </Card>

              {/* Best Posting Times Heatmap */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-xhs" />
                    最佳发布时间
                  </CardTitle>
                  <CardDescription className="text-[10px]">颜色越深表示该时段平均互动越高</CardDescription>
                </CardHeader>
                <CardContent>
                  <PostingTimeHeatmap data={analysis.bestPostingTimes} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Content Categories */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-xhs" />
                    内容分类
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analysis.contentCategories.length > 0 ? (
                    <div className="space-y-2.5">
                      {analysis.contentCategories.slice(0, 8).map((cat, i) => {
                        const maxCount = Math.max(...analysis.contentCategories.map((c) => c.count));
                        const pct = maxCount > 0 ? (cat.count / maxCount) * 100 : 0;
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-xs w-20 truncate text-right text-muted-foreground shrink-0">
                              {cat.name}
                            </span>
                            <div className="flex-1 h-5 bg-muted/50 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-xhs/60 to-xhs/30 rounded-full transition-all duration-700"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs font-medium w-8 text-right">{cat.count}篇</span>
                              <span className="text-[10px] text-muted-foreground w-16 text-right">
                                均{formatNumber(cat.avgEngagement)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4">暂无分类数据</p>
                  )}
                </CardContent>
              </Card>

              {/* Content Themes / Tags */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Hash className="w-4 h-4 text-xhs" />
                    热门标签
                  </CardTitle>
                  <CardDescription className="text-[10px]">基于笔记标签的使用频率</CardDescription>
                </CardHeader>
                <CardContent>
                  {analysis.contentThemes.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {analysis.contentThemes.slice(0, 20).map((theme, i) => {
                        const maxCount = Math.max(...analysis.contentThemes.map((t) => t.count));
                        const intensity = maxCount > 0 ? theme.count / maxCount : 0;
                        return (
                          <Badge
                            key={i}
                            variant="secondary"
                            className={cn(
                              "text-xs border-0 transition-all",
                              intensity > 0.7 ? "bg-xhs text-white" :
                              intensity > 0.4 ? "bg-xhs/20 text-xhs" : "bg-muted/80"
                            )}
                          >
                            #{theme.theme}
                            <span className="ml-1 opacity-70">×{theme.count}</span>
                          </Badge>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4">暂无标签数据</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* AI Tab */}
          <TabsContent value="ai" className="space-y-4 mt-4">
            {analysis.aiInsights ? (
              <Card className="border-xhs/20 bg-gradient-to-br from-xhs-light/30 to-transparent">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-xhs" />
                    AI 运营洞察
                  </CardTitle>
                  <CardDescription className="text-[10px]">基于账号数据的智能分析与建议</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* AI insights rendered as structured content */}
                    {analysis.aiInsights.split("\n").filter(Boolean).map((line, i) => {
                      const trimmed = line.trim();
                      if (trimmed.startsWith("-") || trimmed.startsWith("•") || trimmed.startsWith("*")) {
                        return (
                          <div key={i} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-xhs mt-1.5 shrink-0" />
                            <p className="text-sm text-foreground/80 leading-relaxed">{trimmed.replace(/^[-•*]\s*/, "")}</p>
                          </div>
                        );
                      }
                      if (trimmed.match(/^\d+[.、]/)) {
                        return (
                          <div key={i} className="flex items-start gap-2">
                            <div className="w-5 h-5 rounded-full bg-xhs/10 flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-[10px] font-bold text-xhs">{trimmed.match(/^\d+/)?.[0]}</span>
                            </div>
                            <p className="text-sm text-foreground/80 leading-relaxed">{trimmed.replace(/^\d+[.、]\s*/, "")}</p>
                          </div>
                        );
                      }
                      return <p key={i} className="text-sm text-foreground/80 leading-relaxed">{trimmed}</p>;
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Sparkles className="w-10 h-10 text-xhs/30 mx-auto mb-3" />
                  <p className="text-sm font-medium">暂无AI洞察</p>
                  <p className="text-xs text-muted-foreground mt-1">采集更多数据后，AI将自动生成运营建议</p>
                  <Button variant="outline" size="sm" className="mt-3 border-border text-xs" onClick={handleScrape} disabled={scraping}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                    采集数据
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Quick Action Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="cursor-pointer card-hover" onClick={() => setActiveTab("creator")}>
                <CardContent className="p-4 text-center">
                  <div className="w-10 h-10 rounded-xl bg-xhs-light flex items-center justify-center mx-auto mb-2">
                    <PenLine className="w-5 h-5 text-xhs" />
                  </div>
                  <p className="text-xs font-medium">创作内容</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">基于分析创作</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer card-hover" onClick={() => setActiveTab("persona")}>
                <CardContent className="p-4 text-center">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center mx-auto mb-2">
                    <Theater className="w-5 h-5 text-amber-500" />
                  </div>
                  <p className="text-xs font-medium">设置人设</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">优化创作风格</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer card-hover" onClick={handleScrape}>
                <CardContent className="p-4 text-center">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center mx-auto mb-2">
                    <RefreshCw className="w-5 h-5 text-emerald-500" />
                  </div>
                  <p className="text-xs font-medium">更新数据</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">重新采集分析</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
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


