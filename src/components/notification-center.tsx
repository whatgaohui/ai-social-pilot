"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Bell,
  CheckCircle,
  XCircle,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  Wand2,
  Send,
  FileText,
  Trash2,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Megaphone,
  Info,
  Heart,
  Lightbulb,
} from "lucide-react";
import type { AppNotification, NotificationType } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

// ─── Notification type config ───────────────────────────────────────
const NOTIFICATION_CONFIG: Record<
  NotificationType,
  {
    icon: typeof Info;
    color: string;
    bgColor: string;
    label: string;
    dotColor: string;
  }
> = {
  system: {
    icon: Info,
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-100 dark:bg-violet-900/30",
    label: "系统",
    dotColor: "bg-violet-500",
  },
  publish: {
    icon: Clock,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    label: "发布",
    dotColor: "bg-amber-500",
  },
  interaction: {
    icon: Heart,
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-100 dark:bg-rose-900/30",
    label: "互动",
    dotColor: "bg-rose-500",
  },
  ai: {
    icon: Sparkles,
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-100 dark:bg-violet-900/30",
    label: "AI",
    dotColor: "bg-violet-500",
  },
  inspiration: {
    icon: Lightbulb,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    label: "灵感",
    dotColor: "bg-emerald-500",
  },
  optimize: {
    icon: Wand2,
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-100 dark:bg-violet-900/30",
    label: "优化",
    dotColor: "bg-violet-500",
  },
  polish: {
    icon: Sparkles,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    label: "润色",
    dotColor: "bg-amber-500",
  },
  generate: {
    icon: FileText,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    label: "生成",
    dotColor: "bg-emerald-500",
  },
  reminder: {
    icon: Clock,
    color: "text-sky-600 dark:text-sky-400",
    bgColor: "bg-sky-100 dark:bg-sky-900/30",
    label: "提醒",
    dotColor: "bg-sky-500",
  },
  error: {
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    label: "错误",
    dotColor: "bg-red-500",
  },
};

// ─── Demo notifications ─────────────────────────────────────────────
function generateDemoNotifications(): Omit<AppNotification, "id" | "timestamp" | "read">[] {
  return [
    {
      type: "system",
      title: "欢迎使用AI运营助手",
      description: "为您打造个性化内容策略，自动规划、生成、优化朋友圈内容。点击了解更多功能。",
    },
    {
      type: "publish",
      title: "你有3篇内容待发布",
      description: "本周计划中有3篇内容尚未发布，建议尽快安排发布时间。",
      actionLabel: "查看详情",
      actionType: "viewPost",
    },
    {
      type: "interaction",
      title: "「美食探店」获得12个新点赞",
      description: "你发布的内容「周末探店记录」在过去1小时内收到了12个新点赞和3条评论。",
      actionLabel: "查看详情",
      actionType: "viewPost",
    },
    {
      type: "ai",
      title: "AI质量评分完成：85分",
      description: "「职场心得分享」的AI质量评估已完成，得分85分（优秀）。点击查看优化建议。",
      actionLabel: "查看详情",
      actionType: "viewPost",
    },
    {
      type: "inspiration",
      title: "今日热门话题：AI工具效率提升",
      description: "当前热议话题「如何用AI工具提升工作效率」热度持续上升，建议创作相关内容获取流量。",
      actionLabel: "查看详情",
      actionType: "viewData",
    },
  ];
}

// ─── DB Notification → AppNotification mapper ─────────────────────────
interface DbNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  actionUrl: string;
  metadata: string;
  createdAt: string;
}

function mapDbToApp(dbNotif: DbNotification): AppNotification {
  let meta: Record<string, unknown> = {};
  try { meta = JSON.parse(dbNotif.metadata || '{}'); } catch { /* ignore */ }
  return {
    id: dbNotif.id,
    type: (dbNotif.type as NotificationType) || 'system',
    title: dbNotif.title,
    description: dbNotif.message || '',
    timestamp: new Date(dbNotif.createdAt).getTime(),
    read: dbNotif.read,
    actionLabel: (meta.actionLabel as string) || undefined,
    actionType: (meta.actionType as 'viewPost' | 'viewData' | 'dismiss') || undefined,
    postId: (meta.postId as string) || undefined,
  };
}

// ─── Helper: format relative time ───────────────────────────────────
function formatTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;

  try {
    return formatDistanceToNow(new Date(timestamp), {
      addSuffix: true,
      locale: zhCN,
    });
  } catch {
    return "刚刚";
  }
}

