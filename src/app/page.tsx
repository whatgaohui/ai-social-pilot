"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const KnowledgeBase = dynamic(() => import("@/components/left-panel/knowledge-base").then(m => ({ default: m.KnowledgeBase })), { ssr: false, loading: () => <Skeleton className="h-full w-full" /> });
const CompactCalendar = dynamic(() => import("@/components/left-panel/compact-calendar").then(m => ({ default: m.CompactCalendar })), { ssr: false, loading: () => <Skeleton className="h-48" /> });
const CopywritingTemplates = dynamic(() => import("@/components/left-panel/copywriting-templates").then(m => ({ default: m.CopywritingTemplates })), { ssr: false, loading: () => <Skeleton className="h-full" /> });
const XiaohongshuTemplates = dynamic(() => import("@/components/right-panel/xiaohongshu-templates").then(m => ({ default: m.XiaohongshuTemplates })), { ssr: false, loading: () => <Skeleton className="h-full" /> });
const TemplateMarketplace = dynamic(() => import("@/components/template-marketplace").then(m => ({ default: m.TemplateMarketplace })), { ssr: false, loading: () => <Skeleton className="h-full" /> });
const AIPromptLibrary = dynamic(() => import("@/components/ai-prompt-library").then(m => ({ default: m.AIPromptLibrary })), { ssr: false, loading: () => <Skeleton className="h-full" /> });
const CalendarThemeSelector = dynamic(() => import("@/components/calendar-theme-selector").then(m => ({ default: m.CalendarThemeSelector })), { ssr: false, loading: () => <Skeleton className="h-10 w-full" /> });
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LazySettingsCenter,
  LazyCommandPalette,
  LazyContentSearch,
  LazyKeyboardShortcutsDialog,
  LazyPlatformAccountPanel,
  LazyAIWritingAssistant,
  LazyWelcomeOnboarding,
  LazyDashboardOverview,
  LazyContentWorkspace,
  LazyDataAndReports,
  LazyAccountCollector,
  LazyFloatingActionBar,
} from "@/components/lazy-components";
import {
  Sparkles, BookOpen, PenTool, CalendarDays,
  BarChart3, Zap, FileText, Wand2,
  Settings, Globe, User, Check, Search,
  HelpCircle,
} from "lucide-react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
const ErrorBoundary = dynamic(() => import("@/components/error-boundary").then(m => ({ default: m.ErrorBoundary })), { ssr: false });
const PageTransition = dynamic(() => import("@/components/page-transition").then(m => ({ default: m.PageTransition })), { ssr: false });
const NotificationPing = dynamic(() => import("@/components/notification-ping").then(m => ({ default: m.NotificationPing })), { ssr: false });
const EnhancedNotificationBell = dynamic(() => import("@/components/notification-center-enhanced").then(m => ({ default: m.EnhancedNotificationBell })), { ssr: false });
const QuickStatsFloat = dynamic(() => import("@/components/quick-stats-float").then(m => ({ default: m.QuickStatsFloat })), { ssr: false });
const EnhancedFooter = dynamic(() => import("@/components/enhanced-footer").then(m => ({ default: m.EnhancedFooter })), { ssr: false });
import { AccessibilityAnnouncer, announce } from "@/components/ui/accessibility-announcer";
import { useSmartReminders } from "@/hooks/use-smart-reminders";
import { useAchievements } from "@/components/achievement-toast";
import { ShortcutManagerProvider } from "@/hooks/use-keyboard-shortcuts";

// ─── Notification Enhancement Hooks ──────────────────────────────────────
function NotificationHooks() {
  useSmartReminders();
  useAchievements();
  return null;
}

// ─── Main tabs for the right content area ──────────────────────────────────────

const MAIN_TABS = [
  { value: 'workspace', icon: PenTool, label: '内容工作台' },
  { value: 'data', icon: BarChart3, label: '数据与报告' },
  { value: 'collect', icon: Globe, label: '采集中心' },
] as const;

// ─── Left sidebar tabs ────────────────────────────────────────────────────────

const LEFT_TABS = [
  { value: 'calendar', icon: CalendarDays, label: '日历' },
  { value: 'knowledge', icon: BookOpen, label: '知识库' },
  { value: 'templates', icon: FileText, label: '模板' },
  { value: 'marketplace', icon: Sparkles, label: '市场' },
  { value: 'prompts', icon: Wand2, label: '提示词' },
] as const;

// ─── Mobile bottom navigation tabs ───────────────────────────────────────────

interface MobileTabConfig {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  panel: 'left' | 'main';
  subTab: string;
}

