"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAppStore } from "@/store/app-store";
import type { ContentPost } from "@/types";
import { PLATFORM_LABELS, PLATFORM_COLORS } from "@/types";
import { toast } from "sonner";
import {
  Send,
  Clock,
  CalendarClock,
  CalendarDays,
  Trash2,
  Copy,
  Play,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Timer,
  GripVertical,
  RefreshCw,
  ArrowUpDown,
  Zap,
  BarChart3,
  X,
} from "lucide-react";

// ─── Animation Variants ────────────────────────────────────────────────

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const fadeIn = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const } },
};

// ─── Types ─────────────────────────────────────────────────────────────

interface QueueItem {
  id: string;
  post: ContentPost;
}

interface QueueStats {
  totalScheduled: number;
  todayScheduled: number;
  weekScheduled: number;
  overdue: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────

function formatCountdown(targetDate: string | Date | null): { text: string; isOverdue: boolean; isUrgent: boolean } {
  if (!targetDate) return { text: "未设置", isOverdue: false, isUrgent: false };

  const now = Date.now();
  const target = new Date(targetDate).getTime();
  const diff = target - now;

  if (diff <= 0) {
    const overdueMs = Math.abs(diff);
    const hours = Math.floor(overdueMs / (1000 * 60 * 60));
    const mins = Math.floor((overdueMs % (1000 * 60 * 60)) / (1000 * 60));
    return {
      text: hours > 0 ? `已过期 ${hours}小时${mins}分` : `已过期 ${mins}分钟`,
      isOverdue: true,
      isUrgent: true,
    };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const days = Math.floor(hours / 24);
  const remainHours = hours % 24;

  if (days > 0) {
    return { text: `${days}天${remainHours}小时`, isOverdue: false, isUrgent: false };
  }
  if (hours > 0) {
    return { text: `${hours}小时${minutes}分钟`, isOverdue: false, isUrgent: hours < 3 };
  }
  return { text: `${minutes}分钟`, isOverdue: false, isUrgent: true };
}

function formatScheduledTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "未设置";
  const d = new Date(dateStr);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hour = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const weekDays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const weekDay = weekDays[d.getDay()];
  return `${month}-${day} ${weekDay} ${hour}:${min}`;
}

function getMinDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Countdown Hook ────────────────────────────────────────────────────

function useLiveCountdown(targetDate: string | null | undefined) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!targetDate) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  // tick drives re-render for live countdown
  void tick;
  return formatCountdown(targetDate);
}

// ─── Mini Donut Chart ──────────────────────────────────────────────────

function MiniDonutChart({ wechat, xiaohongshu }: { wechat: number; xiaohongshu: number }) {
  const total = wechat + xiaohongshu;
  const wechatPercent = total > 0 ? (wechat / total) * 100 : 50;
  const xhsPercent = total > 0 ? (xiaohongshu / total) * 100 : 50;

  return (
    <div className="relative h-12 w-12">
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
        <circle
          cx="18"
          cy="18"
          r="14"
          fill="none"
          stroke="currentColor"
          className="text-emerald-500/20"
          strokeWidth="4"
        />
        <circle
          cx="18"
          cy="18"
          r="14"
          fill="none"
          stroke="currentColor"
          className="text-emerald-500"
          strokeWidth="4"
          strokeDasharray={`${wechatPercent * 0.88} ${88 - wechatPercent * 0.88}`}
          strokeLinecap="round"
        />
        <circle
          cx="18"
          cy="18"
          r="14"
          fill="none"
          stroke="currentColor"
          className="text-rose-500/20"
          strokeWidth="4"
          strokeDasharray={`${xhsPercent * 0.88} ${88 - xhsPercent * 0.88}`}
          strokeDashoffset={`-${wechatPercent * 0.88}`}
          strokeLinecap="round"
          opacity="0.8"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[9px] font-bold tabular-nums">{total}</span>
      </div>
    </div>
  );
}

// ─── Time Slot Chips ───────────────────────────────────────────────────

