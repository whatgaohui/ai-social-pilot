"use client";

import { motion } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import type { ContentPost } from "@/types";
import { CONTENT_TYPE_LABELS, CONTENT_TYPE_COLORS, ContentType } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock, TrendingUp, Calendar, Zap, Target,
  Lightbulb, BarChart3, Flame, Sun, Moon, Coffee, Utensils
} from "lucide-react";

interface TimeSuggestion {
  time: string;
  label: string;
  reason: string;
  score: number;
  icon: React.ReactNode;
  color: string;
}

const WEEKDAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function getDefaultSuggestions(): TimeSuggestion[] {
  return [
    {
      time: "上午 8:00-9:00",
      label: "早间通勤时段",
      reason: "用户早起浏览朋友圈，内容曝光率高",
      score: 90,
      icon: <Coffee className="h-4 w-4" />,
      color: "text-emerald-500",
    },
    {
      time: "中午 12:00-13:00",
      label: "午休碎片时间",
      reason: "午间休息，用户阅读意愿最强",
      score: 85,
      icon: <Utensils className="h-4 w-4" />,
      color: "text-amber-500",
    },
    {
      time: "晚上 20:00-22:00",
      label: "晚间黄金时段",
      reason: "晚间用户最活跃，互动率最高",
      score: 95,
      icon: <Moon className="h-4 w-4" />,
      color: "text-purple-500",
    },
  ];
}

function computeSuggestions(contentPosts: ContentPost[]): TimeSuggestion[] {
  if (contentPosts.length === 0) return [];

  const postsWithEngagement = contentPosts.filter(
    (p) => p.likes > 0 || p.comments > 0 || p.views > 0 || p.shares > 0
  );

  if (postsWithEngagement.length < 2) {
    return [];
  }

  const results: TimeSuggestion[] = [];

  // 1. Analyze by weekday - find best performing weekday
  const weekdayStats: Record<number, { total: number; count: number }> = {};
  postsWithEngagement.forEach((post) => {
    try {
      const date = new Date(post.scheduledDate);
      const dow = date.getDay();
      if (!weekdayStats[dow]) {
        weekdayStats[dow] = { total: 0, count: 0 };
      }
      weekdayStats[dow].total += post.likes + post.comments * 3 + post.shares * 5;
      weekdayStats[dow].count += 1;
    } catch {
      // skip invalid dates
    }
  });

  const bestWeekday = Object.entries(weekdayStats)
    .sort(([, a], [, b]) => (b.total / Math.max(b.count, 1)) - (a.total / Math.max(a.count, 1)))[0];

  if (bestWeekday) {
    const dow = parseInt(bestWeekday[0]);
    const avg = Math.round(bestWeekday[1].total / Math.max(bestWeekday[1].count, 1));
    const isWeekend = dow === 0 || dow === 6;

    results.push({
      time: isWeekend ? "周末全天" : `${WEEKDAY_LABELS[dow]}`,
      label: isWeekend ? "周末发布效果更佳" : `${WEEKDAY_LABELS[dow]}表现最好`,
      reason: `平均互动指数${avg}，高于其他${Math.floor(Object.keys(weekdayStats).length / 2)}天`,
      score: 92,
      icon: isWeekend ? <Sun className="h-4 w-4" /> : <Calendar className="h-4 w-4" />,
      color: isWeekend ? "text-amber-500" : "text-blue-500",
    });
  }

  // 2. Analyze by content type engagement
  const typeStats: Record<string, { total: number; count: number }> = {};
  postsWithEngagement.forEach((post) => {
    if (!typeStats[post.contentType]) {
      typeStats[post.contentType] = { total: 0, count: 0 };
    }
    typeStats[post.contentType].total += post.likes + post.comments * 3 + post.shares * 5;
    typeStats[post.contentType].count += 1;
  });

  const bestType = Object.entries(typeStats)
    .sort(([, a], [, b]) => (b.total / Math.max(b.count, 1)) - (a.total / Math.max(a.count, 1)))[0];

  if (bestType) {
    const typeName = CONTENT_TYPE_LABELS[bestType[0] as ContentType] || bestType[0];
    const avg = Math.round(bestType[1].total / Math.max(bestType[1].count, 1));
    results.push({
      time: `${typeName}`,
      label: `${typeName}互动最高`,
      reason: `平均互动指数${avg}，建议增加此类内容比例`,
      score: 88,
      icon: <Flame className="h-4 w-4" />,
      color: "text-rose-500",
    });
  }

  // 3. Best time slots based on engagement level
  const totalEngagement = postsWithEngagement.reduce(
    (sum, p) => sum + p.likes + p.comments * 3 + p.shares * 5 + p.views * 0.1, 0
  );
  const avgEngagement = totalEngagement / Math.max(postsWithEngagement.length, 1);
  const hasHighEngagement = avgEngagement > 50;

  results.push({
    time: hasHighEngagement ? "上午 8:00-9:00" : "晚上 20:00-22:00",
    label: hasHighEngagement ? "早间通勤高峰" : "晚间休闲时段",
    reason: hasHighEngagement
      ? "早间用户活跃，阅读率最高"
      : "晚间用户停留时间长，互动意愿强",
    score: hasHighEngagement ? 90 : 85,
    icon: hasHighEngagement ? <Coffee className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
    color: hasHighEngagement ? "text-emerald-500" : "text-purple-500",
  });

  return results.sort((a, b) => b.score - a.score).slice(0, 3);
}

