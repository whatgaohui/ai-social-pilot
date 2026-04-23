"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Smile,
  Search,
  X,
  Hand,
  Heart,
  Leaf,
  Utensils,
  PartyPopper,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

// ─── Emoji Data ─────────────────────────────────────────────────────────────

interface EmojiCategory {
  id: string;
  label: string;
  icon: React.ElementType;
  emojis: string[];
  keywords: Record<string, string[]>;
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: "frequent",
    label: "常用表情",
    icon: Clock,
    emojis: [],
    keywords: {},
  },
  {
    id: "gestures",
    label: "手势",
    icon: Hand,
    emojis: [
      "👍", "👎", "👏", "🙌", "🤝", "✌️", "🤞", "🤙", "👌", "🤌",
      "✊", "👊", "🤛", "🤜", "👆", "👇", "👈", "👉", "☝️", "🫵",
      "🫶", "🤗", "🫡", "🫣", "🙈", "🙉", "🙊", "💪", "🤩", "😎",
    ],
    keywords: {
      "开心": ["👍", "👏", "🙌", "🤩", "😎"],
      "同意": ["👍", "👌", "🤝", "✊"],
      "拜拜": ["👋", "👋🏻", "🤙", "✌️"],
      "加油": ["💪", "👊", "✊", "👏"],
      "你好": ["👋", "🤝", "☝️", "👍"],
      "点赞": ["👍", "👏", "🙌"],
      "鼓掌": ["👏", "🙌", "👍"],
      "不行": ["👎", "🙅", "✋"],
      "厉害": ["💪", "👏", "🤩", "😎"],
      "OK": ["👌", "👍", "✅"],
      "胜利": ["✌️", "✊", "💪"],
      "抱歉": ["🙏", "🤗", "🙈"],
      "安静": ["🤫", "🤐", "🙈"],
    },
  },
  {
    id: "hearts",
    label: "心形",
    icon: Heart,
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💕",
      "💞", "💓", "💗", "💖", "💘", "💝", "❣️", "💞", "🫶", "😍",
      "🥰", "😘", " 😙", "😚", "😙", "🥲", "😋", "😛", "😜", "🤪",
    ],
    keywords: {
      "开心": ["❤️", "💕", "💖", "😍", "🥰"],
      "喜欢": ["❤️", "💕", "💖", "😍", "💗"],
      "爱": ["❤️", "💕", "💖", "💘", "💝"],
      "爱情": ["❤️", "💕", "💘", "💗", "💝"],
      "可爱": ["🥰", "😍", "😘", "💕", "💖"],
      "甜蜜": ["💕", "💖", "🥰", "💘", "💗"],
      "颜色": ["❤️", "🧡", "💛", "💚", "💙", "💜"],
    },
  },
  {
    id: "nature",
    label: "自然",
    icon: Leaf,
    emojis: [
      "🌸", "🌹", "🌺", "🌻", "🌷", "🌼", "💐", "🌱", "🌿", "🍀",
      "🌳", "🌲", "🌴", "🌵", "🍂", "🍁", "🌾", "🌾", "🍄", "🌈",
      "⭐", "🌟", "✨", "💫", "🌙", "☀️", "🌤️", "⛅", "🌧️", "❄️",
    ],
    keywords: {
      "开心": ["🌸", "🌹", "☀️", "🌈", "✨"],
      "好看": ["🌸", "🌹", "🌺", "🌈", "✨"],
      "春天": ["🌸", "🌷", "🌱", "🌿", "🌿"],
      "秋天": ["🍂", "🍁", "🌾"],
      "下雨": ["🌧️"],
      "下雪": ["❄️", "☃️", "🌨️"],
      "太阳": ["☀️", "🌤️", "🌟"],
      "月亮": ["🌙", "🌟", "⭐"],
      "花": ["🌸", "🌹", "🌺", "🌻", "🌷"],
      "星星": ["⭐", "🌟", "✨", "💫"],
    },
  },
  {
    id: "food",
    label: "食物",
    icon: Utensils,
    emojis: [
      "☕", "🍵", "🧋", "🍺", "🍷", "🥂", "🧃", "🥤", "🧉", "🍹",
      "🍰", "🎂", "🧁", "🍩", "🍪", "🍫", "🍬", "🍭", "🍮", "🍨",
      "🍜", "🍝", "🍣", "🍱", "🥘", "🍲", "🍕", "🍔", "🌮", "🥗",
    ],
    keywords: {
      "开心": ["🍰", "🎂", "🍬", "🍫", "🍩"],
      "喝": ["☕", "🍵", "🧋", "🍺", "🍷"],
      "吃": ["🍜", "🍕", "🍔", "🍣", "🍲"],
      "甜": ["🍰", "🧁", "🍩", "🍪", "🍫"],
      "咖啡": ["☕"],
      "奶茶": ["🧋", "🧃", "🥤"],
      "生日": ["🎂", "🧁", "🥂", "🍷"],
      "聚餐": ["🍜", "🍕", "🍔", "🍺", "🍷"],
    },
  },
  {
    id: "objects",
    label: "物品",
    icon: Heart,
    emojis: [
      "📱", "💻", "📷", "🎬", "🎵", "🎶", "📚", "✏️", "📌", "💡",
      "🎁", "🎀", "🏆", "🥇", "🎯", "📌", "🔑", "💰", "💎", "🛍️",
      "✈️", "🚗", "🏠", "📖", "✍️", "📝", "💼", "🎓", "🎨", "🔬",
    ],
    keywords: {
      "学习": ["📚", "📖", "✏️", "🎓", "📝"],
      "工作": ["💻", "💼", "📱", "📝", "✍️"],
      "拍照": ["📷", "🎬", "📱"],
      "音乐": ["🎵", "🎶"],
      "礼物": ["🎁", "🎀", "🛍️"],
      "旅行": ["✈️", "🚗", "📷"],
      "思考": ["💡", "🤔", "📝"],
      "灵感": ["💡", "✨", "🎯"],
    },
  },
  {
    id: "celebration",
    label: "庆祝",
    icon: PartyPopper,
    emojis: [
      "🎉", "🎊", "🥳", "🎈", "🎆", "🎇", "🧨", "✨", "🎇", "🎆",
      "🍾", "🥂", "🏆", "🥇", "🏅", "🎖️", "🎤", "🎪", "🎢", "🎡",
      "💪", "🔥", "💯", "⚡", "💥", "🌟", "💫", "⭐", "🌈", "☀️",
    ],
    keywords: {
      "开心": ["🎉", "🎊", "🥳", "🎈", "✨"],
      "厉害": ["🔥", "💯", "⚡", "🏆", "💪"],
      "庆祝": ["🎉", "🎊", "🥳", "🍾", "🥂"],
      "成功": ["🏆", "🥇", "💯", "🎉", "🔥"],
      "棒": ["👍", "💪", "💯", "🔥", "🏆"],
      "牛": ["🔥", "💯", "💪", "⚡"],
      "好看": ["✨", "🌟", "💫", "⭐", "🌈"],
      "热门": ["🔥", "💯", "⚡", "💥"],
    },
  },
];

