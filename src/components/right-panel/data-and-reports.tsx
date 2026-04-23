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
import { KpiOverviewCards } from "@/components/right-panel/kpi-overview-cards";
import { TrendLineChart } from "@/components/charts/trend-line-chart";
import { TrendLineChartPanel } from "@/components/right-panel/trend-line-chart-panel";
import ContentCompetitionPanel from "@/components/right-panel/content-competition-panel";
import { TrendComparisonChart } from "@/components/right-panel/trend-comparison-chart";
import { CompetitorCalendarView } from "@/components/right-panel/competitor-calendar-view";
import { CompetitorDashboard } from "@/components/right-panel/competitor-dashboard";
import { TrendTracker } from "@/components/right-panel/trend-tracker";
import { FileBarChart, BarChart3, LayoutDashboard, Users, Sparkles, Activity, Radar, Flame, Gauge, Layers, UserCheck, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OperationsDashboard } from "@/components/right-panel/operations-dashboard";
import { ExecutiveDashboard } from "@/components/right-panel/executive-dashboard";
import { OpsRhythmDashboard } from "@/components/right-panel/ops-rhythm-dashboard";
import { WeeklyAnalytics } from "@/components/right-panel/weekly-analytics";
import { ReportTemplateManager } from "@/components/right-panel/report-template-manager";
import { AudienceInsightsPanel } from "@/components/right-panel/audience-insights-panel";
import { ExportCenter } from "@/components/right-panel/export-center";

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

  const tabTriggerClass = (value: string) =>
    `flex-1 h-7 text-xs gap-1.5 data-[state=active]:bg-background shadow-sm ${
      !isWeChat
        ? "data-[state=active]:text-rose-600 dark:data-[state=active]:text-rose-400"
        : "data-[state=active]:text-violet-600 dark:data-[state=active]:text-violet-400"
    }`;

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
              <TabsTrigger value="report" className={tabTriggerClass("report")}>
                <FileBarChart className="h-3.5 w-3.5" />
                运营报告
              </TabsTrigger>
              <TabsTrigger value="analytics" className={tabTriggerClass("analytics")}>
                <BarChart3 className="h-3.5 w-3.5" />
                数据分析
              </TabsTrigger>
              <TabsTrigger value="competitor" className={tabTriggerClass("competitor")}>
                <Users className="h-3.5 w-3.5" />
                竞品分析
              </TabsTrigger>
              <TabsTrigger value="intelligence" className={tabTriggerClass("intelligence")}>
                <Radar className="h-3.5 w-3.5" />
                竞品看板
              </TabsTrigger>
              <TabsTrigger value="trends" className={tabTriggerClass("trends")}>
                <Flame className="h-3.5 w-3.5" />
                趋势追踪
              </TabsTrigger>
              <TabsTrigger value="dashboard" className={tabTriggerClass("dashboard")}>
                <LayoutDashboard className="h-3.5 w-3.5" />
                看板
              </TabsTrigger>
              <TabsTrigger value="executive" className={tabTriggerClass("executive")}>
                <Gauge className="h-3.5 w-3.5" />
                执行看板
              </TabsTrigger>
              <TabsTrigger value="rhythm" className={tabTriggerClass("rhythm")}>
                <Activity className="h-3.5 w-3.5" />
                节奏
              </TabsTrigger>
              <TabsTrigger value="weekly" className={tabTriggerClass("weekly")}>
                <FileBarChart className="h-3.5 w-3.5" />
                周报分析
              </TabsTrigger>
              <TabsTrigger value="audience" className={tabTriggerClass("audience")}>
                <UserCheck className="h-3.5 w-3.5" />
                受众洞察
              </TabsTrigger>
              <TabsTrigger value="templates" className={tabTriggerClass("templates")}>
                <Layers className="h-3.5 w-3.5" />
                模板
              </TabsTrigger>
              <TabsTrigger value="export" className={tabTriggerClass("export")}>
                <Download className="h-3.5 w-3.5" />
                导出
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
                    <KpiOverviewCards />
                    <TrendLineChartPanel />
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
              <div className="flex flex-col flex-1 min-h-0 space-y-3">
                <ContentCompetitionPanel />
                <div className="flex flex-col flex-1 min-h-0">
                  <AnalyticsPanel />
                </div>
              </div>
            </TabsContent>

            {/* ── Competitor Analysis Tab ─────────────────────────────── */}
            <TabsContent
              value="competitor"
              className="flex flex-col min-h-0 mt-1 animate-fade-in-up"
            >
              <div className="flex flex-col flex-1 min-h-0 space-y-3">
                <TrendComparisonChart />
                <CompetitorCalendarView />
                <div className="flex flex-col flex-1 min-h-0">
                  <CompetitorAnalysis />
                </div>
              </div>
            </TabsContent>

            {/* ── Intelligence Tab (Competitor Dashboard) ──────────────── */}
            <TabsContent
              value="intelligence"
              className="flex flex-col min-h-0 mt-1 animate-fade-in-up"
            >
              <div className="flex flex-col flex-1 min-h-0">
                <CompetitorDashboard />
              </div>
            </TabsContent>

            {/* ── Trends Tab (Trend Tracker) ─────────────────────────────── */}
            <TabsContent
              value="trends"
              className="flex flex-col min-h-0 mt-1 animate-fade-in-up"
            >
              <div className="flex flex-col flex-1 min-h-0">
                <TrendTracker />
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

            {/* ── Executive Dashboard Tab ────────────────────────────── */}
            <TabsContent
              value="executive"
              className="flex flex-col min-h-0 mt-1 animate-fade-in-up"
            >
              <div className="flex flex-col flex-1 min-h-0">
                <ExecutiveDashboard />
              </div>
            </TabsContent>

            {/* ── Rhythm Tab ────────────────────────────────────── */}
            <TabsContent
              value="rhythm"
              className="flex flex-col min-h-0 mt-1 animate-fade-in-up"
            >
              <div className="flex flex-col flex-1 min-h-0">
                <OpsRhythmDashboard />
              </div>
            </TabsContent>

            {/* ── Weekly Analytics Tab ──────────────────────────── */}
            <TabsContent
              value="weekly"
              className="flex flex-col min-h-0 mt-1 animate-fade-in-up"
            >
              <div className="flex flex-col flex-1 min-h-0">
                <WeeklyAnalytics />
              </div>
            </TabsContent>

            {/* ── Audience Insights Tab ────────────────────────── */}
            <TabsContent
              value="audience"
              className="flex flex-col min-h-0 mt-1 animate-fade-in-up"
            >
              <div className="flex flex-col flex-1 min-h-0">
                <AudienceInsightsPanel />
              </div>
            </TabsContent>

            {/* ── Report Templates Tab ──────────────────────────────── */}
            <TabsContent
              value="templates"
              className="flex flex-col min-h-0 mt-1 animate-fade-in-up"
            >
              <div className="flex flex-col flex-1 min-h-0">
                <ReportTemplateManager />
              </div>
            </TabsContent>

            {/* ── Export Center Tab ──────────────────────────────── */}
            <TabsContent
              value="export"
              className="flex flex-col min-h-0 mt-1 animate-fade-in-up"
            >
              <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
                <ExportCenter />
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
