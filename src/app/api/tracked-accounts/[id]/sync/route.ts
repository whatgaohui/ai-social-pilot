import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/tracked-accounts/:id/sync - Trigger a sync (scrape) for this account
// Returns the SyncTask ID immediately, then continues processing in the background.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Check existence
    const account = await db.trackedAccount.findUnique({ where: { id } });
    if (!account) {
      return NextResponse.json({ error: '账号不存在' }, { status: 404 });
    }

    // Prevent double-syncing
    if (account.status === 'syncing') {
      return NextResponse.json({ error: '该账号正在同步中，请稍后再试' }, { status: 409 });
    }

    // 1. Update account status to 'syncing'
    await db.trackedAccount.update({
      where: { id },
      data: { status: 'syncing', lastError: '' },
    });

    // 2. Create a new SyncTask record
    const syncTask = await db.syncTask.create({
      data: {
        trackedAccountId: id,
        status: 'pending',
        metadata: JSON.stringify({
          platform: account.platform,
          homeUrl: account.homeUrl,
          collectMethod: account.collectMethod,
          triggeredAt: new Date().toISOString(),
        }),
        startedAt: new Date(),
      },
    });

    // 3-6. Run the sync process in the background (fire-and-forget)
    executeSync(account, syncTask.id).catch((err) => {
      console.error(`[Background Sync] Failed for account ${id}:`, err);
    });

    // 7. Return the sync task ID immediately
    return NextResponse.json({
      success: true,
      syncTaskId: syncTask.id,
      message: '同步任务已创建，正在后台执行',
    }, { status: 202 });
  } catch (error) {
    console.error('Failed to trigger sync:', error);
    return NextResponse.json({ error: '触发同步失败' }, { status: 500 });
  }
}

/**
 * Background sync execution:
 * 1. Call the scraper service at port 3003
 * 2. Import results to DB via scraper service
 * 3. Update account stats
 * 4. Update sync task status
 */
async function executeSync(
  account: {
    id: string;
    platform: string;
    homeUrl: string;
    collectMethod: string;
    cookie: string;
    nickname: string;
  },
  syncTaskId: string,
) {
  const updateTask = (data: Record<string, unknown>) =>
    db.syncTask.update({ where: { id: syncTaskId }, data });

  const updateAccount = (data: Record<string, unknown>) =>
    db.trackedAccount.update({ where: { id: account.id }, data });

  try {
    // Update task status to running
    await updateTask({ status: 'running' });

    let scrapeResult: ScrapeResult | null = null;

    // Step 3: Call the scraper service
    if (account.platform === 'xiaohongshu') {
      scrapeResult = await scrapeXHS(account);
    } else if (account.platform === 'wechat') {
      // WeChat doesn't support auto-scrape, mark as error
      await updateTask({
        status: 'error',
        errorMessage: '微信暂不支持自动采集，请使用手动导入',
        finishedAt: new Date(),
      });
      await updateAccount({
        status: 'error',
        lastError: '微信暂不支持自动采集，请使用手动导入',
      });
      return;
    }

    if (!scrapeResult) {
      await updateTask({
        status: 'error',
        errorMessage: '采集服务返回空结果',
        finishedAt: new Date(),
      });
      await updateAccount({
        status: 'error',
        lastError: '采集服务返回空结果',
      });
      return;
    }

    // Step 4: Import results to DB via scraper service
    const importResult = await importToDb(account, scrapeResult);

    // Step 5: Update account stats
    const totalCollected = account.platform === 'xiaohongshu'
      ? (await db.contentPost.count({
          where: {
            platform: 'xiaohongshu',
            generationType: 'scraped',
          },
        }))
      : 0;

    await updateAccount({
      followers: scrapeResult.profile?.followers || 0,
      following: scrapeResult.profile?.following || 0,
      postsCount: scrapeResult.profile?.postsCount || 0,
      totalCollected,
      lastSyncAt: new Date(),
      status: 'success',
    });

    // Step 6: Update sync task
    await updateTask({
      status: importResult.failed > 0 ? 'partial' : 'success',
      totalFound: scrapeResult.notes?.length || 0,
      totalImported: importResult.imported,
      totalFailed: importResult.failed,
      errorMessage: importResult.error || '',
      finishedAt: new Date(),
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    try {
      await updateTask({
        status: 'error',
        errorMessage: errorMsg,
        finishedAt: new Date(),
      });
      await updateAccount({
        status: 'error',
        lastError: errorMsg,
      });
    } catch (dbErr) {
      console.error('[Background Sync] Failed to update error state:', dbErr);
    }
  }
}

/**
 * Scrape XHS notes from the scraper service
 */
async function scrapeXHS(account: {
  homeUrl: string;
  cookie: string;
}): Promise<ScrapeResult | null> {
  const SCRAPER_BASE = process.env.SCRAPER_URL || 'http://127.0.0.1:3003';
  const scrapeUrl = `${SCRAPER_BASE}/api/scrape/xhs/notes`;

  // Use AbortController with timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  let response: Response;
  try {
    response = await fetch(scrapeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        homeUrl: account.homeUrl,
        cookie: account.cookie || undefined,
      }),
      signal: controller.signal,
    });
  } catch (fetchErr) {
    clearTimeout(timeout);
    const isTimeout = fetchErr instanceof DOMException && fetchErr.name === 'AbortError';
    throw new Error(
      isTimeout
        ? '采集服务响应超时，请稍后重试'
        : '采集服务未启动，请稍后重试（Scraper service unreachable）'
    );
  }
  clearTimeout(timeout);

  if (!response.ok) {
    if ([502, 503, 504].includes(response.status)) {
      throw new Error(`采集服务暂时不可用（HTTP ${response.status}），请稍后重试`);
    }
    const errorText = await response.text();
    throw new Error(`Scraper returned ${response.status}: ${errorText}`);
  }

  return await response.json() as ScrapeResult;
}

