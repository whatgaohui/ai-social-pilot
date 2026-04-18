import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Get overall analytics from content posts
    const publishedPosts = await db.contentPost.findMany({
      where: { status: 'published' },
    });
    
    const allPosts = await db.contentPost.findMany();
    
    const totalPosts = allPosts.length;
    const publishedCount = publishedPosts.length;
    const totalLikes = allPosts.reduce((sum, p) => sum + p.likes, 0);
    const totalComments = allPosts.reduce((sum, p) => sum + p.comments, 0);
    const totalShares = allPosts.reduce((sum, p) => sum + p.shares, 0);
    const totalViews = allPosts.reduce((sum, p) => sum + p.views, 0);
    const avgScore = totalPosts > 0 
      ? allPosts.reduce((sum, p) => sum + p.aiScore, 0) / totalPosts 
      : 0;

    // Content type distribution
    const typeDistribution: Record<string, number> = {};
    allPosts.forEach(p => {
      typeDistribution[p.contentType] = (typeDistribution[p.contentType] || 0) + 1;
    });

    // Status distribution
    const statusDistribution: Record<string, number> = {};
    allPosts.forEach(p => {
      statusDistribution[p.status] = (statusDistribution[p.status] || 0) + 1;
    });

    // Top performing posts
    const topPosts = [...allPosts]
      .sort((a, b) => (b.likes + b.comments * 2 + b.shares * 3) - (a.likes + a.comments * 2 + a.shares * 3))
      .slice(0, 5);

    return NextResponse.json({
      totalPosts,
      publishedCount,
      totalLikes,
      totalComments,
      totalShares,
      totalViews,
      avgScore: Math.round(avgScore * 10) / 10,
      typeDistribution,
      statusDistribution,
      topPosts,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
