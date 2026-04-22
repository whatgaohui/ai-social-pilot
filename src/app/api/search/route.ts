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
  likes: number;
  comments: number;
  shares: number;
  views: number;
  updatedAt: string;
  /** relevance score – higher = better match */
  _score?: number;
}

interface KnowledgeResult {
  id: string;
  type: 'knowledge';
  title: string;
  content: string;
  category: string;
  tags: string;
  updatedAt: string;
  _score?: number;
}

interface PersonaResult {
  id: string;
  type: 'persona';
  name: string;
  title: string;
  bio: string;
  industry: string;
  _score?: number;
}

interface AccountResult {
  id: string;
  type: 'account';
  nickname: string;
  platform: string;
  bio: string;
  followers: number;
  postsCount: number;
  updatedAt: string;
  _score?: number;
}

interface TemplateResult {
  id: string;
  type: 'template';
  title: string;
  description: string;
  category: string;
  _score?: number;
}

type SearchResult = ContentResult | KnowledgeResult | PersonaResult | AccountResult | TemplateResult;

interface SearchResponse {
  query: string;
  category: string;
  sort: string;
  total: number;
  results: {
    content: ContentResult[];
    knowledge: KnowledgeResult[];
    persona: PersonaResult[];
    accounts: AccountResult[];
    templates: TemplateResult[];
  };
}

// ─── Relevance Scoring ─────────────────────────────────────────────────────────

/**
 * Simple relevance score: counts occurrences of `q` in `text`, with bonus
 * for matches at the beginning of the string.
 */
function relevanceScore(text: string, q: string): number {
  if (!q) return 0;
  const lower = text.toLowerCase();
  const ql = q.toLowerCase();
  let score = 0;
  let pos = 0;

  while (true) {
    const idx = lower.indexOf(ql, pos);
    if (idx === -1) break;
    // Bonus for early matches
    score += 1 + (idx < 30 ? 2 : 0);
    pos = idx + 1;
  }
  return score;
}

// ─── Static Template Data (inline mirror of copywriting-templates.tsx) ────────

const TEMPLATES = [
  { id: 'morning', title: '早安问候', description: '温暖有活力的早安文案，适合每日打卡', category: '日常' },
  { id: 'expertise', title: '专业分享', description: '展示专业能力，建立行业影响力', category: '专业' },
  { id: 'story', title: '故事叙述', description: '用故事引发共鸣，增强情感连接', category: '故事' },
  { id: 'interaction', title: '互动话题', description: '引发讨论，提升朋友圈活跃度', category: '互动' },
  { id: 'insight', title: '观点洞察', description: '独到见解，展现思考深度', category: '观点' },
  { id: 'achievement', title: '成就展示', description: '分享成果，建立信任和影响力', category: '成就' },
];

// ─── Allowed Values ────────────────────────────────────────────────────────────

const VALID_CATEGORIES = ['all', 'posts', 'knowledge', 'persona', 'accounts', 'templates'] as const;
const VALID_SORTS = ['relevance', 'newest', 'interactions'] as const;

