import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── 辅助函数 ─────────────────────────────────────────────────────────

function getDateRange(periodType: string, customStart?: string, customEnd?: string) {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = now;

  switch (periodType) {
    case 'week':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'quarter':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 3);
      break;
    case 'custom':
      startDate = customStart ? new Date(customStart) : new Date(now.getTime() - 7 * 86400000);
      endDate = customEnd ? new Date(customEnd) : now;
      break;
    default:
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
  }

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
}

function getPeriodLabel(periodType: string): string {
  switch (periodType) {
    case 'week': return '本周';
    case 'month': return '本月';
    case 'quarter': return '本季度';
    case 'custom': return '自定义';
    default: return '本周';
  }
}

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

// ─── POST: 根据模板生成报告 ───────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const {
      templateId,
      periodType = 'week',
      customStart,
      customEnd,
      platform,
    } = await request.json();

    // 获取模板
    let templateName = '自定义报告';
    let sections: Array<{ key: string; title: string; enabled: boolean }> = [];

    if (templateId) {
      const template = await db.reportTemplate.findUnique({ where: { id: templateId } });
      if (!template) {
        return NextResponse.json({ error: '模板不存在' }, { status: 404 });
      }
      templateName = template.name;
      try {
        sections = typeof template.sections === 'string' ? JSON.parse(template.sections) : template.sections;
      } catch {
        sections = [];
      }

      // 更新最后使用时间
      await db.reportTemplate.update({
        where: { id: templateId },
        data: { lastUsedAt: new Date() },
      });
    } else {
      // 默认章节
      sections = [
        { key: 'overview', title: '概览摘要', enabled: true },
        { key: 'top5', title: '内容表现 TOP5', enabled: true },
        { key: 'trends', title: '互动趋势', enabled: true },
        { key: 'platform', title: '平台对比', enabled: false },
        { key: 'suggestions', title: '下周建议', enabled: true },
      ];
    }

    // 只保留启用的章节
    const enabledSections = sections.filter((s) => s.enabled);

    // 计算日期范围
    const { startDate, endDate } = getDateRange(periodType, customStart, customEnd);
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    // 查询数据库
    const posts = await db.contentPost.findMany({
      where: {
        scheduledDate: { gte: startStr, lte: endStr },
        ...(platform ? { platform } : {}),
      },
      orderBy: { scheduledDate: 'asc' },
    });

    // ── 构建报告数据 ──────────────────────────────────────────────
    const report: Record<string, unknown> = {
      title: `${getPeriodLabel(periodType)}${templateName}`,
      periodType,
      periodLabel: getPeriodLabel(periodType),
      dateRange: { start: startStr, end: endStr },
      platform: platform || 'all',
      generatedAt: new Date().toISOString(),
      templateName,
      sections: enabledSections,
    };

    // 根据启用的章节生成数据
    for (const section of enabledSections) {
      switch (section.key) {
        case 'overview': {
          const totalPosts = posts.length;
          const publishedCount = posts.filter((p) => p.status === 'published').length;
          const totalLikes = posts.reduce((s, p) => s + p.likes, 0);
          const totalComments = posts.reduce((s, p) => s + p.comments, 0);
          const totalShares = posts.reduce((s, p) => s + p.shares, 0);
          const totalViews = posts.reduce((s, p) => s + p.views, 0);
          const totalFavorites = posts.reduce((s, p) => s + (p.favorites || 0), 0);
          const totalInteractions = totalLikes + totalComments + totalShares + totalFavorites;
          const avgScore = totalPosts > 0
            ? Math.round(posts.reduce((s, p) => s + p.aiScore, 0) / totalPosts * 10) / 10
            : 0;
          const publishRate = totalPosts > 0 ? Math.round((publishedCount / totalPosts) * 100) : 0;

          report.overview = {
            totalPosts,
            publishedCount,
            publishRate,
            totalLikes,
            totalComments,
            totalShares,
            totalViews,
            totalFavorites,
            totalInteractions,
            avgScore,
          };
          break;
        }

        case 'top5': {
          const topPosts = [...posts]
            .map((p) => ({
              id: p.id,
              topic: p.topic || '未命名',
              contentType: p.contentType,
              likes: p.likes,
              comments: p.comments,
              shares: p.shares,
              views: p.views,
              favorites: p.favorites || 0,
              engagement: p.likes + p.comments * 2 + p.shares * 3 + (p.favorites || 0),
              contentPreview: p.content.substring(0, 80),
              aiScore: p.aiScore,
            }))
            .sort((a, b) => b.engagement - a.engagement)
            .slice(0, 5);

          report.topPosts = topPosts;
          break;
        }

        case 'trends': {
          // 按天统计互动趋势
          const dayMap: Record<string, { likes: number; comments: number; shares: number; views: number; count: number }> = {};
          posts.forEach((p) => {
            const day = p.scheduledDate.substring(0, 10);
            if (!dayMap[day]) dayMap[day] = { likes: 0, comments: 0, shares: 0, views: 0, count: 0 };
            dayMap[day].likes += p.likes;
            dayMap[day].comments += p.comments;
            dayMap[day].shares += p.shares;
            dayMap[day].views += p.views;
            dayMap[day].count++;
          });

          const dailyTrends = Object.entries(dayMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, data]) => ({
              date,
              engagement: data.likes + data.comments * 2 + data.shares * 3,
              likes: data.likes,
              comments: data.comments,
              shares: data.shares,
              views: data.views,
              postCount: data.count,
            }));

          // 计算趋势摘要
          const trendSummary = dailyTrends.length >= 2
            ? (() => {
                const firstHalf = dailyTrends.slice(0, Math.floor(dailyTrends.length / 2));
                const secondHalf = dailyTrends.slice(Math.floor(dailyTrends.length / 2));
                const firstAvg = firstHalf.length > 0
                  ? firstHalf.reduce((s, d) => s + d.engagement, 0) / firstHalf.length
                  : 0;
                const secondAvg = secondHalf.length > 0
                  ? secondHalf.reduce((s, d) => s + d.engagement, 0) / secondHalf.length
                  : 0;
                const change = firstAvg > 0 ? Math.round(((secondAvg - firstAvg) / firstAvg) * 100) : 0;
                if (change > 10) return `互动量呈上升趋势，后半周期较前半周期增长 ${change}%`;
                if (change < -10) return `互动量有所下降，后半周期较前半周期下降 ${Math.abs(change)}%`;
                return '互动量整体保持平稳';
              })()
            : '数据不足，无法判断趋势';

          report.trends = {
            dailyTrends,
            summary: trendSummary,
          };
          break;
        }

        case 'platform': {
          // 平台对比
          const wechatPosts = posts.filter((p) => p.platform === 'wechat');
          const xhsPosts = posts.filter((p) => p.platform === 'xiaohongshu');

          const calcPlatformStats = (platformPosts: typeof posts) => {
            const total = platformPosts.length;
            const published = platformPosts.filter((p) => p.status === 'published').length;
            const engagement = platformPosts.reduce((s, p) => s + p.likes + p.comments * 2 + p.shares * 3 + (p.favorites || 0), 0);
            const avgEngagement = total > 0 ? Math.round(engagement / total) : 0;
            return { total, published, engagement, avgEngagement };
          };

          report.platformComparison = {
            wechat: calcPlatformStats(wechatPosts),
            xiaohongshu: calcPlatformStats(xhsPosts),
            summary: wechatPosts.length > 0 && xhsPosts.length > 0
              ? `朋友圈发布${wechatPosts.length}条，小红书发布${xhsPosts.length}条`
              : wechatPosts.length > 0
                ? `仅朋友圈数据：发布${wechatPosts.length}条`
                : xhsPosts.length > 0
                  ? `仅小红书数据：发布${xhsPosts.length}条`
                  : '暂无平台数据',
          };
          break;
        }

        case 'suggestions': {
          const totalPosts = posts.length;
          const publishedCount = posts.filter((p) => p.status === 'published').length;
          const publishRate = totalPosts > 0 ? Math.round((publishedCount / totalPosts) * 100) : 0;
          const avgScore = totalPosts > 0
            ? Math.round(posts.reduce((s, p) => s + p.aiScore, 0) / totalPosts)
            : 0;

          // 内容类型分布
          const typeMap: Record<string, number> = {};
          posts.forEach((p) => { typeMap[p.contentType] = (typeMap[p.contentType] || 0) + 1; });
          const typeEntries = Object.entries(typeMap).sort((a, b) => b[1] - a[1]);

          const suggestions: string[] = [];

          // 发布率建议
          if (publishRate < 60) {
            suggestions.push(`发布率仅 ${publishRate}%，建议提高内容执行力，争取达到 80% 以上`);
          } else if (publishRate >= 80) {
            suggestions.push('发布率保持良好（' + publishRate + '%），建议维持当前创作节奏');
          }

          // 质量建议
          if (avgScore < 60) {
            suggestions.push(`平均 AI 评分 ${avgScore} 分偏低，建议优化标题吸引力和内容质量`);
          } else if (avgScore >= 80) {
            suggestions.push(`内容质量评分 ${avgScore} 分表现优秀，建议尝试突破更高水平`);
          }

          // 多样性建议
          if (typeEntries.length === 1) {
            suggestions.push(`内容类型单一（仅${typeEntries[0][0]}），建议尝试多样化内容形式`);
          } else if (typeEntries.length >= 3) {
            suggestions.push('内容类型丰富，建议找出最佳类型并加大投入');
          }

          // 默认建议
          if (suggestions.length === 0) {
            suggestions.push('继续积累数据，以获得更精准的分析建议');
            suggestions.push('关注高互动内容，分析成功要素并复用');
            suggestions.push('定期检查发布时间，找到最佳发布时段');
          }

          report.suggestions = suggestions;
          break;
        }
      }
    }

    // 保存报告历史
    const history = await db.reportHistory.create({
      data: {
        templateId: templateId || '',
        templateName,
        title: report.title as string,
        periodType,
        startDate: startStr,
        endDate: endStr,
        reportData: JSON.stringify(report),
      },
    });

    return NextResponse.json({
      ...report,
      historyId: history.id,
    });
  } catch (error) {
    console.error('Generate report error:', error);
    return NextResponse.json({ error: '报告生成失败' }, { status: 500 });
  }
}
