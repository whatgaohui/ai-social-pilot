import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invalidateConfigCache } from '@/lib/ai-client';

// GET - Get all AI configs
export async function GET() {
  try {
    const configs = await db.aIConfig.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(configs);
  } catch (error) {
    console.error('Failed to fetch AI configs:', error);
    return NextResponse.json({ error: 'Failed to fetch configs' }, { status: 500 });
  }
}

// POST - Create or update AI config
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, name, provider, modelId, baseUrl, apiKey, isFree, isActive, maxTokens, temperature } = body;

    // If setting this config as active, deactivate all others first
    if (isActive) {
      await db.aIConfig.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    if (id) {
      // Update existing
      const updated = await db.aIConfig.update({
        where: { id },
        data: {
          name,
          provider: provider || 'z-ai',
          modelId: modelId || '',
          baseUrl: baseUrl || '',
          apiKey: apiKey || '',
          isFree: isFree ?? false,
          isActive: isActive ?? false,
          maxTokens: maxTokens || 2048,
          temperature: temperature ?? 0.7,
        },
      });
      invalidateConfigCache();
      return NextResponse.json(updated);
    } else {
      // Create new
      const created = await db.aIConfig.create({
        data: {
          name: name || '未命名配置',
          provider: provider || 'z-ai',
          modelId: modelId || '',
          baseUrl: baseUrl || '',
          apiKey: apiKey || '',
          isFree: isFree ?? false,
          isActive: isActive ?? false,
          maxTokens: maxTokens || 2048,
          temperature: temperature ?? 0.7,
        },
      });
      invalidateConfigCache();
      return NextResponse.json(created);
    }
  } catch (error) {
    console.error('Failed to save AI config:', error);
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
  }
}
