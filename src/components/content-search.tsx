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
} from "lucide-react";
import type { ContentPost, KnowledgeItem, Persona } from "@/types";
import { CONTENT_TYPE_LABELS, POST_STATUS_LABELS, KNOWLEDGE_CATEGORY_LABELS, PLATFORM_LABELS } from "@/types";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SearchResult {
  id: string;
  type: "post" | "knowledge" | "persona";
  title: string;
  preview: string;
  platform?: string;
  status?: string;
  category?: string;
  contentType?: string;
}

interface ContentSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const RECENT_SEARCHES_KEY = "content-search-recent";
const MAX_RECENT_SEARCHES = 5;
const DEBOUNCE_MS = 300;

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

// ─── Helper: get recent searches from localStorage ────────────────────────────

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
    // ignore storage errors
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

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

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

// ─── Platform Badge (inline) ──────────────────────────────────────────────────

function PlatformTag({ platform }: { platform?: string }) {
  if (!platform) return null;
  const dotColor = PLATFORM_DOT_COLORS[platform] ?? "bg-gray-400";
  const label = PLATFORM_LABELS[platform as keyof typeof PLATFORM_LABELS] ?? platform;
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-medium`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      {label}
    </span>
  );
}

// ─── Result Item ──────────────────────────────────────────────────────────────

function ResultItem({
  result,
  index,
  isSelected,
  onSelect,
}: {
  result: SearchResult;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Scroll into view when selected
  useEffect(() => {
    if (isSelected && ref.current) {
      ref.current.scrollIntoView({ block: "nearest" });
    }
  }, [isSelected]);

  const iconClass = result.type === "post"
    ? "text-violet-500 dark:text-violet-400"
    : result.type === "knowledge"
      ? "text-amber-500 dark:text-amber-400"
      : "text-emerald-500 dark:text-emerald-400";

  const IconComponent = result.type === "post"
    ? FileText
    : result.type === "knowledge"
      ? BookOpen
      : User;

  return (
    <motion.div
      ref={ref}
      custom={index}
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
      <div className={`
        shrink-0 h-8 w-8 rounded-lg flex items-center justify-center mt-0.5
        ${isSelected ? "bg-primary/15" : "bg-muted"}
        transition-colors duration-150
      `}>
        <IconComponent className={`h-4 w-4 ${iconClass}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">
            {result.title}
          </span>
          {result.platform && (
            <PlatformTag platform={result.platform} />
          )}
          {result.status && (
            <span className="flex items-center gap-1 shrink-0">
              <span className={`h-2 w-2 rounded-full ${STATUS_COLORS[result.status] ?? "bg-gray-400"}`} />
              <span className="text-[9px] text-muted-foreground">
                {POST_STATUS_LABELS[result.status as keyof typeof POST_STATUS_LABELS] ?? result.status}
              </span>
            </span>
          )}
          {result.type === "knowledge" && result.category && (
            <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">
              {KNOWLEDGE_CATEGORY_LABELS[result.category as keyof typeof KNOWLEDGE_CATEGORY_LABELS] ?? result.category}
            </Badge>
          )}
          {result.type === "post" && result.contentType && (
            <Badge variant="secondary" className="text-[9px] h-4 px-1 shrink-0">
              {CONTENT_TYPE_LABELS[result.contentType as keyof typeof CONTENT_TYPE_LABELS] ?? result.contentType}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
          {result.preview}
        </p>
      </div>

      <ArrowRight className={`
        h-3.5 w-3.5 shrink-0 mt-1.5 transition-all duration-150
        ${isSelected ? "opacity-100 text-primary" : "opacity-0 group-hover:opacity-50 text-muted-foreground"}
      `} />
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
          试试其他关键词，如 <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">&quot;{query.length > 4 ? query.slice(0, 4) : query}&quot;</kbd> 的同义词
        </p>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ContentSearch({ open, onOpenChange }: ContentSearchProps) {
  const {
    setSelectedPostId,
    setRightPanelTab,
    setLeftPanelTab,
  } = useAppStore();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [personaResult, setPersonaResult] = useState<SearchResult | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchPerformedRef = useRef(false);

  // ── Load recent searches when dialog opens ─────────────────────────────────
  useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches());
      setQuery("");
      setResults([]);
      setPersonaResult(null);
      setLoading(false);
      setSelectedIndex(0);
      searchPerformedRef.current = false;
      // Focus input after dialog animation
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open]);

  // ── Debounced search ───────────────────────────────────────────────────────
  const performSearch = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setResults([]);
      setPersonaResult(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const allResults: SearchResult[] = [];

      // Fetch content posts
      const contentRes = await fetch("/api/content");
      if (contentRes.ok) {
        const posts: ContentPost[] = await contentRes.json();
        const q = trimmed.toLowerCase();
        const matched = posts.filter(
          (p) =>
            p.topic.toLowerCase().includes(q) ||
            p.content.toLowerCase().includes(q)
        );
        for (const p of matched.slice(0, 10)) {
          allResults.push({
            id: p.id,
            type: "post",
            title: p.topic || "未命名帖子",
            preview: p.content.length > 60 ? p.content.slice(0, 60) + "…" : p.content,
            platform: p.platform,
            status: p.status,
            contentType: p.contentType,
          });
        }
      }

      // Fetch knowledge items
      const knowledgeRes = await fetch("/api/knowledge");
      if (knowledgeRes.ok) {
        const items: KnowledgeItem[] = await knowledgeRes.json();
        const q = trimmed.toLowerCase();
        const matched = items.filter(
          (k) =>
            k.title.toLowerCase().includes(q) ||
            k.content.toLowerCase().includes(q) ||
            (k.tags && k.tags.toLowerCase().includes(q))
        );
        for (const item of matched.slice(0, 8)) {
          allResults.push({
            id: item.id,
            type: "knowledge",
            title: item.title,
            preview: item.content.length > 60 ? item.content.slice(0, 60) + "…" : item.content,
            category: item.category,
          });
        }
      }

      // Fetch persona
      const personaRes = await fetch("/api/persona");
      if (personaRes.ok) {
        const persona: Persona | null = await personaRes.json();
        if (persona) {
          const q = trimmed.toLowerCase();
          const personaMatch =
            persona.name.toLowerCase().includes(q) ||
            persona.title.toLowerCase().includes(q) ||
            persona.industry.toLowerCase().includes(q) ||
            persona.bio.toLowerCase().includes(q) ||
            persona.keywords.toLowerCase().includes(q) ||
            persona.tone.toLowerCase().includes(q);
          if (personaMatch) {
            setPersonaResult({
              id: persona.id,
              type: "persona",
              title: persona.name,
              preview: `${persona.title} · ${persona.industry}`,
            });
          } else {
            setPersonaResult(null);
          }
        }
      }

      setResults(allResults);
      setSelectedIndex(0);
      searchPerformedRef.current = true;
    } catch (err) {
      console.error("Search failed:", err);
      setResults([]);
      setPersonaResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (!value.trim()) {
        setResults([]);
        setPersonaResult(null);
        setLoading(false);
        return;
      }

      debounceTimerRef.current = setTimeout(() => {
        performSearch(value);
      }, DEBOUNCE_MS);
    },
    [performSearch]
  );

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // ── Group results ──────────────────────────────────────────────────────────
  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {
      帖子: [],
      知识库: [],
      人设: [],
    };
    for (const r of results) {
      if (r.type === "post") groups["帖子"].push(r);
      else if (r.type === "knowledge") groups["知识库"].push(r);
    }
    if (personaResult) groups["人设"].push(personaResult);
    return groups;
  }, [results, personaResult]);

  // ── Flat list for keyboard navigation ──────────────────────────────────────
  const flatResults = useMemo(() => {
    const list: SearchResult[] = [];
    for (const r of results) list.push(r);
    if (personaResult) list.push(personaResult);
    return list;
  }, [results, personaResult]);

  // ── Handle selection ───────────────────────────────────────────────────────
  const handleSelectResult = useCallback(
    (result: SearchResult) => {
      addRecentSearch(query);
      onOpenChange(false);

      if (result.type === "post") {
        setSelectedPostId(result.id);
        setRightPanelTab("workspace");
      } else if (result.type === "knowledge") {
        setLeftPanelTab("knowledge");
      } else if (result.type === "persona") {
        setLeftPanelTab("knowledge"); // persona is on knowledge panel
      }
    },
    [query, onOpenChange, setSelectedPostId, setRightPanelTab, setLeftPanelTab]
  );

  // ── Handle recent search click ─────────────────────────────────────────────
  const handleRecentSearchClick = useCallback(
    (recentQuery: string) => {
      setQuery(recentQuery);
      performSearch(recentQuery);
    },
    [performSearch]
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
            flatResults.length > 0
              ? (prev + 1) % flatResults.length
              : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            flatResults.length > 0
              ? (prev - 1 + flatResults.length) % flatResults.length
              : 0
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
    [flatResults, selectedIndex, handleSelectResult, onOpenChange]
  );

  const hasResults = flatResults.length > 0;
  const hasQuery = query.trim().length > 0;
  const showLoading = loading && hasQuery;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTitle className="sr-only">搜索内容</DialogTitle>
      <DialogDescription className="sr-only">搜索帖子、知识库和人设</DialogDescription>
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
              className="flex flex-col max-h-[70vh]"
            >
              {/* ── Search Input ───────────────────────────────────────── */}
              <div className="flex items-center gap-2 px-4 py-3 border-b">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="搜索帖子、知识库、人设..."
                  className="border-0 shadow-none focus-visible:ring-0 h-8 px-0 text-sm"
                />
                {query && (
                  <button
                    onClick={() => {
                      setQuery("");
                      setResults([]);
                      setPersonaResult(null);
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
                          <p className="text-sm text-foreground/70 font-medium">搜索你的内容</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            输入关键词搜索帖子、知识库和人设
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
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={groupVariants}
                    className="py-2"
                  >
                    {/* 帖子 group */}
                    {groupedResults["帖子"].length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 px-4 py-1.5">
                          <FileText className="h-3 w-3 text-violet-500" />
                          <span className="text-xs font-medium text-muted-foreground">
                            帖子
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-[9px] h-4 px-1"
                          >
                            {groupedResults["帖子"].length}
                          </Badge>
                        </div>
                        {groupedResults["帖子"].map((result) => {
                          const flatIdx = flatResults.findIndex((r) => r.id === result.id);
                          return (
                            <ResultItem
                              key={result.id}
                              result={result}
                              index={flatIdx}
                              isSelected={selectedIndex === flatIdx}
                              onSelect={() => handleSelectResult(result)}
                            />
                          );
                        })}
                      </div>
                    )}

                    {/* 知识库 group */}
                    {groupedResults["知识库"].length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 px-4 py-1.5 mt-1">
                          <BookOpen className="h-3 w-3 text-amber-500" />
                          <span className="text-xs font-medium text-muted-foreground">
                            知识库
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-[9px] h-4 px-1"
                          >
                            {groupedResults["知识库"].length}
                          </Badge>
                        </div>
                        {groupedResults["知识库"].map((result) => {
                          const flatIdx = flatResults.findIndex((r) => r.id === result.id);
                          return (
                            <ResultItem
                              key={result.id}
                              result={result}
                              index={flatIdx}
                              isSelected={selectedIndex === flatIdx}
                              onSelect={() => handleSelectResult(result)}
                            />
                          );
                        })}
                      </div>
                    )}

                    {/* 人设 group */}
                    {groupedResults["人设"].length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 px-4 py-1.5 mt-1">
                          <User className="h-3 w-3 text-emerald-500" />
                          <span className="text-xs font-medium text-muted-foreground">
                            人设
                          </span>
                        </div>
                        {groupedResults["人设"].map((result) => {
                          const flatIdx = flatResults.findIndex((r) => r.id === result.id);
                          return (
                            <ResultItem
                              key={result.id}
                              result={result}
                              index={flatIdx}
                              isSelected={selectedIndex === flatIdx}
                              onSelect={() => handleSelectResult(result)}
                            />
                          );
                        })}
                      </div>
                    )}
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
                    {flatResults.length} 个结果
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
