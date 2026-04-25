"use client";

import { useEffect, useMemo, useState, useCallback, useRef, useSyncExternalStore } from "react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bell,
  BellOff,
  CheckCircle,
  XCircle,
  Sparkles,
  AlertTriangle,
  Clock,
  Wand2,
  Trash2,
  ChevronDown,
  MoreVertical,
  Trophy,
  Bot,
  CalendarClock,
  Star,
  Info,
  PartyPopper,
  Megaphone,
  Maximize2,
} from "lucide-react";
import type { AppNotification, NotificationType, NotificationCategory } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { NotificationCenterPage } from "@/components/notification-center-page";

// ─── Category config ──────────────────────────────────────────────
interface CategoryConfig {
  icon: typeof Info;
  color: string;
  bgColor: string;
  borderLeftColor: string;
  dotColor: string;
  label: string;
}

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  ai_task: {
    icon: Bot,
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-100 dark:bg-violet-900/30",
    borderLeftColor: "border-l-violet-500 dark:border-l-violet-400",
    dotColor: "bg-violet-500",
    label: "AI任务",
  },
  system: {
    icon: Info,
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-900/30",
    borderLeftColor: "border-l-slate-500 dark:border-l-slate-400",
    dotColor: "bg-slate-500",
    label: "系统",
  },
  achievement: {
    icon: Trophy,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    borderLeftColor: "border-l-emerald-500 dark:border-l-emerald-400",
    dotColor: "bg-emerald-500",
    label: "成就",
  },
  reminder: {
    icon: AlertTriangle,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    borderLeftColor: "border-l-amber-500 dark:border-l-amber-400",
    dotColor: "bg-amber-500",
    label: "提醒",
  },
  schedule: {
    icon: CalendarClock,
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-100 dark:bg-rose-900/30",
    borderLeftColor: "border-l-rose-500 dark:border-l-rose-400",
    dotColor: "bg-rose-500",
    label: "排期",
  },
};

function getCategoryConfig(category?: string): CategoryConfig {
  return CATEGORY_CONFIG[category || "system"] || CATEGORY_CONFIG.system;
}

// ─── Filter tabs ──────────────────────────────────────────────────
const FILTER_TABS = [
  { value: "all", label: "全部" },
  { value: "schedule", label: "排期" },
  { value: "ai_task", label: "AI任务" },
  { value: "system", label: "系统" },
  { value: "achievement", label: "成就" },
] as const;

type FilterValue = (typeof FILTER_TABS)[number]["value"];

// ─── DB Notification type ─────────────────────────────────────────
interface DbNotification {
  id: string;
  type: string;
  category?: string;
  title: string;
  message: string;
  read: boolean;
  actionUrl: string;
  metadata: string;
  data: string;
  createdAt: string;
}

function mapDbToApp(dbNotif: DbNotification): AppNotification {
  let meta: Record<string, unknown> = {};
  try { meta = JSON.parse(dbNotif.metadata || '{}'); } catch { /* ignore */ }
  return {
    id: dbNotif.id,
    type: (dbNotif.type as NotificationType) || 'system',
    category: (dbNotif.category as NotificationCategory) || undefined,
    title: dbNotif.title,
    description: dbNotif.message || '',
    timestamp: new Date(dbNotif.createdAt).getTime(),
    read: dbNotif.read,
    actionLabel: (meta.actionLabel as string) || undefined,
    actionType: (meta.actionType as 'viewPost' | 'viewData' | 'dismiss') || undefined,
    postId: (meta.postId as string) || undefined,
  };
}

// ─── Relative time formatter ──────────────────────────────────────
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

// ─── Animation variants ───────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -12, y: 4 },
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: { type: "spring", stiffness: 500, damping: 30 },
  },
  exit: { opacity: 0, x: 20, height: 0, marginBottom: 0, transition: { duration: 0.25 } },
};

