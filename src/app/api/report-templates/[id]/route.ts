import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── PUT: 更新模板 ─────────────────────────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, icon, color, sections } = body;

    const existing = await db.reportTemplate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: '模板不存在' }, { status: 404 });
    }

    const template = await db.reportTemplate.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(icon !== undefined ? { icon } : {}),
        ...(color !== undefined ? { color } : {}),
        ...(sections !== undefined
          ? { sections: typeof sections === 'string' ? sections : JSON.stringify(sections) }
          : {}),
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error('Update template error:', error);
    return NextResponse.json({ error: '更新模板失败' }, { status: 500 });
  }
}

// ─── DELETE: 删除模板 ─────────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.reportTemplate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: '模板不存在' }, { status: 404 });
    }

    if (existing.isPreset) {
      return NextResponse.json({ error: '预设模板不能删除' }, { status: 400 });
    }

    await db.reportTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete template error:', error);
    return NextResponse.json({ error: '删除模板失败' }, { status: 500 });
  }
}
