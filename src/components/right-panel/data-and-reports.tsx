"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
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
import { TrendLineChartPanel } from "@/components/right-panel/trend-line-chart-panel";
import ContentCompetitionPanel from "@/components/right-panel/content-competition-panel";
import { TrendComparisonChart } from "@/components/right-panel/trend-comparison-chart";
import { CompetitorCalendarView } from "@/components/right-panel/competitor-calendar-view";
import { CompetitorDashboard } from "@/components/right-panel/competitor-dashboard";
import { TrendTracker } from "@/components/right-panel/trend-tracker";
import {
  FileBarChart, BarChart3, LayoutDashboard, Users, Sparkles, Activity,
  Radar, Flame, Gauge, Layers, UserCheck, Download, ChevronDown,
  TrendingUp, PenTool, FileBarChart2, CalendarCheck, Crosshair,
  Calendar, FileText, Loader2, AlertCircle, Shield, Target, Zap,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { OperationsDashboard } from "@/components/right-panel/operations-dashboard";
import { ExecutiveDashboard } from "@/components/right-panel/executive-dashboard";
import { OpsRhythmDashboard } from "@/components/right-panel/ops-rhythm-dashboard";
import { WeeklyAnalytics } from "@/components/right-panel/weekly-analytics";
import { ReportTemplateManager } from "@/components/right-panel/report-template-manager";
import { AudienceInsightsPanel } from "@/components/right-panel/audience-insights-panel";
import { ExportCenter } from "@/components/right-panel/export-center";

// ── Dynamic imports for Ops Dashboard (iteration 41 components) ──
const OpsRhythmEngine = dynamic(
  () => import("@/components/right-panel/ops-rhythm-engine").then((m) => ({ default: m.OpsRhythmEngine })),
  { loading: () => <OpsSectionSkeleton />, ssr: false }
);
const LiveMetricsMonitor = dynamic(
  () => import("@/components/right-panel/live-metrics-monitor").then((m) => ({ default: m.LiveMetricsMonitor })),
  { loading: () => <OpsSectionSkeleton />, ssr: false }
);
const PublishWorkflowEnhanced = dynamic(
  () => import("@/components/right-panel/publish-workflow-enhanced").then((m) => ({ default: m.PublishWorkflowEnhanced })),
  { loading: () => <OpsSectionSkeleton />, ssr: false }
);
const WeeklyReportGenerator = dynamic(
  () => import("@/components/right-panel/weekly-report-generator").then((m) => ({ default: m.WeeklyReportGenerator })),
  { loading: () => <OpsSectionSkeleton />, ssr: false }
);

// ── Dynamic import for Content Streak Widget ──
const ContentStreakWidget = dynamic(
  () => import("@/components/content-streak-widget").then((m) => ({ default: m.ContentStreakWidget })),
  { ssr: false, loading: () => <OpsSectionSkeleton /> }
);

// ── Dynamic imports for competitor analysis components (SVG animations, ssr: false) ──
const CompetitorRadarEnhanced = dynamic(
  () => import("@/components/right-panel/competitor-radar-enhanced").then((m) => ({ default: m.CompetitorRadarEnhanced })),
  { ssr: false, loading: () => <SectionSkeleton title="竞品雷达图" icon={Crosshair} /> }
);
const CompetitorTrendsEnhanced = dynamic(
  () => import("@/components/right-panel/competitor-trends-enhanced").then((m) => ({ default: m.CompetitorTrendsEnhanced })),
  { ssr: false, loading: () => <SectionSkeleton title="趋势对比" icon={TrendingUp} /> }
);
const CompetitorCalendarComparison = dynamic(
  () => import("@/components/right-panel/competitor-calendar-comparison").then((m) => ({ default: m.CompetitorCalendarComparison })),
  { ssr: false, loading: () => <SectionSkeleton title="日历对比" icon={Calendar} /> }
);

// ── Skeleton loaders ──────────────────────────────────────────────────────

function OpsSectionSkeleton() {
  return (
    <div className="p-4 space-y-3">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-20 w-full rounded-lg" />
    </div>
  );
}

function SectionSkeleton({ title, icon: Icon }: { title: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2 px-4 pt-3">
        <CardTitle className="text-xs font-semibold flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-gradient-to-br from-violet-500/20 to-emerald-500/20 flex items-center justify-center">
            {Icon ? <Icon className="h-3.5 w-3.5 text-muted-foreground/40" /> : <Skeleton className="h-5 w-5 rounded" />}
          </div>
          <span className="text-muted-foreground/60">{title}</span>
          <Loader2 className="h-3 w-3 text-muted-foreground/30 animate-spin" />
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <Skeleton className="h-48 w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

// ── Collapsible Section wrapper ────────────────────────────────────────────

function CollapsibleSection({
  title,
  icon: Icon,
  badge,
  gradientClass,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  gradientClass: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="group">
      <CollapsibleTrigger asChild>
        <button
          className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all hover:bg-muted/40 ${gradientClass}`}
        >
          <div className={`h-6 w-6 rounded flex items-center justify-center bg-gradient-to-br ${gradientClass}`}>
            <Icon className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-xs font-semibold flex-1 text-left">{title}</span>
          {badge && (
            <Badge variant="secondary" className="text-[8px] h-4 px-1.5">
              {badge}
            </Badge>
          )}
          <ChevronDown
            className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      </CollapsibleTrigger>
      <AnimatePresence initial={false}>
        {open && (
          <CollapsibleContent forceMount asChild>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="pt-1">{children}</div>
            </motion.div>
          </CollapsibleContent>
        )}
      </AnimatePresence>
    </Collapsible>
  );
}

// ── Competitor Report types ───────────────────────────────────────────────

interface CompetitorReportData {
  generatedAt: string;
  overallScore: number;
  rating: string;
  summary: {
    totalCompetitors: number;
    frequencyGap: number;
    engagementGap: number;
    diversityGap: number;
  };
  own: {
    totalPosts: number;
    avgEngagementRate: number;
    postsPerWeek: number;
    peakHour: number;
    bestDay: string;
    topContentTypes: Array<{ type: string; count: number }>;
  };
  competitorAverage: {
    avgEngagementRate: number;
    avgPostsPerWeek: number;
  };
  recommendations: Array<{
    type: string;
    title: string;
    description: string;
    priority: string;
  }>;
}

// ── Competitor Report Result component ─────────────────────────────────────

function CompetitorReportResult({ report }: { report: CompetitorReportData }) {
  const priorityColors: Record<string, string> = {
    high: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  };
  const priorityLabels: Record<string, string> = {
    high: "高优先",
    medium: "中优先",
    low: "低优先",
  };
  const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    strength: Shield,
    weakness: AlertCircle,
    opportunity: Target,
    action: Zap,
  };
  const typeColors: Record<string, string> = {
    strength: "text-emerald-500",
    weakness: "text-rose-500",
    opportunity: "text-violet-500",
    action: "text-amber-500",
  };

  const scoreColor =
    report.overallScore >= 80
      ? "from-emerald-500 to-green-500"
      : report.overallScore >= 65
        ? "from-violet-500 to-purple-500"
        : report.overallScore >= 50
          ? "from-amber-500 to-orange-500"
          : "from-rose-500 to-red-500";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-3"
    >
      {/* Score Card */}
      <div className="rounded-xl bg-gradient-to-br from-violet-50/60 via-background to-emerald-50/40 dark:from-violet-950/20 dark:to-emerald-950/10 border p-4">
        <div className="flex items-center gap-4">
          <div
            className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${scoreColor} flex items-center justify-center shadow-lg`}
          >
            <span className="text-2xl font-bold text-white">{report.overallScore}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">竞争综合评分</span>
              <Badge
                className={`text-[9px] h-5 px-2 border-0 bg-gradient-to-r ${scoreColor} text-white`}
              >
                {report.rating}
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              基于 {report.summary.totalCompetitors} 个竞品 · 生成于{" "}
              {new Date(report.generatedAt).toLocaleString("zh-CN", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Gap Metrics */}
      <div className="grid grid-cols-3 gap-2">
        {[
          {
            label: "发布频率",
            gap: report.summary.frequencyGap,
            unit: "篇/周",
          },
          {
            label: "互动率",
            gap: report.summary.engagementGap,
            unit: "%",
          },
          {
            label: "内容多样性",
            gap: report.summary.diversityGap,
            unit: "种",
          },
        ].map((m) => (
          <div key={m.label} className="rounded-lg border bg-muted/20 p-2.5 text-center">
            <p className="text-[9px] text-muted-foreground">{m.label}</p>
            <p className="text-sm font-bold mt-0.5">
              {m.gap > 0 ? "+" : ""}
              {m.gap}
              {m.unit === "%" ? "%" : ""}
            </p>
            <div
              className={`flex items-center justify-center gap-0.5 text-[9px] mt-0.5 ${
                m.gap >= 0 ? "text-emerald-500" : "text-rose-500"
              }`}
            >
              {m.gap >= 0 ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              <span>{m.gap >= 0 ? "领先" : "落后"}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
          <Sparkles className="h-3 w-3 text-violet-500" />
          分析建议
        </div>
        {report.recommendations.map((rec, idx) => {
          const RecIcon = typeIcons[rec.type] || AlertCircle;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="rounded-lg border p-3 space-y-1.5"
            >
              <div className="flex items-center gap-2">
                <RecIcon
                  className={`h-3.5 w-3.5 ${typeColors[rec.type] || "text-muted-foreground"}`}
                />
                <span className="text-[11px] font-semibold flex-1">{rec.title}</span>
                <Badge
                  className={`text-[7px] h-4 px-1.5 border-0 ${
                    priorityColors[rec.priority] || ""
                  }`}
                >
                  {priorityLabels[rec.priority] || rec.priority}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed pl-5.5">
                {rec.description}
              </p>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ── Competitor Tab Enhanced (collapsible sections + report generation) ─────

function CompetitorTabEnhanced() {
  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData] = useState<CompetitorReportData | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  const generateReport = async () => {
    setReportLoading(true);
    setReportError(null);
    try {
      const res = await fetch("/api/competitor-report?period=month");
      if (!res.ok) throw new Error("请求失败");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setReportData(data);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "生成报告失败");
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
      {/* Section 1: Radar */}
      <CollapsibleSection
        title="竞品雷达图"
        icon={Crosshair}
        gradientClass="from-violet-500 to-purple-600"
        defaultOpen={true}
      >
        <CompetitorRadarEnhanced />
      </CollapsibleSection>

      {/* Section 2: Trends */}
      <CollapsibleSection
        title="趋势对比"
        icon={TrendingUp}
        gradientClass="from-emerald-500 to-teal-600"
        defaultOpen={true}
      >
        <CompetitorTrendsEnhanced />
      </CollapsibleSection>

      {/* Section 3: Calendar */}
      <CollapsibleSection
        title="日历对比"
        icon={Calendar}
        gradientClass="from-rose-500 to-pink-600"
        defaultOpen={false}
      >
        <CompetitorCalendarComparison />
      </CollapsibleSection>

      {/* Section 4: Report */}
      <CollapsibleSection
        title="竞争分析报告"
        icon={FileText}
        gradientClass="from-amber-500 to-orange-600"
        defaultOpen={false}
      >
        <div className="space-y-3 pb-2">
          <Button
            onClick={generateReport}
            disabled={reportLoading}
            className="w-full gap-2 bg-gradient-to-r from-violet-500 via-purple-500 to-emerald-500 hover:from-violet-600 hover:via-purple-600 hover:to-emerald-600 text-white shadow-md transition-all"
            size="sm"
          >
            {reportLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                正在生成报告…
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                生成竞争分析报告
              </>
            )}
          </Button>

          {reportError && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/20 p-3"
            >
              <AlertCircle className="h-4 w-4 text-rose-500 flex-shrink-0" />
              <p className="text-[11px] text-rose-600 dark:text-rose-400">{reportError}</p>
            </motion.div>
          )}

          {reportData && <CompetitorReportResult report={reportData} />}
        </div>
      </CollapsibleSection>

      {/* Legacy components (kept for compatibility) */}
      <div className="space-y-3 pb-4">
        <TrendComparisonChart />
        <CompetitorCalendarView />
        <div className="flex flex-col flex-1 min-h-0">
          <CompetitorAnalysis />
        </div>
      </div>
    </div>
  );
}

// ── Ops Dashboard Tab ─────────────────────────────────────────────────────

function OpsDashboardTab() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    rhythm: true,
    metrics: false,
    workflow: false,
    weekly: false,
  });

  const toggle = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
      <CollapsibleSection
        title="运营节奏引擎"
        icon={Activity}
        gradientClass="from-violet-500 to-purple-600"
        defaultOpen={true}
      >
        <OpsRhythmEngine />
      </CollapsibleSection>
      <CollapsibleSection
        title="实时指标监控"
        icon={Gauge}
        gradientClass="from-emerald-500 to-teal-600"
        defaultOpen={false}
      >
        <LiveMetricsMonitor />
      </CollapsibleSection>
      <CollapsibleSection
        title="发布工作流"
        icon={PenTool}
        gradientClass="from-rose-500 to-pink-600"
        defaultOpen={false}
      >
        <PublishWorkflowEnhanced />
      </CollapsibleSection>
      <CollapsibleSection
        title="周报生成器"
        icon={CalendarCheck}
        gradientClass="from-amber-500 to-orange-600"
        defaultOpen={false}
      >
        <WeeklyReportGenerator />
      </CollapsibleSection>
    </div>
  );
}

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

  const badgeDotVariant = (value: string) => {
    if (value === "analytics" || value === "intelligence") return "dot-violet";
    if (value === "ops" || value === "rhythm") return "dot-emerald";
    if (value === "competitor" || value === "trends") return "dot-rose";
    return "dot-amber";
  };

  return (
    <div className="flex flex-col h-full">
      {/* ── Tab Bar ────────────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-1 flex-shrink-0">
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Tabs defaultValue="analytics" className="w-full">
            <TabsList className="w-full h-8 bg-muted/50 p-0.5 overflow-x-auto scrollbar-none [mask-image:linear-gradient(to_right,black_0%,black_85%,transparent)]">
              <TabsTrigger value="analytics" className={`${tabTriggerClass("analytics")} flex-shrink-0`}>
                <span className="badge-dot dot-violet">
                  <BarChart3 className="h-3.5 w-3.5" />
                </span>
                数据分析
              </TabsTrigger>
              <TabsTrigger value="ops" className={`${tabTriggerClass("ops")} flex-shrink-0`}>
                <span className="badge-dot dot-emerald">
                  <TrendingUp className="h-3.5 w-3.5" />
                </span>
                运营仪表盘
              </TabsTrigger>
              <TabsTrigger value="competitor" className={`${tabTriggerClass("competitor")} flex-shrink-0`}>
                <span className="badge-dot dot-rose">
                  <Users className="h-3.5 w-3.5" />
                </span>
                竞品分析
              </TabsTrigger>
              <TabsTrigger value="report" className={`${tabTriggerClass("report")} flex-shrink-0`}>
                <span className="badge-dot dot-amber">
                  <FileBarChart className="h-3.5 w-3.5" />
                </span>
                运营报告
              </TabsTrigger>
              <TabsTrigger value="intelligence" className={`${tabTriggerClass("intelligence")} flex-shrink-0`}>
                <span className="badge-dot dot-violet">
                  <Radar className="h-3.5 w-3.5" />
                </span>
                竞品看板
              </TabsTrigger>
              <TabsTrigger value="trends" className={`${tabTriggerClass("trends")} flex-shrink-0`}>
                <span className="badge-dot dot-rose">
                  <Flame className="h-3.5 w-3.5" />
                </span>
                趋势追踪
              </TabsTrigger>
              <TabsTrigger value="dashboard" className={`${tabTriggerClass("dashboard")} flex-shrink-0`}>
                <span className="badge-dot dot-amber">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                </span>
                看板
              </TabsTrigger>
              <TabsTrigger value="executive" className={`${tabTriggerClass("executive")} flex-shrink-0`}>
                <span className="badge-dot dot-amber">
                  <Gauge className="h-3.5 w-3.5" />
                </span>
                执行看板
              </TabsTrigger>
              <TabsTrigger value="rhythm" className={`${tabTriggerClass("rhythm")} flex-shrink-0`}>
                <span className="badge-dot dot-emerald">
                  <Activity className="h-3.5 w-3.5" />
                </span>
                节奏
              </TabsTrigger>
              <TabsTrigger value="weekly" className={`${tabTriggerClass("weekly")} flex-shrink-0`}>
                <span className="badge-dot dot-amber">
                  <FileBarChart2 className="h-3.5 w-3.5" />
                </span>
                周报分析
              </TabsTrigger>
              <TabsTrigger value="audience" className={`${tabTriggerClass("audience")} flex-shrink-0`}>
                <span className="badge-dot dot-violet">
                  <UserCheck className="h-3.5 w-3.5" />
                </span>
                受众洞察
              </TabsTrigger>
              <TabsTrigger value="templates" className={`${tabTriggerClass("templates")} flex-shrink-0`}>
                <span className="badge-dot dot-amber">
                  <Layers className="h-3.5 w-3.5" />
                </span>
                模板
              </TabsTrigger>
              <TabsTrigger value="export" className={`${tabTriggerClass("export")} flex-shrink-0`}>
                <span className="badge-dot dot-amber">
                  <Download className="h-3.5 w-3.5" />
                </span>
                导出
              </TabsTrigger>
            </TabsList>

            {/* ── Analytics Tab (DEFAULT) ────────────────────────────── */}
            <TabsContent
              value="analytics"
              className="flex flex-col min-h-0 mt-1 animate-fade-in-up"
            >
              <div className="flex flex-col flex-1 min-h-0 space-y-3">
                <ContentStreakWidget />
                <ContentCompetitionPanel />
                <div className="flex flex-col flex-1 min-h-0">
                  <AnalyticsPanel />
                </div>
              </div>
            </TabsContent>

            {/* ── Ops Dashboard Tab (运营仪表盘) ────────────────────── */}
            <TabsContent
              value="ops"
              className="flex flex-col min-h-0 mt-1 animate-fade-in-up"
            >
              <OpsDashboardTab />
            </TabsContent>

            {/* ── Report Tab ────────────────── */}
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

            {/* ── Competitor Analysis Tab (Enhanced — collapsible + dynamic) ── */}
            <TabsContent
              value="competitor"
              className="flex flex-col min-h-0 mt-1 animate-fade-in-up"
            >
              <CompetitorTabEnhanced />
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
