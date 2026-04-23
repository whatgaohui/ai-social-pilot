"use client";

import {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
  useSyncExternalStore,
} from "react";
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
import { Switch } from "@/components/ui/switch";
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
  Archive,
  Trash2,
  Sparkles,
  AlertTriangle,
  Clock,
  Trophy,
  Info,
  CalendarClock,
  Bot,
  Settings,
  MoreVertical,
  X,
  Star,
  Flame,
  CalendarX,
  Zap,
  BarChart3,
  Lightbulb,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { AppNotification, NotificationType } from "@/types";

// ═══════════════════════════════════════════════════════════════════
// Notification type config — 5 core types + legacy aliases
// ═══════════════════════════════════════════════════════════════════

interface NotifTypeConfig {
  icon: typeof Info;
  color: string;
  bgColor: string;
  borderLeftColor: string;
  dotColor: string;
  label: string;
  emoji: string;
}

const TYPE_CONFIG: Record<string, NotifTypeConfig> = {
  // ── 5 core types (task spec) ────────────────────────────────────
  publish: {
    icon: CalendarClock,
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-100 dark:bg-violet-900/30",
    borderLeftColor: "border-l-violet-500 dark:border-l-violet-400",
    dotColor: "bg-violet-500",
    label: "发布提醒",
    emoji: "📅",
  },
  ai: {
    icon: Sparkles,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    borderLeftColor: "border-l-emerald-500 dark:border-l-emerald-400",
    dotColor: "bg-emerald-500",
    label: "AI完成",
    emoji: "🤖",
  },
  report: {
    icon: BarChart3,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    borderLeftColor: "border-l-amber-500 dark:border-l-amber-400",
    dotColor: "bg-amber-500",
    label: "数据报告",
    emoji: "📊",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-100 dark:bg-rose-900/30",
    borderLeftColor: "border-l-rose-500 dark:border-l-rose-400",
    dotColor: "bg-rose-500",
    label: "异常警告",
    emoji: "⚠️",
  },
  tip: {
    icon: Lightbulb,
    color: "text-sky-600 dark:text-sky-400",
    bgColor: "bg-sky-100 dark:bg-sky-900/30",
    borderLeftColor: "border-l-sky-500 dark:border-l-sky-400",
    dotColor: "bg-sky-500",
    label: "运营建议",
    emoji: "💡",
  },
  // ── Legacy aliases (backward compatibility) ─────────────────────
  system: {
    icon: Info,
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-100 dark:bg-violet-900/30",
    borderLeftColor: "border-l-violet-500 dark:border-l-violet-400",
    dotColor: "bg-violet-500",
    label: "系统",
    emoji: "📋",
  },
  reminder: {
    icon: Bell,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    borderLeftColor: "border-l-amber-500 dark:border-l-amber-400",
    dotColor: "bg-amber-500",
    label: "提醒",
    emoji: "🔔",
  },
  achievement: {
    icon: Trophy,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    borderLeftColor: "border-l-emerald-500 dark:border-l-emerald-400",
    dotColor: "bg-emerald-500",
    label: "成就",
    emoji: "🏆",
  },
  schedule: {
    icon: CalendarClock,
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-100 dark:bg-violet-900/30",
    borderLeftColor: "border-l-violet-500 dark:border-l-violet-400",
    dotColor: "bg-violet-500",
    label: "排期",
    emoji: "📅",
  },
  ai_task: {
    icon: Bot,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    borderLeftColor: "border-l-emerald-500 dark:border-l-emerald-400",
    dotColor: "bg-emerald-500",
    label: "AI任务",
    emoji: "🤖",
  },
  completion: {
    icon: CheckCircle,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    borderLeftColor: "border-l-emerald-500 dark:border-l-emerald-400",
    dotColor: "bg-emerald-500",
    label: "完成",
    emoji: "✅",
  },
  marketing: {
    icon: Flame,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    borderLeftColor: "border-l-amber-500 dark:border-l-amber-400",
    dotColor: "bg-amber-500",
    label: "营销",
    emoji: "🔥",
  },
  interaction: {
    icon: Star,
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-100 dark:bg-rose-900/30",
    borderLeftColor: "border-l-rose-500 dark:border-l-rose-400",
    dotColor: "bg-rose-500",
    label: "互动",
    emoji: "⭐",
  },
  error: {
    icon: X,
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-100 dark:bg-rose-900/30",
    borderLeftColor: "border-l-rose-500 dark:border-l-rose-400",
    dotColor: "bg-rose-500",
    label: "错误",
    emoji: "❌",
  },
  generate: {
    icon: Sparkles,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    borderLeftColor: "border-l-emerald-500 dark:border-l-emerald-400",
    dotColor: "bg-emerald-500",
    label: "生成",
    emoji: "🤖",
  },
  optimize: {
    icon: Zap,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    borderLeftColor: "border-l-emerald-500 dark:border-l-emerald-400",
    dotColor: "bg-emerald-500",
    label: "优化",
    emoji: "⚡",
  },
  polish: {
    icon: Sparkles,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    borderLeftColor: "border-l-emerald-500 dark:border-l-emerald-400",
    dotColor: "bg-emerald-500",
    label: "润色",
    emoji: "✨",
  },
};

