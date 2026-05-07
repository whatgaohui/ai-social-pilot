import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/materials/bulk — Bulk operations on materials
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, action } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: '未选择素材' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'delete':
        await db.material.updateMany({
          where: { id: { in: ids } },
          data: { status: 'deleted' },
        });
        return NextResponse.json({ success: true, data: { count: ids.length, action: 'deleted' } });

      case 'archive':
        await db.material.updateMany({
          where: { id: { in: ids } },
          data: { status: 'archived' },
        });
        return NextResponse.json({ success: true, data: { count: ids.length, action: 'archived' } });

      case 'restore':
        await db.material.updateMany({
          where: { id: { in: ids } },
          data: { status: 'active' },
        });
        return NextResponse.json({ success: true, data: { count: ids.length, action: 'restored' } });

      case 'add-tags': {
        const tags = body.tags as string[];
        if (!tags || tags.length === 0) {
          return NextResponse.json(
            { success: false, error: '未提供标签' },
            { status: 400 }
          );
        }
        const materials = await db.material.findMany({
          where: { id: { in: ids } },
          select: { id: true, tags: true },
        });
        for (const m of materials) {
          const existing = JSON.parse(m.tags || '[]') as string[];
          const merged = [...new Set([...existing, ...tags])];
          await db.material.update({
            where: { id: m.id },
            data: { tags: JSON.stringify(merged) },
          });
        }
        return NextResponse.json({ success: true, data: { count: materials.length, action: 'tags-added' } });
      }

      default:
        return NextResponse.json(
          { success: false, error: `不支持的操作: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Bulk operation failed:', error);
    return NextResponse.json(
      { success: false, error: '批量操作失败' },
      { status: 500 }
    );
  }
}
