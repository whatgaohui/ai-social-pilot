"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import type { ContentPost } from "@/types";
import {
  Copy,
  Edit3,
  Check,
  Bold,
  Smile,
  WrapText,
  Hash,
  Eraser,
  Loader2,
  CheckCircle2,
  Clock,
  Circle,
} from "lucide-react";
import { toast } from "sonner";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { useAppStore } from "@/store/app-store";

// ─── Word Count Helpers ─────────────────────────────────────────────────────

const CHARS_PER_MIN = 400;

function getWordCountInfo(content: string, isXHS: boolean) {
  const len = content.length;
  const readingTime = len > 0 ? Math.max(1, Math.ceil(len / CHARS_PER_MIN)) : 0;

  let label: string;
  let colorClass: string;

  if (isXHS) {
    if (len < 100) {
      label = "偏短";
      colorClass = "text-red-500";
    } else if (len <= 800) {
      label = "适中";
      colorClass = "text-emerald-500";
    } else {
      label = "偏长";
      colorClass = "text-amber-500";
    }
  } else {
    // wechat
    if (len < 100) {
      label = "偏短";
      colorClass = "text-red-500";
    } else if (len <= 500) {
      label = "适中";
      colorClass = "text-emerald-500";
    } else {
      label = "偏长";
      colorClass = "text-amber-500";
    }
  }

  return { len, readingTime, label, colorClass };
}

// ─── Score Badge ────────────────────────────────────────────────────────────

function getScoreConfig(score: number) {
  if (score >= 85) return { label: "优秀", gradient: "from-emerald-500 to-teal-400", ring: "ring-emerald-500/30" };
  if (score >= 70) return { label: "良好", gradient: "from-teal-500 to-cyan-400", ring: "ring-teal-500/30" };
  if (score >= 50) return { label: "中等", gradient: "from-amber-500 to-yellow-400", ring: "ring-amber-500/30" };
  return { label: "待改进", gradient: "from-rose-500 to-pink-400", ring: "ring-rose-500/30" };
}

function ScoreBadge({
  score,
  onClick,
}: {
  score: number;
  onClick: () => void;
}) {
  const config = getScoreConfig(score);
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 25, ease: "easeOut" as const }}
      onClick={onClick}
      className={`relative flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r ${config.gradient} text-white text-[10px] font-semibold shadow-sm hover:shadow-md transition-shadow cursor-pointer ring-2 ${config.ring}`}
      title="点击查看评分详情"
    >
      <span>{score}</span>
      <span className="opacity-90">{config.label}</span>
    </motion.button>
  );
}

// ─── Emoji Picker ───────────────────────────────────────────────────────────

const QUICK_EMOJIS = ["😊", "👍", "❤️", "🔥", "✨", "💡", "🎉", "🤔", "💯", "🙌"];

// ─── Auto-save Types ────────────────────────────────────────────────────────

type SaveStatus = "saved" | "saving" | "unsaved" | "idle";

// ─── Save Status Indicator (declared outside component) ─────────────────────

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;

  return (
    <div className="flex items-center gap-1">
      <AnimatePresence mode="wait">
        {status === "saved" && (
          <motion.span
            key="saved"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 4 }}
            transition={{ duration: 0.15, ease: "easeOut" as const }}
            className="flex items-center gap-1 text-[10px] text-emerald-500"
          >
            <CheckCircle2 className="h-3 w-3" />
            已保存
          </motion.span>
        )}
        {status === "saving" && (
          <motion.span
            key="saving"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 4 }}
            transition={{ duration: 0.15, ease: "easeOut" as const }}
            className="flex items-center gap-1 text-[10px] text-muted-foreground"
          >
            <Loader2 className="h-3 w-3 animate-spin" />
            保存中...
          </motion.span>
        )}
        {status === "unsaved" && (
          <motion.span
            key="unsaved"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 4 }}
            transition={{ duration: 0.15, ease: "easeOut" as const }}
            className="flex items-center gap-1 text-[10px] text-amber-500"
          >
            <Circle className="h-2 w-2 fill-amber-500" />
            未保存
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface ContentEditorProps {
  post: ContentPost;
  isXHS: boolean;
  onScoreBadgeClick?: () => void;
}

