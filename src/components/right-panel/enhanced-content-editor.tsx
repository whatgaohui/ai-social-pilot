"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import type { ContentPost } from "@/types";
import {
  Copy,
  Edit3,
  Check,
  Bold,
  Italic,
  Smile,
  WrapText,
  Hash,
  Eraser,
  Loader2,
  CheckCircle2,
  Clock,
  Circle,
  Undo2,
  Redo2,
  Search,
  X,
  Type,
  Sparkles,
  ArrowDownToLine,
  ChevronDown,
  Heart,
  Hand,
  Leaf,
  Utensils,
  PartyPopper,
  Briefcase,
  CircleDot,
} from "lucide-react";
import { toast } from "sonner";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { useAppStore } from "@/store/app-store";

// ─── Emoji Data (inline compact set) ────────────────────────────────────────

interface EmojiCategory {
  id: string;
  label: string;
  icon: React.ElementType;
  emojis: string[];
  keywords: Record<string, string[]>;
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: "recent",
    label: "最近",
    icon: Clock,
    emojis: [],
    keywords: {},
  },
  {
    id: "expressions",
    label: "表情",
    icon: Smile,
    emojis: [
      "😊", "😂", "🤣", "😍", "🥰", "😘", "😎", "🤔", "😅", "😁",
      "😜", "🤗", "😇", "🙄", "😌", "😏", "😢", "🥺", "😤", "🤭",
      "🥱", "😴", "🤩", "😇", "🤪", "🫠", "😇", "😏", "🥳", "😋",
    ],
    keywords: {
      "开心": ["😊", "😂", "🤣", "😄", "😁"],
      "喜欢": ["😍", "🥰", "😘", "😋", "🤗"],
      "酷": ["😎", "🤩", "😌"],
      "可爱": ["🥺", "🥰", "😍", "🤗"],
      "思考": ["🤔", "😏"],
      "哭": ["😢", "😭"],
      "生气": ["😤", "😡"],
    },
  },
  {
    id: "gestures",
    label: "手势",
    icon: Hand,
    emojis: [
      "👍", "👏", "🙌", "🤝", "✌️", "🤞", "👌", "🤙", "✊", "👊",
      "💪", "🫶", "👋", "👆", "👇", "👈", "👉", "☝️", "🫵", "🙏",
      "🤟", "🤘", "🤌", "👊", "✋", "🤚", "🖐️", "🤲", "🙏", "💅",
    ],
    keywords: {
      "好": ["👍", "👌", "👏", "💪"],
      "加油": ["💪", "✊", "👏", "🙌"],
      "鼓掌": ["👏", "🙌"],
      "你好": ["👋", "🤝"],
      "厉害": ["💪", "👏", "🤩"],
      "OK": ["👌", "👍", "✅"],
    },
  },
  {
    id: "hearts",
    label: "心形",
    icon: Heart,
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💕",
      "💖", "💗", "💘", "💝", "💓", "💞", "❣️", "🫶", "💟", "♥️",
      "❤️‍🔥", "🫀", "❤️‍🩹", "💓", "💝", "💕", "💖", "💗", "💘", "💌",
    ],
    keywords: {
      "开心": ["❤️", "💕", "💖"],
      "喜欢": ["❤️", "💕", "💖", "💗"],
      "爱": ["❤️", "💕", "💘", "💝"],
    },
  },
  {
    id: "nature",
    label: "自然",
    icon: Leaf,
    emojis: [
      "🌸", "🌹", "🌺", "🌻", "🌷", "🌼", "💐", "🌱", "🌿", "🍀",
      "🌈", "⭐", "🌟", "✨", "💫", "🌙", "☀️", "🍀", "🌿", "🍂",
      "🍁", "❄️", "🌊", "🔥", "💧", "🍃", "🌾", "🌳", "🌿", "🍀",
    ],
    keywords: {
      "花": ["🌸", "🌹", "🌺", "🌻"],
      "春天": ["🌸", "🌱", "🌿"],
      "好看": ["✨", "🌟", "🌈", "🌸"],
      "太阳": ["☀️", "🌟"],
      "月亮": ["🌙", "⭐"],
    },
  },
  {
    id: "food",
    label: "食物",
    icon: Utensils,
    emojis: [
      "☕", "🍵", "🧋", "🍰", "🎂", "🧁", "🍩", "🍪", "🍫", "🍜",
      "🍕", "🍔", "🍣", "🍲", "🥗", "🍰", "🎂", "🍫", "🍦", "🧃",
      "🍷", "🍺", "🥂", "🍿", "🍩", "🍪", "🍭", "🍬", "🍇", "🍓",
    ],
    keywords: {
      "喝": ["☕", "🍵", "🧋", "🥤"],
      "吃": ["🍜", "🍕", "🍔", "🍣"],
      "甜": ["🍰", "🧁", "🍩", "🍪"],
      "咖啡": ["☕"],
      "奶茶": ["🧋"],
    },
  },
  {
    id: "celebration",
    label: "庆祝",
    icon: PartyPopper,
    emojis: [
      "🎉", "🎊", "🥳", "🎈", "🎆", "🎇", "🏆", "🥇", "💯", "🔥",
      "✨", "⚡", "💥", "🌟", "💪", "🎆", "🧨", "🪅", "🎊", "🎉",
      "🥂", "🍾", "🎁", "🎀", "🎵", "🎶", "🎤", "🪩", "💃", "🕺",
    ],
    keywords: {
      "开心": ["🎉", "🎊", "🥳", "🎈"],
      "厉害": ["🔥", "💯", "⚡", "🏆"],
      "庆祝": ["🎉", "🎊", "🥳", "🥂"],
      "成功": ["🏆", "💯", "🎉", "🔥"],
    },
  },
  {
    id: "work",
    label: "工作",
    icon: Briefcase,
    emojis: [
      "💡", "📝", "✏️", "📚", "💻", "📱", "🎯", "📌", "💼", "🎓",
      "🏆", "💰", "✈️", "📸", "🎨", "🔑", "📈", "📊", "🔬", "🔧",
      "⚙️", "🖥️", "⌨️", "💡", "📞", "📡", "🧲", "🧪", "🧮", "📐",
    ],
    keywords: {
      "学习": ["📚", "📝", "✏️", "🎓"],
      "工作": ["💻", "💼", "📝"],
      "拍照": ["📸", "📱"],
      "思考": ["💡", "🤔", "📝"],
    },
  },
  {
    id: "symbols",
    label: "符号",
    icon: CircleDot,
    emojis: [
      "✅", "❌", "⭕", "❗", "❓", "➕", "➖", "💯", "💯", "⭐",
      "🔥", "💡", "📌", "🎯", "🚀", "💎", "👑", "🔔", "📢", "💬",
      "💭", "💤", "🔍", "⚠️", "♻️", "🆕", "🆗", "🙋", "🤝", "💪",
    ],
    keywords: {
      "对": ["✅", "⭕"],
      "错": ["❌", "❗"],
      "新": ["🆕", "✨"],
      "重要": ["❗", "⚠️", "📌", "📢"],
    },
  },
];

