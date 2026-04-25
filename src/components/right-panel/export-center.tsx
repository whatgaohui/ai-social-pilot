"use client";

import React, { useState, useCallback, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Download,
  FileSpreadsheet,
  FileJson,
  FileText,
  CalendarDays,
  BarChart3,
  Settings2,
  Clock,
  Trash2,
  RefreshCw,
  Eye,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Table,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────

interface ExportRecord {
  id: string;
  time: string;
  type: string;
  filename: string;
  size: string;
  url: string;
  dataUrl: string;
}

interface FieldOption {
  key: string;
  label: string;
}

const AVAILABLE_FIELDS: FieldOption[] = [
  { key: "scheduledDate", label: "日期" },
  { key: "platform", label: "平台" },
  { key: "contentType", label: "类型" },
  { key: "topic", label: "主题" },
  { key: "content", label: "内容" },
  { key: "status", label: "状态" },
  { key: "aiScore", label: "AI评分" },
  { key: "likes", label: "点赞" },
  { key: "comments", label: "评论" },
  { key: "shares", label: "转发" },
  { key: "views", label: "浏览" },
  { key: "favorites", label: "收藏" },
];

const PLATFORM_OPTIONS = [
  { value: "all", label: "全部平台" },
  { value: "wechat", label: "朋友圈" },
  { value: "xiaohongshu", label: "小红书" },
];

const STATUS_OPTIONS = [
  { value: "", label: "全部状态" },
  { value: "published", label: "已发布" },
  { value: "optimized", label: "已优化" },
  { value: "generated", label: "已生成" },
  { value: "planned", label: "计划中" },
];

const FORMAT_OPTIONS = [
  { value: "csv", label: "CSV", icon: FileSpreadsheet },
  { value: "json", label: "JSON", icon: FileJson },
  { value: "text", label: "纯文本", icon: FileText },
];

const REPORT_RANGE_OPTIONS = [
  { value: "7d", label: "近7天" },
  { value: "30d", label: "近30天" },
  { value: "90d", label: "近90天" },
];

const STORAGE_KEY = "export-history";

const STATUS_LABELS: Record<string, string> = {
  planned: "计划中",
  generated: "已生成",
  optimized: "已优化",
  scheduled: "已排期",
  published: "已发布",
};

const PLATFORM_LABELS: Record<string, string> = {
  wechat: "朋友圈",
  xiaohongshu: "小红书",
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getExportRecordId(): string {
  return `export-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function downloadBlob(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ─── Quick Export Button ──────────────────────────────────────────────────

function QuickExportButton({
  label,
  icon: Icon,
  color,
  onClick,
  loading,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  onClick: () => void;
  loading: boolean;
}) {
  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
      <Button
        variant="outline"
        size="sm"
        className={`w-full justify-start gap-2 text-xs h-9 border-border/20 ${color}`}
        onClick={onClick}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Icon className="h-3.5 w-3.5" />
        )}
        {label}
      </Button>
    </motion.div>
  );
}

// ─── Report Export SubMenu ────────────────────────────────────────────────

function ReportExportSubMenu({ onExport, loading }: { onExport: (format: string, range: string) => void; loading: boolean }) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState("30d");

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-between text-xs h-9 border-border/20 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20"
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-center gap-2">
          <BarChart3 className="h-3.5 w-3.5" />
          导出运营报告
        </span>
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pl-3 space-y-1.5 border-l-2 border-amber-300/40 dark:border-amber-600/30 ml-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">周期:</span>
                {REPORT_RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                      range === opt.value
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setRange(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5">
                {FORMAT_OPTIONS.map((fmt) => (
                  <button
                    key={fmt.value}
                    className="text-[10px] px-2 py-1 rounded bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1 disabled:opacity-50"
                    onClick={() => onExport(fmt.value, range)}
                    disabled={loading}
                  >
                    <fmt.icon className="h-3 w-3" />
                    {fmt.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Custom Export Panel ──────────────────────────────────────────────────

function CustomExportPanel({
  onExport,
  loading,
}: {
  onExport: (config: {
    format: string;
    platform: string;
    status: string;
    dateFrom: string;
    dateTo: string;
    fields: string[];
  }) => void;
  loading: boolean;
}) {
  const [format, setFormat] = useState("csv");
  const [platform, setPlatform] = useState("all");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedFields, setSelectedFields] = useState<string[]>(
    AVAILABLE_FIELDS.map((f) => f.key)
  );
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  const toggleField = (key: string) => {
    setSelectedFields((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
    );
  };

  const selectAll = () => setSelectedFields(AVAILABLE_FIELDS.map((f) => f.key));
  const deselectAll = () => setSelectedFields([]);

  // Fetch preview data
  const fetchPreview = useCallback(async () => {
    setPreviewLoading(true);
    setShowPreview(true);
    try {
      const params = new URLSearchParams();
      if (platform !== "all") params.set("platform", platform);
      if (status) params.set("status", status);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/content?${params.toString()}&limit=5&sort=scheduledDate&order=desc`);
      if (res.ok) {
        const data = await res.json();
        setPreviewData(data.posts || data || []);
      }
    } catch {
      setPreviewData([]);
    } finally {
      setPreviewLoading(false);
    }
  }, [platform, status, dateFrom, dateTo]);

  const getCellValue = (row: Record<string, unknown>, key: string): string => {
    const val = row[key];
    if (key === "platform") return PLATFORM_LABELS[String(val)] || String(val || "");
    if (key === "status") return STATUS_LABELS[String(val)] || String(val || "");
    if (key === "content") return String(val || "").length > 30 ? String(val || "").slice(0, 30) + "..." : String(val || "");
    if (key === "aiScore") return val ? String(Math.round(Number(val) * 10) / 10) : "0";
    return String(val ?? "");
  };

  return (
    <div className="space-y-3">
      {/* Format & Platform row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">导出格式</label>
          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORMAT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">平台</label>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLATFORM_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Status */}
      <div className="space-y-1">
        <label className="text-[10px] text-muted-foreground">状态筛选</label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value || "all"} value={opt.value || "all"} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date range */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">开始日期</label>
          <input
            type="date"
            className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">结束日期</label>
          <input
            type="date"
            className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </div>

      {/* Field picker */}
      <div className="space-y-1.5">
        <button
          className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShowFieldPicker(!showFieldPicker)}
        >
          <Filter className="h-3 w-3" />
          字段选择 ({selectedFields.length}/{AVAILABLE_FIELDS.length})
          {showFieldPicker ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
        </button>
        <AnimatePresence>
          {showFieldPicker && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <button
                  className="text-[10px] text-violet-500 hover:text-violet-400 transition-colors"
                  onClick={selectAll}
                >
                  全选
                </button>
                <span className="text-muted-foreground/40">|</span>
                <button
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  onClick={deselectAll}
                >
                  清空
                </button>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                {AVAILABLE_FIELDS.map((field) => (
                  <label
                    key={field.key}
                    className="flex items-center gap-1.5 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedFields.includes(field.key)}
                      onCheckedChange={() => toggleField(field.key)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="text-[11px]">{field.label}</span>
                  </label>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions row */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          className="flex-1 h-8 text-xs gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white"
          onClick={() =>
            onExport({
              format,
              platform: platform === "all" ? "" : platform,
              status,
              dateFrom,
              dateTo,
              fields: selectedFields,
            })
          }
          disabled={loading || selectedFields.length === 0}
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Download className="h-3 w-3" />
          )}
          导出
        </Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={fetchPreview}
                disabled={previewLoading}
              >
                {previewLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">预览数据</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Data preview */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-lg border border-border/20 overflow-hidden">
              <div className="bg-muted/40 px-3 py-1.5 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Table className="h-3 w-3" />
                  数据预览（前5条）
                </span>
                <button
                  className="text-[10px] text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPreview(false)}
                >
                  关闭
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-border/20">
                      {selectedFields
                        .filter((key) => AVAILABLE_FIELDS.find((f) => f.key === key))
                        .map((key) => (
                          <th
                            key={key}
                            className="px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap"
                          >
                            {AVAILABLE_FIELDS.find((f) => f.key === key)?.label}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i} className="border-b border-border/20">
                          {selectedFields.slice(0, 4).map((_, j) => (
                            <td key={j} className="px-2 py-1.5">
                              <Skeleton className="h-3 w-full" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : previewData.length === 0 ? (
                      <tr>
                        <td
                          colSpan={selectedFields.length}
                          className="px-2 py-4 text-center text-muted-foreground"
                        >
                          暂无数据
                        </td>
                      </tr>
                    ) : (
                      previewData.slice(0, 5).map((row, i) => (
                        <tr
                          key={i}
                          className="border-b border-border/20 hover:bg-muted/30"
                        >
                          {selectedFields
                            .filter((key) => AVAILABLE_FIELDS.find((f) => f.key === key))
                            .map((key) => (
                              <td key={key} className="px-2 py-1.5 whitespace-nowrap max-w-[120px] truncate">
                                {getCellValue(row, key)}
                              </td>
                            ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Export History ────────────────────────────────────────────────────────

// Custom event name for cross-component reactivity
const EXPORT_HISTORY_EVENT = "export-history-updated";

function dispatchHistoryUpdate() {
  window.dispatchEvent(new Event(EXPORT_HISTORY_EVENT));
}

function useLocalStorageHistory(): ExportRecord[] {
  const subscribe = useCallback((onStoreChange: () => void) => {
    const handler = () => onStoreChange();
    window.addEventListener("storage", handler);
    window.addEventListener(EXPORT_HISTORY_EVENT, handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener(EXPORT_HISTORY_EVENT, handler);
    };
  }, []);

  const getSnapshot = useCallback((): ExportRecord[] => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? (JSON.parse(saved) as ExportRecord[]) : [];
    } catch {
      return [];
    }
  }, []);

  const getServerSnapshot = useCallback((): ExportRecord[] => [], []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function ExportHistory() {
  const history = useLocalStorageHistory();

  const clearHistory = () => {
    localStorage.removeItem(STORAGE_KEY);
    dispatchHistoryUpdate();
    toast.success("导出记录已清除");
  };

  const redownload = (record: ExportRecord) => {
    downloadBlob(record.dataUrl, record.filename);
  };

  const removeRecord = (id: string) => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const current: ExportRecord[] = saved ? JSON.parse(saved) : [];
    const updated = current.filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    dispatchHistoryUpdate();
  };

  if (history.length === 0) {
    return (
      <div className="text-center py-4">
        <Clock className="h-6 w-6 mx-auto text-muted-foreground/40 mb-1.5" />
        <p className="text-xs text-muted-foreground">暂无导出记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          最近导出（{history.length}条）
        </span>
        <button
          className="text-[10px] text-muted-foreground hover:text-rose-500 transition-colors flex items-center gap-0.5"
          onClick={clearHistory}
        >
          <Trash2 className="h-2.5 w-2.5" />
          清除
        </button>
      </div>
      <ScrollArea className="max-h-48">
        <div className="space-y-1.5 pr-1">
          {history.map((record) => (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 p-2 rounded-md bg-muted/30 border border-border/20 group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium truncate">{record.type}</p>
                <p className="text-[10px] text-muted-foreground">
                  {record.time} · {record.size}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => redownload(record)}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-[10px]">重新下载</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-rose-500"
                  onClick={() => removeRecord(record.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Main ExportCenter ────────────────────────────────────────────────────

export function ExportCenter() {
  const [loadingType, setLoadingType] = useState<string | null>(null);

  // Client-only mount: use useSyncExternalStore for SSR safety
  const isClient = useSyncExternalStore(
    useCallback((onStoreChange: () => void) => {
      onStoreChange(); // trigger immediately on client
      return () => {};
    }, []),
    () => true,
    () => false
  );

  // Save export record to localStorage
  const saveExportRecord = useCallback(
    (type: string, filename: string, dataUrl: string) => {
      try {
        const sizeBytes =
          Math.round((dataUrl.length - dataUrl.indexOf(",") - 1) * 0.75) || 0;
        const record: ExportRecord = {
          id: getExportRecordId(),
          time: new Date().toLocaleString("zh-CN", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }),
          type,
          filename,
          size: formatFileSize(sizeBytes),
          url: "",
          dataUrl,
        };

        const saved = localStorage.getItem(STORAGE_KEY);
        const history: ExportRecord[] = saved ? JSON.parse(saved) : [];
        const updated = [record, ...history].slice(0, 20);

        // Only keep last 10 dataUrls (to avoid localStorage overflow)
        updated.forEach((r, i) => {
          if (i > 9) r.dataUrl = "";
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        dispatchHistoryUpdate();
      } catch {
        // localStorage full — silently ignore
      }
    },
    []
  );

  // Trigger download from API response
  const downloadFromApi = useCallback(
    async (url: string, filename: string, type: string) => {
      try {
        setLoadingType(type);
        const res = await fetch(url);
        if (!res.ok) throw new Error("Export failed");

        const blob = await res.blob();
        const dataUrl = URL.createObjectURL(blob);
        downloadBlob(dataUrl, filename);

        // Save to history
        const reader = new FileReader();
        reader.onloadend = () => {
          saveExportRecord(type, filename, reader.result as string);
        };
        reader.readAsDataURL(blob);

        toast.success("导出成功", { description: filename });
      } catch (err) {
        toast.error("导出失败", { description: "请稍后重试" });
      } finally {
        setLoadingType(null);
      }
    },
    [saveExportRecord]
  );

  // ── Quick exports ───────────────────────────────────────────────────────

  const handleExportAll = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    downloadFromApi(
      "/api/export/csv",
      `内容导出_全部_${today}.csv`,
      "导出全部内容"
    );
  }, [downloadFromApi]);

  const handleExportCalendar = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    downloadFromApi(
      "/api/export?format=csv",
      `日历数据_${today}.csv`,
      "导出日历数据"
    );
  }, [downloadFromApi]);

  const handleExportReport = useCallback(
    (format: string, range: string) => {
      const today = new Date().toISOString().slice(0, 10);
      const rangeLabels: Record<string, string> = {
        "7d": "近7天",
        "30d": "近30天",
        "90d": "近90天",
      };
      downloadFromApi(
        `/api/export/report?format=${format}&range=${range}`,
        `运营报告_${rangeLabels[range]}_${today}.${format}`,
        `导出运营报告(${rangeLabels[range]}·${format.toUpperCase()})`
      );
    },
    [downloadFromApi]
  );

  // ── Custom export ───────────────────────────────────────────────────────

  const handleCustomExport = useCallback(
    async (config: {
      format: string;
      platform: string;
      status: string;
      dateFrom: string;
      dateTo: string;
      fields: string[];
    }) => {
      const params = new URLSearchParams();
      if (config.platform) params.set("platform", config.platform);
      if (config.status) params.set("status", config.status);
      if (config.dateFrom) params.set("dateFrom", config.dateFrom);
      if (config.dateTo) params.set("dateTo", config.dateTo);

      const today = new Date().toISOString().slice(0, 10);
      const suffix = [
        config.platform ? PLATFORM_LABELS[config.platform] : "全部",
        config.status ? STATUS_LABELS[config.status] : "",
        config.dateFrom || config.dateTo
          ? `${config.dateFrom}_${config.dateTo}`
          : "",
      ]
        .filter(Boolean)
        .join("_");

      downloadFromApi(
        `/api/export/csv?${params.toString()}`,
        `自定义导出_${suffix || today}.${config.format}`,
        "自定义导出"
      );
    },
    [downloadFromApi]
  );

  const isLoading = loadingType !== null;

  if (!isClient) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <motion.div
      className="p-4 space-y-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <Download className="h-3.5 w-3.5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">导出中心</h3>
          <p className="text-[10px] text-muted-foreground">多格式数据导出与报告生成</p>
        </div>
      </div>

      {/* Quick Export Buttons */}
      <Card className="border-border/20">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs font-medium flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5 text-violet-500" />
            快速导出
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-2">
          <QuickExportButton
            label="导出全部内容"
            icon={FileSpreadsheet}
            color="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
            onClick={handleExportAll}
            loading={loadingType === "导出全部内容"}
          />
          <QuickExportButton
            label="导出日历数据"
            icon={CalendarDays}
            color="text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/20"
            onClick={handleExportCalendar}
            loading={loadingType === "导出日历数据"}
          />
          <ReportExportSubMenu
            onExport={handleExportReport}
            loading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Custom Export */}
      <Card className="border-border/20">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs font-medium flex items-center gap-1.5">
            <Settings2 className="h-3.5 w-3.5 text-amber-500" />
            自定义导出
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <CustomExportPanel onExport={handleCustomExport} loading={isLoading} />
        </CardContent>
      </Card>

      {/* Export History */}
      <Card className="border-border/20">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs font-medium flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            导出历史
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <ExportHistory />
        </CardContent>
      </Card>
    </motion.div>
  );
}
