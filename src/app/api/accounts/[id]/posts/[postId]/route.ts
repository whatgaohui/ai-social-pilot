import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PATCH /api/accounts/[id]/posts/[postId] - Update post fields (e.g., publishTime)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  try {
    const { id, postId } = await params;
    const body = await request.json();

    // Verify account exists
    const account = await db.xhsAccount.findUnique({ where: { id } });
    if (!account) {
      return NextResponse.json(
        { success: false, error: '账号不存在' },
        { status: 404 }
      );
    }

    // Verify post exists and belongs to this account
    const post = await db.xhsPost.findFirst({
      where: { id: postId, accountId: id },
    });
    if (!post) {
      return NextResponse.json(
        { success: false, error: '笔记不存在' },
        { status: 404 }
      );
    }

    // Only allow updating specific fields
    const allowedFields = [
      'publishDate',
      'publishTime',
      'title',
      'content',
      'category',
      'tags',
    ];
    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: '没有可更新的字段' },
        { status: 400 }
      );
    }

    const updatedPost = await db.xhsPost.update({
      where: { id: postId },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updatedPost });
  } catch (error) {
    console.error('Failed to update post:', error);
    return NextResponse.json(
      { success: false, error: '更新笔记失败' },
      { status: 500 }
    );
  }
}

// GET /api/accounts/[id]/posts/[postId] - Get single post details
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  try {
    const { id, postId } = await params;

    const post = await db.xhsPost.findFirst({
      where: { id: postId, accountId: id },
    });

    if (!post) {
      return NextResponse.json(
        { success: false, error: '笔记不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: post });
  } catch (error) {
    console.error('Failed to get post:', error);
    return NextResponse.json(
      { success: false, error: '获取笔记详情失败' },
      { status: 500 }
    );
  }
}