import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── Response Types ────────────────────────────────────────────────────────────

interface ContentResult {
  id: string;
  type: 'content';
  topic: string;
  content: string;
  platform: string;
  status: string;
  contentType: string;
  scheduledDate: string;
}

interface KnowledgeResult {
  id: string;
  type: 'knowledge';
  title: string;
  content: string;
  category: string;
  tags: string;
}

interface PersonaResult {
  id: string;
  type: 'persona';
  name: string;
  title: string;
  bio: string;
  industry: string;
}

interface AccountResult {
  id: string;
  type: 'account';
  nickname: string;
  platform: string;
  bio: string;
  followers: number;
  postsCount: number;
}

type SearchResult = ContentResult | KnowledgeResult | PersonaResult | AccountResult;

interface SearchResponse {
  query: string;
  type: string;
  total: number;
  results: {
    content: ContentResult[];
    knowledge: KnowledgeResult[];
    persona: PersonaResult[];
    accounts: AccountResult[];
  };
}

// ─── GET /api/search?q=xxx&type=content|knowledge|persona|accounts ──────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() ?? '';
    const type = searchParams.get('type'); // optional: 'content' | 'knowledge' | 'persona' | 'accounts'

    if (!q) {
      return NextResponse.json<SearchResponse>({
        query: '',
        type: type ?? 'all',
        total: 0,
        results: {
          content: [],
          knowledge: [],
          persona: [],
          accounts: [],
        },
      });
    }

    const results: SearchResponse['results'] = {
      content: [],
      knowledge: [],
      persona: [],
      accounts: [],
    };

    // ── Search Content Posts ─────────────────────────────────────────────────
    if (!type || type === 'content') {
      const posts = await db.contentPost.findMany({
        where: {
          OR: [
            { topic: { contains: q } },
            { content: { contains: q } },
            { platform: { contains: q } },
          ],
        },
        orderBy: { updatedAt: 'desc' },
        take: 15,
      });

      results.content = posts.map((p) => ({
        id: p.id,
        type: 'content' as const,
        topic: p.topic,
        content: p.content,
        platform: p.platform,
        status: p.status,
        contentType: p.contentType,
        scheduledDate: p.scheduledDate,
      }));
    }

    // ── Search Knowledge Items ───────────────────────────────────────────────
    if (!type || type === 'knowledge') {
      const items = await db.knowledgeItem.findMany({
        where: {
          OR: [
            { title: { contains: q } },
            { content: { contains: q } },
            { category: { contains: q } },
            { tags: { contains: q } },
          ],
        },
        orderBy: { updatedAt: 'desc' },
        take: 12,
      });

      results.knowledge = items.map((k) => ({
        id: k.id,
        type: 'knowledge' as const,
        title: k.title,
        content: k.content,
        category: k.category,
        tags: k.tags,
      }));
    }

    // ── Search Persona ───────────────────────────────────────────────────────
    if (!type || type === 'persona') {
      const personas = await db.persona.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { title: { contains: q } },
            { bio: { contains: q } },
            { industry: { contains: q } },
            { keywords: { contains: q } },
            { tone: { contains: q } },
          ],
        },
        take: 3,
      });

      results.persona = personas.map((p) => ({
        id: p.id,
        type: 'persona' as const,
        name: p.name,
        title: p.title,
        bio: p.bio,
        industry: p.industry,
      }));
    }

    // ── Search Tracked Accounts ──────────────────────────────────────────────
    if (!type || type === 'accounts') {
      const accounts = await db.trackedAccount.findMany({
        where: {
          OR: [
            { nickname: { contains: q } },
            { bio: { contains: q } },
            { platform: { contains: q } },
          ],
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      });

      results.accounts = accounts.map((a) => ({
        id: a.id,
        type: 'account' as const,
        nickname: a.nickname,
        platform: a.platform,
        bio: a.bio,
        followers: a.followers,
        postsCount: a.postsCount,
      }));
    }

    const total =
      results.content.length +
      results.knowledge.length +
      results.persona.length +
      results.accounts.length;

    return NextResponse.json<SearchResponse>({
      query: q,
      type: type ?? 'all',
      total,
      results,
    });
  } catch (error) {
    console.error('[Search API] Error:', error);
    return NextResponse.json(
      { error: '搜索失败', details: String(error) },
      { status: 500 },
    );
  }
}
