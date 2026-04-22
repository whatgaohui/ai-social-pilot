import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

interface ReorderItem {
  id: string;
  scheduledDate: string;
  sortOrder: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items } = body as { items: ReorderItem[] };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'items is required and must be a non-empty array' },
        { status: 400 },
      );
    }

    // Validate each item
    for (const item of items) {
      if (!item.id || typeof item.id !== 'string') {
        return NextResponse.json(
          { error: 'Each item must have a valid id' },
          { status: 400 },
        );
      }
      if (!item.scheduledDate || typeof item.scheduledDate !== 'string') {
        return NextResponse.json(
          { error: 'Each item must have a valid scheduledDate (yyyy-MM-dd)' },
          { status: 400 },
        );
      }
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(item.scheduledDate)) {
        return NextResponse.json(
          { error: 'scheduledDate must be in yyyy-MM-dd format' },
          { status: 400 },
        );
      }
      if (typeof item.sortOrder !== 'number' || item.sortOrder < 0) {
        return NextResponse.json(
          { error: 'Each item must have a valid sortOrder (non-negative number)' },
          { status: 400 },
        );
      }
    }

    // Batch update using Prisma transaction
    const updatePromises = items.map((item) =>
      db.contentPost.update({
        where: { id: item.id },
        data: {
          scheduledDate: item.scheduledDate,
        },
      }),
    );

    const updatedPosts = await db.$transaction(updatePromises);

    return NextResponse.json({
      success: true,
      updatedCount: updatedPosts.length,
      posts: updatedPosts,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma error during reorder:', error);
      return NextResponse.json(
        { error: 'Database error during reorder', details: error.message },
        { status: 500 },
      );
    }

    console.error('Failed to reorder content posts:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to reorder content posts', details: message },
      { status: 500 },
    );
  }
}
