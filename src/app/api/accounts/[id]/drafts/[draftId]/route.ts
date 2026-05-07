import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const UpdateDraftSchema = z.object({
  title: z.string().min(1).max(30).optional(),
  content: z.string().min(1).max(1000).optional(),
  mediaType: z.enum(['image', 'video']).optional(),
  mediaUrls: z.array(z.string().url()).max(9).optional(),
  videoUrl: z.string().url().optional().or(z.literal('')),
  tags: z.array(z.string()).max(10).optional(),
  scheduledAt: z.string().optional(),
  status: z.enum(['draft', 'scheduled', 'published', 'cancelled']).optional(),
});

// PATCH /api/accounts/[id]/drafts/[draftId] - Update a draft
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; draftId: string }> }
) {
  try {
    const { id: accountId, draftId } = await params;
    const body = await request.json();

    const validation = UpdateDraftSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const draft = await db.scheduledNote.findFirst({
      where: { id: draftId, accountId },
    });

    if (!draft) {
      return NextResponse.json(
        { success: false, error: '草稿不存在' },
        { status: 404 }
      );
    }

    const updateData: any = {};

    if (validation.data.title) updateData.title = validation.data.title;
    if (validation.data.content) updateData.content = validation.data.content;
    if (validation.data.mediaType) updateData.mediaType = validation.data.mediaType;
    if (validation.data.mediaUrls) updateData.mediaUrls = JSON.stringify(validation.data.mediaUrls);
    if (validation.data.videoUrl !== undefined) updateData.videoUrl = validation.data.videoUrl;
    if (validation.data.tags) updateData.tags = JSON.stringify(validation.data.tags);
    if (validation.data.scheduledAt) updateData.scheduledAt = new Date(validation.data.scheduledAt);
    if (validation.data.status) updateData.status = validation.data.status;

    const updated = await db.scheduledNote.update({
      where: { id: draftId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        title: updated.title,
        content: updated.content,
        mediaType: updated.mediaType,
        mediaUrls: JSON.parse(updated.mediaUrls || '[]'),
        videoUrl: updated.videoUrl,
        tags: JSON.parse(updated.tags || '[]'),
        status: updated.status,
        scheduledAt: updated.scheduledAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to update draft:', error);
    return NextResponse.json(
      { success: false, error: '更新草稿失败' },
      { status: 500 }
    );
  }
}

// DELETE /api/accounts/[id]/drafts/[draftId] - Delete a draft
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; draftId: string }> }
) {
  try {
    const { id: accountId, draftId } = await params;

    const draft = await db.scheduledNote.findFirst({
      where: { id: draftId, accountId },
    });

    if (!draft) {
      return NextResponse.json(
        { success: false, error: '草稿不存在' },
        { status: 404 }
      );
    }

    await db.scheduledNote.delete({
      where: { id: draftId },
    });

    return NextResponse.json({
      success: true,
      message: '草稿已删除',
    });
  } catch (error) {
    console.error('Failed to delete draft:', error);
    return NextResponse.json(
      { success: false, error: '删除草稿失败' },
      { status: 500 }
    );
  }
}