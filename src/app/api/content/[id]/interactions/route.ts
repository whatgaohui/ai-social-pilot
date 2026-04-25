import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const interactions = await db.contentInteraction.findMany({
      where: { postId: id },
      orderBy: { publishedAt: 'desc' },
    });

    return NextResponse.json(interactions);
  } catch (error) {
    console.error('Failed to fetch interactions:', error);
    return NextResponse.json({ error: '获取互动数据失败' }, { status: 500 });
  }
}
