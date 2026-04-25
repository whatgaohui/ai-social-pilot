"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import dynamic from "next/dynamic";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import {
  LazySettingsCenter,
  LazyCommandPalette,
  LazyContentSearch,
  LazyKeyboardShortcutsDialog,
  LazyPlatformAccountPanel,
  LazyAIWritingAssistant,
  LazyWelcomeOnboarding,
  LazyFloatingActionBar,
} from "@/components/lazy-components";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
const ErrorBoundary = dynamic(() => import("@/components/error-boundary").then(m => ({ default: m.ErrorBoundary })), { ssr: false });
const PageTransition = dynamic(() => import("@/components/page-transition").then(m => ({ default: m.PageTransition })), { ssr: false });
const QuickStatsFloat = dynamic(() => import("@/components/quick-stats-float").then(m => ({ default: m.QuickStatsFloat })), { ssr: false });
const EnhancedFooter = dynamic(() => import("@/components/enhanced-footer").then(m => ({ default: m.EnhancedFooter })), { ssr: false });
import { AccessibilityAnnouncer, announce } from "@/components/ui/accessibility-announcer";
import { ShortcutManagerProvider } from "@/hooks/use-keyboard-shortcuts";

// Layout components
import { DataInitializer } from "@/components/layout/data-initializer";
import { LeftSidebar } from "@/components/layout/left-sidebar";
import { MainContentPanel } from "@/components/layout/main-content-panel";
import { ScrollProgressIndicator } from "@/components/layout/scroll-progress-indicator";
import { MobileBottomNav, MOBILE_TABS } from "@/components/layout/mobile-bottom-nav";
import { AppHeader } from "@/components/layout/app-header";
import { NotificationHooks } from "@/components/layout/notification-hooks";

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const { platform, setPlatform, rightPanelTab, setRightPanelTab, leftPanelTab, setLeftPanelTab, contentPosts, accountPanelOpen, setAccountPanelOpen, onboardingCompleted, setOnboardingCompleted, onboardingInit, setSettingsCenterOpen, commandPaletteOpen, setCommandPaletteOpen, notifications } = useAppStore();
  const [connectedPlatforms, setConnectedPlatforms] = useState(0);
  const [mobileTabIndex, setMobileTabIndex] = useState(1); // default: 日历
  const [swipeDirection, setSwipeDirection] = useState(0);
  const [contentSearchOpen, setContentSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Listen for custom shortcuts-help event from command palette
  useEffect(() => {
    const handler = () => setShortcutsOpen(true);
    window.addEventListener("open-shortcuts-help", handler);
    return () => window.removeEventListener("open-shortcuts-help", handler);
  }, []);

  // Listen for custom open-content-search event from floating action bar
  useEffect(() => {
    const handler = () => setContentSearchOpen(true);
    window.addEventListener("open-content-search", handler);
    return () => window.removeEventListener("open-content-search", handler);
  }, []);

  // Announce shortcuts dialog state for screen readers
  useEffect(() => {
    if (shortcutsOpen) {
      announce("快捷键帮助面板已打开", "polite");
    }
  }, [shortcutsOpen]);

  // Announce command palette state for screen readers
  useEffect(() => {
    if (commandPaletteOpen) {
      announce("命令面板已打开，输入搜索关键词", "polite");
    }
  }, [commandPaletteOpen]);

  // Derive effective mobile panel from tab index
  const currentMobileTab = MOBILE_TABS[mobileTabIndex];
  const effectiveMobilePanel = currentMobileTab.panel;
  const unpublishedCount = contentPosts.filter((p) => p.status !== 'published').length;

  // Sync sub-tabs when mobile tab index changes
  useEffect(() => {
    const tab = MOBILE_TABS[mobileTabIndex];
    if (tab.panel === 'left') {
      setLeftPanelTab(tab.subTab as 'calendar' | 'knowledge' | 'templates' | 'marketplace' | 'prompts');
    } else {
      setRightPanelTab(tab.subTab as 'workspace' | 'data' | 'collect');
    }
  }, [mobileTabIndex, setLeftPanelTab, setRightPanelTab]);

  // Handle mobile tab change with swipe direction
  const handleMobileTabChange = (newIndex: number) => {
    setSwipeDirection(newIndex > mobileTabIndex ? 1 : -1);

    const newTab = MOBILE_TABS[newIndex];
    if (newTab.panel === 'left') {
      setLeftPanelTab(newTab.subTab as 'calendar' | 'knowledge' | 'templates' | 'marketplace' | 'prompts');
    } else {
      setRightPanelTab(newTab.subTab as 'workspace' | 'data' | 'collect');
    }

    setMobileTabIndex(newIndex);
  };

  // Keyboard shortcuts — Ctrl/Cmd+K opens CommandPalette, ⌘/ opens shortcuts help, etc.
  useKeyboardShortcuts({
    onOpenCommandPalette: () => setCommandPaletteOpen(!commandPaletteOpen),
    onOpenShortcuts: () => setShortcutsOpen(true),
    onTogglePlatform: () => setPlatform(platform === 'wechat' ? 'xiaohongshu' : 'wechat'),
  });

  // Open shortcuts help with ? key (when not in an input)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "?" && !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const showWelcome = !onboardingCompleted;

  // Poll platform account status periodically
  useEffect(() => {
    function checkStatus() {
      fetch("/api/platform-accounts")
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          const count = Array.isArray(data) ? data.filter((a: { status: string }) => a.status === "connected").length : 0;
          setConnectedPlatforms(count);
        })
        .catch((e) => console.error('[platform-accounts] load failed:', e));
    }
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Initialize onboarding state from localStorage (client-side only to avoid hydration mismatch)
  useEffect(() => {
    onboardingInit();
  }, [onboardingInit]);

  return (
    <ShortcutManagerProvider>
    <div className="min-h-screen flex flex-col bg-background" data-platform={platform}>
      {/* Scroll Progress Indicator */}
      <ScrollProgressIndicator />
      {/* Accessibility: Screen reader live regions */}
      <AccessibilityAnnouncer />
      {/* Skip navigation link for keyboard/screen reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:border focus:border-border focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:text-sm"
      >
        跳到主要内容
      </a>
      {/* Notification enhancement hooks */}
      <NotificationHooks />
      {/* 顶部加载进度条 */}
      <DataInitializer />
      {/* Top Header */}
      <AppHeader
        platform={platform}
        setPlatform={setPlatform}
        commandPaletteOpen={commandPaletteOpen}
        setCommandPaletteOpen={setCommandPaletteOpen}
        shortcutsOpen={shortcutsOpen}
        setShortcutsOpen={setShortcutsOpen}
        connectedPlatforms={connectedPlatforms}
        setSettingsCenterOpen={setSettingsCenterOpen}
        notifications={notifications}
      />

      {/* Main Content */}
      <main id="main-content" className="flex-1 overflow-hidden">
        <PageTransition>
        {showWelcome ? (
          <div className="h-full">
            <LazyWelcomeOnboarding onComplete={() => setOnboardingCompleted(true)} />
          </div>
        ) : (
          <>
            {/* Desktop: Two-panel resizable layout */}
            <div className="hidden sm:block h-full">
              <ResizablePanelGroup direction="horizontal" className="h-full">
                {/* Left Sidebar */}
                <ResizablePanel defaultSize={24} minSize={20} maxSize={32}>
                  <div className="h-full border-r border-border/30 bg-background/60 backdrop-blur-sm">
                    <ErrorBoundary lightweight sectionName="左侧面板">
                      <LeftSidebar />
                    </ErrorBoundary>
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle className="relative bg-border/30 hover:bg-primary/10 transition-all duration-300 drag-handle before:absolute before:inset-y-0 before:left-1/2 before:-translate-x-1/2 before:w-px before:bg-gradient-to-b before:from-transparent before:via-primary/20 before:to-transparent" />

                {/* Main Content Area */}
                <ResizablePanel defaultSize={76} minSize={55}>
                  <div className="h-full bg-background/95 backdrop-blur-sm">
                    <ErrorBoundary lightweight sectionName="内容工作台">
                      <MainContentPanel />
                    </ErrorBoundary>
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>

            {/* Mobile: Swipeable single panel view */}
            <div className="sm:hidden h-full overflow-hidden">
              <div className="relative h-full">
                <motion.div
                  key={mobileTabIndex}
                  initial={{ opacity: 0, x: swipeDirection * 200 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: 'spring' as const, stiffness: 400, damping: 35 }}
                  className="absolute inset-0 pb-24"
                >
                  <motion.div
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.15}
                    onDragEnd={(_e, info) => {
                      const swipeThreshold = 50;
                      const velocityThreshold = 500;
                      if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
                        if (mobileTabIndex < MOBILE_TABS.length - 1) {
                          handleMobileTabChange(mobileTabIndex + 1);
                        }
                      } else if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
                        if (mobileTabIndex > 0) {
                          handleMobileTabChange(mobileTabIndex - 1);
                        }
                      }
                    }}
                    className="h-full"
                  >
                    {effectiveMobilePanel === 'left' ? <LeftSidebar /> : <MainContentPanel />}
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </>
        )}
        </PageTransition>
      </main>

      {/* ─── Floating Bottom Navigation (Mobile Only) ────────────────────── */}
      <MobileBottomNav
        mobileTabIndex={mobileTabIndex}
        setMobileTabIndex={setMobileTabIndex}
        platform={platform}
        setPlatform={setPlatform}
        setLeftPanelTab={setLeftPanelTab}
        setRightPanelTab={setRightPanelTab}
        setSettingsCenterOpen={setSettingsCenterOpen}
        connectedPlatforms={connectedPlatforms}
        unpublishedCount={unpublishedCount}
      />

      {/* Content Search Dialog */}
      <LazyContentSearch
        open={contentSearchOpen}
        onOpenChange={setContentSearchOpen}
      />

      {/* Command Palette */}
      <LazyCommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />

      {/* Keyboard Shortcuts Dialog */}
      <LazyKeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

      {/* Platform Account Panel Dialog */}
      <LazyPlatformAccountPanel
        open={accountPanelOpen}
        onOpenChange={setAccountPanelOpen}
        connectedCount={connectedPlatforms}
        totalCount={2}
      />

      {/* Floating Quick Stats Widget */}
      <QuickStatsFloat />

      {/* Floating Action Bar (Desktop) */}
      {!showWelcome && <LazyFloatingActionBar />}

      {/* AI Writing Assistant FAB */}
      <LazyAIWritingAssistant />

      {/* Footer */}
      <EnhancedFooter />
    </div>
    </ShortcutManagerProvider>
  );
}
