import { NextRequest, NextResponse } from 'next/server';
import { createAIClient } from '@/lib/ai-client';
import { buildAnalyzePrompt } from '@/lib/ai-prompts';

export async function POST(request: NextRequest) {
  try {
    const { analytics, posts, platform = 'wechat' } = await request.json();

    const ai = await createAIClient();

    // Build prompts using centralized prompt builder
    const messages = buildAnalyzePrompt({ platform, analytics, posts });

    const analysis = await ai.chatCompletion(messages);
    
    return NextResponse.json({ 
      analysis,
      model: ai.config?.name || ai.config?.provider || 'default',
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json({ error: 'Failed to analyze data' }, { status: 500 });
  }
}
