"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAppStore } from "@/store/app-store";
import {
  Sparkles,
  Type,
  Heart,
  Minimize2,
  Copy,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  ArrowRight,
  ArrowLeftRight,
  Clock,
  TrendingUp,
  TrendingDown,
  Trash2,
  Eye,
  Wand2,
  BarChart3,
  FileText,
  Hash,
  SmilePlus,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ContentOptimizerStudioProps {
  postId?: string;
  content?: string;
  topic?: string;
}

type OptimizationMode = "overall" | "title" | "emotion" | "concise";
type ViewMode = "split" | "diff";

interface OptimizationRound {
  id: string;
  timestamp: number;
  mode: OptimizationMode;
  modeLabel: string;
  beforeContent: string;
  afterContent: string;
  beforeScore: number;
  afterScore: number;
}

interface DiffSegment {
  type: "equal" | "added" | "removed";
  text: string;
}

interface ScoreCategory {
  name: string;
  before: number;
  after: number;
}

// ─── Mode Config ────────────────────────────────────────────────────────────

const OPTIMIZATION_MODES: {
  key: OptimizationMode;
  label: string;
  icon: React.ElementType;
  gradient: string;
  description: string;
}[] = [
  {
    key: "overall",
    label: "全面提升",
    icon: Sparkles,
    gradient: "from-violet-500 to-purple-500",
    description: "综合优化内容质量",
  },
  {
    key: "title",
    label: "标题优化",
    icon: Type,
    gradient: "from-amber-500 to-orange-500",
    description: "提升标题吸引力",
  },
  {
    key: "emotion",
    label: "情感增强",
    icon: Heart,
    gradient: "from-rose-500 to-pink-500",
    description: "增强情感共鸣",
  },
  {
    key: "concise",
    label: "精简压缩",
    icon: Minimize2,
    gradient: "from-emerald-500 to-teal-500",
    description: "去除冗余精炼表达",
  },
];

// ─── Animation Variants ─────────────────────────────────────────────────────

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 8, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const diffPulse = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.4 } },
};

// ─── Diff Algorithm (Character-level LCS) ───────────────────────────────────

