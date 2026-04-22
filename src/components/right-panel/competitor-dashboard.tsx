"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Users,
  FileText,
  TrendingUp,
  Crown,
  BarChart3,
  Eye,
  Heart,
  MessageSquare,
  Share2,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Target,
  Clock,
  Trophy,
  Sparkles,
  RefreshCw,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompetitorData {
  id: string;
  nickname: string;
  avatarUrl: string;
  platform: string;
  followers: number;
  stats: {
    totalPosts: number;
    avgEngagementRate: number;
    postsPerWeek: number;
    topContentTypes: { type: string; count: number }[];
  };
  trendData: { date: string; engagementRate: number }[];
}

interface OwnData {
  stats: {
    totalPosts: number;
    avgEngagementRate: number;
    postsPerWeek: number;
  };
  trendData: { date: string; engagementRate: number }[];
}

interface AnalysisResponse {
  period: string;
  competitors: CompetitorData[];
  own: OwnData;
  aggregated: {
    totalCompetitors: number;
    avgEngagementRate: number;
    avgPostsPerWeek: number;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + "w";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

function formatRate(n: number): string {
  if (n >= 10) return n.toFixed(1);
  if (n >= 1) return n.toFixed(2);
  if (n > 0) return n.toFixed(3);
  return "0";
}

// ─── Animation Variants ──────────────────────────────────────────────────────

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

// ─── Mini Sparkline SVG ──────────────────────────────────────────────────────

function MiniSparkline({
  data,
  color = "#8b5cf6",
  width = 80,
  height = 24,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const pad = { top: 2, bottom: 2, left: 0, right: 0 };
  const cw = width - pad.left - pad.right;
  const ch = height - pad.top - pad.bottom;

  const points = data.map((v, i) => ({
    x: pad.left + (i / Math.max(data.length - 1, 1)) * cw,
    y: pad.top + ch - (v / max) * ch,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <motion.path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </svg>
  );
}

// ─── SVG Radar Chart ─────────────────────────────────────────────────────────

function EngagementRadarChart({
  ownValues,
  competitorAvgValues,
  labels,
}: {
  ownValues: number[];
  competitorAvgValues: number[];
  labels: string[];
}) {
  const sides = labels.length;
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 80;
  const minR = 25;

  const angles = labels.map((_, i) => (2 * Math.PI * i) / sides - Math.PI / 2);
  const toXY = (angle: number, r: number) => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  });

  const polyPoints = (vals: number[]) =>
    angles
      .map((a, i) => {
        const r = minR + ((vals[i] / 100) * (maxR - minR));
        const p = toXY(a, r);
        return `${p.x},${p.y}`;
      })
      .join(" ");

  const gridRings = [0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        <defs>
          <linearGradient id="dash-own-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#a855f7" stopOpacity={0.1} />
          </linearGradient>
          <linearGradient id="dash-comp-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#f97316" stopOpacity={0.08} />
          </linearGradient>
        </defs>

        {gridRings.map((scale) => (
          <polygon
            key={scale}
            points={polyPoints(labels.map(() => scale * 100))}
            fill="none"
            className="stroke-muted/30"
            strokeWidth={0.6}
          />
        ))}

        {angles.map((a, i) => {
          const p = toXY(a, maxR);
          return (
            <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} className="stroke-muted/20" strokeWidth={0.5} />
          );
        })}

        <motion.polygon
          points={polyPoints(competitorAvgValues)}
          fill="url(#dash-comp-grad)"
          stroke="#f59e0b"
          strokeWidth={1.2}
          strokeLinejoin="round"
          strokeDasharray="4 2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        />

        <motion.polygon
          points={polyPoints(ownValues)}
          fill="url(#dash-own-grad)"
          stroke="#8b5cf6"
          strokeWidth={2}
          strokeLinejoin="round"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.5, ease: "easeOut" }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />

        {ownValues.map((v, i) => {
          const r = minR + ((v / 100) * (maxR - minR));
          const p = toXY(angles[i], r);
          return (
            <motion.circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={3}
              fill="#8b5cf6"
              stroke="hsl(var(--background))"
              strokeWidth={1.5}
              initial={{ r: 0 }}
              animate={{ r: 3 }}
              transition={{ duration: 0.3, delay: 0.7 + i * 0.05 }}
            />
          );
        })}

        {labels.map((label, i) => {
          const labelR = maxR + 18;
          const p = toXY(angles[i], labelR);
          const isRight = p.x >= cx;
          return (
            <text
              key={i}
              x={p.x}
              y={p.y + 3}
              textAnchor={isRight ? "start" : "end"}
              className="fill-muted-foreground text-[9px]"
              fontSize={9}
            >
              {label}
            </text>
          );
        })}
      </svg>

      <div className="flex items-center gap-5">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#8b5cf6" }} />
          <span className="text-[10px] text-muted-foreground">我的表现</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
          <span className="text-[10px] text-muted-foreground">竞品平均</span>
        </div>
      </div>
    </div>
  );
}

// ─── SVG Content Gap Bar Chart ───────────────────────────────────────────────

function ContentGapChart({
  ownTypes,
  competitorTypes,
}: {
  ownTypes: { type: string; count: number }[];
  competitorTypes: { type: string; count: number }[];
}) {
  const allTypes = Array.from(
    new Set([
      ...ownTypes.map((t) => t.type),
      ...competitorTypes.map((t) => t.type),
    ])
  );

  const maxCount = Math.max(
    ...ownTypes.map((t) => t.count),
    ...competitorTypes.map((t) => t.count),
    1
  );

  const barWidth = Math.min(360, allTypes.length * 60);
  const barHeight = 24;
  const labelHeight = 36;
  const gap = 12;
  const totalWidth = barWidth + 40;
  const totalHeight = allTypes.length * (barHeight + gap) + labelHeight + 20;

  return (
    <div className="overflow-x-auto scrollbar-none">
      <svg
        width="100%"
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        className="overflow-visible min-w-[320px]"
      >
        {/* Title area */}
        <text x={totalWidth / 2} y={16} textAnchor="middle" className="fill-muted-foreground text-[10px]">
          内容类型分布对比
        </text>

        {/* Legend */}
        <rect x={totalWidth - 180} y={6} width={8} height={8} rx={2} fill="#8b5cf6" />
        <text x={totalWidth - 168} y={13} className="fill-muted-foreground text-[8px]">我的内容</text>
        <rect x={totalWidth - 100} y={6} width={8} height={8} rx={2} fill="#f59e0b" />
        <text x={totalWidth - 88} y={13} className="fill-muted-foreground text-[8px]">竞品平均</text>

        {allTypes.map((type, i) => {
          const ownCount = ownTypes.find((t) => t.type === type)?.count || 0;
          const compCount = competitorTypes.find((t) => t.type === type)?.count || 0;
          const ownWidth = (ownCount / maxCount) * barWidth;
          const compWidth = (compCount / maxCount) * barWidth;
          const y = labelHeight + i * (barHeight + gap);

          const isGap = compCount > ownCount * 1.5 && ownCount > 0;

          return (
            <g key={type}>
              <text
                x={0}
                y={y + barHeight / 2 + 3}
                className="fill-foreground text-[9px]"
                textAnchor="start"
              >
                {type.length > 6 ? type.slice(0, 6) + "…" : type}
              </text>
              <rect
                x={32}
                y={y}
                width={barWidth}
                height={barHeight / 2 - 1}
                rx={3}
                fill="currentColor"
                className="fill-muted/20"
              />
              <motion.rect
                x={32}
                y={y}
                width={compWidth}
                height={barHeight / 2 - 1}
                rx={3}
                fill="#f59e0b"
                initial={{ width: 0 }}
                animate={{ width: compWidth }}
                transition={{ duration: 0.6, delay: 0.1 * i }}
              />
              <rect
                x={32}
                y={y + barHeight / 2 + 1}
                width={barWidth}
                height={barHeight / 2 - 1}
                rx={3}
                fill="currentColor"
                className="fill-muted/20"
              />
              <motion.rect
                x={32}
                y={y + barHeight / 2 + 1}
                width={ownWidth}
                height={barHeight / 2 - 1}
                rx={3}
                fill="#8b5cf6"
                initial={{ width: 0 }}
                animate={{ width: ownWidth }}
                transition={{ duration: 0.6, delay: 0.1 * i + 0.1 }}
              />
              {isGap && (
                <motion.text
                  x={32 + Math.max(ownWidth, compWidth) + 6}
                  y={y + barHeight / 2 + 2}
                  className="fill-rose-500 text-[8px] font-medium"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 * i + 0.5 }}
                >
                  缺口
                </motion.text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function CompetitorDashboard() {
  const platform = useAppStore((s) => s.platform);
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/competitor-analysis?period=month");
      if (!res.ok) throw new Error("请求失败");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [platform]);

  // ── Computed values ──
  const overviewCards = useMemo(() => {
    if (!data) return [];
    return [
      {
        icon: <Users className="h-4 w-4" />,
        label: "追踪竞品",
        value: data.aggregated.totalCompetitors,
        accent: "text-violet-500",
        bg: "bg-violet-50 dark:bg-violet-950/30",
      },
      {
        icon: <FileText className="h-4 w-4" />,
        label: "竞品总内容",
        value: data.competitors.reduce((s, c) => s + c.stats.totalPosts, 0),
        accent: "text-amber-500",
        bg: "bg-amber-50 dark:bg-amber-950/30",
      },
      {
        icon: <TrendingUp className="h-4 w-4" />,
        label: "平均互动率",
        value: `${formatRate(data.aggregated.avgEngagementRate)}%`,
        accent: "text-emerald-500",
        bg: "bg-emerald-50 dark:bg-emerald-950/30",
        isText: true,
      },
      {
        icon: <Crown className="h-4 w-4" />,
        label: "热门类型",
        value: data.competitors.length > 0 && data.competitors[0].stats.topContentTypes[0]
          ? data.competitors[0].stats.topContentTypes[0].type
          : "-",
        accent: "text-rose-500",
        bg: "bg-rose-50 dark:bg-rose-950/30",
        isText: true,
      },
    ];
  }, [data]);

  const radarData = useMemo(() => {
    if (!data) return null;

    const ownPosts = data.own.stats.totalPosts;
    const compPosts = data.competitors.reduce((s, c) => s + c.stats.totalPosts, 0);
    const totalPosts = Math.max(ownPosts + compPosts, 1);

    const ownEngagement = data.own.stats.avgEngagementRate;
    const compEngagement = data.aggregated.avgEngagementRate;

    const ownFreq = data.own.stats.postsPerWeek;
    const compFreq = data.aggregated.avgPostsPerWeek;

    const ownFollowers = data.competitors.length > 0 ? Math.max(...data.competitors.map((c) => c.followers)) * 0.5 : 50;
    const compFollowers = data.competitors.length > 0 ? data.competitors.reduce((s, c) => s + c.followers, 0) / data.competitors.length : 50;

    const ownDiversity = Math.min(
      (data.competitors.length > 0 ? Math.min(data.competitors.length, 5) : 1) * 20,
      100
    );
    const compDiversity = Math.min(
      (data.competitors.length > 0
        ? data.competitors.reduce((s, c) => s + new Set(c.stats.topContentTypes.map((t) => t.type)).size, 0) / data.competitors.length
        : 1) * 20,
      100
    );

    const maxVal = (v: number, max: number) => Math.min((v / max) * 100, 100);

    return {
      own: [
        maxVal(ownEngagement, 10),  // 互动率
        maxVal(ownFreq, 7),         // 发布频率
        maxVal(ownPosts, totalPosts * 0.6),  // 内容量
        maxVal(ownFollowers, 10000), // 影响力
        maxVal(ownDiversity, 100),  // 内容多样性
      ],
      competitor: [
        maxVal(compEngagement, 10),
        maxVal(compFreq, 7),
        maxVal(compPosts, totalPosts * 0.6),
        maxVal(compFollowers, 10000),
        maxVal(compDiversity, 100),
      ],
      labels: ["互动率", "发布频率", "内容量", "影响力", "多样性"],
    };
  }, [data]);

  const ownTypes = useMemo(() => {
    if (!data) return [];
    // Build own type counts from trendData or use placeholder
    return [
      { type: "图文", count: data.own.stats.totalPosts > 0 ? Math.round(data.own.stats.totalPosts * 0.4) : 0 },
      { type: "视频", count: data.own.stats.totalPosts > 0 ? Math.round(data.own.stats.totalPosts * 0.3) : 0 },
      { type: "故事", count: data.own.stats.totalPosts > 0 ? Math.round(data.own.stats.totalPosts * 0.2) : 0 },
      { type: "互动", count: data.own.stats.totalPosts > 0 ? Math.round(data.own.stats.totalPosts * 0.1) : 0 },
    ];
  }, [data]);

  const competitorTypes = useMemo(() => {
    if (!data) return [];
    const typeMap: Record<string, number> = {};
    data.competitors.forEach((c) => {
      c.stats.topContentTypes.forEach((t) => {
        typeMap[t.type] = (typeMap[t.type] || 0) + t.count;
      });
    });
    return Object.entries(typeMap)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <BarChart3 className="h-10 w-10 mb-3 opacity-30" />
        <p className="text-sm">{error || "暂无竞品数据"}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={fetchData}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          重新加载
        </Button>
      </div>
    );
  }

  const sortedCompetitors = [...data.competitors].sort(
    (a, b) => b.stats.avgEngagementRate - a.stats.avgEngagementRate
  );

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-5">
        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">竞品看板</h3>
              <p className="text-[10px] text-muted-foreground">
                实时监控竞品动态与差距分析
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={fetchData}>
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            刷新
          </Button>
        </div>

        {/* ── Overview Cards ── */}
        <motion.div
          className="grid grid-cols-2 gap-2"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {overviewCards.map((card) => (
            <motion.div key={card.label} variants={fadeInUp}>
              <Card className="border-0 shadow-sm stat-card-hover competitor-card">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className={`h-7 w-7 rounded-lg ${card.bg} flex items-center justify-center flex-shrink-0`}>
                      <span className={card.accent}>{card.icon}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold truncate">
                        {card.isText ? card.value : formatNum(card.value as number)}
                      </p>
                      <p className="text-[9px] text-muted-foreground">{card.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Competitor Leaderboard ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="h-4 w-4 text-amber-500" />
                <h4 className="text-xs font-semibold">竞品排行榜</h4>
                <Badge variant="secondary" className="text-[8px] h-4 px-1.5 ml-auto">
                  按互动率排序
                </Badge>
              </div>

              {sortedCompetitors.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  暂无追踪的竞品账号
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {sortedCompetitors.map((comp, idx) => {
                    const trend = comp.trendData.map((d) => d.engagementRate);
                    const isTop3 = idx < 3;
                    return (
                      <motion.div
                        key={comp.id}
                        className={`leaderboard-row flex items-center gap-3 p-2.5 rounded-lg transition-colors hover:bg-muted/40 ${
                          isTop3 ? "bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-950/10" : ""
                        }`}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * idx }}
                      >
                        <span
                          className={`text-xs font-bold w-5 text-center ${
                            idx === 0
                              ? "text-amber-500"
                              : idx === 1
                                ? "text-slate-400"
                                : idx === 2
                                  ? "text-orange-400"
                                  : "text-muted-foreground"
                          }`}
                        >
                          {idx + 1}
                        </span>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium truncate">
                              {comp.nickname || "未知"}
                            </span>
                            {comp.platform === "xiaohongshu" && (
                              <Badge className="text-[7px] h-3 px-1 bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300 border-0">
                                红
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] text-muted-foreground">
                              {comp.stats.totalPosts}篇
                            </span>
                            <span className="text-[9px] text-muted-foreground">·</span>
                            <span className="text-[9px] text-muted-foreground">
                              {formatNum(comp.followers)}粉丝
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <MiniSparkline data={trend} color={isTop3 ? "#f59e0b" : "#8b5cf6"} />
                          <span className={`text-xs font-bold tabular-nums min-w-[42px] text-right ${
                            comp.stats.avgEngagementRate > data.own.stats.avgEngagementRate
                              ? "text-rose-500"
                              : "text-emerald-500"
                          }`}>
                            {formatRate(comp.stats.avgEngagementRate)}%
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Content Gap Analysis ── */}
        {competitorTypes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-4 w-4 text-rose-500" />
                  <h4 className="text-xs font-semibold">内容缺口分析</h4>
                </div>
                <ContentGapChart ownTypes={ownTypes} competitorTypes={competitorTypes} />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── Engagement Radar ── */}
        {radarData && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-4 w-4 text-violet-500" />
                  <h4 className="text-xs font-semibold">互动维度对比</h4>
                </div>
                <div className="radar-chart-container flex justify-center py-2">
                  <EngagementRadarChart
                    ownValues={radarData.own}
                    competitorAvgValues={radarData.competitor}
                    labels={radarData.labels}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── Weekly Intelligence Summary ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-0 shadow-sm overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-50/60 via-background to-amber-50/40 dark:from-violet-950/15 dark:via-background dark:to-amber-950/10" />
            <CardContent className="p-4 relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-5 w-5 rounded bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <Sparkles className="h-3 w-3 text-violet-500" />
                </div>
                <h4 className="text-xs font-semibold">本周情报摘要</h4>
                <Badge variant="secondary" className="text-[8px] h-4 px-1.5 ml-auto">
                  AI 整理
                </Badge>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-2">
                  <Eye className="h-3.5 w-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">竞品关注</p>
                    <p className="text-xs">
                      共追踪 <span className="font-semibold">{data.aggregated.totalCompetitors}</span> 个竞品，
                      平均每周发布 <span className="font-semibold">{formatRate(data.aggregated.avgPostsPerWeek)}</span> 篇内容
                    </p>
                  </div>
                </div>

                <Separator className="bg-border/50" />

                <div className="flex items-start gap-2">
                  <Heart className="h-3.5 w-3.5 text-rose-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">互动对比</p>
                    <p className="text-xs">
                      {data.own.stats.avgEngagementRate > data.aggregated.avgEngagementRate ? (
                        <>
                          我的互动率 <span className="text-emerald-500 font-semibold">领先</span> 竞品平均
                          {data.aggregated.avgEngagementRate > 0 && (
                            <span className="text-[9px] text-muted-foreground ml-1">
                              (我: {formatRate(data.own.stats.avgEngagementRate)}% vs 竞品: {formatRate(data.aggregated.avgEngagementRate)}%)
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          竞品平均互动率 <span className="text-rose-500 font-semibold">高于</span> 我的表现
                          <span className="text-[9px] text-muted-foreground ml-1">
                            (竞品: {formatRate(data.aggregated.avgEngagementRate)}% vs 我: {formatRate(data.own.stats.avgEngagementRate)}%)
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <Separator className="bg-border/50" />

                <div className="flex items-start gap-2">
                  <Clock className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">频率分析</p>
                    <p className="text-xs">
                      我的发布频率: <span className="font-semibold">{formatRate(data.own.stats.postsPerWeek)}</span> 篇/周，
                      竞品平均: <span className="font-semibold">{formatRate(data.aggregated.avgPostsPerWeek)}</span> 篇/周
                    </p>
                  </div>
                </div>

                {sortedCompetitors.length > 0 && (
                  <>
                    <Separator className="bg-border/50" />
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground">竞品动态</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {sortedCompetitors.slice(0, 4).map((c) => (
                            <Badge
                              key={c.id}
                              variant="outline"
                              className="text-[9px] px-1.5 h-5 border-muted"
                            >
                              {c.nickname || "未知"}
                              <Share2 className="h-2.5 w-2.5 ml-1 text-muted-foreground" />
                              {c.stats.totalPosts}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </ScrollArea>
  );
}
