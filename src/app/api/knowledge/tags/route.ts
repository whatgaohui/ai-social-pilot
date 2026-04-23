import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAIClient } from '@/lib/ai-client';

// ─── GET: All tags with counts, popular tags, suggested tags ─────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'all'; // all | popular | suggest
    const content = searchParams.get('content') || '';

    const items = await db.knowledgeItem.findMany({
      select: { tags: true, category: true },
    });

    // Build tag map: tag -> { count, categories, itemIds }
    const tagMap = new Map<string, { count: number; categories: Set<string> }>();

    for (const item of items) {
      const tagList = item.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean);
      for (const tag of tagList) {
        const existing = tagMap.get(tag);
        if (existing) {
          existing.count++;
          existing.categories.add(item.category);
        } else {
          tagMap.set(tag, { count: 1, categories: new Set([item.category]) });
        }
      }
    }

    const allTags = Array.from(tagMap.entries()).map(([name, data]) => ({
      name,
      count: data.count,
      categories: Array.from(data.categories),
      primaryCategory: Array.from(data.categories)[0] || 'general',
    }));

    allTags.sort((a, b) => b.count - a.count);

    if (mode === 'popular') {
      return NextResponse.json(allTags.slice(0, 20));
    }

    if (mode === 'suggest' && content) {
      const ai = await createAIClient();
      const prompt = `分析以下内容，推荐 5-8 个中文标签（用逗号分隔，不含#号）。标签应该简洁（2-6字），与内容高度相关。

内容：
${content}

只输出标签，用逗号分隔，不要其他文字。`;

      const aiTags = await ai.chatCompletion([
        { role: 'system', content: '你是一个标签推荐助手。只输出逗号分隔的标签，不要输出其他内容。' },
        { role: 'user', content: prompt },
      ]);

      const suggestedTags = aiTags
        .split(/[,，\n]/)
        .map(t => t.trim().replace(/^#+/, ''))
        .filter(t => t.length >= 1 && t.length <= 20);

      return NextResponse.json({
        suggested: suggestedTags,
        existing: allTags.slice(0, 10),
      });
    }

    return NextResponse.json({
      tags: allTags,
      total: allTags.length,
    });
  } catch (error) {
    console.error('Tags GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}

// ─── POST: Create tag, merge tags, rename tag ───────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'merge': {
        // Merge multiple tags into one target tag
        const { sourceTags, targetTag } = params as { sourceTags: string[]; targetTag: string };
        const allItems = await db.knowledgeItem.findMany();

        for (const item of allItems) {
          const tagList = item.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean);
          let modified = false;
          const newTags: string[] = [];

          for (const tag of tagList) {
            if (sourceTags.includes(tag)) {
              if (!newTags.includes(targetTag)) {
                newTags.push(targetTag);
              }
              modified = true;
            } else {
              if (!newTags.includes(tag)) {
                newTags.push(tag);
              }
            }
          }

          if (modified) {
            await db.knowledgeItem.update({
              where: { id: item.id },
              data: { tags: newTags.join(',') },
            });
          }
        }

        return NextResponse.json({ success: true, merged: sourceTags.length, into: targetTag });
      }

      case 'rename': {
        // Rename a tag across all items
        const { oldName, newName } = params as { oldName: string; newName: string };
        const allItems = await db.knowledgeItem.findMany();

        let renameCount = 0;
        for (const item of allItems) {
          const tagList = item.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean);
          if (tagList.includes(oldName)) {
            const newTags = tagList.map(t => (t === oldName ? newName : t));
            await db.knowledgeItem.update({
              where: { id: item.id },
              data: { tags: newTags.join(',') },
            });
            renameCount++;
          }
        }

        return NextResponse.json({ success: true, renamed: renameCount, from: oldName, to: newName });
      }

      case 'suggest': {
        // AI suggest tags for content
        const { content } = params as { content: string };
        if (!content) {
          return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

        const ai = await createAIClient();
        const prompt = `分析以下内容，推荐 5-8 个中文标签（用逗号分隔，不含#号）。标签应该简洁（2-6字），与内容高度相关。

内容：
${content}

只输出标签，用逗号分隔，不要其他文字。`;

        const aiTags = await ai.chatCompletion([
          { role: 'system', content: '你是一个标签推荐助手。只输出逗号分隔的标签，不要输出其他内容。' },
          { role: 'user', content: prompt },
        ]);

        const suggestedTags = aiTags
          .split(/[,，\n]/)
          .map(t => t.trim().replace(/^#+/, ''))
          .filter(t => t.length >= 1 && t.length <= 20);

        return NextResponse.json({ tags: suggestedTags });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Tags POST error:', error);
    return NextResponse.json({ error: 'Failed to process tag operation' }, { status: 500 });
  }
}

// ─── PUT: Update tag metadata (rename, add to items) ────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, tagName, ...params } = body;

    if (action === 'add-to-item') {
      // Add a tag to a specific knowledge item
      const { itemId, tags: newTags } = params as { itemId: string; tags: string };
      const item = await db.knowledgeItem.findUnique({ where: { id: itemId } });

      if (!item) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }

      const existingTags = item.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean);
      const tagsToAdd = newTags.split(/[,，]/).map(t => t.trim()).filter(Boolean);
      const merged = [...new Set([...existingTags, ...tagsToAdd])];

      const updated = await db.knowledgeItem.update({
        where: { id: itemId },
        data: { tags: merged.join(',') },
      });

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Tags PUT error:', error);
    return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 });
  }
}

// ─── DELETE: Remove tag from all knowledge items ─────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tagName = searchParams.get('name');

    if (!tagName) {
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
    }

    const allItems = await db.knowledgeItem.findMany();
    let removedCount = 0;

    for (const item of allItems) {
      const tagList = item.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean);
      if (tagList.includes(tagName)) {
        const newTags = tagList.filter(t => t !== tagName);
        await db.knowledgeItem.update({
          where: { id: item.id },
          data: { tags: newTags.join(',') },
        });
        removedCount++;
      }
    }

    return NextResponse.json({ success: true, removedFrom: removedCount, tag: tagName });
  } catch (error) {
    console.error('Tags DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 });
  }
}
