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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  Smartphone,
  Megaphone,
  Copy,
  Check,
  Sparkles,
  AlertOctagon,
  Camera,
  Hash,
  Star,
  Heart,
  TrendingUp,
  ImagePlus,
  Clock3,
  Flame,
} from "lucide-react";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

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

// 连接状态徽章组件
function StatusBadge({ status, label }: { status: string; label?: string }) {
  const typedStatus = (status || "disconnected") as AccountStatus;
  return (
    <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 ${ACCOUNT_STATUS_COLORS[typedStatus]}`}>
      {status === "connected" && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />}
      {label || ACCOUNT_STATUS_LABELS[typedStatus]}
    </Badge>
  );
}

// AI辅助模式状态徽章（个人朋友圈模式专用）
function AiAssistBadge() {
  return (
    <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
      <Sparkles className="inline-block h-2.5 w-2.5 mr-1" />
      AI辅助模式
    </Badge>
  );
}

// 平台配置常量
const platformConfig = {
  wechat: {
    name: "微信",
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

// ConnectFormData 接口
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

// 微信个人朋友圈引导卡片组件
function WechatPersonalGuide() {
  // 最近AI文案相关状态
  const [recentPosts, setRecentPosts] = useState<Array<{ id: string; topic: string; content: string; scheduledDate: string }>>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [showRecentPosts, setShowRecentPosts] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { copy } = useCopyToClipboard();

  // 获取最近的已优化帖子
  const fetchRecentPosts = useCallback(async () => {
    setLoadingPosts(true);
    setShowRecentPosts(true);
    try {
      const res = await fetch("/api/content");
      if (res.ok) {
        const data = await res.json();
        // 筛选已优化的帖子，按更新时间倒序，取前5条
        const optimized = data
          .filter((p: { status: string; content: string }) => p.status === "optimized" || p.status === "generated")
          .sort((a: { updatedAt: string }, b: { updatedAt: string }) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 5);
        setRecentPosts(optimized);
      }
    } catch (error) {
      console.error("获取最近文案失败:", error);
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  // 复制文案到剪贴板
  const copyContent = async (id: string, content: string) => {
    copy(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // 复制步骤内容
  const copyAllPosts = async () => {
    const allContent = recentPosts
      .map((p, i) => `【${i + 1}】${p.topic}\n${p.content}`)
      .join("\n\n---\n\n");
    copy(allContent);
  };

  return (
    <div className="space-y-4">
      {/* 友好引导卡片 */}
      <div className="rounded-xl border border-green-200 dark:border-green-800/40 overflow-hidden">
        {/* 引导卡片头部 */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Smartphone className="h-4 w-4 text-white" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm">微信个人朋友圈使用指南</h4>
              <p className="text-white/70 text-[10px]">AI辅助模式 · 无需API连接</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* 说明文字 */}
          <div className={`rounded-lg p-3 bg-green-50 dark:bg-green-950/20`}>
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                微信个人朋友圈<strong className="text-foreground">没有官方公开API</strong>，所有第三方方案均为逆向工程，存在封号风险。
                推荐使用安全的<strong className="text-foreground">「AI生成 → 一键复制 → 手动发布」</strong>工作流。
              </p>
            </div>
          </div>

          {/* 三步操作引导 */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              操作流程
            </p>
            <div className="space-y-2.5">
              {[
                {
                  step: 1,
                  title: "AI生成文案",
                  desc: "在右侧面板中，使用AI生成或优化您的朋友圈文案",
                  gradient: "from-emerald-500 to-teal-500",
                },
                {
                  step: 2,
                  title: "一键复制内容",
                  desc: "点击文案下方的「复制」按钮，将内容复制到剪贴板",
                  gradient: "from-green-500 to-emerald-500",
                },
                {
                  step: 3,
                  title: "手动发布到朋友圈",
                  desc: "打开微信 → 发现 → 朋友圈 → 长按相机图标 → 粘贴发布",
                  gradient: "from-teal-500 to-cyan-500",
                },
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1, duration: 0.3 }}
                  className="flex gap-3"
                >
                  <div className={`flex-shrink-0 h-7 w-7 rounded-full bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white text-[11px] font-bold shadow-sm`}>
                    {item.step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">{item.title}</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <Separator />

          {/* 快速复制最近的AI文案 */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Copy className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              快速复制AI文案
            </p>

            <Button
              variant="outline"
              size="sm"
              className="w-full h-9 text-xs border-green-200 dark:border-green-800/40 hover:bg-green-50 dark:hover:bg-green-950/20 transition-colors"
              onClick={fetchRecentPosts}
              disabled={loadingPosts}
            >
              {loadingPosts ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                  正在获取最近文案...
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3 mr-1.5 text-green-600 dark:text-green-400" />
                  加载最近的AI生成文案
                </>
              )}
            </Button>

            {/* 最近文案列表 */}
            <AnimatePresence>
              {showRecentPosts && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  {recentPosts.length > 0 ? (
                    <ScrollArea className="max-h-60">
                      <div className="space-y-2 pt-1">
                        {recentPosts.map((post, idx) => (
                          <motion.div
                            key={post.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.06 }}
                            className="rounded-lg border border-border/20 p-3 bg-background hover:bg-accent/30 transition-colors group"
                          >
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <p className="text-xs font-medium text-foreground truncate flex-1">{post.topic}</p>
                              <Badge variant="outline" className="text-[9px] flex-shrink-0">
                                {post.scheduledDate ? new Date(post.scheduledDate).toLocaleDateString("zh-CN", { month: "short", day: "numeric" }) : ""}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3 mb-2">
                              {post.content}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] text-muted-foreground">
                                {post.content.length} 字
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[10px] px-2 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-950/30"
                                onClick={() => copyContent(post.id, post.content)}
                              >
                                {copiedId === post.id ? (
                                  <>
                                    <Check className="h-3 w-3 mr-0.5" />
                                    已复制
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3 mr-0.5" />
                                    复制
                                  </>
                                )}
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    !loadingPosts && (
                      <div className="rounded-lg border border-dashed p-4 text-center">
                        <FileText className="h-6 w-6 text-muted-foreground/40 mx-auto mb-1.5" />
                        <p className="text-[11px] text-muted-foreground">暂无已生成的文案</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">请先在右侧面板使用AI生成内容</p>
                      </div>
                    )
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Separator />

          {/* 进阶方案折叠区域 */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors py-1 group">
                <span className="flex items-center gap-1.5">
                  <Zap className="h-3 w-3 text-amber-500" />
                  <span className="font-medium">进阶方案：自动发布（有风险）</span>
                </span>
                <motion.div
                  animate={{ rotate: showAdvanced ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </motion.div>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="pt-3 space-y-3"
              >
                {/* 风险警告 */}
                <Alert variant="destructive" className="py-2 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/40">
                  <AlertOctagon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <AlertDescription className="text-xs text-amber-800 dark:text-amber-200">
                    ⚠️ 以下方案存在<strong>违反微信服务协议</strong>的风险，可能导致账号被封禁。请谨慎评估后使用。
                  </AlertDescription>
                </Alert>

                {/* 第三方工具列表 */}
                <div className="space-y-2.5">
                  <div className="rounded-lg border border-border/20 p-3 bg-background">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-semibold text-foreground">WTAPI</span>
                      <Badge variant="outline" className="text-[9px] text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40">
                        付费工具
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      基于微信Windows协议的自动化工具，支持朋友圈自动发布、点赞、评论等功能。需要在本地或服务器上安装运行。
                    </p>
                  </div>

                  <div className="rounded-lg border border-border/20 p-3 bg-background">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-semibold text-foreground">WeChatFerry</span>
                      <Badge variant="outline" className="text-[9px] text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40">
                        开源免费
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      基于Hook技术的微信PC端自动化框架，支持朋友圈内容读取和发布。需要一定的技术能力进行部署和配置。
                    </p>
                  </div>
                </div>

                {/* 使用说明 */}
                <div className="rounded-lg p-3 bg-muted/50">
                  <p className="text-[11px] font-medium text-foreground mb-1.5">如何对接本系统？</p>
                  <ol className="text-[10px] text-muted-foreground leading-relaxed space-y-1 list-decimal list-inside">
                    <li>在本地安装上述工具的运行环境</li>
                    <li>启动工具的HTTP API服务</li>
                    <li>在本系统「微信公众号」模式中配置API端点</li>
                    <li>即可通过系统调用工具实现自动发布</li>
                  </ol>
                </div>
              </motion.div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </div>
  );
}

// 小红书个人号引导卡片组件
function XiaohongshuPersonalGuide() {
  // 最近AI文案相关状态
  const [recentPosts, setRecentPosts] = useState<Array<{ id: string; topic: string; content: string; scheduledDate: string }>>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [showRecentPosts, setShowRecentPosts] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { copy: copyXhs } = useCopyToClipboard();

  // 获取最近的已优化帖子
  const fetchRecentPosts = useCallback(async () => {
    setLoadingPosts(true);
    setShowRecentPosts(true);
    try {
      const res = await fetch("/api/content");
      if (res.ok) {
        const data = await res.json();
        // 筛选小红书已优化的帖子
        const optimized = data
          .filter((p: any) => p.platform === "xiaohongshu" && (p.status === "optimized" || p.status === "generated"))
          .sort((a: { updatedAt: string }, b: { updatedAt: string }) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 5);
        setRecentPosts(optimized);
      }
    } catch (error) {
      console.error("获取最近文案失败:", error);
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  // 复制文案到剪贴板
  const copyContent = async (id: string, content: string) => {
    copyXhs(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="space-y-4">
      {/* 友好引导卡片 */}
      <div className="rounded-xl border border-red-200 dark:border-red-800/40 overflow-hidden">
        {/* 引导卡片头部 */}
        <div className="bg-gradient-to-r from-red-500 to-rose-600 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm">小红书个人号使用指南</h4>
              <p className="text-white/70 text-[10px]">AI辅助模式 · 无需API连接</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* 说明文字 */}
          <div className="rounded-lg p-3 bg-red-50 dark:bg-red-950/20">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                小红书个人号<strong className="text-foreground">无法直接使用官方API</strong>（open.xiaohongshu.com 仅面向企业/品牌开放）。
                推荐使用安全的<strong className="text-foreground">「AI生成 → 一键复制 → 手动发布」</strong>工作流。
              </p>
            </div>
          </div>

          {/* 四步操作引导 */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
              操作流程
            </p>
            <div className="space-y-2.5">
              {[
                {
                  step: 1,
                  title: "AI生成笔记内容",
                  desc: "在内容日历中选择日期，使用AI生成小红书风格的笔记（含标题+正文+话题标签）",
                  gradient: "from-rose-500 to-red-500",
                },
                {
                  step: 2,
                  title: "一键复制内容",
                  desc: "点击文案卡片上的「复制」按钮，将标题和正文复制到剪贴板",
                  gradient: "from-red-500 to-orange-500",
                },
                {
                  step: 3,
                  title: "AI生成封面图",
                  desc: "使用封面图生成器，为笔记生成精美封面图并保存到手机",
                  gradient: "from-orange-500 to-amber-500",
                },
                {
                  step: 4,
                  title: "手动发布到小红书",
                  desc: "打开小红书APP → 点击底部「+」号 → 选择图文 → 粘贴标题和正文 → 添加封面 → 发布",
                  gradient: "from-amber-500 to-yellow-500",
                },
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1, duration: 0.3 }}
                  className="flex gap-3"
                >
                  <div className={`flex-shrink-0 h-7 w-7 rounded-full bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white text-[11px] font-bold shadow-sm`}>
                    {item.step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">{item.title}</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <Separator />

          {/* 快速复制最近的小红书笔记文案 */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Copy className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
              快速复制小红书文案
            </p>

            <Button
              variant="outline"
              size="sm"
              className="w-full h-9 text-xs border-red-200 dark:border-red-800/40 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
              onClick={fetchRecentPosts}
              disabled={loadingPosts}
            >
              {loadingPosts ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                  正在获取最近笔记...
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3 mr-1.5 text-red-600 dark:text-red-400" />
                  加载最近的小红书笔记文案
                </>
              )}
            </Button>

            {/* 最近文案列表 */}
            <AnimatePresence>
              {showRecentPosts && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  {recentPosts.length > 0 ? (
                    <ScrollArea className="max-h-60">
                      <div className="space-y-2 pt-1">
                        {recentPosts.map((post, idx) => (
                          <motion.div
                            key={post.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.06 }}
                            className="rounded-lg border border-border/20 p-3 bg-background hover:bg-accent/30 transition-colors group"
                          >
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <p className="text-xs font-medium text-foreground truncate flex-1">{post.topic}</p>
                              <Badge variant="outline" className="text-[9px] flex-shrink-0">
                                {post.scheduledDate ? new Date(post.scheduledDate).toLocaleDateString("zh-CN", { month: "short", day: "numeric" }) : ""}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3 mb-2">
                              {post.content}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] text-muted-foreground">
                                {post.content.length} 字
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[10px] px-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
                                onClick={() => copyContent(post.id, post.content)}
                              >
                                {copiedId === post.id ? (
                                  <>
                                    <Check className="h-3 w-3 mr-0.5" />
                                    已复制
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3 mr-0.5" />
                                    复制
                                  </>
                                )}
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    !loadingPosts && (
                      <div className="rounded-lg border border-dashed p-4 text-center">
                        <FileText className="h-6 w-6 text-muted-foreground/40 mx-auto mb-1.5" />
                        <p className="text-[11px] text-muted-foreground">暂无小红书笔记文案</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">请先切换到小红书平台模式，使用AI生成内容</p>
                      </div>
                    )
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Separator />

          {/* 小红书爆款笔记技巧 */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
              小红书爆款笔记技巧
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border/20 p-3 bg-background">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Camera className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-[11px] font-semibold text-foreground">封面是灵魂</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">小红书80%的流量来自封面，使用AI封面图生成器制作吸睛封面</p>
              </div>
              <div className="rounded-lg border border-border/20 p-3 bg-background">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Hash className="h-3.5 w-3.5 text-orange-500" />
                  <span className="text-[11px] font-semibold text-foreground">标签要精准</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">添加3-5个话题标签，混合热门标签(#好物推荐)和精准标签(#XX测评)</p>
              </div>
              <div className="rounded-lg border border-border/20 p-3 bg-background">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Star className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-[11px] font-semibold text-foreground">标题决定点击</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">15-25字标题最佳，善用数字、悬念和情绪词吸引点击</p>
              </div>
              <div className="rounded-lg border border-border/20 p-3 bg-background">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Heart className="h-3.5 w-3.5 text-rose-500" />
                  <span className="text-[11px] font-semibold text-foreground">种草语气</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">第一人称分享体验感，用「真的」「绝了」「按头安利」增加真实感</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* 进阶方案折叠区域 */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors py-1 group">
                <span className="flex items-center gap-1.5">
                  <Zap className="h-3 w-3 text-amber-500" />
                  <span className="font-medium">进阶方案：API对接（需要开发者权限）</span>
                </span>
                <motion.div
                  animate={{ rotate: showAdvanced ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </motion.div>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="pt-3 space-y-3"
              >
                {/* 风险警告 */}
                <Alert variant="destructive" className="py-2 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/40">
                  <AlertOctagon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <AlertDescription className="text-xs text-amber-800 dark:text-amber-200">
                    ⚠️ 使用非官方API存在<strong>违反小红书服务协议</strong>的风险，可能导致账号被封禁或限流。请谨慎评估后使用。
                  </AlertDescription>
                </Alert>

                {/* 工具列表 */}
                <div className="space-y-2.5">
                  <div className="rounded-lg border border-border/20 p-3 bg-background">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-semibold text-foreground">小红书开放平台</span>
                      <Badge variant="outline" className="text-[9px] text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40">
                        官方
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      访问 open.xiaohongshu.com 申请开发者权限，获取官方API。需要企业资质或创作者认证。
                    </p>
                  </div>

                  <div className="rounded-lg border border-border/20 p-3 bg-background">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-semibold text-foreground">Mediago / 新榜</span>
                      <Badge variant="outline" className="text-[9px] text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40">
                        第三方
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      第三方数据分析工具，提供笔记数据监控、竞品分析、KOL合作等功能。
                    </p>
                  </div>

                  <div className="rounded-lg border border-border/20 p-3 bg-background">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-semibold text-foreground">浏览器Cookie方式</span>
                      <Badge variant="outline" className="text-[9px] text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800/40">
                        技术方案
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      从浏览器F12开发者工具中复制Cookie，可以读取公开数据。Cookie会过期，需要定期更新。
                    </p>
                  </div>
                </div>

                {/* 使用说明 */}
                <div className="rounded-lg p-3 bg-muted/50">
                  <p className="text-[11px] font-medium text-foreground mb-1.5">如何对接本系统？</p>
                  <ol className="text-[10px] text-muted-foreground leading-relaxed space-y-1 list-decimal list-inside">
                    <li>在浏览器中登录小红书网页版 (xiaohongshu.com)</li>
                    <li>按F12打开开发者工具 → Application → Cookies</li>
                    <li>复制 a1 和 web_session 的值</li>
                    <li>在上方「Cookie」标签页中粘贴并连接</li>
                  </ol>
                </div>
              </motion.div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </div>
  );
}

// 平台区域组件
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

  // 微信账号类型状态：personal(个人朋友圈) | official(微信公众号)
  const [wechatMode, setWechatMode] = useState<"personal" | "official">("personal");

  // 小红书账号类型状态：personal(个人号) | creator(创作者/企业)
  const [xhsMode, setXhsMode] = useState<"personal" | "creator">("personal");

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

  // tokenType 变更时重置表单
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

  // 微信模式切换时的引导内容
  const guideContent = isWechat
    ? wechatMode === "personal"
      ? {
          title: "微信个人朋友圈使用指南",
          steps: [
            { step: 1, title: "AI生成文案内容", desc: "在右侧面板使用AI生成或优化朋友圈文案" },
            { step: 2, title: "复制生成内容", desc: "点击文案卡片上的「复制」按钮" },
            { step: 3, title: "粘贴到朋友圈发布", desc: "打开微信 → 发现 → 朋友圈 → 长按相机图标 → 粘贴发布" },
          ],
        }
      : {
          title: "微信公众号API接入指南",
          steps: [
            { step: 1, title: "注册微信公众平台", desc: "访问 mp.weixin.qq.com，注册并登录公众号管理后台" },
            { step: 2, title: "获取开发者凭据", desc: "在「开发 → 基本配置」中获取 AppID 和 AppSecret" },
            { step: 3, title: "配置IP白名单", desc: "将服务器IP添加到白名单列表中" },
            { step: 4, title: "获取Access Token", desc: "使用AppID和AppSecret调用接口获取access_token" },
            { step: 5, title: "调用公众号API", desc: "使用access_token调用图文素材、模板消息等API" },
          ],
        }
    : {
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
      {/* 平台头部 */}
      <div className={`bg-gradient-to-r ${config.color} px-5 py-4 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <PlatformIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">{isWechat ? "微信" : config.name}</h3>
            <p className="text-white/70 text-[10px] mt-0.5">
              {isWechat && wechatMode === "personal"
                ? "个人朋友圈 · AI辅助发布"
                : !isWechat && xhsMode === "personal"
                ? "个人号 · AI辅助发布"
                : isConnected
                ? "已连接 · 可以发布内容和管理数据"
                : isWechat
                ? "公众号 · 配置API以启用平台功能"
                : "创作者 · 配置API以启用平台功能"}
            </p>
          </div>
        </div>
        {/* 状态指示 */}
        {(isWechat && wechatMode === "personal") || (!isWechat && xhsMode === "personal") ? (
          <AiAssistBadge />
        ) : account ? (
          <StatusBadge status={account.status} />
        ) : null}
      </div>

      <div className="p-5">
        {/* 微信模式切换 */}
        {isWechat && (
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setWechatMode("personal")}
              className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-medium transition-all ${
                wechatMode === "personal"
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              个人朋友圈
            </button>
            <button
              onClick={() => setWechatMode("official")}
              className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-medium transition-all ${
                wechatMode === "official"
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Megaphone className="h-3.5 w-3.5" />
              微信公众号
            </button>
          </div>
        )}

        {/* 小红书模式切换 */}
        {!isWechat && (
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setXhsMode("personal")}
              className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-medium transition-all ${
                xhsMode === "personal"
                  ? "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              个人号
            </button>
            <button
              onClick={() => setXhsMode("creator")}
              className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-medium transition-all ${
                xhsMode === "creator"
                  ? "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Megaphone className="h-3.5 w-3.5" />
              创作者/企业
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* 个人模式 — 始终显示引导卡片 */}
          {(isWechat && wechatMode === "personal") || (!isWechat && xhsMode === "personal") ? (
            <motion.div
              key={isWechat ? "wechat-personal" : "xhs-personal"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {isWechat ? <WechatPersonalGuide /> : <XiaohongshuPersonalGuide />}
            </motion.div>
          ) : isConnected ? (
            /* === 已连接账号信息 === */
            <motion.div
              key="connected"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* 账号卡片 */}
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

                {/* 统计数据行 */}
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
                    <p className="text-[10px] text-muted-foreground mt-0.5">{isWechat ? "文章" : "笔记"}</p>
                  </div>
                </div>

                {/* 连接详情 */}
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

              {/* 测试结果 */}
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

              {/* 操作按钮 */}
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
            /* === 连接表单（仅微信公众号或小红书） === */
            <motion.div
              key="disconnected"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* 错误提示 */}
              {(hasError || isExpired) && account?.lastError && (
                <Alert variant="destructive" className="py-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">{account.lastError}</AlertDescription>
                </Alert>
              )}

              {/* 描述文字 */}
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isWechat
                  ? "配置微信公众号API凭据，可自动发布图文素材、同步粉丝数据、管理模板消息。支持API Key和OAuth授权方式。"
                  : "连接小红书账号可自动发布笔记、同步粉丝数据、获取热门话题趋势。支持创作者 API 和 Cookie 登录方式。"}
              </p>

              {/* 连接方式标签页 */}
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

                {/* API Key 标签页 */}
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
                      {isWechat ? "微信公众号 API 基础地址（默认：api.weixin.qq.com）" : "小红书开放平台 API 地址"}
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

                {/* OAuth 标签页 */}
                <TabsContent value="oauth" className="mt-3 space-y-3">
                  <div className={`rounded-lg p-4 ${config.bgLight}`}>
                    <div className="flex items-start gap-3">
                      <Info className={`h-4 w-4 mt-0.5 ${config.iconColor}`} />
                      <div className="text-xs leading-relaxed">
                        <p className="font-medium mb-1">OAuth 授权流程说明</p>
                        {isWechat ? (
                          <>
                            <p className="text-muted-foreground mb-2">1. 前往微信公众平台（mp.weixin.qq.com）获取AppID</p>
                            <p className="text-muted-foreground mb-2">2. 配置网页授权域名和回调地址</p>
                            <p className="text-muted-foreground mb-2">3. 使用OAuth2.0授权码模式引导用户扫码授权</p>
                            <p className="text-muted-foreground">4. 获取access_token和refresh_token后填入系统</p>
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

                {/* Cookie 标签页 */}
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
                        ? "打开微信公众号后台 → F12 开发者工具 → Network → 复制请求头中的 Cookie"
                        : "打开小红书网页版 → F12 → Application → Cookies → 复制 a1 和 web_session"}
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              {/* 连接按钮 */}
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
                    连接{isWechat ? "微信公众号" : config.name}
                  </>
                )}
              </Button>

              {/* 测试结果 */}
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

        {/* 微信账号类型切换器 — 始终显示在底部区域上方 */}
        {isWechat && (
          <>
            <Separator className="my-4" />

            {/* 账号类型切换选择器 */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-foreground">账号类型</p>
              <div className="grid grid-cols-2 gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setWechatMode("personal")}
                  className={`relative rounded-lg border-2 p-3 text-left transition-all duration-200 ${
                    wechatMode === "personal"
                      ? "border-green-500 bg-green-50 dark:bg-green-950/20 shadow-sm"
                      : "border-border/20 hover:border-green-300 dark:hover:border-green-700 bg-background"
                  }`}
                >
                  {/* 选中指示 */}
                  {wechatMode === "personal" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-1.5 right-1.5"
                    >
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </motion.div>
                  )}
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`h-7 w-7 rounded-lg ${wechatMode === "personal" ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"} flex items-center justify-center`}>
                      <Smartphone className={`h-3.5 w-3.5 ${wechatMode === "personal" ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`} />
                    </div>
                    <span className={`text-xs font-semibold ${wechatMode === "personal" ? "text-green-700 dark:text-green-300" : "text-foreground"}`}>
                      📱 个人朋友圈
                    </span>
                  </div>
                  <p className={`text-[10px] leading-relaxed ${wechatMode === "personal" ? "text-green-600/80 dark:text-green-400/80" : "text-muted-foreground"}`}>
                    复制粘贴工作流，无需API，安全无风险
                  </p>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setWechatMode("official")}
                  className={`relative rounded-lg border-2 p-3 text-left transition-all duration-200 ${
                    wechatMode === "official"
                      ? "border-green-500 bg-green-50 dark:bg-green-950/20 shadow-sm"
                      : "border-border/20 hover:border-green-300 dark:hover:border-green-700 bg-background"
                  }`}
                >
                  {/* 选中指示 */}
                  {wechatMode === "official" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-1.5 right-1.5"
                    >
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </motion.div>
                  )}
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`h-7 w-7 rounded-lg ${wechatMode === "official" ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"} flex items-center justify-center`}>
                      <Megaphone className={`h-3.5 w-3.5 ${wechatMode === "official" ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`} />
                    </div>
                    <span className={`text-xs font-semibold ${wechatMode === "official" ? "text-green-700 dark:text-green-300" : "text-foreground"}`}>
                      📢 微信公众号
                    </span>
                  </div>
                  <p className={`text-[10px] leading-relaxed ${wechatMode === "official" ? "text-green-600/80 dark:text-green-400/80" : "text-muted-foreground"}`}>
                    官方API接入，AppID/AppSecret认证
                  </p>
                </motion.button>
              </div>
            </div>
          </>
        )}

        {/* 小红书账号类型切换器 */}
        {!isWechat && (
          <>
            <Separator className="my-4" />

            {/* 账号类型切换选择器 */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-foreground">账号类型</p>
              <div className="grid grid-cols-2 gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setXhsMode("personal")}
                  className={`relative rounded-lg border-2 p-3 text-left transition-all duration-200 ${
                    xhsMode === "personal"
                      ? "border-red-500 bg-red-50 dark:bg-red-950/20 shadow-sm"
                      : "border-border/20 hover:border-red-300 dark:hover:border-red-700 bg-background"
                  }`}
                >
                  {/* 选中指示 */}
                  {xhsMode === "personal" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-1.5 right-1.5"
                    >
                      <CheckCircle2 className="h-4 w-4 text-red-500" />
                    </motion.div>
                  )}
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`h-7 w-7 rounded-lg ${xhsMode === "personal" ? "bg-red-100 dark:bg-red-900/30" : "bg-muted"} flex items-center justify-center`}>
                      <Smartphone className={`h-3.5 w-3.5 ${xhsMode === "personal" ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`} />
                    </div>
                    <span className={`text-xs font-semibold ${xhsMode === "personal" ? "text-red-700 dark:text-red-300" : "text-foreground"}`}>
                      📕 个人号
                    </span>
                  </div>
                  <p className={`text-[10px] leading-relaxed ${xhsMode === "personal" ? "text-red-600/80 dark:text-red-400/80" : "text-muted-foreground"}`}>
                    AI辅助模式，复制粘贴工作流，安全无风险
                  </p>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setXhsMode("creator")}
                  className={`relative rounded-lg border-2 p-3 text-left transition-all duration-200 ${
                    xhsMode === "creator"
                      ? "border-red-500 bg-red-50 dark:bg-red-950/20 shadow-sm"
                      : "border-border/20 hover:border-red-300 dark:hover:border-red-700 bg-background"
                  }`}
                >
                  {/* 选中指示 */}
                  {xhsMode === "creator" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-1.5 right-1.5"
                    >
                      <CheckCircle2 className="h-4 w-4 text-red-500" />
                    </motion.div>
                  )}
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`h-7 w-7 rounded-lg ${xhsMode === "creator" ? "bg-red-100 dark:bg-red-900/30" : "bg-muted"} flex items-center justify-center`}>
                      <Megaphone className={`h-3.5 w-3.5 ${xhsMode === "creator" ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`} />
                    </div>
                    <span className={`text-xs font-semibold ${xhsMode === "creator" ? "text-red-700 dark:text-red-300" : "text-foreground"}`}>
                      🔴 创作者/企业
                    </span>
                  </div>
                  <p className={`text-[10px] leading-relaxed ${xhsMode === "creator" ? "text-red-600/80 dark:text-red-400/80" : "text-muted-foreground"}`}>
                    API对接，自动发布笔记和数据管理
                  </p>
                </motion.button>
              </div>
            </div>
          </>
        )}

        <Separator className="my-4" />

        {/* 接入指南折叠区 */}
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
                {/* 桌面端：并排布局 */}
                <div className="hidden md:grid grid-cols-2 gap-4">
                  <PlatformSection
                    platform="wechat"
                    account={wechatAccount}
                    onConnect={handleConnect}
                    onDisconnect={() => wechatAccount ? handleDisconnect(wechatAccount.id) : Promise.resolve()}
                    onTest={() => wechatAccount ? handleTest(wechatAccount.id) : Promise.reject("No account")}
                    onSync={() => wechatAccount ? handleSync(wechatAccount.id) : Promise.resolve()}
                  />
                  <PlatformSection
                    platform="xiaohongshu"
                    account={xhsAccount}
                    onConnect={handleConnect}
                    onDisconnect={() => xhsAccount ? handleDisconnect(xhsAccount.id) : Promise.resolve()}
                    onTest={() => xhsAccount ? handleTest(xhsAccount.id) : Promise.reject("No account")}
                    onSync={() => xhsAccount ? handleSync(xhsAccount.id) : Promise.resolve()}
                  />
                </div>

                {/* 移动端：堆叠布局 */}
                <div className="md:hidden space-y-4">
                  <PlatformSection
                    platform="wechat"
                    account={wechatAccount}
                    onConnect={handleConnect}
                    onDisconnect={() => wechatAccount ? handleDisconnect(wechatAccount.id) : Promise.resolve()}
                    onTest={() => wechatAccount ? handleTest(wechatAccount.id) : Promise.reject("No account")}
                    onSync={() => wechatAccount ? handleSync(wechatAccount.id) : Promise.resolve()}
                  />
                  <PlatformSection
                    platform="xiaohongshu"
                    account={xhsAccount}
                    onConnect={handleConnect}
                    onDisconnect={() => xhsAccount ? handleDisconnect(xhsAccount.id) : Promise.resolve()}
                    onTest={() => xhsAccount ? handleTest(xhsAccount.id) : Promise.reject("No account")}
                    onSync={() => xhsAccount ? handleSync(xhsAccount.id) : Promise.resolve()}
                  />
                </div>

                {/* 安全提示 */}
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
