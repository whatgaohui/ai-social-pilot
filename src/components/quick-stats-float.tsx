"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import {
  Send,
  TrendingUp,
  TrendingDown,
  Star,
  Flame,
  ArrowRight,
  ChevronDown,
  X,
  BarChart3,
  FileStack,
  Clock,
  AlertTriangle,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface QuickStatsData {
  todayPending: number;
  weeklyCompletionRate: number;
  avgAIScore: number;
  currentStreak: number;
  bestStreak: number;
  weeklyData: { day: string; date: string; count: number; score: number; isToday: boolean }[];
  recentScores: number[];
  totalContent: number;
  unpublishedCount: number;
  lastWeekTotal: number;
  sevenDaySparkline: { day: string; date: string; count: number }[];
}

interface StatRowProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  sparkline?: number[];
  suffix?: string;
}

// ─── Animated Number Hook ────────────────────────────────────────────────────

function useAnimatedNumber(target: number, duration = 0.8) {
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

// ─── CSS Sparkline Bar ──────────────────────────────────────────────────────

function MicroSparkline({ values, color }: { values: number[]; color: string }) {
  if (!values || values.length === 0) return null;
  const max = Math.max(...values, 1);

  return (
    <div className="flex items-end gap-[2px] h-4">
      {values.map((v, i) => {
        const height = Math.max(2, (v / max) * 16);
        return (
          <motion.div
            key={i}
            className={`w-[3px] rounded-full ${color}`}
            initial={{ height: 0 }}
            animate={{ height }}
            transition={{ delay: i * 0.1 + 0.2, duration: 0.4, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}

// ─── Stat Row ───────────────────────────────────────────────────────────────

function StatRow({ icon, label, value, color, sparkline, suffix }: StatRowProps) {
  return (
    <div className="flex items-center gap-2.5 py-1.5 group transition-all duration-200">
      <div
        className={`flex items-center justify-center h-7 w-7 rounded-lg ${color} shrink-0 transition-transform duration-200 group-hover:scale-110`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground leading-none">{label}</p>
        <p className="text-sm font-bold tabular-nums leading-tight mt-0.5">
          {value}
          {suffix && (
            <span className="text-[10px] font-normal text-muted-foreground ml-0.5">
              {suffix}
            </span>
          )}
        </p>
      </div>
      {sparkline && sparkline.length > 0 && (
        <MicroSparkline values={sparkline} color="bg-violet-400/60 dark:bg-violet-300/50" />
      )}
    </div>
  );
}

// ─── Progress Ring (mini) ───────────────────────────────────────────────────

function MiniProgressRing({ value }: { value: number }) {
  const size = 28;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, value) / 100) * circumference;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted/30"
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="url(#mini-ring-grad)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
      />
      <defs>
        <linearGradient id="mini-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ─── Gradient Ring Indicator ─────────────────────────────────────────────────

function getAIScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-amber-500";
  return "text-rose-500";
}

function getAIScoreBg(score: number): string {
  if (score >= 80) return "from-emerald-500 to-teal-600";
  if (score >= 60) return "from-amber-500 to-orange-600";
  return "from-rose-500 to-red-600";
}

// ─── SVG Sparkline ───────────────────────────────────────────────────────

function SVGSparkline({ values, color = "#8b5cf6" }: { values: number[]; color?: string }) {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values, 1);
  const width = 80;
  const height = 24;
  const padding = 2;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * usableWidth;
    const y = padding + usableHeight - (v / max) * usableHeight;
    return { x, y };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  const areaD = `${pathD} L${points[points.length - 1].x.toFixed(1)},${height} L${padding},${height} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id={`spark-grad-${color.replace("#", "")}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#spark-grad-${color.replace("#", "")})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={2} fill={color} />
    </svg>
  );
}

// ─── Gradient Ring Indicator ─────────────────────────────────────────────────

function getGradientRingClass(pending: number): string {
  if (pending === 0) return "from-emerald-400 to-emerald-500";
  if (pending <= 3) return "from-amber-400 to-orange-500";
  return "from-rose-400 to-red-500";
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function QuickStatsFloat() {
  const { setRightPanelTab, onboardingCompleted } = useAppStore();
  const [expanded, setExpanded] = useState(false);
  const [stats, setStats] = useState<QuickStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const autoCollapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(false);

  // Animated counter for collapsed state
  const animatedPending = useAnimatedNumber(stats?.todayPending ?? 0, 0.6);

  // Remember expanded/collapsed state in localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("quick-stats-expanded");
      if (saved !== null) {
        setExpanded(saved === "true");
      }
    } catch {
      // ignore
    }
  }, []);

  // Save state to localStorage
  useEffect(() => {
    if (typeof window === "undefined" || !mountedRef.current) return;
    try {
      localStorage.setItem("quick-stats-expanded", String(expanded));
    } catch {
      // ignore
    }
  }, [expanded]);

  // Mark as mounted after first render
  useEffect(() => {
    mountedRef.current = true;
  }, []);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/quick-stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.warn('[quick-stats-float]', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + polling every 30s
  useEffect(() => {
    fetchStats();
    pollIntervalRef.current = setInterval(fetchStats, 30000);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [fetchStats]);

  // Auto-collapse after 10 seconds of no interaction
  const resetAutoCollapse = useCallback(() => {
    if (autoCollapseTimerRef.current) clearTimeout(autoCollapseTimerRef.current);
    if (expanded) {
      autoCollapseTimerRef.current = setTimeout(() => {
        setExpanded(false);
      }, 10000);
    }
  }, [expanded]);

  useEffect(() => {
    resetAutoCollapse();
    return () => {
      if (autoCollapseTimerRef.current) clearTimeout(autoCollapseTimerRef.current);
    };
  }, [expanded, resetAutoCollapse]);

  const handleViewDetails = useCallback(() => {
    setRightPanelTab("data");
    setExpanded(false);
  }, [setRightPanelTab]);

  // Don't render during onboarding
  if (!onboardingCompleted) return null;

  const gradientRing = getGradientRingClass(stats?.todayPending ?? 0);
  const hasPending = (stats?.todayPending ?? 0) > 0;
  const hasUrgent = (stats?.unpublishedCount ?? 0) > 10;

  // Trend arrow for AI score
  const scoreTrend =
    stats && stats.recentScores.length >= 2
      ? stats.recentScores[0] - stats.recentScores[1]
      : 0;

  return (
    <div
      className="fixed z-40 bottom-24 right-4 sm:bottom-20 sm:right-6 flex flex-col items-end gap-2"
      onMouseEnter={resetAutoCollapse}
      onTouchStart={resetAutoCollapse}
      onClick={resetAutoCollapse}
      role="complementary"
      aria-label="快速统计"
    >
      {/* ─── Expanded Card ─── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 30,
            }}
            className="w-[300px] hover:scale-[1.02] transition-transform duration-200 content-card-hover"
          >
            <div className="rounded-xl bg-gradient-to-br from-violet-500/20 via-transparent to-emerald-500/20 p-[1px]">
            <div
              className="rounded-2xl border border-white/20 dark:border-white/[0.08] bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl saturate-200 shadow-[0_8px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.5)] overflow-hidden glass-card"
            >
            {/* Card Header */}
            <div className="px-4 pt-3 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <BarChart3 className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-xs font-semibold text-foreground">
                  快速统计
                </span>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setExpanded(false)}
                className="flex items-center justify-center h-5 w-5 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                aria-label="收起"
              >
                <X className="h-3 w-3" />
              </motion.button>
            </div>

            {/* Stats Content */}
            <div className="px-4 pb-3">
              {loading ? (
                <div className="space-y-2 py-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2.5 animate-pulse"
                    >
                      <div className="h-7 w-7 rounded-lg bg-muted" />
                      <div className="flex-1 space-y-1">
                        <div className="h-2.5 w-16 rounded bg-muted" />
                        <div className="h-3.5 w-12 rounded bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : stats ? (
                <motion.div
                  className="space-y-0.5"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
                  }}
                  initial="hidden"
                  animate="visible"
                >
                  {/* Row 1: Total Content Count with trend */}
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 8, scale: 0.98 },
                      visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 400, damping: 25 } },
                    }}
                    whileHover={{ scale: 1.03, y: -2 }}
                    className="flex items-center gap-2.5 py-1.5 group cursor-default">
                    <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shrink-0 transition-transform duration-200 group-hover:scale-110">
                      <FileStack className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-muted-foreground leading-none">内容总数</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <motion.p
                          key={`total-${stats.totalContent}`}
                          initial={{ scale: 1.15, opacity: 0.7 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          className="text-sm font-bold tabular-nums leading-tight"
                        >
                          {stats.totalContent}
                        </motion.p>
                        <span className="text-[10px] font-normal text-muted-foreground ml-0.5">篇</span>
                        {(stats.lastWeekTotal ?? 0) > 0 && (
                          <motion.span
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`text-[10px] font-semibold inline-flex items-center gap-0.5 ${
                              (stats.totalContent ?? 0) >= (stats.lastWeekTotal ?? 0)
                                ? "text-emerald-500"
                                : "text-rose-500"
                            }`}
                          >
                            {(stats.totalContent ?? 0) >= (stats.lastWeekTotal ?? 0)
                              ? <TrendingUp className="h-3 w-3" />
                              : <TrendingDown className="h-3 w-3" />
                            }
                            vs上周
                          </motion.span>
                        )}
                      </div>
                    </div>
                    <SVGSparkline
                      values={(stats.sevenDaySparkline || []).map(d => d.count)}
                      color="#8b5cf6"
                    />
                  </motion.div>

                  {/* Row 2: Today Pending */}
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 8, scale: 0.98 },
                      visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 400, damping: 25 } },
                    }}
                    whileHover={{ scale: 1.03, y: -2 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                  <StatRow
                    icon={<Send className="h-3.5 w-3.5 text-white" />}
                    label="今日待发布"
                    value={stats.todayPending}
                    suffix="条"
                    color="bg-gradient-to-br from-sky-500 to-cyan-600"
                  />

                  </motion.div>

                  {/* Row 3: Unpublished with urgency */}
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 8, scale: 0.98 },
                      visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 400, damping: 25 } },
                    }}
                    whileHover={{ scale: 1.03, y: -2 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="flex items-center gap-2.5 py-1.5 group cursor-default">
                    <div className={`flex items-center justify-center h-7 w-7 rounded-lg shrink-0 transition-transform duration-200 group-hover:scale-110 bg-gradient-to-br ${stats.unpublishedCount > 10 ? 'from-rose-500 to-red-600' : stats.unpublishedCount > 5 ? 'from-amber-500 to-orange-600' : 'from-zinc-400 to-zinc-500'}`}>
                      <Clock className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-muted-foreground leading-none">未发布</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <motion.p
                          key={`unpublished-${stats.unpublishedCount ?? 0}`}
                          initial={{ scale: 1.15, opacity: 0.7 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          className="text-sm font-bold tabular-nums leading-tight"
                        >
                          {stats.unpublishedCount ?? 0}
                        </motion.p>
                        <span className="text-[10px] font-normal text-muted-foreground ml-0.5">篇</span>
                        {(stats.unpublishedCount ?? 0) > 10 && (
                          <motion.span
                            animate={{ scale: [1, 1.15, 1] }}
                            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                          >
                            <AlertTriangle className="h-3 w-3 text-rose-500" />
                          </motion.span>
                        )}
                      </div>
                    </div>
                  </motion.div>

                  {/* Row 4: Average AI Score with color coding */}
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 8, scale: 0.98 },
                      visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 400, damping: 25 } },
                    }}
                    whileHover={{ scale: 1.03, y: -2 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="flex items-center gap-2.5 py-1.5 group cursor-default">
                    <div className={`flex items-center justify-center h-7 w-7 rounded-lg shrink-0 transition-transform duration-200 group-hover:scale-110 bg-gradient-to-br ${getAIScoreBg(stats.avgAIScore)}`}>
                      <Star className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-muted-foreground leading-none">AI评分均值</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <motion.p
                          key={`score-${stats.avgAIScore}`}
                          initial={{ scale: 1.15, opacity: 0.7 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          className={`text-sm font-bold tabular-nums leading-tight ${getAIScoreColor(stats.avgAIScore)}`}
                        >
                          {stats.avgAIScore}
                        </motion.p>
                        {scoreTrend !== 0 && (
                          <motion.span
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`text-[10px] font-semibold inline-flex items-center gap-0.5 ${
                              scoreTrend > 0 ? "text-emerald-500" : "text-rose-500"
                            }`}
                          >
                            {scoreTrend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {Math.abs(scoreTrend)}
                          </motion.span>
                        )}
                      </div>
                    </div>
                    <MicroSparkline
                      values={stats.recentScores}
                      color={stats.avgAIScore >= 80 ? "bg-emerald-400/60 dark:bg-emerald-300/50" : stats.avgAIScore >= 60 ? "bg-amber-400/60 dark:bg-amber-300/50" : "bg-rose-400/60 dark:bg-rose-300/50"}
                    />
                  </motion.div>

                  {/* Row 5: Content Streak */}
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 8, scale: 0.98 },
                      visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 400, damping: 25 } },
                    }}
                    whileHover={{ scale: 1.03, y: -2 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="flex items-center gap-2.5 py-1.5 group cursor-default">
                    <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 shrink-0 transition-transform duration-200 group-hover:scale-110">
                      <Flame className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-muted-foreground leading-none">连续发布</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <motion.p
                          key={`streak-${stats.currentStreak}`}
                          initial={{ scale: 1.15, opacity: 0.7 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          className="text-sm font-bold tabular-nums leading-tight"
                        >
                          {stats.currentStreak}
                        </motion.p>
                        <span className="text-[10px] text-muted-foreground">天</span>
                        {stats.currentStreak >= 7 && (
                          <motion.span
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                          >
                            🔥
                          </motion.span>
                        )}
                      </div>
                    </div>
                    <MiniProgressRing value={stats.weeklyCompletionRate} />
                  </motion.div>

                  {/* 7-day sparkline mini chart */}
                  {stats.sevenDaySparkline && stats.sevenDaySparkline.length > 0 && (
                    <div className="mt-1.5 pt-2 divider-gradient">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] text-muted-foreground/60">近7天内容量</span>
                        <span className="text-[9px] text-muted-foreground/60 tabular-nums">
                          共{stats.sevenDaySparkline.reduce((s, d) => s + d.count, 0)}篇
                        </span>
                      </div>
                      <div className="flex items-end gap-1 h-6">
                        {stats.sevenDaySparkline.map((d, i) => {
                          const maxCount = Math.max(...stats.sevenDaySparkline.map(x => x.count), 1);
                          const barHeight = Math.max(2, (d.count / maxCount) * 24);
                          return (
                            <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5">
                              <motion.div
                                className={`w-full rounded-sm ${d.isToday ? 'bg-violet-500' : d.count > 0 ? 'bg-violet-400/40 dark:bg-violet-300/30' : 'bg-muted/30'}`}
                                initial={{ height: 0 }}
                                animate={{ height: barHeight }}
                                transition={{ delay: i * 0.05 + 0.3, duration: 0.3, ease: "easeOut" }}
                              />
                              <span className="text-[7px] text-muted-foreground/40 leading-none">
                                {d.day.slice(0, 1)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : null}

              {/* View Details Button */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleViewDetails}
                className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl
                  bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs font-medium
                  shadow-lg shadow-violet-200/50 dark:shadow-violet-900/30
                  hover:shadow-xl hover:shadow-violet-300/50 dark:hover:shadow-violet-800/40
                  transition-shadow duration-300"
              >
                查看详情
                <ArrowRight className="h-3 w-3" />
              </motion.button>
            </div>
            </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Collapsed FAB Button ─── */}
      <motion.button
        initial={{ opacity: 0, y: 40, scale: 0.5 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.5 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setExpanded(!expanded)}
        className="relative flex items-center justify-center h-12 w-12 rounded-full
          bg-gradient-to-br from-violet-500 to-purple-600
          shadow-lg shadow-violet-300/40 dark:shadow-violet-900/40
          hover:shadow-xl hover:shadow-violet-400/50 dark:hover:shadow-violet-800/50
          transition-shadow duration-300 cursor-pointer group"
        aria-label={expanded ? "收起快速统计" : "展开快速统计"}
      >
        {/* Gradient ring indicator */}
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-r ${hasUrgent && !expanded ? "from-rose-400 to-red-500" : gradientRing} opacity-20`}
        />
        <div
          className={`absolute -inset-[2px] rounded-full bg-gradient-to-r ${hasUrgent && !expanded ? "from-rose-400 to-red-500" : gradientRing} opacity-0 group-hover:opacity-30 transition-opacity duration-300`}
        />

        {/* Pulse animation when there are pending tasks or urgent items */}
        {(hasPending || hasUrgent) && !expanded && (
          <>
            <span className={`absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full text-[9px] font-bold text-white px-1 shadow-lg ${hasUrgent ? 'bg-rose-500 glow-pulse-rose' : 'bg-violet-500'}`}>
              {hasUrgent ? "!" : (stats?.todayPending ?? 0)}
            </span>
            <motion.span
              className={`absolute inset-0 rounded-full ${hasUrgent ? 'bg-rose-500' : 'bg-violet-500'}`}
              animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </>
        )}

        {/* Icon or counter */}
        <AnimatePresence mode="wait">
          {expanded ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="h-5 w-5 text-white" />
            </motion.div>
          ) : (
            <motion.div
              key="counter"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center"
            >
              <BarChart3 className="h-4 w-4 text-white mb-0.5" />
              {!loading && (
                <span className="text-[8px] font-bold text-white/90 tabular-nums leading-none">
                  {animatedPending}
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
