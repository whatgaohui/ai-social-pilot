"use client";

import { motion } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Sparkles, PenTool } from "lucide-react";

export function AIOptimizePanel() {
  const { selectedPostId, setRightPanelTab } = useAppStore();

  // AI optimization tools have been integrated into the Content Workspace
  // This panel now serves as a redirect/shortcut to the workspace

  if (selectedPostId) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center space-y-4"
        >
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500/15 to-purple-500/15 flex items-center justify-center">
            <Sparkles className="h-7 w-7 text-violet-500" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-foreground">
              AI优化工具已整合到内容工作台
            </h3>
            <p className="text-xs text-muted-foreground max-w-[220px] leading-relaxed">
              A/B对比、质量评分、排版优化、版本历史等AI工具已移至内容工作台，选中内容后可直接使用
            </p>
          </div>
          <Button
            variant="default"
            size="sm"
            className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-md shadow-violet-200 dark:shadow-violet-900/30"
            onClick={() => setRightPanelTab("workspace")}
          >
            <PenTool className="h-3.5 w-3.5" />
            前往内容工作台
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center text-center space-y-4"
      >
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 flex items-center justify-center">
          <Sparkles className="h-7 w-7 text-violet-500/40" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold text-foreground">
            请先选择一条内容
          </h3>
          <p className="text-xs text-muted-foreground max-w-[200px] leading-relaxed">
            从左侧日历中选择一条内容后，即可在内容工作台中使用AI优化工具
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setRightPanelTab("workspace")}
        >
          <PenTool className="h-3.5 w-3.5" />
          前往内容工作台
        </Button>
      </motion.div>
    </div>
  );
}
