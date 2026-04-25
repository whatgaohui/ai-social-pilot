import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST: Auto-publish endpoint (cron-like)
// Processes due scheduled posts and returns summary
export async function POST() {
  try {
    const now = new Date();

    // 1. Process due posts
    const duePosts = await db.contentPost.findMany({
      where: {
        status: 'scheduled',
        scheduledAt: { lte: now },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    let publishedCount = 0;
    const publishedIds: string[] = [];

    for (const post of duePosts) {
      try {
        await db.contentPost.update({
          where: { id: post.id },
          data: {
            status: 'published',
            publishedAt: now,
          },
        });
        publishedCount++;
        publishedIds.push(post.id);
      } catch {
        // skip
      }
    }

    // 2. Return summary with upcoming posts info
    const upcomingPosts = await db.contentPost.findMany({
      where: {
        status: 'scheduled',
        scheduledAt: { gt: now },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 5,
    });

    // 3. Count overdue (scheduled in the past but not yet processed by this run)
    // This should be 0 after processing, but good to report
    const overdueCount = duePosts.length - publishedCount;

    return NextResponse.json({
      timestamp: now.toISOString(),
      autoPublished: publishedCount,
      overdueSkipped: overdueCount,
      publishedIds,
      nextScheduled: upcomingPosts.map((p) => ({
        id: p.id,
        topic: p.topic,
        scheduledAt: p.scheduledAt?.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Auto-publish failed:', error);
    return NextResponse.json({ error: 'Auto-publish failed' }, { status: 500 });
  }
}
