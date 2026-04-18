"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings, Sparkles, Plus, Trash2, CheckCircle2, XCircle,
  Loader2, Zap, ExternalLink, Shield, Cpu, Thermometer,
  ChevronRight, Eye, EyeOff, Radio, Server, Globe
} from "lucide-react";
import { toast } from "sonner";
import { PRESET_PROVIDERS, type AIModelConfig } from "@/lib/ai-providers";

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

export function AISettingsPanel() {
  const [configs, setConfigs] = useState<ConfigRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<Partial<ConfigRecord> | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latency?: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [presetMode, setPresetMode] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<string>("");

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
    if (open) {
      fetchConfigs();
    }
  }, [open, fetchConfigs]);

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
    if (!editingConfig?.id) {
      toast.error("请先保存配置再测试");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/ai-config/test?id=${editingConfig.id}`);
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

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/ai-config/test?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("配置已删除");
        fetchConfigs();
      }
    } catch {
      toast.error("删除失败");
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

  const getPreset = (provider: string) => {
    return PRESET_PROVIDERS.find(p => p.provider === provider);
  };

  const activeConfig = configs.find(c => c.isActive);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 px-2 gap-1.5">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline text-xs">模型配置</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[640px] max-h-[85vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Cpu className="h-4 w-4 text-white" />
            </div>
            AI 模型配置
          </DialogTitle>
          <DialogDescription>
            选择或配置 AI 大模型，支持免费模型和自定义 API
          </DialogDescription>
        </DialogHeader>

        {/* Current active indicator */}
        <div className="px-6 pb-3">
          {activeConfig ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                当前使用: {activeConfig.name}
              </span>
              {activeConfig.modelId && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-emerald-300 dark:border-emerald-700">
                  {activeConfig.modelId}
                </Badge>
              )}
              {activeConfig.isFree && (
                <Badge className="text-[10px] px-1.5 py-0 h-5 bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800" variant="outline">
                  <Zap className="h-2.5 w-2.5 mr-0.5" />
                  免费
                </Badge>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs text-amber-700 dark:text-amber-300">
                尚未配置模型，将使用内置 AI 服务
              </span>
            </div>
          )}
        </div>

        <Separator />

        <div className="flex-1 overflow-hidden">
          <div className="flex h-full">
            {/* Left: Preset provider list */}
            <div className="w-[200px] border-r flex-shrink-0">
              <div className="p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                  免费模型
                </p>
                <div className="space-y-1">
                  {PRESET_PROVIDERS.map((preset) => {
                    const isActive = configs.some(c => c.provider === preset.provider && c.isActive);
                    return (
                      <button
                        key={preset.id}
                        onClick={() => {
                          setPresetMode(true);
                          handleSelectPreset(preset.id);
                        }}
                        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all text-xs hover:bg-muted/80 ${
                          selectedPreset === preset.id ? "bg-violet-50 dark:bg-violet-950/20 ring-1 ring-violet-200 dark:ring-violet-800" : ""
                        }`}
                      >
                        <span className="text-base flex-shrink-0">{preset.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{preset.name}</div>
                          {isActive && (
                            <div className="text-[9px] text-emerald-500 flex items-center gap-0.5">
                              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              使用中
                            </div>
                          )}
                        </div>
                        <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>

                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-2 px-1">
                  自定义
                </p>
                <button
                  onClick={() => {
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
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all text-xs hover:bg-muted/80 ${
                    !presetMode && selectedPreset === "" ? "bg-violet-50 dark:bg-violet-950/20 ring-1 ring-violet-200 dark:ring-violet-800" : ""
                  }`}
                >
                  <Globe className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">自定义 API</div>
                    <div className="text-[9px] text-muted-foreground">OpenAI 兼容格式</div>
                  </div>
                  <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                </button>
              </div>
            </div>

            {/* Right: Config form */}
            <div className="flex-1 min-w-0">
              {editingConfig ? (
                <ScrollArea className="h-full max-h-[calc(85vh-12rem)]">
                  <div className="p-4 space-y-4">
                    {/* Provider info */}
                    {presetMode && selectedPreset && (() => {
                      const preset = PRESET_PROVIDERS.find(p => p.id === selectedPreset);
                      if (!preset) return null;
                      return (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <Card className="border-0 shadow-sm bg-gradient-to-br from-violet-50/50 to-purple-50/50 dark:from-violet-950/10 dark:to-purple-950/10">
                            <CardContent className="p-3">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-xl">{preset.icon}</span>
                                <div>
                                  <h4 className="text-sm font-semibold">{preset.name}</h4>
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
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })()}

                    {!presetMode && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50/50 to-cyan-50/50 dark:from-blue-950/10 dark:to-cyan-950/10">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2 mb-1.5">
                              <Globe className="h-5 w-5 text-blue-500" />
                              <div>
                                <h4 className="text-sm font-semibold">自定义 OpenAI 兼容 API</h4>
                                <p className="text-[10px] text-muted-foreground">
                                  支持任何兼容 OpenAI 接口格式的 API 服务
                                </p>
                              </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              如：OpenAI、Anthropic（via proxy）、DeepSeek、Ollama 本地部署等
                            </p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}

                    {/* Config Name */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">配置名称</Label>
                      <Input
                        placeholder="如：我的 DeepSeek"
                        value={editingConfig.name || ""}
                        onChange={(e) => setEditingConfig({ ...editingConfig, name: e.target.value })}
                        className="h-9 text-sm"
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
                            <SelectTrigger className="h-9 text-sm">
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

                    {/* Custom base URL (for custom provider or advanced) */}
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
                          className="h-9 text-sm font-mono"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          填写 API 地址，不含 /chat/completions 后缀
                        </p>
                      </div>
                    )}

                    {/* Custom Model ID (for custom provider) */}
                    {!presetMode && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">模型 ID</Label>
                        <Input
                          placeholder="如：deepseek-chat"
                          value={editingConfig.modelId || ""}
                          onChange={(e) => setEditingConfig({ ...editingConfig, modelId: e.target.value })}
                          className="h-9 text-sm font-mono"
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
                            className="h-9 text-sm font-mono pr-9"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-9 w-9 px-2"
                            onClick={() => setShowApiKey(!showApiKey)}
                          >
                            {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Shield className="h-2.5 w-2.5" />
                          API Key 仅存储在本地数据库，不会外传
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
                        <SelectTrigger className="h-9 text-sm">
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
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className={`flex items-start gap-2 p-3 rounded-lg border text-xs ${
                          testResult.success
                            ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                            : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
                        }`}>
                          {testResult.success ? (
                            <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          ) : (
                            <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="break-words">{testResult.message}</p>
                            {testResult.latency && (
                              <p className="text-[10px] mt-1 opacity-70">
                                延迟: {testResult.latency}ms
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
                        size="sm"
                      >
                        {saving ? (
                          <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />保存中...</>
                        ) : (
                          <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />保存配置</>
                        )}
                      </Button>
                      {editingConfig.id && (
                        <Button
                          onClick={handleTest}
                          disabled={testing}
                          variant="outline"
                          size="sm"
                          className="border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400"
                        >
                          {testing ? (
                            <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />测试中</>
                          ) : (
                            <><Sparkles className="h-3.5 w-3.5 mr-1" />测试连接</>
                          )}
                        </Button>
                      )}
                      <Button
                        onClick={() => { setEditingConfig(null); setSelectedPreset(""); setTestResult(null); }}
                        variant="ghost"
                        size="sm"
                      >
                        取消
                      </Button>
                    </div>
                  </div>
                </ScrollArea>
              ) : (
                <ScrollArea className="h-full max-h-[calc(85vh-12rem)]">
                  <div className="p-4">
                    <div className="text-center py-8">
                      <Cpu className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">从左侧选择一个模型开始配置</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        或点击"自定义 API"使用自己的接口
                      </p>
                    </div>

                    {/* Saved configs list */}
                    {configs.length > 0 && (
                      <div className="mt-2 space-y-2">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
                          已保存配置 ({configs.length})
                        </p>
                        {configs.map((config) => {
                          const preset = getPreset(config.provider);
                          return (
                            <Card key={config.id} className="border-0 shadow-sm hover:shadow-md transition-all">
                              <CardContent className="p-3">
                                <div className="flex items-center gap-3">
                                  <span className="text-lg flex-shrink-0">{preset?.icon || "🔧"}</span>
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
                                    <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                                      {config.modelId || config.provider}
                                      {config.temperature !== 0.7 && ` · T=${config.temperature}`}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    {!config.isActive && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-[10px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                                        onClick={() => handleSetActive(config)}
                                        title="设为当前使用"
                                      >
                                        <Radio className="h-3 w-3" />
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-[10px] text-muted-foreground hover:text-blue-600"
                                      onClick={() => {
                                        setPresetMode(!!preset);
                                        if (preset) {
                                          setSelectedPreset(preset.id);
                                        }
                                        setEditingConfig(config);
                                        setTestResult(null);
                                      }}
                                    >
                                      <Settings className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-[10px] text-muted-foreground hover:text-red-600"
                                      onClick={() => handleDelete(config.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
