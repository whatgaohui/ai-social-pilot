import { NextRequest, NextResponse } from 'next/server';
import { executeWorkflow, getWorkflowTemplates, getRecentWorkflowRuns, type WorkflowRunContext } from './engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, context } = body as {
      templateId: string;
      context: WorkflowRunContext;
    };

    if (!templateId) {
      return NextResponse.json({ error: 'Missing templateId' }, { status: 400 });
    }

    // Execute workflow (runs synchronously — in production could use streaming)
    const run = await executeWorkflow(templateId, context);

    return NextResponse.json(run);
  } catch (error) {
    console.error('Workflow execution error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Workflow execution failed' },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const templates = getWorkflowTemplates();
    const recentRuns = getRecentWorkflowRuns(10);

    return NextResponse.json({
      templates,
      recentRuns,
    });
  } catch (error) {
    console.error('Workflow GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch workflow data' }, { status: 500 });
  }
}
