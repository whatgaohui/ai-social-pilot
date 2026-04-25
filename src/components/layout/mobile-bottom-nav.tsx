"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import {
  Sparkles, BarChart3, FileText, CalendarDays,
  User, Settings,
} from "lucide-react";

// ─── Mobile bottom navigation tabs ───────────────────────────────────────────

export interface MobileTabConfig {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  panel: 'left' | 'main';
  subTab: string;
}

export const MOBILE_TABS: MobileTabConfig[] = [
  { key: 'persona', label: '人设', icon: User, panel: 'left', subTab: 'knowledge' },
  { key: 'calendar', label: '日历', icon: CalendarDays, panel: 'left', subTab: 'calendar' },
  { key: 'marketplace', label: '市场', icon: Sparkles, panel: 'left', subTab: 'marketplace' },
  { key: 'workspace', label: '工作台', icon: FileText, panel: 'main', subTab: 'workspace' },
  { key: 'data', label: '数据', icon: BarChart3, panel: 'main', subTab: 'data' },
];

// ─── Mobile Bottom Nav ───────────────────────────────────────────────────────

interface MobileBottomNavProps {
  mobileTabIndex: number;
  setMobileTabIndex: (index: number) => void;
  platform: string;
  setPlatform: (platform: string) => void;
  setLeftPanelTab: (tab: string) => void;
  setRightPanelTab: (tab: string) => void;
  setSettingsCenterOpen: (open: boolean) => void;
  connectedPlatforms: number;
  unpublishedCount: number;
}

