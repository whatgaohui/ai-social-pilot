"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import {
  Tag, Trash2, Edit3, Merge, Check, X, Loader2, Search,
  ArrowUpDown, Download, Upload,
} from "lucide-react";
import { useSuccessToast, useErrorToast } from "@/hooks/use-toast-operations";

// ─── Types ──────────────────────────────────────────────────────────────────

interface TagData {
  name: string;
  count: number;
  categories: string[];
  primaryCategory: string;
}

interface TagManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTagsChanged: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function TagManager({ open, onOpenChange, onTagsChanged }: TagManagerProps) {
  const showSuccess = useSuccessToast();
  const showError = useErrorToast();

  const [tags, setTags] = useState<TagData[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "count">("count");

  // Rename state
  const [renamingTag, setRenamingTag] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Merge state
  const [merging, setMerging] = useState(false);
  const [mergeSource, setMergeSource] = useState<string[]>([]);
  const [mergeTarget, setMergeTarget] = useState("");

  // Processing
  const [processing, setProcessing] = useState(false);

  const fetchTags = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/knowledge/tags");
      if (res.ok) {
        const data = await res.json();
        setTags(data.tags || []);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchTags();
  }, [open, fetchTags]);

  // ── Filter & Sort ──
  const filteredTags = tags
    .filter((tag) => !search || tag.name.includes(search))
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name, "zh-CN");
      return b.count - a.count;
    });

  // ── Handlers ──
  const handleRename = async () => {
    if (!renamingTag || !renameValue.trim()) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/knowledge/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rename",
          oldName: renamingTag,
          newName: renameValue.trim(),
        }),
      });
      if (res.ok) {
        showSuccess("标签已重命名", { description: `${renamingTag} → ${renameValue.trim()}` });
        setRenamingTag(null);
        setRenameValue("");
        fetchTags();
        onTagsChanged();
      }
    } catch {
      showError("重命名失败");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (tagName: string) => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/knowledge/tags?name=${encodeURIComponent(tagName)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const data = await res.json();
        showSuccess("标签已删除", { description: `从 ${data.removedFrom} 条知识中移除` });
        fetchTags();
        onTagsChanged();
      }
    } catch {
      showError("删除失败");
    } finally {
      setProcessing(false);
    }
  };

  const handleMerge = async () => {
    if (mergeSource.length < 2 || !mergeTarget.trim()) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/knowledge/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "merge",
          sourceTags: mergeSource,
          targetTag: mergeTarget.trim(),
        }),
      });
      if (res.ok) {
        showSuccess("标签已合并", {
          description: `${mergeSource.join("、")} → ${mergeTarget.trim()}`,
        });
        setMerging(false);
        setMergeSource([]);
        setMergeTarget("");
        fetchTags();
        onTagsChanged();
      }
    } catch {
      showError("合并失败");
    } finally {
      setProcessing(false);
    }
  };

  const toggleMergeSource = (tagName: string) => {
    if (mergeSource.includes(tagName)) {
      setMergeSource(mergeSource.filter(t => t !== tagName));
    } else {
      setMergeSource([...mergeSource, tagName]);
    }
  };

  const handleExportConfig = () => {
    const config = tags.map(t => ({ name: t.name, count: t.count, categories: t.categories }));
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tag-config-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess("标签配置已导出");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-4.5 w-4.5" />
            标签管理
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            管理知识库中的标签：重命名、合并、删除标签
          </DialogDescription>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="搜索标签..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm pl-8"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setSortBy(sortBy === "name" ? "count" : "name")}
          >
            <ArrowUpDown className="h-3 w-3 mr-1" />
            {sortBy === "name" ? "名称" : "数量"}
          </Button>
          <Button
            variant={merging ? "secondary" : "outline"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              if (merging) {
                setMerging(false);
                setMergeSource([]);
                setMergeTarget("");
              } else {
                setMerging(true);
              }
            }}
            disabled={tags.length < 2}
          >
            <Merge className="h-3 w-3 mr-1" />
            {merging ? "取消合并" : "批量合并"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={handleExportConfig}
          >
            <Download className="h-3 w-3" />
          </Button>
        </div>

        {/* Merge bar */}
        <AnimatePresence>
          {merging && mergeSource.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-lg bg-primary/5 border border-primary/20 p-2.5 space-y-2"
            >
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-muted-foreground">已选：</span>
                {mergeSource.map((tag) => (
                  <Badge key={tag} variant="secondary" className="h-5 text-[10px] gap-0.5 pr-1">
                    {tag}
                    <button onClick={() => toggleMergeSource(tag)} className="ml-0.5 hover:text-destructive">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground shrink-0">合并为：</span>
                <Input
                  placeholder="新标签名称"
                  value={mergeTarget}
                  onChange={(e) => setMergeTarget(e.target.value)}
                  className="h-7 text-xs flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleMerge()}
                />
                <Button
                  size="sm"
                  className="h-7 text-xs px-3"
                  onClick={handleMerge}
                  disabled={mergeSource.length < 2 || !mergeTarget.trim() || processing}
                >
                  {processing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                  确认合并
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tag list */}
        <ScrollArea className="flex-1 max-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTags.length === 0 ? (
            <div className="text-center py-12 text-xs text-muted-foreground">
              <Tag className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>暂无标签</p>
            </div>
          ) : (
            <div className="space-y-1">
              <AnimatePresence>
                {filteredTags.map((tag) => (
                  <motion.div
                    key={tag.name}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    {/* Checkbox (merge mode) */}
                    {merging && (
                      <button
                        onClick={() => toggleMergeSource(tag.name)}
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          mergeSource.includes(tag.name)
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/30 hover:border-muted-foreground/60"
                        }`}
                      >
                        {mergeSource.includes(tag.name) && <Check className="h-2.5 w-2.5" />}
                      </button>
                    )}

                    {/* Tag name */}
                    {renamingTag === tag.name ? (
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <Input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          className="h-7 text-xs flex-1"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRename();
                            if (e.key === "Escape") { setRenamingTag(null); setRenameValue(""); }
                          }}
                          autoFocus
                        />
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleRename} disabled={processing}>
                          {processing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-emerald-500" />}
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => { setRenamingTag(null); setRenameValue(""); }}
                        >
                          <X className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">{tag.name}</span>
                        </div>

                        {/* Count badge */}
                        <Badge variant="secondary" className="h-5 text-[10px] shrink-0">
                          {tag.count} 条
                        </Badge>

                        {/* Category indicator */}
                        {tag.categories.length > 0 && (
                          <Badge variant="outline" className="h-5 text-[10px] shrink-0 text-muted-foreground">
                            {tag.primaryCategory}
                          </Badge>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => { setRenamingTag(tag.name); setRenameValue(tag.name); }}
                            title="重命名"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(tag.name)}
                            disabled={processing}
                            title="删除标签"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>

        {/* Footer stats */}
        <div className="flex items-center justify-between pt-2 border-t text-[11px] text-muted-foreground">
          <span>共 {tags.length} 个标签</span>
          <span>
            总计 {tags.reduce((sum, t) => sum + t.count, 0)} 次引用
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
