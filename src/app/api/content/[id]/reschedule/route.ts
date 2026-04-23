import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── PUT: Directly reschedule a post ─────────────────────────────────────────
// Accepts { scheduledDate: string } (yyyy-MM-dd format)

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

    // Validate date format yyyy-MM-dd
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(scheduledDate)) {
      return NextResponse.json(
        { error: 'scheduledDate must be in yyyy-MM-dd format' },
        { status: 400 },
      );
    }

    // Validate it's a real date
    const dateObj = new Date(scheduledDate);
    if (isNaN(dateObj.getTime())) {
      return NextResponse.json(
        { error: 'scheduledDate is not a valid date' },
        { status: 400 },
      );
    }

    // Check that the post exists
    const existingPost = await db.contentPost.findUnique({ where: { id } });
    if (!existingPost) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 },
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

// ─── POST: Reschedule with audit trail ───────────────────────────────────────
// Accepts { postId: string, newDate: string, reason?: string }

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { newDate, reason } = body;

    if (!newDate || typeof newDate !== 'string') {
      return NextResponse.json(
        { error: 'newDate is required and must be a string (yyyy-MM-dd)' },
        { status: 400 },
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(newDate)) {
      return NextResponse.json(
        { error: 'newDate must be in yyyy-MM-dd format' },
        { status: 400 },
      );
    }

    // Validate it's a real date
    const dateObj = new Date(newDate);
    if (isNaN(dateObj.getTime())) {
      return NextResponse.json(
        { error: 'newDate is not a valid date' },
        { status: 400 },
      );
    }

    // Check that the post exists
    const existingPost = await db.contentPost.findUnique({ where: { id } });
    if (!existingPost) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 },
      );
    }

    const oldDate = existingPost.scheduledDate;

    // Skip if date hasn't changed
    if (oldDate === newDate) {
      return NextResponse.json({
        ...existingPost,
        message: 'Date unchanged, no action taken',
        skipped: true,
      });
    }

    // Update the post
    const updatedPost = await db.contentPost.update({
      where: { id },
      data: { scheduledDate: newDate },
    });

    // Build audit info (logged in console; could also write to a dedicated audit table)
    console.log(`[Reschedule Audit] Post ${id}: ${oldDate} → ${newDate}${reason ? ` (reason: ${reason})` : ''}`);

    return NextResponse.json({
      post: updatedPost,
      previousDate: oldDate,
      newDate,
      reason: reason || null,
    });
  } catch (error) {
    console.error('Failed to reschedule content post:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to reschedule content post', details: message },
      { status: 500 },
    );
  }
}
