"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CONTENT_TYPE_LABELS, CONTENT_TYPE_COLORS, ContentType } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  BarChart3, TrendingUp, Heart, MessageSquare, Share2,
  Eye, Sparkles, Loader2, Trophy, Target, Zap,
  Download, FileJson, FileText
} from "lucide-react";
import { toast } from "sonner";

interface AnalyticsData {
  totalPosts: number;
  publishedCount: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalViews: number;
  avgScore: number;
  typeDistribution: Record<string, number>;
  statusDistribution: Record<string, number>;
  topPosts: Array<{
    id: string;
    topic: string;
    contentType: string;
    likes: number;
    comments: number;
    shares: number;
  }>;
}

export function AnalyticsPanel() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/analytics");
      if (res.ok) {
        setAnalytics(await res.json());
      }
    } catch (e) {
      console.error("Failed to fetch analytics:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: "json" | "text") => {
    try {
      const res = await fetch(`/api/export?format=${format}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `moments-plan-${new Date().toISOString().slice(0, 10)}.${format === "json" ? "json" : "txt"}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`已导出${format === "json" ? "JSON" : "文本"}文件`);
      }
    } catch {
      toast.error("导出失败");
    }
  };

  const handleAIAnalysis = async () => {
    if (!analytics) return;
    setAnalyzing(true);
    setAiAnalysis("");
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analytics, posts: analytics.topPosts }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiAnalysis(data.analysis);
        toast.success("AI分析完成");
      }
    } catch {
      toast.error("分析失败");
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-60 w-full rounded-lg" />
      </div>
    );
  }

  if (!analytics || analytics.totalPosts === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <BarChart3 className="h-10 w-10 mb-3 opacity-30" />
        <p className="text-sm">暂无数据</p>
        <p className="text-xs mt-1">生成内容计划后将自动展示数据分析</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-4 py-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Export Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs gap-1.5"
              onClick={() => handleExport("json")}
            >
              <FileJson className="h-3.5 w-3.5" />
              导出JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs gap-1.5"
              onClick={() => handleExport("text")}
            >
              <FileText className="h-3.5 w-3.5" />
              导出文本
            </Button>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "总内容", value: analytics.totalPosts, icon: BarChart3, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
              { label: "总点赞", value: analytics.totalLikes, icon: Heart, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-950/30" },
              { label: "总评论", value: analytics.totalComments, icon: MessageSquare, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30" },
              { label: "总转发", value: analytics.totalShares, icon: Share2, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
            ].map((stat) => (
              <Card key={stat.label} className="border-0 shadow-sm">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-lg ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{stat.value}</div>
                    <div className="text-[10px] text-muted-foreground">{stat.label}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Average Score */}
          <Card className="border-0 shadow-sm bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-amber-500" />
                <span className="text-sm font-medium">平均AI质量评分</span>
              </div>
              <span className="text-2xl font-bold text-amber-600">{analytics.avgScore}</span>
            </CardContent>
          </Card>

          {/* Content Type Distribution */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-3.5 w-3.5 text-primary" />
                </div>
                内容类型分布
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2.5">
              {Object.entries(analytics.typeDistribution).map(([type, count]) => {
                const percentage = Math.round((count / analytics.totalPosts) * 100);
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${CONTENT_TYPE_COLORS[type as ContentType] || ""}`}>
                        {CONTENT_TYPE_LABELS[type as ContentType] || type}
                      </Badge>
                      <span className="text-muted-foreground">{count} 条 ({percentage}%)</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="h-full bg-primary/60 rounded-full"
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Top Posts */}
          {analytics.topPosts.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="h-6 w-6 rounded bg-amber-500/10 flex items-center justify-center">
                    <Trophy className="h-3.5 w-3.5 text-amber-500" />
                  </div>
                  表现最佳内容
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {analytics.topPosts.slice(0, 5).map((post, index) => (
                  <div key={post.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <span className={`text-xs font-bold w-5 h-5 rounded flex items-center justify-center ${
                      index === 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" :
                      index === 1 ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300" :
                      "bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300"
                    }`}>
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{post.topic}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          <Heart className="h-2.5 w-2.5 inline mr-0.5" />{post.likes}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          <MessageSquare className="h-2.5 w-2.5 inline mr-0.5" />{post.comments}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          <Share2 className="h-2.5 w-2.5 inline mr-0.5" />{post.shares}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* AI Analysis */}
          <Card className="border-0 shadow-sm bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="h-6 w-6 rounded bg-violet-500/10 flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                </div>
                AI智能分析
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                AI将分析您的运营数据，提供优化建议和下一阶段策略
              </p>
              <Button
                onClick={handleAIAnalysis}
                disabled={analyzing}
                variant="outline"
                className="w-full border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-950/30"
                size="sm"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    分析中...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    开始AI分析
                  </>
                )}
              </Button>

              {aiAnalysis && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg bg-background p-3 border text-sm leading-relaxed whitespace-pre-wrap"
                >
                  {aiAnalysis}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </ScrollArea>
    </div>
  );
}
