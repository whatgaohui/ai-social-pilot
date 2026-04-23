"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Database,
  HardDrive,
  Shield,
  Clock,
  Zap,
  BarChart3,
  TrendingUp,
  RefreshCw,
  Download,
  Activity,
  FolderOpen,
  CheckCircle2,
  Loader2,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

interface HealthData {
  healthScore: number;
  database: { size: number; sizeFormatted: string; tableCounts: Record<string, number> };
  storage: { dbSize: number; backupSize: number; backupSizeFormatted: string; backupCount: number; totalUsed: number; totalUsedFormatted: string };
  backup: { lastBackupTime: string | null; backupCount: number; autoBackupEnabled: boolean };
  apiPerformance: { responseTime: number; status: string };
  content: { totalPosts: number; publishedPosts: number; scheduledPosts: number; totalPlans: number; totalKnowledge: number };
  system: { version: string; build: string; memoryMB: number; uptime: number; nodeVersion: string };
  timestamp: string;
}

function HealthScoreGauge({ score }: { score: number }) {
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  const label = score >= 80 ? "优秀" : score >= 60 ? "良好" : "需关注";
  const labelColor = score >= 80 ? "text-emerald-600 dark:text-emerald-400" : score >= 60 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="health-score-ring">
        <svg width={140} height={140} viewBox="0 0 140 140">
          <circle
            cx="70"
            cy="70"
            r={radius}
            className="score-track"
          />
          <motion.circle
            cx="70"
            cy="70"
            r={radius}
            className="score-fill"
            stroke={color}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </svg>
        <div className="score-label">
          <span className="text-2xl font-bold tabular-nums" style={{ color }}>{score}</span>
          <span className={`text-[10px] font-medium ${labelColor}`}>{label}</span>
        </div>
      </div>
    </div>
  );
}

