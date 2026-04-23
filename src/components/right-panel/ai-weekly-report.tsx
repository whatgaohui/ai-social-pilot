"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/store/app-store";
import {
  Calendar,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Copy,
  Check,
  RotateCcw,
  FileBarChart,
  Trophy,
  Target,
  Clock,
  MessageSquare,
  BarChart3,
  Star,
  Zap,
  Lightbulb,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  MousePointerClick,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────

type ReportPeriod = "this-week" | "last-week" | "this-month" | "custom";
type ReportScope = "current" | "all";

interface ReportStats {
  totalPosts: number;
  avgEngagement: number;
  bestTopic: string;
  bestEngagement: number;
  avgAiScore: number;
  wowPostChange: number;
  wowEngagementChange: number;
  wowScoreChange: number;
}

interface RankedPost {
  id: string;
  topic: string;
  contentType: string;
  status: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  favorites: number;
  aiScore: number;
  engagementScore: number;
}

interface ContentTypeStat {
  type: string;
  count: number;
  percentage: number;
  avgEngagement: number;
  isBest: boolean;
}

interface AISuggestion {
  id: number;
  category: "timing" | "content" | "type" | "engagement";
  icon: React.ElementType;
  title: string;
  detail: string;
}

interface NextWeekPlan {
  suggestedMix: { type: string; percentage: number }[];
  recommendedTimes: string[];
}

interface ReportData {
  period: ReportPeriod;
  dateRange: { start: string; end: string };
  platform: string;
  stats: ReportStats;
  rankedPosts: RankedPost[];
  contentTypeStats: ContentTypeStat[];
  suggestions: AISuggestion[];
  nextWeekPlan: NextWeekPlan;
  generatedAt: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function getDateRange(period: ReportPeriod, customStart?: string, customEnd?: string) {
  const now = new Date();
  const startOfWeek = (d: Date) => {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.getFullYear(), d.getMonth(), diff);
  };

  switch (period) {
    case "this-week": {
      const s = startOfWeek(now);
      const e = new Date(s);
      e.setDate(s.getDate() + 6);
      return { start: s, end: e };
    }
    case "last-week": {
      const thisWeekStart = startOfWeek(now);
      const s = new Date(thisWeekStart);
      s.setDate(thisWeekStart.getDate() - 7);
      const e = new Date(thisWeekStart);
      e.setDate(thisWeekStart.getDate() - 1);
      return { start: s, end: e };
    }
    case "this-month": {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start: s, end: e };
    }
    case "custom": {
      return {
        start: customStart ? new Date(customStart) : new Date(now.getFullYear(), now.getMonth(), 1),
        end: customEnd ? new Date(customEnd) : new Date(),
      };
    }
  }
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateCN(d: Date): string {
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function getPeriodLabel(period: ReportPeriod): string {
  const labels: Record<ReportPeriod, string> = {
    "this-week": "本周",
    "last-week": "上周",
    "this-month": "本月",
    custom: "自定义",
  };
  return labels[period];
}

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + "w";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

function calcEngagement(post: { likes: number; comments: number; shares: number; views: number; favorites?: number }) {
  return post.likes + post.comments * 2 + post.shares * 3 + (post.favorites || 0) * 1.5 + post.views * 0.01;
}

function getWowIndicator(current: number, previous: number): { icon: React.ReactNode; className: string; text: string } {
  if (previous === 0 && current === 0) return { icon: <Minus className="h-3 w-3" />, className: "text-muted-foreground", text: "—" };
  if (previous === 0 && current > 0) return { icon: <TrendingUp className="h-3 w-3" />, className: "text-emerald-500", text: "+100%" };
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct > 0) return { icon: <TrendingUp className="h-3 w-3" />, className: "text-emerald-500", text: `+${pct}%` };
  if (pct < 0) return { icon: <TrendingDown className="h-3 w-3" />, className: "text-rose-500", text: `${pct}%` };
  return { icon: <Minus className="h-3 w-3" />, className: "text-muted-foreground", text: "持平" };
}

const RANK_MEDAL_COLORS = [
  "bg-gradient-to-br from-amber-400 to-yellow-500 text-white",
  "bg-gradient-to-br from-slate-300 to-slate-400 text-white",
  "bg-gradient-to-br from-amber-600 to-orange-700 text-white",
];

const SUGGESTION_CATEGORY_META: Record<string, { icon: React.ElementType; color: string; border: string; bg: string }> = {
  timing: {
    icon: Clock,
    color: "text-violet-600 dark:text-violet-400",
    border: "border-violet-200 dark:border-violet-800",
    bg: "bg-violet-50/50 dark:bg-violet-950/10",
  },
  content: {
    icon: MessageSquare,
    color: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
    bg: "bg-emerald-50/50 dark:bg-emerald-950/10",
  },
  type: {
    icon: LayoutGrid,
    color: "text-amber-600 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
    bg: "bg-amber-50/50 dark:bg-amber-950/10",
  },
  engagement: {
    icon: MousePointerClick,
    color: "text-rose-600 dark:text-rose-400",
    border: "border-rose-200 dark:border-rose-800",
    bg: "bg-rose-50/50 dark:bg-rose-950/10",
  },
};

// ─── Animated Counter Hook ──────────────────────────────────────────────

function useAnimatedCounter(target: number, duration: number = 800) {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    const start = prevTarget.current;
    const diff = target - start;
    if (diff === 0) return;
    const startTime = performance.now();

    let raf: number;
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + diff * eased));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    prevTarget.current = target;
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

