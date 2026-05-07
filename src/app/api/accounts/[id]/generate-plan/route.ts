import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateContent } from '@/lib/ai-service';
import type { ActionPlan, PlanType } from '@/types';

// ─── Plan Handlers ──────────────────────────────────────────────────────

async function handleContentPlan(
  accountId: string,
  suggestionText: string,
  suggestionId: string
): Promise<ActionPlan> {
  // Get account data for context
  const account = await db.xhsAccount.findUnique({
    where: { id: accountId },
    include: {
      posts: {
        orderBy: { publishDate: 'desc' },
        take: 10,
      },
      persona: true,
    },
  });

  if (!account) {
    throw new Error('账号不存在');
  }

  // Extract topic from suggestion text
  const topicMatch = suggestionText.match(/建议.*?(多发|创作|发布)?(.+?)内容/);
  const topic = topicMatch?.[2] || suggestionText.replace(/建议/g, '').slice(0, 20);

  // Generate content using AI
  const generated = await generateContent({
    accountId,
    topic,
    persona: account.persona
      ? {
          id: account.persona.id,
          accountId: account.persona.accountId,
          name: account.persona.name,
          tone: account.persona.tone as 'warm' | 'professional' | 'witty' | 'casual' | 'elegant',
          writingStyle: account.persona.writingStyle as 'concise' | 'detailed' | 'emotional' | 'balanced',
          targetAudience: account.persona.targetAudience,
          contentThemes: JSON.parse(account.persona.contentThemes || '[]'),
          keywords: JSON.parse(account.persona.keywords || '[]'),
          avoidTopics: JSON.parse(account.persona.avoidTopics || '[]'),
          referenceDesc: account.persona.referenceDesc,
          signaturePhrase: account.persona.signaturePhrase,
        }
      : null,
    referencePosts: account.posts.map((p) => ({
      id: p.id,
      accountId: p.accountId,
      xhsPostId: p.xhsPostId,
      title: p.title,
      content: p.content,
      coverUrl: p.coverUrl,
      imageUrls: JSON.parse(p.imageUrls || '[]'),
      postType: p.postType as 'normal' | 'video',
      likes: p.likes,
      comments: p.comments,
      collects: p.collects,
      shares: p.shares,
      tags: JSON.parse(p.tags || '[]'),
      category: p.category,
      aiScore: p.aiScore,
      aiAnalysis: p.aiAnalysis,
      publishDate: p.publishDate,
    })),
  });

  // Calculate suggested time (next peak hour)
  const now = new Date();
  const hour = now.getHours();
  const suggestedHour = hour < 12 ? 18 : hour < 18 ? 19 : 12;
  const suggestedTime = new Date(now);
  suggestedTime.setDate(suggestedTime.getDate() + 1);
  suggestedTime.setHours(suggestedHour, 0, 0, 0);

  const plan: ActionPlan = {
    id: `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    suggestionId,
    type: 'content',
    status: 'pending',
    title: `AI 内容方案：${topic}`,
    description: `基于建议"${suggestionText}"生成的笔记草稿`,
    content: {
      title: generated.title,
      contentBody: generated.content,
      tags: generated.tags,
      mediaType: 'image',
      suggestedTime: suggestedTime.toISOString(),
    },
    createdAt: new Date().toISOString(),
  };

  return plan;
}

async function handleTimingPlan(
  accountId: string,
  suggestionText: string,
  suggestionId: string
): Promise<ActionPlan> {
  // Get account's recent posts to analyze posting patterns
  const posts = await db.xhsPost.findMany({
    where: { accountId },
    orderBy: { publishDate: 'desc' },
    take: 30,
  });

  // Analyze engagement by hour
  const hourEngagement = new Map<number, { total: number; count: number }>();
  posts.forEach((post) => {
    if (post.publishTime) {
      const hour = parseInt(post.publishTime.split(':')[0] || '0', 10);
      const engagement = post.likes + post.comments + post.collects + post.shares;
      const existing = hourEngagement.get(hour) || { total: 0, count: 0 };
      hourEngagement.set(hour, {
        total: existing.total + engagement,
        count: existing.count + 1,
      });
    }
  });

  // Calculate best hours
  const hourStats = Array.from(hourEngagement.entries())
    .map(([hour, stats]) => ({
      hour,
      avgEngagement: stats.count > 0 ? stats.total / stats.count : 0,
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);

  // Get scheduled notes that need time adjustment
  const scheduledNotes = await db.scheduledNote.findMany({
    where: {
      accountId,
      status: 'draft',
    },
    take: 5,
  });

  // Generate time slots based on analysis
  const now = new Date();
  const slots: Array<{ time: string; activity: 'high' | 'medium' | 'low' }> = [];

  // Add top 3 best hours as suggestions
  const topHours = hourStats.slice(0, 3);
  if (topHours.length > 0) {
    for (let i = 0; i < topHours.length; i++) {
      const hour = topHours[i].hour;
      const activity = i === 0 ? 'high' : i === 1 ? 'medium' : 'low';
      const slotTime = new Date(now);
      slotTime.setDate(slotTime.getDate() + i);
      slotTime.setHours(hour, 30, 0, 0);
      slots.push({
        time: slotTime.toISOString(),
        activity: activity as 'high' | 'medium' | 'low',
      });
    }
  } else {
    // Fallback: use common best times
    const defaultHours = [18, 19, 20];
    for (let i = 0; i < defaultHours.length; i++) {
      const slotTime = new Date(now);
      slotTime.setDate(slotTime.getDate() + i);
      slotTime.setHours(defaultHours[i], 0, 0, 0);
      slots.push({
        time: slotTime.toISOString(),
        activity: i === 0 ? 'high' : 'medium' as 'high' | 'medium' | 'low',
      });
    }
  }

  const plan: ActionPlan = {
    id: `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    suggestionId,
    type: 'timing',
    status: 'pending',
    title: 'AI 时间推荐',
    description: `基于建议"${suggestionText}"分析的发布时间优化方案`,
    timing: {
      slots,
      affectedNoteIds: scheduledNotes.map((n) => n.id),
    },
    createdAt: new Date().toISOString(),
  };

  return plan;
}

