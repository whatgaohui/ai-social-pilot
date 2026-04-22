"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
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
  Bookmark,
  Repeat2,
  MessageSquare,
  Clock,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";
import type { TrackedAccount, ContentComment, ContentInteraction, Platform } from "@/types";
import { PLATFORM_LABELS } from "@/types";

// ─── Props ──────────────────────────────────────────────────────────────────

interface ContentCollectorProps {
  selectedPost?: { id: string; topic: string; platform: string } | null;
}

// ─── Animation Variants ──────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

// ─── Status Config ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; pulse?: boolean }> = {
  idle: { label: "待同步", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  syncing: { label: "同步中", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300", pulse: true },
  success: { label: "已同步", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  error: { label: "同步失败", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
};

const COLLECT_METHOD_OPTIONS = [
  { value: "link", label: "链接", icon: Link2 },
  { value: "cookie", label: "Cookie", icon: Cookie },
  { value: "manual", label: "手动导入", icon: Upload },
];

// ─── Helper: format number ──────────────────────────────────────────────────

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + "w";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return "刚刚";
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}天前`;
  return date.toLocaleDateString("zh-CN");
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ContentCollector({ selectedPost }: ContentCollectorProps) {
  // ── State ───────────────────────────────────────────────────────────────
  const [accounts, setAccounts] = useState<TrackedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ accountId: string; totalImported: number } | null>(null);

  // Add form state
  const [formPlatform, setFormPlatform] = useState<Platform>("wechat");
  const [formHomeUrl, setFormHomeUrl] = useState("");
  const [formNickname, setFormNickname] = useState("");
  const [formCollectMethod, setFormCollectMethod] = useState("link");
  const [formCookie, setFormCookie] = useState("");
  const [formIsOwn, setFormIsOwn] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Comments & interactions for selected post
  const [comments, setComments] = useState<ContentComment[]>([]);
  const [interactions, setInteractions] = useState<ContentInteraction[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isLoadingInteractions, setIsLoadingInteractions] = useState(false);

  // ── Fetch accounts ──────────────────────────────────────────────────────
  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/tracked-accounts");
      if (!res.ok) throw new Error("获取失败");
      const data = await res.json();
      setAccounts(data);
    } catch {
      toast.error("获取追踪账号失败");
    } finally {
      setIsLoading(false);
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
      return;
    }

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

  // ── Add account handler ─────────────────────────────────────────────────
  const handleAddAccount = async () => {
    if (!formHomeUrl.trim()) {
      toast.error("请填写主页链接");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tracked-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: formPlatform,
          homeUrl: formHomeUrl.trim(),
          nickname: formNickname.trim(),
          collectMethod: formCollectMethod,
          cookie: formCookie.trim(),
          isOwn: formIsOwn,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "添加失败");
      }

      toast.success("账号添加成功");
      setShowAddForm(false);
      // Reset form
      setFormHomeUrl("");
      setFormNickname("");
      setFormCookie("");
      setFormCollectMethod("link");
      setFormIsOwn(true);
      fetchAccounts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "添加账号失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete account handler ──────────────────────────────────────────────
  const handleDeleteAccount = async (id: string) => {
    try {
      const res = await fetch(`/api/tracked-accounts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");
      toast.success("账号已删除");
      fetchAccounts();
    } catch {
      toast.error("删除失败");
    }
  };

  // ── Sync account handler ────────────────────────────────────────────────
  const handleSync = async (id: string) => {
    setSyncingId(id);
    setSyncResult(null);
    try {
      const res = await fetch(`/api/tracked-accounts/${id}/sync`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "同步失败");
      }

      toast.success(data.message || `成功导入 ${data.totalImported} 条内容`);
      setSyncResult({ accountId: id, totalImported: data.totalImported });
      fetchAccounts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "同步失败");
    } finally {
      setSyncingId(null);
    }
  };

  // ── Interactions summary ────────────────────────────────────────────────
  const shareCount = interactions.filter((i) => i.interactionType === "share").length;
  const forwardCount = interactions.filter((i) => i.interactionType === "forward").length;
  const collectCount = interactions.filter((i) => i.interactionType === "collect").length;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <ScrollArea className="h-full">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="p-4 space-y-4"
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
              <Globe className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-sm font-bold">账号内容采集</h2>
          </div>
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
              className="h-7 text-xs gap-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-sm hover:from-violet-600 hover:to-purple-700"
            >
              <Plus className="h-3 w-3" />
              添加账号
            </Button>
          </motion.div>
        </motion.div>

        {/* ── Add Account Form ───────────────────────────────────────────── */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 space-y-3">
                  {/* Platform selector */}
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1.5 font-medium">平台</p>
                    <div className="flex gap-2">
                      {(["wechat", "xiaohongshu"] as Platform[]).map((p) => (
                        <button
                          key={p}
                          onClick={() => setFormPlatform(p)}
                          className={`flex-1 h-9 rounded-lg text-xs font-medium transition-all border ${
                            formPlatform === p
                              ? p === "wechat"
                                ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 shadow-sm"
                                : "bg-rose-50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 shadow-sm"
                              : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/60"
                          }`}
                        >
                          {PLATFORM_LABELS[p]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Home URL */}
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1.5 font-medium">主页链接</p>
                    <Input
                      placeholder={
                        formPlatform === "xiaohongshu"
                          ? "https://www.xiaohongshu.com/user/profile/xxx"
                          : "输入朋友圈主页链接"
                      }
                      value={formHomeUrl}
                      onChange={(e) => setFormHomeUrl(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* Nickname */}
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1.5 font-medium">昵称</p>
                    <Input
                      placeholder="输入账号昵称"
                      value={formNickname}
                      onChange={(e) => setFormNickname(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* Collect method */}
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1.5 font-medium">采集方式</p>
                    <div className="flex gap-2">
                      {COLLECT_METHOD_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => setFormCollectMethod(opt.value)}
                            className={`flex-1 h-8 rounded-lg text-[10px] font-medium flex items-center justify-center gap-1 transition-all border ${
                              formCollectMethod === opt.value
                                ? "bg-violet-50 dark:bg-violet-900/20 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300"
                                : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/60"
                            }`}
                          >
                            <Icon className="h-3 w-3" />
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cookie (shown when cookie method selected) */}
                  <AnimatePresence>
                    {formCollectMethod === "cookie" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <p className="text-[10px] text-muted-foreground mb-1.5 font-medium">Cookie</p>
                        <Input
                          placeholder="粘贴采集用的Cookie信息"
                          value={formCookie}
                          onChange={(e) => setFormCookie(e.target.value)}
                          type="password"
                          className="h-8 text-xs font-mono"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Is own account toggle */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="is-own"
                      checked={formIsOwn}
                      onCheckedChange={(checked) => setFormIsOwn(!!checked)}
                      className="h-4 w-4"
                    />
                    <label htmlFor="is-own" className="text-xs text-muted-foreground cursor-pointer select-none">
                      自己的账号
                    </label>
                  </div>

                  {/* Submit button */}
                  <motion.div whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={handleAddAccount}
                      disabled={isSubmitting || !formHomeUrl.trim()}
                      className="w-full h-9 text-xs bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm hover:from-emerald-600 hover:to-teal-700"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                          添加中...
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          添加账号
                        </>
                      )}
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Loading State ──────────────────────────────────────────────── */}
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        )}

        {/* ── Empty State ────────────────────────────────────────────────── */}
        {!isLoading && accounts.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-3 shadow-lg">
              <ArrowDownToLine className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-sm font-semibold mb-1">还没有追踪账号</h3>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              添加你需要追踪的朋友圈或小红书账号，AI 将帮你采集和整理内容
            </p>
          </motion.div>
        )}

        {/* ── Tracked Accounts List ──────────────────────────────────────── */}
        {!isLoading && accounts.length > 0 && (
          <motion.div variants={containerVariants} className="space-y-3">
            {accounts.map((account) => {
              const isWeChat = account.platform === "wechat";
              const statusConf = STATUS_CONFIG[account.status] || STATUS_CONFIG.idle;
              const isSyncing = syncingId === account.id;
              const hasSyncResult = syncResult?.accountId === account.id;

              return (
                <motion.div
                  key={account.id}
                  variants={itemVariants}
                  whileHover={{ scale: 1.005 }}
                  className="transition-shadow"
                >
                  <Card className="border-0 shadow-sm overflow-hidden">
                    <CardContent className="p-3.5">
                      {/* Top row: avatar + name + badges */}
                      <div className="flex items-start gap-2.5 mb-3">
                        {/* Avatar placeholder */}
                        <div
                          className={`h-10 w-10 rounded-full bg-gradient-to-br ${
                            isWeChat ? "from-green-400 to-emerald-500" : "from-red-400 to-rose-500"
                          } flex items-center justify-center shrink-0 text-white text-sm font-bold shadow-sm`}
                        >
                          {(account.nickname || "U").charAt(0).toUpperCase()}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-semibold truncate">
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
                              {PLATFORM_LABELS[account.platform as Platform] || account.platform}
                            </Badge>
                            {/* Status badge */}
                            <Badge className={`text-[9px] px-1.5 py-0 border-0 ${statusConf.color}`}>
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
                          {/* Home URL */}
                          {account.homeUrl && (
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                              {account.homeUrl.length > 40
                                ? account.homeUrl.slice(0, 40) + "..."
                                : account.homeUrl}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        {[
                          { label: "粉丝", value: account.followers, icon: Users },
                          { label: "发布", value: account.postsCount, icon: FileText },
                          { label: "已采集", value: account.totalCollected, icon: ArrowDownToLine },
                          { label: "上次同步", value: account.lastSyncAt ? timeAgo(String(account.lastSyncAt)) : "—", icon: Clock, isText: true },
                        ].map((stat) => {
                          const Icon = stat.icon;
                          return (
                            <div key={stat.label} className="text-center">
                              <div className="flex items-center justify-center gap-0.5 mb-0.5">
                                <Icon className="h-3 w-3 text-muted-foreground" />
                              </div>
                              <div className="text-xs font-semibold tabular-nums">
                                {stat.isText ? (
                                  <span className="text-[10px]">{stat.value}</span>
                                ) : (
                                  formatNum(Number(stat.value))
                                )}
                              </div>
                              <p className="text-[9px] text-muted-foreground">{stat.label}</p>
                            </div>
                          );
                        })}
                      </div>

                      {/* Sync result banner */}
                      <AnimatePresence>
                        {hasSyncResult && !isSyncing && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="mb-3 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 flex items-center gap-2"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium">
                              成功导入 {syncResult.totalImported} 条内容
                            </span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Sync error banner */}
                      {account.status === "error" && account.lastError && (
                        <div className="mb-3 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 flex items-center gap-2">
                          <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                          <span className="text-[10px] text-red-600 dark:text-red-400 truncate">
                            {account.lastError.length > 50
                              ? account.lastError.slice(0, 50) + "..."
                              : account.lastError}
                          </span>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        <motion.div whileTap={{ scale: 0.95 }} className="flex-1">
                          <Button
                            onClick={() => handleSync(account.id)}
                            disabled={isSyncing}
                            size="sm"
                            className={`w-full h-7 text-[11px] gap-1.5 shadow-sm ${
                              isSyncing
                                ? "bg-muted text-muted-foreground"
                                : "bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700"
                            }`}
                          >
                            {isSyncing ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                同步中...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="h-3 w-3" />
                                同步
                              </>
                            )}
                          </Button>
                        </motion.div>
                        <motion.div whileTap={{ scale: 0.95 }}>
                          <Button
                            onClick={() => handleDeleteAccount(account.id)}
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[11px] text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 gap-1"
                          >
                            <Trash2 className="h-3 w-3" />
                            删除
                          </Button>
                        </motion.div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* ── Comments & Interactions for Selected Post ──────────────────── */}
        {selectedPost?.id && (
          <>
            <Separator className="my-2" />

            {/* Post info header */}
            <motion.div variants={itemVariants} className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <MessageSquare className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{selectedPost.topic}</p>
                <p className="text-[10px] text-muted-foreground">
                  {PLATFORM_LABELS[selectedPost.platform as Platform] || selectedPost.platform} · 互动详情
                </p>
              </div>
            </motion.div>

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
          </>
        )}
      </motion.div>
    </ScrollArea>
  );
}
