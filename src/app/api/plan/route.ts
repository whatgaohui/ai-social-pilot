import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createNotification } from '@/lib/notification-helper';

export async function GET() {
  try {
    const plans = await db.contentPlan.findMany({
      orderBy: { createdAt: 'desc' },
      include: { posts: { orderBy: { scheduledDate: 'asc' } } },
    });
    return NextResponse.json(plans);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const plan = await db.contentPlan.create({ data: body });

    // Auto-create notification when content plan is created
    createNotification({
      type: 'completion',
      title: '内容计划已创建',
      message: `${plan.month || '新月度'}的内容计划已成功创建，包含${body.posts?.length || 0}篇内容。`,
      metadata: { actionType: 'viewData' },
    }).catch((e) => console.error("Failed to create notification:", e));

    return NextResponse.json(plan);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 });
  }
}
