"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import type { KnowledgeItem, KnowledgeCategory } from "@/types";
import { KNOWLEDGE_CATEGORY_LABELS } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuTrigger, ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BookOpen, Plus, Search, Trash2, Tag, FileText, Copy, Edit3,
  Sparkles, Network, List, Upload, Download,
  ChevronUp, AlertTriangle, X, Loader2, ExternalLink,
  Check,
} from "lucide-react";
import { useSuccessToast, useErrorToast } from "@/hooks/use-toast-operations";
import { EmptyState } from "@/components/ui/empty-state";
import { TagManager } from "@/components/tag-manager";

// ─── Constants ──────────────────────────────────────────────────────────────

const CATEGORIES: KnowledgeCategory[] = [
  "expertise", "experience", "opinion", "story", "resource",
];

const CATEGORY_COLORS: Record<string, string> = {
  expertise: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  experience: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  opinion: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  story: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  resource: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  general: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const TAG_PILL_COLORS = [
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
];

// ─── Types ──────────────────────────────────────────────────────────────────

interface TagData {
  name: string;
  count: number;
  primaryCategory: string;
}

interface KnowledgeStats {
  total: number;
  coverage: { gaps: string[]; adequate: string[]; score: number };
  tagCloud: TagData[];
}

// ─── Helper: Deterministic color from tag name ──────────────────────────────

function getTagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_PILL_COLORS[Math.abs(hash) % TAG_PILL_COLORS.length];
}

// ─── Knowledge Graph Component (SVG) ───────────────────────────────────────

function KnowledgeGraph({
  tags,
  onSelectTag,
  selectedTag,
}: {
  tags: TagData[];
  onSelectTag: (tag: string) => void;
  selectedTag: string | null;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const nodes = useMemo(() => {
    if (tags.length === 0) return [];
    const centerX = 150;
    const centerY = 150;
    const maxRadius = 120;
    const count = Math.min(tags.length, 16);

    return tags.slice(0, count).map((tag, i) => {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2;
      const radius = maxRadius * (0.4 + 0.6 * Math.random());
      return {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        ...tag,
        size: Math.max(8, Math.min(24, tag.count * 4 + 6)),
      };
    });
  }, [tags]);

  const edges = useMemo(() => {
    // Connect tags that share categories
    const edgesList: { x1: number; y1: number; x2: number; y2: number; w: number }[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].primaryCategory === nodes[j].primaryCategory) {
          edgesList.push({
            x1: nodes[i].x, y1: nodes[i].y,
            x2: nodes[j].x, y2: nodes[j].y,
            w: 1.5,
          });
        }
      }
    }
    return edgesList;
  }, [nodes]);

  if (tags.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground text-xs">
        <p>暂无标签数据</p>
      </div>
    );
  }

  return (
    <svg ref={svgRef} viewBox="0 0 300 300" className="w-full h-[300px] knowledge-graph">
      {/* Edges */}
      {edges.map((edge, i) => (
        <line
          key={`edge-${i}`}
          x1={edge.x1} y1={edge.y1}
          x2={edge.x2} y2={edge.y2}
          stroke="currentColor"
          className="text-muted-foreground/20"
          strokeWidth={edge.w}
        />
      ))}
      {/* Nodes */}
      {nodes.map((node) => (
        <g
          key={node.name}
          onClick={() => onSelectTag(node.name)}
          onMouseEnter={() => setHoveredNode(node.name)}
          onMouseLeave={() => setHoveredNode(null)}
          className="cursor-pointer graph-node"
        >
          <circle
            cx={node.x} cy={node.y} r={node.size}
            className={`transition-all duration-200 ${
              selectedTag === node.name
                ? "fill-primary/60 stroke-primary"
                : hoveredNode === node.name
                ? "fill-primary/30 stroke-primary/60"
                : "fill-muted stroke-muted-foreground/20"
            }`}
            strokeWidth={1.5}
          />
          <text
            x={node.x} y={node.y + node.size + 14}
            textAnchor="middle"
            className="fill-foreground text-[10px] pointer-events-none select-none"
          >
            {node.name.length > 4 ? node.name.slice(0, 4) + '…' : node.name}
          </text>
          {hoveredNode === node.name && (
            <title>{node.name} (使用 {node.count} 次)</title>
          )}
        </g>
      ))}
    </svg>
  );
}

