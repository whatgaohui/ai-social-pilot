"use client";

import { useEffect } from "react";
import { useSmartReminders } from "@/hooks/use-smart-reminders";
import { useAchievements } from "@/components/achievement-toast";
import { useNotificationStore } from "@/store/notification-store";

// ─── Notification Enhancement Hooks ──────────────────────────────────────
export function NotificationHooks() {
  useSmartReminders();
  useAchievements();

  // Load persisted notifications from the database on mount
  const initNotifications = useNotificationStore((s) => s.initNotifications);
  useEffect(() => {
    initNotifications();
  }, [initNotifications]);

  return null;
}
