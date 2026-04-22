"use client";

import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Filter,
  X,
  Save,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Clock,
  Calendar,
  Star,
  Hash,
  ArrowUpDown,
  Sparkles,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import type { Platform } from "@/types";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface SearchFilters {
  platform: "all" | Platform;
  contentTypes: string[];
  status: string[];
  dateRange: "all" | "today" | "week" | "month" | "custom";
  customStartDate: string;
  customEndDate: string;
  aiScoreMin: number;
  aiScoreMax: number;
  sortBy: "date" | "score" | "interactions" | "length";
  sortOrder: "asc" | "desc";
}

interface FilterPreset {
  id: string;
  name: string;
  icon: string;
  filters: Partial<SearchFilters>;
}

interface ContentSearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  resultCount?: number;
  className?: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const PRESETS_STORAGE_KEY = "search-filter-presets";
const MAX_PRESETS = 5;

const PLATFORM_OPTIONS = [
  { value: "all" as const, label: "全部", color: "" },
  { value: "wechat" as const, label: "朋友圈", color: "text-emerald-600 dark:text-emerald-400" },
  { value: "xiaohongshu" as const, label: "小红书", color: "text-red-500 dark:text-red-400" },
];

const CONTENT_TYPE_OPTIONS = [
  { value: "text", label: "纯文字" },
  { value: "image", label: "图文搭配" },
  { value: "video", label: "视频动态" },
  { value: "mixed", label: "混合内容" },
  { value: "story", label: "故事分享" },
  { value: "insight", label: "观点洞察" },
  { value: "interaction", label: "互动话题" },
  { value: "seeding", label: "种草安利" },
  { value: "review", label: "好物测评" },
  { value: "tutorial", label: "教程攻略" },
  { value: "drygoods", label: "干货知识" },
];

const STATUS_OPTIONS = [
  { value: "planned", label: "待生成", color: "bg-gray-400" },
  { value: "generated", label: "已生成", color: "bg-violet-500" },
  { value: "optimized", label: "已优化", color: "bg-amber-500" },
  { value: "published", label: "已发布", color: "bg-emerald-500" },
];

const DATE_RANGE_OPTIONS = [
  { value: "all" as const, label: "全部时间" },
  { value: "today" as const, label: "今天" },
  { value: "week" as const, label: "本周" },
  { value: "month" as const, label: "本月" },
  { value: "custom" as const, label: "自定义" },
];

const SORT_OPTIONS = [
  { value: "date" as const, label: "日期" },
  { value: "score" as const, label: "AI评分" },
  { value: "interactions" as const, label: "互动量" },
  { value: "length" as const, label: "字数" },
];

// ─── Default Filters ──────────────────────────────────────────────────────────

export const DEFAULT_FILTERS: SearchFilters = {
  platform: "all",
  contentTypes: [],
  status: [],
  dateRange: "all",
  customStartDate: "",
  customEndDate: "",
  aiScoreMin: 0,
  aiScoreMax: 100,
  sortBy: "date",
  sortOrder: "desc",
};

// ─── Preset Helpers ────────────────────────────────────────────────────────────

function loadPresets(): FilterPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePresets(presets: FilterPreset[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets.slice(0, MAX_PRESETS)));
}

// ─── Active Filters Count ──────────────────────────────────────────────────────

function countActiveFilters(filters: SearchFilters): number {
  let count = 0;
  if (filters.platform !== "all") count++;
  if (filters.contentTypes.length > 0) count++;
  if (filters.status.length > 0) count++;
  if (filters.dateRange !== "all") count++;
  if (filters.aiScoreMin > 0) count++;
  if (filters.aiScoreMax < 100) count++;
  return count;
}

// ─── Animation ─────────────────────────────────────────────────────────────────

