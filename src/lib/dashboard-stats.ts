import type { XhsAccountInfo, XhsPostInfo } from "@/types";
import {
  Database,
  FileText,
  TrendingUp,
  Target,
  Zap,
  Lightbulb,
  Calendar,
  Users,
  Sparkles,
  BarChart3,
  Rocket,
  Heart,
} from "lucide-react";

export type DateRange = 7 | 30 | 90;

/** Activity feed item type */
export interface ActivityItem {
  id: string;
  icon: React.ElementType;
  iconBg: string;
  text: string;
  time: Date;
  type: "data" | "post" | "ai" | "export";
}

/** AI Strategy recommendation type */
export interface StrategyRecommendation {
  id: string;
  icon: string;
  title: string;
  description: string;
  priority: "高" | "中" | "低";
}

/** Icon mapping for strategy recommendations */
export const strategyIconMap: Record<string, React.ElementType> = {
  TrendingUp,
  Target,
  Zap,
  Lightbulb,
  Calendar,
  Users,
  Sparkles,
  BarChart3,
  Rocket,
  Heart,
};

/** Activity type border color mapping */
export const activityBorderColor: Record<ActivityItem["type"], string> = {
  data: "border-l-blue-400 dark:border-l-blue-500",
  post: "border-l-amber-400 dark:border-l-amber-500",
  ai: "border-l-purple-400 dark:border-l-purple-500",
  export: "border-l-emerald-400 dark:border-l-emerald-500",
};

/** Generate activity feed from real account/post events */
export function generateActivityFeed(
  accounts: (XhsAccountInfo & { postsCount?: number })[],
  posts: XhsPostInfo[]
): ActivityItem[] {
  const activities: ActivityItem[] = [];

  accounts.forEach((acc) => {
    if (acc.status === "success" || acc.status === "partial") {
      const scrapeTime = acc.lastScrapedAt ? new Date(acc.lastScrapedAt) : null;
      activities.push({
        id: `acc-${acc.id}`,
        icon: Database,
        iconBg: "stat-icon-gradient-emerald",
        text: `${acc.nickname || "账号"} 数据已采集`,
        time: scrapeTime || new Date(),
        type: "data",
      });
    }
  });

  posts
    .filter((p) => p.publishDate)
    .slice(0, 3)
    .forEach((post) => {
      activities.push({
        id: `post-${post.id}`,
        icon: FileText,
        iconBg: "stat-icon-gradient-amber",
        text: `新笔记发布：${(post.title || "无标题").slice(0, 15)}...`,
        time: new Date(post.publishDate),
        type: "post",
      });
    });

  return activities
    .sort((a, b) => b.time.getTime() - a.time.getTime())
    .slice(0, 6);
}

/** Format relative time in Chinese */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  return `${diffDay}天前`;
}

/** Generate sparkline data for stat cards from real posts */
export function generateStatSparklineData(
  posts: XhsPostInfo[],
  key: string
): number[] {
  if (!posts || posts.length === 0) return [0, 0, 0, 0, 0, 0, 0];

  const sorted = [...posts].sort((a, b) => {
    if (a.publishDate && b.publishDate)
      return a.publishDate.localeCompare(b.publishDate);
    return 0;
  });
  const recent = sorted.slice(-7);

  const data = recent.map((p) => {
    switch (key) {
      case "posts":
        return 1;
      case "engagement":
        return (p.likes || 0) + (p.comments || 0) + (p.collects || 0);
      case "accounts":
        return 1;
      case "rate": {
        const total = (p.likes || 0) + (p.comments || 0) + (p.collects || 0);
        return total > 0 ? parseFloat(((total / 1) * 0.1).toFixed(1)) : 0;
      }
      default:
        return (p.likes || 0) + (p.comments || 0) + (p.collects || 0);
    }
  });

  while (data.length < 7) data.unshift(0);
  return data;
}

/** Calculate real trend from posts data by comparing first half vs second half */
export function calculateTrend(
  posts: XhsPostInfo[],
  key: string,
  _range: DateRange
): { value: number; isPositive: boolean } {
  if (posts.length < 2) return { value: 0, isPositive: true };

  const sorted = [...posts].sort((a, b) => {
    if (a.publishDate && b.publishDate)
      return a.publishDate.localeCompare(b.publishDate);
    return 0;
  });

  const mid = Math.max(1, Math.floor(sorted.length / 2));
  const older = sorted.slice(0, mid);
  const newer = sorted.slice(mid);

  const getMetric = (p: XhsPostInfo) => {
    switch (key) {
      case "accounts":
        return 1;
      case "posts":
        return 1;
      case "engagement":
        return (p.likes || 0) + (p.comments || 0) + (p.collects || 0);
      case "rate":
        return (p.likes || 0) + (p.comments || 0) + (p.collects || 0);
      default:
        return (p.likes || 0) + (p.comments || 0) + (p.collects || 0);
    }
  };

  const olderAvg = older.reduce((s, p) => s + getMetric(p), 0) / older.length;
  const newerAvg = newer.reduce((s, p) => s + getMetric(p), 0) / newer.length;

  if (olderAvg === 0)
    return { value: 0, isPositive: newerAvg > 0 };

  const pctChange = ((newerAvg - olderAvg) / olderAvg) * 100;
  return {
    value: parseFloat(Math.abs(pctChange).toFixed(1)),
    isPositive: pctChange >= 0,
  };
}

