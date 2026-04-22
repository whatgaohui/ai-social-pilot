import { NextRequest, NextResponse } from 'next/server';
import { createAIClient } from '@/lib/ai-client';

interface ScheduleSlot {
  day: string;
  time: string;
  contentType: string;
  reasoning: string;
  topic: string;
}

export async function POST(request: NextRequest) {
  try {
    const { platform = 'wechat', days = 7, contentPosts = [] } = await request.json();

    if (!platform || !days) {
      return NextResponse.json(
        { error: 'Missing required fields: platform, days' },
        { status: 400 }
      );
    }

    const ai = await createAIClient();
    const isXHS = platform === 'xiaohongshu';
    const platformLabel = isXHS ? '小红书' : '朋友圈';

    // Build context from existing posts
    const postSummary = contentPosts.length > 0
      ? contentPosts.slice(0, 20).map((p: { scheduledDate: string; contentType: string; topic: string; likes: number; comments: number; shares: number; status: string }, i: number) => {
          const engagement = p.likes + p.comments * 3 + p.shares * 5;
          return `${i + 1}. ${p.scheduledDate} | ${p.contentType} | ${p.topic} | 互动指数:${engagement} | 状态:${p.status}`;
        }).join('\n')
      : '暂无历史内容数据';

    const typeDistribution: Record<string, number> = {};
    contentPosts.forEach((p: { contentType: string }) => {
      const t = p.contentType || 'unknown';
      typeDistribution[t] = (typeDistribution[t] || 0) + 1;
    });
    const typeSummary = Object.entries(typeDistribution)
      .map(([type, count]) => `${type}: ${count}条`)
      .join(', ');

    const systemPrompt = `你是一位资深的社交媒体运营排期专家，精通${platformLabel}的内容运营策略和最佳发布时间。
你需要分析用户的现有内容数据，为未来${days}天制定最优发布排期。

${isXHS ? `小红书最佳实践：
- 推荐发布频率：每周4-7篇
- 高峰时段：12:00-13:00（午休）、18:00-20:00（下班通勤）、21:00-23:00（睡前）
- 内容类型应多样化：干货教程、好物推荐、日常Vlog、合集清单等交替发布
- 周末流量较高，适合发布高质量干货或合集内容` : `朋友圈最佳实践：
- 推荐发布频率：每周3-5条
- 高峰时段：8:00-9:00（早间通勤）、12:00-13:00（午休）、20:00-22:00（晚间）
- 内容类型应均衡：专业观点、生活分享、互动话题等交替
- 工作日侧重专业内容，周末适合轻松互动`}

请严格以JSON数组格式返回排期建议，不要包含其他文字。`;

    const userPrompt = `请为${platformLabel}未来${days}天制定发布排期（从明天开始计算）。

历史内容数据（${contentPosts.length}条）：
${postSummary}

内容类型分布：${typeSummary}

请返回一个JSON数组，每个元素包含：
- day: 日期字符串（YYYY-MM-DD格式）
- time: 建议发布时间（HH:MM格式，如 20:00）
- contentType: 内容类型（${isXHS ? 'drygoods/review/tutorial/vlog/daily/recommend/collection 之一' : 'text/image/video/story/insight/interaction 之一'}）
- reasoning: 推荐此时间的原因（15-30字中文）
- topic: 建议的内容主题方向（10-20字中文）

注意：
1. 每天最多建议1个时间槽
2. ${isXHS ? '建议每周至少4天有内容' : '建议每周至少3天有内容'}
3. 避免连续两天发布相同类型的内容
4. 结合历史数据中的高互动内容类型，适当增加其比例
5. 周末时间可以稍微灵活

直接返回JSON数组，不要有其他内容。示例格式：
[{"day":"2024-01-15","time":"20:00","contentType":"insight","reasoning":"晚间用户最活跃","topic":"行业趋势观察"}]`;

    const response = await ai.chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    // Parse AI response
    let schedule: ScheduleSlot[] = [];

    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        schedule = JSON.parse(jsonMatch[0]) as ScheduleSlot[];
        // Validate and clean up
        schedule = schedule
          .filter((slot) => slot.day && slot.time && slot.contentType && slot.topic)
          .map((slot) => ({
            day: slot.day,
            time: slot.time,
            contentType: slot.contentType,
            reasoning: slot.reasoning || 'AI推荐时段',
            topic: slot.topic,
          }));
      }
    } catch {
      // JSON parse failed, generate fallback schedule
    }

    // Fallback: generate a basic schedule if AI fails
    if (schedule.length === 0) {
      const today = new Date();
      const targetDays = isXHS ? Math.min(days, 5) : Math.min(days, 4);
      const timeSlots = isXHS
        ? ['12:30', '18:30', '21:00']
        : ['08:30', '12:30', '20:30'];
      const contentTypes = isXHS
        ? ['drygoods', 'review', 'tutorial', 'daily', 'recommend', 'vlog', 'collection']
        : ['insight', 'image', 'story', 'interaction', 'text', 'video', 'mixed'];

      for (let i = 0; i < targetDays; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i + 1);
        const dayStr = date.toISOString().split('T')[0];

        schedule.push({
          day: dayStr,
          time: timeSlots[i % timeSlots.length],
          contentType: contentTypes[i % contentTypes.length],
          reasoning: getDefaultReasoning(timeSlots[i % timeSlots.length], i),
          topic: getDefaultTopic(contentTypes[i % contentTypes.length], isXHS),
        });
      }
    }

    return NextResponse.json({
      schedule,
      platform,
      days,
      generatedCount: schedule.length,
      model: ai.config?.name || ai.config?.provider || 'default',
    });
  } catch (error) {
    console.error('Schedule suggestion error:', error);
    return NextResponse.json(
      { error: 'Failed to generate schedule suggestions', details: String(error) },
      { status: 500 }
    );
  }
}

function getDefaultReasoning(time: string, dayIndex: number): string {
  const reasonings: Record<string, string> = {
    '08:30': '早间通勤时段，用户浏览率高',
    '12:30': '午休碎片时间，阅读意愿强',
    '18:30': '下班通勤高峰，曝光率较高',
    '20:30': '晚间黄金时段，互动率最高',
    '21:00': '睡前活跃时段，长内容阅读率好',
  };
  return reasonings[time] || '用户活跃时段';
}

function getDefaultTopic(contentType: string, isXHS: boolean): string {
  const xhsTopics: Record<string, string> = {
    drygoods: '行业干货分享',
    review: '好物使用测评',
    tutorial: '实用技巧教程',
    daily: '日常生活记录',
    recommend: '好物安利推荐',
    vlog: '生活体验Vlog',
    collection: '精选合集清单',
  };
  const wechatTopics: Record<string, string> = {
    text: '观点思考',
    image: '生活随拍分享',
    video: '精彩瞬间记录',
    story: '故事经历分享',
    insight: '行业观察洞察',
    interaction: '互动话题讨论',
    mixed: '综合内容分享',
  };
  return isXHS
    ? (xhsTopics[contentType] || '精选内容分享')
    : (wechatTopics[contentType] || '日常分享');
}
