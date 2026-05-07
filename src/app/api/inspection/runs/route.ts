import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/inspection/runs - Create or update an inspection run
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      status,
      totalChecks,
      passedChecks,
      failedChecks,
      issuesFound,
      newIssues,
      durationMs,
      skipReason,
    } = body;

    // If we have a runId in the body, update existing; otherwise create new
    if (status === 'running') {
      const run = await db.inspectionRun.create({
        data: {
          status,
          totalChecks: totalChecks ?? 0,
          passedChecks: passedChecks ?? 0,
          failedChecks: failedChecks ?? 0,
          issuesFound: issuesFound ?? 0,
          newIssues: newIssues ?? 0,
          durationMs: durationMs ?? 0,
        },
      });

      return NextResponse.json({
        success: true,
        data: { id: run.id, status: run.status },
      });
    }

    // Update the most recent running run
    const latestRun = await db.inspectionRun.findFirst({
      where: { status: 'running' },
      orderBy: { startedAt: 'desc' },
    });

    if (!latestRun) {
      // Create a new run with the completed status
      const run = await db.inspectionRun.create({
        data: {
          status: status || 'completed',
          totalChecks: totalChecks ?? 0,
          passedChecks: passedChecks ?? 0,
          failedChecks: failedChecks ?? 0,
          issuesFound: issuesFound ?? 0,
          newIssues: newIssues ?? 0,
          durationMs: durationMs ?? 0,
          skipReason: skipReason || undefined,
          completedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        data: { id: run.id, status: run.status },
      });
    }

    const run = await db.inspectionRun.update({
      where: { id: latestRun.id },
      data: {
        status,
        totalChecks: totalChecks ?? latestRun.totalChecks,
        passedChecks: passedChecks ?? latestRun.passedChecks,
        failedChecks: failedChecks ?? latestRun.failedChecks,
        issuesFound: issuesFound ?? latestRun.issuesFound,
        newIssues: newIssues ?? latestRun.newIssues,
        durationMs: durationMs ?? latestRun.durationMs,
        completedAt: new Date(),
        skipReason: skipReason ?? latestRun.skipReason,
      },
    });

    return NextResponse.json({
      success: true,
      data: { id: run.id, status: run.status },
    });
  } catch (error) {
    console.error('Failed to create/update inspection run:', error);
    return NextResponse.json(
      { success: false, error: '创建巡检记录失败' },
      { status: 500 }
    );
  }
}

// GET /api/inspection/runs - List recent inspection runs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const runs = await db.inspectionRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: runs.map((run) => ({
        ...run,
        startedAt: run.startedAt.toISOString(),
        completedAt: run.completedAt?.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Failed to list inspection runs:', error);
    return NextResponse.json(
      { success: false, error: '获取巡检记录失败' },
      { status: 500 }
    );
  }
}
