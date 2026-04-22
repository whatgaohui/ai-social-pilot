"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  CalendarDays,
  FileText,
  Eye,
  Heart,
  MessageSquare,
  Share2,
  Star,
  Sparkles,
} from "lucide-react";
import { useAppStore } from "@/store/app-store";

export function WeeklyStatsCard() {
  const { contentPosts, platform } = useAppStore();

  const stats = useMemo(() => {
    const now = new Date();
    // Get start of this week (Monday)
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);

    // Get start of last week
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(weekStart.getDate() - 7);

    // Filter this week's posts
    const thisWeekPosts = contentPosts.filter((post) => {
      if (!post.scheduledDate) return false;
      const postDate = new Date(post.scheduledDate);
      return postDate >= weekStart && postDate <= now;
    });

    // Filter last week's posts
    const lastWeekPosts = contentPosts.filter((post) => {
      if (!post.scheduledDate) return false;
      const postDate = new Date(post.scheduledDate);
      return postDate >= lastWeekStart && postDate < weekStart;
    });

    // Aggregate this week
    const thisWeekTotal = thisWeekPosts.length;
    const thisWeekViews = thisWeekPosts.reduce((sum, p) => sum + (p.views || 0), 0);
    const thisWeekLikes = thisWeekPosts.reduce((sum, p) => sum + (p.likes || 0), 0);
    const thisWeekComments = thisWeekPosts.reduce((sum, p) => sum + (p.comments || 0), 0);
    const thisWeekShares = thisWeekPosts.reduce((sum, p) => sum + (p.shares || 0), 0);
    const thisWeekFavorites = thisWeekPosts.reduce((sum, p) => sum + (p.favorites || 0), 0);
    const thisWeekPublished = thisWeekPosts.filter((p) => p.status === "published").length;

    // Aggregate last week
    const lastWeekTotal = lastWeekPosts.length;
    const lastWeekLikes = lastWeekPosts.reduce((sum, p) => sum + (p.likes || 0), 0);

    // Engagement rate
    const engagementRate = thisWeekViews > 0
      ? ((thisWeekLikes + thisWeekComments + thisWeekShares) / thisWeekViews * 100).toFixed(1)
      : "0";

    // Trend calculation
    const contentTrend = lastWeekTotal > 0
      ? ((thisWeekTotal - lastWeekTotal) / lastWeekTotal * 100)
      : thisWeekTotal > 0 ? 100 : 0;

    const likesTrend = lastWeekLikes > 0
      ? ((thisWeekLikes - lastWeekLikes) / lastWeekLikes * 100)
      : thisWeekLikes > 0 ? 100 : 0;

    // Published rate
    const publishedRate = thisWeekTotal > 0
      ? Math.round(thisWeekPublished / thisWeekTotal * 100)
      : 0;

    return {
      thisWeekTotal,
      thisWeekViews,
      thisWeekLikes,
      thisWeekComments,
      thisWeekShares,
      thisWeekFavorites,
      thisWeekPublished,
      publishedRate,
      engagementRate,
      contentTrend,
      likesTrend,
      daysActive: new Set(thisWeekPosts.map(p => p.scheduledDate?.slice(0, 10))).size,
    };
  }, [contentPosts]);

  const TrendIcon = ({ value }: { value: number }) => {
    if (value > 0) return <TrendingUp className="h-3 w-3 text-emerald-500" />;
    if (value < 0) return <TrendingDown className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  const trendColor = (value: number) => {
    if (value > 0) return "text-emerald-500";
    if (value < 0) return "text-red-500";
    return "text-muted-foreground";
  };

  // Week range label
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const weekLabel = `${monday.getMonth() + 1}月${monday.getDate()}日 - 本周`;

  const metrics = [
    { icon: FileText, label: "内容", value: stats.thisWeekTotal, suffix: "篇", color: "text-violet-500", bgColor: "bg-violet-500/10" },
    { icon: Eye, label: "浏览", value: stats.thisWeekViews, suffix: "", color: "text-cyan-500", bgColor: "bg-cyan-500/10" },
    { icon: Heart, label: "点赞", value: stats.thisWeekLikes, suffix: "", color: "text-rose-500", bgColor: "bg-rose-500/10", trend: stats.likesTrend },
    { icon: MessageSquare, label: "评论", value: stats.thisWeekComments, suffix: "", color: "text-amber-500", bgColor: "bg-amber-500/10" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-border/50 overflow-hidden">
        {/* Header */}
        <div className={`px-4 py-2.5 bg-gradient-to-r ${
          platform === 'wechat'
            ? 'from-violet-500/5 to-purple-500/5'
            : 'from-rose-500/5 to-red-500/5'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="h-3 w-3 text-white" />
              </div>
              <span className="text-xs font-semibold">本周数据</span>
            </div>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              <CalendarDays className="h-2.5 w-2.5 mr-1" />
              {weekLabel}
            </Badge>
          </div>
        </div>

        <CardContent className="p-3 space-y-3">
          {/* Main metrics grid */}
          <div className="grid grid-cols-4 gap-2">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.label} className="text-center">
                  <div className={`inline-flex items-center justify-center h-7 w-7 rounded-lg ${metric.bgColor} mb-1`}>
                    <Icon className={`h-3.5 w-3.5 ${metric.color}`} />
                  </div>
                  <div className="text-sm font-bold">{metric.value}{metric.suffix}</div>
                  <div className="text-[10px] text-muted-foreground">{metric.label}</div>
                  {metric.trend !== undefined && (
                    <div className={`flex items-center justify-center gap-0.5 mt-0.5 ${trendColor(metric.trend)}`}>
                      <TrendIcon value={metric.trend} />
                      <span className="text-[9px]">{metric.trend > 0 ? "+" : ""}{Math.round(metric.trend)}%</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sub metrics row */}
          <div className="flex items-center justify-between pt-1 border-t border-border/50">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Share2 className="h-3 w-3" />
                <span>转发 {stats.thisWeekShares}</span>
              </div>
              {platform === 'xiaohongshu' && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Star className="h-3 w-3" />
                  <span>收藏 {stats.thisWeekFavorites}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="text-[10px] text-muted-foreground">
                互动率 <span className="font-medium text-foreground">{stats.engagementRate}%</span>
              </div>
              <div className="h-1.5 w-12 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${
                    parseFloat(stats.engagementRate) >= 5 ? "bg-gradient-to-r from-emerald-500 to-teal-400" :
                    parseFloat(stats.engagementRate) >= 2 ? "bg-gradient-to-r from-amber-500 to-orange-400" :
                    "bg-gradient-to-r from-red-400 to-rose-500"
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(parseFloat(stats.engagementRate) * 5, 100)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>

          {/* Active days indicator */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground mr-1">活跃天数</span>
            {[1,2,3,4,5,6,7].map(d => (
              <div
                key={d}
                className={`h-1.5 flex-1 rounded-full ${
                  d <= stats.daysActive
                    ? platform === 'wechat'
                      ? 'bg-gradient-to-r from-violet-500 to-purple-500'
                      : 'bg-gradient-to-r from-rose-500 to-red-500'
                    : 'bg-muted'
                }`}
              />
            ))}
            <span className="text-[10px] font-medium ml-1">{stats.daysActive}/7</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
