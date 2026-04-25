import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { scrapeXhsProfile } from '@/lib/xhs-scraper';
import { analyzePost } from '@/lib/ai-service';

// POST /api/accounts/[id]/scrape - Trigger scraping for an account
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const account = await db.xhsAccount.findUnique({ where: { id } });
    if (!account) {
      return NextResponse.json(
        { success: false, error: '账号不存在' },
        { status: 404 }
      );
    }

    // Set status to scraping
    await db.xhsAccount.update({
      where: { id },
      data: { status: 'scraping', errorMessage: '' },
    });

    try {
      // Scrape the profile
      const scrapeResult = await scrapeXhsProfile(account.xhsUrl);

      // Update account info
      const updatedAccount = await db.xhsAccount.update({
        where: { id },
        data: {
          nickname: scrapeResult.account.nickname || account.nickname,
          xhsId: scrapeResult.account.xhsId || account.xhsId,
          avatarUrl: scrapeResult.account.avatarUrl || account.avatarUrl,
          bio: scrapeResult.account.bio || account.bio,
          location: scrapeResult.account.location || account.location,
          followers: scrapeResult.account.followers || account.followers,
          following: scrapeResult.account.following || account.following,
          likedCollected:
            scrapeResult.account.likedCollected || account.likedCollected,
          notesCount: scrapeResult.account.notesCount || account.notesCount,
          status: 'success',
          lastScrapedAt: new Date(),
        },
      });

      // Create or update posts
      const postsCreated: number[] = [];
      for (const postData of scrapeResult.posts) {
        if (!postData.xhsPostId && !postData.title) continue;

        // Check if post already exists
        const existingPost = postData.xhsPostId
          ? await db.xhsPost.findFirst({
              where: {
                accountId: id,
                xhsPostId: postData.xhsPostId as string,
              },
            })
          : null;

        const postFields = {
          xhsPostId: (postData.xhsPostId as string) || '',
          title: (postData.title as string) || '',
          content: (postData.content as string) || '',
          coverUrl: (postData.coverUrl as string) || '',
          imageUrls: JSON.stringify(postData.imageUrls || []),
          postType: (postData.postType as string) || 'normal',
          likes: (postData.likes as number) || 0,
          comments: (postData.comments as number) || 0,
          collects: (postData.collects as number) || 0,
          shares: (postData.shares as number) || 0,
          tags: JSON.stringify(postData.tags || []),
          category: (postData.category as string) || '',
          publishDate: (postData.publishDate as string) || '',
        };

        if (existingPost) {
          await db.xhsPost.update({
            where: { id: existingPost.id },
            data: postFields,
          });
          postsCreated.push(existingPost.id as never);
        } else {
          const newPost = await db.xhsPost.create({
            data: { accountId: id, ...postFields },
          });
          postsCreated.push(newPost.id as never);
        }
      }

      // Run AI analysis on posts in background (non-blocking)
      // We'll do a few posts at a time to avoid overwhelming the API
      const postsToAnalyze = await db.xhsPost.findMany({
        where: {
          accountId: id,
          aiAnalysis: '',
        },
        take: 5,
      });

      // Fire and forget AI analysis
      for (const post of postsToAnalyze) {
        analyzePost({
          title: post.title,
          content: post.content,
          tags: JSON.parse(post.tags || '[]'),
        })
          .then(async (analysis) => {
            await db.xhsPost.update({
              where: { id: post.id },
              data: {
                aiScore: analysis.score,
                aiAnalysis: JSON.stringify({
                  titleScore: analysis.titleScore,
                  contentScore: analysis.contentScore,
                  tagScore: analysis.tagScore,
                  engagementPrediction: analysis.engagementPrediction,
                  strengths: analysis.strengths,
                  weaknesses: analysis.weaknesses,
                  suggestions: analysis.suggestions,
                }),
              },
            });
          })
          .catch((err) => {
            console.error(`AI analysis failed for post ${post.id}:`, err);
          });
      }

      return NextResponse.json({
        success: true,
        data: {
          account: updatedAccount,
          postsFound: scrapeResult.totalFound,
          postsSynced: postsCreated.length,
        },
      });
    } catch (scrapeError) {
      // Update account status to error
      await db.xhsAccount.update({
        where: { id },
        data: {
          status: 'error',
          errorMessage:
            scrapeError instanceof Error
              ? scrapeError.message
              : '采集失败',
        },
      });

      throw scrapeError;
    }
  } catch (error) {
    console.error('Scraping failed:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '采集失败，请重试',
      },
      { status: 500 }
    );
  }
}