function StatusCard({
  icon: Icon,
  title,
  children,
  gradient,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  gradient: string;
}) {
  return (
    <Card className="health-status-card">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className={`h-7 w-7 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
            <Icon className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-xs font-medium">{title}</span>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function Sparkline({ scores }: { scores: number[] }) {
  return (
    <div className="health-sparkline">
      {scores.map((s, i) => (
        <div
          key={i}
          className={`spark-bar ${s < 60 ? "spark-bar-danger" : s < 80 ? "spark-bar-warning" : ""}`}
          style={{ height: `${Math.max((s / 100) * 32, 3)}px` }}
        />
      ))}
    </div>
  );
}

export function SystemHealthDashboard() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/system-health");
      if (res.ok) {
        setHealth(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const handleOptimize = async () => {
    setOptimizing(true);
    try {
      const res = await fetch("/api/settings/optimize-db", { method: "POST" });
      if (res.ok) {
        toast.success("数据库优化完成");
        fetchHealth();
      } else {
        toast.error("优化失败");
      }
    } catch {
      toast.error("优化失败");
    } finally {
      setOptimizing(false);
    }
  };

  const handleExportReport = async () => {
    if (!health) return;
    try {
      const blob = new Blob([JSON.stringify(health, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `health-report-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("报告已导出");
    } catch {
      toast.error("导出失败");
    }
  };

  const handleBackup = async () => {
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auto: false }),
      });
      if (res.ok) {
        toast.success("备份创建成功");
        fetchHealth();
      } else {
        toast.error("备份失败");
      }
    } catch {
      toast.error("备份失败");
    }
  };

  const handleClearCache = () => {
    if (!confirm("确定要清除所有缓存吗？")) return;
    try {
      const preservedKeys = [
        "theme", "onboarding-completed", "settings-notifications",
        "settings-display", "settings-default-platform", "settings-view-mode", "settings-compact-mode",
      ];
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !preservedKeys.includes(key)) keysToRemove.push(key);
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      toast.success(`已清除 ${keysToRemove.length} 项缓存`);
      fetchHealth();
    } catch {
      toast.error("清除缓存失败");
    }
  };

  const mockScores = [92, 88, 90, 85, 78, 82, 95, 88, 91, 93, 87, 90, 89, 92];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!health) {
    return (
      <div className="text-center py-8 text-muted-foreground text-xs">无法加载系统状态</div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Health Score */}
      <div className="flex justify-center">
        <HealthScoreGauge score={health.healthScore} />
      </div>

      {/* Status Cards Grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatusCard
          icon={Database}
          title="数据库状态"
          gradient="from-violet-500 to-purple-600"
        >
          <div className="text-[11px] text-muted-foreground">大小: {health.database.sizeFormatted}</div>
          <div className="text-[11px] text-muted-foreground">表: {Object.entries(health.database.tableCounts).reduce((a) => a + 1, 0)} 个</div>
          <div className="text-[11px] text-muted-foreground">
            内容: {health.content.totalPosts} 篇 · 计划: {health.content.totalPlans} 个
          </div>
        </StatusCard>

        <StatusCard
          icon={HardDrive}
          title="存储空间"
          gradient="from-emerald-500 to-teal-600"
        >
          <div className="text-[11px] text-muted-foreground">
            数据库: {health.database.sizeFormatted}
          </div>
          <div className="text-[11px] text-muted-foreground">
            备份: {health.storage.backupSizeFormatted} ({health.storage.backupCount})
          </div>
          <div className="text-[11px] text-muted-foreground">
            总计: {health.storage.totalUsedFormatted}
          </div>
        </StatusCard>

        <StatusCard
          icon={Clock}
          title="备份状态"
          gradient="from-amber-500 to-orange-500"
        >
          {health.backup.lastBackupTime ? (
            <div className="text-[11px] text-muted-foreground">
              上次: {new Date(health.backup.lastBackupTime).toLocaleDateString("zh-CN")}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3" />
              尚无备份
            </div>
          )}
          <div className="text-[11px] text-muted-foreground">
            自动备份: {health.backup.autoBackupEnabled ? "已启用" : "未启用"}
          </div>
        </StatusCard>

        <StatusCard
          icon={Zap}
          title="API性能"
          gradient="from-rose-500 to-pink-600"
        >
          <div className="flex items-center gap-1.5">
            <div className={`h-2 w-2 rounded-full ${
              health.apiPerformance.status === "good"
                ? "bg-emerald-500"
                : health.apiPerformance.status === "moderate"
                  ? "bg-amber-500"
                  : "bg-red-500"
            }`} />
            <span className="text-[11px] text-muted-foreground">
              {health.apiPerformance.responseTime}ms
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            状态: {health.apiPerformance.status === "good" ? "正常" : health.apiPerformance.status === "moderate" ? "一般" : "较慢"}
          </div>
        </StatusCard>

        <StatusCard
          icon={BarChart3}
          title="内容统计"
          gradient="from-cyan-500 to-blue-600"
        >
          <div className="text-[11px] text-muted-foreground">
            总内容: {health.content.totalPosts}
          </div>
          <div className="text-[11px] text-muted-foreground">
            已发布: {health.content.publishedPosts} · 定时: {health.content.scheduledPosts}
          </div>
          <div className="text-[11px] text-muted-foreground">
            计划: {health.content.totalPlans} · 知识: {health.content.totalKnowledge}
          </div>
        </StatusCard>

        <StatusCard
          icon={Activity}
          title="系统版本"
          gradient="from-slate-400 to-slate-600"
        >
          <div className="text-[11px] text-muted-foreground">
            v{health.system.version} · Build {health.system.build}
          </div>
          <div className="text-[11px] text-muted-foreground">
            内存: {health.system.memoryMB}MB
          </div>
          <div className="text-[11px] text-muted-foreground">
            运行: {Math.floor(health.system.uptime / 3600)}h {Math.floor((health.system.uptime % 3600) / 60)}m
          </div>
        </StatusCard>
      </div>

      {/* Health History Sparkline */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground">健康趋势</span>
          <span className="text-[10px] text-muted-foreground">近15次</span>
        </div>
        <Sparkline scores={mockScores} />
      </div>

      {/* Quick Actions */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-muted-foreground mb-2">快捷操作</p>
        <div className="action-grid">
          <button className="action-card" onClick={handleBackup}>
            <Download className="h-4 w-4 text-violet-500" />
            <span className="text-[10px] font-medium">立即备份</span>
          </button>
          <button className="action-card" onClick={handleClearCache}>
            <RefreshCw className="h-4 w-4 text-amber-500" />
            <span className="text-[10px] font-medium">清理缓存</span>
          </button>
          <button className="action-card" onClick={handleOptimize}>
            <Database className="h-4 w-4 text-emerald-500" />
            <span className="text-[10px] font-medium">优化数据库</span>
          </button>
          <button className="action-card" onClick={handleExportReport}>
            <TrendingUp className="h-4 w-4 text-rose-500" />
            <span className="text-[10px] font-medium">导出报告</span>
          </button>
        </div>
      </div>
    </div>
  );
}