// ─── Achievement notification card (special design) ───────────────
function AchievementCard({
  notification,
  onRead,
  onDismiss,
}: {
  notification: AppNotification;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, height: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="relative overflow-hidden rounded-xl cursor-pointer group content-card-hover card-spotlight"
      onClick={() => {
        if (!notification.read) onRead(notification.id);
      }}
    >
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-amber-500/10 to-violet-500/10 dark:from-emerald-500/20 dark:via-amber-500/20 dark:to-violet-500/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent" />

      <div className="relative z-10 flex items-start gap-3 p-3">
        {/* Trophy icon with pulse */}
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex-shrink-0 h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20"
        >
          <Trophy className="h-5 w-5 text-white" />
        </motion.div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-bold text-foreground">
              {notification.title}
            </span>
            {!notification.read && (
              <span className="flex-shrink-0 h-2 w-2 rounded-full bg-emerald-500" />
            )}
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
            {notification.description}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] text-muted-foreground/70">
              {formatTime(notification.timestamp)}
            </span>
            <Badge className="h-4 px-1.5 text-[9px] font-normal bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-0">
              <Star className="h-2.5 w-2.5 mr-0.5" />
              成就
            </Badge>
          </div>
        </div>

        {/* Dismiss button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss(notification.id);
          }}
          className="flex-shrink-0 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-muted flex items-center justify-center transition-all"
          aria-label="关闭"
        >
          <svg className="h-3 w-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}

// ─── Regular notification card ────────────────────────────────────
function NotificationCard({
  notification,
  onRead,
  onDismiss,
  onAction,
}: {
  notification: AppNotification;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onAction: (notification: AppNotification) => void;
}) {
  const config = getCategoryConfig(notification.category);
  const Icon = config.icon;

  return (
    <motion.div
      variants={itemVariants}
      layout
      className={`group relative flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors hover:bg-muted/50 border-l-[3px] content-card-hover card-spotlight ${
        !notification.read
          ? `${config.borderLeftColor} bg-muted/30`
          : "border-l-transparent"
      }`}
      onClick={() => {
        if (!notification.read) onRead(notification.id);
      }}
    >
      {/* Icon */}
      <div
        className={`flex-shrink-0 h-8 w-8 rounded-lg ${config.bgColor} flex items-center justify-center mt-0.5`}
      >
        <Icon className={`h-4 w-4 ${config.color}`} />
      </div>

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
            <span className={`flex-shrink-0 h-2 w-2 rounded-full ${config.dotColor}`} />
          )}
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
          {notification.description}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[10px] text-muted-foreground/70">
            {formatTime(notification.timestamp)}
          </span>
          <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-normal">
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

      {/* Dismiss X button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(notification.id);
        }}
        className="flex-shrink-0 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-muted flex items-center justify-center transition-all"
        aria-label="关闭"
      >
        <svg className="h-3 w-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </motion.div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center py-12 text-muted-foreground"
    >
      <div className="relative mb-4">
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <BellOff className="h-12 w-12 opacity-20" />
        </motion.div>
        <motion.div
          className="absolute -top-1 -right-1"
          animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="h-4 w-4 rounded-full bg-muted-foreground/10" />
        </motion.div>
      </div>
      <span className="text-sm font-medium">暂无新通知</span>
      <span className="text-[11px] mt-1 text-muted-foreground/70">
        新消息和操作提醒将在这里显示
      </span>
    </motion.div>
  );
}

// ─── Main Enhanced Panel ──────────────────────────────────────────
function EnhancedNotificationCenterPanel({
  onAction,
  onOpenFullPage,
}: {
  onAction?: (notification: AppNotification) => void;
  onOpenFullPage?: () => void;
}) {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
    setSelectedPostId,
    setRightPanelTab,
  } = useAppStore();
  const [activeFilter, setActiveFilter] = useState<FilterValue>("all");
  const [apiNotifications, setApiNotifications] = useState<AppNotification[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const initialized = useRef(false);
  const PAGE_SIZE = 20;

  // Fetch notifications from API on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      try {
        const res = await fetch('/api/notifications?limit=50');
        if (res.ok) {
          const json = await res.json();
          const data: DbNotification[] = json.notifications || json;
          if (Array.isArray(data) && data.length > 0) {
            setApiNotifications(data.map(mapDbToApp));
            setHasMore(data.length >= PAGE_SIZE);
          }
        }
      } catch {
        // API unavailable
      }

      // Fallback: load from localStorage
      const current = useAppStore.getState().notifications;
    })();
  }, []);

  // Stop loading when we have data — derive instead of useEffect
  const isLoading = useMemo(() => {
    if (apiNotifications.length > 0 || notifications.length > 0) return false;
    // Give the fetch some time to complete (max ~2s simulated)
    return true;
  }, [apiNotifications.length, notifications.length]);

  // Mark single as read
  const handleMarkRead = useCallback(async (id: string) => {
    markNotificationRead(id);
    setApiNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });
    } catch {
      // ignore
    }
  }, [markNotificationRead]);

  // Mark all as read
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

  // Dismiss (delete) a notification
  const handleDismiss = useCallback(async (id: string) => {
    setApiNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });
    } catch {
      // ignore
    }
  }, []);

  // Clear all read
  const handleClearRead = useCallback(async () => {
    clearNotifications();
    setApiNotifications((prev) => prev.filter((n) => !n.read));
    try {
      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearRead: true }),
      });
    } catch {
      // ignore
    }
  }, [clearNotifications]);

  // Merge: API notifications first, then store notifications, deduplicated
  const mergedNotifications = useMemo(() => {
    const storeIds = new Set(notifications.map((n) => n.id));
    const apiFiltered = apiNotifications.filter((n) => !storeIds.has(n.id));
    return [...apiFiltered, ...notifications];
  }, [apiNotifications, notifications]);

  const unreadCount = useMemo(
    () => mergedNotifications.filter((n) => !n.read).length,
    [mergedNotifications]
  );

  const hasReadItems = useMemo(
    () => mergedNotifications.some((n) => n.read),
    [mergedNotifications]
  );

  // Handle notification action
  const handleNotificationAction = useCallback(
    (notification: AppNotification) => {
      if (notification.actionType === "viewPost" && notification.postId) {
        setSelectedPostId(notification.postId);
        setRightPanelTab("workspace");
      } else if (notification.actionType === "viewData") {
        setRightPanelTab("data");
      }
      onAction?.(notification);
    },
    [setSelectedPostId, setRightPanelTab, onAction]
  );

  // Filter by category
  const filteredNotifications = useMemo(() => {
    let filtered = mergedNotifications;
    if (activeFilter !== "all") {
      filtered = filtered.filter((n) => n.category === activeFilter || n.type === activeFilter);
    }
    return filtered.slice(0, page * PAGE_SIZE);
  }, [mergedNotifications, activeFilter, page]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: mergedNotifications.length };
    for (const tab of FILTER_TABS) {
      if (tab.value === "all") continue;
      counts[tab.value] = mergedNotifications.filter(
        (n) => n.category === tab.value || n.type === tab.value
      ).length;
    }
    return counts;
  }, [mergedNotifications]);

  const panelContent = (
    <div className="w-80 sm:w-96 max-h-[75vh] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-violet-500" />
          <span className="text-sm font-semibold">通知中心</span>
          {unreadCount > 0 && (
            <Badge className="h-5 px-1.5 text-[10px] bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border-0 badge-pulse">
              {unreadCount} 未读
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onOpenFullPage && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[10px] gap-1"
              onClick={onOpenFullPage}
            >
              <Maximize2 className="h-3 w-3" />
              查看全部
            </Button>
          )}
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {hasReadItems && (
                <DropdownMenuItem onClick={handleClearRead} className="text-xs">
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  清除已读
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleMarkAllRead} className="text-xs">
                <CheckCircle className="h-3.5 w-3.5 mr-2" />
                全部标记已读
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-3 pt-3 pb-1">
        <div className="flex gap-1 overflow-x-auto scrollbar-none pb-1">
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.value;
            const count = categoryCounts[tab.value] || 0;
            return (
              <button
                key={tab.value}
                onClick={() => {
                  setActiveFilter(tab.value);
                  setPage(1);
                }}
                className={`relative flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors focus-ring-soft ${
                  isActive
                    ? "text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="enhanced-notif-filter"
                    className="absolute inset-0 rounded-full bg-foreground"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
                {count > 0 && (
                  <span
                    className={`relative z-10 h-4 min-w-4 flex items-center justify-center rounded-full px-1 text-[8px] font-bold leading-none ${
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
      </div>

      <div className="divider-gradient mx-3" />

      {/* Notification List */}
      <ScrollArea className="flex-1 max-h-[50vh]">
        <div className="p-3 space-y-1.5">
          {isLoading ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="h-6 w-6 opacity-30" />
              </motion.div>
              <span className="text-[11px] mt-2">加载中...</span>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <motion.div
                className="space-y-1.5"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                key={`filter-${activeFilter}`}
              >
                <AnimatePresence mode="popLayout">
                  {filteredNotifications.map((notification) => {
                    if (notification.type === "achievement" || notification.category === "achievement") {
                      return (
                        <AchievementCard
                          key={notification.id}
                          notification={notification}
                          onRead={handleMarkRead}
                          onDismiss={handleDismiss}
                        />
                      );
                    }
                    return (
                      <NotificationCard
                        key={notification.id}
                        notification={notification}
                        onRead={handleMarkRead}
                        onDismiss={handleDismiss}
                        onAction={handleNotificationAction}
                      />
                    );
                  })}
                </AnimatePresence>
              </motion.div>

              {/* Load more */}
              {filteredNotifications.length >= page * PAGE_SIZE && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronDown className="h-3 w-3 mr-1" />
                    加载更多
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer with quick stats */}
      {!isLoading && mergedNotifications.length > 0 && (
        <>
          <div className="divider-gradient" />
          <div className="px-4 py-2 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{mergedNotifications.length} 条通知</span>
            <span>{unreadCount} 条未读</span>
          </div>
        </>
      )}
    </div>
  );

  return panelContent;
}

