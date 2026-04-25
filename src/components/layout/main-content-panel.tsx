"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/store/app-store";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PenTool, BarChart3, Globe,
} from "lucide-react";
import {
  LazyDashboardOverview,
  LazyContentWorkspace,
  LazyDataAndReports,
  LazyAccountCollector,
} from "@/components/lazy-components";

// ─── Main tabs for the right content area ──────────────────────────────────────

const MAIN_TABS = [
  { value: 'workspace', icon: PenTool, label: '内容工作台' },
  { value: 'data', icon: BarChart3, label: '数据与报告' },
  { value: 'collect', icon: Globe, label: '采集中心' },
] as const;

// ─── Main Content Panel ───────────────────────────────────────────────────────

export function MainContentPanel() {
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
          <TabsList className="w-full h-9 bg-muted/40 p-0.5 rounded-lg">
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

      {/* Tab Content - scrollable area with dashboard overview at top */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {effectiveTab === 'workspace' && <LazyDashboardOverview />}
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
