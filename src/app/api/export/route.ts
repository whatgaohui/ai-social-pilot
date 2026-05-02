import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/export - Export all data as JSON
export async function POST() {
  try {
    // Fetch all accounts with their related data
    const accounts = await db.xhsAccount.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        posts: { orderBy: { publishDate: 'desc' } },
        persona: true,
        drafts: { orderBy: { updatedAt: 'desc' } },
      },
    });

    // Transform to clean export format
    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      accounts: accounts.map((account) => ({
        id: account.id,
        xhsUrl: account.xhsUrl,
        xhsId: account.xhsId,
        nickname: account.nickname,
        avatarUrl: account.avatarUrl,
        bio: account.bio,
        location: account.location,
        followers: account.followers,
        following: account.following,
        likedCollected: account.likedCollected,
        notesCount: account.notesCount,
        status: account.status,
        lastScrapedAt: account.lastScrapedAt?.toISOString() || null,
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString(),
        posts: account.posts.map((post) => ({
          id: post.id,
          xhsPostId: post.xhsPostId,
          title: post.title,
          content: post.content,
          coverUrl: post.coverUrl,
          imageUrls: JSON.parse(post.imageUrls || '[]'),
          postType: post.postType,
          likes: post.likes,
          comments: post.comments,
          collects: post.collects,
          shares: post.shares,
          tags: JSON.parse(post.tags || '[]'),
          category: post.category,
          aiScore: post.aiScore,
          aiAnalysis: post.aiAnalysis,
          publishDate: post.publishDate,
        })),
        persona: account.persona
          ? {
              id: account.persona.id,
              name: account.persona.name,
              tone: account.persona.tone,
              writingStyle: account.persona.writingStyle,
              targetAudience: account.persona.targetAudience,
              contentThemes: JSON.parse(account.persona.contentThemes || '[]'),
              keywords: JSON.parse(account.persona.keywords || '[]'),
              avoidTopics: JSON.parse(account.persona.avoidTopics || '[]'),
              referenceDesc: account.persona.referenceDesc,
              signaturePhrase: account.persona.signaturePhrase,
            }
          : null,
        drafts: account.drafts.map((draft) => ({
          id: draft.id,
          title: draft.title,
          content: draft.content,
          coverPrompt: draft.coverPrompt,
          tags: JSON.parse(draft.tags || '[]'),
          status: draft.status,
          aiModel: draft.aiModel,
          aiSuggestions: draft.aiSuggestions,
          createdAt: draft.createdAt.toISOString(),
          updatedAt: draft.updatedAt.toISOString(),
        })),
      })),
    };

    return NextResponse.json({ success: true, data: exportData });
  } catch (error) {
    console.error('Failed to export data:', error);
    return NextResponse.json(
      { success: false, error: '导出数据失败' },
      { status: 500 }
    );
  }
}