// ─── Unread badge ─────────────────────────────────────────────────
function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <motion.span
      key={count}
      initial={{ scale: 0 }}
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center leading-none"
    >
      {count > 9 ? "9+" : count}
    </motion.span>
  );
}

// ─── Hydration-safe mounted check ─────────────────────────────────
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

// ─── Exported: Enhanced NotificationBell ───────────────────────────
export function EnhancedNotificationBell() {
  const { notifications } = useAppStore();
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isFullPageOpen, setIsFullPageOpen] = useState(false);
  const isMobile = useIsMobile();

  // Hydrate notifications from localStorage on mount
  const hydrated = useRef(false);
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

  if (!mounted) {
    return <div className="h-8 w-[3.25rem] rounded-lg" aria-hidden="true" />;
  }

  return (
    <TooltipProvider delayDuration={300}>
      {/* Full page notification dialog */}
      <Dialog open={isFullPageOpen} onOpenChange={setIsFullPageOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="sr-only">
            <DialogTitle>通知中心</DialogTitle>
            <DialogDescription>查看所有通知消息</DialogDescription>
          </DialogHeader>
          <NotificationCenterPage />
        </DialogContent>
      </Dialog>

      {isMobile ? (
        /* Mobile: Sheet */
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`relative h-8 w-8 hover:bg-muted/80 transition-colors ${unreadCount > 0 ? 'notif-bell-glow has-unread' : ''}`}
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
            <EnhancedNotificationCenterPanel onAction={handleAction} onOpenFullPage={() => { setIsMobileOpen(false); setIsFullPageOpen(true); }} />
          </SheetContent>
        </Sheet>
      ) : (
        /* Desktop: Popover */
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`relative h-8 px-2.5 gap-1.5 rounded-lg hover:bg-muted transition-colors ${unreadCount > 0 ? 'notif-bell-glow has-unread' : ''}`}
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
            className="w-auto p-0 border-border/20 shadow-xl"
            align="end"
            sideOffset={8}
          >
            <EnhancedNotificationCenterPanel onAction={handleAction} onOpenFullPage={() => setIsFullPageOpen(true)} />
          </PopoverContent>
        </Popover>
      )}
    </TooltipProvider>
  );
}
