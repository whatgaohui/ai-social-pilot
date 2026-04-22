import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';

export async function GET() {
  try {
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');

    // ── 1. Today's pending publish count ──
    const todayPending = await db.contentPost.count({
      where: {
        scheduledDate: todayStr,
        status: { not: 'published' },
      },
    });

    // ── 2. Weekly completion rate ──
    const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');

    const weekPosts = await db.contentPost.findMany({
      where: {
        scheduledDate: { gte: weekStart, lte: weekEnd },
      },
    });

    const weekCompleted = weekPosts.filter(
      (p) => p.status === 'published' || p.status === 'optimized',
    ).length;
    const weeklyCompletionRate =
      weekPosts.length > 0
        ? Math.round((weekCompleted / weekPosts.length) * 100)
        : 0;

    // ── 3. Average AI score ──
    const scoredPosts = await db.contentPost.findMany({
      where: { aiScore: { gt: 0 } },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    const avgAIScore =
      scoredPosts.length > 0
        ? Math.round(
            scoredPosts.reduce((s, p) => s + p.aiScore, 0) / scoredPosts.length,
          )
        : 0;

    // ── 4. Current streak: consecutive days with at least one published post ──
    // Fetch all published posts sorted by scheduledDate desc
    const publishedPosts = await db.contentPost.findMany({
      where: { status: 'published' },
      orderBy: { scheduledDate: 'desc' },
      select: { scheduledDate: true },
    });

    // Get unique dates
    const uniqueDates = [...new Set(publishedPosts.map((p) => p.scheduledDate))].sort(
      (a, b) => b.localeCompare(a),
    );

    // Count consecutive days ending at today (or yesterday if nothing today)
    let currentStreak = 0;
    let checkDate = todayStr;
    // If nothing published today, start checking from yesterday
    if (!uniqueDates.includes(todayStr)) {
      checkDate = format(subDays(now, 1), 'yyyy-MM-dd');
    }
    for (let i = 0; i < 365; i++) {
      if (uniqueDates.includes(checkDate)) {
        currentStreak++;
        checkDate = format(subDays(new Date(checkDate + 'T00:00:00'), 1), 'yyyy-MM-dd');
      } else {
        break;
      }
    }

    // ── 5. Best streak ──
    // Sort dates ascending to find the longest consecutive run
    const sortedDates = [...uniqueDates].sort((a, b) => a.localeCompare(b));
    let bestStreak = 0;
    let tempStreak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(sortedDates[i - 1] + 'T00:00:00');
      const currDate = new Date(sortedDates[i] + 'T00:00:00');
      const diffDays = Math.round(
        (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diffDays === 1) {
        tempStreak++;
      } else {
        bestStreak = Math.max(bestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    bestStreak = Math.max(bestStreak, tempStreak);

    // ── 6. Weekly data for heatmap ──
    const weekStartDate = startOfWeek(now, { weekStartsOn: 1 });
    const weeklyData = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStartDate, i);
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayPosts = weekPosts.filter((p) => p.scheduledDate === dayStr);
      const dayPublished = dayPosts.filter((p) => p.status === 'published');
      const dayScoreAvg =
        dayPosts.length > 0
          ? dayPosts.reduce((s, p) => s + p.aiScore, 0) / dayPosts.length
          : 0;

      weeklyData.push({
        day: format(day, 'EEE'),
        date: dayStr,
        count: dayPublished.length,
        score: Math.round(dayScoreAvg),
        isToday: dayStr === todayStr,
      });
    }

    // ── 7. Recent 3 scores for sparkline ──
    const recentScored = await db.contentPost.findMany({
      where: { aiScore: { gt: 0 } },
      orderBy: { updatedAt: 'desc' },
      take: 3,
      select: { aiScore: true },
    });
    const recentScores = recentScored.map((p) => Math.round(p.aiScore));

    return NextResponse.json({
      todayPending,
      weeklyCompletionRate,
      avgAIScore,
      currentStreak,
      bestStreak,
      weeklyData,
      recentScores,
    });
  } catch (error) {
    console.error('Failed to fetch quick stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quick stats' },
      { status: 500 },
    );
  }
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