// ─── GET /api/search?q=xxx&category=all&sort=relevance ────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() ?? '';
    const category = searchParams.get('category') ?? 'all';
    const sort = searchParams.get('sort') ?? 'relevance';

    // Validate params
    const safeCategory = VALID_CATEGORIES.includes(category as typeof VALID_CATEGORIES[number])
      ? category
      : 'all';
    const safeSort = VALID_SORTS.includes(sort as typeof VALID_SORTS[number])
      ? sort
      : 'relevance';

    if (!q) {
      return NextResponse.json<SearchResponse>({
        query: '',
        category: safeCategory,
        sort: safeSort,
        total: 0,
        results: {
          content: [],
          knowledge: [],
          persona: [],
          accounts: [],
          templates: [],
        },
      });
    }

    const results: SearchResponse['results'] = {
      content: [],
      knowledge: [],
      persona: [],
      accounts: [],
      templates: [],
    };

    // ── Search Content Posts ───────────────────────────────────────────────
    if (safeCategory === 'all' || safeCategory === 'posts') {
      const posts = await db.contentPost.findMany({
        where: {
          OR: [
            { topic: { contains: q } },
            { content: { contains: q } },
            { platform: { contains: q } },
          ],
        },
        orderBy: safeSort === 'newest'
          ? { updatedAt: 'desc' }
          : safeSort === 'interactions'
            ? undefined
            : undefined,
        take: 20,
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
        likes: p.likes,
        comments: p.comments,
        shares: p.shares,
        views: p.views,
        updatedAt: p.updatedAt.toISOString(),
        _score: relevanceScore(`${p.topic} ${p.content}`, q),
      }));

      // Sort client-side when needed
      if (safeSort === 'relevance') {
        results.content.sort((a, b) => (b._score ?? 0) - (a._score ?? 0));
      } else if (safeSort === 'interactions') {
        results.content.sort((a, b) =>
          (b.likes + b.comments + b.shares) - (a.likes + a.comments + a.shares)
        );
      }
    }

    // ── Search Knowledge Items ─────────────────────────────────────────────
    if (safeCategory === 'all' || safeCategory === 'knowledge') {
      const items = await db.knowledgeItem.findMany({
        where: {
          OR: [
            { title: { contains: q } },
            { content: { contains: q } },
            { category: { contains: q } },
            { tags: { contains: q } },
          ],
        },
        orderBy: safeSort === 'newest' ? { updatedAt: 'desc' } : undefined,
        take: 15,
      });

      results.knowledge = items.map((k) => ({
        id: k.id,
        type: 'knowledge' as const,
        title: k.title,
        content: k.content,
        category: k.category,
        tags: k.tags,
        updatedAt: k.updatedAt.toISOString(),
        _score: relevanceScore(`${k.title} ${k.content} ${k.tags}`, q),
      }));

      if (safeSort === 'relevance') {
        results.knowledge.sort((a, b) => (b._score ?? 0) - (a._score ?? 0));
      }
    }

    // ── Search Persona ─────────────────────────────────────────────────────
    if (safeCategory === 'all' || safeCategory === 'persona') {
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
        take: 5,
      });

      results.persona = personas.map((p) => ({
        id: p.id,
        type: 'persona' as const,
        name: p.name,
        title: p.title,
        bio: p.bio,
        industry: p.industry,
        _score: relevanceScore(`${p.name} ${p.title} ${p.bio} ${p.industry} ${p.keywords}`, q),
      }));

      if (safeSort === 'relevance') {
        results.persona.sort((a, b) => (b._score ?? 0) - (a._score ?? 0));
      }
    }

    // ── Search Tracked Accounts ────────────────────────────────────────────
    if (safeCategory === 'all' || safeCategory === 'accounts') {
      const accounts = await db.trackedAccount.findMany({
        where: {
          OR: [
            { nickname: { contains: q } },
            { bio: { contains: q } },
            { platform: { contains: q } },
          ],
        },
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
        updatedAt: a.updatedAt.toISOString(),
        _score: relevanceScore(`${a.nickname} ${a.bio}`, q),
      }));

      if (safeSort === 'newest') {
        results.accounts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      } else if (safeSort === 'interactions') {
        results.accounts.sort((a, b) => b.followers - a.followers);
      } else {
        results.accounts.sort((a, b) => (b._score ?? 0) - (a._score ?? 0));
      }
    }

    // ── Search Templates (static) ──────────────────────────────────────────
    if (safeCategory === 'all' || safeCategory === 'templates') {
      const ql = q.toLowerCase();
      const matched = TEMPLATES.filter(
        (t) =>
          t.title.toLowerCase().includes(ql) ||
          t.description.toLowerCase().includes(ql) ||
          t.category.toLowerCase().includes(ql),
      );

      results.templates = matched.map((t) => ({
        id: t.id,
        type: 'template' as const,
        title: t.title,
        description: t.description,
        category: t.category,
        _score: relevanceScore(`${t.title} ${t.description} ${t.category}`, q),
      }));

      if (safeSort === 'relevance') {
        results.templates.sort((a, b) => (b._score ?? 0) - (a._score ?? 0));
      }
    }

    const total =
      results.content.length +
      results.knowledge.length +
      results.persona.length +
      results.accounts.length +
      results.templates.length;

    return NextResponse.json<SearchResponse>({
      query: q,
      category: safeCategory,
      sort: safeSort,
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
