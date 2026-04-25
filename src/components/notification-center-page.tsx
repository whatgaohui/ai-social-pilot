"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  BellOff,
  CheckCircle2,
  Sparkles,
  Filter,
  Trash2,
  Bot,
  Info,
  Trophy,
  AlertTriangle,
  CalendarClock,
  Megaphone,
  Eye,
  EyeOff,
  Inbox,
  MoreHorizontal,
} from "lucide-react";
import type { AppNotification, NotificationCategory } from "@/types";

// ─── Category filter config ────────────────────────────────────────────────
interface CategoryFilter {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}

const CATEGORY_FILTERS: CategoryFilter[] = [
  { value: "all", label: "全部", icon: Inbox, color: "text-foreground", bgColor: "bg-muted" },
  { value: "ai_task", label: "AI", icon: Bot, color: "text-violet-600 dark:text-violet-400", bgColor: "bg-violet-100 dark:bg-violet-900/30" },
  { value: "system", label: "系统", icon: Info, color: "text-slate-600 dark:text-slate-400", bgColor: "bg-slate-100 dark:bg-slate-900/30" },
  { value: "publish", label: "发布", icon: Megaphone, color: "text-rose-600 dark:text-rose-400", bgColor: "bg-rose-100 dark:bg-rose-900/30" },
  { value: "reminder", label: "提醒", icon: AlertTriangle, color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
];

const CATEGORY_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ai_task: Bot,
  system: Info,
  achievement: Trophy,
  reminder: AlertTriangle,
  schedule: CalendarClock,
  publish: Megaphone,
};

const CATEGORY_COLOR_MAP: Record<string, { color: string; bgColor: string; border: string }> = {
  ai_task: { color: "text-violet-600 dark:text-violet-400", bgColor: "bg-violet-100 dark:bg-violet-900/30", border: "border-l-violet-500" },
  system: { color: "text-slate-600 dark:text-slate-400", bgColor: "bg-slate-100 dark:bg-slate-900/30", border: "border-l-slate-500" },
  achievement: { color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-900/30", border: "border-l-emerald-500" },
  reminder: { color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/30", border: "border-l-amber-500" },
  schedule: { color: "text-rose-600 dark:text-rose-400", bgColor: "bg-rose-100 dark:bg-rose-900/30", border: "border-l-rose-500" },
  publish: { color: "text-rose-600 dark:text-rose-400", bgColor: "bg-rose-100 dark:bg-rose-900/30", border: "border-l-rose-500" },
};

// ─── Time formatter ────────────────────────────────────────────────────────
function formatRelativeTime(timestamp: number): string {
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
  return new Date(timestamp).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

// ─── Animation variants ────────────────────────────────────────────────────
const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 500, damping: 30 } },
  exit: { opacity: 0, x: -30, transition: { duration: 0.2 } },
};

