"use client";

import { motion } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AnalyticsPanel } from "@/components/right-panel/analytics-panel";
import { OperationReport } from "@/components/right-panel/operation-report";
import { FileBarChart, BarChart3 } from "lucide-react";

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
            </TabsList>

            {/* ── Report Tab (DEFAULT — prominent) ────────────────── */}
            <TabsContent
              value="report"
              className="flex flex-col min-h-0 mt-1"
            >
              <div className="flex flex-col flex-1 min-h-0">
                <OperationReport />
              </div>
            </TabsContent>

            {/* ── Analytics Tab ────────────────────────────────────── */}
            <TabsContent
              value="analytics"
              className="flex flex-col min-h-0 mt-1"
            >
              <div className="flex flex-col flex-1 min-h-0">
                <AnalyticsPanel />
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
