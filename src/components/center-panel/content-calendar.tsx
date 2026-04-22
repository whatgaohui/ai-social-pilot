"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import type { ContentPost, ContentPlan } from "@/types";
import { CONTENT_TYPE_LABELS, CONTENT_TYPE_COLORS, POST_STATUS_LABELS, XHS_CONTENT_TYPE_LABELS, XHS_CONTENT_TYPE_COLORS, ContentType, PostStatus, XHSContentType } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CalendarDays, ChevronLeft, ChevronRight, Sparkles,
  CheckCircle2, Clock, FileText, Loader2, Calendar,
  BarChart3, Zap, LayoutGrid, List, Heart, MessageSquare,
  Share2, Eye, Star, GripVertical, Save, Wifi,
  Wand2, Copy, Trash2,
} from "lucide-react";
import { toast } from "sonner";
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
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, addMonths, subMonths, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";

const STATUS_COLORS: Record<PostStatus, string> = {
  planned: "bg-gray-200 dark:bg-gray-700",
  generated: "bg-sky-200 dark:bg-sky-900/40",
  optimized: "bg-amber-200 dark:bg-amber-900/40",
  published: "bg-violet-200 dark:bg-violet-900/40",
};

const STATUS_DOT_COLORS: Record<PostStatus, string> = {
  planned: "bg-gray-400",
  generated: "bg-sky-500",
  optimized: "bg-amber-500",
  published: "bg-violet-500",
};

const STATUS_BADGE_COLORS: Record<PostStatus, string> = {
  planned: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  generated: "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300",
  optimized: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300",
  published: "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300",
};

const PLATFORM_DOT_COLORS: Record<string, string> = {
  wechat: "bg-green-500",
  xiaohongshu: "bg-red-500",
};

const PLATFORM_RING_COLORS: Record<string, string> = {
  wechat: "ring-green-400",
  xiaohongshu: "ring-red-400",
};

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

// Platform-aware content type helpers
function getContentTypeLabelForPost(post: ContentPost) {
  if (post.platform === 'xiaohongshu') return XHS_CONTENT_TYPE_LABELS[post.contentType as XHSContentType] || post.contentType;
  return CONTENT_TYPE_LABELS[post.contentType as ContentType] || post.contentType;
}
function getContentTypeColorForPost(post: ContentPost) {
  if (post.platform === 'xiaohongshu') return XHS_CONTENT_TYPE_COLORS[post.contentType as XHSContentType] || '';
  return CONTENT_TYPE_COLORS[post.contentType as ContentType] || '';
}

