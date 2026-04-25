"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import type { TrackedAccount } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  TrendingUp,
  TrendingDown,
  Crown,
  Sparkles,
  AlertTriangle,
  BarChart3,
  Eye,
  ThumbsUp,
  MessageSquare,
  Repeat2,
  Calendar,
  RefreshCw,
  ChevronRight,
  Zap,
  Target,
  Lightbulb,
} from "lucide-react";
import { MockDataBanner } from "@/components/ui/mock-data-banner";

// ─── Animation Variants ─────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

// ─── Color Palette ──────────────────────────────────────────────────────────

const ACCOUNT_COLORS = [
  { gradient: "from-rose-500 to-pink-600", bg: "bg-rose-50 dark:bg-rose-950/20", border: "border-rose-200 dark:border-rose-800" },
  { gradient: "from-amber-500 to-orange-600", bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-200 dark:border-amber-800" },
  { gradient: "from-emerald-500 to-teal-600", bg: "bg-emerald-50 dark:bg-emerald-950/20", border: "border-emerald-200 dark:border-emerald-800" },
];

const METRIC_COLORS = [
  "from-violet-500 to-purple-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-500",
  "from-emerald-500 to-teal-500",
  "from-cyan-500 to-sky-500",
  "from-fuchsia-500 to-violet-500",
];

// ─── Utility Functions ───────────────────────────────────────────────────────

function formatNum(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function getPlatformLabel(p: string) {
  return p === "wechat" ? "朋友圈" : p === "xiaohongshu" ? "小红书" : p;
}

function getPlatformBadge(p: string) {
  return p === "wechat"
    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
}

// ─── Mini Bar Chart (SVG) ───────────────────────────────────────────────────

function MiniBarChart({ values, labels, maxVal }: { values: number[]; labels: string[]; maxVal: number }) {
  const barWidth = 40;
  const gap = 24;
  const chartHeight = 60;
  const groupWidth = barWidth + gap;

  return (
    <svg
      viewBox={`0 0 ${values.length * groupWidth} ${chartHeight + 24}`}
      className="w-full"
      style={{ maxHeight: 100 }}
    >
      <defs>
        {values.map((_, i) => (
          <linearGradient key={i} id={`bar-gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={`hsl(${i * 60 + 280}, 70%, 60%)`} />
            <stop offset="100%" stopColor={`hsl(${i * 60 + 280}, 70%, 45%)`} />
          </linearGradient>
        ))}
      </defs>
      {/* Grid lines */}
      {[0, 0.5, 1].map((pct) => (
        <line
          key={pct}
          x1={0}
          y1={chartHeight * (1 - pct)}
          x2={values.length * groupWidth}
          y2={chartHeight * (1 - pct)}
          stroke="currentColor"
          strokeOpacity={0.08}
          strokeWidth={1}
        />
      ))}
      {values.map((val, i) => {
        const barH = maxVal > 0 ? (val / maxVal) * chartHeight : 0;
        const x = i * groupWidth + gap / 2;
        const y = chartHeight - barH;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              rx={4}
              fill={`url(#bar-gradient-${i})`}
            />
            <text
              x={x + barWidth / 2}
              y={chartHeight + 16}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize={9}
            >
              {labels[i]}
            </text>
            {/* Value label */}
            {barH > 14 && (
              <text
                x={x + barWidth / 2}
                y={y + 14}
                textAnchor="middle"
                className="fill-white"
                fontSize={8}
                fontWeight={600}
              >
                {typeof val === "number" && val < 10 ? val.toFixed(1) : formatNum(val)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Metric Comparison Row ──────────────────────────────────────────────────

function MetricComparisonRow({
  label,
  icon: Icon,
  values,
  nicknames,
  format = "number",
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  values: number[];
  nicknames: string[];
  format?: "number" | "percent" | "string";
}) {
  const maxVal = Math.max(...values, 1);
  const colors = METRIC_COLORS.slice(0, values.length);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3 w-3" />
        <span className="font-medium">{label}</span>
      </div>
      <div className="space-y-1">
        {values.map((val, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-16 truncate flex-shrink-0">
              {nicknames[i]}
            </span>
            <div className="flex-1 h-5 rounded-full bg-muted/50 overflow-hidden relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${maxVal > 0 ? (val / maxVal) * 100 : 0}%` }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
                className={`h-full rounded-full bg-gradient-to-r ${colors[i]} opacity-80`}
              />
            </div>
            <span className="text-[10px] font-medium tabular-nums w-14 text-right flex-shrink-0">
              {format === "percent"
                ? `${val.toFixed(1)}%`
                : format === "string"
                  ? val.toFixed(1)
                  : formatNum(val)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Insight Card ───────────────────────────────────────────────────────────

function InsightCard({ title, icon: Icon, children, gradient }: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  gradient: string;
}) {
  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <div className={`h-1 bg-gradient-to-r ${gradient}`} />
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-foreground" />
          <span className="text-xs font-semibold">{title}</span>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function CompetitorAnalysis() {
  const { platform } = useAppStore();
  const [accounts, setAccounts] = useState<TrackedAccount[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Fetch tracked accounts
  useEffect(() => {
    async function fetchAccounts() {
      setLoading(true);
      try {
        const res = await fetch("/api/tracked-accounts");
        if (res.ok) {
          const data = await res.json();
          setAccounts(Array.isArray(data) ? data : []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchAccounts();
  }, []);

  // Filter accounts by platform and non-own (competitors)
  const competitorAccounts = useMemo(() => {
    return accounts.filter((a) => {
      const matchPlatform = !a.platform || a.platform === platform;
      return matchPlatform && !a.isOwn;
    });
  }, [accounts, platform]);

  // Selected competitor accounts (max 3)
  const selectedAccounts = useMemo(() => {
    return competitorAccounts.filter((a) => selectedIds.has(a.id)).slice(0, 3);
  }, [competitorAccounts, selectedIds]);

  const toggleAccount = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 3) {
        next.add(id);
      }
      return next;
    });
  };

  // Simulated metrics for comparison (in real app, these come from analytics)
  const comparisonData = useMemo(() => {
    if (selectedAccounts.length === 0) return null;

    // Generate realistic-looking metrics based on followers
    const metrics = selectedAccounts.map((acc) => {
      const baseFactor = Math.max(0.1, Math.log10(acc.followers + 1) / 4);
      const seed = acc.id.charCodeAt(0);
      return {
        nickname: acc.nickname || "未知",
        avgEngagementRate: parseFloat((baseFactor * (2 + ((seed * 7) % 30) / 10)).toFixed(1)),
        avgLikes: Math.round(acc.followers * 0.02 * baseFactor + ((seed * 13) % 100)),
        avgComments: Math.round(acc.followers * 0.005 * baseFactor + ((seed * 17) % 30)),
        avgShares: Math.round(acc.followers * 0.003 * baseFactor + ((seed * 23) % 15)),
        postsPerWeek: parseFloat((2 + ((seed * 3) % 50) / 10).toFixed(1)),
        lastSync: acc.lastSyncAt
          ? new Date(acc.lastSyncAt).toLocaleDateString("zh-CN")
          : "未同步",
      };
    });

    return metrics;
  }, [selectedAccounts]);

  // Best competitor insights
  const insights = useMemo(() => {
    if (!comparisonData || comparisonData.length === 0) return null;

    const sorted = [...comparisonData].sort((a, b) => b.avgEngagementRate - a.avgEngagementRate);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    const gap = best.avgEngagementRate > 0 && worst.avgEngagementRate > 0
      ? (((best.avgEngagementRate - worst.avgEngagementRate) / worst.avgEngagementRate) * 100).toFixed(0)
      : "0";

    const suggestions: string[] = [];
    if (best.avgComments > worst.avgComments * 1.5) {
      suggestions.push("💡 提高互动性：在内容结尾增加引导性提问，鼓励评论互动");
    }
    if (best.postsPerWeek > worst.postsPerWeek * 1.3) {
      suggestions.push("📊 增加发布频率：保持稳定的更新节奏有助于提升账号活跃度");
    }
    if (best.avgShares > worst.avgShares * 1.5) {
      suggestions.push("🚀 增强传播力：创作有共鸣、有价值的内容更容易被转发分享");
    }

    if (suggestions.length === 0) {
      suggestions.push("🎯 关注内容质量：持续输出有价值的内容是增长的核心驱动力");
      suggestions.push("⏰ 优化发布时间：选择目标受众最活跃的时段发布内容");
      suggestions.push("🤝 加强互动回复：及时回复评论能显著提升粉丝粘性");
    }

    return {
      best: {
        nickname: best.nickname,
        engagementRate: best.avgEngagementRate,
        topMetric: best.avgComments > best.avgShares ? "评论互动" : "转发传播",
      },
      gapPercent: gap,
      suggestions,
    };
  }, [comparisonData]);

  // ── Loading State ──
  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56" />
        <div className="space-y-2 mt-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-4 space-y-4"
    >
      <MockDataBanner />
      {/* ── Header ──────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <h2 className="text-base font-bold bg-gradient-to-r from-rose-500 via-amber-500 via-emerald-500 to-violet-500 bg-clip-text text-transparent">
          竞品分析
        </h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          对比竞品运营数据，发现差距与机会
        </p>
      </motion.div>

      {/* ── Account Selection ───────────────────────────────── */}
      {competitorAccounts.length === 0 ? (
        <motion.div variants={itemVariants}>
          <Card className="border-dashed border-2">
            <CardContent className="p-6 flex flex-col items-center gap-2 text-center">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">暂无竞品账号</p>
              <p className="text-[10px] text-muted-foreground/70">
                在「采集中心」添加竞品账号开始分析
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <>
          <motion.div variants={itemVariants} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                <Users className="h-3 w-3" />
                选择竞品账号（最多3个）
              </span>
              <Badge variant="outline" className="text-[9px]">
                已选 {selectedIds.size}/3
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {competitorAccounts.map((acc, idx) => {
                const isSelected = selectedIds.has(acc.id);
                const colorSet = ACCOUNT_COLORS[idx % ACCOUNT_COLORS.length];
                return (
                  <motion.div
                    key={acc.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => toggleAccount(acc.id)}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? `${colorSet.border} ${colorSet.bg} ring-1 ring-primary/10`
                        : "border-border/20 hover:bg-muted/30"
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleAccount(acc.id)}
                      className="pointer-events-none"
                      disabled={!isSelected && selectedIds.size >= 3}
                    />
                    {/* Avatar */}
                    <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${colorSet.gradient} flex items-center justify-center flex-shrink-0`}>
                      {acc.avatarUrl ? (
                        <img
                          src={acc.avatarUrl}
                          alt={acc.nickname}
                          className="h-full w-full rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                          }}
                        />
                      ) : null}
                      <span className="text-[10px] font-bold text-white">
                        {(acc.nickname || "?").charAt(0)}
                      </span>
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium truncate">{acc.nickname || "未命名"}</span>
                        <Badge className={`text-[8px] px-1 py-0 h-4 ${getPlatformBadge(acc.platform)}`}>
                          {getPlatformLabel(acc.platform)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                        <span>粉丝 {formatNum(acc.followers)}</span>
                        <span>笔记 {formatNum(acc.postsCount)}</span>
                      </div>
                    </div>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="h-5 w-5 rounded-full bg-primary flex items-center justify-center"
                      >
                        <ChevronRight className="h-3 w-3 text-primary-foreground" />
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* ── Comparison Metrics ──────────────────────────────── */}
          <AnimatePresence mode="wait">
            {comparisonData && comparisonData.length >= 2 && (
              <motion.div
                key="comparison"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-3"
              >
                <Separator />

                <motion.div variants={itemVariants} className="space-y-1.5">
                  <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" />
                    数据对比
                  </span>

                  {/* Visual bar chart */}
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-3">
                      <MiniBarChart
                        values={comparisonData.map((d) => d.avgEngagementRate)}
                        labels={comparisonData.map((d) => d.nickname.slice(0, 4))}
                        maxVal={Math.max(...comparisonData.map((d) => d.avgEngagementRate), 1)}
                      />
                      <p className="text-[9px] text-muted-foreground text-center mt-1">
                        平均互动率对比
                      </p>
                    </CardContent>
                  </Card>

                  {/* Detailed metrics */}
                  <div className="space-y-3">
                    <MetricComparisonRow
                      label="平均互动率"
                      icon={TrendingUp}
                      values={comparisonData.map((d) => d.avgEngagementRate)}
                      nicknames={comparisonData.map((d) => d.nickname)}
                      format="percent"
                    />
                    <MetricComparisonRow
                      label="平均点赞数"
                      icon={ThumbsUp}
                      values={comparisonData.map((d) => d.avgLikes)}
                      nicknames={comparisonData.map((d) => d.nickname)}
                    />
                    <MetricComparisonRow
                      label="平均评论数"
                      icon={MessageSquare}
                      values={comparisonData.map((d) => d.avgComments)}
                      nicknames={comparisonData.map((d) => d.nickname)}
                    />
                    <MetricComparisonRow
                      label="平均转发数"
                      icon={Repeat2}
                      values={comparisonData.map((d) => d.avgShares)}
                      nicknames={comparisonData.map((d) => d.nickname)}
                    />
                    <MetricComparisonRow
                      label="内容频率（条/周）"
                      icon={Calendar}
                      values={comparisonData.map((d) => d.postsPerWeek)}
                      nicknames={comparisonData.map((d) => d.nickname)}
                      format="string"
                    />
                    <MetricComparisonRow
                      label="最新同步时间"
                      icon={RefreshCw}
                      values={comparisonData.map((d) => d.lastSync === "未同步" ? 0 : 1)}
                      nicknames={comparisonData.map((d) => d.lastSync)}
                      format="string"
                    />
                  </div>
                </motion.div>

                {/* ── Insights Section ────────────────────────────── */}
                {insights && (
                  <>
                    <Separator />
                    <motion.div variants={itemVariants} className="space-y-2">
                      <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        分析洞察
                      </span>

                      <div className="grid grid-cols-1 gap-2">
                        {/* Best Competitor */}
                        <InsightCard
                          title="最强竞品"
                          icon={Crown}
                          gradient="from-amber-400 to-orange-500"
                        >
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                              <Crown className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold">{insights.best.nickname}</p>
                              <p className="text-[10px] text-muted-foreground">
                                互动率 {insights.best.engagementRate}%
                                · {insights.best.topMetric}领先
                              </p>
                            </div>
                          </div>
                        </InsightCard>

                        {/* Gap Analysis */}
                        <InsightCard
                          title="差距分析"
                          icon={Target}
                          gradient="from-rose-400 to-pink-500"
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-center">
                              <p className="text-xl font-bold text-rose-500">{insights.gapPercent}%</p>
                              <p className="text-[9px] text-muted-foreground">最大差距</p>
                            </div>
                            <Separator orientation="vertical" className="h-8" />
                            <div className="space-y-1 text-[10px]">
                              <div className="flex items-center gap-1">
                                <TrendingUp className="h-3 w-3 text-emerald-500" />
                                <span>头部账号优势明显</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <TrendingDown className="h-3 w-3 text-rose-500" />
                                <span>尾部账号有提升空间</span>
                              </div>
                            </div>
                          </div>
                        </InsightCard>

                        {/* Actionable Suggestions */}
                        <InsightCard
                          title="运营建议"
                          icon={Lightbulb}
                          gradient="from-emerald-400 to-teal-500"
                        >
                          <div className="space-y-1.5">
                            {insights.suggestions.slice(0, 3).map((tip, i) => (
                              <motion.p
                                key={i}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="text-[10px] text-muted-foreground leading-relaxed"
                              >
                                {tip}
                              </motion.p>
                            ))}
                          </div>
                        </InsightCard>
                      </div>
                    </motion.div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Prompt to select accounts ──────────────────────── */}
          {comparisonData === null && competitorAccounts.length > 0 && (
            <motion.div variants={itemVariants}>
              <Card className="border-dashed border-2 bg-muted/20">
                <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <Zap className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">选择至少2个竞品账号开始对比</p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
