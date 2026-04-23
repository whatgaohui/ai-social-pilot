import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/notifications/[id]
// Get a single notification by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const notification = await db.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json(notification);
  } catch (error) {
    console.error('Failed to fetch notification:', error);
    return NextResponse.json({ error: 'Failed to fetch notification' }, { status: 500 });
  }
}

// PUT /api/notifications/[id]
// Mark as read, archive, or update priority
// Body: { read?: boolean, isArchived?: boolean, priority?: 'high' | 'medium' | 'low' }
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { read, isArchived, priority } = body;

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (typeof read === 'boolean') updateData.read = read;
    if (typeof isArchived === 'boolean') updateData.isArchived = isArchived;
    if (priority && ['high', 'medium', 'low'].includes(priority)) {
      updateData.priority = priority;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update. Use { read, isArchived, priority }' },
        { status: 400 }
      );
    }

    const notification = await db.notification.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(notification);
  } catch (error) {
    console.error('Failed to update notification:', error);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}

// DELETE /api/notifications/[id]
// Delete a single notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.notification.delete({
      where: { id },
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Failed to delete notification:', error);
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
  }
}
