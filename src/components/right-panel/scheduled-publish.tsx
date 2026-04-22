"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAppStore } from "@/store/app-store";
import type { ContentPost } from "@/types";
import { toast } from "sonner";
import {
  Clock,
  CalendarClock,
  Bell,
  BellRing,
  Send,
  X,
  Play,
  CheckCircle2,
  AlertTriangle,
  Timer,
  CalendarDays,
  Zap,
  ChevronDown,
  Loader2,
  BarChart3,
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getNextMonday(hour: number, minute: number): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  nextMonday.setHours(hour, minute, 0, 0);
  return nextMonday;
}

function getTomorrow(hour: number, minute: number): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(hour, minute, 0, 0);
  return tomorrow;
}

function formatDateTime(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}-${day} ${hour}:${minute}`;
}

function getTimeDistance(targetDate: string | Date): string {
  const now = Date.now();
  const target = new Date(targetDate).getTime();
  const diff = target - now;

  if (diff <= 0) return "已过期";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainHours = hours % 24;
    return remainHours > 0 ? `${days}天${remainHours}小时` : `${days}天`;
  }
  if (hours > 0) return `${hours}小时${minutes}分钟`;
  return `${minutes}分钟`;
}

function getCountdownSeconds(targetDate: string | Date): number {
  const diff = new Date(targetDate).getTime() - Date.now();
  return Math.max(0, Math.floor(diff / 1000));
}

// ─── Quick Time Options ─────────────────────────────────────────────────────

const QUICK_TIME_OPTIONS = [
  { label: "明天 8:00", get: () => getTomorrow(8, 0) },
  { label: "明天 12:00", get: () => getTomorrow(12, 0) },
  { label: "明天 18:00", get: () => getTomorrow(18, 0) },
  { label: "明天 20:00", get: () => getTomorrow(20, 0) },
  { label: "下周一 8:00", get: () => getNextMonday(8, 0) },
];

// ─── Reminder Options ───────────────────────────────────────────────────────

const REMINDER_OPTIONS = [
  { value: "5", label: "5 分钟前" },
  { value: "15", label: "15 分钟前" },
  { value: "30", label: "30 分钟前" },
  { value: "60", label: "1 小时前" },
];

// ─── Status Config ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  planned: { label: "待生成", color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700" },
  generated: { label: "已生成", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-100/80 dark:bg-violet-900/30 border-violet-200 dark:border-violet-800/50" },
  optimized: { label: "已优化", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100/80 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/50" },
  published: { label: "已发布", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100/80 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800/50" },
};

// ─── Animation Variants ─────────────────────────────────────────────────────

const fadeIn = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const } },
};

const staggerChildren = {
  visible: { transition: { staggerChildren: 0.05 } },
};

const itemIn = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.2 } },
};

// ─── Countdown Hook ─────────────────────────────────────────────────────────

function useCountdown(targetDate: string | Date | null, enabled: boolean) {
  const [tick, setTick] = useState(0);

  // Tick every second to trigger re-render
  useEffect(() => {
    if (!enabled || !targetDate) return;
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate, enabled]);

  if (!enabled || !targetDate) {
    return { countdown: "", expired: false };
  }

  // Compute countdown on every render (driven by tick)
  void tick; // reference tick so computation happens on each interval
  const seconds = getCountdownSeconds(targetDate);
  const expired = seconds <= 0;
  const countdown = expired
    ? "已过期"
    : (() => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return h > 0 ? `${h}时${String(m).padStart(2, "0")}分${String(s).padStart(2, "0")}秒` : `${m}分${String(s).padStart(2, "0")}秒`;
      })();

  return { countdown, expired };
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface ScheduledPublishProps {
  post: ContentPost;
}

export function ScheduledPublish({ post }: ScheduledPublishProps) {
  const contentPosts = useAppStore((s) => s.contentPosts);
  const updateContentPost = useAppStore((s) => s.updateContentPost);
  const addNotification = useAppStore((s) => s.addNotification);
  const setSelectedPostId = useAppStore((s) => s.setSelectedPostId);

  const [dateValue, setDateValue] = useState("");
  const [timeValue, setTimeValue] = useState("");
  const [reminderMinutes, setReminderMinutes] = useState("15");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
  const [isScheduling, setIsScheduling] = useState(false);
  const [statsOpen, setStatsOpen] = useState(true);
  const [queueOpen, setQueueOpen] = useState(true);

  const remindedRef = useRef<Set<string>>(new Set());
  const reminderTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Check notification permission
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  // ── Scheduled queue items (non-published, with scheduledDate) ────────────
  const scheduledPosts = useMemo(() => {
    return contentPosts
      .filter((p) => {
        if (p.status === "published") return false;
        if (!p.scheduledDate) return false;
        return true;
      })
      .sort((a, b) => {
        const diff = new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
        // Past dates (expired) come first with priority
        const aExpired = new Date(a.scheduledDate).getTime() < Date.now();
        const bExpired = new Date(b.scheduledDate).getTime() < Date.now();
        if (aExpired && !bExpired) return -1;
        if (!aExpired && bExpired) return 1;
        return diff;
      });
  }, [contentPosts]);

  // ── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const now = Date.now();
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const publishedThisWeek = contentPosts.filter((p) => {
      if (p.status !== "published") return false;
      return new Date(p.updatedAt).getTime() >= weekStart.getTime();
    }).length;

    const pending = contentPosts.filter(
      (p) => p.status !== "published" && p.scheduledDate && new Date(p.scheduledDate).getTime() > now
    ).length;

    const expired = contentPosts.filter(
      (p) => p.status !== "published" && p.scheduledDate && new Date(p.scheduledDate).getTime() < now
    ).length;

    return { publishedThisWeek, pending, expired };
  }, [contentPosts]);

  // ── Reminder logic ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!reminderEnabled) return;

    for (const p of scheduledPosts) {
      if (!p.scheduledDate) continue;
      const targetTime = new Date(p.scheduledDate).getTime();
      const reminderTime = targetTime - parseInt(reminderMinutes) * 60 * 1000;
      const now = Date.now();

      if (reminderTime > now && !remindedRef.current.has(p.id)) {
        const delay = reminderTime - now;
        reminderTimerRef.current[p.id] = setTimeout(() => {
          remindedRef.current.add(p.id);
          const msg = `「${p.topic}」将在 ${reminderMinutes} 分钟后发布`;
          toast.info(msg, { duration: 6000 });

          if (notifPermission === "granted") {
            new Notification("发布提醒", { body: msg, icon: "/favicon.ico" });
          }

          addNotification({
            type: "reminder",
            title: "发布提醒",
            description: msg,
            postId: p.id,
          });
        }, delay);
      }
    }

    return () => {
      for (const key of Object.keys(reminderTimerRef.current)) {
        clearTimeout(reminderTimerRef.current[key]);
      }
    };
  }, [scheduledPosts, reminderEnabled, reminderMinutes, notifPermission, addNotification]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      toast.error("您的浏览器不支持通知功能");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotifPermission(permission);
    if (permission === "granted") {
      toast.success("已开启浏览器通知");
    } else {
      toast.error("通知权限被拒绝，请在浏览器设置中开启");
    }
  };

  const handleScheduleCurrentPost = async () => {
    if (!dateValue || !timeValue) {
      toast.error("请选择日期和时间");
      return;
    }

    const scheduledDate = new Date(`${dateValue}T${timeValue}:00`);
    if (isNaN(scheduledDate.getTime())) {
      toast.error("日期格式无效");
      return;
    }

    setIsScheduling(true);
    try {
      const res = await fetch(`/api/content/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledDate: scheduledDate.toISOString() }),
      });
      if (res.ok) {
        const updated = await res.json();
        updateContentPost(post.id, updated);
        toast.success(`已设置定时发布：${formatDateTime(scheduledDate)}`);
        setDateValue("");
        setTimeValue("");
      } else {
        toast.error("设置失败，请重试");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setIsScheduling(false);
    }
  };

  const handleQuickSchedule = async (quickDate: Date) => {
    setIsScheduling(true);
    try {
      const res = await fetch(`/api/content/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledDate: quickDate.toISOString() }),
      });
      if (res.ok) {
        const updated = await res.json();
        updateContentPost(post.id, updated);
        toast.success(`已设置定时发布：${formatDateTime(quickDate)}`);
      }
    } catch {
      toast.error("设置失败，请重试");
    } finally {
      setIsScheduling(false);
    }
  };

  const handleCancelSchedule = async (targetPost: ContentPost) => {
    try {
      const res = await fetch(`/api/content/${targetPost.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledDate: null }),
      });
      if (res.ok) {
        const updated = await res.json();
        updateContentPost(targetPost.id, updated);
        toast.success("已取消定时发布");
      }
    } catch {
      toast.error("操作失败");
    }
  };

  const handlePublishNow = async (targetPost: ContentPost) => {
    try {
      const res = await fetch(`/api/content/${targetPost.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      });
      if (res.ok) {
        const updated = await res.json();
        updateContentPost(targetPost.id, updated);
        addNotification({
          type: "publish",
          title: "内容已发布",
          description: `"${targetPost.topic}" 已标记为已发布`,
          postId: targetPost.id,
        });
        toast.success(`「${targetPost.topic}」已发布`);
      }
    } catch {
      toast.error("发布失败");
    }
  };

  const handlePublishAll = async () => {
    const unpublished = scheduledPosts.filter((p) => p.status !== "published");
    if (unpublished.length === 0) {
      toast.info("没有待发布的内容");
      return;
    }

    let successCount = 0;
    for (const p of unpublished) {
      try {
        const res = await fetch(`/api/content/${p.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "published" }),
        });
        if (res.ok) {
          const updated = await res.json();
          updateContentPost(p.id, updated);
          successCount++;
        }
      } catch {
        // Continue with next
      }
    }

    if (successCount > 0) {
      toast.success(`已发布 ${successCount} 篇内容`);
    }
  };

  // ── Relative time for current post ──────────────────────────────────────
  const relativeTime = useMemo(() => {
    if (!post.scheduledDate) return null;
    return getTimeDistance(post.scheduledDate);
  }, [post.scheduledDate]);

  // ── Min date for date input ──────────────────────────────────────────────
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  return (
    <motion.div
      variants={staggerChildren}
      initial="hidden"
      animate="visible"
      className="space-y-3"
    >
      {/* ── Publish Stats Summary ─────────────────────────────────────── */}
      <motion.div variants={fadeIn}>
        <Collapsible open={statsOpen} onOpenChange={setStatsOpen}>
          <div className="border border-border/50 rounded-xl overflow-hidden bg-card">
            <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/30 border-b border-border/50">
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 flex-1 text-left group cursor-pointer">
                  <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                    <BarChart3 className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="text-xs font-semibold">发布统计</span>
                  <motion.div animate={{ rotate: statsOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                  </motion.div>
                </button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="grid grid-cols-3 gap-2 p-3">
                {/* Published this week */}
                <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30">
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{stats.publishedThisWeek}</span>
                  <span className="text-[10px] text-muted-foreground">本周已发布</span>
                </div>
                {/* Pending */}
                <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-violet-50/80 dark:bg-violet-950/20 border border-violet-200/50 dark:border-violet-800/30">
                  <span className="text-lg font-bold text-violet-600 dark:text-violet-400 tabular-nums">{stats.pending}</span>
                  <span className="text-[10px] text-muted-foreground">待发布</span>
                </div>
                {/* Expired */}
                <div className={`flex flex-col items-center gap-1 p-2 rounded-lg border ${stats.expired > 0 ? "bg-amber-50/80 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/30" : "bg-muted/30 border-border/30"}`}>
                  <div className="flex items-center gap-1">
                    <span className={`text-lg font-bold tabular-nums ${stats.expired > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>{stats.expired}</span>
                    {stats.expired > 0 && (
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">已过期</span>
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </motion.div>

      {/* ── Schedule Time Picker ───────────────────────────────────────── */}
      <motion.div variants={fadeIn}>
        <div className="border border-border/50 rounded-xl overflow-hidden bg-card">
          <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/30 border-b border-border/50">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
              <CalendarClock className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-xs font-semibold">定时发布</span>
            {post.scheduledDate && (
              <Badge className="ml-auto text-[9px] px-1.5 py-0 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800/50" variant="outline">
                {formatDateTime(new Date(post.scheduledDate))}
              </Badge>
            )}
          </div>

          <div className="p-3 space-y-3">
            {/* Date + Time inputs */}
            <div className="flex items-center gap-2">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] text-muted-foreground font-medium">日期</label>
                <Input
                  type="date"
                  min={todayStr}
                  value={dateValue}
                  onChange={(e) => setDateValue(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-[10px] text-muted-foreground font-medium">时间</label>
                <Input
                  type="time"
                  value={timeValue}
                  onChange={(e) => setTimeValue(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Quick time buttons */}
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground font-medium">快捷选择</label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TIME_OPTIONS.map((opt) => {
                  const date = opt.get();
                  return (
                    <Tooltip key={opt.label}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleQuickSchedule(date)}
                          disabled={isScheduling}
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-muted/60 hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-700 dark:hover:text-violet-300 border border-border/50 hover:border-violet-300 dark:hover:border-violet-700/50 transition-colors disabled:opacity-50"
                        >
                          <Clock className="h-2.5 w-2.5" />
                          {opt.label}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-[10px]">设置为 {formatDateTime(date)}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>

            {/* Set schedule button (for manual date/time) */}
            {(dateValue || timeValue) && (
              <Button
                size="sm"
                onClick={handleScheduleCurrentPost}
                disabled={isScheduling || !dateValue || !timeValue}
                className="w-full h-8 text-xs bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white"
              >
                {isScheduling ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                ) : (
                  <CalendarClock className="h-3 w-3 mr-1.5" />
                )}
                设置定时发布
              </Button>
            )}

            {/* Relative time hint */}
            {relativeTime && post.scheduledDate && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-muted/40"
              >
                <Timer className="h-3 w-3 text-violet-500 flex-shrink-0" />
                <span className="text-[10px] text-muted-foreground">
                  距离发布还有{" "}
                  <span className="font-semibold text-foreground">{relativeTime}</span>
                </span>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Reminder Settings ─────────────────────────────────────────── */}
      <motion.div variants={fadeIn}>
        <div className="border border-border/50 rounded-xl overflow-hidden bg-card">
          <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/30 border-b border-border/50">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm">
              <Bell className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-xs font-semibold">发布提醒</span>
          </div>

          <div className="p-3 space-y-2.5">
            {/* Enable reminder switch */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <BellRing className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs">开启提醒</span>
              </div>
              <Switch checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
            </div>

            {reminderEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2.5"
              >
                {/* Reminder time select */}
                <Select value={reminderMinutes} onValueChange={setReminderMinutes}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REMINDER_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Notification permission */}
                {notifPermission !== "granted" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={requestNotificationPermission}
                    className="w-full h-8 text-xs border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                  >
                    <Bell className="h-3 w-3 mr-1.5" />
                    开启浏览器通知
                  </Button>
                )}

                {notifPermission === "granted" && (
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    浏览器通知已开启
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Publish Queue ──────────────────────────────────────────────── */}
      <motion.div variants={fadeIn}>
        <Collapsible open={queueOpen} onOpenChange={setQueueOpen}>
          <div className="border border-border/50 rounded-xl overflow-hidden bg-card">
            <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/30 border-b border-border/50">
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 flex-1 text-left group cursor-pointer">
                  <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-sm">
                    <CalendarDays className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="text-xs font-semibold">发布队列</span>
                  {scheduledPosts.length > 0 && (
                    <Badge className="text-[9px] px-1.5 py-0 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/50" variant="outline">
                      {scheduledPosts.length}
                    </Badge>
                  )}
                  <motion.div animate={{ rotate: queueOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                  </motion.div>
                </button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="max-h-80 overflow-y-auto">
                {scheduledPosts.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                    <CalendarDays className="h-8 w-8 opacity-30" />
                    <p className="text-xs">暂无定时发布内容</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/30">
                    <AnimatePresence>
                      {scheduledPosts.map((p, idx) => (
                        <QueueItem
                          key={p.id}
                          post={p}
                          index={idx}
                          onCancel={handleCancelSchedule}
                          onPublishNow={handlePublishNow}
                          onSelect={() => setSelectedPostId(p.id)}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                {scheduledPosts.length > 1 && (
                  <div className="p-2 border-t border-border/30">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePublishAll}
                      className="w-full h-8 text-xs border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                    >
                      <Zap className="h-3 w-3 mr-1.5" />
                      全部立即发布
                    </Button>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </motion.div>
    </motion.div>
  );
}

// ─── Queue Item Component ────────────────────────────────────────────────────

function QueueItem({
  post,
  index,
  onCancel,
  onPublishNow,
  onSelect,
}: {
  post: ContentPost;
  index: number;
  onCancel: (post: ContentPost) => void;
  onPublishNow: (post: ContentPost) => void;
  onSelect: () => void;
}) {
  const isExpired = post.scheduledDate && new Date(post.scheduledDate).getTime() < Date.now();
  const statusConfig = STATUS_CONFIG[post.status] || STATUS_CONFIG.planned;
  const { countdown } = useCountdown(post.scheduledDate, true);

  return (
    <motion.div
      variants={itemIn}
      initial="hidden"
      animate="visible"
      transition={{ delay: index * 0.04 }}
      className={`group px-3 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer ${isExpired ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-2">
        {/* Topic + status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs font-medium truncate">{post.topic}</span>
            <Badge className={`text-[9px] px-1.5 py-0 border flex-shrink-0 ${statusConfig.bg} ${statusConfig.color}`} variant="outline">
              {statusConfig.label}
            </Badge>
            {isExpired && (
              <Badge className="text-[9px] px-1.5 py-0 border border-amber-300 dark:border-amber-700 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 flex-shrink-0" variant="outline">
                <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                过期
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              {post.scheduledDate ? formatDateTime(new Date(post.scheduledDate)) : "未设置"}
            </span>
            {countdown && (
              <span className={`font-medium tabular-nums ${isExpired ? "text-amber-600 dark:text-amber-400" : "text-violet-600 dark:text-violet-400"}`}>
                {countdown}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPublishNow(post);
                }}
                className="p-1 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="text-[10px]">立即发布</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel(post);
                }}
                className="p-1 rounded-md hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="text-[10px]">取消定时</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </motion.div>
  );
}