// ─── Recent Emojis Storage ──────────────────────────────────────────────────

const RECENT_STORAGE_KEY = "emoji-recent";
const MAX_RECENT = 8;

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
    // ignore storage errors
  }
}

function addRecentEmoji(emoji: string) {
  const recent = getRecentEmojis();
  const filtered = recent.filter((e) => e !== emoji);
  saveRecentEmojis([emoji, ...filtered]);
}

// ─── insertEmojiAtCursor Utility ────────────────────────────────────────────

export function insertEmojiAtCursor(
  textareaRef: React.RefObject<HTMLTextAreaElement | null>,
  emoji: string,
) {
  const ta = textareaRef.current;
  if (!ta) return;

  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const value = ta.value;
  const before = value.slice(0, start);
  const selected = value.slice(start, end);
  const after = value.slice(end);

  const newValue = before + emoji + (selected || "") + after;

  // Dispatch a native input event so React picks up the change
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value",
  )?.set;
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(ta, newValue);
  } else {
    ta.value = newValue;
  }
  ta.dispatchEvent(new Event("input", { bubbles: true }));

  // Restore cursor position
  requestAnimationFrame(() => {
    ta.focus();
    const newPos = start + emoji.length + selected.length;
    ta.setSelectionRange(newPos, newPos);
  });
}

// ─── Emoji Grid Item ────────────────────────────────────────────────────────

