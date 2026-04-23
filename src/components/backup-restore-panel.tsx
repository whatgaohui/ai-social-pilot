"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Clock,
  HardDrive,
  FileJson,
  CheckCircle,
  AlertTriangle,
  Play,
  Database,
  Calendar,
  Info,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────

interface BackupInfo {
  filename: string;
  size: number;
  date: string;
  type: string;
  recordCounts: Record<string, number>;
}

interface RestorePreview {
  recordCounts: Record<string, number>;
  totalRecords: number;
  timestamp: string;
  version?: string;
}

interface BackupSettings {
  autoBackupEnabled: boolean;
  maxAutoBackups: number;
  lastAutoBackupTime: string | null;
  nextAutoBackupTime: string | null;
}

const DEFAULT_BACKUP_SETTINGS: BackupSettings = {
  autoBackupEnabled: false,
  maxAutoBackups: 7,
  lastAutoBackupTime: null,
  nextAutoBackupTime: null,
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ─── Model label mapping ──────────────────────────────────────────

const MODEL_LABELS: Record<string, string> = {
  contentPosts: "内容",
  knowledgeItems: "知识库",
  contentPlans: "内容计划",
  personas: "人设",
  contentVersions: "版本记录",
  aiConfigs: "AI配置",
  materials: "素材",
  platformAccounts: "平台账号",
  notifications: "通知",
  trackedAccounts: "追踪账号",
};

const MODEL_COLORS: Record<string, string> = {
  contentPosts: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  knowledgeItems: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  contentPlans: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  personas: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  contentVersions: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  aiConfigs: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  materials: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  platformAccounts: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  notifications: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  trackedAccounts: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

// ─── Main Component ───────────────────────────────────────────────

export function BackupRestorePanel() {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [restoringFilename, setRestoringFilename] = useState<string | null>(null);

  // Auto backup settings — lazy initializer avoids effect+setState
  const [settings, setSettings] = useState<BackupSettings>(() => {
    if (typeof window === "undefined") return DEFAULT_BACKUP_SETTINGS;
    try {
      const stored = localStorage.getItem("backup-settings");
      if (stored) return { ...DEFAULT_BACKUP_SETTINGS, ...JSON.parse(stored) };
    } catch { /* noop */ }
    return DEFAULT_BACKUP_SETTINGS;
  });

  // Restore preview
  const [previewOpen, setPreviewOpen] = useState(false);
  const [restorePreview, setRestorePreview] = useState<RestorePreview | null>(null);
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);

  // File upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveSettings = useCallback((next: BackupSettings) => {
    setSettings(next);
    try { localStorage.setItem("backup-settings", JSON.stringify(next)); } catch { /* noop */ }
  }, []);

  // Fetch backup list
  const fetchBackups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/backup");
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups || []);
      }
    } catch { /* noop */ }
    setLoading(false);
  }, []);

  // Trigger initial fetch once
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/backup", { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          setBackups(data.backups || []);
        }
      } catch { /* noop */ }
      setLoading(false);
    })();
    return () => controller.abort();
  }, []);

  // Create manual backup
  const handleCreateBackup = useCallback(async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auto: false }),
      });
      if (res.ok) {
        await fetchBackups();
      }
    } catch { /* noop */ }
    setCreating(false);
  }, [fetchBackups]);

  // Delete backup
  const handleDeleteBackup = useCallback(async (filename: string) => {
    try {
      const res = await fetch(`/api/backup?filename=${encodeURIComponent(filename)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchBackups();
      }
    } catch { /* noop */ }
  }, [fetchBackups]);

  // Download backup
  const handleDownload = useCallback((filename: string) => {
    window.open(`/api/backup/download?filename=${encodeURIComponent(filename)}`, "_blank");
  }, []);

  // Preview restore from file upload
  const handleFileUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        const counts = data.metadata?.recordCounts || {};
        const total = Object.values(counts).reduce((sum: number, c: number) => sum + c, 0);
        setRestorePreview({
          recordCounts: counts,
          totalRecords: total,
          timestamp: data.timestamp || new Date().toISOString(),
          version: data.version,
        });
        setPreviewOpen(true);
      } catch {
        alert("无效的备份文件格式");
      }
    };
    reader.readAsText(file);
  }, []);

  // Preview restore from existing backup
  const handlePreviewRestore = useCallback((backup: BackupInfo) => {
    setRestorePreview({
      recordCounts: backup.recordCounts,
      totalRecords: Object.values(backup.recordCounts).reduce((sum, c) => sum + c, 0),
      timestamp: backup.date,
    });
    setRestoringFilename(backup.filename);
    setPreviewOpen(true);
  }, []);

  // Execute restore
  const handleExecuteRestore = useCallback(async () => {
    if (!restoringFilename) return;
    setConfirmRestoreOpen(false);
    setRestoring(true);
    setRestoreProgress(10);

    try {
      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setRestoreProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 500);

      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: restoringFilename }),
      });

      clearInterval(progressInterval);

      if (res.ok) {
        setRestoreProgress(100);
        await fetchBackups();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || "恢复失败");
        setRestoreProgress(0);
      }
    } catch {
      alert("恢复失败，请重试");
      setRestoreProgress(0);
    }
    setRestoring(false);
    setRestoringFilename(null);
    setRestorePreview(null);
  }, [restoringFilename, fetchBackups]);

  // Toggle auto backup
  const toggleAutoBackup = useCallback(async (enabled: boolean) => {
    const next = { ...settings, autoBackupEnabled: enabled };
    saveSettings(next);
    if (enabled) {
      const nextTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      next.nextAutoBackupTime = nextTime.toISOString();
      next.lastAutoBackupTime = new Date().toISOString();
      saveSettings(next);
    }
  }, [settings, saveSettings]);

  const totalBackupSize = backups.reduce((sum, b) => sum + b.size, 0);
  const autoBackups = backups.filter((b) => b.type === "auto");
  const manualBackups = backups.filter((b) => b.type === "manual");

  return (
    <div className="space-y-6">
      {/* ─── Manual Backup Section ──────────────────────────── */}
      <Card className="border-violet-200/50 dark:border-violet-800/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Database className="h-4 w-4 text-violet-500" />
            手动备份
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            创建完整数据备份，包含所有内容、人设、知识库、配置等信息
          </p>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleCreateBackup}
              disabled={creating}
              className="bg-violet-600 hover:bg-violet-700 text-white text-xs gap-1.5"
            >
              {creating ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {creating ? "创建中..." : "创建备份"}
            </Button>
            <span className="text-[10px] text-muted-foreground">
              {backups.length > 0
                ? `已有 ${backups.length} 个备份，共 ${formatBytes(totalBackupSize)}`
                : "暂无备份"}
            </span>
          </div>

          {/* Restore from file upload */}
          <div className="flex items-center gap-3 pt-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
                e.target.value = "";
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              从文件恢复
            </Button>
            <span className="text-[10px] text-muted-foreground">
              支持 .json 备份文件
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ─── Auto Backup Section ────────────────────────────── */}
      <Card className="border-amber-200/50 dark:border-amber-800/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            自动备份
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs">每日自动备份</span>
              <Badge variant="secondary" className="text-[9px]">
                最多保留 {settings.maxAutoBackups} 份
              </Badge>
            </div>
            <Switch
              checked={settings.autoBackupEnabled}
              onCheckedChange={toggleAutoBackup}
            />
          </div>

          {settings.autoBackupEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex items-center gap-4 pt-1"
            >
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {settings.lastAutoBackupTime
                  ? `上次备份: ${formatDate(settings.lastAutoBackupTime)}`
                  : "尚未执行自动备份"}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                {settings.nextAutoBackupTime
                  ? `下次备份: ${formatDate(settings.nextAutoBackupTime)}`
                  : "待设置"}
              </div>
              <Badge variant="secondary" className="text-[9px]">
                自动: {autoBackups.length} / {settings.maxAutoBackups}
              </Badge>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* ─── Backup History ──────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileJson className="h-4 w-4 text-emerald-500" />
            备份历史
            {backups.length > 0 && (
              <Badge variant="secondary" className="text-[9px] ml-1">
                {backups.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <HardDrive className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">暂无备份记录</p>
              <p className="text-[10px] mt-1">点击上方按钮创建第一个备份</p>
            </div>
          ) : (
            <ScrollArea className="max-h-80">
              <div className="space-y-2">
                {manualBackups.length > 0 && (
                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      手动备份
                    </span>
                    <div className="mt-1.5 space-y-1.5">
                      {manualBackups.map((backup) => (
                        <BackupRow
                          key={backup.filename}
                          backup={backup}
                          onDownload={handleDownload}
                          onRestore={handlePreviewRestore}
                          onDelete={handleDeleteBackup}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {autoBackups.length > 0 && (
                  <div className={manualBackups.length > 0 ? "mt-4" : ""}>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      自动备份
                    </span>
                    <div className="mt-1.5 space-y-1.5">
                      {autoBackups.map((backup) => (
                        <BackupRow
                          key={backup.filename}
                          backup={backup}
                          onDownload={handleDownload}
                          onRestore={handlePreviewRestore}
                          onDelete={handleDeleteBackup}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* ─── Restore Progress Overlay ────────────────────────── */}
      {(restoring || restoreProgress > 0) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="bg-background rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <RefreshCw className="h-5 w-5 text-violet-600 dark:text-violet-400 animate-spin" />
              </div>
              <div>
                <p className="text-sm font-semibold">正在恢复数据</p>
                <p className="text-[10px] text-muted-foreground">请勿关闭页面...</p>
              </div>
            </div>
            <Progress value={Math.min(restoreProgress, 100)} className="h-2 mb-2" />
            <p className="text-[10px] text-muted-foreground text-center">
              {Math.min(Math.round(restoreProgress), 100)}%
            </p>
          </motion.div>
        </motion.div>
      )}

      {/* ─── Preview Dialog ──────────────────────────────────── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">恢复预览</DialogTitle>
            <DialogDescription className="text-xs">
              确认以下备份数据将恢复到系统中
            </DialogDescription>
          </DialogHeader>

          {restorePreview && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <Info className="h-3 w-3" />
                <span>
                  {restorePreview.version && `版本 ${restorePreview.version} · `}
                  {formatDate(restorePreview.timestamp)}
                </span>
              </div>

              <div className="rounded-xl border p-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span>数据概览</span>
                  <Badge variant="secondary" className="text-[9px]">
                    共 {restorePreview.totalRecords} 条记录
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(restorePreview.recordCounts)
                    .filter(([, count]) => count > 0)
                    .sort(([, a], [, b]) => b - a)
                    .map(([model, count]) => (
                      <div
                        key={model}
                        className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-muted/50"
                      >
                        <span className="text-[10px]">
                          {MODEL_LABELS[model] || model}
                        </span>
                        <Badge
                          className={MODEL_COLORS[model] || "text-[9px]"}
                        >
                          {count as number}
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>

              <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <span className="text-[10px] text-amber-700 dark:text-amber-300">
                  恢复将覆盖现有数据，此操作不可撤销。建议先创建当前备份。
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                setPreviewOpen(false);
                setRestorePreview(null);
                setRestoringFilename(null);
              }}
            >
              取消
            </Button>
            <Button
              size="sm"
              className="text-xs bg-violet-600 hover:bg-violet-700 text-white gap-1"
              onClick={() => setConfirmRestoreOpen(true)}
            >
              <Play className="h-3 w-3" />
              开始恢复
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Confirm Restore Dialog ──────────────────────────── */}
      <Dialog open={confirmRestoreOpen} onOpenChange={setConfirmRestoreOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              确认恢复
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            即将恢复备份数据，现有数据将被替换。确定要继续吗？
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setConfirmRestoreOpen(false)}
            >
              再想想
            </Button>
            <Button
              size="sm"
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white gap-1"
              onClick={handleExecuteRestore}
            >
              <RefreshCw className="h-3 w-3" />
              确认恢复
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Backup Row Component ──────────────────────────────────────────

function BackupRow({
  backup,
  onDownload,
  onRestore,
  onDelete,
}: {
  backup: BackupInfo;
  onDownload: (filename: string) => void;
  onRestore: (backup: BackupInfo) => void;
  onDelete: (filename: string) => void;
}) {
  const totalRecords = Object.values(backup.recordCounts).reduce((sum, c) => sum + c, 0);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      className="flex items-center justify-between p-2.5 rounded-lg border border-border/20 hover:bg-muted/50 transition-colors group"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
          <FileJson className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium truncate">
            {backup.filename.replace(/\.json$/, "")}
          </p>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>{formatDate(backup.date)}</span>
            <span>·</span>
            <span>{formatBytes(backup.size)}</span>
            {totalRecords > 0 && (
              <>
                <span>·</span>
                <span>{totalRecords} 条</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onDownload(backup.filename)}
              >
                <Download className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[10px]">
              下载
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                onClick={() => onRestore(backup)}
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[10px]">
              恢复
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30"
                onClick={() => onDelete(backup.filename)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[10px]">
              删除
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </motion.div>
  );
}
