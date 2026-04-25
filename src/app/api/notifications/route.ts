import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/notifications?unread=true&type=schedule&category=system&limit=20&offset=0&archived=false
// Return notifications ordered by createdAt desc, with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const showArchived = searchParams.get('archived') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const where: Record<string, unknown> = {};
    if (unreadOnly) where.read = false;
    if (type) where.type = type;
    if (category) where.category = category;
    if (!showArchived) where.isArchived = false;

    const [notifications, total] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(Math.max(limit, 1), 200),
        skip: Math.max(offset, 0),
      }),
      db.notification.count({ where }),
    ]);

    return NextResponse.json({ notifications, total });
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// POST /api/notifications
// Create a new notification with type, category, priority
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, title, message, actionUrl, metadata, data, category, priority } = body;

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const validCategories = ['schedule', 'ai_task', 'system', 'achievement', 'reminder'];
    const validTypes = ['system', 'reminder', 'achievement', 'schedule', 'ai', 'ai_task', 'completion', 'marketing', 'publish', 'interaction', 'inspiration', 'optimize', 'polish', 'generate', 'error'];
    const validPriorities = ['high', 'medium', 'low'];

    const resolvedCategory = category && validCategories.includes(category) ? category : 'system';
    const resolvedType = type && validTypes.includes(type) ? type : 'system';
    const resolvedPriority = priority && validPriorities.includes(priority) ? priority : 'medium';

    const notification = await db.notification.create({
      data: {
        type: resolvedType,
        category: resolvedCategory,
        priority: resolvedPriority,
        title,
        message: message || '',
        actionUrl: actionUrl || '',
        metadata: metadata ? JSON.stringify(metadata) : '',
        data: data !== undefined ? (typeof data === 'string' ? data : JSON.stringify(data)) : '',
      },
    });

    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error('Failed to create notification:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}

// PUT /api/notifications
// Mark all as read: { markAllRead: true }
// Archive all read: { archiveAllRead: true }
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.markAllRead) {
      const result = await db.notification.updateMany({
        where: { read: false, isArchived: false },
        data: { read: true },
      });
      return NextResponse.json({ updated: result.count });
    }

    if (body.archiveAllRead) {
      const result = await db.notification.updateMany({
        where: { read: true, isArchived: false },
        data: { isArchived: true },
      });
      return NextResponse.json({ archived: result.count });
    }

    return NextResponse.json(
      { error: 'Invalid request. Use { markAllRead: true } or { archiveAllRead: true }' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Failed to update notifications:', error);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}

// DELETE /api/notifications
// Clear all read: { clearRead: true }
// Delete specific: { ids: string[] }
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.clearRead) {
      const result = await db.notification.deleteMany({
        where: { read: true },
      });
      return NextResponse.json({ deleted: result.count });
    }

    if (body.clearArchived) {
      const result = await db.notification.deleteMany({
        where: { isArchived: true },
      });
      return NextResponse.json({ deleted: result.count });
    }

    if (Array.isArray(body.ids) && body.ids.length > 0) {
      const result = await db.notification.deleteMany({
        where: { id: { in: body.ids } },
      });
      return NextResponse.json({ deleted: result.count });
    }

    return NextResponse.json(
      { error: 'Invalid request. Use { clearRead: true }, { clearArchived: true }, or { ids: string[] }' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Failed to delete notifications:', error);
    return NextResponse.json({ error: 'Failed to delete notifications' }, { status: 500 });
  }
}
