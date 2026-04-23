"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  SparkLine,
  PieChart,
  ProgressChart,
} from "@/components/charts";
import { formatNumber, CHART_PALETTE } from "@/lib/chart-utils";
import {
  Activity,
  Clock,
  Zap,
  RefreshCw,
  Eye,
  Heart,
  MessageSquare,
  Share2,
  Send,
  Flame,
  BarChart3,
  TrendingUp,
  Star,
} from "lucide-react";

// ─── Animated Counter Hook ────────────────────────────────────────────────────────

function useAnimatedNumber(target: number, duration = 0.6) {
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

interface QuickStats {
  todayPosts: number;
  todayEngagement: number;
  aiOperations: number;
  todayViews: number;
  todayLikes: number;
  weeklyTrendPosts: number[];
  weeklyTrendEngagement: number[];
  weeklyTrendAI: number[];
  weeklyTrendViews: number[];
  platformSplit: { label: string; value: number; color: string }[];
}

interface FeedItem {
  icon: "post" | "ai" | "engagement" | "milestone";
  label: string;
  time: string;
  value?: string;
}

// ─── Real-Time Metrics Component ───────────────────────────────────────────────────

export function RealtimeMetrics() {
  const contentPosts = useAppStore((s) => s.contentPosts);
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(false);

  const todayPosts = useAnimatedNumber(stats?.todayPosts ?? 0, 0.5);
  const todayEngagement = useAnimatedNumber(stats?.todayEngagement ?? 0, 0.5);
  const aiOps = useAnimatedNumber(stats?.aiOperations ?? 0, 0.5);
  const todayViews = useAnimatedNumber(stats?.todayViews ?? 0, 0.5);
  const todayLikes = useAnimatedNumber(stats?.todayLikes ?? 0, 0.5);

  // Compute stats from store (simulated real-time)
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    const computeStats = () => {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const posts = contentPosts.filter(
        (p) => p.createdAt.slice(0, 10) === todayStr
      );
      const wcPosts = posts.filter(
        (p) => !p.platform || p.platform === "wechat"
      );
      const xhsPosts = posts.filter((p) => p.platform === "xiaohongshu");

      const totalEngagement = posts.reduce(
        (s, p) => s + p.likes + p.comments * 2 + p.shares * 3,
        0
      );
      const aiPosts = posts.filter(
        (p) => p.generationType === "auto"
      );

      const now7 = new Date();
      now7.setDate(now7.getDate() - 6);
      const weeklyPosts = contentPosts.filter(
        (p) => new Date(p.createdAt) >= now7
      );
      const weeklyTrendPosts = weeklyPosts
        .reduce<Array<number[]>>(
          (acc, _p, idx) => {
            const dayIdx = Math.min(
              Math.floor(
                (new Date(_p.createdAt).getTime() - now7.getTime()) /
                  (86400000)
              ),
              6
            );
            if (!acc[dayIdx]) acc[dayIdx] = [];
            acc[dayIdx].push(1);
            return acc;
          },
          []
        )
        .map((day) => day.length);
      const weeklyTrendEngagement = weeklyPosts
        .reduce<Array<number[]>>(
          (acc, p) => {
            const dayIdx = Math.min(
              Math.floor(
                (new Date(p.createdAt).getTime() - now7.getTime()) /
                  (86400000)
              ),
              6
            );
            const eng = p.likes + p.comments * 2 + p.shares * 3;
            if (!acc[dayIdx]) acc[dayIdx] = [];
            acc[dayIdx].push(eng);
            return acc;
          },
          []
        )
        .map((day) => day.reduce((a, b) => a + b, 0));
      const weeklyTrendAI = weeklyPosts
        .reduce<Array<number[]>>(
          (acc, p) => {
            const dayIdx = Math.min(
              Math.floor(
                (new Date(p.createdAt).getTime() - now7.getTime()) /
                  (86400000)
              ),
              6
            );
            if (acc[dayIdx]) acc[dayIdx].push(1);
            return acc;
          },
          []
        )
        .map((day) => day.length);
      const weeklyTrendViews = weeklyPosts
        .reduce<Array<number[]>>(
          (acc, p) => {
            const dayIdx = Math.min(
              Math.floor(
                (new Date(p.createdAt).getTime() - now7.getTime()) /
                  (86400000)
              ),
              6
            );
            if (acc[dayIdx]) acc[dayIdx].push(p.views);
            return acc;
          },
          []
        )
        .map((day) => day.reduce((a, b) => a + b, 0));

      const platformSplit = [
        {
          label: "朋友圈",
          value: wcPosts.length,
          color: "#10b981",
        },
        {
          label: "小红书",
          value: xhsPosts.length,
          color: "#f43f5e",
        },
      ];

      setStats({
        todayPosts: posts.length,
        todayEngagement: totalEngagement,
        aiOperations: aiPosts.length,
        todayViews: posts.reduce((s, p) => s + p.views, 0),
        todayLikes: posts.reduce((s, p) => s + p.likes, 0),
        weeklyTrendPosts,
        weeklyTrendEngagement,
        weeklyTrendAI,
        weeklyTrendViews,
        platformSplit,
      });

      // Generate feed
      const items: FeedItem[] = [];
      if (posts.length > 0) {
        items.push({
          icon: "post",
          label: `发布了 ${posts.length} 条内容`,
          time: now.toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        });
      }
      if (totalEngagement > 0) {
        items.push({
          icon: "engagement",
          label: `互动量 ${totalEngagement}`,
          time: now.toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          value: `${posts.reduce((s, p) => s + p.likes, 0)} 赞 ${posts.reduce((s, p) => s + p.comments, 0)} 评`,
        });
      }
      if (aiPosts.length > 0) {
        items.push({
          icon: "ai",
          label: `AI 生成 ${aiPosts.length} 次`,
          time: now.toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        });
      }
      const publishedCount = posts.filter(
        (p) => p.status === "published"
      ).length;
      if (publishedCount > 0) {
        items.unshift({
          icon: "milestone",
          label: `累计发布 ${publishedCount} 条`,
          time: "今日",
        });
      }
      setFeed(items.slice(0, 8));
      setLastUpdated(
        now.toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setLoading(false);
    };

    computeStats();
    pollRef.current = setInterval(computeStats, 30000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [contentPosts, mountedRef]);

  const feedIcon = (type: FeedItem["icon"]) => {
    switch (type) {
      case "post":
        return <Send className="h-3.5 w-3.5 text-blue-500" />;
      case "ai":
        return <Zap className="h-3.5 w-3.5 text-violet-500" />;
      case "engagement":
        return <Heart className="h-3.5 w-3.5 text-rose-500" />;
      case "milestone":
        return <Flame className="h-3.5 w-3.5 text-amber-500" />;
      default:
        return <Activity className="h-3.5 w-3.5 text-gray-400" />;
    }
  };

  const metricCards = [
    {
      label: "今日发布",
      value: todayPosts,
      suffix: "条",
      icon: <Send className="h-4 w-4 text-blue-500" />,
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      sparkData: stats?.weeklyTrendPosts ?? [],
    },
    {
      label: "互动量",
      value: todayEngagement,
      suffix: "",
      icon: <TrendingUp className="h-4 w-4 text-emerald-500" />,
      color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      sparkData: stats?.weeklyTrendEngagement ?? [],
    },
    {
      label: "AI 操作",
      value: aiOps,
      suffix: "次",
      icon: <Zap className="h-4 w-4 text-violet-500" />,
      color: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
      sparkData: stats?.weeklyTrendAI ?? [],
    },
    {
      label: "浏览量",
      value: todayViews,
      suffix: "",
      icon: <Eye className="h-4 w-4 text-cyan-500" />,
      color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
      sparkData: stats?.weeklyTrendViews ?? [],
    },
    {
      label: "点赞数",
      value: todayLikes,
      suffix: "",
      icon: <Star className="h-4 w-4 text-amber-500" />,
      color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      sparkData: [],
    },
  ];

  const avgScore = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayPosts = contentPosts.filter(
      (p) => p.createdAt.slice(0, 10) === todayStr
    );
    if (todayPosts.length === 0) return 0;
    return Math.round(
      todayPosts.reduce((s, p) => s + p.aiScore, 0) / todayPosts.length
    );
  }, [contentPosts]);

  return (
    <div className="p-4 space-y-3 chart-entrance">
      {/* Auto-refresh indicator */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-violet-500" />
          <span className="text-sm font-semibold">实时指标</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">
            {lastUpdated && (
              <span>更新于 {lastUpdated}</span>
            )}
          </span>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <RefreshCw className="h-3 w-3 text-muted-foreground" />
          </motion.div>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-lg bg-muted/30 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <>
          {/* Live Counter Cards */}
          <div className="grid grid-cols-2 gap-2">
            {metricCards.map((m) => (
              <div
                key={m.label}
                className="metric-card"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`flex items-center justify-center h-8 w-8 rounded-lg ${m.color}`}
                  >
                    {m.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground leading-none">
                      {m.label}
                    </p>
                    <div className="flex items-end justify-between gap-1">
                      <p className="text-lg font-bold tabular-nums leading-tight">
                        {m.value}
                        {m.suffix && (
                          <span className="text-[10px] font-normal text-muted-foreground ml-0.5">
                            {m.suffix}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                {m.sparkData.length > 0 && (
                  <div className="flex justify-end">
                    <SparkLine
                      data={m.sparkData}
                      color={
                        m.color.includes("blue")
                          ? "#3b82f6"
                          : m.color.includes("emerald")
                            ? "#10b981"
                            : m.color.includes("violet")
                              ? "#8b5cf6"
                              : m.color.includes("cyan")
                                ? "#06b6d4"
                                : "#f59e0b"
                      }
                      width={52}
                      height={18}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* AI Score + Platform Split row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="metric-card">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
                  <Star className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground leading-none">
                    今日AI评分
                  </p>
                  <p className="text-lg font-bold tabular-nums leading-tight">
                    {avgScore}
                    <span className="text-[10px] font-normal text-muted-foreground ml-0.5">
                      /100
                    </span>
                  </p>
                </div>
              </div>
              <ProgressChart
                value={avgScore}
                max={100}
                size={100}
                showLinear={false}
              />
            </div>

            <div className="metric-card">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600">
                  <BarChart3 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground leading-none">
                    内容分布
                  </p>
                </div>
              </div>
              <PieChart
                data={stats?.platformSplit ?? []}
                donut
                size={100}
              />
            </div>
          </div>

          {/* Activity Feed */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-1 pt-2 px-3">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                动态流
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-2 pt-0">
              <div className="max-h-48 overflow-y-auto workspace-scroll">
                {feed.length > 0 ? (
                  <AnimatePresence mode="popLayout">
                    {feed.map((item, i) => (
                      <motion.div
                        key={`${item.time}-${i}`}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 12 }}
                        transition={{ duration: 0.3 }}
                        className="activity-feed-item"
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {feedIcon(item.icon)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-foreground leading-snug">
                            {item.label}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">
                              {item.time}
                            </span>
                          </div>
                          {item.value && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {item.value}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                ) : (
                  <p className="text-[11px] text-muted-foreground py-4 text-center">
                    暂无动态
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Engagement rate + likes/comments/shares breakdown */}
          <div className="grid grid-cols-2 gap-2">
            <div className="metric-card">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                  <MessageSquare className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground leading-none">
                    评论数
                  </p>
                  <p className="text-lg font-bold tabular-nums leading-tight">
                    {stats
                      ? contentPosts
                          .filter(
                            (p) =>
                              p.createdAt.slice(0, 10) ===
                              new Date().toISOString().slice(0, 10)
                          )
                          .reduce((s, p) => s + p.comments, 0)
                      : 0}
                    <span className="text-[10px] font-normal text-muted-foreground ml-0.5">
                      条
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="metric-card">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600">
                  <Share2 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground leading-none">
                    转发数
                  </p>
                  <p className="text-lg font-bold tabular-nums leading-tight">
                    {stats
                      ? contentPosts
                          .filter(
                            (p) =>
                              p.createdAt.slice(0, 10) ===
                              new Date().toISOString().slice(0, 10)
                          )
                          .reduce((s, p) => s + p.shares, 0)
                      : 0}
                    <span className="text-[10px] font-normal text-muted-foreground ml-0.5">
                      次
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
