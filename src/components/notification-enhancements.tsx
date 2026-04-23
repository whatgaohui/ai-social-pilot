"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import type { AppNotification, NotificationType } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Eye,
  RotateCcw,
  XCircle,
  ChevronDown,
  ChevronUp,
  BellOff,
  Sparkles,
  Bot,
  PartyPopper,
  AlertTriangle,
  Heart,
  Lightbulb,
  Wand2,
  FileText,
  Clock,
  Info,
  CheckCircle2,
} from "lucide-react";

/* ─── Types ───────────────────────────────────────────────────── */

type NotificationPriority = "high" | "medium" | "low";

interface NotificationGroup {
  key: string;
  label: string;
  count: number;
  priority: NotificationPriority;
  notifications: AppNotification[];
  representative: AppNotification;
  icon: typeof Info;
  color: string;
  bgColor: string;
}

interface NotificationAction {
  label: string;
  icon: typeof Eye;
  onClick: () => void;
}

/* ─── Constants ───────────────────────────────────────────────── */

const BATCH_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

const TYPE_PRIORITY: Record<string, NotificationPriority> = {
  error: "high",
  ai_task: "medium",
  generate: "medium",
  optimize: "medium",
  polish: "medium",
  completion: "medium",
  reminder: "medium",
  publish: "medium",
  interaction: "low",
  marketing: "low",
  system: "low",
  ai: "low",
  inspiration: "low",
};

const TYPE_GROUP_MAP: Record<string, string> = {
  ai_task: "AI任务",
  generate: "AI内容生成",
  optimize: "AI内容优化",
  polish: "AI内容润色",
  completion: "任务完成",
  error: "系统错误",
  reminder: "提醒通知",
  publish: "发布通知",
  interaction: "互动通知",
  marketing: "营销通知",
  system: "系统通知",
  ai: "AI通知",
  inspiration: "灵感推送",
};

const TYPE_ICON_MAP: Record<string, typeof Info> = {
  ai_task: Bot,
  generate: FileText,
  optimize: Wand2,
  polish: Sparkles,
  completion: PartyPopper,
  error: XCircle,
  reminder: Clock,
  publish: Clock,
  interaction: Heart,
  marketing: AlertTriangle,
  system: Info,
  ai: Sparkles,
  inspiration: Lightbulb,
};

const PRIORITY_STYLES: Record<NotificationPriority, string> = {
  high: "notification-priority-high",
  medium: "notification-priority-medium",
  low: "notification-priority-low",
};

/* ─── Grouping Logic ──────────────────────────────────────────── */

function groupNotifications(notifications: AppNotification[]): NotificationGroup[] {
  const groups = new Map<string, AppNotification[]>();

  // Sort by timestamp descending
  const sorted = [...notifications].sort((a, b) => b.timestamp - a.timestamp);

  for (const notif of sorted) {
    const groupLabel = TYPE_GROUP_MAP[notif.type] || "其他通知";
    // Check if we should batch: same type group and within time window
    const existing = groups.get(groupLabel);
    if (existing && existing.length > 0) {
      const firstInGroup = existing[0];
      const timeDiff = Math.abs(firstInGroup.timestamp - notif.timestamp);
      if (timeDiff < BATCH_WINDOW_MS) {
        existing.push(notif);
        groups.set(groupLabel, existing);
        continue;
      }
    }
    // Create new group
    groups.set(groupLabel, [notif]);
  }

  return Array.from(groups.entries()).map(([label, notifs]) => ({
    key: label,
    label,
    count: notifs.length,
    priority: TYPE_PRIORITY[notifs[0].type] || "low",
    notifications: notifs,
    representative: notifs[0],
    icon: TYPE_ICON_MAP[notifs[0].type] || Info,
    color: notifs[0].type === "error"
      ? "text-red-600 dark:text-red-400"
      : "text-violet-600 dark:text-violet-400",
    bgColor: notifs[0].type === "error"
      ? "bg-red-100 dark:bg-red-900/30"
      : "bg-violet-100 dark:bg-violet-900/30",
  }));
}

/* ─── Format Relative Time ────────────────────────────────────── */

function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return `${Math.floor(days / 7)}周前`;
}

/* ─── Notification Group Card ─────────────────────────────────── */

