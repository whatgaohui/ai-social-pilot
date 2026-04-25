import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface SearchResult {
  id: string;
  category: string;
  title: string;
  content: string;
  tags: string;
  createdAt: string;
  updatedAt: string;
  // Highlighted fields
  titleHighlighted?: string;
  contentHighlighted?: string;
  matchScore: number;
}

function highlightText(text: string, query: string): string {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return text.replace(regex, '||HL_START||$1||HL_END||');
}

function calculateScore(item: { title: string; content: string; tags: string }, query: string): number {
  if (!query) return 0;
  const lowerQuery = query.toLowerCase();
  const lowerTitle = item.title.toLowerCase();
  const lowerContent = item.content.toLowerCase();
  const lowerTags = item.tags.toLowerCase();

  let score = 0;
  // Title match (highest weight)
  if (lowerTitle.includes(lowerQuery)) score += 10;
  // Tags match
  if (lowerTags.includes(lowerQuery)) score += 7;
  // Content match
  const contentOccurrences = lowerContent.split(lowerQuery).length - 1;
  score += Math.min(contentOccurrences * 2, 8);

  return score;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category') || '';
    const tag = searchParams.get('tag') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build where clause
    const where: Record<string, unknown> = {};
    if (category && category !== 'all') {
      where.category = category;
    }

    // Fetch items - for text search, we do it in-memory since SQLite LIKE is limited
    const items = await db.knowledgeItem.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { updatedAt: 'desc' },
    });

    let results: SearchResult[] = items.map(item => ({
      id: item.id,
      category: item.category,
      title: item.title,
      content: item.content,
      tags: item.tags,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      matchScore: 0,
    }));

    // Filter by query
    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(item =>
        item.title.toLowerCase().includes(lowerQuery) ||
        item.content.toLowerCase().includes(lowerQuery) ||
        item.tags.toLowerCase().includes(lowerQuery)
      );

      // Calculate scores and sort
      for (const result of results) {
        result.matchScore = calculateScore(
          { title: result.title, content: result.content, tags: result.tags },
          query
        );
      }

      // Add highlighting
      results = results.map(result => ({
        ...result,
        titleHighlighted: highlightText(result.title, query),
        contentHighlighted: highlightText(result.content.slice(0, 300), query),
      }));

      results.sort((a, b) => b.matchScore - a.matchScore);
    }

    // Filter by tag
    if (tag) {
      const lowerTag = tag.toLowerCase();
      results = results.filter(item =>
        item.tags.split(/[,，]/).some(t => t.trim().toLowerCase() === lowerTag)
      );
    }

    // Find related items for a given item ID
    const relatedTo = searchParams.get('relatedTo');
    if (relatedTo) {
      const sourceItem = items.find(i => i.id === relatedTo);
      if (sourceItem) {
        const sourceTags = new Set(
          sourceItem.tags.split(/[,，]/).map(t => t.trim().toLowerCase()).filter(Boolean)
        );
        // Score by tag overlap
        results = results
          .filter(item => item.id !== relatedTo)
          .map(item => {
            const itemTags = new Set(
              item.tags.split(/[,，]/).map(t => t.trim().toLowerCase()).filter(Boolean)
            );
            const overlap = [...sourceTags].filter(t => itemTags.has(t)).length;
            return { ...item, matchScore: overlap };
          })
          .filter(item => item.matchScore > 0)
          .sort((a, b) => b.matchScore - a.matchScore)
          .slice(0, 10);
      }
    }

    // Paginate
    const total = results.length;
    const paginated = results.slice(offset, offset + limit);

    return NextResponse.json({
      results: paginated,
      total,
      offset,
      limit,
      query: query || undefined,
    });
  } catch (error) {
    console.error('Knowledge search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
