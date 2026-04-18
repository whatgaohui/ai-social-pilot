"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { PersonaForm } from "@/components/left-panel/persona-form";
import { KnowledgeBase } from "@/components/left-panel/knowledge-base";
import { ContentCalendar } from "@/components/center-panel/content-calendar";
import { CopywritingOutput } from "@/components/right-panel/copywriting-output";
import { AnalyticsPanel } from "@/components/right-panel/analytics-panel";
import { WeChatPreview } from "@/components/right-panel/wechat-preview";
import { CopywritingTemplates } from "@/components/left-panel/copywriting-templates";
import { XiaohongshuPreview } from "@/components/right-panel/xiaohongshu-preview";
import { XiaohongshuTemplates } from "@/components/right-panel/xiaohongshu-templates";
import { ViralInspiration } from "@/components/right-panel/viral-inspiration";
import { type Platform, PLATFORM_LABELS } from "@/types";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WelcomeOnboarding } from "@/components/welcome-onboarding";
import { ThemeToggle } from "@/components/theme-toggle";
import { AISettingsPanel } from "@/components/ai-settings-panel";
import {
  Sparkles, User, BookOpen, CalendarDays, PenTool,
  BarChart3, Wand2, Zap, Menu, X, FileText, Smartphone, MessageCircle, Lightbulb
} from "lucide-react";

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
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center animate-pulse">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return null;
}

function LeftPanel() {
  const { leftPanelTab, setLeftPanelTab, platform } = useAppStore();

  return (
    <div className="flex flex-col h-full">
      {/* Left Panel Header */}
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <div className={`h-6 w-6 rounded-md bg-gradient-to-br flex items-center justify-center ${platform === 'wechat' ? 'from-violet-500 to-purple-600' : 'from-red-500 to-rose-600'}`}>
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          {platform === 'wechat' ? '人设与素材' : '小红书运营'}
        </h2>
        <Tabs value={leftPanelTab} onValueChange={setLeftPanelTab}>
          <TabsList className="w-full h-8 bg-muted/50 p-0.5">
            <TabsTrigger value="persona" className="flex-1 h-7 text-xs gap-1 data-[state=active]:bg-background shadow-sm">
              <User className="h-3 w-3" />
              人设管理
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="flex-1 h-7 text-xs gap-1 data-[state=active]:bg-background shadow-sm">
              <BookOpen className="h-3 w-3" />
              知识库
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px] tabular-nums">
                {useAppStore.getState().knowledgeItems.length || ""}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex-1 h-7 text-xs gap-1 data-[state=active]:bg-background shadow-sm">
              <FileText className="h-3 w-3" />
              {platform === 'wechat' ? '模板' : '小红书模板'}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Left Panel Content */}
      <ScrollArea className="flex-1 px-4 pb-4">
        {leftPanelTab === "persona" ? <PersonaForm /> : leftPanelTab === "knowledge" ? <KnowledgeBase /> : platform === 'wechat' ? <CopywritingTemplates /> : <XiaohongshuTemplates />}
      </ScrollArea>
    </div>
  );
}

