"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import type { ContentPost, PostStatus } from "@/types";
import { POST_STATUS_LABELS } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CheckSquare,
  Square,
  X,
  Trash2,
  Sparkles,
  Copy,
  ArrowRight,
  Loader2,
  SelectAll,
  Deselect,
  ClipboardCheck,
  ChevronsRight,
  RefreshCw,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

// ---------------------------------------------------------------------------
// Context types
// ---------------------------------------------------------------------------

interface BatchOperationsContextValue {
  /** Whether batch mode is currently active */
  isBatchMode: boolean;
  /** Enter or exit batch mode */
  toggleBatchMode: () => void;
  /** Set of currently selected post IDs */
  selectedIds: Set<string>;
  /** Toggle selection of a single post */
  toggleSelect: (id: string) => void;
  /** Select all given IDs (replaces current selection) */
  selectAll: (ids: string[]) => void;
  /** Clear the entire selection */
  deselectAll: () => void;
  /** Check whether a specific post is selected */
  isSelected: (id: string) => boolean;
  /** Count of selected posts */
  selectedCount: number;
  /** Exit batch mode (alias, more semantic) */
  exitBatchMode: () => void;
}

const BatchOperationsContext = createContext<BatchOperationsContextValue | null>(
  null,
);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function BatchOperationsProvider({ children }: { children: ReactNode }) {
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleBatchMode = useCallback(() => {
    setIsBatchMode((prev) => {
      if (prev) {
        setSelectedIds(new Set());
      }
      return !prev;
    });
  }, []);

  const exitBatchMode = useCallback(() => {
    setIsBatchMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds],
  );

  const selectedCount = selectedIds.size;

  const value = useMemo<BatchOperationsContextValue>(
    () => ({
      isBatchMode,
      toggleBatchMode,
      selectedIds,
      toggleSelect,
      selectAll,
      deselectAll,
      isSelected,
      selectedCount,
      exitBatchMode,
    }),
    [
      isBatchMode,
      toggleBatchMode,
      selectedIds,
      toggleSelect,
      selectAll,
      deselectAll,
      isSelected,
      selectedCount,
      exitBatchMode,
    ],
  );

  return (
    <BatchOperationsContext.Provider value={value}>
      {children}
    </BatchOperationsContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useBatchOperations(): BatchOperationsContextValue {
  const ctx = useContext(BatchOperationsContext);
  if (!ctx) {
    throw new Error(
      "useBatchOperations must be used within a BatchOperationsProvider",
    );
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Batch Checkbox (for embedding in calendar cells)
// ---------------------------------------------------------------------------

interface BatchCheckboxProps {
  postId: string;
  className?: string;
}

export function BatchCheckbox({ postId, className }: BatchCheckboxProps) {
  const { isBatchMode, isSelected, toggleSelect } = useBatchOperations();

  if (!isBatchMode) return null;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className={className}
    >
      <Checkbox
        checked={isSelected(postId)}
        onCheckedChange={() => toggleSelect(postId)}
        className="h-4 w-4 rounded border-2 border-violet-400 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600 dark:border-violet-400 dark:data-[state=checked]:bg-violet-500 dark:data-[state=checked]:border-violet-500"
        onClick={(e) => e.stopPropagation()}
      />
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Batch Toggle Button (to enter batch mode)
// ---------------------------------------------------------------------------

export function BatchToggleButton({ allPostIds }: { allPostIds: string[] }) {
  const { isBatchMode, toggleBatchMode, selectAll, deselectAll, selectedCount, exitBatchMode } =
    useBatchOperations();

  if (isBatchMode) {
    return (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground"
          onClick={() => {
            if (selectedCount === allPostIds.length) {
              deselectAll();
            } else {
              selectAll(allPostIds);
            }
          }}
        >
          {selectedCount === allPostIds.length ? (
            <>
              <Deselect className="h-3 w-3 mr-1" />
              取消全选
            </>
          ) : (
            <>
              <SelectAll className="h-3 w-3 mr-1" />
              全选
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[10px] text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300"
          onClick={exitBatchMode}
        >
          <X className="h-3 w-3 mr-1" />
          退出批量
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-[10px] text-muted-foreground hover:text-violet-600 dark:hover:text-violet-400"
      onClick={toggleBatchMode}
    >
      <CheckSquare className="h-3.5 w-3.5 mr-1" />
      批量操作
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Status transition map: planned → generated → optimized → published
// ---------------------------------------------------------------------------

const STATUS_FLOW: PostStatus[] = ["planned", "generated", "optimized", "published"];

function getNextStatus(current: PostStatus): PostStatus | null {
  const idx = STATUS_FLOW.indexOf(current);
  if (idx === -1 || idx >= STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[idx + 1];
}

// ---------------------------------------------------------------------------
// Batch Toolbar (floating at top of calendar when batch mode is active)
// ---------------------------------------------------------------------------

export function BatchToolbar({ posts }: { posts: ContentPost[] }) {
  const {
    isBatchMode,
    selectedIds,
    selectedCount,
    selectAll,
    deselectAll,
    exitBatchMode,
  } = useBatchOperations();
  const { contentPosts, setContentPosts, updateContentPost } = useAppStore();
  const { copied, copy } = useCopyToClipboard();

  // Batch operation states
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeProgress, setOptimizeProgress] = useState(0);
  const [optimizeTotal, setOptimizeTotal] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  // Derived
  const allPostIds = useMemo(() => contentPosts.map((p) => p.id), [contentPosts]);
  const selectedPosts = useMemo(
    () => contentPosts.filter((p) => selectedIds.has(p.id)),
    [contentPosts, selectedIds],
  );
  const allSelected = selectedCount > 0 && selectedCount === allPostIds.length;

  // -----------------------------------------------------------------------
  // Batch: Change status
  // -----------------------------------------------------------------------
  const handleBatchChangeStatus = useCallback(
    async (newStatus: PostStatus) => {
      if (selectedCount === 0) return;
      setIsChangingStatus(true);

      let successCount = 0;
      let failCount = 0;

      for (const post of selectedPosts) {
        try {
          const res = await fetch(`/api/content/${post.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
          });
          if (res.ok) {
            const updated = await res.json();
            updateContentPost(post.id, { status: updated.status ?? newStatus });
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }
      }

      setIsChangingStatus(false);

      if (failCount === 0) {
        toast.success(
          `已将 ${successCount} 条内容状态修改为「${POST_STATUS_LABELS[newStatus]}」`,
        );
        exitBatchMode();
      } else {
        toast.error(
          `修改完成：${successCount} 条成功，${failCount} 条失败`,
        );
      }
    },
    [selectedCount, selectedPosts, updateContentPost, exitBatchMode],
  );

  // -----------------------------------------------------------------------
  // Batch: AI optimize
  // -----------------------------------------------------------------------
  const handleBatchOptimize = useCallback(async () => {
    if (selectedCount === 0) return;
    setIsOptimizing(true);
    setOptimizeTotal(selectedCount);
    setOptimizeProgress(0);

    let successCount = 0;
    let failCount = 0;

    for (const post of selectedPosts) {
      try {
        const res = await fetch("/api/ai/optimize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: post.content,
            topic: post.topic,
            platform: post.platform || "wechat",
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.content) {
            updateContentPost(post.id, {
              content: data.content,
              status: "optimized" as PostStatus,
              aiScore: data.aiScore ?? post.aiScore,
            });
            successCount++;
          } else {
            failCount++;
          }
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
      setOptimizeProgress((prev) => prev + 1);
    }

    setIsOptimizing(false);
    setOptimizeProgress(0);

    if (failCount === 0) {
      toast.success(`已成功优化 ${successCount} 条内容`);
      exitBatchMode();
    } else {
      toast.warning(
        `优化完成：${successCount} 条成功，${failCount} 条失败`,
      );
    }
  }, [selectedCount, selectedPosts, updateContentPost, exitBatchMode]);

  // -----------------------------------------------------------------------
  // Batch: Delete
  // -----------------------------------------------------------------------
  const handleBatchDelete = useCallback(async () => {
    setIsDeleting(true);

    let successCount = 0;
    let failCount = 0;

    for (const post of selectedPosts) {
      try {
        const res = await fetch(`/api/content/${post.id}`, {
          method: "DELETE",
        });
        if (res.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    // Update store: remove deleted posts
    if (successCount > 0) {
      const deletedIds = new Set(selectedPosts.map((p) => p.id));
      setContentPosts(
        contentPosts.filter((p) => !deletedIds.has(p.id)),
      );
    }

    setIsDeleting(false);
    setShowDeleteDialog(false);

    if (failCount === 0) {
      toast.success(`已删除 ${successCount} 条内容`);
      exitBatchMode();
    } else {
      toast.error(`删除完成：${successCount} 条成功，${failCount} 条失败`);
    }
  }, [selectedPosts, contentPosts, setContentPosts, exitBatchMode]);

  // -----------------------------------------------------------------------
  // Batch: Copy
  // -----------------------------------------------------------------------
  const handleBatchCopy = useCallback(async () => {
    if (selectedCount === 0) return;

    const separator = "\n\n---\n\n";
    const text = selectedPosts
      .map((p, i) => {
        const header = `【${i + 1}】${p.topic}`;
        const content = p.content;
        return `${header}\n${content}`;
      })
      .join(separator);

    copy(text);
    toast.success(`已复制 ${selectedCount} 条内容到剪贴板`);
  }, [selectedCount, selectedPosts, copy]);

  // -----------------------------------------------------------------------
  // Compute the next status for the "advance status" action
  // -----------------------------------------------------------------------
  const commonNextStatus = useMemo((): PostStatus | null => {
    if (selectedPosts.length === 0) return null;
    const statuses = new Set(selectedPosts.map((p) => p.status as PostStatus));
    if (statuses.size !== 1) return null;
    const current = [...statuses][0];
    return getNextStatus(current);
  }, [selectedPosts]);

  // Don't render anything if not in batch mode
  if (!isBatchMode) return null;

  return (
    <>
      <AnimatePresence>
        {/* Floating toolbar */}
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="relative z-10 mb-2"
        >
          <div className="flex items-center gap-2 rounded-xl border border-violet-200 dark:border-violet-800/60 bg-gradient-to-r from-violet-50 to-emerald-50 dark:from-violet-950/40 dark:to-emerald-950/30 px-3 py-2 shadow-lg shadow-violet-100 dark:shadow-violet-950/20">
            {/* Selection counter */}
            <div className="flex items-center gap-2 mr-1">
              <motion.div
                key={selectedCount}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                <Badge
                  className="h-6 px-2 text-xs font-semibold tabular-nums bg-violet-600 text-white hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600"
                >
                  {selectedCount}
                </Badge>
              </motion.div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                已选择 {selectedCount} 条内容
              </span>
            </div>

            {/* Select All / Deselect */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[10px]"
              onClick={() => {
                if (allSelected) {
                  deselectAll();
                } else {
                  selectAll(allPostIds);
                }
              }}
              disabled={contentPosts.length === 0}
            >
              {allSelected ? (
                <>
                  <Deselect className="h-3 w-3 mr-1" />
                  取消全选
                </>
              ) : (
                <>
                  <SelectAll className="h-3 w-3 mr-1" />
                  全选
                </>
              )}
            </Button>

            <div className="w-px h-5 bg-violet-200 dark:bg-violet-700/50 mx-1" />

            {/* Batch operations — disabled when nothing selected */}
            {/* 1. Change Status */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[10px] gap-1 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 disabled:opacity-40"
                  disabled={selectedCount === 0 || isChangingStatus || isOptimizing}
                >
                  {isChangingStatus ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  修改状态
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40">
                <DropdownMenuLabel className="text-xs">修改为以下状态</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {STATUS_FLOW.map((status) => (
                  <DropdownMenuItem
                    key={status}
                    className="text-xs cursor-pointer"
                    onClick={() => handleBatchChangeStatus(status)}
                    disabled={isChangingStatus}
                  >
                    {POST_STATUS_LABELS[status]}
                  </DropdownMenuItem>
                ))}
                {commonNextStatus && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-xs cursor-pointer text-violet-600 dark:text-violet-400"
                      onClick={() => handleBatchChangeStatus(commonNextStatus)}
                      disabled={isChangingStatus}
                    >
                      <ChevronsRight className="h-3 w-3 mr-1" />
                      全部推进至「{POST_STATUS_LABELS[commonNextStatus]}」
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 2. AI Optimize */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[10px] gap-1 text-violet-700 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30 disabled:opacity-40"
              disabled={selectedCount === 0 || isOptimizing || isDeleting}
              onClick={handleBatchOptimize}
            >
              {isOptimizing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              AI优化
            </Button>

            {/* 3. Copy */}
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 px-2 text-[10px] gap-1 ${copied ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20" : "text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30"} disabled:opacity-40`}
              disabled={selectedCount === 0 || isOptimizing || isDeleting}
              onClick={handleBatchCopy}
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "已复制" : "复制"}
            </Button>

            {/* 4. Delete */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[10px] gap-1 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 disabled:opacity-40"
              disabled={selectedCount === 0 || isOptimizing || isDeleting}
              onClick={() => setShowDeleteDialog(true)}
            >
              {isDeleting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
              删除
            </Button>
          </div>

          {/* Progress bar during AI optimization */}
          <AnimatePresence>
            {isOptimizing && optimizeTotal > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 overflow-hidden"
              >
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-1">
                  <Sparkles className="h-3 w-3 text-violet-500 animate-pulse" />
                  <span>
                    正在优化第 {optimizeProgress + 1}/{optimizeTotal} 条内容...
                  </span>
                  <span className="ml-auto tabular-nums">
                    {optimizeTotal > 0
                      ? Math.round((optimizeProgress / optimizeTotal) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <Progress
                  value={optimizeTotal > 0 ? (optimizeProgress / optimizeTotal) * 100 : 0}
                  className="h-1.5 bg-violet-100 dark:bg-violet-900/40"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Status change progress */}
          <AnimatePresence>
            {isChangingStatus && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 overflow-hidden"
              >
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin text-emerald-500" />
                  <span>正在修改 {selectedCount} 条内容的状态...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量删除</AlertDialogTitle>
            <AlertDialogDescription>
              您即将删除 <strong className="text-foreground">{selectedCount}</strong>{" "}
              条内容。此操作不可撤销，所有相关数据将被永久删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleBatchDelete();
              }}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  删除中...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  确认删除 {selectedCount} 条
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
