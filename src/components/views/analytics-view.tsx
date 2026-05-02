"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/components/account-card";
import type { XhsPostInfo, XhsAccountInfo } from "@/types";
import {
  BarChart3,
  PieChart,
  Users,
  Target,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Eye,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  RefreshCw,
  Lightbulb,
  Flame,
  Clock,
  Zap,
} from "lucide-react";

// ─── Simulated / Derived Types ──────────────────────────────────────────

interface FunnelStage {
  label: string;
  icon: React.ReactNode;
  count: number;
  color: string;
  bgColor: string;
}

interface CategoryItem {
  name: string;
  count: number;
  avgEngagement: number;
  trend: "up" | "down" | "stable";
  color: string;
  percentage: number;
}

interface AgeGroup {
  range: string;
  percentage: number;
  count: number;
}

interface CompetitorMetric {
  name: string;
  icon: React.ReactNode;
  yourValue: number | string;
  industryAvg: number | string;
  top10: number | string;
  yourVsIndustry: "above" | "below" | "equal";
  yourVsTop10: "above" | "below" | "equal";
  yourPosition: number; // 0-100 percentile
  unit?: string;
}

// ─── Main Component ─────────────────────────────────────────────────────

export function AnalyticsView() {
  const [posts, setPosts] = useState<XhsPostInfo[]>([]);
  const [accounts, setAccounts] = useState<XhsAccountInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("funnel");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [accRes, postsRes] = await Promise.all([
        fetch("/api/accounts"),
        fetch("/api/posts?limit=50&sortBy=engagement"),
      ]);
      const accData = await accRes.json();
      const postsData = await postsRes.json();
      if (accData.success) setAccounts(accData.data || []);
      if (postsData.success) setPosts(postsData.data || []);
    } catch (err) {
      console.error("Failed to load analytics data:", err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Computed Data ──────────────────────────────────────────────────

  const totalFollowers = accounts.reduce((s, a) => s + (a.followers || 0), 0);

  const funnelData = useMemo((): FunnelStage[] => {
    const totalImpressions = Math.max(
      posts.reduce((s, p) => s + (p.likes + p.comments + p.collects + p.shares) * 8, 0),
      10000
    );
    const totalViews = Math.round(totalImpressions * 0.62);
    const totalLikes = posts.reduce((s, p) => s + p.likes, 0) || 1250;
    const totalComments = posts.reduce((s, p) => s + p.comments, 0) || 380;
    const totalCollects = posts.reduce((s, p) => s + p.collects, 0) || 520;
    const totalShares = posts.reduce((s, p) => s + p.shares, 0) || 145;

    return [
      {
        label: "曝光",
        icon: <Eye className="w-4 h-4" />,
        count: totalImpressions,
        color: "text-xhs",
        bgColor: "bg-xhs/15",
      },
      {
        label: "浏览",
        icon: <BarChart3 className="w-4 h-4" />,
        count: totalViews,
        color: "text-xhs-600",
        bgColor: "bg-xhs-200/50",
      },
      {
        label: "点赞",
        icon: <Heart className="w-4 h-4" />,
        count: totalLikes,
        color: "text-rose-500",
        bgColor: "bg-rose-50 dark:bg-rose-950/20",
      },
      {
        label: "评论",
        icon: <MessageCircle className="w-4 h-4" />,
        count: totalComments,
        color: "text-emerald-500",
        bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
      },
      {
        label: "收藏",
        icon: <Bookmark className="w-4 h-4" />,
        count: totalCollects,
        color: "text-amber-500",
        bgColor: "bg-amber-50 dark:bg-amber-950/20",
      },
      {
        label: "分享",
        icon: <Share2 className="w-4 h-4" />,
        count: totalShares,
        color: "text-violet-500",
        bgColor: "bg-violet-50 dark:bg-violet-950/20",
      },
    ];
  }, [posts]);

  const categoryData = useMemo((): CategoryItem[] => {
    if (posts.length === 0) return getSimulatedCategories();

    const catMap = new Map<string, { count: number; totalEng: number }>();
    for (const p of posts) {
      const cat = p.category || "未分类";
      const existing = catMap.get(cat) || { count: 0, totalEng: 0 };
      existing.count++;
      existing.totalEng += p.likes + p.comments + p.collects;
      catMap.set(cat, existing);
    }

    const total = posts.length;
    const colors = [
      "#FF2442", "#f59e0b", "#10b981", "#8b5cf6",
      "#ec4899", "#06b6d4", "#f97316", "#6366f1",
    ];

    return Array.from(catMap.entries())
      .map(([name, data], i) => ({
        name,
        count: data.count,
        avgEngagement: data.count > 0 ? Math.round(data.totalEng / data.count) : 0,
        trend: (Math.random() > 0.4 ? "up" : Math.random() > 0.5 ? "down" : "stable") as "up" | "down" | "stable",
        color: colors[i % colors.length],
        percentage: Math.round((data.count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [posts]);

  const ageData = useMemo((): AgeGroup[] => {
    return [
      { range: "18-24", percentage: 38, count: Math.round(totalFollowers * 0.38) },
      { range: "25-34", percentage: 32, count: Math.round(totalFollowers * 0.32) },
      { range: "35-44", percentage: 18, count: Math.round(totalFollowers * 0.18) },
      { range: "45+", percentage: 12, count: Math.round(totalFollowers * 0.12) },
    ];
  }, [totalFollowers]);

  const competitorMetrics = useMemo((): CompetitorMetric[] => {
    const avgFollowers = accounts.length > 0
      ? Math.round(accounts.reduce((s, a) => s + a.followers, 0) / accounts.length)
      : 5200;
    const avgEng = posts.length > 0
      ? posts.reduce((s, p) => s + p.likes + p.comments + p.collects, 0) / posts.length / Math.max(totalFollowers, 1) * 100
      : 4.2;
    const notesCount = accounts.length > 0
      ? Math.round(accounts.reduce((s, a) => s + a.notesCount, 0) / accounts.length)
      : 48;
    const avgEngPerPost = posts.length > 0
      ? Math.round(posts.reduce((s, p) => s + p.likes + p.comments + p.collects, 0) / posts.length)
      : 320;
    const growthSpeed = 12.5;

    return [
      {
        name: "粉丝数",
        icon: <Users className="w-4 h-4" />,
        yourValue: avgFollowers,
        industryAvg: 3800,
        top10: 25000,
        yourVsIndustry: avgFollowers > 3800 ? "above" : "below",
        yourVsTop10: avgFollowers > 25000 ? "above" : "below",
        yourPosition: Math.min(Math.round((avgFollowers / 25000) * 80), 95),
        unit: "",
      },
      {
        name: "互动率",
        icon: <Zap className="w-4 h-4" />,
        yourValue: avgEng.toFixed(1) + "%",
        industryAvg: "3.2%",
        top10: "8.5%",
        yourVsIndustry: avgEng > 3.2 ? "above" : "below",
        yourVsTop10: avgEng > 8.5 ? "above" : "below",
        yourPosition: Math.min(Math.round((avgEng / 8.5) * 75), 90),
        unit: "%",
      },
      {
        name: "笔记频率",
        icon: <Clock className="w-4 h-4" />,
        yourValue: notesCount + "篇/月",
        industryAvg: "12篇/月",
        top10: "30篇/月",
        yourVsIndustry: notesCount > 12 ? "above" : "below",
        yourVsTop10: notesCount > 30 ? "above" : "below",
        yourPosition: Math.min(Math.round((notesCount / 30) * 70), 85),
      },
      {
        name: "平均互动",
        icon: <Heart className="w-4 h-4" />,
        yourValue: avgEngPerPost,
        industryAvg: 180,
        top10: 1200,
        yourVsIndustry: avgEngPerPost > 180 ? "above" : "below",
        yourVsTop10: avgEngPerPost > 1200 ? "above" : "below",
        yourPosition: Math.min(Math.round((avgEngPerPost / 1200) * 70), 88),
      },
      {
        name: "增长速度",
        icon: <TrendingUp className="w-4 h-4" />,
        yourValue: growthSpeed + "%/月",
        industryAvg: "5%/月",
        top10: "18%/月",
        yourVsIndustry: growthSpeed > 5 ? "above" : "below",
        yourVsTop10: growthSpeed > 18 ? "above" : "below",
        yourPosition: Math.min(Math.round((growthSpeed / 18) * 70), 82),
        unit: "%/月",
      },
    ];
  }, [accounts, posts, totalFollowers]);

  // ─── Loading State ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-5 view-animate">
        <Skeleton className="h-10 w-64" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className={`h-9 w-24 skeleton-delay-${i}`} />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className={`h-48 rounded-xl skeleton-delay-${i}`} />
          ))}
        </div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 space-y-5 custom-scrollbar overflow-y-auto h-full pb-20 md:pb-6 view-animate">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-xhs" />
            数据洞察
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            深度分析运营数据，发现增长机会
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-border"
          onClick={loadData}
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          刷新
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 h-10">
          <TabsTrigger value="funnel" className="text-xs sm:text-sm gap-1">
            <Target className="w-3.5 h-3.5 hidden sm:inline-block" />
            互动漏斗
          </TabsTrigger>
          <TabsTrigger value="distribution" className="text-xs sm:text-sm gap-1">
            <PieChart className="w-3.5 h-3.5 hidden sm:inline-block" />
            内容分布
          </TabsTrigger>
          <TabsTrigger value="audience" className="text-xs sm:text-sm gap-1">
            <Users className="w-3.5 h-3.5 hidden sm:inline-block" />
            受众画像
          </TabsTrigger>
          <TabsTrigger value="benchmark" className="text-xs sm:text-sm gap-1">
            <Flame className="w-3.5 h-3.5 hidden sm:inline-block" />
            竞品对标
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab 1: 互动漏斗 ──────────────────────────────────────── */}
        <TabsContent value="funnel" className="space-y-5 mt-4">
          {/* Funnel Summary */}
          <Card className="border-xhs/15 bg-gradient-to-br from-xhs-light/30 to-transparent shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Target className="w-4 h-4 text-xhs" />
                转化漏斗
              </CardTitle>
              <CardDescription className="text-xs">
                从曝光到分享的完整转化路径，各阶段转化率一目了然
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FunnelVisualization data={funnelData} />
            </CardContent>
          </Card>

          {/* Conversion Rate Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {funnelData.slice(0, -1).map((stage, i) => {
              const nextStage = funnelData[i + 1];
              const convRate = stage.count > 0
                ? ((nextStage.count / stage.count) * 100).toFixed(1)
                : "0";
              return (
                <Card key={stage.label + "-conv"} className="card-hover shadow-sm">
                  <CardContent className="p-4 text-center">
                    <p className="text-[11px] text-muted-foreground mb-1">
                      {stage.label} → {nextStage.label}
                    </p>
                    <p className="text-xl font-bold tracking-tight text-xhs">
                      {convRate}%
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      转化率
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Insights */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                漏斗洞察
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(() => {
                  const browseRate = funnelData[0].count > 0
                    ? ((funnelData[1].count / funnelData[0].count) * 100).toFixed(1)
                    : "0";
                  const likeRate = funnelData[1].count > 0
                    ? ((funnelData[2].count / funnelData[1].count) * 100).toFixed(1)
                    : "0";
                  const insights = [
                    {
                      text: `浏览转化率 ${browseRate}%，${parseFloat(browseRate) > 60 ? "高于" : "低于"}行业平均水平（62%）`,
                      type: parseFloat(browseRate) > 60 ? "positive" as const : "negative" as const,
                    },
                    {
                      text: `点赞转化率 ${likeRate}%，建议优化首图和标题提升点击率`,
                      type: parseFloat(likeRate) > 12 ? "positive" as const : "neutral" as const,
                    },
                    {
                      text: "评论→收藏转化较好，内容深度获认可",
                      type: "positive" as const,
                    },
                    {
                      text: "收藏→分享转化有提升空间，可增加实用型内容",
                      type: "neutral" as const,
                    },
                  ];
                  return insights.map((insight, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                        insight.type === "positive" && "bg-emerald-500",
                        insight.type === "negative" && "bg-red-500",
                        insight.type === "neutral" && "bg-amber-500",
                      )} />
                      <p className="text-sm text-muted-foreground leading-relaxed">{insight.text}</p>
                    </div>
                  ));
                })()}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab 2: 内容分布 ──────────────────────────────────────── */}
        <TabsContent value="distribution" className="space-y-5 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Donut Chart */}
            <Card className="lg:col-span-2 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-xhs" />
                  分类占比
                </CardTitle>
                <CardDescription className="text-xs">
                  各内容类别的分布情况
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DonutChart data={categoryData} />
              </CardContent>
            </Card>

            {/* Category Ranked List */}
            <Card className="lg:col-span-3 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-xhs" />
                  分类详情
                </CardTitle>
                <CardDescription className="text-xs">
                  按发布数量排序，含平均互动与趋势
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                  {categoryData.map((cat, i) => (
                    <div
                      key={cat.name}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">
                          {i + 1}
                        </span>
                        <div
                          className="w-3 h-3 rounded-sm shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{cat.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">
                              {cat.count}篇
                            </span>
                            <Separator orientation="vertical" className="h-3" />
                            <span className="text-xs text-muted-foreground">
                              平均互动 {formatNumber(cat.avgEngagement)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary" className="text-xs border-0">
                          {cat.percentage}%
                        </Badge>
                        {cat.trend === "up" && (
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                        {cat.trend === "down" && (
                          <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                        )}
                        {cat.trend === "stable" && (
                          <Minus className="w-3.5 h-3.5 text-amber-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Content Performance Tips */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                内容优化建议
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {categoryData.slice(0, 3).map((cat, i) => {
                  const tips = [
                    `${cat.name}内容互动率最高，建议增加该类内容产出频率`,
                    `${cat.name}类内容可尝试结合热门话题提升曝光`,
                    `${cat.name}类内容收藏比高，适合做系列化内容`,
                  ];
                  return (
                    <div
                      key={cat.name}
                      className="p-3 rounded-lg border border-border/50 bg-gradient-to-br from-muted/30 to-transparent"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div
                          className="w-2.5 h-2.5 rounded-sm"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-xs font-medium">{cat.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {tips[i]}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab 3: 受众画像 ──────────────────────────────────────── */}
        <TabsContent value="audience" className="space-y-5 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Age Distribution */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-xhs" />
                  年龄分布
                </CardTitle>
                <CardDescription className="text-xs">
                  粉丝年龄结构分析
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {ageData.map((group) => (
                    <div key={group.range} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{group.range}岁</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {formatNumber(group.count)}
                          </span>
                          <span className="text-sm font-bold tabular-nums">
                            {group.percentage}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted/60 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-xhs to-xhs-400 transition-all duration-700 ease-out"
                          style={{ width: `${group.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="pt-3 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-xhs-light flex items-center justify-center">
                        <TrendingUp className="w-3 h-3 text-xhs" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        核心受众为 18-34 岁，占比 {ageData[0].percentage + ageData[1].percentage}%
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gender Split */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-xhs" />
                  性别分布
                </CardTitle>
                <CardDescription className="text-xs">
                  粉丝性别构成分析
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GenderDonutChart />
              </CardContent>
            </Card>
          </div>

          {/* Interests Tag Cloud */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                兴趣标签
              </CardTitle>
              <CardDescription className="text-xs">
                粉丝最感兴趣的话题领域
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InterestTagCloud />
            </CardContent>
          </Card>

          {/* Active Hours Heatmap */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-500" />
                活跃时段
              </CardTitle>
              <CardDescription className="text-xs">
                粉丝活跃度按时间段分布（越深代表越活跃）
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AudienceHeatmap />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab 4: 竞品对标 ──────────────────────────────────────── */}
        <TabsContent value="benchmark" className="space-y-5 mt-4">
          {/* Summary Banner */}
          <Card className="border-xhs/15 bg-gradient-to-br from-xhs-light/30 to-transparent shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl stat-icon-gradient-xhs flex items-center justify-center shadow-sm">
                  <Flame className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold">竞争力概览</p>
                  <p className="text-xs text-muted-foreground">
                    对比行业平均与 Top 10% 创作者
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {(() => {
                  const aboveCount = competitorMetrics.filter(m => m.yourVsIndustry === "above").length;
                  const total = competitorMetrics.length;
                  const score = Math.round((aboveCount / total) * 100);
                  return [
                    { label: "超越行业平均", value: `${aboveCount}/${total}项`, color: "text-emerald-600 dark:text-emerald-400" },
                    { label: "综合得分", value: `${score}分`, color: "text-xhs" },
                    { label: "行业排名", value: `前${100 - Math.round(score * 0.6)}%`, color: "text-amber-600 dark:text-amber-400" },
                  ];
                })().map((item) => (
                  <div key={item.label} className="text-center">
                    <p className={cn("text-lg font-bold", item.color)}>{item.value}</p>
                    <p className="text-[11px] text-muted-foreground">{item.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Comparison Cards */}
          <div className="space-y-3">
            {competitorMetrics.map((metric) => (
              <BenchmarkCard key={metric.name} metric={metric} />
            ))}
          </div>

          {/* Tips */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                提升建议
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {competitorMetrics
                  .filter((m) => m.yourVsIndustry === "below")
                  .slice(0, 3)
                  .map((metric) => {
                    const tips: Record<string, string> = {
                      "粉丝数": "持续输出优质内容，结合热门话题提升曝光，定期与粉丝互动",
                      "互动率": "优化内容开头吸引力，增加互动引导语，回复评论提升互动氛围",
                      "笔记频率": "制定内容日历，保持稳定发布节奏，可储备内容避免断更",
                      "平均互动": "提升内容质量，优化标题和封面，增加实用性和分享价值",
                      "增长速度": "关注平台热点，参与话题活动，与其他创作者联动互助",
                    };
                    return (
                      <div key={metric.name} className="flex items-start gap-2.5">
                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-amber-500" />
                        <div>
                          <p className="text-sm font-medium">{metric.name}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                            {tips[metric.name] || "持续优化该指标以缩小与行业差距"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                {competitorMetrics.filter((m) => m.yourVsIndustry === "below").length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    🎉 各项指标均超过行业平均水平，继续保持！
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────────

/** SVG Funnel Visualization */
function FunnelVisualization({ data }: { data: FunnelStage[] }) {
  const maxCount = data[0]?.count || 1;
  const svgWidth = 600;
  const svgHeight = 360;
  const paddingY = 20;
  const barHeight = 36;
  const gapY = 16;
  const totalHeight = data.length * barHeight + (data.length - 1) * gapY;
  const startY = (svgHeight - totalHeight) / 2;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full min-w-[320px] max-w-[600px] mx-auto"
      >
        <defs>
          {data.map((stage, i) => {
            const gradientId = `funnel-grad-${i}`;
            const colors = [
              ["#FF2442", "#FF5C72"],
              ["#FF5C72", "#FF8D9A"],
              ["#f43f5e", "#fb7185"],
              ["#10b981", "#34d399"],
              ["#f59e0b", "#fbbf24"],
              ["#8b5cf6", "#a78bfa"],
            ];
            return (
              <linearGradient key={gradientId} id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={colors[i]?.[0] || "#FF2442"} />
                <stop offset="100%" stopColor={colors[i]?.[1] || "#FF5C72"} />
              </linearGradient>
            );
          })}
        </defs>

        {data.map((stage, i) => {
          const widthRatio = Math.max(stage.count / maxCount, 0.08);
          const barWidth = widthRatio * (svgWidth - 200);
          const x = 120;
          const y = startY + i * (barHeight + gapY);

          return (
            <g key={stage.label}>
              {/* Label */}
              <text
                x={x - 12}
                y={y + barHeight / 2 + 1}
                textAnchor="end"
                dominantBaseline="central"
                className="text-xs fill-muted-foreground"
                fontSize="13"
                fontWeight="500"
              >
                {stage.label}
              </text>

              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={6}
                fill={`url(#funnel-grad-${i})`}
                opacity={0.9}
              >
                <animate
                  attributeName="width"
                  from="0"
                  to={barWidth}
                  dur="0.8s"
                  fill="freeze"
                  calcMode="spline"
                  keySplines="0.25 0.46 0.45 0.94"
                />
              </rect>

              {/* Count inside bar */}
              <text
                x={x + barWidth - 8}
                y={y + barHeight / 2 + 1}
                textAnchor="end"
                dominantBaseline="central"
                className="fill-white"
                fontSize="12"
                fontWeight="700"
              >
                {formatNumber(stage.count)}
              </text>

              {/* Conversion arrow between stages */}
              {i < data.length - 1 && (() => {
                const nextWidthRatio = Math.max(data[i + 1].count / maxCount, 0.08);
                const nextBarWidth = nextWidthRatio * (svgWidth - 200);
                const arrowY = y + barHeight + gapY / 2;
                const convRate = stage.count > 0
                  ? ((data[i + 1].count / stage.count) * 100).toFixed(1)
                  : "0";

                return (
                  <g>
                    <line
                      x1={x + barWidth / 2}
                      y1={y + barHeight}
                      x2={x + nextBarWidth / 2}
                      y2={y + barHeight + gapY}
                      stroke="currentColor"
                      className="text-border"
                      strokeWidth="1"
                      strokeDasharray="4 2"
                    />
                    <rect
                      x={x + Math.min(barWidth, nextBarWidth) / 2 - 22}
                      y={arrowY - 8}
                      width="44"
                      height="16"
                      rx="4"
                      className="fill-muted"
                    />
                    <text
                      x={x + Math.min(barWidth, nextBarWidth) / 2}
                      y={arrowY}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="fill-muted-foreground"
                      fontSize="9"
                      fontWeight="600"
                    >
                      {convRate}%
                    </text>
                  </g>
                );
              })()}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** SVG Donut Chart for Content Distribution */
function DonutChart({ data }: { data: CategoryItem[] }) {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 85;
  const innerR = 52;
  const total = data.reduce((s, d) => s + d.count, 0) || 1;

  const slices = useMemo(() => {
    const accumulated = data.reduce<{ items: Array<CategoryItem & { pathD: string; angle: number }>; currentAngle: number }>(
      (acc, item) => {
        const sliceAngle = (item.count / total) * 360;
        const startAngle = acc.currentAngle;
        const endAngle = acc.currentAngle + sliceAngle;

        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;

        const x1Outer = cx + outerR * Math.cos(startRad);
        const y1Outer = cy + outerR * Math.sin(startRad);
        const x2Outer = cx + outerR * Math.cos(endRad);
        const y2Outer = cy + outerR * Math.sin(endRad);
        const x1Inner = cx + innerR * Math.cos(endRad);
        const y1Inner = cy + innerR * Math.sin(endRad);
        const x2Inner = cx + innerR * Math.cos(startRad);
        const y2Inner = cy + innerR * Math.sin(startRad);

        const largeArcFlag = sliceAngle > 180 ? 1 : 0;

        const pathD = [
          `M ${x1Outer} ${y1Outer}`,
          `A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${x2Outer} ${y2Outer}`,
          `L ${x1Inner} ${y1Inner}`,
          `A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${x2Inner} ${y2Inner}`,
          "Z",
        ].join(" ");

        acc.items.push({ ...item, pathD, angle: sliceAngle });
        acc.currentAngle = endAngle;
        return acc;
      },
      { items: [], currentAngle: -90 }
    );
    return accumulated.items;
  }, [data, total, cx, cy, outerR, innerR]);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-48 h-48">
        {slices.map((slice) => (
          <path
            key={slice.name}
            d={slice.pathD}
            fill={slice.color}
            opacity={0.85}
            className="transition-all duration-200 hover:opacity-100"
            stroke="white"
            strokeWidth="1"
          />
        ))}
        {/* Center text */}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-foreground"
          fontSize="20"
          fontWeight="700"
        >
          {data.length}
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-muted-foreground"
          fontSize="10"
        >
          个分类
        </text>
      </svg>
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-3">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[11px] text-muted-foreground">
              {item.name} {item.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Gender Donut Chart */
function GenderDonutChart() {
  const malePct = 35;
  const femalePct = 65;

  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r = 60;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * r;

  const femaleOffset = 0;
  const maleOffset = (femalePct / 100) * circumference;

  return (
    <div className="flex items-center gap-6">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-32 h-32 shrink-0">
        {/* Background circle */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          className="stroke-muted"
          strokeWidth={strokeWidth}
        />
        {/* Female arc */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#FF2442"
          strokeWidth={strokeWidth}
          strokeDasharray={`${(femalePct / 100) * circumference} ${circumference}`}
          strokeDashoffset={-femaleOffset}
          strokeLinecap="butt"
          transform={`rotate(-90 ${cx} ${cy})`}
          opacity={0.85}
        />
        {/* Male arc */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={strokeWidth}
          strokeDasharray={`${(malePct / 100) * circumference} ${circumference}`}
          strokeDashoffset={-maleOffset}
          strokeLinecap="butt"
          transform={`rotate(-90 ${cx} ${cy})`}
          opacity={0.85}
        />
        {/* Center text */}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-foreground"
          fontSize="18"
          fontWeight="700"
        >
          {femalePct}%
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-muted-foreground"
          fontSize="9"
        >
          女性占比
        </text>
      </svg>
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-sm bg-xhs" />
          <div>
            <p className="text-sm font-medium">女性</p>
            <p className="text-xs text-muted-foreground">{femalePct}%</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-sm bg-blue-500" />
          <div>
            <p className="text-sm font-medium">男性</p>
            <p className="text-xs text-muted-foreground">{malePct}%</p>
          </div>
        </div>
        <div className="pt-2 border-t border-border/50">
          <p className="text-[11px] text-muted-foreground">
            💡 小红书用户以女性为主，内容策略可侧重女性偏好
          </p>
        </div>
      </div>
    </div>
  );
}

/** Interest Tag Cloud */
function InterestTagCloud() {
  const tags = [
    { text: "美妆护肤", intensity: 5 },
    { text: "穿搭时尚", intensity: 4 },
    { text: "美食探店", intensity: 4 },
    { text: "旅行攻略", intensity: 3 },
    { text: "健身运动", intensity: 3 },
    { text: "家居装修", intensity: 2 },
    { text: "母婴育儿", intensity: 3 },
    { text: "数码科技", intensity: 2 },
    { text: "职场成长", intensity: 2 },
    { text: "读书分享", intensity: 1 },
    { text: "摄影技巧", intensity: 2 },
    { text: "宠物萌宠", intensity: 3 },
    { text: "手工DIY", intensity: 1 },
    { text: "学习方法", intensity: 2 },
    { text: "减脂餐", intensity: 2 },
    { text: "收纳整理", intensity: 1 },
  ];

  const getColor = (intensity: number) => {
    switch (intensity) {
      case 5: return "bg-xhs text-white shadow-sm shadow-xhs/20";
      case 4: return "bg-xhs/80 text-white";
      case 3: return "bg-xhs-light text-xhs dark:bg-xhs/20 dark:text-xhs-300";
      case 2: return "bg-xhs-light/60 text-xhs-600 dark:bg-xhs/10 dark:text-xhs-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getSize = (intensity: number) => {
    switch (intensity) {
      case 5: return "text-sm px-4 py-1.5";
      case 4: return "text-sm px-3.5 py-1.5";
      case 3: return "text-xs px-3 py-1.5";
      case 2: return "text-xs px-2.5 py-1";
      default: return "text-[11px] px-2 py-0.5";
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag.text}
          className={cn(
            "rounded-full font-medium transition-all duration-200 cursor-default",
            getColor(tag.intensity),
            getSize(tag.intensity),
            tag.intensity >= 4 && "hover:scale-105"
          )}
        >
          {tag.text}
          {tag.intensity >= 4 && (
            <span className="ml-1 opacity-70">×{tag.intensity}</span>
          )}
        </span>
      ))}
    </div>
  );
}

/** Audience Active Hours Heatmap */
function AudienceHeatmap() {
  const days = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
  const timeSlots = [
    { label: "6-9时", emoji: "🌅" },
    { label: "9-12时", emoji: "☀️" },
    { label: "12-15时", emoji: "🌤️" },
    { label: "15-18时", emoji: "⛅" },
    { label: "18-21时", emoji: "🌇" },
    { label: "21-24时", emoji: "🌙" },
  ];

  // Simulated heatmap data (0-100 scale)
  const heatData = [
    [25, 30, 45, 35, 55, 40],  // Mon
    [30, 35, 50, 40, 60, 50],  // Tue
    [28, 40, 48, 42, 65, 55],  // Wed
    [22, 38, 52, 38, 70, 60],  // Thu
    [20, 32, 45, 35, 75, 65],  // Fri
    [40, 55, 60, 50, 85, 80],  // Sat
    [45, 50, 55, 48, 80, 75],  // Sun
  ];

  const getHeatColor = (value: number) => {
    if (value >= 70) return "bg-xhs/80 text-white";
    if (value >= 50) return "bg-xhs/50 text-xhs-900 dark:text-white";
    if (value >= 35) return "bg-xhs-light text-xhs dark:bg-xhs/20 dark:text-xhs-300";
    if (value >= 20) return "bg-xhs-light/50 text-xhs-600 dark:bg-xhs/10 dark:text-xhs-400";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[400px]">
        {/* Time header */}
        <div className="flex items-center gap-1 mb-1">
          <div className="w-10 shrink-0" />
          {timeSlots.map((slot) => (
            <div key={slot.label} className="flex-1 text-center">
              <span className="text-[10px] text-muted-foreground">
                {slot.emoji} {slot.label}
              </span>
            </div>
          ))}
        </div>
        {/* Heatmap rows */}
        {days.map((day, dayIdx) => (
          <div key={day} className="flex items-center gap-1 mb-1">
            <div className="w-10 shrink-0 text-right">
              <span className="text-[11px] text-muted-foreground font-medium">{day}</span>
            </div>
            {heatData[dayIdx].map((value, slotIdx) => (
              <div
                key={slotIdx}
                className={cn(
                  "flex-1 h-9 rounded-md flex items-center justify-center transition-all duration-200 cursor-default hover:scale-105",
                  getHeatColor(value)
                )}
              >
                <span className="text-[10px] font-medium tabular-nums">{value}</span>
              </div>
            ))}
          </div>
        ))}
        {/* Legend */}
        <div className="flex items-center justify-center gap-3 mt-3 pt-2 border-t border-border/50">
          <span className="text-[10px] text-muted-foreground">低</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-3 rounded-sm bg-muted" />
            <div className="w-4 h-3 rounded-sm bg-xhs-light/50 dark:bg-xhs/10" />
            <div className="w-4 h-3 rounded-sm bg-xhs-light dark:bg-xhs/20" />
            <div className="w-4 h-3 rounded-sm bg-xhs/50" />
            <div className="w-4 h-3 rounded-sm bg-xhs/80" />
          </div>
          <span className="text-[10px] text-muted-foreground">高</span>
        </div>
      </div>
    </div>
  );
}

/** Benchmark Comparison Card */
function BenchmarkCard({ metric }: { metric: CompetitorMetric }) {
  const getIndicator = (comparison: "above" | "below" | "equal") => {
    switch (comparison) {
      case "above":
        return <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />;
      case "below":
        return <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />;
      case "equal":
        return <Minus className="w-3.5 h-3.5 text-amber-500" />;
    }
  };

  const getLabel = (comparison: "above" | "below" | "equal") => {
    switch (comparison) {
      case "above": return "领先";
      case "below": return "落后";
      case "equal": return "持平";
    }
  };

  const getLabelColor = (comparison: "above" | "below" | "equal") => {
    switch (comparison) {
      case "above": return "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/20";
      case "below": return "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/20";
      case "equal": return "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/20";
    }
  };

  return (
    <Card className="card-hover shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-xhs-light to-xhs-light/40 flex items-center justify-center text-xhs">
            {metric.icon}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{metric.name}</p>
          </div>
          <div className="flex items-center gap-1.5">
            {getIndicator(metric.yourVsIndustry)}
            <Badge variant="secondary" className={cn("text-[10px] border-0", getLabelColor(metric.yourVsIndustry))}>
              {getLabel(metric.yourVsIndustry)}
            </Badge>
          </div>
        </div>

        {/* Three-column comparison */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="text-center p-2 rounded-lg bg-xhs-light/30 dark:bg-xhs/10">
            <p className="text-[10px] text-muted-foreground mb-0.5">你的数据</p>
            <p className="text-sm font-bold text-xhs tabular-nums">
              {typeof metric.yourValue === "number" ? formatNumber(metric.yourValue) : metric.yourValue}
            </p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-[10px] text-muted-foreground mb-0.5">行业平均</p>
            <p className="text-sm font-bold tabular-nums">
              {typeof metric.industryAvg === "number" ? formatNumber(metric.industryAvg) : metric.industryAvg}
            </p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-[10px] text-muted-foreground mb-0.5">Top 10%</p>
            <p className="text-sm font-bold tabular-nums">
              {typeof metric.top10 === "number" ? formatNumber(metric.top10) : metric.top10}
            </p>
          </div>
        </div>

        {/* Position bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>行业位置</span>
            <span className="font-medium">前{100 - metric.yourPosition}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted/60 overflow-hidden relative">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700 ease-out",
                metric.yourVsIndustry === "above"
                  ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                  : metric.yourVsIndustry === "below"
                  ? "bg-gradient-to-r from-xhs/60 to-xhs"
                  : "bg-gradient-to-r from-amber-400 to-amber-500"
              )}
              style={{ width: `${metric.yourPosition}%` }}
            />
            {/* Marker for industry average */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-muted-foreground/40"
              style={{ left: "50%" }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Helper ──────────────────────────────────────────────────────────────

function getSimulatedCategories(): CategoryItem[] {
  return [
    { name: "美妆护肤", count: 28, avgEngagement: 1250, trend: "up", color: "#FF2442", percentage: 28 },
    { name: "穿搭时尚", count: 22, avgEngagement: 980, trend: "up", color: "#f59e0b", percentage: 22 },
    { name: "美食探店", count: 18, avgEngagement: 860, trend: "stable", color: "#10b981", percentage: 18 },
    { name: "旅行攻略", count: 14, avgEngagement: 720, trend: "down", color: "#8b5cf6", percentage: 14 },
    { name: "生活方式", count: 10, avgEngagement: 540, trend: "up", color: "#ec4899", percentage: 10 },
    { name: "家居好物", count: 8, avgEngagement: 410, trend: "stable", color: "#06b6d4", percentage: 8 },
  ];
}
