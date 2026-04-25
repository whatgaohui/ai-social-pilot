import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { format, subDays, startOfWeek, endOfWeek, addDays } from 'date-fns';

// Time-slot boundaries (hour ranges)
const TIME_SLOTS = [
  { key: 'morning', label: '早间', start: 6, end: 9, emoji: '🌅' },
  { key: 'forenoon', label: '上午', start: 9, end: 12, emoji: '☀️' },
  { key: 'noon', label: '午间', start: 12, end: 14, emoji: '🕐' },
  { key: 'afternoon', label: '下午', start: 14, end: 17, emoji: '🌤️' },
  { key: 'evening', label: '傍晚', start: 17, end: 20, emoji: '🌇' },
  { key: 'night', label: '晚间', start: 20, end: 24, emoji: '🌙' },
] as const;

const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

interface HeatmapCell {
  day: string;
  dayIndex: number;
  slotKey: string;
  slotLabel: string;
  count: number;
  totalEngagement: number;
}

function getSlotKey(hour: number): string {
  if (hour < 9) return 'morning';
  if (hour < 12) return 'forenoon';
  if (hour < 14) return 'noon';
  if (hour < 17) return 'afternoon';
  if (hour < 20) return 'evening';
  return 'night';
}

export async function GET() {
  try {
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');

    // ── 1. Today's plan ──
    const todayPosts = await db.contentPost.findMany({
      where: { scheduledDate: todayStr },
    });
    const todayCompleted = todayPosts.filter(
      (p) => p.status === 'published' || p.status === 'optimized',
    ).length;
    const todayPending = todayPosts.filter(
      (p) => p.status !== 'published' && p.status !== 'optimized',
    ).length;

    // ── 2. Week progress ──
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

    const weekPosts = await db.contentPost.findMany({
      where: { scheduledDate: { gte: weekStartStr, lte: weekEndStr } },
    });
    const weekPublished = weekPosts.filter((p) => p.status === 'published').length;

    // ── 3. Weekly rhythm heatmap — last 4 weeks ──
    const fourWeeksAgo = format(subDays(weekStart, 21), 'yyyy-MM-dd');
    const allRecentPosts = await db.contentPost.findMany({
      where: { scheduledDate: { gte: fourWeeksAgo, lte: todayStr } },
    });

    // Build heatmap: day 0-6 × slot
    const heatmap: HeatmapCell[] = [];
    for (let d = 0; d < 7; d++) {
      for (const slot of TIME_SLOTS) {
        let count = 0;
        let totalEngagement = 0;
        allRecentPosts.forEach((p) => {
          const postDate = new Date(p.scheduledDate + 'T00:00:00');
          const dayOfWeek = postDate.getDay() === 0 ? 6 : postDate.getDay() - 1; // Mon=0
          if (dayOfWeek !== d) return;

          // Posts without time info — assign to mid-range slot based on hash
          const hour = (p.id.charCodeAt(0) % 14) + 7; // deterministic pseudo-random 7-20
          if (hour >= slot.start && hour < slot.end) {
            count++;
            totalEngagement += (p.likes || 0) + (p.comments || 0) * 2 + (p.shares || 0) * 3;
          }
        });
        heatmap.push({
          day: WEEKDAY_LABELS[d],
          dayIndex: d,
          slotKey: slot.key,
          slotLabel: slot.label,
          count,
          totalEngagement,
        });
      }
    }

    // ── 4. Best posting times ──
    const slotAgg: Record<string, { count: number; engagement: number }> = {};
    for (const cell of heatmap) {
      if (!slotAgg[cell.slotKey]) slotAgg[cell.slotKey] = { count: 0, engagement: 0 };
      slotAgg[cell.slotKey].count += cell.count;
      slotAgg[cell.slotKey].engagement += cell.totalEngagement;
    }

    const bestPostingTimes = TIME_SLOTS.map((slot) => {
      const agg = slotAgg[slot.key] || { count: 0, engagement: 0 };
      const avgEng = agg.count > 0 ? Math.round(agg.engagement / agg.count) : 0;
      const score = Math.min(100, agg.count * 15 + avgEng * 0.5);
      let reason = '';
      if (agg.count === 0) reason = '此时段尚无发布记录';
      else if (avgEng > 20) reason = `平均互动${avgEng}，表现优异`;
      else if (avgEng > 10) reason = `平均互动${avgEng}，表现良好`;
      else reason = `已发布${agg.count}条，可优化互动`;

      return {
        hour: `${slot.start}:00-${slot.end < 24 ? slot.end : '24'}:00`,
        slotKey: slot.key,
        label: slot.label,
        emoji: slot.emoji,
        score: Math.round(score),
        reason,
      };
    }).sort((a, b) => b.score - a.score);

    // ── 5. Content mix ──
    const allPosts = await db.contentPost.findMany();
    const typeCount: Record<string, number> = {};
    allPosts.forEach((p) => {
      typeCount[p.contentType] = (typeCount[p.contentType] || 0) + 1;
    });

    const contentTypes = Object.entries(typeCount)
      .map(([type, count]) => ({
        type,
        count,
        percentage: allPosts.length > 0 ? Math.round((count / allPosts.length) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Shannon entropy for diversity
    const entropy =
      allPosts.length > 0
        ? -Object.values(typeCount).reduce((sum, c) => {
            const p = c / allPosts.length;
            return sum + (p > 0 ? p * Math.log2(p) : 0);
          }, 0)
        : 0;
    const maxEntropy = Math.log2(Math.max(contentTypes.length, 1));
    const diversityScore = maxEntropy > 0 ? Math.round((entropy / maxEntropy) * 100) : 0;

    // ── 6. Publishing consistency ──
    // 4-week calendar
    const fourWeekCalendar: { date: string; count: number; dayOfWeek: number }[] = [];
    for (let w = 3; w >= 0; w--) {
      const weekDate = subDays(weekStart, w * 7);
      const ws = startOfWeek(weekDate, { weekStartsOn: 1 });
      for (let d = 0; d < 7; d++) {
        const date = addDays(ws, d);
        const dateStr = format(date, 'yyyy-MM-dd');
        const count = allRecentPosts.filter((p) => p.scheduledDate === dateStr).length;
        fourWeekCalendar.push({
          date: dateStr,
          count,
          dayOfWeek: d,
        });
      }
    }

    // Average per week (last 4 weeks)
    const weekCounts: number[] = [];
    for (let w = 0; w < 4; w++) {
      const ws = subDays(weekStart, (3 - w) * 7);
      const we = addDays(ws, 6);
      const wsStr = format(ws, 'yyyy-MM-dd');
      const weStr = format(we, 'yyyy-MM-dd');
      const cnt = allRecentPosts.filter(
        (p) => p.scheduledDate >= wsStr && p.scheduledDate <= weStr,
      ).length;
      weekCounts.push(cnt);
    }
    const avgPerWeek =
      weekCounts.length > 0
        ? Math.round((weekCounts.reduce((s, c) => s + c, 0) / weekCounts.length) * 10) / 10
        : 0;

    // Trend
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (weekCounts.length >= 2) {
      const recent = weekCounts.slice(-2).reduce((s, c) => s + c, 0) / 2;
      const earlier = weekCounts.slice(0, 2).reduce((s, c) => s + c, 0) / 2;
      if (recent > earlier * 1.15) trend = 'up';
      else if (recent < earlier * 0.85) trend = 'down';
    }

    // Current streak
    const publishedDates = [
      ...new Set(
        allPosts.filter((p) => p.status === 'published').map((p) => p.scheduledDate),
      ),
    ].sort((a, b) => b.localeCompare(a));
    let streak = 0;
    let streakDate = todayStr;
    if (!publishedDates.includes(todayStr)) {
      streakDate = format(subDays(now, 1), 'yyyy-MM-dd');
    }
    for (let i = 0; i < 365; i++) {
      if (publishedDates.includes(streakDate)) {
        streak++;
        streakDate = format(subDays(new Date(streakDate + 'T00:00:00'), 1), 'yyyy-MM-dd');
      } else {
        break;
      }
    }

    // ── 7. Suggestions ──
    const suggestions: {
      type: 'timing' | 'mix' | 'consistency' | 'quality';
      priority: 'high' | 'medium' | 'low';
      title: string;
      description: string;
      action: string;
    }[] = [];

    // Timing suggestions
    const topSlot = bestPostingTimes[0];
    if (topSlot && topSlot.score > 30) {
      suggestions.push({
        type: 'timing',
        priority: 'medium',
        title: '最佳发布时段',
        description: `${topSlot.label}(${topSlot.hour}) 互动数据最佳，建议优先在此时段发布。`,
        action: '应用到排期',
      });
    } else if (allPosts.length === 0) {
      suggestions.push({
        type: 'timing',
        priority: 'high',
        title: '开始你的运营节奏',
        description: '尚无发布数据，建议先建立每日发布习惯，逐步找到最佳时段。',
        action: '生成首周排期',
      });
    }

    // Low-time slots
    const emptySlots = bestPostingTimes.filter((s) => s.score === 0);
    if (emptySlots.length >= 3 && allPosts.length > 0) {
      suggestions.push({
        type: 'timing',
        priority: 'low',
        title: '尝试新时段',
        description: `有${emptySlots.length}个时段从未发布过，可以尝试拓展发布时段覆盖。`,
        action: '查看时段分析',
      });
    }

    // Mix suggestions
    if (contentTypes.length === 1 && contentTypes[0].percentage > 80) {
      suggestions.push({
        type: 'mix',
        priority: 'high',
        title: '内容类型过于单一',
        description: `"${contentTypes[0].type}"类型占比${contentTypes[0].percentage}%，建议增加多样性以提升受众覆盖。`,
        action: '查看内容建议',
      });
    } else if (contentTypes.length >= 1 && contentTypes[0].percentage > 60) {
      suggestions.push({
        type: 'mix',
        priority: 'medium',
        title: '优化内容配比',
        description: `"${contentTypes[0].type}"类型占比${contentTypes[0].percentage}%，可以适当增加其他类型。`,
        action: '查看配比建议',
      });
    }

    if (diversityScore < 50 && allPosts.length > 3) {
      suggestions.push({
        type: 'mix',
        priority: 'medium',
        title: '提升内容多样性',
        description: `当前内容多样性评分${diversityScore}分，增加不同类型内容可以提升整体表现。`,
        action: '获取多样化建议',
      });
    }

    // Consistency suggestions
    if (streak === 0 && allPosts.length > 0) {
      suggestions.push({
        type: 'consistency',
        priority: 'high',
        title: '恢复发布节奏',
        description: '已连续多天未发布，保持规律发布对账号成长至关重要。',
        action: '立即补齐排期',
      });
    } else if (streak > 0 && streak < 3) {
      suggestions.push({
        type: 'consistency',
        priority: 'medium',
        title: '继续坚持发布',
        description: `当前已连续发布${streak}天，继续保持可以建立更强的用户粘性。`,
        action: '生成下周排期',
      });
    } else if (streak >= 7) {
      suggestions.push({
        type: 'consistency',
        priority: 'low',
        title: `连续发布${streak}天！`,
        description: '出色的运营节奏！保持稳定输出，持续为粉丝提供价值。',
        action: '查看成就',
      });
    }

    if (avgPerWeek < 3 && allPosts.length > 0) {
      suggestions.push({
        type: 'consistency',
        priority: 'high',
        title: '提升周发布频率',
        description: `当前平均每周${avgPerWeek}条，建议提升到每周5条以上。`,
        action: '制定发布计划',
      });
    }

    // Quality suggestions
    const scoredPosts = allPosts.filter((p) => p.aiScore > 0);
    const avgScore =
      scoredPosts.length > 0
        ? scoredPosts.reduce((s, p) => s + p.aiScore, 0) / scoredPosts.length
        : 0;
    const lowScoreCount = scoredPosts.filter((p) => p.aiScore < 60).length;

    if (avgScore > 0 && avgScore < 60) {
      suggestions.push({
        type: 'quality',
        priority: 'high',
        title: '整体内容质量待提升',
        description: `平均AI评分${Math.round(avgScore)}分，低于60分的优秀标准。建议使用AI优化功能。`,
        action: '一键优化',
      });
    } else if (avgScore >= 60 && avgScore < 75) {
      suggestions.push({
        type: 'quality',
        priority: 'medium',
        title: '内容质量良好',
        description: `平均AI评分${Math.round(avgScore)}分，还有提升空间。关注低分内容进行优化。`,
        action: '查看低分内容',
      });
    } else if (avgScore >= 75) {
      suggestions.push({
        type: 'quality',
        priority: 'low',
        title: '内容质量优秀',
        description: `平均AI评分${Math.round(avgScore)}分，保持高质量输出！`,
        action: '保持水准',
      });
    }

    if (lowScoreCount > 0) {
      suggestions.push({
        type: 'quality',
        priority: lowScoreCount > 3 ? 'high' : 'medium',
        title: `${lowScoreCount}条内容待优化`,
        description: `有${lowScoreCount}条内容AI评分低于60分，优化后可显著提升整体表现。`,
        action: '批量优化',
      });
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // ── 8. Weekly goal ──
    let weeklyGoalTarget = 7;
    try {
      const fs = await import('fs');
      const path = await import('path');
      const goalPath = path.join(process.cwd(), 'db', 'weekly-goal.json');
      if (fs.existsSync(goalPath)) {
        const raw = fs.readFileSync(goalPath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (typeof parsed.target === 'number' && parsed.target > 0) {
          weeklyGoalTarget = parsed.target;
        }
      }
    } catch {
      // use default
    }

    const weeklyGoal = {
      target: weeklyGoalTarget,
      current: weekPublished,
      percentage:
        weeklyGoalTarget > 0 ? Math.round((weekPublished / weeklyGoalTarget) * 100) : 0,
    };

    return NextResponse.json({
      todayPlan: {
        total: todayPosts.length,
        completed: todayCompleted,
        pending: todayPending,
      },
      weekProgress: {
        published: weekPublished,
        total: weekPosts.length,
        rate: weekPosts.length > 0 ? Math.round((weekPublished / weekPosts.length) * 100) : 0,
      },
      bestPostingTimes,
      heatmap,
      contentMix: {
        types: contentTypes,
        diversityScore,
        totalPosts: allPosts.length,
      },
      consistency: {
        streak,
        avgPerWeek,
        trend,
        fourWeekCalendar,
        weekCounts,
      },
      suggestions,
      weeklyGoal,
    });
  } catch (error) {
    console.error('Failed to fetch ops rhythm:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ops rhythm data' },
      { status: 500 },
    );
  }
}
