import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { ActionPlan, PlanType } from '@/types';

// ─── Apply Handlers ─────────────────────────────────────────────────────

interface ApplyContentParams {
  plan: ActionPlan;
  accountId: string;
  modifications?: {
    title?: string;
    contentBody?: string;
    tags?: string[];
    scheduledAt?: string;
  };
}

async function applyContentPlan(params: ApplyContentParams) {
  const { plan, accountId, modifications } = params;

  if (!plan.content) {
    throw new Error('方案数据缺失');
  }

  // Apply modifications if provided
  const title = modifications?.title || plan.content.title;
  const content = modifications?.contentBody || plan.content.contentBody;
  const tags = modifications?.tags || plan.content.tags;
  const scheduledAt = modifications?.scheduledAt || plan.content.suggestedTime;

  // Create draft in ScheduledNote
  const scheduledNote = await db.scheduledNote.create({
    data: {
      accountId,
      title,
      content,
      mediaType: plan.content.mediaType,
      mediaUrls: '[]',
      videoUrl: '',
      tags: JSON.stringify(tags),
      coverPrompt: '',
      scheduledAt: new Date(scheduledAt),
      status: 'draft',
    },
  });

  return {
    scheduledNoteId: scheduledNote.id,
    message: '内容已保存为草稿',
  };
}

interface ApplyTimingParams {
  plan: ActionPlan;
  accountId: string;
  modifications?: {
    selectedSlot?: string;
    noteIds?: string[];
  };
}

async function applyTimingPlan(params: ApplyTimingParams) {
  const { plan, accountId, modifications } = params;

  if (!plan.timing) {
    throw new Error('方案数据缺失');
  }

  const selectedSlot = modifications?.selectedSlot || plan.timing.slots[0]?.time;
  const noteIds = modifications?.noteIds || plan.timing.affectedNoteIds;

  if (!selectedSlot) {
    throw new Error('未选择时间槽');
  }

  // Update scheduled notes with new time
  const updatedNotes: Array<{
    id: string;
    accountId: string;
    title: string;
    content: string;
    mediaType: string;
    mediaUrls: string;
    videoUrl: string;
    tags: string;
    coverPrompt: string;
    scheduledAt: Date;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }> = [];
  for (const noteId of noteIds) {
    const note = await db.scheduledNote.update({
      where: { id: noteId },
      data: {
        scheduledAt: new Date(selectedSlot),
        status: 'scheduled',
      },
    });
    updatedNotes.push(note);
  }

  return {
    updatedCount: updatedNotes.length,
    scheduledAt: selectedSlot,
    message: `已调整 ${updatedNotes.length} 个笔记的发布时间`,
  };
}

// ─── API Handler ─────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: accountId } = await params;
    const body = await request.json();
    const { planId, plan, modifications } = body;

    // Accept either planId or plan object
    let actionPlan: ActionPlan;

    if (plan) {
      actionPlan = plan as ActionPlan;
    } else if (planId) {
      // In future, we might store plans in database
      // For now, plans are passed directly from frontend
      return NextResponse.json(
        { success: false, error: '请提供完整的方案数据' },
        { status: 400 }
      );
    } else {
      return NextResponse.json(
        { success: false, error: '缺少方案数据' },
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

    // Verify plan belongs to this account (via suggestionId)
    const suggestion = await db.contentSuggestion.findUnique({
      where: { id: actionPlan.suggestionId },
    });

    if (!suggestion || suggestion.accountId !== accountId) {
      return NextResponse.json(
        { success: false, error: '方案不属于该账号' },
        { status: 403 }
      );
    }

    // Dispatch to appropriate handler based on type
    let result;

    switch (actionPlan.type as PlanType) {
      case 'content':
        result = await applyContentPlan({
          plan: actionPlan,
          accountId,
          modifications,
        });
        break;
      case 'timing':
        result = await applyTimingPlan({
          plan: actionPlan,
          accountId,
          modifications,
        });
        break;
      case 'engagement':
        // Engagement plans don't need to be applied to database
        // They just provide templates for user to copy
        result = {
          message: '互动话术已生成，可复制使用',
          templates: actionPlan.engagement?.scenarios,
        };
        break;
      case 'persona':
        // TODO: Implement persona apply handler
        return NextResponse.json(
          { success: false, error: '人设调整功能开发中' },
          { status: 501 }
        );
      case 'strategy':
        // TODO: Implement strategy apply handler
        return NextResponse.json(
          { success: false, error: '运营计划功能开发中' },
          { status: 501 }
        );
      default:
        return NextResponse.json(
          { success: false, error: '未知的方案类型' },
          { status: 400 }
        );
    }

    // Mark suggestion as applied
    await db.contentSuggestion.update({
      where: { id: actionPlan.suggestionId },
      data: {
        isDismissed: true,
        metadata: JSON.stringify({
          ...JSON.parse(suggestion.metadata || '{}'),
          applied: true,
          planType: actionPlan.type,
          appliedAt: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Failed to apply plan:', error);
    const errorMessage = error instanceof Error ? error.message : '方案应用失败';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}