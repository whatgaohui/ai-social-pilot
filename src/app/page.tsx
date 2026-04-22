"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { KnowledgeBase } from "@/components/left-panel/knowledge-base";
import { CompactCalendar } from "@/components/left-panel/compact-calendar";
import { CopywritingTemplates } from "@/components/left-panel/copywriting-templates";
import { XiaohongshuTemplates } from "@/components/right-panel/xiaohongshu-templates";
import { ContentWorkspace } from "@/components/right-panel/content-workspace";
// AIOptimizePanel removed - AI tools have been integrated into ContentWorkspace
import { DataAndReports } from "@/components/right-panel/data-and-reports";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WelcomeOnboarding } from "@/components/welcome-onboarding";
import { NotificationBell } from "@/components/notification-center";
import { PlatformAccountPanel } from "@/components/platform-account-panel";
import { SettingsCenter } from "@/components/settings-center";
import {
  Sparkles, BookOpen, PenTool, CalendarDays,
  BarChart3, Zap, FileText, MessageCircle,
  Settings, Send, ChevronLeft, ChevronRight,
} from "lucide-react";

// ─── Main tabs for the right content area ──────────────────────────────────────

const MAIN_TABS = [
  { value: 'workspace', icon: PenTool, label: '内容工作台' },
  { value: 'data', icon: BarChart3, label: '数据与报告' },
] as const;

// ─── Left sidebar tabs ────────────────────────────────────────────────────────

const LEFT_TABS = [
  { value: 'calendar', icon: CalendarDays, label: '日历' },
  { value: 'knowledge', icon: BookOpen, label: '知识库' },
  { value: 'templates', icon: FileText, label: '模板' },
] as const;

