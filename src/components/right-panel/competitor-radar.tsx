"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Crosshair,
  Eye,
  EyeOff,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CompetitorInfo {
  id: string;
  nickname: string;
  platform: string;
  followers: number;
  stats: {
    avgEngagementRate: number;
    postsPerWeek: number;
    totalPosts: number;
    topContentTypes: Array<{ type: string; count: number }>;
    peakHour: number;
  };
}

interface AnalysisResponse {
  competitors: CompetitorInfo[];
  own: {
    stats: {
      totalPosts: number;
      avgEngagementRate: number;
      postsPerWeek: number;
    };
  };
}

interface RadarSeries {
  id: string;
  label: string;
  color: string;
  fillColor: string;
  values: number[];
  isOwn?: boolean;
  platform?: string;
  visible: boolean;
}

interface RadarDimension {
  label: string;
  ownScore: number;
  compScores: number[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DIMENSION_LABELS = [
  "内容频率",
  "互动率",
  "粉丝增长",
  "内容质量",
  "发布时间",
  "话题多样性",
];

// Colors for up to 5 competitors + self (6 total)
const SERIES_COLORS = [
  { color: "#8b5cf6", fill: "rgba(139,92,246,0.18)", label: "我" },
  { color: "#10b981", fill: "rgba(16,185,129,0.12)", label: "竞品 A" },
  { color: "#f59e0b", fill: "rgba(245,158,11,0.12)", label: "竞品 B" },
  { color: "#f43f5e", fill: "rgba(244,63,94,0.12)", label: "竞品 C" },
  { color: "#06b6d4", fill: "rgba(6,182,212,0.12)", label: "竞品 D" },
  { color: "#a855f7", fill: "rgba(168,85,247,0.12)", label: "竞品 E" },
];

const PLATFORM_ACCENT: Record<string, string> = {
  wechat: "#10b981",
  xiaohongshu: "#f43f5e",
};

// ─── Animation ──────────────────────────────────────────────────────────────

const fadeIn = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// ─── SVG Radar Chart Core ───────────────────────────────────────────────────

function EnhancedRadarSVG({
  dimensions,
  series,
  onHover,
}: {
  dimensions: string[];
  series: RadarSeries[];
  onHover: (info: { dimIdx: number; seriesIdx: number; value: number } | null) => void;
}) {
  const sides = dimensions.length;
  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 115;
  const minR = 30;

  const angles = dimensions.map((_, i) => (2 * Math.PI * i) / sides - Math.PI / 2);
  const toXY = (angle: number, r: number) => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  });

  const ringPoints = (scale: number) =>
    angles
      .map((a) => {
        const p = toXY(a, minR + scale * (maxR - minR));
        return `${p.x},${p.y}`;
      })
      .join(" ");

  const seriesPoints = (values: number[]) =>
    angles
      .map((a, i) => {
        const r = minR + ((values[i] / 100) * (maxR - minR));
        const p = toXY(a, r);
        return `${p.x},${p.y}`;
      })
      .join(" ");

  const visibleSeries = series.filter((s) => s.visible);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="overflow-visible"
    >
      <defs>
        {visibleSeries.map((s) => {
          const gradId = `radar-fill-${s.id}`;
          return (
            <radialGradient key={gradId} id={gradId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0.08} />
            </radialGradient>
          );
        })}
      </defs>

      {/* Grid rings */}
      {[0.2, 0.4, 0.6, 0.8, 1.0].map((scale) => (
        <polygon
          key={scale}
          points={ringPoints(scale)}
          fill="none"
          className="stroke-muted/30"
          strokeWidth={0.6}
        />
      ))}

