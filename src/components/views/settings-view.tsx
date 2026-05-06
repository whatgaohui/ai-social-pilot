"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppStore } from "@/store/app-store";
import { useNotificationStore } from "@/store/notification-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AI_PROVIDERS } from "@/lib/ai-config";
import {
  Database,
  Trash2,
  Download,
  RefreshCw,
  Info,
  ExternalLink,
  Heart,
  Sparkles,
  FileText,
  Users,
  Moon,
  Sun,
  Monitor,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";

type ConnectionStatus = "idle" | "testing" | "success" | "error";

// Helper to load config from localStorage (used for initial state)
function loadSavedConfig() {
  try {
    const saved = localStorage.getItem("xhs-ai-config");
    if (saved) {
      const config = JSON.parse(saved);
      return {
        provider: config.provider || "zhipu",
        apiKey: config.apiKey || "",
        model: config.model || "",
        baseUrl: config.baseUrl || "",
      };
    }
  } catch {
    // ignore
  }
  return { provider: "zhipu", apiKey: "", model: "", baseUrl: "" };
}

export function SettingsView() {
  const addNotification = useNotificationStore((s) => s.addNotification);
  const { theme, setTheme } = useTheme();
  const [clearingData, setClearingData] = useState(false);
  const [exportingData, setExportingData] = useState(false);

  // AI Provider state - initialize from localStorage
  const savedConfig = loadSavedConfig();
  const [aiProvider, setAiProvider] = useState(savedConfig.provider);
  const [apiKey, setApiKey] = useState(savedConfig.apiKey);
  const [aiModel, setAiModel] = useState(savedConfig.model);
  const [customBaseUrl, setCustomBaseUrl] = useState(savedConfig.baseUrl);
  const [showKey, setShowKey] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingConfig, setTestingConfig] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");

  const currentProvider = AI_PROVIDERS.find((p) => p.id === aiProvider);
  const aiConfigured = apiKey.trim().length > 0;

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setConnectionStatus("idle");
    try {
      const config = {
        provider: aiProvider,
        apiKey: apiKey.trim(),
        model: aiModel || currentProvider?.defaultModel || "",
        baseUrl: aiProvider === "custom" ? customBaseUrl.trim() : (currentProvider?.baseUrl || ""),
      };
      localStorage.setItem("xhs-ai-config", JSON.stringify(config));

      const res = await fetch("/api/ai/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("AI 配置已保存！");
      } else {
        toast.error(data.error || "保存失败");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTestConfig = async () => {
    setTestingConfig(true);
    setConnectionStatus("testing");
    try {
      const res = await fetch("/api/ai/config/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: aiProvider,
          apiKey: apiKey.trim(),
          model: aiModel || currentProvider?.defaultModel || "",
          baseUrl: aiProvider === "custom" ? customBaseUrl.trim() : (currentProvider?.baseUrl || ""),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConnectionStatus("success");
        toast.success(`连接成功！模型: ${data.data?.model || aiModel}`);
      } else {
        setConnectionStatus("error");
        toast.error(data.error || "连接失败，请检查配置");
      }
    } catch {
      setConnectionStatus("error");
      toast.error("网络错误，请重试");
    } finally {
      setTestingConfig(false);
    }
  };

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
      const res = await fetch("/api/accounts");
      const data = await res.json();
      if (data.success) {
        for (const account of data.data || []) {
          await fetch(`/api/accounts/${account.id}`, { method: "DELETE" });
        }
        toast.success("数据已清空");
        addNotification({
          type: "info",
          category: "system",
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
          category: "system",
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

  const getStatusDot = () => {
    if (testingConfig) {
      return <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />;
    }
    if (connectionStatus === "success") {
      return <span className="w-2 h-2 rounded-full bg-emerald-500" />;
    }
    if (connectionStatus === "error") {
      return <span className="w-2 h-2 rounded-full bg-red-500" />;
    }
    if (aiConfigured) {
      return <span className="w-2 h-2 rounded-full bg-emerald-500" />;
    }
    return <span className="w-2 h-2 rounded-full bg-amber-500" />;
  };

  const getStatusText = () => {
    if (testingConfig) return "测试中...";
    if (connectionStatus === "success") return "连接成功";
    if (connectionStatus === "error") return "连接失败";
    if (aiConfigured) return "已配置";
    return "待配置";
  };

  return (
    <div className="p-4 md:p-6 space-y-5 custom-scrollbar overflow-y-auto h-full pb-20 md:pb-6 view-animate">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">设置</h2>
        <p className="text-sm text-muted-foreground mt-0.5">应用偏好与数据管理</p>
      </div>

      {/* AI Provider Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-xhs" />
            AI 大模型
          </CardTitle>
          <CardDescription className="text-xs">配置 AI 内容创作和分析的大模型服务</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Provider Grid - 2x3 layout for 5 providers */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">选择提供商</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AI_PROVIDERS.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => {
                    setAiProvider(provider.id);
                    setConnectionStatus("idle");
                  }}
                  className={cn(
                    "relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center",
                    aiProvider === provider.id
                      ? "border-xhs bg-xhs-light/30 shadow-sm shadow-xhs/10"
                      : "border-border hover:border-xhs/30 hover:bg-muted/50"
                  )}
                >
                  {provider.pricing === "free" && (
                    <Badge
                      variant="secondary"
                      className="absolute -top-1.5 -right-1.5 text-[9px] px-1 py-0 h-4 bg-emerald-50 text-emerald-600 border-0"
                    >
                      免费
                    </Badge>
                  )}
                  <span className="text-xs font-medium">{provider.name}</span>
                  {aiProvider === provider.id && (
                    <CheckCircle2 className="w-3 h-3 text-xhs absolute bottom-1.5 right-1.5" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Configuration fields shown below the grid when provider is selected */}
          {currentProvider && (
            <>
              {/* Base URL for custom provider */}
              {aiProvider === "custom" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Base URL</Label>
                  <Input
                    placeholder="https://your-api-server/v1"
                    value={customBaseUrl}
                    onChange={(e) => setCustomBaseUrl(e.target.value)}
                    className="text-sm h-9"
                  />
                  <p className="text-[10px] text-muted-foreground">如 Ollama: http://localhost:11434/v1</p>
                </div>
              )}

              {/* Model selection - directly visible */}
              {currentProvider.models.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">模型选择</Label>
                  <Select value={aiModel} onValueChange={setAiModel}>
                    <SelectTrigger className="text-sm h-9">
                      <SelectValue placeholder={currentProvider.defaultModel} />
                    </SelectTrigger>
                    <SelectContent>
                      {currentProvider.models.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* API Key with show/hide toggle */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">API Key</Label>
                <div className="flex gap-2">
                  <Input
                    type={showKey ? "text" : "password"}
                    placeholder="粘贴你的 API Key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="text-sm h-9"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0 h-9 w-9"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Connection status with dot indicator */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30">
                <div className="flex items-center gap-2">
                  {getStatusDot()}
                  <span className="text-sm font-medium">{getStatusText()}</span>
                </div>
                {currentProvider?.signupUrl && (
                  <a
                    href={currentProvider.signupUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-xhs hover:underline"
                  >
                    获取 API Key
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <Separator />

              {/* Test and Save buttons side by side */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs border-border flex-1 h-9"
                  onClick={handleTestConfig}
                  disabled={testingConfig || !aiConfigured}
                >
                  {testingConfig ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                  )}
                  测试连接
                </Button>
                <Button
                  size="sm"
                  className="text-xs bg-xhs text-white hover:bg-xhs/90 flex-1 h-9"
                  onClick={handleSaveConfig}
                  disabled={savingConfig || !aiConfigured}
                >
                  {savingConfig ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  )}
                  保存配置
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-500" />
            外观
          </CardTitle>
          <CardDescription className="text-xs">自定义应用显示主题</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label className="text-xs font-medium">主题模式</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "light", label: "浅色", icon: Sun, desc: "明亮清爽" },
                { value: "dark", label: "深色", icon: Moon, desc: "护眼模式" },
                { value: "system", label: "跟随系统", icon: Monitor, desc: "自动适配" },
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
              <p className="text-xs text-muted-foreground mt-0.5">版本 2.1.0</p>
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

          {/* Changelog */}
          <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
            <p className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">最新更新</p>
            <div className="space-y-1.5">
              <div className="flex items-start gap-2">
                <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5 bg-xhs-light text-xhs border-0 shrink-0 mt-0.5">NEW</Badge>
                <p className="text-[10px] text-muted-foreground">AI运营建议、创作模板、质量评分、数据导出增强</p>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5 bg-emerald-50 text-emerald-600 border-0 shrink-0 mt-0.5">FIX</Badge>
                <p className="text-[10px] text-muted-foreground">优化仪表盘图表、内容卡片、漏斗分析视觉体验</p>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5 bg-amber-50 text-amber-600 border-0 shrink-0 mt-0.5">UI</Badge>
                <p className="text-[10px] text-muted-foreground">全局微动画、暗色模式适配、滚动条优化</p>
              </div>
            </div>
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