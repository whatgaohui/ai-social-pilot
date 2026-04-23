'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/app-store';
import {
  Sparkles, Wifi, WifiOff, Clock, Gauge, RefreshCw,
  Send, Flame, Cpu, Database, ChevronUp, ChevronDown,
  Keyboard, FileText, TrendingUp, BarChart3, Eye, Heart,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const MOTIVATIONAL_QUOTES = [
  '让每条朋友圈都有价值',
  'AI驱动，内容无限',
  '坚持日更，打造个人IP',
  '数据驱动运营决策',
];

type RefreshInterval = 30000 | 60000 | 300000 | 0;

const REFRESH_OPTIONS: { value: RefreshInterval; label: string }[] = [
  { value: 30000, label: '30s' },
  { value: 60000, label: '1分钟' },
  { value: 300000, label: '5分钟' },
  { value: 0, label: '关闭' },
];

// ─── Hook: useOnlineStatus ────────────────────────────────────────────────────

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// ─── Hook: useApiLatency ──────────────────────────────────────────────────────

function useApiLatency() {
  const [latency, setLatency] = useState<number | null>(null);
  const [lastSync, setLastSync] = useState<string>('刚刚');

  const measureLatency = useCallback(() => {
    const start = performance.now();
    // Use a simple HEAD request to measure latency (relative path through gateway)
    fetch('/api/health?XTransformPort=3000', { method: 'HEAD', cache: 'no-store' })
      .then(() => {
        const end = performance.now();
        setLatency(Math.round(end - start));
        setLastSync('刚刚');
      })
      .catch(() => {
        setLatency(null);
      });
  }, []);

  useEffect(() => {
    measureLatency();
    const timer = setInterval(measureLatency, 60000);
    return () => clearInterval(timer);
  }, [measureLatency]);

  // Update "lastSync" text every minute
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const seconds = Math.floor((Date.now() - startTime) / 1000);
      if (seconds < 60) {
        setLastSync('刚刚');
      } else if (seconds < 120) {
        setLastSync('1分钟前');
      } else {
        setLastSync(`${Math.floor(seconds / 60)}分钟前`);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return { latency, lastSync, refresh: measureLatency };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusDot({ online }: { online: boolean }) {
  return (
    <span
      className="relative flex h-2 w-2 shrink-0"
      role="status"
      aria-label={online ? '已连接' : '离线'}
    >
      {online && (
        <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40" />
      )}
      <span
        className={`relative inline-flex h-2 w-2 rounded-full transition-colors duration-300 ${
          online ? 'bg-emerald-500' : 'bg-gray-400 dark:bg-gray-600'
        }`}
      />
    </span>
  );
}

function MiniProgress({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-1 w-10 rounded-full bg-muted/60 overflow-hidden" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  );
}

function StatChip({
  icon: Icon,
  value,
  label,
  progress,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
  progress?: { value: number; max: number; color: string };
}) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`${label}: ${value}`}>
      <Icon className="h-3 w-3 text-muted-foreground/60 shrink-0" aria-hidden="true" />
      <span className="text-[10px] font-semibold text-foreground/80 tabular-nums">{value}</span>
      {progress && (
        <MiniProgress value={progress.value} max={progress.max} color={progress.color} />
      )}
      <span className="text-[9px] text-muted-foreground/60 hidden sm:inline">{label}</span>
    </div>
  );
}

function StatSeparator() {
  return (
    <div
      className="w-px h-3 bg-border/40 shrink-0"
      role="separator"
      aria-orientation="vertical"
    />
  );
}

function RefreshSelector({
  value,
  onChange,
}: {
  value: RefreshInterval;
  onChange: (v: RefreshInterval) => void;
}) {
  return (
    <div className="flex items-center gap-0.5" role="radiogroup" aria-label="自动刷新间隔">
      <RefreshCw className="h-2.5 w-2.5 text-muted-foreground/50 mr-0.5" aria-hidden="true" />
      {REFRESH_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          role="radio"
          aria-checked={value === opt.value}
          aria-label={`自动刷新: ${opt.label}`}
          className={`px-1.5 py-0.5 text-[8px] rounded transition-colors duration-150 focus-ring ${
            value === opt.value
              ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400 font-semibold'
              : 'text-muted-foreground/50 hover:text-muted-foreground/80 hover:bg-muted/50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Marquee Ticker Component ────────────────────────────────────────────────

interface TickerMetric {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
}

function MarqueeTicker({ metrics }: { metrics: TickerMetric[] }) {
  // Duplicate metrics for seamless loop
  const doubled = useMemo(() => [...metrics, ...metrics], [metrics]);

  return (
    <div className="hidden lg:block overflow-hidden relative w-full" aria-label="数据滚动条">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background/80 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background/80 to-transparent z-10 pointer-events-none" />

      <div className="marquee-ticker flex items-center gap-6 whitespace-nowrap w-max">
        {doubled.map((m, i) => {
          const Icon = m.icon;
          return (
            <div key={i} className="flex items-center gap-1.5 px-3 py-1">
              <Icon className="h-3 w-3 text-muted-foreground/50 shrink-0" />
              <span className="text-xs font-semibold text-foreground/70 tabular-nums">{m.value}</span>
              <span className="text-[10px] text-muted-foreground/50">{m.label}</span>
              <div className="w-px h-3 bg-border/30 ml-2" role="separator" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function EnhancedFooter() {
  const { platform, contentPosts, currentPlan, knowledgeItems } = useAppStore();
  const isOnline = useOnlineStatus();
  const { latency, lastSync } = useApiLatency();
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(0);
  const [expanded, setExpanded] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const footerRef = useRef<HTMLElement>(null);

  const isWechat = platform === 'wechat';
  const accentColor = isWechat ? 'violet' : 'rose';

  // Rotate motivational quotes every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % MOTIVATIONAL_QUOTES.length);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Auto-refresh timer
  useEffect(() => {
    if (refreshInterval <= 0) return;
    const timer = setInterval(() => {
      // Trigger a lightweight refresh indicator pulse
      if (footerRef.current) {
        footerRef.current.classList.add('footer-refresh-pulse');
        setTimeout(() => footerRef.current?.classList.remove('footer-refresh-pulse'), 600);
      }
    }, refreshInterval);
    return () => clearInterval(timer);
  }, [refreshInterval]);

  // Compute quick stats from store
  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayPublished = contentPosts.filter(
      (p) => p.scheduledDate?.slice(0, 10) === today && p.status === 'published'
    ).length;
    const todayTotal = currentPlan?.posts?.filter(
      (p) => p.scheduledDate?.slice(0, 10) === today
    ).length ?? 0;

    // This week active days
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const activeDays = new Set(
      contentPosts
        .filter((p) => {
          const d = p.scheduledDate ? new Date(p.scheduledDate) : null;
          return d && d >= weekStart && (p.status === 'published' || p.status === 'scheduled');
        })
        .map((p) => p.scheduledDate?.slice(0, 10))
    ).size;

    const aiGenerated = contentPosts.filter(
      (p) => p.content?.includes('AI') || p.generationType === 'auto'
    ).length;

    return { todayPublished, todayTotal, activeDays, aiGenerated, libraryCount: knowledgeItems.length };
  }, [contentPosts, currentPlan, knowledgeItems]);

  // Compute marquee metrics
  const tickerMetrics = useMemo<TickerMetric[]>(() => {
    const totalPosts = contentPosts.length;
    const published = contentPosts.filter(p => p.status === 'published').length;
    const totalLikes = contentPosts.reduce((sum, p) => sum + (p.likes || 0), 0);
    const totalViews = contentPosts.reduce((sum, p) => sum + (p.views || 0), 0);
    const avgScore = totalPosts > 0
      ? (contentPosts.reduce((sum, p) => sum + (p.aiScore || 0), 0) / totalPosts).toFixed(1)
      : '0.0';
    const engagementRate = totalViews > 0
      ? ((totalLikes / totalViews) * 100).toFixed(1) + '%'
      : '0%';

    return [
      { icon: FileText, value: `${totalPosts}`, label: '总内容' },
      { icon: Send, value: `${published}`, label: '已发布' },
      { icon: BarChart3, value: `${avgScore}`, label: '平均评分' },
      { icon: Heart, value: engagementRate, label: '互动率' },
      { icon: Eye, value: `${totalViews.toLocaleString()}`, label: '总浏览' },
      { icon: TrendingUp, value: `${totalLikes.toLocaleString()}`, label: '总点赞' },
      { icon: Cpu, value: `${stats.aiGenerated}篇`, label: 'AI生成' },
      { icon: Database, value: `${stats.libraryCount}篇`, label: '知识库' },
    ];
  }, [contentPosts, stats]);

  return (
    <footer
      ref={footerRef}
      className="hidden sm:block mt-auto"
      role="contentinfo"
      aria-label="状态栏"
    >
      <div
        className={`
          relative overflow-hidden rounded-t-xl
          backdrop-blur-xl
          bg-background/80 dark:bg-background/60
          border-t border-transparent
          transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
        `}
        style={{
          borderTopColor: isWechat
            ? 'rgba(139, 92, 246, 0.15)'
            : 'rgba(244, 63, 94, 0.15)',
          boxShadow: isWechat
            ? 'inset 0 1px 0 0 rgba(139, 92, 246, 0.08)'
            : 'inset 0 1px 0 0 rgba(244, 63, 94, 0.08)',
        }}
      >
        {/* Gradient top border overlay */}
        <div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{
            background: isWechat
              ? 'linear-gradient(90deg, transparent 5%, rgba(139, 92, 246, 0.3) 30%, rgba(168, 85, 247, 0.2) 50%, rgba(139, 92, 246, 0.3) 70%, transparent 95%)'
              : 'linear-gradient(90deg, transparent 5%, rgba(244, 63, 94, 0.3) 30%, rgba(251, 113, 133, 0.2) 50%, rgba(244, 63, 94, 0.3) 70%, transparent 95%)',
          }}
          aria-hidden="true"
        />

        {/* Row 0: Marquee ticker (desktop only) */}
        <div className="px-4 pt-1.5">
          <MarqueeTicker metrics={tickerMetrics} />
        </div>

        {/* Row 1: Status Bar */}
        <div className="flex items-center justify-between px-4 py-1.5">
          <div className="flex items-center gap-3">
            {/* Connection Status */}
            <div className="flex items-center gap-1.5" role="status" aria-live="polite">
              <StatusDot online={isOnline} />
              <span className="text-[9px] font-medium text-muted-foreground/70">
                {isOnline ? '已连接' : '离线'}
              </span>
            </div>

            {/* Last Sync */}
            <div className="flex items-center gap-1" aria-label={`最后同步: ${lastSync}`}>
              <Clock className="h-2.5 w-2.5 text-muted-foreground/50" aria-hidden="true" />
              <span className="text-[9px] text-muted-foreground/60">{lastSync}</span>
            </div>

            {/* API Latency */}
            {latency !== null && (
              <div className="flex items-center gap-1" aria-label={`API响应时间: ${latency}ms`}>
                <Gauge className="h-2.5 w-2.5 text-muted-foreground/50" aria-hidden="true" />
                <span className={`text-[9px] tabular-nums ${
                  latency < 200
                    ? 'text-emerald-600/70 dark:text-emerald-400/70'
                    : latency < 500
                      ? 'text-amber-600/70 dark:text-amber-400/70'
                      : 'text-red-600/70 dark:text-red-400/70'
                }`}>
                  {latency}ms
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Auto-refresh selector */}
            <RefreshSelector value={refreshInterval} onChange={setRefreshInterval} />

            {/* Expand/collapse toggle */}
            <button
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              aria-controls="footer-expanded-content"
              aria-label={expanded ? '收起状态栏' : '展开状态栏'}
              className="flex items-center justify-center h-5 w-5 rounded-md hover:bg-muted/50 transition-colors focus-ring"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={expanded ? 'up' : 'down'}
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -2 }}
                  transition={{ duration: 0.15 }}
                >
                  {expanded ? (
                    <ChevronUp className="h-3 w-3 text-muted-foreground/60" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-muted-foreground/60" />
                  )}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </div>

        {/* Row 2: Quick Stats (expanded) */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              id="footer-expanded-content"
              role="region"
              aria-label="快捷统计"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="flex items-center justify-center gap-3 px-4 pb-1.5" aria-live="polite">
                <StatChip
                  icon={Send}
                  value={`${stats.todayPublished}/${stats.todayTotal || 3}`}
                  label="今日发布"
                  progress={{
                    value: stats.todayPublished,
                    max: stats.todayTotal || 3,
                    color: isWechat
                      ? 'linear-gradient(90deg, #8b5cf6, #a855f7)'
                      : 'linear-gradient(90deg, #f43f5e, #fb7185)',
                  }}
                />
                <StatSeparator />
                <StatChip
                  icon={Flame}
                  value={`${stats.activeDays}天`}
                  label="本周活跃"
                />
                <StatSeparator />
                <StatChip
                  icon={Cpu}
                  value={`${stats.aiGenerated}篇`}
                  label="AI已生成"
                />
                <StatSeparator />
                <StatChip
                  icon={Database}
                  value={`${stats.libraryCount}篇`}
                  label="内容库"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Row 3: Info Row */}
        <div className="flex items-center justify-between px-4 pb-2 pt-0.5">
          {/* Left: App name + version */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-semibold text-foreground/40">
              {isWechat ? '朋友圈AI运营助手' : '小红书AI运营助手'}
            </span>
            <span className="version-badge">v2.1</span>
          </div>

          {/* Center: Motivational rotating text */}
          <div className="absolute left-1/2 -translate-x-1/2" aria-live="polite" aria-atomic="true">
            <AnimatePresence mode="wait">
              <motion.span
                key={quoteIndex}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className={`text-[9px] font-medium ${
                  isWechat
                    ? 'text-violet-500/60 dark:text-violet-400/50'
                    : 'text-rose-500/60 dark:text-rose-400/50'
                }`}
              >
                {MOTIVATIONAL_QUOTES[quoteIndex]}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Right: AI badge + keyboard hint */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/15 ai-badge-pulse">
              <Sparkles className="h-2.5 w-2.5 text-violet-500" aria-hidden="true" />
              <span className="text-[8px] font-semibold text-violet-600 dark:text-violet-400">AI Powered</span>
            </span>
            <span className="hidden lg:flex items-center gap-1 text-[8px] text-muted-foreground/40" aria-hidden="true">
              <Keyboard className="h-2.5 w-2.5" />
              ⌘K 快速搜索
            </span>
          </div>
        </div>
      </div>

      {/* Safe area padding for notched devices */}
      <div className="pb-safe" aria-hidden="true" />
    </footer>
  );
}
