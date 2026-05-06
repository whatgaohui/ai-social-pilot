import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/accounts/[id]/notes - Create a scheduled note
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, content, mediaUrls, tags, scheduledAt, coverPrompt } = body;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: '标题和内容为必填项' },
        { status: 400 }
      );
    }

    const account = await db.xhsAccount.findUnique({ where: { id } });
    if (!account) {
      return NextResponse.json(
        { success: false, error: '账号不存在' },
        { status: 404 }
      );
    }

    const note = await db.scheduledNote.create({
      data: {
        accountId: id,
        title,
        content,
        mediaUrls: JSON.stringify(mediaUrls || []),
        tags: JSON.stringify(tags || []),
        coverPrompt: coverPrompt || '',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
        status: scheduledAt ? 'scheduled' : 'draft',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: note.id,
        title: note.title,
        content: note.content,
        tags: JSON.parse(note.tags || '[]'),
        scheduledAt: note.scheduledAt.toISOString(),
        status: note.status,
      },
    });
  } catch (error) {
    console.error('Failed to create note:', error);
    return NextResponse.json(
      { success: false, error: '创建笔记失败' },
      { status: 500 }
    );
  }
}

// GET /api/accounts/[id]/notes?noteId=xxx - Get note detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('noteId');

    if (!noteId) {
      return NextResponse.json(
        { success: false, error: '缺少笔记ID' },
        { status: 400 }
      );
    }

    const account = await db.xhsAccount.findUnique({ where: { id } });
    if (!account) {
      return NextResponse.json(
        { success: false, error: '账号不存在' },
        { status: 404 }
      );
    }

    const post = await db.xhsPost.findFirst({
      where: { id: noteId, accountId: id },
    });

    if (!post) {
      return NextResponse.json(
        { success: false, error: '笔记不存在' },
        { status: 404 }
      );
    }

    const performance = await db.notePerformance.findFirst({
      where: { postId: noteId },
      orderBy: { calculatedAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: post.id,
        accountId: post.accountId,
        xhsPostId: post.xhsPostId,
        title: post.title,
        content: post.content,
        coverUrl: post.coverUrl,
        imageUrls: JSON.parse(post.imageUrls || '[]'),
        postType: post.postType,
        likes: post.likes,
        comments: post.comments,
        collects: post.collects,
        shares: post.shares,
        views: post.views,
        engagementRate: post.engagementRate,
        tags: JSON.parse(post.tags || '[]'),
        category: post.category,
        aiScore: post.aiScore,
        aiAnalysis: post.aiAnalysis,
        publishDate: post.publishDate,
        publishTime: post.publishTime,
        scrapedAt: post.scrapedAt.toISOString(),
        performance: performance ? {
          views: performance.views,
          likes: performance.likes,
          comments: performance.comments,
          collects: performance.collects,
          shares: performance.shares,
          engagementRate: performance.engagementRate,
          calculatedAt: performance.calculatedAt.toISOString(),
        } : null,
      },
    });
  } catch (error) {
    console.error('Failed to get note detail:', error);
    return NextResponse.json(
      { success: false, error: '获取笔记详情失败' },
      { status: 500 }
    );
  }
}