// ─── Tag Cloud Component ────────────────────────────────────────────────────

function TagCloud({
  tags,
  selectedTag,
  onSelectTag,
  onRightClickTag,
}: {
  tags: TagData[];
  selectedTag: string | null;
  onSelectTag: (tag: string) => void;
  onRightClickTag: (tag: string) => void;
}) {
  if (tags.length === 0) return null;

  const maxCount = Math.max(...tags.map(t => t.count), 1);

  return (
    <div className="tag-cloud flex flex-wrap gap-1.5 p-3 rounded-lg bg-muted/30 border border-border/20">
      {tags.slice(0, 20).map((tag) => {
        const sizeClass = tag.count === maxCount
          ? "text-sm font-semibold"
          : tag.count > maxCount * 0.7
          ? "text-xs font-medium"
          : "text-[11px] font-normal";
        const isSelected = selectedTag === tag.name;

        return (
          <ContextMenu key={tag.name}>
            <ContextMenuTrigger>
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                className={`tag-cloud-item tag-pill inline-flex items-center gap-1 px-2.5 py-1 rounded-full transition-all duration-200 ${sizeClass} ${
                  isSelected
                    ? "ring-2 ring-primary/50 shadow-sm"
                    : "hover:shadow-sm"
                }`}
                style={{ cursor: "pointer" }}
                onClick={() => onSelectTag(isSelected ? "" : tag.name)}
              >
                <span className={getTagColor(tag.name)}>
                  <span className="px-2 py-0.5 rounded-full">{tag.name}</span>
                </span>
                {tag.count > 1 && (
                  <span className="text-[10px] text-muted-foreground">{tag.count}</span>
                )}
              </motion.button>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => onSelectTag(tag.name)}>
                <Search className="h-3.5 w-3.5 mr-2" />
                按此标签筛选
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onRightClickTag(tag.name)}>
                <Edit3 className="h-3.5 w-3.5 mr-2" />
                重命名标签
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => onRightClickTag(tag.name)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                删除标签
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        );
      })}
    </div>
  );
}

// ─── Coverage Analysis ──────────────────────────────────────────────────────

