"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
} from "lucide-react";
import type { AppNotification } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

// ─── Notification type config ───────────────────────────────────────
const NOTIFICATION_CONFIG: Record<
  AppNotification["type"],
  { icon: typeof CheckCircle; color: string; bgColor: string; label: string }
> = {
  optimize: {
    icon: Wand2,
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-100 dark:bg-violet-900/30",
    label: "优化",
  },
  polish: {
    icon: Sparkles,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    label: "润色",
  },
  generate: {
    icon: FileText,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    label: "生成",
  },
  publish: {
    icon: Send,
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-100 dark:bg-rose-900/30",
    label: "发布",
  },
  reminder: {
    icon: Clock,
    color: "text-sky-600 dark:text-sky-400",
    bgColor: "bg-sky-100 dark:bg-sky-900/30",
    label: "提醒",
  },
  error: {
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    label: "错误",
  },
};

// ─── Helper: format relative time ───────────────────────────────────
function formatTime(timestamp: number): string {
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
}: {
  notification: AppNotification;
  onRead: (id: string) => void;
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
        !notification.read ? "bg-violet-50/50 dark:bg-violet-950/10" : ""
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
          <span className="text-xs font-semibold truncate">
            {notification.title}
          </span>
          {!notification.read && (
            <span className="flex-shrink-0 h-2 w-2 rounded-full bg-violet-500" />
          )}
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
          {notification.description}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-muted-foreground/70">
            {formatTime(notification.timestamp)}
          </span>
          <Badge
            variant="secondary"
            className="h-4 px-1.5 text-[9px] font-normal"
          >
            {config.label}
          </Badge>
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
    <div className="grid grid-cols-3 gap-2">
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

// ─── Main Notification Center Panel ─────────────────────────────────
function NotificationCenterPanel() {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
    contentPosts,
    setSelectedPostId,
    setRightPanelTab,
  } = useAppStore();
  const [showReminders, setShowReminders] = useState(true);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
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

  return (
    <div className="w-80 sm:w-96 max-h-[70vh] flex flex-col">
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
              onClick={markAllNotificationsRead}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              全部已读
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[10px] text-muted-foreground hover:text-red-500"
            onClick={clearNotifications}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            清空
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

          {/* Operation History */}
          <div>
            <div className="flex items-center gap-2 py-1">
              <BarChart3 className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-xs font-semibold">操作记录</span>
              <span className="text-[10px] text-muted-foreground">
                ({notifications.length})
              </span>
            </div>

            {notifications.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <Bell className="h-8 w-8 mb-2 opacity-20" />
                <span className="text-xs">暂无通知</span>
                <span className="text-[10px] mt-1">
                  操作AI优化、润色、发布后这里会显示记录
                </span>
              </div>
            ) : (
              <div className="space-y-1 pt-1">
                <AnimatePresence mode="popLayout">
                  {notifications.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      onRead={markNotificationRead}
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
}

// ─── NotificationBell (exported for header) ─────────────────────────
export function NotificationBell() {
  const { notifications } = useAppStore();
  const hydrated = useRef(false);

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

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 hover:bg-muted/80 transition-colors"
          aria-label="通知中心"
        >
          <Bell className="h-4 w-4 text-muted-foreground" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center leading-none"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 border-border/50 shadow-xl"
        align="end"
        sideOffset={8}
      >
        <NotificationCenterPanel />
      </PopoverContent>
    </Popover>
  );
}