function getTypeConfig(type?: string): NotifTypeConfig {
  return TYPE_CONFIG[type || "system"] || TYPE_CONFIG.system;
}

// ═══════════════════════════════════════════════════════════════════
// DB notification type mapping
// ═══════════════════════════════════════════════════════════════════

interface DbNotification {
  id: string;
  type: string;
  category?: string;
  title: string;
  message: string;
  read: boolean;
  isArchived?: boolean;
  priority?: string;
  actionUrl: string;
  metadata: string;
  data: string;
  createdAt: string;
}

function mapDbToApp(dbNotif: DbNotification): AppNotification {
  let meta: Record<string, unknown> = {};
  try { meta = JSON.parse(dbNotif.metadata || "{}"); } catch { /* noop */ }
  return {
    id: dbNotif.id,
    type: (dbNotif.type as NotificationType) || "system",
    category: (dbNotif.category as AppNotification["category"]) || undefined,
    title: dbNotif.title,
    description: dbNotif.message || "",
    timestamp: new Date(dbNotif.createdAt).getTime(),
    read: dbNotif.read,
    actionLabel: (meta.actionLabel as string) || undefined,
    actionType: (meta.actionType as "viewPost" | "viewData" | "dismiss") || undefined,
    postId: (meta.postId as string) || undefined,
  };
}

// ═══════════════════════════════════════════════════════════════════
// Time grouping & formatting
// ═══════════════════════════════════════════════════════════════════

type TimeGroup = "today" | "yesterday" | "earlier";

function getTimeGroup(timestamp: number): TimeGroup {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;
  if (timestamp >= todayStart) return "today";
  if (timestamp >= yesterdayStart) return "yesterday";
  return "earlier";
}

const TIME_GROUP_LABELS: Record<TimeGroup, string> = {
  today: "今天",
  yesterday: "昨天",
  earlier: "更早",
};

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (seconds < 60) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return `${Math.floor(days / 7)}周前`;
}

// ═══════════════════════════════════════════════════════════════════
// Filter tabs — 5 core types + "all"
// ═══════════════════════════════════════════════════════════════════

const FILTER_TABS = [
  { value: "all", label: "全部" },
  { value: "publish", label: "📅 发布" },
  { value: "ai", label: "🤖 AI" },
  { value: "report", label: "📊 报告" },
  { value: "warning", label: "⚠️ 警告" },
  { value: "tip", label: "💡 建议" },
] as const;

type FilterValue = (typeof FILTER_TABS)[number]["value"];

// ═══════════════════════════════════════════════════════════════════
// Animation variants
// ═══════════════════════════════════════════════════════════════════

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -8, y: 2 },
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: { type: "spring", stiffness: 500, damping: 30 },
  },
  exit: {
    opacity: 0,
    x: 16,
    height: 0,
    marginBottom: 0,
    transition: { duration: 0.2 },
  },
};

// ═══════════════════════════════════════════════════════════════════
// Notification Sound helper
// ═══════════════════════════════════════════════════════════════════

function playNotificationSound() {
  if (typeof window === "undefined") return;
  try {
    const soundEnabled = localStorage.getItem("notif-sound") !== "false";
    if (!soundEnabled) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // audio not available
  }
}

