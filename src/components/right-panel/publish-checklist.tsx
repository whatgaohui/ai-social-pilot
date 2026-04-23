"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppStore } from "@/store/app-store";
import type { ContentPost } from "@/types";
import { toast } from "sonner";
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  Sparkles,
  Wand2,
  Loader2,
  Type,
  FileText,
  Clock,
  Smartphone,
  MessageCircleQuestion,
  AlignLeft,
  Lightbulb,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CheckItem {
  key: string;
  name: string;
  icon: React.ElementType;
  weight: number; // percentage weight for overall score
  score: number; // 0-100
  feedback: string;
  status: "pass" | "warn" | "fail";
  fixable: boolean;
  fixAction?: string;
}

interface PublishChecklistProps {
  post: ContentPost | null;
}

// ─── Scoring Helpers ────────────────────────────────────────────────────────

function countEmoji(text: string): number {
  // Match emoji unicode ranges
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}\u{FE0F}\u{3030}]/gu;
  return (text.match(emojiRegex) || []).length;
}

function countHashtags(text: string): number {
  const matches = text.match(/#[^\s#]+/g);
  return matches ? matches.length : 0;
}

function hasNumbers(text: string): boolean {
  return /\d/.test(text);
}

function hasQuestions(text: string): boolean {
  return /[？?]/.test(text);
}

function hasCTA(text: string): boolean {
  const ctaKeywords = ["点赞", "收藏", "关注", "转发", "分享", "评论", "留言", "告诉我", "你觉得", "试试", "点击", "快来"];
  return ctaKeywords.some((k) => text.includes(k));
}

function hasChoices(text: string): boolean {
  return /[还是|或者|要么|A还是B|选哪个|你更喜欢]/.test(text);
}

function getHourScore(): number {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const timeInHours = hour + minute / 60;

  // Best windows: 7-9, 12-13, 18-21, 21-23
  const optimalWindows = [
    { start: 7, end: 9 },
    { start: 12, end: 13 },
    { start: 18, end: 21 },
    { start: 21, end: 23 },
  ];

  let minDist = Infinity;
  for (const w of optimalWindows) {
    if (timeInHours >= w.start && timeInHours <= w.end) {
      return 100; // Inside optimal window
    }
    const distToStart = Math.abs(timeInHours - w.start);
    const distToEnd = Math.abs(timeInHours - w.end);
    minDist = Math.min(minDist, distToStart, distToEnd);
  }

  // Score decreases with distance from optimal window
  if (minDist <= 1) return 80;
  if (minDist <= 2) return 60;
  if (minDist <= 3) return 40;
  return 20;
}

function getTimingLabel(): string {
  const hour = new Date().getHours();
  if (hour >= 7 && hour < 9) return "早高峰 (7-9点)";
  if (hour >= 12 && hour < 13) return "午休 (12-13点)";
  if (hour >= 18 && hour < 21) return "晚高峰 (18-21点)";
  if (hour >= 21 && hour < 23) return "夜间活跃 (21-23点)";
  return "非最佳时段";
}

// ─── Evaluation Engine ──────────────────────────────────────────────────────

function evaluatePost(post: ContentPost | null, platform: string): CheckItem[] {
  if (!post) {
    return [
      { key: "title", name: "标题吸引力", icon: Type, weight: 20, score: 0, feedback: "暂无内容可检查", status: "fail", fixable: false },
      { key: "content", name: "内容完整度", icon: FileText, weight: 25, score: 0, feedback: "暂无内容可检查", status: "fail", fixable: false },
      { key: "timing", name: "发布时机", icon: Clock, weight: 10, score: 0, feedback: "暂无内容可检查", status: "fail", fixable: false },
      { key: "platform", name: "平台适配", icon: Smartphone, weight: 20, score: 0, feedback: "暂无内容可检查", status: "fail", fixable: false },
      { key: "engagement", name: "互动诱饵", icon: MessageCircleQuestion, weight: 15, score: 0, feedback: "暂无内容可检查", status: "fail", fixable: false },
      { key: "format", name: "格式规范", icon: AlignLeft, weight: 10, score: 0, feedback: "暂无内容可检查", status: "fail", fixable: false },
    ];
  }

  const content = post.content || "";
  const lines = content.split("\n").filter((l) => l.trim());
  const title = lines[0] || post.topic || "";
  const body = lines.slice(1).join("\n");
  const isXHS = platform === "xiaohongshu" || post.platform === "xiaohongshu";
  const wordCount = content.length;

  const items: CheckItem[] = [];

  // 1. 标题吸引力 (Title Attractiveness)
  {
    let score = 0;
    const feedbacks: string[] = [];
    const titleLen = title.length;

    // Length check
    if (isXHS) {
      if (titleLen >= 15 && titleLen <= 25) {
        score += 30;
      } else if (titleLen > 0 && titleLen < 15) {
        score += 15;
        feedbacks.push("标题偏短，建议15-25字");
      } else if (titleLen > 25) {
        score += 10;
        feedbacks.push("标题过长，建议控制在25字以内");
      } else {
        feedbacks.push("缺少标题");
      }
    } else {
      if (titleLen >= 5 && titleLen <= 20) {
        score += 30;
      } else if (titleLen > 0 && titleLen < 5) {
        score += 15;
        feedbacks.push("标题偏短，建议5-20字");
      } else if (titleLen > 20) {
        score += 10;
        feedbacks.push("标题偏长，建议控制在20字以内");
      } else {
        feedbacks.push("缺少标题");
      }
    }

    // Emoji check
    const emojiCount = countEmoji(title);
    if (emojiCount >= 1 && emojiCount <= 3) {
      score += 20;
    } else if (emojiCount > 3) {
      score += 10;
      feedbacks.push("emoji过多，建议1-3个");
    } else {
      feedbacks.push("建议添加1-3个emoji增加吸引力");
    }

    // Numbers check
    if (hasNumbers(title)) {
      score += 25;
    } else {
      feedbacks.push("添加数字可提高点击率");
    }

    // Hook check (hooks = question marks, exclamation, strong words)
    const hookWords = ["必看", "绝了", "震惊", "后悔", "终于", "揭秘", "竟然", "竟然", "宝藏", "绝密", "免费", "搞定", "太强了", "速看"];
    if (title.includes("？") || title.includes("?") || title.includes("!") || title.includes("！") || hookWords.some((h) => title.includes(h))) {
      score += 25;
    } else {
      feedbacks.push("加入疑问或感叹可提升点击欲");
    }

    const status: "pass" | "warn" | "fail" = score >= 75 ? "pass" : score >= 50 ? "warn" : "fail";
    items.push({
      key: "title",
      name: "标题吸引力",
      icon: Type,
      weight: 20,
      score: Math.min(100, score),
      feedback: feedbacks.length > 0 ? feedbacks.join("；") : "标题优秀",
      status,
      fixable: true,
      fixAction: "autoTitle",
    });
  }

  // 2. 内容完整度 (Content Completeness)
  {
    let score = 0;
    const feedbacks: string[] = [];
    const minWords = isXHS ? 200 : 50;

    if (wordCount >= minWords) {
      score += 40;
    } else if (wordCount >= minWords * 0.5) {
      score += 20;
      feedbacks.push(`字数偏少（当前${wordCount}字，建议${minWords}+字）`);
    } else {
      feedbacks.push(`内容过短（当前${wordCount}字，建议${minWords}+字）`);
    }

    // Hashtags
    const hashtagCount = countHashtags(content);
    if (isXHS) {
      if (hashtagCount >= 3 && hashtagCount <= 5) {
        score += 30;
      } else if (hashtagCount > 0) {
        score += 15;
        if (hashtagCount < 3) feedbacks.push(`话题标签仅${hashtagCount}个，建议3-5个`);
        if (hashtagCount > 5) feedbacks.push("话题标签过多，建议3-5个");
      } else {
        feedbacks.push("缺少话题标签，建议添加3-5个");
      }
    } else {
      if (hashtagCount > 0) score += 15;
    }

    // CTA
    if (hasCTA(content)) {
      score += 30;
    } else {
      feedbacks.push("缺少行动号召（如：点赞、收藏、关注）");
    }

    const status: "pass" | "warn" | "fail" = score >= 75 ? "pass" : score >= 50 ? "warn" : "fail";
    items.push({
      key: "content",
      name: "内容完整度",
      icon: FileText,
      weight: 25,
      score: Math.min(100, score),
      feedback: feedbacks.length > 0 ? feedbacks.join("；") : "内容完整",
      status,
      fixable: true,
      fixAction: "autoContent",
    });
  }

  // 3. 发布时机 (Timing)
  {
    const timingScore = getHourScore();
    const timingLabel = getTimingLabel();
    const feedbacks: string[] = [];

    if (timingScore === 100) {
      feedbacks.push(`当前为${timingLabel}，最佳发布时间`);
    } else if (timingScore >= 60) {
      feedbacks.push(`接近最佳时段（${timingLabel}）`);
    } else {
      feedbacks.push(`非最佳发布时段，建议：早7-9点、午12-1点、晚6-9点、夜9-11点`);
    }

    const status: "pass" | "warn" | "fail" = timingScore >= 80 ? "pass" : timingScore >= 50 ? "warn" : "fail";
    items.push({
      key: "timing",
      name: "发布时机",
      icon: Clock,
      weight: 10,
      score: timingScore,
      feedback: feedbacks.join("；"),
      status,
      fixable: false,
    });
  }

  // 4. 平台适配 (Platform Fit)
  {
    let score = 0;
    const feedbacks: string[] = [];

    if (isXHS) {
      // XHS specific checks
      const hashtagCount = countHashtags(content);
      if (hashtagCount >= 3 && hashtagCount <= 5) score += 30;
      else if (hashtagCount > 0) {
        score += 15;
        feedbacks.push(`话题标签建议3-5个（当前${hashtagCount}个）`);
      } else feedbacks.push("小红书笔记需要3-5个话题标签");

      const emojiCount = countEmoji(content);
      if (emojiCount >= 2 && emojiCount <= 5) score += 20;
      else if (emojiCount > 0) {
        score += 10;
        feedbacks.push(`emoji建议2-5个（当前${emojiCount}个）`);
      } else feedbacks.push("小红书笔记建议添加emoji增加亲和力");

      if (title.length >= 15 && title.length <= 25) score += 20;
      else if (title.length > 0) {
        score += 10;
        feedbacks.push("标题建议15-25字");
      } else feedbacks.push("缺少标题");

      // Structure: should have sections
      const sectionCount = content.split(/\n\n+/).filter((s) => s.trim()).length;
      if (sectionCount >= 3) score += 30;
      else if (sectionCount >= 2) {
        score += 15;
        feedbacks.push("建议分段落组织内容（3段以上）");
      } else {
        feedbacks.push("建议分段落组织内容");
      }
    } else {
      // WeChat specific checks
      if (wordCount >= 50 && wordCount <= 300) score += 35;
      else if (wordCount > 0) {
        score += 20;
        if (wordCount > 300) feedbacks.push("朋友圈建议简洁，控制在300字以内");
        else feedbacks.push("内容偏短");
      } else feedbacks.push("缺少内容");

      const emojiCount = countEmoji(content);
      if (emojiCount >= 1 && emojiCount <= 5) score += 25;
      else if (emojiCount > 5) {
        score += 10;
        feedbacks.push("emoji过多");
      } else {
        feedbacks.push("可添加emoji增加个人风格");
      }

      // Personal tone check
      const personalWords = ["我", "觉得", "推荐", "分享", "喜欢", "今天", "最近", "终于", "日常"];
      if (personalWords.some((w) => content.includes(w))) score += 20;
      else feedbacks.push("建议使用更个人化的语气");

      // Not too many hashtags for WeChat
      const hashtagCount = countHashtags(content);
      if (hashtagCount <= 2) score += 20;
      else {
        score += 5;
        feedbacks.push("朋友圈不宜过多话题标签");
      }
    }

    const status: "pass" | "warn" | "fail" = score >= 75 ? "pass" : score >= 50 ? "warn" : "fail";
    items.push({
      key: "platform",
      name: "平台适配",
      icon: Smartphone,
      weight: 20,
      score: Math.min(100, score),
      feedback: feedbacks.length > 0 ? feedbacks.join("；") : "平台适配良好",
      status,
      fixable: true,
      fixAction: "autoPlatform",
    });
  }

  // 5. 互动诱饵 (Engagement Hooks)
  {
    let score = 0;
    const feedbacks: string[] = [];

    // Questions
    if (hasQuestions(content)) {
      score += 30;
    } else {
      feedbacks.push("添加提问可引导用户评论互动");
    }

    // Choices/polls
    if (hasChoices(content)) {
      score += 25;
    } else {
      feedbacks.push("加入选择性问题可提升互动率");
    }

    // Controversial/differentiated opinion
    const opinionWords = ["我认为", "不一样", "反对", "其实", "但是", "不过", "没想到", "打破", "颠覆", "很多人不知道"];
    if (opinionWords.some((w) => content.includes(w))) {
      score += 20;
    } else {
      feedbacks.push("加入差异化观点可引发讨论");
    }

    // CTA
    if (hasCTA(content)) {
      score += 25;
    } else {
      feedbacks.push("末尾添加行动号召（如：你觉得呢？评论区见！）");
    }

    const status: "pass" | "warn" | "fail" = score >= 75 ? "pass" : score >= 50 ? "warn" : "fail";
    items.push({
      key: "engagement",
      name: "互动诱饵",
      icon: MessageCircleQuestion,
      weight: 15,
      score: Math.min(100, score),
      feedback: feedbacks.length > 0 ? feedbacks.join("；") : "互动设计良好",
      status,
      fixable: true,
      fixAction: "autoEngagement",
    });
  }

  // 6. 格式规范 (Format Standards)
  {
    let score = 0;
    const feedbacks: string[] = [];

    // Check excessive line breaks
    const consecutiveBreaks = content.match(/\n{3,}/g);
    if (!consecutiveBreaks) {
      score += 25;
    } else {
      score += 10;
      feedbacks.push("存在过多空行，建议段落间不超过2个换行");
    }

    // Check too-long paragraphs
    const paragraphs = content.split(/\n+/).filter((p) => p.trim());
    const longParagraphs = paragraphs.filter((p) => p.length > 200);
    if (longParagraphs.length === 0) {
      score += 25;
    } else {
      score += 10;
      feedbacks.push(`${longParagraphs.length}个段落超过200字，建议拆分`);
    }

    // Emoji density
    const emojiCount = countEmoji(content);
    const emojiRatio = wordCount > 0 ? emojiCount / wordCount : 0;
    if (emojiRatio <= 0.05) {
      score += 25;
    } else if (emojiRatio <= 0.1) {
      score += 15;
      feedbacks.push("emoji密度偏高");
    } else {
      feedbacks.push("emoji过多，影响阅读体验");
    }

    // Spam check
    const spamPatterns = ["关注我", "关注博主", "私信我", "加微信", "免费领", "优惠券", "链接", "http"];
    const spamCount = spamPatterns.filter((p) => content.includes(p)).length;
    if (spamCount === 0) {
      score += 25;
    } else {
      score += 10;
      feedbacks.push(`检测到${spamCount}个推广敏感词，可能影响推荐`);
    }

    const status: "pass" | "warn" | "fail" = score >= 75 ? "pass" : score >= 50 ? "warn" : "fail";
    items.push({
      key: "format",
      name: "格式规范",
      icon: AlignLeft,
      weight: 10,
      score: Math.min(100, score),
      feedback: feedbacks.length > 0 ? feedbacks.join("；") : "格式规范良好",
      status,
      fixable: false,
    });
  }

  return items;
}

function getOverallScore(items: CheckItem[]): number {
  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  const weightedSum = items.reduce((s, i) => s + i.score * i.weight, 0);
  return Math.round(weightedSum / totalWeight);
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function getScoreBg(score: number): string {
  if (score >= 80) return "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400";
  return "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400";
}

function getScoreBadgeVariant(score: number): "default" | "secondary" | "outline" | "destructive" {
  if (score >= 80) return "default";
  if (score >= 60) return "secondary";
  return "destructive";
}

function getStatusIcon(status: "pass" | "warn" | "fail") {
  switch (status) {
    case "pass":
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
    case "warn":
      return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
    case "fail":
      return <XCircle className="h-3.5 w-3.5 text-rose-500" />;
  }
}

// ─── Auto-Fix Logic ─────────────────────────────────────────────────────────

function autoFixContent(content: string, fixAction: string, isXHS: boolean): string {
  const lines = content.split("\n");
  const title = lines[0] || "";
  const body = lines.slice(1).join("\n");

  switch (fixAction) {
    case "autoTitle": {
      let newTitle = title;
      if (!newTitle.trim()) {
        newTitle = body.split("\n")[0]?.slice(0, 20) || "我的分享";
      }
      // Add a number if missing
      if (!hasNumbers(newTitle)) {
        const num = Math.floor(Math.random() * 9) + 1;
        newTitle = `${num}个${newTitle.length > 0 ? newTitle : "理由"}让你`;
      }
      // Add emoji if missing
      if (countEmoji(newTitle) === 0) {
        newTitle = `✨ ${newTitle}`;
      }
      // Add question mark if missing hooks
      if (!newTitle.includes("？") && !newTitle.includes("?") && !newTitle.includes("!") && !newTitle.includes("！")) {
        newTitle = `${newTitle}？`;
      }
      return `${newTitle}\n${body}`;
    }
    case "autoContent": {
      let newContent = body;
      // Add hashtags if XHS
      if (isXHS) {
        const hashtagCount = countHashtags(newContent);
        if (hashtagCount < 3) {
          const tags = ["#日常分享", "#好物推荐", "#生活记录", "#个人成长", "#经验分享"];
          const toAdd = tags.slice(0, 3 - hashtagCount);
          newContent = `${newContent}\n\n${toAdd.join(" ")}`;
        }
      }
      // Add CTA if missing
      if (!hasCTA(newContent)) {
        const ctas = ["觉得有用就点个赞吧 ❤️", "评论区说说你的看法吧 👇", "关注我，持续分享干货 ✨"];
        newContent = `${newContent}\n\n${ctas[Math.floor(Math.random() * ctas.length)]}`;
      }
      return `${title}\n${newContent}`;
    }
    case "autoPlatform": {
      if (isXHS) {
        // Ensure hashtags
        let newContent = content;
        const hashtagCount = countHashtags(newContent);
        if (hashtagCount < 3) {
          const tags = ["#日常分享", "#好物推荐", "#生活记录"];
          newContent = `${newContent}\n\n${tags.join(" ")}`;
        }
        return newContent;
      }
      return content; // WeChat is more lenient
    }
    case "autoEngagement": {
      let newContent = body;
      // Add a question if missing
      if (!hasQuestions(newContent)) {
        const questions = ["你觉得呢？", "你怎么看？", "有同感的举手 🙋", "你会怎么选？"];
        newContent = `${newContent}\n\n${questions[Math.floor(Math.random() * questions.length)]}`;
      }
      return `${title}\n${newContent}`;
    }
    default:
      return content;
  }
}

// ─── Animated Score Counter ─────────────────────────────────────────────────

function AnimatedScore({ score, size = "lg" }: { score: number; size?: "sm" | "lg" }) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const duration = 600;

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * score));
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const isLarge = size === "lg";

  return (
    <motion.span
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
      className={`font-bold tabular-nums ${getScoreColor(score)} ${isLarge ? "text-xl" : "text-sm"}`}
    >
      {displayScore}
    </motion.span>
  );
}

