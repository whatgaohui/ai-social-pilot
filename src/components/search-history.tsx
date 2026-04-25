"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  X,
  Trash2,
  Search,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface HistoryEntry {
  query: string;
  timestamp: number;
  category?: string;
  resultCount?: number;
}

interface SearchHistoryProps {
  onSelect: (query: string) => void;
  className?: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const DETAILED_HISTORY_KEY = "search-history-detailed";
const MAX_HISTORY = 20;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function loadDetailedHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DETAILED_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDetailedHistory(history: HistoryEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    DETAILED_HISTORY_KEY,
    JSON.stringify(history.slice(0, MAX_HISTORY)),
  );
}

export function addSearchHistory(
  query: string,
  category?: string,
  resultCount?: number,
) {
  if (!query.trim()) return;
  const history = loadDetailedHistory().filter(
    (h) => h.query !== query,
  );
  history.unshift({
    query: query.trim(),
    timestamp: Date.now(),
    category,
    resultCount,
  });
  saveDetailedHistory(history);
}

export function clearSearchHistory() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DETAILED_HISTORY_KEY);
}

function removeSearchHistoryItem(query: string) {
  const history = loadDetailedHistory().filter((h) => h.query !== query);
  saveDetailedHistory(history);
}

// ─── Date Grouping ─────────────────────────────────────────────────────────────

function getDateGroup(timestamp: number): string {
  const now = new Date();
  const entryDate = new Date(timestamp);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  if (entryDate >= todayStart) return "今天";
  if (entryDate >= yesterdayStart) return "昨天";
  return "更早";
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Category Colors ───────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  content: "text-violet-500",
  knowledge: "text-amber-500",
  template: "text-sky-500",
  persona: "text-emerald-500",
  accounts: "text-rose-500",
};

const CATEGORY_LABELS: Record<string, string> = {
  content: "帖子",
  knowledge: "知识库",
  template: "模板",
  persona: "人设",
  accounts: "账号",
};

// ─── Animation ─────────────────────────────────────────────────────────────────

const itemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.03, duration: 0.15 },
  }),
  exit: { opacity: 0, x: 8, transition: { duration: 0.1 } },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function SearchHistory({ onSelect, className = "" }: SearchHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadDetailedHistory());

  // Group by date
  const grouped = useMemo(() => {
    const groups: Array<{
      label: string;
      entries: HistoryEntry[];
    }> = [];

    let currentGroup = "";
    for (const entry of history) {
      const group = getDateGroup(entry.timestamp);
      if (group !== currentGroup) {
        groups.push({ label: group, entries: [] });
        currentGroup = group;
      }
      groups[groups.length - 1].entries.push(entry);
    }
    return groups;
  }, [history]);

  const handleRemove = useCallback(
    (query: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      removeSearchHistoryItem(query);
      setHistory(loadDetailedHistory());
    },
    [],
  );

  const handleClearAll = useCallback(() => {
    clearSearchHistory();
    setHistory([]);
  }, []);

  if (history.length === 0) {
    return (
      <div className={`flex flex-col items-center gap-3 py-8 ${className}`}>
        <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center">
          <Clock className="h-5 w-5 text-muted-foreground/50" />
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">暂无搜索历史</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            搜索内容后会自动记录
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-1 py-2">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          搜索历史
          <span className="text-[10px] text-muted-foreground/60">
            ({history.length}/{MAX_HISTORY})
          </span>
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearAll}
          className="h-6 gap-1 px-2 text-[10px] text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
          清除全部
        </Button>
      </div>

      {/* ── Grouped History ─────────────────────────────────────────── */}
      <div className="max-h-80 overflow-y-auto smooth-scroll">
        {grouped.map((group) => (
          <div key={group.label}>
            <div className="px-1 py-1.5">
              <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
                {group.label}
              </span>
            </div>
            <AnimatePresence initial={false}>
              {group.entries.map((entry, idx) => (
                <motion.button
                  key={entry.query}
                  custom={idx}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  onClick={() => onSelect(entry.query)}
                  className="search-history-item group w-full flex items-center gap-2.5 px-2 py-2 rounded-lg
                    hover:bg-muted/60 text-left transition-colors"
                >
                  <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Search className="h-3 w-3 shrink-0 text-muted-foreground/40" />
                      <span className="text-sm truncate">
                        {entry.query}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 ml-5">
                      <span className="text-[10px] text-muted-foreground/50">
                        {formatTime(entry.timestamp)}
                      </span>
                      {entry.category && (
                        <span
                          className={`text-[9px] font-medium ${
                            CATEGORY_COLORS[entry.category] ??
                            "text-muted-foreground/50"
                          }`}
                        >
                          {CATEGORY_LABELS[entry.category] ?? entry.category}
                        </span>
                      )}
                      {entry.resultCount != null && (
                        <span className="text-[9px] text-muted-foreground/50">
                          {entry.resultCount}条结果
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
                    <button
                      onClick={(e) => handleRemove(entry.query, e)}
                      className="h-5 w-5 flex items-center justify-center rounded-sm
                        text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10
                        transition-all opacity-0 group-hover:opacity-100"
                      aria-label={`删除「${entry.query}」`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
