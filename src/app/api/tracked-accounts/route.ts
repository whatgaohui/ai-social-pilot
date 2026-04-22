import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/tracked-accounts - List all tracked accounts
// Optional query: ?platform=wechat|xiaohongshu&own=true|false
// Returns sorted by lastSyncAt desc (nulls last)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    const ownParam = searchParams.get('own');

    // Build where clause
    const where: Record<string, unknown> = {};
    if (platform && ['wechat', 'xiaohongshu'].includes(platform)) {
      where.platform = platform;
    }
    if (ownParam !== null) {
      where.isOwn = ownParam === 'true';
    }

    const accounts = await db.trackedAccount.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        _count: {
          select: { syncTasks: true },
        },
      },
      orderBy: [
        { lastSyncAt: { sort: 'desc', nulls: 'last' } },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json(accounts);
  } catch (error) {
    console.error('Failed to fetch tracked accounts:', error);
    return NextResponse.json({ error: '获取追踪账号列表失败' }, { status: 500 });
  }
}

// POST /api/tracked-accounts - Create new tracked account
// Body: { platform, homeUrl, nickname?, avatarUrl?, bio?, isOwn?, collectMethod? }
// If collectMethod is 'link', immediately triggers a profile scrape via the scraper service (port 3003)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, homeUrl, nickname, collectMethod, cookie, isOwn, avatarUrl, bio } = body;

    // Validate platform
    if (!platform || !['wechat', 'xiaohongshu'].includes(platform)) {
      return NextResponse.json(
        { error: '平台类型无效，仅支持 wechat（朋友圈）或 xiaohongshu（小红书）' },
        { status: 400 },
      );
    }

    // Validate homeUrl
    if (!homeUrl || typeof homeUrl !== 'string' || homeUrl.trim().length === 0) {
      return NextResponse.json(
        { error: '主页链接不能为空' },
        { status: 400 },
      );
    }

    // Validate collectMethod
    const validMethods = ['link', 'cookie', 'manual'];
    const method = collectMethod || 'link';
    if (!validMethods.includes(method)) {
      return NextResponse.json(
        { error: '采集方式无效，仅支持 link / cookie / manual' },
        { status: 400 },
      );
    }

    const account = await db.trackedAccount.create({
      data: {
        platform: platform.trim(),
        homeUrl: homeUrl.trim(),
        nickname: (nickname || '').trim(),
        avatarUrl: (avatarUrl || '').trim(),
        bio: (bio || '').trim(),
        collectMethod: method,
        cookie: (cookie || '').trim(),
        isOwn: isOwn !== undefined ? !!isOwn : true,
        status: (method === 'link' || method === 'cookie') ? 'syncing' : 'idle',
      },
    });

    // If collectMethod is 'link', trigger a profile scrape in the background
    if (method === 'link' || method === 'cookie') {
      // Fire-and-forget: don't await the scraper call
      triggerProfileScrape(account.id, platform.trim(), homeUrl.trim(), cookie || undefined).catch((err) => {
        console.error(`[Background] Profile scrape failed for account ${account.id}:`, err);
      });
    }

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error('Failed to create tracked account:', error);
    return NextResponse.json({ error: '创建追踪账号失败' }, { status: 500 });
  }
}

/**
 * Trigger a profile scrape on the scraper mini-service (port 3003)
 * Updates account info (nickname, avatar, bio, followers, etc.) from the scrape result
 */
async function triggerProfileScrape(
  accountId: string,
  platform: string,
  homeUrl: string,
  cookie?: string,
) {
  try {
    const scrapeUrl = platform === 'xiaohongshu'
      ? '/api/scrape/xhs/profile?XTransformPort=3003'
      : '/api/scrape/wechat/profile?XTransformPort=3003';

    const response = await fetch(scrapeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ homeUrl, cookie: cookie || undefined }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Scraper returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    // Update the account with scraped profile info
    if (result.profile) {
      const { nickname, avatarUrl, bio, followers, following, postsCount } = result.profile;
      await db.trackedAccount.update({
        where: { id: accountId },
        data: {
          nickname: nickname || '',
          avatarUrl: avatarUrl || '',
          bio: bio || '',
          followers: followers || 0,
          following: following || 0,
          postsCount: postsCount || 0,
          status: 'success',
          lastSyncAt: new Date(),
        },
      });
    } else {
      await db.trackedAccount.update({
        where: { id: accountId },
        data: { status: 'error', lastError: '未能获取到账号信息' },
      });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await db.trackedAccount.update({
      where: { id: accountId },
      data: { status: 'error', lastError: errorMsg },
    });
    throw error;
  }
}
