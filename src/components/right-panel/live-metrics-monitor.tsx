"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Activity,
  FileText,
  Heart,
  TrendingUp,
  Zap,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

// ─── Animated Counter (using requestAnimationFrame) ────────────────────────────

function useAnimatedCounter(
  target: number,
  duration = 800
): { display: number } {
  const motionVal = useRef(0);
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const startVal = motionVal.current;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (target - startVal) * eased);
      motionVal.current = current;
      setDisplay(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return { display };
}

// ─── SVG Sparkline ───────────────────────────────────────────────────────────

function MetricSparkline({
  data,
  color,
  width = 64,
  height = 24,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const padX = 2;
  const padY = 4;
  const cw = width - padX * 2;
  const ch = height - padY * 2;

  const points = data.map((v, i) => ({
    x: padX + (i / (data.length - 1)) * cw,
    y: padY + ch - (v / max) * ch,
  }));

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPoints = `${polyline} ${points[points.length - 1].x},${height - padY} ${points[0].x},${height - padY}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`spark-grad-${color.replace("#", "")}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon
        points={areaPoints}
        fill={`url(#spark-grad-${color.replace("#", "")})`}
      />
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={2.5}
        fill={color}
        stroke="white"
        strokeWidth={1}
      />
    </svg>
  );
}

// ─── Metric Card ─────────────────────────────────────────────────────────────

interface MetricConfig {
  key: string;
  label: string;
  suffix: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  sparkColor: string;
  target: number;
  alertBelow: number;
}

