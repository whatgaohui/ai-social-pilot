import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const items = await db.knowledgeItem.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch knowledge items' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const item = await db.knowledgeItem.create({ data: body });
    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create knowledge item' }, { status: 500 });
  }
}
