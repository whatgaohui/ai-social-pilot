import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// POST /api/inspection/run — Trigger an inspection (fire and forget)
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const quick = searchParams.get('quick') === 'true';

    // Run the inspection script in the background
    const cmd = quick
      ? 'npx tsx scripts/inspection-runner.ts --quick'
      : 'npx tsx scripts/inspection-runner.ts';

    execAsync(cmd, {
      cwd: process.cwd(),
      timeout: 120000, // 2 minute timeout
    }).catch((err) => {
      console.error('[inspection] background execution error:', err);
    });

    return NextResponse.json({
      success: true,
      data: { message: quick ? '快速巡检已启动' : '全面巡检已启动' },
    });
  } catch (error) {
    console.error('Failed to trigger inspection:', error);
    return NextResponse.json(
      { success: false, error: '启动巡检失败' },
      { status: 500 }
    );
  }
}
