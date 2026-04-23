import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── Types ────────────────────────────────────────────────────────────────

interface ContentTypeStats {
  type: string;
  count: number;
  avgLikes: number;
  avgComments: number;
  avgShares: number;
  avgViews: number;
  avgScore: number;
  engagementRate: number; // (likes + comments + shares) / views * 100
}

interface TimeSlotStats {
  slot: string; // "06:00-09:00" etc.
  count: number;
  avgLikes: number;
  avgComments: number;
  avgEngagement: number;
}

interface WeekdayStats {
  weekday: number; // 0=周一, 6=周日
  label: string;
  count: number;
  avgEngagement: number;
  avgScore: number;
}

interface ContentGap {
  date: string;
  label: string;
  weekday: string;
  suggestedTypes: string[];
  reasoning: string;
}

interface Suggestion {
  type: string;
  topic: string;
  reasoning: string;
  expectedEngagement: number;
  confidence: number; // 0-1
}

interface RecommendationResponse {
  suggestions: Suggestion[];
  bestTimes: TimeSlotStats[];
  bestWeekdays: WeekdayStats[];
  contentGaps: ContentGap[];
  contentTypePerformance: ContentTypeStats[];
  summary: {
    totalPosts: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    avgEngagementRate: number;
    topContentType: string;
    topTimeSlot: string;
    topWeekday: string;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────

const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const TIME_SLOTS = [
  { slot: '06:00-09:00', label: '早间' },
  { slot: '09:00-12:00', label: '上午' },
  { slot: '12:00-14:00', label: '午间' },
  { slot: '14:00-17:00', label: '下午' },
  { slot: '17:00-19:00', label: '傍晚' },
  { slot: '19:00-21:00', label: '晚间' },
  { slot: '21:00-23:00', label: '深夜' },
  { slot: '23:00-06:00', label: '凌晨' },
];

const CONTENT_TYPE_SUGGESTIONS: Record<string, string[]> = {
  wechat: ['insight', 'story', 'interaction', 'image', 'text', 'mixed'],
  xiaohongshu: ['seeding', 'review', 'tutorial', 'drygoods', 'vlog', 'daily', 'recommend', 'collection'],
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  text: '纯文字', image: '图文搭配', video: '视频动态', mixed: '混合内容',
  story: '故事分享', insight: '观点洞察', interaction: '互动话题',
  seeding: '种草安利', review: '好物测评', tutorial: '教程攻略',
  drygoods: '干货知识', vlog: '生活Vlog', daily: '日常分享',
  recommend: '好物推荐', collection: '合集清单',
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function getTimeSlot(timeStr: string): string {
  if (!timeStr) return '19:00-21:00'; // default
  try {
    const date = new Date(timeStr);
    const hour = date.getHours();
    if (hour >= 6 && hour < 9) return '06:00-09:00';
    if (hour >= 9 && hour < 12) return '09:00-12:00';
    if (hour >= 12 && hour < 14) return '12:00-14:00';
    if (hour >= 14 && hour < 17) return '14:00-17:00';
    if (hour >= 17 && hour < 19) return '17:00-19:00';
    if (hour >= 19 && hour < 21) return '19:00-21:00';
    if (hour >= 21 && hour < 23) return '21:00-23:00';
    return '23:00-06:00';
  } catch {
    return '19:00-21:00';
  }
}

function getWeekday(dateStr: string): number {
  try {
    const date = new Date(dateStr + 'T00:00:00');
    const day = date.getDay();
    return day === 0 ? 6 : day - 1; // Convert to Mon=0, Sun=6
  } catch {
    return 0;
  }
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// ─── Main Handler ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform') || 'wechat';
    const days = parseInt(searchParams.get('days') || '30', 10);
    const planId = searchParams.get('planId');

    // Fetch all posts with optional filtering
    const where: Record<string, unknown> = {};
    if (platform !== 'all') where.platform = platform;
    if (planId) where.planId = planId;

    const allPosts = await db.contentPost.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { scheduledDate: 'desc' },
    });

    // If a date range is specified, filter
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    const posts = allPosts.filter((p) => p.scheduledDate >= cutoffStr);

    if (posts.length === 0) {
      // Return empty recommendations with guidance
      return NextResponse.json<RecommendationResponse>({
        suggestions: getDefaultSuggestions(platform),
        bestTimes: TIME_SLOTS.map((ts) => ({
          slot: ts.slot,
          count: 0,
          avgLikes: 0,
          avgComments: 0,
          avgEngagement: 0,
        })),
        bestWeekdays: WEEKDAY_LABELS.map((label, idx) => ({
          weekday: idx,
          label,
          count: 0,
          avgEngagement: 0,
          avgScore: 0,
        })),
        contentGaps: [],
        contentTypePerformance: [],
        summary: {
          totalPosts: 0,
          totalLikes: 0,
          totalComments: 0,
          totalShares: 0,
          avgEngagementRate: 0,
          topContentType: '',
          topTimeSlot: '19:00-21:00',
          topWeekday: '周二',
        },
      });
    }

    // ─── Analysis 1: Content Type Performance ────────────────────────────
    const typeGroups = new Map<string, typeof posts>();
    for (const p of posts) {
      const group = typeGroups.get(p.contentType) || [];
      group.push(p);
      typeGroups.set(p.contentType, group);
    }

    const contentTypePerformance: ContentTypeStats[] = [];
    for (const [type, group] of typeGroups) {
      const likes = group.map((p) => p.likes || 0);
      const comments = group.map((p) => p.comments || 0);
      const shares = group.map((p) => p.shares || 0);
      const views = group.map((p) => p.views || 0);
      const scores = group.map((p) => p.aiScore || 0);
      const totalViews = views.reduce((a, b) => a + b, 0);

      contentTypePerformance.push({
        type,
        count: group.length,
        avgLikes: Math.round(avg(likes) * 10) / 10,
        avgComments: Math.round(avg(comments) * 10) / 10,
        avgShares: Math.round(avg(shares) * 10) / 10,
        avgViews: Math.round(avg(views) * 10) / 10,
        avgScore: Math.round(avg(scores) * 10) / 10,
        engagementRate: totalViews > 0
          ? Math.round(((likes.reduce((a, b) => a + b, 0) + comments.reduce((a, b) => a + b, 0) + shares.reduce((a, b) => a + b, 0)) / totalViews) * 10000) / 100
          : 0,
      });
    }

    // Sort by engagement rate descending
    contentTypePerformance.sort((a, b) => b.engagementRate - a.engagementRate);

    // ─── Analysis 2: Time Slot Performance ───────────────────────────────
    const slotGroups = new Map<string, typeof posts>();
    for (const p of posts) {
      const slot = getTimeSlot(p.scheduledAt?.toString() || p.scheduledDate);
      const group = slotGroups.get(slot) || [];
      group.push(p);
      slotGroups.set(slot, group);
    }

    const bestTimes: TimeSlotStats[] = TIME_SLOTS.map(({ slot }) => {
      const group = slotGroups.get(slot) || [];
      const likes = group.map((p) => p.likes || 0);
      const comments = group.map((p) => p.comments || 0);
      const engagement = group.map((p) => (p.likes || 0) + (p.comments || 0) + (p.shares || 0));

      return {
        slot,
        count: group.length,
        avgLikes: Math.round(avg(likes) * 10) / 10,
        avgComments: Math.round(avg(comments) * 10) / 10,
        avgEngagement: Math.round(avg(engagement) * 10) / 10,
      };
    });

    bestTimes.sort((a, b) => b.avgEngagement - a.avgEngagement);

    // ─── Analysis 3: Weekday Performance ─────────────────────────────────
    const weekdayGroups = new Map<number, typeof posts>();
    for (const p of posts) {
      const wd = getWeekday(p.scheduledDate);
      const group = weekdayGroups.get(wd) || [];
      group.push(p);
      weekdayGroups.set(wd, group);
    }

    const bestWeekdays: WeekdayStats[] = WEEKDAY_LABELS.map((label, idx) => {
      const group = weekdayGroups.get(idx) || [];
      const engagement = group.map((p) => (p.likes || 0) + (p.comments || 0) + (p.shares || 0));
      const scores = group.map((p) => p.aiScore || 0);

      return {
        weekday: idx,
        label,
        count: group.length,
        avgEngagement: Math.round(avg(engagement) * 10) / 10,
        avgScore: Math.round(avg(scores) * 10) / 10,
      };
    });

    bestWeekdays.sort((a, b) => b.avgEngagement - a.avgEngagement);

    // ─── Analysis 4: Content Gaps (upcoming dates with no content) ──────
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const futureDays = 14;

    const postsByDate = new Map<string, typeof posts>();
    for (const p of allPosts) {
      if (p.scheduledDate >= todayStr) {
        const group = postsByDate.get(p.scheduledDate) || [];
        group.push(p);
        postsByDate.set(p.scheduledDate, group);
      }
    }

    const contentGaps: ContentGap[] = [];
    for (let i = 1; i <= futureDays; i++) {
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + i);
      const dateStr = futureDate.toISOString().split('T')[0];
      const existingPosts = postsByDate.get(dateStr) || [];

      if (existingPosts.length === 0) {
        const weekday = getWeekday(dateStr);
        const types = CONTENT_TYPE_SUGGESTIONS[platform] || CONTENT_TYPE_SUGGESTIONS.wechat;

        // Suggest types that haven't been used recently
        const recentTypes = new Set(posts.slice(0, 7).map((p) => p.contentType));
        const suggestedTypes = types.filter((t) => !recentTypes.has(t)).slice(0, 3);
        const fallbackTypes = suggestedTypes.length > 0 ? suggestedTypes : types.slice(0, 3);

        const topType = contentTypePerformance[0];
        let reasoning = `${WEEKDAY_LABELS[weekday]}尚无内容安排`;
        if (topType) {
          reasoning += `，建议使用${CONTENT_TYPE_LABELS[topType.type] || topType.type}类型（平均互动率${topType.engagementRate}%）`;
        }

        try {
          const label = `${futureDate.getMonth() + 1}月${futureDate.getDate()}日`;
          contentGaps.push({
            date: dateStr,
            label,
            weekday: WEEKDAY_LABELS[weekday],
            suggestedTypes: fallbackTypes,
            reasoning,
          });
        } catch {
          // skip invalid dates
        }
      }
    }

