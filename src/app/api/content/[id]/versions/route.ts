import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET: Fetch all versions for a post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const versions = await db.contentVersion.findMany({
      where: { postId: id },
      orderBy: { version: 'desc' },
    });

    return NextResponse.json(versions);
  } catch (error) {
    console.error('Failed to fetch content versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch versions' },
      { status: 500 }
    );
  }
}

// POST: Create a new version
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { content, changeType = 'edit', summary = '', aiScore = 0 } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Verify the post exists
    const post = await db.contentPost.findUnique({
      where: { id },
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Find max version for this post, increment by 1
    const maxVersion = await db.contentVersion.findFirst({
      where: { postId: id },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    const newVersion = (maxVersion?.version || 0) + 1;

    const version = await db.contentVersion.create({
      data: {
        postId: id,
        version: newVersion,
        content,
        changeType,
        summary,
        aiScore,
      },
    });

    return NextResponse.json(version, { status: 201 });
  } catch (error) {
    console.error('Failed to create content version:', error);
    return NextResponse.json(
      { error: 'Failed to create version' },
      { status: 500 }
    );
  }
}
