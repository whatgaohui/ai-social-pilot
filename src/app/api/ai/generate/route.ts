import { NextRequest, NextResponse } from 'next/server';
import { createAIClient } from '@/lib/ai-client';
import { db } from '@/lib/db';
import { createNotification } from '@/lib/notification-helper';
import { buildGeneratePrompt } from '@/lib/ai-prompts';

// ── SSE Stream Helper ────────────────────────────────────────────────────────

/**
 * Converts an upstream SSE/ReadableStream from the AI provider into our own
 * SSE stream with the format:
 *   data: { "content": "partial text" }\n\n
 *   data: [DONE]\n\n
 *
 * Handles both:
 *  - OpenAI-compatible SSE format:  data: {"choices":[{"delta":{"content":"..."}}]}
 *  - z-ai SSE format (same as OpenAI)
 */
function createSSEStreamFromUpstream(
  upstream: ReadableStream<Uint8Array>,
  onComplete: (fullContent: string) => Promise<void>,
): ReadableStream<Uint8Array> {
  const reader = upstream.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let fullContent = '';
  let buffer = ''; // Buffer for incomplete SSE lines

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();

        if (done) {
          // Send [DONE] signal
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          // Run onComplete callback (e.g., save to DB, send notification)
          try {
            await onComplete(fullContent);
          } catch (e) {
            console.error('SSE onComplete callback error:', e);
          }
          controller.close();
          return;
        }

        // Decode the chunk and append to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines from the buffer
        const lines = buffer.split('\n');
        // Keep the last potentially incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6); // Remove "data: " prefix

          if (data === '[DONE]') {
            // Upstream finished — we'll signal our own [DONE] when the reader is done
            continue;
          }

          try {
            const parsed = JSON.parse(data);

            // OpenAI-compatible format: choices[0].delta.content
            const delta = parsed.choices?.[0]?.delta?.content || '';
            if (delta) {
              fullContent += delta;
              // Re-emit in our simplified SSE format
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`),
              );
            }
          } catch {
            // Skip unparseable lines
          }
        }
      } catch (error) {
        console.error('SSE stream error:', error);
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`),
          );
        } catch {
          // Controller may already be closed
        }
        controller.close();
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });
}

// ── Main POST Handler ───────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { type, mode, persona, knowledgeItems, material, topic, tone, style, existingContent, platform = 'wechat', postId, stylePreset, expandMode, condenseMode } = await request.json();

    // Build prompts using centralized prompt builder (handles auto, fragment, polish, and rewrite modes)
    const messages = buildGeneratePrompt({
      platform,
      persona,
      knowledgeItems,
      type,
      topic,
      tone,
      style,
      material,
      existingContent,
      mode,
      stylePreset,
      expandMode,
      condenseMode,
    });

    // Check if this is an unsupported type (buildGeneratePrompt returns empty messages for unsupported types)
    if ((type !== 'auto' && type !== 'fragment' && type !== 'polish') && (mode !== 'style_rewrite' && mode !== 'expand' && mode !== 'condense')) {
      return NextResponse.json({ error: 'Unsupported type', details: `Type "${type}" is not supported` }, { status: 400 });
    }

    // Check if streaming is requested
    const url = new URL(request.url);
    const streamRequested = url.searchParams.get('stream') === 'true';

    const ai = await createAIClient();

    if (streamRequested) {
      // ── Streaming SSE response ──────────────────────────────────────
      const upstream = await ai.chatCompletionStream(messages);

      const onComplete = async (fullContent: string) => {
        // Auto-create a ContentVersion record in "auto" mode when postId is provided
        if (type === 'auto' && postId) {
          try {
            const maxVersion = await db.contentVersion.findFirst({
              where: { postId },
              orderBy: { version: 'desc' },
              select: { version: true },
            });
            const newVersion = (maxVersion?.version || 0) + 1;
            await db.contentVersion.create({
              data: {
                postId,
                version: newVersion,
                content: fullContent,
                changeType: 'ai_generate',
                summary: 'AI生成文案',
                aiScore: 0,
              },
            });
          } catch (versionError) {
            console.error('Failed to auto-create content version:', versionError);
          }
        }

        // Auto-create notification: AI content generation complete
        createNotification({
          type: 'ai_task',
          title: 'AI内容生成完成',
          message: `${topic || type === 'polish' ? '润色' : '自动生成'}内容已生成完毕（${fullContent.length}字），请查看并优化。`,
          metadata: { actionType: 'viewPost', postId: postId || undefined },
        }).catch((e) => console.error('Failed to create notification:', e));
      };

      const sseStream = createSSEStreamFromUpstream(upstream, onComplete);

      return new Response(sseStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-AI-Model': ai.config?.name || ai.config?.provider || 'default',
        },
      });
    }

    // ── Non-streaming (original) response ─────────────────────────────
    const generatedContent = await ai.chatCompletion(messages);

    // Auto-create a ContentVersion record in "auto" mode when postId is provided
    if (type === 'auto' && postId) {
      try {
        const maxVersion = await db.contentVersion.findFirst({
          where: { postId },
          orderBy: { version: 'desc' },
          select: { version: true },
        });
        const newVersion = (maxVersion?.version || 0) + 1;
        await db.contentVersion.create({
          data: {
            postId,
            version: newVersion,
            content: generatedContent,
            changeType: 'ai_generate',
            summary: 'AI生成文案',
            aiScore: 0,
          },
        });
      } catch (versionError) {
        console.error('Failed to auto-create content version:', versionError);
      }
    }

    // Auto-create notification: AI content generation complete
    createNotification({
      type: 'ai_task',
      title: 'AI内容生成完成',
      message: `${topic || type === 'polish' ? '润色' : '自动生成'}内容已生成完毕（${generatedContent.length}字），请查看并优化。`,
      metadata: { actionType: 'viewPost', postId: postId || undefined },
    }).catch((e) => console.error('Failed to create notification:', e));

    return NextResponse.json({
      content: generatedContent,
      model: ai.config?.name || ai.config?.provider || 'default',
    });
  } catch (error) {
    console.error('AI generation error:', error);
    return NextResponse.json({ error: 'Failed to generate content', details: String(error) }, { status: 500 });
  }
}