// ─── Sub-components ─────────────────────────────────────────────────────

function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const animated = useAnimatedCounter(Math.round(value * (decimals > 0 ? 10 : 1)));
  const display = decimals > 0 ? (animated / 10).toFixed(decimals) : animated;
  return <span className="animate-counter">{display}</span>;
}

function StatCardGrid({ stats, platformAccent }: { stats: ReportStats; platformAccent: string }) {
  const isXHS = platformAccent === "#f43f5e";

  const cards = [
    {
      icon: CalendarDays,
      label: "发布总数",
      value: <AnimatedNumber value={stats.totalPosts} />,
      sub: (
        <span className="flex items-center gap-0.5">
          {(() => { const w = getWowIndicator(stats.wowPostChange, 0); return <span className={w.className}>{w.text}</span>; })()}
        </span>
      ),
      gradient: "from-violet-500 to-purple-500",
    },
    {
      icon: TrendingUp,
      label: "平均互动率",
      value: <AnimatedNumber value={stats.avgEngagement} decimals={1} />,
      sub: <span className="text-muted-foreground">%</span>,
      gradient: isXHS ? "from-rose-500 to-pink-500" : "from-emerald-500 to-teal-500",
    },
    {
      icon: Trophy,
      label: "最佳表现帖",
      value: <span className="text-base font-bold truncate max-w-full">{stats.bestTopic || "—"}</span>,
      sub: <span className="text-muted-foreground">互动 {formatNum(stats.bestEngagement)}</span>,
      gradient: "from-amber-500 to-orange-500",
      isText: true,
    },
    {
      icon: Star,
      label: "AI平均分",
      value: <AnimatedNumber value={stats.avgAiScore} />,
      sub: (
        <span className="flex items-center gap-0.5">
          {(() => { const w = getWowIndicator(stats.wowScoreChange, 0); return <span className={w.className}>{w.text}</span>; })()}
        </span>
      ),
      gradient: "from-violet-500 to-fuchsia-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + idx * 0.08 }}
            className="glass-card rounded-xl p-3 hover-lift"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`h-6 w-6 rounded-lg bg-gradient-to-br ${card.gradient} flex items-center justify-center`}>
                <Icon className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-[11px] text-muted-foreground font-medium">{card.label}</span>
            </div>
            <p className={`text-lg font-bold ${card.isText ? "text-base truncate" : "tabular-nums"}`}>
              {card.value}
              {card.sub}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}

function RankedPostCard({ post, rank, maxEngagement }: { post: RankedPost; rank: number; maxEngagement: number }) {

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.35 + rank * 0.06 }}
      className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors"
    >
      <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
        rank < 3 ? RANK_MEDAL_COLORS[rank] : "bg-muted text-muted-foreground"
      }`}>
        {rank < 3 ? ["🥇", "🥈", "🥉"][rank] : rank + 1}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium truncate flex-1">{post.topic || "无标题"}</p>
          <Badge variant="outline" className="text-[9px] h-4 shrink-0 bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400 border-0">
            {post.contentType}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-muted/60 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(5, Math.min(100, (post.engagementScore / maxEngagement) * 100))}%` }}
              transition={{ delay: 0.5 + rank * 0.06, duration: 0.6, ease: "easeOut" }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
            {formatNum(post.engagementScore)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function ContentTypeBar({ stat }: { stat: ContentTypeStat }) {
  const barColors = [
    "bg-gradient-to-r from-violet-500 to-purple-500",
    "bg-gradient-to-r from-emerald-500 to-teal-500",
    "bg-gradient-to-r from-amber-500 to-orange-500",
    "bg-gradient-to-r from-rose-500 to-pink-500",
    "bg-gradient-to-r from-fuchsia-500 to-violet-500",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5 }}
      className="flex items-center gap-2"
    >
      <Badge
        variant="outline"
        className={`text-[10px] h-5 shrink-0 ${stat.isBest ? "border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 font-semibold" : "text-muted-foreground border-0 bg-muted/50"}`}
      >
        {stat.type}
      </Badge>
      <div className="flex-1 h-2.5 rounded-full bg-muted/40 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColors[Math.min(4, Math.max(0, Math.round(stat.percentage / 25)))]}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(4, stat.percentage)}%` }}
          transition={{ delay: 0.6, duration: 0.7, ease: "easeOut" }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground w-8 text-right shrink-0 tabular-nums">
        {stat.count}篇
      </span>
      <span className="text-[10px] font-medium w-10 text-right shrink-0 tabular-nums">
        {stat.percentage}%
      </span>
    </motion.div>
  );
}

function SuggestionCard({ suggestion, index }: { suggestion: AISuggestion; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const meta = SUGGESTION_CATEGORY_META[suggestion.category];
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 + index * 0.08 }}
      className={`rounded-lg border p-3 cursor-pointer transition-all ${meta.border} ${meta.bg} hover-lift`}
      onClick={() => setExpanded(!expanded)}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded(!expanded); } }}
    >
      <div className="flex items-start gap-2.5">
        <div className={`h-7 w-7 rounded-lg ${meta.bg} border ${meta.border} flex items-center justify-center shrink-0 mt-0.5`}>
          <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold">{suggestion.title}</span>
            <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-0 bg-muted/60 text-muted-foreground">
              #{index + 1}
            </Badge>
          </div>
          <AnimatePresence>
            {expanded && (
              <motion.p
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-[11px] text-muted-foreground leading-relaxed mt-1.5 overflow-hidden"
              >
                {suggestion.detail}
              </motion.p>
            )}
          </AnimatePresence>
          <button
            className="text-[10px] mt-1 flex items-center gap-0.5 hover:underline"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            tabIndex={-1}
          >
            {expanded ? (
              <>收起 <ChevronUp className="h-3 w-3" /></>
            ) : (
              <>展开 <ChevronDown className="h-3 w-3" /></>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 p-1">
      <Skeleton className="h-6 w-40" />
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-5 w-32" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-5 w-36" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-5 w-28" />
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-8 rounded" />
        ))}
      </div>
    </div>
  );
}

