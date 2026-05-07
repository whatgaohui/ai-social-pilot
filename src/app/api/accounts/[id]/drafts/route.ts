import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/accounts/[id]/drafts - Get all drafts for an account
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: accountId } = await params;

    const account = await db.xhsAccount.findUnique({
      where: { id: accountId }
    });

    if (!account) {
      return NextResponse.json(
        { success: false, error: '账号不存在' },
        { status: 404 }
      );
    }

    const drafts = await db.scheduledNote.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
    });

    const formattedDrafts = drafts.map(draft => ({
      id: draft.id,
      title: draft.title,
      content: draft.content,
      mediaType: draft.mediaType,
      mediaUrls: JSON.parse(draft.mediaUrls || '[]'),
      videoUrl: draft.videoUrl,
      tags: JSON.parse(draft.tags || '[]'),
      status: draft.status,
      scheduledAt: draft.scheduledAt.toISOString(),
      createdAt: draft.createdAt.toISOString(),
      updatedAt: draft.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: formattedDrafts,
    });
  } catch (error) {
    console.error('Failed to fetch drafts:', error);
    return NextResponse.json(
      { success: false, error: '获取草稿列表失败' },
      { status: 500 }
    );
  }
}