const filterChipVariants = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.8, opacity: 0 },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ContentSearchFilters({
  filters,
  onFiltersChange,
  resultCount = 0,
  className = "",
}: ContentSearchFiltersProps) {
  const [expanded, setExpanded] = useState(false);
  const [presets, setPresets] = useState<FilterPreset[]>(() => loadPresets());
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetName, setPresetName] = useState("");
  const scorePopoverOpen = useRef(false);

  const activeFilterCount = useMemo(
    () => countActiveFilters(filters),
    [filters],
  );

  const hasCustomDate = filters.dateRange === "custom" && (filters.customStartDate || filters.customEndDate);

  const activeFilterPills = useMemo(() => {
    const pills: Array<{ key: string; label: string; onRemove: () => void }> = [];

    if (filters.platform !== "all") {
      const opt = PLATFORM_OPTIONS.find((o) => o.value === filters.platform);
      pills.push({
        key: "platform",
        label: opt?.label ?? filters.platform,
        onRemove: () => onFiltersChange({ ...filters, platform: "all" }),
      });
    }

    for (const ct of filters.contentTypes) {
      const opt = CONTENT_TYPE_OPTIONS.find((o) => o.value === ct);
      pills.push({
        key: `ct-${ct}`,
        label: opt?.label ?? ct,
        onRemove: () =>
          onFiltersChange({
            ...filters,
            contentTypes: filters.contentTypes.filter((t) => t !== ct),
          }),
      });
    }

    for (const st of filters.status) {
      const opt = STATUS_OPTIONS.find((o) => o.value === st);
      pills.push({
        key: `st-${st}`,
        label: opt?.label ?? st,
        onRemove: () =>
          onFiltersChange({
            ...filters,
            status: filters.status.filter((s) => s !== st),
          }),
      });
    }

    if (filters.dateRange !== "all") {
      const opt = DATE_RANGE_OPTIONS.find((o) => o.value === filters.dateRange);
      pills.push({
        key: "dateRange",
        label: opt?.label ?? filters.dateRange,
        onRemove: () =>
          onFiltersChange({
            ...filters,
            dateRange: "all",
            customStartDate: "",
            customEndDate: "",
          }),
      });
    }

    if (filters.aiScoreMin > 0 || filters.aiScoreMax < 100) {
      pills.push({
        key: "aiScore",
        label: `AI评分: ${filters.aiScoreMin}-${filters.aiScoreMax}`,
        onRemove: () =>
          onFiltersChange({ ...filters, aiScoreMin: 0, aiScoreMax: 100 }),
      });
    }

    return pills;
  }, [filters, onFiltersChange]);

  const handleReset = useCallback(() => {
    onFiltersChange(DEFAULT_FILTERS);
  }, [onFiltersChange]);

  const toggleContentType = useCallback(
    (value: string) => {
      const next = filters.contentTypes.includes(value)
        ? filters.contentTypes.filter((t) => t !== value)
        : [...filters.contentTypes, value];
      onFiltersChange({ ...filters, contentTypes: next });
    },
    [filters, onFiltersChange],
  );

  const toggleStatus = useCallback(
    (value: string) => {
      const next = filters.status.includes(value)
        ? filters.status.filter((s) => s !== value)
        : [...filters.status, value];
      onFiltersChange({ ...filters, status: next });
    },
    [filters, onFiltersChange],
  );

  const handleSavePreset = useCallback(() => {
    if (!presetName.trim()) return;
    const preset: FilterPreset = {
      id: `preset-${Date.now()}`,
      name: presetName.trim(),
      icon: "📌",
      filters: { ...filters },
    };
    const updated = [preset, ...presets].slice(0, MAX_PRESETS);
    setPresets(updated);
    savePresets(updated);
    setShowSavePreset(false);
    setPresetName("");
    toast.success("筛选预设已保存");
  }, [presetName, filters, presets]);

  const handleApplyPreset = useCallback(
    (preset: FilterPreset) => {
      onFiltersChange({
        ...DEFAULT_FILTERS,
        ...preset.filters,
      });
      toast.success(`已应用预设「${preset.name}」`);
    },
    [onFiltersChange],
  );

  const handleDeletePreset = useCallback(
    (id: string) => {
      const updated = presets.filter((p) => p.id !== id);
      setPresets(updated);
      savePresets(updated);
    },
    [presets],
  );

  return (
    <div className={className}>
      {/* ── Filter Toggle Bar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded((prev) => !prev)}
            className="h-7 gap-1.5 text-xs shrink-0"
          >
            <Filter className="h-3.5 w-3.5" />
            筛选
            {activeFilterCount > 0 && (
              <Badge className="h-4 min-w-4 px-1 text-[9px] bg-primary text-primary-foreground">
                {activeFilterCount}
              </Badge>
            )}
            {expanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>

          {/* Quick Platform Filter */}
          <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
            {PLATFORM_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() =>
                  onFiltersChange({ ...filters, platform: opt.value as SearchFilters["platform"] })
                }
                className={`
                  filter-chip px-2.5 py-1 rounded-full text-[11px] font-medium
                  transition-all duration-200 whitespace-nowrap shrink-0
                  ${
                    filters.platform === opt.value
                      ? "filter-chip-active"
                      : ""
                  }
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {resultCount > 0 && (
          <span className="text-xs text-muted-foreground shrink-0">
            找到{" "}
            <span className="font-medium text-foreground">{resultCount}</span>{" "}
            条结果
          </span>
        )}
      </div>

      {/* ── Active Filter Pills ───────────────────────────────────────── */}
      <AnimatePresence>
        {activeFilterPills.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-wrap items-center gap-1.5 mb-3 overflow-hidden"
          >
            {activeFilterPills.map((pill) => (
              <motion.span
                key={pill.key}
                variants={filterChipVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px]
                  bg-primary/10 text-primary border border-primary/20 font-medium"
              >
                {pill.label}
                <button
                  onClick={pill.onRemove}
                  className="h-3.5 w-3.5 flex items-center justify-center rounded-full
                    hover:bg-primary/20 transition-colors"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </motion.span>
            ))}
            <button
              onClick={handleReset}
              className="text-[10px] text-muted-foreground hover:text-foreground
                transition-colors px-1.5 py-1"
            >
              重置全部
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Expanded Filter Panel ─────────────────────────────────────── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
              {/* Content Type Multi-Select */}
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">
                  内容类型
                </label>
                <div className="flex flex-wrap gap-1">
                  {CONTENT_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => toggleContentType(opt.value)}
                      className={`
                        filter-chip px-2 py-0.5 rounded-full text-[10px]
                        transition-all duration-200
                        ${
                          filters.contentTypes.includes(opt.value)
                            ? "filter-chip-active"
                            : ""
                        }
                      `}
                    >
                      {filters.contentTypes.includes(opt.value) && (
                        <Check className="h-2.5 w-2.5 mr-0.5 inline" />
                      )}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">
                  发布状态
                </label>
                <div className="flex flex-wrap gap-1">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => toggleStatus(opt.value)}
                      className={`
                        filter-chip px-2 py-0.5 rounded-full text-[10px]
                        transition-all duration-200 inline-flex items-center gap-1
                        ${
                          filters.status.includes(opt.value)
                            ? "filter-chip-active"
                            : ""
                        }
                      `}
                    >
                      {filters.status.includes(opt.value) && (
                        <Check className="h-2.5 w-2.5" />
                      )}
                      <span className={`h-1.5 w-1.5 rounded-full ${opt.color}`} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range + AI Score Row */}
              <div className="flex flex-wrap gap-3">
                {/* Date Range */}
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">
                    日期范围
                  </label>
                  <div className="flex items-center gap-1 flex-wrap">
                    {DATE_RANGE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() =>
                          onFiltersChange({ ...filters, dateRange: opt.value })
                        }
                        className={`
                          filter-chip px-2 py-0.5 rounded-full text-[10px]
                          transition-all duration-200
                          ${
                            filters.dateRange === opt.value
                              ? "filter-chip-active"
                              : ""
                          }
                        `}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {hasCustomDate && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <input
                        type="date"
                        value={filters.customStartDate}
                        onChange={(e) =>
                          onFiltersChange({
                            ...filters,
                            customStartDate: e.target.value,
                          })
                        }
                        className="h-7 px-2 text-[10px] rounded border bg-background"
                      />
                      <span className="text-[10px] text-muted-foreground">至</span>
                      <input
                        type="date"
                        value={filters.customEndDate}
                        onChange={(e) =>
                          onFiltersChange({
                            ...filters,
                            customEndDate: e.target.value,
                          })
                        }
                        className="h-7 px-2 text-[10px] rounded border bg-background"
                      />
                    </div>
                  )}
                </div>

                {/* AI Score Range */}
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">
                    AI评分范围
                    <span className="ml-1 text-primary font-normal">
                      {filters.aiScoreMin}-{filters.aiScoreMax}
                    </span>
                  </label>
                  <div className="flex items-center gap-2 w-48">
                    <Star className="h-3 w-3 text-amber-500 shrink-0" />
                    <Slider
                      min={0}
                      max={100}
                      step={5}
                      value={[filters.aiScoreMin, filters.aiScoreMax]}
                      onValueChange={([min, max]) =>
                        onFiltersChange({
                          ...filters,
                          aiScoreMin: min,
                          aiScoreMax: max,
                        })
                      }
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Sort */}
              <div className="flex items-center gap-3">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">
                    排序方式
                  </label>
                  <div className="flex items-center gap-1">
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() =>
                          onFiltersChange({
                            ...filters,
                            sortBy: opt.value,
                          })
                        }
                        className={`
                          filter-chip px-2 py-0.5 rounded-full text-[10px]
                          transition-all duration-200
                          ${
                            filters.sortBy === opt.value
                              ? "filter-chip-active"
                              : ""
                          }
                        `}
                      >
                        {opt.label}
                      </button>
                    ))}
                    <button
                      onClick={() =>
                        onFiltersChange({
                          ...filters,
                          sortOrder:
                            filters.sortOrder === "desc" ? "asc" : "desc",
                        })
                      }
                      className="filter-chip px-2 py-0.5 rounded-full text-[10px] transition-all duration-200"
                    >
                      <ArrowUpDown className="h-3 w-3" />
                      {filters.sortOrder === "desc" ? "降序" : "升序"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions: Presets */}
              <div className="flex items-center gap-2 pt-1 border-t">
                {presets.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground mr-1">
                      预设:
                    </span>
                    {presets.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => handleApplyPreset(preset)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]
                          border bg-background hover:bg-muted/60 transition-colors group"
                      >
                        <span>{preset.icon}</span>
                        {preset.name}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePreset(preset.id);
                          }}
                          className="h-3 w-3 flex items-center justify-center rounded-full
                            opacity-0 group-hover:opacity-100 hover:bg-destructive/20
                            hover:text-destructive transition-all"
                        >
                          <X className="h-2 w-2" />
                        </button>
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex-1" />

                {showSavePreset ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      placeholder="预设名称"
                      className="h-7 px-2 text-[10px] rounded border bg-background w-24"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSavePreset();
                        if (e.key === "Escape") setShowSavePreset(false);
                      }}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleSavePreset}
                      className="h-7 px-2 text-[10px]"
                    >
                      保存
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowSavePreset(true)}
                    className="h-7 gap-1 text-[10px] text-muted-foreground"
                  >
                    <Save className="h-3 w-3" />
                    保存预设
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleReset}
                  className="h-7 gap-1 text-[10px] text-muted-foreground"
                >
                  <RotateCcw className="h-3 w-3" />
                  重置
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
