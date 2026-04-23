"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import type { ContentPost, ContentVersion, ChangeType } from "@/types";
import { CHANGE_TYPE_LABELS, CHANGE_TYPE_COLORS } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  History, ChevronDown, ChevronUp, Eye, RotateCcw,
  Save, Loader2, GitCompare, Clock, Sparkles,
  FileText, ArrowRight, X,
} from "lucide-react";
import { toast } from "sonner";

interface ContentHistoryProps {
  post: ContentPost;
}

// Relative time formatter
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "刚刚";
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  if (diffDay < 30) return `${diffDay}天前`;
  return `${Math.floor(diffDay / 30)}个月前`;
}

// Simple word-level diff highlighting
function DiffView({ oldText, newText }: { oldText: string; newText: string }) {
  const oldWords = oldText.split("");
  const newWords = newText.split("");

  // Build a simple character-level diff visualization
  const oldSet = new Set(oldWords);
  const newSet = new Set(newWords);

  return (
    <div className="space-y-3">
      {/* Old version */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] h-5 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">
            旧版本
          </Badge>
        </div>
        <div className="rounded-lg border border-border p-3 bg-muted/30 max-h-48 overflow-y-auto text-xs leading-relaxed">
          <div className="flex flex-wrap gap-0">
            {oldWords.map((char, i) => (
              <span
                key={i}
                className={
                  !newSet.has(char)
                    ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 rounded-sm"
                    : ""
                }
              >
                {char === " " ? "\u00A0" : char}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* New version */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] h-5 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
            新版本
          </Badge>
        </div>
        <div className="rounded-lg border border-border p-3 bg-muted/30 max-h-48 overflow-y-auto text-xs leading-relaxed">
          <div className="flex flex-wrap gap-0">
            {newWords.map((char, i) => (
              <span
                key={i}
                className={
                  !oldSet.has(char)
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-sm"
                    : ""
                }
              >
                {char === " " ? "\u00A0" : char}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        <span className="inline-block w-3 h-3 bg-red-100 dark:bg-red-900/40 rounded-sm align-middle mr-1" />
        已删除
        <span className="inline-block w-3 h-3 bg-emerald-100 dark:bg-emerald-900/40 rounded-sm align-middle mx-1 ml-2" />
        新增
      </p>
    </div>
  );
}

// Empty state component
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-8 px-4"
    >
      <div className="relative mb-4">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center">
          <FileText className="h-7 w-7 text-violet-400" />
        </div>
        <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center">
          <Clock className="h-3 w-3 text-amber-500" />
        </div>
      </div>
      <p className="text-sm font-medium text-muted-foreground mb-1">暂无历史版本</p>
      <p className="text-[11px] text-muted-foreground/70 text-center max-w-[200px]">
        编辑文案后点击「保存当前版本」，即可在这里查看修改记录
      </p>
    </motion.div>
  );
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-4 p-1">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <Skeleton className="h-3 w-3 rounded-full" />
            {i < 3 && <Skeleton className="w-0.5 flex-1 bg-muted-foreground/10 mt-1" />}
          </div>
          <div className="flex-1 space-y-2 pb-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-8 rounded-md" />
              <Skeleton className="h-4 w-14 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-12 w-full rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Single version entry in the timeline
function VersionEntry({
  version,
  isLatest,
  expandedId,
  setExpandedId,
  onCompare,
  onRestore,
  compareTargetId,
}: {
  version: ContentVersion;
  isLatest: boolean;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  onCompare: (v: ContentVersion) => void;
  onRestore: (v: ContentVersion) => void;
  compareTargetId: string | null;
}) {
  const isExpanded = expandedId === version.id;
  const changeType = version.changeType as ChangeType;
  const label = CHANGE_TYPE_LABELS[changeType] || "编辑";
  const colorClass = CHANGE_TYPE_COLORS[changeType] || "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300";

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="relative flex gap-3 group"
    >
      {/* Timeline dot and line */}
      <div className="flex flex-col items-center pt-1.5">
        <div
          className={`h-3 w-3 rounded-full border-2 shrink-0 z-10 transition-colors ${
            isLatest
              ? "bg-violet-500 border-violet-400 shadow-sm shadow-violet-500/30"
              : "bg-background border-muted-foreground/30 group-hover:border-muted-foreground/50"
          }`}
        />
      </div>

      {/* Content card */}
      <div
        className={`flex-1 pb-5 -mt-0.5 ${
          isLatest ? "" : ""
        }`}
      >
        <div
          className={`rounded-lg border p-3 transition-all duration-200 content-card-hover ${
            isLatest
              ? "border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/10 shadow-sm"
              : "border-border hover:border-muted-foreground/30"
          }`}
        >
          {/* Header row */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {/* Version number */}
            <Badge
              variant="outline"
              className={`text-[10px] h-5 font-mono px-1.5 ${
                isLatest
                  ? "border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30"
                  : ""
              }`}
            >
              V{version.version}
            </Badge>

            {/* Change type */}
            <Badge className={`text-[10px] h-5 px-1.5 ${colorClass}`} variant="secondary">
              {label}
            </Badge>

            {/* AI Score */}
            {version.aiScore > 0 && (
              <Badge variant="outline" className="text-[10px] h-5 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400">
                <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                {version.aiScore}分
              </Badge>
            )}

            {/* Timestamp */}
            <span className="text-[10px] text-muted-foreground ml-auto">
              {formatRelativeTime(version.createdAt)}
            </span>
          </div>

          {/* Summary */}
          {version.summary && (
            <p className="text-[11px] text-muted-foreground mb-2">{version.summary}</p>
          )}

          {/* Content preview */}
          <div className="text-xs leading-relaxed text-foreground/80">
            {isExpanded ? (
              <p className="whitespace-pre-wrap">{version.content}</p>
            ) : (
              <p className="line-clamp-3">{version.content}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/50">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground micro-hover focus-ring-soft"
              onClick={() => setExpandedId(isExpanded ? null : version.id)}
            >
              <Eye className="h-3 w-3 mr-1" />
              {isExpanded ? "收起" : "查看"}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground micro-hover focus-ring-soft"
              onClick={() => onRestore(version)}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              恢复
            </Button>

            {version.version > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className={`h-6 px-2 text-[11px] micro-hover focus-ring-soft ${
                  compareTargetId === version.id
                    ? "text-violet-600 dark:text-violet-400"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => onCompare(version)}
              >
                <GitCompare className="h-3 w-3 mr-1" />
                {compareTargetId === version.id ? "取消对比" : "对比"}
              </Button>
            )}
          </div>
        </div>

        {/* Compare panel */}
        <AnimatePresence>
          {compareTargetId === version.id && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50/30 dark:bg-violet-950/5 p-3">
                <div className="flex items-center gap-2 mb-3">
                  <GitCompare className="h-3.5 w-3.5 text-violet-500" />
                  <span className="text-[11px] font-medium text-violet-600 dark:text-violet-400">
                    版本对比: V{version.version - 1} → V{version.version}
                  </span>
                </div>
                <DiffView oldText="" newText={version.content} />
                <div className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground/60">
                  <ArrowRight className="h-3 w-3" />
                  仅显示当前版本与前一版本的内容差异
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function ContentHistory({ post }: ContentHistoryProps) {
  const { updateContentPost } = useAppStore();
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [compareTargetId, setCompareTargetId] = useState<string | null>(null);

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/content/${post.id}/versions`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [post.id]);

  useEffect(() => {
    if (open && versions.length === 0) {
      fetchVersions();
    }
  }, [open, post.id, versions.length, fetchVersions]);

  const saveCurrentVersion = async () => {
    if (!post.content.trim()) {
      toast.error("内容为空，无法保存版本");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/content/${post.id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: post.content,
          changeType: "edit",
          summary: "手动保存当前版本",
          aiScore: post.aiScore ? Math.round(post.aiScore) : 0,
        }),
      });

      if (res.ok) {
        const newVersion = await res.json();
        setVersions((prev) => [newVersion, ...prev]);
        toast.success(`已保存版本 V${newVersion.version}`);
      } else {
        toast.error("保存失败");
      }
    } catch {
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const restoreVersion = async (version: ContentVersion) => {
    try {
      const res = await fetch(`/api/content/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: version.content }),
      });

      if (res.ok) {
        const updated = await res.json();
        updateContentPost(post.id, updated);
        toast.success(`已恢复到版本 V${version.version}`);
      } else {
        toast.error("恢复失败");
      }
    } catch {
      toast.error("恢复失败");
    }
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full">
        <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group/trig content-card-hover">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500/10 to-purple-500/10 flex items-center justify-center">
                <History className="h-4 w-4 text-violet-500" />
              </div>
              <span className="text-sm font-medium">版本历史</span>
              {versions.length > 0 && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                  {versions.length}
                </Badge>
              )}
            </div>
            {open ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </CardContent>
        </Card>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-1 pb-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">
              查看文案修改记录，支持版本对比和恢复
            </p>
            <Button
              onClick={saveCurrentVersion}
              disabled={saving || !post.content.trim()}
              size="sm"
              variant="outline"
              className="h-7 text-[11px] border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/20 focus-ring-soft"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="h-3 w-3 mr-1" />
                  保存当前版本
                </>
              )}
            </Button>
          </div>

          <Separator />

          {/* Content area */}
          <ScrollArea className="max-h-96">
            <div className="pr-2">
              {loading ? (
                <LoadingSkeleton />
              ) : versions.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="relative">
                  {/* Timeline connector line */}
                  <div className="absolute left-[5px] top-[6px] bottom-4 w-[2px] bg-muted-foreground/10" />

                  <AnimatePresence mode="popLayout">
                    {versions.map((v, index) => (
                      <VersionEntry
                        key={v.id}
                        version={v}
                        isLatest={index === 0}
                        expandedId={expandedId}
                        setExpandedId={setExpandedId}
                        onCompare={(ver) =>
                          setCompareTargetId(
                            compareTargetId === ver.id ? null : ver.id
                          )
                        }
                        onRestore={restoreVersion}
                        compareTargetId={compareTargetId}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
