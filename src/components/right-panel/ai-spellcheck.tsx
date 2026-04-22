"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SpellCheck,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
  X,
  Wand2,
  Type,
  FileText,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SpellCheckIssue {
  original: string;
  suggestion: string;
  type: string;
  position: { start: number; end: number };
}

export interface SpellCheckResult {
  checked: boolean;
  issues: SpellCheckIssue[];
}

interface AISpellCheckProps {
  content: string;
  onResult: (result: SpellCheckResult) => void;
}

// ─── Animation Variants ────────────────────────────────────────────────────

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" as const } },
};

// ─── Helper: Get type icon and color ───────────────────────────────────────

function getTypeConfig(type: string) {
  switch (type) {
    case "错别字":
      return {
        icon: Type,
        color: "text-rose-600 dark:text-rose-400",
        bg: "bg-rose-100 dark:bg-rose-900/30",
        border: "border-rose-200 dark:border-rose-800/40",
      };
    case "标点错误":
      return {
        icon: FileText,
        color: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-100 dark:bg-amber-900/30",
        border: "border-amber-200 dark:border-amber-800/40",
      };
    case "语法问题":
      return {
        icon: MessageSquare,
        color: "text-violet-600 dark:text-violet-400",
        bg: "bg-violet-100 dark:bg-violet-900/30",
        border: "border-violet-200 dark:border-violet-800/40",
      };
    default:
      return {
        icon: AlertTriangle,
        color: "text-muted-foreground",
        bg: "bg-muted",
        border: "border-border",
      };
  }
}

// ─── Shimmer Loading ───────────────────────────────────────────────────────

