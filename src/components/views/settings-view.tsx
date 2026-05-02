"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAppStore } from "@/store/app-store";
import { useNotificationStore } from "@/store/notification-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Settings,
  Database,
  Trash2,
  Download,
  RefreshCw,
  Info,
  ExternalLink,
  Shield,
  Heart,
  Sparkles,
  FileText,
  Users,
  Moon,
  Sun,
  Monitor,
  Bell,
  Globe,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

type ThemeMode = "light" | "dark" | "system";

export function SettingsView() {
  const { setAddAccountDialogOpen } = useAppStore();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const [clearingData, setClearingData] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("light");

  const handleExportAll = async () => {
    setExportingData(true);
    try {
      const res = await fetch("/api/export", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        const dateStr = new Date().toISOString().slice(0, 10);
        const filename = `xhs-full-backup-${dateStr}.json`;
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("数据备份成功！");
      } else {
        toast.error(data.error || "备份失败");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setExportingData(false);
    }
  };

  const handleClearData = async () => {
    if (!confirm("确定要清空所有数据吗？此操作不可恢复。建议先备份数据。")) return;

    setClearingData(true);
    try {
      // Delete all accounts (cascades to posts, personas, etc.)
      const res = await fetch("/api/accounts");
      const data = await res.json();
      if (data.success) {
        for (const account of data.data || []) {
          await fetch(`/api/accounts/${account.id}`, { method: "DELETE" });
        }
        toast.success("数据已清空");
        addNotification({
          type: "info",
          title: "数据已清空",
          message: "所有账号和相关数据已删除",
          navigateTo: "dashboard",
        });
      }
    } catch {
      toast.error("清空数据失败，请重试");
    } finally {
      setClearingData(false);
    }
  };

  const handleLoadDemo = async () => {
    try {
      const res = await fetch("/api/demo/seed", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success("演示数据加载成功！");
        addNotification({
          type: "info",
          title: "演示数据已加载",
          message: "已加载示例账号和笔记数据",
          navigateTo: "dashboard",
        });
      } else {
        toast.error(data.error || "加载演示数据失败");
      }
    } catch {
      toast.error("网络错误，请重试");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-5 custom-scrollbar overflow-y-auto h-full pb-20 md:pb-6 view-animate">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">设置</h2>
        <p className="text-sm text-muted-foreground mt-0.5">应用偏好与数据管理</p>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-500" />
            外观
          </CardTitle>
          <CardDescription className="text-xs">自定义应用显示主题</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium">主题模式</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "light" as ThemeMode, label: "浅色", icon: Sun, desc: "明亮清爽" },
                { value: "dark" as ThemeMode, label: "深色", icon: Moon, desc: "护眼模式" },
                { value: "system" as ThemeMode, label: "跟随系统", icon: Monitor, desc: "自动适配" },
              ].map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-xs",
                      theme === opt.value
                        ? "border-xhs bg-xhs-light text-xhs shadow-sm shadow-xhs/10"
                        : "border-border hover:border-xhs/30 hover:bg-muted/50"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-[10px] text-muted-foreground">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-500" />
            通知
          </CardTitle>
          <CardDescription className="text-xs">管理应用通知偏好</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
            <div>
              <p className="text-sm font-medium">数据采集完成</p>
              <p className="text-xs text-muted-foreground">账号数据采集成功后通知</p>
            </div>
            <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-600 border-0">
              <CheckCircle2 className="w-3 h-3 mr-0.5" />
              已开启
            </Badge>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
            <div>
              <p className="text-sm font-medium">AI创作完成</p>
              <p className="text-xs text-muted-foreground">内容生成或润色完成后通知</p>
            </div>
            <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-600 border-0">
              <CheckCircle2 className="w-3 h-3 mr-0.5" />
              已开启
            </Badge>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
            <div>
              <p className="text-sm font-medium">数据导出</p>
              <p className="text-xs text-muted-foreground">数据导出完成后通知</p>
            </div>
            <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-600 border-0">
              <CheckCircle2 className="w-3 h-3 mr-0.5" />
              已开启
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Database className="w-4 h-4 text-rose-500" />
            数据管理
          </CardTitle>
          <CardDescription className="text-xs">备份、恢复和管理应用数据</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
            <div>
              <p className="text-sm font-medium">备份数据</p>
              <p className="text-xs text-muted-foreground">导出所有数据为JSON文件</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-border"
              onClick={handleExportAll}
              disabled={exportingData}
            >
              {exportingData ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 mr-1" />
              )}
              备份
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
            <div>
              <p className="text-sm font-medium">加载演示数据</p>
              <p className="text-xs text-muted-foreground">加载示例账号和笔记数据体验功能</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-border"
              onClick={handleLoadDemo}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              加载
            </Button>
          </div>

          <Separator className="opacity-50" />

          <div className="flex items-center justify-between p-3 rounded-xl bg-red-50/50 dark:bg-red-950/10 border border-red-200/30 dark:border-red-900/20">
            <div>
              <p className="text-sm font-medium text-destructive">清空所有数据</p>
              <p className="text-xs text-muted-foreground">删除所有账号、笔记和人设数据</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={handleClearData}
              disabled={clearingData}
            >
              {clearingData ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5 mr-1" />
              )}
              清空
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Info className="w-4 h-4 text-muted-foreground" />
            关于
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-xhs-light/40 to-xhs-light/10 border border-xhs/10">
            <div className="w-12 h-12 rounded-xl bg-xhs flex items-center justify-center shadow-sm shadow-xhs/20">
              <span className="text-white font-bold text-lg">红</span>
            </div>
            <div>
              <p className="font-semibold text-sm">小红书AI运营助手</p>
              <p className="text-xs text-muted-foreground mt-0.5">版本 1.0.0</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-muted/30 text-center">
              <Sparkles className="w-5 h-5 mx-auto text-xhs mb-1" />
              <p className="text-xs font-medium">AI创作</p>
              <p className="text-[10px] text-muted-foreground">智能内容生成</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 text-center">
              <Users className="w-5 h-5 mx-auto text-rose-500 mb-1" />
              <p className="text-xs font-medium">多账号</p>
              <p className="text-[10px] text-muted-foreground">统一管理运营</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 text-center">
              <FileText className="w-5 h-5 mx-auto text-amber-500 mb-1" />
              <p className="text-xs font-medium">数据分析</p>
              <p className="text-[10px] text-muted-foreground">深度数据洞察</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 text-center">
              <Heart className="w-5 h-5 mx-auto text-emerald-500 mb-1" />
              <p className="text-xs font-medium">人设管理</p>
              <p className="text-[10px] text-muted-foreground">风格化创作</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground pt-2">
            <span>Made with</span>
            <Heart className="w-3 h-3 text-xhs fill-xhs" />
            <span>by Z.ai</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Label({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement> & { className?: string }) {
  return (
    <label className={cn("text-xs font-medium", className)} {...props}>
      {children}
    </label>
  );
}
