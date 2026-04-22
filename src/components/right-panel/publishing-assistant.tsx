"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ContentPost, Platform, PlatformAccount } from "@/types";
import {
  PLATFORM_LABELS,
  PLATFORM_COLORS,
} from "@/types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Rocket,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  X,
  MessageCircle,
  BookOpen,
  Sparkles,
  Clock,
  Hash,
  Star,
  AlertTriangle,
  Send,
  History,
  Wifi,
  WifiOff,
  Zap,
  Eye,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface PublishingAssistantProps {
  post?: ContentPost | null;
  onPlatformConnect: () => void;
}

// Platform status info
interface PlatformStatus {
  platform: Platform;
  connected: boolean;
  account?: PlatformAccount | null;
}

// AI Strategy recommendation
interface AIStrategy {
  wechat: {
    lengthSuitability: string;
    hashtags: string[];
    bestTime: string;
    matchScore: number;
    tips: string;
  };
  xiaohongshu: {
    lengthSuitability: string;
    hashtags: string[];
    bestTime: string;
    matchScore: number;
    tips: string;
  };
}

const defaultStrategy: AIStrategy = {
  wechat: {
    lengthSuitability: "分析中...",
    hashtags: [],
    bestTime: "分析中...",
    matchScore: 0,
    tips: "正在生成AI建议...",
  },
  xiaohongshu: {
    lengthSuitability: "分析中...",
    hashtags: [],
    bestTime: "分析中...",
    matchScore: 0,
    tips: "正在生成AI建议...",
  },
};

// Platform config for visual styling
const PLATFORM_CONFIG = {
  wechat: {
    icon: MessageCircle,
    color: "from-green-500 to-emerald-600",
    bgLight: "bg-green-50 dark:bg-green-950/20",
    iconBg: "bg-green-100 dark:bg-green-900/30",
    iconColor: "text-green-600 dark:text-green-400",
    border: "border-green-200 dark:border-green-800",
    btnGradient: "from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700",
    publishLabel: "发布到朋友圈",
  },
  xiaohongshu: {
    icon: BookOpen,
    color: "from-red-500 to-rose-600",
    bgLight: "bg-red-50 dark:bg-red-950/20",
    iconBg: "bg-red-100 dark:bg-red-900/30",
    iconColor: "text-red-600 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
    btnGradient: "from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700",
    publishLabel: "发布到小红书",
  },
} as const;

