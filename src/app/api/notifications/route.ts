import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/notifications?unread=true
// Return notifications ordered by createdAt desc
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';

    const where = unreadOnly ? { read: false } : {};

    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// POST /api/notifications
// Create a new notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, title, message, actionUrl, metadata } = body;

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const notification = await db.notification.create({
      data: {
        type: type || 'system',
        title,
        message: message || '',
        actionUrl: actionUrl || '',
        metadata: metadata ? JSON.stringify(metadata) : '',
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

    return NextResponse.json({ error: 'Invalid request. Use { markAllRead: true }' }, { status: 400 });
  } catch (error) {
    console.error('Failed to update notifications:', error);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}

// DELETE /api/notifications
// Clear all read notifications: { clearRead: true }
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.clearRead) {
      const result = await db.notification.deleteMany({
        where: { read: true },
      });
      return NextResponse.json({ deleted: result.count });
    }

    return NextResponse.json({ error: 'Invalid request. Use { clearRead: true }' }, { status: 400 });
  } catch (error) {
    console.error('Failed to delete notifications:', error);
    return NextResponse.json({ error: 'Failed to delete notifications' }, { status: 500 });
  }
}
