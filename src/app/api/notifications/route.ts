import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/notifications?unread=true&type=schedule&category=system&limit=20
// Return notifications ordered by createdAt desc
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: { read?: boolean; type?: string; category?: string } = {};
    if (unreadOnly) where.read = false;
    if (type) where.type = type;
    if (category) where.category = category;

    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 200),
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// POST /api/notifications
// Create a new notification with optional category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, title, message, actionUrl, metadata, data, category } = body;

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const validCategories = ['schedule', 'ai_task', 'system', 'achievement', 'reminder'];
    const resolvedCategory = category && validCategories.includes(category) ? category : 'system';

    // Build data object with known fields
    const notification = await db.notification.create({
      data: {
        type: type || 'system',
        category: resolvedCategory,
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
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.markAllRead) {
      const result = await db.notification.updateMany({
        where: { read: false },
        data: { read: true },
      });
      return NextResponse.json({ updated: result.count });
    }

    return NextResponse.json(
      { error: 'Invalid request. Use { markAllRead: true } or POST to /api/notifications/mark-read' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Failed to update notifications:', error);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}

// DELETE /api/notifications
// Clear all read notifications: { clearRead: true }
// Delete specific notifications: { ids: string[] }
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.clearRead) {
      const result = await db.notification.deleteMany({
        where: { read: true },
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
      { error: 'Invalid request. Use { clearRead: true } or { ids: string[] }' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Failed to delete notifications:', error);
    return NextResponse.json({ error: 'Failed to delete notifications' }, { status: 500 });
  }
}
