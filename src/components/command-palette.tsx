"use client";

import {
  useCallback,
  useMemo,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Search,
  Sparkles,
  CalendarRange,
  BarChart3,
  Globe,
  Settings,
  BookOpen,
  FileText,
  MessageCircle,
  PenTool,
  Zap,
  Keyboard,
  Clock,
  User,
  Copy,
  Check,
  Briefcase,
  Heart,
  SearchX,
  History,
  X,
  ArrowUpDown,
  TrendingUp,
  LayoutTemplate,
  Moon,
  SunMedium,
  RefreshCcw,
  Download,
  Upload,
  List,
  Activity,
  FileSearch,
  BookMarked,
  BrainCircuit,
  Bell,
  Database,
  Trash2,
  Compass,
} from "lucide-react";
import { toast } from "sonner";
import {
  CONTENT_TYPE_LABELS,
  POST_STATUS_LABELS,
  KNOWLEDGE_CATEGORY_LABELS,
  type ContentPost,
  type KnowledgeItem,
} from "@/types";
import { SHORTCUT_LIST } from "@/hooks/use-keyboard-shortcuts";

// ─── Search Tab Types ──────────────────────────────────────────────────────────

type SearchTab = "all" | "posts" | "knowledge" | "persona" | "templates";

interface SearchTabDef {
  value: SearchTab;
  label: string;
  icon: typeof FileText;
}

const SEARCH_TABS: SearchTabDef[] = [
  { value: "all", label: "全部", icon: Search },
  { value: "posts", label: "帖子", icon: FileText },
  { value: "knowledge", label: "知识库", icon: BookOpen },
  { value: "persona", label: "人设", icon: User },
  { value: "templates", label: "模板", icon: LayoutTemplate },
];

// ─── Sort Types ────────────────────────────────────────────────────────────────

type SortOption = "relevance" | "newest" | "interactions";

interface SortDef {
  value: SortOption;
  label: string;
  icon: typeof ArrowUpDown;
}

const SORT_OPTIONS: SortDef[] = [
  { value: "relevance", label: "相关度优先", icon: Search },
  { value: "newest", label: "最新优先", icon: Clock },
  { value: "interactions", label: "互动最高", icon: TrendingUp },
];

// ─── Status Indicator Colors ───────────────────────────────────────────────────

const STATUS_INDICATOR_COLORS: Record<string, string> = {
  planned: "bg-gray-400",
  published: "bg-emerald-500",
  generated: "bg-violet-500",
  optimized: "bg-amber-500",
};

// ─── Search History Helpers ────────────────────────────────────────────────────

const HISTORY_KEY = "cmd-palette-search-history";
const MAX_HISTORY = 10;

function loadHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(history: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

function addHistory(query: string) {
  if (!query.trim()) return;
  const history = loadHistory();
  const filtered = history.filter((h) => h !== query);
  filtered.unshift(query);
  saveHistory(filtered);
}

function removeHistory(query: string) {
  const history = loadHistory().filter((h) => h !== query);
  saveHistory(history);
}

function clearHistory() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(HISTORY_KEY);
}

// ─── Recently Used Commands ────────────────────────────────────────────────────

const RECENT_COMMANDS_KEY = "cmd-palette-recent-commands";
const MAX_RECENT_COMMANDS = 10;

interface RecentCommand {
  id: string;
  label: string;
  timestamp: number;
}

