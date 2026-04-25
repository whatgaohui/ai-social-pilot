import { NextRequest, NextResponse } from 'next/server';
import { createAIClient } from '@/lib/ai-client';
import { db } from '@/lib/db';
import { createNotification } from '@/lib/notification-helper';
import { buildOptimizePrompt } from '@/lib/ai-prompts';

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

// ── Helper: strip markdown code blocks ───────────────────────────────────────

function stripCodeBlocks(text: string): string {
  let cleaned = text.trim();
  const codeBlockMatch = cleaned.match(/```(?:[a-zA-Z]*)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }
  return cleaned;
}

// ── Main POST Handler ───────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { post, persona, feedback, knowledgeItems, platform = 'wechat', mode } = await request.json();

    // Build prompts using centralized prompt builder (handles general and format modes)
    const messages = buildOptimizePrompt({
      platform,
      post,
      persona,
      feedback,
      knowledgeItems,
      mode,
    });

    const ai = await createAIClient();

    // Check if streaming is requested
    const url = new URL(request.url);
    const streamRequested = url.searchParams.get('stream') === 'true';

    if (streamRequested) {
      // ── Streaming SSE response ──────────────────────────────────────
      const upstream = await ai.chatCompletionStream(messages);

      const onComplete = async (rawContent: string) => {
        // Strip markdown code blocks if present
        const cleaned = stripCodeBlocks(rawContent);

        // Auto-create a ContentVersion record for history tracking
        if (post?.id) {
          try {
            const maxVersion = await db.contentVersion.findFirst({
              where: { postId: post.id },
              orderBy: { version: 'desc' },
              select: { version: true },
            });
            const newVersion = (maxVersion?.version || 0) + 1;
            await db.contentVersion.create({
              data: {
                postId: post.id,
                version: newVersion,
                content: cleaned,
                changeType: 'optimize',
                summary: mode === 'format' ? 'AI排版优化' : 'AI优化文案',
                aiScore: 0,
              },
            });
          } catch (versionError) {
            console.error('Failed to auto-create content version:', versionError);
          }
        }

        // Auto-create notification: AI optimization complete
        createNotification({
          type: 'completion',
          title: 'AI内容优化完成',
          message: `「${post?.topic || '未命名内容'}」已优化完毕（${cleaned.length}字），请查看最新版本。`,
          metadata: { actionType: 'viewPost', postId: post?.id },
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
    const optimizedContent = await ai.chatCompletion(messages);

    // Strip markdown code blocks if present (AI sometimes wraps output in ```)
    const cleaned = stripCodeBlocks(optimizedContent);

    // Auto-create a ContentVersion record for history tracking
    if (post?.id) {
      try {
        const maxVersion = await db.contentVersion.findFirst({
          where: { postId: post.id },
          orderBy: { version: 'desc' },
          select: { version: true },
        });
        const newVersion = (maxVersion?.version || 0) + 1;
        await db.contentVersion.create({
          data: {
            postId: post.id,
            version: newVersion,
            content: cleaned,
            changeType: 'optimize',
            summary: mode === 'format' ? 'AI排版优化' : 'AI优化文案',
            aiScore: 0,
          },
        });
      } catch (versionError) {
        console.error('Failed to auto-create content version:', versionError);
      }
    }

    // Auto-create notification: AI optimization complete
    createNotification({
      type: 'completion',
      title: 'AI内容优化完成',
      message: `「${post?.topic || '未命名内容'}」已优化完毕（${cleaned.length}字），请查看最新版本。`,
      metadata: { actionType: 'viewPost', postId: post?.id },
    }).catch((e) => console.error('Failed to create notification:', e));

    return NextResponse.json({
      content: cleaned,
      ...(mode === 'format' ? { mode: 'format' } : {}),
      model: ai.config?.name || ai.config?.provider || 'default',
    });
  } catch (error) {
    console.error('Optimize error:', error);
    return NextResponse.json({ error: 'Failed to optimize content' }, { status: 500 });
  }
}
