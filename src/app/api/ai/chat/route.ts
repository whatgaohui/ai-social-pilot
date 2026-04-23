import { NextRequest, NextResponse } from 'next/server';
import { createAIClient } from '@/lib/ai-client';
import { getActiveConfig } from '@/lib/ai-client';
import { db } from '@/lib/db';

// ── System Prompt Builder ──────────────────────────────────────────────────

function buildSystemPrompt(options: {
  platform: string;
  personaId?: string;
}): string {
  const { platform, personaId } = options;
  const isXHS = platform === 'xiaohongshu';

  const platformHint = isXHS
    ? `当前平台：小红书。注意小红书的内容特点——大量使用emoji、段落简短、结尾带话题标签（#）、强调"收藏价值"。`
    : `当前平台：朋友圈。注意朋友圈的内容特点——自然亲切、有温度、控制在100-200字、适当使用emoji。`;

  const basePrompt = `你是一个专业的社交媒体运营AI助手，擅长帮助用户创作${isXHS ? '小红书笔记' : '朋友圈内容'}。

${platformHint}

核心能力：
1. **内容创作**：根据用户需求创作优质社交媒体内容
2. **文案优化**：对用户提供的文案进行润色和优化
3. **标题生成**：为内容创作吸引眼球的标题
4. **数据分析**：分析内容表现，给出优化建议
5. **发布策略**：推荐最佳发布时间和内容策略
6. **互动策划**：设计用户互动和话题

回复规范：
- 使用中文回复
- 回复简洁专业，直接给出有价值的建议
- 如果用户要求创作内容，直接输出内容本身，不需要额外解释
- 如果用户要求分析，给出具体可执行的建议
- 适当使用emoji增加亲和力`;

  return basePrompt;
}

async function buildContextMessages(options: {
  personaId?: string;
}): Promise<string> {
  const { personaId } = options;
  const contextParts: string[] = [];

  // Inject persona context
  if (personaId) {
    try {
      const persona = await db.persona.findUnique({ where: { id: personaId } });
      if (persona) {
        contextParts.push(`当前用户人设：
- 姓名：${persona.name}
- 职业/头衔：${persona.title || '未设置'}
- 行业：${persona.industry || '未设置'}
- 风格偏好：${persona.tone || '专业'}
- 文案风格：${persona.style || '均衡'}
- 目标受众：${persona.targetAudience || '普通读者'}
- 关键词：${persona.keywords || '未设置'}
- 简介：${persona.bio || '未设置'}`);
      }
    } catch (error) {
      console.error('Failed to load persona for chat context:', error);
    }
  }

  // Inject knowledge base summary (top 5 items)
  try {
    const knowledgeItems = await db.knowledgeItem.findMany({
      take: 5,
      orderBy: { updatedAt: 'desc' },
    });
    if (knowledgeItems.length > 0) {
      contextParts.push(`用户知识库摘要（最近${knowledgeItems.length}条）：
${knowledgeItems.map((item, i) => `${i + 1}. [${item.category}] ${item.title}: ${item.content.slice(0, 100)}`).join('\n')}`);
    }
  } catch (error) {
    console.error('Failed to load knowledge for chat context:', error);
  }

  return contextParts.join('\n\n');
}

// ── Streaming Helper for OpenAI-compatible APIs ────────────────────────────

interface ChatMessage {
  role: string;
  content: string;
}

async function streamOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
  temperature: number,
): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder();

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
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error (${response.status}): ${errorText}`);
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            return;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === 'data: [DONE]') {
              if (trimmed === 'data: [DONE]') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
                return;
              }
              continue;
            }
            if (trimmed.startsWith('data: ')) {
              controller.enqueue(encoder.encode(trimmed + '\n'));
            }
          }
        }
      } catch (error) {
        controller.error(error);
      }
    },

    cancel() {
      reader.cancel();
    },
  });
}

// ── Non-streaming fallback ─────────────────────────────────────────────────

async function nonStreamingResponse(
  messages: ChatMessage[],
): Promise<string> {
  const ai = await createAIClient();
  return ai.chatCompletion(messages);
}

// ── POST Handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      messages,
      platform = 'wechat',
      personaId,
      stream = false,
    } = body as {
      messages: ChatMessage[];
      platform?: string;
      personaId?: string;
      stream?: boolean;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: '请提供消息数组' },
        { status: 400 },
      );
    }

    // Build system prompt with platform context
    const systemPrompt = buildSystemPrompt({ platform, personaId });

    // Build context from persona & knowledge
    const contextStr = await buildContextMessages({ personaId });
    const fullSystemPrompt = contextStr
      ? `${systemPrompt}\n\n---\n\n${contextStr}`
      : systemPrompt;

    // Build final messages array
    const finalMessages: ChatMessage[] = [
      { role: 'system', content: fullSystemPrompt },
      ...messages,
    ];

    // Try streaming for OpenAI-compatible providers
    if (stream) {
      try {
        const config = await getActiveConfig();
        if (config && config.provider !== 'z-ai' && config.baseUrl) {
          const baseUrl = config.baseUrl.replace(/\/+$/, '');
          const model = config.modelId || 'default';
          const maxTokens = config.maxTokens || 2048;
          const temperature = config.temperature ?? 0.7;

          const streamResponse = await streamOpenAICompatible(
            baseUrl,
            config.apiKey,
            model,
            finalMessages,
            maxTokens,
            temperature,
          );

          return new Response(streamResponse, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            },
          });
        }

        // Z.ai fallback: non-streaming but wrap in a single SSE message
        const content = await nonStreamingResponse(finalMessages);
        const encoder = new TextEncoder();

        const wrappedStream = new ReadableStream<Uint8Array>({
          start(controller) {
            const payload = JSON.stringify({ content });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          },
        });

        return new Response(wrappedStream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      } catch (streamError) {
        console.error('Streaming failed, falling back to non-streaming:', streamError);
        // Fall through to non-streaming response
      }
    }

    // Non-streaming response
    const content = await nonStreamingResponse(finalMessages);

    return NextResponse.json({
      content,
      platform,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('AI chat error:', error);
    return NextResponse.json(
      { error: 'AI对话失败', details: String(error) },
      { status: 500 },
    );
  }
}