// ─── Single notification card ───────────────────────────────────────
function NotificationCard({
  notification,
  onRead,
  onAction,
}: {
  notification: AppNotification;
  onRead: (id: string) => void;
  onAction: (notification: AppNotification) => void;
}) {
  const config = NOTIFICATION_CONFIG[notification.type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
      className={`group flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors hover:bg-muted/50 ${
        !notification.read
          ? "bg-violet-50/50 dark:bg-violet-950/10"
          : ""
      }`}
      onClick={() => {
        if (!notification.read) onRead(notification.id);
      }}
    >
      <div
        className={`flex-shrink-0 h-8 w-8 rounded-lg ${config.bgColor} flex items-center justify-center mt-0.5`}
      >
        <Icon className={`h-4 w-4 ${config.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className={`text-xs truncate ${
              !notification.read ? "font-bold" : "font-medium"
            }`}
          >
            {notification.title}
          </span>
          {!notification.read && (
            <span
              className={`flex-shrink-0 h-2 w-2 rounded-full ${config.dotColor}`}
            />
          )}
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
          {notification.description}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[10px] text-muted-foreground/70">
            {formatTime(notification.timestamp)}
          </span>
          <Badge
            variant="secondary"
            className="h-4 px-1.5 text-[9px] font-normal"
          >
            {config.label}
          </Badge>
          {notification.actionLabel && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-2 text-[10px] text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/30"
              onClick={(e) => {
                e.stopPropagation();
                if (!notification.read) onRead(notification.id);
                onAction(notification);
              }}
            >
              {notification.actionLabel}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Smart Reminder card ────────────────────────────────────────────
function ReminderCard({
  icon: Icon,
  color,
  bgColor,
  label,
  count,
  onClick,
}: {
  icon: typeof Clock;
  color: string;
  bgColor: string;
  label: string;
  count: number;
  onClick: () => void;
}) {
  if (count === 0) return null;
  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors text-left"
    >
      <div
        className={`flex-shrink-0 h-8 w-8 rounded-lg ${bgColor} flex items-center justify-center`}
      >
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium">{label}</span>
      </div>
      <Badge
        variant="secondary"
        className="h-5 px-2 text-[10px] font-semibold tabular-nums"
      >
        {count}
      </Badge>
    </motion.button>
  );
}

// ─── Quick Stats ────────────────────────────────────────────────────
function QuickStats() {
  const contentPosts = useAppStore((s) => s.contentPosts);

  const stats = useMemo(() => {
    const total = contentPosts.length;
    const published = contentPosts.filter((p) => p.status === "published").length;
    const publishedRate = total > 0 ? Math.round((published / total) * 100) : 0;
    const scoredPosts = contentPosts.filter((p) => p.aiScore > 0);
    const avgScore =
      scoredPosts.length > 0
        ? Math.round(
            scoredPosts.reduce((sum, p) => sum + p.aiScore, 0) /
              scoredPosts.length
          )
        : 0;
    return { total, published, publishedRate, avgScore };
  }, [contentPosts]);

  const trendUp = stats.publishedRate >= 50;

  return (
    <div className="grid grid-cols-3 gap-2 hover-lift-sm">
      <div className="rounded-lg bg-muted/50 p-2.5 text-center">
        <div className="text-lg font-bold tabular-nums text-foreground">
          {stats.total}
        </div>
        <div className="text-[10px] text-muted-foreground">总内容</div>
      </div>
      <div className="rounded-lg bg-muted/50 p-2.5 text-center">
        <div className="flex items-center justify-center gap-1">
          <span className="text-lg font-bold tabular-nums text-foreground">
            {stats.publishedRate}%
          </span>
          {stats.total > 0 && (
            <span
              className={`text-[10px] ${trendUp ? "text-emerald-500" : "text-amber-500"}`}
            >
              {trendUp ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
            </span>
          )}
        </div>
        <div className="text-[10px] text-muted-foreground">发布率</div>
      </div>
      <div className="rounded-lg bg-muted/50 p-2.5 text-center">
        <div className="text-lg font-bold tabular-nums text-foreground">
          {stats.avgScore || "-"}
        </div>
        <div className="text-[10px] text-muted-foreground">平均分</div>
      </div>
    </div>
  );
}

// ─── Empty state ────────────────────────────────────────────────────
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center py-10 text-muted-foreground"
    >
      <div className="relative mb-3">
        <Bell className="h-10 w-10 opacity-20" />
        <motion.div
          className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-muted-foreground/20"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>
      <span className="text-sm font-medium">暂无新通知</span>
      <span className="text-[11px] mt-1 text-muted-foreground/70">
        新消息和操作提醒将在这里显示
      </span>
    </motion.div>
  );
}

// ─── Notification type filter tabs ──────────────────────────────────
const FILTER_TABS = [
  { value: "all", label: "全部" },
  { value: "system", label: "系统" },
  { value: "publish", label: "发布" },
  { value: "interaction", label: "互动" },
  { value: "ai", label: "AI" },
  { value: "inspiration", label: "灵感" },
] as const;

type FilterValue = (typeof FILTER_TABS)[number]["value"];

// ─── Main Notification Center Panel ─────────────────────────────────
function NotificationCenterPanel({
  onAction,
}: {
  onAction?: (notification: AppNotification) => void;
}) {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
    contentPosts,
    setSelectedPostId,
    setRightPanelTab,
    addNotification,
  } = useAppStore();
  const [showReminders, setShowReminders] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterValue>("all");
  const initialized = useRef(false);

  // API-persisted notifications (merged with store)
  const [apiNotifications, setApiNotifications] = useState<AppNotification[]>([]);
  const [clearingRead, setClearingRead] = useState(false);

  // Fetch notifications from API on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Try loading from API first
    (async () => {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data: DbNotification[] = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setApiNotifications(data.map(mapDbToApp));
            return;
          }
        }
      } catch {
        // API unavailable – fall back to demo data
      }

      // Fallback: check localStorage or generate demo data
      const current = useAppStore.getState().notifications;
      if (current.length === 0) {
        try {
          const stored = localStorage.getItem("app-notifications");
          if (stored) {
            const parsed = JSON.parse(stored) as AppNotification[];
            if (Array.isArray(parsed) && parsed.length > 0) {
              useAppStore.setState({ notifications: parsed });
              return;
            }
          }
        } catch {
          // ignore
        }

        // Generate demo notifications
        const demos = generateDemoNotifications();
        for (const demo of demos) {
          addNotification(demo);
        }
      }
    })();
  }, [addNotification]);

  // Helper: create notification via API and add to local state
  const createApiNotification = useCallback(async (
    data: Omit<AppNotification, 'id' | 'timestamp' | 'read'>
  ) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: data.type,
          title: data.title,
          message: data.description,
          actionUrl: '',
          metadata: JSON.stringify({
            actionLabel: data.actionLabel,
            actionType: data.actionType,
            postId: data.postId,
          }),
        }),
      });
      if (res.ok) {
        const created: DbNotification = await res.json();
        setApiNotifications((prev) => [mapDbToApp(created), ...prev].slice(0, 50));
      }
    } catch {
      // API unavailable – add to store only
    }
  }, []);

  // Helper: mark all as read (API + store)
  const handleMarkAllRead = useCallback(async () => {
    markAllNotificationsRead();
    setApiNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
    } catch {
      // ignore
    }
  }, [markAllNotificationsRead]);

  // Helper: clear read notifications (API + store)
  const handleClearRead = useCallback(async () => {
    clearNotifications();
    setApiNotifications((prev) => prev.filter((n) => !n.read));
    setClearingRead(true);
    try {
      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearRead: true }),
      });
    } catch {
      // ignore
    }
    setTimeout(() => setClearingRead(false), 800);
  }, [clearNotifications]);

  // Merge: API notifications first, then store (demo) notifications, deduplicated
  const mergedNotifications = useMemo(() => {
    const storeIds = new Set(notifications.map((n) => n.id));
    const apiFiltered = apiNotifications.filter((n) => !storeIds.has(n.id));
    return [...apiFiltered, ...notifications].slice(0, 30);
  }, [apiNotifications, notifications]);

  const unreadCount = useMemo(
    () => mergedNotifications.filter((n) => !n.read).length,
    [mergedNotifications]
  );

  const hasReadItems = useMemo(
    () => mergedNotifications.some((n) => n.read),
    [mergedNotifications]
  );

  // Smart reminders computed from contentPosts
  const reminders = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return {
      unpublished: contentPosts.filter((p) => p.status !== "published")
        .length,
      needsOptimize: contentPosts.filter((p) => p.status === "generated")
        .length,
      lowScore: contentPosts.filter(
        (p) => p.aiScore > 0 && p.aiScore < 50
      ).length,
      todayScheduled: contentPosts.filter(
        (p) => p.scheduledDate === today && p.status !== "published"
      ).length,
    };
  }, [contentPosts]);

  const totalReminders = useMemo(
    () =>
      Object.values(reminders).reduce((sum, v) => sum + (v > 0 ? 1 : 0), 0),
    [reminders]
  );

  const handleReminderClick = useCallback(
    (filterType: string) => {
      const targetPosts = contentPosts.filter((p) => {
        switch (filterType) {
          case "unpublished":
            return p.status !== "published";
          case "needsOptimize":
            return p.status === "generated";
          case "lowScore":
            return p.aiScore > 0 && p.aiScore < 50;
          case "todayScheduled": {
            const today = new Date().toISOString().split("T")[0];
            return p.scheduledDate === today && p.status !== "published";
          }
          default:
            return false;
        }
      });
      if (targetPosts.length > 0) {
        setSelectedPostId(targetPosts[0].id);
        setRightPanelTab("copywriting");
      }
    },
    [contentPosts, setSelectedPostId, setRightPanelTab]
  );

  const handleNotificationAction = useCallback(
    (notification: AppNotification) => {
      if (notification.actionType === "viewPost" && notification.postId) {
        setSelectedPostId(notification.postId);
        setRightPanelTab("copywriting");
      } else if (notification.actionType === "viewData") {
        setRightPanelTab("data");
      }
      onAction?.(notification);
    },
    [setSelectedPostId, setRightPanelTab, onAction]
  );

  // Filter notifications (max 20)
  const filteredNotifications = useMemo(() => {
    let filtered = mergedNotifications;
    if (activeFilter !== "all") {
      filtered = filtered.filter((n) => n.type === activeFilter);
    }
    return filtered.slice(0, 20);
  }, [mergedNotifications, activeFilter]);

  // Count per type for filter tabs
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of mergedNotifications) {
      counts[n.type] = (counts[n.type] || 0) + 1;
    }
    return counts;
  }, [mergedNotifications]);

  const panelContent = (
    <div className="w-80 sm:w-96 max-h-[70vh] flex flex-col glass-card-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-violet-500" />
          <span className="text-sm font-semibold">通知中心</span>
          {unreadCount > 0 && (
            <Badge
              variant="secondary"
              className="h-5 px-1.5 text-[10px] bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
            >
              {unreadCount} 未读
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[10px]"
              onClick={handleMarkAllRead}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              全部已读
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[10px] text-muted-foreground hover:text-red-500"
            onClick={handleClearRead}
            disabled={clearingRead || !hasReadItems}
          >
            <Trash2 className={`h-3 w-3 mr-1 ${clearingRead ? 'animate-pulse' : ''}`} />
            清除已读
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* Quick Stats */}
          <QuickStats />

          <Separator />

          {/* Smart Reminders */}
          <div>
            <button
              className="w-full flex items-center justify-between py-1"
              onClick={() => setShowReminders(!showReminders)}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-semibold">智能提醒</span>
                {totalReminders > 0 && (
                  <Badge
                    variant="secondary"
                    className="h-4 px-1.5 text-[9px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                  >
                    {totalReminders}
                  </Badge>
                )}
              </div>
              {showReminders ? (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>

            <AnimatePresence>
              {showReminders && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-1.5 pt-2">
                    <ReminderCard
                      icon={Megaphone}
                      color="text-violet-600 dark:text-violet-400"
                      bgColor="bg-violet-100 dark:bg-violet-900/30"
                      label="待发布内容"
                      count={reminders.unpublished}
                      onClick={() => handleReminderClick("unpublished")}
                    />
                    <ReminderCard
                      icon={Wand2}
                      color="text-emerald-600 dark:text-emerald-400"
                      bgColor="bg-emerald-100 dark:bg-emerald-900/30"
                      label="待优化内容"
                      count={reminders.needsOptimize}
                      onClick={() => handleReminderClick("needsOptimize")}
                    />
                    <ReminderCard
                      icon={AlertTriangle}
                      color="text-amber-600 dark:text-amber-400"
                      bgColor="bg-amber-100 dark:bg-amber-900/30"
                      label="低评分内容"
                      count={reminders.lowScore}
                      onClick={() => handleReminderClick("lowScore")}
                    />
                    <ReminderCard
                      icon={Clock}
                      color="text-rose-600 dark:text-rose-400"
                      bgColor="bg-rose-100 dark:bg-rose-900/30"
                      label="今日待发布"
                      count={reminders.todayScheduled}
                      onClick={() => handleReminderClick("todayScheduled")}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {totalReminders === 0 && showReminders && (
              <div className="flex flex-col items-center py-4 text-muted-foreground">
                <CheckCircle className="h-6 w-6 mb-1.5 opacity-40" />
                <span className="text-[11px]">暂无提醒事项</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Notification filter tabs */}
          <div className="flex gap-1 overflow-x-auto scrollbar-none pb-1">
            {FILTER_TABS.map((tab) => {
              const isActive = activeFilter === tab.value;
              const count =
                tab.value === "all"
                  ? mergedNotifications.length
                  : typeCounts[tab.value] || 0;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveFilter(tab.value)}
                  className={`relative flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${
                    isActive
                      ? "text-white"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="notif-filter-pill"
                      className="absolute inset-0 rounded-full bg-foreground"
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 35,
                      }}
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                  {count > 0 && (
                    <span
                      className={`relative z-10 h-3.5 min-w-3.5 flex items-center justify-center rounded-full px-1 text-[8px] font-bold leading-none ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Notification List */}
          <div>
            <div className="flex items-center gap-2 py-1">
              <BarChart3 className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-xs font-semibold">操作记录</span>
              <span className="text-[10px] text-muted-foreground">
                ({mergedNotifications.length})
              </span>
            </div>

            {filteredNotifications.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-1 pt-1">
                <AnimatePresence mode="popLayout">
                  {filteredNotifications.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      onRead={markNotificationRead}
                      onAction={handleNotificationAction}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );

  return panelContent;
}

// ─── Unread Badge Component ───────────────────────────────────────
function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <motion.span
      key={count}
      initial={{ scale: 0 }}
      animate={{ scale: [1, 1.3, 1] }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 15,
        duration: 0.4,
      }}
      className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center leading-none"
    >
      {count > 9 ? "9+" : count}
    </motion.span>
  );
}

// ─── NotificationBell (exported for header) ─────────────────────────
export function NotificationBell() {
  const { notifications } = useAppStore();
  const hydrated = useRef(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const isMobile = useIsMobile();

  // Hydrate notifications from localStorage on mount
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    try {
      const stored = localStorage.getItem("app-notifications");
      if (stored) {
        const parsed = JSON.parse(stored) as AppNotification[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          const current = useAppStore.getState().notifications;
          if (current.length === 0) {
            // Only set if store is empty (initial load)
            useAppStore.setState({ notifications: parsed });
          }
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const handleAction = useCallback((_notification: AppNotification) => {
    setIsMobileOpen(false);
  }, []);

  // Only render one Bell icon based on viewport to prevent duplicate icons
  // during SSR hydration / FOUC (Flash of Unstyled Content)
  return (
    <TooltipProvider delayDuration={300}>
      {isMobile ? (
        /* Mobile: Sheet */
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-8 w-8 hover:bg-muted/80 transition-colors"
                  aria-label="通知中心"
                >
                  <Bell className={`h-4 w-4 transition-colors duration-200 ${unreadCount > 0 ? 'text-foreground' : 'text-muted-foreground'}`} />
                  <UnreadBadge count={unreadCount} />
                </Button>
              </SheetTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <p>通知中心{unreadCount > 0 ? ` · ${unreadCount}条未读` : ''}</p>
            </TooltipContent>
          </Tooltip>
          <SheetContent side="right" className="w-full sm:max-w-md p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>通知中心</SheetTitle>
              <SheetDescription>查看所有通知消息</SheetDescription>
            </SheetHeader>
            <NotificationCenterPanel onAction={handleAction} />
          </SheetContent>
        </Sheet>
      ) : (
        /* Desktop: Popover with label + tooltip */
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative h-8 px-2.5 gap-1.5 rounded-lg hover:bg-muted transition-colors"
                  aria-label="通知中心"
                >
                  <Bell className={`h-4 w-4 transition-colors duration-200 ${unreadCount > 0 ? 'text-foreground' : 'text-muted-foreground'}`} />
                  <span className={`hidden lg:inline text-xs transition-colors duration-200 ${unreadCount > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>通知</span>
                  <UnreadBadge count={unreadCount} />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <p>通知中心{unreadCount > 0 ? ` · ${unreadCount}条未读` : ''}</p>
            </TooltipContent>
          </Tooltip>
          <PopoverContent
            className="w-auto p-0 border-border/50 shadow-xl"
            align="end"
            sideOffset={8}
          >
            <NotificationCenterPanel onAction={handleAction} />
          </PopoverContent>
        </Popover>
      )}
    </TooltipProvider>
  );
}
