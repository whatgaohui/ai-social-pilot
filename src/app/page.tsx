"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { KnowledgeBase } from "@/components/left-panel/knowledge-base";
import { CompactCalendar } from "@/components/left-panel/compact-calendar";
import { CopywritingTemplates } from "@/components/left-panel/copywriting-templates";
import { XiaohongshuTemplates } from "@/components/right-panel/xiaohongshu-templates";
import { ContentWorkspace } from "@/components/right-panel/content-workspace";
import { DataAndReports } from "@/components/right-panel/data-and-reports";
import { AccountCollector } from "@/components/right-panel/account-collector";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WelcomeOnboarding } from "@/components/welcome-onboarding";
import { NotificationBell } from "@/components/notification-center";
import { PlatformAccountPanel } from "@/components/platform-account-panel";
import { AIWritingAssistant } from "@/components/ai-writing-assistant";
import { SettingsCenter } from "@/components/settings-center";
import {
  Sparkles, BookOpen, PenTool, CalendarDays,
  BarChart3, Zap, FileText,
  Settings, Globe, User, Check, Search,
  HelpCircle,
} from "lucide-react";
import { CommandPalette } from "@/components/command-palette";
import { ContentSearch } from "@/components/content-search";
import { KeyboardShortcutsDialog } from "@/components/keyboard-shortcuts-dialog";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useRipple } from "@/hooks/use-ripple";
import { ErrorBoundary } from "@/components/error-boundary";

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
  { key: 'workspace', label: '工作台', icon: FileText, panel: 'main', subTab: 'workspace' },
  { key: 'data', label: '数据', icon: BarChart3, panel: 'main', subTab: 'data' },
];