    // ─── Analysis 5: Smart Suggestions ──────────────────────────────────
    const suggestions: Suggestion[] = [];

    // Suggestion 1: Focus on the best performing content type
    if (contentTypePerformance.length >= 2) {
      const top = contentTypePerformance[0];
      const second = contentTypePerformance[1];
      suggestions.push({
        type: top.type,
        topic: `增加${CONTENT_TYPE_LABELS[top.type] || top.type}类型内容`,
        reasoning: `${CONTENT_TYPE_LABELS[top.type] || top.type}平均互动率${top.engagementRate}%，高于${CONTENT_TYPE_LABELS[second.type] || second.type}的${second.engagementRate}%`,
        expectedEngagement: top.avgEngagement,
        confidence: 0.85,
      });
    }

    // Suggestion 2: Optimal posting time
    const bestTime = bestTimes.find((t) => t.count > 0) || bestTimes[0];
    if (bestTime) {
      const slotLabel = TIME_SLOTS.find((ts) => ts.slot === bestTime.slot)?.label || bestTime.slot;
      suggestions.push({
        type: 'timing',
        topic: `${slotLabel}（${bestTime.slot}）发布效果最佳`,
        reasoning: `该时段平均互动${bestTime.avgEngagement}，共${bestTime.count}条内容`,
        expectedEngagement: bestTime.avgEngagement,
        confidence: 0.9,
      });
    }

