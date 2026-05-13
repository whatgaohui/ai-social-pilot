import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/tracked-accounts/:id/notes - Get notes imported from this tracked account
// Returns all scraped ContentPosts matching this account's platform.
// Supports pagination via ?page=1&limit=20
// Supports search via ?search=keyword
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    // Check existence
    const account = await db.trackedAccount.findUnique({ where: { id } });
    if (!account) {
      return NextResponse.json({ error: '账号不存在' }, { status: 404 });
    }

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    // Search filter
    const search = searchParams.get('search')?.trim() || '';

    // Build where clause
    const where: Record<string, unknown> = {
      platform: account.platform,
      generationType: 'scraped',
      sourceAccountId: account.id,
    };

    if (search) {
      where.OR = [
        { topic: { contains: search } },
        { content: { contains: search } },
      ];
    }

    // Get sync task date range for more precise filtering
    // Only consider posts created after the first sync and before the last sync
    const syncTasks = await db.syncTask.findMany({
      where: { trackedAccountId: id },
      select: { createdAt: true, finishedAt: true },
      orderBy: { createdAt: 'asc' },
    });

    if (syncTasks.length > 0) {
      const earliestSync = syncTasks[0].createdAt;
      // Filter posts created after the earliest sync task
      // Note: ContentPost.createdAt is the creation time in our DB,
      // not the original post date. For better accuracy we could use scheduledDate.
      // For now, we just filter by platform + generationType.
    }

    // Query posts
    const [posts, total] = await Promise.all([
      db.contentPost.findMany({
        where,
        orderBy: { scheduledDate: 'desc' },
        skip,
        take: limit,
      }),
      db.contentPost.count({ where }),
    ]);

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      account: {
        id: account.id,
        nickname: account.nickname,
        platform: account.platform,
      },
    });
  } catch (error) {
    console.error('Failed to fetch tracked account notes:', error);
    return NextResponse.json({ error: '获取采集笔记失败' }, { status: 500 });
  }
}