// ─── Recent Emojis Storage ──────────────────────────────────────────────────

const RECENT_STORAGE_KEY = "editor-emoji-recent";
const MAX_RECENT = 16;

function getRecentEmojis(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentEmojis(emojis: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(emojis.slice(0, MAX_RECENT)));
  } catch {
    // ignore
  }
}

function addRecentEmoji(emoji: string) {
  const recent = getRecentEmojis();
  const filtered = recent.filter((e) => e !== emoji);
  saveRecentEmojis([emoji, ...filtered]);
}

// ─── Content Type Templates ─────────────────────────────────────────────────

const OPENING_FORMULAS = [
  "今天想和大家分享一个秘密…",
  "你一定不知道，其实…",
  "每次看到这个，我都会…",
  "被问得最多的一个问题…",
  "终于可以说了！",
];

const CLOSING_CTAS = [
  "👇 你觉得呢？评论区告诉我～",
  "觉得有用？收藏+关注不迷路 ❤️",
  "转发给需要的人吧 ✨",
  "关注我，下期更精彩 🚀",
  "点赞过100就更新下集 🎉",
];

// ─── Word Count / Writing Goal Helpers ──────────────────────────────────────

const CHARS_PER_MIN = 400;

interface WritingGoalConfig {
  min: number;
  optimal: number;
  max: number;
  label: string;
}