    // Suggestion 3: Best weekday
    const bestDay = bestWeekdays.find((w) => w.count > 0) || bestWeekdays[0];
    if (bestDay) {
      suggestions.push({
        type: 'scheduling',
        topic: `${bestDay.label}内容表现最优`,
        reasoning: `${bestDay.label}平均互动${bestDay.avgEngagement}，AI评分${bestDay.avgScore}，建议重点排期`,
        expectedEngagement: bestDay.avgEngagement,
        confidence: 0.8,
      });
    }

    // Suggestion 4: Content gaps need filling
    if (contentGaps.length > 3) {
      suggestions.push({
        type: 'gap-fill',
        topic: `未来${futureDays}天有${contentGaps.length}天无内容安排`,
        reasoning: '建议使用AI一键排期功能补充空白日期，保持稳定的发布频率',
        expectedEngagement: 0,
        confidence: 0.95,
      });
    }

    // Suggestion 5: Content variety analysis
    const typeCounts = new Map<string, number>();
    for (const p of posts) {
      typeCounts.set(p.contentType, (typeCounts.get(p.contentType) || 0) + 1);
    }
    if (typeCounts.size > 0) {
      const maxType = [...typeCounts.entries()].sort((a, b) => b[1] - a[1])[0];
      const minType = [...typeCounts.entries()].sort((a, b) => a[1] - b[1])[0];
      if (maxType[1] > minType[1] * 3 && minType[1] < 2) {
        suggestions.push({
          type: 'variety',
          topic: `增加${CONTENT_TYPE_LABELS[minType[0]] || minType[0]}类型内容`,
          reasoning: `${CONTENT_TYPE_LABELS[maxType[0]] || maxType[0]}占${maxType[1]}条，${CONTENT_TYPE_LABELS[minType[0]] || minType[0]}仅${minType[1]}条，建议平衡内容类型`,
          expectedEngagement: 0,
          confidence: 0.7,
        });
      }
    }