/** Analyze posting times from posts data */
export function analyzePostingTimes(posts: XhsPostInfo[]): {
  bestTime: string | null;
  reason: string;
  timeSlots: string[];
} {
  if (posts.length === 0)
    return { bestTime: null, reason: "", timeSlots: [] };

  const timeEngagement: Record<
    string,
    { count: number; totalEngagement: number }
  > = {};

  const timeSlotLabels: Record<string, string> = {
    morning: "早间 7:00-9:00",
    midday: "午间 11:00-13:00",
    afternoon: "下午 15:00-17:00",
    evening: "晚间 19:00-21:00",
    night: "夜间 22:00-24:00",
  };

  for (const post of posts) {
    if (!post.publishDate) continue;
    const date = new Date(post.publishDate);
    const hour = date.getHours();
    const engagement = post.likes + post.comments + post.collects;

    let slot: string;
    if (hour >= 7 && hour < 9) slot = "morning";
    else if (hour >= 11 && hour < 13) slot = "midday";
    else if (hour >= 15 && hour < 17) slot = "afternoon";
    else if (hour >= 19 && hour < 21) slot = "evening";
    else if (hour >= 22) slot = "night";
    else slot = "other";

    if (!timeEngagement[slot]) {
      timeEngagement[slot] = { count: 0, totalEngagement: 0 };
    }
    timeEngagement[slot].count++;
    timeEngagement[slot].totalEngagement += engagement;
  }

  let bestSlot = "";
  let bestAvg = 0;

  for (const [slot, data] of Object.entries(timeEngagement)) {
    if (slot === "other") continue;
    const avg = data.count > 0 ? data.totalEngagement / data.count : 0;
    if (avg > bestAvg) {
      bestAvg = avg;
      bestSlot = slot;
    }
  }

  if (!bestSlot || bestAvg === 0) {
    return {
      bestTime: "晚间 19:00-21:00",
      reason: "根据小红书平台用户活跃数据，晚间是最佳发布时段",
      timeSlots: ["早间 7:00-9:00", "午间 11:00-13:00", "晚间 19:00-21:00"],
    };
  }

  const slots = Object.entries(timeEngagement)
    .filter(([slot]) => slot !== "other")
    .sort(
      ([, a], [, b]) => b.totalEngagement / b.count - a.totalEngagement / a.count
    )
    .slice(0, 3)
    .map(([slot]) => timeSlotLabels[slot] || slot)
    .filter(Boolean);

  return {
    bestTime: timeSlotLabels[bestSlot] || bestSlot,
    reason: `该时段平均互动量最高（${Math.round(bestAvg)}），已有 ${timeEngagement[bestSlot].count} 篇笔记验证`,
    timeSlots: slots,
  };
}

/** Generate sparkline data based on account metrics */
export function generateSparklineData(account: XhsAccountInfo): number[] {
  const base = account.followers > 0 ? Math.round(account.followers * 0.01) : 10;
  const data: number[] = [];
  for (let i = 0; i < 7; i++) {
    const variation = Math.round(
      base * (0.6 + Math.sin(i * 1.2 + account.followers * 0.001) * 0.4)
    );
    data.push(Math.max(variation, 1));
  }
  return data;
}

/** Stat card gradient backgrounds */
export const statCardGradients: Record<string, string> = {
  accounts:
    "bg-gradient-to-br from-rose-50/80 to-rose-100/30 dark:from-rose-950/20 dark:to-rose-950/5",
  posts:
    "bg-gradient-to-br from-amber-50/80 to-amber-100/30 dark:from-amber-950/20 dark:to-amber-950/5",
  engagement:
    "bg-gradient-to-br from-emerald-50/80 to-emerald-100/30 dark:from-emerald-950/20 dark:to-emerald-950/5",
  rate: "bg-gradient-to-br from-xhs-50/80 to-xhs-100/30 dark:from-xhs-950/20 dark:to-xhs-950/5",
};

/** Priority badge colors */
export const priorityBadgeStyle: Record<string, string> = {
  高: "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200/50 dark:border-red-900/30",
  中: "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/30",
  低: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-900/30",
};

/** Date range labels */
export const dateRangeLabels: Record<DateRange, string> = {
  7: "近7天",
  30: "近30天",
  90: "近90天",
};
