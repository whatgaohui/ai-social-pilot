import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: List queued/scheduled posts with pagination and date range filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const platform = searchParams.get('platform') || undefined;
    const status = searchParams.get('status') || 'scheduled'; // default: scheduled
    const overdue = searchParams.get('overdue') === 'true';

    const skip = (page - 1) * limit;
    const now = new Date();

    // Build where clause
    const where: Record<string, unknown> = {};
    if (status === 'all') {
      where.status = { in: ['scheduled', 'optimized', 'generated'] };
    } else {
      where.status = status;
    }
    if (platform) {
      where.platform = platform;
    }
    if (startDate && endDate) {
      where.scheduledAt = { gte: new Date(startDate), lte: new Date(endDate) };
    } else if (startDate) {
      where.scheduledAt = { gte: new Date(startDate) };
    } else if (endDate) {
      where.scheduledAt = { lte: new Date(endDate) };
    }
    if (overdue) {
      where.scheduledAt = { lt: now };
      where.status = 'scheduled';
    }

    const [posts, total] = await Promise.all([
      db.contentPost.findMany({
        where,
        orderBy: { scheduledAt: 'asc' },
        skip,
        take: limit,
      }),
      db.contentPost.count({ where }),
    ]);

    // Compute stats
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(todayStart);
    const dayOfWeek = weekStart.getDay() || 7;
    weekStart.setDate(weekStart.getDate() - dayOfWeek + 1);

    const [totalScheduled, todayScheduled, weekScheduled, overdueCount] = await Promise.all([
      db.contentPost.count({ where: { status: 'scheduled' } }),
      db.contentPost.count({
        where: {
          status: 'scheduled',
          scheduledAt: { gte: todayStart, lt: new Date(todayStart.getTime() + 86400000) },
        },
      }),
      db.contentPost.count({
        where: {
          status: 'scheduled',
          scheduledAt: { gte: weekStart },
        },
      }),
      db.contentPost.count({
        where: {
          status: 'scheduled',
          scheduledAt: { lt: now },
        },
      }),
    ]);

    // Platform composition for mini donut chart
    const wechatCount = await db.contentPost.count({
      where: { status: 'scheduled', platform: 'wechat' },
    });
    const xhsCount = await db.contentPost.count({
      where: { status: 'scheduled', platform: 'xiaohongshu' },
    });

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        totalScheduled,
        todayScheduled,
        weekScheduled,
        overdue: overdueCount,
      },
      composition: {
        wechat: wechatCount,
        xiaohongshu: xhsCount,
      },
    });
  } catch (error) {
    console.error('Failed to fetch publish queue:', error);
    return NextResponse.json({ error: 'Failed to fetch publish queue' }, { status: 500 });
  }
}

// POST: Schedule a post for publishing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId, scheduledAt, repeatMode } = body;

    if (!postId || !scheduledAt) {
      return NextResponse.json(
        { error: 'postId and scheduledAt are required' },
        { status: 400 },
      );
    }

    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json({ error: 'Invalid scheduledAt date' }, { status: 400 });
    }

    // Update the post to scheduled status
    const post = await db.contentPost.update({
      where: { id: postId },
      data: {
        status: 'scheduled',
        scheduledAt: scheduledDate,
        scheduledDate: scheduledDate.toISOString().split('T')[0],
      },
    });

    // If repeat mode, create additional scheduled posts
    let createdPosts = [];
    if (repeatMode && repeatMode !== 'none' && post.topic) {
      const count = repeatMode === 'daily' ? 6 : repeatMode === 'weekly' ? 3 : 0;
      const intervalMs = repeatMode === 'daily' ? 86400000 : 604800000;

      for (let i = 1; i <= count; i++) {
        const nextDate = new Date(scheduledDate.getTime() + intervalMs * i);
        try {
          const newPost = await db.contentPost.create({
            data: {
              planId: post.planId,
              scheduledDate: nextDate.toISOString().split('T')[0],
              platform: post.platform,
              contentType: post.contentType,
              topic: post.topic,
              content: post.content,
              status: 'scheduled',
              generationType: post.generationType,
              scheduledAt: nextDate,
            },
          });
          createdPosts.push(newPost);
        } catch {
          // skip failed duplicate creation
        }
      }
    }

    return NextResponse.json({
      post,
      createdRepeats: createdPosts,
    });
  } catch (error) {
    console.error('Failed to schedule post:', error);
    return NextResponse.json({ error: 'Failed to schedule post' }, { status: 500 });
  }
}

// PUT: Update scheduled time or cancel schedule
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId, scheduledAt, action } = body;

    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 });
    }

    if (action === 'cancel') {
      // Cancel schedule: set status back to previous or planned
      const post = await db.contentPost.update({
        where: { id: postId },
        data: {
          status: 'planned',
          scheduledAt: null,
        },
      });
      return NextResponse.json(post);
    }

    if (action === 'reschedule' && scheduledAt) {
      const newDate = new Date(scheduledAt);
      if (isNaN(newDate.getTime())) {
        return NextResponse.json({ error: 'Invalid scheduledAt date' }, { status: 400 });
      }
      const post = await db.contentPost.update({
        where: { id: postId },
        data: {
          scheduledAt: newDate,
          scheduledDate: newDate.toISOString().split('T')[0],
        },
      });
      return NextResponse.json(post);
    }

    // Default: update scheduledAt
    if (scheduledAt) {
      const newDate = new Date(scheduledAt);
      if (isNaN(newDate.getTime())) {
        return NextResponse.json({ error: 'Invalid scheduledAt date' }, { status: 400 });
      }
      const post = await db.contentPost.update({
        where: { id: postId },
        data: {
          scheduledAt: newDate,
          scheduledDate: newDate.toISOString().split('T')[0],
          status: 'scheduled',
        },
      });
      return NextResponse.json(post);
    }

    return NextResponse.json({ error: 'No valid action specified' }, { status: 400 });
  } catch (error) {
    console.error('Failed to update publish queue:', error);
    return NextResponse.json({ error: 'Failed to update publish queue' }, { status: 500 });
  }
}
