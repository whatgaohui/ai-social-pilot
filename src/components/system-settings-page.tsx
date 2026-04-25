"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BackupRestorePanel } from "@/components/backup-restore-panel";
import {
  Globe,
  Smartphone,
  LayoutGrid,
  Save,
  Bell,
  BellRing,
  BellOff,
  Clock,
  Database,
  Trash2,
  HardDrive,
  Download,
  Upload,
  RefreshCw,
  Info,
  Code,
  Layers,
  Cpu,
  FileCode,
  Palette,
  Shield,
  RotateCcw,
  ChevronRight,
  CalendarClock,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { Platform } from "@/types";

// ═══════════════════════════════════════════════════════════════════
// Settings interface
// ═══════════════════════════════════════════════════════════════════

interface SystemSettings {
  // 通用设置
  language: "zh-CN" | "en";
  defaultPlatform: Platform;
  pageSize: number;
  autoSaveInterval: number;

  // 通知设置
  notificationsEnabled: boolean;
  publishNotif: boolean;
  aiNotif: boolean;
  reportNotif: boolean;
  warningNotif: boolean;
  tipNotif: boolean;
  notifSound: boolean;
  reminderTime: string;
}

const DEFAULT_SETTINGS: SystemSettings = {
  language: "zh-CN",
  defaultPlatform: "wechat",
  pageSize: 20,
  autoSaveInterval: 30,

  notificationsEnabled: true,
  publishNotif: true,
  aiNotif: true,
  reportNotif: true,
  warningNotif: true,
  tipNotif: true,
  notifSound: true,
  reminderTime: "09:00",
};

function loadSettings(): SystemSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem("system-settings-v2");
    if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch { /* noop */ }
  return DEFAULT_SETTINGS;
}

// ═══════════════════════════════════════════════════════════════════
// DB Stats type
// ═══════════════════════════════════════════════════════════════════

interface DbStats {
  contentPosts: number;
  contentPlans: number;
  knowledgeItems: number;
  materials: number;
  aIConfigs: number;
  platformAccounts: number;
  notifications: number;
  trackedAccounts: number;
  personas: number;
  contentVersions: number;
  [key: string]: number;
}

const MODEL_LABELS: Record<string, string> = {
  contentPosts: "内容",
  contentPlans: "内容计划",
  knowledgeItems: "知识库",
  materials: "素材",
  aIConfigs: "AI配置",
  platformAccounts: "平台账号",
  notifications: "通知",
  trackedAccounts: "追踪账号",
  personas: "人设",
  contentVersions: "版本记录",
};

const MODEL_ICONS: Record<string, string> = {
  contentPosts: "📝",
  contentPlans: "📅",
  knowledgeItems: "📚",
  materials: "📎",
  aIConfigs: "🤖",
  platformAccounts: "📱",
  notifications: "🔔",
  trackedAccounts: "👁️",
  personas: "👤",
  contentVersions: "🔄",
};

// ═══════════════════════════════════════════════════════════════════
// Setting Row component
// ═══════════════════════════════════════════════════════════════════

