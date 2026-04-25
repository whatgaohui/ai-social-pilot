import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SuggestionResponse {
  query: string;
  suggestions: Array<{
    text: string;
    type: 'recent' | 'topic' | 'knowledge' | 'template';
    category?: string;
  }>;
}

// ─── In-Memory Cache ──────────────────────────────────────────────────────────

const suggestionCache = new Map<string, { data: SuggestionResponse; expiresAt: number }>();
const CACHE_TTL_MS = 30_000;

// ─── Recent Search Key ────────────────────────────────────────────────────────
const RECENT_SEARCH_HEADER = 'x-recent-searches';

// ─── GET /api/search/suggestions?q=xxx ───────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() ?? '';

    if (!q || q.length < 1) {
      return NextResponse.json<SuggestionResponse>({ query: q, suggestions: [] });
    }

    // Check cache
    const cacheKey = `sug:${q}`;
    const cached = suggestionCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return NextResponse.json(cached.data);
    }

    const suggestions: SuggestionResponse['suggestions'] = [];
    const seen = new Set<string>();
    const ql = q.toLowerCase();

    // 1. Add recent searches that match (from client header)
    const recentHeader = request.headers.get(RECENT_SEARCH_HEADER);
    if (recentHeader) {
      try {
        const recentSearches: string[] = JSON.parse(recentHeader);
        for (const rs of recentSearches) {
          if (rs.toLowerCase().includes(ql) && !seen.has(rs)) {
            suggestions.push({ text: rs, type: 'recent' });
            seen.add(rs);
          }
        }
      } catch {
        // ignore parse errors
      }
    }

    // 2. Fetch content topics matching
    const posts = await db.contentPost.findMany({
      where: { topic: { contains: q } },
      select: { topic: true, contentType: true },
      take: 10,
      orderBy: { updatedAt: 'desc' },
    });

    for (const p of posts) {
      if (!seen.has(p.topic)) {
        suggestions.push({ text: p.topic, type: 'topic', category: p.contentType });
        seen.add(p.topic);
      }
    }

    // 3. Fetch knowledge titles
    const knowledge = await db.knowledgeItem.findMany({
      where: {
        OR: [
          { title: { contains: q } },
          { tags: { contains: q } },
        ],
      },
      select: { title: true, category: true },
      take: 5,
      orderBy: { updatedAt: 'desc' },
    });

    for (const k of knowledge) {
      if (!seen.has(k.title)) {
        suggestions.push({ text: k.title, type: 'knowledge', category: k.category });
        seen.add(k.title);
      }
    }

    // 4. Static template suggestions
    const TEMPLATES = [
      { title: '早安问候', category: '日常' },
      { title: '专业分享', category: '专业' },
      { title: '故事叙述', category: '故事' },
      { title: '互动话题', category: '互动' },
      { title: '观点洞察', category: '观点' },
      { title: '成就展示', category: '成就' },
    ];

    for (const t of TEMPLATES) {
      if (t.title.toLowerCase().includes(ql) && !seen.has(t.title)) {
        suggestions.push({ text: t.title, type: 'template', category: t.category });
        seen.add(t.title);
      }
    }

    // Return top 5
    const topSuggestions = suggestions.slice(0, 5);
    const response: SuggestionResponse = { query: q, suggestions: topSuggestions };

    // Cache
    if (suggestionCache.size > 200) {
      const firstKey = suggestionCache.keys().next().value;
      if (firstKey) suggestionCache.delete(firstKey);
    }
    suggestionCache.set(cacheKey, { data: response, expiresAt: Date.now() + CACHE_TTL_MS });

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Suggestions API] Error:', error);
    return NextResponse.json(
      { error: '获取建议失败', details: String(error) },
      { status: 500 },
    );
  }
}
