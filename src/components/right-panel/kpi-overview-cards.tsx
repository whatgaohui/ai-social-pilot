"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  FileText,
  TrendingUp,
  Trophy,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { NumberCounter } from "@/components/animated-counter";
import { cn } from "@/lib/utils";
import { MockDataBanner } from "@/components/ui/mock-data-banner";

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface KpiSummary {
  totalInteractions: number;
  interactionChangePct: number;
  thisMonthPosts: number;
  postChangePct: number;
  avgEngagementRate: number;
  bestContent: {
    title: string;
    engagement: number;
  };
}

interface TrendsData {
  dates: string[];
  series: Array<{
    name: string;
    data: number[];
    color: string;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TrendIndicator — green ↑ / red ↓ / gray →
// ═══════════════════════════════════════════════════════════════════════════════

function TrendIndicator({ pct, className }: { pct: number; className?: string }) {
  const isPositive = pct > 0;
  const isNeutral = pct === 0;
  const isNegative = pct < 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums",
        isPositive && "text-emerald-500 dark:text-emerald-400",
        isNeutral && "text-muted-foreground",
        isNegative && "text-rose-500 dark:text-rose-400",
        className
      )}
    >
      {isPositive && <ArrowUpRight className="h-3.5 w-3.5" />}
      {isNeutral && <Minus className="h-3.5 w-3.5" />}
      {isNegative && <ArrowDownRight className="h-3.5 w-3.5" />}
      {Math.abs(pct)}%
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// KpiCard — Individual KPI card with icon + title + animated number + trend
// ═══════════════════════════════════════════════════════════════════════════════

interface KpiCardProps {
  icon: React.ReactNode;
  title: string;
  value: number;
  suffix?: string;
  decimals?: number;
  trendPct: number;
  subtitle?: string;
  delay?: number;
  iconBgClass?: string;
  iconClass?: string;
}

function KpiCard({
  icon,
  title,
  value,
  suffix = "",
  decimals = 0,
  trendPct,
  subtitle,
  delay = 0,
  iconBgClass = "bg-violet-100 dark:bg-violet-900/30",
  iconClass = "text-violet-600 dark:text-violet-400",
}: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.45,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <Card className="border-border/20 hover:border-border/80 hover:shadow-md transition-all duration-300 overflow-hidden group">
        {/* Subtle top accent line */}
        <div className="h-0.5 bg-gradient-to-r from-violet-500/60 via-purple-400/40 to-transparent group-hover:from-violet-500 group-hover:via-purple-400 group-hover:to-violet-300/30 transition-all duration-500" />
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* Title row */}
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-xs text-muted-foreground font-medium truncate">
                  {title}
                </p>
                <TrendIndicator pct={trendPct} />
              </div>

              {/* Animated number */}
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold tracking-tight">
                  <NumberCounter
                    value={value}
                    decimals={decimals}
                    triggerOnView={true}
                    easing="easeOut"
                    duration={1.2}
                  />
                </span>
                {suffix && (
                  <span className="text-sm text-muted-foreground font-medium">
                    {suffix}
                  </span>
                )}
              </div>

              {/* Subtitle (optional) */}
              {subtitle && (
                <p className="text-[11px] text-muted-foreground/70 mt-1 truncate">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Icon */}
            <div
              className={cn(
                "flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
                iconBgClass
              )}
            >
              <span className={cn(iconClass)}>{icon}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// KpiOverviewCards — 4-card KPI grid with data fetching
// ═══════════════════════════════════════════════════════════════════════════════

export function KpiOverviewCards({ className }: { className?: string }) {
  const [summary, setSummary] = useState<KpiSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analytics/trends?range=7d&metrics=likes,comments,shares");
      if (!res.ok) throw new Error("请求失败");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setSummary(json.summary ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Loading skeleton
  if (loading) {
    return (
      <div className={cn("grid grid-cols-2 gap-3", className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border bg-card p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-10" />
            </div>
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error || !summary) {
    return (
      <div
        className={cn(
          "flex items-center justify-center p-8 rounded-xl border bg-card/50",
          className
        )}
      >
        <div className="text-center">
          <p className="text-sm text-muted-foreground">{error || "暂无数据"}</p>
          <button
            onClick={fetchData}
            className="mt-2 text-xs text-violet-500 hover:text-violet-600 underline"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  const kpis: Array<KpiCardProps> = [
    {
      icon: <Activity className="h-5 w-5" />,
      title: "总互动量",
      value: summary.totalInteractions,
      trendPct: summary.interactionChangePct,
      subtitle: "点赞 + 评论 + 转发",
      delay: 0,
      iconBgClass: "bg-violet-100 dark:bg-violet-900/30",
      iconClass: "text-violet-600 dark:text-violet-400",
    },
    {
      icon: <FileText className="h-5 w-5" />,
      title: "本月发布",
      value: summary.thisMonthPosts,
      suffix: "篇",
      trendPct: summary.postChangePct,
      subtitle: "已创建内容数量",
      delay: 0.06,
      iconBgClass: "bg-emerald-100 dark:bg-emerald-900/30",
      iconClass: "text-emerald-600 dark:text-emerald-400",
    },
    {
      icon: <TrendingUp className="h-5 w-5" />,
      title: "平均互动率",
      value: summary.avgEngagementRate,
      suffix: "%",
      decimals: 2,
      trendPct: summary.interactionChangePct,
      subtitle: "互动量 / 浏览量",
      delay: 0.12,
      iconBgClass: "bg-amber-100 dark:bg-amber-900/30",
      iconClass: "text-amber-600 dark:text-amber-400",
    },
    {
      icon: <Trophy className="h-5 w-5" />,
      title: "最佳表现",
      value: summary.bestContent.engagement,
      trendPct: summary.interactionChangePct,
      subtitle: summary.bestContent.title,
      delay: 0.18,
      iconBgClass: "bg-rose-100 dark:bg-rose-900/30",
      iconClass: "text-rose-600 dark:text-rose-400",
    },
  ];

  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      <MockDataBanner className="col-span-2" />
      {kpis.map((kpi) => (
        <KpiCard key={kpi.title} {...kpi} />
      ))}
    </div>
  );
}