// ─── Checklist Item Component ───────────────────────────────────────────────

function ChecklistItemRow({
  item,
  index,
  onFix,
}: {
  item: CheckItem;
  index: number;
  onFix: (key: string) => void;
}) {
  const [fixing, setFixing] = useState(false);

  const handleFix = async () => {
    setFixing(true);
    // Small delay for visual feedback
    await new Promise((r) => setTimeout(r, 400));
    onFix(item.key);
    setFixing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3, ease: "easeOut" }}
      className="flex items-start gap-2.5 py-2 px-2 rounded-lg hover:bg-muted/30 transition-colors group"
    >
      {/* Status Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: index * 0.06 + 0.1, type: "spring", stiffness: 300, damping: 20 }}
        className="mt-0.5 flex-shrink-0"
      >
        {getStatusIcon(item.status)}
      </motion.div>

      {/* Item info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <item.icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-xs font-medium">{item.name}</span>
          <span className={`text-[10px] tabular-nums font-semibold ${getScoreColor(item.score)}`}>
            {item.score}分
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
          {item.feedback}
        </p>
      </div>

      {/* Fix button */}
      {item.fixable && item.status !== "pass" && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFix}
              disabled={fixing}
              className="h-6 px-1.5 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/30"
            >
              {fixing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Wand2 className="h-3 w-3" />
              )}
              <span className="ml-0.5 hidden sm:inline">一键修复</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="text-[10px]">自动优化{item.name}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function PublishChecklist({ post }: PublishChecklistProps) {
  const { platform, updateContentPost } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [adviceOpen, setAdviceOpen] = useState(false);

  const isXHS = platform === "xiaohongshu" || post?.platform === "xiaohongshu";

  const checkItems = useMemo(
    () => evaluatePost(post, platform),
    [post, platform]
  );

  const overallScore = useMemo(() => getOverallScore(checkItems), [checkItems]);

  const passCount = checkItems.filter((i) => i.status === "pass").length;
  const warnCount = checkItems.filter((i) => i.status === "warn").length;
  const failCount = checkItems.filter((i) => i.status === "fail").length;

  const handleFix = useCallback(
    (key: string) => {
      if (!post) return;
      const item = checkItems.find((i) => i.key === key);
      if (!item?.fixAction) return;

      const fixedContent = autoFixContent(post.content, item.fixAction, isXHS);
      updateContentPost(post.id, { content: fixedContent });
      toast.success(`已自动修复「${item.name}」`);
    },
    [post, checkItems, isXHS, updateContentPost]
  );

  const handleGetAIAdvice = async () => {
    if (!post) return;
    setLoadingAdvice(true);
    setAdviceOpen(true);
    setAiAdvice(null);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "checklist_advice",
          content: post.content,
          topic: post.topic,
          platform: isXHS ? "xiaohongshu" : "wechat",
          checks: checkItems.map((i) => ({
            name: i.name,
            score: i.score,
            feedback: i.feedback,
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiAdvice(data.content || data.advice || data.result || "AI 暂无建议");
      } else {
        // Fallback to heuristic-based advice
        const failedItems = checkItems.filter((i) => i.status === "fail" || i.status === "warn");
        if (failedItems.length > 0) {
          setAiAdvice(
            failedItems
              .map((i) => `【${i.name}】${i.feedback}`)
              .join("\n\n") +
              "\n\n💡 建议优先修复得分最低的项目，可逐项使用「一键修复」功能快速优化。"
          );
        } else {
          setAiAdvice("🎉 内容质量优秀！各项指标均通过检查，可以直接发布。");
        }
      }
    } catch {
      setAiAdvice("⚠️ 无法获取AI建议，请检查网络连接后重试。");
    } finally {
      setLoadingAdvice(false);
    }
  };

  return (
    <div className="border border-border/20 rounded-xl overflow-hidden bg-card">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/30 border-b border-border/20">
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 flex-1 text-left group cursor-pointer">
              <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                <ClipboardCheck className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-xs font-semibold">发布检查</span>
              <div className="flex items-center gap-1 ml-auto">
                {passCount === checkItems.length && checkItems.length > 0 && (
                  <Badge className={`text-[9px] px-1.5 py-0 border ${getScoreBg(overallScore)}`} variant="outline">
                    全部通过
                  </Badge>
                )}
                <Badge className={`text-[10px] px-1.5 py-0 border ${getScoreBg(overallScore)}`} variant="outline">
                  <AnimatedScore score={overallScore} size="sm" />分
                </Badge>
              </div>
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </motion.div>
            </button>
          </CollapsibleTrigger>
        </div>

        {/* Expandable Content */}
        <CollapsibleContent>
          <div className="px-2 py-2 space-y-1">
            {/* Score overview */}
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-3 px-2 py-2"
            >
              <div className="flex flex-col items-center">
                <AnimatedScore score={overallScore} />
                <span className="text-[9px] text-muted-foreground">综合得分</span>
              </div>
              <div className="flex-1">
                <Progress value={overallScore} className="h-2 mb-1.5" />
                <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
                    {passCount}通过
                  </span>
                  <span className="flex items-center gap-0.5">
                    <AlertTriangle className="h-2.5 w-2.5 text-amber-500" />
                    {warnCount}警告
                  </span>
                  <span className="flex items-center gap-0.5">
                    <XCircle className="h-2.5 w-2.5 text-rose-500" />
                    {failCount}未通过
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Checklist items */}
            <div className="divide-y divide-border/30">
              {checkItems.map((item, idx) => (
                <ChecklistItemRow
                  key={item.key}
                  item={item}
                  index={idx}
                  onFix={handleFix}
                />
              ))}
            </div>

            {/* AI Advice Section */}
            <div className="pt-1">
              <Collapsible open={adviceOpen} onOpenChange={setAdviceOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleGetAIAdvice}
                    disabled={!post || loadingAdvice}
                    className="w-full h-8 text-[11px] text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-700 dark:hover:text-violet-300 gap-1.5"
                  >
                    {loadingAdvice ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    {loadingAdvice ? "AI分析中..." : "AI优化建议"}
                    {!adviceOpen && (
                      <ChevronDown className="h-3 w-3 ml-auto opacity-50" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {aiAdvice && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="px-3 py-2.5 mt-1 rounded-lg bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 border border-violet-200/50 dark:border-violet-800/30"
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Lightbulb className="h-3 w-3 text-amber-500" />
                        <span className="text-[10px] font-semibold text-violet-700 dark:text-violet-300">
                          AI 建议
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground leading-relaxed whitespace-pre-line">
                        {aiAdvice}
                      </div>
                    </motion.div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
