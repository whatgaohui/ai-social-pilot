import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const persona = await db.persona.findFirst();
    return NextResponse.json(persona);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch persona' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Delete existing persona if any
    await db.persona.deleteMany();
    const persona = await db.persona.create({ data: body });
    return NextResponse.json(persona);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create persona' }, { status: 500 });
  }
}