function MetricCard({
  config,
  value,
  sparkData,
}: {
  config: MetricConfig;
  value: number;
  sparkData: number[];
}) {
  const { display } = useAnimatedCounter(value, 1000);
  const isAlert = value < config.alertBelow && value > 0;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.3 }}
    >
      <div
        className={`relative rounded-xl border p-3 transition-all ${
          isAlert
            ? "border-rose-300/60 dark:border-rose-700/50 bg-rose-50/50 dark:bg-rose-950/10"
            : "border-border/20 bg-card"
        }`}
      >
        {/* Alert flash */}
        <AnimatePresence>
          {isAlert && (
            <motion.div
              className="absolute inset-0 rounded-xl bg-rose-500/5 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.6, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
            />
          )}
        </AnimatePresence>

        <div className="flex items-start justify-between mb-2">
          <div
            className={`h-8 w-8 rounded-lg ${config.bgColor} flex items-center justify-center`}
          >
            <Icon className={`h-4 w-4 ${config.color}`} />
          </div>
          {isAlert && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </motion.div>
          )}
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-xl font-bold tabular-nums leading-none">
              {display}
              <span className="text-[10px] font-normal text-muted-foreground ml-0.5">
                {config.suffix}
              </span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {config.label}
            </p>
          </div>
          {sparkData.length > 1 && (
            <MetricSparkline
              data={sparkData}
              color={config.sparkColor}
              width={64}
              height={28}
            />
          )}
        </div>

        {/* Mini progress bar toward target */}
        <div className="mt-2 h-1 bg-muted/40 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: config.sparkColor }}
            initial={{ width: 0 }}
            animate={{
              width: `${Math.min(100, (value / config.target) * 100)}%`,
            }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function LiveMetricsMonitor() {
  const contentPosts = useAppStore((s) => s.contentPosts);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [isLive, setIsLive] = useState(true);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Compute metrics from store ────────────────────────────────────────
  const metrics = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // Today's posts
    const todayPosts = contentPosts.filter(
      (p) =>
        p.status === "published" &&
        (p.publishedAt?.slice(0, 10) || p.createdAt.slice(0, 10)) === todayStr
    );
    const todayNewContent = contentPosts.filter(
      (p) => p.createdAt.slice(0, 10) === todayStr
    );

    // Today engagement
    const todayEngagement = todayPosts.reduce(
      (s, p) => s + p.likes + p.comments * 2 + p.shares * 3,
      0
    );

    // AI optimization count
    const aiOptCount = contentPosts.filter(
      (p) =>
        p.createdAt.slice(0, 10) === todayStr &&
        (p.generationType === "auto" || p.aiScore > 0)
    ).length;

    // Weekly publish rate
    const weekStart = new Date(now);
    const dow = weekStart.getDay();
    weekStart.setDate(now.getDate() - ((dow === 0 ? 6 : dow - 1)));
    weekStart.setHours(0, 0, 0, 0);
    const weekPosts = contentPosts.filter((p) => {
      const d = new Date(p.createdAt);
      return d >= weekStart && p.status === "published";
    });
    const weekDays = Math.max(1, Math.ceil((now.getTime() - weekStart.getTime()) / 86400000));
    const weekPublishRate = weekDays > 0 ? Math.round((weekPosts.length / weekDays) * 100) : 0;

    // 7-day sparklines
    const spark7: number[] = [];
    const engSpark7: number[] = [];
    const rateSpark7: number[] = [];
    const aiSpark7: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = subDays2(now, i);
      const ds = d.toISOString().slice(0, 10);
      const dp = contentPosts.filter(
        (p) =>
          p.status === "published" &&
          (p.publishedAt?.slice(0, 10) || p.createdAt.slice(0, 10)) === ds
      );
      spark7.push(dp.length);
      engSpark7.push(
        dp.reduce((s, p) => s + p.likes + p.comments * 2 + p.shares * 3, 0)
      );
      rateSpark7.push(dp.length > 0 ? 100 : 0);
      aiSpark7.push(
        contentPosts.filter(
          (p) =>
            p.createdAt.slice(0, 10) === ds &&
            (p.generationType === "auto" || p.aiScore > 0)
        ).length
      );
    }

    return {
      todayNewContent: todayNewContent.length,
      todayEngagement,
      weekPublishRate,
      aiOptCount,
      sparkTodayContent: spark7,
      sparkEngagement: engSpark7,
      sparkPublishRate: rateSpark7,
      sparkAiOpt: aiSpark7,
    };
  }, [contentPosts]);

  // ── Auto-refresh tick ─────────────────────────────────────────────────
  useEffect(() => {
    const update = () => {
      setLastUpdated(
        new Date().toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    update();
    tickRef.current = setInterval(update, 10000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const metricConfigs: MetricConfig[] = [
    {
      key: "content",
      label: "今日新增内容",
      suffix: "条",
      icon: FileText,
      color: "text-violet-600 dark:text-violet-400",
      bgColor: "bg-violet-100 dark:bg-violet-900/30",
      sparkColor: "#8b5cf6",
      target: 5,
      alertBelow: 1,
    },
    {
      key: "engagement",
      label: "今日互动总量",
      suffix: "",
      icon: Heart,
      color: "text-rose-600 dark:text-rose-400",
      bgColor: "bg-rose-100 dark:bg-rose-900/30",
      sparkColor: "#f43f5e",
      target: 200,
      alertBelow: 20,
    },
    {
      key: "publishRate",
      label: "本周发布率",
      suffix: "%",
      icon: TrendingUp,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
      sparkColor: "#10b981",
      target: 100,
      alertBelow: 30,
    },
    {
      key: "aiOps",
      label: "AI优化次数",
      suffix: "次",
      icon: Zap,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
      sparkColor: "#f59e0b",
      target: 10,
      alertBelow: 2,
    },
  ];

  return (
    <div className="space-y-3 p-4">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500/15 to-emerald-500/15 flex items-center justify-center">
            <Activity className="h-4.5 w-4.5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">实时指标监控</h2>
            <p className="text-[10px] text-muted-foreground">
              自动刷新 · 10秒间隔
            </p>
          </div>
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {lastUpdated}
            </span>
          )}
          <div className="flex items-center gap-1">
            <motion.div
              className="h-2 w-2 rounded-full bg-emerald-500"
              animate={
                isLive
                  ? {
                      scale: [1, 1.4, 1],
                      opacity: [1, 0.5, 1],
                    }
                  : {}
              }
              transition={
                isLive
                  ? {
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }
                  : {}
              }
            />
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              实时
            </span>
          </div>
        </div>
      </div>

      {/* ─── Metric Cards Grid ─── */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          config={metricConfigs[0]}
          value={metrics.todayNewContent}
          sparkData={metrics.sparkTodayContent}
        />
        <MetricCard
          config={metricConfigs[1]}
          value={metrics.todayEngagement}
          sparkData={metrics.sparkEngagement}
        />
        <MetricCard
          config={metricConfigs[2]}
          value={metrics.weekPublishRate}
          sparkData={metrics.sparkPublishRate}
        />
        <MetricCard
          config={metricConfigs[3]}
          value={metrics.aiOptCount}
          sparkData={metrics.sparkAiOpt}
        />
      </div>

      {/* ─── Alert Summary ─── */}
      <AlertSummary metrics={metrics} configs={metricConfigs} />

      {/* ─── Auto-refresh info ─── */}
      <div className="flex items-center justify-center gap-2 pt-1">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        >
          <RefreshCw className="h-3 w-3 text-muted-foreground/50" />
        </motion.div>
        <span className="text-[10px] text-muted-foreground">
          数据每10秒自动更新 · 基于本地内容数据
        </span>
      </div>
    </div>
  );
}

// ─── Alert Summary ───────────────────────────────────────────────────────────

function AlertSummary({
  metrics,
  configs,
}: {
  metrics: {
    todayNewContent: number;
    todayEngagement: number;
    weekPublishRate: number;
    aiOptCount: number;
  };
  configs: MetricConfig[];
}) {
  const alerts = configs.filter((c) => {
    const value =
      c.key === "content"
        ? metrics.todayNewContent
        : c.key === "engagement"
          ? metrics.todayEngagement
          : c.key === "publishRate"
            ? metrics.weekPublishRate
            : metrics.aiOptCount;
    return value < c.alertBelow && value > 0;
  });

  if (alerts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg bg-emerald-50 dark:bg-emerald-950/15 border border-emerald-200/60 dark:border-emerald-800/40 p-2.5"
      >
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
            所有指标正常
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg bg-rose-50 dark:bg-rose-950/15 border border-rose-200/60 dark:border-rose-800/40 p-2.5"
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
        <span className="text-[11px] text-rose-700 dark:text-rose-300 font-medium">
          {alerts.length} 项指标偏低
        </span>
      </div>
      <div className="space-y-1">
        {alerts.map((a) => (
          <div
            key={a.key}
            className="flex items-center justify-between text-[10px]"
          >
            <span className="text-rose-600 dark:text-rose-400">{a.label}</span>
            <span className="text-muted-foreground">
              目标 ≥ {a.alertBelow}
              {a.suffix}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Helper: subDays without date-fns ────────────────────────────────────────

function subDays2(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}
