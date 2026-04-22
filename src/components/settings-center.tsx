"use client";

import { useState, useEffect, useCallback, type ComponentType } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  Cpu,
  Link2,
  User,
  Bell,
  Database,
  Palette,
  Info,
  ArrowRight,
  RotateCcw,
  Shield,
  Sparkles,
  Plus,
  CheckCircle2,
  XCircle,
  Loader2,
  Radio,
  Server,
  Globe,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  Thermometer,
  Download,
  RefreshCw,
  LayoutGrid,
  List,
  Minimize2,
  MessageCircle,
  BookOpen,
  WifiOff,
  Check,
  ChevronRight,
} from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { toast } from "sonner";
import { PRESET_PROVIDERS } from "@/lib/ai-providers";
import { ThemeToggle } from "@/components/theme-toggle";
import { PersonaForm } from "@/components/left-panel/persona-form";
import type { Platform } from "@/types";

/* ================================================================
   Types
   ================================================================ */

interface SettingsCenterProps {
  connectedPlatforms: number;
}

interface ConfigRecord {
  id: string;
  name: string;
  provider: string;
  modelId: string;
  baseUrl: string;
  apiKey: string;
  isFree: boolean;
  isActive: boolean;
  maxTokens: number;
  temperature: number;
  createdAt: string;
}

type SectionId = "ai" | "accounts" | "notifications" | "data" | "display" | "about";

interface NotificationSettings {
  publishReminder: boolean;
  interactionNotification: boolean;
  dailyReport: boolean;
  contentInspiration: boolean;
}

interface DisplayPreferences {
  defaultPlatform: Platform;
  viewMode: "grid" | "list";
  compactMode: boolean;
}

/* ================================================================
   Constants
   ================================================================ */

const SECTIONS: Array<{
  id: SectionId;
  icon: ComponentType<{ className?: string }>;
  label: string;
  gradient: string;
  description: string;
}> = [
  { id: "ai", icon: Cpu, label: "AI模型配置", gradient: "from-violet-500 to-purple-600", description: "管理AI大模型配置和连接" },
  { id: "accounts", icon: Link2, label: "平台账号管理", gradient: "from-emerald-500 to-teal-600", description: "管理微信和小红书账号" },
  { id: "notifications", icon: Bell, label: "通知设置", gradient: "from-amber-500 to-orange-500", description: "配置通知和提醒偏好" },
  { id: "data", icon: Database, label: "数据管理", gradient: "from-violet-500 to-purple-600", description: "导出数据和管理缓存" },
  { id: "display", icon: Palette, label: "显示偏好", gradient: "from-pink-500 to-rose-500", description: "主题和界面设置" },
  { id: "about", icon: Info, label: "关于", gradient: "from-slate-400 to-slate-600", description: "应用信息和版本" },
];

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  publishReminder: true,
  interactionNotification: true,
  dailyReport: false,
  contentInspiration: true,
};

const DEFAULT_DISPLAY: DisplayPreferences = {
  defaultPlatform: "wechat",
  viewMode: "grid",
  compactMode: false,
};

const NOTIFICATIONS_KEY = "settings-notifications";
const DISPLAY_KEY = "settings-display";

/* ================================================================
   Hooks
   ================================================================ */

function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue;
    try {
      const stored = localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setStoredValue = (newValue: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const resolved = newValue instanceof Function ? newValue(prev) : newValue;
      if (typeof window !== "undefined") {
        localStorage.setItem(key, JSON.stringify(resolved));
      }
      return resolved;
    });
  };

  return [value, setStoredValue];
}

/* ================================================================
   Section: AI Model Settings
   ================================================================ */