// ─── Main NotificationCenterPage ────────────────────────────────────────────
export function NotificationCenterPage() {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
    setSelectedPostId,
    setRightPanelTab,
  } = useAppStore();

  const [activeCategory, setActiveCategory] = useState("all");
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");
  const [isLoading, setIsLoading] = useState(true);
  const initialized = useRef(false);

  // Fetch notifications from API on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const loadNotifications = async () => {
      try {
        const res = await fetch("/api/notifications?limit=100");
        if (res.ok) {
          const json = await res.json();
          const data = json.notifications || json;
          if (Array.isArray(data) && data.length > 0) {
            // Merge with store notifications (API takes priority)
            const existing = useAppStore.getState().notifications;
            const existingIds = new Set(existing.map((n: AppNotification) => n.id));
            const newNotifs = data
              .filter((d: { id: string }) => !existingIds.has(d.id))
              .map((d: { id: string; type: string; category?: string; title: string; message: string; read: boolean; createdAt: string }) => ({
                id: d.id,
                type: d.type || "system",
                category: d.category as NotificationCategory | undefined,
                title: d.title,
                description: d.message || "",
                timestamp: new Date(d.createdAt).getTime(),
                read: d.read,
              }));
            if (newNotifs.length > 0) {
              useAppStore.setState({ notifications: [...newNotifs, ...existing] });
            }
          }
        }
      } catch {
        // API unavailable, use store data
      } finally {
        setIsLoading(false);
      }
    };

    loadNotifications();
  }, []);

  // Derived data
  const filteredNotifications = useMemo(() => {
    let result = notifications;

    // Category filter
    if (activeCategory !== "all") {
      result = result.filter(
        (n) => n.category === activeCategory || n.type === activeCategory
      );
    }

    // Read/unread filter
    if (readFilter === "unread") {
      result = result.filter((n) => !n.read);
    } else if (readFilter === "read") {
      result = result.filter((n) => n.read);
    }

    // Sort by timestamp descending
    return result.sort((a, b) => b.timestamp - a.timestamp);
  }, [notifications, activeCategory, readFilter]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: notifications.length };
    for (const filter of CATEGORY_FILTERS) {
      if (filter.value === "all") continue;
      counts[filter.value] = notifications.filter(
        (n) => n.category === filter.value || n.type === filter.value
      ).length;
    }
    return counts;
  }, [notifications]);

  // Handlers
  const handleMarkAllRead = useCallback(async () => {
    markAllNotificationsRead();
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
    } catch {
      // ignore
    }
  }, [markAllNotificationsRead]);

  const handleMarkRead = useCallback(
    async (id: string) => {
      markNotificationRead(id);
      try {
        await fetch("/api/notifications/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [id] }),
        });
      } catch {
        // ignore
      }
    },
    [markNotificationRead]
  );

  const handleDismiss = useCallback(
    async (id: string) => {
      clearNotifications();
      try {
        await fetch("/api/notifications", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [id] }),
        });
      } catch {
        // ignore
      }
    },
    [clearNotifications]
  );

  const handleAction = useCallback(
    (notification: AppNotification) => {
      if (notification.actionType === "viewPost" && notification.postId) {
        setSelectedPostId(notification.postId);
        setRightPanelTab("workspace");
      } else if (notification.actionType === "viewData") {
        setRightPanelTab("data");
      }
    },
    [setSelectedPostId, setRightPanelTab]
  );

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto">
      {/* ── Header ── */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500/15 to-emerald-500/15 flex items-center justify-center">
              <Bell className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold">通知中心</h1>
              <p className="text-xs text-muted-foreground">
                {notifications.length} 条通知 · {unreadCount} 条未读
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300"
                  onClick={handleMarkAllRead}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  全部已读
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <Separator className="mx-6" />

      {/* ── Filter Bar ── */}
      <div className="flex-shrink-0 px-6 py-3 space-y-3">
        {/* Category filters */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <Filter className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          {CATEGORY_FILTERS.map((filter) => {
            const Icon = filter.icon;
            const isActive = activeCategory === filter.value;
            const count = categoryCounts[filter.value] || 0;

            return (
              <motion.button
                key={filter.value}
                onClick={() => setActiveCategory(filter.value)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                whileTap={{ scale: 0.97 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="notif-category-filter"
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500 to-emerald-500"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <Icon className={`relative z-10 h-3.5 w-3.5 ${isActive ? "text-white" : filter.color}`} />
                <span className="relative z-10">{filter.label}</span>
                {count > 0 && (
                  <span
                    className={`relative z-10 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold px-1 ${
                      isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Read/unread toggle */}
        <div className="flex items-center gap-1.5">
          {(["all", "unread", "read"] as const).map((filter) => {
            const labels = { all: "全部状态", unread: "未读", read: "已读" };
            const icons = { all: MoreHorizontal, unread: Eye, read: EyeOff };
            const Icon = icons[filter];
            const isActive = readFilter === filter;

            return (
              <button
                key={filter}
                onClick={() => setReadFilter(filter)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  isActive
                    ? "bg-foreground/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon className="h-3 w-3" />
                {labels[filter]}
              </button>
            );
          })}
        </div>
      </div>

      <Separator className="mx-6" />

      {/* ── Notification List ── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="px-6 py-3">
            {isLoading ? (
              <div className="flex flex-col items-center py-16 text-muted-foreground">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="h-8 w-8 opacity-20" />
                </motion.div>
                <span className="text-sm mt-3">加载中...</span>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <EmptyState activeFilter={activeCategory} readFilter={readFilter} />
            ) : (
              <motion.div
                className="space-y-2"
                variants={listVariants}
                initial="hidden"
                animate="visible"
                key={`${activeCategory}-${readFilter}`}
              >
                <AnimatePresence mode="popLayout">
                  {filteredNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkRead={handleMarkRead}
                      onDismiss={handleDismiss}
                      onAction={handleAction}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ── Footer stats ── */}
      {!isLoading && notifications.length > 0 && (
        <>
          <Separator className="mx-6" />
          <div className="flex-shrink-0 px-6 py-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>共 {notifications.length} 条通知</span>
            <span>{unreadCount} 条未读</span>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Notification Item ──────────────────────────────────────────────────────
function NotificationItem({
  notification,
  onMarkRead,
  onDismiss,
  onAction,
}: {
  notification: AppNotification;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onAction: (notification: AppNotification) => void;
}) {
  const categoryKey = notification.category || notification.type || "system";
  const config = CATEGORY_COLOR_MAP[categoryKey] || CATEGORY_COLOR_MAP.system;
  const Icon = CATEGORY_ICON_MAP[categoryKey] || Info;
  const isAchievement = notification.type === "achievement" || notification.category === "achievement";

  return (
    <motion.div
      variants={itemVariants}
      layout
      className={`group relative flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors border-l-[3px] ${
        !notification.read
          ? `${config.border} bg-gradient-to-r ${config.bgColor} hover:bg-accent/50`
          : "border-l-transparent hover:bg-muted/50"
      }`}
      onClick={() => {
        if (!notification.read) onMarkRead(notification.id);
        if (notification.actionType) onAction(notification);
      }}
    >
      {/* Icon */}
      {isAchievement ? (
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex-shrink-0 h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20"
        >
          <Trophy className="h-4.5 w-4.5 text-white" />
        </motion.div>
      ) : (
        <div className={`flex-shrink-0 h-9 w-9 rounded-lg ${config.bgColor} flex items-center justify-center`}>
          <Icon className={`h-4 w-4 ${config.color}`} />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className={`text-xs truncate ${
              !notification.read ? "font-bold text-foreground" : "font-medium text-foreground/80"
            }`}
          >
            {notification.title}
          </span>
          {!notification.read && (
            <span className={`flex-shrink-0 h-2 w-2 rounded-full ${config.color.replace("text-", "bg-").split(" ")[0]}`} />
          )}
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
          {notification.description}
        </p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-[10px] text-muted-foreground/70">
            {formatRelativeTime(notification.timestamp)}
          </span>
          {notification.category && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-normal">
              {notification.category}
            </Badge>
          )}
          {notification.actionLabel && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-2 text-[10px] text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30"
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead(notification.id);
                onAction(notification);
              }}
            >
              {notification.actionLabel}
            </Button>
          )}
        </div>
      </div>

      {/* Dismiss */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(notification.id);
        }}
        className="flex-shrink-0 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 hover:bg-muted flex items-center justify-center transition-all"
        aria-label="关闭"
      >
        <Trash2 className="h-3 w-3 text-muted-foreground" />
      </button>
    </motion.div>
  );
}

// ─── Empty State ────────────────────────────────────────────────────────────
function EmptyState({
  activeFilter,
  readFilter,
}: {
  activeFilter: string;
  readFilter: string;
}) {
  let message = "暂无通知";
  let subMessage = "新消息和操作提醒将在这里显示";

  if (activeFilter !== "all") {
    message = `暂无${activeFilter}类通知`;
    subMessage = "该分类下暂无通知消息";
  } else if (readFilter === "unread") {
    message = "所有通知已读";
    subMessage = "太棒了！没有未读通知";
  } else if (readFilter === "read") {
    message = "暂无已读通知";
    subMessage = "已读通知将在这里显示";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center py-16"
    >
      <div className="relative mb-5">
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <BellOff className="h-14 w-14 text-muted-foreground/15" />
        </motion.div>
        <motion.div
          className="absolute -top-1 -right-1"
          animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="h-5 w-5 rounded-full bg-muted-foreground/10" />
        </motion.div>
      </div>
      <span className="text-sm font-semibold text-muted-foreground">{message}</span>
      <span className="text-xs mt-1 text-muted-foreground/60">{subMessage}</span>
    </motion.div>
  );
}
