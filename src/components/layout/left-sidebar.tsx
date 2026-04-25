"use client";

import { useAppStore } from "@/store/app-store";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles, BookOpen, CalendarDays,
  FileText, Wand2,
} from "lucide-react";

const KnowledgeBase = dynamic(() => import("@/components/left-panel/knowledge-base").then(m => ({ default: m.KnowledgeBase })), { ssr: false, loading: () => <Skeleton className="h-full w-full" /> });
const CompactCalendar = dynamic(() => import("@/components/left-panel/compact-calendar").then(m => ({ default: m.CompactCalendar })), { ssr: false, loading: () => <Skeleton className="h-48" /> });
const CopywritingTemplates = dynamic(() => import("@/components/left-panel/copywriting-templates").then(m => ({ default: m.CopywritingTemplates })), { ssr: false, loading: () => <Skeleton className="h-full" /> });
const XiaohongshuTemplates = dynamic(() => import("@/components/right-panel/xiaohongshu-templates").then(m => ({ default: m.XiaohongshuTemplates })), { ssr: false, loading: () => <Skeleton className="h-full" /> });
const TemplateMarketplace = dynamic(() => import("@/components/template-marketplace").then(m => ({ default: m.TemplateMarketplace })), { ssr: false, loading: () => <Skeleton className="h-full" /> });
const AIPromptLibrary = dynamic(() => import("@/components/ai-prompt-library").then(m => ({ default: m.AIPromptLibrary })), { ssr: false, loading: () => <Skeleton className="h-full" /> });
const CalendarThemeSelector = dynamic(() => import("@/components/calendar-theme-selector").then(m => ({ default: m.CalendarThemeSelector })), { ssr: false, loading: () => <Skeleton className="h-10 w-full" /> });
const KeyboardShortcutHint = dynamic(() => import("@/components/left-panel/keyboard-shortcut-hint").then(m => ({ default: m.KeyboardShortcutHint })), { ssr: false });

// ─── Left sidebar tabs ────────────────────────────────────────────────────────

const LEFT_TABS = [
  { value: 'calendar', icon: CalendarDays, label: '日历' },
  { value: 'knowledge', icon: BookOpen, label: '知识库' },
  { value: 'templates', icon: FileText, label: '模板' },
  { value: 'marketplace', icon: Sparkles, label: '市场' },
  { value: 'prompts', icon: Wand2, label: '提示词' },
] as const;

// ─── Left Sidebar ─────────────────────────────────────────────────────────────

export function LeftSidebar() {
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

      {/* Keyboard Shortcut Hint — fixed at sidebar bottom for all tabs */}
      <KeyboardShortcutHint />
    </div>
  );
}