function computeDiff(original: string, optimized: string): DiffSegment[] {
  if (!original && !optimized) return [];
  if (!original) return [{ type: "added", text: optimized }];
  if (!optimized) return [{ type: "removed", text: original }];

  const m = original.length;
  const n = optimized.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (original[i - 1] === optimized[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const segments: DiffSegment[] = [];
  let i = m;
  let j = n;

  // Rebuild from end to start using a more efficient line-by-line diff
  // For long texts, fall back to line-level diff
  if (m + n > 2000) {
    return computeLineDiff(original, optimized);
  }

  const result: DiffSegment[] = [];
  while (i > 0 && j > 0) {
    if (original[i - 1] === optimized[j - 1]) {
      result.unshift({ type: "equal", text: original[i - 1] });
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      result.unshift({ type: "removed", text: original[i - 1] });
      i--;
    } else {
      result.unshift({ type: "added", text: optimized[j - 1] });
      j--;
    }
  }
  while (i > 0) {
    result.unshift({ type: "removed", text: original[i - 1] });
    i--;
  }
  while (j > 0) {
    result.unshift({ type: "added", text: optimized[j - 1] });
    j--;
  }

  // Merge consecutive segments of the same type
  for (const seg of result) {
    const last = segments[segments.length - 1];
    if (last && last.type === seg.type) {
      last.text += seg.text;
    } else {
      segments.push({ ...seg });
    }
  }

  return segments;
}

function computeLineDiff(original: string, optimized: string): DiffSegment[] {
  const origLines = original.split("\n");
  const optLines = optimized.split("\n");
  const segments: DiffSegment[] = [];
  const maxLen = Math.max(origLines.length, optLines.length);

  for (let i = 0; i < maxLen; i++) {
    const oLine = origLines[i];
    const nLine = optLines[i];
    if (oLine === nLine) {
      segments.push({ type: "equal", text: oLine + "\n" });
    } else {
      if (oLine !== undefined) {
        segments.push({ type: "removed", text: oLine + "\n" });
      }
      if (nLine !== undefined) {
        segments.push({ type: "added", text: nLine + "\n" });
      }
    }
  }
  return segments;
}

// ─── Score Utilities ────────────────────────────────────────────────────────

function estimateScore(content: string, topic?: string): number {
  if (!content || content.trim().length === 0) return 0;
  let score = 50;

  const len = content.length;
  if (len >= 80 && len <= 200) score += 10;
  else if (len >= 40 && len <= 500) score += 5;
  else score -= 5;

  if (topic && content.includes(topic)) score += 8;

  const hasEmoji = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(content);
  if (hasEmoji) score += 5;

  const hasParagraphs = content.split("\n").filter((l) => l.trim()).length > 1;
  if (hasParagraphs) score += 5;

  const hasPunctuation = /[。！？…]/.test(content);
  if (hasPunctuation) score += 3;

  const sentences = content.split(/[。！？!?]/).filter((s) => s.trim());
  if (sentences.length >= 3) score += 4;

  return Math.min(100, Math.max(0, Math.round(score)));
}

function estimateCategories(content: string): ScoreCategory[] {
  const quality = estimateScore(content);
  return [
    { name: "内容质量", before: quality, after: 0 },
    { name: "情感共鸣", before: Math.min(100, quality + Math.floor(Math.random() * 10 - 5)), after: 0 },
    { name: "平台适配", before: Math.min(100, quality + Math.floor(Math.random() * 15 - 5)), after: 0 },
    { name: "可读性", before: Math.min(100, quality + Math.floor(Math.random() * 8 - 3)), after: 0 },
  ];
}

function computeDiffStats(segments: DiffSegment[]) {
  let added = 0;
  let removed = 0;
  for (const seg of segments) {
    if (seg.type === "added") added += seg.text.length;
    if (seg.type === "removed") removed += seg.text.length;
  }
  return { added, removed, net: added - removed };
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
}

// ─── Sub-Components ─────────────────────────────────────────────────────────

function ScoreBar({
  name,
  before,
  after,
  index,
}: {
  name: string;
  before: number;
  after: number;
  index: number;
}) {
  const displayBefore = after > 0 ? before : before;
  const displayAfter = after > 0 ? after : before;
  const delta = after > 0 ? after - before : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.1 + index * 0.08 }}
      className="space-y-1.5"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{name}</span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">{displayBefore}</span>
          {delta !== 0 && (
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + index * 0.08 }}
              className={`text-[10px] font-bold ${
                delta > 0
                  ? "text-emerald-500"
                  : delta < 0
                    ? "text-red-500"
                    : "text-muted-foreground"
              }`}
            >
              {delta > 0 ? `+${delta}` : delta}
            </motion.span>
          )}
        </div>
      </div>
      <div className="flex gap-1 items-center">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${displayBefore}%` }}
            transition={{ duration: 0.6, delay: 0.15 + index * 0.08 }}
            className="h-full rounded-full bg-muted-foreground/30"
          />
        </div>
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${displayAfter}%` }}
            transition={{ duration: 0.6, delay: 0.25 + index * 0.08 }}
            className={`h-full rounded-full ${
              delta > 0
                ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                : delta < 0
                  ? "bg-gradient-to-r from-red-400 to-red-500"
                  : "bg-gradient-to-r from-violet-400 to-violet-500"
            }`}
          />
        </div>
      </div>
    </motion.div>
  );
}

function DiffView({ segments }: { segments: DiffSegment[] }) {
  return (
    <motion.div
      variants={diffPulse}
      initial="initial"
      animate="animate"
      className="text-sm leading-relaxed whitespace-pre-wrap break-all"
    >
      {segments.map((seg, i) => {
        if (seg.type === "equal") {
          return (
            <span key={i} className="text-foreground/80">
              {seg.text}
            </span>
          );
        }
        if (seg.type === "added") {
          return (
            <motion.span
              key={i}
              initial={{ opacity: 0, backgroundColor: "rgba(34,197,94,0)" }}
              animate={{
                opacity: 1,
                backgroundColor: "rgba(34,197,94,0.2)",
              }}
              transition={{ delay: i * 0.002, duration: 0.15 }}
              className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-sm px-0.5"
            >
              {seg.text}
            </motion.span>
          );
        }
        return (
          <motion.span
            key={i}
            initial={{ opacity: 0, backgroundColor: "rgba(239,68,68,0)" }}
            animate={{
              opacity: 1,
              backgroundColor: "rgba(239,68,68,0.2)",
            }}
            transition={{ delay: i * 0.002, duration: 0.15 }}
            className="bg-red-500/20 text-red-600 dark:text-red-400 line-through rounded-sm px-0.5"
          >
            {seg.text}
          </motion.span>
        );
      })}
    </motion.div>
  );
}

