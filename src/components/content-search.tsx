"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Search,
  FileText,
  BookOpen,
  User,
  Clock,
  X,
  ArrowRight,
  Sparkles,
  Eraser,
  Users,
} from "lucide-react";
import {
  CONTENT_TYPE_LABELS,
  POST_STATUS_LABELS,
  KNOWLEDGE_CATEGORY_LABELS,
  PLATFORM_LABELS,
} from "@/types";

// ─── Types ─────────────────────────────────────────────────────────────────────

// Server-side search result shapes (from /api/search)
interface ContentResult {
  id: string;
  type: "content";
  topic: string;
  content: string;
  platform: string;
  status: string;
  contentType: string;
  scheduledDate: string;
}

interface KnowledgeResult {
  id: string;
  type: "knowledge";
  title: string;
  content: string;
  category: string;
  tags: string;
}

interface PersonaResult {
  id: string;
  type: "persona";
  name: string;
  title: string;
  bio: string;
  industry: string;
}

interface AccountResult {
  id: string;
  type: "account";
  nickname: string;
  platform: string;
  bio: string;
  followers: number;
  postsCount: number;
}

type SearchResult = ContentResult | KnowledgeResult | PersonaResult | AccountResult;

interface SearchGroup {
  key: string;
  label: string;
  icon: typeof FileText;
  iconColor: string;
  results: SearchResult[];
}

// Unified API response shape
interface SearchResponse {
  query: string;
  type: string;
  total: number;
  results: {
    content: ContentResult[];
    knowledge: KnowledgeResult[];
    persona: PersonaResult[];
    accounts: AccountResult[];
  };
}

// Filter tabs
type FilterTab = "all" | "content" | "knowledge" | "persona" | "accounts";

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "content", label: "帖子" },
  { value: "knowledge", label: "知识库" },
  { value: "persona", label: "人设" },
  { value: "accounts", label: "账号" },
];

interface ContentSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const RECENT_SEARCHES_KEY = "content-search-recent";
const MAX_RECENT_SEARCHES = 5;
const DEBOUNCE_MS = 250;

const STATUS_COLORS: Record<string, string> = {
  planned: "bg-gray-400",
  published: "bg-emerald-500",
  generated: "bg-violet-500",
  optimized: "bg-amber-500",
};

const PLATFORM_DOT_COLORS: Record<string, string> = {
  wechat: "bg-green-500",
  xiaohongshu: "bg-red-500",
};

// ─── Helper: recent searches localStorage ─────────────────────────────────────

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentSearches(searches: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
  } catch {
    // ignore
  }
}

function addRecentSearch(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return;
  const recent = getRecentSearches().filter((s) => s !== trimmed);
  recent.unshift(trimmed);
  saveRecentSearches(recent.slice(0, MAX_RECENT_SEARCHES));
}

function clearRecentSearches() {
  saveRecentSearches([]);
}

// ─── Animation Variants ───────────────────────────────────────────────────────

const dialogVariants = {
  hidden: { opacity: 0, scale: 0.96, y: -10 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: -10 },
};

const resultItemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" as const } },
  exit: { opacity: 0, y: -4 },
};

const groupVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03, delayChildren: 0.05 },
  },
  exit: { opacity: 0 },
};

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

function SearchSkeletonRow() {
  return (
    <div className="flex items-start gap-3 px-3 py-2.5">
      <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  );
}

// ─── Platform Tag ─────────────────────────────────────────────────────────────

function PlatformTag({ platform }: { platform?: string }) {
  if (!platform) return null;
  const dotColor = PLATFORM_DOT_COLORS[platform] ?? "bg-gray-400";
  const label = PLATFORM_LABELS[platform as keyof typeof PLATFORM_LABELS] ?? platform;
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-medium">
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      {label}
    </span>
  );
}

// ─── Result Item ──────────────────────────────────────────────────────────────

