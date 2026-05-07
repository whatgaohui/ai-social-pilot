import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

// Validation schema
const CreateNoteSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(30, '标题最多30字'),
  content: z.string().min(1, '内容不能为空').max(1000, '内容最多1000字'),
  mediaType: z.enum(['image', 'video']),
  mediaUrls: z.array(z.string().url()).max(9, '最多上传9张图片').default([]),
  videoUrl: z.string().url().optional().or(z.literal('')),
  tags: z.array(z.string()).max(10, '最多10个标签').default([]),
  publishMode: z.enum(['now', 'scheduled']),
  scheduledAt: z.string().optional(),
  coverPrompt: z.string().optional(),
});

// POST /api/accounts/[id]/notes - Create a scheduled note
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate input
    const validation = CreateNoteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { title, content, mediaType, mediaUrls, videoUrl, tags, publishMode, scheduledAt, coverPrompt } = validation.data;

    // Validate media requirements
    if (mediaType === 'image' && mediaUrls.length === 0) {
      return NextResponse.json(
        { success: false, error: '图文笔记至少需要上传一张图片' },
        { status: 400 }
      );
    }

    if (mediaType === 'video' && !videoUrl) {
      return NextResponse.json(
        { success: false, error: '视频笔记需要提供视频链接' },
        { status: 400 }
      );
    }

    // Validate scheduled time for scheduled publish
    let scheduledDate: Date;
    if (publishMode === 'scheduled') {
      if (!scheduledAt) {
        return NextResponse.json(
          { success: false, error: '定时发布需要指定发布时间' },
          { status: 400 }
        );
      }
      scheduledDate = new Date(scheduledAt);
      if (scheduledDate <= new Date()) {
        return NextResponse.json(
          { success: false, error: '发布时间必须晚于当前时间' },
          { status: 400 }
        );
      }
    } else {
      // For immediate publish, default to 1 hour from now
      scheduledDate = new Date(Date.now() + 60 * 60 * 1000);
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
        mediaType,
        mediaUrls: JSON.stringify(mediaUrls),
        videoUrl: videoUrl || '',
        tags: JSON.stringify(tags),
        coverPrompt: coverPrompt || '',
        scheduledAt: scheduledDate,
        status: publishMode === 'scheduled' ? 'scheduled' : 'draft',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: note.id,
        title: note.title,
        content: note.content,
        mediaType: note.mediaType,
        mediaUrls: JSON.parse(note.mediaUrls || '[]'),
        videoUrl: note.videoUrl,
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
