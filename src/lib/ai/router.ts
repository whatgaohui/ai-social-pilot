/**
 * AI Router — abstraction layer for multiple AI providers.
 *
 * Reads the active AIProvider from the database and wraps the
 * z-ai-web-dev-sdk behind a unified interface.
 *
 * Exports:
 *   - getAIClient()   → throws if no provider configured
 *   - tryGetAIClient() → returns null if no provider configured
 */

import { db } from "@/lib/db";

// ─── Types ────────────────────────────────────────────────────────────────

export interface AIClient {
  chat: (params: {
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    temperature?: number;
  }) => Promise<{ content: string }>;
  webSearch?: (params: {
    query: string;
    num?: number;
  }) => Promise<{ items: Array<{ title?: string; snippet?: string; url?: string }> }>;
}

// ─── Internal: build a client from a provider row ─────────────────────────

async function buildClient(provider: {
  type: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  supportsWebSearch: boolean;
}): Promise<AIClient> {
  // Use z-ai-web-dev-sdk as the universal backend
  const { default: ZAiSDK } = await import("z-ai-web-dev-sdk");
  const sdk = new ZAiSDK();

  const chat: AIClient["chat"] = async ({ messages, temperature }) => {
    const res = await sdk.llm.chat({
      messages,
      temperature: temperature ?? 0.7,
    });
    return { content: res.content ?? res.text ?? "" };
  };

  const webSearch: AIClient["webSearch"] | undefined = provider.supportsWebSearch
    ? async ({ query, num }) => {
        const results = await sdk.webSearch.search({ query, num: num ?? 8 });
        return {
          items: (results.items ?? results ?? []).map(
            (item: Record<string, unknown>) => ({
              title: (item.title as string) ?? "",
              snippet: (item.snippet as string) ?? "",
              url: (item.url as string) ?? (item.link as string) ?? "",
            })
          ),
        };
      }
    : undefined;

  return { chat, webSearch };
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Try to get an AI client. Returns null when no provider is configured.
 */
export async function tryGetAIClient(): Promise<AIClient | null> {
  try {
    // Find the default active provider, or the first active one
    const provider = await db.aIProvider.findFirst({
      where: { isActive: true },
      orderBy: [{ isDefault: "desc" }, { priority: "desc" }],
    });

    if (!provider) return null;

    return await buildClient(provider);
  } catch (error) {
    console.warn("[ai/router] Failed to initialize AI client:", error);
    return null;
  }
}

/**
 * Get an AI client. Throws when no provider is configured.
 */
export async function getAIClient(): Promise<AIClient> {
  const client = await tryGetAIClient();
  if (!client) {
    throw new Error(
      "未配置 AI 模型。请前往「设置」页面添加至少一个 AI 供应商。"
    );
  }
  return client;
}
