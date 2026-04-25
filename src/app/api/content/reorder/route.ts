import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderedIds } = body as { orderedIds?: string[] };

    if (!orderedIds || !Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json(
        { error: 'orderedIds is required and must be a non-empty array of post IDs' },
        { status: 400 },
      );
    }

    // Validate all IDs are non-empty strings
    for (const id of orderedIds) {
      if (!id || typeof id !== 'string') {
        return NextResponse.json(
          { error: 'Each item in orderedIds must be a valid string ID' },
          { status: 400 },
        );
      }
    }

    // Batch update sortOrder using Prisma transaction
    const updatePromises = orderedIds.map((id, index) =>
      db.contentPost.update({
        where: { id },
        data: { sortOrder: index },
      }),
    );

    const updatedPosts = await db.$transaction(updatePromises);

    return NextResponse.json({
      success: true,
      updatedCount: updatedPosts.length,
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