const PLATFORM_GOALS: Record<string, WritingGoalConfig> = {
  wechat: { min: 50, optimal: 150, max: 400, label: "朋友圈" },
  xiaohongshu: { min: 200, optimal: 400, max: 800, label: "小红书" },
};

function getWritingGoalStatus(
  count: number,
  config: WritingGoalConfig,
): {
  color: string;
  barColor: string;
  bgClass: string;
  text: string;
  progress: number;
} {
  const { min, optimal, max } = config;

  if (count === 0) {
    return { color: "text-muted-foreground", barColor: "bg-muted", bgClass: "", text: "开始写作吧！", progress: 0 };
  }

  const progress = Math.min(100, (count / max) * 100);

  if (count < min * 0.5) {
    return { color: "text-red-500", barColor: "bg-red-500", bgClass: "bg-red-50 dark:bg-red-950/30", text: `再写 ${Math.ceil(min - count)} 字就达标了！`, progress };
  }
  if (count < min) {
    return { color: "text-amber-500", barColor: "bg-amber-500", bgClass: "bg-amber-50 dark:bg-amber-950/30", text: `再写 ${Math.ceil(min - count)} 字就达标了！`, progress };
  }
  if (count >= min && count <= max) {
    return { color: "text-emerald-500", barColor: "bg-emerald-500", bgClass: "bg-emerald-50 dark:bg-emerald-950/30", text: "字数完美！", progress };
  }
  // Over max
  return { color: "text-amber-500", barColor: "bg-amber-400", bgClass: "bg-amber-50 dark:bg-amber-950/30", text: "稍微精简一下？", progress };
}

// ─── Auto-save Types ────────────────────────────────────────────────────────

type SaveStatus = "saved" | "saving" | "unsaved" | "idle";

