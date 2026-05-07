import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/inspection/issues — List inspection issues
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Record<string, any> = {};
    if (status) where.status = status;
    if (category) where.category = category;

    const issues = await db.inspectionIssue.findMany({
      where,
      orderBy: { foundAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: issues.map((issue) => ({
        ...issue,
        foundAt: issue.foundAt.toISOString(),
        fixedAt: issue.fixedAt?.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Failed to list inspection issues:', error);
    return NextResponse.json(
      { success: false, error: '获取巡检问题失败' },
      { status: 500 }
    );
  }
}

// POST /api/inspection/issues — Create or update an issue
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { runId, issueCode, category, title, description, severity, screenshotPath, action } = body;

    // If action is provided, update existing issue
    if (action && issueCode) {
      const existing = await db.inspectionIssue.findUnique({
        where: { issueCode },
      });

      if (!existing) {
        return NextResponse.json(
          { success: false, error: '问题不存在' },
          { status: 404 }
        );
      }

      const updated = await db.inspectionIssue.update({
        where: { issueCode },
        data: {
          status: action,
          fixedAt: action === 'fixed' ? new Date() : existing.fixedAt,
        },
      });

      return NextResponse.json({
        success: true,
        data: { id: updated.id, status: updated.status },
      });
    }

    // Check if issue already exists with same code and status=open
    const existing = await db.inspectionIssue.findFirst({
      where: {
        issueCode,
        status: 'open',
      },
    });

    if (existing) {
      // Don't duplicate — just update the run reference
      return NextResponse.json({
        success: true,
        data: { id: existing.id, status: existing.status, duplicate: true },
      });
    }

    const issue = await db.inspectionIssue.create({
      data: {
        issueCode,
        category,
        title,
        description,
        severity,
        status: 'open',
        screenshotPath: screenshotPath || undefined,
        runId,
      },
    });

    return NextResponse.json({
      success: true,
      data: { id: issue.id, status: issue.status },
    });
  } catch (error) {
    console.error('Failed to create/update inspection issue:', error);
    return NextResponse.json(
      { success: false, error: '创建/更新巡检问题失败' },
      { status: 500 }
    );
  }
}
