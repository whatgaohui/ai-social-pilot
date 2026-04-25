import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const allItems = await db.knowledgeItem.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // ── Total items & by category ──
    const total = allItems.length;
    const categoryBreakdown: Record<string, number> = {};
    for (const item of allItems) {
      categoryBreakdown[item.category] = (categoryBreakdown[item.category] || 0) + 1;
    }

    // ── Tag cloud data ──
    const tagMap = new Map<string, { count: number; categories: string[] }>();
    for (const item of allItems) {
      const tagList = item.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean);
      for (const tag of tagList) {
        const existing = tagMap.get(tag);
        if (existing) {
          existing.count++;
          if (!existing.categories.includes(item.category)) {
            existing.categories.push(item.category);
          }
        } else {
          tagMap.set(tag, { count: 1, categories: [item.category] });
        }
      }
    }

    const tagCloud = Array.from(tagMap.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        frequency: total > 0 ? data.count / total : 0,
        categories: data.categories,
        primaryCategory: data.categories[0] || 'general',
      }))
      .sort((a, b) => b.count - a.count);

    // ── Recent additions (last 7 days) ──
    const recentAdditions = allItems.filter(
      item => new Date(item.createdAt) >= sevenDaysAgo
    );

    // ── Most referenced tags ──
    const mostReferencedTags = tagCloud.slice(0, 10);

    // ── Coverage analysis ──
    // Define expected topic areas for social media content
    const expectedTopics = [
      '专业知识', '行业洞察', '经验分享', '观点评论',
      '故事案例', '客户反馈', '产品介绍', '团队文化',
      '行业趋势', '个人成长', '营销技巧', '数据展示',
    ];

    const coverageGaps: string[] = [];
    const coverageAdequate: string[] = [];
    const coverageMap: Record<string, boolean> = {};

    for (const topic of expectedTopics) {
      // Check if any item title or content mentions this topic area
      const hasCoverage = allItems.some(item =>
        item.title.includes(topic) ||
        item.content.includes(topic) ||
        item.tags.split(/[,，]/).some(t => t.trim().includes(topic.slice(0, 2)))
      );
      coverageMap[topic] = hasCoverage;
      if (hasCoverage) {
        coverageAdequate.push(topic);
      } else {
        coverageGaps.push(topic);
      }
    }

    // ── Growth trend ──
    const today = new Date();
    const daysMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      daysMap[key] = 0;
    }

    for (const item of recentAdditions) {
      const key = new Date(item.createdAt).toISOString().split('T')[0];
      if (key in daysMap) {
        daysMap[key]++;
      }
    }

    const weeklyTrend = Object.entries(daysMap).map(([date, count]) => ({ date, count }));

    // ── Category distribution for chart ──
    const categoryLabels: Record<string, string> = {
      expertise: '专业知识',
      experience: '经验总结',
      opinion: '观点看法',
      story: '故事素材',
      resource: '资源收藏',
      general: '通用',
    };

    const categoryDistribution = Object.entries(categoryBreakdown)
      .map(([key, value]) => ({
        category: key,
        label: categoryLabels[key] || key,
        count: value,
        percentage: total > 0 ? Math.round((value / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      total,
      categoryBreakdown,
      categoryDistribution,
      tagCloud,
      recentAdditions: {
        count: recentAdditions.length,
        items: recentAdditions.map(i => ({
          id: i.id,
          title: i.title,
          category: i.category,
          createdAt: i.createdAt.toISOString(),
        })),
      },
      mostReferencedTags,
      coverage: {
        gaps: coverageGaps,
        adequate: coverageAdequate,
        map: coverageMap,
        score: total > 0
          ? Math.round((coverageAdequate.length / expectedTopics.length) * 100)
          : 0,
      },
      weeklyTrend,
    });
  } catch (error) {
    console.error('Knowledge stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
