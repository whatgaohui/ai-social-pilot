import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── Response Types ────────────────────────────────────────────────────────────

interface ContentResult {
  id: string;
  type: 'content';
  topic: string;
  topicHighlighted: string;
  content: string;
  contentHighlighted: string;
  platform: string;
  status: string;
  contentType: string;
  scheduledDate: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  aiScore: number;
  updatedAt: string;
  /** relevance score – higher = better match */
  _score?: number;
}

interface KnowledgeResult {
  id: string;
  type: 'knowledge';
  title: string;
  titleHighlighted: string;
  content: string;
  contentHighlighted: string;
  category: string;
  tags: string;
  updatedAt: string;
  _score?: number;
}

interface PersonaResult {
  id: string;
  type: 'persona';
  name: string;
  nameHighlighted: string;
  title: string;
  bio: string;
  industry: string;
  _score?: number;
}

interface AccountResult {
  id: string;
  type: 'account';
  nickname: string;
  nicknameHighlighted: string;
  platform: string;
  bio: string;
  bioHighlighted: string;
  followers: number;
  postsCount: number;
  updatedAt: string;
  _score?: number;
}

interface TemplateResult {
  id: string;
  type: 'template';
  title: string;
  titleHighlighted: string;
  description: string;
  descriptionHighlighted: string;
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

// ─── In-Memory Cache (1min TTL) ────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const searchCache = new Map<string, CacheEntry<SearchResponse>>();
const CACHE_TTL_MS = 60_000; // 1 minute

function getCached(key: string): SearchResponse | null {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    searchCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: SearchResponse): void {
  // Evict old entries when cache grows large
  if (searchCache.size > 100) {
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey) searchCache.delete(oldestKey);
  }
  searchCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ─── Fuzzy Matching ────────────────────────────────────────────────────────────

/**
 * Simple fuzzy match: checks if all characters of `q` appear in order
 * within `text` (case-insensitive). Returns true for exact/partial match.
 */
function fuzzyMatch(text: string, q: string): boolean {
  const lower = text.toLowerCase();
  const ql = q.toLowerCase();
  // Fast path: exact substring match
  if (lower.includes(ql)) return true;
  // Fuzzy: all chars must appear in order
  let qi = 0;
  for (let i = 0; i < lower.length && qi < ql.length; i++) {
    if (lower[i] === ql[qi]) qi++;
  }
  return qi === ql.length;
}

// ─── Relevance Scoring ─────────────────────────────────────────────────────────

/**
 * Relevance score with fuzzy bonus: counts exact occurrences + fuzzy match bonus.
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

  // Fuzzy match bonus (lower weight)
  if (score === 0 && fuzzyMatch(text, q)) {
    score = 0.5;
  }

  return score;
}

// ─── Highlight Helper ──────────────────────────────────────────────────────────

/**
 * Wraps all exact (case-insensitive) occurrences of `q` in `text` with `<mark>` tags.
 */
function highlightText(text: string, q: string, maxLen = 80): string {
  if (!q || !text) return text.slice(0, maxLen);
  const lower = text.toLowerCase();
  const ql = q.toLowerCase();
  const parts: string[] = [];
  let lastIdx = 0;
  let pos = 0;
  const limit = Math.min(text.length, maxLen);

  while (pos <= limit) {
    const idx = lower.indexOf(ql, pos);
    if (idx === -1 || idx >= limit) break;
    if (idx > lastIdx) {
      parts.push(escapeHtml(text.slice(lastIdx, idx)));
    }
    parts.push(`<mark>${escapeHtml(text.slice(idx, idx + ql.length))}</mark>`);
    lastIdx = idx + ql.length;
    pos = idx + 1;
  }
  if (lastIdx < limit) {
    parts.push(escapeHtml(text.slice(lastIdx, limit)));
  }

  const result = parts.join('');
  return limit < text.length ? result + '…' : result;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Static Template Data ─────────────────────────────────────────────────────

const TEMPLATES = [
  { id: 'morning', title: '早安问候', description: '温暖有活力的早安文案，适合每日打卡', category: '日常' },
  { id: 'expertise', title: '专业分享', description: '展示专业能力，建立行业影响力', category: '专业' },
  { id: 'story', title: '故事叙述', description: '用故事引发共鸣，增强情感连接', category: '故事' },
  { id: 'interaction', title: '互动话题', description: '引发讨论，提升朋友圈活跃度', category: '互动' },
  { id: 'insight', title: '观点洞察', description: '独到见解，展现思考深度', category: '观点' },
  { id: 'achievement', title: '成就展示', description: '分享成果，建立信任和影响力', category: '成就' },
];

// ─── Allowed Values ────────────────────────────────────────────────────────────

const VALID_CATEGORIES = ['all', 'posts', 'knowledge', 'persona', 'accounts', 'templates', 'content', 'template', 'history'] as const;
const VALID_SORTS = ['relevance', 'newest', 'interactions', 'score', 'date'] as const;

// ─── GET /api/search?q=xxx&category=all&sort=relevance&startDate=xxx&endDate=xxx ─

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() ?? '';
    const rawCategory = searchParams.get('category') ?? 'all';
    const sort = searchParams.get('sort') ?? 'relevance';
    const startDate = searchParams.get('startDate') ?? '';
    const endDate = searchParams.get('endDate') ?? '';

    // Normalize category aliases
    let category = rawCategory;
    if (category === 'content') category = 'posts';
    if (category === 'template') category = 'templates';
    if (category === 'history') category = 'all'; // history is a client-side concept

    const safeCategory = VALID_CATEGORIES.includes(category as typeof VALID_CATEGORIES[number])
      ? category
      : 'all';
    const safeSort = VALID_SORTS.includes(sort as typeof VALID_SORTS[number])
      ? sort
      : 'relevance';

    // Build cache key
    const cacheKey = `search:${q}:${safeCategory}:${safeSort}:${startDate}:${endDate}`;
    const cached = getCached(cacheKey);
    if (cached) return NextResponse.json(cached);

    if (!q) {
      const emptyResponse: SearchResponse = {
        query: '',
        category: safeCategory,
        sort: safeSort,
        total: 0,
        results: { content: [], knowledge: [], persona: [], accounts: [], templates: [] },
      };
      return NextResponse.json(emptyResponse);
    }

    const results: SearchResponse['results'] = {
      content: [],
      knowledge: [],
      persona: [],
      accounts: [],
      templates: [],
    };

    // Build date filter for Prisma
    const dateFilter: Record<string, { gte?: Date; lte?: Date }> | undefined =
      startDate || endDate
        ? {
            ...(startDate ? { gte: new Date(startDate) } : {}),
            ...(endDate ? { lte: new Date(endDate + 'T23:59:59.999Z') } : {}),
          }
        : undefined;

    // ── Search Content Posts ───────────────────────────────────────────────
    if (safeCategory === 'all' || safeCategory === 'posts') {
      const whereClause: Record<string, unknown> = {
        OR: [
          { topic: { contains: q } },
          { content: { contains: q } },
          { platform: { contains: q } },
          { contentType: { contains: q } },
          { status: { contains: q } },
        ],
      };
      if (dateFilter) {
        whereClause.updatedAt = dateFilter;
      }

      // Sort: default to updatedAt desc
      const orderBy = safeSort === 'newest' || safeSort === 'date'
        ? { updatedAt: 'desc' as const }
        : safeSort === 'score'
          ? { aiScore: 'desc' as const }
          : { updatedAt: 'desc' as const };

      const posts = await db.contentPost.findMany({
        where: whereClause,
        orderBy,
        take: 25,
      });

      // Apply fuzzy matching on client-side for additional results
      // and re-score with fuzzy bonus
      let filteredPosts = posts;

      // Fuzzy expansion: if we have fewer than 5 results and query is multi-char,
      // try fetching with just the first 2 chars for broader results
      if (filteredPosts.length < 5 && q.length >= 2) {
        const broadQuery = q.slice(0, Math.ceil(q.length / 2));
        const extraPosts = await db.contentPost.findMany({
          where: {
            OR: [
              { topic: { contains: broadQuery } },
              { content: { contains: broadQuery } },
            ],
            id: { notIn: filteredPosts.map((p) => p.id) },
          },
          orderBy: { updatedAt: 'desc' },
          take: 10,
        });
        // Only add fuzzy matches (score > 0)
        const fuzzyExtra = extraPosts.filter(
          (p) => fuzzyMatch(`${p.topic} ${p.content}`, q) && !filteredPosts.some((fp) => fp.id === p.id),
        );
        filteredPosts = [...filteredPosts, ...fuzzyExtra];
      }

      results.content = filteredPosts.map((p) => ({
        id: p.id,
        type: 'content' as const,
        topic: p.topic,
        topicHighlighted: highlightText(p.topic, q),
        content: p.content,
        contentHighlighted: highlightText(p.content, q, 60),
        platform: p.platform,
        status: p.status,
        contentType: p.contentType,
        scheduledDate: p.scheduledDate,
        likes: p.likes,
        comments: p.comments,
        shares: p.shares,
        views: p.views,
        aiScore: p.aiScore,
        updatedAt: p.updatedAt.toISOString(),
        _score: relevanceScore(`${p.topic} ${p.content}`, q),
      }));

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
      const whereClause: Record<string, unknown> = {
        OR: [
          { title: { contains: q } },
          { content: { contains: q } },
          { category: { contains: q } },
          { tags: { contains: q } },
        ],
      };
      if (dateFilter) {
        whereClause.updatedAt = dateFilter;
      }

      const items = await db.knowledgeItem.findMany({
        where: whereClause,
        orderBy: safeSort === 'newest' || safeSort === 'date' ? { updatedAt: 'desc' } : { updatedAt: 'desc' },
        take: 20,
      });

      results.knowledge = items.map((k) => ({
        id: k.id,
        type: 'knowledge' as const,
        title: k.title,
        titleHighlighted: highlightText(k.title, q),
        content: k.content,
        contentHighlighted: highlightText(k.content, q, 60),
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
        nameHighlighted: highlightText(p.name, q),
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
        nicknameHighlighted: highlightText(a.nickname, q),
        platform: a.platform,
        bio: a.bio,
        bioHighlighted: highlightText(a.bio, q, 60),
        followers: a.followers,
        postsCount: a.postsCount,
        updatedAt: a.updatedAt.toISOString(),
        _score: relevanceScore(`${a.nickname} ${a.bio}`, q),
      }));

      if (safeSort === 'newest' || safeSort === 'date') {
        results.accounts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      } else if (safeSort === 'interactions') {
        results.accounts.sort((a, b) => b.followers - a.followers);
      } else {
        results.accounts.sort((a, b) => (b._score ?? 0) - (a._score ?? 0));
      }
    }

    // ── Search Templates (static) ──────────────────────────────────────────
    if (safeCategory === 'all' || safeCategory === 'templates') {
      const matched = TEMPLATES.filter(
        (t) =>
          fuzzyMatch(t.title, q) ||
          fuzzyMatch(t.description, q) ||
          fuzzyMatch(t.category, q),
      );

      results.templates = matched.map((t) => ({
        id: t.id,
        type: 'template' as const,
        title: t.title,
        titleHighlighted: highlightText(t.title, q),
        description: t.description,
        descriptionHighlighted: highlightText(t.description, q),
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

    const response: SearchResponse = {
      query: q,
      category: safeCategory,
      sort: safeSort,
      total,
      results,
    };

    // Cache the response
    setCache(cacheKey, response);

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Search API] Error:', error);
    return NextResponse.json(
      { error: '搜索失败', details: String(error) },
      { status: 500 },
    );
  }
}
