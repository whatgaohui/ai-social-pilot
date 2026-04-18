"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  BookOpen,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Palette,
  Shield,
  Info,
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
  Zap,
  Thermometer,
} from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { toast } from "sonner";
import { PRESET_PROVIDERS } from "@/lib/ai-providers";
import { ThemeToggle } from "@/components/theme-toggle";
import { PersonaForm } from "@/components/left-panel/persona-form";

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

export function SettingsCenter({ connectedPlatforms }: SettingsCenterProps) {
  const [open, setOpen] = useState(false);
  const [subPanel, setSubPanel] = useState<"main" | "ai" | "persona">("main");
  const [resetting, setResetting] = useState(false);
  const { persona, setOnboardingCompleted, setAccountPanelOpen } = useAppStore();

  // Reset sub-panel when dialog opens/closes
  useEffect(() => {
    if (!open) setSubPanel("main");
  }, [open]);

  const handleResetOnboarding = async () => {
    if (!confirm("确定要重新进行引导设置吗？当前设置不会被删除，但会重新走一遍引导流程。")) return;
    setResetting(true);
    try {
      setOnboardingCompleted(false);
      setOpen(false);
      toast.success("即将进入引导设置");
    } finally {
      setResetting(false);
    }
  };

  const handleOpenAccountPanel = () => {
    setOpen(false);
    setTimeout(() => {
      setAccountPanelOpen(true);
    }, 350);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-2.5 gap-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <Settings className="h-4 w-4" />
          <span className="hidden lg:inline text-xs">设置</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[820px] w-[95vw] max-h-[90vh] p-0 overflow-hidden">
        {subPanel === "ai" ? (
          /* AI Model Config */
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
        ) : subPanel === "persona" ? (
          /* Persona Management */
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
        ) : (
          /* Main Settings Menu */
          <>
            <DialogHeader className="px-6 pt-5 pb-3">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center">
                  <Settings className="h-4 w-4 text-white" />
                </div>
                设置中心
              </DialogTitle>
              <DialogDescription>
                管理模型配置、平台账号、人设和系统偏好
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="h-[calc(90vh-120px)]">
              <div className="px-6 pb-6 space-y-3">
                {/* AI Model Config */}
                <SettingsCard
                  icon={Cpu}
                  iconGradient="from-violet-500 to-purple-600"
                  title="AI 模型配置"
                  description="选择或自定义 AI 大模型，支持免费模型和 OpenAI 兼容 API"
                  onClick={() => setSubPanel("ai")}
                  badge="核心"
                />

                {/* Account Management - directly opens PlatformAccountPanel */}
                <SettingsCard
                  icon={Link2}
                  iconGradient="from-emerald-500 to-teal-600"
                  title="平台账号管理"
                  description="连接微信朋友圈和小红书账号，配置 API 凭据"
                  onClick={handleOpenAccountPanel}
                  badge={connectedPlatforms > 0 ? `${connectedPlatforms}个已连接` : "未连接"}
                  badgeColor={connectedPlatforms > 0 ? "bg-emerald-500/10 text-emerald-600 border-emerald-200" : undefined}
                />

                <Separator className="my-2" />

                {/* Persona Management - opens embedded form */}
                <SettingsCard
                  icon={User}
                  iconGradient="from-amber-500 to-orange-500"
                  title="人设管理"
                  description={`编辑您的品牌人设、语气风格和目标受众${persona?.name ? ` · 当前：${persona.name}` : " · 未设置"}`}
                  onClick={() => setSubPanel("persona")}
                />

                <Separator className="my-2" />

                {/* Theme */}
                <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-sm">
                          <Palette className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium">外观与主题</h4>
                          <p className="text-[11px] text-muted-foreground">切换深色/浅色模式</p>
                        </div>
                      </div>
                      <ThemeToggle />
                    </div>
                  </CardContent>
                </Card>

                {/* Reset Onboarding */}
                <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center shadow-sm">
                          <RotateCcw className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium">重新引导设置</h4>
                          <p className="text-[11px] text-muted-foreground">重新走一遍初始化引导流程，配置平台、人设和知识库</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs text-muted-foreground"
                        onClick={handleResetOnboarding}
                        disabled={resetting}
                      >
                        <RotateCcw className={`h-3 w-3 mr-1 ${resetting ? "animate-spin" : ""}`} />
                        重置
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* About */}
                <Card className="border-0 shadow-sm bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="text-[11px] text-muted-foreground leading-relaxed space-y-1">
                        <p>AI 社交运营助手 v2.0 · 支持朋友圈和小红书双平台</p>
                        <p>数据存储在本地数据库，API Key 不会外传。</p>
                        <p className="flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          安全提示：建议定期更换 API Key，生产环境需加密存储。
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* Settings card component */
function SettingsCard({
  icon: Icon,
  iconGradient,
  title,
  description,
  onClick,
  badge,
  badgeColor,
}: {
  icon: typeof Settings;
  iconGradient: string;
  title: string;
  description: string;
  onClick: () => void;
  badge?: string;
  badgeColor?: string;
}) {
  return (
    <Card
      className="border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${iconGradient} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
              <Icon className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium">{title}</h4>
                {badge && (
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1.5 py-0 h-4 ${badgeColor || "bg-violet-500/10 text-violet-600 border-violet-200 dark:border-violet-800"}`}
                  >
                    {badge}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground truncate">{description}</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-0.5 transition-all flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

/* =====================================================
   Full AI Settings - fully functional embedded view
   ===================================================== */

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
    const preset = PRESET_PROVIDERS.find(p => p.id === presetId);
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
      const res = await fetch(`/api/ai-config/test?id=${config.id}`, { method: "DELETE" });
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
    const preset = PRESET_PROVIDERS.find(p => p.provider === config.provider);
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

  const activeConfig = configs.find(c => c.isActive);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
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
              const preset = PRESET_PROVIDERS.find(p => p.provider === config.provider);
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
                          className="h-7 w-7 p-0 text-[10px] text-muted-foreground hover:text-blue-600"
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
                    const preset = PRESET_PROVIDERS.find(p => p.id === selectedPreset);
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
                    const preset = PRESET_PROVIDERS.find(p => p.id === selectedPreset);
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
                  {editingConfig.provider !== 'z-ai' && (
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
                {PRESET_PROVIDERS.filter(p => p.provider !== 'z-ai').map((preset) => {
                  const isConfigured = configs.some(c => c.provider === preset.provider);
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
                <Globe className="h-4 w-4 text-muted-foreground group-hover:text-blue-500 transition-colors flex-shrink-0" />
                <div className="flex-1">
                  <span className="text-xs font-medium group-hover:text-foreground transition-colors">自定义 API (OpenAI 兼容)</span>
                  <p className="text-[10px] text-muted-foreground">DeepSeek / OpenAI / Ollama 本地部署等</p>
                </div>
                <Plus className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-blue-500 transition-colors flex-shrink-0" />
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
