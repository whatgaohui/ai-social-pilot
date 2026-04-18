import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const materials = await db.material.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(materials);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const material = await db.material.create({ data: body });
    return NextResponse.json(material);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create material' }, { status: 500 });
  }
}