export function ContentCalendar() {
  const {
    currentPlan, setCurrentPlan, contentPosts, setContentPosts,
    selectedDate, setSelectedDate, selectedPostId, persona, knowledgeItems,
    isGenerating, setIsGenerating, setSelectedPostId, platform,
  } = useAppStore();
  const isXHS = platform === 'xiaohongshu';

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'wechat' | 'xiaohongshu'>('all');

  // Drag-and-drop state (grid view)
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [draggedDate, setDraggedDate] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [hasReordered, setHasReordered] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Connected platforms state
  const [connectedPlatformsList, setConnectedPlatformsList] = useState<{ platform: string; status: string }[]>([]);

  // Fetch connected platform accounts
  useEffect(() => {
    async function fetchConnectedPlatforms() {
      try {
        const res = await fetch("/api/platform-accounts");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setConnectedPlatformsList(
              data
                .filter((a: { platform: string; status: string }) => a.status === "connected")
                .map((a: { platform: string; status: string }) => ({ platform: a.platform, status: a.status }))
            );
          }
        }
      } catch {
        // silently fail
      }
    }
    fetchConnectedPlatforms();
    const interval = setInterval(fetchConnectedPlatforms, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch plans
  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/plan");
      if (res.ok) {
        const plans: ContentPlan[] = await res.json();
        if (plans.length > 0) {
          const activePlan = plans.find(p => p.status === "active") || plans[0];
          setCurrentPlan(activePlan);
          if (activePlan.posts) {
            setContentPosts(activePlan.posts);
          } else {
            fetchPosts(activePlan.id);
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch plans:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async (planId: string) => {
    try {
      const res = await fetch(`/api/content?planId=${planId}`);
      if (res.ok) {
        const posts = await res.json();
        setContentPosts(posts);
      }
    } catch (e) {
      console.error("Failed to fetch posts:", e);
    }
  };

  const createPlanAndGenerate = async () => {
    if (!persona?.name) {
      toast.error("请先在左侧设置人设信息");
      return;
    }
    if (knowledgeItems.length === 0) {
      toast.error("请先在知识库中添加一些内容");
      return;
    }

    setIsGenerating(true);
    try {
      // Create plan
      const monthStr = format(currentMonth, "yyyy-MM");
      const planRes = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: monthStr,
          theme: `${persona.name}的${format(currentMonth, "yyyy年M月")}${isXHS ? '小红书' : '朋友圈'}计划`,
          status: "draft",
        }),
      });

      if (!planRes.ok) {
        throw new Error("Failed to create plan");
      }

      const plan = await planRes.json();

      // Generate 30-day content
      const genRes = await fetch("/api/ai/batch-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          persona,
          knowledgeItems,
          startDate: format(startOfMonth(currentMonth), "yyyy-MM-dd"),
          month: format(currentMonth, "yyyy年M月"),
          platform,
        }),
      });

      if (!genRes.ok) {
        const errorData = await genRes.json();
        throw new Error(errorData.error || "Failed to generate");
      }

      const genData = await genRes.json();
      setCurrentPlan({ ...plan, status: "active" });
      setContentPosts(genData.posts);
      toast.success(`成功生成 ${genData.count} 条内容计划！`);
    } catch (error) {
      console.error("Generation error:", error);
      toast.error("生成失败，请稍后重试");
    } finally {
      setIsGenerating(false);
    }
  };

  // Calendar calculations
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = (getDay(monthStart) + 6) % 7; // Monday = 0

  // Filter posts by platform filter (all / current / specific)
  const platformPosts = useMemo(() => {
    return contentPosts.filter(p => {
      if (platformFilter === 'all') return true;
      if (!p.platform && platformFilter === 'wechat') return true;
      return p.platform === platformFilter;
    });
  }, [contentPosts, platformFilter]);

  const postsByDate = useMemo(() => {
    const map: Record<string, ContentPost[]> = {};
    platformPosts.forEach((post) => {
      if (!map[post.scheduledDate]) {
        map[post.scheduledDate] = [];
      }
      map[post.scheduledDate].push(post);
    });
    return map;
  }, [platformPosts]);

  // Posts sorted by date for list view
  const sortedPosts = useMemo(() => {
    return [...platformPosts]
      .filter(p => p.scheduledDate)
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  }, [platformPosts]);

  // Stats
  const stats = useMemo(() => {
    const total = platformPosts.length;
    const published = platformPosts.filter(p => p.status === "published").length;
    const optimized = platformPosts.filter(p => p.status === "optimized").length;
    const generated = platformPosts.filter(p => p.status === "generated").length;
    const avgScore = total > 0
      ? Math.round(platformPosts.reduce((sum, p) => sum + p.aiScore, 0) / total)
      : 0;
    return { total, published, optimized, generated, avgScore };
  }, [platformPosts]);

  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    const posts = postsByDate[dateStr];
    if (posts && posts.length > 0) {
      // Prefer the post matching current platform
      const match = posts.find(p => !p.platform || p.platform === platform);
      setSelectedPostId((match || posts[0]).id);
    }
  };

  const handleListItemClick = (post: ContentPost) => {
    setSelectedDate(post.scheduledDate);
    setSelectedPostId(post.id);
  };

  // Grid view drag-and-drop handlers
  const handleGridDragStart = useCallback((e: React.DragEvent, postId: string, dateStr: string) => {
    setDraggedId(postId);
    setDraggedDate(dateStr);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', postId);
  }, []);

  const handleGridDragOver = useCallback((e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dateStr !== draggedDate) {
      setDragOverDate(dateStr);
    }
  }, [draggedDate]);

  const handleGridDragLeave = useCallback((e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverDate(null);
    }
  }, []);

  const handleGridDrop = useCallback(async (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    if (!draggedId || !draggedDate || draggedDate === targetDateStr) {
      setDraggedId(null);
      setDraggedDate(null);
      setDragOverDate(null);
      return;
    }

    const draggedPost = contentPosts.find(p => p.id === draggedId);
    if (!draggedPost) {
      setDraggedId(null);
      setDraggedDate(null);
      setDragOverDate(null);
      return;
    }

    const targetPosts = postsByDate[targetDateStr];

    try {
      if (targetPosts && targetPosts.length > 0) {
        // Target cell has content: swap scheduledDates
        const targetPost = targetPosts[0];
        const [res1, res2] = await Promise.all([
          fetch(`/api/content/${draggedId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scheduledDate: targetDateStr }),
          }),
          fetch(`/api/content/${targetPost.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scheduledDate: draggedDate }),
          }),
        ]);

        if (!res1.ok || !res2.ok) {
          throw new Error('Failed to update posts');
        }

        await Promise.all([res1.json(), res2.json()]);

        // Update store with both updated posts
        const newPosts = contentPosts.map(p => {
          if (p.id === draggedId) return { ...p, scheduledDate: targetDateStr };
          if (p.id === targetPost.id) return { ...p, scheduledDate: draggedDate };
          return p;
        });
        setContentPosts(newPosts);
        toast.success('已交换排期日期');
      } else {
        // Target cell is empty: move post to new date
        const res = await fetch(`/api/content/${draggedId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scheduledDate: targetDateStr }),
        });

        if (!res.ok) {
          throw new Error('Failed to update post');
        }

        await res.json();

        const newPosts = contentPosts.map(p => {
          if (p.id === draggedId) return { ...p, scheduledDate: targetDateStr };
          return p;
        });
        setContentPosts(newPosts);
        toast.success('已移动排期到新日期');
      }
      setHasReordered(true);
    } catch (error) {
      console.error('Grid drag-and-drop failed:', error);
      toast.error('排期操作失败，请重试');
    } finally {
      setDraggedId(null);
      setDraggedDate(null);
      setDragOverDate(null);
    }
  }, [draggedId, draggedDate, contentPosts, setContentPosts, postsByDate]);

  const handleGridDragEnd = useCallback(() => {
    setDraggedId(null);
    setDraggedDate(null);
    setDragOverDate(null);
  }, []);

  // Save reordering: assign sequential dates to all posts
  const handleSaveReorder = async () => {
    if (sortedPosts.length === 0) return;
    setIsSaving(true);
    try {
      const startDate = new Date(sortedPosts[0].scheduledDate);
      const updatePromises = sortedPosts.map((post, index) => {
        const newDate = new Date(startDate);
        newDate.setDate(startDate.getDate() + index);
        const dateStr = format(newDate, 'yyyy-MM-dd');
        return fetch(`/api/content/${post.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scheduledDate: dateStr }),
        });
      });

      const results = await Promise.all(updatePromises);
      if (results.some(r => !r.ok)) {
        throw new Error('Some updates failed');
      }

      // Update store with new sequential dates
      const newPosts = contentPosts.map(p => {
        const index = sortedPosts.findIndex(sp => sp.id === p.id);
        if (index === -1) return p;
        const newDate = new Date(startDate);
        newDate.setDate(startDate.getDate() + index);
        return { ...p, scheduledDate: format(newDate, 'yyyy-MM-dd') };
      });
      setContentPosts(newPosts);
      setHasReordered(false);
      setShowSaveDialog(false);
      toast.success(`已保存排序，共更新 ${sortedPosts.length} 条内容排期`);
    } catch (error) {
      console.error('Save reorder failed:', error);
      toast.error('保存排序失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  // Context menu handlers
  const handleStatusChange = async (postId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/content/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setContentPosts(contentPosts.map((p) => (p.id === postId ? { ...p, ...updated } : p)));
        toast.success("状态已更新");
      }
    } catch {
      toast.error("更新失败");
    }
  };

  const handleCopyContent = (post: ContentPost) => {
    if (post.content) {
      navigator.clipboard.writeText(post.content);
      toast.success("内容已复制到剪贴板");
    } else {
      toast.error("该帖子没有内容可复制");
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("确定要删除这条内容吗？")) return;
    try {
      const res = await fetch(`/api/content/${postId}`, { method: "DELETE" });
      if (res.ok) {
        setContentPosts(contentPosts.filter((p) => p.id !== postId));
        if (selectedPostId === postId) setSelectedPostId(null);
        toast.success("内容已删除");
      }
    } catch {
      toast.error("删除失败");
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold min-w-[120px] text-center">
                {format(currentMonth, "yyyy年M月", { locale: zhCN })}
              </h2>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            {/* Connected platform badges */}
            {connectedPlatformsList.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1"
              >
                {connectedPlatformsList.map((cp) => (
                  <span
                    key={cp.platform}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40"
                  >
                    <Wifi className="h-2.5 w-2.5" />
                    {cp.platform === 'wechat' ? '朋友圈已连' : '小红书已连'}
                  </span>
                ))}
              </motion.div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Platform Filter */}
            {contentPosts.length > 0 && (
              <div className="flex items-center bg-muted rounded-md p-0.5">
                {([
                  { value: 'all' as const, label: '全部', dot: false },
                  { value: 'wechat' as const, label: '朋友圈', dot: true, dotColor: 'bg-green-500' },
                  { value: 'xiaohongshu' as const, label: '小红书', dot: true, dotColor: 'bg-red-500' },
                ]).map((pf) => {
                  const isSelected = platformFilter === pf.value;
                  const isWechat = pf.value === 'wechat';
                  const isXH = pf.value === 'xiaohongshu';
                  return (
                    <Button
                      key={pf.value}
                      variant={isSelected ? "secondary" : "ghost"}
                      size="sm"
                      className={`h-7 px-2 text-[10px] gap-1 platform-transition transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/20 ${
                        isSelected && isWechat
                          ? 'bg-green-500 text-white hover:bg-green-600 shadow-sm shadow-green-200 dark:shadow-green-900/30'
                          : isSelected && isXH
                            ? 'bg-red-500 text-white hover:bg-red-600 shadow-sm shadow-red-200 dark:shadow-red-900/30'
                            : ''
                      }`}
                      onClick={() => setPlatformFilter(pf.value)}
                    >
                      {pf.dot && <div className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white filter-dot-active' : pf.dotColor} transition-colors duration-200`} />}
                      {pf.label}
                      {pf.value !== 'all' && (
                        <span className={`text-[9px] ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>
                          ({contentPosts.filter(p => pf.value === 'wechat' ? (!p.platform || p.platform === 'wechat') : p.platform === 'xiaohongshu').length})
                        </span>
                      )}
                    </Button>
                  );
                })}
              </div>
            )}
            {/* View Toggle */}
            {platformPosts.length > 0 && (
              <div className="flex items-center bg-muted rounded-md p-0.5">
                <Button
                  variant={viewMode === 'grid' ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            <Button
              onClick={createPlanAndGenerate}
              disabled={isGenerating}
              size="sm"
              className={`h-8 platform-transition ${isXHS ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-md shadow-red-200 dark:shadow-red-900/30' : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-md shadow-purple-200 dark:shadow-purple-900/30'} text-white`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  AI生成中...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  一键生成30天
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Stats Bar */}
        {platformPosts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-2"
          >
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-1">
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                总计 <strong className="text-foreground">{stats.total}</strong>
                {platformFilter !== 'all' && (
                  <Badge variant="secondary" className="h-4 px-1 text-[9px] tabular-nums">
                    {platformFilter === 'xiaohongshu' ? '小红书' : '朋友圈'}
                  </Badge>
                )}
                {platformFilter === 'all' && (
                  <Badge variant="secondary" className="h-4 px-1 text-[9px] tabular-nums">
                    全平台
                  </Badge>
                )}
              </span>
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-amber-500" />
                已优化 <strong className="text-foreground">{stats.optimized}</strong>
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-violet-500" />
                已发布 <strong className="text-foreground">{stats.published}</strong>
              </span>
              <span className="flex items-center gap-1">
                <BarChart3 className="h-3 w-3 text-amber-500" />
                均分 <strong className="text-foreground">{stats.avgScore}</strong>
              </span>
            </div>
            <Progress value={(stats.published + stats.optimized) / stats.total * 100} className="h-1.5 w-24" />
          </motion.div>
        )}
      </div>

      {/* Calendar Content */}
      <ScrollArea className="flex-1 px-4 pb-4">
        {platformPosts.length === 0 && !isGenerating ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center mb-4">
              <CalendarDays className="h-8 w-8 text-violet-500" />
            </div>
            <h3 className="text-base font-semibold mb-1">开始规划本月内容</h3>
            <p className="text-sm text-muted-foreground text-center max-w-[240px] mb-4">
              AI将基于您的人设和知识库，自动生成30天${isXHS ? '小红书笔记' : '朋友圈'}发布计划
            </p>
            <Button
              onClick={createPlanAndGenerate}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-purple-200 dark:shadow-purple-900/30"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              一键生成30天计划
            </Button>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            {viewMode === 'grid' ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 gap-0.5 mb-0.5">
                  {WEEKDAYS.map((day) => (
                    <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1.5">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-0.5">
                  {/* Empty cells for offset */}
                  {Array.from({ length: startDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-[4/3]" />
                  ))}

                  {/* Day cells */}
                  {daysInMonth.map((day) => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const posts = postsByDate[dateStr];
                    const today = isToday(day);
                    const isSelected = selectedDate === dateStr;
                    const primaryPost = posts?.[0];
                    const isDragOver = dragOverDate === dateStr;
                    const isDragging = draggedId != null && draggedDate === dateStr;

                    // Determine platform ring color when showing all
                    const platformRing = platformFilter === 'all' && posts?.length === 1 && primaryPost?.platform
                      ? PLATFORM_RING_COLORS[primaryPost.platform] || ''
                      : '';

                    const cellContent = (
                      <div
                        key={dateStr}
                        draggable={!!primaryPost}
                        onDragStart={(e) => primaryPost && handleGridDragStart(e as unknown as React.DragEvent, primaryPost.id, dateStr)}
                        onDragOver={(e) => handleGridDragOver(e as unknown as React.DragEvent, dateStr)}
                        onDragLeave={(e) => handleGridDragLeave(e as unknown as React.DragEvent)}
                        onDrop={(e) => handleGridDrop(e as unknown as React.DragEvent, dateStr)}
                        onDragEnd={handleGridDragEnd}
                        className={`calendar-cell aspect-[4/3] rounded-md p-1.5 relative overflow-hidden focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 focus-visible:outline-none transition-shadow duration-200
                          ${primaryPost ? `cursor-grab active:cursor-grabbing ${STATUS_COLORS[primaryPost.status as PostStatus] || "bg-muted/50"}` : "cursor-default bg-muted/30"}
                          ${isDragging ? 'opacity-40 scale-95 ring-2 ring-primary/30' : ''}
                          ${isDragOver ? 'ring-2 ring-violet-500 shadow-lg shadow-violet-200 dark:shadow-violet-900/30 bg-violet-50/50 dark:bg-violet-900/20 scale-[1.03]' : ''}
                          ${!isDragging && !isDragOver ? 'hover:shadow-sm' : ''}
                          ${isSelected && !isDragOver ? "ring-2 ring-primary shadow-lg scale-[1.02] calendar-glow" : ""}
                          ${platformRing && !isSelected && !isDragOver ? `ring-1 ${platformRing}` : ""}
                          ${today && !primaryPost && !isDragOver ? "ring-1 ring-primary/40 bg-primary/[0.03]" : ""}
                        `}
                      >
                        <motion.div
                          whileHover={!isDragging && !isDragOver ? { scale: 1.02 } : {}}
                          whileTap={!isDragging && !isDragOver ? { scale: 0.98 } : {}}
                          onClick={() => handleDayClick(dateStr)}
                          className="h-full"
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className={`text-xs font-medium ${today ? "text-primary font-bold" : ""}`}>
                              {format(day, "d")}
                            </span>
                            <div className="flex items-center gap-0.5">
                              {/* Drag handle for cells with content */}
                              {primaryPost && (
                                <div className="opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity duration-200 text-muted-foreground"
                                  style={{ opacity: draggedId != null ? 0.6 : undefined }}
                                >
                                  <GripVertical className="h-3 w-3" />
                                </div>
                              )}
                              {/* Platform dots when multi-platform or all view */}
                              {platformFilter === 'all' && posts && posts.length > 1 && (
                                <div className="flex items-center gap-0.5">
                                  {posts.map((p, i) => (
                                    <div key={i} className={`h-1.5 w-1.5 rounded-full ${PLATFORM_DOT_COLORS[p.platform || 'wechat']}`} />
                                  ))}
                                </div>
                              )}
                              {/* Status dot */}
                              {primaryPost && posts?.length <= 1 && (
                                <div className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT_COLORS[primaryPost.status as PostStatus]}`} />
                              )}
                            </div>
                          </div>
                          {primaryPost && (
                            <div className="space-y-0.5">
                              {/* Platform indicator badge in all-view */}
                              {platformFilter === 'all' && primaryPost.platform && (
                                <Badge
                                  className={`text-[8px] px-1 py-0 h-3 leading-3 ${primaryPost.platform === 'xiaohongshu' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300' : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-300'}`}
                                  variant="secondary"
                                >
                                  {primaryPost.platform === 'xiaohongshu' ? '红' : '绿'}
                                </Badge>
                              )}
                              <Badge
                                className={`text-[9px] px-1 py-0 h-4 leading-4 ${getContentTypeColorForPost(primaryPost)}`}
                                variant="secondary"
                              >
                                {getContentTypeLabelForPost(primaryPost)}
                              </Badge>
                              <p className="text-[10px] leading-tight line-clamp-2 font-medium">
                                {primaryPost.topic}
                              </p>
                              {primaryPost.aiScore > 0 && (
                                <div className="flex items-center gap-0.5">
                                  <span className="text-[9px] text-amber-600 dark:text-amber-400">★</span>
                                  <span className="text-[9px] text-muted-foreground">{primaryPost.aiScore}</span>
                                </div>
                              )}
                            </div>
                          )}
                          {/* Drop indicator for empty cells during drag */}
                          {!primaryPost && isDragOver && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-violet-500" />
                              </div>
                            </div>
                          )}
                        </motion.div>
                      </div>
                    );

                    if (primaryPost) {
                      return (
                        <ContextMenu key={dateStr}>
                          <ContextMenuTrigger asChild>
                            {cellContent}
                          </ContextMenuTrigger>
                          <ContextMenuContent className="w-48">
                            <ContextMenuSub>
                              <ContextMenuSubTrigger>
                                <Clock className="h-4 w-4 mr-2" />
                                切换状态
                              </ContextMenuSubTrigger>
                              <ContextMenuSubContent>
                                <ContextMenuItem onClick={() => handleStatusChange(primaryPost.id, "planned")}>
                                  <Clock className="h-4 w-4 mr-2 text-gray-500" />
                                  待规划
                                  {primaryPost.status === "planned" && <CheckCircle2 className="h-3 w-3 ml-auto text-emerald-500" />}
                                </ContextMenuItem>
                                <ContextMenuItem onClick={() => handleStatusChange(primaryPost.id, "generated")}>
                                  <Sparkles className="h-4 w-4 mr-2 text-violet-500" />
                                  已生成
                                  {primaryPost.status === "generated" && <CheckCircle2 className="h-3 w-3 ml-auto text-emerald-500" />}
                                </ContextMenuItem>
                                <ContextMenuItem onClick={() => handleStatusChange(primaryPost.id, "optimized")}>
                                  <Wand2 className="h-4 w-4 mr-2 text-amber-500" />
                                  已优化
                                  {primaryPost.status === "optimized" && <CheckCircle2 className="h-3 w-3 ml-auto text-emerald-500" />}
                                </ContextMenuItem>
                                <ContextMenuItem onClick={() => handleStatusChange(primaryPost.id, "published")}>
                                  <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />
                                  已发布
                                  {primaryPost.status === "published" && <CheckCircle2 className="h-3 w-3 ml-auto text-emerald-500" />}
                                </ContextMenuItem>
                              </ContextMenuSubContent>
                            </ContextMenuSub>
                            <ContextMenuSeparator />
                            <ContextMenuItem onClick={() => handleCopyContent(primaryPost)}>
                              <Copy className="h-4 w-4 mr-2" />
                              复制内容
                              <ContextMenuShortcut>⌘C</ContextMenuShortcut>
                            </ContextMenuItem>
                            <ContextMenuItem onClick={() => handleDeletePost(primaryPost.id)} variant="destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              删除
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      );
                    }

                    return cellContent;
                  })}
                </div>

                {/* Legend */}
                {platformPosts.length > 0 && (
                  <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t">
                    {platformFilter === 'all' && (
                      <>
                        <div className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                          <span className="text-[10px] text-muted-foreground">朋友圈</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                          <span className="text-[10px] text-muted-foreground">小红书</span>
                        </div>
                        <div className="w-px h-3 bg-border" />
                      </>
                    )}
                    {(["planned", "generated", "optimized", "published"] as PostStatus[]).map((status) => (
                      <div key={status} className="flex items-center gap-1.5">
                        <div className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT_COLORS[status]}`} />
                        <span className="text-[10px] text-muted-foreground">{POST_STATUS_LABELS[status]}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-2"
              >
                {/* Save Reorder Button */}
                {hasReordered && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800/40 mb-2"
                  >
                    <p className="text-xs text-violet-700 dark:text-violet-300">
                      检测到排期变更，可一键保存为连续日期
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setShowSaveDialog(true)}
                      className="h-7 px-3 text-xs bg-violet-600 hover:bg-violet-700 text-white"
                    >
                      <Save className="h-3 w-3 mr-1" />
                      保存排序
                    </Button>
                  </motion.div>
                )}
                {sortedPosts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <CalendarDays className="h-10 w-10 mb-3 opacity-30" />
                    <p className="text-sm">本月暂无内容</p>
                  </div>
                ) : (
                  sortedPosts.map((post, index) => {
                    const isSelected = selectedPostId === post.id;
                    let formattedDate = "";
                    try {
                      formattedDate = format(parseISO(post.scheduledDate), 'M月d日 EEEE', { locale: zhCN });
                    } catch {
                      formattedDate = post.scheduledDate;
                    }

                    return (
                      <ContextMenu key={post.id}>
                        <ContextMenuTrigger asChild>
                          <motion.div
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: index * 0.015 }}
                            onClick={() => handleListItemClick(post)}
                            className={`
                              group relative rounded-lg border p-3 cursor-pointer transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 focus-visible:outline-none
                              hover:shadow-md hover:border-primary/30
                              ${isSelected
                                ? "ring-2 ring-primary bg-primary/[0.03] border-primary/40 shadow-md calendar-glow"
                                : index % 2 === 1
                                  ? "bg-muted/40 border-border"
                                  : "bg-card border-border"
                              }
                            `}
                          >
                            <div className="flex items-start gap-3">
                              {/* Date Column */}
                              <div className="flex-shrink-0 w-[68px]">
                                <div className="text-[10px] text-muted-foreground leading-tight">
                                  {formattedDate}
                                </div>
                              </div>

                              {/* Content Column */}
                              <div className="flex-1 min-w-0 space-y-1.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {/* Platform indicator */}
                                  {post.platform && (
                                    <Badge
                                      className={`text-[8px] px-1 py-0 h-3.5 leading-3 ${post.platform === 'xiaohongshu' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300' : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-300'}`}
                                      variant="secondary"
                                    >
                                      {post.platform === 'xiaohongshu' ? '小红书' : '朋友圈'}
                                    </Badge>
                                  )}
                                  <Badge
                                    className={`text-[9px] px-1.5 py-0 h-4 leading-4 ${getContentTypeColorForPost(post)}`}
                                    variant="secondary"
                                  >
                                    {getContentTypeLabelForPost(post)}
                                  </Badge>
                                  <Badge
                                    className={`text-[9px] px-1.5 py-0 h-4 leading-4 animate-bounce-in ${STATUS_BADGE_COLORS[post.status as PostStatus] || ""}`}
                                    variant="secondary"
                                  >
                                    {POST_STATUS_LABELS[post.status as PostStatus]}
                                  </Badge>
                                  {post.aiScore > 0 && (
                                    <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                                      <Star className="h-2.5 w-2.5" />
                                      {post.aiScore}
                                    </span>
                                  )}
                                </div>

                                <p className="text-xs font-medium truncate">
                                  {post.topic}
                                </p>

                                <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                                  {post.content.length > 80 ? post.content.slice(0, 80) + '...' : post.content}
                                </p>

                                {/* Engagement stats */}
                                {(post.likes > 0 || post.comments > 0 || post.views > 0 || post.shares > 0) && (
                                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                    {post.views > 0 && (
                                      <span className="flex items-center gap-0.5">
                                        <Eye className="h-2.5 w-2.5" />{post.views}
                                      </span>
                                    )}
                                    {post.likes > 0 && (
                                      <span className="flex items-center gap-0.5 text-rose-500">
                                        <Heart className="h-2.5 w-2.5" />{post.likes}
                                      </span>
                                    )}
                                    {post.comments > 0 && (
                                      <span className="flex items-center gap-0.5">
                                        <MessageSquare className="h-2.5 w-2.5" />{post.comments}
                                      </span>
                                    )}
                                    {post.shares > 0 && (
                                      <span className="flex items-center gap-0.5">
                                        <Share2 className="h-2.5 w-2.5" />{post.shares}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Status dot */}
                              <div className="flex-shrink-0 pt-1">
                                <div className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT_COLORS[post.status as PostStatus]}`} />
                              </div>
                            </div>
                          </motion.div>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-48">
                          <ContextMenuSub>
                            <ContextMenuSubTrigger>
                              <Clock className="h-4 w-4 mr-2" />
                              切换状态
                            </ContextMenuSubTrigger>
                            <ContextMenuSubContent>
                              <ContextMenuItem onClick={() => handleStatusChange(post.id, "planned")}>
                                <Clock className="h-4 w-4 mr-2 text-gray-500" />
                                待规划
                                {post.status === "planned" && <CheckCircle2 className="h-3 w-3 ml-auto text-emerald-500" />}
                              </ContextMenuItem>
                              <ContextMenuItem onClick={() => handleStatusChange(post.id, "generated")}>
                                <Sparkles className="h-4 w-4 mr-2 text-violet-500" />
                                已生成
                                {post.status === "generated" && <CheckCircle2 className="h-3 w-3 ml-auto text-emerald-500" />}
                              </ContextMenuItem>
                              <ContextMenuItem onClick={() => handleStatusChange(post.id, "optimized")}>
                                <Wand2 className="h-4 w-4 mr-2 text-amber-500" />
                                已优化
                                {post.status === "optimized" && <CheckCircle2 className="h-3 w-3 ml-auto text-emerald-500" />}
                              </ContextMenuItem>
                              <ContextMenuItem onClick={() => handleStatusChange(post.id, "published")}>
                                <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />
                                已发布
                                {post.status === "published" && <CheckCircle2 className="h-3 w-3 ml-auto text-emerald-500" />}
                              </ContextMenuItem>
                            </ContextMenuSubContent>
                          </ContextMenuSub>
                          <ContextMenuSeparator />
                          <ContextMenuItem onClick={() => handleCopyContent(post)}>
                            <Copy className="h-4 w-4 mr-2" />
                            复制内容
                            <ContextMenuShortcut>⌘C</ContextMenuShortcut>
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => handleDeletePost(post.id)} variant="destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            删除
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    );
                  })
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </ScrollArea>

      {/* Save Reorder Confirmation Dialog */}
      <AlertDialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认保存排序</AlertDialogTitle>
            <AlertDialogDescription>
              将按照当前列表顺序，从 <strong>{sortedPosts.length > 0 && (() => { try { return format(parseISO(sortedPosts[0].scheduledDate), 'M月d日', { locale: zhCN }); } catch { return ''; } })()}</strong> 开始，为所有 <strong>{sortedPosts.length}</strong> 条内容分配连续的发布日期。此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleSaveReorder(); }}
              disabled={isSaving}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  保存中...
                </>
              ) : (
                '确认保存'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
