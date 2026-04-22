"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AnalyticsPanel } from "@/components/right-panel/analytics-panel";
import { OperationReport } from "@/components/right-panel/operation-report";
import { CompetitorAnalysis } from "@/components/right-panel/competitor-analysis";
import { ReportGenerator } from "@/components/right-panel/report-generator";
import { WeeklyReport } from "@/components/right-panel/weekly-report";
import { WeeklyStatsCard } from "@/components/right-panel/weekly-stats-card";
import { FileBarChart, BarChart3, LayoutDashboard, Users, Sparkles } from "lucide-react";
import { OperationsDashboard } from "@/components/right-panel/operations-dashboard";

/**
 * DataAndReports — unified "数据与报告" view that merges
 * the OperationReport (prominent, default) and AnalyticsPanel
 * into a single tabbed component.
 *
 * Key fix: each tab panel has `flex flex-col min-h-0` so that
 * the inner ScrollArea can resolve its `h-full` constraint correctly.
 */
export function DataAndReports() {
  const { platform } = useAppStore();
  const [showReportGenerator, setShowReportGenerator] = useState(false);

  const isWeChat = platform === "wechat";

  return (
    <div className="flex flex-col h-full">
      {/* ── Tab Bar ────────────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-1 flex-shrink-0">
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Tabs defaultValue="report" className="w-full">
            <TabsList className="w-full h-8 bg-muted/50 p-0.5">
              <TabsTrigger
                value="report"
                className={`flex-1 h-7 text-xs gap-1.5 data-[state=active]:bg-background shadow-sm ${
                  !isWeChat
                    ? "data-[state=active]:text-rose-600 dark:data-[state=active]:text-rose-400"
                    : "data-[state=active]:text-violet-600 dark:data-[state=active]:text-violet-400"
                }`}
              >
                <FileBarChart className="h-3.5 w-3.5" />
                运营报告
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className={`flex-1 h-7 text-xs gap-1.5 data-[state=active]:bg-background shadow-sm ${
                  !isWeChat
                    ? "data-[state=active]:text-rose-600 dark:data-[state=active]:text-rose-400"
                    : "data-[state=active]:text-violet-600 dark:data-[state=active]:text-violet-400"
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                数据分析
              </TabsTrigger>
              <TabsTrigger
                value="competitor"
                className={`flex-1 h-7 text-xs gap-1.5 data-[state=active]:bg-background shadow-sm ${
                  !isWeChat
                    ? "data-[state=active]:text-rose-600 dark:data-[state=active]:text-rose-400"
                    : "data-[state=active]:text-violet-600 dark:data-[state=active]:text-violet-400"
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                竞品分析
              </TabsTrigger>
              <TabsTrigger
                value="dashboard"
                className={`flex-1 h-7 text-xs gap-1.5 data-[state=active]:bg-background shadow-sm ${
                  !isWeChat
                    ? "data-[state=active]:text-rose-600 dark:data-[state=active]:text-rose-400"
                    : "data-[state=active]:text-violet-600 dark:data-[state=active]:text-violet-400"
                }`}
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                运营看板
              </TabsTrigger>
            </TabsList>

            {/* ── Report Tab (DEFAULT — prominent) ────────────────── */}
            <TabsContent
              value="report"
              className="flex flex-col min-h-0 mt-1 animate-fade-in-up"
            >
              <AnimatePresence mode="wait">
                {showReportGenerator ? (
                  <motion.div
                    key="report-generator"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col flex-1 min-h-0"
                  >
                    <ReportGenerator onClose={() => setShowReportGenerator(false)} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="operation-report"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col flex-1 min-h-0 space-y-3"
                  >
                    <WeeklyStatsCard />
                    <OperationReport />
                    <WeeklyReport />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Report generator trigger - floating button */}
              {!showReportGenerator && (
                <div className="absolute bottom-4 right-4 print:hidden z-10">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={() => setShowReportGenerator(true)}
                      className="gap-1.5 shadow-lg bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white"
                      size="sm"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      生成报告
                    </Button>
                  </motion.div>
                </div>
              )}
            </TabsContent>

            {/* ── Analytics Tab ────────────────────────────────────── */}
            <TabsContent
              value="analytics"
              className="flex flex-col min-h-0 mt-1 animate-fade-in-up"
            >
              <div className="flex flex-col flex-1 min-h-0">
                <AnalyticsPanel />
              </div>
            </TabsContent>

            {/* ── Competitor Analysis Tab ─────────────────────────────── */}
            <TabsContent
              value="competitor"
              className="flex flex-col min-h-0 mt-1 animate-fade-in-up"
            >
              <div className="flex flex-col flex-1 min-h-0">
                <CompetitorAnalysis />
              </div>
            </TabsContent>

            {/* ── Dashboard Tab ──────────────────────────────────────── */}
            <TabsContent
              value="dashboard"
              className="flex flex-col min-h-0 mt-1 animate-fade-in-up"
            >
              <div className="flex flex-col flex-1 min-h-0">
                <OperationsDashboard />
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
