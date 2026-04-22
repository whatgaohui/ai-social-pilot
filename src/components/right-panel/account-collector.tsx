"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Globe,
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  Link2,
  Cookie,
  Upload,
  Users,
  FileText,
  ArrowDownToLine,
  Heart,
  Share2,
  MessageSquare,
  Clock,
  AlertCircle,
  CheckCircle2,
  Inbox,
  ArrowLeft,
  Search,
  Sparkles,
  BookOpen,
  Eye,
  ClipboardList,
  Tag,
  X,
  ChevronRight,
  Bookmark,
  Repeat2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import type { TrackedAccount, Platform, ContentPost, ContentComment, ContentInteraction } from "@/types";
import { PLATFORM_LABELS } from "@/types";
import { CompetitorTrends } from "@/components/right-panel/competitor-trends";

// ─── Types ──────────────────────────────────────────────────────────────────

interface NoteItem {
  id: string;
  topic: string;
  content: string;
  scheduledDate: string;
  platform: string;
  likes: number;
  comments: number;
  shares: number;
  favorites: number;
  views: number;
  tags?: string;
  contentType: string;
}

// ─── Animation Variants ─────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" as const },
  },
};

// ─── Status Config ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; pulse?: boolean }
> = {
  idle: {
    label: "待同步",
    color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
  syncing: {
    label: "同步中",
    color:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    pulse: true,
  },
  success: {
    label: "已同步",
    color:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  error: {
    label: "同步失败",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  },
};

const COLLECT_METHODS = [
  {
    value: "link",
    label: "链接导入",
    icon: Link2,
    emoji: "\uD83D\uDD17",
    desc: "输入小红书主页链接自动采集（推荐）",
    platforms: ["xiaohongshu"],
  },
  {
    value: "manual",
    label: "手动导入",
    icon: ClipboardList,
    emoji: "\uD83D\uDCCB",
    desc: "粘贴朋友圈/小红书内容（适合微信）",
    platforms: ["wechat", "xiaohongshu"],
  },
  {
    value: "cookie",
    label: "Cookie采集",
    icon: Cookie,
    emoji: "\uD83D\uDD11",
    desc: "提供登录Cookie深度采集（最全量）",
    platforms: ["xiaohongshu"],
  },
] as const;

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + "w";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return "刚刚";
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}天前`;
  return date.toLocaleDateString("zh-CN");
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface AccountCollectorProps {
  selectedPost?: { id: string; topic: string; platform: string } | null;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function AccountCollector({ selectedPost }: AccountCollectorProps) {
  // ── Account list state ─────────────────────────────────────────────────
  const [accounts, setAccounts] = useState<TrackedAccount[]>([]);
  const [loading, setLoading] = useState(false);

  // ── Notes view state ──────────────────────────────────────────────────
  const [viewingAccountId, setViewingAccountId] = useState<string | null>(null);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesSearch, setNotesSearch] = useState("");
  const [notesAccount, setNotesAccount] = useState<{
    nickname: string;
    platform: string;
  } | null>(null);
  const [notesPagination, setNotesPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 1,
  });

  // ── Add dialog state ──────────────────────────────────────────────────
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formPlatform, setFormPlatform] = useState<Platform>("xiaohongshu");
  const [formMethod, setFormMethod] = useState("link");
  const [formUrl, setFormUrl] = useState("");
  const [formCookie, setFormCookie] = useState("");
  const [formSourceLabel, setFormSourceLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Manual import dialog state ────────────────────────────────────────
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [manualContent, setManualContent] = useState("");
  const [manualPlatform, setManualPlatform] = useState<Platform>("wechat");
  const [manualSourceLabel, setManualSourceLabel] = useState("");
  const [isParsing, setIsParsing] = useState(false);

  // ── Sync / progress state ─────────────────────────────────────────────
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<{
    taskId: string;
    accountId: string;
    status: string;
    progress: number;
    message: string;
  } | null>(null);
  const [importProgress, setImportProgress] = useState<{
    imported: number;
    total: number;
    message: string;
  } | null>(null);

  // ── Comments & interactions for selected post ──────────────────────────
  const [comments, setComments] = useState<ContentComment[]>([]);
  const [interactions, setInteractions] = useState<ContentInteraction[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isLoadingInteractions, setIsLoadingInteractions] = useState(false);
  const [showPostDetail, setShowPostDetail] = useState(false);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Fetch accounts ────────────────────────────────────────────────────
  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tracked-accounts");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAccounts(data);
    } catch {
      toast.error("获取追踪账号失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // ── Fetch comments / interactions when selectedPost changes ─────────────
  useEffect(() => {
    if (!selectedPost?.id) {
      setComments([]);
      setInteractions([]);
      setShowPostDetail(false);
      return;
    }

    // Auto-expand when a new post is selected
    setShowPostDetail(true);

    const fetchComments = async () => {
      setIsLoadingComments(true);
      try {
        const res = await fetch(`/api/content/${selectedPost.id}/comments`);
        if (res.ok) setComments(await res.json());
      } catch {
        /* ignore */
      } finally {
        setIsLoadingComments(false);
      }
    };

    const fetchInteractions = async () => {
      setIsLoadingInteractions(true);
      try {
        const res = await fetch(`/api/content/${selectedPost.id}/interactions`);
        if (res.ok) setInteractions(await res.json());
      } catch {
        /* ignore */
      } finally {
        setIsLoadingInteractions(false);
      }
    };

    fetchComments();
    fetchInteractions();
  }, [selectedPost]);

  // ── Interactions summary ────────────────────────────────────────────────
  const shareCount = interactions.filter((i) => i.interactionType === "share").length;
  const forwardCount = interactions.filter((i) => i.interactionType === "forward").length;
  const collectCount = interactions.filter((i) => i.interactionType === "collect").length;

  // ── Poll syncing accounts ─────────────────────────────────────────────
  useEffect(() => {
    const syncingAccounts = accounts.filter((a) => a.status === "syncing");
    if (syncingAccounts.length === 0) {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    pollTimerRef.current = setInterval(async () => {
      await fetchAccounts();
      // Check if all done syncing
      const stillSyncing = accounts.filter((a) => a.status === "syncing");
      if (stillSyncing.length === 0 && pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    }, 3000);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [accounts, fetchAccounts]);

  // ── Add account handler ───────────────────────────────────────────────
  const handleAddAccount = async () => {
    if (formMethod === "link" && !formUrl.trim()) {
      toast.error("请填写主页链接");
      return;
    }
    if (formMethod === "cookie" && !formCookie.trim()) {
      toast.error("请填写Cookie信息");
      return;
    }

    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        platform: formPlatform,
        collectMethod: formMethod,
        isOwn: false,
      };

      if (formMethod === "link") {
        body.homeUrl = formUrl.trim();
      }
      if (formMethod === "cookie") {
        body.homeUrl = formUrl.trim() || "";
        body.cookie = formCookie.trim();
      }

      const res = await fetch("/api/tracked-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "添加失败");
      }

      const account = await res.json();

      toast.success(
        formMethod === "link"
          ? "账号添加成功，正在采集信息..."
          : "账号添加成功"
      );
      setShowAddDialog(false);
      setFormUrl("");
      setFormCookie("");
      setFormMethod("link");
      fetchAccounts();

      // Show progress for link method
      if (formMethod === "link") {
        setSyncProgress({
          taskId: "",
          accountId: account.id,
          status: "syncing",
          progress: 30,
          message: "正在采集账号信息...",
        });
        // Simulate progress
        setTimeout(() => {
          setSyncProgress((prev) =>
            prev
              ? { ...prev, progress: 60, message: "已获取账号基本信息..." }
              : null
          );
        }, 3000);
        // Clear after accounts refresh picks up the status
        setTimeout(() => {
          setSyncProgress(null);
          fetchAccounts();
        }, 8000);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "添加账号失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete account handler ────────────────────────────────────────────
  const handleDeleteAccount = async (id: string) => {
    try {
      const res = await fetch(`/api/tracked-accounts/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("账号已删除");
      if (viewingAccountId === id) {
        setViewingAccountId(null);
      }
      fetchAccounts();
    } catch {
      toast.error("删除失败");
    }
  };

  // ── Sync account handler ──────────────────────────────────────────────
  const handleSync = async (id: string) => {
    const account = accounts.find((a) => a.id === id);
    if (!account || account.status === "syncing") return;

    setSyncingId(id);
    setSyncProgress({
      taskId: "",
      accountId: id,
      status: "syncing",
      progress: 10,
      message: "正在准备同步...",
    });

    try {
      const res = await fetch(`/api/tracked-accounts/${id}/sync`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "同步失败");
      }

      // Start simulated progress
      const steps = [
        { p: 25, m: "正在采集账号信息..." },
        { p: 50, m: "已获取12条笔记..." },
        { p: 75, m: "正在导入到数据库..." },
        { p: 95, m: "即将完成..." },
      ];

      for (let i = 0; i < steps.length; i++) {
        await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));
        setSyncProgress((prev) =>
          prev
            ? { ...prev, progress: steps[i].p, message: steps[i].m }
            : null
        );
      }

      // Final refresh
      await fetchAccounts();

      const refreshed = accounts.find((a) => a.id === id);
      const totalImported =
        data.totalImported || refreshed?.totalCollected || 0;

      setSyncProgress({
        taskId: "",
        accountId: id,
        status: "success",
        progress: 100,
        message: `完成！成功导入 ${totalImported} 条内容`,
      });

      toast.success(`同步完成，成功导入 ${totalImported} 条内容`);
    } catch (err) {
      setSyncProgress((prev) =>
        prev
          ? {
              ...prev,
              status: "error",
              message:
                err instanceof Error ? err.message : "同步失败",
            }
          : null
      );
      toast.error(
        err instanceof Error ? err.message : "同步失败"
      );
    } finally {
      setSyncingId(null);
    }
  };

  // ── View notes handler ────────────────────────────────────────────────
  const handleViewNotes = async (accountId: string) => {
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return;

    setViewingAccountId(accountId);
    setNotesLoading(true);
    setNotesSearch("");
    setNotesPagination({ page: 1, total: 0, totalPages: 1 });
    setNotesAccount({
      nickname: account.nickname,
      platform: account.platform,
    });

    try {
      const res = await fetch(
        `/api/tracked-accounts/${accountId}/notes?limit=50`
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setNotes(
        data.posts.map((p: ContentPost) => ({
          id: p.id,
          topic: p.topic || "",
          content: p.content || "",
          scheduledDate: p.scheduledDate || "",
          platform: p.platform || "",
          likes: p.likes || 0,
          comments: p.comments || 0,
          shares: p.shares || 0,
          favorites: p.favorites || 0,
          views: p.views || 0,
          tags: p.content?.match(/#[^\s#]+/g)?.join(" ") || "",
          contentType: p.contentType || "text",
        }))
      );
      setNotesPagination(data.pagination || { page: 1, total: 0, totalPages: 1 });
    } catch {
      toast.error("获取笔记失败");
    } finally {
      setNotesLoading(false);
    }
  };

  // ── Manual import handler ─────────────────────────────────────────────
  const handleManualImport = async () => {
    if (!manualContent.trim()) {
      toast.error("请粘贴要导入的内容");
      return;
    }
    if (!manualSourceLabel.trim()) {
      toast.error("请填写来源标签");
      return;
    }

    setIsParsing(true);
    setImportProgress({
      imported: 0,
      total: 0,
      message: "正在解析内容...",
    });

    try {
      // Call AI parse endpoint
      const res = await fetch("/api/scrape/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: manualPlatform,
          sourceLabel: manualSourceLabel.trim(),
          posts: parsePastedContent(manualContent, manualPlatform),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "导入失败");
      }

      setImportProgress({
        imported: 0,
        total: 10,
        message: "正在导入到数据库...",
      });

      // Simulate progress
      await new Promise((r) => setTimeout(r, 1000));
      setImportProgress({
        imported: 5,
        total: 10,
        message: "已导入5条...",
      });
      await new Promise((r) => setTimeout(r, 1000));

      const data = await res.json();

      setImportProgress({
        imported: data.imported || 0,
        total: (data.imported || 0) + (data.skipped || 0),
        message: data.message || `完成！成功导入 ${data.imported || 0} 条`,
      });

      toast.success(
        data.message || `成功导入 ${data.imported || 0} 条内容`
      );

      fetchAccounts();

      // Navigate to notes view for the imported account
      if (data.accountId) {
        setTimeout(() => {
          handleViewNotes(data.accountId);
        }, 1500);
      }
    } catch (err) {
      setImportProgress(null);
      toast.error(
        err instanceof Error ? err.message : "导入失败"
      );
    } finally {
      setIsParsing(false);
    }
  };

  // ── Parse pasted content into structured posts ────────────────────────
  const parsePastedContent = (
    raw: string,
    platform: string
  ): Array<{
    topic: string;
    content: string;
    scheduledDate: string;
    contentType: string;
    likes: number;
    comments: number;
    shares: number;
  }> => {
    // Split by double newlines to separate individual posts
    const blocks = raw
      .split(/\n\s*\n/)
      .map((b) => b.trim())
      .filter((b) => b.length > 0);

    return blocks.map((block) => {
      const lines = block.split("\n");
      let topic = "";
      const contentLines: string[] = [];
      let scheduledDate = "";
      let likes = 0;
      let comments = 0;
      let shares = 0;

      for (const line of lines) {
        const trimmed = line.trim();
        // Extract title from 【...】
        const titleMatch = trimmed.match(/^(?:【(.+?)】|#+\s*(.+?))$/);
        if (titleMatch && !topic) {
          topic = titleMatch[1] || titleMatch[2] || "";
          continue;
        }
        // Extract date
        const dateMatch = trimmed.match(
          /(?:发布时间|日期)[:：]\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/
        );
        if (dateMatch) {
          scheduledDate = dateMatch[1].replace(/\//g, "-");
          continue;
        }
        // Extract stats
        const likesMatch = trimmed.match(
          /(?:点赞|赞)[:：]\s*(\d+)/
        );
        if (likesMatch) {
          likes = parseInt(likesMatch[1], 10);
        }
        const commentsMatch = trimmed.match(
          /(?:评论)[：:]\s*(\d+)/
        );
        if (commentsMatch) {
          comments = parseInt(commentsMatch[1], 10);
        }
        const sharesMatch = trimmed.match(
          /(?:分享|转发)[：:]\s*(\d+)/
        );
        if (sharesMatch) {
          shares = parseInt(sharesMatch[1], 10);
        }
        // Skip stats lines from content
        if (/^(?:点赞|评论|分享|转发|收藏|发布时间|日期)[：:]/.test(trimmed)) {
          continue;
        }
        if (trimmed) {
          contentLines.push(trimmed);
        }
      }

      return {
        topic: topic || contentLines[0]?.slice(0, 30) || "",
        content: contentLines.join("\n"),
        scheduledDate:
          scheduledDate || new Date().toISOString().slice(0, 10),
        contentType: platform === "xiaohongshu" ? "mixed" : "text",
        likes,
        comments,
        shares,
      };
    });
  };

  // ── Filtered notes ────────────────────────────────────────────────────
  const filteredNotes = notesSearch
    ? notes.filter(
        (n) =>
          n.topic.toLowerCase().includes(notesSearch.toLowerCase()) ||
          n.content.toLowerCase().includes(notesSearch.toLowerCase())
      )
    : notes;

  // ── Available methods for selected platform ───────────────────────────
  const availableMethods = COLLECT_METHODS.filter((m) =>
    (m.platforms as readonly string[]).includes(formPlatform)
  );

  // ── Trends view state ─────────────────────────────────────────────
  const [showTrends, setShowTrends] = useState(false);

  // ── Render: Trends View ───────────────────────────────────────────────
  if (showTrends && viewingAccountId) {
    return (
      <CompetitorTrends
        accountId={viewingAccountId}
        accountName={notesAccount?.nickname}
        onClose={() => setShowTrends(false)}
      />
    );
  }

  // ── Render: Notes View ────────────────────────────────────────────────
  if (viewingAccountId) {
    return (
      <ScrollArea className="h-full">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="p-4 space-y-3"
        >
          {/* Back button + header */}
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewingAccountId(null)}
              className="h-7 px-2 text-xs gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              返回
            </Button>
          </motion.div>

          <motion.div variants={itemVariants}>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold truncate">
                  {notesAccount?.nickname || "采集笔记"}
                </h2>
                <p className="text-[10px] text-muted-foreground">
                  共 {notesPagination.total} 条笔记
                </p>
              </div>
            </div>
          </motion.div>

          {/* Search + Trends button */}
          <motion.div variants={itemVariants} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="搜索笔记..."
                value={notesSearch}
                onChange={(e) => setNotesSearch(e.target.value)}
                className="h-8 text-xs pl-8"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowTrends(true)}
              className="h-8 px-2 text-[10px] gap-1 border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 shrink-0"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              趋势
            </Button>
          </motion.div>

          {/* Notes loading */}
          {notesLoading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          )}

          {/* Notes list */}
          {!notesLoading && filteredNotes.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center py-12 text-center"
            >
              <Inbox className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">
                {notesSearch ? "没有找到匹配的笔记" : "暂无采集笔记"}
              </p>
            </motion.div>
          )}

          {!notesLoading && filteredNotes.length > 0 && (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-2.5"
            >
              {filteredNotes.map((note) => {
                const isWeChat = note.platform === "wechat";
                return (
                  <motion.div key={note.id} variants={itemVariants}>
                    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                      <div
                        className={`h-0.5 ${
                          isWeChat
                            ? "bg-gradient-to-r from-green-400 to-emerald-500"
                            : "bg-gradient-to-r from-red-400 to-rose-500"
                        }`}
                      />
                      <CardContent className="p-3.5">
                        {/* Date + platform badge */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] text-muted-foreground">
                            {note.scheduledDate}
                          </span>
                          <Badge
                            className={`text-[9px] px-1.5 py-0 border-0 font-medium ${
                              isWeChat
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                            }`}
                          >
                            {PLATFORM_LABELS[note.platform as Platform] ||
                              note.platform}
                          </Badge>
                        </div>

                        {/* Topic */}
                        {note.topic && (
                          <p className="text-xs font-semibold mb-1.5 line-clamp-1">
                            {note.topic}
                          </p>
                        )}

                        {/* Content preview */}
                        <p className="text-[11px] text-muted-foreground leading-relaxed mb-2.5 line-clamp-3">
                          {note.content}
                        </p>

                        {/* Engagement stats */}
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-0.5">
                            <Heart className="h-3 w-3 text-rose-400" />
                            {formatNum(note.likes)}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <MessageSquare className="h-3 w-3 text-amber-400" />
                            {formatNum(note.comments)}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Share2 className="h-3 w-3 text-emerald-400" />
                            {formatNum(note.shares)}
                          </span>
                          {note.favorites > 0 && (
                            <span className="flex items-center gap-0.5">
                              <Eye className="h-3 w-3 text-violet-400" />
                              {formatNum(note.favorites)}
                            </span>
                          )}
                        </div>

                        {/* Tags */}
                        {note.tags && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {note.tags
                              .split(" ")
                              .filter(Boolean)
                              .slice(0, 3)
                              .map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400"
                                >
                                  {tag}
                                </span>
                              ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </motion.div>
      </ScrollArea>
    );
  }

  // ── Render: Account List (default view) ───────────────────────────────
  return (
    <ScrollArea className="h-full">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="p-4 space-y-4"
      >
        {/* ── Header ────────────────────────────────────────────────────── */}
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
              <Globe className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold">采集中心</h2>
              <p className="text-[10px] text-muted-foreground">
                追踪并采集竞品/灵感内容
              </p>
            </div>
          </div>
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button
              size="sm"
              onClick={() => setShowAddDialog(true)}
              className="h-7 text-xs gap-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-sm hover:from-violet-600 hover:to-purple-700"
            >
              <Plus className="h-3 w-3" />
              添加账号
            </Button>
          </motion.div>
        </motion.div>

        {/* ── Loading State ─────────────────────────────────────────────── */}
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        )}

        {/* ── Empty State ───────────────────────────────────────────────── */}
        {!loading && accounts.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center py-8 text-center"
          >
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg">
              <ArrowDownToLine className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-base font-semibold mb-1">
              还没有追踪任何账号
            </h3>
            <p className="text-xs text-muted-foreground max-w-[260px] mb-5">
              添加你需要追踪的朋友圈或小红书账号，AI将帮你采集和整理内容用于创作灵感
            </p>

            {/* Feature cards */}
            <div className="w-full space-y-2.5 mb-5">
              {COLLECT_METHODS.map((method, idx) => {
                const Icon = method.icon;
                const gradients = [
                  "from-emerald-500 to-teal-600",
                  "from-amber-500 to-orange-600",
                  "from-violet-500 to-purple-600",
                ];
                return (
                  <motion.div
                    key={method.value}
                    initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + idx * 0.08 }}
                  >
                    <Card className="border-0 shadow-sm overflow-hidden">
                      <div
                        className={`absolute left-0 top-0 w-1 h-full bg-gradient-to-b ${gradients[idx]} rounded-l-lg`}
                      />
                      <CardContent className="p-3 pl-4">
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`h-8 w-8 rounded-lg bg-gradient-to-br ${gradients[idx]} flex items-center justify-center shrink-0`}
                          >
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                          <div className="text-left">
                            <p className="text-xs font-semibold">
                              {method.emoji} {method.label}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {method.desc}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                onClick={() => setShowAddDialog(true)}
                className="bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-sm hover:from-violet-600 hover:to-purple-700"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                添加第一个账号
              </Button>
            </motion.div>
          </motion.div>
        )}

        {/* ── Account Cards ─────────────────────────────────────────────── */}
        {!loading && accounts.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            <AnimatePresence>
              {accounts.map((account) => {
                const isWeChat = account.platform === "wechat";
                const statusConf =
                  STATUS_CONFIG[account.status] || STATUS_CONFIG.idle;
                const isSyncing = syncingId === account.id;

                return (
                  <motion.div
                    key={account.id}
                    variants={itemVariants}
                    layout
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    whileHover={{ scale: 1.005 }}
                    className="transition-shadow"
                  >
                    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                      {/* Top accent line */}
                      <div
                        className={`h-0.5 ${
                          isWeChat
                            ? "bg-gradient-to-r from-green-400 to-emerald-500"
                            : "bg-gradient-to-r from-red-400 to-rose-500"
                        }`}
                      />
                      <CardContent className="p-3.5">
                        {/* Top row: avatar + info */}
                        <div className="flex items-start gap-2.5 mb-3">
                          {/* Avatar */}
                          {account.avatarUrl ? (
                            <img
                              src={account.avatarUrl}
                              alt={account.nickname}
                              className="h-10 w-10 rounded-full object-cover shrink-0 shadow-sm ring-2 ring-background"
                            />
                          ) : (
                            <div
                              className={`h-10 w-10 rounded-full bg-gradient-to-br ${
                                isWeChat
                                  ? "from-green-400 to-emerald-500"
                                  : "from-red-400 to-rose-500"
                              } flex items-center justify-center shrink-0 text-white text-sm font-bold shadow-sm`}
                            >
                              {(account.nickname || "U")
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-semibold truncate max-w-[120px]">
                                {account.nickname || "未命名账号"}
                              </span>
                              {/* Platform badge */}
                              <Badge
                                className={`text-[9px] px-1.5 py-0 border-0 font-medium ${
                                  isWeChat
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                    : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                                }`}
                              >
                                {PLATFORM_LABELS[
                                  account.platform as Platform
                                ] || account.platform}
                              </Badge>
                              {/* Status badge */}
                              <Badge
                                className={`text-[9px] px-1.5 py-0 border-0 ${statusConf.color}`}
                              >
                                {statusConf.pulse && (
                                  <span className="relative flex h-1.5 w-1.5 mr-1">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
                                  </span>
                                )}
                                {statusConf.label}
                              </Badge>
                              {account.isOwn && (
                                <Badge className="text-[9px] px-1.5 py-0 border-0 bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                                  自己
                                </Badge>
                              )}
                            </div>
                            {/* Bio or URL */}
                            {(account.bio || account.homeUrl) && (
                              <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                {account.bio ||
                                  (account.homeUrl
                                    ? account.homeUrl.length > 50
                                      ? account.homeUrl.slice(0, 50) + "..."
                                      : account.homeUrl
                                    : "")}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Stats row */}
                        <div className="grid grid-cols-4 gap-2 mb-3">
                          {[
                            {
                              label: "粉丝",
                              value: account.followers,
                              icon: Users,
                            },
                            {
                              label: "发布",
                              value: account.postsCount,
                              icon: FileText,
                            },
                            {
                              label: "已采集",
                              value: account.totalCollected,
                              icon: ArrowDownToLine,
                            },
                            {
                              label: "上次同步",
                              value: account.lastSyncAt
                                ? timeAgo(String(account.lastSyncAt))
                                : "—",
                              icon: Clock,
                              isText: true,
                            },
                          ].map((stat) => {
                            const Icon = stat.icon;
                            return (
                              <div key={stat.label} className="text-center">
                                <div className="flex items-center justify-center gap-0.5 mb-0.5">
                                  <Icon className="h-3 w-3 text-muted-foreground" />
                                </div>
                                <div className="text-xs font-semibold tabular-nums">
                                  {stat.isText ? (
                                    <span className="text-[10px]">
                                      {stat.value}
                                    </span>
                                  ) : (
                                    formatNum(Number(stat.value))
                                  )}
                                </div>
                                <p className="text-[9px] text-muted-foreground">
                                  {stat.label}
                                </p>
                              </div>
                            );
                          })}
                        </div>

                        {/* Error banner */}
                        {account.status === "error" && account.lastError && (
                          <div className="mb-3 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 flex items-center gap-2">
                            <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                            <span className="text-[10px] text-red-600 dark:text-red-400 truncate">
                              {account.lastError.length > 60
                                ? account.lastError.slice(0, 60) + "..."
                                : account.lastError}
                            </span>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          <motion.div
                            whileTap={{ scale: 0.95 }}
                            className="flex-1"
                          >
                            <Button
                              onClick={() => handleSync(account.id)}
                              disabled={isSyncing || account.status === "syncing"}
                              size="sm"
                              className={`w-full h-7 text-[11px] gap-1.5 shadow-sm ${
                                isSyncing || account.status === "syncing"
                                  ? "bg-muted text-muted-foreground"
                                  : "bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700"
                              }`}
                            >
                              {isSyncing || account.status === "syncing" ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  同步中...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="h-3 w-3" />
                                  立即同步
                                </>
                              )}
                            </Button>
                          </motion.div>

                          <motion.div whileTap={{ scale: 0.95 }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewNotes(account.id)}
                              className="h-7 text-[11px] text-muted-foreground hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 gap-1"
                            >
                              <BookOpen className="h-3 w-3" />
                              查看笔记
                            </Button>
                          </motion.div>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <motion.div whileTap={{ scale: 0.95 }}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-[11px] text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 gap-1"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </motion.div>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>确认删除</AlertDialogTitle>
                                <AlertDialogDescription>
                                  确定要删除账号
                                  「{account.nickname || "未命名账号"}」吗？已采集的内容将保留。
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>取消</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleDeleteAccount(account.id)
                                  }
                                  className="bg-red-500 hover:bg-red-600 text-white"
                                >
                                  删除
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── Add Account Card (shown when accounts exist) ─────────────── */}
        {!loading && accounts.length > 0 && (
          <motion.div variants={itemVariants}>
            <motion.div whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.01 }}>
              <Card
                className="border-0 border-dashed border-2 border-muted-foreground/20 bg-muted/20 cursor-pointer hover:bg-muted/40 hover:border-muted-foreground/30 transition-all duration-200"
                onClick={() => setShowAddDialog(true)}
              >
                <CardContent className="p-4 flex flex-col items-center justify-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-muted/60 flex items-center justify-center">
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">
                    添加更多账号
                  </span>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}

        {/* ── Selected Post: Comments & Interactions ──────────────────────── */}
        {selectedPost?.id && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-4"
            >
              {/* Collapsible header */}
              <motion.div variants={itemVariants}>
                <Card className="border-0 shadow-sm overflow-hidden">
                  <div className="h-0.5 bg-gradient-to-r from-amber-400 to-orange-500" />
                  <CardContent className="p-3.5">
                    <button
                      onClick={() => setShowPostDetail(!showPostDetail)}
                      className="w-full flex items-center gap-2 text-left"
                    >
                      <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0">
                        <MessageSquare className="h-3.5 w-3.5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{selectedPost.topic}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {PLATFORM_LABELS[selectedPost.platform as Platform] || selectedPost.platform} · 互动详情
                        </p>
                      </div>
                      <motion.div
                        animate={{ rotate: showPostDetail ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </motion.div>
                    </button>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Expanded detail */}
              <AnimatePresence>
                {showPostDetail && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-3 overflow-hidden"
                  >
                    {/* Interactions Summary */}
                    <motion.div variants={itemVariants}>
                      <Card className="border-0 shadow-sm">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-1.5 mb-2.5">
                            <Share2 className="h-3.5 w-3.5 text-teal-500" />
                            <span className="text-xs font-semibold">互动概览</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { label: "分享", count: shareCount, icon: Share2, gradient: "from-teal-500 to-emerald-600", bg: "bg-teal-50 dark:bg-teal-900/20" },
                              { label: "转发", count: forwardCount, icon: Repeat2, gradient: "from-violet-500 to-purple-600", bg: "bg-violet-50 dark:bg-violet-900/20" },
                              { label: "收藏", count: collectCount, icon: Bookmark, gradient: "from-amber-500 to-orange-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
                            ].map((item) => {
                              const Icon = item.icon;
                              return (
                                <div key={item.label} className={`rounded-lg ${item.bg} p-2.5 text-center`}>
                                  <div className={`h-5 w-5 rounded-md bg-gradient-to-br ${item.gradient} flex items-center justify-center mx-auto mb-1`}>
                                    <Icon className="h-2.5 w-2.5 text-white" />
                                  </div>
                                  <div className="text-sm font-bold">{item.count}</div>
                                  <p className="text-[9px] text-muted-foreground">{item.label}</p>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>

                    {/* Comments section */}
                    <motion.div variants={itemVariants}>
                      <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-2 px-3.5 pt-3.5">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                              <Heart className="h-3.5 w-3.5 text-rose-500" />
                              评论 ({comments.length})
                            </CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="px-3.5 pb-3.5">
                          {isLoadingComments ? (
                            <div className="space-y-2.5">
                              {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="flex items-start gap-2">
                                  <Skeleton className="h-6 w-6 rounded-full shrink-0" />
                                  <div className="flex-1 space-y-1">
                                    <Skeleton className="h-3 w-16" />
                                    <Skeleton className="h-3 w-full" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : comments.length === 0 ? (
                            <div className="flex flex-col items-center py-6 text-center">
                              <Inbox className="h-6 w-6 text-muted-foreground/40 mb-2" />
                              <p className="text-[10px] text-muted-foreground">暂无评论数据</p>
                            </div>
                          ) : (
                            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                              {comments.map((comment) => (
                                <motion.div
                                  key={comment.id}
                                  initial={{ opacity: 0, x: -8 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className="flex items-start gap-2 group"
                                >
                                  {/* Author avatar */}
                                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shrink-0 text-white text-[8px] font-bold">
                                    {(comment.authorName || "U").charAt(0)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <span className="text-[10px] font-semibold">{comment.authorName || "匿名"}</span>
                                      {comment.replyToName && (
                                        <span className="text-[9px] text-muted-foreground">
                                          回复 <span className="text-violet-500">@{comment.replyToName}</span>
                                        </span>
                                      )}
                                      <span className="text-[9px] text-muted-foreground ml-auto shrink-0">
                                        {comment.publishedAt ? timeAgo(comment.publishedAt) : ""}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-foreground/80 leading-relaxed">{comment.content}</p>
                                    {comment.likes > 0 && (
                                      <span className="text-[9px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                                        <Heart className="h-2.5 w-2.5" />
                                        {comment.likes}
                                      </span>
                                    )}
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>

                    {/* Interactions list */}
                    <motion.div variants={itemVariants}>
                      <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-2 px-3.5 pt-3.5">
                          <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                            <Repeat2 className="h-3.5 w-3.5 text-violet-500" />
                            互动记录 ({interactions.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-3.5 pb-3.5">
                          {isLoadingInteractions ? (
                            <div className="space-y-2">
                              {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-8 rounded-lg" />
                              ))}
                            </div>
                          ) : interactions.length === 0 ? (
                            <div className="flex flex-col items-center py-6 text-center">
                              <Inbox className="h-6 w-6 text-muted-foreground/40 mb-2" />
                              <p className="text-[10px] text-muted-foreground">暂无互动数据</p>
                            </div>
                          ) : (
                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                              {interactions.map((interaction) => {
                                const typeIcon =
                                  interaction.interactionType === "share"
                                    ? Share2
                                    : interaction.interactionType === "forward"
                                      ? Repeat2
                                      : Bookmark;
                                const typeColor =
                                  interaction.interactionType === "share"
                                    ? "text-teal-500"
                                    : interaction.interactionType === "forward"
                                      ? "text-violet-500"
                                      : "text-amber-500";
                                const typeLabel =
                                  interaction.interactionType === "share"
                                    ? "分享"
                                    : interaction.interactionType === "forward"
                                      ? "转发"
                                      : "收藏";
                                const Icon = typeIcon;

                                return (
                                  <motion.div
                                    key={interaction.id}
                                    initial={{ opacity: 0, x: -6 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center gap-2 p-1.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                                  >
                                    <Icon className={`h-3.5 w-3.5 ${typeColor} shrink-0`} />
                                    <div className="flex-1 min-w-0">
                                      <span className="text-[10px] font-medium">{interaction.authorName || "匿名"}</span>
                                      <span className="text-[10px] text-muted-foreground ml-1">
                                        {interaction.content || typeLabel}
                                      </span>
                                    </div>
                                    <span className="text-[9px] text-muted-foreground shrink-0">
                                      {interaction.publishedAt ? timeAgo(interaction.publishedAt) : ""}
                                    </span>
                                  </motion.div>
                                );
                              })}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        )}

        {/* ── Sync Progress Overlay ─────────────────────────────────────── */}
        <AnimatePresence>
          {syncProgress && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <Card className="w-full max-w-sm">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {syncProgress.status === "success" ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : syncProgress.status === "error" ? (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        ) : (
                          <Loader2 className="h-5 w-5 text-violet-500 animate-spin" />
                        )}
                        <span className="text-sm font-semibold">
                          {syncProgress.status === "success"
                            ? "同步完成"
                            : syncProgress.status === "error"
                              ? "同步失败"
                              : "正在同步..."}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSyncProgress(null)}
                        className="h-7 w-7 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <Progress
                      value={syncProgress.progress}
                      className={`h-2 ${
                        syncProgress.status === "success"
                          ? "[&>div]:bg-emerald-500"
                          : syncProgress.status === "error"
                            ? "[&>div]:bg-red-500"
                            : "[&>div]:bg-violet-500"
                      }`}
                    />

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {syncProgress.message}
                      </span>
                      <span className="font-semibold tabular-nums">
                        {syncProgress.progress}%
                      </span>
                    </div>

                    {syncProgress.status !== "syncing" && (
                      <Button
                        onClick={() => setSyncProgress(null)}
                        className="w-full"
                        variant={
                          syncProgress.status === "error"
                            ? "destructive"
                            : "default"
                        }
                        size="sm"
                      >
                        {syncProgress.status === "error"
                          ? "关闭"
                          : "查看笔记"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Import Progress Overlay ───────────────────────────────────── */}
        <AnimatePresence>
          {importProgress && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <Card className="w-full max-w-sm">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {importProgress.message.startsWith("完成") ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />
                        )}
                        <span className="text-sm font-semibold">
                          {importProgress.message.startsWith("完成")
                            ? "导入完成"
                            : "正在导入..."}
                        </span>
                      </div>
                      {!isParsing && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setImportProgress(null)}
                          className="h-7 w-7 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <Progress
                      value={
                        importProgress.total > 0
                          ? (importProgress.imported /
                              importProgress.total) *
                            100
                          : 0
                      }
                      className={`h-2 ${
                        importProgress.message.startsWith("完成")
                          ? "[&>div]:bg-emerald-500"
                          : "[&>div]:bg-amber-500"
                      }`}
                    />

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {importProgress.message}
                      </span>
                      <span className="font-semibold tabular-nums">
                        {importProgress.imported}/{importProgress.total}
                      </span>
                    </div>

                    {!isParsing && (
                      <Button
                        onClick={() => setImportProgress(null)}
                        className="w-full"
                        size="sm"
                      >
                        关闭
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Add Account Dialog ────────────────────────────────────────── */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Plus className="h-3.5 w-3.5 text-white" />
                </div>
                添加追踪账号
              </DialogTitle>
              <DialogDescription>
                选择平台和采集方式，开始追踪竞品或灵感账号
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {/* Platform selection */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">平台</Label>
                <RadioGroup
                  value={formPlatform}
                  onValueChange={(v) => {
                    setFormPlatform(v as Platform);
                    // Reset method if not available for new platform
                    const methods = COLLECT_METHODS.filter((m) =>
                      (m.platforms as readonly string[]).includes(v)
                    );
                    if (!methods.find((m) => m.value === formMethod)) {
                      setFormMethod(methods[0].value);
                    }
                  }}
                  className="grid grid-cols-2 gap-2"
                >
                  {(["wechat", "xiaohongshu"] as Platform[]).map((p) => {
                    const isWeChat = p === "wechat";
                    const isSelected = formPlatform === p;
                    return (
                      <Label
                        key={p}
                        htmlFor={`platform-${p}`}
                        className={`flex items-center gap-2.5 rounded-xl border-2 p-3 cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? isWeChat
                              ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-600"
                              : "border-rose-400 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-600"
                            : "border-muted hover:border-muted-foreground/30"
                        }`}
                      >
                        <RadioGroupItem
                          value={p}
                          id={`platform-${p}`}
                          className="sr-only"
                        />
                        <div
                          className={`h-8 w-8 rounded-full bg-gradient-to-br ${
                            isWeChat
                              ? "from-green-400 to-emerald-500"
                              : "from-red-400 to-rose-500"
                          } flex items-center justify-center shrink-0`}
                        >
                          <span className="text-white text-xs font-bold">
                            {isWeChat ? "微" : "小"}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-semibold">
                            {PLATFORM_LABELS[p]}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {isWeChat ? "朋友圈内容" : "小红书笔记"}
                          </p>
                        </div>
                      </Label>
                    );
                  })}
                </RadioGroup>
              </div>

              <Separator />

              {/* Collection method selection */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">采集方式</Label>
                <div className="space-y-2">
                  {availableMethods.map((method) => {
                    const Icon = method.icon;
                    const isSelected = formMethod === method.value;
                    return (
                      <motion.button
                        key={method.value}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setFormMethod(method.value)}
                        className={`w-full text-left rounded-xl border-2 p-3.5 transition-all duration-200 ${
                          isSelected
                            ? "border-violet-400 bg-violet-50 dark:bg-violet-900/20 dark:border-violet-600"
                            : "border-muted hover:border-muted-foreground/30"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                              isSelected
                                ? "bg-violet-100 dark:bg-violet-900/30"
                                : "bg-muted"
                            }`}
                          >
                            <Icon
                              className={`h-4 w-4 ${
                                isSelected
                                  ? "text-violet-600 dark:text-violet-400"
                                  : "text-muted-foreground"
                              }`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-semibold">
                                {method.emoji} {method.label}
                              </p>
                              {method.value === "link" && (
                                <Badge className="text-[9px] px-1.5 py-0 border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                  推荐
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {method.desc}
                            </p>
                          </div>
                          <ChevronRight
                            className={`h-4 w-4 mt-1 shrink-0 ${
                              isSelected
                                ? "text-violet-500"
                                : "text-muted-foreground/40"
                            }`}
                          />
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Method-specific fields */}
              <AnimatePresence mode="wait">
                {formMethod === "link" && (
                  <motion.div
                    key="link"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="space-y-3"
                  >
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">主页链接</Label>
                      <Input
                        placeholder={
                          formPlatform === "xiaohongshu"
                            ? "https://www.xiaohongshu.com/user/profile/..."
                            : "输入朋友圈主页链接"
                        }
                        value={formUrl}
                        onChange={(e) => setFormUrl(e.target.value)}
                        className="h-9 text-xs"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        粘贴目标账号的个人主页链接，系统将自动采集账号信息和笔记
                      </p>
                    </div>
                  </motion.div>
                )}

                {formMethod === "manual" && (
                  <motion.div
                    key="manual"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="space-y-3"
                  >
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">来源标签</Label>
                      <Input
                        placeholder='例如：我的朋友圈、竞品-某某'
                        value={formSourceLabel}
                        onChange={(e) =>
                          setFormSourceLabel(e.target.value)
                        }
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 p-3">
                      <p className="text-[10px] text-amber-700 dark:text-amber-300">
                        点击提交后，将打开手动导入面板，你可以粘贴内容并让AI智能解析
                      </p>
                    </div>
                  </motion.div>
                )}

                {formMethod === "cookie" && (
                  <motion.div
                    key="cookie"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="space-y-3"
                  >
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        主页链接（可选）
                      </Label>
                      <Input
                        placeholder="https://www.xiaohongshu.com/user/profile/..."
                        value={formUrl}
                        onChange={(e) => setFormUrl(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        Cookie 信息
                      </Label>
                      <Textarea
                        placeholder="粘贴登录后的Cookie信息..."
                        value={formCookie}
                        onChange={(e) => setFormCookie(e.target.value)}
                        className="text-xs font-mono min-h-[80px]"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        通过Cookie可以采集更多深度数据，请确保Cookie有效
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setShowAddDialog(false)}
                size="sm"
              >
                取消
              </Button>
              <motion.div whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={() => {
                    if (formMethod === "manual") {
                      if (!formSourceLabel.trim()) {
                        toast.error("请填写来源标签");
                        return;
                      }
                      setShowAddDialog(false);
                      setShowManualDialog(true);
                      setManualPlatform(formPlatform);
                      setManualSourceLabel(formSourceLabel);
                    } else {
                      handleAddAccount();
                    }
                  }}
                  disabled={
                    isSubmitting ||
                    (formMethod === "link" && !formUrl.trim()) ||
                    (formMethod === "cookie" && !formCookie.trim())
                  }
                  size="sm"
                  className="bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-sm hover:from-violet-600 hover:to-purple-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      添加中...
                    </>
                  ) : (
                    <>
                      {formMethod === "manual" ? (
                        <>
                          <ClipboardList className="h-3.5 w-3.5 mr-1" />
                          下一步：粘贴内容
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          确认添加
                        </>
                      )}
                    </>
                  )}
                </Button>
              </motion.div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Manual Import Dialog ──────────────────────────────────────── */}
        <Dialog
          open={showManualDialog}
          onOpenChange={(open) => {
            if (!isParsing) {
              setShowManualDialog(open);
            }
          }}
        >
          <DialogContent className="sm:max-w-lg max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <ClipboardList className="h-3.5 w-3.5 text-white" />
                </div>
                手动导入内容
              </DialogTitle>
              <DialogDescription>
                粘贴内容，每条内容用空行分隔，AI将智能解析并导入
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Source label display */}
              <div className="flex items-center gap-2">
                <Badge
                  className={`text-[10px] px-2 py-0.5 border-0 font-medium ${
                    manualPlatform === "wechat"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                  }`}
                >
                  {PLATFORM_LABELS[manualPlatform]}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  来源：{manualSourceLabel}
                </span>
              </div>

              {/* Textarea for pasting content */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">粘贴内容</Label>
                <Textarea
                  placeholder={`粘贴内容，每条内容用空行分隔。格式示例：

【美食探店】今天去了新开的咖啡馆...
发布时间：2025-04-20
点赞：23 评论：5 分享：2

【日常分享】周末去了郊外踏青...
发布时间：2025-04-19`}
                  value={manualContent}
                  onChange={(e) => setManualContent(e.target.value)}
                  className="text-xs min-h-[200px] leading-relaxed"
                  disabled={isParsing}
                />
              </div>

              {/* Parsed count preview */}
              {manualContent.trim() && !isParsing && (
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  <span>
                    已识别约{" "}
                    <span className="font-semibold text-foreground">
                      {
                        manualContent
                          .split(/\n\s*\n/)
                          .filter((b) => b.trim().length > 0).length
                      }
                    </span>{" "}
                    条内容
                  </span>
                </div>
              )}
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                variant="ghost"
                onClick={() => setShowManualDialog(false)}
                disabled={isParsing}
                size="sm"
              >
                取消
              </Button>
              <motion.div whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={handleManualImport}
                  disabled={
                    isParsing || !manualContent.trim()
                  }
                  size="sm"
                  className="bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm hover:from-amber-600 hover:to-orange-700 gap-1.5"
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      解析导入中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      AI智能解析并导入
                    </>
                  )}
                </Button>
              </motion.div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </ScrollArea>
  );
}