function DataInitializer() {
  const { setPersona, setKnowledgeItems, setCurrentPlan, setContentPosts } = useAppStore();
  const [ready, setReady] = useState(false);

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
        setReady(true);
      }
    }
    init();
  }, [setPersona, setKnowledgeItems, setCurrentPlan, setContentPosts]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 animate-page-fade">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center animate-pulse shadow-lg shadow-violet-200 dark:shadow-violet-900/40">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <p className="text-sm text-muted-foreground">加载中...</p>
          <div className="w-32 h-1 rounded-full bg-muted overflow-hidden">
            <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 loading-bar" />
          </div>
        </div>
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
      <div className="px-3 pt-3 pb-2 border-b">
        <Tabs value={leftPanelTab} onValueChange={setLeftPanelTab}>
          <TabsList className="w-full h-8 bg-muted/50 p-0.5">
            {LEFT_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex-1 h-7 text-[11px] gap-1 data-[state=active]:bg-background shadow-sm"
                >
                  <Icon className="h-3 w-3" />
                  {tab.label}
                  {tab.value === 'knowledge' && knowledgeItems.length > 0 && (
                    <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[9px] tabular-nums">
                      {knowledgeItems.length}
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      {/* Left Panel Content */}
      {leftPanelTab === 'calendar' ? (
        <CompactCalendar />
      ) : leftPanelTab === 'knowledge' ? (
        <ScrollArea className="flex-1 px-3 pb-3">
          <KnowledgeBase />
        </ScrollArea>
      ) : (
        <ScrollArea className="flex-1 px-3 pb-3">
          {isXHS ? <XiaohongshuTemplates /> : <CopywritingTemplates />}
        </ScrollArea>
      )}
    </div>
  );
}

// ─── Main Content Panel ───────────────────────────────────────────────────────

function MainContentPanel() {
  const { rightPanelTab, setRightPanelTab, platform, contentPosts } = useAppStore();

  // Map old tab values to new ones for backward compatibility
  const effectiveTab = ['workspace', 'data'].includes(rightPanelTab)
    ? rightPanelTab
    : rightPanelTab === 'optimize'
      ? 'workspace' // redirect old AI tab to workspace
      : 'workspace';

  return (
    <div className="flex flex-col h-full">
      {/* Main Tab Bar */}
      <div className="px-4 pt-3 pb-2 border-b flex-shrink-0">
        <Tabs value={effectiveTab} onValueChange={setRightPanelTab}>
          <TabsList className="w-full h-9 bg-muted/50 p-0.5">
            {MAIN_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex-1 h-8 text-xs gap-1.5 data-[state=active]:bg-background shadow-sm"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                  {tab.value === 'data' && contentPosts.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 px-1 text-[9px] tabular-nums">
                      {contentPosts.length}
                    </Badge>
                  )}
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
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const { isGenerating, persona, platform, setPlatform, rightPanelTab, setRightPanelTab, accountPanelOpen, setAccountPanelOpen, onboardingCompleted, setOnboardingCompleted } = useAppStore();
  const [mobilePanel, setMobilePanel] = useState<"left" | "main">("main");
  const [connectedPlatforms, setConnectedPlatforms] = useState(0);
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

  return (
    <div className="min-h-screen flex flex-col bg-gradient-animated">
      <DataInitializer />
      {/* Top Header */}
      <header className="border-b bg-background/80 backdrop-blur-xl sticky top-0 z-50 shadow-[0_1px_0_0] shadow-black/5 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <div className={`h-8 w-8 rounded-lg bg-gradient-to-br flex items-center justify-center shadow-md logo-hover-spin ${platform === 'wechat' ? 'from-violet-600 to-purple-600 shadow-violet-200 dark:shadow-violet-900/40' : 'from-red-500 to-rose-600 shadow-red-200 dark:shadow-red-900/40'}`}>
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className={`text-base font-bold bg-clip-text text-transparent ${platform === 'wechat' ? 'bg-gradient-to-r from-violet-600 to-purple-600' : 'bg-gradient-to-r from-red-500 to-rose-600'}`}>
                {platform === 'wechat' ? '朋友圈AI运营助手' : '小红书AI运营助手'}
              </h1>
              <p className="text-[10px] text-muted-foreground -mt-0.5">{platform === 'wechat' ? '个人IP打造 · 全自动内容规划' : '爆款内容打造 · 全自动笔记生成'}</p>
            </div>
          </div>

          {/* Platform Switcher - Desktop */}
          <div className="hidden sm:flex items-center">
            <div className="relative flex items-center h-8 rounded-full bg-muted/80 p-0.5">
              <motion.div
                className="absolute h-7 rounded-full"
                layoutId="platform-indicator"
                style={{
                  width: 'calc(50% - 2px)',
                  left: platform === 'wechat' ? '2px' : 'calc(50%)',
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                <div className={`h-full w-full rounded-full ${platform === 'wechat' ? 'bg-green-500' : 'bg-red-500'}`} />
              </motion.div>
              <button
                onClick={() => setPlatform('wechat')}
                className={`relative z-10 flex items-center gap-1 px-3 h-7 rounded-full text-xs font-medium transition-all duration-150 active:scale-[0.96] ${platform === 'wechat' ? 'text-white' : 'text-green-600 hover:text-green-700'}`}
              >
                <span className="h-2 w-2 rounded-full bg-green-400" />
                朋友圈
              </button>
              <button
                onClick={() => setPlatform('xiaohongshu')}
                className={`relative z-10 flex items-center gap-1 px-3 h-7 rounded-full text-xs font-medium transition-all duration-150 active:scale-[0.96] ${platform === 'xiaohongshu' ? 'text-white' : 'text-red-600 hover:text-red-700'}`}
              >
                <span className="h-2 w-2 rounded-full bg-red-400" />
                小红书
              </button>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
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
            <SettingsCenter connectedPlatforms={connectedPlatforms} />
            <NotificationBell />
            <Badge variant="outline" className="text-xs gap-1">
              <Zap className="h-3 w-3 text-amber-500" />
              AI驱动
            </Badge>
          </div>
        </div>

        {/* Mobile Platform Switcher + Navigation */}
        <div className="sm:hidden">
          <div className="flex items-center justify-center gap-2 px-4 py-1">
            <button
              onClick={() => setPlatform('wechat')}
              className={`flex items-center gap-1 px-3 h-7 rounded-full text-[10px] font-medium transition-all duration-150 active:scale-[0.96] ${platform === 'wechat' ? 'bg-green-500 text-white' : 'text-green-600 dark:text-green-400'}`}
            >
              <MessageCircle className="h-2.5 w-2.5" />
              朋友圈
            </button>
            <button
              onClick={() => setPlatform('xiaohongshu')}
              className={`flex items-center gap-1 px-3 h-7 rounded-full text-[10px] font-medium transition-all duration-150 active:scale-[0.96] ${platform === 'xiaohongshu' ? 'bg-red-500 text-white' : 'text-red-600 dark:text-red-400'}`}
            >
              <Zap className="h-2.5 w-2.5" />
              小红书
            </button>
            <button
              onClick={() => setAccountPanelOpen(true)}
              className={`flex items-center gap-1 px-3 h-7 rounded-full text-[10px] font-medium transition-colors ${connectedPlatforms > 0 ? 'bg-emerald-500 text-white' : 'text-muted-foreground bg-muted/60'}`}
            >
              {connectedPlatforms > 0 ? (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                </span>
              ) : (
                <Settings className="h-2.5 w-2.5" />
              )}
              设置
            </button>
          </div>

          {/* Mobile Main Tabs */}
          <div className="flex border-t">
            <Button
              variant={mobilePanel === "left" ? "secondary" : "ghost"}
              className="flex-1 h-9 rounded-none text-xs gap-1 active:scale-[0.98] transition-transform"
              onClick={() => setMobilePanel("left")}
            >
              <CalendarDays className="h-3 w-3" />
              日历/知识库
            </Button>
            <Button
              variant={mobilePanel === "main" ? "secondary" : "ghost"}
              className="flex-1 h-9 rounded-none text-xs gap-1 active:scale-[0.98] transition-transform"
              onClick={() => setMobilePanel("main")}
            >
              <PenTool className="h-3 w-3" />
              工作台
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {showWelcome ? (
          <div className="h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-3.5rem)]">
            <WelcomeOnboarding onComplete={() => setOnboardingCompleted(true)} />
          </div>
        ) : (
          <>
            {/* Desktop: Two-panel resizable layout */}
            <div className="hidden sm:block h-[calc(100vh-3.5rem)]">
              <ResizablePanelGroup direction="horizontal" className="h-full">
                {/* Left Sidebar */}
                <ResizablePanel defaultSize={24} minSize={20} maxSize={32}>
                  <div className="h-full border-r bg-background/50">
                    <LeftSidebar />
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle className="bg-border/50 hover:bg-primary/20 transition-colors drag-handle" />

                {/* Main Content Area */}
                <ResizablePanel defaultSize={76} minSize={55}>
                  <div className="h-full bg-background">
                    <MainContentPanel />
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>

            {/* Mobile: Single panel view */}
            <div className="sm:hidden h-[calc(100vh-8rem)] overflow-hidden">
              {mobilePanel === "left" && (
                <motion.div
                  key="left-mobile"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="h-full"
                >
                  <LeftSidebar />
                </motion.div>
              )}
              {mobilePanel === "main" && (
                <motion.div
                  key="main-mobile"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                  className="h-full"
                >
                  <MainContentPanel />
                </motion.div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Platform Account Panel Dialog */}
      <PlatformAccountPanel
        open={accountPanelOpen}
        onOpenChange={setAccountPanelOpen}
        connectedCount={connectedPlatforms}
        totalCount={2}
      />

      {/* Footer */}
      <footer className="footer-gradient-border bg-background/80 backdrop-blur-md py-2 px-4 mt-auto pb-safe">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{platform === 'wechat' ? '朋友圈AI运营助手 · 让每条朋友圈都有价值' : '小红书AI运营助手 · 让每篇笔记都成爆款'}</span>
          <span className="flex items-center gap-2">
            <span className="version-badge">v2.0</span>
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full ai-badge-pulse">
              Powered by <Sparkles className="h-3 w-3 text-violet-500" /> AI
            </span>
          </span>
        </div>
      </footer>
    </div>
  );
}