export function MobileBottomNav({
  mobileTabIndex,
  setMobileTabIndex,
  platform,
  setPlatform,
  setLeftPanelTab,
  setRightPanelTab,
  setSettingsCenterOpen,
  connectedPlatforms,
  unpublishedCount,
}: MobileBottomNavProps) {
  const [hapticPulse, setHapticPulse] = useState<string | null>(null);
  const lastTabTapRef = useRef<{ tab: number; time: number }>({ tab: -1, time: 0 });
  const mobileTabIndexRef = useRef(mobileTabIndex);

  // Keep ref in sync for stable drag handler
  useEffect(() => { mobileTabIndexRef.current = mobileTabIndex; }, [mobileTabIndex]);

  const handleMobileTabChange = useCallback((newIndex: number) => {
    const newTab = MOBILE_TABS[newIndex];
    const currentIndex = mobileTabIndexRef.current;

    // Set sub-tabs immediately for correct rendering
    if (newTab.panel === 'left') {
      setLeftPanelTab(newTab.subTab as 'calendar' | 'knowledge' | 'templates');
    } else {
      setRightPanelTab(newTab.subTab as 'workspace' | 'data' | 'collect');
    }

    setMobileTabIndex(newIndex);
  }, [setLeftPanelTab, setRightPanelTab, setMobileTabIndex]);

  // Double-tap to scroll top on active mobile tab
  const handleMobileTabTap = useCallback((index: number) => {
    const now = Date.now();
    const last = lastTabTapRef.current;

    if (index === last.tab && now - last.time < 350) {
      // Double tap on same tab — scroll to top
      const mainEl = document.getElementById('main-content');
      if (mainEl) {
        mainEl.scrollTo({ top: 0, behavior: 'smooth' });
      }
      // Visual haptic pulse feedback
      setHapticPulse(MOBILE_TABS[index].key);
      setTimeout(() => setHapticPulse(null), 300);
      lastTabTapRef.current = { tab: -1, time: 0 };
      return;
    }

    lastTabTapRef.current = { tab: index, time: now };
    handleMobileTabChange(index);
  }, [handleMobileTabChange]);

  const handleMobileDragEnd = useCallback((
    _: MouseEvent | TouchEvent | PointerEvent,
    info: { offset: { x: number }; velocity: { x: number } }
  ) => {
    const currentIndex = mobileTabIndexRef.current;
    const swipeThreshold = 50;
    const velocityThreshold = 500;

    if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
      // Swiped left → next tab
      if (currentIndex < MOBILE_TABS.length - 1) {
        handleMobileTabChange(currentIndex + 1);
      }
    } else if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
      // Swiped right → previous tab
      if (currentIndex > 0) {
        handleMobileTabChange(currentIndex - 1);
      }
    }
  }, [handleMobileTabChange]);

  return (
    <div className="sm:hidden fixed z-50 left-1/2 -translate-x-1/2 bottom-[max(env(safe-area-inset-bottom,0px)+0.75rem,0.75rem)]">
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring' as const, stiffness: 300, damping: 30, delay: 0.2 }}
        className="flex items-center gap-0.5 px-1 py-1 rounded-[1.5rem] bg-background/80 backdrop-blur-xl saturate-200 border border-white/15 dark:border-white/[0.08] shadow-[0_-1px_8px_rgba(0,0,0,0.06),0_8px_40px_rgba(0,0,0,0.14)] dark:shadow-[0_-1px_8px_rgba(0,0,0,0.15),0_8px_40px_rgba(0,0,0,0.5)] before:absolute before:-top-px before:left-6 before:right-6 before:h-px before:bg-gradient-to-r before:from-transparent before:via-primary/30 before:to-transparent"
      >
        {/* Platform switcher dots */}
        <div className="flex items-center gap-1.5 px-2">
          <button
            onClick={() => setPlatform('wechat')}
            className="relative flex items-center justify-center min-w-[44px] min-h-[44px]"
            aria-label="切换到朋友圈"
          >
            <span className={`h-3 w-3 rounded-full transition-all duration-200 ${
              platform === 'wechat'
                ? 'bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)] ring-2 ring-violet-500/30'
                : 'bg-violet-400/40'
            }`} />
          </button>
          <button
            onClick={() => setPlatform('xiaohongshu')}
            className="relative flex items-center justify-center min-w-[44px] min-h-[44px]"
            aria-label="切换到小红书"
          >
            <span className={`h-3 w-3 rounded-full transition-all duration-200 ${
              platform === 'xiaohongshu'
                ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)] ring-2 ring-rose-500/30'
                : 'bg-rose-400/40'
            }`} />
          </button>
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-border/40" />

        {/* Tab buttons */}
        <div className="flex items-center relative">
          {MOBILE_TABS.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = mobileTabIndex === index;
            return (
              <motion.button
                key={tab.key}
                onClick={() => handleMobileTabTap(index)}
                whileTap={{ scale: 0.9 }}
                className={`relative flex flex-col items-center justify-center w-[3.25rem] h-12 rounded-2xl text-[10px] font-medium transition-colors duration-200 ${
                  isActive ? 'text-white' : 'text-muted-foreground'
                }`}
                aria-label={tab.label}
              >
                {/* Animated active indicator pill with glow */}
                {isActive && (
                  <motion.div
                    layoutId="mobile-tab-pill"
                    className="absolute inset-0 rounded-2xl overflow-hidden"
                    transition={{ type: 'spring' as const, stiffness: 400, damping: 30 }}
                  >
                    {/* Soft glow behind the pill */}
                    <motion.div
                      className="absolute -inset-1 rounded-3xl blur-md"
                      animate={{
                        opacity: 0.5,
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className={`h-full w-full rounded-3xl ${platform === 'wechat' ? 'bg-violet-400/40' : 'bg-rose-400/40'}`} />
                    </motion.div>
                    {/* Wechat gradient */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-600"
                      animate={{ opacity: platform === 'wechat' ? 1 : 0 }}
                      transition={{ duration: 0.25 }}
                    />
                    {/* Xiaohongshu gradient */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-br from-rose-500 to-red-600"
                      animate={{ opacity: platform === 'xiaohongshu' ? 1 : 0 }}
                      transition={{ duration: 0.25 }}
                    />
                  </motion.div>
                )}

                <span className="relative z-10">
                  <Icon className="h-[18px] w-[18px] mx-auto" />
                </span>
                  {/* Haptic pulse ring on double-tap */}
                  <AnimatePresence>
                    {hapticPulse === tab.key && (
                      <motion.div
                        initial={{ scale: 0.5, opacity: 0.8 }}
                        animate={{ scale: 2, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="absolute inset-0 rounded-full border-2 border-primary/60"
                      />
                    )}
                  </AnimatePresence>
                <span className="relative z-10 mt-0.5 leading-none">{tab.label}</span>

                {/* Small colored indicator dot for active tab */}
                {isActive && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring' as const, stiffness: 500, damping: 20 }}
                    className="absolute -top-0.5 left-1/2 -translate-x-1/2 z-20 h-1.5 w-1.5 rounded-full bg-white shadow-sm"
                  />
                )}

                {/* Notification badge on 数据 tab */}
                {tab.key === 'data' && unpublishedCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring' as const, stiffness: 500, damping: 25 }}
                    className="absolute top-0.5 right-1.5 z-20 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white px-1"
                  >
                    {unpublishedCount > 9 ? '9+' : unpublishedCount}
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-border/40" />

        {/* Settings button */}
        <button
          onClick={() => setSettingsCenterOpen(true)}
          className="flex items-center justify-center w-10 h-12 rounded-2xl text-muted-foreground transition-colors hover:text-foreground"
          aria-label="设置"
        >
          {connectedPlatforms > 0 ? (
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
          ) : (
            <Settings className="h-4 w-4" />
          )}
        </button>
      </motion.div>
    </div>
  );
}