// ─── API Handler ─────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: accountId } = await params;
    const body = await request.json();
    const { suggestionId, suggestionText, suggestionType } = body;

    if (!suggestionId || !suggestionText || !suggestionType) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段' },
        { status: 400 }
      );
    }

    // Verify account exists
    const account = await db.xhsAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return NextResponse.json(
        { success: false, error: '账号不存在' },
        { status: 404 }
      );
    }

    // Verify suggestion exists
    const suggestion = await db.contentSuggestion.findUnique({
      where: { id: suggestionId },
    });

    if (!suggestion || suggestion.accountId !== accountId) {
      return NextResponse.json(
        { success: false, error: '建议不存在' },
        { status: 404 }
      );
    }

    // Dispatch to appropriate handler based on type
    let plan: ActionPlan;

    switch (suggestionType as PlanType) {
      case 'content':
        plan = await handleContentPlan(accountId, suggestionText, suggestionId);
        break;
      case 'timing':
        plan = await handleTimingPlan(accountId, suggestionText, suggestionId);
        break;
      case 'engagement':
        // TODO: Implement engagement handler
        return NextResponse.json(
          { success: false, error: '互动优化功能开发中' },
          { status: 501 }
        );
      case 'persona':
        // TODO: Implement persona handler
        return NextResponse.json(
          { success: false, error: '人设调整功能开发中' },
          { status: 501 }
        );
      case 'strategy':
        // TODO: Implement strategy handler
        return NextResponse.json(
          { success: false, error: '运营计划功能开发中' },
          { status: 501 }
        );
      default:
        return NextResponse.json(
          { success: false, error: '未知的建议类型' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error('Failed to generate plan:', error);
    const errorMessage = error instanceof Error ? error.message : '方案生成失败';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}