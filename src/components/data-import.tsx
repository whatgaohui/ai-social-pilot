"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Upload,
  FileSpreadsheet,
  FileJson,
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";

/* ================================================================
   Types
   ================================================================ */

interface DataImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
}

type ImportType = "content" | "knowledge";

/* ================================================================
   Helpers
   ================================================================ */

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function generateTemplateCSV(type: ImportType): string {
  const BOM = "\uFEFF";
  if (type === "content") {
    return (
      BOM +
      "scheduledDate,topic,content,contentType,platform,status\n" +
      "2025-01-15,每日职场小技巧,今天分享一个提高工作效率的方法：番茄工作法。每25分钟专注一项任务，然后休息5分钟…,text,wechat,planned\n" +
      "2025-01-16,产品体验分享,最近入手了一款超好用的无线耳机，音质清晰、降噪效果出色…,image,xiaohongshu,planned\n" +
      '2025-01-17,行业观点,关于AI对创意行业的影响，我认为…,text,wechat,planned\n'
    );
  }
  return (
    BOM +
    "title,content,category\n" +
    "职场高效沟通技巧,在职场中，高效沟通是必备能力。以下是几个关键要点：1. 明确表达意图 2. 善于倾听 3. 及时反馈…,expertise\n" +
    "项目管理经验总结,过去三年我参与了多个大型项目的管理，总结出以下经验：首先要做好项目规划…,experience\n" +
    "行业趋势分析,2025年行业将迎来几个重要趋势变化…,opinion\n"
  );
}