// ─── Report Data Builder ────────────────────────────────────────────────

function buildReportData(
  allPosts: import("@/types").ContentPost[],
  period: ReportPeriod,
  customStart: string,
  customEnd: string,
  scope: ReportScope,
  platform: string
): ReportData | null {
  const { start, end } = getDateRange(period, customStart, customEnd);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  const filtered = allPosts.filter((p) => {
    const d = new Date(p.createdAt);
    if (d < start || d > end) return false;
    if (scope === "current" && p.platform && p.platform !== platform) return false;
    return true;
  });

  if (filtered.length === 0) return null;

  // Previous period for WoW comparison
  const prevDays = period === "this-month" ? 30 : 7;
  const prevStart = new Date(start);
  prevStart.setDate(prevStart.getDate() - prevDays);
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  prevEnd.setHours(23, 59, 59, 999);

  const prevFiltered = allPosts.filter((p) => {
    const d = new Date(p.createdAt);
    if (d < prevStart || d > prevEnd) return false;
    if (scope === "current" && p.platform && p.platform !== platform) return false;
    return true;
  });

  // Stats
  const engagementValues = filtered.map(calcEngagement);
  const avgEngagement = engagementValues.length > 0
    ? Math.round((engagementValues.reduce((a, b) => a + b, 0) / engagementValues.length) * 10) / 10
    : 0;

  const prevEngagementValues = prevFiltered.map(calcEngagement);
  const prevAvgEngagement = prevEngagementValues.length > 0
    ? Math.round((prevEngagementValues.reduce((a, b) => a + b, 0) / prevEngagementValues.length) * 10) / 10
    : 0;

  const scored = filtered.filter((p) => p.aiScore > 0);
  const avgAiScore = scored.length > 0
    ? Math.round(scored.reduce((s, p) => s + p.aiScore, 0) / scored.length)
    : 0;

  const prevScored = prevFiltered.filter((p) => p.aiScore > 0);
  const prevAvgAiScore = prevScored.length > 0
    ? Math.round(prevScored.reduce((s, p) => s + p.aiScore, 0) / prevScored.length)
    : 0;

  // Best post
  let bestPost = filtered[0];
  let bestEng = 0;
  for (const p of filtered) {
    const eng = calcEngagement(p);
    if (eng > bestEng) { bestEng = eng; bestPost = p; }
  }

  // Ranked posts (top 5)
  const rankedPosts: RankedPost[] = [...filtered]
    .map((p) => ({
      id: p.id,
      topic: p.topic || "无标题",
      contentType: p.contentType,
      status: p.status,
      likes: p.likes,
      comments: p.comments,
      shares: p.shares,
      views: p.views,
      favorites: p.favorites || 0,
      aiScore: p.aiScore,
      engagementScore: calcEngagement(p),
    }))
    .sort((a, b) => b.engagementScore - a.engagementScore)
    .slice(0, 5);

  // Content type stats
  const typeMap = new Map<string, { count: number; totalEng: number }>();
  for (const p of filtered) {
    const existing = typeMap.get(p.contentType) || { count: 0, totalEng: 0 };
    existing.count++;
    existing.totalEng += calcEngagement(p);
    typeMap.set(p.contentType, existing);
  }

  const total = filtered.length;
  let bestTypeEntry: { type: string; avgEngagement: number } | null = null;
  let bestTypeAvg = -1;

  const contentTypeStats: ContentTypeStat[] = Array.from(typeMap.entries())
    .map(([type, { count, totalEng }]) => {
      const avgEng = Math.round(totalEng / count);
      if (avgEng > bestTypeAvg) { bestTypeAvg = avgEng; bestTypeEntry = { type, avgEngagement: avgEng }; }
      return {
        type,
        count,
        percentage: Math.round((count / total) * 100),
        avgEngagement: avgEng,
        isBest: false,
      };
    })
    .sort((a, b) => b.percentage - a.percentage);

  if (bestTypeEntry && contentTypeStats.length > 0) {
    const bestStat = contentTypeStats.find((s) => s.type === bestTypeEntry!.type);
    if (bestStat) bestStat.isBest = true;
  }

  // AI Suggestions (fallback — generated from data)
  const suggestions = generateFallbackSuggestions(filtered, prevFiltered, contentTypeStats, platform);

  // Next week plan
  const nextWeekPlan = generateNextWeekPlan(contentTypeStats, filtered);

  return {
    period,
    dateRange: { start: formatDate(start), end: formatDate(end) },
    platform: scope === "current" ? platform : "全平台",
    stats: {
      totalPosts: filtered.length,
      avgEngagement,
      bestTopic: bestPost?.topic || "",
      bestEngagement: Math.round(bestEng),
      avgAiScore,
      wowPostChange: filtered.length - prevFiltered.length,
      wowEngagementChange: Math.round((avgEngagement - prevAvgEngagement) * 10) / 10,
      wowScoreChange: avgAiScore - prevAvgAiScore,
    },
    rankedPosts,
    contentTypeStats,
    suggestions,
    nextWeekPlan,
    generatedAt: new Date().toISOString(),
  };
}

