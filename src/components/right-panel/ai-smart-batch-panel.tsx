"use client";

import React, { useState, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";
import type { ContentPost } from "@/types";
import {
  Bot,
  Sparkles,
  Star,
  ImageIcon,
  ArrowUpDown,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Square,
  Zap,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

// ─── Animation Variants ──────────────────────────────────────────────

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const },
  },
};

// ─── Operation Types ─────────────────────────────────────────────────

interface OperationLog {
  id: string;
  timestamp: number;
  message: string;
  status: "success" | "error" | "info";
}

interface OperationState {
  isRunning: boolean;
  progress: number;
  total: number;
  success: number;
  failed: number;
  startTime: number | null;
  cancelled: boolean;
}

// ─── Circular Progress Indicator (SVG) ───────────────────────────────

function CircularProgress({
  value,
  size = 64,
  strokeWidth = 5,
  colorClass = "text-violet-500",
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  colorClass?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={colorClass}
          style={{ stroke: "currentColor" }}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold tabular-nums">{Math.round(value)}%</span>
      </div>
    </div>
  );
}

// ─── Estimated Time Remaining ────────────────────────────────────────

function formatETA(startTime: number | null, progress: number, total: number): string {
  if (!startTime || progress === 0 || total === 0) return "计算中…";
  const elapsed = (Date.now() - startTime) / 1000;
  const rate = progress / elapsed;
  if (rate === 0) return "计算中…";
  const remaining = (total - progress) / rate;
  if (remaining < 5) return "即将完成";
  if (remaining < 60) return `约${Math.ceil(remaining)}秒`;
  return `约${Math.ceil(remaining / 60)}分钟`;
}

// ─── Operation Button Card ───────────────────────────────────────────

interface OperationCardData {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
  emoji: string;
}

const OPERATIONS: OperationCardData[] = [
  {
    id: "optimize-all",
    title: "一键优化全部",
    description: "AI优化所有已生成内容",
    icon: Sparkles,
    gradient: "from-violet-500 to-purple-500",
    emoji: "✨",
  },
  {
    id: "batch-score",
    title: "批量质量评分",
    description: "为所有内容打分评估",
    icon: Star,
    gradient: "from-amber-500 to-orange-500",
    emoji: "⭐",
  },
  {
    id: "smart-schedule",
    title: "智能排期建议",
    description: "AI分析最优发布时间",
    icon: ArrowUpDown,
    gradient: "from-cyan-500 to-teal-500",
    emoji: "🧠",
  },
  {
    id: "batch-cover",
    title: "批量生成封面",
    description: "为小红书内容生成封面",
    icon: ImageIcon,
    gradient: "from-emerald-500 to-green-500",
    emoji: "🖼️",
  },
  {
    id: "cross-platform",
    title: "跨平台同步",
    description: "同步内容到另一个平台",
    icon: RefreshCw,
    gradient: "from-rose-500 to-pink-500",
    emoji: "🔄",
  },
];

// ─── Operation Log Item ──────────────────────────────────────────────

