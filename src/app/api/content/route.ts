import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId');
    const posts = await db.contentPost.findMany({
      where: planId ? { planId } : undefined,
      orderBy: { scheduledDate: 'asc' },
    });
    return NextResponse.json(posts);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch content posts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const post = await db.contentPost.create({ data: body });
    return NextResponse.json(post);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create content post' }, { status: 500 });
  }
}