function ResultItem({
  result,
  globalIndex,
  isSelected,
  onSelect,
}: {
  result: SearchResult;
  globalIndex: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSelected && ref.current) {
      ref.current.scrollIntoView({ block: "nearest" });
    }
  }, [isSelected]);

  // Icon & color per result type
  const iconMeta = useMemo(() => {
    switch (result.type) {
      case "content":
        return { Icon: FileText, color: "text-violet-500 dark:text-violet-400" };
      case "knowledge":
        return { Icon: BookOpen, color: "text-amber-500 dark:text-amber-400" };
      case "persona":
        return { Icon: User, color: "text-emerald-500 dark:text-emerald-400" };
      case "account":
        return { Icon: Users, color: "text-rose-500 dark:text-rose-400" };
    }
  }, [result.type]);

  const { Icon, color: iconColor } = iconMeta;

  // Title and preview based on type
  const title = useMemo(() => {
    switch (result.type) {
      case "content":
        return (result as ContentResult).topic || "未命名帖子";
      case "knowledge":
        return (result as KnowledgeResult).title;
      case "persona":
        return (result as PersonaResult).name;
      case "account":
        return (result as AccountResult).nickname || "未命名账号";
    }
  }, [result]);

  const preview = useMemo(() => {
    switch (result.type) {
      case "content": {
        const c = (result as ContentResult).content;
        return c.length > 60 ? c.slice(0, 60) + "…" : c;
      }
      case "knowledge": {
        const c = (result as KnowledgeResult).content;
        return c.length > 60 ? c.slice(0, 60) + "…" : c;
      }
      case "persona": {
        const p = result as PersonaResult;
        return `${p.title}${p.industry ? ` · ${p.industry}` : ""}`;
      }
      case "account": {
        const a = result as AccountResult;
        return a.bio
          ? a.bio.length > 60
            ? a.bio.slice(0, 60) + "…"
            : a.bio
          : `${a.platform === "xiaohongshu" ? "小红书" : "朋友圈"}账号`;
      }
    }
  }, [result]);

  return (
    <motion.div
      ref={ref}
      custom={globalIndex}
      variants={resultItemVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      onClick={onSelect}
      role="option"
      aria-selected={isSelected}
      className={`
        group flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer
        transition-all duration-150 outline-none
        ${
          isSelected
            ? "bg-primary/10 text-primary"
            : "hover:bg-muted/80 text-foreground"
        }
      `}
    >
      <div
        className={`
        shrink-0 h-8 w-8 rounded-lg flex items-center justify-center mt-0.5
        ${isSelected ? "bg-primary/15" : "bg-muted"}
        transition-colors duration-150
      `}
      >
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{title}</span>

          {/* Platform badge for content */}
          {result.type === "content" && (result as ContentResult).platform && (
            <PlatformTag platform={(result as ContentResult).platform} />
          )}
          {/* Platform badge for accounts */}
          {result.type === "account" && (result as AccountResult).platform && (
            <PlatformTag platform={(result as AccountResult).platform} />
          )}

          {/* Status dot for content */}
          {result.type === "content" && (result as ContentResult).status && (
            <span className="flex items-center gap-1 shrink-0">
              <span
                className={`h-2 w-2 rounded-full ${STATUS_COLORS[(result as ContentResult).status] ?? "bg-gray-400"}`}
              />
              <span className="text-[9px] text-muted-foreground">
                {POST_STATUS_LABELS[(result as ContentResult).status as keyof typeof POST_STATUS_LABELS] ?? (result as ContentResult).status}
              </span>
            </span>
          )}

          {/* Category badge for knowledge */}
          {result.type === "knowledge" && (result as KnowledgeResult).category && (
            <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">
              {KNOWLEDGE_CATEGORY_LABELS[(result as KnowledgeResult).category as keyof typeof KNOWLEDGE_CATEGORY_LABELS] ?? (result as KnowledgeResult).category}
            </Badge>
          )}

          {/* Content type badge for posts */}
          {result.type === "content" && (result as ContentResult).contentType && (
            <Badge variant="secondary" className="text-[9px] h-4 px-1 shrink-0">
              {CONTENT_TYPE_LABELS[(result as ContentResult).contentType as keyof typeof CONTENT_TYPE_LABELS] ?? (result as ContentResult).contentType}
            </Badge>
          )}

          {/* Followers for accounts */}
          {result.type === "account" && (result as AccountResult).followers > 0 && (
            <span className="text-[9px] text-muted-foreground shrink-0">
              {(result as AccountResult).followers >= 10000
                ? `${((result as AccountResult).followers / 10000).toFixed(1)}w`
                : (result as AccountResult).followers >= 1000
                  ? `${((result as AccountResult).followers / 1000).toFixed(1)}k`
                  : `${(result as AccountResult).followers}`}粉丝
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{preview}</p>
      </div>

      <ArrowRight
        className={`
        h-3.5 w-3.5 shrink-0 mt-1.5 transition-all duration-150
        ${isSelected ? "opacity-100 text-primary" : "opacity-0 group-hover:opacity-50 text-muted-foreground"}
      `}
      />
    </motion.div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ query }: { query: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center justify-center gap-3 py-10 px-4"
    >
      <div className="h-12 w-12 rounded-full bg-muted/80 flex items-center justify-center">
        <Search className="h-5 w-5 text-muted-foreground/60" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground/80">未找到结果</p>
        <p className="text-xs text-muted-foreground mt-1">
          试试其他关键词，如{" "}
          <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">
            &quot;{query.length > 4 ? query.slice(0, 4) : query}&quot;
          </kbd>{" "}
          的同义词
        </p>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ContentSearch({ open, onOpenChange }: ContentSearchProps) {
  const { setSelectedPostId, setRightPanelTab, setLeftPanelTab } = useAppStore();

  const [query, setQuery] = useState("");
  const [searchData, setSearchData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const searchPerformedRef = useRef(false);

  // ── Reset state when dialog opens ──────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches());
      setQuery("");
      setSearchData(null);
      setLoading(false);
      setSelectedIndex(0);
      setActiveTab("all");
      searchPerformedRef.current = false;
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open]);

  // ── Debounced search via /api/search ──────────────────────────────────────
  const performSearch = useCallback(
    async (searchQuery: string, filterType: FilterTab = "all") => {
      const trimmed = searchQuery.trim();
      if (!trimmed) {
        setSearchData(null);
        setLoading(false);
        return;
      }

      // Abort previous request
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      try {
        const params = new URLSearchParams({ q: trimmed });
        if (filterType !== "all") {
          params.set("type", filterType);
        }
        const res = await fetch(`/api/search?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Search failed");
        const data: SearchResponse = await res.json();
        setSearchData(data);
        setSelectedIndex(0);
        searchPerformedRef.current = true;
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Search failed:", err);
          setSearchData(null);
        }
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (!value.trim()) {
        setSearchData(null);
        setLoading(false);
        return;
      }

      debounceTimerRef.current = setTimeout(() => {
        performSearch(value, activeTab);
      }, DEBOUNCE_MS);
    },
    [performSearch, activeTab],
  );

  // ── Tab change triggers re-search ──────────────────────────────────────────
  const handleTabChange = useCallback(
    (tab: FilterTab) => {
      setActiveTab(tab);
      setSelectedIndex(0);
      if (query.trim()) {
        // Abort pending, clear debounce, search immediately
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        if (abortRef.current) abortRef.current.abort();
        performSearch(query, tab);
      }
    },
    [query, performSearch],
  );

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // ── Build groups from API response ─────────────────────────────────────────
  const groups = useMemo<SearchGroup[]>(() => {
    if (!searchData) return [];
    const g: SearchGroup[] = [];

    // Apply tab filter: if tab is "all" show everything; otherwise filter
    const r = searchData.results;

    if (r.content.length > 0 && (activeTab === "all" || activeTab === "content")) {
      g.push({
        key: "content",
        label: "帖子",
        icon: FileText,
        iconColor: "text-violet-500",
        results: r.content,
      });
    }
    if (r.knowledge.length > 0 && (activeTab === "all" || activeTab === "knowledge")) {
      g.push({
        key: "knowledge",
        label: "知识库",
        icon: BookOpen,
        iconColor: "text-amber-500",
        results: r.knowledge,
      });
    }
    if (r.persona.length > 0 && (activeTab === "all" || activeTab === "persona")) {
      g.push({
        key: "persona",
        label: "人设",
        icon: User,
        iconColor: "text-emerald-500",
        results: r.persona,
      });
    }
    if (r.accounts.length > 0 && (activeTab === "all" || activeTab === "accounts")) {
      g.push({
        key: "accounts",
        label: "追踪账号",
        icon: Users,
        iconColor: "text-rose-500",
        results: r.accounts,
      });
    }
    return g;
  }, [searchData, activeTab]);

  // ── Flat list for keyboard navigation ──────────────────────────────────────
  const flatResults = useMemo<SearchResult[]>(() => {
    return groups.flatMap((g) => g.results);
  }, [groups]);

  // Ensure selected index is in bounds
  useEffect(() => {
    if (flatResults.length > 0 && selectedIndex >= flatResults.length) {
      setSelectedIndex(0);
    }
  }, [flatResults.length, selectedIndex]);

  // ── Map global index to group-aware index ──────────────────────────────────
  const getGlobalIndex = useCallback(
    (groupIdx: number, itemIdx: number) => {
      let count = 0;
      for (let i = 0; i < groupIdx; i++) {
        count += groups[i].results.length;
      }
      return count + itemIdx;
    },
    [groups],
  );

  // ── Handle result selection ────────────────────────────────────────────────
  const handleSelectResult = useCallback(
    (result: SearchResult) => {
      addRecentSearch(query);
      onOpenChange(false);

      switch (result.type) {
        case "content":
          setSelectedPostId(result.id);
          setRightPanelTab("workspace");
          break;
        case "knowledge":
          setLeftPanelTab("knowledge");
          break;
        case "persona":
          setLeftPanelTab("persona");
          break;
        case "account":
          // No specific navigation — just close
          break;
      }
    },
    [query, onOpenChange, setSelectedPostId, setRightPanelTab, setLeftPanelTab],
  );

  // ── Recent search click ───────────────────────────────────────────────────
  const handleRecentSearchClick = useCallback(
    (recentQuery: string) => {
      setQuery(recentQuery);
      performSearch(recentQuery, activeTab);
    },
    [performSearch, activeTab],
  );

  const handleClearRecent = useCallback(() => {
    clearRecentSearches();
    setRecentSearches([]);
  }, []);

  // ── Keyboard navigation ────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            flatResults.length > 0 ? (prev + 1) % flatResults.length : 0,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            flatResults.length > 0
              ? (prev - 1 + flatResults.length) % flatResults.length
              : 0,
          );
          break;
        case "Enter":
          e.preventDefault();
          if (flatResults.length > 0 && flatResults[selectedIndex]) {
            handleSelectResult(flatResults[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onOpenChange(false);
          break;
      }
    },
    [flatResults, selectedIndex, handleSelectResult, onOpenChange],
  );

  const hasResults = flatResults.length > 0;
  const hasQuery = query.trim().length > 0;
  const showLoading = loading && hasQuery;
  const totalCount = searchData?.total ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTitle className="sr-only">全局搜索</DialogTitle>
      <DialogDescription className="sr-only">
        搜索帖子、知识库、人设和追踪账号
      </DialogDescription>
      <DialogContent
        className="overflow-hidden p-0 gap-0 sm:max-w-xl rounded-xl border shadow-2xl"
        showCloseButton={false}
      >
        <AnimatePresence mode="wait">
          {open && (
            <motion.div
              key="content-search-inner"
              variants={dialogVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex flex-col max-h-[75vh]"
            >
              {/* ── Search Input ───────────────────────────────────────── */}
              <div className="flex items-center gap-2 px-4 py-3 border-b">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="全局搜索帖子、知识库、人设、账号..."
                  className="border-0 shadow-none focus-visible:ring-0 h-8 px-0 text-sm input-glow"
                />
                {query && (
                  <button
                    onClick={() => {
                      setQuery("");
                      setSearchData(null);
                      inputRef.current?.focus();
                    }}
                    className="shrink-0 h-5 w-5 rounded-full flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors"
                    aria-label="清除搜索"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
                <kbd className="hidden sm:inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1 font-mono text-[10px] text-muted-foreground shrink-0">
                  Esc
                </kbd>
              </div>

              {/* ── Filter Tabs ────────────────────────────────────────── */}
              {hasQuery && (
                <div className="flex items-center gap-1 px-3 py-1.5 border-b">
                  {FILTER_TABS.map((tab) => (
                    <button
                      key={tab.value}
                      onClick={() => handleTabChange(tab.value)}
                      className={`
                        relative flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium
                        transition-all duration-200
                        ${
                          activeTab === tab.value
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        }
                      `}
                    >
                      {activeTab === tab.value && (
                        <motion.div
                          layoutId="global-search-tab-active"
                          className="absolute inset-0 rounded-full bg-primary/10"
                          transition={{ type: "spring", stiffness: 500, damping: 35 }}
                        />
                      )}
                      <span className="relative z-10">{tab.label}</span>
                      {/* Count badges */}
                      {tab.value === "content" && searchData && searchData.results.content.length > 0 && (
                        <span className="relative z-10 text-[9px] text-muted-foreground">
                          {searchData.results.content.length}
                        </span>
                      )}
                      {tab.value === "knowledge" && searchData && searchData.results.knowledge.length > 0 && (
                        <span className="relative z-10 text-[9px] text-muted-foreground">
                          {searchData.results.knowledge.length}
                        </span>
                      )}
                      {tab.value === "persona" && searchData && searchData.results.persona.length > 0 && (
                        <span className="relative z-10 text-[9px] text-muted-foreground">
                          {searchData.results.persona.length}
                        </span>
                      )}
                      {tab.value === "accounts" && searchData && searchData.results.accounts.length > 0 && (
                        <span className="relative z-10 text-[9px] text-muted-foreground">
                          {searchData.results.accounts.length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Results Area ───────────────────────────────────────── */}
              <div className="flex-1 overflow-y-auto overscroll-contain smooth-scroll">
                {/* Loading State */}
                {showLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-2"
                  >
                    <div className="px-3 py-1.5">
                      <Skeleton className="h-4 w-16 mb-2" />
                    </div>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <SearchSkeletonRow key={i} />
                    ))}
                  </motion.div>
                )}

                {/* Empty / Recent Searches (no query) */}
                {!hasQuery && !loading && (
                  <div className="py-4">
                    {recentSearches.length > 0 ? (
                      <div>
                        <div className="flex items-center justify-between px-4 py-1.5">
                          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            最近搜索
                          </span>
                          <button
                            onClick={handleClearRecent}
                            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
                          >
                            <Eraser className="h-2.5 w-2.5" />
                            清除
                          </button>
                        </div>
                        <div className="px-2">
                          {recentSearches.map((term, i) => (
                            <motion.button
                              key={term}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.04, duration: 0.15 }}
                              onClick={() => handleRecentSearchClick(term)}
                              className="flex items-center gap-2 w-full px-2 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                            >
                              <Clock className="h-3 w-3 shrink-0 opacity-50" />
                              <span className="truncate">{term}</span>
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 py-6">
                        <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center">
                          <Sparkles className="h-5 w-5 text-muted-foreground/50" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-foreground/70 font-medium">
                            全局搜索
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            搜索帖子、知识库、人设和追踪账号
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* No Results State */}
                {hasQuery && !loading && !hasResults && searchPerformedRef.current && (
                  <EmptyState query={query} />
                )}

                {/* Grouped Results */}
                {hasQuery && !loading && hasResults && (
                  <motion.div
                    key={`${activeTab}-${query}`}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={groupVariants}
                    className="py-2"
                  >
                    {groups.map((group, groupIdx) => (
                      <div key={group.key}>
                        {/* Group header */}
                        <div className="flex items-center gap-2 px-4 py-1.5">
                          <group.icon className={`h-3 w-3 ${group.iconColor}`} />
                          <span className="text-xs font-medium text-muted-foreground">
                            {group.label}
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-[9px] h-4 px-1"
                          >
                            {group.results.length}
                          </Badge>
                        </div>
                        {/* Group items */}
                        {group.results.map((result, itemIdx) => {
                          const globalIdx = getGlobalIndex(groupIdx, itemIdx);
                          return (
                            <ResultItem
                              key={result.id}
                              result={result}
                              globalIndex={globalIdx}
                              isSelected={selectedIndex === globalIdx}
                              onSelect={() => handleSelectResult(result)}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* ── Footer ─────────────────────────────────────────────── */}
              <div className="border-t px-4 py-2 flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1 font-mono text-[10px]">
                      ↑↓
                    </kbd>
                    导航
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1 font-mono text-[10px]">
                      ↵
                    </kbd>
                    选择
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1 font-mono text-[10px]">
                      esc
                    </kbd>
                    关闭
                  </span>
                </div>
                {hasResults && (
                  <span className="text-[10px]">
                    {totalCount} 个结果
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
