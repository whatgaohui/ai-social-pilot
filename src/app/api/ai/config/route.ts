import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { resetAIClient } from '@/lib/ai-service';

// POST /api/ai/config - Save AI config to runtime JSON file
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, apiKey, model, baseUrl } = body as {
      provider: string;
      apiKey: string;
      model: string;
      baseUrl: string;
    };

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API Key 不能为空' },
        { status: 400 }
      );
    }

    const config = { provider, apiKey, model, baseUrl };
    const configPath = path.join(process.cwd(), 'ai-config.json');
    await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

    // Reset the OpenAI client so it picks up the new config
    resetAIClient();

    return NextResponse.json({ success: true, data: { provider, model } });
  } catch (error) {
    console.error('Failed to save AI config:', error);
    return NextResponse.json(
      { success: false, error: '保存配置失败' },
      { status: 500 }
    );
  }
}
