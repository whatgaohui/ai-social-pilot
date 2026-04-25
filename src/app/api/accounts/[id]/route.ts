import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/accounts/[id] - Get account details
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const account = await db.xhsAccount.findUnique({
      where: { id },
      include: {
        persona: true,
        _count: { select: { posts: true, drafts: true } },
      },
    });

    if (!account) {
      return NextResponse.json(
        { success: false, error: '账号不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...account,
        postsCount: account._count.posts,
        draftsCount: account._count.drafts,
        _count: undefined,
      },
    });
  } catch (error) {
    console.error('Failed to get account:', error);
    return NextResponse.json(
      { success: false, error: '获取账号详情失败' },
      { status: 500 }
    );
  }
}

// DELETE /api/accounts/[id] - Delete account
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const account = await db.xhsAccount.findUnique({ where: { id } });
    if (!account) {
      return NextResponse.json(
        { success: false, error: '账号不存在' },
        { status: 404 }
      );
    }

    // Cascade delete will handle posts, persona, drafts
    await db.xhsAccount.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error('Failed to delete account:', error);
    return NextResponse.json(
      { success: false, error: '删除账号失败' },
      { status: 500 }
    );
  }
}
