import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const asset = await db.contentAsset.findUnique({ where: { id } });
    if (!asset) {
      return NextResponse.json({ success: false, error: '素材不存在' }, { status: 404 });
    }
    await db.contentAsset.delete({ where: { id } });
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error('Failed to delete asset:', error);
    return NextResponse.json({ success: false, error: '删除素材失败' }, { status: 500 });
  }
}
