import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const mediaUrlSchema = z.string().min(1).refine((value) => {
  if (value.startsWith('/upload/')) return true;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}, '媒体地址无效');

const CreateNoteSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(30, '标题最多 30 个字'),
  content: z.string().min(1, '内容不能为空').max(1000, '内容最多 1000 个字'),
  mediaType: z.enum(['image', 'video']),
  mediaUrls: z.array(mediaUrlSchema).max(9, '最多上传 9 张图片').default([]),
  videoUrl: mediaUrlSchema.optional().or(z.literal('')),
  tags: z.array(z.string()).max(10, '最多 10 个标签').default([]),
  publishMode: z.enum(['now', 'scheduled']),
  scheduledAt: z.string().optional(),
  coverPrompt: z.string().optional(),
});

function parseJsonArray(value: string) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validation = CreateNoteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message || '参数错误' },
        { status: 400 }
      );
    }

    const { title, content, mediaType, mediaUrls, videoUrl, tags, publishMode, scheduledAt, coverPrompt } = validation.data;

    if (mediaType === 'image' && mediaUrls.length === 0) {
      return NextResponse.json({ success: false, error: '图文笔记至少需要上传 1 张图片' }, { status: 400 });
    }

    if (mediaType === 'video' && !videoUrl) {
      return NextResponse.json({ success: false, error: '视频笔记需要上传视频或粘贴视频链接' }, { status: 400 });
    }

    let scheduledDate: Date;
    if (publishMode === 'scheduled') {
      if (!scheduledAt) {
        return NextResponse.json({ success: false, error: '定时发布需要指定发布时间' }, { status: 400 });
      }
      scheduledDate = new Date(scheduledAt);
      if (Number.isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
        return NextResponse.json({ success: false, error: '发布时间必须晚于当前时间' }, { status: 400 });
      }
    } else {
      scheduledDate = new Date(Date.now() + 60 * 60 * 1000);
    }

    const account = await db.xhsAccount.findUnique({ where: { id } });
    if (!account) {
      return NextResponse.json({ success: false, error: '账号不存在' }, { status: 404 });
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
        mediaUrls: parseJsonArray(note.mediaUrls),
        videoUrl: note.videoUrl,
        tags: parseJsonArray(note.tags),
        scheduledAt: note.scheduledAt.toISOString(),
        status: note.status,
      },
    });
  } catch (error) {
    console.error('Failed to create note:', error);
    return NextResponse.json({ success: false, error: '创建笔记失败' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('noteId');

    if (!noteId) {
      return NextResponse.json({ success: false, error: '缺少笔记 ID' }, { status: 400 });
    }

    const post = await db.xhsPost.findFirst({
      where: { id: noteId, accountId: id },
    });

    if (!post) {
      return NextResponse.json({ success: false, error: '笔记不存在' }, { status: 404 });
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
        imageUrls: parseJsonArray(post.imageUrls),
        imagePaths: parseJsonArray(post.imagePaths),
        postType: post.postType,
        videoUrl: post.videoUrl,
        videoPath: post.videoPath,
        videoThumbnail: post.videoThumbnail,
        likes: post.likes,
        comments: post.comments,
        collects: post.collects,
        shares: post.shares,
        views: post.views,
        engagementRate: post.engagementRate,
        tags: parseJsonArray(post.tags),
        category: post.category,
        aiScore: post.aiScore,
        aiAnalysis: post.aiAnalysis,
        publishDate: post.publishDate,
        publishTime: post.publishTime,
        scrapedAt: post.scrapedAt.toISOString(),
        detailScrapedAt: post.detailScrapedAt ? post.detailScrapedAt.toISOString() : null,
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
    return NextResponse.json({ success: false, error: '获取笔记详情失败' }, { status: 500 });
  }
}