function AIModelSection({ onOpenFullSettings }: { onOpenFullSettings: () => void }) {
  const [configs, setConfigs] = useState<ConfigRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConfigs = useCallback(async () => {
    try {
      const res = await fetch("/api/ai-config");
      if (res.ok) setConfigs(await res.json());
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const activeConfig = configs.find((c) => c.isActive);

  // Mock stats
  const mockTokens = 128456;
  const mockRequests = 342;

  return (
    <div className="space-y-4">
      {/* Current Active Model Card */}
      <div className="rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 border border-violet-200 dark:border-violet-800 p-4">
        <p className="text-xs font-medium text-violet-700 dark:text-violet-300 mb-2">当前使用的模型</p>
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
            <span className="text-xs text-muted-foreground">加载中...</span>
          </div>
        ) : activeConfig ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-semibold">{activeConfig.name}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {activeConfig.modelId}
              </Badge>
              {activeConfig.isFree && (
                <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-200" variant="outline">
                  免费
                </Badge>
              )}
            </div>
            <div className="flex gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-violet-500" />
                {mockTokens.toLocaleString()} Tokens 已使用
              </span>
              <span className="flex items-center gap-1">
                <Radio className="h-3 w-3 text-violet-500" />
                {mockRequests} 次请求
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span className="text-sm text-amber-700 dark:text-amber-300">内置 AI 服务（无需配置）</span>
          </div>
        )}
      </div>

      {/* Saved Configs */}
      {configs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">已保存的配置 ({configs.length})</p>
          <ScrollArea className="max-h-48">
            <div className="space-y-2 pr-2">
              {configs.map((config) => {
                const preset = PRESET_PROVIDERS.find((p) => p.provider === config.provider);
                return (
                  <div key={config.id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <span className="text-base flex-shrink-0">{preset?.icon || "🔧"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium truncate">{config.name}</span>
                        {config.isActive && (
                          <Badge className="text-[9px] px-1 py-0 h-4 bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800" variant="outline">
                            使用中
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{config.modelId}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}

      <Button
        onClick={onOpenFullSettings}
        className="w-full h-9 text-xs bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
      >
        <Cpu className="h-3.5 w-3.5 mr-1.5" />
        管理AI模型配置
        <ArrowRight className="h-3 w-3 ml-auto" />
      </Button>
    </div>
  );
}

/* ================================================================
   Section: Platform Accounts
   ================================================================ */

function PlatformAccountsSection({ onOpenAccountPanel }: { onOpenAccountPanel: () => void }) {
  const [accounts, setAccounts] = useState<Array<{ platform: string; status: string; displayName: string }>>([]);

  useEffect(() => {
    fetch("/api/platform-accounts")
      .then((res) => (res.ok ? res.json() : []))
      .then(setAccounts)
      .catch(() => {});
  }, []);

  const wechatAccount = accounts.find((a) => a.platform === "wechat");
  const xhsAccount = accounts.find((a) => a.platform === "xiaohongshu");

  return (
    <div className="space-y-4">
      {/* WeChat */}
      <Card className="border-0 shadow-sm bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-sm">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium">微信朋友圈</h4>
                {wechatAccount?.status === "connected" ? (
                  <Badge className="text-[9px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800" variant="outline">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />
                    已连接
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 text-muted-foreground">
                    <WifiOff className="h-2.5 w-2.5 mr-0.5" />
                    未连接
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {wechatAccount?.displayName || "未配置微信账号"}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
          </div>
        </CardContent>
      </Card>

      {/* Xiaohongshu */}
      <Card className="border-0 shadow-sm bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-sm">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium">小红书</h4>
                {xhsAccount?.status === "connected" ? (
                  <Badge className="text-[9px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800" variant="outline">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />
                    已连接
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 text-muted-foreground">
                    <WifiOff className="h-2.5 w-2.5 mr-0.5" />
                    未连接
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {xhsAccount?.displayName || "未配置小红书账号"}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={onOpenAccountPanel}
        variant="outline"
        className="w-full h-9 text-xs"
      >
        <Link2 className="h-3.5 w-3.5 mr-1.5" />
        管理账号
        <ArrowRight className="h-3 w-3 ml-auto" />
      </Button>
    </div>
  );
}

/* ================================================================
   Section: Notification Settings
   ================================================================ */

function NotificationSettingsSection() {
  const [settings, setSettings] = useLocalStorage<NotificationSettings>(NOTIFICATIONS_KEY, DEFAULT_NOTIFICATIONS);

  const toggle = (key: keyof NotificationSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const items: Array<{
    key: keyof NotificationSettings;
    label: string;
    description: string;
  }> = [
    { key: "publishReminder", label: "发布提醒", description: "当有内容需要发布时发送提醒通知" },
    { key: "interactionNotification", label: "互动通知", description: "当内容收到点赞、评论、转发时通知" },
    { key: "dailyReport", label: "每日运营报告", description: "每天定时推送运营数据摘要" },
    { key: "contentInspiration", label: "内容灵感推送", description: "基于行业动态推送内容创作灵感" },
  ];

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground mb-3">自定义您希望接收的通知类型</p>
      {items.map((item, idx) => (
        <div key={item.key}>
          <div className="flex items-center justify-between py-3">
            <div className="flex-1 min-w-0 mr-4">
              <h4 className="text-sm font-medium">{item.label}</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">{item.description}</p>
            </div>
            <Switch
              checked={settings[item.key]}
              onCheckedChange={() => toggle(item.key)}
              aria-label={item.label}
            />
          </div>
          {idx < items.length - 1 && <Separator />}
        </div>
      ))}
    </div>
  );
}

/* ================================================================
   Section: Data Management
   ================================================================ */

function DataManagementSection() {
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalPlans: 0,
    totalKnowledge: 0,
    totalMaterials: 0,
    totalAIConfigs: 0,
    totalAccounts: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    fetch("/api/settings/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setStats(data);
      })
      .catch(() => {})
      .finally(() => setLoadingStats(false));
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/export?format=json");
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ai-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("数据导出成功");
      } else {
        toast.error("导出失败");
      }
    } catch {
      toast.error("导出失败");
    } finally {
      setExporting(false);
    }
  };

  const handleClearCache = () => {
    if (!confirm("确定要清除缓存吗？这将清除非必要本地数据，不会删除已保存的内容。")) return;
    setClearing(true);
    try {
      // Clear non-essential localStorage data
      const preservedKeys = [
        "theme",
        "onboarding-completed",
        NOTIFICATIONS_KEY,
        DISPLAY_KEY,
        "settings-default-platform",
        "settings-view-mode",
        "settings-compact-mode",
      ];
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !preservedKeys.includes(key)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
      toast.success(`已清除 ${keysToRemove.length} 项缓存数据`);
    } catch {
      toast.error("清除缓存失败");
    } finally {
      setClearing(false);
    }
  };

  const statItems = [
    { label: "内容总数", value: stats.totalPosts, icon: "📝" },
    { label: "运营计划", value: stats.totalPlans, icon: "📋" },
    { label: "知识库条目", value: stats.totalKnowledge, icon: "📚" },
    { label: "素材库", value: stats.totalMaterials, icon: "🗂️" },
    { label: "AI配置", value: stats.totalAIConfigs, icon: "🤖" },
    { label: "平台账号", value: stats.totalAccounts, icon: "🔗" },
  ];

  return (
    <div className="space-y-4">
      {/* Database Stats Grid */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-3">数据库概览</p>
        {loadingStats ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {statItems.map((item) => (
              <div key={item.label} className="rounded-lg border border-border/60 p-3 bg-muted/20">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm">{item.icon}</span>
                  <span className="text-[11px] text-muted-foreground">{item.label}</span>
                </div>
                <span className="text-lg font-bold tabular-nums">{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Action Buttons */}
      <div className="space-y-2">
        <Button
          onClick={handleExport}
          disabled={exporting}
          variant="outline"
          className="w-full h-9 text-xs justify-start"
        >
          {exporting ? (
            <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5 mr-2" />
          )}
          导出全部数据 (JSON)
        </Button>
        <Button
          onClick={handleClearCache}
          disabled={clearing}
          variant="outline"
          className="w-full h-9 text-xs justify-start text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40 hover:bg-amber-50 dark:hover:bg-amber-950/20"
        >
          {clearing ? (
            <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 mr-2" />
          )}
          清除缓存
        </Button>
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Shield className="h-3 w-3" />
          清除缓存不会删除已保存的内容和配置
        </p>
      </div>
    </div>
  );
}

/* ================================================================
   Section: Display Preferences
   ================================================================ */

function DisplayPreferencesSection() {
  const [displayPrefs, setDisplayPrefs] = useLocalStorage<DisplayPreferences>(DISPLAY_KEY, DEFAULT_DISPLAY);
  const { platform, setPlatform } = useAppStore();

  return (
    <div className="space-y-5">
      {/* Theme Toggle */}
      <div>
        <Label className="text-xs font-medium text-muted-foreground mb-3 block">主题模式</Label>
        <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <Palette className="h-4 w-4 text-pink-500" />
            <div>
              <span className="text-sm font-medium">深色 / 浅色模式</span>
              <p className="text-[10px] text-muted-foreground">切换界面主题</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Default Platform */}
      <div>
        <Label className="text-xs font-medium text-muted-foreground mb-3 block">默认平台</Label>
        <RadioGroup
          value={displayPrefs.defaultPlatform}
          onValueChange={(val) => {
            setDisplayPrefs((prev) => ({ ...prev, defaultPlatform: val as Platform }));
            setPlatform(val as Platform);
          }}
          className="grid grid-cols-2 gap-3"
        >
          <label
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
              displayPrefs.defaultPlatform === "wechat"
                ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/20"
                : "border-border/60 bg-muted/20 hover:bg-muted/40"
            }`}
          >
            <RadioGroupItem value="wechat" className="sr-only" />
            <div className="flex items-center gap-2 flex-1">
              <MessageCircle className={`h-4 w-4 ${displayPrefs.defaultPlatform === "wechat" ? "text-green-600" : "text-muted-foreground"}`} />
              <span className="text-xs font-medium">朋友圈</span>
            </div>
            {displayPrefs.defaultPlatform === "wechat" && <Check className="h-3.5 w-3.5 text-green-600" />}
          </label>
          <label
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
              displayPrefs.defaultPlatform === "xiaohongshu"
                ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/20"
                : "border-border/60 bg-muted/20 hover:bg-muted/40"
            }`}
          >
            <RadioGroupItem value="xiaohongshu" className="sr-only" />
            <div className="flex items-center gap-2 flex-1">
              <BookOpen className={`h-4 w-4 ${displayPrefs.defaultPlatform === "xiaohongshu" ? "text-red-600" : "text-muted-foreground"}`} />
              <span className="text-xs font-medium">小红书</span>
            </div>
            {displayPrefs.defaultPlatform === "xiaohongshu" && <Check className="h-3.5 w-3.5 text-red-600" />}
          </label>
        </RadioGroup>
      </div>

      {/* Calendar View Mode */}
      <div>
        <Label className="text-xs font-medium text-muted-foreground mb-3 block">日历视图模式</Label>
        <RadioGroup
          value={displayPrefs.viewMode}
          onValueChange={(val) => setDisplayPrefs((prev) => ({ ...prev, viewMode: val as "grid" | "list" }))}
          className="grid grid-cols-2 gap-3"
        >
          <label
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
              displayPrefs.viewMode === "grid"
                ? "border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/20"
                : "border-border/60 bg-muted/20 hover:bg-muted/40"
            }`}
          >
            <RadioGroupItem value="grid" className="sr-only" />
            <div className="flex items-center gap-2 flex-1">
              <LayoutGrid className={`h-4 w-4 ${displayPrefs.viewMode === "grid" ? "text-violet-600" : "text-muted-foreground"}`} />
              <span className="text-xs font-medium">网格模式</span>
            </div>
            {displayPrefs.viewMode === "grid" && <Check className="h-3.5 w-3.5 text-violet-600" />}
          </label>
          <label
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
              displayPrefs.viewMode === "list"
                ? "border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/20"
                : "border-border/60 bg-muted/20 hover:bg-muted/40"
            }`}
          >
            <RadioGroupItem value="list" className="sr-only" />
            <div className="flex items-center gap-2 flex-1">
              <List className={`h-4 w-4 ${displayPrefs.viewMode === "list" ? "text-violet-600" : "text-muted-foreground"}`} />
              <span className="text-xs font-medium">列表模式</span>
            </div>
            {displayPrefs.viewMode === "list" && <Check className="h-3.5 w-3.5 text-violet-600" />}
          </label>
        </RadioGroup>
      </div>

      {/* Compact Mode */}
      <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20">
        <div className="flex items-center gap-2.5">
          <Minimize2 className="h-4 w-4 text-slate-500" />
          <div>
            <span className="text-sm font-medium">紧凑模式</span>
            <p className="text-[10px] text-muted-foreground">减少间距，显示更多内容</p>
          </div>
        </div>
        <Switch
          checked={displayPrefs.compactMode}
          onCheckedChange={(checked) => setDisplayPrefs((prev) => ({ ...prev, compactMode: checked }))}
          aria-label="紧凑模式"
        />
      </div>
    </div>
  );
}

/* ================================================================
   Section: About
   ================================================================ */

function AboutSection() {
  const features = [
    "AI内容生成与优化",
    "智能日历规划",
    "知识库管理",
    "多平台支持（朋友圈/小红书）",
    "数据分析与报告",
    "内容模板库",
    "账号采集",
    "封面图生成",
    "互动数据同步",
  ];

  return (
    <div className="space-y-4">
      {/* Version Info */}
      <div className="text-center py-4">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-violet-200 dark:shadow-violet-900/40">
          <Sparkles className="h-7 w-7 text-white" />
        </div>
        <h3 className="text-base font-bold">朋友圈AI运营助手</h3>
        <p className="text-xs text-muted-foreground mt-0.5">v1.0.0 · Build 20250601</p>
      </div>

      <Separator />

      {/* Feature Count */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">功能特性 ({features.length})</p>
        <div className="grid grid-cols-2 gap-1.5">
          {features.map((feature) => (
            <div key={feature} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
              {feature}
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Tech Stack */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">技术栈</p>
        <div className="flex flex-wrap gap-1.5">
          {["Next.js", "React", "TypeScript", "Tailwind CSS", "Prisma", "Framer Motion", "shadcn/ui"].map((tech) => (
            <Badge key={tech} variant="secondary" className="text-[10px] px-2 py-0.5">
              {tech}
            </Badge>
          ))}
        </div>
      </div>

      <Separator />

      {/* Credits */}
      <div className="rounded-lg p-3 bg-muted/30 text-[11px] text-muted-foreground leading-relaxed">
        <p className="flex items-center gap-1">
          <Shield className="h-3 w-3" />
          数据存储在本地数据库，API Key 不会外传。建议定期更换 API Key，生产环境需加密存储。
        </p>
      </div>
    </div>
  );
}

/* ================================================================
   Full AI Settings - Sub-panel (from existing code)
   ================================================================ */

function FullAISettings() {
  const [configs, setConfigs] = useState<ConfigRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingConfig, setEditingConfig] = useState<Partial<ConfigRecord> | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latency?: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [presetMode, setPresetMode] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [showForm, setShowForm] = useState(false);

  const fetchConfigs = useCallback(async () => {
    try {
      const res = await fetch("/api/ai-config");
      if (res.ok) {
        setConfigs(await res.json());
      }
    } catch (e) {
      console.error("Failed to fetch AI configs:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleSelectPreset = (presetId: string) => {
    const preset = PRESET_PROVIDERS.find((p) => p.id === presetId);
    if (preset) {
      setEditingConfig({
        name: preset.name,
        provider: preset.provider,
        baseUrl: preset.baseUrl,
        modelId: preset.defaultModel,
        apiKey: "",
        isFree: preset.isFree,
        isActive: configs.length === 0,
        maxTokens: 2048,
        temperature: 0.7,
      });
      setSelectedPreset(presetId);
      setShowForm(true);
    }
  };

  const handleSave = async () => {
    if (!editingConfig?.name) {
      toast.error("请输入配置名称");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/ai-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingConfig),
      });
      if (res.ok) {
        toast.success(editingConfig.id ? "配置已更新" : "配置已保存");
        setEditingConfig(null);
        setSelectedPreset("");
        setShowForm(false);
        fetchConfigs();
      } else {
        toast.error("保存失败");
      }
    } catch {
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!editingConfig?.name || !editingConfig?.modelId) {
      toast.error("请填写配置名称和模型");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      let res;
      if (editingConfig.id) {
        res = await fetch(`/api/ai-config/test?id=${editingConfig.id}`);
      } else {
        res = await fetch("/api/ai-config/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: editingConfig.provider || "custom",
            baseUrl: editingConfig.baseUrl || "",
            apiKey: editingConfig.apiKey || "",
            modelId: editingConfig.modelId || "",
          }),
        });
      }
      const data = await res.json();
      setTestResult(data);
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("测试请求失败");
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, config: ConfigRecord) => {
    e.stopPropagation();
    if (deleting) return;
    if (config.isActive) {
      toast.error("无法删除当前使用的配置，请先切换到其他配置");
      return;
    }
    if (!confirm(`确定要删除配置「${config.name}」吗？`)) return;
    setDeleting(config.id);
    try {
      const res = await fetch(`/api/ai-config?id=${config.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("配置已删除");
        fetchConfigs();
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || "删除失败");
      }
    } catch {
      toast.error("删除失败");
    } finally {
      setDeleting(null);
    }
  };

  const handleSetActive = async (config: ConfigRecord) => {
    try {
      const res = await fetch("/api/ai-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, isActive: true }),
      });
      if (res.ok) {
        toast.success(`已切换到 ${config.name}`);
        fetchConfigs();
      }
    } catch {
      toast.error("切换失败");
    }
  };

  const handleEditConfig = (config: ConfigRecord) => {
    const preset = PRESET_PROVIDERS.find((p) => p.provider === config.provider);
    setPresetMode(!!preset);
    if (preset) setSelectedPreset(preset.id);
    setEditingConfig(config);
    setTestResult(null);
    setShowForm(true);
  };

  const handleAddCustom = () => {
    setPresetMode(false);
    setSelectedPreset("");
    setEditingConfig({
      name: "",
      provider: "custom",
      baseUrl: "",
      modelId: "",
      apiKey: "",
      isFree: false,
      isActive: configs.length === 0,
      maxTokens: 2048,
      temperature: 0.7,
    });
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setEditingConfig(null);
    setSelectedPreset("");
    setTestResult(null);
    setShowForm(false);
  };

  const activeConfig = configs.find((c) => c.isActive);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" as const }}
        >
          <Sparkles className="h-6 w-6 text-violet-500" />
        </motion.div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-3">
        {/* Current active indicator */}
        <div className="rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 border border-violet-200 dark:border-violet-800 p-3">
          <p className="text-xs font-medium text-violet-700 dark:text-violet-300 mb-1.5">当前使用的模型</p>
          {activeConfig ? (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-medium">{activeConfig.name}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{activeConfig.modelId}</Badge>
              {activeConfig.isFree && <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-200" variant="outline">免费</Badge>}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-amber-700 dark:text-amber-300">内置 AI 服务（无需配置）</span>
            </div>
          )}
        </div>

        {/* Saved configs with actions */}
        {configs.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">已保存的配置 ({configs.length})</p>
            {configs.map((config) => {
              const preset = PRESET_PROVIDERS.find((p) => p.provider === config.provider);
              const isDeleting = deleting === config.id;
              return (
                <Card key={config.id} className="border-0 shadow-sm hover:shadow-md transition-all">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <span className="text-base flex-shrink-0">{preset?.icon || "🔧"}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium truncate">{config.name}</span>
                            {config.isActive && (
                              <Badge className="text-[9px] px-1 py-0 h-4 bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800" variant="outline">
                                使用中
                              </Badge>
                            )}
                            {config.isFree && (
                              <Badge className="text-[9px] px-1 py-0 h-4 bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800" variant="outline">
                                免费
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                            {config.modelId}{config.temperature !== 0.7 ? ` · T=${config.temperature}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        {!config.isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-[10px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                            onClick={(e) => { e.stopPropagation(); handleSetActive(config); }}
                            title="设为当前使用"
                          >
                            <Radio className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-[10px] text-muted-foreground hover:text-violet-600"
                          onClick={(e) => { e.stopPropagation(); handleEditConfig(config); }}
                          title="编辑"
                        >
                          <Settings className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-[10px] text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-50"
                          onClick={(e) => handleDelete(e, config)}
                          title="删除"
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Separator />

        {/* Config form (shown when adding/editing) */}
        <AnimatePresence>
          {showForm && editingConfig ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Card className="border border-violet-200 dark:border-violet-800 shadow-sm">
                <CardContent className="p-4 space-y-3">
                  {/* Provider info card */}
                  {presetMode && selectedPreset && (() => {
                    const preset = PRESET_PROVIDERS.find((p) => p.id === selectedPreset);
                    if (!preset) return null;
                    return (
                      <div className="rounded-lg bg-gradient-to-br from-violet-50/50 to-purple-50/50 dark:from-violet-950/10 dark:to-purple-950/10 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{preset.icon}</span>
                          <div>
                            <h4 className="text-xs font-semibold">{preset.name}</h4>
                            <p className="text-[10px] text-muted-foreground">{preset.description}</p>
                          </div>
                        </div>
                        {preset.docsUrl && (
                          <a
                            href={preset.docsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-violet-600 dark:text-violet-400 hover:underline"
                          >
                            <ExternalLink className="h-2.5 w-2.5" />
                            获取 API Key
                          </a>
                        )}
                      </div>
                    );
                  })()}

                  {/* Config Name */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">配置名称</Label>
                    <Input
                      placeholder="如：我的 DeepSeek"
                      value={editingConfig.name || ""}
                      onChange={(e) => setEditingConfig({ ...editingConfig, name: e.target.value })}
                      className="h-8 text-sm"
                    />
                  </div>

                  {/* Model Selection (for presets with multiple models) */}
                  {presetMode && selectedPreset && (() => {
                    const preset = PRESET_PROVIDERS.find((p) => p.id === selectedPreset);
                    if (!preset || preset.models.length <= 1) return null;
                    return (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">模型选择</Label>
                        <Select
                          value={editingConfig.modelId || preset.defaultModel}
                          onValueChange={(val) => setEditingConfig({ ...editingConfig, modelId: val })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {preset.models.map((model) => (
                              <SelectItem key={model} value={model} className="text-xs">
                                {model}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })()}

                  {/* Custom base URL */}
                  {!presetMode && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        <Server className="h-3 w-3 inline mr-1" />
                        API Base URL
                      </Label>
                      <Input
                        placeholder="如：https://api.deepseek.com/v1"
                        value={editingConfig.baseUrl || ""}
                        onChange={(e) => setEditingConfig({ ...editingConfig, baseUrl: e.target.value })}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  )}

                  {/* Custom Model ID */}
                  {!presetMode && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">模型 ID</Label>
                      <Input
                        placeholder="如：deepseek-chat"
                        value={editingConfig.modelId || ""}
                        onChange={(e) => setEditingConfig({ ...editingConfig, modelId: e.target.value })}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  )}

                  {/* API Key */}
                  {editingConfig.provider !== "z-ai" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        <Shield className="h-3 w-3 inline mr-1" />
                        API Key
                      </Label>
                      <div className="relative">
                        <Input
                          type={showApiKey ? "text" : "password"}
                          placeholder="sk-..."
                          value={editingConfig.apiKey || ""}
                          onChange={(e) => setEditingConfig({ ...editingConfig, apiKey: e.target.value })}
                          className="h-8 text-xs font-mono pr-8"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-8 w-8 px-2"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          {showApiKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Shield className="h-2.5 w-2.5" />
                        API Key 仅存储在本地数据库
                      </p>
                    </div>
                  )}

                  {/* Temperature */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium flex items-center gap-1">
                        <Thermometer className="h-3 w-3" />
                        Temperature
                      </Label>
                      <span className="text-xs font-mono text-muted-foreground">
                        {editingConfig.temperature?.toFixed(1) || "0.7"}
                      </span>
                    </div>
                    <Slider
                      value={[editingConfig.temperature ?? 0.7]}
                      min={0}
                      max={2}
                      step={0.1}
                      onValueChange={([val]) => setEditingConfig({ ...editingConfig, temperature: val })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[9px] text-muted-foreground">
                      <span>精准</span>
                      <span>平衡</span>
                      <span>创意</span>
                    </div>
                  </div>

                  {/* Max Tokens */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">最大输出长度</Label>
                    <Select
                      value={String(editingConfig.maxTokens || 2048)}
                      onValueChange={(val) => setEditingConfig({ ...editingConfig, maxTokens: parseInt(val) })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1024">1024 tokens (~750字)</SelectItem>
                        <SelectItem value="2048">2048 tokens (~1500字)</SelectItem>
                        <SelectItem value="4096">4096 tokens (~3000字)</SelectItem>
                        <SelectItem value="8192">8192 tokens (~6000字)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Test result */}
                  {testResult && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                      <div className={`flex items-start gap-2 p-2.5 rounded-lg border text-xs ${
                        testResult.success
                          ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                          : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
                      }`}>
                        {testResult.success ? <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" /> : <XCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="break-words">{testResult.message}</p>
                          {testResult.latency && <p className="text-[10px] mt-1 opacity-70">延迟: {testResult.latency}ms</p>}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white h-8 text-xs"
                    >
                      {saving ? (
                        <><Loader2 className="h-3 w-3 mr-1 animate-spin" />保存中...</>
                      ) : (
                        <><CheckCircle2 className="h-3 w-3 mr-1" />保存配置</>
                      )}
                    </Button>
                    <Button
                      onClick={handleTest}
                      disabled={testing}
                      variant="outline"
                      size="sm"
                      className="border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 h-8 text-xs"
                    >
                      {testing ? (
                        <><Loader2 className="h-3 w-3 mr-1 animate-spin" />测试中</>
                      ) : (
                        <><Sparkles className="h-3 w-3 mr-1" />测试</>
                      )}
                    </Button>
                    <Button onClick={handleCancelForm} variant="ghost" size="sm" className="h-8 text-xs">
                      取消
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            /* Add new config buttons */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              <p className="text-xs font-semibold text-muted-foreground">添加新配置</p>

              {/* Free model presets grid */}
              <div className="grid grid-cols-2 gap-2">
                {PRESET_PROVIDERS.filter((p) => p.provider !== "z-ai").map((preset) => {
                  const isConfigured = configs.some((c) => c.provider === preset.provider);
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset.id)}
                      className="flex items-center gap-2 p-2.5 rounded-lg border border-transparent hover:border-violet-200 dark:hover:border-violet-800 hover:bg-violet-50/50 dark:hover:bg-violet-950/10 transition-all text-left group"
                    >
                      <span className="text-base flex-shrink-0">{preset.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">{preset.name}</div>
                        {isConfigured && (
                          <div className="text-[9px] text-emerald-500 flex items-center gap-0.5">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            已配置
                          </div>
                        )}
                      </div>
                      <Plus className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-violet-500 transition-colors flex-shrink-0" />
                    </button>
                  );
                })}
              </div>

              {/* Custom API button */}
              <button
                onClick={handleAddCustom}
                className="w-full flex items-center gap-2.5 p-2.5 rounded-lg border border-dashed border-muted-foreground/30 hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50/30 dark:hover:bg-violet-950/10 transition-all text-left group"
              >
                <Globe className="h-4 w-4 text-muted-foreground group-hover:text-violet-500 transition-colors flex-shrink-0" />
                <div className="flex-1">
                  <span className="text-xs font-medium group-hover:text-foreground transition-colors">自定义 API (OpenAI 兼容)</span>
                  <p className="text-[10px] text-muted-foreground">DeepSeek / OpenAI / Ollama 本地部署等</p>
                </div>
                <Plus className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-violet-500 transition-colors flex-shrink-0" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Security notice */}
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 text-[10px] text-muted-foreground">
          <Shield className="h-3 w-3 flex-shrink-0" />
          API Key 仅存储在本地数据库，不会外传。建议定期更换密钥。
        </div>
      </div>
    </ScrollArea>
  );
}

/* ================================================================
   Main Settings Center Component
   ================================================================ */

export function SettingsCenter({ connectedPlatforms }: SettingsCenterProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>("ai");
  const [subPanel, setSubPanel] = useState<"main" | "ai" | "persona">("main");
  const [resetting, setResetting] = useState(false);

  const {
    persona,
    setOnboardingCompleted,
    setAccountPanelOpen,
    settingsCenterOpen,
    setSettingsCenterOpen,
  } = useAppStore();

  // Sync store state with dialog
  useEffect(() => {
    if (settingsCenterOpen && !dialogOpen) {
      setDialogOpen(true);
    }
  }, [settingsCenterOpen, dialogOpen]);

  // Reset section/sub-panel when dialog opens
  useEffect(() => {
    if (dialogOpen) {
      setActiveSection("ai");
      setSubPanel("main");
    }
  }, [dialogOpen]);

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open);
    setSettingsCenterOpen(open);
  };

  const handleResetOnboarding = async () => {
    if (!confirm("确定要重新进行引导设置吗？当前设置不会被删除，但会重新走一遍引导流程。")) return;
    setResetting(true);
    try {
      setOnboardingCompleted(false);
      handleOpenChange(false);
      toast.success("即将进入引导设置");
    } finally {
      setResetting(false);
    }
  };

  const handleOpenAccountPanel = () => {
    handleOpenChange(false);
    setTimeout(() => {
      setAccountPanelOpen(true);
    }, 350);
  };

  // Section content renderer
  const renderSectionContent = (sectionId: SectionId) => {
    switch (sectionId) {
      case "ai":
        return (
          <AIModelSection onOpenFullSettings={() => setSubPanel("ai")} />
        );
      case "accounts":
        return (
          <PlatformAccountsSection
            onOpenAccountPanel={handleOpenAccountPanel}
          />
        );
      case "notifications":
        return <NotificationSettingsSection />;
      case "data":
        return <DataManagementSection />;
      case "display":
        return <DisplayPreferencesSection />;
      case "about":
        return <AboutSection />;
      default:
        return null;
    }
  };

  const currentSection = SECTIONS.find((s) => s.id === activeSection);
  const SectionIcon = currentSection?.icon ?? Settings;

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 gap-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden lg:inline text-xs">设置</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-[900px] w-[100vw] sm:w-[95vw] max-h-[100vh] sm:max-h-[90vh] p-0 overflow-hidden">
          {/* Sub-panels: Full AI Settings */}
          {subPanel === "ai" && (
            <div className="h-[90vh] flex flex-col">
              <div className="flex items-center gap-2 px-5 pt-4 pb-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => setSubPanel("main")}
                >
                  ← 返回
                </Button>
                <Separator orientation="vertical" className="h-5" />
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Cpu className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold">AI 模型配置</p>
                  <p className="text-[10px] text-muted-foreground">选择或配置 AI 大模型</p>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <FullAISettings />
              </div>
            </div>
          )}

          {/* Sub-panels: Persona Management */}
          {subPanel === "persona" && (
            <div className="h-[90vh] flex flex-col">
              <div className="flex items-center gap-2 px-5 pt-4 pb-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => setSubPanel("main")}
                >
                  ← 返回
                </Button>
                <Separator orientation="vertical" className="h-5" />
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold">人设管理</p>
                  <p className="text-[10px] text-muted-foreground">编辑品牌人设、语气风格和目标受众</p>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <PersonaForm />
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}

          {/* Main Settings Layout: Sidebar + Content */}
          {subPanel === "main" && (
            <div className="flex flex-col sm:flex-row h-[90vh]">
              {/* Sidebar - Desktop */}
              <div className="hidden sm:flex flex-col w-52 border-r flex-shrink-0 bg-muted/20">
                <div className="p-4 pb-2">
                  <h2 className="text-sm font-bold flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center">
                      <Settings className="h-3.5 w-3.5 text-white" />
                    </div>
                    设置中心
                  </h2>
                </div>
                <ScrollArea className="flex-1 px-2 pb-4">
                  <nav className="space-y-0.5">
                    {SECTIONS.map((section) => {
                      const Icon = section.icon;
                      const isActive = activeSection === section.id;
                      return (
                        <button
                          key={section.id}
                          onClick={() => setActiveSection(section.id)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all text-xs group ${
                            isActive
                              ? "bg-gradient-to-r " + section.gradient + " text-white shadow-sm"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                          }`}
                        >
                          <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground"}`} />
                          <div className="flex-1 min-w-0">
                            <span className="font-medium block truncate">{section.label}</span>
                            {!isActive && (
                              <span className="text-[10px] text-muted-foreground/70 block truncate">{section.description}</span>
                            )}
                          </div>
                        </button>
                      );
                    })}

                    <Separator className="my-2" />

                    {/* Quick Actions */}
                    <button
                      onClick={() => setSubPanel("persona")}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 group"
                    >
                      <User className="h-4 w-4 flex-shrink-0" />
                      <span className="font-medium">人设管理</span>
                      {persona?.name && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 ml-auto">
                          {persona.name}
                        </Badge>
                      )}
                    </button>
                    <button
                      onClick={handleResetOnboarding}
                      disabled={resetting}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 group"
                    >
                      <RotateCcw className={`h-4 w-4 flex-shrink-0 ${resetting ? "animate-spin" : ""}`} />
                      <span className="font-medium">重新引导设置</span>
                    </button>
                  </nav>
                </ScrollArea>
              </div>

              {/* Mobile: Horizontal Section Tabs */}
              <div className="sm:hidden flex-shrink-0 border-b">
                <div className="flex px-3 pt-3 pb-2 gap-2 overflow-x-auto scrollbar-hide">
                  {SECTIONS.map((section) => {
                    const Icon = section.icon;
                    const isActive = activeSection === section.id;
                    return (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                          isActive
                            ? "bg-gradient-to-r " + section.gradient + " text-white shadow-sm"
                            : "text-muted-foreground bg-muted/50 hover:bg-muted/80"
                        }`}
                      >
                        <Icon className="h-3 w-3" />
                        {section.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
                {/* Mobile Header */}
                <div className="sm:hidden px-4 pt-4 pb-2">
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <div className={`h-7 w-7 rounded-lg bg-gradient-to-br ${currentSection?.gradient || "from-slate-500 to-slate-600"} flex items-center justify-center`}>
                      <SectionIcon className="h-3.5 w-3.5 text-white" />
                    </div>
                    {currentSection?.label || "设置"}
                  </h2>
                </div>

                {/* Desktop Section Header */}
                <div className="hidden sm:flex items-center gap-2 px-6 pt-5 pb-3 flex-shrink-0">
                  <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${currentSection?.gradient || "from-slate-500 to-slate-600"} flex items-center justify-center shadow-sm`}>
                    <SectionIcon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">{currentSection?.label}</h3>
                    <p className="text-[10px] text-muted-foreground">{currentSection?.description}</p>
                  </div>
                </div>

                {/* Scrollable Content */}
                <ScrollArea className="flex-1">
                  <div className="px-4 sm:px-6 pb-6">
                    {/* Mobile quick actions */}
                    <div className="sm:hidden mb-4 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-[11px] flex-shrink-0"
                        onClick={() => setSubPanel("persona")}
                      >
                        <User className="h-3 w-3 mr-1" />
                        人设管理
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-[11px] flex-shrink-0"
                        onClick={handleResetOnboarding}
                        disabled={resetting}
                      >
                        <RotateCcw className={`h-3 w-3 mr-1 ${resetting ? "animate-spin" : ""}`} />
                        重新引导
                      </Button>
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeSection}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2, ease: "easeOut" as const }}
                      >
                        {renderSectionContent(activeSection)}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </>
  );
}
