"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type PlatformAccount, type AccountStatus, type TokenType, ACCOUNT_STATUS_LABELS, ACCOUNT_STATUS_COLORS, TOKEN_TYPE_LABELS } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageCircle,
  BookOpen,
  Link2,
  Unlink,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Users,
  UserPlus,
  FileText,
  Clock,
  Wifi,
  WifiOff,
  ExternalLink,
  Info,
  Shield,
  Zap,
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

interface PlatformAccountPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectedCount: number;
  totalCount: number;
}

// Connection status badge component
function StatusBadge({ status }: { status: string }) {
  const typedStatus = (status || "disconnected") as AccountStatus;
  return (
    <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 ${ACCOUNT_STATUS_COLORS[typedStatus]}`}>
      {status === "connected" && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />}
      {ACCOUNT_STATUS_LABELS[typedStatus]}
    </Badge>
  );
}

// Platform section component
function PlatformSection({
  platform,
  account,
  onConnect,
  onDisconnect,
  onTest,
  onSync,
}: {
  platform: "wechat" | "xiaohongshu";
  account: PlatformAccount | undefined;
  onConnect: (data: ConnectFormData) => Promise<void>;
  onDisconnect: () => Promise<void>;
  onTest: () => Promise<{ success: boolean; message: string; latency: number }>;
  onSync: () => Promise<void>;
}) {
  const [tokenType, setTokenType] = useState<TokenType>("api_key");
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [showGuide, setShowGuide] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latency: number } | null>(null);
  const [formData, setFormData] = useState<ConnectFormData>({
    platform,
    tokenType: "api_key",
    apiKey: "",
    apiSecret: "",
    apiEndpoint: platform === "wechat" ? "https://api.weixin.qq.com/" : "https://edith.xiaohongshu.com/api/",
    cookie: "",
    accountType: "personal",
    displayName: "",
  });

  const isWechat = platform === "wechat";
  const isConnected = account?.status === "connected";
  const hasError = account?.status === "error";
  const isExpired = account?.status === "expired";

  const platformConfig = {
    wechat: {
      name: "微信朋友圈",
      icon: MessageCircle,
      color: "from-green-500 to-emerald-600",
      borderColor: "border-green-500/30",
      bgLight: "bg-green-50 dark:bg-green-950/20",
      iconBg: "bg-green-100 dark:bg-green-900/30",
      iconColor: "text-green-600 dark:text-green-400",
      accentColor: "text-green-600 dark:text-green-400",
      btnGradient: "from-green-500 to-emerald-600",
    },
    xiaohongshu: {
      name: "小红书",
      icon: BookOpen,
      color: "from-red-500 to-rose-600",
      borderColor: "border-red-500/30",
      bgLight: "bg-red-50 dark:bg-red-950/20",
      iconBg: "bg-red-100 dark:bg-red-900/30",
      iconColor: "text-red-600 dark:text-red-400",
      accentColor: "text-red-600 dark:text-red-400",
      btnGradient: "from-red-500 to-rose-600",
    },
  };

  const config = platformConfig[platform];
  const PlatformIcon = config.icon;

  const toggleSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleConnect = async () => {
    setConnecting(true);
    setTestResult(null);
    try {
      await onConnect({ ...formData, tokenType });
    } catch {
      // Error handled in parent
    } finally {
      setConnecting(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await onTest();
      setTestResult(result);
    } finally {
      setTesting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await onSync();
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (confirm("确定要断开连接吗？断开后需要重新配置凭据。")) {
      await onDisconnect();
      setTestResult(null);
    }
  };

  // Reset form when tokenType changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      tokenType,
      apiKey: "",
      apiSecret: "",
      cookie: "",
    }));
    setTestResult(null);
  }, [tokenType]);

  const guideContent = isWechat ? {
    title: "微信公众号/开放平台接入指南",
    steps: [
      { step: 1, title: "注册微信开放平台", desc: "访问 open.weixin.qq.com，使用微信扫码登录并注册开发者账号" },
      { step: 2, title: "创建网站应用/公众号", desc: "在管理中心创建对应类型的应用，获取 AppID 和 AppSecret" },
      { step: 3, title: "配置授权回调域", desc: "在应用设置中填写回调域名（开发环境使用测试域名）" },
      { step: 4, title: "获取用户授权", desc: "引导用户通过 OAuth2.0 流程授权，获取 access_token" },
      { step: 5, title: "调用 API", desc: "使用 access_token 调用微信 API 获取用户信息和发布内容" },
    ],
  } : {
    title: "小红书创作者平台接入指南",
    steps: [
      { step: 1, title: "申请创作者权限", desc: "在小红书 APP 中申请成为创作者，完善个人资料" },
      { step: 2, title: "申请开放平台", desc: "访问 open.xiaohongshu.com，申请开发者权限" },
      { step: 3, title: "获取 API 凭据", desc: "创建应用后获取 API Key 和 API Secret" },
      { step: 4, title: "配置回调地址", desc: "在应用设置中配置 OAuth 回调地址" },
      { step: 5, title: "获取 Cookie（备选）", desc: "从浏览器 F12 开发者工具 → Application → Cookies 复制 a1 和 web_session" },
    ],
  };

  return (
    <motion.div
      variants={itemVariants}
      className={`rounded-xl border ${config.borderColor} overflow-hidden`}
    >
      {/* Platform Header */}
      <div className={`bg-gradient-to-r ${config.color} px-5 py-4 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <PlatformIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">{config.name}</h3>
            <p className="text-white/70 text-[10px] mt-0.5">
              {isConnected ? "已连接 · 可以发布内容和管理数据" : "未连接 · 配置账号以启用平台功能"}
            </p>
          </div>
        </div>
        {account && <StatusBadge status={account.status} />}
      </div>

      <div className="p-5">
        <AnimatePresence mode="wait">
          {isConnected ? (
            /* === Connected Account Info === */
            <motion.div
              key="connected"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Account Card */}
              <div className={`rounded-lg p-4 ${config.bgLight}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`h-12 w-12 rounded-full ${config.iconBg} flex items-center justify-center`}>
                    {account.avatarUrl ? (
                      <img src={account.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <PlatformIcon className={`h-6 w-6 ${config.iconColor}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{account.displayName || config.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px]">
                        {account.accountType === "personal" ? "个人号" : account.accountType === "business" ? "公众号" : "创作者"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {TOKEN_TYPE_LABELS[account.tokenType as TokenType] || account.tokenType}
                      </Badge>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
                        在线
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-2 rounded-lg bg-background/60">
                    <div className="flex items-center justify-center gap-1 text-lg font-bold text-foreground">
                      <Users className={`h-3.5 w-3.5 ${config.iconColor}`} />
                      {account.followers > 1000 ? `${(account.followers / 1000).toFixed(1)}k` : account.followers}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">粉丝</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-background/60">
                    <div className="flex items-center justify-center gap-1 text-lg font-bold text-foreground">
                      <UserPlus className="h-3.5 w-3.5 text-violet-500" />
                      {account.following > 1000 ? `${(account.following / 1000).toFixed(1)}k` : account.following}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">关注</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-background/60">
                    <div className="flex items-center justify-center gap-1 text-lg font-bold text-foreground">
                      <FileText className="h-3.5 w-3.5 text-amber-500" />
                      {account.postsCount}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{isWechat ? "动态" : "笔记"}</p>
                  </div>
                </div>

                {/* Connection Details */}
                <div className="space-y-2 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span>连接时间: {account.connectedAt ? new Date(account.connectedAt).toLocaleDateString("zh-CN") : "-"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-3 w-3" />
                    <span>最后同步: {account.lastSyncAt ? new Date(account.lastSyncAt).toLocaleString("zh-CN") : "-"}</span>
                  </div>
                  {account.expiresAt && (
                    <div className="flex items-center gap-2">
                      <Zap className="h-3 w-3" />
                      <span>Token 过期: {new Date(account.expiresAt).toLocaleDateString("zh-CN")}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Test Result */}
              {testResult && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Alert variant={testResult.success ? "default" : "destructive"} className="py-2">
                    {testResult.success ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <AlertDescription className="text-xs">
                      {testResult.message}
                      <span className="ml-2 text-muted-foreground">({testResult.latency}ms)</span>
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs h-8"
                  onClick={handleSync}
                  disabled={syncing}
                >
                  {syncing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                  同步数据
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs h-8"
                  onClick={handleTest}
                  disabled={testing}
                >
                  {testing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Wifi className="h-3 w-3 mr-1" />}
                  测试连接
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                  onClick={handleDisconnect}
                >
                  <Unlink className="h-3 w-3 mr-1" />
                  断开
                </Button>
              </div>
            </motion.div>
          ) : (
            /* === Connection Form === */
            <motion.div
              key="disconnected"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Error Display */}
              {(hasError || isExpired) && account?.lastError && (
                <Alert variant="destructive" className="py-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">{account.lastError}</AlertDescription>
                </Alert>
              )}

              {/* Description */}
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isWechat
                  ? "连接微信公众号可自动发布朋友圈内容、同步粉丝数据和互动信息。支持公众号 API 接入和 Cookie 登录方式。"
                  : "连接小红书账号可自动发布笔记、同步粉丝数据、获取热门话题趋势。支持创作者 API 和 Cookie 登录方式。"}
              </p>

              {/* Connection Method Tabs */}
              <Tabs value={tokenType} onValueChange={(v) => setTokenType(v as TokenType)} className="w-full">
                <TabsList className="w-full h-9 p-0.5 bg-muted/50">
                  <TabsTrigger value="api_key" className="flex-1 h-8 text-[11px] gap-1 data-[state=active]:bg-background shadow-sm">
                    <Shield className="h-3 w-3" />
                    API Key
                  </TabsTrigger>
                  <TabsTrigger value="oauth" className="flex-1 h-8 text-[11px] gap-1 data-[state=active]:bg-background shadow-sm">
                    <Link2 className="h-3 w-3" />
                    OAuth 授权
                  </TabsTrigger>
                  <TabsTrigger value="cookie" className="flex-1 h-8 text-[11px] gap-1 data-[state=active]:bg-background shadow-sm">
                    <Zap className="h-3 w-3" />
                    Cookie
                  </TabsTrigger>
                </TabsList>

                {/* API Key Tab */}
                <TabsContent value="api_key" className="mt-3 space-y-3">
                  {isWechat ? (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-xs">AppID</Label>
                        <Input
                          placeholder="wx1234567890abcdef"
                          value={formData.apiKey}
                          onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">AppSecret</Label>
                        <div className="relative">
                          <Input
                            type={showSecrets.apiSecret ? "text" : "password"}
                            placeholder="请输入 AppSecret"
                            value={formData.apiSecret}
                            onChange={(e) => setFormData(prev => ({ ...prev, apiSecret: e.target.value }))}
                            className="h-8 text-xs pr-8"
                          />
                          <button
                            type="button"
                            onClick={() => toggleSecret("apiSecret")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showSecrets.apiSecret ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-xs">API Key</Label>
                        <div className="relative">
                          <Input
                            type={showSecrets.apiKey ? "text" : "password"}
                            placeholder="请输入 API Key"
                            value={formData.apiKey}
                            onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                            className="h-8 text-xs pr-8"
                          />
                          <button
                            type="button"
                            onClick={() => toggleSecret("apiKey")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showSecrets.apiKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">API Secret</Label>
                        <div className="relative">
                          <Input
                            type={showSecrets.apiSecret ? "text" : "password"}
                            placeholder="请输入 API Secret"
                            value={formData.apiSecret}
                            onChange={(e) => setFormData(prev => ({ ...prev, apiSecret: e.target.value }))}
                            className="h-8 text-xs pr-8"
                          />
                          <button
                            type="button"
                            onClick={() => toggleSecret("apiSecret")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showSecrets.apiSecret ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-xs">API 端点</Label>
                    <Input
                      placeholder={isWechat ? "https://api.weixin.qq.com/" : "https://edith.xiaohongshu.com/api/"}
                      value={formData.apiEndpoint}
                      onChange={(e) => setFormData(prev => ({ ...prev, apiEndpoint: e.target.value }))}
                      className="h-8 text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      {isWechat ? "微信公众号 API 基础地址" : "小红书开放平台 API 地址"}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">账号昵称（可选）</Label>
                    <Input
                      placeholder={isWechat ? "微信公众号名称" : "小红书昵称"}
                      value={formData.displayName}
                      onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>
                </TabsContent>

                {/* OAuth Tab */}
                <TabsContent value="oauth" className="mt-3 space-y-3">
                  <div className={`rounded-lg p-4 ${config.bgLight}`}>
                    <div className="flex items-start gap-3">
                      <Info className={`h-4 w-4 mt-0.5 ${config.iconColor}`} />
                      <div className="text-xs leading-relaxed">
                        <p className="font-medium mb-1">OAuth 授权流程说明</p>
                        {isWechat ? (
                          <>
                            <p className="text-muted-foreground mb-2">1. 前往微信开放平台创建网站应用</p>
                            <p className="text-muted-foreground mb-2">2. 配置回调域名并获取 AppID</p>
                            <p className="text-muted-foreground mb-2">3. 使用授权链接引导用户扫码授权</p>
                            <p className="text-muted-foreground">4. 获取 access_token 后填入系统</p>
                          </>
                        ) : (
                          <>
                            <p className="text-muted-foreground mb-2">1. 前往小红书开放平台申请开发者权限</p>
                            <p className="text-muted-foreground mb-2">2. 创建应用并配置回调地址</p>
                            <p className="text-muted-foreground mb-2">3. 使用授权链接引导用户登录授权</p>
                            <p className="text-muted-foreground">4. 获取 access_token 后填入系统</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Access Token</Label>
                    <div className="relative">
                      <Textarea
                        placeholder="授权成功后获取的 access_token"
                        value={formData.apiKey}
                        onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                        className="text-xs min-h-[60px] resize-none pr-8"
                      />
                      <button
                        type="button"
                        onClick={() => toggleSecret("apiKey")}
                        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                      >
                        {showSecrets.apiKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Refresh Token（可选）</Label>
                    <Input
                      type={showSecrets.apiSecret ? "text" : "password"}
                      placeholder="用于刷新 access_token"
                      value={formData.apiSecret}
                      onChange={(e) => setFormData(prev => ({ ...prev, apiSecret: e.target.value }))}
                      className="h-8 text-xs pr-8"
                    />
                  </div>
                </TabsContent>

                {/* Cookie Tab */}
                <TabsContent value="cookie" className="mt-3 space-y-3">
                  <Alert className="py-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Cookie 登录方式安全性较低，建议仅在个人使用场景下采用。Cookie 有效期有限，过期后需要重新获取。
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cookie 字符串</Label>
                    <Textarea
                      placeholder={isWechat
                        ? "从浏览器开发者工具中复制微信 Cookie"
                        : "从浏览器 F12 → Application → Cookies 复制 a1 和 web_session 值"}
                      value={formData.cookie}
                      onChange={(e) => setFormData(prev => ({ ...prev, cookie: e.target.value }))}
                      className="text-xs min-h-[80px] resize-none font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <ExternalLink className="h-2.5 w-2.5" />
                      {isWechat
                        ? "打开微信网页版 → F12 开发者工具 → Network → 复制请求头中的 Cookie"
                        : "打开小红书网页版 → F12 → Application → Cookies → 复制 a1 和 web_session"}
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Connect Button */}
              <Button
                onClick={handleConnect}
                disabled={connecting || (tokenType === "api_key" && (!formData.apiKey || !formData.apiSecret)) || (tokenType === "cookie" && !formData.cookie)}
                className={`w-full h-9 text-xs bg-gradient-to-r ${config.btnGradient} text-white hover:opacity-90 transition-opacity`}
              >
                {connecting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    正在验证凭据...
                  </>
                ) : hasError || isExpired ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    重新连接
                  </>
                ) : (
                  <>
                    <Link2 className="h-3.5 w-3.5 mr-1.5" />
                    连接{config.name}
                  </>
                )}
              </Button>

              {/* Test Result */}
              {testResult && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Alert variant={testResult.success ? "default" : "destructive"} className="py-2">
                    {testResult.success ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <AlertDescription className="text-xs">
                      {testResult.message}
                      {testResult.latency > 0 && (
                        <span className="ml-2 text-muted-foreground">({testResult.latency}ms)</span>
                      )}
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <Separator className="my-4" />

        {/* Connection Guide Toggle */}
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          <span className="flex items-center gap-1.5">
            <Info className="h-3 w-3" />
            {guideContent.title}
          </span>
          {showGuide ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        <AnimatePresence>
          {showGuide && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-3 space-y-3">
                {guideContent.steps.map((step, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className={`flex-shrink-0 h-6 w-6 rounded-full bg-gradient-to-br ${config.color} flex items-center justify-center text-white text-[10px] font-bold`}>
                      {step.step}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{step.title}</p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

interface ConnectFormData {
  platform: string;
  tokenType: string;
  apiKey: string;
  apiSecret: string;
  apiEndpoint: string;
  cookie: string;
  accountType: string;
  displayName: string;
}

export function PlatformAccountPanel({
  open,
  onOpenChange,
  connectedCount,
  totalCount,
}: PlatformAccountPanelProps) {
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/platform-accounts");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetchAccounts();
    }
  }, [open, fetchAccounts]);

  const getAccount = (platform: string): PlatformAccount | undefined => {
    return accounts.find(a => a.platform === platform);
  };

  const handleConnect = async (data: ConnectFormData) => {
    const res = await fetch("/api/platform-accounts/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || "连接失败");
    }

    await fetchAccounts();
    return result;
  };

  const handleDisconnect = async (accountId: string) => {
    const res = await fetch(`/api/platform-accounts/${accountId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      await fetchAccounts();
    }
  };

  const handleTest = async (accountId: string) => {
    const res = await fetch("/api/platform-accounts/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId }),
    });

    return await res.json();
  };

  const handleSync = async (accountId: string) => {
    const res = await fetch("/api/platform-accounts/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId }),
    });

    if (res.ok) {
      await fetchAccounts();
    }
  };

  const wechatAccount = getAccount("wechat");
  const xhsAccount = getAccount("xiaohongshu");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Link2 className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-base">平台账号管理</DialogTitle>
              <DialogDescription className="text-xs">
                连接和管理您的社交媒体账号，配置 API 凭据以启用平台功能
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Badge variant="outline" className="text-[10px]">
              {connectedCount > 0 ? (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  已连接 {connectedCount} 个平台
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <WifiOff className="h-3 w-3" />
                  未连接平台
                </span>
              )}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              支持 2 个平台
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(85vh-140px)] px-6 pb-6">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="pt-4 space-y-4"
          >
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Desktop: Side by side */}
                <div className="hidden md:grid grid-cols-2 gap-4">
                  <PlatformSection
                    platform="wechat"
                    account={wechatAccount}
                    onConnect={handleConnect}
                    onDisconnect={() => wechatAccount && handleDisconnect(wechatAccount.id)}
                    onTest={() => wechatAccount ? handleTest(wechatAccount.id) : Promise.reject("No account")}
                    onSync={() => wechatAccount && handleSync(wechatAccount.id)}
                  />
                  <PlatformSection
                    platform="xiaohongshu"
                    account={xhsAccount}
                    onConnect={handleConnect}
                    onDisconnect={() => xhsAccount && handleDisconnect(xhsAccount.id)}
                    onTest={() => xhsAccount ? handleTest(xhsAccount.id) : Promise.reject("No account")}
                    onSync={() => xhsAccount && handleSync(xhsAccount.id)}
                  />
                </div>

                {/* Mobile: Stacked */}
                <div className="md:hidden space-y-4">
                  <PlatformSection
                    platform="wechat"
                    account={wechatAccount}
                    onConnect={handleConnect}
                    onDisconnect={() => wechatAccount && handleDisconnect(wechatAccount.id)}
                    onTest={() => wechatAccount ? handleTest(wechatAccount.id) : Promise.reject("No account")}
                    onSync={() => wechatAccount && handleSync(wechatAccount.id)}
                  />
                  <PlatformSection
                    platform="xiaohongshu"
                    account={xhsAccount}
                    onConnect={handleConnect}
                    onDisconnect={() => xhsAccount && handleDisconnect(xhsAccount.id)}
                    onTest={() => xhsAccount ? handleTest(xhsAccount.id) : Promise.reject("No account")}
                    onSync={() => xhsAccount && handleSync(xhsAccount.id)}
                  />
                </div>

                {/* Security Notice */}
                <Card className="border-dashed">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Shield className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium mb-1">安全提示</p>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          所有凭据均存储在本地数据库中，不会上传到第三方服务器。建议使用 API Key 方式连接，
                          避免使用 Cookie 方式（安全性较低）。Token 有效期为 30 天，过期后需要重新授权。
                          生产环境建议对敏感数据进行加密存储。
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </motion.div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
