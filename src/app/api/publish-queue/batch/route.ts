import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST: Batch schedule multiple posts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'items array is required (each item: { postId, scheduledAt })' },
        { status: 400 },
      );
    }

    if (items.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 items per batch' },
        { status: 400 },
      );
    }

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const item of items) {
      const { postId, scheduledAt } = item;
      if (!postId || !scheduledAt) {
        failedCount++;
        errors.push(`Missing postId or scheduledAt`);
        continue;
      }

      const date = new Date(scheduledAt);
      if (isNaN(date.getTime())) {
        failedCount++;
        errors.push(`${postId}: invalid date`);
        continue;
      }

      try {
        await db.contentPost.update({
          where: { id: postId },
          data: {
            status: 'scheduled',
            scheduledAt: date,
            scheduledDate: date.toISOString().split('T')[0],
          },
        });
        successCount++;
      } catch {
        failedCount++;
        errors.push(`${postId}: update failed`);
      }
    }

    return NextResponse.json({
      success: successCount,
      failed: failedCount,
      errors,
    });
  } catch (error) {
    console.error('Failed to batch schedule:', error);
    return NextResponse.json({ error: 'Failed to batch schedule' }, { status: 500 });
  }
}