function TimeSlotChips({ onSelect, selectedTime, disabled }: {
  onSelect: (time: string) => void;
  selectedTime: string;
  disabled: boolean;
}) {
  const slots = [
    { label: "8:00", time: "08:00", emoji: "🌅" },
    { label: "10:00", time: "10:00", emoji: "☀️" },
    { label: "12:00", time: "12:00", emoji: "🕐" },
    { label: "14:00", time: "14:00", emoji: "🌤️" },
    { label: "17:00", time: "17:00", emoji: "🌇" },
    { label: "19:00", time: "19:00", emoji: "🌆" },
    { label: "20:00", time: "20:00", emoji: "🌙" },
    { label: "21:00", time: "21:00", emoji: "✨" },
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {slots.map((slot) => (
        <button
          key={slot.time}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(slot.time)}
          className={`time-slot-chip flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border transition-all duration-200 ${
            selectedTime === slot.time
              ? "bg-violet-100 dark:bg-violet-900/30 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 shadow-sm"
              : "bg-muted/40 border-border/20 hover:bg-muted/60 hover:border-border/20 text-muted-foreground"
          } disabled:opacity-50`}
        >
          <span>{slot.emoji}</span>
          {slot.label}
        </button>
      ))}
    </div>
  );
}

// ─── Schedule Dialog ───────────────────────────────────────────────────

