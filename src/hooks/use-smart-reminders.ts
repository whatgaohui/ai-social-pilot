"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAppStore } from "@/store/app-store";
import { toast } from "sonner";
import {
  Clock,
  AlertTriangle,
  TrendingDown,
  Sparkles,
} from "lucide-react";

// Track last fired reminders to avoid spam
const REMINDER_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
const reminderLastFired: Record<string, number> = {};

function shouldFire(key: string): boolean {
  const now = Date.now();
  if (reminderLastFired[key] && now - reminderLastFired[key] < REMINDER_COOLDOWN_MS) {
    return false;
  }
  reminderLastFired[key] = now;
  return true;
}

/**
 * useSmartReminders - checks for upcoming tasks and shows non-intrusive toast reminders.
 * Runs every 5 minutes while mounted.
 */
export function useSmartReminders() {
  const contentPosts = useAppStore((s) => s.contentPosts);
  const isGenerating = useAppStore((s) => s.isGenerating);
  const hasRunRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkReminders = useCallback(() => {
    if (isGenerating) return;
    const posts = useAppStore.getState().contentPosts;
    if (posts.length === 0) return;

    const today = new Date().toISOString().split("T")[0];
    const now = Date.now();

    // 1. Content scheduled for today but not published → "今日待发布" reminder
    const todayScheduled = posts.filter(
      (p) => p.scheduledDate === today && p.status !== "published"
    );
    if (todayScheduled.length > 0 && shouldFire("today_unpublished")) {
      toast.warning("今日待发布提醒", {
        description: `您有 ${todayScheduled.length} 篇内容计划今日发布，请尽快处理。`,
        icon: "clock",
        duration: 6000,
      });
    }

    // 2. Content with no interaction data after 24h of publishing → "发布后无互动" alert
    const noInteraction = posts.filter((p) => {
      if (p.status !== "published") return false;
      const publishedAt = new Date(p.updatedAt).getTime();
      const hoursSince = (now - publishedAt) / (1000 * 60 * 60);
      const totalInteraction = (p.likes || 0) + (p.comments || 0) + (p.shares || 0) + (p.views || 0);
      return hoursSince >= 24 && totalInteraction === 0;
    });
    if (noInteraction.length > 0 && shouldFire("no_interaction")) {
      toast.info("发布后无互动提醒", {
        description: `有 ${noInteraction.length} 篇已发布内容在24小时内没有互动数据，建议优化标题或内容。`,
        icon: "trending-down",
        duration: 8000,
      });
    }

    // 3. Content plan with gaps (3+ days without content) → "内容空白" warning
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
      if (maxGap >= 3 && shouldFire("content_gap")) {
        toast.warning("内容空白警告", {
          description: `您的排期计划中存在 ${Math.round(maxGap)} 天的内容空白期，建议补充排期。`,
          icon: "alert-triangle",
          duration: 8000,
        });
      }
    }

    // 4. AI score below 60 → "低质量内容" suggestion
    const lowScorePosts = posts.filter((p) => p.aiScore > 0 && p.aiScore < 60);
    if (lowScorePosts.length > 0 && shouldFire("low_score")) {
      toast.info("低质量内容建议", {
        description: `有 ${lowScorePosts.length} 篇内容AI评分低于60分，建议使用AI优化功能提升质量。`,
        icon: "sparkles",
        duration: 8000,
      });
    }
  }, [isGenerating]);

  useEffect(() => {
    // Initial check after a short delay to let data load
    const initTimer = setTimeout(() => {
      if (!hasRunRef.current) {
        hasRunRef.current = true;
        checkReminders();
      }
    }, 10000); // 10 seconds after mount

    // Periodic check every 5 minutes
    intervalRef.current = setInterval(() => {
      checkReminders();
    }, 5 * 60 * 1000);

    return () => {
      clearTimeout(initTimer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkReminders]);
}