      {/* Axis lines */}
      {angles.map((a, i) => {
        const p = toXY(a, maxR);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            className="stroke-muted/20"
            strokeWidth={0.5}
          />
        );
      })}

      {/* Scale labels */}
      {[20, 40, 60, 80].map((val) => {
        const r = minR + ((val / 100) * (maxR - minR));
        const p = toXY(angles[0], r);
        return (
          <text
            key={val}
            x={p.x + 4}
            y={p.y + 3}
            className="fill-muted-foreground/40"
            fontSize={7}
          >
            {val}
          </text>
        );
      })}

      {/* Data polygons (render non-own first, own last for z-order) */}
      {visibleSeries
        .slice()
        .sort((a, b) => (a.isOwn ? 1 : 0) - (b.isOwn ? 1 : 0))
        .map((s, idx) => (
          <g key={s.id}>
            {/* Fill */}
            <motion.polygon
              points={seriesPoints(s.values)}
              fill={`url(#radar-fill-${s.id})`}
              stroke="none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 * idx }}
            />
            {/* Stroke */}
            <motion.polygon
              points={seriesPoints(s.values)}
              fill="none"
              stroke={s.color}
              strokeWidth={s.isOwn ? 2.5 : 1.5}
              strokeLinejoin="round"
              strokeDasharray={s.isOwn ? "none" : "5 3"}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.15 * idx, ease: "easeOut" }}
              style={{ transformOrigin: `${cx}px ${cy}px` }}
            />
            {/* Data points */}
            {s.values.map((val, dimIdx) => {
              const r = minR + ((val / 100) * (maxR - minR));
              const p = toXY(angles[dimIdx], r);
              return (
                <motion.circle
                  key={`${s.id}-${dimIdx}`}
                  cx={p.x}
                  cy={p.y}
                  r={s.isOwn ? 4 : 3}
                  fill={s.color}
                  stroke="hsl(var(--background))"
                  strokeWidth={1.5}
                  style={{ cursor: "pointer" }}
                  initial={{ r: 0 }}
                  animate={{ r: s.isOwn ? 4 : 3 }}
                  transition={{ duration: 0.3, delay: 0.4 + 0.05 * dimIdx + 0.1 * idx }}
                  onMouseEnter={() => onHover({ dimIdx, seriesIdx: series.indexOf(s), value: val })}
                  onMouseLeave={() => onHover(null)}
                />
              );
            })}
          </g>
        ))}

      {/* Dimension labels */}
      {dimensions.map((label, i) => {
        const labelR = maxR + 24;
        const p = toXY(angles[i], labelR);
        const isRight = p.x >= cx;
        const isBottom = p.y > cy + 5;
        return (
          <text
            key={i}
            x={p.x}
            y={p.y + (isBottom ? 3 : -2)}
            textAnchor={isRight ? "start" : "end"}
            className="fill-muted-foreground"
            fontSize={10}
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}

// ─── Interactive Legend ──────────────────────────────────────────────────────

function Legend({
  series,
  onToggle,
}: {
  series: RadarSeries[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {series.map((s) => {
        const platformColor = s.platform ? PLATFORM_ACCENT[s.platform] : undefined;
        return (
          <TooltipProvider key={s.id} delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  onClick={() => onToggle(s.id)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] transition-all ${
                    s.visible
                      ? "bg-muted/40 hover:bg-muted/60"
                      : "bg-muted/10 opacity-40 hover:opacity-60"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span
                    className="h-3 w-3 rounded-full border-2 flex-shrink-0"
                    style={{
                      backgroundColor: s.visible ? s.color : "transparent",
                      borderColor: platformColor || s.color,
                    }}
                  />
                  <span className="truncate max-w-[80px]">{s.label}</span>
                  {s.platform && (
                    <span
                      className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: platformColor }}
                    />
                  )}
                  {s.visible ? (
                    <Eye className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <EyeOff className="h-3 w-3 text-muted-foreground/50" />
                  )}
                </motion.button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">
                {s.isOwn ? "我的表现" : s.label} · {s.visible ? "点击隐藏" : "点击显示"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}

// ─── Dimension Details Panel ────────────────────────────────────────────────

function DimensionDetails({
  dimensions,
  series,
  visibleSeries,
}: {
  dimensions: RadarDimension[];
  series: RadarSeries[];
  visibleSeries: RadarSeries[];
}) {
  return (
    <div className="space-y-2.5">
      {dimensions.map((dim, dimIdx) => {
        const ownVal = dim.ownScore;
        const compVals = dim.compScores.filter((_, i) => visibleSeries[i + 1]?.visible);
        const bestComp = compVals.length > 0 ? Math.max(...compVals) : 0;
        const diff = ownVal - bestComp;

        return (
          <motion.div
            key={dim.label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + dimIdx * 0.05 }}
            className="space-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground font-medium">
                {dim.label}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold tabular-nums">{ownVal}</span>
                {Math.abs(diff) >= 10 && (
                  <span
                    className={`text-[9px] font-semibold flex items-center gap-0.5 ${
                      diff > 0 ? "text-emerald-500" : "text-rose-500"
                    }`}
                  >
                    {diff > 0 ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {Math.abs(diff)}
                  </span>
                )}
              </div>
            </div>

            {/* Multi-bar chart for this dimension */}
            <div className="space-y-0.5">
              {visibleSeries.map((s, sIdx) => {
                const val = s.isOwn ? ownVal : dim.compScores[sIdx - 1];
                if (val === undefined) return null;
                return (
                  <div key={s.id} className="flex items-center gap-1.5">
                    <span
                      className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: s.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${val}%` }}
                        transition={{ duration: 0.5, delay: 0.4 + dimIdx * 0.05 + sIdx * 0.03 }}
                      />
                    </div>
                    <span className="text-[8px] text-muted-foreground tabular-nums w-6 text-right">
                      {val}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        );
      })}

      {/* Summary stats */}
      <Separator />
      <div className="flex items-center gap-3 text-[10px]">
        {(() => {
          const myAvg = Math.round(dimensions.reduce((s, d) => s + d.ownScore, 0) / dimensions.length);
          const compAvgs = series
            .filter((s) => !s.isOwn && s.visible)
            .map((s) => {
              const sIdx = series.indexOf(s) - 1;
              return Math.round(dimensions.reduce((sum, d) => sum + (d.compScores[sIdx] || 0), 0) / dimensions.length);
            });
          const bestCompAvg = compAvgs.length > 0 ? Math.max(...compAvgs) : 0;

          return (
            <>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-violet-500" />
                <span className="text-muted-foreground">我的均分:</span>
                <span className="font-bold text-violet-500">{myAvg}</span>
              </div>
              {compAvgs.length > 0 && (
                <div className="flex items-center gap-1">
                  <Minus className="h-3 w-3 text-amber-500" />
                  <span className="text-muted-foreground">最强竞品:</span>
                  <span className="font-bold text-amber-500">{bestCompAvg}</span>
                </div>
              )}
              <div className="flex items-center gap-1 ml-auto">
                {myAvg >= bestCompAvg ? (
                  <Badge className="text-[8px] h-4 px-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-0">
                    整体领先
                  </Badge>
                ) : (
                  <Badge className="text-[8px] h-4 px-1.5 bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-0">
                    有提升空间
                  </Badge>
                )}
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function CompetitorRadar() {
  const { platform } = useAppStore();
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoverInfo, setHoverInfo] = useState<{
    dimIdx: number;
    seriesIdx: number;
    value: number;
  } | null>(null);
  const [seriesVisibility, setSeriesVisibility] = useState<Record<string, boolean>>({});

  // Fetch analysis data
  useEffect(() => {
    async function fetchAnalysis() {
      setLoading(true);
      try {
        const res = await fetch("/api/competitor-analysis?period=month");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchAnalysis();
  }, [platform]);

  // Build series data
  const allSeries = useMemo<RadarSeries[]>(() => {
    if (!data) return [];

    const maxCompetitors = 5;
    const competitors = data.competitors.slice(0, maxCompetitors);

    // Compute radar values for each competitor
    const compSeries: RadarSeries[] = competitors.map((comp, idx) => {
      const colorSet = SERIES_COLORS[idx + 1] || SERIES_COLORS[SERIES_COLORS.length - 1];
      const baseFactor = Math.max(0.1, Math.log10(comp.followers + 1) / 4);
      const seed = comp.id.charCodeAt(0);

      const freqScore = Math.min((comp.stats.postsPerWeek / 7) * 100, 100);
      const engScore = Math.min(comp.stats.avgEngagementRate * 10, 100);
      const growthScore = Math.min(baseFactor * 80 + ((seed * 11) % 20), 100);
      const qualityScore = Math.min(comp.stats.avgEngagementRate * 8 + 30, 100);
      const timingScore = comp.stats.peakHour >= 7 && comp.stats.peakHour <= 21
        ? 50 + Math.abs(comp.stats.peakHour - 12) * 3
        : 40;
      const diversityScore = Math.min((comp.stats.topContentTypes.length / 5) * 100, 100);

      return {
        id: comp.id,
        label: comp.nickname.length > 8 ? comp.nickname.slice(0, 8) + "…" : comp.nickname,
        color: colorSet.color,
        fillColor: colorSet.fill,
        values: [
          Math.round(freqScore),
          Math.round(engScore),
          Math.round(growthScore),
          Math.round(qualityScore),
          Math.round(timingScore),
          Math.round(diversityScore),
        ],
        platform: comp.platform,
        visible: seriesVisibility[comp.id] !== false,
      };
    });

    // Own series
    const ownFreq = Math.min((data.own.stats.postsPerWeek / 7) * 100, 100);
    const ownEng = Math.min(data.own.stats.avgEngagementRate * 10, 100);
    const ownGrowth = Math.min(data.own.stats.totalPosts > 5 ? 55 : 30, 100);
    const ownQuality = Math.min(data.own.stats.avgEngagementRate * 8 + 30, 100);
    const ownTiming = 65;
    const ownDiversity = Math.min(3 * 20, 60);

    const ownSeries: RadarSeries = {
      id: "own",
      label: "我",
      color: SERIES_COLORS[0].color,
      fillColor: SERIES_COLORS[0].fill,
      values: [
        Math.round(ownFreq),
        Math.round(ownEng),
        Math.round(ownGrowth),
        Math.round(ownQuality),
        Math.round(ownTiming),
        Math.round(ownDiversity),
      ],
      isOwn: true,
      platform,
      visible: seriesVisibility["own"] !== false,
    };

    return [ownSeries, ...compSeries];
  }, [data, platform, seriesVisibility]);

  // Build dimension details for comparison panel
  const dimensionDetails = useMemo<RadarDimension[]>(() => {
    if (allSeries.length < 2) return [];
    const own = allSeries.find((s) => s.isOwn);
    if (!own) return [];

    return DIMENSION_LABELS.map((label, dimIdx) => ({
      label,
      ownScore: own.values[dimIdx],
      compScores: allSeries.filter((s) => !s.isOwn).map((s) => s.values[dimIdx]),
    }));
  }, [allSeries]);

  const visibleSeries = allSeries.filter((s) => s.visible);

  const toggleVisibility = useCallback((id: string) => {
    setSeriesVisibility((prev) => ({
      ...prev,
      [id]: prev[id] === false ? true : false,
    }));
  }, []);

  // Loading skeleton
  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 px-4 pt-3">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-violet-500/10 flex items-center justify-center">
              <Crosshair className="h-3.5 w-3.5 text-violet-500" />
            </div>
            竞品雷达对比
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg mt-3" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.competitors.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 px-4 pt-3">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-violet-500/10 flex items-center justify-center">
              <Crosshair className="h-3.5 w-3.5 text-violet-500" />
            </div>
            竞品雷达对比
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex flex-col items-center py-8 text-center">
            <Crosshair className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">暂无竞品数据</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              添加竞品账号后即可查看多维度雷达对比图
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2 px-4 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Crosshair className="h-3.5 w-3.5 text-white" />
            </div>
            竞品雷达对比
            <Badge variant="secondary" className="text-[8px] h-4 px-1.5">
              {data.competitors.length} 个竞品
            </Badge>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        {/* Legend */}
        <Legend series={allSeries} onToggle={toggleVisibility} />

        {/* Platform legend hint */}
        <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            朋友圈
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            小红书
          </div>
          <span className="ml-auto">实线=我 虚线=竞品</span>
        </div>

        {/* Radar Chart */}
        <div className="rounded-lg border bg-gradient-to-br from-violet-50/40 via-background to-purple-50/20 dark:from-violet-950/10 dark:via-background dark:to-purple-950/10 p-4 flex justify-center">
          <div className="relative">
            <EnhancedRadarSVG
              dimensions={DIMENSION_LABELS}
              series={allSeries}
              onHover={setHoverInfo}
            />

            {/* Hover tooltip */}
            <AnimatePresence>
              {hoverInfo && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute top-2 right-2 bg-popover border rounded-lg px-2.5 py-1.5 shadow-lg z-10"
                >
                  <p className="text-[10px] text-muted-foreground">
                    {DIMENSION_LABELS[hoverInfo.dimIdx]}
                  </p>
                  <p className="text-xs font-bold">
                    {allSeries[hoverInfo.seriesIdx]?.label}: {hoverInfo.value}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Dimension Details */}
        {dimensionDetails.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="rounded-lg border p-3">
              <DimensionDetails
                dimensions={dimensionDetails}
                series={allSeries}
                visibleSeries={visibleSeries}
              />
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