// ═══════════════════════════════════════════════════════════════════
// Achievement card (special gradient design)
// ═══════════════════════════════════════════════════════════════════

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
      className="relative overflow-hidden rounded-xl cursor-pointer group"
      onClick={() => {
        if (!notification.read) onRead(notification.id);
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-amber-500/10 to-violet-500/10 dark:from-emerald-500/20 dark:via-amber-500/20 dark:to-violet-500/20" />
      <div className="relative z-10 flex items-start gap-3 p-3">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex-shrink-0 h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20"
        >
          <Trophy className="h-5 w-5 text-white" />
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-bold text-foreground">{notification.title}</span>
            {!notification.read && (
              <span className="flex-shrink-0 h-2 w-2 rounded-full bg-emerald-500" />
            )}
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
            {notification.description}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] text-muted-foreground/70">
              {formatRelativeTime(notification.timestamp)}
            </span>
            <Badge className="h-4 px-1.5 text-[9px] font-normal bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-0">
              <Star className="h-2.5 w-2.5 mr-0.5" />
              成就
            </Badge>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss(notification.id); }}
          className="flex-shrink-0 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-muted flex items-center justify-center transition-all"
          aria-label="关闭"
        >
          <X className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Regular notification card
// ═══════════════════════════════════════════════════════════════════

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
  const config = getTypeConfig(notification.type);
  const Icon = config.icon;

  return (
    <motion.div
      variants={itemVariants}
      layout
      className={`group relative flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors hover:bg-muted/50 border-l-[3px] ${
        !notification.read
          ? `${config.borderLeftColor} bg-muted/30`
          : "border-l-transparent"
      }`}
      onClick={() => {
        if (!notification.read) onRead(notification.id);
      }}
    >
      <div className={`flex-shrink-0 h-8 w-8 rounded-lg ${config.bgColor} flex items-center justify-center mt-0.5`}>
        <Icon className={`h-4 w-4 ${config.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-xs truncate ${!notification.read ? "font-bold text-foreground" : "font-medium text-foreground/80"}`}>
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
            {formatRelativeTime(notification.timestamp)}
          </span>
          <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-normal">
            {config.emoji} {config.label}
          </Badge>
          {notification.actionLabel && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-2 text-[10px] text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30"
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
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(notification.id); }}
        className="flex-shrink-0 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-muted flex items-center justify-center transition-all"
        aria-label="关闭"
      >
        <X className="h-3 w-3 text-muted-foreground" />
      </button>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Time-grouped section
// ═══════════════════════════════════════════════════════════════════