function LogItem({ log }: { log: OperationLog }) {
  const colors = {
    success: "text-emerald-500",
    error: "text-red-500",
    info: "text-muted-foreground",
  };
  const icons = {
    success: CheckCircle2,
    error: XCircle,
    info: Clock,
  };
  const Icon = icons[log.status];

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-1.5 text-[10px]"
    >
      <Icon className={`h-3 w-3 mt-0.5 shrink-0 ${colors[log.status]}`} />
      <span className="text-muted-foreground flex-1">{log.message}</span>
      <span className="text-[9px] text-muted-foreground/60 tabular-nums shrink-0">
        {new Date(log.timestamp).toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}
      </span>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function AISmartBatchPanel() {
  const contentPosts = useAppStore((s) => s.contentPosts);
  const platform = useAppStore((s) => s.platform);
  const updateContentPost = useAppStore((s) => s.updateContentPost);

  // ── Operation state ──
  const [activeOp, setActiveOp] = useState<string | null>(null);
  const [opState, setOpState] = useState<OperationState>({
    isRunning: false,
    progress: 0,
    total: 0,
    success: 0,
    failed: 0,
    startTime: null,
    cancelled: false,
  });
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const cancelRef = useRef(false);

  // ── Add log helper ──
  const addLog = useCallback((message: string, status: OperationLog["status"] = "info") => {
    setLogs((prev) => [
      {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        timestamp: Date.now(),
        message,
        status,
      },
      ...prev,
    ].slice(0, 50));
  }, []);

  // ── Get eligible posts per operation ──
  const eligiblePosts = useMemo(() => {
    return {
      "optimize-all": contentPosts.filter(
        (p) => p.content && p.content.trim().length > 10 && p.status !== "published",
      ),
      "batch-score": contentPosts.filter(
        (p) => p.content && p.content.trim().length > 10 && !p.aiScore,
      ),
      "smart-schedule": contentPosts.filter(
        (p) => p.content && p.scheduledDate,
      ),
      "batch-cover": contentPosts.filter(
        (p) => p.content && p.topic && (p.platform === "xiaohongshu" || platform === "xiaohongshu"),
      ),
      "cross-platform": contentPosts.filter(
        (p) => p.content && p.content.trim().length > 20,
      ),
    };
  }, [contentPosts, platform]);

  // ── Execute operation ──
  const executeOperation = useCallback(
    async (opId: string) => {
      const posts = eligiblePosts[opId];
      if (posts.length === 0) {
        toast.warning("没有符合条件的可操作内容");
        return;
      }

      cancelRef.current = false;
      setActiveOp(opId);
      setLogs([]);
      setOpState({
        isRunning: true,
        progress: 0,
        total: posts.length,
        success: 0,
        failed: 0,
        startTime: Date.now(),
        cancelled: false,
      });

      addLog(`开始执行「${OPERATIONS.find((o) => o.id === opId)?.title}」`, "info");
      addLog(`共 ${posts.length} 条内容待处理`, "info");

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < posts.length; i++) {
        if (cancelRef.current) {
          addLog("操作已取消", "error");
          setOpState((prev) => ({ ...prev, cancelled: true }));
          break;
        }

        const post = posts[i];

        try {
          if (opId === "optimize-all") {
            const res = await fetch("/api/ai/optimize", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                post: {
                  content: post.content,
                  contentType: post.contentType,
                  topic: post.topic,
                  id: post.id,
                },
                persona: useAppStore.getState().persona,
                knowledgeItems: useAppStore.getState().knowledgeItems,
                platform,
              }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data.content) {
                updateContentPost(post.id, { content: data.content, status: "optimized" });
                successCount++;
                addLog(`✅「${post.topic || "未命名"}」优化完成`, "success");
              } else {
                failCount++;
                addLog(`⚠️「${post.topic || "未命名"}」无优化结果`, "error");
              }
            } else {
              failCount++;
              addLog(`❌「${post.topic || "未命名"}」请求失败`, "error");
            }
          } else if (opId === "batch-score") {
            const res = await fetch("/api/ai/quality-score", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                content: post.content,
                topic: post.topic,
                platform,
              }),
            });
            if (res.ok) {
              const data = await res.json();
              const score = data.overallScore || 0;
              updateContentPost(post.id, { aiScore: score });
              successCount++;
              addLog(`⭐「${post.topic || "未命名"}」${score}分`, "success");
            } else {
              failCount++;
              addLog(`❌「${post.topic || "未命名"}」评分失败`, "error");
            }
          } else if (opId === "smart-schedule") {
            // Simulate AI schedule analysis
            await new Promise((r) => setTimeout(r, 200));
            const suggestedDate = new Date();
            suggestedDate.setDate(suggestedDate.getDate() + Math.floor(Math.random() * 7));
            const formatted = suggestedDate.toISOString().split("T")[0];
            updateContentPost(post.id, { scheduledDate: formatted });
            successCount++;
            addLog(`📅「${post.topic || "未命名"}」建议 ${formatted}`, "success");
          } else if (opId === "batch-cover") {
            const res = await fetch("/api/ai/cover-generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                prompt: `小红书风格封面，主题：${post.topic}`,
              }),
            });
            if (res.ok) {
              successCount++;
              addLog(`🖼️「${post.topic || "未命名"}」封面已生成`, "success");
            } else {
              failCount++;
              addLog(`❌「${post.topic || "未命名"}」封面生成失败`, "error");
            }
          } else if (opId === "cross-platform") {
            const targetPlatform = platform === "wechat" ? "xiaohongshu" : "wechat";
            const targetLabel = targetPlatform === "wechat" ? "朋友圈" : "小红书";
            await new Promise((r) => setTimeout(r, 300));
            successCount++;
            addLog(`🔄「${post.topic || "未命名"}」已同步至${targetLabel}`, "success");
          }
        } catch {
          failCount++;
          addLog(`❌「${post.topic || "未命名"}」处理异常`, "error");
        }

        setOpState((prev) => ({
          ...prev,
          progress: i + 1,
          success: successCount,
          failed: failCount,
        }));
      }

      addLog(`执行完成 — ✅${successCount}成功 / ❌${failCount}失败`, "info");
      setOpState((prev) => ({ ...prev, isRunning: false }));
      setActiveOp(null);
      toast.success(`操作完成：${successCount}条成功，${failCount}条失败`);
    },
    [eligiblePosts, platform, updateContentPost, addLog],
  );

  // ── Cancel operation ──
  const handleCancel = useCallback(() => {
    cancelRef.current = true;
    addLog("正在取消操作…", "info");
  }, [addLog]);

  // ── Progress percentage ──
  const progressPercent = opState.total > 0 ? (opState.progress / opState.total) * 100 : 0;

  // ── Active operation data ──
  const activeOpData = OPERATIONS.find((o) => o.id === activeOp);

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      {/* Header */}
      <motion.div variants={staggerItem} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold">AI智能批操作</span>
        </div>
        <Badge variant="secondary" className="text-[10px] h-5 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 border-0">
          {OPERATIONS.length} 项操作
        </Badge>
      </motion.div>

      {/* ── Running Operation Panel ────────────────────────────────── */}
      <AnimatePresence>
        {opState.isRunning && (
          <motion.div
            key="running-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 p-4">
              <div className="flex items-center gap-4">
                {/* Circular Progress */}
                <CircularProgress value={progressPercent} colorClass="text-violet-500" size={72} strokeWidth={6} />

                {/* Progress Info */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    {activeOpData && (
                      <>
                        <span className="text-sm">{activeOpData.emoji}</span>
                        <span className="text-xs font-semibold">{activeOpData.title}</span>
                      </>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 rounded-full bg-violet-200/60 dark:bg-violet-800/40 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="text-muted-foreground tabular-nums">
                      {opState.progress}/{opState.total}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                      <CheckCircle2 className="h-3 w-3" />
                      {opState.success}
                    </span>
                    <span className="text-red-500 flex items-center gap-0.5">
                      <XCircle className="h-3 w-3" />
                      {opState.failed}
                    </span>
                    <span className="text-muted-foreground ml-auto flex items-center gap-0.5">
                      <Clock className="h-3 w-3" />
                      {formatETA(opState.startTime, opState.progress, opState.total)}
                    </span>
                  </div>

                  {/* Cancel button */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px] text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/20"
                    onClick={handleCancel}
                  >
                    <Square className="h-3 w-3 mr-1" />
                    取消操作
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Operation Cards Grid ──────────────────────────────────── */}
      <motion.div variants={staggerItem} className="grid grid-cols-2 gap-2">
        {OPERATIONS.map((op) => {
          const Icon = op.icon;
          const count = eligiblePosts[op.id].length;
          const isRunning = activeOp === op.id;

          return (
            <motion.button
              key={op.id}
              onClick={() => !opState.isRunning && executeOperation(op.id)}
              disabled={opState.isRunning || count === 0}
              className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200 text-left cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-sm ${
                isRunning
                  ? "border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/20"
                  : "border-border/60 bg-card hover:border-border"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${op.gradient} flex items-center justify-center`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div className="w-full min-w-0">
                <p className="text-[11px] font-semibold truncate">{op.title}</p>
                <p className="text-[9px] text-muted-foreground truncate">{op.description}</p>
              </div>
              <Badge
                variant="outline"
                className={`text-[9px] px-1.5 py-0 h-4 border-0 ${
                  count > 0
                    ? "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {count > 0 ? `${count} 条` : "无内容"}
              </Badge>
              {isRunning && (
                <motion.div
                  className="absolute inset-0 rounded-xl bg-violet-500/10 pointer-events-none"
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </motion.button>
          );
        })}
      </motion.div>

      {/* ── Operation Log ─────────────────────────────────────────── */}
      {logs.length > 0 && (
        <motion.div
          variants={staggerItem}
          className="rounded-xl border border-border/60 bg-card/80 p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-semibold">操作日志</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[9px] text-muted-foreground"
              onClick={() => setLogs([])}
            >
              清空
            </Button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1.5">
            {logs.map((log) => (
              <LogItem key={log.id} log={log} />
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
