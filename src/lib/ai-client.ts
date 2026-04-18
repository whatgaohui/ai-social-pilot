/**
 * AI Client Helper - Server-side only
 * 
 * Supports multiple providers:
 * - z-ai: Built-in Z.ai SDK (default)
 * - gemini: Google Gemini via OpenRouter
 * - groq: Groq free tier
 * - cerebras: Cerebras free inference
 * - siliconflow: SiliconFlow (Chinese)
 * - openrouter: OpenRouter (aggregator)
 * - custom: Any OpenAI-compatible API
 */

import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';
import type { AIModelConfig } from '@/lib/ai-providers';

// Cache for active config to avoid repeated DB queries
let cachedConfig: AIModelConfig | null = null;
let configCacheTime = 0;
const CONFIG_CACHE_TTL = 60000; // 1 minute

/**
 * Get the active AI configuration from database
 */
export async function getActiveConfig(): Promise<AIModelConfig | null> {
  const now = Date.now();
  if (cachedConfig && (now - configCacheTime) < CONFIG_CACHE_TTL) {
    return cachedConfig;
  }

  try {
    const configs = await db.aIConfig.findMany({
      where: { isActive: true },
    });

    if (configs.length > 0) {
      const config = configs[0] as unknown as AIModelConfig;
      cachedConfig = config;
      configCacheTime = now;
      return config;
    }
  } catch (error) {
    console.error('Failed to load AI config from DB:', error);
  }

  return null;
}

/**
 * Create an AI client based on the active configuration
 * Returns an object with a chatCompletion method
 */
export async function createAIClient(config?: AIModelConfig | null) {
  const activeConfig = config || await getActiveConfig();

  if (!activeConfig) {
    // Fall back to default Z.ai SDK
    const zai = await ZAI.create();
    return {
      config: { provider: 'z-ai', modelId: 'default', name: 'Z.ai 内置' } as Partial<AIModelConfig>,
      chatCompletion: async (messages: Array<{ role: string; content: string }>) => {
        const completion = await zai.chat.completions.create({
          messages: messages.map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })),
          thinking: { type: 'disabled' },
        });
        return completion.choices[0]?.message?.content || '';
      },
    };
  }

  // Z.ai built-in
  if (activeConfig.provider === 'z-ai') {
    const zai = await ZAI.create();
    return {
      config: activeConfig,
      chatCompletion: async (messages: Array<{ role: string; content: string }>) => {
        const completion = await zai.chat.completions.create({
          messages: messages.map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })),
          thinking: { type: 'disabled' },
        });
        return completion.choices[0]?.message?.content || '';
      },
    };
  }

  // OpenAI-compatible providers (groq, cerebras, siliconflow, openrouter, gemini, custom)
  const baseUrl = activeConfig.baseUrl.replace(/\/+$/, '');
  const apiKey = activeConfig.apiKey;
  const model = activeConfig.modelId || 'default';
  const maxTokens = activeConfig.maxTokens || 2048;
  const temperature = activeConfig.temperature ?? 0.7;

  return {
    config: activeConfig,
    chatCompletion: async (messages: Array<{ role: string; content: string }>) => {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    },
  };
}

/**
 * Test a model connection
 */
export async function testConnection(config: {
  provider: string;
  baseUrl: string;
  apiKey: string;
  modelId: string;
}): Promise<{ success: boolean; message: string; latency?: number }> {
  const startTime = Date.now();

  try {
    // Z.ai built-in
    if (config.provider === 'z-ai') {
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'user', content: 'Hi, respond with just "OK"' },
        ],
        thinking: { type: 'disabled' },
      });
      const latency = Date.now() - startTime;
      return {
        success: !!completion.choices[0]?.message?.content,
        message: completion.choices[0]?.message?.content || 'Connected',
        latency,
      };
    }

    // OpenAI-compatible
    const baseUrl = config.baseUrl.replace(/\/+$/, '');
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.modelId,
        messages: [{ role: 'user', content: 'Hi, respond with just "OK"' }],
        max_tokens: 10,
      }),
    });

    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        message: `HTTP ${response.status}: ${errorText.slice(0, 200)}`,
        latency,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    return {
      success: true,
      message: `连接成功！模型回复: "${content.slice(0, 50)}"`,
      latency,
    };
  } catch (error) {
    return {
      success: false,
      message: `连接失败: ${error instanceof Error ? error.message : String(error)}`,
      latency: Date.now() - startTime,
    };
  }
}

/**
 * Invalidate config cache
 */
export function invalidateConfigCache() {
  cachedConfig = null;
  configCacheTime = 0;
}
