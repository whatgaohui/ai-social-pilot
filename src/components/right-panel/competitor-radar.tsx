"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Star, TrendingUp, TrendingDown, Minus, Crosshair, ArrowUpRight, ArrowDownRight } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface RadarDimension {
  label: string;
  ownScore: number;     // 0-100
  compScore: number;    // 0-100
}

interface CompetitorRadarData {
  id: string;
  nickname: string;
  stats: {
    avgEngagementRate: number;
    postsPerWeek: number;
    topContentTypes: Array<{ type: string; count: number }>;
    peakHour: number;
  };
}

interface AnalysisResponse {
  competitors: CompetitorRadarData[];
  own: {
    stats: {
      totalPosts: number;
      avgEngagementRate: number;
      postsPerWeek: number;
    };
  };
}

// ─── Dimension Labels ───────────────────────────────────────────────────────

const DIMENSION_LABELS = [
  "发布频率",
  "互动率",
  "内容多样性",
  "标题质量",
  "视觉吸引力",
  "发布时间优化",
];

// ─── Star Rating ────────────────────────────────────────────────────────────

function StarRating({ score }: { score: number }) {
  const stars = 5;
  const filled = Math.round((score / 100) * stars);

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: stars }).map((_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${
            i < filled
              ? "fill-amber-400 text-amber-400"
              : "fill-muted/30 text-muted/30"
          }`}
        />
      ))}
    </div>
  );
}

// ─── SVG Radar Chart ────────────────────────────────────────────────────────

function RadarChartSVG({
  data,
  compColor,
}: {
  data: RadarDimension[];
  compColor: string;
}) {
  const sides = data.length;
  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 90;
  const minR = 25;

  const angles = data.map((_, i) => {
    const angle = (2 * Math.PI * i) / sides - Math.PI / 2;
    return angle;
  });

  const toXY = (angle: number, r: number) => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  });

  const polyPoints = (r: number) =>
    angles
      .map((a) => {
        const p = toXY(a, r);
        return `${p.x},${p.y}`;
      })
      .join(" ");

  const gridRings = [0.2, 0.4, 0.6, 0.8, 1.0];

  // Own polygon
  const ownPoints = data
    .map((d, i) => {
      const r = minR + ((d.ownScore / 100) * (maxR - minR));
      const p = toXY(angles[i], r);
      return `${p.x},${p.y}`;
    })
    .join(" ");

  // Competitor polygon
  const compPoints = data
    .map((d, i) => {
      const r = minR + ((d.compScore / 100) * (maxR - minR));
      const p = toXY(angles[i], r);
      return `${p.x},${p.y}`;
    })
    .join(" ");

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id="radar-own-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#a855f7" stopOpacity={0.12} />
          </linearGradient>
          <linearGradient id="radar-own-stroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
          <linearGradient id="radar-comp-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={compColor} stopOpacity={0.2} />
            <stop offset="100%" stopColor={compColor} stopOpacity={0.08} />
          </linearGradient>
        </defs>

        {/* Grid rings */}
        {gridRings.map((scale) => (
          <polygon
            key={scale}
            points={polyPoints(minR + scale * (maxR - minR))}
            fill="none"
            className="stroke-muted/30"
            strokeWidth={0.7}
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

        {/* Competitor polygon */}
        <motion.polygon
          points={compPoints}
          fill="url(#radar-comp-fill)"
          stroke={compColor}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeDasharray="4 2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        />

        {/* Own polygon */}
        <motion.polygon
          points={ownPoints}
          fill="url(#radar-own-fill)"
          stroke="url(#radar-own-stroke)"
          strokeWidth={2}
          strokeLinejoin="round"
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />

        {/* Own data points */}
        {data.map((d, i) => {
          const r = minR + ((d.ownScore / 100) * (maxR - minR));
          const p = toXY(angles[i], r);
          return (
            <motion.circle
              key={`own-${i}`}
              cx={p.x}
              cy={p.y}
              r={3.5}
              fill="#8b5cf6"
              stroke="hsl(var(--background))"
              strokeWidth={1.5}
              initial={{ r: 0 }}
              animate={{ r: 3.5 }}
              transition={{ delay: 0.7 + i * 0.06 }}
            />
          );
        })}

        {/* Competitor data points */}
        {data.map((d, i) => {
          const r = minR + ((d.compScore / 100) * (maxR - minR));
          const p = toXY(angles[i], r);
          return (
            <motion.circle
              key={`comp-${i}`}
              cx={p.x}
              cy={p.y}
              r={3}
              fill={compColor}
              stroke="hsl(var(--background))"
              strokeWidth={1.5}
              initial={{ r: 0 }}
              animate={{ r: 3 }}
              transition={{ delay: 0.6 + i * 0.06 }}
            />
          );
        })}

        {/* Labels */}
        {data.map((d, i) => {
          const labelR = maxR + 22;
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
              fontSize={9}
            >
              {d.label}
              <tspan className="fill-foreground font-medium" dx={3}>
                {d.ownScore}
              </tspan>
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: "#8b5cf6" }}
          />
          <span className="text-[10px] text-muted-foreground">我的策略</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: compColor }}
          />
          <span className="text-[10px] text-muted-foreground">
            竞品策略
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Comparison Analysis Panel ──────────────────────────────────────────────

function ComparisonAnalysis({
  data,
  compNickname,
}: {
  data: RadarDimension[];
  compNickname: string;
}) {
  const strengths = data.filter((d) => d.ownScore - d.compScore >= 10);
  const weaknesses = data.filter((d) => d.compScore - d.ownScore >= 10);
  const similar = data.filter(
    (d) => Math.abs(d.ownScore - d.compScore) < 10,
  );

  return (
    <div className="space-y-3">
      {/* Dimension details */}
      <div className="space-y-2">
        {data.map((d, i) => {
          const diff = d.ownScore - d.compScore;
          return (
            <motion.div
              key={d.label}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.06 }}
              className="space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  {d.label}
                </span>
                <div className="flex items-center gap-2">
                  <StarRating score={d.ownScore} />
                  {Math.abs(diff) >= 10 && (
                    <span
                      className={`text-[9px] font-medium ${
                        diff > 0
                          ? "text-emerald-500"
                          : "text-rose-500"
                      }`}
                    >
                      {diff > 0 ? "+" : ""}
                      {diff}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 h-2">
                <div className="flex-1 bg-muted/40 rounded-full overflow-hidden">
                  <div className="flex h-full">
                    <motion.div
                      className="bg-violet-400 rounded-l-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${d.ownScore}%` }}
                      transition={{ duration: 0.6, delay: 0.4 + i * 0.06 }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 h-1.5">
                <div className="flex-1 bg-muted/20 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-emerald-400/60 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${d.compScore}%` }}
                    transition={{ duration: 0.6, delay: 0.5 + i * 0.06 }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <Separator />

      {/* Strengths & Weaknesses */}
      <div className="space-y-2">
        {strengths.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="h-3 w-3" />
              我的优势
            </div>
            {strengths.map((d) => (
              <p key={d.label} className="text-[10px] text-muted-foreground pl-4">
                「{d.label}」领先 {d.ownScore - d.compScore} 分
              </p>
            ))}
          </div>
        )}

        {weaknesses.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[10px] font-medium text-rose-600 dark:text-rose-400">
              <ArrowDownRight className="h-3 w-3" />
              待提升项
            </div>
            {weaknesses.map((d) => (
              <p key={d.label} className="text-[10px] text-muted-foreground pl-4">
                「{d.label}」落后 {d.compScore - d.ownScore} 分
              </p>
            ))}
          </div>
        )}

        {similar.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
              <Minus className="h-3 w-3" />
              势均力敌
            </div>
            {similar.map((d) => (
              <p key={d.label} className="text-[10px] text-muted-foreground pl-4">
                「{d.label}」差距较小（±{Math.abs(d.ownScore - d.compScore)}分）
              </p>
            ))}
          </div>
        )}

        {strengths.length === 0 && weaknesses.length === 0 && similar.length === 0 && (
          <p className="text-[10px] text-muted-foreground text-center py-2">
            数据不足，无法生成对比分析
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

const COMP_COLORS = ["#10b981", "#f59e0b", "#f43f5e", "#06b6d4"];

export function CompetitorRadar() {
  const { platform } = useAppStore();
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCompIdx, setSelectedCompIdx] = useState(0);

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

  // Calculate radar dimensions
  const radarData = useMemo((): RadarDimension[] => {
    if (!data) return [];

    const ownStats = data.own.stats;
    const comp =
      data.competitors[selectedCompIdx];

    if (!comp) return [];

    // 1. 发布频率 (Post Frequency) — based on postsPerWeek
    const ownFreq = Math.min((ownStats.postsPerWeek / 7) * 100, 100);
    const compFreq = Math.min((comp.stats.postsPerWeek / 7) * 100, 100);

    // 2. 互动率 (Engagement Rate)
    const ownEng = Math.min(ownStats.avgEngagementRate * 10, 100);
    const compEng = Math.min(comp.stats.avgEngagementRate * 10, 100);

    // 3. 内容多样性 (Content Diversity) — based on top content types count
    const ownTypes = 3; // Placeholder since we don't have own type data directly
    const compTypes = comp.stats.topContentTypes?.length || 0;
    const ownDiv = Math.min((ownTypes / 5) * 100, 100);
    const compDiv = Math.min((compTypes / 5) * 100, 100);

    // 4. 标题质量 (Title Quality) — estimated from engagement
    const ownTitle = Math.min(ownStats.avgEngagementRate * 8 + 30, 100);
    const compTitle = Math.min(comp.stats.avgEngagementRate * 8 + 30, 100);

    // 5. 视觉吸引力 (Visual Appeal) — estimated
    const ownVisual = Math.min(ownStats.totalPosts > 0 ? 40 + Math.random() * 30 : 30, 100);
    const compVisual = Math.min(
      comp.stats.topContentTypes?.length > 0 ? 45 + Math.random() * 25 : 35,
      100,
    );

    // 6. 发布时间优化 (Timing Optimization) — based on peak hour (earlier = better for most)
    const ownTiming = 60; // Placeholder
    const compTiming = comp.stats.peakHour >= 6 && comp.stats.peakHour <= 22
      ? 50 + Math.random() * 30
      : 40;

    return [
      {
        label: DIMENSION_LABELS[0],
        ownScore: Math.round(ownFreq),
        compScore: Math.round(compFreq),
      },
      {
        label: DIMENSION_LABELS[1],
        ownScore: Math.round(ownEng),
        compScore: Math.round(compEng),
      },
      {
        label: DIMENSION_LABELS[2],
        ownScore: Math.round(ownDiv),
        compScore: Math.round(compDiv),
      },
      {
        label: DIMENSION_LABELS[3],
        ownScore: Math.round(ownTitle),
        compScore: Math.round(compTitle),
      },
      {
        label: DIMENSION_LABELS[4],
        ownScore: Math.round(ownVisual),
        compScore: Math.round(compVisual),
      },
      {
        label: DIMENSION_LABELS[5],
        ownScore: Math.round(ownTiming),
        compScore: Math.round(compTiming),
      },
    ];
  }, [data, selectedCompIdx]);

  const selectedComp = data?.competitors[selectedCompIdx];
  const compColor = COMP_COLORS[selectedCompIdx % COMP_COLORS.length];

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 px-4 pt-3">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-fuchsia-500/10 flex items-center justify-center">
              <Crosshair className="h-3.5 w-3.5 text-fuchsia-500" />
            </div>
            策略雷达对比
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <Skeleton className="h-56 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg mt-3" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.competitors.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 px-4 pt-3">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-fuchsia-500/10 flex items-center justify-center">
              <Crosshair className="h-3.5 w-3.5 text-fuchsia-500" />
            </div>
            策略雷达对比
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex flex-col items-center py-8 text-center">
            <Crosshair className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">暂无竞品数据</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              添加竞品账号后即可查看策略对比雷达图
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
            <div className="h-6 w-6 rounded bg-fuchsia-500/10 flex items-center justify-center">
              <Crosshair className="h-3.5 w-3.5 text-fuchsia-500" />
            </div>
            策略雷达对比
          </CardTitle>
          {data.competitors.length > 1 && (
            <Select
              value={String(selectedCompIdx)}
              onValueChange={(v) => setSelectedCompIdx(Number(v))}
            >
              <SelectTrigger className="h-6 w-[100px] text-[10px] border-0 p-0 shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {data.competitors.map((comp, idx) => (
                  <SelectItem key={comp.id} value={String(idx)} className="text-xs">
                    {comp.nickname.slice(0, 10)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        {/* Radar Chart */}
        <div className="rounded-lg border bg-gradient-to-br from-violet-50/40 via-background to-fuchsia-50/20 dark:from-violet-950/10 dark:via-background dark:to-fuchsia-950/10 p-4">
          <RadarChartSVG data={radarData} compColor={compColor} />
        </div>

        {/* Comparison Analysis */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-medium">
            <TrendingUp className="h-3.5 w-3.5 text-violet-500" />
            对比分析
            {selectedComp && (
              <Badge
                variant="secondary"
                className="text-[8px] px-1.5 h-4"
              >
                vs {selectedComp.nickname.slice(0, 8)}
              </Badge>
            )}
          </div>
          <div className="rounded-lg border p-3">
            <ComparisonAnalysis
              data={radarData}
              compNickname={selectedComp?.nickname || ""}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
