"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMotionValue, useTransform, animate } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SparkLine, ProgressRing } from "@/components/charts";
import { formatNumber } from "@/lib/chart-utils";
import {
  Activity,
  RefreshCw,
  Eye,
  Heart,
  MessageSquare,
  Share2,
  Send,
  Zap,
  TrendingUp,
  Clock,
  Flame,
  Loader2,
} from "lucide-react";

// ─── Animated Counter Hook ────────────────────────────────────────────────────────

function useAnimatedNumber(target: number, duration = 0.5) {
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(motionVal, target, { duration, ease: "easeOut" });
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [motionVal, target, duration, rounded]);

  return display;
}

// ─── Types ──────────────────────────────────────────────────────────────────────

interface FeedItem {
  icon: "post" | "ai" | "engagement" | "milestone";
  label: string;
  time: string;
  value?: string;
}

// ─── Real-Time Metrics Widget ───────────────────────────────────────────────────

export function RealtimeMetricsWidget() {
  const contentPosts = useAppStore((s) => s.contentPosts);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>(
    new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  );

  // Compute stats from store
  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const posts = contentPosts.filter((p) => p.createdAt.slice(0, 10) === todayStr);

    const totalLikes = posts.reduce((s, p) => s + p.likes, 0);
    const totalComments = posts.reduce((s, p) => s + p.comments, 0);
    const totalShares = posts.reduce((s, p) => s + p.shares, 0);
    const totalViews = posts.reduce((s, p) => s + p.views, 0);
    const totalEngagement = posts.reduce((s, p) => s + p.likes + p.comments * 2 + p.shares * 3, 0);

    // Weekly sparkline data
    const now7 = new Date();
    now7.setDate(now7.getDate() - 6);
    const weeklyPosts = contentPosts.filter((p) => new Date(p.createdAt) >= now7);
    const weeklyTrend = weeklyPosts.reduce<number[]>((acc, p) => {
      const dayIdx = Math.min(
        Math.floor((new Date(p.createdAt).getTime() - now7.getTime()) / 86400000),
        6
      );
      if (dayIdx >= 0 && dayIdx < 7) acc[dayIdx] = (acc[dayIdx] || 0) + 1;
      return acc;
    }, new Array(7).fill(0));

    return {
      todayPosts: posts.length,
      totalEngagement,
      totalViews,
      totalLikes,
      weeklyTrend,
    };
  }, [contentPosts]);

  // Feed items
  const feed = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [];
    const now = new Date();
    const timeStr = now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });

    if (stats.todayPosts > 0) {
      items.push({
        icon: "post",
        label: `今日发布 ${stats.todayPosts} 条内容`,
        time: timeStr,
      });
    }
    if (stats.totalEngagement > 0) {
      items.push({
        icon: "engagement",
        label: `互动量累计 ${stats.totalEngagement}`,
        time: timeStr,
        value: `${stats.totalLikes} 赞 ${stats.totalComments} 评 ${stats.totalShares} 转`,
      });
    }
    if (stats.todayPosts > 0) {
      items.push({
        icon: "ai",
        label: "AI 辅助优化完成",
        time: timeStr,
      });
    }
    if (items.length > 0) {
      items.unshift({
        icon: "milestone",
        label: `运营指标已刷新`,
        time: "刚刚",
      });
    }
    return items.slice(0, 5);
  }, [stats]);

  // Animated counters
  const animatedPosts = useAnimatedNumber(stats.todayPosts, 0.4);
  const animatedEngagement = useAnimatedNumber(stats.totalEngagement, 0.4);
  const animatedViews = useAnimatedNumber(stats.totalViews, 0.4);
  const animatedLikes = useAnimatedNumber(stats.totalLikes, 0.4);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      setLastUpdated(new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    }, 600);
  }, []);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(handleRefresh, 30000);
    return () => clearInterval(interval);
  }, [handleRefresh]);

  const feedIcon = (type: FeedItem["icon"]) => {
    switch (type) {
      case "post": return <Send className="h-3.5 w-3.5 text-blue-500" />;
      case "ai": return <Zap className="h-3.5 w-3.5 text-violet-500" />;
      case "engagement": return <Heart className="h-3.5 w-3.5 text-rose-500" />;
      case "milestone": return <Flame className="h-3.5 w-3.5 text-amber-500" />;
    }
  };

  const metricCards = [
    {
      label: "今日发布",
      value: animatedPosts,
      suffix: "条",
      icon: <Send className="h-4 w-4 text-blue-500" />,
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      sparkData: stats.weeklyTrend,
      sparkColor: "#3b82f6",
    },
    {
      label: "互动量",
      value: animatedEngagement,
      suffix: "",
      icon: <TrendingUp className="h-4 w-4 text-emerald-500" />,
      color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      sparkData: stats.weeklyTrend,
      sparkColor: "#10b981",
    },
    {
      label: "浏览量",
      value: animatedViews,
      suffix: "",
      icon: <Eye className="h-4 w-4 text-cyan-500" />,
      color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
      sparkData: stats.weeklyTrend,
      sparkColor: "#06b6d4",
    },
    {
      label: "点赞数",
      value: animatedLikes,
      suffix: "",
      icon: <Heart className="h-4 w-4 text-rose-500" />,
      color: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
      sparkData: stats.weeklyTrend,
      sparkColor: "#f43f5e",
    },
  ];

  return (
    <div className="space-y-3">
      {/* Header with refresh */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-violet-500" />
          <span className="text-sm font-semibold">实时指标</span>
          {lastUpdated && (
            <span className="text-[10px] text-muted-foreground">更新于 {lastUpdated}</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <motion.div
            animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
            transition={refreshing ? { duration: 0.8, repeat: Infinity, ease: "linear" } : { duration: 0 }}
          >
            <RefreshCw className="h-3 w-3" />
          </motion.div>
          刷新
        </Button>
      </div>

      {/* 4 metric counter cards with sparklines */}
      <div className="grid grid-cols-2 gap-2">
        {metricCards.map((m) => (
          <motion.div
            key={m.label}
            className="metric-card"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`flex items-center justify-center h-7 w-7 rounded-lg ${m.color}`}>
                {m.icon}
              </div>
              <p className="text-[10px] text-muted-foreground">{m.label}</p>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <span className="metric-counter text-lg font-bold">{m.value}</span>
                {m.suffix && (
                  <span className="text-[10px] font-normal text-muted-foreground ml-0.5">
                    {m.suffix}
                  </span>
                )}
              </div>
              {m.sparkData.length > 0 && (
                <div className="metric-sparkline">
                  <SparkLine data={m.sparkData} color={m.sparkColor} width={44} height={16} />
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="metric-card text-center">
          <MessageSquare className="h-3.5 w-3.5 text-purple-500 mx-auto mb-1" />
          <p className="metric-counter text-sm font-bold">
            {contentPosts
              .filter((p) => p.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10))
              .reduce((s, p) => s + p.comments, 0)}
          </p>
          <p className="text-[9px] text-muted-foreground">评论</p>
        </div>
        <div className="metric-card text-center">
          <Share2 className="h-3.5 w-3.5 text-orange-500 mx-auto mb-1" />
          <p className="metric-counter text-sm font-bold">
            {contentPosts
              .filter((p) => p.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10))
              .reduce((s, p) => s + p.shares, 0)}
          </p>
          <p className="text-[9px] text-muted-foreground">转发</p>
        </div>
        <div className="metric-card text-center flex items-center justify-center">
          <ProgressRing
            value={contentPosts.length > 0
              ? Math.min(
                  Math.round(
                    (contentPosts.filter((p) => p.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10)).length / 3) * 100
                  ),
                  100
                )
              : 0}
            size={44}
            strokeWidth={4}
            color="#8b5cf6"
          />
        </div>
      </div>

      {/* Activity Feed */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-1 pt-2.5 px-3">
          <CardTitle className="flex items-center gap-2 text-xs font-semibold">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            动态流
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-2 pt-0">
          <div className="max-h-48 overflow-y-auto workspace-scroll">
            <AnimatePresence mode="popLayout">
              {feed.length > 0 ? (
                feed.map((item, i) => (
                  <motion.div
                    key={`${item.time}-${i}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.25, delay: i * 0.05 }}
                    className="activity-feed-item"
                  >
                    <div className="flex-shrink-0 mt-0.5">{feedIcon(item.icon)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-foreground leading-snug">{item.label}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{item.time}</span>
                      </div>
                      {item.value && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">{item.value}</p>
                      )}
                    </div>
                  </motion.div>
                ))
              ) : (
                <p className="text-[11px] text-muted-foreground py-6 text-center">暂无动态</p>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