function generateFallbackSuggestions(
  current: import("@/types").ContentPost[],
  previous: import("@/types").ContentPost[],
  types: ContentTypeStat[],
  platform: string
): AISuggestion[] {
  const suggestions: AISuggestion[] = [];
  const currentEng = current.reduce((s, p) => s + calcEngagement(p), 0);
  const prevEng = previous.reduce((s, p) => s + calcEngagement(p), 0);
  const isXHS = platform === "xiaohongshu";

  // Timing suggestion
  const published = current.filter((p) => p.status === "published");
  if (published.length > 0) {
    suggestions.push({
      id: 1,
      category: "timing",
      icon: Clock,
      title: "优化发布时间",
      detail: "根据数据分析，建议在以下时段发布：工作日 12:00-13:00 和 20:00-22:00。这些时段用户活跃度较高，能够获得更多的初始曝光和互动。",
    });
  }

  // Content suggestion
  if (currentEng < prevEng && prevEng > 0) {
    suggestions.push({
      id: 2,
      category: "content",
      icon: MessageSquare,
      title: "提升内容互动性",
      detail: "本期互动量较上期有所下降。建议增加互动引导元素（提问、投票、话题讨论），并在内容开头使用更有吸引力的标题或首图，提升用户停留和参与意愿。",
    });
  } else if (currentEng > prevEng * 1.3 && prevEng > 0) {
    suggestions.push({
      id: 2,
      category: "content",
      icon: MessageSquare,
      title: "保持优质内容策略",
      detail: "本期互动量显著提升！建议总结高互动内容的共性特点，形成可复用的内容模板，并在此基础上持续创新，保持用户的关注热情。",
    });
  } else {
    suggestions.push({
      id: 2,
      category: "content",
      icon: MessageSquare,
      title: "关注内容质量提升",
      detail: `建议在发布前使用AI评分工具检查内容质量，确保每条${isXHS ? "笔记" : "动态"}的AI评分达到80分以上。关注标题吸引力和首图质量。`,
    });
  }

  // Type suggestion
  if (types.length <= 1) {
    suggestions.push({
      id: 3,
      category: "type",
      icon: LayoutGrid,
      title: "丰富内容形式",
      detail: `当前内容类型较为单一，建议尝试更多样的内容形式（如图文、视频、${isXHS ? "Vlog" : "故事"}等），以覆盖不同偏好的用户群体，提升账号活跃度和涨粉效率。`,
    });
  } else if (types[0]) {
    suggestions.push({
      id: 3,
      category: "type",
      icon: LayoutGrid,
      title: `重点发力「${types[0].type}」内容`,
      detail: `数据表明「${types[0].type}」类型的表现最佳（占比${types[0].percentage}%），建议适当增加该类型内容比例，同时保持2-3种辅助类型维持内容多样性。`,
    });
  }

  // Engagement suggestion
  const scored = current.filter((p) => p.aiScore > 0);
  const avgScore = scored.length > 0 ? scored.reduce((s, p) => s + p.aiScore, 0) / scored.length : 0;
  if (avgScore < 65 && avgScore > 0) {
    suggestions.push({
      id: 4,
      category: "engagement",
      icon: MousePointerClick,
      title: "加强互动引导",
      detail: "AI评分偏低说明内容优化空间较大。建议：1) 在文末添加明确的互动引导语；2) 回复评论区活跃用户；3) 设置话题标签提升发现率。",
    });
  } else {
    suggestions.push({
      id: 4,
      category: "engagement",
      icon: MousePointerClick,
      title: "深化用户连接",
      detail: "内容质量保持良好，建议进一步深化与用户的连接：定期开展问答互动、创建专属话题标签、积极回复用户评论，培养忠实粉丝群体。",
    });
  }

  return suggestions.slice(0, 5);
}

