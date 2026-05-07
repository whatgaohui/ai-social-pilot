import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const tags = await db.tag.findMany({ orderBy: { count: 'desc' } });
    return NextResponse.json({ success: true, data: tags });
  } catch (error) {
    console.error('Failed to get tags:', error);
    return NextResponse.json({ success: false, error: '获取标签失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, color } = body;
    if (!name) {
      return NextResponse.json({ success: false, error: '标签名称不能为空' }, { status: 400 });
    }
    const tag = await db.tag.upsert({
      where: { name },
      create: { name, color: color || '#FF2442' },
      update: { color: color || undefined },
    });
    return NextResponse.json({ success: true, data: tag });
  } catch (error) {
    console.error('Failed to create tag:', error);
    return NextResponse.json({ success: false, error: '创建标签失败' }, { status: 500 });
  }
}
