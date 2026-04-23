'use client';

import { useState, useEffect, useMemo } from 'react';
import { Sparkles, Keyboard, Send, Cpu, Database } from 'lucide-react';
import { useAppStore } from '@/store/app-store';

// ─── Hook: useOnlineStatus ────────────────────────────────────────────────────

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return isOnline;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function EnhancedFooter() {
  const { platform, contentPosts, knowledgeItems } = useAppStore();
  const isOnline = useOnlineStatus();
  const isWechat = platform === 'wechat';

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayPublished = contentPosts.filter(
      (p) => p.scheduledDate?.slice(0, 10) === today && p.status === 'published'
    ).length;
    const aiGenerated = contentPosts.filter(
      (p) => p.generationType === 'auto'
    ).length;
    return { todayPublished, aiGenerated, totalPosts: contentPosts.length, libraryCount: knowledgeItems.length };
  }, [contentPosts, knowledgeItems]);

  return (
    <footer
      className="hidden sm:block mt-auto"
      role="contentinfo"
      aria-label="状态栏"
    >
      <div className="border-t border-border/30 bg-background/60 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-1.5 max-w-screen-2xl mx-auto">
          {/* Left: connection + app info */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5" role="status" aria-live="polite">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                {isOnline && (
                  <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40" />
                )}
                <span
                  className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                    isOnline ? 'bg-emerald-500' : 'bg-gray-400 dark:bg-gray-600'
                  }`}
                />
              </span>
              <span className="text-[10px] text-muted-foreground">
                {isOnline ? '已连接' : '离线'}
              </span>
            </div>

            <span className="text-[10px] font-medium text-muted-foreground/60">
              {isWechat ? '朋友圈AI运营助手' : '小红书AI运营助手'}
            </span>
            <span className="text-[9px] text-muted-foreground/40 bg-muted px-1 py-0.5 rounded">v2.1</span>
          </div>

          {/* Center: quick stats */}
          <div className="hidden md:flex items-center gap-3 text-[10px] text-muted-foreground" aria-label="快捷统计">
            <span className="flex items-center gap-1">
              <Send className="h-3 w-3" />
              <span className="font-medium text-foreground/70">{stats.todayPublished}</span> 今日发布
            </span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1">
              <Cpu className="h-3 w-3" />
              <span className="font-medium text-foreground/70">{stats.aiGenerated}</span> AI生成
            </span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1">
              <Database className="h-3 w-3" />
              <span className="font-medium text-foreground/70">{stats.libraryCount}</span> 知识库
            </span>
          </div>

          {/* Right: AI badge + shortcut hint */}
          <div className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold border ${
                isWechat
                  ? 'bg-violet-500/10 border-violet-500/15 text-violet-600 dark:text-violet-400'
                  : 'bg-rose-500/10 border-rose-500/15 text-rose-600 dark:text-rose-400'
              }`}
            >
              <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
              AI Powered
            </span>
            <span className="hidden lg:flex items-center gap-1 text-[9px] text-muted-foreground/40" aria-hidden="true">
              <Keyboard className="h-2.5 w-2.5" />
              <kbd className="inline-flex items-center justify-center min-w-[18px] h-4 rounded border bg-muted/50 px-0.5 font-mono text-[9px]">⌘K</kbd>
            </span>
          </div>
        </div>
      </div>

      {/* Safe area padding for notched devices */}
      <div className="pb-safe" aria-hidden="true" />
    </footer>
  );
}
