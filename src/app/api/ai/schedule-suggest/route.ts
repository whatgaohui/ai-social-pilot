import { NextRequest, NextResponse } from 'next/server';
import { createAIClient } from '@/lib/ai-client';
import { buildScheduleSuggestPrompt } from '@/lib/ai-prompts';

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

    // Build prompts using centralized prompt builder
    const messages = buildScheduleSuggestPrompt({ platform, days, contentPosts });

    const response = await ai.chatCompletion(messages);

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