function generateNextWeekPlan(types: ContentTypeStat[], posts: import("@/types").ContentPost[]): NextWeekPlan {
  const suggestedMix = types.slice(0, 3).map((t, i) => ({
    type: t.type,
    percentage: i === 0 ? Math.round(t.percentage * 1.2) : Math.round((100 - types[0].percentage * 1.2) / (types.length - 1) * (t.percentage / types.slice(1).reduce((s, tt) => s + tt.percentage, 0))),
  }));

  const total = suggestedMix.reduce((s, m) => s + m.percentage, 0);
  if (total > 0) suggestedMix.forEach((m) => m.percentage = Math.round(m.percentage / total * 100));

  return {
    suggestedMix: suggestedMix.length > 0 ? suggestedMix : [{ type: "图文搭配", percentage: 50 }, { type: "观点洞察", percentage: 30 }, { type: "互动话题", percentage: 20 }],
    recommendedTimes: ["工作日 12:00-13:00", "工作日 20:00-22:00", "周末 10:00-11:00"],
  };
}

// ─── Build Plain Text Report ────────────────────────────────────────────

function buildReportText(data: ReportData): string {
  const { stats, rankedPosts, contentTypeStats, suggestions, nextWeekPlan } = data;

  let text = `📊 运营数据周报\n`;
  text += `周期: ${data.dateRange.start} ~ ${data.dateRange.end}\n`;
  text += `平台: ${data.platform}\n`;
  text += `生成时间: ${new Date(data.generatedAt).toLocaleString("zh-CN")}\n\n`;

  text += `━━━ 核心数据概览 ━━━\n`;
  text += `发布总数: ${stats.totalPosts}\n`;
  text += `平均互动率: ${stats.avgEngagement}%\n`;
  text += `最佳表现帖: ${stats.bestTopic}（互动 ${formatNum(stats.bestEngagement)}）\n`;
  text += `AI平均分: ${stats.avgAiScore}\n\n`;

  text += `━━━ 内容表现排行 TOP${rankedPosts.length} ━━━\n`;
  rankedPosts.forEach((p, i) => {
    text += `${i + 1}. ${p.topic} | 互动: ${formatNum(p.engagementScore)} | 类型: ${p.contentType}\n`;
  });
  text += "\n";

  text += `━━━ 内容类型分析 ━━━\n`;
  contentTypeStats.forEach((t) => {
    text += `• ${t.type}: ${t.count}篇 (${t.percentage}%)${t.isBest ? " ⭐最佳" : ""}\n`;
  });
  text += "\n";

  text += `━━━ AI 运营建议 ━━━\n`;
  suggestions.forEach((s, i) => {
    text += `${i + 1}. [${s.category}] ${s.title}\n   ${s.detail}\n\n`;
  });

  text += `━━━ 下周计划建议 ━━━\n`;
  text += `建议内容配比:\n`;
  nextWeekPlan.suggestedMix.forEach((m) => {
    text += `  • ${m.type}: ${m.percentage}%\n`;
  });
  text += `\n推荐发布时间:\n`;
  nextWeekPlan.recommendedTimes.forEach((t) => {
    text += `  • ${t}\n`;
  });

  return text;
}

