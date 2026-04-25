import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/scrape/import - Manual import endpoint (user pastes content directly)
// Body: {
//   platform: 'wechat' | 'xiaohongshu',
//   sourceLabel: string,
//   posts: [{
//     topic: string,
//     content: string,
//     scheduledDate: string, // YYYY-MM-DD
//     contentType: string,
//     likes?: number,
//     comments?: number,
//     shares?: number,
//     favorites?: number,
//     views?: number,
//     imageUrl?: string,
//     tags?: string,
//   }]
// }
//
// Creates a TrackedAccount with collectMethod='manual' if not exists
// Creates a SyncTask record
// Imports posts to DB
// Returns: { imported: number, skipped: number, accountId: string, taskId: string }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, sourceLabel, posts } = body as {
      platform: string;
      sourceLabel: string;
      posts: ManualImportPost[];
    };

    // Validate platform
    if (!platform || !['wechat', 'xiaohongshu'].includes(platform)) {
      return NextResponse.json(
        { error: '平台类型无效，仅支持 wechat 或 xiaohongshu' },
        { status: 400 },
      );
    }

    // Validate sourceLabel
    if (!sourceLabel || typeof sourceLabel !== 'string' || sourceLabel.trim().length === 0) {
      return NextResponse.json(
        { error: '来源标签不能为空，例如"我的朋友圈"或"竞品账号-张三"' },
        { status: 400 },
      );
    }

    // Validate posts
    if (!Array.isArray(posts) || posts.length === 0) {
      return NextResponse.json(
        { error: '至少需要导入一条内容' },
        { status: 400 },
      );
    }

    // Validate each post has at least content
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      if (!post.content && !post.topic) {
        return NextResponse.json(
          { error: `第 ${i + 1} 条内容不能同时缺少标题和正文` },
          { status: 400 },
        );
      }
      if (post.scheduledDate && !/^\d{4}-\d{2}-\d{2}$/.test(post.scheduledDate)) {
        return NextResponse.json(
          { error: `第 ${i + 1} 条内容的日期格式无效，请使用 YYYY-MM-DD` },
          { status: 400 },
        );
      }
    }

    // 1. Find or create a TrackedAccount with collectMethod='manual'
    const account = await db.trackedAccount.upsert({
      where: {
        // Use a deterministic ID for manual accounts based on platform + sourceLabel
        id: `manual-${platform}-${sourceLabel.trim().replace(/\s+/g, '-')}`,
      },
      create: {
        id: `manual-${platform}-${sourceLabel.trim().replace(/\s+/g, '-')}`,
        platform: platform.trim(),
        homeUrl: '',
        nickname: sourceLabel.trim(),
        collectMethod: 'manual',
        status: 'idle',
        isOwn: false,
      },
      update: {
        lastSyncAt: new Date(),
        status: 'success',
      },
    });

    // 2. Create a SyncTask record
    const syncTask = await db.syncTask.create({
      data: {
        trackedAccountId: account.id,
        status: 'running',
        metadata: JSON.stringify({
          platform,
          sourceLabel: sourceLabel.trim(),
          method: 'manual',
          postCount: posts.length,
        }),
        startedAt: new Date(),
      },
    });

    // 3. Import posts to DB
    const planId = `scraped-${platform}`;
    // Ensure the scraped plan exists
    await db.contentPlan.upsert({
      where: { id: planId },
      create: {
        id: planId,
        month: new Date().toISOString().slice(0, 7),
        theme: `scraped-${platform}`,
        status: 'completed',
      },
      update: {},
    });

    let imported = 0;
    let skipped = 0;

    for (const post of posts) {
      try {
        const scheduledDate = post.scheduledDate || new Date().toISOString().slice(0, 10);

        // Check for duplicates
        const existing = await db.contentPost.findFirst({
          where: {
            planId,
            platform,
            scheduledDate,
            topic: (post.topic || '').trim(),
            generationType: 'scraped',
          },
        });

        if (existing) {
          skipped++;
          continue;
        }

        await db.contentPost.create({
          data: {
            planId,
            platform,
            contentType: post.contentType || 'text',
            topic: (post.topic || '').trim(),
            content: (post.content || '').trim(),
            scheduledDate,
            status: 'published',
            generationType: 'scraped',
            likes: post.likes || 0,
            comments: post.comments || 0,
            shares: post.shares || 0,
            views: post.views || 0,
            favorites: post.favorites || 0,
          },
        });
        imported++;
      } catch (err) {
        console.error(`Failed to import post:`, err);
        skipped++;
      }
    }

    // 4. Update SyncTask with results
    await db.syncTask.update({
      where: { id: syncTask.id },
      data: {
        status: imported > 0 ? (skipped > 0 ? 'partial' : 'success') : 'error',
        totalFound: posts.length,
        totalImported: imported,
        totalFailed: skipped,
        errorMessage: imported === 0 ? '所有内容导入失败或已存在' : '',
        finishedAt: new Date(),
      },
    });

    // 5. Update account stats
    const totalCollected = await db.contentPost.count({
      where: {
        platform,
        generationType: 'scraped',
      },
    });

    await db.trackedAccount.update({
      where: { id: account.id },
      data: {
        totalCollected,
        postsCount: posts.length,
        lastSyncAt: new Date(),
        status: 'success',
      },
    });

    return NextResponse.json({
      imported,
      skipped,
      accountId: account.id,
      taskId: syncTask.id,
      message: `成功导入 ${imported} 条内容${skipped > 0 ? `，跳过 ${skipped} 条重复内容` : ''}`,
    });
  } catch (error) {
    console.error('Failed to import scraped content:', error);
    return NextResponse.json({ error: '手动导入失败' }, { status: 500 });
  }
}

interface ManualImportPost {
  topic?: string;
  content?: string;
  scheduledDate?: string;
  contentType?: string;
  likes?: number;
  comments?: number;
  shares?: number;
  favorites?: number;
  views?: number;
  imageUrl?: string;
  tags?: string;
}
