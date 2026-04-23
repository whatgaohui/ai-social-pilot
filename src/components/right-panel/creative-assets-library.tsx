"use client";

import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  FileText,
  Image,
  Hash,
  MessageSquareQuote,
  Search,
  Plus,
  X,
  Copy,
  Check,
  GripVertical,
  Sparkles,
  Trash2,
  BookOpen,
  ArrowRight,
  FolderOpen,
  Tag,
  Megaphone,
  Handshake,
  PartyPopper,
  MousePointerClick,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

type AssetTab = "copywriting" | "tags" | "phrases";

interface CopywritingFragment {
  id: string;
  content: string;
  category: FragmentCategory;
  isCustom: boolean;
}

type FragmentCategory = "opening" | "closing" | "transition" | "emotion" | "data";

interface HashtagItem {
  id: string;
  tag: string;
  platform: "wechat" | "xiaohongshu";
  useCount: number;
}

interface PhraseItem {
  id: string;
  content: string;
  category: PhraseCategory;
}

type PhraseCategory = "interactive" | "intro" | "thanks" | "cta";

// ─── Data: Copywriting Fragments (25+ items) ────────────────────────────────

const FRAGMENT_CATEGORIES: {
  value: FragmentCategory;
  label: string;
  icon: typeof BookOpen;
  color: string;
}[] = [
  { value: "opening", label: "开头金句", icon: BookOpen, color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" },
  { value: "closing", label: "结尾号召", icon: Megaphone, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  { value: "transition", label: "过渡衔接", icon: ArrowRight, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  { value: "emotion", label: "情感表达", icon: Handshake, color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300" },
  { value: "data", label: "数据引用", icon: Sparkles, color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" },
];

const DEFAULT_FRAGMENTS: CopywritingFragment[] = [
  // 开头金句 (5)
  { id: "f1", content: "今天想和大家分享一件让我感触很深的事", category: "opening", isCustom: false },
  { id: "f2", content: "说句大实话，这个方法我用了3年从未失效", category: "opening", isCustom: false },
  { id: "f3", content: "终于有人把这件事说清楚了，收藏这篇就够了", category: "opening", isCustom: false },
  { id: "f4", content: "如果你也在为这件事发愁，请一定看完这篇", category: "opening", isCustom: false },
  { id: "f5", content: "昨天和朋友聊到这个话题，越聊越有感触", category: "opening", isCustom: false },

  // 结尾号召 (5)
  { id: "f6", content: "觉得有用的话，记得点赞收藏，下次需要的时候翻出来看", category: "closing", isCustom: false },
  { id: "f7", content: "如果你也有类似经历，欢迎在评论区和我分享", category: "closing", isCustom: false },
  { id: "f8", content: "关注我，持续分享更多实用干货", category: "closing", isCustom: false },
  { id: "f9", content: "转发给你身边需要的朋友吧，也许能帮到TA", category: "closing", isCustom: false },
  { id: "f10", content: "觉得有收获？点个赞让我知道你在看", category: "closing", isCustom: false },

  // 过渡衔接 (5)
  { id: "f11", content: "说到这里，可能有人会问……", category: "transition", isCustom: false },
  { id: "f12", content: "更重要的是，接下来这一点才是关键", category: "transition", isCustom: false },
  { id: "f13", content: "除了上面这些，还有一个容易被忽略的点", category: "transition", isCustom: false },
  { id: "f14", content: "讲真，上面说的都不是最核心的", category: "transition", isCustom: false },
  { id: "f15", content: "说到这个问题，我想分享一个真实案例", category: "transition", isCustom: false },

  // 情感表达 (5)
  { id: "f16", content: "那一刻，我深深地感受到了一种久违的温暖", category: "emotion", isCustom: false },
  { id: "f17", content: "回头想想，每一段经历都不白费", category: "emotion", isCustom: false },
  { id: "f18", content: "有些道理，只有经历过才真正明白", category: "emotion", isCustom: false },
  { id: "f19", content: "这让我想起了那句话：一切都是最好的安排", category: "emotion", isCustom: false },
  { id: "f20", content: "与其说是分享，不如说是自我梳理和复盘", category: "emotion", isCustom: false },

  // 数据引用 (5)
  { id: "f21", content: "根据最新数据显示，超过80%的人都有过类似的困扰", category: "data", isCustom: false },
  { id: "f22", content: "经过一个月的实践，我的效率提升了整整3倍", category: "data", isCustom: false },
  { id: "f23", content: "这个方法我已经推荐给了200多个朋友，反馈都不错", category: "data", isCustom: false },
  { id: "f24", content: "用了这个策略后，我的一周阅读量从0变成了7本", category: "data", isCustom: false },
  { id: "f25", content: "数据不会骗人：坚持了100天，效果真的肉眼可见", category: "data", isCustom: false },
];

// ─── Data: Hashtags (40+) ───────────────────────────────────────────────────

const DEFAULT_HASHTAGS: HashtagItem[] = [
  // 朋友圈标签 (20)
  { id: "ht1", tag: "生活日常", platform: "wechat", useCount: 4567 },
  { id: "ht2", tag: "工作感悟", platform: "wechat", useCount: 3890 },
  { id: "ht3", tag: "读书笔记", platform: "wechat", useCount: 3210 },
  { id: "ht4", tag: "职场心得", platform: "wechat", useCount: 2876 },
  { id: "ht5", tag: "美食探店", platform: "wechat", useCount: 2543 },
  { id: "ht6", tag: "旅行日记", platform: "wechat", useCount: 2345 },
  { id: "ht7", tag: "健身打卡", platform: "wechat", useCount: 2100 },
  { id: "ht8", tag: "好物推荐", platform: "wechat", useCount: 1987 },
  { id: "ht9", tag: "自我成长", platform: "wechat", useCount: 1876 },
  { id: "ht10", tag: "每日感悟", platform: "wechat", useCount: 1654 },
  { id: "ht11", tag: "周末时光", platform: "wechat", useCount: 1543 },
  { id: "ht12", tag: "亲子时光", platform: "wechat", useCount: 1432 },
  { id: "ht13", tag: "数码科技", platform: "wechat", useCount: 1321 },
  { id: "ht14", tag: "理财心得", platform: "wechat", useCount: 1210 },
  { id: "ht15", tag: "摄影作品", platform: "wechat", useCount: 1098 },
  { id: "ht16", tag: "宠物日记", platform: "wechat", useCount: 987 },
  { id: "ht17", tag: "家居装修", platform: "wechat", useCount: 876 },
  { id: "ht18", tag: "穿搭分享", platform: "wechat", useCount: 765 },
  { id: "ht19", tag: "咖啡探店", platform: "wechat", useCount: 654 },
  { id: "ht20", tag: "手作日常", platform: "wechat", useCount: 543 },

  // 小红书标签 (20)
  { id: "ht21", tag: "今日份分享", platform: "xiaohongshu", useCount: 9876 },
  { id: "ht22", tag: "干货分享", platform: "xiaohongshu", useCount: 8765 },
  { id: "ht23", tag: "好物安利", platform: "xiaohongshu", useCount: 7654 },
  { id: "ht24", tag: "日常碎片", platform: "xiaohongshu", useCount: 6543 },
  { id: "ht25", tag: "氛围感", platform: "xiaohongshu", useCount: 5432 },
  { id: "ht26", tag: "自律打卡", platform: "xiaohongshu", useCount: 4321 },
  { id: "ht27", tag: "省钱攻略", platform: "xiaohongshu", useCount: 3210 },
  { id: "ht28", tag: "种草草单", platform: "xiaohongshu", useCount: 3109 },
  { id: "ht29", tag: "美食教程", platform: "xiaohongshu", useCount: 2987 },
  { id: "ht30", tag: "穿搭灵感", platform: "xiaohongshu", useCount: 2876 },
  { id: "ht31", tag: "护肤心得", platform: "xiaohongshu", useCount: 2765 },
  { id: "ht32", tag: "旅行攻略", platform: "xiaohongshu", useCount: 2654 },
  { id: "ht33", tag: "学习打卡", platform: "xiaohongshu", useCount: 2543 },
  { id: "ht34", tag: "减脂食谱", platform: "xiaohongshu", useCount: 2432 },
  { id: "ht35", tag: "家居好物", platform: "xiaohongshu", useCount: 2321 },
  { id: "ht36", tag: "拍照技巧", platform: "xiaohongshu", useCount: 2210 },
  { id: "ht37", tag: "成长记录", platform: "xiaohongshu", useCount: 2109 },
  { id: "ht38", tag: "小红书爆款", platform: "xiaohongshu", useCount: 1998 },
  { id: "ht39", tag: "治愈日常", platform: "xiaohongshu", useCount: 1887 },
  { id: "ht40", tag: "独居日记", platform: "xiaohongshu", useCount: 1776 },
];

// ─── Data: Phrases (30 items) ───────────────────────────────────────────────

const PHRASE_CATEGORIES: {
  value: PhraseCategory;
  label: string;
  icon: typeof MessageSquareQuote;
  color: string;
}[] = [
  { value: "interactive", label: "互动引导", icon: MessageSquareQuote, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  { value: "intro", label: "自我介绍", icon: FolderOpen, color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" },
  { value: "thanks", label: "感谢语", icon: PartyPopper, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  { value: "cta", label: "号召行动", icon: MousePointerClick, color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" },
];

const DEFAULT_PHRASES: PhraseItem[] = [
  // 互动引导 (10)
  { id: "p1", content: "你怎么看？评论区见~", category: "interactive" },
  { id: "p2", content: "有没有同感的？举个手🙋", category: "interactive" },
  { id: "p3", content: "大家有什么好建议？求分享", category: "interactive" },
  { id: "p4", content: "猜猜最后的结果是什么？", category: "interactive" },
  { id: "p5", content: "你用过这个方法吗？效果怎么样？", category: "interactive" },
  { id: "p6", content: "投票时间！A还是B？", category: "interactive" },
  { id: "p7", content: "留言区分享你的经历，抽3位送小礼物", category: "interactive" },
  { id: "p8", content: "最后一个问题，你学会了吗？", category: "interactive" },
  { id: "p9", content: "双击屏幕告诉我你也在看", category: "interactive" },
  { id: "p10", content: "下一个话题你想看什么？评论区告诉我", category: "interactive" },

  // 自我介绍 (5)
  { id: "p11", content: "大家好，我是[名字]，一个[职业]领域的创作者", category: "intro" },
  { id: "p12", content: "专注[领域]已有[X]年，踩过不少坑，分享给你", category: "intro" },
  { id: "p13", content: "一个热爱[兴趣]的[身份]，坚持[X]天打卡中", category: "intro" },
  { id: "p14", content: "[职业]出身，现在全职做内容创作，记录成长日常", category: "intro" },
  { id: "p15", content: "一个在[城市]生活，热爱分享的普通人", category: "intro" },

  // 感谢语 (5)
  { id: "p16", content: "感谢每一个点赞和收藏，你们是我创作的动力", category: "thanks" },
  { id: "p17", content: "谢谢大家的鼓励，我会继续努力的", category: "thanks" },
  { id: "p18", content: "没想到这篇这么受欢迎，感谢大家的支持", category: "thanks" },
  { id: "p19", content: "每一条评论都看了，感谢大家用心回复", category: "thanks" },
  { id: "p20", content: "谢谢你们的陪伴，这个账号因为你们才有意义", category: "thanks" },

  // 号召行动 (5)
  { id: "p21", content: "点赞过500就出下期，手速要快", category: "cta" },
  { id: "p22", content: "关注我，下期更精彩", category: "cta" },
  { id: "p23", content: "转发给需要的朋友，帮到人就是功德", category: "cta" },
  { id: "p24", content: "点击主页查看更多同系列内容", category: "cta" },
  { id: "p25", content: "收藏夹合集已更新，去看看有没有你需要的", category: "cta" },
];

// ─── Sortable Item ──────────────────────────────────────────────────────────

function SortablePhraseItem({
  item,
  onCopy,
  onDelete,
}: {
  item: PhraseItem;
  onCopy: (content: string) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <motion.div
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="group flex items-center gap-2 p-2 rounded-lg border border-border/40 bg-card hover:bg-muted/30 transition-all duration-200"
      >
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex-shrink-0 flex items-center justify-center w-5 h-5 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        >
          <GripVertical className="h-3 w-3" />
        </div>

        {/* Content */}
        <button
          onClick={() => onCopy(item.content)}
          className="flex-1 text-left text-xs text-foreground/80 hover:text-foreground transition-colors line-clamp-2 min-w-0"
        >
          {item.content}
        </button>

        {/* Actions */}
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onCopy(item.content)}
            className="h-6 w-6 rounded flex items-center justify-center hover:bg-muted transition-colors"
          >
            <Copy className="h-3 w-3 text-muted-foreground" />
          </button>
          {item.id.startsWith("custom-") && (
            <button
              onClick={() => onDelete(item.id)}
              className="h-6 w-6 rounded flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 className="h-3 w-3 text-red-400" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Animation ──────────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// ─── Tab Config ─────────────────────────────────────────────────────────────

const TABS: {
  value: AssetTab;
  label: string;
  icon: typeof FileText;
}[] = [
  { value: "copywriting", label: "文案片段", icon: FileText },
  { value: "tags", label: "话题标签", icon: Hash },
  { value: "phrases", label: "常用短语", icon: MessageSquareQuote },
];

// ─── Main Component ─────────────────────────────────────────────────────────

export function CreativeAssetsLibrary() {
  const [activeTab, setActiveTab] = useState<AssetTab>("copywriting");
  const [searchQuery, setSearchQuery] = useState("");

  // Copywriting state
  // Load custom data from localStorage using lazy initialization
  const [fragments, setFragments] = useState<CopywritingFragment[]>(() => {
    try {
      const saved = localStorage.getItem("custom-fragments");
      if (saved) {
        const custom: CopywritingFragment[] = JSON.parse(saved);
        return [...DEFAULT_FRAGMENTS.filter((f) => !custom.some((c) => c.id === f.id)), ...custom];
      }
    } catch { /* ignore */ }
    return DEFAULT_FRAGMENTS;
  });
  const [activeFragmentCat, setActiveFragmentCat] = useState<FragmentCategory | "all">("all");
  const [showAddFragment, setShowAddFragment] = useState(false);
  const [newFragmentText, setNewFragmentText] = useState("");
  const [newFragmentCat, setNewFragmentCat] = useState<FragmentCategory>("opening");

  // Tags state
  const [hashtags, setHashtags] = useState<HashtagItem[]>(() => {
    try {
      const saved = localStorage.getItem("hashtag-use-counts");
      if (saved) {
        const counts: Record<string, number> = JSON.parse(saved);
        return DEFAULT_HASHTAGS.map((h) =>
          counts[h.id] !== undefined ? { ...h, useCount: counts[h.id] } : h,
        );
      }
    } catch { /* ignore */ }
    return DEFAULT_HASHTAGS;
  });
  const [tagPlatform, setTagPlatform] = useState<"wechat" | "xiaohongshu">("wechat");

  // Phrases state
  const [phrases, setPhrases] = useState<PhraseItem[]>(() => {
    try {
      const saved = localStorage.getItem("custom-phrases");
      if (saved) {
        const custom: PhraseItem[] = JSON.parse(saved);
        return [...DEFAULT_PHRASES.filter((p) => !custom.some((c) => c.id === p.id)), ...custom];
      }
    } catch { /* ignore */ }
    return DEFAULT_PHRASES;
  });
  const [activePhraseCat, setActivePhraseCat] = useState<PhraseCategory | "all">("all");

  const { copied, copy } = useCopyToClipboard();

  // ─── Handlers ──────────────────────────────────────────────────

  const handleCopyFragment = useCallback(
    (content: string) => {
      copy(content);
      toast.success("已复制文案片段");
    },
    [copy],
  );

  const handleAddFragment = useCallback(() => {
    if (!newFragmentText.trim()) return;
    const newFragment: CopywritingFragment = {
      id: `custom-f-${Date.now()}`,
      content: newFragmentText.trim(),
      category: newFragmentCat,
      isCustom: true,
    };
    setFragments((prev) => [...prev, newFragment]);
    // Save custom fragments
    const customFragments = [...fragments.filter((f) => f.isCustom), newFragment];
    localStorage.setItem("custom-fragments", JSON.stringify(customFragments));
    setNewFragmentText("");
    setShowAddFragment(false);
    toast.success("文案片段已添加");
  }, [newFragmentText, newFragmentCat, fragments]);

  const handleDeleteFragment = useCallback(
    (id: string) => {
      setFragments((prev) => prev.filter((f) => f.id !== id));
      const remaining = fragments.filter((f) => f.isCustom && f.id !== id);
      localStorage.setItem("custom-fragments", JSON.stringify(remaining));
      toast.success("已删除");
    },
    [fragments],
  );

  const handleCopyTag = useCallback(
    (tag: HashtagItem) => {
      copy(tag.tag);
      setHashtags((prev) => {
        const updated = prev.map((h) =>
          h.id === tag.id ? { ...h, useCount: h.useCount + 1 } : h,
        );
        const counts: Record<string, number> = {};
        for (const h of updated) counts[h.id] = h.useCount;
        localStorage.setItem("hashtag-use-counts", JSON.stringify(counts));
        return updated;
      });
      toast.success(`已复制 #${tag.tag}`);
    },
    [copy],
  );

  const handleCopyAllTags = useCallback(
    (platform: "wechat" | "xiaohongshu") => {
      const tags = hashtags.filter((h) => h.platform === platform);
      const text = tags.map((t) => `#${t.tag}`).join(" ");
      copy(text);
      toast.success(`已复制${platform === "wechat" ? "朋友圈" : "小红书"}全部标签`);
    },
    [hashtags, copy],
  );

  const handleCopyPhrase = useCallback(
    (content: string) => {
      copy(content);
      toast.success("已复制短语");
    },
    [copy],
  );

  const handleDeletePhrase = useCallback(
    (id: string) => {
      setPhrases((prev) => prev.filter((p) => p.id !== id));
      const remaining = phrases.filter((p) => p.id.startsWith("custom-") && p.id !== id);
      localStorage.setItem("custom-phrases", JSON.stringify(remaining));
      toast.success("已删除");
    },
    [phrases],
  );

  // DnD sensors for phrases
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handlePhraseDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setPhrases((prev) => {
      const oldIndex = prev.findIndex((p) => p.id === active.id);
      const newIndex = prev.findIndex((p) => p.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, moved);
      return next;
    });
  }, []);

  // ─── Filtered data ──────────────────────────────────────────────

  const filteredFragments = useMemo(() => {
    let items = fragments;
    if (activeFragmentCat !== "all") {
      items = items.filter((f) => f.category === activeFragmentCat);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((f) => f.content.toLowerCase().includes(q));
    }
    return items;
  }, [fragments, activeFragmentCat, searchQuery]);

  const filteredHashtags = useMemo(() => {
    let items = hashtags;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((h) => h.tag.toLowerCase().includes(q));
    }
    return items;
  }, [hashtags, searchQuery]);

  const filteredPhrases = useMemo(() => {
    let items = phrases;
    if (activePhraseCat !== "all") {
      items = items.filter((p) => p.category === activePhraseCat);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((p) => p.content.toLowerCase().includes(q));
    }
    return items;
  }, [phrases, activePhraseCat, searchQuery]);

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* ── Tab Bar ──────────────────────────────────────────── */}
      <div className="flex gap-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <motion.button
              key={tab.value}
              whileTap={{ scale: 0.96 }}
              onClick={() => setActiveTab(tab.value)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs transition-all duration-200 ${
                activeTab === tab.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </motion.button>
          );
        })}
      </div>

      {/* ── Search ───────────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="搜索素材…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 text-xs pl-8 pr-8"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {/* ── Copywriting Tab ──────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {activeTab === "copywriting" && (
          <motion.div
            key="copywriting"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {/* Fragment Category Filter */}
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setActiveFragmentCat("all")}
                className={`px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap transition-all shrink-0 ${
                  activeFragmentCat === "all"
                    ? "bg-foreground text-background"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                全部 ({fragments.length})
              </button>
              {FRAGMENT_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const count = fragments.filter((f) => f.category === cat.value).length;
                return (
                  <button
                    key={cat.value}
                    onClick={() => setActiveFragmentCat(cat.value)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap transition-all shrink-0 ${
                      activeFragmentCat === cat.value
                        ? cat.color
                        : "bg-muted/60 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {cat.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Add new fragment button */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => setShowAddFragment(!showAddFragment)}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border/60 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              添加自定义片段
            </motion.button>

            {/* Add form */}
            <AnimatePresence>
              {showAddFragment && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <Textarea
                    placeholder="输入你的文案片段…"
                    value={newFragmentText}
                    onChange={(e) => setNewFragmentText(e.target.value)}
                    className="text-xs min-h-[50px] resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1 overflow-x-auto flex-1 scrollbar-none">
                      {FRAGMENT_CATEGORIES.map((cat) => (
                        <button
                          key={cat.value}
                          onClick={() => setNewFragmentCat(cat.value)}
                          className={`px-2 py-0.5 rounded text-[10px] whitespace-nowrap transition-all shrink-0 ${
                            newFragmentCat === cat.value
                              ? cat.color
                              : "bg-muted/60 text-muted-foreground"
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      className="h-7 text-[10px] px-3 shrink-0"
                      onClick={handleAddFragment}
                      disabled={!newFragmentText.trim()}
                    >
                      添加
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Fragment list */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              key={`frag-${activeFragmentCat}`}
              className="space-y-1.5"
            >
              {filteredFragments.map((fragment) => {
                const catConfig = FRAGMENT_CATEGORIES.find(
                  (c) => c.value === fragment.category,
                );
                return (
                  <motion.div
                    key={fragment.id}
                    variants={itemVariants}
                    layout
                    className="group flex items-start gap-2 p-2.5 rounded-lg border border-border/40 bg-card hover:bg-muted/30 transition-all duration-200"
                  >
                    {/* Category badge */}
                    <Badge
                      variant="secondary"
                      className={`shrink-0 text-[9px] px-1.5 py-0 h-4 ${catConfig?.color || ""}`}
                    >
                      {catConfig?.label}
                    </Badge>

                    {/* Content */}
                    <button
                      onClick={() => handleCopyFragment(fragment.content)}
                      className="flex-1 text-left text-xs text-foreground/80 hover:text-foreground transition-colors line-clamp-2 min-w-0"
                    >
                      {fragment.content}
                    </button>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopyFragment(fragment.content)}
                        className="h-6 w-6 rounded flex items-center justify-center hover:bg-muted transition-colors"
                      >
                        {copied ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        )}
                      </button>
                      {fragment.isCustom && (
                        <button
                          onClick={() => handleDeleteFragment(fragment.id)}
                          className="h-6 w-6 rounded flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 className="h-3 w-3 text-red-400" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {filteredFragments.length === 0 && (
              <div className="text-center py-6">
                <FileText className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">暂无匹配的文案片段</p>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Tags Tab ────────────────────────────────────────── */}
        {activeTab === "tags" && (
          <motion.div
            key="tags"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {/* Platform toggle */}
            <div className="flex gap-1 p-0.5 bg-muted/50 rounded-lg">
              <button
                onClick={() => setTagPlatform("wechat")}
                className={`flex-1 py-1.5 rounded-md text-xs transition-all ${
                  tagPlatform === "wechat"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                朋友圈
              </button>
              <button
                onClick={() => setTagPlatform("xiaohongshu")}
                className={`flex-1 py-1.5 rounded-md text-xs transition-all ${
                  tagPlatform === "xiaohongshu"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                小红书
              </button>
            </div>

            {/* Copy all button */}
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-[10px] gap-1.5"
              onClick={() => handleCopyAllTags(tagPlatform)}
            >
              <Copy className="h-3 w-3" />
              一键复制全部
              {tagPlatform === "wechat" ? "朋友圈" : "小红书"}标签
            </Button>

            {/* Tags grid */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              key={`tags-${tagPlatform}`}
              className="flex flex-wrap gap-1.5"
            >
              {filteredHashtags
                .filter((h) => h.platform === tagPlatform)
                .sort((a, b) => b.useCount - a.useCount)
                .map((tag) => (
                  <motion.button
                    key={tag.id}
                    variants={itemVariants}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleCopyTag(tag)}
                    className="group/tag flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border/40 bg-card hover:bg-muted/50 transition-all duration-200"
                  >
                    <Hash className="h-3 w-3 text-muted-foreground group-hover/tag:text-foreground transition-colors" />
                    <span className="text-xs text-foreground/80 group-hover/tag:text-foreground transition-colors">
                      {tag.tag}
                    </span>
                    <span className="text-[9px] text-muted-foreground/60 tabular-nums ml-0.5">
                      {tag.useCount}
                    </span>
                  </motion.button>
                ))}
            </motion.div>

            {filteredHashtags.filter((h) => h.platform === tagPlatform).length === 0 && (
              <div className="text-center py-6">
                <Tag className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">暂无匹配的标签</p>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Phrases Tab ─────────────────────────────────────── */}
        {activeTab === "phrases" && (
          <motion.div
            key="phrases"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {/* Phrase Category Filter */}
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setActivePhraseCat("all")}
                className={`px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap transition-all shrink-0 ${
                  activePhraseCat === "all"
                    ? "bg-foreground text-background"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                全部 ({phrases.length})
              </button>
              {PHRASE_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const count = phrases.filter((p) => p.category === cat.value).length;
                return (
                  <button
                    key={cat.value}
                    onClick={() => setActivePhraseCat(cat.value)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap transition-all shrink-0 ${
                      activePhraseCat === cat.value
                        ? cat.color
                        : "bg-muted/60 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {cat.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Draggable hint */}
            <div className="flex items-center gap-1.5 px-2 text-[10px] text-muted-foreground/60">
              <GripVertical className="h-3 w-3" />
              拖拽可自定义排序
            </div>

            {/* Sortable phrase list */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handlePhraseDragEnd}
            >
              <SortableContext
                items={filteredPhrases.map((p) => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  key={`phrase-${activePhraseCat}`}
                  className="space-y-1.5"
                >
                  {filteredPhrases.map((phrase) => (
                    <SortablePhraseItem
                      key={phrase.id}
                      item={phrase}
                      onCopy={handleCopyPhrase}
                      onDelete={handleDeletePhrase}
                    />
                  ))}
                </motion.div>
              </SortableContext>
            </DndContext>

            {filteredPhrases.length === 0 && (
              <div className="text-center py-6">
                <MessageSquareQuote className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">暂无匹配的短语</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
