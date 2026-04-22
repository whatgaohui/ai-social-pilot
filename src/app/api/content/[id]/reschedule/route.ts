import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { scheduledDate } = body;

    if (!scheduledDate || typeof scheduledDate !== 'string') {
      return NextResponse.json(
        { error: 'scheduledDate is required and must be a string (yyyy-MM-dd)' },
        { status: 400 },
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(scheduledDate)) {
      return NextResponse.json(
        { error: 'scheduledDate must be in yyyy-MM-dd format' },
        { status: 400 },
      );
    }

    const post = await db.contentPost.update({
      where: { id },
      data: { scheduledDate },
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error('Failed to reschedule content post:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to reschedule content post', details: message },
      { status: 500 },
    );
  }
}
