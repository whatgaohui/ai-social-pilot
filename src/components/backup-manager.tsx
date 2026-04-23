"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Shield,
  Download,
  Upload,
  Trash2,
  Loader2,
  HardDrive,
  Clock,
  FileJson,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FolderOpen,
  RefreshCw,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

interface BackupItem {
  filename: string;
  size: number;
  date: string;
  type: string;
  recordCounts: Record<string, number>;
}

interface BackupManagerProps {
  compact?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "刚刚";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function BackupManager({ compact = false }: BackupManagerProps) {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoringFile, setRestoringFile] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [autoBackup, setAutoBackup] = useState(false);
  const [maxBackups, setMaxBackups] = useState(10);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupItem | null>(null);

  const fetchBackups = useCallback(async () => {
    try {
      const res = await fetch("/api/backup");
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auto: false }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success("备份创建成功", { description: `文件大小: ${formatBytes(data.size)}` });
        fetchBackups();
      } else {
        toast.error("备份创建失败");
      }
    } catch {
      toast.error("备份创建失败");
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedBackup) return;
    setRestoring(true);
    try {
      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: selectedBackup.filename }),
      });
      if (res.ok) {
        const data = await res.json();
        const counts = data.restoredCounts as Record<string, number>;
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        toast.success("数据恢复成功", { description: `共恢复 ${total} 条记录` });
        setRestoreDialogOpen(false);
        setSelectedBackup(null);
      } else {
        const err = await res.json().catch(() => ({ error: "恢复失败" }));
        toast.error(err.error || "恢复失败");
      }
    } catch {
      toast.error("恢复失败");
    } finally {
      setRestoring(false);
    }
  };

  const handleDelete = async (filename: string) => {
    setDeleting(filename);
    try {
      const res = await fetch(`/api/backup?filename=${encodeURIComponent(filename)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("备份已删除");
        fetchBackups();
      } else {
        toast.error("删除失败");
      }
    } catch {
      toast.error("删除失败");
    } finally {
      setDeleting(null);
    }
  };

  const handleDownload = async (backup: BackupItem) => {
    try {
      const res = await fetch(`/api/backup/download?filename=${encodeURIComponent(backup.filename)}`);
      if (!res.ok) {
        toast.error("下载失败");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = backup.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("下载开始");
    } catch {
      toast.error("下载失败");
    }
  };

  const totalBackupSize = backups.reduce((sum, b) => sum + b.size, 0);

  return (
    <div className="space-y-4">
      {/* Create Backup Button */}
      <Button
        onClick={handleCreateBackup}
        disabled={creating}
        className={`w-full h-9 text-xs ${creating ? "opacity-70" : ""}`}
        style={{
          background: creating ? undefined : "linear-gradient(135deg, #8b5cf6, #a855f7)",
          color: "#fff",
        }}
      >
        {creating ? (
          <>
            <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
            <span className="backup-progress inline-block w-32 h-1.5 rounded bg-white/20 relative overflow-hidden">
              <span className="absolute inset-0 bg-white/40 animate-[backup-progress-slide_1.5s_ease-in-out_infinite]" />
            </span>
            创建中...
          </>
        ) : (
          <>
            <Upload className="h-3.5 w-3.5 mr-2" />
            立即备份
          </>
        )}
      </Button>

      {/* Auto-backup Settings */}
      <div className="space-y-3 p-3 rounded-lg border border-border/60 bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-violet-500" />
            <span className="text-xs font-medium">自动备份</span>
          </div>
          <Switch checked={autoBackup} onCheckedChange={setAutoBackup} />
        </div>
        {autoBackup && (
          <div className="space-y-2">
            <div>
              <label className="text-[11px] text-muted-foreground">备份频率</label>
              <Select defaultValue="daily" className="mt-1">
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">每天</SelectItem>
                  <SelectItem value="weekly">每周</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">最大备份数: {maxBackups}</label>
              <Slider
                value={[maxBackups]}
                onValueChange={(v) => setMaxBackups(v[0])}
                min={5}
                max={20}
                step={1}
                className="mt-1"
              />
            </div>
          </div>
        )}
      </div>

      {/* Storage Indicator */}
      <div className="p-3 rounded-lg border border-border/60 bg-muted/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] font-medium text-muted-foreground">存储空间</span>
          </div>
          <span className="text-[11px] text-muted-foreground">{formatBytes(totalBackupSize)}</span>
        </div>
        <div className="storage-bar">
          <div
            className="storage-fill"
            style={{
              width: `${Math.min((totalBackupSize / (maxBackups * 1024 * 1024)) * 100, 100)}%`,
              background: totalBackupSize > maxBackups * 1024 * 1024 * 0.8
                ? "linear-gradient(90deg, #ef4444, #f87171)"
                : "linear-gradient(90deg, #8b5cf6, #a78bfa)",
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-muted-foreground">{backups.length} 个备份</span>
          {backups.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-destructive"
              onClick={() => {
                const oldest = backups[backups.length - 1];
                if (oldest) handleDelete(oldest.filename);
              }}
            >
              清理旧备份
            </Button>
          )}
        </div>
      </div>

      {/* Backup List */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">备份记录</p>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : backups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <FolderOpen className="h-8 w-8 mb-2 opacity-30" />
            <span className="text-xs">暂无备份</span>
          </div>
        ) : (
          <ScrollArea className="max-h-48">
            <div className="space-y-2 pr-2">
              {backups.map((backup) => {
                const isDeletingItem = deleting === backup.filename;
                return (
                  <motion.div
                    key={backup.filename}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="backup-card rounded-lg p-3 bg-background"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                          <FileJson className="h-4 w-4 text-violet-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium truncate">{backup.filename.slice(0, 30)}</span>
                            <Badge
                              className={`backup-type-badge ${
                                backup.type === "auto" ? "backup-type-badge-auto" : "backup-type-badge-manual"
                              }`}
                            >
                              {backup.type === "auto" ? "自动" : "手动"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" />
                              {formatDate(backup.date)}
                            </span>
                            <span>{formatBytes(backup.size)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-violet-600"
                          onClick={() => {
                            setSelectedBackup(backup);
                            setRestoreDialogOpen(true);
                          }}
                          title="恢复此备份"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-emerald-600"
                          onClick={() => handleDownload(backup)}
                          title="下载"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          disabled={isDeletingItem}
                          onClick={() => handleDelete(backup.filename)}
                          title="删除"
                        >
                          {isDeletingItem ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              确认恢复数据
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>您即将从以下备份恢复数据：</p>
                <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
                  <p className="text-xs font-medium break-all">{selectedBackup?.filename}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {selectedBackup?.date && formatDate(selectedBackup.date)}
                  </p>
                </div>
                <div className="flex items-start gap-2 p-2 rounded bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-red-700 dark:text-red-400">
                      恢复将覆盖当前所有数据
                    </p>
                    <p className="text-[10px] text-red-600/80 dark:text-red-400/80 mt-0.5">
                      此操作不可撤销，建议先创建当前数据的备份
                    </p>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              disabled={restoring}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {restoring ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                  恢复中...
                </>
              ) : (
                <>
                  <Shield className="h-3.5 w-3.5 mr-2" />
                  确认恢复
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
