"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import type { ContentPost, ContentPlan } from "@/types";
import { CONTENT_TYPE_LABELS, CONTENT_TYPE_COLORS, POST_STATUS_LABELS, ContentType, PostStatus } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CalendarDays, ChevronLeft, ChevronRight, Sparkles,
  CheckCircle2, Clock, FileText, Loader2, Calendar,
  BarChart3, Zap
} from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, addMonths, subMonths } from "date-fns";
import { zhCN } from "date-fns/locale";

const STATUS_COLORS: Record<PostStatus, string> = {
  planned: "bg-gray-200 dark:bg-gray-700",
  generated: "bg-blue-200 dark:bg-blue-900/40",
  optimized: "bg-emerald-200 dark:bg-emerald-900/40",
  published: "bg-purple-200 dark:bg-purple-900/40",
};

const STATUS_DOT_COLORS: Record<PostStatus, string> = {
  planned: "bg-gray-400",
  generated: "bg-blue-500",
  optimized: "bg-emerald-500",
  published: "bg-purple-500",
};

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

export function ContentCalendar() {
  const {
    currentPlan, setCurrentPlan, contentPosts, setContentPosts,
    selectedDate, setSelectedDate, persona, knowledgeItems,
    isGenerating, setIsGenerating, setSelectedPostId,
  } = useAppStore();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(false);

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
          theme: `${persona.name}的${format(currentMonth, "yyyy年M月")}朋友圈计划`,
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

  const postsByDate = useMemo(() => {
    const map: Record<string, ContentPost> = {};
    contentPosts.forEach((post) => {
      map[post.scheduledDate] = post;
    });
    return map;
  }, [contentPosts]);

  // Stats
  const stats = useMemo(() => {
    const total = contentPosts.length;
    const published = contentPosts.filter(p => p.status === "published").length;
    const optimized = contentPosts.filter(p => p.status === "optimized").length;
    const generated = contentPosts.filter(p => p.status === "generated").length;
    const avgScore = total > 0
      ? Math.round(contentPosts.reduce((sum, p) => sum + p.aiScore, 0) / total)
      : 0;
    return { total, published, optimized, generated, avgScore };
  }, [contentPosts]);

  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    const post = postsByDate[dateStr];
    if (post) {
      setSelectedPostId(post.id);
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
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
          <Button
            onClick={createPlanAndGenerate}
            disabled={isGenerating}
            size="sm"
            className="h-8 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-md shadow-purple-200 dark:shadow-purple-900/30"
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

        {/* Stats Bar */}
        {contentPosts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-2"
          >
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-1">
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                总计 <strong className="text-foreground">{stats.total}</strong>
              </span>
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-emerald-500" />
                已优化 <strong className="text-foreground">{stats.optimized}</strong>
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-purple-500" />
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

      {/* Calendar Grid */}
      <ScrollArea className="flex-1 px-4 pb-4">
        {contentPosts.length === 0 && !isGenerating ? (
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
              AI将基于您的人设和知识库，自动生成30天朋友圈发布计划
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
          <>
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAYS.map((day) => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1.5">
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for offset */}
              {Array.from({ length: startDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-[4/3]" />
              ))}

              {/* Day cells */}
              {daysInMonth.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const post = postsByDate[dateStr];
                const today = isToday(day);
                const isSelected = selectedDate === dateStr;

                return (
                  <motion.div
                    key={dateStr}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleDayClick(dateStr)}
                    className={`
                      aspect-[4/3] rounded-lg p-1.5 cursor-pointer transition-all duration-200 relative overflow-hidden
                      ${post ? STATUS_COLORS[post.status as PostStatus] || "bg-muted/50" : "bg-muted/30"}
                      ${isSelected ? "ring-2 ring-primary shadow-lg scale-[1.02]" : ""}
                      ${today && !post ? "ring-1 ring-primary/40 bg-primary/[0.03]" : ""}
                      hover:shadow-md hover:scale-[1.01] active:scale-[0.99]
                    `}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-xs font-medium ${today ? "text-primary font-bold" : ""}`}>
                        {format(day, "d")}
                      </span>
                      {post && (
                        <div className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT_COLORS[post.status as PostStatus]}`} />
                      )}
                    </div>
                    {post && (
                      <div className="space-y-0.5">
                        <Badge
                          className={`text-[9px] px-1 py-0 h-4 leading-4 ${CONTENT_TYPE_COLORS[post.contentType as ContentType] || ""}`}
                          variant="secondary"
                        >
                          {CONTENT_TYPE_LABELS[post.contentType as ContentType] || post.contentType}
                        </Badge>
                        <p className="text-[10px] leading-tight line-clamp-2 font-medium">
                          {post.topic}
                        </p>
                        {post.aiScore > 0 && (
                          <div className="flex items-center gap-0.5">
                            <span className="text-[9px] text-amber-600 dark:text-amber-400">★</span>
                            <span className="text-[9px] text-muted-foreground">{post.aiScore}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Legend */}
            {contentPosts.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t">
                {(["planned", "generated", "optimized", "published"] as PostStatus[]).map((status) => (
                  <div key={status} className="flex items-center gap-1.5">
                    <div className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT_COLORS[status]}`} />
                    <span className="text-[10px] text-muted-foreground">{POST_STATUS_LABELS[status]}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </ScrollArea>
    </div>
  );
}
