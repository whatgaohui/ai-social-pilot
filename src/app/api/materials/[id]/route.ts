import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const material = await db.material.findUnique({
      where: { id },
      include: { usages: { orderBy: { usedAt: 'desc' }, take: 20 } },
    });
    if (!material) {
      return NextResponse.json({ success: false, error: '素材不存在' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: material });
  } catch (error) {
    console.error('Failed to get material:', error);
    return NextResponse.json({ success: false, error: '获取素材详情失败' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, tags, status } = body;

    const material = await db.material.findUnique({ where: { id } });
    if (!material) {
      return NextResponse.json({ success: false, error: '素材不存在' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (tags !== undefined) updateData.tags = JSON.stringify(tags);
    if (status !== undefined) updateData.status = status;

    const updated = await db.material.update({ where: { id }, data: updateData });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Failed to update material:', error);
    return NextResponse.json({ success: false, error: '更新素材失败' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const material = await db.material.findUnique({ where: { id } });
    if (!material) {
      return NextResponse.json({ success: false, error: '素材不存在' }, { status: 404 });
    }
    await db.material.update({ where: { id }, data: { status: 'deleted' } });
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error('Failed to delete material:', error);
    return NextResponse.json({ success: false, error: '删除素材失败' }, { status: 500 });
  }
}
