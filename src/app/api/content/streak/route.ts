import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Fetch all non-planned posts with their scheduled dates
    const posts = await db.contentPost.findMany({
      where: {
        status: { not: 'planned' },
      },
      select: {
        scheduledDate: true,
        status: true,
      },
      orderBy: { scheduledDate: 'asc' },
    });

    // Build a map of date -> count of posts published on that date
    const dateCountMap = new Map<string, number>();
    for (const post of posts) {
      const dateStr = post.scheduledDate; // already "YYYY-MM-DD" format
      dateCountMap.set(dateStr, (dateCountMap.get(dateStr) || 0) + 1);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = formatDate(today);

    // ─── Current streak (counting backward from today/yesterday) ───
    let currentStreak = 0;
    let checkDate = new Date(today);

    // If today has no posts yet, start checking from yesterday
    if (!(dateCountMap.has(todayStr) && dateCountMap.get(todayStr)! > 0)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dateStr = formatDate(checkDate);
      const count = dateCountMap.get(dateStr) || 0;
      if (count > 0) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // ─── Longest streak ever ───
    let longestStreak = 0;
    let tempStreak = 0;
    const sortedDates = [...dateCountMap.keys()].sort();

    if (sortedDates.length > 0) {
      let prevDate = new Date(sortedDates[0] + 'T00:00:00');
      // If first date doesn't have posts before it, start fresh
      tempStreak = 1;

      for (let i = 1; i < sortedDates.length; i++) {
        const currDate = new Date(sortedDates[i] + 'T00:00:00');
        const diffDays = Math.round(
          (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
        prevDate = currDate;
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    // ─── This week's count (Monday-Sunday) ───
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    let weekCount = 0;
    for (const [dateStr, count] of dateCountMap) {
      const d = new Date(dateStr + 'T00:00:00');
      if (d >= monday && d <= sunday) {
        weekCount += count;
      }
    }

    // ─── This month's count ───
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    let monthCount = 0;
    for (const [dateStr, count] of dateCountMap) {
      const d = new Date(dateStr + 'T00:00:00');
      if (d >= monthStart && d <= monthEnd) {
        monthCount += count;
      }
    }

    // ─── Last 35 days heatmap data ───
    const streakDates: string[] = [];
    const heatmapData: Array<{ date: string; count: number; isToday: boolean }> = [];

    for (let i = 34; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = formatDate(d);
      const count = dateCountMap.get(dateStr) || 0;
      if (count > 0) streakDates.push(dateStr);
      heatmapData.push({
        date: dateStr,
        count,
        isToday: dateStr === todayStr,
      });
    }

    // ─── Today completed ───
    const todayCompleted = (dateCountMap.get(todayStr) || 0) > 0;

    return NextResponse.json({
      currentStreak,
      longestStreak,
      weekCount,
      monthCount,
      streakDates,
      todayCompleted,
      heatmapData,
      totalPublished: posts.length,
    });
  } catch (error) {
    console.error('Failed to fetch streak data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch streak data' },
      { status: 500 }
    );
  }
}

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
