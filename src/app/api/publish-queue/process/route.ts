import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST: Process due posts (status → published, set publishedAt)
export async function POST() {
  try {
    const now = new Date();

    // Find all scheduled posts whose scheduledAt has passed
    const duePosts = await db.contentPost.findMany({
      where: {
        status: 'scheduled',
        scheduledAt: { lte: now },
      },
    });

    if (duePosts.length === 0) {
      return NextResponse.json({
        processed: 0,
        message: 'No due posts to process',
      });
    }

    // Update each due post to published
    let processedCount = 0;
    const failedIds: string[] = [];

    for (const post of duePosts) {
      try {
        await db.contentPost.update({
          where: { id: post.id },
          data: {
            status: 'published',
            publishedAt: now,
          },
        });
        processedCount++;
      } catch {
        failedIds.push(post.id);
      }
    }

    return NextResponse.json({
      processed: processedCount,
      failed: failedIds.length,
      failedIds,
      totalDue: duePosts.length,
      message: processedCount > 0
        ? `Successfully published ${processedCount} post${processedCount > 1 ? 's' : ''}`
        : 'No posts were processed',
    });
  } catch (error) {
    console.error('Failed to process due posts:', error);
    return NextResponse.json({ error: 'Failed to process due posts' }, { status: 500 });
  }
}