function RightPanel() {
  const { rightPanelTab, setRightPanelTab, contentPosts, selectedPostId, platform } = useAppStore();
  const selectedPost = contentPosts.find(p => p.id === selectedPostId);

  return (
    <div className="flex flex-col h-full">
      {/* Right Panel Header */}
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <div className={`h-6 w-6 rounded-md bg-gradient-to-br flex items-center justify-center ${platform === 'wechat' ? 'from-emerald-500 to-teal-600' : 'from-red-500 to-rose-600'}`}>
            <PenTool className="h-3.5 w-3.5 text-white" />
          </div>
          {platform === 'wechat' ? '文案与分析' : '笔记与数据'}
        </h2>
        <Tabs value={rightPanelTab} onValueChange={setRightPanelTab}>
          <TabsList className="w-full h-8 bg-muted/50 p-0.5">
            <TabsTrigger value="copywriting" className="flex-1 h-7 text-xs gap-1 data-[state=active]:bg-background shadow-sm">
              <Wand2 className="h-3 w-3" />
              {platform === 'wechat' ? '文案输出' : '笔记输出'}
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex-1 h-7 text-xs gap-1 data-[state=active]:bg-background shadow-sm">
              <BarChart3 className="h-3 w-3" />
              数据分析
              {contentPosts.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px] tabular-nums">
                  {contentPosts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex-1 h-7 text-xs gap-1 data-[state=active]:bg-background shadow-sm">
              <Smartphone className="h-3 w-3" />
              预览
            </TabsTrigger>
            <TabsTrigger value="inspiration" className="flex-1 h-7 text-xs gap-1 data-[state=active]:bg-background shadow-sm">
              <Lightbulb className="h-3 w-3" />
              灵感库
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Right Panel Content */}
      {rightPanelTab === "copywriting" ? (
        <CopywritingOutput />
      ) : rightPanelTab === "analytics" ? (
        <AnalyticsPanel />
      ) : rightPanelTab === "inspiration" ? (
        <ViralInspiration />
      ) : (
        <div className="flex-1 px-4 py-4">
          {platform === 'wechat' ? (
            selectedPost ? (
              <WeChatPreview
                post={selectedPost}
                personaName={useAppStore.getState().persona?.name || "我"}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Smartphone className="h-12 w-12 mb-3 opacity-20" />
                <p className="text-sm text-center">请先在日历中选择一条内容</p>
                <p className="text-xs mt-1 text-center">点击日历中的日期即可预览朋友圈效果</p>
              </div>
            )
          ) : (
            selectedPost ? (
              <XiaohongshuPreview post={selectedPost} personaName={useAppStore.getState().persona?.name || "我"} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Smartphone className="h-12 w-12 mb-3 opacity-20" />
                <p className="text-sm text-center">请先在日历中选择一条内容</p>
                <p className="text-xs mt-1 text-center">点击日历中的日期即可预览小红书笔记效果</p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const { isGenerating, persona, knowledgeItems, platform, setPlatform } = useAppStore();
  const [mobilePanel, setMobilePanel] = useState<"left" | "center" | "right">("center");
  const showWelcome = !persona || knowledgeItems.length < 2;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-animated">
      <DataInitializer />
      {/* Top Header */}
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <div className={`h-8 w-8 rounded-lg bg-gradient-to-br flex items-center justify-center shadow-md ${platform === 'wechat' ? 'from-violet-600 to-purple-600 shadow-violet-200 dark:shadow-violet-900/40' : 'from-red-500 to-rose-600 shadow-red-200 dark:shadow-red-900/40'}`}>
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
                className={`relative z-10 flex items-center gap-1 px-3 h-7 rounded-full text-xs font-medium transition-colors ${platform === 'wechat' ? 'text-white' : 'text-green-600 hover:text-green-700'}`}
              >
                <span className="h-2 w-2 rounded-full bg-green-400" />
                朋友圈
              </button>
              <button
                onClick={() => setPlatform('xiaohongshu')}
                className={`relative z-10 flex items-center gap-1 px-3 h-7 rounded-full text-xs font-medium transition-colors ${platform === 'xiaohongshu' ? 'text-white' : 'text-red-600 hover:text-red-700'}`}
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
            <AISettingsPanel />
            <ThemeToggle />
            <Badge variant="outline" className="text-xs gap-1">
              <Zap className="h-3 w-3 text-amber-500" />
              AI驱动
            </Badge>
          </div>
        </div>

        {/* Mobile Platform Switcher */}
        <div className="sm:hidden flex items-center justify-center gap-2 px-4 py-1 border-t border-b">
          <button
            onClick={() => setPlatform('wechat')}
            className={`flex items-center gap-1 px-3 h-7 rounded-full text-[10px] font-medium transition-colors ${platform === 'wechat' ? 'bg-green-500 text-white' : 'text-green-600 dark:text-green-400'}`}
          >
            <MessageCircle className="h-2.5 w-2.5" />
            朋友圈
          </button>
          <button
            onClick={() => setPlatform('xiaohongshu')}
            className={`flex items-center gap-1 px-3 h-7 rounded-full text-[10px] font-medium transition-colors ${platform === 'xiaohongshu' ? 'bg-red-500 text-white' : 'text-red-600 dark:text-red-400'}`}
          >
            <Zap className="h-2.5 w-2.5" />
            小红书
          </button>
        </div>

        {/* Mobile Tab Navigation */}
        <div className="sm:hidden flex border-t">
          <Button
            variant={mobilePanel === "left" ? "secondary" : "ghost"}
            className="flex-1 h-9 rounded-none text-xs gap-1"
            onClick={() => setMobilePanel("left")}
          >
            <User className="h-3 w-3" />
            人设素材
          </Button>
          <Button
            variant={mobilePanel === "center" ? "secondary" : "ghost"}
            className="flex-1 h-9 rounded-none text-xs gap-1"
            onClick={() => setMobilePanel("center")}
          >
            <CalendarDays className="h-3 w-3" />
            内容日历
          </Button>
          <Button
            variant={mobilePanel === "right" ? "secondary" : "ghost"}
            className="flex-1 h-9 rounded-none text-xs gap-1"
            onClick={() => setMobilePanel("right")}
          >
            <PenTool className="h-3 w-3" />
            文案分析
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {showWelcome ? (
          <div className="h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-3.5rem)]">
            <WelcomeOnboarding onComplete={() => {}} />
          </div>
        ) : (
          <>
            {/* Desktop: Three-panel resizable layout */}
            <div className="hidden sm:block h-[calc(100vh-3.5rem)]">
              <ResizablePanelGroup direction="horizontal" className="h-full">
                {/* Left Panel */}
                <ResizablePanel defaultSize={22} minSize={18} maxSize={30}>
                  <div className="h-full border-r bg-background/50">
                    <LeftPanel />
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle className="bg-border/50 hover:bg-primary/20 transition-colors" />

                {/* Center Panel */}
                <ResizablePanel defaultSize={48} minSize={35}>
                  <div className="h-full bg-background">
                    <ContentCalendar />
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle className="bg-border/50 hover:bg-primary/20 transition-colors" />

                {/* Right Panel */}
                <ResizablePanel defaultSize={30} minSize={22} maxSize={40}>
                  <div className="h-full border-l bg-background/50">
                    <RightPanel />
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>

            {/* Mobile: Single panel view */}
            <div className="sm:hidden h-[calc(100vh-8rem)] overflow-hidden">
              {mobilePanel === "left" && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="h-full"
                >
                  <LeftPanel />
                </motion.div>
              )}
              {mobilePanel === "center" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full"
                >
                  <ContentCalendar />
                </motion.div>
              )}
              {mobilePanel === "right" && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="h-full"
                >
                  <RightPanel />
                </motion.div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-background/80 backdrop-blur-md py-2 px-4 mt-auto">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{platform === 'wechat' ? '朋友圈AI运营助手 · 让每条朋友圈都有价值' : '小红书AI运营助手 · 让每篇笔记都成爆款'}</span>
          <span className="flex items-center gap-1">
            Powered by <Sparkles className="h-3 w-3 text-violet-500" /> AI
          </span>
        </div>
      </footer>
    </div>
  );
}