// ─── Empty State ────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-12 space-y-3"
    >
      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500/10 to-amber-500/10 dark:from-violet-500/20 dark:to-amber-500/20 flex items-center justify-center">
        <Calendar className="h-7 w-7 text-violet-500 dark:text-violet-400" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-foreground">选择报告周期后点击生成</p>
        <p className="text-xs text-muted-foreground">AI 将分析您的运营数据并生成周报</p>
      </div>
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────

export function AIWeeklyReport() {
  const { platform, contentPosts } = useAppStore();
  const isXHS = platform === "xiaohongshu";

  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>("this-week");
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return formatDate(d);
  });
  const [customEnd, setCustomEnd] = useState(() => formatDate(new Date()));
  const [reportScope, setReportScope] = useState<ReportScope>("current");
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);

  const platformAccent = isXHS ? "#f43f5e" : "#22c55e";

  // ── Generate Report ───────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setReportData(null);

    // Small delay for visual feedback
    await new Promise((r) => setTimeout(r, 600));

    try {
      const data = buildReportData(contentPosts, reportPeriod, customStart, customEnd, reportScope, platform);
      setReportData(data);

      if (data) {
        // Try AI enhancement in background
        setIsAiAnalyzing(true);
        try {
          const res = await fetch("/api/ai/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "weekly-report-analysis",
              content: JSON.stringify({
                stats: data.stats,
                contentTypeStats: data.contentTypeStats,
                rankedPosts: data.rankedPosts.slice(0, 3),
                suggestions: data.suggestions.map((s) => s.title),
              }),
              topic: `${getPeriodLabel(reportPeriod)}运营周报分析`,
              platform,
            }),
          });

          if (res.ok) {
            const result = await res.json();
            const aiContent = result.content || "";
            // Parse AI suggestions if returned
            if (aiContent && aiContent.length > 20) {
              const enhancedSuggestions = parseAISuggestions(aiContent, data.suggestions);
              data.suggestions = enhancedSuggestions;
              setReportData({ ...data });
            }
          }
        } catch {
          // Fallback suggestions already in data
        } finally {
          setIsAiAnalyzing(false);
        }
      }
    } finally {
      setIsGenerating(false);
    }
  }, [contentPosts, reportPeriod, customStart, customEnd, reportScope, platform]);

  // ── Parse AI suggestions ──────────────────────────────────────────
  const parseAISuggestions = useCallback((content: string, fallback: AISuggestion[]): AISuggestion[] => {
    try {
      // Try JSON first
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch?.[1]?.trim() || content;
      try {
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) {
          return parsed.slice(0, 5).map((item: Record<string, unknown>, i: number) => {
            const categories: Array<"timing" | "content" | "type" | "engagement"> = ["timing", "content", "type", "engagement"];
            const meta = SUGGESTION_CATEGORY_META[categories[i % categories.length]];
            return {
              id: i + 1,
              category: categories[i % categories.length],
              icon: meta.icon,
              title: String(item.title || item.标题 || `建议 ${i + 1}`),
              detail: String(item.detail || item.详情 || item.content || item.内容 || ""),
            };
          });
        }
      } catch {
        // Not JSON, use raw as fallback
      }
      return fallback;
    } catch {
      return fallback;
    }
  }, []);

  // ── Copy ──────────────────────────────────────────────────────────
  const handleCopy = useCallback(async () => {
    if (!reportData) return;
    try {
      await navigator.clipboard.writeText(buildReportText(reportData));
      setCopied(true);
      toast.success("报告已复制到剪贴板");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("复制失败，请重试");
    }
  }, [reportData]);

  // ── Regenerate ────────────────────────────────────────────────────
  const handleRegenerate = useCallback(() => {
    setReportData(null);
    handleGenerate();
  }, [handleGenerate]);

  return (
    <div className="space-y-4 p-4">
      {/* ─── Section Header ─── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-3"
      >
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-amber-500 flex items-center justify-center shadow-md">
          <FileBarChart className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-bold">AI 运营周报生成器</h2>
          <p className="text-[11px] text-muted-foreground">智能分析运营数据，一键生成周报</p>
        </div>
      </motion.div>

      {/* ─── Report Config ─── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-xl p-4 space-y-3"
      >
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-violet-500" />
          报告配置
        </p>

        {/* Period selector */}
        <div className="space-y-1.5">
          <label className="text-[11px] text-muted-foreground font-medium">报告周期</label>
          <div className="flex flex-wrap gap-1.5">
            {([
              { value: "this-week", label: "本周" },
              { value: "last-week", label: "上周" },
              { value: "this-month", label: "本月" },
              { value: "custom", label: "自定义" },
            ] as const).map((opt) => (
              <Button
                key={opt.value}
                variant={reportPeriod === opt.value ? "default" : "outline"}
                size="sm"
                className={`h-7 text-[11px] px-3 ${reportPeriod === opt.value ? "bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white border-0" : ""}`}
                onClick={() => setReportPeriod(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Custom date range */}
        <AnimatePresence>
          {reportPeriod === "custom" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">开始日期</label>
                  <Input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">结束日期</label>
                  <Input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scope selector */}
        <div className="space-y-1.5">
          <label className="text-[11px] text-muted-foreground font-medium">报告范围</label>
          <Select value={reportScope} onValueChange={(v) => setReportScope(v as ReportScope)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">当前平台（{isXHS ? "小红书" : "朋友圈"}）</SelectItem>
              <SelectItem value="all">全平台</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Generate button */}
        <Button
          className="w-full h-10 text-sm font-semibold bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 hover:from-violet-600 hover:via-purple-600 hover:to-fuchsia-600 text-white shadow-md hover:shadow-lg transition-shadow"
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              正在生成周报...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              生成周报
            </>
          )}
        </Button>
      </motion.div>

      {/* ─── Loading State ─── */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="glass-card rounded-xl p-4"
          >
            <LoadingSkeleton />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Empty State ─── */}
      {!isGenerating && !reportData && <EmptyState />}

      {/* ─── Report Preview ─── */}
      <AnimatePresence>
        {reportData && !isGenerating && (
          <motion.div
            key="report-preview"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            {/* ─── Report Header ─── */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="glass-card rounded-xl p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="text-base font-bold gradient-text">运营数据周报</h3>
                  <p className="text-[11px] text-muted-foreground">
                    {reportData.dateRange.start} ~ {reportData.dateRange.end}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className="text-[10px] h-5 border-0 font-medium"
                    style={{
                      backgroundColor: `${platformAccent}15`,
                      color: platformAccent,
                    }}
                  >
                    {reportData.platform === "全平台" ? "全平台" : (isXHS ? "小红书" : "朋友圈")}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[10px] h-5 border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 ai-badge-pulse"
                  >
                    <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                    AI生成
                  </Badge>
                </div>
              </div>

              {isAiAnalyzing && (
                <div className="flex items-center gap-1.5 text-[10px] text-violet-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  AI 正在深度分析...
                </div>
              )}
            </motion.div>

            {/* ─── Report Body ─── */}
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-5 pr-1 stagger-children">

                {/* 核心数据概览 */}
                <section aria-label="核心数据概览">
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center gap-2 mb-3"
                  >
                    <div className="h-5 w-5 rounded-md bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                      <BarChart3 className="h-3 w-3 text-white" />
                    </div>
                    <h4 className="text-xs font-semibold">核心数据概览</h4>
                  </motion.div>
                  <StatCardGrid stats={reportData.stats} platformAccent={platformAccent} />
                </section>

                <Separator className="opacity-50" />

                {/* 内容表现排行 */}
                {reportData.rankedPosts.length > 0 && (
                  <section aria-label="内容表现排行">
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className="flex items-center gap-2 mb-3"
                    >
                      <div className="h-5 w-5 rounded-md bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                        <Trophy className="h-3 w-3 text-white" />
                      </div>
                      <h4 className="text-xs font-semibold">内容表现排行</h4>
                      <span className="text-[10px] text-muted-foreground ml-auto">TOP {reportData.rankedPosts.length}</span>
                    </motion.div>
                    <div className="space-y-2">
                      {reportData.rankedPosts.map((post, idx) => (
                        <RankedPostCard key={post.id} post={post} rank={idx} maxEngagement={reportData.rankedPosts[0]?.engagementScore || 1} />
                      ))}
                    </div>
                  </section>
                )}

                <Separator className="opacity-50" />

                {/* 内容类型分析 */}
                {reportData.contentTypeStats.length > 0 && (
                  <section aria-label="内容类型分析">
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="flex items-center gap-2 mb-3"
                    >
                      <div className="h-5 w-5 rounded-md bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                        <Target className="h-3 w-3 text-white" />
                      </div>
                      <h4 className="text-xs font-semibold">内容类型分析</h4>
                    </motion.div>
                    <div className="space-y-2">
                      {reportData.contentTypeStats.map((stat) => (
                        <ContentTypeBar key={stat.type} stat={stat} />
                      ))}
                    </div>
                    {reportData.contentTypeStats.some((s) => s.isBest) && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 }}
                        className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1"
                      >
                        <Zap className="h-3 w-3" />
                        最佳表现类型: {reportData.contentTypeStats.find((s) => s.isBest)?.type}
                      </motion.p>
                    )}
                  </section>
                )}

                <Separator className="opacity-50" />

                {/* AI 运营建议 */}
                <section aria-label="AI运营建议">
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55 }}
                    className="flex items-center gap-2 mb-3"
                  >
                    <div className="h-5 w-5 rounded-md bg-gradient-to-br from-fuchsia-500 to-rose-500 flex items-center justify-center">
                      <Lightbulb className="h-3 w-3 text-white" />
                    </div>
                    <h4 className="text-xs font-semibold">AI 运营建议</h4>
                    <Badge
                      variant="outline"
                      className="text-[9px] h-4 px-1.5 border-0 bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
                    >
                      {reportData.suggestions.length} 条
                    </Badge>
                  </motion.div>
                  <div className="space-y-2">
                    {reportData.suggestions.map((suggestion, idx) => (
                      <SuggestionCard key={suggestion.id} suggestion={suggestion} index={idx} />
                    ))}
                  </div>
                </section>

                <Separator className="opacity-50" />

                {/* 下周计划建议 */}
                <section aria-label="下周计划建议">
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.65 }}
                    className="flex items-center gap-2 mb-3"
                  >
                    <div className="h-5 w-5 rounded-md bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
                      <CalendarDays className="h-3 w-3 text-white" />
                    </div>
                    <h4 className="text-xs font-semibold">下周计划建议</h4>
                  </motion.div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Suggested content mix */}
                    <div className="glass-card rounded-lg p-3 space-y-2">
                      <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                        <LayoutGrid className="h-3.5 w-3.5 text-amber-500" />
                        建议内容配比
                      </p>
                      <div className="space-y-1.5">
                        {reportData.nextWeekPlan.suggestedMix.map((item) => (
                          <div key={item.type} className="flex items-center gap-2">
                            <span className="text-[10px] text-foreground/70 w-16 truncate shrink-0">{item.type}</span>
                            <div className="flex-1 h-2 rounded-full bg-muted/40 overflow-hidden">
                              <motion.div
                                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${item.percentage}%` }}
                                transition={{ delay: 0.8, duration: 0.5 }}
                              />
                            </div>
                            <span className="text-[10px] font-medium tabular-nums w-8 text-right">{item.percentage}%</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recommended posting times */}
                    <div className="glass-card rounded-lg p-3 space-y-2">
                      <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-emerald-500" />
                        推荐发布时间
                      </p>
                      <div className="space-y-1.5">
                        {reportData.nextWeekPlan.recommendedTimes.map((time, idx) => (
                          <motion.div
                            key={time}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.85 + idx * 0.08 }}
                            className="flex items-center gap-2"
                          >
                            <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${
                              idx === 0 ? "bg-gradient-to-br from-amber-400 to-yellow-500" :
                              idx === 1 ? "bg-gradient-to-br from-slate-300 to-slate-400" :
                              "bg-gradient-to-br from-amber-600 to-orange-700"
                            }`}>
                              {idx + 1}
                            </div>
                            <span className="text-[11px] text-foreground/80">{time}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </ScrollArea>

            {/* ─── Action Bar ─── */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="flex items-center gap-2 pt-2"
            >
              <Button
                variant="outline"
                size="sm"
                className={`flex-1 h-9 text-xs gap-1.5 ${copied ? "border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400" : ""}`}
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    复制报告文本
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-9 text-xs gap-1.5"
                onClick={handleRegenerate}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                重新生成
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