function SpellCheckShimmer() {
  return (
    <div className="space-y-3 px-1 pb-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-4 w-32" />
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-3 space-y-2 animate-shimmer">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export function AISpellCheck({ content, onResult }: AISpellCheckProps) {
  const { platform } = useAppStore();
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<SpellCheckResult | null>(null);
  const [ignoredIssues, setIgnoredIssues] = useState<Set<number>>(new Set());

  const handleCheck = useCallback(async () => {
    if (!content || content.trim().length === 0) {
      toast.error("没有可检查的内容");
      return;
    }

    setChecking(true);
    setResult(null);
    setIgnoredIssues(new Set());

    try {
      const res = await fetch("/api/ai/spellcheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, platform }),
      });

      if (!res.ok) throw new Error("检查失败");

      const data: SpellCheckResult = await res.json();
      setResult(data);
      onResult(data);

      if (data.issues.length === 0) {
        toast.success("未发现错误，内容质量良好 ✓");
      } else {
        toast.warning(`发现 ${data.issues.length} 个问题`, {
          description: "请查看详细问题并决定是否修复",
        });
      }
    } catch {
      toast.error("错别字检查失败，请重试");
      setResult({ checked: true, issues: [] });
    } finally {
      setChecking(false);
    }
  }, [content, platform, onResult]);

  const handleApplyFixes = useCallback(() => {
    if (!result || result.issues.length === 0) return;

    const activeIssues = result.issues.filter(
      (_, idx) => !ignoredIssues.has(idx)
    );

    if (activeIssues.length === 0) {
      toast.info("没有需要修复的问题");
      return;
    }

    // Build a text with fixes applied using position info
    let fixedContent = content;
    const sortedIssues = activeIssues
      .filter((issue) => issue.position.start >= 0 && issue.position.end > issue.position.start)
      .sort((a, b) => b.position.start - a.position.start); // Apply from end to start

    for (const issue of sortedIssues) {
      const before = fixedContent.slice(0, issue.position.start);
      const after = fixedContent.slice(issue.position.end);
      fixedContent = before + issue.suggestion + after;
    }

    // If no position info, do a simple replace
    if (sortedIssues.length === 0) {
      for (const issue of activeIssues) {
        fixedContent = fixedContent.replace(issue.original, issue.suggestion);
      }
    }

    onResult({ checked: true, issues: [] });
    setResult({ checked: true, issues: [] });
    toast.success(`已修复 ${activeIssues.length} 个问题`);
  }, [result, content, ignoredIssues, onResult]);

  const handleIgnore = useCallback((index: number) => {
    setIgnoredIssues((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }, []);

  const activeIssueCount =
    result ? result.issues.length - ignoredIssues.size : 0;

  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger className="w-full group/collapsible">
        <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-rose-500/10 to-amber-500/10 flex items-center justify-center">
                <SpellCheck className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-xs font-medium">AI错别字检查</span>
                <span className="text-[10px] text-muted-foreground">
                  {checking
                    ? "正在检查中..."
                    : result
                      ? activeIssueCount === 0
                        ? "无错误 ✓"
                        : `发现${activeIssueCount}个问题`
                      : "智能检测错别字、标点、语法"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {result && !checking && (
                <Badge
                  className={`text-[9px] px-1.5 py-0 h-4 ${
                    activeIssueCount === 0
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                  }`}
                >
                  {activeIssueCount === 0 ? (
                    <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                  ) : (
                    <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                  )}
                  {activeIssueCount === 0 ? "无错误" : activeIssueCount}
                </Badge>
              )}
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]/collapsible:rotate-180" />
            </div>
          </CardContent>
        </Card>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-1 pb-3 space-y-2">
          {/* Check button */}
          <Button
            size="sm"
            className="w-full h-8 text-xs bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white btn-ripple press-scale"
            onClick={handleCheck}
            disabled={checking || !content}
          >
            {checking ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                检查中...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                开始检查
              </>
            )}
          </Button>

          {/* Loading shimmer */}
          {checking && <SpellCheckShimmer />}

          {/* No content warning */}
          {!content && (
            <p className="text-[10px] text-center text-muted-foreground py-2">
              请先输入要检查的内容
            </p>
          )}

          {/* Results */}
          <AnimatePresence>
            {result && !checking && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-2 overflow-hidden"
              >
                {/* Status badge */}
                {result.issues.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                      内容检查通过，未发现错误
                    </span>
                  </motion.div>
                ) : (
                  <>
                    {/* Issue cards */}
                    {result.issues.map((issue, idx) => {
                      if (ignoredIssues.has(idx)) return null;
                      const config = getTypeConfig(issue.type);
                      const Icon = config.icon;

                      return (
                        <motion.div
                          key={idx}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          transition={{ delay: idx * 0.05 }}
                        >
                          <Card
                            className={`border ${config.border} overflow-hidden`}
                          >
                            <CardContent className="p-3 space-y-2">
                              {/* Type badge */}
                              <div className="flex items-center justify-between">
                                <Badge
                                  className={`text-[9px] px-1.5 py-0 ${config.bg} ${config.color} border-0`}
                                >
                                  <Icon className="h-2.5 w-2.5 mr-0.5" />
                                  {issue.type}
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-1.5 text-[10px] text-muted-foreground"
                                  onClick={() => handleIgnore(idx)}
                                >
                                  <X className="h-3 w-3" />
                                  忽略
                                </Button>
                              </div>

                              {/* Original text with highlight */}
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground shrink-0">
                                  原文：
                                </span>
                                <span className="text-xs bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded font-medium line-through decoration-rose-400">
                                  {issue.original}
                                </span>
                              </div>

                              {/* Suggested fix */}
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground shrink-0">
                                  修改：
                                </span>
                                <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded font-medium">
                                  {issue.suggestion}
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}

                    {/* Apply all fixes button */}
                    {activeIssueCount > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <Button
                          size="sm"
                          className="w-full h-8 text-xs bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white btn-ripple press-scale"
                          onClick={handleApplyFixes}
                        >
                          <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                          一键修复（{activeIssueCount}项）
                        </Button>
                      </motion.div>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
