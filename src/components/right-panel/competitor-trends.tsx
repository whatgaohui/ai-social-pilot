"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Hash,
  BarChart3,
  Clock,
  TrendingUp,
  Heart,
  MessageSquare,
  Share2,
  Eye,
  Sparkles,
  ArrowLeft,
  Loader2,
  Inbox,
  Lightbulb,
  Flame,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/store/app-store";
import { CONTENT_TYPE_LABELS, XHS_CONTENT_TYPE_LABELS, XHS_CONTENT_TYPE_COLORS } from "@/types";

// ─── Types ──────────────────────────────────────────────────────────────────

interface NoteItem {
  id: string;
  topic: string;
  content: string;
  scheduledDate: string;
  platform: string;
  likes: number;
  comments: number;
  shares: number;
  favorites: number;
  views: number;
  tags?: string;
  contentType: string;
}

// ─── Animation Variants ────────────────────────────────────────────────────

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + "w";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

const TAG_COLORS = [
  { bg: "bg-rose-100 dark:bg-rose-900/30", text: "text-rose-700 dark:text-rose-300" },
  { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300" },
  { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300" },
  { bg: "bg-violet-100 dark:bg-violet-900/30", text: "text-violet-700 dark:text-violet-300" },
  { bg: "bg-cyan-100 dark:bg-cyan-900/30", text: "text-cyan-700 dark:text-cyan-300" },
  { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-300" },
  { bg: "bg-pink-100 dark:bg-pink-900/30", text: "text-pink-700 dark:text-pink-300" },
  { bg: "bg-teal-100 dark:bg-teal-900/30", text: "text-teal-700 dark:text-teal-300" },
];

// ─── Tag Cloud Component ────────────────────────────────────────────────────

function TagCloud({ tags }: { tags: Array<{ tag: string; count: number }> }) {
  if (tags.length === 0) return null;
  const maxCount = Math.max(...tags.map((t) => t.count), 1);

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {tags.map((item, idx) => {
        const ratio = item.count / maxCount;
        const sizeClass =
          ratio > 0.8
            ? "text-sm font-bold px-3 py-1.5"
            : ratio > 0.5
              ? "text-xs font-medium px-2.5 py-1"
              : ratio > 0.25
                ? "text-[11px] px-2 py-0.5"
                : "text-[10px] px-1.5 py-0.5";
        const colorSet = TAG_COLORS[idx % TAG_COLORS.length];

        return (
          <motion.span
            key={item.tag}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.03, duration: 0.2 }}
            className={`rounded-full ${colorSet.bg} ${colorSet.text} ${sizeClass} hover:scale-110 transition-transform cursor-default`}
          >
            {item.tag}
            <span className="ml-1 opacity-60">{item.count}</span>
          </motion.span>
        );
      })}
    </div>
  );
}

// ─── Content Type Donut Chart ───────────────────────────────────────────────

