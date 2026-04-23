import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── 预设模板数据 ──────────────────────────────────────────────────────

const PRESET_TEMPLATES = [
  {
    name: '周报',
    description: '每周运营数据汇总，包含发布概况、内容表现、互动分析和下周建议',
    icon: '📅',
    color: 'violet',
    isPreset: true,
    sections: JSON.stringify([
      { key: 'overview', title: '概览摘要', enabled: true },
      { key: 'top5', title: '内容表现 TOP5', enabled: true },
      { key: 'trends', title: '互动趋势', enabled: true },
      { key: 'platform', title: '平台对比', enabled: false },
      { key: 'suggestions', title: '下周建议', enabled: true },
    ]),
  },
  {
    name: '月报',
    description: '每月深度运营分析，涵盖全月数据表现和趋势洞察',
    icon: '📆',
    color: 'rose',
    isPreset: true,
    sections: JSON.stringify([
      { key: 'overview', title: '概览摘要', enabled: true },
      { key: 'top5', title: '内容表现 TOP5', enabled: true },
      { key: 'trends', title: '互动趋势', enabled: true },
      { key: 'platform', title: '平台对比', enabled: true },
      { key: 'suggestions', title: '下月建议', enabled: true },
    ]),
  },
  {
    name: '季度报告',
    description: '季度运营复盘，全面评估内容策略效果和增长趋势',
    icon: '📈',
    color: 'amber',
    isPreset: true,
    sections: JSON.stringify([
      { key: 'overview', title: '概览摘要', enabled: true },
      { key: 'top5', title: '内容表现 TOP5', enabled: true },
      { key: 'trends', title: '互动趋势', enabled: true },
      { key: 'platform', title: '平台对比', enabled: true },
      { key: 'suggestions', title: '下季度建议', enabled: true },
    ]),
  },
  {
    name: '竞品对比报告',
    description: '与竞品账号的数据对比分析，发现差距和机会',
    icon: '⚔️',
    color: 'emerald',
    isPreset: true,
    sections: JSON.stringify([
      { key: 'overview', title: '概览摘要', enabled: true },
      { key: 'top5', title: '内容表现 TOP5', enabled: true },
      { key: 'trends', title: '互动趋势', enabled: true },
      { key: 'platform', title: '平台对比', enabled: true },
      { key: 'suggestions', title: '优化建议', enabled: true },
    ]),
  },
  {
    name: '内容效果分析',
    description: '聚焦内容质量评估，分析各类内容形式的投入产出比',
    icon: '🎯',
    color: 'cyan',
    isPreset: true,
    sections: JSON.stringify([
      { key: 'overview', title: '概览摘要', enabled: true },
      { key: 'top5', title: '内容表现 TOP5', enabled: true },
      { key: 'trends', title: '互动趋势', enabled: false },
      { key: 'platform', title: '平台对比', enabled: true },
      { key: 'suggestions', title: '内容优化建议', enabled: true },
    ]),
  },
];

// ─── 确保预设模板存在 ──────────────────────────────────────────────────

async function ensurePresets() {
  const existingCount = await db.reportTemplate.count({
    where: { isPreset: true },
  });
  if (existingCount === 0) {
    await db.reportTemplate.createMany({ data: PRESET_TEMPLATES });
  }
}

// ─── GET: 获取所有模板 ─────────────────────────────────────────────────

export async function GET() {
  try {
    await ensurePresets();
    const templates = await db.reportTemplate.findMany({
      orderBy: [{ isPreset: 'desc' }, { lastUsedAt: 'desc' }],
    });
    return NextResponse.json(templates);
  } catch (error) {
    console.error('Get templates error:', error);
    return NextResponse.json({ error: '获取模板列表失败' }, { status: 500 });
  }
}

// ─── POST: 创建自定义模板 ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { name, description, icon, color, sections } = await request.json();

    if (!name || !sections) {
      return NextResponse.json({ error: '模板名称和章节不能为空' }, { status: 400 });
    }

    const template = await db.reportTemplate.create({
      data: {
        name,
        description: description || '',
        icon: icon || '📝',
        color: color || 'violet',
        isPreset: false,
        sections: typeof sections === 'string' ? sections : JSON.stringify(sections),
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Create template error:', error);
    return NextResponse.json({ error: '创建模板失败' }, { status: 500 });
  }
}