function ScheduleDialog({ post, children }: { post: ContentPost; children: React.ReactNode }) {
  const updateContentPost = useAppStore((s) => s.updateContentPost);
  const [dateValue, setDateValue] = useState("");
  const [timeValue, setTimeValue] = useState("");
  const [repeatMode, setRepeatMode] = useState("none");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const addNotification = useAppStore((s) => s.addNotification);

  const minDate = getMinDateStr();

  const handleSchedule = async () => {
    if (!dateValue || !timeValue) {
      toast.error("请选择日期和时间");
      return;
    }

    const scheduledAt = new Date(`${dateValue}T${timeValue}:00`);
    if (isNaN(scheduledAt.getTime())) {
      toast.error("日期格式无效");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/publish-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, scheduledAt: scheduledAt.toISOString(), repeatMode }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.post) {
          updateContentPost(post.id, data.post);
        }
        if (data.createdRepeats?.length > 0) {
          toast.success(`已创建${data.createdRepeats.length}条重复排期`);
        }
        toast.success("已加入发布队列", {
          description: formatScheduledTime(scheduledAt.toISOString()),
        });
        addNotification({
          type: "schedule",
          title: "内容已排期",
          description: `「${post.topic}」已安排在 ${formatScheduledTime(scheduledAt.toISOString())} 发布`,
          postId: post.id,
        });
        setOpen(false);
        setDateValue("");
        setTimeValue("");
        setRepeatMode("none");
      } else {
        toast.error("排期失败，请重试");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTimeSlotSelect = (time: string) => {
    setTimeValue(time);
    if (!dateValue) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const d = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
      setDateValue(d);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <CalendarClock className="h-4 w-4 text-violet-500" />
            安排发布时间
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Post preview */}
          <div className="p-2.5 rounded-lg bg-muted/40 border border-border/20">
            <p className="text-xs font-medium truncate">{post.topic || "未命名内容"}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                className="text-[9px] px-1.5 py-0"
                variant="outline"
              >
                {post.platform === "xiaohongshu" ? "小红书" : "朋友圈"}
              </Badge>
              {post.aiScore > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  AI评分 {post.aiScore}
                </span>
              )}
            </div>
          </div>

          {/* Date and Time */}
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <label className="text-[11px] text-muted-foreground font-medium">日期</label>
              <Input
                type="date"
                min={minDate}
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-[11px] text-muted-foreground font-medium">时间</label>
              <Input
                type="time"
                value={timeValue}
                onChange={(e) => setTimeValue(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Quick time slots */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-muted-foreground font-medium">推荐时段</label>
            <TimeSlotChips
              onSelect={handleTimeSlotSelect}
              selectedTime={timeValue}
              disabled={isSubmitting}
            />
          </div>

          {/* Repeat */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-muted-foreground font-medium">重复</label>
            <Select value={repeatMode} onValueChange={setRepeatMode} disabled={isSubmitting}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-xs">不重复</SelectItem>
                <SelectItem value="daily" className="text-xs">每日重复（7天）</SelectItem>
                <SelectItem value="weekly" className="text-xs">每周重复（3周）</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          {dateValue && timeValue && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-2.5 rounded-lg bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800/40"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="h-3 w-3 text-violet-500" />
                <span className="text-[10px] font-medium text-violet-700 dark:text-violet-300">排期预览</span>
              </div>
              <p className="text-[11px] text-violet-600 dark:text-violet-400">
                将于 <span className="font-semibold">{formatScheduledTime(`${dateValue}T${timeValue}:00`)}</span> 发布
                {repeatMode !== "none" && (
                  <span className="text-muted-foreground ml-1">
                    （{repeatMode === "daily" ? "每日" : "每周"}重复）
                  </span>
                )}
              </p>
            </motion.div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={isSubmitting}>
            取消
          </Button>
          <Button
            size="sm"
            onClick={handleSchedule}
            disabled={!dateValue || !timeValue || isSubmitting}
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white gap-1.5"
          >
            {isSubmitting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <CalendarClock className="h-3 w-3" />
            )}
            确认排期
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Queue Item Component ──────────────────────────────────────────────

function QueueItemCard({
  post,
  index,
  onCancel,
  onPublishNow,
  onEditTime,
  onDuplicate,
  onSelect,
}: {
  post: ContentPost;
  index: number;
  onCancel: (post: ContentPost) => void;
  onPublishNow: (post: ContentPost) => void;
  onEditTime: (post: ContentPost) => void;
  onDuplicate: (post: ContentPost) => void;
  onSelect: (post: ContentPost) => void;
}) {
  const platform = post.platform || "wechat";
  const isXHS = platform === "xiaohongshu";
  const countdown = useLiveCountdown(post.scheduledAt);

  const platformLabel = isXHS ? PLATFORM_LABELS.xiaohongshu : PLATFORM_LABELS.wechat;
  const platformColor = isXHS ? PLATFORM_COLORS.xiaohongshu : PLATFORM_COLORS.wechat;

  return (
    <motion.div
      variants={staggerItem}
      initial="hidden"
      animate="visible"
      transition={{ delay: index * 0.04 }}
      className={`publish-queue-item group relative px-3 py-2.5 border-b border-border/30 hover:bg-muted/30 transition-colors cursor-pointer ${
        countdown.isOverdue ? "bg-amber-50/50 dark:bg-amber-950/10" : ""
      }`}
      onClick={() => onSelect(post)}
    >
      <div className="flex items-start gap-2">
        {/* Drag Handle */}
        <div className="drag-handle mt-0.5 cursor-grab active:cursor-grabbing p-0.5 rounded opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </div>

        {/* Platform timeline dot */}
        <div className="mt-1.5 flex-shrink-0">
          <div className={`h-2 w-2 rounded-full bg-gradient-to-r ${platformColor} ${
            countdown.isUrgent ? "animate-pulse-dot" : ""
          }`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs font-medium truncate max-w-[140px]">{post.topic || "未命名内容"}</span>
          </div>

          <div className="flex items-center gap-2 text-[10px]">
            {/* Platform badge */}
            <Badge
              className={`text-[9px] px-1.5 py-0 border-0 bg-gradient-to-r ${platformColor} text-white`}
            >
              {platformLabel}
            </Badge>

            {/* Scheduled time */}
            <span className="flex items-center gap-0.5 text-muted-foreground">
              <Clock className="h-2.5 w-2.5" />
              {formatScheduledTime(post.scheduledAt)}
            </span>
          </div>

          {/* Countdown */}
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`publish-countdown text-[10px] font-medium tabular-nums ${
              countdown.isOverdue
                ? "text-amber-600 dark:text-amber-400"
                : countdown.isUrgent
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-violet-600 dark:text-violet-400"
            }`}>
              <Timer className="h-2.5 w-2.5 inline mr-0.5" />
              {countdown.text}
            </span>
            {countdown.isOverdue && (
              <AlertTriangle className="h-3 w-3 text-amber-500" />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onPublishNow(post); }}
            className="p-1.5 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 transition-colors"
            title="立即发布"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEditTime(post); }}
            className="p-1.5 rounded-md hover:bg-violet-100 dark:hover:bg-violet-900/30 text-violet-600 dark:text-violet-400 transition-colors"
            title="修改时间"
          >
            <Clock className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDuplicate(post); }}
            className="p-1.5 rounded-md hover:bg-cyan-100 dark:hover:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 transition-colors"
            title="复制"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onCancel(post); }}
            className="p-1.5 rounded-md hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 transition-colors"
            title="取消排期"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export function PublishingQueue() {
  const contentPosts = useAppStore((s) => s.contentPosts);
  const platform = useAppStore((s) => s.platform);
  const updateContentPost = useAppStore((s) => s.updateContentPost);
  const setSelectedPostId = useAppStore((s) => s.setSelectedPostId);
  const addNotification = useAppStore((s) => s.addNotification);
  const setContentPosts = useAppStore((s) => s.setContentPosts);

  const [filter, setFilter] = useState<"all" | "upcoming" | "overdue">("all");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [composition, setComposition] = useState<{ wechat: number; xiaohongshu: number }>({ wechat: 0, xiaohongshu: 0 });
  const [localQueue, setLocalQueue] = useState<QueueItem[]>([]);
  const [editDialogPost, setEditDialogPost] = useState<ContentPost | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // ── Build queue from store ──────────────────────────────────────────
  const allScheduled = useMemo(() => {
    return contentPosts
      .filter((p) => p.status === "scheduled" && p.scheduledAt)
      .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime());
  }, [contentPosts]);

  // Sync to local queue for reorder
  useEffect(() => {
    setLocalQueue(allScheduled.map((p) => ({ id: p.id, post: p })));
  }, [allScheduled]);

  // ── Filtered queue ──────────────────────────────────────────────────
  const filteredQueue = useMemo(() => {
    const now = Date.now();
    let items = localQueue;
    if (filter === "upcoming") {
      items = items.filter((item) => new Date(item.post.scheduledAt!).getTime() > now);
    } else if (filter === "overdue") {
      items = items.filter((item) => new Date(item.post.scheduledAt!).getTime() <= now);
    }
    return items;
  }, [localQueue, filter]);

  // ── Platform-filtered posts ─────────────────────────────────────────
  const platformPosts = useMemo(() => {
    return contentPosts.filter(
      (p) => !platform || p.platform === platform || !p.platform,
    );
  }, [contentPosts, platform]);

  // Unscheduled posts (for quick scheduling)
  const unscheduledPosts = useMemo(() => {
    return platformPosts.filter(
      (p) => p.status !== "published" && p.status !== "scheduled" && p.content && p.content.trim().length > 5,
    );
  }, [platformPosts]);

  // ── Fetch queue stats ───────────────────────────────────────────────
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/publish-queue?limit=1");
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
          setComposition(data.composition);
        }
      } catch {
        // fallback
      }
    }
    fetchStats();
  }, [contentPosts]);

  // ── Handlers ────────────────────────────────────────────────────────
  const handlePublishNow = useCallback(async (post: ContentPost) => {
    try {
      const res = await fetch(`/api/content/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published", publishedAt: new Date().toISOString() }),
      });
      if (res.ok) {
        const updated = await res.json();
        updateContentPost(post.id, updated);
        addNotification({
          type: "publish",
          title: "内容已发布",
          description: `「${post.topic}」已发布`,
          postId: post.id,
        });
        toast.success(`「${post.topic}」已发布`);
      }
    } catch {
      toast.error("发布失败");
    }
  }, [updateContentPost, addNotification]);

  const handleCancel = useCallback(async (post: ContentPost) => {
    try {
      const res = await fetch("/api/publish-queue", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, action: "cancel" }),
      });
      if (res.ok) {
        const updated = await res.json();
        updateContentPost(post.id, updated);
        toast.success("已取消排期");
      }
    } catch {
      toast.error("操作失败");
    }
  }, [updateContentPost]);

  const handleEditTime = useCallback((post: ContentPost) => {
    setEditDialogPost(post);
    if (post.scheduledAt) {
      const d = new Date(post.scheduledAt);
      setEditDate(d.toISOString().split("T")[0]);
      setEditTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
    } else {
      setEditDate("");
      setEditTime("");
    }
  }, []);

  const handleEditSubmit = useCallback(async () => {
    if (!editDialogPost || !editDate || !editTime) return;
    setIsEditSubmitting(true);
    try {
      const scheduledAt = new Date(`${editDate}T${editTime}:00`);
      const res = await fetch("/api/publish-queue", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: editDialogPost.id, scheduledAt: scheduledAt.toISOString(), action: "reschedule" }),
      });
      if (res.ok) {
        const updated = await res.json();
        updateContentPost(editDialogPost.id, updated);
        toast.success("排期已更新");
        setEditDialogPost(null);
      }
    } catch {
      toast.error("更新失败");
    } finally {
      setIsEditSubmitting(false);
    }
  }, [editDialogPost, editDate, editTime, updateContentPost]);

  const handleDuplicate = useCallback(async (post: ContentPost) => {
    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: post.planId,
          scheduledDate: post.scheduledDate,
          platform: post.platform,
          contentType: post.contentType,
          topic: `${post.topic}（副本）`,
          content: post.content,
          status: "planned",
          generationType: post.generationType,
        }),
      });
      if (res.ok) {
        const newPost = await res.json();
        // Add to local state
        const currentPosts = useAppStore.getState().contentPosts;
        setContentPosts([...currentPosts, newPost]);
        toast.success("已复制内容");
      }
    } catch {
      toast.error("复制失败");
    }
  }, [setContentPosts]);

  const handleProcessDue = useCallback(async () => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/publish-queue/process", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.processed > 0) {
          toast.success(`已发布 ${data.processed} 篇到期内容`);
          // Refresh posts
          const postsRes = await fetch("/api/content");
          if (postsRes.ok) {
            const posts = await postsRes.json();
            setContentPosts(posts);
          }
        } else {
          toast.info("暂无到期内容");
        }
      }
    } catch {
      toast.error("处理失败");
    } finally {
      setIsProcessing(false);
    }
  }, [setContentPosts]);

  const handleAutoFill = useCallback(async () => {
    setIsAutoFilling(true);
    try {
      // Get unscheduled posts with content
      const candidates = unscheduledPosts.slice(0, 7);
      if (candidates.length === 0) {
        toast.info("没有可排期的内容");
        setIsAutoFilling(false);
        return;
      }

      // Generate optimal time slots (spread across next 7 days)
      const now = new Date();
      const items = candidates.map((post, i) => {
        const date = new Date(now);
        date.setDate(date.getDate() + i + 1);
        // Optimal hours based on platform data
        const optimalHours = [8, 10, 12, 14, 17, 19, 20];
        date.setHours(optimalHours[i % optimalHours.length], 0, 0, 0);
        return { postId: post.id, scheduledAt: date.toISOString() };
      });

      const res = await fetch("/api/publish-queue/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`已自动排期 ${data.success} 条内容`);
        // Refresh posts
        const postsRes = await fetch("/api/content");
        if (postsRes.ok) {
          const posts = await postsRes.json();
          setContentPosts(posts);
        }
      }
    } catch {
      toast.error("自动填充失败");
    } finally {
      setIsAutoFilling(false);
    }
  }, [unscheduledPosts, setContentPosts]);

  const handleOptimize = useCallback(async () => {
    setIsOptimizing(true);
    try {
      // Reorder posts based on AI score (highest first, then distribute times)
      const scheduled = allScheduled;
      if (scheduled.length < 2) {
        toast.info("排期内容太少，无需优化");
        setIsOptimizing(false);
        return;
      }

      // Sort by aiScore descending
      const sorted = [...scheduled].sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));
      const times = scheduled.map((p) => p.scheduledAt);
      const items = sorted.map((p, i) => ({
        postId: p.id,
        scheduledAt: times[i],
      })).filter((item) => item.scheduledAt);

      const res = await fetch("/api/publish-queue/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`已优化 ${data.success} 条排期（按AI评分排序）`);
        // Refresh
        const postsRes = await fetch("/api/content");
        if (postsRes.ok) {
          const posts = await postsRes.json();
          setContentPosts(posts);
        }
      }
    } catch {
      toast.error("优化失败");
    } finally {
      setIsOptimizing(false);
    }
  }, [allScheduled, setContentPosts]);

  const handleSelectPost = useCallback((post: ContentPost) => {
    setSelectedPostId(post.id);
  }, [setSelectedPostId]);

  const overdueCount = stats?.overdue || 0;

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-3"
    >
      {/* ── Stats Bar ─────────────────────────────────────────────── */}
      <motion.div variants={staggerItem}>
        <div className="queue-stats-bar border border-border/20 rounded-xl overflow-hidden bg-card">
          <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/30 border-b border-border/20">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
              <BarChart3 className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-xs font-semibold">队列统计</span>
          </div>
          <div className="p-3">
            <div className="flex items-center gap-3">
              {/* Mini Donut */}
              <MiniDonutChart wechat={composition.wechat} xiaohongshu={composition.xiaohongshu} />

              {/* Stats Grid */}
              <div className="flex-1 grid grid-cols-2 gap-2">
                <div className="flex flex-col items-center p-1.5 rounded-lg bg-violet-50/80 dark:bg-violet-950/20">
                  <span className="text-sm font-bold text-violet-600 dark:text-violet-400 tabular-nums">
                    {stats?.totalScheduled ?? allScheduled.length}
                  </span>
                  <span className="text-[9px] text-muted-foreground">总计排期</span>
                </div>
                <div className="flex flex-col items-center p-1.5 rounded-lg bg-cyan-50/80 dark:bg-cyan-950/20">
                  <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400 tabular-nums">
                    {stats?.todayScheduled ?? 0}
                  </span>
                  <span className="text-[9px] text-muted-foreground">今日排期</span>
                </div>
                <div className="flex flex-col items-center p-1.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/20">
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {stats?.weekScheduled ?? 0}
                  </span>
                  <span className="text-[9px] text-muted-foreground">本周排期</span>
                </div>
                <div className={`flex flex-col items-center p-1.5 rounded-lg ${
                  overdueCount > 0 ? "bg-amber-50/80 dark:bg-amber-950/20" : "bg-muted/30"
                }`}>
                  <span className={`text-sm font-bold tabular-nums ${
                    overdueCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                  }`}>
                    {overdueCount}
                  </span>
                  <span className="text-[9px] text-muted-foreground">已过期</span>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-3 mt-2">
              <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> 朋友圈
              </span>
              <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> 小红书
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Smart Scheduling Actions ───────────────────────────────── */}
      <motion.div variants={staggerItem}>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoFill}
            disabled={isAutoFilling || unscheduledPosts.length === 0}
            className="flex-1 h-8 text-[11px] gap-1.5 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20"
          >
            {isAutoFilling ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            自动填充空天
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOptimize}
            disabled={isOptimizing || allScheduled.length < 2}
            className="flex-1 h-8 text-[11px] gap-1.5 border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20"
          >
            {isOptimizing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ArrowUpDown className="h-3 w-3" />
            )}
            优化排期
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleProcessDue}
            disabled={isProcessing}
            className="flex-1 h-8 text-[11px] gap-1.5 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
          >
            {isProcessing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Zap className="h-3 w-3" />
            )}
            发布到期
            {overdueCount > 0 && (
              <Badge className="ml-1 text-[8px] px-1 py-0 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50 h-3.5" variant="outline">
                {overdueCount}
              </Badge>
            )}
          </Button>
        </div>
      </motion.div>

      {/* ── Filter Tabs ────────────────────────────────────────────── */}
      <motion.div variants={staggerItem}>
        <div className="flex items-center gap-1 p-0.5 bg-muted/40 rounded-lg">
          {[
            { value: "all" as const, label: "全部", count: allScheduled.length },
            { value: "upcoming" as const, label: "即将发布", count: allScheduled.filter((p) => new Date(p.scheduledAt!).getTime() > Date.now()).length },
            { value: "overdue" as const, label: "已过期", count: overdueCount },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium rounded-md transition-all duration-200 ${
                filter === tab.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground/70"
              }`}
            >
              {tab.label}
              <span className={`text-[9px] tabular-nums ${filter === tab.value ? "text-violet-500" : ""}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Queue List (Timeline) ─────────────────────────────────── */}
      <motion.div variants={staggerItem}>
        <div className="schedule-timeline border border-border/20 rounded-xl overflow-hidden bg-card max-h-[420px] overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {filteredQueue.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-2 py-10 text-muted-foreground"
              >
                <CalendarDays className="h-10 w-10 opacity-20" />
                <p className="text-xs">
                  {filter === "overdue" ? "没有过期的排期" : "暂无排期内容"}
                </p>
                <p className="text-[10px]">
                  选择内容添加到发布队列
                </p>
              </motion.div>
            ) : (
              <Reorder.Group
                axis="y"
                values={filteredQueue}
                onReorder={(newOrder) => setLocalQueue(newOrder)}
                className="divide-y divide-border/20"
              >
                {filteredQueue.map((item, idx) => (
                  <Reorder.Item key={item.id} value={item}>
                    <QueueItemCard
                      post={item.post}
                      index={idx}
                      onCancel={handleCancel}
                      onPublishNow={handlePublishNow}
                      onEditTime={handleEditTime}
                      onDuplicate={handleDuplicate}
                      onSelect={handleSelectPost}
                    />
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── Unscheduled Posts (Quick Schedule) ────────────────────── */}
      {unscheduledPosts.length > 0 && (
        <motion.div variants={staggerItem}>
          <div className="border border-border/20 rounded-xl overflow-hidden bg-card">
            <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/30 border-b border-border/20">
              <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-sm">
                <RefreshCw className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-xs font-semibold">待排期内容</span>
              <Badge className="text-[9px] px-1.5 py-0 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/50" variant="outline">
                {unscheduledPosts.length}
              </Badge>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {unscheduledPosts.slice(0, 5).map((post) => (
                <div key={post.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors">
                  <span className="text-[11px] truncate flex-1">{post.topic || "未命名"}</span>
                  <ScheduleDialog post={post}>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[10px] text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 gap-1 px-2"
                    >
                      <CalendarClock className="h-3 w-3" />
                      排期
                    </Button>
                  </ScheduleDialog>
                </div>
              ))}
              {unscheduledPosts.length > 5 && (
                <div className="px-3 py-2 border-t border-border/30 text-center">
                  <span className="text-[10px] text-muted-foreground">
                    还有 {unscheduledPosts.length - 5} 条待排期
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Edit Time Dialog ──────────────────────────────────────── */}
      <Dialog open={!!editDialogPost} onOpenChange={(open) => { if (!open) setEditDialogPost(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-violet-500" />
              修改排期时间
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {editDialogPost && (
              <p className="text-xs text-muted-foreground truncate">
                {editDialogPost.topic || "未命名内容"}
              </p>
            )}
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <label className="text-[11px] text-muted-foreground font-medium">日期</label>
                <Input
                  type="date"
                  min={getMinDateStr()}
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <label className="text-[11px] text-muted-foreground font-medium">时间</label>
                <Input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <TimeSlotChips
              onSelect={(t) => setEditTime(t)}
              selectedTime={editTime}
              disabled={isEditSubmitting}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditDialogPost(null)}>
              取消
            </Button>
            <Button
              size="sm"
              onClick={handleEditSubmit}
              disabled={!editDate || !editTime || isEditSubmitting}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white gap-1.5"
            >
              {isEditSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
              确认修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
