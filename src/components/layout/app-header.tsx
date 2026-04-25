"use client";

import { motion } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  LazySettingsCenter,
} from "@/components/lazy-components";
import {
  Sparkles, Zap, Search,
  HelpCircle,
} from "lucide-react";

const NotificationPing = dynamic(() => import("@/components/notification-ping").then(m => ({ default: m.NotificationPing })), { ssr: false });
const EnhancedNotificationBell = dynamic(() => import("@/components/notification-center-enhanced").then(m => ({ default: m.EnhancedNotificationBell })), { ssr: false });

// ─── App Header ───────────────────────────────────────────────────────────────

interface AppHeaderProps {
  platform: string;
  setPlatform: (platform: string) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;
  connectedPlatforms: number;
  setSettingsCenterOpen: (open: boolean) => void;
  notifications: Array<{ read: boolean }>;
}

export function AppHeader({
  platform,
  setPlatform,
  setCommandPaletteOpen,
  setShortcutsOpen,
  connectedPlatforms,
  notifications,
}: AppHeaderProps) {
  const isXHS = platform === 'xiaohongshu';

  return (
    <header role="banner" className="border-b border-border/30 bg-background/95 backdrop-blur-xl sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-3">
          <div
            className={`h-9 w-9 rounded-xl bg-gradient-to-br flex items-center justify-center ${platform === 'wechat' ? 'from-violet-600 to-purple-600' : 'from-red-500 to-rose-600'}`}
          >
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold">
              <span className={isXHS ? 'text-rose-600 dark:text-rose-400' : 'text-violet-600 dark:text-violet-400'}>
                {platform === 'wechat' ? '朋友圈AI运营助手' : '小红书AI运营助手'}
              </span>
            </h1>
            <p className="text-xs text-muted-foreground -mt-0.5">{platform === 'wechat' ? '个人IP打造 · 全自动内容规划' : '爆款内容打造 · 全自动笔记生成'}</p>
          </div>
        </div>

        {/* Platform Switcher - Desktop */}
        <div className="hidden sm:flex items-center">
          <div className="relative flex items-center h-8 rounded-lg bg-muted/60 p-0.5 border border-border/20">
            <motion.div
              className="absolute h-7 rounded-md"
              layoutId="platform-indicator"
              style={{
                width: 'calc(50% - 2px)',
                left: platform === 'wechat' ? '2px' : 'calc(50%)',
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              <div className={`h-full w-full rounded-md shadow-sm transition-colors duration-300 ${platform === 'wechat' ? 'bg-violet-500' : 'bg-rose-500'}`} />
            </motion.div>
            <button
              onClick={() => setPlatform('wechat')}
              className={`relative z-10 flex items-center gap-1.5 px-3 h-7 rounded-md text-xs font-medium transition-colors duration-200 ${platform === 'wechat' ? 'text-white' : 'text-muted-foreground hover:text-foreground'}`}
              aria-label="切换到朋友圈模式"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              朋友圈
            </button>
            <button
              onClick={() => setPlatform('xiaohongshu')}
              className={`relative z-10 flex items-center gap-1.5 px-3 h-7 rounded-md text-xs font-medium transition-colors duration-200 ${platform === 'xiaohongshu' ? 'text-white' : 'text-muted-foreground hover:text-foreground'}`}
              aria-label="切换到小红书模式"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              小红书
            </button>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          {/* Command Palette trigger — ⌘K */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="group flex items-center gap-2 h-8 px-3 rounded-lg border border-border/30 bg-muted/40 hover:bg-muted/70 text-muted-foreground hover:text-foreground text-xs transition-colors duration-200 cursor-pointer focus-ring-soft"
            aria-label="命令面板"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden md:inline">搜索</span>
            <kbd className="hidden md:inline-flex h-5 min-w-5 items-center justify-center rounded border border-border/30 bg-background/80 px-1 font-mono text-[10px] text-muted-foreground">
              ⌘K
            </kbd>
          </button>

          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShortcutsOpen(true)}
                  className="flex items-center justify-center h-7 w-7 rounded-lg bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label="快捷键帮助"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                </motion.button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p>快捷键 (⌘/)</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <LazySettingsCenter connectedPlatforms={connectedPlatforms} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p>设置中心</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Badge variant="outline" className="hidden md:inline-flex items-center text-[10px] gap-1 px-1.5 py-0 border-border/30 bg-background text-muted-foreground">
            <Zap className="h-2.5 w-2.5 text-amber-500" />
            <span className="hidden lg:inline font-medium">AI驱动</span>
          </Badge>
        </div>

        {/* Visual divider between settings area and notifications */}
        <div className="hidden sm:block w-px h-5 bg-border/50" />

        {/* Notification Bell - Enhanced with category system */}
        <div className="relative">
          <EnhancedNotificationBell />
          {notifications.filter(n => !n.read).length > 0 && (
            <div className="absolute -top-1 -right-1 z-10">
              <NotificationPing />
            </div>
          )}
        </div>
      </div>

      {/* Mobile: compact header - platform switcher moved to floating nav */}
    </header>
  );
}
