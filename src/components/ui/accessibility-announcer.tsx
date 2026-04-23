"use client";

import { useEffect, useRef, useCallback, useState } from "react";

/**
 * Accessibility announcer component using aria-live regions.
 * Provides screen reader feedback for dynamic content changes.
 *
 * Usage:
 *   import { announce } from "@/components/ui/accessibility-announcer";
 *   announce("内容已保存", "polite");
 */

// ─── Types ─────────────────────────────────────────────────────────────────────

type AnnouncePriority = "polite" | "assertive";

interface Announcement {
  id: string;
  message: string;
  priority: AnnouncePriority;
}

// ─── Module-level announcement queue ───────────────────────────────────────────

let announcementId = 0;
const listeners: Array<(msg: string, priority: AnnouncePriority) => void> = [];

/** Programmatically announce a message to screen readers */
export function announce(message: string, priority: AnnouncePriority = "polite") {
  announcementId++;
  for (const listener of listeners) {
    listener(message, priority);
  }
}

/** Announce a polite message (doesn't interrupt) */
export function announcePolite(message: string) {
  announce(message, "polite");
}

/** Announce an assertive message (interrupts current speech) */
export function announceAssertive(message: string) {
  announce(message, "assertive");
}

// ─── Common announcement messages ──────────────────────────────────────────────

export const A11Y_MESSAGES = {
  contentSaved: "内容已保存",
  contentCopied: "已复制到剪贴板",
  contentDeleted: "内容已删除",
  contentPublished: "内容已发布",
  contentGenerated: "AI 内容已生成",
  contentOptimized: "内容已优化",
  settingsSaved: "设置已保存",
  settingsReset: "设置已重置",
  themeChanged: "主题已切换",
  platformChanged: "平台已切换",
  loading: "加载中",
  loadComplete: "加载完成",
  error: "操作失败，请重试",
  success: "操作成功",
  noResults: "没有找到结果",
  newNotifications: "有新通知",
  searchStarted: "搜索已开始",
  searchComplete: "搜索完成",
  shortcutRegistered: "快捷键已注册",
  shortcutConflict: "快捷键冲突",
  dialogOpened: "对话框已打开",
  dialogClosed: "对话框已关闭",
  panelOpened: "面板已打开",
  panelClosed: "面板已关闭",
} as const;

// ─── Component ─────────────────────────────────────────────────────────────────

/**
 * AccessibilityAnnouncer renders invisible aria-live regions.
 * Place this component once in your app's root layout.
 */
export function AccessibilityAnnouncer() {
  const [politeMessage, setPoliteMessage] = useState("");
  const [assertiveMessage, setAssertiveMessage] = useState("");
  const politeTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const assertiveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleMessage = useCallback((message: string, priority: AnnouncePriority) => {
    if (priority === "polite") {
      // Clear previous polite message to allow re-announcing same text
      setPoliteMessage("");
      if (politeTimerRef.current) clearTimeout(politeTimerRef.current);
      // Set after a tick to ensure the DOM updates
      politeTimerRef.current = setTimeout(() => {
        setPoliteMessage(message);
        // Clear after announcement
        politeTimerRef.current = setTimeout(() => {
          setPoliteMessage("");
        }, 1000);
      }, 50);
    } else {
      setAssertiveMessage("");
      if (assertiveTimerRef.current) clearTimeout(assertiveTimerRef.current);
      assertiveTimerRef.current = setTimeout(() => {
        setAssertiveMessage(message);
        assertiveTimerRef.current = setTimeout(() => {
          setAssertiveMessage("");
        }, 1000);
      }, 50);
    }
  }, []);

  useEffect(() => {
    listeners.push(handleMessage);
    return () => {
      const idx = listeners.indexOf(handleMessage);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, [handleMessage]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (politeTimerRef.current) clearTimeout(politeTimerRef.current);
      if (assertiveTimerRef.current) clearTimeout(assertiveTimerRef.current);
    };
  }, []);

  return (
    <>
      {/* Polite announcements - won't interrupt current speech */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-a11y-announcer="polite"
      >
        {politeMessage}
      </div>
      {/* Assertive announcements - will interrupt current speech */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        data-a11y-announcer="assertive"
      >
        {assertiveMessage}
      </div>
    </>
  );
}

/**
 * Utility hook to create announcement functions bound to specific messages.
 */
export function useAnnounce() {
  return {
    announce,
    announcePolite,
    announceAssertive,
    messages: A11Y_MESSAGES,
  };
}