function downloadTemplate(type: ImportType) {
  const csv = generateTemplateCSV(type);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const fileName = type === "content" ? "content-template.csv" : "knowledge-template.csv";
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/* ================================================================
   Component
   ================================================================ */

export function DataImport({ open, onOpenChange }: DataImportProps) {
  const [importType, setImportType] = useState<ImportType>("knowledge");
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setFile(null);
    setResult(null);
  }, []);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        reset();
      }
      onOpenChange(newOpen);
    },
    [onOpenChange, reset]
  );

  // ─── File handling ────────────────────────────────────────────

  const validateFile = useCallback((f: File): string | null => {
    const name = f.name.toLowerCase();
    if (!name.endsWith(".csv") && !name.endsWith(".json")) {
      return "仅支持 .csv 或 .json 格式文件";
    }
    if (f.size > 5 * 1024 * 1024) {
      return "文件大小不能超过 5MB";
    }
    return null;
  }, []);

  const handleFile = useCallback(
    (f: File) => {
      const error = validateFile(f);
      if (error) {
        toast.error(error);
        return;
      }
      setFile(f);
      setResult(null);
    },
    [validateFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  // ─── Import ───────────────────────────────────────────────────

  const handleImport = useCallback(async () => {
    if (!file) return;
    setImporting(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", importType);

      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      const data: ImportResult = await res.json();

      if (res.ok && data.success) {
        toast.success(`成功导入 ${data.imported} 条数据`);
      } else if (data.imported > 0) {
        toast.warning(`部分成功：导入 ${data.imported} 条，跳过 ${data.skipped} 条`);
      } else {
        toast.error(data.errors[0] || "导入失败");
      }

      setResult(data);
    } catch {
      toast.error("请求失败，请重试");
      setResult({ success: false, imported: 0, skipped: 0, errors: ["网络请求失败"] });
    } finally {
      setImporting(false);
    }
  }, [file, importType]);

  // ─── Template download ────────────────────────────────────────

  const handleDownloadTemplate = useCallback(() => {
    downloadTemplate(importType);
    toast.success("模板文件已下载");
  }, [importType]);

  const isCSV = file?.name.toLowerCase().endsWith(".csv");
  const isJSON = file?.name.toLowerCase().endsWith(".json");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Upload className="h-3.5 w-3.5 text-white" />
            </div>
            数据导入
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            上传 CSV 或 JSON 文件，快速批量导入内容或知识库数据
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="px-6 py-4 space-y-5">
            {/* Import Type Selector */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2.5 block">
                导入类型
              </label>
              <RadioGroup
                value={importType}
                onValueChange={(val) => {
                  setImportType(val as ImportType);
                  setResult(null);
                }}
                className="grid grid-cols-2 gap-3"
              >
                <label
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    importType === "content"
                      ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20"
                      : "border-border/60 bg-muted/20 hover:bg-muted/40"
                  }`}
                >
                  <RadioGroupItem value="content" className="sr-only" />
                  <div className="flex items-center gap-2 flex-1">
                    <FileSpreadsheet
                      className={`h-4 w-4 ${
                        importType === "content" ? "text-amber-600" : "text-muted-foreground"
                      }`}
                    />
                    <div>
                      <span className="text-xs font-medium block">内容帖子</span>
                      <span className="text-[10px] text-muted-foreground">导入到内容日历</span>
                    </div>
                  </div>
                </label>
                <label
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    importType === "knowledge"
                      ? "border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/20"
                      : "border-border/60 bg-muted/20 hover:bg-muted/40"
                  }`}
                >
                  <RadioGroupItem value="knowledge" className="sr-only" />
                  <div className="flex items-center gap-2 flex-1">
                    <FileJson
                      className={`h-4 w-4 ${
                        importType === "knowledge" ? "text-violet-600" : "text-muted-foreground"
                      }`}
                    />
                    <div>
                      <span className="text-xs font-medium block">知识库</span>
                      <span className="text-[10px] text-muted-foreground">导入知识条目</span>
                    </div>
                  </div>
                </label>
              </RadioGroup>
            </div>

            {/* Template Download */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <Download className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">下载 {importType === "content" ? "内容帖子" : "知识库"} 模板</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[11px] px-2 text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300"
                onClick={handleDownloadTemplate}
              >
                下载模板
              </Button>
            </div>

            <Separator />

            {/* Drag & Drop Upload Zone */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2.5 block">
                选择文件
              </label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-violet-400 dark:border-violet-500 bg-violet-50 dark:bg-violet-950/20 scale-[1.01]"
                    : file
                      ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/10"
                      : "border-border hover:border-muted-foreground/40 hover:bg-muted/30"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json"
                  onChange={handleInputChange}
                  className="hidden"
                />

                {file ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                          setResult(null);
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${
                          isCSV
                            ? "text-emerald-600 border-emerald-200 dark:border-emerald-800"
                            : "text-amber-600 border-amber-200 dark:border-amber-800"
                        }`}
                      >
                        {isCSV ? "CSV" : "JSON"}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">{formatFileSize(file.size)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <GripVertical className="h-5 w-5 text-muted-foreground/40 mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      拖拽文件到此处，或 <span className="text-violet-600 dark:text-violet-400 font-medium">点击选择</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground/60">支持 .csv、.json 格式，最大 5MB</p>
                  </div>
                )}
              </div>
            </div>

            {/* Import Button */}
            <Button
              onClick={handleImport}
              disabled={!file || importing}
              className="w-full h-10 text-sm font-medium bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white disabled:opacity-50"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  导入中…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  开始导入
                </>
              )}
            </Button>

            {/* Results Display */}
            <AnimatePresence mode="wait">
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <Card
                    className={`border ${
                      result.success
                        ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/10"
                        : result.imported > 0
                          ? "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10"
                          : "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/10"
                    }`}
                  >
                    <CardContent className="p-4 space-y-3">
                      {/* Status Header */}
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : result.imported > 0 ? (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm font-medium">
                          {result.success
                            ? "导入完成"
                            : result.imported > 0
                              ? "部分导入成功"
                              : "导入失败"}
                        </span>
                      </div>

                      {/* Stats */}
                      <div className="flex gap-4">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-xs text-muted-foreground">成功：</span>
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            {result.imported}
                          </span>
                        </div>
                        {result.skipped > 0 && (
                          <div className="flex items-center gap-1.5">
                            <XCircle className="h-3.5 w-3.5 text-amber-500" />
                            <span className="text-xs text-muted-foreground">跳过：</span>
                            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                              {result.skipped}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Errors */}
                      {result.errors.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-medium text-muted-foreground">
                            错误详情 ({result.errors.length})
                          </p>
                          <ScrollArea className="max-h-32">
                            <div className="space-y-1 pr-2">
                              {result.errors.slice(0, 10).map((error, idx) => (
                                <motion.div
                                  key={idx}
                                  initial={{ opacity: 0, x: -5 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.05 }}
                                  className="flex items-start gap-1.5 text-[11px] text-red-600 dark:text-red-400"
                                >
                                  <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                  <span>{error}</span>
                                </motion.div>
                              ))}
                              {result.errors.length > 10 && (
                                <p className="text-[10px] text-muted-foreground pl-4">
                                  …还有 {result.errors.length - 10} 条错误
                                </p>
                              )}
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
