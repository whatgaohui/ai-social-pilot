import { NextRequest, NextResponse } from 'next/server';
import { createAIClient } from '@/lib/ai-client';
import { buildQualityOptimizePrompt } from '@/lib/ai-prompts';

export async function POST(request: NextRequest) {
  try {
    const { content, platform = 'wechat', lowDimensions, topic } = await request.json();

    if (!content) {
      return NextResponse.json({ error: '内容不能为空' }, { status: 400 });
    }

    if (!lowDimensions || !Array.isArray(lowDimensions) || lowDimensions.length === 0) {
      return NextResponse.json({ error: '请指定需要优化的维度' }, { status: 400 });
    }

    const ai = await createAIClient();

    const messages = buildQualityOptimizePrompt({
      platform,
      content,
      topic,
      lowDimensions,
    });

    const response = await ai.chatCompletion(messages);

    // Strip markdown code blocks if present
    let cleaned = response.trim();
    const codeBlockMatch = cleaned.match(/```(?:[a-zA-Z]*)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      cleaned = codeBlockMatch[1].trim();
    }

    return NextResponse.json({
      content: cleaned,
      optimizedDimensions: lowDimensions.map((d: { name: string; score: number }) => d.name),
      model: ai.config?.name || ai.config?.provider || 'default',
    });
  } catch (error) {
    console.error('Quality optimize error:', error);

    return NextResponse.json(
      { error: '质量优化失败，请稍后重试' },
      { status: 500 }
    );
  }
}