function ContentTypeDonut({ data }: { data: Record<string, number> }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  if (total === 0) return <p className="text-xs text-muted-foreground text-center py-3">暂无数据</p>;

  const radius = 40;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const center = radius + strokeWidth;

  const CHART_COLORS: Record<string, string> = {
    text: "#8b5cf6",
    image: "#10b981",
    video: "#f43f5e",
    mixed: "#f59e0b",
    story: "#a855f7",
    insight: "#06b6d4",
    interaction: "#f97316",
    seeding: "#ec4899",
    review: "#f59e0b",
    tutorial: "#06b6d4",
    drygoods: "#8b5cf6",
    vlog: "#14b8a6",
    daily: "#f97316",
    recommend: "#f43f5e",
    collection: "#6366f1",
  };

  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const gapSize = entries.length > 1 ? 3 : 0;

  const segments = entries.reduce<Array<{ type: string; count: number; actualLen: number; offset: number }>>(
    (acc, [type, count]) => {
      const pct = count / total;
      const segLen = pct * circumference;
      const actualLen = Math.max(0, segLen - gapSize);
      const accumulated =
        acc.length > 0
          ? acc[acc.length - 1].offset + acc[acc.length - 1].actualLen + gapSize
          : 0;
      acc.push({ type, count, actualLen, offset: -accumulated });
      return acc;
    },
    []
  );

  const getLabel = (type: string) => {
    return (
      XHS_CONTENT_TYPE_LABELS[type as keyof typeof XHS_CONTENT_TYPE_LABELS] ||
      CONTENT_TYPE_LABELS[type as keyof typeof CONTENT_TYPE_LABELS] ||
      type
    );
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex-shrink-0">
        <svg
          width={center * 2}
          height={center * 2}
          viewBox={`0 0 ${center * 2} ${center * 2}`}
          className="transform -rotate-90"
        >
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-muted/30"
            strokeWidth={strokeWidth}
          />
          {segments.map(({ type, actualLen, offset }) => (
            <motion.circle
              key={type}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={CHART_COLORS[type] || "#8b5cf6"}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${actualLen} ${circumference - actualLen}`}
              strokeDashoffset={offset}
              initial={{ strokeDasharray: `0 ${circumference}` }}
              animate={{ strokeDasharray: `${actualLen} ${circumference - actualLen}` }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold">{total}</span>
          <span className="text-[9px] text-muted-foreground">总计</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center">
        {entries.map(([type, count]) => {
          const pct = Math.round((count / total) * 100);
          return (
            <div key={type} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: CHART_COLORS[type] || "#8b5cf6" }}
              />
              <span className="text-[10px] text-muted-foreground">
                {getLabel(type)}{" "}
                <span className="font-medium text-foreground">{pct}%</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Hour Distribution Bar Chart ────────────────────────────────────────────

function HourBarChart({ hourData }: { hourData: number[] }) {
  const maxVal = Math.max(...hourData, 1);
  const width = 280;
  const height = 80;
  const padding = { top: 4, right: 4, bottom: 16, left: 4 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const barWidth = chartW / 24 - 2;

  return (
    <div className="flex justify-center">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        {hourData.map((val, i) => {
          const barH = (val / maxVal) * chartH;
          const x = padding.left + i * (chartW / 24) + 1;
          const y = padding.top + chartH - barH;
          const isPeak = val === maxVal && val > 0;

          return (
            <motion.g key={i}>
              <motion.rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={1.5}
                fill={isPeak ? "#8b5cf6" : "rgba(139, 92, 246, 0.3)"}
                initial={{ height: 0, y: padding.top + chartH }}
                animate={{ height: barH, y }}
                transition={{ duration: 0.5, delay: i * 0.02, ease: "easeOut" }}
              />
              <text
                x={x + barWidth / 2}
                y={height - 2}
                textAnchor="middle"
                className="fill-muted-foreground text-[7px]"
              >
                {i % 3 === 0 ? `${i}h` : ""}
              </text>
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Engagement Trend Line Chart ────────────────────────────────────────────

function EngagementTrendLine({ notes }: { notes: NoteItem[] }) {
  // Group by date and compute avg engagement
  const sorted = [...notes].sort(
    (a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
  );

  const dateGroups: Record<string, { total: number; count: number }> = {};
  sorted.forEach((note) => {
    const date = note.scheduledDate?.slice(0, 10) || "unknown";
    if (!dateGroups[date]) dateGroups[date] = { total: 0, count: 0 };
    dateGroups[date].total += note.likes + note.comments * 2 + note.shares * 3;
    dateGroups[date].count++;
  });

  const dataPoints = Object.entries(dateGroups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => (v.count > 0 ? Math.round(v.total / v.count) : 0))
    .slice(-20); // Last 20 data points

  if (dataPoints.length < 2) {
    return <p className="text-xs text-muted-foreground text-center py-3">数据不足</p>;
  }

  const width = 280;
  const height = 80;
  const padding = { top: 8, right: 8, bottom: 12, left: 8 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const max = Math.max(...dataPoints, 1);

  const points = dataPoints.map((v, i) => ({
    x: padding.left + (i / Math.max(dataPoints.length - 1, 1)) * chartW,
    y: padding.top + chartH - (v / max) * chartH,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  return (
    <div className="flex justify-center">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id="trendGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <motion.path
          d={areaPath}
          fill="url(#trendGrad)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        />
        <motion.path
          d={linePath}
          fill="none"
          stroke="#8b5cf6"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
        {points.map((p, i) => (
          <motion.circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={2.5}
            fill="#8b5cf6"
            stroke="hsl(var(--background))"
            strokeWidth={1.5}
            initial={{ r: 0 }}
            animate={{ r: 2.5 }}
            transition={{ duration: 0.2, delay: 0.5 + i * 0.05 }}
          />
        ))}
      </svg>
    </div>
  );
}

// ─── Top Posts Cards ───────────────────────────────────────────────────────

function TopPosts({ notes }: { notes: NoteItem[] }) {
  const top5 = [...notes]
    .map((n) => ({
      ...n,
      engagement:
        n.likes + n.comments * 2 + n.shares * 3 + (n.favorites || 0) * 1.5,
      engagementRate:
        n.views > 0
          ? ((n.likes + n.comments + n.shares) / n.views) * 100
          : 0,
    }))
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 5);

  if (top5.length === 0) return null;

  const medalColors = ["text-amber-500", "text-slate-400", "text-orange-600"];

  return (
    <div className="space-y-2">
      {top5.map((post, idx) => (
        <motion.div
          key={post.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.06, duration: 0.3 }}
        >
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <span
                  className={`text-lg font-bold flex-shrink-0 ${
                    medalColors[idx] || "text-muted-foreground"
                  }`}
                >
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate mb-1">
                    {post.topic || "未命名"}
                  </p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <Heart className="h-2.5 w-2.5 text-rose-400" />
                      {formatNum(post.likes)}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <MessageSquare className="h-2.5 w-2.5 text-amber-400" />
                      {formatNum(post.comments)}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Share2 className="h-2.5 w-2.5 text-emerald-400" />
                      {formatNum(post.shares)}
                    </span>
                    {post.views > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Eye className="h-2.5 w-2.5 text-cyan-400" />
                        {formatNum(post.views)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Loading Skeleton ───────────────────────────────────────────────────────

function TrendsSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

interface CompetitorTrendsProps {
  accountId: string;
  accountName?: string;
  onClose?: () => void;
}

export function CompetitorTrends({ accountId, accountName, onClose }: CompetitorTrendsProps) {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotes = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/tracked-accounts/${accountId}/notes?limit=50`);
        if (res.ok) {
          const data = await res.json();
          setNotes(
            data.posts.map((p: NoteItem) => ({
              id: p.id,
              topic: p.topic || "",
              content: p.content || "",
              scheduledDate: p.scheduledDate || "",
              platform: p.platform || "",
              likes: p.likes || 0,
              comments: p.comments || 0,
              shares: p.shares || 0,
              favorites: p.favorites || 0,
              views: p.views || 0,
              tags: p.content?.match(/#[^\s#]+/g)?.join(" ") || "",
              contentType: p.contentType || "text",
            }))
          );
        }
      } catch {
        toast.error("获取数据失败");
      } finally {
        setLoading(false);
      }
    };
    fetchNotes();
  }, [accountId]);

  // ─── Compute analytics ──────────────────────────────────────────────────
  const analytics = useMemo(() => {
    if (notes.length === 0) return null;

    // 1. Tag cloud
    const tagMap: Record<string, number> = {};
    notes.forEach((n) => {
      const tags = (n.tags || "").split(" ").filter(Boolean);
      tags.forEach((t) => {
        tagMap[t] = (tagMap[t] || 0) + 1;
      });
    });
    const topTags = Object.entries(tagMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([tag, count]) => ({ tag, count }));

    // 2. Content type distribution
    const typeDist: Record<string, number> = {};
    notes.forEach((n) => {
      typeDist[n.contentType] = (typeDist[n.contentType] || 0) + 1;
    });

    // 3. Hour distribution
    const hourData = Array(24).fill(0) as number[];
    notes.forEach((n) => {
      const d = new Date(n.scheduledDate);
      if (!isNaN(d.getTime())) {
        hourData[d.getHours()]++;
      }
    });

    // 4. Best posting time
    let peakHour = 0;
    let peakCount = 0;
    hourData.forEach((c, i) => {
      if (c > peakCount) {
        peakCount = c;
        peakHour = i;
      }
    });

    // Find a range around peak hour
    const peakRangeStart = Math.max(0, peakHour - 1);
    const peakRangeEnd = Math.min(23, peakHour + 1);

    // 5. Best content type
    const typeEngagement: Record<string, { total: number; count: number }> = {};
    notes.forEach((n) => {
      if (!typeEngagement[n.contentType])
        typeEngagement[n.contentType] = { total: 0, count: 0 };
      typeEngagement[n.contentType].total +=
        n.likes + n.comments * 2 + n.shares * 3;
      typeEngagement[n.contentType].count++;
    });
    let bestType = "";
    let bestTypeAvg = 0;
    Object.entries(typeEngagement).forEach(([type, data]) => {
      const avg = data.count > 0 ? data.total / data.count : 0;
      if (avg > bestTypeAvg) {
        bestTypeAvg = avg;
        bestType = type;
      }
    });

    const bestTypeLabel =
      XHS_CONTENT_TYPE_LABELS[bestType as keyof typeof XHS_CONTENT_TYPE_LABELS] ||
      CONTENT_TYPE_LABELS[bestType as keyof typeof CONTENT_TYPE_LABELS] ||
      bestType;

    // 6. Suggested tags
    const suggestedTags = topTags
      .slice(0, 5)
      .map((t) => t.tag)
      .join("、");

    return {
      topTags,
      typeDist,
      hourData,
      bestTime: `${peakRangeStart}:00-${peakRangeEnd + 1}:00`,
      bestTypeLabel,
      suggestedTags,
    };
  }, [notes]);

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-1 flex-shrink-0">
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-7 px-2 text-xs gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold truncate">
            {accountName || "竞品"} - 趋势分析
          </h3>
          <p className="text-[10px] text-muted-foreground">
            共 {notes.length} 条内容
          </p>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <TrendsSkeleton />
            </motion.div>
          )}

          {!loading && notes.length === 0 && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center py-16 text-center px-4"
            >
              <Inbox className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">暂无采集数据</p>
              <p className="text-xs text-muted-foreground mt-1">
                同步竞品账号后即可查看趋势分析
              </p>
            </motion.div>
          )}

          {!loading && analytics && (
            <motion.div
              key="content"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.06 },
                },
              }}
              initial="hidden"
              animate="visible"
              className="p-4 space-y-4"
            >
              {/* ── Tag Cloud ──────────────────────────────────────── */}
              <motion.div variants={itemVariants}>
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2 px-4 pt-3">
                    <CardTitle className="text-xs font-semibold flex items-center gap-2">
                      <div className="h-6 w-6 rounded bg-rose-500/10 flex items-center justify-center">
                        <Hash className="h-3.5 w-3.5 text-rose-500" />
                      </div>
                      话题标签云
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    {analytics.topTags.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-3">
                        未检测到话题标签
                      </p>
                    ) : (
                      <TagCloud tags={analytics.topTags} />
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* ── Content Type Distribution ──────────────────────── */}
              <motion.div variants={itemVariants}>
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2 px-4 pt-3">
                    <CardTitle className="text-xs font-semibold flex items-center gap-2">
                      <div className="h-6 w-6 rounded bg-emerald-500/10 flex items-center justify-center">
                        <BarChart3 className="h-3.5 w-3.5 text-emerald-500" />
                      </div>
                      内容类型分布
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <ContentTypeDonut data={analytics.typeDist} />
                  </CardContent>
                </Card>
              </motion.div>

              {/* ── Hour Distribution ──────────────────────────────── */}
              <motion.div variants={itemVariants}>
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2 px-4 pt-3">
                    <CardTitle className="text-xs font-semibold flex items-center gap-2">
                      <div className="h-6 w-6 rounded bg-amber-500/10 flex items-center justify-center">
                        <Clock className="h-3.5 w-3.5 text-amber-500" />
                      </div>
                      发布时间分布
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <HourBarChart hourData={analytics.hourData} />
                    <p className="text-[10px] text-muted-foreground text-center mt-2">
                      按小时统计发布频率
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* ── Engagement Trend ───────────────────────────────── */}
              <motion.div variants={itemVariants}>
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2 px-4 pt-3">
                    <CardTitle className="text-xs font-semibold flex items-center gap-2">
                      <div className="h-6 w-6 rounded bg-violet-500/10 flex items-center justify-center">
                        <TrendingUp className="h-3.5 w-3.5 text-violet-500" />
                      </div>
                      互动数据趋势
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <EngagementTrendLine notes={notes} />
                    <p className="text-[10px] text-muted-foreground text-center mt-2">
                      平均互动量随时间变化
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* ── Top 5 Posts ───────────────────────────────────── */}
              <motion.div variants={itemVariants}>
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="h-6 w-6 rounded bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                    <Flame className="h-3.5 w-3.5 text-white" />
                  </div>
                  <h3 className="text-xs font-semibold">高互动内容 Top 5</h3>
                </div>
                <TopPosts notes={notes} />
              </motion.div>

              {/* ── Insights ──────────────────────────────────────── */}
              <motion.div variants={itemVariants}>
                <Card className="border-0 shadow-sm overflow-hidden">
                  <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-7 w-7 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
                        <Lightbulb className="h-4 w-4 text-yellow-200" />
                      </div>
                      <h3 className="text-sm font-semibold text-white">AI 洞察</h3>
                    </div>
                    <div className="space-y-2.5">
                      <motion.div
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="flex items-start gap-2"
                      >
                        <Zap className="h-3.5 w-3.5 text-yellow-200 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] text-white/60">最佳发布时段</p>
                          <p className="text-xs text-white/90 font-medium">
                            {analytics.bestTime}
                          </p>
                        </div>
                      </motion.div>
                      <Separator className="bg-white/10" />
                      <motion.div
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex items-start gap-2"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-yellow-200 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] text-white/60">
                            最受欢迎的内容类型
                          </p>
                          <p className="text-xs text-white/90 font-medium">
                            {analytics.bestTypeLabel || "暂无数据"}
                          </p>
                        </div>
                      </motion.div>
                      <Separator className="bg-white/10" />
                      <motion.div
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex items-start gap-2"
                      >
                        <Hash className="h-3.5 w-3.5 text-yellow-200 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] text-white/60">
                            建议关注的话题标签
                          </p>
                          <p className="text-xs text-white/90 font-medium">
                            {analytics.suggestedTags || "暂无数据"}
                          </p>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </ScrollArea>
    </div>
  );
}
