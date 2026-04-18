"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { PersonaForm } from "@/components/left-panel/persona-form";
import { KnowledgeBase } from "@/components/left-panel/knowledge-base";
import { ContentCalendar } from "@/components/center-panel/content-calendar";
import { CopywritingOutput } from "@/components/right-panel/copywriting-output";
import { AnalyticsPanel } from "@/components/right-panel/analytics-panel";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles, User, BookOpen, CalendarDays, PenTool,
  BarChart3, Wand2, Zap, Menu, X
} from "lucide-react";

function LeftPanel() {
  const { leftPanelTab, setLeftPanelTab } = useAppStore();

  return (
    <div className="flex flex-col h-full">
      {/* Left Panel Header */}
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <div className="h-6 w-6 rounded-md bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          人设与素材
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
          </TabsList>
        </Tabs>
      </div>

      {/* Left Panel Content */}
      <ScrollArea className="flex-1 px-4 pb-4">
        {leftPanelTab === "persona" ? <PersonaForm /> : <KnowledgeBase />}
      </ScrollArea>
    </div>
  );
}

function RightPanel() {
  const { rightPanelTab, setRightPanelTab, contentPosts } = useAppStore();

  return (
    <div className="flex flex-col h-full">
      {/* Right Panel Header */}
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <div className="h-6 w-6 rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <PenTool className="h-3.5 w-3.5 text-white" />
          </div>
          文案与分析
        </h2>
        <Tabs value={rightPanelTab} onValueChange={setRightPanelTab}>
          <TabsList className="w-full h-8 bg-muted/50 p-0.5">
            <TabsTrigger value="copywriting" className="flex-1 h-7 text-xs gap-1 data-[state=active]:bg-background shadow-sm">
              <Wand2 className="h-3 w-3" />
              文案输出
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
          </TabsList>
        </Tabs>
      </div>

      {/* Right Panel Content */}
      {rightPanelTab === "copywriting" ? <CopywritingOutput /> : <AnalyticsPanel />}
    </div>
  );
}

export default function Home() {
  const { isGenerating } = useAppStore();
  const [mobilePanel, setMobilePanel] = useState<"left" | "center" | "right">("center");

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Top Header */}
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-md shadow-violet-200 dark:shadow-violet-900/40">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                朋友圈AI运营助手
              </h1>
              <p className="text-[10px] text-muted-foreground -mt-0.5">个人IP打造 · 全自动内容规划</p>
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
            <Badge variant="outline" className="text-xs gap-1">
              <Zap className="h-3 w-3 text-amber-500" />
              AI驱动
            </Badge>
          </div>
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
        <div className="sm:hidden h-[calc(100vh-7rem)] overflow-hidden">
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
      </main>

      {/* Footer */}
      <footer className="border-t bg-background/80 backdrop-blur-md py-2 px-4 mt-auto">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>朋友圈AI运营助手 · 让每条朋友圈都有价值</span>
          <span className="flex items-center gap-1">
            Powered by <Sparkles className="h-3 w-3 text-violet-500" /> AI
          </span>
        </div>
      </footer>
    </div>
  );
}
