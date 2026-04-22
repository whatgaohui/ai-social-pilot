import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/tracked-accounts/batch — Batch operations on tracked accounts
// Body: { action: "delete" | "sync" | "update", ids: string[], data?: Record<string, unknown> }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ids, data } = body;

    if (!action || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: '缺少必要参数: action 和 ids' }, { status: 400 });
    }

    if (ids.length > 50) {
      return NextResponse.json({ error: '批量操作最多支持50个账号' }, { status: 400 });
    }

    const validActions = ['delete', 'sync', 'update'];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: `不支持的操作: ${action}，支持: ${validActions.join(', ')}` }, { status: 400 });
    }

    switch (action) {
      case 'delete': {
        // Delete accounts and their associated content posts
        // First find all scraped content plans associated with these accounts
        const accounts = await db.trackedAccount.findMany({
          where: { id: { in: ids } },
        });

        // Delete content posts that were scraped (generationType = 'scraped')
        const scrapedPlanIds = await db.contentPlan.findMany({
          where: { id: { startsWith: 'scraped-' } },
          select: { id: true },
        });

        if (scrapedPlanIds.length > 0) {
          await db.contentPost.deleteMany({
            where: {
              planId: { in: scrapedPlanIds.map(p => p.id) },
            },
          });
        }

        // Delete sync tasks
        await db.syncTask.deleteMany({
          where: { trackedAccountId: { in: ids } },
        });

        // Delete accounts
        const result = await db.trackedAccount.deleteMany({
          where: { id: { in: ids } },
        });

        return NextResponse.json({
          success: true,
          message: `已删除 ${result.count} 个账号`,
          deleted: result.count,
        });
      }

      case 'update': {
        if (!data || Object.keys(data).length === 0) {
          return NextResponse.json({ error: '更新操作需要提供 data 字段' }, { status: 400 });
        }

        // Only allow updating specific fields
        const allowedFields = ['isOwn', 'collectMethod', 'nickname', 'bio'];
        const updateData: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(data)) {
          if (allowedFields.includes(key)) {
            updateData[key] = value;
          }
        }

        if (Object.keys(updateData).length === 0) {
          return NextResponse.json({ error: '没有有效的更新字段' }, { status: 400 });
        }

        // Update each account
        const results = [];
        for (const id of ids) {
          try {
            const updated = await db.trackedAccount.update({
              where: { id },
              data: updateData,
            });
            results.push({ id, success: true });
          } catch {
            results.push({ id, success: false, error: '更新失败' });
          }
        }

        const successCount = results.filter(r => r.success).length;
        return NextResponse.json({
          success: true,
          message: `已更新 ${successCount}/${ids.length} 个账号`,
          results,
        });
      }

      case 'sync': {
        // Mark accounts for re-sync
        const results = [];
        for (const id of ids) {
          try {
            await db.trackedAccount.update({
              where: { id },
              data: { status: 'syncing' },
            });
            results.push({ id, success: true });
          } catch {
            results.push({ id, success: false, error: '同步标记失败' });
          }
        }

        const successCount = results.filter(r => r.success).length;
        return NextResponse.json({
          success: true,
          message: `已标记 ${successCount}/${ids.length} 个账号为待同步`,
          results,
        });
      }

      default:
        return NextResponse.json({ error: '不支持的操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('Failed to perform batch operation:', error);
    return NextResponse.json({ error: '批量操作失败' }, { status: 500 });
  }
}