function NotificationGroupCard({
  group,
  onMarkRead,
  onAction,
}: {
  group: NotificationGroup;
  onMarkRead: (id: string) => void;
  onAction: (notification: AppNotification) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = group.icon;
  const hasUnread = group.notifications.some((n) => !n.read);

  // Build inline actions for the representative notification
  const actions: NotificationAction[] = [];
  if (group.representative.actionLabel) {
    actions.push({
      label: group.representative.actionLabel,
      icon: Eye,
      onClick: () => {
        if (!group.representative.read) onMarkRead(group.representative.id);
        onAction(group.representative);
      },
    });
  }
  if (group.priority === "high" && group.representative.type === "error") {
    actions.push({
      label: "重试",
      icon: RotateCcw,
      onClick: () => {},
    });
  }
  actions.push({
    label: "忽略",
    icon: XCircle,
    onClick: () => {
      group.notifications.forEach((n) => onMarkRead(n.id));
    },
  });

  return (
    <motion.div
      layout
      className={`rounded-xl border transition-colors hover:bg-muted/40 ${
        hasUnread ? "bg-muted/20" : ""
      } ${PRIORITY_STYLES[group.priority]}`}
    >
      {/* Group header */}
      <div
        className="flex items-start gap-3 p-3 cursor-pointer"
        onClick={() => {
          if (!group.representative.read) onMarkRead(group.representative.id);
          setExpanded(!expanded);
        }}
      >
        <div className={`flex-shrink-0 h-8 w-8 rounded-lg ${group.bgColor} flex items-center justify-center`}>
          <Icon className={`h-4 w-4 ${group.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-xs truncate ${hasUnread ? "font-bold" : "font-medium text-foreground/80"}`}>
              {group.count > 1 ? `${group.count}个${group.label}` : group.representative.title}
            </span>
            {hasUnread && (
              <span className="flex-shrink-0 h-2 w-2 rounded-full bg-violet-500" />
            )}
          </div>
          {group.count === 1 && (
            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
              {group.representative.description}
            </p>
          )}
          {group.count > 1 && (
            <p className="text-[11px] text-muted-foreground">
              包含 {group.count} 条相关通知
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] text-muted-foreground/70">
              {formatTime(group.representative.timestamp)}
            </span>
            <Badge variant="secondary" className="h-4 px-1.5 text-[9px]">
              {group.label}
            </Badge>
          </div>
          {/* Inline actions */}
          {group.count === 1 && actions.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              {actions.map((action) => {
                const ActionIcon = action.icon;
                return (
                  <Button
                    key={action.label}
                    variant="ghost"
                    size="sm"
                    className={`h-6 px-2 text-[10px] ${
                      action.label === "忽略"
                        ? "text-muted-foreground hover:text-red-500"
                        : "text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      action.onClick();
                    }}
                  >
                    <ActionIcon className="h-3 w-3 mr-1" />
                    {action.label}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
        {group.count > 1 && (
          <div className="flex-shrink-0 pt-0.5">
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        )}
      </div>

      {/* Expanded items */}
      <AnimatePresence>
        {expanded && group.count > 1 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t px-3 pb-2 space-y-1">
              {group.notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`flex items-center gap-2 py-2 px-2 rounded-lg text-xs cursor-pointer transition-colors hover:bg-muted/60 ${
                    !notif.read ? "font-medium" : "text-foreground/70"
                  }`}
                  onClick={() => {
                    if (!notif.read) onMarkRead(notif.id);
                    if (notif.actionLabel && notif.actionType) {
                      onAction(notif);
                    }
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{notif.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {notif.description}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground/70 flex-shrink-0">
                    {formatTime(notif.timestamp)}
                  </span>
                </div>
              ))}
              {/* Batch actions */}
              <div className="flex items-center gap-1 pt-1 pl-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30"
                  onClick={() => group.notifications.forEach((n) => onMarkRead(n.id))}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  全部标为已读
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Empty State ─────────────────────────────────────────────── */

function BeautifulEmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col items-center py-12 text-muted-foreground"
    >
      {/* Illustration */}
      <div className="relative mb-4">
        <motion.div
          className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <BellOff className="h-8 w-8 text-violet-400 dark:text-violet-500" />
        </motion.div>
        {/* Decorative dots */}
        <motion.div
          className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-violet-300 dark:bg-violet-600"
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-1 -left-1 h-2 w-2 rounded-full bg-emerald-300 dark:bg-emerald-600"
          animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
        />
      </div>
      <h4 className="text-sm font-semibold text-foreground/80 mb-1">
        一切安静
      </h4>
      <p className="text-[11px] text-muted-foreground/60 text-center max-w-[200px] leading-relaxed">
        暂无新通知，当有AI任务完成或需要操作提醒时会在这里显示
      </p>
    </motion.div>
  );
}

/* ─── Enhanced Notification Center ────────────────────────────── */

interface EnhancedNotificationCenterProps {
  onAction?: (notification: AppNotification) => void;
}

export function EnhancedNotificationCenter({ onAction }: EnhancedNotificationCenterProps) {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useAppStore();
  const [batchView, setBatchView] = useState(true);

  const groups = useMemo(() => {
    if (!batchView) return [];
    return groupNotifications(notifications);
  }, [notifications, batchView]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const handleAction = useCallback(
    (notification: AppNotification) => {
      onAction?.(notification);
    },
    [onAction]
  );

  if (notifications.length === 0) {
    return <BeautifulEmptyState />;
  }

  return (
    <div className="space-y-3">
      {/* View toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">分组视图</span>
          <button
            onClick={() => setBatchView(!batchView)}
            className={`relative h-4 w-8 rounded-full transition-colors ${
              batchView ? "bg-violet-500" : "bg-muted"
            }`}
            role="switch"
            aria-checked={batchView}
          >
            <motion.div
              className="absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm"
              animate={{ left: batchView ? 16 : 2 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </button>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={markAllNotificationsRead}
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            全部已读
          </Button>
        )}
      </div>

      {/* Notification list */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {batchView
            ? groups.map((group) => (
                <motion.div
                  key={group.key}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                >
                  <NotificationGroupCard
                    group={group}
                    onMarkRead={markNotificationRead}
                    onAction={handleAction}
                  />
                </motion.div>
              ))
            : notifications.map((notif) => (
                <motion.div
                  key={notif.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                >
                  <NotificationGroupCard
                    group={{
                      key: notif.id,
                      label: TYPE_GROUP_MAP[notif.type] || "通知",
                      count: 1,
                      priority: TYPE_PRIORITY[notif.type] || "low",
                      notifications: [notif],
                      representative: notif,
                      icon: TYPE_ICON_MAP[notif.type] || Info,
                      color: "text-violet-600 dark:text-violet-400",
                      bgColor: "bg-violet-100 dark:bg-violet-900/30",
                    }}
                    onMarkRead={markNotificationRead}
                    onAction={handleAction}
                  />
                </motion.div>
              ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