function EmojiItem({
  emoji,
  index,
  onSelect,
}: {
  emoji: string;
  index: number;
  onSelect: (emoji: string) => void;
}) {
  return (
    <motion.button
      key={emoji}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.15,
        delay: Math.min(index * 0.015, 0.3),
        ease: [0.22, 1, 0.36, 1] as const,
      }}
      whileHover={{ scale: 1.25 }}
      whileTap={{ scale: 0.9 }}
      onClick={() => onSelect(emoji)}
      className="h-9 w-9 flex items-center justify-center rounded-md hover:bg-muted/80 active:bg-muted transition-colors text-lg select-none"
      title={emoji}
    >
      {emoji}
    </motion.button>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface EmojiPickerProps {
  onSelect?: (emoji: string) => void;
}

function EmojiPickerContent({
  onSelect,
  onClose,
}: {
  onSelect?: (emoji: string) => void;
  onClose?: () => void;
}) {
  const [activeCategory, setActiveCategory] = useState("frequent");
  const [searchQuery, setSearchQuery] = useState("");
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(RECENT_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelect = useCallback(
    (emoji: string) => {
      addRecentEmoji(emoji);
      setRecentEmojis(getRecentEmojis());

      // Copy to clipboard
      try {
        navigator.clipboard.writeText(emoji).catch(() => {});
      } catch {
        // ignore
      }

      // Dispatch custom event for parent integration
      try {
        const event = new CustomEvent("emoji-insert", { detail: { emoji } });
        document.dispatchEvent(event);
      } catch {
        // ignore
      }

      // Call parent callback
      onSelect?.(emoji);

      // Close on mobile
      onClose?.();
    },
    [onSelect, onClose],
  );

  // Search through all categories
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.trim().toLowerCase();
    const results: string[] = [];
    const seen = new Set<string>();

    for (const cat of EMOJI_CATEGORIES) {
      // Check keywords
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

    return results.slice(0, 36);
  }, [searchQuery]);

  // Get current emojis to display
  const displayEmojis = useMemo(() => {
    if (searchResults !== null) return searchResults;

    if (activeCategory === "frequent") {
      return recentEmojis.length > 0 ? recentEmojis : [];
    }

    const category = EMOJI_CATEGORIES.find((c) => c.id === activeCategory);
    return category?.emojis || [];
  }, [activeCategory, searchResults, recentEmojis]);

  return (
    <div className="w-[280px] sm:w-[300px]">
      {/* Search */}
      <div className="relative mb-2">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索表情..."
          className="h-8 pl-8 pr-8 text-xs"
        />
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1 mb-2 overflow-x-auto scrollbar-none pb-0.5">
        {EMOJI_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id && !searchQuery;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                setSearchQuery("");
              }}
              className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
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
      <ScrollArea className="h-[180px]">
        <div className="grid grid-cols-6 gap-0.5 px-1">
          {searchQuery && searchResults !== null && searchResults.length === 0 && (
            <div className="col-span-6 py-8 text-center">
              <p className="text-xs text-muted-foreground">
                没有找到 &quot;{searchQuery}&quot; 相关的表情
              </p>
            </div>
          )}

          {!searchQuery &&
            activeCategory === "frequent" &&
            recentEmojis.length === 0 && (
              <div className="col-span-6 py-8 text-center">
                <Smile className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  还没有使用过的表情
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  点击表情即可使用
                </p>
              </div>
            )}

          {displayEmojis.map((emoji, index) => (
            <EmojiItem
              key={`${activeCategory}-${emoji}-${index}`}
              emoji={emoji}
              index={index}
              onSelect={handleSelect}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Exported Component ─────────────────────────────────────────────────────

export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/80"
          >
            <span className="text-sm">😊</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-xl p-4 pb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-6 w-6 rounded bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
              <Smile className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold">表情选择</span>
          </div>
          <EmojiPickerContent onSelect={onSelect} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/80"
        >
          <span className="text-sm">😊</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-3"
        side="top"
        align="start"
        sideOffset={8}
      >
        <EmojiPickerContent onSelect={onSelect} />
      </PopoverContent>
    </Popover>
  );
}

// ─── Re-export utility ──────────────────────────────────────────────────────

export { getRecentEmojis, addRecentEmoji };
