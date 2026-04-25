import { NextRequest, NextResponse } from 'next/server';
import { createAIClient } from '@/lib/ai-client';
import { buildQualityScorePrompt } from '@/lib/ai-prompts';

export async function POST(request: NextRequest) {
  try {
    const { content, topic, platform = 'wechat' } = await request.json();

    if (!content) {
      return NextResponse.json({ error: '内容不能为空' }, { status: 400 });
    }

    const ai = await createAIClient();

    // Build prompts using centralized prompt builder
    const messages = buildQualityScorePrompt({ platform, content, topic });

    const response = await ai.chatCompletion(messages);

    // Extract JSON from the response (handle markdown code blocks if present)
    let jsonStr = response.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const scoreData = JSON.parse(jsonStr);

    // Validate the response structure
    if (
      typeof scoreData.overallScore !== 'number' ||
      !Array.isArray(scoreData.dimensions) ||
      !Array.isArray(scoreData.strengths) ||
      !Array.isArray(scoreData.improvements)
    ) {
      throw new Error('Invalid score data structure');
    }

    // Normalize dimensions: ensure explanation and suggestion fields exist (backward compat)
    scoreData.dimensions = scoreData.dimensions.map(
      (dim: { name: string; score: number; explanation?: string; suggestion?: string }) => ({
        name: dim.name,
        score: dim.score,
        explanation: dim.explanation || '',
        suggestion: dim.suggestion || '',
      })
    );

    return NextResponse.json(scoreData);
  } catch (error) {
    console.error('Quality score error:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'AI返回的数据格式异常，请重试' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: '质量评分失败，请稍后重试' },
      { status: 500 }
    );
  }
}