export function ContentEditor({ post, isXHS, onScoreBadgeClick }: ContentEditorProps) {
  const updateContentPost = useAppStore((s) => s.updateContentPost);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const { copied, copy } = useCopyToClipboard();

  // Auto-save state
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedContent, setLastSavedContent] = useState(post.content);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wordInfo = useMemo(
    () => getWordCountInfo(editing ? editContent : post.content, isXHS),
    [editing, editContent, post.content, isXHS],
  );

  // Compute effective save status: avoid setState in effects
  const effectiveSaveStatus: SaveStatus = !editing
    ? "idle"
    : saveStatus === "idle"
      ? (editContent !== lastSavedContent ? "unsaved" : "idle")
      : saveStatus;

  const startEdit = () => {
    setEditContent(post.content);
    setEditing(true);
    setLastSavedContent(post.content);
    setSaveStatus("idle");
  };

  // Auto-save debounce: 2 seconds after last edit (only sets up timer, no direct setState)
  const performAutoSave = useCallback(async (content: string) => {
    if (content === lastSavedContent) return;

    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/content/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const updated = await res.json();
        updateContentPost(post.id, updated);
        setLastSavedContent(content);
        setSaveStatus("saved");
      } else {
        setSaveStatus("unsaved");
      }
    } catch {
      setSaveStatus("unsaved");
    }
  }, [post.id, updateContentPost, lastSavedContent]);

  useEffect(() => {
    if (!editing) return;
    if (editContent === lastSavedContent) return;

    // Clear previous timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Set up debounced auto-save
    saveTimerRef.current = setTimeout(() => {
      performAutoSave(editContent);
    }, 2000);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [editContent, editing, lastSavedContent, performAutoSave]);

  const saveEdit = async () => {
    // Clear any pending auto-save
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    try {
      setSaveStatus("saving");
      const res = await fetch(`/api/content/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      if (res.ok) {
        const updated = await res.json();
        updateContentPost(post.id, updated);
        setEditing(false);
        setSaveStatus("idle");
        toast.success("内容已更新");
      } else {
        setSaveStatus("unsaved");
        toast.error("更新失败");
      }
    } catch {
      setSaveStatus("unsaved");
      toast.error("更新失败");
    }
  };

  const cancelEdit = () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    setEditing(false);
    setSaveStatus("idle");
  };

  const handleCopy = () => {
    if (post.content) {
      copy(post.content);
    }
  };

  // ── Quick action handlers ────────────────────────────────────────────────

  const insertAtCursor = useCallback(
    (text: string) => {
      if (!textareaRef.current) return;
      const ta = textareaRef.current;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const before = editContent.slice(0, start);
      const selected = editContent.slice(start, end);
      const after = editContent.slice(end);
      const newContent = before + text + (selected ? selected : "") + after;
      setEditContent(newContent);

      // Restore cursor position after state update
      requestAnimationFrame(() => {
        ta.focus();
        const newPos = start + text.length + selected.length;
        ta.setSelectionRange(newPos, newPos);
      });
    },
    [editContent],
  );

  const handleBold = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = editContent.slice(0, start);
    const selected = editContent.slice(start, end) || "加粗文本";
    const after = editContent.slice(end);
    setEditContent(before + `**${selected}**` + after);
  };

  const handleEmoji = (emoji: string) => {
    insertAtCursor(emoji);
    setEmojiOpen(false);
  };

  const handleLineBreak = () => {
    insertAtCursor("\n");
  };

  const handleHashtag = () => {
    insertAtCursor("#");
  };

  const handleClear = () => {
    if (!editContent) return;
    setEditContent("");
    if (textareaRef.current) textareaRef.current.focus();
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        {editing ? (
          <div className="space-y-2">
            {/* ── Editor Header: Score Badge + Save Status ────────────── */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {post.aiScore > 0 && onScoreBadgeClick && (
                  <ScoreBadge score={post.aiScore} onClick={onScoreBadgeClick} />
                )}
              </div>
              <SaveStatusIndicator status={effectiveSaveStatus} />
            </div>

            {/* ── Textarea ──────────────────────────────────────────── */}
            <Textarea
              ref={textareaRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[150px] text-sm leading-relaxed resize-none"
              placeholder="开始编辑内容..."
            />

            {/* ── Word Count + Reading Time ─────────────────────────── */}
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span>{wordInfo.len} 字</span>
                {wordInfo.readingTime > 0 && (
                  <>
                    <span className="text-border">|</span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      约{wordInfo.readingTime}分钟
                    </span>
                  </>
                )}
              </span>
              <span className={wordInfo.len > 0 ? wordInfo.colorClass : ""}>
                {wordInfo.len > 0 ? `(${wordInfo.label})` : ""}
              </span>
            </div>

            {/* ── Quick Action Toolbar ──────────────────────────────── */}
            <div className="flex items-center gap-0.5 pt-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/80"
                    onClick={handleBold}
                  >
                    <Bold className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={4}>加粗</TooltipContent>
              </Tooltip>

              <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                <PopoverTrigger asChild>
                  <div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/80"
                        >
                          <Smile className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={4}>表情</TooltipContent>
                    </Tooltip>
                  </div>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-2"
                  side="top"
                  align="start"
                  sideOffset={8}
                >
                  <div className="grid grid-cols-5 gap-1">
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleEmoji(emoji)}
                        className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted/80 transition-colors text-base"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/80"
                    onClick={handleLineBreak}
                  >
                    <WrapText className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={4}>换行</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 w-7 p-0 transition-colors ${isXHS ? "text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30" : "text-muted-foreground hover:text-foreground hover:bg-muted/80"}`}
                    onClick={handleHashtag}
                  >
                    <Hash className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={4}>话题标签</TooltipContent>
              </Tooltip>

              <div className="flex-1" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                    onClick={handleClear}
                    disabled={!editContent}
                  >
                    <Eraser className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={4}>清空</TooltipContent>
              </Tooltip>
            </div>

            {/* ── Save / Cancel Buttons ─────────────────────────────── */}
            <div className="flex gap-2 pt-1">
              <Button onClick={saveEdit} size="sm" className="flex-1">
                <Check className="h-3.5 w-3.5 mr-1" />
                保存
              </Button>
              <Button onClick={cancelEdit} variant="outline" size="sm">
                取消
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {/* ── View Mode Header ──────────────────────────────────── */}
            <div className="flex items-center justify-between">
              {post.aiScore > 0 && onScoreBadgeClick ? (
                <ScoreBadge score={post.aiScore} onClick={onScoreBadgeClick} />
              ) : (
                <div />
              )}

              {/* Word count in view mode */}
              {post.content.length > 0 && (
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span>{post.content.length} 字</span>
                  {wordInfo.readingTime > 0 && (
                    <span className="flex items-center gap-0.5">
                      <span className="text-border">|</span>
                      <Clock className="h-2.5 w-2.5" />
                      约{wordInfo.readingTime}分钟
                    </span>
                  )}
                  <span className={wordInfo.colorClass}>({wordInfo.label})</span>
                </div>
              )}
            </div>

            {/* ── Content Display ───────────────────────────────────── */}
            <div className="relative group">
              {post.content ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
              ) : (
                <p className="text-sm text-muted-foreground/50 italic">暂无内容</p>
              )}
              <div className="absolute top-0 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="secondary"
                  size="sm"
                  className={`h-7 px-2 shadow-sm ${copied ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : ""}`}
                  onClick={handleCopy}
                  disabled={!post.content}
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-7 px-2 shadow-sm"
                  onClick={startEdit}
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