// ─── Save Status Indicator ──────────────────────────────────────────────────

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;

  return (
    <div className="flex items-center gap-1">
      <AnimatePresence mode="wait">
        {status === "saved" && (
          <motion.span
            key="saved"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 4 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1 text-[10px] text-emerald-500"
          >
            <CheckCircle2 className="h-3 w-3" />
            已保存
          </motion.span>
        )}
        {status === "saving" && (
          <motion.span
            key="saving"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 4 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1 text-[10px] text-muted-foreground"
          >
            <Loader2 className="h-3 w-3 animate-spin" />
            保存中...
          </motion.span>
        )}
        {status === "unsaved" && (
          <motion.span
            key="unsaved"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 4 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1 text-[10px] text-amber-500"
          >
            <Circle className="h-2 w-2 fill-amber-500" />
            未保存
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Score Badge ────────────────────────────────────────────────────────────

function getScoreConfig(score: number) {
  if (score >= 85) return { label: "优秀", gradient: "from-emerald-500 to-teal-400", ring: "ring-emerald-500/30" };
  if (score >= 70) return { label: "良好", gradient: "from-teal-500 to-cyan-400", ring: "ring-teal-500/30" };
  if (score >= 50) return { label: "中等", gradient: "from-amber-500 to-yellow-400", ring: "ring-amber-500/30" };
  return { label: "待改进", gradient: "from-rose-500 to-pink-400", ring: "ring-rose-500/30" };
}

function ScoreBadge({
  score,
  onClick,
}: {
  score: number;
  onClick: () => void;
}) {
  const config = getScoreConfig(score);
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
      onClick={onClick}
      className={`relative flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r ${config.gradient} text-white text-[10px] font-semibold shadow-sm hover:shadow-md transition-shadow cursor-pointer ring-2 ${config.ring}`}
      title="点击查看评分详情"
    >
      <span>{score}</span>
      <span className="opacity-90">{config.label}</span>
    </motion.button>
  );
}

// ─── Inline Emoji Picker Component ──────────────────────────────────────────

function InlineEmojiPicker({
  onSelect,
  isOpen,
  onClose,
}: {
  onSelect: (emoji: string) => void;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [activeCategory, setActiveCategory] = useState("recent");
  const [searchQuery, setSearchQuery] = useState("");
  const [recentEmojis] = useState<string[]>(() => getRecentEmojis());
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      const id = setTimeout(() => searchInputRef.current?.focus(), 100);
      return () => clearTimeout(id);
    }
  }, [isOpen]);

  const handleSelect = useCallback(
    (emoji: string) => {
      addRecentEmoji(emoji);
      onSelect(emoji);
    },
    [onSelect],
  );

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.trim().toLowerCase();
    const results: string[] = [];
    const seen = new Set<string>();

    for (const cat of EMOJI_CATEGORIES) {
      for (const [keyword, emojis] of Object.entries(cat.keywords)) {
        if (keyword.includes(query) || query.includes(keyword)) {
          for (const emoji of emojis) {
            if (!seen.has(emoji)) {
              results.push(emoji);
              seen.add(emoji);
            }
          }
        }
      }
    }
    return results.slice(0, 40);
  }, [searchQuery]);

  const displayEmojis = useMemo(() => {
    if (searchResults !== null) return searchResults;
    if (activeCategory === "recent") return recentEmojis;
    const cat = EMOJI_CATEGORIES.find((c) => c.id === activeCategory);
    return cat?.emojis || [];
  }, [activeCategory, searchResults, recentEmojis]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -4, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.97 }}
          transition={{ duration: 0.15 }}
          className="inline-emoji-picker absolute bottom-full left-0 right-0 z-50 mb-1 rounded-lg border border-border/20 bg-popover p-2 shadow-lg"
        >
          {/* Search */}
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索表情…"
              className="h-7 pl-7 pr-7 text-xs"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  searchInputRef.current?.focus();
                }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-0.5 mb-2 overflow-x-auto scrollbar-none pb-0.5">
            {EMOJI_CATEGORIES.filter((c) => c.id !== "recent" || recentEmojis.length > 0).map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id && !searchQuery;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setSearchQuery("");
                  }}
                  className={`flex-shrink-0 flex items-center gap-1 px-1.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
                    isActive
                      ? "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  <span className="hidden sm:inline">{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Emoji Grid */}
          <ScrollArea className="h-[160px]">
            <div className="grid grid-cols-8 gap-0.5 px-1">
              {searchResults !== null && searchResults.length === 0 && (
                <div className="col-span-8 py-6 text-center">
                  <p className="text-xs text-muted-foreground">
                    没有找到 &quot;{searchQuery}&quot; 相关的表情
                  </p>
                </div>
              )}
              {!searchQuery && activeCategory === "recent" && recentEmojis.length === 0 && (
                <div className="col-span-8 py-6 text-center">
                  <Smile className="h-6 w-6 text-muted-foreground/30 mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground">还没有使用过的表情</p>
                </div>
              )}
              {displayEmojis.map((emoji, idx) => (
                <motion.button
                  key={`${activeCategory}-${emoji}-${idx}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.1,
                    delay: Math.min(idx * 0.01, 0.2),
                  }}
                  whileHover={{ scale: 1.25 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleSelect(emoji)}
                  className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted/80 active:bg-muted transition-colors text-base select-none"
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
          </ScrollArea>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Writing Goal Bar ───────────────────────────────────────────────────────

function WritingGoalBar({
  charCount,
  platform,
}: {
  charCount: number;
  platform: string;
}) {
  const config = PLATFORM_GOALS[platform] || PLATFORM_GOALS.wechat;
  const status = getWritingGoalStatus(charCount, config);

  return (
    <div className="writing-goal-bar flex items-center gap-2">
      {/* Progress bar */}
      <div className="flex-1 h-1.5 rounded-full bg-muted/60 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${status.barColor} transition-colors duration-300`}
          initial={{ width: 0 }}
          animate={{ width: `${status.progress}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
      {/* Status text */}
      <motion.span
        key={status.text}
        initial={{ opacity: 0, y: 2 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={`text-[10px] font-medium whitespace-nowrap ${status.color}`}
      >
        {charCount > 0 ? status.text : ""}
      </motion.span>
    </div>
  );
}

// ─── Template Chips ─────────────────────────────────────────────────────────

function TemplateChips({
  title,
  items,
  onSelect,
}: {
  title: string;
  items: string[];
  onSelect: (text: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <Sparkles className="h-3 w-3" />
        <span className="font-medium">{title}</span>
        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-1">
              {items.map((item, idx) => (
                <motion.button
                  key={idx}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => {
                    onSelect(item);
                    setExpanded(false);
                  }}
                  className="template-chip px-2 py-1 rounded-md text-[10px] text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted/80 border border-border/20 hover:border-border/20 transition-colors max-w-full truncate"
                >
                  {item}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Placeholder text ───────────────────────────────────────────────────────

function getPlaceholder(isXHS: boolean, contentType: string): string {
  if (isXHS) {
    if (contentType === "review") return "分享你的真实体验和感受…";
    if (contentType === "tutorial") return "手把手教你…步骤清晰，图文并茂";
    if (contentType === "list") return "盘点那些…一、二、三…";
    return "写点什么吧…标题引人，正文干货满满 ✨";
  }
  return "写点生活感悟或工作分享…";
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface EnhancedContentEditorProps {
  post: ContentPost;
  isXHS: boolean;
  onScoreBadgeClick?: () => void;
}

export function EnhancedContentEditor({ post, isXHS, onScoreBadgeClick }: EnhancedContentEditorProps) {
  const updateContentPost = useAppStore((s) => s.updateContentPost);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [focused, setFocused] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiKey, setEmojiKey] = useState(0);
  const { copied, copy } = useCopyToClipboard();

  // Auto-save state
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedContent, setLastSavedContent] = useState(post.content);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const newHeight = Math.min(400, Math.max(120, ta.scrollHeight));
    ta.style.height = `${newHeight}px`;
  }, [editContent, editing]);

  const charCount = editContent.length;
  const readingTime = charCount > 0 ? Math.max(1, Math.ceil(charCount / CHARS_PER_MIN)) : 0;

  // Compute effective save status
  const effectiveSaveStatus: SaveStatus = !editing
    ? "idle"
    : saveStatus === "idle"
      ? (editContent !== lastSavedContent ? "unsaved" : "idle")
      : saveStatus;

  const startEdit = () => {
    setEditContent(post.content);
    setEditing(true);
    setLastSavedContent(post.content);
    setSaveStatus("idle");
    // Focus textarea after render
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  // Debounced auto-save
  const performAutoSave = useCallback(async (content: string) => {
    if (content === lastSavedContent) return;

    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/content/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const updated = await res.json();
        updateContentPost(post.id, updated);
        setLastSavedContent(content);
        setSaveStatus("saved");
      } else {
        setSaveStatus("unsaved");
      }
    } catch {
      setSaveStatus("unsaved");
    }
  }, [post.id, updateContentPost, lastSavedContent]);

  useEffect(() => {
    if (!editing) return;
    if (editContent === lastSavedContent) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      performAutoSave(editContent);
    }, 3000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [editContent, editing, lastSavedContent, performAutoSave]);

  const saveEdit = async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    try {
      setSaveStatus("saving");
      const res = await fetch(`/api/content/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      if (res.ok) {
        const updated = await res.json();
        updateContentPost(post.id, updated);
        setEditing(false);
        setSaveStatus("idle");
        setFocused(false);
        toast.success("内容已更新");
      } else {
        setSaveStatus("unsaved");
        toast.error("更新失败");
      }
    } catch {
      setSaveStatus("unsaved");
      toast.error("更新失败");
    }
  };

  const cancelEdit = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setEditing(false);
    setSaveStatus("idle");
    setFocused(false);
    setEmojiOpen(false);
  };

  const handleCopy = () => {
    if (post.content) copy(post.content);
  };

  // ── Text manipulation helpers ─────────────────────────────────────────────

  const insertAtCursor = useCallback(
    (text: string) => {
      if (!textareaRef.current) return;
      const ta = textareaRef.current;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const before = editContent.slice(0, start);
      const selected = editContent.slice(start, end);
      const after = editContent.slice(end);
      const newContent = before + text + (selected || "") + after;
      setEditContent(newContent);

      requestAnimationFrame(() => {
        ta.focus();
        const newPos = start + text.length + selected.length;
        ta.setSelectionRange(newPos, newPos);
      });
    },
    [editContent],
  );

  const handleBold = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = editContent.slice(0, start);
    const selected = editContent.slice(start, end) || "加粗文本";
    const after = editContent.slice(end);
    setEditContent(before + `**${selected}**` + after);
    requestAnimationFrame(() => {
      ta.focus();
      if (start === end) {
        ta.setSelectionRange(start + 2, start + 6);
      } else {
        ta.setSelectionRange(start, end + 4);
      }
    });
  };

  const handleItalic = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = editContent.slice(0, start);
    const selected = editContent.slice(start, end) || "斜体文本";
    const after = editContent.slice(end);
    setEditContent(before + `*${selected}*` + after);
    requestAnimationFrame(() => {
      ta.focus();
      if (start === end) {
        ta.setSelectionRange(start + 1, start + 5);
      } else {
        ta.setSelectionRange(start, end + 2);
      }
    });
  };

  const handleEmoji = (emoji: string) => {
    insertAtCursor(emoji);
    setEmojiOpen(false);
  };

  const handleLineBreak = () => {
    insertAtCursor("\n\n");
  };

  const handleHashtag = () => {
    insertAtCursor("#话题标签 ");
  };

  const handleClear = () => {
    if (!editContent) return;
    setEditContent("");
    if (textareaRef.current) textareaRef.current.focus();
  };

  const handleUndo = () => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      document.execCommand("undo");
    }
  };

  const handleRedo = () => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      document.execCommand("redo");
    }
  };

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Tab inserts 2 spaces
      if (e.key === "Tab") {
        e.preventDefault();
        insertAtCursor("  ");
        return;
      }
      // Ctrl/Cmd + Enter to save
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        saveEdit();
        return;
      }
      // Escape to cancel
      if (e.key === "Escape") {
        cancelEdit();
        return;
      }
      // Ctrl/Cmd + B for bold
      if (e.key === "b" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleBold();
        return;
      }
      // Ctrl/Cmd + I for italic
      if (e.key === "i" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleItalic();
        return;
      }
    },
    [insertAtCursor, saveEdit, cancelEdit, handleBold, handleItalic],
  );

  const platformKey = isXHS ? "xiaohongshu" : "wechat";

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        {editing ? (
          <div className="space-y-2">
            {/* ── Editor Header: Score Badge + Save Status ────────────── */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {post.aiScore > 0 && onScoreBadgeClick && (
                  <ScoreBadge score={post.aiScore} onClick={onScoreBadgeClick} />
                )}
              </div>
              <SaveStatusIndicator status={effectiveSaveStatus} />
            </div>

            {/* ── Floating Toolbar ────────────────────────────────────── */}
            <div className="relative">
              <AnimatePresence>
                {focused && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="editor-toolbar absolute -top-9 left-0 right-0 z-40 flex items-center gap-0.5 px-1 py-1 rounded-lg border border-border/20 bg-background/95 backdrop-blur-sm shadow-md"
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/80"
                          onClick={handleUndo}
                        >
                          <Undo2 className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={4}>撤销</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/80"
                          onClick={handleRedo}
                        >
                          <Redo2 className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={4}>重做</TooltipContent>
                    </Tooltip>

                    <div className="w-px h-4 bg-border/60 mx-0.5" />

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/80"
                          onClick={handleBold}
                        >
                          <Bold className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={4}>加粗 (Ctrl+B)</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/80"
                          onClick={handleItalic}
                        >
                          <Italic className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={4}>斜体 (Ctrl+I)</TooltipContent>
                    </Tooltip>

                    <div className="w-px h-4 bg-border/60 mx-0.5" />

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-6 w-6 p-0 transition-colors ${emojiOpen ? "text-violet-500 bg-violet-50 dark:bg-violet-950/30" : "text-muted-foreground hover:text-foreground hover:bg-muted/80"}`}
                          onClick={() => {
                            if (!emojiOpen) setEmojiKey((k) => k + 1);
                            setEmojiOpen(!emojiOpen);
                          }}
                        >
                          <Smile className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={4}>表情</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-6 w-6 p-0 transition-colors ${isXHS ? "text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30" : "text-muted-foreground hover:text-foreground hover:bg-muted/80"}`}
                          onClick={handleHashtag}
                        >
                          <Hash className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={4}>话题标签</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/80"
                          onClick={handleLineBreak}
                        >
                          <WrapText className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={4}>空行</TooltipContent>
                    </Tooltip>

                    <div className="flex-1" />

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                          onClick={handleClear}
                          disabled={!editContent}
                        >
                          <Eraser className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={4}>清空</TooltipContent>
                    </Tooltip>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Inline Emoji Picker ──────────────────────────────── */}
              <InlineEmojiPicker
                key={emojiKey}
                isOpen={emojiOpen}
                onClose={() => setEmojiOpen(false)}
                onSelect={handleEmoji}
              />

              {/* ── Textarea ────────────────────────────────────────── */}
              <Textarea
                ref={textareaRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => {
                  // Delay to allow toolbar button clicks to register
                  setTimeout(() => setFocused(false), 150);
                }}
                onKeyDown={handleKeyDown}
                className="min-h-[120px] max-h-[400px] text-sm leading-relaxed resize-none overflow-y-auto"
                placeholder={getPlaceholder(isXHS, post.contentType)}
              />
            </div>

            {/* ── Writing Goal Bar ───────────────────────────────────── */}
            <WritingGoalBar charCount={charCount} platform={platformKey} />

            {/* ── Word Count + Reading Time ─────────────────────────── */}
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <Type className="h-3 w-3" />
                  <span>{charCount} 字</span>
                </span>
                {charCount > 0 && (
                  <>
                    <span className="text-border">|</span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      约{readingTime}分钟
                    </span>
                  </>
                )}
                <span className="text-muted-foreground/50 text-[9px] hidden sm:inline">
                  Ctrl+Enter 保存
                </span>
              </div>
              <SaveStatusIndicator status={effectiveSaveStatus} />
            </div>

            {/* ── Template Chips ────────────────────────────────────── */}
            <div className="space-y-1.5">
              <TemplateChips
                title="开头公式"
                items={OPENING_FORMULAS}
                onSelect={(text) => insertAtCursor(text)}
              />
              <TemplateChips
                title="结尾CTA"
                items={CLOSING_CTAS}
                onSelect={(text) => insertAtCursor(text)}
              />
            </div>

            {/* ── Save / Cancel Buttons ─────────────────────────────── */}
            <div className="flex gap-2 pt-1">
              <Button onClick={saveEdit} size="sm" className="flex-1">
                <Check className="h-3.5 w-3.5 mr-1" />
                保存
              </Button>
              <Button onClick={cancelEdit} variant="outline" size="sm">
                取消
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {/* ── View Mode Header ──────────────────────────────────── */}
            <div className="flex items-center justify-between">
              {post.aiScore > 0 && onScoreBadgeClick ? (
                <ScoreBadge score={post.aiScore} onClick={onScoreBadgeClick} />
              ) : (
                <div />
              )}

              {post.content.length > 0 && (
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span>{post.content.length} 字</span>
                  <span className="flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    约{Math.max(1, Math.ceil(post.content.length / CHARS_PER_MIN))}分钟
                  </span>
                </div>
              )}
            </div>

            {/* ── Content Display ───────────────────────────────────── */}
            <div className="relative group">
              {post.content ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
              ) : (
                <p className="text-sm text-muted-foreground/50 italic">暂无内容</p>
              )}
              <div className="absolute top-0 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="secondary"
                  size="sm"
                  className={`h-7 px-2 shadow-sm ${copied ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : ""}`}
                  onClick={handleCopy}
                  disabled={!post.content}
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-7 px-2 shadow-sm"
                  onClick={startEdit}
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