function SettingRow({
  icon,
  iconColor,
  label,
  description,
  children,
}: {
  icon?: React.ReactNode;
  iconColor?: string;
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className={`flex-shrink-0 h-8 w-8 rounded-lg bg-muted flex items-center justify-center ${iconColor || ""}`}>
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs font-medium">{label}</p>
          {description && (
            <p className="text-[10px] text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <div className="flex-shrink-0 ml-3">{children}</div>
    </div>
  );
}

function SectionTitle({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mt-2 mb-1">
      {icon}
      <h3 className="text-xs font-semibold">{title}</h3>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Page transitions
// ═══════════════════════════════════════════════════════════════════

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

// ═══════════════════════════════════════════════════════════════════
// Main System Settings Page
// ═══════════════════════════════════════════════════════════════════

export function SystemSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>(loadSettings);
  const [dbStats, setDbStats] = useState<DbStats | null>(null);
  const [dbSize, setDbSize] = useState<string>("—");
  const [optimizing, setOptimizing] = useState(false);

  // Settings are loaded via loadSettings lazy initializer above

  // Fetch DB stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/system-health");
      if (res.ok) {
        const data = await res.json();
        if (data.database) {
          setDbStats(data.database.tableCounts || null);
          setDbSize(data.database.sizeFormatted || "—");
        }
      }
    } catch { /* noop */ }
  }, []);

  // Fetch DB stats on mount - use event-based approach
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/system-health", { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          if (data.database) {
            setDbStats(data.database.tableCounts || null);
            setDbSize(data.database.sizeFormatted || "—");
          }
        }
      } catch { /* noop */ }
    })();
    return () => controller.abort();
  }, []);

  // Save settings helper
  const updateSetting = useCallback(
    <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        try { localStorage.setItem("system-settings-v2", JSON.stringify(next)); } catch { /* noop */ }
        return next;
      });
    },
    []
  );

  // Reset to defaults
  const handleReset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    try { localStorage.setItem("system-settings-v2", JSON.stringify(DEFAULT_SETTINGS)); } catch { /* noop */ }
  }, []);

  // Optimize DB
  const handleOptimize = useCallback(async () => {
    setOptimizing(true);
    try {
      await fetch("/api/settings/optimize-db", { method: "POST" });
      await fetchStats();
    } catch { /* noop */ }
    setOptimizing(false);
  }, [fetchStats]);

  // Clear test data
  const handleClearTestData = useCallback(async () => {
    if (!confirm("确定要清除所有测试数据吗？此操作不可撤销。")) return;
    try {
      await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearRead: true }),
      });
      await fetchStats();
    } catch { /* noop */ }
  }, [fetchStats]);

  const totalRecords = dbStats
    ? Object.values(dbStats).reduce((sum, c) => sum + c, 0)
    : 0;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-rose-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">系统设置</h1>
            <p className="text-[10px] text-muted-foreground">v4.1.0 · 196 组件 · 79 API</p>
          </div>
        </div>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800"
                onClick={handleReset}
              >
                <RotateCcw className="h-3 w-3" />
                重置默认
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[10px]">
              恢复所有设置到默认值
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </motion.div>

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="w-full h-10 bg-muted/50 p-0.5 mb-6">
          <TabsTrigger
            value="general"
            className="flex-1 h-8 text-xs gap-1.5 data-[state=active]:bg-background shadow-sm data-[state=active]:text-violet-600 dark:data-[state=active]:text-violet-400"
          >
            <Globe className="h-3.5 w-3.5" />
            通用设置
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="flex-1 h-8 text-xs gap-1.5 data-[state=active]:bg-background shadow-sm data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400"
          >
            <Bell className="h-3.5 w-3.5" />
            通知设置
          </TabsTrigger>
          <TabsTrigger
            value="data"
            className="flex-1 h-8 text-xs gap-1.5 data-[state=active]:bg-background shadow-sm data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400"
          >
            <Database className="h-3.5 w-3.5" />
            数据管理
          </TabsTrigger>
          <TabsTrigger
            value="about"
            className="flex-1 h-8 text-xs gap-1.5 data-[state=active]:bg-background shadow-sm data-[state=active]:text-sky-600 dark:data-[state=active]:text-sky-400"
          >
            <Info className="h-3.5 w-3.5" />
            关于
          </TabsTrigger>
        </TabsList>

        {/* ─── General Settings ──────────────────────────────────── */}
        <TabsContent value="general">
          <AnimatePresence mode="wait">
            <motion.div key="general" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <Card>
                <CardContent className="p-4 space-y-1">
                  <SectionTitle
                    title="基础设置"
                    icon={<Globe className="h-3.5 w-3.5 text-violet-500" />}
                  />

                  <SettingRow
                    icon={<Globe className="h-4 w-4 text-violet-500" />}
                    iconColor="text-violet-500"
                    label="界面语言"
                    description="切换应用显示语言"
                  >
                    <div className="flex gap-1">
                      {(["zh-CN", "en"] as const).map((lang) => (
                        <button
                          key={lang}
                          onClick={() => updateSetting("language", lang)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors border ${
                            settings.language === lang
                              ? "bg-foreground text-background border-foreground"
                              : "bg-muted/50 text-muted-foreground hover:text-foreground border-border/20"
                          }`}
                        >
                          {lang === "zh-CN" ? "中文" : "English"}
                        </button>
                      ))}
                    </div>
                  </SettingRow>

                  <Separator />

                  <SettingRow
                    icon={<Smartphone className="h-4 w-4 text-emerald-500" />}
                    iconColor="text-emerald-500"
                    label="默认平台"
                    description="新建内容时的默认平台"
                  >
                    <div className="flex gap-1">
                      {([
                        { value: "wechat" as Platform, label: "朋友圈", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
                        { value: "xiaohongshu" as Platform, label: "小红书", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" },
                      ]).map((p) => (
                        <button
                          key={p.value}
                          onClick={() => updateSetting("defaultPlatform", p.value)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors border ${
                            settings.defaultPlatform === p.value
                              ? "bg-foreground text-background border-foreground"
                              : "bg-muted/50 text-muted-foreground hover:text-foreground border-border/20"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </SettingRow>

                  <Separator />

                  <SettingRow
                    icon={<LayoutGrid className="h-4 w-4 text-amber-500" />}
                    iconColor="text-amber-500"
                    label="每页显示数量"
                    description="列表和表格的分页大小"
                  >
                    <div className="flex gap-1">
                      {[10, 20, 50].map((size) => (
                        <button
                          key={size}
                          onClick={() => updateSetting("pageSize", size)}
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors border ${
                            settings.pageSize === size
                              ? "bg-foreground text-background border-foreground"
                              : "bg-muted/50 text-muted-foreground hover:text-foreground border-border/20"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </SettingRow>

                  <Separator />

                  <SettingRow
                    icon={<Save className="h-4 w-4 text-sky-500" />}
                    iconColor="text-sky-500"
                    label="自动保存间隔"
                    description="内容编辑自动保存时间间隔"
                  >
                    <div className="flex gap-1">
                      {[15, 30, 60].map((interval) => (
                        <button
                          key={interval}
                          onClick={() => updateSetting("autoSaveInterval", interval)}
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors border ${
                            settings.autoSaveInterval === interval
                              ? "bg-foreground text-background border-foreground"
                              : "bg-muted/50 text-muted-foreground hover:text-foreground border-border/20"
                          }`}
                        >
                          {interval}秒
                        </button>
                      ))}
                    </div>
                  </SettingRow>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </TabsContent>

        {/* ─── Notification Settings ─────────────────────────────── */}
        <TabsContent value="notifications">
          <AnimatePresence mode="wait">
            <motion.div key="notifications" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <Card>
                <CardContent className="p-4 space-y-1">
                  {/* Master toggle */}
                  <SettingRow
                    icon={
                      settings.notificationsEnabled ? (
                        <BellRing className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <BellOff className="h-4 w-4 text-muted-foreground" />
                      )
                    }
                    iconColor={settings.notificationsEnabled ? "text-emerald-500" : "text-muted-foreground"}
                    label="通知总开关"
                    description="关闭后不接收任何通知"
                  >
                    <Switch
                      checked={settings.notificationsEnabled}
                      onCheckedChange={(v) => updateSetting("notificationsEnabled", v)}
                    />
                  </SettingRow>

                  <Separator />

                  {settings.notificationsEnabled && (
                    <>
                      <SectionTitle
                        title="分类型开关"
                        icon={<Bell className="h-3.5 w-3.5 text-violet-500" />}
                      />

                      <SettingRow
                        icon={<span>📅</span>}
                        label="发布提醒"
                        description="排期发布、到期提醒"
                      >
                        <Switch checked={settings.publishNotif} onCheckedChange={(v) => updateSetting("publishNotif", v)} />
                      </SettingRow>
                      <SettingRow
                        icon={<span>🤖</span>}
                        label="AI完成通知"
                        description="AI生成、优化任务完成"
                      >
                        <Switch checked={settings.aiNotif} onCheckedChange={(v) => updateSetting("aiNotif", v)} />
                      </SettingRow>
                      <SettingRow
                        icon={<span>📊</span>}
                        label="数据报告"
                        description="周报、日报数据就绪"
                      >
                        <Switch checked={settings.reportNotif} onCheckedChange={(v) => updateSetting("reportNotif", v)} />
                      </SettingRow>
                      <SettingRow
                        icon={<span>⚠️</span>}
                        label="异常警告"
                        description="低互动率、错过排期"
                      >
                        <Switch checked={settings.warningNotif} onCheckedChange={(v) => updateSetting("warningNotif", v)} />
                      </SettingRow>
                      <SettingRow
                        icon={<span>💡</span>}
                        label="运营建议"
                        description="AI运营策略建议"
                      >
                        <Switch checked={settings.tipNotif} onCheckedChange={(v) => updateSetting("tipNotif", v)} />
                      </SettingRow>

                      <Separator />
                      <SectionTitle
                        title="提醒设置"
                        icon={<Clock className="h-3.5 w-3.5 text-amber-500" />}
                      />

                      <SettingRow
                        icon={
                          settings.notifSound ? (
                            <Volume2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <VolumeX className="h-4 w-4 text-muted-foreground" />
                          )
                        }
                        label="提示音"
                        description="收到通知时播放提示音"
                      >
                        <Switch checked={settings.notifSound} onCheckedChange={(v) => updateSetting("notifSound", v)} />
                      </SettingRow>

                      <SettingRow
                        icon={<CalendarClock className="h-4 w-4 text-sky-500" />}
                        iconColor="text-sky-500"
                        label="提醒时间"
                        description="每日运营提醒的时间"
                      >
                        <input
                          type="time"
                          value={settings.reminderTime}
                          onChange={(e) => updateSetting("reminderTime", e.target.value)}
                          className="h-7 px-2 text-xs rounded-md border bg-background"
                        />
                      </SettingRow>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </TabsContent>

        {/* ─── Data Management ───────────────────────────────────── */}
        <TabsContent value="data">
          <AnimatePresence mode="wait">
            <motion.div key="data" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <div className="space-y-4">
                {/* DB Stats */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Database className="h-4 w-4 text-amber-500" />
                      数据库统计
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">数据库大小</span>
                      <span className="font-mono font-medium">{dbSize}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">总记录数</span>
                      <Badge variant="secondary" className="text-[9px]">
                        {totalRecords > 0 ? `${totalRecords} 条` : "—"}
                      </Badge>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-1.5">
                      {dbStats
                        ? Object.entries(dbStats)
                            .filter(([, count]) => count > 0)
                            .sort(([, a], [, b]) => b - a)
                            .map(([model, count]) => (
                              <div
                                key={model}
                                className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-muted/50"
                              >
                                <span className="text-[10px] flex items-center gap-1">
                                  <span>{MODEL_ICONS[model] || "📋"}</span>
                                  {MODEL_LABELS[model] || model}
                                </span>
                                <span className="text-[10px] font-medium tabular-nums">{count}</span>
                              </div>
                            ))
                        : Array.from({ length: 6 }).map((_, i) => (
                            <div
                              key={i}
                              className="h-8 rounded-lg bg-muted/50 animate-pulse"
                            />
                          ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-emerald-500" />
                      数据操作
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1.5 flex-1"
                        onClick={handleOptimize}
                        disabled={optimizing}
                      >
                        {optimizing ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        {optimizing ? "优化中..." : "数据库优化"}
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      优化数据库可以释放空间、提升查询性能
                    </p>

                    <Separator />

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1.5 flex-1 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800"
                        onClick={handleClearTestData}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        清除已读通知
                      </Button>
                    </div>

                    <Separator />

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1.5 flex-1"
                        onClick={() => window.open("/api/backup/download?filename=latest", "_blank")}
                      >
                        <Download className="h-3.5 w-3.5" />
                        导出数据
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1.5 flex-1"
                        onClick={() => {
                          const input = document.createElement("input");
                          input.type = "file";
                          input.accept = ".json";
                          input.onchange = async (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                              const formData = new FormData();
                              formData.append("file", file);
                              // Use backup restore endpoint
                              try {
                                await fetch("/api/backup/restore", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ filename: file.name }),
                                });
                              } catch { /* noop */ }
                            }
                          };
                          input.click();
                        }}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        导入数据
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Backup/Restore */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Shield className="h-4 w-4 text-violet-500" />
                      备份与恢复
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BackupRestorePanel />
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </AnimatePresence>
        </TabsContent>

        {/* ─── About ──────────────────────────────────────────────── */}
        <TabsContent value="about">
          <AnimatePresence mode="wait">
            <motion.div key="about" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <Card>
                <CardContent className="p-4 space-y-4">
                  {/* App identity */}
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-violet-50 to-rose-50 dark:from-violet-900/10 dark:to-rose-900/10">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-rose-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
                      <Cpu className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold">AI 社媒运营助手</h2>
                      <p className="text-[10px] text-muted-foreground">朋友圈 / 小红书 双平台运营</p>
                      <Badge className="mt-1 text-[9px] bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border-0">
                        v4.1.0
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  {/* Stats */}
                  <SectionTitle
                    title="项目统计"
                    icon={<Code className="h-3.5 w-3.5 text-violet-500" />}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "UI 组件", value: "196", color: "text-violet-600 dark:text-violet-400" },
                      { label: "API 路由", value: "79", color: "text-emerald-600 dark:text-emerald-400" },
                      { label: "数据模型", value: "15", color: "text-amber-600 dark:text-amber-400" },
                      { label: "迭代次数", value: "40", color: "text-rose-600 dark:text-rose-400" },
                    ].map((stat) => (
                      <div key={stat.label} className="p-3 rounded-xl bg-muted/50 border border-border/20">
                        <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                        <p className={`text-lg font-bold tabular-nums ${stat.color}`}>{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Tech stack */}
                  <SectionTitle
                    title="技术栈"
                    icon={<FileCode className="h-3.5 w-3.5 text-emerald-500" />}
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "Next.js 16", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" },
                      { label: "React 19", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" },
                      { label: "TypeScript", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
                      { label: "Tailwind CSS", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" },
                      { label: "shadcn/ui", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" },
                      { label: "Prisma", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
                      { label: "Framer Motion", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" },
                      { label: "Zustand", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
                      { label: "Z-AI SDK", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" },
                      { label: "SQLite", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" },
                    ].map((tech) => (
                      <Badge
                        key={tech.label}
                        className={`text-[9px] font-medium px-2 py-0.5 border-0 ${tech.color}`}
                      >
                        {tech.label}
                      </Badge>
                    ))}
                  </div>

                  <Separator />

                  {/* Theme */}
                  <SectionTitle
                    title="设计规范"
                    icon={<Palette className="h-3.5 w-3.5 text-rose-500" />}
                  />
                  <div className="flex gap-3">
                    {[
                      { label: "Violet", className: "bg-violet-500" },
                      { label: "Emerald", className: "bg-emerald-500" },
                      { label: "Amber", className: "bg-amber-500" },
                      { label: "Rose", className: "bg-rose-500" },
                      { label: "Sky", className: "bg-sky-500" },
                    ].map((color) => (
                      <div key={color.label} className="flex flex-col items-center gap-1">
                        <div className={`h-6 w-6 rounded-full ${color.className} ring-2 ring-offset-2 ring-offset-background ring-border`} />
                        <span className="text-[8px] text-muted-foreground">{color.label}</span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Help */}
                  <SectionTitle
                    title="帮助与支持"
                    icon={<Info className="h-3.5 w-3.5 text-sky-500" />}
                  />
                  <div className="space-y-2">
                    {[
                      { label: "使用指南", desc: "快速上手教程" },
                      { label: "常见问题", desc: "FAQ 与故障排除" },
                      { label: "更新日志", desc: "版本更新记录" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                      >
                        <div>
                          <p className="text-xs font-medium">{item.label}</p>
                          <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </TabsContent>
      </Tabs>
    </div>
  );
}