function DataInitializer() {
  const { setPersona, setKnowledgeItems, setCurrentPlan, setContentPosts } = useAppStore();
  const [loadingStage, setLoadingStage] = useState(0); // 0: config, 1: data, 2: ready
  const [progress, setProgress] = useState(0);

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
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" as const }}
          className="flex flex-col items-center gap-5"
        >
          {/* Animated Logo */}
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" as const }}
            className="relative"
          >
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200 dark:shadow-violet-900/40">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" as const }}
              >
                <Sparkles className="h-7 w-7 text-white" />
              </motion.div>
            </div>
          </motion.div>

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
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500"
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
      {/* Left Panel Tab Bar with animated underline */}
      <div className="px-3 pt-3 pb-2 border-b border-border/60">
        <div className="flex gap-1">
          {LEFT_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = leftPanelTab === tab.value;
            return (
              <motion.button
                key={tab.value}
                onClick={() => setLeftPanelTab(tab.value)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className={`relative flex-1 h-8 text-[11px] gap-1 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  isActive
                    ? 'text-foreground font-medium bg-muted/80'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <Icon className={`h-3 w-3 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                {tab.label}
                {tab.value === 'knowledge' && knowledgeItems.length > 0 && (
                  <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[9px] tabular-nums">
                    {knowledgeItems.length}
                  </Badge>
                )}
                {isActive && (
                  <motion.div
                    className="absolute bottom-0 left-1 right-1 h-[2px] rounded-full bg-gradient-to-r from-violet-500 to-purple-500 dark:from-violet-400 dark:to-purple-400"
                    layoutId="left-tab-underline"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Left Panel Content */}
      {leftPanelTab === 'calendar' ? (
        <CompactCalendar />
      ) : leftPanelTab === 'knowledge' ? (
        <ScrollArea className="flex-1 px-3 pb-3 smooth-scroll">
          <KnowledgeBase />
        </ScrollArea>
      ) : (
        <ScrollArea className="flex-1 px-3 pb-3 smooth-scroll">
          {isXHS ? <XiaohongshuTemplates /> : <CopywritingTemplates />}
        </ScrollArea>
      )}
    </div>
  );
}

// ─── Main Content Panel ───────────────────────────────────────────────────────

function MainContentPanel() {
  const { rightPanelTab, setRightPanelTab, platform, contentPosts, selectedPostId } = useAppStore();
  const [trackedAccountsCount, setTrackedAccountsCount] = useState(0);

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
      .catch(() => {});
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
      <div className="px-4 pt-3 pb-2 border-b border-border/60 flex-shrink-0">
        <Tabs value={effectiveTab} onValueChange={setRightPanelTab}>
          <TabsList className="w-full h-9 bg-muted/50 p-0.5 border border-border/40 shadow-sm">
            {MAIN_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex-1 h-8 text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/50 transition-all duration-200"
                >
                  <span className="relative inline-flex">
                    <Icon className="h-3.5 w-3.5" />
                    {tab.value === 'data' && unpublishedCount > 0 && (
                      <span className="absolute -top-1.5 -right-2.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-violet-500 text-[8px] font-bold text-white ring-1 ring-background">
                        {unpublishedCount > 9 ? '9+' : unpublishedCount}
                      </span>
                    )}
                    {tab.value === 'collect' && trackedAccountsCount > 0 && (
                      <span className="absolute -top-1.5 -right-2.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white ring-1 ring-background">
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

      {/* Tab Content - each tab gets full remaining height */}
      <div className="flex-1 min-h-0">
        {effectiveTab === 'workspace' && (
          <ContentWorkspace />
        )}
        {effectiveTab === 'data' && (
          <DataAndReports />
        )}
        {effectiveTab === 'collect' && (
          <AccountCollector selectedPost={selectedPost ? { id: selectedPost.id, topic: selectedPost.topic, platform: selectedPost.platform || '' } : null} />
        )}
      </div>
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
  const mobileTabIndexRef = useRef(mobileTabIndex);

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
      setLeftPanelTab(tab.subTab as 'calendar' | 'knowledge' | 'templates');
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
        .catch(() => {});
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
    <div className="min-h-screen flex flex-col bg-gradient-animated">
      <DataInitializer />
      {/* Top Header */}
      <header className="header-gradient-border border-b border-border/50 bg-background/90 backdrop-blur-2xl sticky top-0 z-50 shadow-[0_1px_3px_0] shadow-black/[0.03] hover:shadow-[0_2px_8px_0] shadow-black/[0.06] transition-all duration-300">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <motion.div
              className={`h-9 w-9 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg logo-hover-spin animate-breathe ${platform === 'wechat' ? 'from-violet-600 to-purple-600 shadow-violet-300/50 dark:shadow-violet-900/50' : 'from-red-500 to-rose-600 shadow-red-300/50 dark:shadow-red-900/50'}`}
              whileHover={{ scale: 1.08, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <Sparkles className="h-4.5 w-4.5 text-white" />
            </motion.div>
            <div>
              <h1 className="text-base font-bold">
                <span className="animate-gradient-text text-[15px]">
                  {platform === 'wechat' ? '朋友圈AI运营助手' : '小红书AI运营助手'}
                </span>
              </h1>
              <p className="text-[10px] text-muted-foreground -mt-0.5">{platform === 'wechat' ? '个人IP打造 · 全自动内容规划' : '爆款内容打造 · 全自动笔记生成'}</p>
            </div>
          </div>

          {/* Platform Switcher - Desktop */}
          <div className="hidden sm:flex items-center">
            <div className="relative flex items-center h-9 rounded-full bg-muted/70 p-0.5 border border-border/50 shadow-sm ambient-glow">
              {/* Glow backdrop for active platform */}
              <motion.div
                className="absolute h-9 w-1/2 rounded-full"
                layoutId="platform-glow"
                style={{ left: platform === 'wechat' ? '0' : '50%' }}
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              >
                <div className={`h-full w-full rounded-full blur-md ${platform === 'wechat' ? 'bg-green-400/30' : 'bg-red-400/30'}`} />
              </motion.div>
              <motion.div
                className="absolute h-7 rounded-full"
                layoutId="platform-indicator"
                style={{
                  width: 'calc(50% - 2px)',
                  left: platform === 'wechat' ? '2px' : 'calc(50%)',
                }}
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              >
                <div className={`h-full w-full rounded-full shadow-lg ${platform === 'wechat' ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-red-500 to-rose-500'}`} />
              </motion.div>
              <button
                onClick={() => setPlatform('wechat')}
                className={`relative z-10 flex items-center gap-1 px-3 h-7 rounded-full text-xs font-medium transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 hover:scale-100 magnetic-hover btn-press btn-shine ${platform === 'wechat' ? 'text-white' : 'text-green-600 hover:text-green-700'}`}
              >
                <motion.span
                  className="h-2 w-2 rounded-full bg-green-400"
                  animate={platform === 'wechat' ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                />
                朋友圈
              </button>
              <button
                onClick={() => setPlatform('xiaohongshu')}
                className={`relative z-10 flex items-center gap-1 px-3 h-7 rounded-full text-xs font-medium transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 hover:scale-100 magnetic-hover btn-press btn-shine ${platform === 'xiaohongshu' ? 'text-white' : 'text-red-600 hover:text-red-700'}`}
              >
                <motion.span
                  className="h-2 w-2 rounded-full bg-red-400"
                  animate={platform === 'xiaohongshu' ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                />
                小红书
              </button>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            {/* Command Palette trigger — ⌘K */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCommandPaletteOpen(true)}
              className="flex items-center gap-2 h-8 px-3 rounded-lg border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground text-xs transition-colors btn-ripple press-scale btn-press btn-shine"
              aria-label="命令面板"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden md:inline">搜索</span>
              <kbd className="hidden md:inline-flex h-5 min-w-5 items-center justify-center rounded border bg-background px-1 font-mono text-[10px] text-muted-foreground">
                ⌘K
              </kbd>
            </motion.button>

            {isGenerating && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs"
              >
                <span className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
                AI正在生成内容...
              </motion.div>
            )}
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setShortcutsOpen(true)}
                    className="flex items-center justify-center h-7 w-7 rounded-full border border-border/60 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
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
                  <SettingsCenter connectedPlatforms={connectedPlatforms} />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <p>设置中心</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Badge variant="outline" className="hidden md:inline-flex text-[10px] gap-1 px-1.5 py-0 pulse-soft">
              <Zap className="h-2.5 w-2.5 text-amber-500" />
              <span className="hidden lg:inline">AI驱动</span>
            </Badge>
          </div>

          {/* Visual divider between settings area and notifications */}
          <div className="hidden sm:block w-px h-5 bg-border/50" />

          {/* Notification Bell - pulse ring when unread */}
          <div className={notifications.filter(n => !n.read).length > 0 ? 'animate-pulse-glow rounded-lg' : ''}>
            <NotificationBell />
          </div>
        </div>

        {/* Mobile: compact header - platform switcher moved to floating nav */}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {showWelcome ? (
          <div className="h-full">
            <WelcomeOnboarding onComplete={() => setOnboardingCompleted(true)} />
          </div>
        ) : (
          <>
            {/* Desktop: Two-panel resizable layout */}
            <div className="hidden sm:block h-full">
              <ResizablePanelGroup direction="horizontal" className="h-full">
                {/* Left Sidebar */}
                <ResizablePanel defaultSize={24} minSize={20} maxSize={32}>
                  <div className="h-full border-r bg-background/60 backdrop-blur-sm">
                    <ErrorBoundary lightweight sectionName="左侧面板">
                      <LeftSidebar />
                    </ErrorBoundary>
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle className="bg-border/50 hover:bg-primary/20 transition-colors drag-handle" />

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
      </main>

      {/* ─── Floating Bottom Navigation (Mobile Only) ────────────────────── */}
      <div className="sm:hidden fixed z-50 left-1/2 -translate-x-1/2 bottom-[max(env(safe-area-inset-bottom,0px)+0.75rem,0.75rem)]">
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring' as const, stiffness: 300, damping: 30, delay: 0.2 }}
          className="flex items-center gap-0.5 px-1 py-1 rounded-[1.5rem] bg-background/75 backdrop-blur-2xl saturate-200 border border-white/15 dark:border-white/[0.08] shadow-[0_-1px_8px_rgba(0,0,0,0.06),0_8px_40px_rgba(0,0,0,0.14)] dark:shadow-[0_-1px_8px_rgba(0,0,0,0.15),0_8px_40px_rgba(0,0,0,0.5)]"
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
                  ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] ring-2 ring-green-500/30 animate-breathe'
                  : 'bg-green-400/40'
              }`} />
            </button>
            <button
              onClick={() => setPlatform('xiaohongshu')}
              className="relative flex items-center justify-center"
              aria-label="切换到小红书"
            >
              <span className={`h-3 w-3 rounded-full transition-all duration-200 ${
                platform === 'xiaohongshu'
                  ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] ring-2 ring-red-500/30 animate-breathe'
                  : 'bg-red-400/40'
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
                  onClick={() => handleMobileTabChange(index)}
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
                    <motion.div
                      animate={isActive ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                      transition={{ duration: 0.5, ease: "easeInOut", repeat: isActive ? Infinity : 0, repeatDelay: 1.5 }}
                    >
                      <Icon className="h-[18px] w-[18px] mx-auto" />
                    </motion.div>
                  </span>
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
      <ContentSearch
        open={contentSearchOpen}
        onOpenChange={setContentSearchOpen}
      />

      {/* Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

      {/* Platform Account Panel Dialog */}
      <PlatformAccountPanel
        open={accountPanelOpen}
        onOpenChange={setAccountPanelOpen}
        connectedCount={connectedPlatforms}
        totalCount={2}
      />

      {/* AI Writing Assistant FAB */}
      <AIWritingAssistant />

      {/* Footer */}
      <footer className="hidden sm:block footer-gradient-border bg-background/85 backdrop-blur-xl py-2 px-4 mt-auto pb-safe animate-slide-in-bottom">
        <div className="flex items-center justify-between text-[9px] text-muted-foreground/70">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="h-1.5 w-1.5 rounded-full bg-emerald-500"
            />
            <span className="font-medium text-foreground/40">{platform === 'wechat' ? '朋友圈AI运营助手' : '小红书AI运营助手'}</span>
            <span className="text-foreground/30">·</span>
            <span>{platform === 'wechat' ? '让每条朋友圈都有价值' : '让每篇笔记都成爆款'}</span>
          </div>
          <span className="flex items-center gap-2">
            <span className="version-badge">v2.1</span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full ai-badge-pulse bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/15">
              <Sparkles className="h-3 w-3 text-violet-500" />
              <span className="font-medium text-violet-600 dark:text-violet-400">AI Powered</span>
            </span>
          </span>
        </div>
      </footer>
    </div>
  );
}