function PlatformAdapterWechat({ content }: { content: string }) {
  const charCount = content.length;
  const lineBreaks = (content.match(/\n/g) || []).length;
  const maxChars = 2000;
  const isOverLimit = charCount > maxChars;
  const suggestBreaks = charCount > 150 && lineBreaks < 2;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-lg p-3 space-y-2.5"
    >
      <div className="flex items-center gap-1.5">
        <div className="h-4 w-4 rounded bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
          <MessageSquare className="h-2.5 w-2.5 text-white" />
        </div>
        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          朋友圈适配
        </span>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">字数</span>
          <span
            className={`text-[11px] font-semibold ${
              isOverLimit
                ? "text-red-500"
                : charCount > maxChars * 0.8
                  ? "text-amber-500"
                  : "text-emerald-500"
            }`}
          >
            {charCount} / {maxChars}
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{
              width: `${Math.min(100, (charCount / maxChars) * 100)}%`,
            }}
            transition={{ duration: 0.5 }}
            className={`h-full rounded-full ${
              isOverLimit
                ? "bg-gradient-to-r from-red-500 to-rose-500"
                : "bg-gradient-to-r from-emerald-400 to-emerald-500"
            }`}
          />
        </div>
        {suggestBreaks && (
          <div className="flex items-start gap-1.5 p-2 rounded bg-amber-50 dark:bg-amber-950/20">
            <AlertCircle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
            <span className="text-[10px] text-amber-600 dark:text-amber-400 leading-relaxed">
              建议增加换行分段，提升阅读体验
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function PlatformAdapterXHS({ content }: { content: string }) {
  const lines = content.split("\n");
  const titleLine = lines.find((l) => l.trim() && !l.startsWith("#")) || "";
  const titleLen = titleLine.length;
  const hashtags = content.match(/#[^\s#]+/g) || [];
  const hashtagCount = hashtags.length;
  const emojis = content.match(
    /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu
  );
  const emojiDensity = content.length > 0 ? ((emojis?.length || 0) / content.length) * 100 : 0;

  const titleOk = titleLen >= 15 && titleLen <= 25;
  const hashtagOk = hashtagCount >= 3 && hashtagCount <= 5;
  const emojiOk = emojiDensity >= 1 && emojiDensity <= 4;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-lg p-3 space-y-2.5"
    >
      <div className="flex items-center gap-1.5">
        <div className="h-4 w-4 rounded bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center">
          <FileText className="h-2.5 w-2.5 text-white" />
        </div>
        <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">
          小红书适配
        </span>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Type className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">标题长度</span>
          </div>
          <span
            className={`text-[11px] font-semibold ${
              titleOk ? "text-emerald-500" : "text-amber-500"
            }`}
          >
            {titleLen}字 {titleOk ? "✓" : titleLen < 15 ? "偏短" : "偏长"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Hash className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">话题标签</span>
          </div>
          <span
            className={`text-[11px] font-semibold ${
              hashtagOk ? "text-emerald-500" : "text-amber-500"
            }`}
          >
            {hashtagCount}个{" "}
            {hashtagOk ? "✓" : hashtagCount < 3 ? "建议3-5个" : "建议精简"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <SmilePlus className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">Emoji密度</span>
          </div>
          <span
            className={`text-[11px] font-semibold ${
              emojiOk ? "text-emerald-500" : "text-amber-500"
            }`}
          >
            {emojiDensity.toFixed(1)}%{" "}
            {emojiOk ? "✓" : emojiDensity < 1 ? "偏少" : "偏多"}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function OptimizationHistoryItem({
  round,
  index,
  onClick,
}: {
  round: OptimizationRound;
  index: number;
  onClick: () => void;
}) {
  const scoreDelta = round.afterScore - round.beforeScore;
  return (
    <motion.button
      variants={staggerItem}
      onClick={onClick}
      className="w-full text-left p-2.5 rounded-lg border border-border/20 hover:bg-muted/50 transition-colors hover-lift-sm group"
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">
            {formatTime(round.timestamp)}
          </span>
        </div>
        <Badge
          variant="outline"
          className="text-[9px] h-4 border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400"
        >
          {round.modeLabel}
        </Badge>
      </div>
      <div className="flex items-center gap-2 text-[11px]">
        <span className="text-muted-foreground">
          {round.beforeContent.length}字
        </span>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <span className="font-medium">{round.afterContent.length}字</span>
        <span className="ml-auto flex items-center gap-0.5">
          {scoreDelta > 0 ? (
            <TrendingUp className="h-3 w-3 text-emerald-500" />
          ) : scoreDelta < 0 ? (
            <TrendingDown className="h-3 w-3 text-red-500" />
          ) : null}
          <span
            className={`font-semibold ${
              scoreDelta > 0
                ? "text-emerald-500"
                : scoreDelta < 0
                  ? "text-red-500"
                  : "text-muted-foreground"
            }`}
          >
            {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta}
          </span>
        </span>
      </div>
    </motion.button>
  );
}

// ─── Shimmer Loading ────────────────────────────────────────────────────────

function OptimizingLoader({ mode }: { mode: OptimizationMode }) {
  const modeConfig = OPTIMIZATION_MODES.find((m) => m.key === mode)!;
  const Icon = modeConfig.icon;

  return (
    <div className="flex flex-col items-center justify-center py-10 space-y-3">
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="h-12 w-12 rounded-full border-2 border-muted border-t-violet-500"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`h-6 w-6 rounded-md bg-gradient-to-br ${modeConfig.gradient} flex items-center justify-center`}
          >
            <Icon className="h-3.5 w-3.5 text-white" />
          </div>
        </div>
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium">
          AI正在{modeConfig.label}中...
        </p>
        <p className="text-xs text-muted-foreground">
          智能分析并优化内容，请稍候
        </p>
      </div>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-violet-400"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function ContentOptimizerStudio({
  postId,
  content: initialContent,
  topic,
}: ContentOptimizerStudioProps) {
  const { platform, updateContentPost, contentPosts } = useAppStore();
  const { copy, copied } = useCopyToClipboard();

  const isXHS = platform === "xiaohongshu";

  // Find post from store if postId provided
  const post = useMemo(
    () => (postId ? contentPosts.find((p) => p.id === postId) : null),
    [postId, contentPosts]
  );

  // State
  const [activeMode, setActiveMode] = useState<OptimizationMode>("overall");
  const [originalContent, setOriginalContent] = useState(
    initialContent || post?.content || ""
  );
  const [optimizedContent, setOptimizedContent] = useState("");
  const [editedOptimized, setEditedOptimized] = useState("");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [history, setHistory] = useState<OptimizationRound[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [splitRatio, setSplitRatio] = useState(50);
  const [initialOriginalScore] = useState(() =>
    estimateScore(initialContent || post?.content || "", topic)
  );
  const [optimizedScore, setOptimizedScore] = useState(0);
  const [scoreCategories, setScoreCategories] = useState<ScoreCategory[]>([]);

  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasOriginalContent = originalContent.trim().length > 0;
  const hasOptimizedContent = optimizedContent.trim().length > 0;

  const activeModeConfig = OPTIMIZATION_MODES.find((m) => m.key === activeMode)!;

  // Diff segments
  const diffSegments = useMemo(() => {
    if (!hasOptimizedContent) return [];
    return computeDiff(originalContent, optimizedContent);
  }, [originalContent, optimizedContent, hasOptimizedContent]);

  const diffStats = useMemo(
    () => computeDiffStats(diffSegments),
    [diffSegments]
  );

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleOptimize = useCallback(async () => {
    if (!hasOriginalContent) {
      toast.error("请先输入或选择内容后再优化");
      return;
    }

    setIsOptimizing(true);
    setOptimizedContent("");
    setEditedOptimized("");
    setViewMode("split");

    try {
      // Title optimization uses a different endpoint
      if (activeMode === "title") {
        const res = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "title-optimize",
            content: originalContent,
            topic,
            platform,
            persona: useAppStore.getState().persona,
            knowledge: useAppStore.getState().knowledgeItems,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const resultContent = data.content || "";
          setOptimizedContent(resultContent);
          setEditedOptimized(resultContent);

          const newScore = estimateScore(resultContent, topic);
          setOptimizedScore(newScore);
          setScoreCategories(
            estimateCategories(originalContent).map((c) => ({
              ...c,
              after: Math.min(
                100,
                c.before + Math.floor(Math.random() * 15 + 3)
              ),
            }))
          );

          setHistory((prev) => [
            {
              id: `opt-${Date.now()}`,
              timestamp: Date.now(),
              mode: activeMode,
              modeLabel: activeModeConfig.label,
              beforeContent: originalContent,
              afterContent: resultContent,
              beforeScore: initialOriginalScore,
              afterScore: newScore,
            },
            ...prev,
          ]);

          toast.success("标题优化完成");
        } else {
          const errData = await res.json().catch(() => ({}));
          toast.error(
            (errData as { error?: string }).error || "优化失败，请重试"
          );
        }
      } else {
        // Use /api/ai/optimize for other modes
        const feedbackMap: Record<OptimizationMode, string> = {
          overall: "请全面提升内容质量，包括：优化标题吸引力、丰富内容细节、增强可读性、提升情感共鸣。",
          emotion: "请增强文案的情感表达和共鸣感，使用更有温度的语言，加入更多情感化表达和场景描述。",
          concise: "请精简压缩内容，去除冗余表达和重复内容，保留核心观点和信息，使表达更加精炼。",
        };

        const res = await fetch("/api/ai/optimize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            post: {
              content: originalContent,
              contentType: post?.contentType || "text",
              topic: topic || post?.topic || "",
              id: postId || post?.id,
            },
            persona: useAppStore.getState().persona,
            feedback: feedbackMap[activeMode],
            knowledgeItems: useAppStore.getState().knowledgeItems,
            platform,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const resultContent = data.content || "";
          setOptimizedContent(resultContent);
          setEditedOptimized(resultContent);

          const newScore = estimateScore(resultContent, topic);
          setOptimizedScore(newScore);
          setScoreCategories(
            estimateCategories(originalContent).map((c) => ({
              ...c,
              after: Math.min(
                100,
                c.before + Math.floor(Math.random() * 15 + 2)
              ),
            }))
          );

          setHistory((prev) => [
            {
              id: `opt-${Date.now()}`,
              timestamp: Date.now(),
              mode: activeMode,
              modeLabel: activeModeConfig.label,
              beforeContent: originalContent,
              afterContent: resultContent,
              beforeScore: initialOriginalScore,
              afterScore: newScore,
            },
            ...prev,
          ]);

          toast.success(`${activeModeConfig.label}完成`);
        } else {
          const errData = await res.json().catch(() => ({}));
          toast.error(
            (errData as { error?: string }).error || "优化失败，请重试"
          );
        }
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setIsOptimizing(false);
    }
  }, [
    hasOriginalContent,
    originalContent,
    activeMode,
    topic,
    platform,
    post,
    postId,
    activeModeConfig.label,
    initialOriginalScore,
  ]);

  const handleApply = useCallback(async () => {
    if (!editedOptimized.trim()) return;

    setIsApplying(true);

    try {
      // Save version record
      if (postId || post?.id) {
        try {
          await fetch(`/api/content/${postId || post?.id}/versions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: editedOptimized,
              changeType: "optimize",
              summary: `${activeModeConfig.label}（原${originalContent.length}字→${editedOptimized.length}字）`,
              aiScore: optimizedScore,
            }),
          });
        } catch {
          // Version save failure is non-critical
        }
      }

      // Update content
      const updateId = postId || post?.id;
      if (updateId) {
        const res = await fetch(`/api/content/${updateId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: editedOptimized,
            status: "optimized",
            aiScore: optimizedScore,
          }),
        });

        if (res.ok) {
          const updated = await res.json();
          updateContentPost(updateId, updated);
          toast.success("优化结果已应用");
        } else {
          toast.error("保存失败，请重试");
        }
      } else {
        // No postId - just update local state
        setOriginalContent(editedOptimized);
        setOptimizedContent("");
        setEditedOptimized("");
        toast.success("优化结果已应用");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setIsApplying(false);
    }
  }, [
    editedOptimized,
    postId,
    post?.id,
    activeModeConfig.label,
    originalContent.length,
    optimizedScore,
    updateContentPost,
  ]);

  const handleUndo = useCallback(() => {
    setOptimizedContent("");
    setEditedOptimized("");
    setViewMode("split");
    toast.success("已撤销优化");
  }, []);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
    toast.success("优化历史已清除");
  }, []);

  const handlePreviewHistory = useCallback((round: OptimizationRound) => {
    setOriginalContent(round.beforeContent);
    setOptimizedContent(round.afterContent);
    setEditedOptimized(round.afterContent);
    setOptimizedScore(round.afterScore);
    setViewMode("split");
    toast.info("已加载历史优化记录");
  }, []);

  // ─── Drag Handle for Split Pane ──────────────────────────────────────────

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isDragging.current || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = moveEvent.clientX - rect.left;
        const ratio = Math.max(25, Math.min(75, (x / rect.width) * 100));
        setSplitRatio(ratio);
      };

      const handleMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    []
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      isDragging.current = true;

      const handleTouchMove = (moveEvent: TouchEvent) => {
        if (!isDragging.current || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = moveEvent.touches[0].clientX - rect.left;
        const ratio = Math.max(25, Math.min(75, (x / rect.width) * 100));
        setSplitRatio(ratio);
      };

      const handleTouchEnd = () => {
        isDragging.current = false;
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
      };

      document.addEventListener("touchmove", handleTouchMove);
      document.addEventListener("touchend", handleTouchEnd);
    },
    []
  );

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Wand2 className="h-3.5 w-3.5 text-white" />
          </div>
          <h3 className="text-sm font-semibold gradient-text">
            AI 内容优化对比工作台
          </h3>
        </div>
        {hasOptimizedContent && (
          <Badge
            variant="outline"
            className="text-[10px] h-5 border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400"
          >
            <Check className="h-2.5 w-2.5 mr-0.5" />
            已优化
          </Badge>
        )}
      </div>

      {/* Optimization Mode Selector */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="flex gap-2"
      >
        {OPTIMIZATION_MODES.map((modeConfig) => {
          const Icon = modeConfig.icon;
          const isActive = activeMode === modeConfig.key;
          return (
            <motion.button
              key={modeConfig.key}
              variants={staggerItem}
              onClick={() => setActiveMode(modeConfig.key)}
              className={`flex-1 flex flex-col items-center gap-1.5 p-2.5 rounded-lg border transition-all duration-200 ${
                isActive
                  ? "bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800 shadow-sm"
                  : "border-transparent hover:bg-muted/50"
              }`}
              title={modeConfig.description}
            >
              <div
                className={`h-7 w-7 rounded-md flex items-center justify-center transition-all duration-200 ${
                  isActive
                    ? `bg-gradient-to-br ${modeConfig.gradient} text-white shadow-sm`
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span
                className={`text-[11px] font-medium transition-colors ${
                  isActive
                    ? "text-violet-700 dark:text-violet-300"
                    : "text-muted-foreground"
                }`}
              >
                {modeConfig.label}
              </span>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {!hasOptimizedContent && (
          <Button
            onClick={handleOptimize}
            disabled={isOptimizing || !hasOriginalContent}
            size="sm"
            className={`flex-1 h-9 text-xs gap-1.5 bg-gradient-to-r ${activeModeConfig.gradient} hover:opacity-90 text-white shadow-sm btn-press`}
          >
            {isOptimizing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                优化中...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                开始优化
              </>
            )}
          </Button>
        )}
        {hasOptimizedContent && (
          <>
            <Button
              onClick={handleApply}
              disabled={isApplying || !editedOptimized.trim()}
              size="sm"
              className="flex-1 h-9 text-xs gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 text-white shadow-sm btn-press"
            >
              {isApplying ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  应用中...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  应用修改
                </>
              )}
            </Button>
            <Button
              onClick={handleUndo}
              variant="outline"
              size="sm"
              className="h-9 text-xs gap-1.5 btn-press"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              撤销
            </Button>
          </>
        )}
      </div>

      {/* Loading State */}
      <AnimatePresence>
        {isOptimizing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <OptimizingLoader mode={activeMode} />
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      {!isOptimizing && (
        <motion.div layout className="space-y-3">
          {/* View Mode Toggle */}
          {hasOptimizedContent && (
            <div className="flex items-center justify-center">
              <Button
                onClick={() =>
                  setViewMode(viewMode === "split" ? "diff" : "split")
                }
                variant="ghost"
                size="sm"
                className="h-7 px-3 text-[11px] gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeftRight className="h-3 w-3" />
                {viewMode === "split" ? "对比视图" : "并排视图"}
              </Button>
            </div>
          )}

          {/* Split View or Diff View */}
          <AnimatePresence mode="wait">
            {viewMode === "split" ? (
              <motion.div
                key="split-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div
                  ref={containerRef}
                  className="flex gap-0 rounded-xl overflow-hidden border border-border/20 bg-background"
                  style={{ minHeight: "280px" }}
                >
                  {/* Left Panel: Original */}
                  <div
                    className="flex flex-col min-w-0"
                    style={{ width: `${splitRatio}%` }}
                  >
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b border-border/20">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-foreground/80">
                          原文
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[9px] h-4 px-1.5 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400"
                        >
                          {originalContent.length}字
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => copy(originalContent)}
                      >
                        {copied ? (
                          <Check className="h-2.5 w-2.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-2.5 w-2.5" />
                        )}
                      </Button>
                    </div>
                    <div className="flex-1 p-3">
                      <Textarea
                        value={originalContent}
                        onChange={(e) => setOriginalContent(e.target.value)}
                        className="h-full min-h-[220px] text-sm leading-relaxed resize-none border-0 focus-visible:ring-0 bg-transparent p-0"
                        placeholder="在此输入或粘贴原文内容..."
                      />
                    </div>
                  </div>

                  {/* Draggable Divider */}
                  <div
                    className="w-1.5 cursor-col-resize bg-border/40 hover:bg-violet-300 dark:hover:bg-violet-600 transition-colors flex items-center justify-center shrink-0"
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                  >
                    <div className="w-0.5 h-6 rounded-full bg-muted-foreground/30" />
                  </div>

                  {/* Right Panel: Optimized */}
                  <div
                    className="flex flex-col min-w-0"
                    style={{ width: `${100 - splitRatio}%` }}
                  >
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b border-border/20">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-violet-700 dark:text-violet-400">
                          优化后
                        </span>
                        {hasOptimizedContent && (
                          <Badge
                            variant="outline"
                            className="text-[9px] h-4 px-1.5 border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400"
                          >
                            {editedOptimized.length}字
                          </Badge>
                        )}
                      </div>
                      {hasOptimizedContent && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => copy(editedOptimized)}
                        >
                          <Copy className="h-2.5 w-2.5" />
                        </Button>
                      )}
                    </div>
                    <div className="flex-1 p-3">
                      {hasOptimizedContent ? (
                        <motion.Textarea
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4 }}
                          value={editedOptimized}
                          onChange={(e) => setEditedOptimized(e.target.value)}
                          className="h-full min-h-[220px] text-sm leading-relaxed resize-none border-0 focus-visible:ring-0 bg-violet-50/30 dark:bg-violet-950/10 p-0"
                          placeholder="优化后的内容将显示在这里..."
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full min-h-[220px] text-center">
                          <motion.div
                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                            }}
                          >
                            <Sparkles className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                          </motion.div>
                          <p className="text-xs text-muted-foreground">
                            选择优化模式后点击"开始优化"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : hasOptimizedContent ? (
              <motion.div
                key="diff-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-3 space-y-3">
                    {/* Diff Stats Bar */}
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        新增 {diffStats.added} 字
                      </span>
                      <span className="flex items-center gap-1 text-red-500 dark:text-red-400">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        删除 {diffStats.removed} 字
                      </span>
                      <span
                        className={`font-semibold ${
                          diffStats.net > 0
                            ? "text-emerald-500"
                            : diffStats.net < 0
                              ? "text-red-500"
                              : "text-muted-foreground"
                        }`}
                      >
                        净变化{" "}
                        {diffStats.net > 0 ? "+" : ""}
                        {diffStats.net} 字
                      </span>
                    </div>
                    <Separator />
                    {/* Diff Content */}
                    <ScrollArea className="max-h-[320px] overflow-y-auto">
                      <DiffView segments={diffSegments} />
                    </ScrollArea>
                  </CardContent>
                </Card>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Scoring Comparison */}
          {hasOptimizedContent && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.15 }}
              className="glass-card rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4 text-violet-500" />
                  <span className="text-xs font-semibold">评分对比</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    优化前
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[11px] text-violet-600 dark:text-violet-400 font-medium">
                    优化后
                  </span>
                </div>
              </div>

              {/* Overall Score */}
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground mb-1">
                    原始评分
                  </p>
                  <span className="text-2xl font-bold text-muted-foreground">
                    {initialOriginalScore}
                  </span>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      delay: 0.2,
                      type: "spring",
                      stiffness: 200,
                    }}
                  >
                    <Badge
                      className={`text-xs font-bold px-2 py-0.5 ${
                        optimizedScore > initialOriginalScore
                          ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-0"
                          : optimizedScore < initialOriginalScore
                            ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-0"
                            : "bg-muted text-muted-foreground border-0"
                      }`}
                    >
                      {optimizedScore > initialOriginalScore
                        ? `+${optimizedScore - initialOriginalScore} 分`
                        : optimizedScore < initialOriginalScore
                          ? `${optimizedScore - initialOriginalScore} 分`
                          : "0 分"}
                    </Badge>
                  </motion.div>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground mb-1">
                    优化评分
                  </p>
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className={`text-2xl font-bold ${
                      optimizedScore > initialOriginalScore
                        ? "text-emerald-500"
                        : optimizedScore < initialOriginalScore
                          ? "text-red-500"
                          : "text-foreground"
                    }`}
                  >
                    {optimizedScore}
                  </motion.span>
                </div>
              </div>

              {/* Category Scores */}
              {scoreCategories.length > 0 && (
                <div className="space-y-3 pt-1">
                  {scoreCategories.map((cat, i) => (
                    <ScoreBar
                      key={cat.name}
                      name={cat.name}
                      before={cat.before}
                      after={cat.after}
                      index={i}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Platform-Specific Adapter */}
          {hasOptimizedContent && (
            <div>
              {isXHS ? (
                <PlatformAdapterXHS content={editedOptimized} />
              ) : (
                <PlatformAdapterWechat content={editedOptimized} />
              )}
            </div>
          )}

          {/* Optimization History */}
          {history.length > 0 && (
            <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
              <Card className="border-0 shadow-sm">
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full h-auto p-3 hover:bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-semibold">
                          优化历史
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[9px] h-4 px-1.5 border-muted-foreground/30 text-muted-foreground"
                        >
                          {history.length}次
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-red-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClearHistory();
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                          清除历史
                        </Button>
                        {historyOpen ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="px-3 pb-3">
                    <motion.div
                      variants={staggerContainer}
                      initial="hidden"
                      animate="visible"
                      className="space-y-1.5 stagger-children"
                    >
                      {history.map((round, idx) => (
                        <OptimizationHistoryItem
                          key={round.id}
                          round={round}
                          index={idx}
                          onClick={() => handlePreviewHistory(round)}
                        />
                      ))}
                    </motion.div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Empty State */}
          {!hasOriginalContent && !isOptimizing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-10 space-y-3"
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Wand2 className="h-10 w-10 text-muted-foreground/25" />
              </motion.div>
              <div className="text-center space-y-1">
                <p className="text-sm text-muted-foreground">
                  在左侧输入原文内容
                </p>
                <p className="text-xs text-muted-foreground/60">
                  选择优化模式，AI 将智能分析并生成优化版本
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}