const MOBILE_TABS: MobileTabConfig[] = [
  { key: 'persona', label: '人设', icon: User, panel: 'left', subTab: 'knowledge' },
  { key: 'calendar', label: '日历', icon: CalendarDays, panel: 'left', subTab: 'calendar' },
  { key: 'marketplace', label: '市场', icon: Sparkles, panel: 'left', subTab: 'marketplace' },
  { key: 'workspace', label: '工作台', icon: FileText, panel: 'main', subTab: 'workspace' },
  { key: 'data', label: '数据', icon: BarChart3, panel: 'main', subTab: 'data' },
];

function DataInitializer() {
  const { setPersona, setKnowledgeItems, setCurrentPlan, setContentPosts } = useAppStore();
  const [loadingStage, setLoadingStage] = useState(0); // 0: config, 1: data, 2: ready
  const [progress, setProgress] = useState(0);
  const [savedPlatform, setSavedPlatform] = useState<string | null>(null);
  useEffect(() => {
    try { setSavedPlatform(localStorage.getItem('platform-storage')); } catch {}
  }, []);

  const LOADING_STEPS = [
    { label: "加载配置...", icon: Settings },
    { label: "获取数据...", icon: Zap },
    { label: "准备就绪", icon: Check },
  ];

  useEffect(() => {
    const stageTimers = [
      setTimeout(() => setLoadingStage(1), 400),
      setTimeout(() => setLoadingStage(2), 900),
    ];
    return () => { stageTimers.forEach(clearTimeout); };
  }, []);

  // Smooth progress animation
  useEffect(() => {
    const target = loadingStage === 0 ? 30 : loadingStage === 1 ? 70 : 100;
    let raf: number;
    const animate = () => {
      setProgress((prev) => {
        if (prev < target) {
          const next = Math.min(prev + (target - prev) * 0.12 + 0.5, target);
          raf = requestAnimationFrame(animate);
          return next;
        }
        return target;
      });
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [loadingStage]);

  useEffect(() => {
    async function init() {
      try {
        const [personaRes, knowledgeRes, plansRes] = await Promise.all([
          fetch("/api/persona"),
          fetch("/api/knowledge"),
          fetch("/api/plan"),
        ]);

        if (personaRes.ok) {
          const persona = await personaRes.json();
          if (persona) setPersona(persona);
        }
        if (knowledgeRes.ok) {
          const items = await knowledgeRes.json();
          setKnowledgeItems(items);
        }
        if (plansRes.ok) {
          const plans = await plansRes.json();
          if (plans.length > 0) {
            const activePlan = plans.find((p: { status: string }) => p.status === "active") || plans[0];
            setCurrentPlan(activePlan);
            if (activePlan.posts) {
              setContentPosts(activePlan.posts);
            }
          }
        }
      } catch (e) {
        console.error("Failed to initialize data:", e);
      } finally {
        setLoadingStage(2);
      }
    }
    init();
  }, [setPersona, setKnowledgeItems, setCurrentPlan, setContentPosts]);

  const isReady = loadingStage === 2 && progress >= 98;

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        {/* 顶部加载进度条 */}
        <div className="loading-bar-top" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" as const }}
          className="flex flex-col items-center gap-5"
        >
          {/* Logo */}
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200 dark:shadow-violet-900/40">
            <Sparkles className="h-7 w-7 text-white" />
          </div>

          {/* Step text with fade transition */}
          <div className="relative h-5 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.p
                key={loadingStage}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="text-sm text-muted-foreground font-medium"
              >
                {LOADING_STEPS[loadingStage].label}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Progress bar */}
          <div className="w-40 h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${savedPlatform === 'xiaohongshu' ? 'from-rose-500 to-pink-500' : 'from-violet-500 to-purple-500'}`}
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.15 }}
            />
          </div>

          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {LOADING_STEPS.map((step, i) => {
              const StepIcon = step.icon;
              const isCompleted = i < loadingStage;
              const isActive = i === loadingStage;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    transition: { delay: i * 0.1 },
                  }}
                >
                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center transition-colors duration-300 ${
                      isCompleted
                        ? "bg-emerald-100 dark:bg-emerald-900/30"
                        : isActive
                          ? "bg-violet-100 dark:bg-violet-900/30"
                          : "bg-muted"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <StepIcon
                        className={`h-3 w-3 ${
                          isActive ? "text-violet-500" : "text-muted-foreground/50"
                        }`}
                      />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}

// ─── Left Sidebar ─────────────────────────────────────────────────────────────

function LeftSidebar() {
  const { leftPanelTab, setLeftPanelTab, platform, knowledgeItems } = useAppStore();
  const isXHS = platform === 'xiaohongshu';

  return (
    <div className="flex flex-col h-full">
      {/* Left Panel Tab Bar */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex gap-1" role="tablist">
          {LEFT_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = leftPanelTab === tab.value;
            return (
              <button
                key={tab.value}
                role="tab"
                aria-selected={isActive}
                onClick={() => setLeftPanelTab(tab.value)}
                className={`relative flex-1 h-8 text-xs gap-1 rounded-md flex items-center justify-center transition-colors duration-200 cursor-pointer ${
                  isActive
                    ? `font-medium ${isXHS
                      ? 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30'
                      : 'text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/30'}`
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                {tab.value === 'knowledge' && knowledgeItems.length > 0 && (
                  <span
                    className={`ml-0.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[9px] font-semibold ${isXHS
                      ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300'
                      : 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300'}`}
                  >
                    {knowledgeItems.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Left Panel Content */}
      {leftPanelTab === 'calendar' ? (
        <ScrollArea className="flex-1 px-3 pb-3 smooth-scroll sidebar-scroll">
          <CompactCalendar />
          <CalendarThemeSelector />
        </ScrollArea>
      ) : leftPanelTab === 'knowledge' ? (
        <ScrollArea className="flex-1 px-3 pb-3 smooth-scroll sidebar-scroll">
          <KnowledgeBase />
        </ScrollArea>
      ) : leftPanelTab === 'templates' ? (
        <ScrollArea className="flex-1 px-3 pb-3 smooth-scroll sidebar-scroll">
          {isXHS ? <XiaohongshuTemplates /> : <CopywritingTemplates />}
        </ScrollArea>
      ) : leftPanelTab === 'marketplace' ? (
        <ScrollArea className="flex-1 px-3 pb-3 smooth-scroll sidebar-scroll">
          <TemplateMarketplace />
        </ScrollArea>
      ) : (
        <ScrollArea className="flex-1 px-3 pb-3 smooth-scroll sidebar-scroll">
          <AIPromptLibrary />
        </ScrollArea>
      )}
    </div>
  );
}

// ─── Main Content Panel ───────────────────────────────────────────────────────

function MainContentPanel() {
  const { rightPanelTab, setRightPanelTab, platform, contentPosts, selectedPostId } = useAppStore();
  const [trackedAccountsCount, setTrackedAccountsCount] = useState(0);
  const isXHS = platform === 'xiaohongshu';

  // Derive selected post from store
  const selectedPost = selectedPostId
    ? contentPosts.find((p) => p.id === selectedPostId)
    : null;

  // Notification badge counts
  const unpublishedCount = contentPosts.filter((p) => p.status !== 'published').length;

  // Fetch tracked accounts count
  useEffect(() => {
    fetch("/api/tracked-accounts")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setTrackedAccountsCount(Array.isArray(data) ? data.length : 0);
      })
      .catch((e) => console.error('[tracked-accounts] load failed:', e));
  }, []);

  // Map old tab values to new ones for backward compatibility
  const effectiveTab = ['workspace', 'data', 'collect'].includes(rightPanelTab)
    ? rightPanelTab
    : rightPanelTab === 'optimize'
      ? 'workspace' // redirect old AI tab to workspace
      : 'workspace';

  return (
    <div className="flex flex-col h-full">
      {/* Main Tab Bar */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <Tabs value={effectiveTab} onValueChange={setRightPanelTab}>
          <TabsList className="w-full h-9 bg-muted/40 p-0.5 border border-border/40 rounded-lg">
            {MAIN_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex-1 h-8 text-xs gap-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:font-medium transition-colors duration-200"
                >
                  <span className="relative inline-flex">
                    <Icon className="h-3.5 w-3.5" />
                    {tab.value === 'data' && unpublishedCount > 0 && (
                      <span className={`absolute -top-1.5 -right-2.5 flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white ${isXHS ? 'bg-rose-500' : 'bg-violet-500'}`}>
                        {unpublishedCount > 9 ? '9+' : unpublishedCount}
                      </span>
                    )}
                    {tab.value === 'collect' && trackedAccountsCount > 0 && (
                      <span className={`absolute -top-1.5 -right-2.5 flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white ${isXHS ? 'bg-rose-500' : 'bg-violet-500'}`}>
                        {trackedAccountsCount > 9 ? '9+' : trackedAccountsCount}
                      </span>
                    )}
                  </span>
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      {/* Dashboard Overview - collapsible, only in workspace tab */}
      {effectiveTab === 'workspace' && <LazyDashboardOverview />}

      {/* Tab Content - each tab gets full remaining height */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {effectiveTab === 'workspace' && (
          <LazyContentWorkspace />
        )}
        {effectiveTab === 'data' && (
          <LazyDataAndReports />
        )}
        {effectiveTab === 'collect' && (
          <LazyAccountCollector selectedPost={selectedPost ? { id: selectedPost.id, topic: selectedPost.topic, platform: selectedPost.platform || '' } : null} />
        )}
      </div>
    </div>
  );
}

// ─── Scroll Progress Indicator ──────────────────────────────────────────────

function ScrollProgressIndicator() {
  const [progress, setProgress] = useState(0);
  const platform = useAppStore((s) => s.platform);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        setProgress((scrollTop / docHeight) * 100);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className="fixed top-0 left-0 z-[60] h-0.5 w-full pointer-events-none"
      aria-hidden="true"
    >
      <motion.div
        className={`h-full bg-gradient-to-r ${platform === 'xiaohongshu' ? 'from-rose-500 to-pink-500' : 'from-violet-500 to-purple-500'}`}
        style={{ width: `${progress}%` }}
        transition={{ duration: 0 }}
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const { isGenerating, persona, platform, setPlatform, rightPanelTab, setRightPanelTab, leftPanelTab, setLeftPanelTab, contentPosts, accountPanelOpen, setAccountPanelOpen, onboardingCompleted, setOnboardingCompleted, onboardingInit, setSettingsCenterOpen, commandPaletteOpen, setCommandPaletteOpen, notifications } = useAppStore();
  const [connectedPlatforms, setConnectedPlatforms] = useState(0);
  const [mobileTabIndex, setMobileTabIndex] = useState(1); // default: 日历
  const [swipeDirection, setSwipeDirection] = useState(0);
  const [contentSearchOpen, setContentSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const isXHS = platform === 'xiaohongshu';
  const mobileTabIndexRef = useRef(mobileTabIndex);

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
  const lastTabTapRef = useRef<{ tab: number; time: number }>({ tab: -1, time: 0 });
  const [hapticPulse, setHapticPulse] = useState<string | null>(null);

  // Keep ref in sync for stable drag handler
  useEffect(() => { mobileTabIndexRef.current = mobileTabIndex; }, [mobileTabIndex]);

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

  const handleMobileTabChange = useCallback((newIndex: number) => {
    const newTab = MOBILE_TABS[newIndex];
    const currentIndex = mobileTabIndexRef.current;
    setSwipeDirection(newIndex > currentIndex ? 1 : -1);

    // Set sub-tabs immediately for correct rendering
    if (newTab.panel === 'left') {
      setLeftPanelTab(newTab.subTab as 'calendar' | 'knowledge' | 'templates');
    } else {
      setRightPanelTab(newTab.subTab as 'workspace' | 'data' | 'collect');
    }

    setMobileTabIndex(newIndex);
  }, [setLeftPanelTab, setRightPanelTab]);

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
    <div className="min-h-screen flex flex-col bg-background">
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
      {/* Top Header — Enhanced with gradient accent */}
      <header role="banner" className="border-b border-border/50 bg-background/95 backdrop-blur-xl sticky top-0 z-50">
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
            <div className="relative flex items-center h-8 rounded-lg bg-muted/60 p-0.5 border border-border/40">
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
              className="group flex items-center gap-2 h-8 px-3 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted/70 hover:border-border text-muted-foreground hover:text-foreground text-xs transition-colors duration-200 cursor-pointer focus-ring-soft"
              aria-label="命令面板"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden md:inline">搜索</span>
              <kbd className="hidden md:inline-flex h-5 min-w-5 items-center justify-center rounded border border-border/50 bg-background/80 px-1 font-mono text-[10px] text-muted-foreground">
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
                    className="flex items-center justify-center h-7 w-7 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
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
            <Badge variant="outline" className="hidden md:inline-flex items-center text-[10px] gap-1 px-1.5 py-0 border-border/60 bg-background text-muted-foreground">
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
              <ResizablePanelGroup direction="horizontal" className="h-full card-gradient-border">
                {/* Left Sidebar */}
                <ResizablePanel defaultSize={24} minSize={20} maxSize={32}>
                  <div className="h-full border-r bg-background/60 backdrop-blur-sm">
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
                    onDragEnd={handleMobileDragEnd}
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
              className="relative flex items-center justify-center"
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
              className="relative flex items-center justify-center"
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