function loadRecentCommands(): RecentCommand[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_COMMANDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentCommand(cmd: { id: string; label: string }) {
  if (typeof window === "undefined") return;
  const commands = loadRecentCommands().filter((c) => c.id !== cmd.id);
  commands.unshift({ ...cmd, timestamp: Date.now() });
  localStorage.setItem(
    RECENT_COMMANDS_KEY,
    JSON.stringify(commands.slice(0, MAX_RECENT_COMMANDS)),
  );
}

// ─── Hot Keywords by Platform ─────────────────────────────────────────────────

const HOT_KEYWORDS: Record<string, string[]> = {
  wechat: ["早安文案", "专业分享", "互动话题", "观点洞察", "成就展示", "产品推荐"],
  xiaohongshu: ["好物推荐", "种草测评", "穿搭分享", "美食探店", "旅行攻略", "知识干货"],
};

// ─── Dynamic Placeholder ──────────────────────────────────────────────────────

function getSearchPlaceholder(): string {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return "搜索内容或命令...";
  if (hour >= 12 && hour < 18) return "搜索帖子或灵感...";
  return "回顾今天的内容...";
}

// ─── Command Group Definitions ─────────────────────────────────────────────────

interface CommandDef {
  id: string;
  label: string;
  icon: typeof FileText;
  iconColor: string;
  action: string;
  shortcut?: string;
  group: "content" | "search" | "analytics" | "settings" | "actions";
}

const COMMAND_GROUPS = [
  {
    id: "navigation",
    label: "导航",
    icon: Compass,
    iconColor: "text-sky-500",
    commands: [
      { id: "view-calendar", label: "切换到日历视图", icon: CalendarRange, iconColor: "text-violet-500", action: "_left-calendar", shortcut: "⌘2" },
      { id: "view-data", label: "切换到数据分析", icon: BarChart3, iconColor: "text-emerald-500", action: "data", shortcut: "⌘4" },
      { id: "view-workspace", label: "切换到内容工作台", icon: Briefcase, iconColor: "text-amber-500", action: "_workspace", shortcut: "⌘3" },
      { id: "view-knowledge", label: "切换到知识库", icon: User, iconColor: "text-sky-500", action: "knowledge", shortcut: "⌘1" },
      { id: "view-templates", label: "切换到模板市场", icon: LayoutTemplate, iconColor: "text-rose-500", action: "_templates" },
    ],
  },
  {
    id: "content",
    label: "内容",
    icon: PenTool,
    iconColor: "text-violet-500",
    commands: [
      { id: "new-content", label: "创建新内容", icon: FileText, iconColor: "text-violet-500", action: "generate", shortcut: "⌘N" },
      { id: "ai-today", label: "AI生成今日内容", icon: Sparkles, iconColor: "text-amber-500", action: "generate", shortcut: "⌘G" },
      { id: "batch-generate", label: "批量生成内容", icon: Zap, iconColor: "text-sky-500", action: "batch" },
      { id: "batch-optimize", label: "批量优化内容", icon: RefreshCcw, iconColor: "text-teal-500", action: "batch" },
      { id: "publish-queue", label: "发布队列", icon: List, iconColor: "text-emerald-500", action: "_publish-queue" },
    ],
  },
  {
    id: "ai-tools",
    label: "AI 工具",
    icon: BrainCircuit,
    iconColor: "text-emerald-500",
    commands: [
      { id: "ai-optimize", label: "AI优化选中内容", icon: Sparkles, iconColor: "text-violet-500", action: "_workspace" },
      { id: "ai-score", label: "AI质量评分", icon: BarChart3, iconColor: "text-amber-500", action: "_workspace" },
      { id: "ai-spellcheck", label: "AI错别字检查", icon: Check, iconColor: "text-emerald-500", action: "_workspace" },
      { id: "ai-schedule", label: "AI智能排期", icon: Clock, iconColor: "text-sky-500", action: "_workspace" },
      { id: "ai-cover", label: "AI封面生成", icon: Sparkles, iconColor: "text-rose-500", action: "_workspace" },
    ],
  },
  {
    id: "search",
    label: "搜索",
    icon: FileSearch,
    iconColor: "text-sky-500",
    commands: [
      { id: "search-content", label: "搜索内容", icon: Search, iconColor: "text-violet-500", action: "_search-posts", shortcut: "⌘F" },
      { id: "search-knowledge", label: "搜索知识库", icon: BookOpen, iconColor: "text-amber-500", action: "knowledge" },
      { id: "search-templates", label: "搜索模板", icon: LayoutTemplate, iconColor: "text-sky-500", action: "templates" },
    ],
  },
  {
    id: "analytics",
    label: "数据与报告",
    icon: BarChart3,
    iconColor: "text-emerald-500",
    commands: [
      { id: "view-analytics", label: "查看数据分析", icon: BarChart3, iconColor: "text-emerald-500", action: "data", shortcut: "⌘4" },
      { id: "rhythm", label: "运营节奏仪表板", icon: Activity, iconColor: "text-rose-500", action: "data" },
      { id: "health-report", label: "内容健康度报告", icon: Heart, iconColor: "text-pink-500", action: "data" },
      { id: "weekly-report", label: "生成周报", icon: TrendingUp, iconColor: "text-violet-500", action: "data" },
      { id: "export-data", label: "导出数据", icon: Download, iconColor: "text-sky-500", action: "_export" },
    ],
  },
  {
    id: "settings",
    label: "设置",
    icon: Settings,
    iconColor: "text-muted-foreground",
    commands: [
      { id: "ai-config", label: "AI模型配置", icon: BrainCircuit, iconColor: "text-violet-500", action: "settings", shortcut: "⌘," },
      { id: "notifications", label: "通知设置", icon: Bell, iconColor: "text-amber-500", action: "settings" },
      { id: "import-data", label: "导入数据", icon: Upload, iconColor: "text-sky-500", action: "_import" },
      { id: "database", label: "数据库管理", icon: Database, iconColor: "text-zinc-500", action: "settings" },
    ],
  },
  {
    id: "actions",
    label: "快捷操作",
    icon: Zap,
    iconColor: "text-amber-500",
    commands: [
      { id: "toggle-dark", label: "切换暗黑模式", icon: Moon, iconColor: "text-violet-400", action: "_toggle-dark", shortcut: "⌘D" },
      { id: "toggle-platform", label: "切换平台", icon: MessageCircle, iconColor: "text-emerald-500", action: "_toggle-platform", shortcut: "⇧⌘P" },
      { id: "show-shortcuts", label: "显示快捷键帮助", icon: Keyboard, iconColor: "text-sky-500", action: "_show-shortcuts", shortcut: "⌘/" },
      { id: "clear-cache", label: "清空缓存", icon: Trash2, iconColor: "text-red-400", action: "_clear-cache" },
    ],
  },
];

// ─── Fuzzy Search Helper ───────────────────────────────────────────────────────

function fuzzyMatch(text: string, query: string): boolean {
  const lower = text.toLowerCase();
  const ql = query.toLowerCase();
  if (lower.includes(ql)) return true;
  let qi = 0;
  for (let i = 0; i < lower.length && qi < ql.length; i++) {
    if (lower[i] === ql[qi]) qi++;
  }
  return qi === ql.length;
}

function fuzzyScore(text: string, query: string): number {
  const lower = text.toLowerCase();
  const ql = query.toLowerCase();
  if (lower.includes(ql)) {
    const idx = lower.indexOf(ql);
    return 10 + (idx < 5 ? 5 : 0);
  }
  let qi = 0;
  let score = 0;
  for (let i = 0; i < lower.length && qi < ql.length; i++) {
    if (lower[i] === ql[qi]) {
      score += 1;
      qi++;
    }
  }
  return qi === ql.length ? score : -1;
}

// ─── Highlight Text Component ─────────────────────────────────────────────────

function HighlightText({
  text,
  query,
  maxLength,
}: {
  text: string;
  query: string;
  maxLength?: number;
}) {
  const truncated = maxLength && text.length > maxLength ? text.slice(0, maxLength) + "…" : text;
  const q = query.trim().toLowerCase();

  if (!q) return <>{truncated}</>;

  const parts: { text: string; match: boolean }[] = [];
  const lowerText = truncated.toLowerCase();
  let lastIdx = 0;
  let pos = 0;

  while (true) {
    const idx = lowerText.indexOf(q, pos);
    if (idx === -1) break;
    if (idx > lastIdx) {
      parts.push({ text: truncated.slice(lastIdx, idx), match: false });
    }
    parts.push({ text: truncated.slice(idx, idx + q.length), match: true });
    lastIdx = idx + q.length;
    pos = idx + 1;
  }
  if (lastIdx < truncated.length) {
    parts.push({ text: truncated.slice(lastIdx), match: false });
  }

  if (parts.length === 0) return <>{truncated}</>;

  return (
    <>
      {parts.map((part, i) =>
        part.match ? (
          <span
            key={i}
            className="search-highlight"
          >
            {part.text}
          </span>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

// ─── Platform Badge ───────────────────────────────────────────────────────────

function PlatformBadge({ platform }: { platform?: string }) {
  if (!platform || platform === "wechat") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        朋友圈
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] text-red-500 dark:text-red-400 font-medium">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
      小红书
    </span>
  );
}

// ─── Status Indicator Dot ─────────────────────────────────────────────────────

function StatusIndicator({ status }: { status: string }) {
  const color = STATUS_INDICATOR_COLORS[status] || "bg-gray-400";
  return (
    <span
      className={`h-2 w-2 rounded-full ${color}`}
      title={POST_STATUS_LABELS[status as keyof typeof POST_STATUS_LABELS] || status}
    />
  );
}

// ─── CommandPalette Component ─────────────────────────────────────────────────

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const {
    contentPosts,
    knowledgeItems,
    persona,
    platform,
    setPlatform,
    setRightPanelTab,
    setLeftPanelTab,
    setSelectedPostId,
    setSelectedDate,
    setSettingsCenterOpen,
  } = useAppStore();
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchTab>("all");
  const [sortOption, setSortOption] = useState<SortOption>("relevance");
  const [placeholder, setPlaceholder] = useState(getSearchPlaceholder());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => loadHistory());
  const [showHistory, setShowHistory] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [recentCommands, setRecentCommands] = useState<RecentCommand[]>(() => loadRecentCommands());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const sortMenuRef = useRef<HTMLDivElement>(null);

  // ── Update placeholder every minute ─────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholder(getSearchPlaceholder());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // ── Close sort menu on outside click ────────────────────────────────────
  useEffect(() => {
    if (!sortMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setSortMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [sortMenuOpen]);

  // ── Show history when input focused and empty ───────────────────────────
  const handleInputFocus = useCallback(() => {
    if (!query.trim()) {
      setShowHistory(true);
    }
  }, [query]);

  const handleInputBlur = useCallback(() => {
    setTimeout(() => setShowHistory(false), 150);
  }, []);

  // ── Add to search history on search ─────────────────────────────────────
  const handleSearch = useCallback((searchQuery: string) => {
    if (searchQuery.trim()) {
      addHistory(searchQuery.trim());
      setSearchHistory(loadHistory());
    }
  }, []);

  // ── Remove a single history item ────────────────────────────────────────
  const handleRemoveHistory = useCallback((item: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    removeHistory(item);
    setSearchHistory(loadHistory());
  }, []);

  // ── Clear all history ───────────────────────────────────────────────────
  const handleClearHistory = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    clearHistory();
    setSearchHistory([]);
  }, []);

  // ── Toggle group expansion ──────────────────────────────────────────────
  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  // ── Recent edits (last 5 by updatedAt) ─────────────────────────────────
  const recentPosts = useMemo(() => {
    return [...contentPosts]
      .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
      .slice(0, 5);
  }, [contentPosts]);

  // ── Content search results with fuzzy matching ──────────────────────────
  const contentResults = useMemo(() => {
    let filtered = contentPosts;

    if (query.trim()) {
      filtered = contentPosts.filter(
        (p) =>
          fuzzyMatch(p.topic, query) ||
          fuzzyMatch(p.content, query),
      );
    }

    if (sortOption === "newest") {
      filtered = [...filtered].sort((a, b) =>
        (b.updatedAt || "").localeCompare(a.updatedAt || ""),
      );
    } else if (sortOption === "interactions") {
      filtered = [...filtered].sort(
        (a, b) =>
          (b.likes + b.comments + b.shares + b.views) -
          (a.likes + a.comments + a.shares + a.views),
      );
    } else {
      const q = query.trim().toLowerCase();
      if (q) {
        filtered = [...filtered].sort((a, b) => {
          const scoreA = fuzzyScore(`${a.topic} ${a.content}`, q);
          const scoreB = fuzzyScore(`${b.topic} ${b.content}`, q);
          return scoreB - scoreA;
        });
      }
    }

    return filtered;
  }, [query, contentPosts, sortOption]);

  // ── Knowledge search results with fuzzy matching ────────────────────────
  const knowledgeResults = useMemo(() => {
    let filtered = knowledgeItems;

    if (query.trim()) {
      const q = query.toLowerCase();
      filtered = knowledgeItems.filter(
        (k) =>
          fuzzyMatch(k.title, query) ||
          fuzzyMatch(k.content, query) ||
          fuzzyMatch(k.tags, query),
      );
    }

    if (sortOption === "newest") {
      filtered = [...filtered].sort((a, b) =>
        (b.updatedAt || "").localeCompare(a.updatedAt || ""),
      );
    } else if (sortOption === "relevance") {
      const q = query.trim().toLowerCase();
      if (q) {
        filtered = [...filtered].sort((a, b) => {
          const scoreA = fuzzyScore(`${a.title} ${a.content} ${a.tags}`, q);
          const scoreB = fuzzyScore(`${b.title} ${b.content} ${b.tags}`, q);
          return scoreB - scoreA;
        });
      }
    }

    return filtered;
  }, [query, knowledgeItems, sortOption]);

  // ── Persona search match ────────────────────────────────────────────────
  const personaMatch = useMemo(() => {
    if (!persona || !persona.name) return false;
    if (activeTab !== "all" && activeTab !== "persona") return false;
    if (!query.trim()) return true;
    return fuzzyMatch(
      `${persona.name} ${persona.title || ""} ${persona.bio || ""} ${persona.industry || ""}`,
      query,
    );
  }, [persona, query, activeTab]);

  // ── Template search results (static) with fuzzy matching ───────────────
  const templateResults = useMemo(() => {
    const TEMPLATES = [
      { id: "morning", title: "早安问候", description: "温暖有活力的早安文案，适合每日打卡", category: "日常" },
      { id: "expertise", title: "专业分享", description: "展示专业能力，建立行业影响力", category: "专业" },
      { id: "story", title: "故事叙述", description: "用故事引发共鸣，增强情感连接", category: "故事" },
      { id: "interaction", title: "互动话题", description: "引发讨论，提升朋友圈活跃度", category: "互动" },
      { id: "insight", title: "观点洞察", description: "独到见解，展现思考深度", category: "观点" },
      { id: "achievement", title: "成就展示", description: "分享成果，建立信任和影响力", category: "成就" },
    ];

    if (!query.trim()) return TEMPLATES;
    return TEMPLATES.filter(
      (t) =>
        fuzzyMatch(t.title, query) ||
        fuzzyMatch(t.description, query) ||
        fuzzyMatch(t.category, query),
    );
  }, [query]);

  // ── Filtered command groups with fuzzy search ──────────────────────────
  const filteredCommandGroups = useMemo(() => {
    if (!query.trim()) return COMMAND_GROUPS;

    return COMMAND_GROUPS
      .map((group) => ({
        ...group,
        commands: group.commands.filter((cmd) =>
          fuzzyMatch(cmd.label, query),
        ),
      }))
      .filter((group) => group.commands.length > 0);
  }, [query]);

  // ── Tab-filtered results ────────────────────────────────────────────────
  const showPosts = activeTab === "all" || activeTab === "posts";
  const showKnowledge = activeTab === "all" || activeTab === "knowledge";
  const showPersona = activeTab === "all" || activeTab === "persona";
  const showTemplates = activeTab === "all" || activeTab === "templates";

  const isXHS = platform === "xiaohongshu";
  const hasQuery = query.trim().length > 0;

  // ── Total result counts per category ────────────────────────────────────
  const tabCounts = useMemo(() => {
    const q = query.toLowerCase();
    return {
      posts: hasQuery
        ? contentPosts.filter((p) => p.topic.toLowerCase().includes(q) || p.content.toLowerCase().includes(q)).length
        : contentPosts.length,
      knowledge: hasQuery
        ? knowledgeItems.filter((k) => k.title.toLowerCase().includes(q) || k.content.toLowerCase().includes(q) || k.tags.toLowerCase().includes(q)).length
        : knowledgeItems.length,
      persona: persona?.name ? 1 : 0,
      templates: templateResults.length,
    };
  }, [query, contentPosts, knowledgeItems, persona, templateResults, hasQuery]);

  // ── Determine if we have any results to show ────────────────────────────
  const hasAnyResults = useMemo(() => {
    if (hasQuery) {
      return (
        (showPosts && contentResults.length > 0) ||
        (showKnowledge && knowledgeResults.length > 0) ||
        (showPersona && personaMatch) ||
        (showTemplates && templateResults.length > 0) ||
        filteredCommandGroups.length > 0
      );
    }
    return true;
  }, [hasQuery, showPosts, contentResults.length, showKnowledge, knowledgeResults.length, showPersona, personaMatch, showTemplates, templateResults.length, filteredCommandGroups.length]);

  // ── Hot keywords for current platform ───────────────────────────────────
  const hotKeywords = useMemo(() => {
    return HOT_KEYWORDS[isXHS ? "xiaohongshu" : "wechat"] || HOT_KEYWORDS.wechat;
  }, [isXHS]);

  // ── Copy post content to clipboard ──────────────────────────────────────
  const handleCopyPost = useCallback(
    async (post: ContentPost, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      try {
        await navigator.clipboard.writeText(post.content);
        setCopiedId(post.id);
        toast.success("内容已复制到剪贴板");
        setTimeout(() => setCopiedId(null), 2000);
      } catch {
        toast.error("复制失败");
      }
    },
    [],
  );

  // ── Select a content post ───────────────────────────────────────────────
  const handleSelectPost = useCallback(
    (post: ContentPost) => {
      setSelectedPostId(post.id);
      setSelectedDate(post.scheduledDate);
      setRightPanelTab("workspace");
      onOpenChange(false);
      setQuery("");
    },
    [setSelectedPostId, setSelectedDate, setRightPanelTab, onOpenChange],
  );

  // ── Select a knowledge item ─────────────────────────────────────────────
  const handleSelectKnowledge = useCallback(
    (item: KnowledgeItem) => {
      setLeftPanelTab("knowledge");
      onOpenChange(false);
      setQuery("");
    },
    [setLeftPanelTab, onOpenChange],
  );

  // ── Select a template ───────────────────────────────────────────────────
  const handleSelectTemplate = useCallback(() => {
    setLeftPanelTab("templates");
    onOpenChange(false);
    setQuery("");
  }, [setLeftPanelTab, onOpenChange]);

  // ── Execute a command by action string (legacy shorthand) ───────────────
  const handleAction = useCallback(
    (action: string) => {
      switch (action) {
        case "generate":
          setRightPanelTab("workspace");
          break;
        case "batch":
          setRightPanelTab("workspace");
          break;
        case "data":
          setRightPanelTab("data");
          break;
        case "collect":
          setRightPanelTab("collect");
          break;
        case "settings":
          setSettingsCenterOpen(true);
          break;
        case "knowledge":
          setLeftPanelTab("knowledge");
          break;
        case "templates":
          setLeftPanelTab("templates");
          break;
        case "wechat":
        case "xiaohongshu":
          setPlatform(action as "wechat" | "xiaohongshu");
          toast.success(`已切换到${action === "wechat" ? "朋友圈" : "小红书"}`);
          break;
        case "_search-posts":
          setActiveTab("posts");
          setQuery("");
          return; // don't close palette
        case "_toggle-dark":
          document.documentElement.classList.toggle("dark");
          toast.success("已切换显示模式");
          break;
        case "_toggle-platform":
          setPlatform(platform === "wechat" ? "xiaohongshu" : "wechat");
          toast.success(`已切换到${platform === "wechat" ? "小红书" : "朋友圈"}`);
          break;
        case "_clear-cache":
          if (typeof window !== "undefined") {
            localStorage.removeItem("cmd-palette-search-history");
            localStorage.removeItem("cmd-palette-recent-commands");
            localStorage.removeItem("search-filter-presets");
            localStorage.removeItem("search-history-detailed");
            setSearchHistory([]);
            setRecentCommands([]);
            toast.success("缓存已清空");
          }
          break;
        case "_left-calendar":
          setLeftPanelTab("calendar");
          break;
        case "_workspace":
          setRightPanelTab("workspace");
          break;
        case "_templates":
          setLeftPanelTab("templates");
          break;
        case "_publish-queue":
          setRightPanelTab("data");
          break;
        case "_export":
          // Trigger export
          fetch("/api/export")
            .then((res) => {
              if (res.ok) toast.success("数据导出成功");
              else toast.error("导出失败");
            })
            .catch(() => toast.error("导出失败"));
          break;
        case "_import":
          setSettingsCenterOpen(true);
          break;
        case "_show-shortcuts":
          // Emit custom event for shortcuts dialog
          window.dispatchEvent(new CustomEvent("open-shortcuts-help"));
          return; // don't close palette, let shortcuts dialog open
        default:
          return;
      }
      onOpenChange(false);
      setQuery("");
    },
    [setRightPanelTab, setLeftPanelTab, setPlatform, platform, setSettingsCenterOpen, onOpenChange],
  );

  // ── Execute a command action from CommandDef ───────────────────────────────────
  const handleCommandAction = useCallback(
    (cmd: CommandDef) => {
      saveRecentCommand({ id: cmd.id, label: cmd.label });
      setRecentCommands(loadRecentCommands());
      handleAction(cmd.action);
    },
    [handleAction],
  );

  const handleOpenChange = useCallback(
    (val: boolean) => {
      onOpenChange(val);
      if (!val) {
        setQuery("");
        setSortMenuOpen(false);
      }
    },
    [onOpenChange],
  );

  const handleTabChange = useCallback((tab: SearchTab) => {
    setActiveTab(tab);
  }, []);

  const handleHistoryClick = useCallback(
    (item: string) => {
      setQuery(item);
      handleSearch(item);
      setShowHistory(false);
    },
    [handleSearch],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  const renderSortMenu = () => (
    <div ref={sortMenuRef} className="relative inline-block">
      <button
        onClick={() => setSortMenuOpen((prev) => !prev)}
        className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
      >
        <ArrowUpDown className="h-3 w-3" />
        {SORT_OPTIONS.find((s) => s.value === sortOption)?.label}
      </button>
      <AnimatePresence>
        {sortMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1 z-50 min-w-[130px] rounded-lg border bg-popover p-1 shadow-lg"
          >
            {SORT_OPTIONS.map((opt) => {
              const OptIcon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => {
                    setSortOption(opt.value);
                    setSortMenuOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                    sortOption === opt.value
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <OptIcon className="h-3 w-3" />
                  {opt.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderHistory = (): ReactNode => (
    <CommandGroup heading="搜索历史" className="px-0">
      <div className="px-1">
        {searchHistory.length > 0 && (
          <div className="flex items-center justify-between px-2 pb-1">
            <span className="text-[10px] text-muted-foreground">最近搜索</span>
            <button
              onClick={handleClearHistory}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              清除全部
            </button>
          </div>
        )}
        {searchHistory.map((item) => (
          <CommandItem
            key={item}
            value={`history-${item}`}
            onSelect={() => handleHistoryClick(item)}
            className="group flex items-center gap-2 py-2"
          >
            <History className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
            <span className="flex-1 text-sm truncate">{item}</span>
            <button
              onClick={(e) => handleRemoveHistory(item, e)}
              className="shrink-0 h-5 w-5 flex items-center justify-center rounded-sm text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </CommandItem>
        ))}
        {searchHistory.length === 0 && (
          <div className="py-4 text-center text-xs text-muted-foreground">
            暂无搜索历史
          </div>
        )}
      </div>
    </CommandGroup>
  );

  const renderEmptyState = () => (
    <div className="flex flex-col items-center gap-3 py-8 px-4">
      <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center">
        <SearchX className="h-6 w-6 text-muted-foreground/60" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground">未找到相关内容</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          试试其他关键词或切换分类
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5 justify-center mt-1">
        {hotKeywords.map((kw) => (
          <button
            key={kw}
            onClick={() => setQuery(kw)}
            className="px-2.5 py-1 rounded-full text-[11px] border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            {kw}
          </button>
        ))}
      </div>
    </div>
  );

  const renderRecentCommands = () => (
    recentCommands.length > 0 ? (
      <CommandGroup heading="最近使用">
        {recentCommands.slice(0, 5).map((rc) => {
          const allCmds = COMMAND_GROUPS.flatMap((g) => g.commands);
          const cmd = allCmds.find((c) => c.id === rc.id);
          if (!cmd) return null;
          const CmdIcon = cmd.icon;
          return (
            <CommandItem
              key={rc.id}
              value={`recent-cmd-${rc.id}`}
              onSelect={() => handleCommandAction(cmd)}
              className="recent-command group"
            >
              <CmdIcon className={`h-4 w-4 ${cmd.iconColor}`} />
              <span className="flex-1 text-sm">{cmd.label}</span>
              {cmd.shortcut && (
                <CommandShortcut className="text-[9px]">{cmd.shortcut}</CommandShortcut>
              )}
              <Clock className="h-3 w-3 text-muted-foreground/40" />
            </CommandItem>
          );
        })}
      </CommandGroup>
    ) : null
  );

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      <AnimatePresence>
        {open && (
          <motion.div
            key="command-palette-inner"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" as const }}
            className="contents"
          >
            <Command shouldFilter={false}>
              <CommandInput
                placeholder={placeholder}
                value={query}
                onValueChange={(val) => {
                  setQuery(val);
                  if (!val.trim()) setShowHistory(true);
                }}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                className="focus-ring-soft"
              />

              {/* ── Search Category Tabs + Sort ────────────────────── */}
              <div className="flex items-center justify-between gap-2 px-3 pt-1 pb-0">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                  {SEARCH_TABS.map((tab) => {
                    const TabIcon = tab.icon;
                    const count =
                      tab.value === "all"
                        ? tabCounts.posts + tabCounts.knowledge + tabCounts.persona + tabCounts.templates
                        : tab.value === "posts"
                          ? tabCounts.posts
                          : tab.value === "knowledge"
                            ? tabCounts.knowledge
                            : tab.value === "persona"
                              ? tabCounts.persona
                              : tabCounts.templates;

                    return (
                      <button
                        key={tab.value}
                        onClick={() => handleTabChange(tab.value)}
                        className={`
                          relative flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium
                          transition-all duration-200 whitespace-nowrap shrink-0
                          ${activeTab === tab.value
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                          }
                        `}
                      >
                        {activeTab === tab.value && (
                          <motion.div
                            layoutId="search-tab-active"
                            className="absolute inset-0 rounded-full bg-primary/10"
                            transition={{ type: "spring", stiffness: 500, damping: 35 }}
                          />
                        )}
                        <TabIcon className="relative z-10 h-3 w-3" />
                        <span className="relative z-10">{tab.label}</span>
                        {count > 0 && (
                          <Badge
                            variant={activeTab === tab.value ? "default" : "secondary"}
                            className="relative z-10 h-4 min-w-4 px-1 text-[9px] flex items-center justify-center"
                          >
                            {count > 99 ? "99+" : count}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
                {hasQuery && renderSortMenu()}
              </div>

              <CommandList className="max-h-[400px]">
                {/* ── Search History (when no query, focused) ──────────── */}
                <AnimatePresence mode="wait">
                  {showHistory && !hasQuery ? (
                    <motion.div
                      key="search-history"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                    >
                      {renderHistory()}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="search-content"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.1 }}
                    >
                      {/* ── Empty State ─────────────────────────── */}
                      {hasQuery && !hasAnyResults && renderEmptyState()}

                      {/* ── Recently Used Commands ──────────────── */}
                      {!hasQuery && renderRecentCommands()}

                      {/* ── Quick Actions (no query) ────────────── */}
                      {showPosts && !hasQuery && (
                        <CommandGroup heading="快速操作">
                          <CommandItem onSelect={() => {
                            saveRecentCommand({ id: "generate", label: "生成新内容" });
                            setRecentCommands(loadRecentCommands());
                            handleAction("generate");
                          }}>
                            <Sparkles
                              className={`h-4 w-4 ${isXHS ? "text-rose-500" : "text-violet-500"}`}
                            />
                            <span>生成新内容</span>
                            <CommandShortcut>
                              <Zap className="h-3 w-3" />
                            </CommandShortcut>
                          </CommandItem>
                          <CommandItem onSelect={() => {
                            saveRecentCommand({ id: "batch", label: "批量生成30天计划" });
                            setRecentCommands(loadRecentCommands());
                            handleAction("batch");
                          }}>
                            <CalendarRange className="h-4 w-4 text-amber-500" />
                            <span>批量生成30天计划</span>
                          </CommandItem>
                          <CommandItem onSelect={() => {
                            saveRecentCommand({ id: "data", label: "查看运营报告" });
                            setRecentCommands(loadRecentCommands());
                            handleAction("data");
                          }}>
                            <BarChart3 className="h-4 w-4 text-emerald-500" />
                            <span>查看运营报告</span>
                            <CommandShortcut>⌘3</CommandShortcut>
                          </CommandItem>
                          <CommandItem onSelect={() => handleAction("collect")}>
                            <Globe className="h-4 w-4 text-sky-500" />
                            <span>打开采集中心</span>
                          </CommandItem>
                          <CommandItem onSelect={() => handleAction("settings")}>
                            <Settings className="h-4 w-4 text-muted-foreground" />
                            <span>打开设置</span>
                          </CommandItem>
                          <CommandItem
                            onSelect={() =>
                              handleAction(isXHS ? "wechat" : "xiaohongshu")
                            }
                          >
                            <MessageCircle
                              className={`h-4 w-4 ${isXHS ? "text-green-500" : "text-red-500"}`}
                            />
                            <span>
                              切换到{isXHS ? "朋友圈" : "小红书"}
                            </span>
                          </CommandItem>
                        </CommandGroup>
                      )}

                      {showPosts && !hasQuery && <CommandSeparator className="divider-gradient" />}

                      {/* ── Command Groups (when querying) ────────── */}
                      {hasQuery && filteredCommandGroups.length > 0 && (
                        <>
                          {filteredCommandGroups.map((group) => {
                            const isExpanded = !query.trim() || expandedGroups.has(group.id) || query.trim().length > 0;
                            const GroupIcon = group.icon;
                            return (
                              <CommandGroup
                                key={group.id}
                                heading={
                                  <div
                                    className="command-group-header flex items-center gap-1.5 cursor-pointer select-none w-full"
                                    onClick={() => toggleGroup(group.id)}
                                  >
                                    <GroupIcon className={`h-3 w-3 ${group.iconColor}`} />
                                    <span>{group.label}</span>
                                    <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-auto">
                                      {group.commands.length}
                                    </Badge>
                                  </div>
                                }
                              >
                                <AnimatePresence>
                                  {isExpanded &&
                                    group.commands.map((cmd) => {
                                      const CmdIcon = cmd.icon;
                                      return (
                                        <motion.div
                                          key={cmd.id}
                                          initial={{ opacity: 0, x: -8 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          exit={{ opacity: 0, x: -8 }}
                                          transition={{ duration: 0.12 }}
                                        >
                                          <CommandItem
                                            value={`cmd-${cmd.id}`}
                                            onSelect={() => handleCommandAction(cmd)}
                                          >
                                            <CmdIcon className={`h-4 w-4 ${cmd.iconColor}`} />
                                            <span className="flex-1 text-sm">
                                              <HighlightText text={cmd.label} query={query} />
                                            </span>
                                            {cmd.shortcut && (
                                              <CommandShortcut className="text-[9px]">
                                                {cmd.shortcut}
                                              </CommandShortcut>
                                            )}
                                          </CommandItem>
                                        </motion.div>
                                      );
                                    })}
                                </AnimatePresence>
                              </CommandGroup>
                            );
                          })}
                          <CommandSeparator className="divider-gradient" />
                        </>
                      )}

                      {/* ── Persona Section ──────────────────────── */}
                      {showPersona && personaMatch && persona?.name && (
                        <>
                          <CommandGroup heading="人设信息">
                            <CommandItem
                              onSelect={() => handleAction("knowledge")}
                              className="flex-col !items-start gap-1.5 card-glow card-spotlight rounded-lg py-2.5"
                            >
                              <div className="flex items-center gap-2.5 w-full">
                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm flex-shrink-0">
                                  <User className="h-4 w-4 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold truncate">
                                      <HighlightText text={persona.name} query={query} />
                                    </span>
                                    <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">活跃</Badge>
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {persona.title && (
                                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                        <Briefcase className="h-2.5 w-2.5" />
                                        <HighlightText text={persona.title} query={query} />
                                      </span>
                                    )}
                                    {persona.industry && (
                                      <span className="text-[10px] text-muted-foreground">
                                        · <HighlightText text={persona.industry} query={query} />
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {persona.tone && (
                                    <Badge variant="secondary" className="text-[9px] h-4 px-1">
                                      <Heart className="h-2.5 w-2.5 mr-0.5" />
                                      {persona.tone}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {persona.bio && (
                                <p className="text-xs text-muted-foreground line-clamp-1 pl-[42px]">
                                  <HighlightText text={persona.bio.length > 60 ? persona.bio.slice(0, 60) + "…" : persona.bio} query={query} />
                                </p>
                              )}
                            </CommandItem>
                          </CommandGroup>
                        </>
                      )}

                      {showPersona && !persona?.name && !hasQuery && (
                        <CommandGroup heading="人设">
                          <CommandItem onSelect={() => handleAction("knowledge")}>
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">尚未设置人设，点击设置</span>
                            <CommandShortcut>⌘1</CommandShortcut>
                          </CommandItem>
                        </CommandGroup>
                      )}

                      {showPersona && <CommandSeparator className="divider-gradient" />}

                      {/* ── Recent Edits (when no query) ────────────── */}
                      {!hasQuery && showPosts && recentPosts.length > 0 && (
                        <>
                          <CommandGroup heading="最近编辑">
                            {recentPosts.map((post) => (
                              <CommandItem
                                key={post.id}
                                value={`recent-${post.id}`}
                                onSelect={() => handleSelectPost(post)}
                                className="flex-col !items-start gap-1 card-glow card-spotlight rounded-lg"
                              >
                                <div className="flex items-center gap-2 w-full">
                                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                  <span className="text-sm font-medium truncate flex-1">
                                    {post.topic}
                                  </span>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <StatusIndicator status={post.status} />
                                    <PlatformBadge platform={post.platform} />
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 pl-6">
                                  <Clock className="h-3 w-3 text-muted-foreground/60" />
                                  <span className="text-[10px] text-muted-foreground/70">
                                    {post.updatedAt ? new Date(post.updatedAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground line-clamp-1">
                                    {post.content.length > 40
                                      ? post.content.slice(0, 40) + "…"
                                      : post.content}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                          <CommandSeparator className="divider-gradient" />
                        </>
                      )}

                      {/* ── Content Search ─────────────────────────── */}
                      {showPosts && contentResults.length > 0 && (
                        <CommandGroup heading={hasQuery ? "内容搜索" : undefined}>
                          {contentResults.slice(0, 6).map((post) => (
                            <CommandItem
                              key={post.id}
                              value={`post-${post.id}`}
                              onSelect={() => handleSelectPost(post)}
                              className="flex-col !items-start gap-1 card-glow card-spotlight rounded-lg"
                            >
                              <div className="flex items-center gap-2 w-full">
                                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="text-sm font-medium truncate flex-1">
                                  <HighlightText text={post.topic} query={query} />
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <PlatformBadge platform={post.platform} />
                                  <StatusIndicator status={post.status} />
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] h-5 px-1.5"
                                  >
                                    {CONTENT_TYPE_LABELS[post.contentType as keyof typeof CONTENT_TYPE_LABELS] ?? post.contentType}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 pl-6 w-full">
                                <p className="text-xs text-muted-foreground line-clamp-1 flex-1">
                                  <HighlightText text={post.content} query={query} maxLength={50} />
                                </p>
                                <button
                                  onClick={(e) => handleCopyPost(post, e)}
                                  className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                                  title="复制内容"
                                >
                                  {copiedId === post.id ? (
                                    <><Check className="h-3 w-3 text-emerald-500" />已复制</>
                                  ) : (
                                    <><Copy className="h-3 w-3" />复制</>
                                  )}
                                </button>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}

                      <CommandSeparator className="divider-gradient" />

                      {/* ── Knowledge Search ───────────────────────── */}
                      {showKnowledge && knowledgeResults.length > 0 && (
                        <CommandGroup heading={hasQuery ? "知识库搜索" : undefined}>
                          {knowledgeResults.slice(0, 5).map((item) => (
                            <CommandItem
                              key={item.id}
                              value={`knowledge-${item.id}`}
                              onSelect={() => handleSelectKnowledge(item)}
                              className="flex-col !items-start gap-1 card-glow card-spotlight rounded-lg"
                            >
                              <div className="flex items-center gap-2 w-full">
                                <BookOpen className="h-4 w-4 shrink-0 text-amber-500" />
                                <span className="text-sm font-medium truncate flex-1">
                                  <HighlightText text={item.title} query={query} />
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] h-5 px-1.5 shrink-0"
                                >
                                  {KNOWLEDGE_CATEGORY_LABELS[item.category as keyof typeof KNOWLEDGE_CATEGORY_LABELS] ?? item.category}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-1 pl-6">
                                <HighlightText text={item.content} query={query} maxLength={50} />
                              </p>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}

                      <CommandSeparator className="divider-gradient" />

                      {/* ── Template Search ────────────────────────── */}
                      {showTemplates && templateResults.length > 0 && (
                        <CommandGroup heading={hasQuery ? "模板搜索" : "模板推荐"}>
                          {templateResults.slice(0, 4).map((t) => (
                            <CommandItem
                              key={t.id}
                              value={`template-${t.id}`}
                              onSelect={handleSelectTemplate}
                              className="flex-col !items-start gap-1 card-glow card-spotlight rounded-lg"
                            >
                              <div className="flex items-center gap-2 w-full">
                                <LayoutTemplate className="h-4 w-4 shrink-0 text-violet-500" />
                                <span className="text-sm font-medium truncate flex-1">
                                  <HighlightText text={t.title} query={query} />
                                </span>
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] h-5 px-1.5 shrink-0"
                                >
                                  {t.category}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-1 pl-6">
                                <HighlightText text={t.description} query={query} />
                              </p>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}

                      {showTemplates && <CommandSeparator className="divider-gradient" />}

                      {/* ── Panel Navigation ───────────────────────── */}
                      {showPosts && !hasQuery && (
                        <CommandGroup heading="面板导航">
                          <CommandItem onSelect={() => handleAction("knowledge")}>
                            <BookOpen className="h-4 w-4 text-amber-500" />
                            <span>打开知识库</span>
                            <CommandShortcut>⌘1</CommandShortcut>
                          </CommandItem>
                          <CommandItem onSelect={() => handleAction("generate")}>
                            <PenTool className="h-4 w-4 text-violet-500" />
                            <span>打开工作台</span>
                            <CommandShortcut>⌘2</CommandShortcut>
                          </CommandItem>
                          <CommandItem onSelect={() => handleAction("data")}>
                            <BarChart3 className="h-4 w-4 text-emerald-500" />
                            <span>打开数据与报告</span>
                            <CommandShortcut>⌘3</CommandShortcut>
                          </CommandItem>
                          <CommandItem onSelect={() => handleAction("templates")}>
                            <FileText className="h-4 w-4 text-sky-500" />
                            <span>打开模板库</span>
                          </CommandItem>
                        </CommandGroup>
                      )}

                      {!hasQuery && <CommandSeparator className="divider-gradient" />}

                      {/* ── Keyboard Shortcuts Help ────────────────── */}
                      {showPosts && !hasQuery && (
                        <CommandGroup heading="快捷键">
                          {SHORTCUT_LIST.slice(0, 5).map((sc) => (
                            <CommandItem
                              key={sc.label}
                              value={`shortcut-${sc.label}`}
                              onSelect={() => {
                                /* no-op — informational only */
                              }}
                            >
                              <Keyboard className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{sc.label}</span>
                              <CommandShortcut>{sc.keys.join("")}</CommandShortcut>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </CommandList>

              {/* ── Footer ──────────────────────────────────────────── */}
              <div className="divider-gradient px-3 py-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="kbd-badge">
                      ↑↓
                    </kbd>
                    导航
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="kbd-badge">
                      ↵
                    </kbd>
                    选择
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="kbd-badge">
                      esc
                    </kbd>
                    关闭
                  </span>
                </div>
                <span className="hidden sm:inline font-medium">{isXHS ? "小红书" : "朋友圈"}AI运营助手</span>
              </div>
            </Command>
          </motion.div>
        )}
      </AnimatePresence>
    </CommandDialog>
  );
}