function getScoreColor(score: number) {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getScoreBgColor(score: number) {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-red-500";
}

export function PublishingAssistant({ post, onPlatformConnect }: PublishingAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [platformStatuses, setPlatformStatuses] = useState<PlatformStatus[]>([]);
  const [loadingPlatforms, setLoadingPlatforms] = useState(true);
  const [strategy, setStrategy] = useState<AIStrategy>(defaultStrategy);
  const [loadingStrategy, setLoadingStrategy] = useState(false);
  const [strategyGenerated, setStrategyGenerated] = useState(false);
  const [publishing, setPublishing] = useState<Platform | null>(null);
  const [publishProgress, setPublishProgress] = useState(0);

  // Fetch platform connection status
  const fetchPlatformStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/platform-accounts");
      if (res.ok) {
        const accounts: PlatformAccount[] = await res.json();
        const statuses: PlatformStatus[] = (["wechat", "xiaohongshu"] as Platform[]).map((p) => ({
          platform: p,
          connected: accounts.some((a) => a.platform === p && a.status === "connected"),
          account: accounts.find((a) => a.platform === p && a.status === "connected") || null,
        }));
        setPlatformStatuses(statuses);
      }
    } catch (error) {
      console.error("Failed to fetch platform statuses:", error);
    } finally {
      setLoadingPlatforms(false);
    }
  }, []);

  useEffect(() => {
    fetchPlatformStatus();
  }, [fetchPlatformStatus]);

  // Generate AI publishing strategy
  const handleGenerateStrategy = async () => {
    if (!post) {
      toast.error("请先选择一条内容");
      return;
    }

    setLoadingStrategy(true);
    setStrategyGenerated(false);

    try {
      const prompt = `你是一位资深的社交媒体运营专家。请分析以下内容，分别给出朋友圈和小红书的发布建议。

内容主题：${post.topic}
内容类型：${post.contentType}
内容长度：${post.content.length}字
内容摘要：${post.content.slice(0, 200)}

请以JSON格式返回，包含以下字段（朋友圈和小红书各一组）：
{
  "wechat": {
    "lengthSuitability": "内容长度是否合适，如'偏短，建议补充至100-200字'",
    "hashtags": ["建议的标签1", "标签2", "标签3"],
    "bestTime": "最佳发布时间，如'工作日 12:00-13:00 或 20:00-22:00'",
    "matchScore": 85,
    "tips": "具体的发布优化建议"
  },
  "xiaohongshu": {
    "lengthSuitability": "...",
    "hashtags": ["...", "...", "..."],
    "bestTime": "...",
    "matchScore": 72,
    "tips": "..."
  }
}

注意：
1. matchScore是0-100的整数，表示内容与平台的匹配度
2. 朋友圈建议2-3个标签，小红书建议4-5个标签
3. 标签要具体、有热度，不要泛泛而谈
4. 直接返回JSON，不要有其他文字`;

      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "auto",
          platform: "wechat",
          existingContent: prompt,
          topic: post.topic,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const raw = data.content;

        // Try to parse JSON from AI response
        try {
          // Extract JSON from possible markdown code blocks
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]) as AIStrategy;
            // Validate structure
            if (parsed.wechat && parsed.xiaohongshu) {
              setStrategy(parsed);
              setStrategyGenerated(true);
              toast.success("AI发布策略已生成");
              return;
            }
          }
        } catch {
          // JSON parsing failed, use fallback
        }

        // Fallback: generate a basic strategy based on content analysis
        const wechatScore = Math.min(95, Math.max(50, 80 + (post.content.length > 80 ? 10 : -10) + (post.aiScore > 70 ? 5 : -5)));
        const xhsScore = Math.min(95, Math.max(40, 70 + (post.content.length > 200 ? 10 : -10) + (post.aiScore > 70 ? 5 : -5)));

        setStrategy({
          wechat: {
            lengthSuitability: post.content.length >= 80 && post.content.length <= 300
              ? `内容长度${post.content.length}字，非常合适`
              : post.content.length < 80
              ? `内容仅${post.content.length}字，建议补充细节至100-200字`
              : `内容${post.content.length}字偏长，建议精简核心观点`,
            hashtags: [post.topic.slice(0, 6), post.contentType === "insight" ? "观点分享" : "日常", "个人成长"],
            bestTime: "工作日 12:00-13:00 或 20:00-22:00",
            matchScore: wechatScore,
            tips: post.content.length > 200
              ? "朋友圈内容建议控制在200字以内，精简核心观点效果更好"
              : "内容长度适中，发布前可检查是否有错别字",
          },
          xiaohongshu: {
            lengthSuitability: post.content.length >= 200 && post.content.length <= 600
              ? `内容长度${post.content.length}字，适合小红书`
              : post.content.length < 200
              ? `内容仅${post.content.length}字，小红书建议300-500字并配有emoji`
              : `内容${post.content.length}字偏长，建议分段并增加emoji`,
            hashtags: [post.topic.slice(0, 6), "种草推荐", "干货分享", "生活记录", "个人成长"],
            bestTime: "工作日 18:00-20:00 或 21:00-23:00",
            matchScore: xhsScore,
            tips: "建议为小红书版本添加emoji、分段排版，并在结尾添加话题标签",
          },
        });
        setStrategyGenerated(true);
      } else {
        toast.error("AI策略生成失败");
      }
    } catch {
      toast.error("AI策略生成失败，请重试");
    } finally {
      setLoadingStrategy(false);
    }
  };

  // Auto-generate strategy when panel opens with a new post
  useEffect(() => {
    if (isOpen && post && !strategyGenerated) {
      handleGenerateStrategy();
    }
    // Reset strategy when post changes
    if (post?.id) {
      setStrategyGenerated(false);
      setStrategy(defaultStrategy);
    }
  }, [isOpen, post?.id]);

  // Handle publish to platform
  const handlePublish = async (platform: Platform) => {
    if (!post) {
      toast.error("请先选择一条内容");
      return;
    }

    const status = platformStatuses.find((s) => s.platform === platform);
    if (!status?.connected) {
      toast.error(
        `${PLATFORM_LABELS[platform]}账号未连接，请先连接账号`,
        {
          action: {
            label: "去连接",
            onClick: () => onPlatformConnect(),
          },
        }
      );
      return;
    }

    setPublishing(platform);
    setPublishProgress(0);

    // Simulate progress animation
    const progressInterval = setInterval(() => {
      setPublishProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 20 + 5;
      });
    }, 300);

    try {
      const res = await fetch("/api/platform-accounts/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
          platform,
        }),
      });

      clearInterval(progressInterval);
      setPublishProgress(100);

      if (res.ok) {
        // Small delay for the progress to reach 100% visually
        await new Promise((r) => setTimeout(r, 500));
        toast.success(
          `已成功发布到${PLATFORM_LABELS[platform]}`,
          {
            description: `"${post.topic.slice(0, 20)}${post.topic.length > 20 ? "..." : ""}" 发布成功`,
          }
        );
      } else {
        const data = await res.json();
        if (data.connected === false) {
          toast.error(`${PLATFORM_LABELS[platform]}账号未连接`, {
            action: {
              label: "去连接",
              onClick: () => onPlatformConnect(),
            },
          });
        } else {
          toast.error(data.error || "发布失败，请重试");
        }
      }
    } catch {
      clearInterval(progressInterval);
      toast.error("发布失败，请检查网络连接");
    } finally {
      setPublishing(null);
      setPublishProgress(0);
      // Refresh platform statuses after publish attempt
      fetchPlatformStatus();
    }
  };

  // Get recently published posts from app store (filter from contentPosts)
  const getPublishedPosts = useCallback((): ContentPost[] => {
    if (!post) return [];
    // This will be populated via the useAppStore in the parent component
    // For now, we show based on the current post
    return post.status === "published" ? [post] : [];
  }, [post]);

  const publishedPosts = getPublishedPosts();

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group/trig">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500/10 to-purple-500/10 flex items-center justify-center">
                <Rocket className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">AI发布助手</span>
                <span className="text-[10px] text-muted-foreground">
                  {platformStatuses.filter((s) => s.connected).length === 2
                    ? "双平台已就绪"
                    : platformStatuses.filter((s) => s.connected).length === 1
                    ? `${platformStatuses.find((s) => s.connected)?.platform === "wechat" ? "朋友圈" : "小红书"}已连接`
                    : "平台未连接"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {strategyGenerated && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200 dark:border-violet-800"
                >
                  <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                  策略就绪
                </Badge>
              )}
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CardContent>
        </Card>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="px-1 pb-3 space-y-3">
          {/* Section: Platform Connection Status */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
              <Wifi className="h-3 w-3" />
              平台连接状态
            </span>
            <div className="grid grid-cols-2 gap-2">
              {loadingPlatforms ? (
                <>
                  <Skeleton className="h-20 rounded-lg" />
                  <Skeleton className="h-20 rounded-lg" />
                </>
              ) : (
                (["wechat", "xiaohongshu"] as Platform[]).map((p) => {
                  const status = platformStatuses.find((s) => s.platform === p);
                  const config = PLATFORM_CONFIG[p];
                  const Icon = config.icon;
                  const isConnected = status?.connected ?? false;

                  return (
                    <motion.div
                      key={p}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: p === "xiaohongshu" ? 0.1 : 0 }}
                      className={`relative rounded-lg border p-3 overflow-hidden transition-all ${
                        isConnected
                          ? `${config.border} ${config.bgLight}`
                          : "border-dashed border-muted"
                      }`}
                    >
                      {/* Gradient accent bar for connected */}
                      {isConnected && (
                        <motion.div
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${config.color} origin-left`}
                        />
                      )}

                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                            isConnected ? config.iconBg : "bg-muted"
                          }`}
                        >
                          <Icon
                            className={`h-3.5 w-3.5 ${
                              isConnected ? config.iconColor : "text-muted-foreground"
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">
                            {PLATFORM_LABELS[p]}
                          </p>
                          <div className="flex items-center gap-1">
                            <span
                              className={`inline-block w-1.5 h-1.5 rounded-full ${
                                isConnected
                                  ? "bg-emerald-500 animate-pulse"
                                  : "bg-gray-400"
                              }`}
                            />
                            <span className="text-[10px] text-muted-foreground">
                              {isConnected
                                ? status?.account?.displayName || "已连接"
                                : "未连接"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {!isConnected && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-7 text-[10px] border-dashed"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlatformConnect();
                          }}
                        >
                          <WifiOff className="h-2.5 w-2.5 mr-1" />
                          去连接
                        </Button>
                      )}

                      {isConnected && (
                        <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                          <Check className="h-3 w-3" />
                          可以发布
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>

          {/* Section: AI Publishing Strategy */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                AI发布策略
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300"
                onClick={handleGenerateStrategy}
                disabled={loadingStrategy || !post}
              >
                {loadingStrategy ? (
                  <Loader2 className="h-2.5 w-2.5 mr-0.5 animate-spin" />
                ) : (
                  <Zap className="h-2.5 w-2.5 mr-0.5" />
                )}
                {strategyGenerated ? "重新分析" : "生成策略"}
              </Button>
            </div>

            {!post && (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <p className="text-xs">请先选择一条内容</p>
              </div>
            )}

            {post && loadingStrategy && (
              <div className="space-y-2">
                <Skeleton className="h-24 rounded-lg" />
                <Skeleton className="h-24 rounded-lg" />
              </div>
            )}

            {post && !loadingStrategy && strategyGenerated && (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  {(["wechat", "xiaohongshu"] as Platform[]).map((p) => {
                    const config = PLATFORM_CONFIG[p];
                    const Icon = config.icon;
                    const platformStrategy = strategy[p];

                    return (
                      <motion.div
                        key={p}
                        initial={{ opacity: 0, x: p === "xiaohongshu" ? 10 : -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: p === "xiaohongshu" ? 0.15 : 0 }}
                        className={`rounded-lg border p-3 ${config.border}`}
                      >
                        {/* Platform header with score */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <Icon className={`h-3.5 w-3.5 ${config.iconColor}`} />
                            <span className="text-xs font-medium">
                              {PLATFORM_LABELS[p]}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp
                              className={`h-3 w-3 ${getScoreColor(platformStrategy.matchScore)}`}
                            />
                            <span
                              className={`text-xs font-bold ${getScoreColor(
                                platformStrategy.matchScore
                              )}`}
                            >
                              {platformStrategy.matchScore}分
                            </span>
                          </div>
                        </div>

                        {/* Score progress bar */}
                        <div className="w-full h-1.5 rounded-full bg-muted mb-2.5 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${platformStrategy.matchScore}%`,
                            }}
                            transition={{ duration: 0.8, delay: p === "xiaohongshu" ? 0.3 : 0.15 }}
                            className={`h-full rounded-full ${getScoreBgColor(
                              platformStrategy.matchScore
                            )}`}
                          />
                        </div>

                        {/* Strategy details */}
                        <div className="space-y-1.5 text-[10px]">
                          <div className="flex items-start gap-1.5">
                            <Eye className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground">
                              长度评估：
                              <span className="text-foreground">
                                {platformStrategy.lengthSuitability}
                              </span>
                            </span>
                          </div>
                          <div className="flex items-start gap-1.5">
                            <Clock className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground">
                              最佳时间：
                              <span className="text-foreground">
                                {platformStrategy.bestTime}
                              </span>
                            </span>
                          </div>
                          {platformStrategy.hashtags.length > 0 && (
                            <div className="flex items-start gap-1.5">
                              <Hash className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <div className="flex flex-wrap gap-1">
                                {platformStrategy.hashtags.map((tag, i) => (
                                  <Badge
                                    key={i}
                                    variant="outline"
                                    className="text-[9px] px-1.5 py-0 h-4"
                                  >
                                    #{tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="flex items-start gap-1.5">
                            <Star className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground">
                              {platformStrategy.tips}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* Section: One-Click Publish */}
          {post && (
            <div className="space-y-1.5">
              <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                <Send className="h-3 w-3" />
                一键发布
              </span>

              <div className="flex gap-2">
                {(["wechat", "xiaohongshu"] as Platform[]).map((p) => {
                  const config = PLATFORM_CONFIG[p];
                  const status = platformStatuses.find((s) => s.platform === p);
                  const isConnected = status?.connected ?? false;
                  const isPublishing = publishing === p;

                  return (
                    <Button
                      key={p}
                      onClick={() => handlePublish(p)}
                      disabled={isPublishing || post.status === "published"}
                      size="sm"
                      className={`flex-1 h-9 text-xs bg-gradient-to-r ${
                        post.status === "published"
                          ? "from-gray-400 to-gray-500 cursor-not-allowed"
                          : config.btnGradient
                      } text-white`}
                    >
                      {post.status === "published" ? (
                        <>
                          <Check className="h-3 w-3 mr-1.5" />
                          已发布
                        </>
                      ) : isPublishing ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                          发布中...
                        </>
                      ) : (
                        <>
                          {isConnected ? (
                            <Send className="h-3 w-3 mr-1.5" />
                          ) : (
                            <AlertTriangle className="h-3 w-3 mr-1.5" />
                          )}
                          {config.publishLabel}
                        </>
                      )}
                    </Button>
                  );
                })}
              </div>

              {/* Publish progress animation */}
              <AnimatePresence>
                {publishing && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-1.5 p-2.5 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">
                          正在发布到{PLATFORM_LABELS[publishing]}...
                        </span>
                        <span className="font-medium tabular-nums">
                          {Math.round(publishProgress)}%
                        </span>
                      </div>
                      <Progress value={publishProgress} className="h-1.5" />
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        >
                          <Loader2 className="h-3 w-3" />
                        </motion.div>
                        <span>正在连接平台并提交内容...</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Warning for disconnected platforms */}
              {platformStatuses.some((s) => !s.connected) && post.status !== "published" && (
                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-[10px]">
                  <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                  <span>
                    {platformStatuses.filter((s) => !s.connected).length === 2
                      ? "两个平台均未连接，请先连接平台账号"
                      : `${PLATFORM_LABELS[platformStatuses.find((s) => !s.connected)!.platform]}未连接，点击按钮后可连接`}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Section: Publishing History Timeline */}
          {publishedPosts.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                <History className="h-3 w-3" />
                发布记录
              </span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                {publishedPosts.map((p, idx) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-start gap-2.5 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    {/* Timeline indicator */}
                    <div className="flex flex-col items-center mt-0.5">
                      <div
                        className={`h-5 w-5 rounded-full bg-gradient-to-br ${
                          PLATFORM_COLORS[p.platform as Platform] || "from-gray-400 to-gray-500"
                        } flex items-center justify-center`}
                      >
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                      {idx < publishedPosts.length - 1 && (
                        <div className="w-px flex-1 bg-border mt-1" />
                      )}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0 h-4"
                        >
                          {PLATFORM_LABELS[p.platform as Platform] || p.platform}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground truncate">
                          {formatDistanceToNow(new Date(p.updatedAt), {
                            addSuffix: true,
                            locale: zhCN,
                          })}
                        </span>
                      </div>
                      <p className="text-xs font-medium truncate">{p.topic}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