/**
 * Import scraped notes to DB via the scraper service's import endpoint
 */
async function importToDb(
  account: { platform: string; nickname: string },
  scrapeResult: ScrapeResult,
): Promise<{ imported: number; failed: number; error: string }> {
  if (!scrapeResult.notes || scrapeResult.notes.length === 0) {
    return { imported: 0, failed: 0, error: '' };
  }

  // Find or create a scraped content plan for this platform
  const plan = await db.contentPlan.upsert({
    where: {
      // We use a deterministic ID pattern for scraped plans
      id: `scraped-${account.platform}`,
    },
    create: {
      id: `scraped-${account.platform}`,
      month: new Date().toISOString().slice(0, 7),
      theme: `scraped-${account.platform}`,
      status: 'completed',
    },
    update: {},
  });

  let imported = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const note of scrapeResult.notes) {
    try {
      // Ensure no duplicate by checking topic + scheduledDate + platform
      const existing = await db.contentPost.findFirst({
        where: {
          planId: plan.id,
          platform: account.platform,
          scheduledDate: note.scheduledDate || new Date().toISOString().slice(0, 10),
          topic: note.title || note.content?.slice(0, 50) || '',
          generationType: 'scraped',
        },
      });

      if (existing) {
        // Skip duplicates
        continue;
      }

      await db.contentPost.create({
        data: {
          planId: plan.id,
          platform: account.platform,
          contentType: note.contentType || 'text',
          topic: note.title || '',
          content: note.content || '',
          scheduledDate: note.scheduledDate || new Date().toISOString().slice(0, 10),
          status: 'published', // scraped content is already published
          generationType: 'scraped',
          likes: note.likes || 0,
          comments: note.comments || 0,
          shares: note.shares || 0,
          views: note.views || 0,
          favorites: note.favorites || 0,
        },
      });
      imported++;
    } catch (err) {
      failed++;
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  return {
    imported,
    failed,
    error: errors.length > 0 ? errors.slice(0, 3).join('; ') : '',
  };
}

// Type definitions for scraper service response
interface ScrapeResult {
  profile?: {
    nickname?: string;
    avatarUrl?: string;
    bio?: string;
    followers?: number;
    following?: number;
    postsCount?: number;
  };
  notes?: Array<{
    title?: string;
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
  }>;
}