function TimeGroupSection({
  label,
  notifications,
  onRead,
  onDismiss,
  onAction,
}: {
  label: string;
  notifications: AppNotification[];
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onAction: (notification: AppNotification) => void;
}) {
  if (notifications.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 px-1 py-1.5">
        <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
        <Badge variant="secondary" className="h-4 px-1.5 text-[9px]">
          {notifications.length}
        </Badge>
      </div>
      <motion.div className="space-y-1" variants={containerVariants} initial="hidden" animate="visible">
        <AnimatePresence mode="popLayout">
          {notifications.map((notification) => {
            if (notification.type === "achievement") {
              return (
                <AchievementCard
                  key={notification.id}
                  notification={notification}
                  onRead={onRead}
                  onDismiss={onDismiss}
                />
              );
            }
            return (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onRead={onRead}
                onDismiss={onDismiss}
                onAction={onAction}
              />
            );
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Smart reminder card
// ═══════════════════════════════════════════════════════════════════

function SmartReminderCard({
  icon: Icon,
  color,
  bgColor,
  label,
  description,
  onClick,
}: {
  icon: typeof Info;
  color: string;
  bgColor: string;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors text-left"
    >
      <div className={`flex-shrink-0 h-8 w-8 rounded-lg ${bgColor} flex items-center justify-center`}>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium">{label}</span>
        <p className="text-[10px] text-muted-foreground truncate">{description}</p>
      </div>
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Empty state with illustration
// ═══════════════════════════════════════════════════════════════════

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center py-12 text-muted-foreground"
    >
      <div className="relative mb-4">
        <motion.div
          className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-100 to-rose-100 dark:from-violet-900/30 dark:to-rose-900/30 flex items-center justify-center"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <BellOff className="h-8 w-8 text-violet-400 dark:text-violet-500" />
        </motion.div>
        <motion.div
          className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-300 dark:bg-emerald-600"
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-1 -left-1 h-2 w-2 rounded-full bg-amber-300 dark:bg-amber-600"
          animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
        />
      </div>
      <span className="text-sm font-semibold text-foreground/80 mb-1">暂无通知</span>
      <span className="text-[11px] text-muted-foreground/60 text-center max-w-[200px] leading-relaxed">
        新消息和操作提醒将在这里显示
      </span>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Notification preferences settings (with sound toggle)
// ═══════════════════════════════════════════════════════════════════

interface NotifPreferences {
  publish: boolean;
  ai: boolean;
  report: boolean;
  warning: boolean;
  tip: boolean;
  soundEnabled: boolean;
  dndEnabled: boolean;
  dndStart: string;
  dndEnd: string;
  previewMode: "full" | "summary" | "title";
}

const DEFAULT_PREFERENCES: NotifPreferences = {
  publish: true,
  ai: true,
  report: true,
  warning: true,
  tip: true,
  soundEnabled: true,
  dndEnabled: false,
  dndStart: "22:00",
  dndEnd: "08:00",
  previewMode: "summary",
};

function loadPreferences(): NotifPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const stored = localStorage.getItem("notif-preferences-v2");
    if (stored) return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
  } catch { /* noop */ }
  return DEFAULT_PREFERENCES;
}

function NotificationPreferencesPanel() {
  const [prefs, setPrefs] = useState<NotifPreferences>(loadPreferences);

  const updatePref = useCallback(
    <K extends keyof NotifPreferences>(key: K, value: NotifPreferences[K]) => {
      setPrefs((prev) => {
        const next = { ...prev, [key]: value };
        try { localStorage.setItem("notif-preferences-v2", JSON.stringify(next)); } catch { /* noop */ }
        return next;
      });
    },
    []
  );

  const typeToggles = [
    { key: "publish" as const, label: "发布提醒", desc: "排期发布、到期提醒", icon: CalendarClock, color: "text-violet-500", emoji: "📅" },
    { key: "ai" as const, label: "AI完成通知", desc: "AI生成、优化任务完成", icon: Sparkles, color: "text-emerald-500", emoji: "🤖" },
    { key: "report" as const, label: "数据报告", desc: "周报、日报数据就绪", icon: BarChart3, color: "text-amber-500", emoji: "📊" },
    { key: "warning" as const, label: "异常警告", desc: "低互动率、错过排期", icon: AlertTriangle, color: "text-rose-500", emoji: "⚠️" },
    { key: "tip" as const, label: "运营建议", desc: "AI运营策略建议", icon: Lightbulb, color: "text-sky-500", emoji: "💡" },
  ];

  const previewModes = [
    { value: "full" as const, label: "完整内容" },
    { value: "summary" as const, label: "摘要预览" },
    { value: "title" as const, label: "仅标题" },
  ];

  return (
    <div className="space-y-6">
      {/* Sound toggle */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-violet-50 dark:bg-violet-900/10 border border-violet-200/50 dark:border-violet-800/30">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            {prefs.soundEnabled ? (
              <Volume2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            ) : (
              <VolumeX className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="text-xs font-medium">通知提示音</p>
            <p className="text-[10px] text-muted-foreground">收到新通知时播放声音</p>
          </div>
        </div>
        <Switch
          checked={prefs.soundEnabled}
          onCheckedChange={(v) => {
            updatePref("soundEnabled", v);
            try { localStorage.setItem("notif-sound", String(v)); } catch { /* noop */ }
          }}
        />
      </div>

      <Separator />

      {/* Type toggles */}
      <div>
        <h3 className="text-sm font-semibold mb-3">通知类型</h3>
        <div className="space-y-3">
          {typeToggles.map((toggle) => {
            const Icon = toggle.icon;
            return (
              <div key={toggle.key} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                    <Icon className={`h-4 w-4 ${toggle.color}`} />
                  </div>
                  <div>
                    <p className="text-xs font-medium">{toggle.emoji} {toggle.label}</p>
                    <p className="text-[10px] text-muted-foreground">{toggle.desc}</p>
                  </div>
                </div>
                <Switch
                  checked={prefs[toggle.key]}
                  onCheckedChange={(v) => updatePref(toggle.key, v)}
                />
              </div>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* DND */}
      <div>
        <h3 className="text-sm font-semibold mb-3">免打扰时段</h3>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs">开启免打扰</span>
          </div>
          <Switch
            checked={prefs.dndEnabled}
            onCheckedChange={(v) => updatePref("dndEnabled", v)}
          />
        </div>
        {prefs.dndEnabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3"
          >
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-muted-foreground">从</label>
              <input
                type="time"
                value={prefs.dndStart}
                onChange={(e) => updatePref("dndStart", e.target.value)}
                className="h-7 px-2 text-xs rounded-md border bg-background"
              />
            </div>
            <span className="text-[10px] text-muted-foreground">至</span>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={prefs.dndEnd}
                onChange={(e) => updatePref("dndEnd", e.target.value)}
                className="h-7 px-2 text-xs rounded-md border bg-background"
              />
            </div>
          </motion.div>
        )}
      </div>

      <Separator />

      {/* Preview mode */}
      <div>
        <h3 className="text-sm font-semibold mb-3">通知预览方式</h3>
        <div className="flex gap-2">
          {previewModes.map((mode) => (
            <button
              key={mode.value}
              onClick={() => updatePref("previewMode", mode.value)}
              className={`relative flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
                prefs.previewMode === mode.value
                  ? "bg-foreground text-background border-foreground"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground border-border"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Notification Center Panel (shared content)
// ═══════════════════════════════════════════════════════════════════

const MAX_NOTIFICATIONS = 50;

function NotificationCenterPanel({
  onAction,
  showPreferences,
  onTogglePreferences,
}: {
  onAction?: (notification: AppNotification) => void;
  showPreferences: boolean;
  onTogglePreferences: () => void;
}) {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
    contentPosts,
    setSelectedPostId,
    setRightPanelTab,
  } = useAppStore();
  const [activeFilter, setActiveFilter] = useState<FilterValue>("all");
  const [apiNotifications, setApiNotifications] = useState<AppNotification[]>([]);
  const initialized = useRef(false);
  const [loading, setLoading] = useState(true);

  // Fetch from API on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    void (async () => {
      try {
        const res = await fetch("/api/notifications?limit=50");
        if (res.ok) {
          const json = await res.json();
          const data: DbNotification[] = json.notifications || json;
          if (Array.isArray(data) && data.length > 0) {
            setApiNotifications(data.map(mapDbToApp));
          }
        }
      } catch {
        // fallback to store
      }

      // Fallback: hydrate from localStorage
      const current = useAppStore.getState().notifications;
      if (current.length === 0) {
        try {
          const stored = localStorage.getItem("app-notifications");
          if (stored) {
            const parsed = JSON.parse(stored) as AppNotification[];
            if (Array.isArray(parsed) && parsed.length > 0) {
              useAppStore.setState({ notifications: parsed.slice(0, MAX_NOTIFICATIONS) });
            }
          }
        } catch { /* noop */ }
      }
      setLoading(false);
    })();
  }, []);

  // Mark single as read
  const handleMarkRead = useCallback(
    async (id: string) => {
      markNotificationRead(id);
      setApiNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      try {
        await fetch("/api/notifications/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [id] }),
        });
      } catch { /* noop */ }
    },
    [markNotificationRead]
  );

  // Mark all as read
  const handleMarkAllRead = useCallback(async () => {
    markAllNotificationsRead();
    setApiNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
    } catch { /* noop */ }
  }, [markAllNotificationsRead]);

  // Dismiss single notification
  const handleDismiss = useCallback(async (id: string) => {
    setApiNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
    } catch { /* noop */ }
  }, []);

  // Archive all read
  const handleArchiveRead = useCallback(async () => {
    setApiNotifications((prev) => prev.filter((n) => !n.read));
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archiveAllRead: true }),
      });
    } catch { /* noop */ }
  }, []);

  // Merge notifications from store + API, cap at MAX
  const mergedNotifications = useMemo(() => {
    const storeIds = new Set(notifications.map((n) => n.id));
    const apiFiltered = apiNotifications.filter((n) => !storeIds.has(n.id));
    return [...apiFiltered, ...notifications].slice(0, MAX_NOTIFICATIONS);
  }, [apiNotifications, notifications]);

  const unreadCount = useMemo(
    () => mergedNotifications.filter((n) => !n.read).length,
    [mergedNotifications]
  );

  const hasReadItems = useMemo(
    () => mergedNotifications.some((n) => n.read),
    [mergedNotifications]
  );

  // Filter by type (new 5-core types + legacy mapping)
  const filteredNotifications = useMemo(() => {
    if (activeFilter === "all") return mergedNotifications;
    if (activeFilter === "ai") {
      return mergedNotifications.filter(
        (n) =>
          n.type === "ai" ||
          n.type === "ai_task" ||
          n.type === "generate" ||
          n.type === "optimize" ||
          n.type === "polish" ||
          n.type === "completion"
      );
    }
    if (activeFilter === "publish") {
      return mergedNotifications.filter(
        (n) => n.type === "publish" || n.type === "schedule" || n.type === "reminder"
      );
    }
    if (activeFilter === "warning") {
      return mergedNotifications.filter(
        (n) => n.type === "warning" || n.type === "error" || n.type === "interaction"
      );
    }
    return mergedNotifications.filter((n) => n.type === activeFilter);
  }, [mergedNotifications, activeFilter]);

  // Group by time
  const groupedNotifications = useMemo(() => {
    const groups: Record<TimeGroup, AppNotification[]> = {
      today: [],
      yesterday: [],
      earlier: [],
    };
    for (const n of filteredNotifications) {
      const group = getTimeGroup(n.timestamp);
      groups[group].push(n);
    }
    return groups;
  }, [filteredNotifications]);

  // Filter counts for tabs
  const filterCounts = useMemo(() => {
    const all = mergedNotifications.length;
    const publish = mergedNotifications.filter(
      (n) => n.type === "publish" || n.type === "schedule" || n.type === "reminder"
    ).length;
    const ai = mergedNotifications.filter(
      (n) =>
        n.type === "ai" ||
        n.type === "ai_task" ||
        n.type === "generate" ||
        n.type === "optimize" ||
        n.type === "polish" ||
        n.type === "completion"
    ).length;
    const report = mergedNotifications.filter(
      (n) => n.type === "report" || n.type === "marketing"
    ).length;
    const warning = mergedNotifications.filter(
      (n) => n.type === "warning" || n.type === "error" || n.type === "interaction"
    ).length;
    const tip = mergedNotifications.filter(
      (n) => n.type === "tip" || n.type === "system"
    ).length;
    return { all, publish, ai, report, warning, tip };
  }, [mergedNotifications]);

  // Smart reminders from content
  const smartReminders = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const posts = contentPosts;
    const reminders: {
      icon: typeof Info;
      color: string;
      bgColor: string;
      label: string;
      description: string;
      action: () => void;
    }[] = [];

    const todayScheduled = posts.filter(
      (p) => p.scheduledDate === today && p.status !== "published"
    );
    if (todayScheduled.length > 0) {
      reminders.push({
        icon: CalendarClock,
        color: "text-violet-600 dark:text-violet-400",
        bgColor: "bg-violet-100 dark:bg-violet-900/30",
        label: "今日待发布",
        description: `${todayScheduled.length} 篇内容计划今日发布`,
        action: () => {
          setSelectedPostId(todayScheduled[0].id);
          setRightPanelTab("workspace");
        },
      });
    }

    const highEngagement = posts.filter(
      (p) => p.likes >= 100 || p.comments >= 50 || p.shares >= 20
    );
    const justReached = highEngagement.filter((p) => {
      const ratio = p.likes > 0 ? p.likes / Math.max(p.views, 1) : 0;
      return ratio > 0.1;
    });
    if (justReached.length > 0) {
      reminders.push({
        icon: Flame,
        color: "text-rose-600 dark:text-rose-400",
        bgColor: "bg-rose-100 dark:bg-rose-900/30",
        label: "互动里程碑",
        description: `${justReached.length} 篇内容互动率超过10%`,
        action: () => {
          setSelectedPostId(justReached[0].id);
          setRightPanelTab("workspace");
        },
      });
    }

    const scheduledDates = posts
      .map((p) => p.scheduledDate)
      .filter(Boolean)
      .sort();
    if (scheduledDates.length >= 2) {
      let maxGap = 0;
      for (let i = 1; i < scheduledDates.length; i++) {
        const d1 = new Date(scheduledDates[i - 1]);
        const d2 = new Date(scheduledDates[i]);
        const diffDays = (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays > maxGap) maxGap = diffDays;
      }
      if (maxGap >= 3) {
        reminders.push({
          icon: CalendarX,
          color: "text-amber-600 dark:text-amber-400",
          bgColor: "bg-amber-100 dark:bg-amber-900/30",
          label: "内容日历空缺",
          description: `排期中有 ${Math.round(maxGap)} 天空缺`,
          action: () => {
            setRightPanelTab("workspace");
          },
        });
      }
    }

    const lowScore = posts.filter((p) => p.aiScore > 0 && p.aiScore < 50);
    if (lowScore.length > 0) {
      reminders.push({
        icon: Zap,
        color: "text-sky-600 dark:text-sky-400",
        bgColor: "bg-sky-100 dark:bg-sky-900/30",
        label: "AI优化建议",
        description: `${lowScore.length} 篇内容AI评分低于50`,
        action: () => {
          setSelectedPostId(lowScore[0].id);
          setRightPanelTab("workspace");
        },
      });
    }

    return reminders;
  }, [contentPosts, setSelectedPostId, setRightPanelTab]);

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

  // ─── Preferences view ───────────────────────────────────────────
  if (showPreferences) {
    return (
      <div className="w-80 sm:w-[400px] max-h-[75vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">通知偏好设置</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[10px]"
            onClick={onTogglePreferences}
          >
            返回
          </Button>
        </div>
        <ScrollArea className="flex-1 max-h-[60vh]">
          <div className="p-4">
            <NotificationPreferencesPanel />
          </div>
        </ScrollArea>
      </div>
    );
  }

  // ─── Notification list view ─────────────────────────────────────
  const hasAnyContent = mergedNotifications.length > 0 || smartReminders.length > 0;

  return (
    <div className="w-80 sm:w-[400px] max-h-[75vh] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-violet-500" />
          <span className="text-sm font-semibold">消息中心</span>
          {unreadCount > 0 && (
            <Badge className="h-5 px-1.5 text-[10px] bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border-0">
              {unreadCount} 未读
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onTogglePreferences}
                >
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p>通知偏好设置</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {hasReadItems && (
                <DropdownMenuItem onClick={handleArchiveRead} className="text-xs">
                  <Archive className="h-3.5 w-3.5 mr-2" />
                  归档已读
                </DropdownMenuItem>
              )}
              {hasReadItems && (
                <DropdownMenuItem onClick={clearNotifications} className="text-xs">
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

      {/* Filter tabs — 5 core types */}
      <div className="px-3 pt-3 pb-1">
        <div className="flex gap-1 overflow-x-auto scrollbar-none pb-1">
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.value;
            const count =
              filterCounts[tab.value as keyof typeof filterCounts] || 0;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveFilter(tab.value)}
                className={`relative flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors ${
                  isActive
                    ? "text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="msg-center-filter-v2"
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

      <Separator className="mx-3 opacity-50" />

      {/* Scrollable content */}
      <ScrollArea className="flex-1 max-h-[50vh]">
        <div className="p-3 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="h-6 w-6 opacity-30" />
              </motion.div>
              <span className="text-[11px] mt-2">加载中...</span>
            </div>
          ) : !hasAnyContent ? (
            <EmptyState />
          ) : (
            <>
              {/* Smart Reminders Section */}
              {smartReminders.length > 0 && activeFilter === "all" && (
                <div>
                  <div className="flex items-center gap-2 px-1 py-1">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-[11px] font-semibold">智能提醒</span>
                    <Badge className="h-4 px-1.5 text-[9px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-0">
                      {smartReminders.length}
                    </Badge>
                  </div>
                  <div className="space-y-1.5">
                    {smartReminders.map((reminder, i) => (
                      <SmartReminderCard key={i} {...reminder} />
                    ))}
                  </div>
                  <Separator className="mt-4" />
                </div>
              )}

              {/* Time-grouped notifications */}
              {(Object.keys(TIME_GROUP_LABELS) as TimeGroup[])
                .filter((group) => groupedNotifications[group].length > 0)
                .map((group) => (
                  <TimeGroupSection
                    key={group}
                    label={TIME_GROUP_LABELS[group]}
                    notifications={groupedNotifications[group]}
                    onRead={handleMarkRead}
                    onDismiss={handleDismiss}
                    onAction={handleNotificationAction}
                  />
                ))}

              {filteredNotifications.length === 0 && smartReminders.length > 0 && (
                <div className="text-center py-4">
                  <span className="text-[11px] text-muted-foreground">
                    该类型暂无通知
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      {!loading && mergedNotifications.length > 0 && (
        <>
          <Separator className="opacity-50" />
          <div className="px-4 py-2 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{mergedNotifications.length} 条通知</span>
            <span>{unreadCount} 条未读</span>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// NotificationBadge (exported for page.tsx) — with pulsing animation
// ═══════════════════════════════════════════════════════════════════

export function NotificationBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <motion.span
      key={count}
      initial={{ scale: 0 }}
      animate={{ scale: [1, 1.25, 1] }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 15,
        duration: 0.4,
      }}
      className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white leading-none shadow-sm"
    >
      {count > 9 ? "9+" : count}
      {/* Pulse ring animation */}
      <motion.span
        className="absolute inset-0 rounded-full bg-rose-500"
        animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
      />
    </motion.span>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Hydration-safe mounted check
// ═══════════════════════════════════════════════════════════════════

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

// ═══════════════════════════════════════════════════════════════════
// Main exported component: NotificationBell
// ═══════════════════════════════════════════════════════════════════

export function NotificationBell() {
  const { notifications } = useAppStore();
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const isMobile = useIsMobile();

  // Hydrate from localStorage on mount
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
            useAppStore.setState({ notifications: parsed.slice(0, MAX_NOTIFICATIONS) });
          }
        }
      }
    } catch { /* noop */ }
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

  const panel = (
    <NotificationCenterPanel
      onAction={handleAction}
      showPreferences={showPreferences}
      onTogglePreferences={() => setShowPreferences((v) => !v)}
    />
  );

  return (
    <TooltipProvider delayDuration={300}>
      {isMobile ? (
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-8 w-8 hover:bg-muted/80 transition-colors"
                  aria-label="消息中心"
                >
                  <Bell
                    className={`h-4 w-4 transition-colors duration-200 ${
                      unreadCount > 0 ? "text-foreground" : "text-muted-foreground"
                    }`}
                  />
                  <NotificationBadge count={unreadCount} />
                </Button>
              </SheetTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <p>消息中心{unreadCount > 0 ? ` · ${unreadCount}条未读` : ""}</p>
            </TooltipContent>
          </Tooltip>
          <SheetContent side="right" className="w-full sm:max-w-md p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>消息中心</SheetTitle>
              <SheetDescription>查看所有通知消息</SheetDescription>
            </SheetHeader>
            {panel}
          </SheetContent>
        </Sheet>
      ) : (
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative h-8 px-2.5 gap-1.5 rounded-lg hover:bg-muted transition-colors"
                  aria-label="消息中心"
                >
                  <Bell
                    className={`h-4 w-4 transition-colors duration-200 ${
                      unreadCount > 0 ? "text-foreground" : "text-muted-foreground"
                    }`}
                  />
                  <span
                    className={`hidden lg:inline text-xs transition-colors duration-200 ${
                      unreadCount > 0 ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    消息
                  </span>
                  <NotificationBadge count={unreadCount} />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <p>消息中心{unreadCount > 0 ? ` · ${unreadCount}条未读` : ""}</p>
            </TooltipContent>
          </Tooltip>
          <PopoverContent
            className="w-auto p-0 border-border/50 shadow-xl"
            align="end"
            sideOffset={8}
          >
            {panel}
          </PopoverContent>
        </Popover>
      )}
    </TooltipProvider>
  );
}

export { playNotificationSound };
