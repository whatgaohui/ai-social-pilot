import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/accounts/[id]/calendar - Get all posts for calendar view
export async function GET(
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

    const posts = await db.xhsPost.findMany({
      where: { accountId: id },
      orderBy: { publishDate: 'desc' },
    });

    const formattedPosts = posts.map(p => ({
      id: p.id,
      accountId: p.accountId,
      xhsPostId: p.xhsPostId,
      title: p.title,
      content: p.content,
      coverUrl: p.coverUrl,
      imageUrls: JSON.parse(p.imageUrls || '[]'),
      postType: p.postType as 'normal' | 'video',
      likes: p.likes,
      comments: p.comments,
      collects: p.collects,
      shares: p.shares,
      tags: JSON.parse(p.tags || '[]'),
      category: p.category,
      aiScore: p.aiScore,
      aiAnalysis: p.aiAnalysis,
      publishDate: p.publishDate,
    }));

    return NextResponse.json({ success: true, data: formattedPosts });
  } catch (error) {
    console.error('Failed to get calendar data:', error);
    return NextResponse.json(
      { success: false, error: '加载日历数据失败' },
      { status: 500 }
    );
  }
}