export function TimeSuggestions() {
  const { contentPosts } = useAppStore();

  const suggestions = computeSuggestions(contentPosts);
  const finalSuggestions = suggestions.length > 0 ? suggestions : getDefaultSuggestions();

  const hasEngagementData = contentPosts.some(
    (p) => p.likes > 0 || p.comments > 0 || p.views > 0 || p.shares > 0
  );

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 content-card-hover">
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/10 flex items-center justify-center">
            <Clock className="h-4 w-4 text-emerald-500" />
          </div>
          最佳发布时间建议
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {hasEngagementData ? (
          <div className="flex items-center gap-1.5">
            <BarChart3 className="h-3 w-3 text-emerald-500" />
            <span className="text-[10px] text-muted-foreground">基于 {contentPosts.length} 条内容数据分析</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <Lightbulb className="h-3 w-3 text-amber-500" />
            <span className="text-[10px] text-muted-foreground">暂无互动数据，以下为通用建议</span>
          </div>
        )}

        <div className="space-y-2">
          {finalSuggestions.map((suggestion, index) => (
            <motion.div
              key={suggestion.time}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: index * 0.08 }}
              className="rounded-lg bg-background/80 border border-border/20 p-3 hover:shadow-sm transition-all micro-hover content-card-hover"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-8 w-8 rounded-lg bg-muted/80 flex items-center justify-center">
                    <span className={suggestion.color}>{suggestion.icon}</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">{suggestion.time}</span>
                    <Badge
                      className={`text-[9px] px-1 py-0 h-4 leading-4 ${
                        index === 0
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : "bg-muted text-muted-foreground"
                      }`}
                      variant="secondary"
                    >
                      {index === 0 ? "推荐" : `#${index + 1}`}
                    </Badge>
                  </div>
                  <p className="text-[11px] font-medium text-foreground">{suggestion.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{suggestion.reason}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="flex items-center gap-0.5">
                    <Target className="h-3 w-3 text-emerald-500" />
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{suggestion.score}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tips */}
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 p-2.5">
          <div className="flex items-start gap-2">
            <Zap className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-[10px] font-medium text-amber-700 dark:text-amber-400">运营小贴士</p>
              <p className="text-[10px] text-amber-600/80 dark:text-amber-500/70 leading-relaxed">
                {hasEngagementData
                  ? "持续积累互动数据后，建议将更加精准。工作日侧重专业内容，周末适合轻松互动。"
                  : "为内容添加模拟互动数据后，系统可基于真实表现给出更精准的发布时间建议。"}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