    // ─── Summary ────────────────────────────────────────────────────────
    const totalLikes = posts.reduce((a, p) => a + (p.likes || 0), 0);
    const totalComments = posts.reduce((a, p) => a + (p.comments || 0), 0);
    const totalShares = posts.reduce((a, p) => a + (p.shares || 0), 0);
    const totalViews = posts.reduce((a, p) => a + (p.views || 0), 0);

    const response: RecommendationResponse = {
      suggestions,
      bestTimes,
      bestWeekdays,
      contentGaps: contentGaps.slice(0, 14), // limit to 2 weeks
      contentTypePerformance,
      summary: {
        totalPosts: posts.length,
        totalLikes,
        totalComments,
        totalShares,
        avgEngagementRate: totalViews > 0
          ? Math.round(((totalLikes + totalComments + totalShares) / totalViews) * 10000) / 100
          : 0,
        topContentType: contentTypePerformance[0]?.type || '',
        topTimeSlot: bestTime?.slot || '19:00-21:00',
        topWeekday: bestDay?.label || '周二',
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to generate content recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations', details: String(error) },
      { status: 500 },
    );
  }
}

// ─── Default suggestions for new users with no data ─────────────────────

function getDefaultSuggestions(platform: string): Suggestion[] {
  const isXHS = platform === 'xiaohongshu';
  return [
    {
      type: 'onboarding',
      topic: '开始创建你的第一条内容',
      reasoning: isXHS
        ? '建议从种草安利或干货知识类型开始，小红书用户对这类内容互动率较高'
        : '建议从观点洞察或故事分享类型开始，朋友圈读者偏好有价值的内容',
      expectedEngagement: 0,
      confidence: 1,
    },
    {
      type: 'timing',
      topic: '推荐发布时间：19:00-21:00',
      reasoning: '晚间7-9点是社交媒体活跃高峰，内容曝光率最高',
      expectedEngagement: 0,
      confidence: 0.9,
    },
    {
      type: 'frequency',
      topic: `建议每周发布${isXHS ? '4-7条' : '3-5条'}内容`,
      reasoning: isXHS
        ? '小红书算法偏好高频更新，建议每周4-7篇笔记保持活跃度'
        : '朋友圈建议每周3-5条，避免过于频繁打扰好友',
      expectedEngagement: 0,
      confidence: 0.85,
    },
  ];
}
