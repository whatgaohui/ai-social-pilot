"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "@/store/app-store";
import type { ContentPost } from "@/types";
import {
  SpellCheck,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  AlertTriangle,
  ArrowRight,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

interface SpellcheckIssue {
  original: string;
  suggestion: string;
  type: "错别字" | "标点错误" | "语法问题";
  position: { start: number; end: number };
}

interface SpellcheckResult {
  checked: boolean;
  issues: SpellcheckIssue[];
}

function getTypeConfig(type: SpellcheckIssue["type"]) {
  switch (type) {
    case "错别字":
      return {
        emoji: "🔴",
        label: "错别字 / 语法错误",
        cardBg: "bg-red-50 dark:bg-red-950/20",
        cardBorder: "border-red-200 dark:border-red-800",
        badgeClass: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800",
        dotColor: "bg-red-500",
      };
    case "标点错误":
      return {
        emoji: "🟡",
        label: "标点符号问题",
        cardBg: "bg-amber-50 dark:bg-amber-950/20",
        cardBorder: "border-amber-200 dark:border-amber-800",
        badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
        dotColor: "bg-amber-500",
      };
    case "语法问题":
      return {
        emoji: "🟢",
        label: "改进建议",
        cardBg: "bg-emerald-50 dark:bg-emerald-950/20",
        cardBorder: "border-emerald-200 dark:border-emerald-800",
        badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        dotColor: "bg-emerald-500",
      };
  }
}

export function ContentSpellcheck({ post }: { post: ContentPost }) {
  const { platform, updateContentPost } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<SpellcheckResult | null>(null);
  const [applyingAll, setApplyingAll] = useState(false);
  const [appliedIndices, setAppliedIndices] = useState<Set<number>>(new Set());

  const handleCheck = async () => {
    if (!post.content) {
      toast.error("请先生成内容后再检测");
      return;
    }

    setChecking(true);
    setResult(null);
    setAppliedIndices(new Set());
    setIsOpen(true);

    try {
      const res = await fetch("/api/ai/spellcheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: post.content,
          platform,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
        if (data.issues && data.issues.length > 0) {
          toast.success(`检测完成，发现 ${data.issues.length} 个问题`);
        } else {
          toast.success("文案检测通过，未发现问题");
        }
      } else {
        toast.error("检测失败，请重试");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setChecking(false);
    }
  };

  const applySingleFix = (issue: SpellcheckIssue, index: number) => {
    let content = post.content;
    const pos = issue.position;

    if (pos.start >= 0 && pos.end >= 0 && pos.start < content.length && pos.end <= content.length) {
      content = content.slice(0, pos.start) + issue.suggestion + content.slice(pos.end);
    } else {
      // Fallback: simple text replacement
      content = content.replace(issue.original, issue.suggestion);
    }

    fetch(`/api/content/${post.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Failed");
      })
      .then((updated) => {
        updateContentPost(post.id, updated);
        setAppliedIndices((prev) => new Set(prev).add(index));
        toast.success("已修复");
      })
      .catch(() => {
        toast.error("修复失败，请重试");
      });
  };

  const applyAllFixes = async () => {
    if (!result || result.issues.length === 0) return;

    setApplyingAll(true);
    let content = post.content;

    // Apply fixes in reverse order to preserve positions
    const sortedIssues = [...result.issues]
      .map((issue, index) => ({ issue, index }))
      .filter(({ index }) => !appliedIndices.has(index))
      .sort((a, b) => b.issue.position.start - a.issue.position.start);

    for (const { issue } of sortedIssues) {
      const pos = issue.position;
      if (pos.start >= 0 && pos.end >= 0 && pos.start < content.length && pos.end <= content.length) {
        content = content.slice(0, pos.start) + issue.suggestion + content.slice(pos.end);
      } else {
        content = content.replace(issue.original, issue.suggestion);
      }
    }

    try {
      const res = await fetch(`/api/content/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        const updated = await res.json();
        updateContentPost(post.id, updated);
        setAppliedIndices((prev) => {
          const next = new Set(prev);
          sortedIssues.forEach(({ index }) => next.add(index));
          return next;
        });
        toast.success(`已修复 ${sortedIssues.length} 个问题`);
      } else {
        toast.error("批量修复失败");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setApplyingAll(false);
    }
  };

  const unappliedCount = result
    ? result.issues.length - appliedIndices.size
    : 0;

  // Group issues by type
  const groupedIssues = result
    ? [
        { type: "错别字" as const, issues: result.issues.filter((i) => i.type === "错别字") },
        { type: "标点错误" as const, issues: result.issues.filter((i) => i.type === "标点错误") },
        { type: "语法问题" as const, issues: result.issues.filter((i) => i.type === "语法问题") },
      ].filter((g) => g.issues.length > 0)
    : [];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-0 shadow-sm card-glow-border">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full h-auto p-4 hover:bg-muted/50 rounded-lg"
            onClick={(e) => {
              if (!isOpen && !result && !checking) {
                e.preventDefault();
                handleCheck();
              }
            }}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                  <SpellCheck className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-semibold">AI 文案纠错</span>
                {result && unappliedCount > 0 && (
                  <Badge variant="outline" className="text-[10px] h-5 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400">
                    {unappliedCount} 个问题
                  </Badge>
                )}
                {result && unappliedCount === 0 && result.issues.length > 0 && (
                  <Badge variant="outline" className="text-[10px] h-5 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
                    <Check className="h-2.5 w-2.5 mr-0.5" />
                    已修复
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {checking && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="px-4 pb-4 space-y-4">
            {/* Loading State */}
            {checking && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-8 space-y-3"
              >
                <div className="relative">
                  <Loader2 className="h-10 w-10 animate-spin text-primary/60" />
                  <SpellCheck className="h-5 w-5 text-violet-500 absolute -top-1 -right-1" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">AI 正在检测文案...</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    检查错别字、标点和语法问题
                  </p>
                </div>
              </motion.div>
            )}

            {/* Results */}
            <AnimatePresence>
              {!checking && result && (
                <motion.div
                  key="spellcheck-result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-4"
                >
                  {result.issues.length === 0 ? (
                    /* No Issues */
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center py-6 space-y-2"
                    >
                      <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <Check className="h-5 w-5 text-emerald-500" />
                      </div>
                      <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        文案完美，未发现问题
                      </p>
                      <p className="text-xs text-muted-foreground">
                        内容没有错别字、标点或语法问题
                      </p>
                    </motion.div>
                  ) : (
                    <>
                      {/* Issue Cards by Category */}
                      <ScrollArea className="max-h-80">
                        <div className="space-y-4 pr-1">
                          {groupedIssues.map((group) => {
                            const config = getTypeConfig(group.type);
                            return (
                              <motion.div
                                key={group.type}
                                initial={{ opacity: 0, x: -16 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-2"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{config.emoji}</span>
                                  <span className="text-xs font-semibold">{config.label}</span>
                                  <Badge variant="outline" className={`text-[10px] h-5 ${config.badgeClass}`}>
                                    {group.issues.length} 项
                                  </Badge>
                                </div>

                                <div className="space-y-2">
                                  {group.issues.map((issue, idx) => {
                                    const globalIdx = result.issues.indexOf(issue);
                                    const isApplied = appliedIndices.has(globalIdx);
                                    return (
                                      <motion.div
                                        key={globalIdx}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.25, delay: idx * 0.08 }}
                                        className={`rounded-lg border p-3 transition-all ${config.cardBg} ${config.cardBorder} ${
                                          isApplied ? "opacity-50" : ""
                                        }`}
                                      >
                                        <div className="flex items-start gap-2">
                                          <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${config.dotColor}`} />
                                          <div className="flex-1 min-w-0 space-y-2">
                                            {/* Position indicator */}
                                            {issue.position.start >= 0 && (
                                              <p className="text-[10px] text-muted-foreground">
                                                位置: 第 {issue.position.start + 1} 字
                                              </p>
                                            )}
                                            {/* Original text */}
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-[10px] text-muted-foreground shrink-0">原文:</span>
                                              <span className="text-xs line-through text-muted-foreground/70 truncate">
                                                {issue.original}
                                              </span>
                                            </div>
                                            {/* Arrow */}
                                            <div className="flex items-center gap-1 pl-1">
                                              <ArrowRight className="h-2.5 w-2.5 text-violet-500 shrink-0" />
                                            </div>
                                            {/* Suggestion */}
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-[10px] text-muted-foreground shrink-0">修正:</span>
                                              <span className="text-xs font-medium text-foreground truncate">
                                                {issue.suggestion}
                                              </span>
                                            </div>
                                            {/* Apply button */}
                                            {!isApplied && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-[10px] gap-1 px-2 text-violet-600 dark:text-violet-400 hover:text-violet-700 hover:bg-violet-100 dark:hover:bg-violet-900/30"
                                                onClick={() => applySingleFix(issue, globalIdx)}
                                              >
                                                <Check className="h-2.5 w-2.5" />
                                                应用此修复
                                              </Button>
                                            )}
                                            {isApplied && (
                                              <div className="flex items-center gap-1 text-[10px] text-emerald-500">
                                                <Check className="h-2.5 w-2.5" />
                                                已修复
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </motion.div>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </ScrollArea>

                      {/* Action Buttons */}
                      <div className="space-y-2">
                        {unappliedCount > 0 && (
                          <Button
                            onClick={applyAllFixes}
                            disabled={applyingAll}
                            size="sm"
                            className="w-full h-9 text-xs gap-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-sm btn-press"
                          >
                            {applyingAll ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                修复中...
                              </>
                            ) : (
                              <>
                                <Wrench className="h-3.5 w-3.5" />
                                一键修复（{unappliedCount} 项）
                              </>
                            )}
                          </Button>
                        )}

                        <Button
                          onClick={handleCheck}
                          variant="ghost"
                          size="sm"
                          className="w-full h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          重新检测
                        </Button>
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty State */}
            {!checking && !result && isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-6 space-y-3"
              >
                <SpellCheck className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">点击下方按钮开始检测</p>
                <Button
                  onClick={handleCheck}
                  size="sm"
                  className="h-8 text-xs gap-1.5 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white btn-press"
                >
                  <SpellCheck className="h-3.5 w-3.5" />
                  检测文案
                </Button>
              </motion.div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
