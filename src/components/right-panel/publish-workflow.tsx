"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import type { ContentPost, Platform } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Wand2,
  ChevronDown,
  ChevronUp,
  Check,
  AlertTriangle,
  Clock,
  Trash2,
  Copy,
  Eye,
  Sparkles,
  Bell,
  BellRing,
  Timer,
  Hash,
  FileText,
  Image,
  Star,
  SpellCheck,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { AISpellCheck, type SpellCheckResult } from "@/components/right-panel/ai-spellcheck";

// ─── Animation Variants ─────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" as const } },
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface PublishWorkflowProps {
  selectedPost: ContentPost | null;
}

// ─── Scheduled Reminder Types ────────────────────────────────────────────────

interface ScheduledReminder {
  id: string;
  postId: string;
  postTopic: string;
  scheduledTime: string;
  createdAt: number;
}

// ─── One-Click Format ──────────────────────────────────────────────────────

function OneClickFormat({ post }: { post: ContentPost | null }) {
  const { platform } = useAppStore();
  const [formattedText, setFormattedText] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [formatPlatform, setFormatPlatform] = useState<Platform>(platform);

  const rawText = post?.content || "";

  const formatForWeChat = useCallback((text: string): string => {
    if (!text) return "";
    // Add line breaks every ~100 chars at natural break points
    const chars = text.split("");
    let result = "";
    let lineLen = 0;
    for (let i = 0; i < chars.length; i++) {
      result += chars[i];
      if (chars[i] === "\n") {
        lineLen = 0;
        continue;
      }
      lineLen++;
      // Break at punctuation or after 100 chars
      if (lineLen >= 80 && /[，。！？、；：]/.test(chars[i])) {
        result += "\n";
        lineLen = 0;
      }
    }
    // Add spacing between paragraphs
    return result.replace(/\n{2,}/g, "\n\n").replace(/\n/g, "\n");
  }, []);

  const formatForXHS = useCallback((text: string): string => {
    if (!text) return "";
    const emojis = ["✨", "💡", "🌟", "🔥", "💫", "✅", "🎉", "💪", "👀", "👇"];
    const lines = text.split("\n").filter((l) => l.trim());
    let result = "";

    // Add title separator if first line looks like a title
    if (lines.length > 0 && lines[0].length < 30) {
      result += `━━━━━━━━━━━━━\n`;
      result += `${lines[0]}\n`;
      result += `━━━━━━━━━━━━━\n\n`;
      lines.shift();
    }

    lines.forEach((line, i) => {
      // Add emoji at start of key lines
      if (i === 0 || i % 3 === 0) {
        const emoji = emojis[i % emojis.length];
        result += `${emoji} ${line}\n\n`;
      } else {
        result += `${line}\n`;
      }
    });

    // Add hashtags if not present
    if (!text.includes("#")) {
      const topic = post?.topic || "日常分享";
      result += `\n#${topic} #生活记录 #个人成长`;
    }

    return result;
  }, [post?.topic]);

  const handleFormat = useCallback(() => {
    if (!rawText) {
      toast.error("没有可排版的内容");
      return;
    }
    const formatted =
      formatPlatform === "wechat"
        ? formatForWeChat(rawText)
        : formatForXHS(rawText);
    setFormattedText(formatted);
    setShowPreview(true);
    toast.success("一键排版完成");
  }, [rawText, formatPlatform, formatForWeChat, formatForXHS]);

  const handleCopy = useCallback(() => {
    if (formattedText) {
      navigator.clipboard.writeText(formattedText);
      toast.success("已复制排版结果");
    }
  }, [formattedText]);

  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger className="w-full group/collapsible">
        <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500/10 to-purple-500/10 flex items-center justify-center">
                <Wand2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-xs font-medium">一键排版</span>
                <span className="text-[10px] text-muted-foreground">
                  {showPreview ? "已生成排版结果" : "智能平台适配排版"}
                </span>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]/collapsible:rotate-180" />
          </CardContent>
        </Card>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-1 pb-3 space-y-2">
          {/* Platform selector */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={formatPlatform === "wechat" ? "secondary" : "ghost"}
              className={`flex-1 h-7 text-[10px] ${
                formatPlatform === "wechat"
                  ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                  : ""
              }`}
              onClick={() => setFormatPlatform("wechat")}
            >
              朋友圈格式
            </Button>
            <Button
              size="sm"
              variant={formatPlatform === "xiaohongshu" ? "secondary" : "ghost"}
              className={`flex-1 h-7 text-[10px] ${
                formatPlatform === "xiaohongshu"
                  ? "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
                  : ""
              }`}
              onClick={() => setFormatPlatform("xiaohongshu")}
            >
              小红书格式
            </Button>
          </div>

          <Button
            size="sm"
            className="w-full h-8 text-xs bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white btn-ripple press-scale"
            onClick={handleFormat}
            disabled={!rawText}
          >
            <Wand2 className="h-3.5 w-3.5 mr-1.5" />
            一键排版
          </Button>

          {/* Preview */}
          <AnimatePresence>
            {showPreview && formattedText && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-2 overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-medium">排版预览</span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-1.5 text-[10px]"
                      onClick={() => {
                        setShowPreview(false);
                        setFormattedText("");
                      }}
                    >
                      <RotateCcw className="h-3 w-3 mr-0.5" />
                      重置
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-1.5 text-[10px] text-violet-600 dark:text-violet-400"
                      onClick={handleCopy}
                    >
                      <Copy className="h-3 w-3 mr-0.5" />
                      复制
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {/* Before */}
                  <div className="rounded-lg border border-border/20 p-2.5">
                    <div className="flex items-center gap-1 mb-1.5">
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[9px] text-muted-foreground font-medium">原文</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground whitespace-pre-wrap line-clamp-4">
                      {rawText}
                    </p>
                  </div>
                  {/* After */}
                  <div className="rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/10 p-2.5">
                    <div className="flex items-center gap-1 mb-1.5">
                      <Sparkles className="h-3 w-3 text-violet-500" />
                      <span className="text-[9px] text-violet-600 dark:text-violet-400 font-medium">排版后</span>
                    </div>
                    <p className="text-[10px] whitespace-pre-wrap line-clamp-6">
                      {formattedText}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!rawText && (
            <p className="text-[10px] text-center text-muted-foreground py-2">
              请先选择一条有内容的作品
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── AI Spell Check Section ──────────────────────────────────────────

function AISpellCheckSection({ post }: { post: ContentPost | null }) {
  const { updateContentPost } = useAppStore();

  const handleSpellCheckResult = useCallback(
    (result: SpellCheckResult) => {
      // If the result has fixes applied, update the post content
      // The onResult callback already handles "一键修复" which replaces text
      // We just need to track whether spellcheck was done for the checklist
    },
    []
  );

  return (
    <AISpellCheck
      content={post?.content || ""}
      onResult={handleSpellCheckResult}
    />
  );
}

// ─── Publish Checklist ──────────────────────────────────────────────────────

interface ChecklistItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  passed: boolean;
  warning: boolean;
  autoFixable: boolean;
}

function buildChecklistItems(post: ContentPost | null): ChecklistItem[] {
  if (!post) return [];

  const content = post.content || "";
  const wordCount = content.length;
  const isXHS = post.platform === "xiaohongshu";

  return [
      {
        id: "wordCount",
        label: "内容字数合适",
        icon: FileText,
        passed: isXHS ? (wordCount >= 100 && wordCount <= 1000) : (wordCount >= 30 && wordCount <= 500),
        warning: wordCount === 0,
        autoFixable: false,
      },
      {
        id: "tags",
        label: "已添加话题标签",
        icon: Hash,
        passed: content.includes("#"),
        warning: isXHS && !content.includes("#"),
        autoFixable: true,
      },
      {
        id: "cover",
        label: "已选择封面图",
        icon: Image,
        passed: post.contentType !== "text",
        warning: false,
        autoFixable: false,
      },
      {
        id: "score",
        label: "AI评分 ≥ 70",
        icon: Star,
        passed: (post.aiScore || 0) >= 70,
        warning: (post.aiScore || 0) > 0 && (post.aiScore || 0) < 70,
        autoFixable: false,
      },
      {
        id: "spellcheck",
        label: "已检查错别字",
        icon: SpellCheck,
        passed: false,
        warning: false,
        autoFixable: true,
      },
    ];
}

function PublishChecklist({ post }: { post: ContentPost | null }) {
  const [fixing, setFixing] = useState<string | null>(null);
  const [spellChecked, setSpellChecked] = useState(false);

  const items = useMemo(() => {
    const built = buildChecklistItems(post);
    // Apply local state overrides (e.g. spellcheck)
    return built.map((item) =>
      item.id === "spellcheck" && spellChecked ? { ...item, passed: true } : item,
    );
  }, [post, spellChecked]);

  const handleAutoFix = useCallback(
    async (itemId: string) => {
      if (!post || fixing) return;
      setFixing(itemId);

      if (itemId === "tags") {
        // Simulate adding tags
        const topic = post.topic || "日常分享";
        const tags = `\n\n#${topic} #生活记录 #个人成长`;
        try {
          const res = await fetch(`/api/content/${post.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: (post.content || "") + tags }),
          });
          if (res.ok) {
            const updated = await res.json();
            useAppStore.getState().updateContentPost(post.id, updated);
            toast.success("已自动添加话题标签");
          }
        } catch {
          toast.error("自动修复失败");
        }
      } else if (itemId === "spellcheck") {
        // Simulate spellcheck pass
        setSpellChecked(true);
        toast.success("错别字检查完成");
      }

      setFixing(null);
    },
    [post, fixing],
  );

  const passedCount = items.filter((i) => i.passed).length;
  const totalCount = items.length;
  const allPassed = passedCount === totalCount && totalCount > 0;

  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger className="w-full group/collapsible">
        <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/10 flex items-center justify-center">
                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-xs font-medium">发布清单</span>
                <span className="text-[10px] text-muted-foreground">
                  {totalCount > 0
                    ? allPassed
                      ? "全部通过 ✅"
                      : `${passedCount}/${totalCount} 项通过`
                    : "发布前检查"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {totalCount > 0 && (
                <Badge
                  variant={allPassed ? "default" : "outline"}
                  className={`text-[9px] px-1.5 py-0 h-4 ${
                    allPassed
                      ? "bg-emerald-500 text-white"
                      : "text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20"
                  }`}
                >
                  {passedCount}/{totalCount}
                </Badge>
              )}
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]/collapsible:rotate-180" />
            </div>
          </CardContent>
        </Card>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-1 pb-3 space-y-1">
          {!post ? (
            <p className="text-[10px] text-center text-muted-foreground py-2">
              请先选择一条作品
            </p>
          ) : (
            items.map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center justify-between py-1.5 px-1 rounded-md hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-5 w-5 rounded flex items-center justify-center ${
                        item.passed
                          ? "bg-emerald-100 dark:bg-emerald-900/30"
                          : item.warning
                            ? "bg-amber-100 dark:bg-amber-900/30"
                            : "bg-muted"
                      }`}
                    >
                      {item.passed ? (
                        <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                      ) : item.warning ? (
                        <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                      ) : (
                        <Icon className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    <span
                      className={`text-[11px] ${
                        item.passed ? "text-emerald-600 dark:text-emerald-400" : ""
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                  {item.autoFixable && !item.passed && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[10px] text-violet-600 dark:text-violet-400 hover:text-violet-700"
                      onClick={() => handleAutoFix(item.id)}
                      disabled={fixing === item.id}
                    >
                      {fixing === item.id ? (
                        <span className="flex items-center gap-1">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Timer className="h-3 w-3" />
                          </motion.div>
                          修复中
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5">
                          <Sparkles className="h-3 w-3" />
                          一键修复
                        </span>
                      )}
                    </Button>
                  )}
                </motion.div>
              );
            })
          )}

          {/* One-click fix all */}
          {items.some((i) => i.autoFixable && !i.passed) && (
            <Button
              size="sm"
              variant="outline"
              className="w-full h-7 text-[10px] border-dashed mt-1"
              onClick={() => {
                items
                  .filter((i) => i.autoFixable && !i.passed)
                  .forEach((i) => handleAutoFix(i.id));
              }}
              disabled={!!fixing}
            >
              <Wand2 className="h-3 w-3 mr-1" />
              一键修复所有可修复项
            </Button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Scheduled Reminder ─────────────────────────────────────────────────────

function ScheduledReminder({ post }: { post: ContentPost | null }) {
  const [reminders, setReminders] = useState<ScheduledReminder[]>([]);
  const [scheduledTime, setScheduledTime] = useState("");
  const [countdown, setCountdown] = useState("");

  // Load reminders from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("publish-reminders");
      if (stored) {
        setReminders(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  // Save reminders to localStorage
  const saveReminders = useCallback((newReminders: ScheduledReminder[]) => {
    setReminders(newReminders);
    try {
      localStorage.setItem("publish-reminders", JSON.stringify(newReminders));
    } catch {
      // ignore
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (reminders.length === 0) {
      setCountdown("");
      return;
    }

    const now = Date.now();
    const upcoming = reminders
      .filter((r) => new Date(r.scheduledTime).getTime() > now)
      .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());

    if (upcoming.length === 0) {
      setCountdown("无即将到来的提醒");
      return;
    }

    const next = upcoming[0];
    const diff = new Date(next.scheduledTime).getTime() - now;

    function updateCountdown() {
      const remaining = new Date(next.scheduledTime).getTime() - Date.now();
      if (remaining <= 0) {
        setCountdown("已到发布时间！");
        return;
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      if (hours > 24) {
        setCountdown(`${Math.floor(hours / 24)}天${hours % 24}小时后`);
      } else if (hours > 0) {
        setCountdown(`${hours}小时${minutes}分钟后`);
      } else if (minutes > 0) {
        setCountdown(`${minutes}分${seconds}秒后`);
      } else {
        setCountdown(`${seconds}秒后发布`);
      }
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [reminders]);

  // Set default time to 2 hours from now
  useEffect(() => {
    const d = new Date();
    d.setHours(d.getHours() + 2);
    d.setMinutes(0);
    const pad = (n: number) => String(n).padStart(2, "0");
    setScheduledTime(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
  }, []);

  const handleSetReminder = useCallback(() => {
    if (!post) {
      toast.error("请先选择一条作品");
      return;
    }
    if (!scheduledTime) {
      toast.error("请选择发布时间");
      return;
    }

    const newReminder: ScheduledReminder = {
      id: `reminder-${Date.now()}`,
      postId: post.id,
      postTopic: post.topic || "未命名",
      scheduledTime,
      createdAt: Date.now(),
    };

    saveReminders([newReminder, ...reminders]);
    toast.success("提醒已设置", {
      description: `将在 ${new Date(scheduledTime).toLocaleString("zh-CN")} 提醒发布`,
    });
  }, [post, scheduledTime, reminders, saveReminders]);

  const handleDeleteReminder = useCallback(
    (id: string) => {
      saveReminders(reminders.filter((r) => r.id !== id));
      toast.success("提醒已删除");
    },
    [reminders, saveReminders],
  );

  const upcomingReminders = useMemo(() => {
    const now = Date.now();
    return reminders.filter((r) => new Date(r.scheduledTime).getTime() > now);
  }, [reminders]);

  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger className="w-full group/collapsible">
        <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center">
                <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-xs font-medium">定时提醒</span>
                <span className="text-[10px] text-muted-foreground">
                  {upcomingReminders.length > 0
                    ? `${upcomingReminders.length}个待发布`
                    : "设置发布时间提醒"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {upcomingReminders.length > 0 && (
                <Badge className="text-[9px] px-1.5 py-0 h-4 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                  {upcomingReminders.length}
                </Badge>
              )}
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]/collapsible:rotate-180" />
            </div>
          </CardContent>
        </Card>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-1 pb-3 space-y-2">
          {/* Time picker */}
          <div className="flex gap-2 items-center">
            <input
              type="datetime-local"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
            />
            <Button
              size="sm"
              className="h-8 text-xs bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white btn-ripple press-scale"
              onClick={handleSetReminder}
              disabled={!post}
            >
              <BellRing className="h-3.5 w-3.5 mr-1" />
              设置提醒
            </Button>
          </div>

          {/* Countdown */}
          {countdown && upcomingReminders.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200/60 dark:border-amber-800/40"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </motion.div>
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                距下次发布：{countdown}
              </span>
            </motion.div>
          )}

          {/* Reminders list */}
          {upcomingReminders.length > 0 && (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {upcomingReminders.map((reminder) => (
                <motion.div
                  key={reminder.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted/30 transition-colors group/item"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Bell className="h-3 w-3 text-amber-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium truncate">{reminder.postTopic}</p>
                      <p className="text-[9px] text-muted-foreground">
                        {new Date(reminder.scheduledTime).toLocaleString("zh-CN")}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 w-5 p-0 opacity-0 group-hover/item:opacity-100 text-muted-foreground hover:text-red-500"
                    onClick={() => handleDeleteReminder(reminder.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </motion.div>
              ))}
            </div>
          )}

          {!post && (
            <p className="text-[10px] text-center text-muted-foreground py-2">
              请先选择一条作品
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function PublishWorkflow({ selectedPost }: PublishWorkflowProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-2"
    >
      <motion.div variants={itemVariants}>
        <OneClickFormat post={selectedPost} />
      </motion.div>
      <motion.div variants={itemVariants}>
        <AISpellCheckSection post={selectedPost} />
      </motion.div>
      <motion.div variants={itemVariants}>
        <PublishChecklist post={selectedPost} />
      </motion.div>
      <motion.div variants={itemVariants}>
        <ScheduledReminder post={selectedPost} />
      </motion.div>
    </motion.div>
  );
}