function CoverageAnalysis({ stats }: { stats: KnowledgeStats | null }) {
  if (!stats || stats.coverage.gaps.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20 p-3 space-y-2"
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
        <AlertTriangle className="h-3.5 w-3.5" />
        知识覆盖分析 · 完成度 {stats.coverage.score}%
      </div>
      <div className="w-full bg-amber-200/50 dark:bg-amber-900/30 rounded-full h-1.5">
        <motion.div
          className="bg-amber-500 dark:bg-amber-400 h-1.5 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${stats.coverage.score}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      {stats.coverage.gaps.length > 0 && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-relaxed">
          你的知识库缺少以下主题的内容：
          {stats.coverage.gaps.slice(0, 4).map(g => `「${g}」`).join('、')}
          {stats.coverage.gaps.length > 4 ? ` 等${stats.coverage.gaps.length}个` : ''}
        </p>
      )}
      <div className="flex flex-wrap gap-1">
        {stats.coverage.gaps.map((gap) => (
          <span key={gap} className="coverage-gap text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300">
            {gap}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Knowledge Card (Enhanced) ──────────────────────────────────────────────

function KnowledgeCard({
  item,
  onEdit,
  onDelete,
  onCopy,
  onFindRelated,
  expandedId,
  setExpandedId,
  relatedItems,
}: {
  item: KnowledgeItem;
  onEdit: (item: KnowledgeItem) => void;
  onDelete: (id: string) => void;
  onCopy: (content: string) => void;
  onFindRelated: (id: string) => void;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  relatedItems: KnowledgeItem[];
}) {
  const platform = useAppStore((s) => s.platform);
  const isXHS = platform === 'xiaohongshu';
  const isExpanded = expandedId === item.id;
  const showRelated = relatedItems.length > 0 && onFindRelated !== undefined;

  const tagsList = useMemo(
    () => item.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean),
    [item.tags]
  );

  return (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
      layout
    >
      <Card className={`knowledge-card content-card-hover micro-hover card-spotlight border-0 shadow-sm hover:shadow-md hover:border-primary/10 transition-all duration-200 group card-enter list-item-enter rounded-lg ${isXHS ? 'border-l-2 border-l-rose-400' : 'border-l-2 border-l-violet-400'}`}>
        <CardContent className="p-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : item.id)}
            >
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-medium truncate">{item.title}</h4>
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 shrink-0 transition-all duration-200 ${
                    CATEGORY_COLORS[item.category] || CATEGORY_COLORS.general
                  } border-transparent`}
                >
                  {KNOWLEDGE_CATEGORY_LABELS[item.category as KnowledgeCategory] || item.category}
                </Badge>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost" size="sm"
                className="h-7 w-7 p-0"
                onClick={() => onCopy(item.content)}
                title="复制内容"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost" size="sm"
                className="h-7 w-7 p-0 focus-ring-soft"
                onClick={() => onEdit(item)}
                title="编辑"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost" size="sm"
                className="h-7 w-7 p-0"
                onClick={() => onFindRelated(item.id)}
                title="查找相关"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost" size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive focus-ring-soft"
                onClick={() => onDelete(item.id)}
                title="删除"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Content preview / expanded */}
          <div
            className="cursor-pointer"
            onClick={() => setExpandedId(isExpanded ? null : item.id)}
          >
            <p className={`text-xs text-muted-foreground leading-relaxed ${
              isExpanded ? "" : "line-clamp-2"
            }`}>
              {isExpanded ? item.content : item.content.slice(0, 100)}
            </p>
          </div>

          {/* Tags */}
          {tagsList.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {tagsList.slice(0, isExpanded ? undefined : 5).map((tag, i) => (
                <span
                  key={`${tag}-${i}`}
                  className={`text-[10px] px-1.5 py-0.5 rounded-full tag-pill transition-all duration-200 ${getTagColor(tag)}`}
                >
                  {tag}
                </span>
              ))}
              {!isExpanded && tagsList.length > 5 && (
                <span className="text-[10px] text-muted-foreground px-1">
                  +{tagsList.length - 5}
                </span>
              )}
            </div>
          )}

          {/* Expand/Collapse indicator + last updated */}
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-muted-foreground/60">
              {new Date(item.updatedAt).toLocaleDateString("zh-CN")}
            </span>
            {isExpanded && (
              <Button
                variant="ghost" size="sm"
                className="h-6 text-[10px] px-1.5 text-muted-foreground"
                onClick={() => setExpandedId(null)}
              >
                <ChevronUp className="h-3 w-3 mr-0.5" />
                收起
              </Button>
            )}
          </div>

          {/* Expanded: Related items */}
          <AnimatePresence>
            {isExpanded && showRelated && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 pt-2 divider-gradient"
              >
                <p className="text-[10px] text-muted-foreground font-medium mb-1 flex items-center gap-1">
                  <Network className="h-3 w-3" />
                  相关知识
                </p>
                {relatedItems.slice(0, 3).map((ri) => (
                  <div
                    key={ri.id}
                    className="text-[11px] text-muted-foreground py-0.5 flex items-center gap-1"
                  >
                    <FileText className="h-3 w-3 shrink-0" />
                    <span className="truncate">{ri.title}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Import/Export Dialog ───────────────────────────────────────────────────

function ImportExportDialog({
  knowledgeItems,
  showSuccess,
  showError,
  onImported,
}: {
  knowledgeItems: KnowledgeItem[];
  showSuccess: (msg: string, opts?: { description?: string }) => void;
  showError: (msg: string, opts?: { description?: string }) => void;
  onImported: () => void;
}) {
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportJSON = () => {
    const data = JSON.stringify(knowledgeItems, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `knowledge-base-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess("导出成功", { description: "知识库已导出为 JSON 文件" });
  };

  const handleExportCSV = () => {
    const header = "title,category,content,tags";
    const rows = knowledgeItems.map(
      (item) =>
        `"${item.title.replace(/"/g, '""')}","${item.category}","${item.content.replace(/"/g, '""')}","${item.tags}"`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `knowledge-base-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess("导出成功", { description: "知识库已导出为 CSV 文件" });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const format = file.name.endsWith(".csv") ? "csv" : "json";
    const formData = new FormData();
    formData.append("file", file);
    formData.append("format", format);

    try {
      const res = await fetch("/api/knowledge/import", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        showSuccess(data.message || "导入成功", {
          description: `导入 ${data.imported} 条，跳过 ${data.errors} 条`,
        });
        onImported();
      } else {
        const data = await res.json();
        showError("导入失败", { description: data.error || "请检查文件格式" });
      }
    } catch {
      showError("导入失败", { description: "网络错误，请稍后重试" });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownloadTemplate = () => {
    const template = "title,category,content,tags\n示例标题,expertise,示例内容,标签1,标签2";
    const blob = new Blob(["\uFEFF" + template], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "knowledge-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleExportJSON}>
          <Download className="h-3.5 w-3.5 mr-1.5" />
          导出 JSON
        </Button>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleExportCSV}>
          <Download className="h-3.5 w-3.5 mr-1.5" />
          导出 CSV
        </Button>
      </div>

      <div className="import-dropzone border-2 border-dashed border-border/20 rounded-lg p-4 text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.csv"
          className="hidden"
          onChange={handleImport}
        />
        {importing ? (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            导入中...
          </div>
        ) : (
          <>
            <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground mb-2">
              拖放或点击上传 JSON/CSV 文件
            </p>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px]"
              onClick={() => fileInputRef.current?.click()}
            >
              选择文件
            </Button>
          </>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-[11px] w-full text-muted-foreground"
        onClick={handleDownloadTemplate}
      >
        <Download className="h-3 w-3 mr-1" />
        下载导入模板
      </Button>
    </div>
  );
}

// ─── Main Knowledge Base Component ──────────────────────────────────────────

export function KnowledgeBase() {
  const {
    knowledgeItems, setKnowledgeItems, addKnowledgeItem,
    removeKnowledgeItem, updateKnowledgeItem, platform,
  } = useAppStore();
  const showSuccess = useSuccessToast();
  const showError = useErrorToast();

  // UI State
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "graph">("list");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<KnowledgeItem | null>(null);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [importExportOpen, setImportExportOpen] = useState(false);
  const [showCoverage, setShowCoverage] = useState(false);
  const [relatedItems, setRelatedItems] = useState<KnowledgeItem[]>([]);
  const [relatedForId, setRelatedForId] = useState<string | null>(null);

  // AI Tag suggestion state
  const [aiSuggestingTags, setAiSuggestingTags] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);

  // Form state
  const [form, setForm] = useState({
    title: "",
    content: "",
    category: "expertise" as KnowledgeCategory,
    tags: "",
  });

  // Stats state
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [allTags, setAllTags] = useState<TagData[]>([]);

  // ── Fetch data ──
  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/knowledge");
      if (res.ok) {
        const data = await res.json();
        setKnowledgeItems(data);
      }
    } catch {
      /* silent */
    }
  }, [setKnowledgeItems]);

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch("/api/knowledge/tags");
      if (res.ok) {
        const data = await res.json();
        setAllTags(data.tags || []);
      }
    } catch {
      /* silent */
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/knowledge/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchItems();
    fetchTags();
  }, [fetchItems, fetchTags]);

  useEffect(() => {
    if (showCoverage) fetchStats();
  }, [showCoverage, fetchStats]);

  // ── Filter items ──
  const filtered = useMemo(() => {
    return knowledgeItems.filter((item) => {
      const matchSearch =
        !search ||
        item.title.includes(search) ||
        item.content.includes(search) ||
        item.tags.includes(search);
      const matchCategory = activeCategory === "all" || item.category === activeCategory;
      const matchTag =
        !selectedTag ||
        item.tags.split(/[,，]/).some(t => t.trim() === selectedTag);
      return matchSearch && matchCategory && matchTag;
    });
  }, [knowledgeItems, search, activeCategory, selectedTag]);

  // ── Handlers ──
  const resetForm = () => {
    setForm({ title: "", content: "", category: "expertise", tags: "" });
    setSuggestedTags([]);
    setEditItem(null);
  };

  const openEditDialog = (item: KnowledgeItem) => {
    setForm({
      title: item.title,
      content: item.content,
      category: item.category as KnowledgeCategory,
      tags: item.tags,
    });
    setEditItem(item);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      showError("请填写标题和内容");
      return;
    }

    try {
      let res: Response;
      if (editItem) {
        res = await fetch(`/api/knowledge/${editItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        res = await fetch("/api/knowledge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }

      if (res.ok) {
        const data = await res.json();
        if (editItem) {
          updateKnowledgeItem(editItem.id, data);
          showSuccess("知识已更新", { description: `${form.title} 已更新` });
        } else {
          addKnowledgeItem(data);
          showSuccess("知识已添加", { description: `${form.title} 已保存到知识库` });
        }
        resetForm();
        setDialogOpen(false);
        fetchTags();
      }
    } catch {
      showError(editItem ? "更新失败" : "添加失败", { description: "网络错误，请稍后重试" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/knowledge/${id}`, { method: "DELETE" });
      if (res.ok) {
        removeKnowledgeItem(id);
        showSuccess("知识已删除");
        fetchTags();
      }
    } catch {
      showError("删除失败");
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content).then(
      () => showSuccess("已复制到剪贴板"),
      () => showError("复制失败")
    );
  };

  const handleFindRelated = async (id: string) => {
    try {
      const res = await fetch(`/api/knowledge/search?relatedTo=${id}`);
      if (res.ok) {
        const data = await res.json();
        setRelatedItems(data.results || []);
        setRelatedForId(id);
      }
    } catch {
      /* silent */
    }
  };

  const handleAiSuggestTags = async () => {
    if (!form.content.trim()) {
      showError("请先填写内容再获取 AI 建议");
      return;
    }
    setAiSuggestingTags(true);
    try {
      const res = await fetch("/api/knowledge/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "suggest", content: form.content }),
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestedTags(data.tags || []);
      }
    } catch {
      showError("AI 标签建议失败");
    } finally {
      setAiSuggestingTags(false);
    }
  };

  const toggleSuggestedTag = (tag: string) => {
    const currentTags = form.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean);
    const idx = currentTags.indexOf(tag);
    if (idx >= 0) {
      currentTags.splice(idx, 1);
    } else {
      currentTags.push(tag);
    }
    setForm({ ...form, tags: currentTags.join(",") });
  };

  const handleTagSelect = (tag: string) => {
    setSelectedTag(tag || null);
    setRelatedItems([]);
    setRelatedForId(null);
  };

  const activeFilters = [selectedTag].filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-3"
    >
      {/* Usage Guide */}
      <div className={`rounded-lg bg-gradient-to-r p-3 border ${
        platform === 'wechat'
          ? 'from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 border-violet-200 dark:border-violet-800'
          : 'from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 border-rose-200 dark:border-rose-800'
      }`}>
        <p className={`text-xs font-medium flex items-center gap-1 mb-1 ${
          platform === 'wechat'
            ? 'text-violet-700 dark:text-violet-300'
            : 'text-rose-700 dark:text-rose-300'
        }`}>
          <BookOpen className="h-3.5 w-3.5" />
          知识库使用指南
        </p>
        <ul className={`text-[11px] space-y-0.5 ml-4 list-disc ${
          platform === 'wechat'
            ? 'text-violet-600 dark:text-violet-400'
            : 'text-rose-600 dark:text-rose-400'
        }`}>
          <li>添加专业知识、经验总结 → AI 生成文案时会自动参考</li>
          <li>建议添加 5-10 条知识，覆盖不同领域（经验、观点、故事等）</li>
          <li>知识越具体、越详细，AI 生成的内容越贴合您的风格</li>
        </ul>
      </div>

      {/* Search & Actions Row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="搜索知识库..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 text-sm pl-8 input-glow focus-ring-soft"
          />
        </div>

        {/* View mode toggle */}
        <div className="flex items-center border rounded-md">
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            className="h-9 w-9 p-0 rounded-r-none"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "graph" ? "secondary" : "ghost"}
            size="sm"
            className="h-9 w-9 p-0 rounded-l-none"
            onClick={() => setViewMode("graph")}
          >
            <Network className="h-4 w-4" />
          </Button>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-9 px-3 focus-ring-soft">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editItem ? "编辑知识条目" : "添加知识条目"}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {editItem ? "修改知识条目的内容" : "添加专业知识、经验总结等内容到您的个人知识库"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-sm">标题</Label>
                <Input
                  placeholder="如：产品设计的核心原则"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="input-glow"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">内容</Label>
                <Textarea
                  placeholder="输入详细内容..."
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="min-h-[100px] resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">分类</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => setForm({ ...form, category: v as KnowledgeCategory })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {KNOWLEDGE_CATEGORY_LABELS[cat]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">标签</Label>
                  <Input
                    placeholder="如：设计,用户体验"
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    className="input-glow"
                  />
                </div>
              </div>

              {/* AI Tag Suggestion */}
              <div className="space-y-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleAiSuggestTags}
                  disabled={aiSuggestingTags || !form.content.trim()}
                >
                  {aiSuggestingTags ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 mr-1" />
                  )}
                  AI建议标签
                </Button>
                {suggestedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {suggestedTags.map((tag) => {
                      const currentTags = form.tags
                        .split(/[,，]/)
                        .map(t => t.trim())
                        .filter(Boolean);
                      const isActive = currentTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleSuggestedTag(tag)}
                          className={`text-[11px] px-2 py-0.5 rounded-full transition-all ${
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {isActive && <Check className="h-2.5 w-2.5 inline mr-0.5" />}
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <Button onClick={handleSubmit} className="w-full">
                {editItem ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    保存修改
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    添加
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 flex-wrap items-center">
        <Button
          variant={activeCategory === "all" ? "secondary" : "ghost"}
          size="sm"
          className="h-7 text-xs px-2"
          onClick={() => setActiveCategory("all")}
        >
          全部
        </Button>
        {CATEGORIES.map((cat) => (
          <Button
            key={cat}
            variant={activeCategory === cat ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => setActiveCategory(cat)}
          >
            {KNOWLEDGE_CATEGORY_LABELS[cat]}
          </Button>
        ))}

        {/* Tag Manager & Import/Export */}
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost" size="sm"
            className="h-7 text-[11px] px-1.5 text-muted-foreground"
            onClick={() => setTagManagerOpen(true)}
          >
            <Tag className="h-3 w-3 mr-1" />
            标签管理
          </Button>
          <Button
            variant="ghost" size="sm"
            className="h-7 text-[11px] px-1.5 text-muted-foreground"
            onClick={() => setImportExportOpen(true)}
          >
            <Upload className="h-3 w-3 mr-1" />
            导入/导出
          </Button>
          <Button
            variant="ghost" size="sm"
            className="h-7 text-[11px] px-1.5 text-muted-foreground"
            onClick={() => { setShowCoverage(!showCoverage); }}
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            覆盖分析
          </Button>
        </div>
      </div>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">筛选：</span>
          {selectedTag && (
            <Badge variant="secondary" className="h-5 text-[10px] gap-0.5 pr-1">
              {selectedTag}
              <button onClick={() => setSelectedTag(null)} className="ml-0.5 hover:text-destructive">
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Coverage Analysis */}
      <AnimatePresence>
        {showCoverage && <CoverageAnalysis stats={stats} />}
      </AnimatePresence>

      {/* Tag Cloud (above list view) */}
      {viewMode === "list" && allTags.length > 0 && (
        <TagCloud
          tags={allTags}
          selectedTag={selectedTag}
          onSelectTag={handleTagSelect}
          onRightClickTag={(tag) => setTagManagerOpen(true)}
        />
      )}

      {/* Graph View */}
      {viewMode === "graph" && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Network className="h-3.5 w-3.5" />
                知识关系图谱
              </p>
              {selectedTag && (
                <Badge variant="secondary" className="h-5 text-[10px] gap-0.5 pr-1">
                  {selectedTag}
                  <button onClick={() => setSelectedTag(null)} className="ml-0.5 hover:text-destructive">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              )}
            </div>
            <KnowledgeGraph
              tags={allTags}
              onSelectTag={handleTagSelect}
              selectedTag={selectedTag}
            />
            <p className="text-[10px] text-muted-foreground/60 mt-2 text-center">
              点击节点可按标签筛选知识条目
            </p>
          </CardContent>
        </Card>
      )}

      {/* Items List */}
      {viewMode === "list" && (
        <ScrollArea className="h-[400px]">
          <div className="space-y-2 pr-3">
            <AnimatePresence>
              {filtered.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title="知识库还是空的"
                  description={
                    selectedTag
                      ? `没有包含标签「${selectedTag}」的知识`
                      : search
                      ? "没有找到匹配的知识条目"
                      : "添加您的专业知识、行业洞察和品牌信息"
                  }
                  action={
                    !selectedTag && !search
                      ? { label: "添加知识条目", onClick: () => setDialogOpen(true) }
                      : selectedTag
                      ? { label: "清除标签筛选", onClick: () => setSelectedTag(null) }
                      : { label: "清除搜索", onClick: () => setSearch("") }
                  }
                  variant="default"
                  size="md"
                />
              ) : (
                filtered.map((item) => (
                  <KnowledgeCard
                    key={item.id}
                    item={item}
                    onEdit={openEditDialog}
                    onDelete={handleDelete}
                    onCopy={handleCopy}
                    onFindRelated={handleFindRelated}
                    expandedId={expandedId}
                    setExpandedId={setExpandedId}
                    relatedItems={
                      relatedForId === item.id ? relatedItems : []
                    }
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      )}

      {/* Tag Manager Dialog */}
      <TagManager
        open={tagManagerOpen}
        onOpenChange={setTagManagerOpen}
        onTagsChanged={() => { fetchTags(); fetchItems(); }}
      />

      {/* Import/Export Dialog */}
      <Dialog open={importExportOpen} onOpenChange={setImportExportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>导入/导出知识库</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              导出知识库为 JSON/CSV 文件，或从文件导入知识条目
            </DialogDescription>
          </DialogHeader>
          <ImportExportDialog
            knowledgeItems={knowledgeItems}
            showSuccess={showSuccess}
            showError={showError}
            onImported={() => { fetchItems(); fetchTags(); }}
          />
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
