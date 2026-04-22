import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/tracked-accounts/:id - Get single tracked account with its sync tasks
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const account = await db.trackedAccount.findUnique({
      where: { id },
      include: {
        syncTasks: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!account) {
      return NextResponse.json({ error: '账号不存在' }, { status: 404 });
    }

    return NextResponse.json(account);
  } catch (error) {
    console.error('Failed to fetch tracked account:', error);
    return NextResponse.json({ error: '获取追踪账号详情失败' }, { status: 500 });
  }
}

// PUT /api/tracked-accounts/:id - Update tracked account
// Body: { nickname?, homeUrl?, cookie?, collectMethod?, avatarUrl?, bio?, isOwn?, status? }
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check existence
    const existing = await db.trackedAccount.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: '账号不存在' }, { status: 404 });
    }

    // Build update data — only allow certain fields
    const allowedFields = [
      'nickname', 'cookie', 'collectMethod', 'homeUrl',
      'avatarUrl', 'bio', 'isOwn', 'status',
      'followers', 'following', 'postsCount', 'totalCollected',
      'lastError',
    ];
    const data: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        data[key] = body[key];
      }
    }

    const updated = await db.trackedAccount.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update tracked account:', error);
    return NextResponse.json({ error: '更新追踪账号失败' }, { status: 500 });
  }
}

// DELETE /api/tracked-accounts/:id - Delete tracked account and all related data
// SyncTasks are cascade-deleted via schema relation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Check existence
    const existing = await db.trackedAccount.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: '账号不存在' }, { status: 404 });
    }

    // Delete will cascade to syncTasks (as defined in schema)
    await db.trackedAccount.delete({ where: { id } });

    return NextResponse.json({ success: true, message: '账号已删除' });
  } catch (error) {
    console.error('Failed to delete tracked account:', error);
    return NextResponse.json({ error: '删除追踪账号失败' }, { status: 500 });
  }
}
