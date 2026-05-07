import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateContent } from '@/lib/ai-service';
import type { ActionPlan, PlanType } from '@/types';
import OpenAI from 'openai';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

// ─── Helper: Get OpenAI client (same pattern as ai-service.ts) ───────────

interface RuntimeAiConfig {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl: string;
}

function getAiClient(): { client: OpenAI; model: string } | null {
  const configPath = path.join(process.cwd(), 'ai-config.json');
  let config: RuntimeAiConfig | null = null;
  if (existsSync(configPath)) {
    try {
      config = JSON.parse(readFileSync(configPath, 'utf-8')) as RuntimeAiConfig;
    } catch { /* ignore */ }
  }
  if (!config?.apiKey) return null;
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseUrl });
  return { client, model: config.model };
}

// ─── Plan Handlers ──────────────────────────────────────────────────────

async function handleContentPlan(
  accountId: string,
  suggestionText: string,
  suggestionId: string
): Promise<ActionPlan> {
  // Get account data for context
  const account = await db.xhsAccount.findUnique({
    where: { id: accountId },
    include: {
      posts: {
        orderBy: { publishDate: 'desc' },
        take: 10,
      },
      persona: true,
    },
  });

  if (!account) {
    throw new Error('账号不存在');
  }

  // Extract topic from suggestion text
  const topicMatch = suggestionText.match(/建议.*?(多发|创作|发布)?(.+?)内容/);
  const topic = topicMatch?.[2] || suggestionText.replace(/建议/g, '').slice(0, 20);

  // Generate content using AI
  const generated = await generateContent({
    accountId,
    topic,
    persona: account.persona
      ? {
          id: account.persona.id,
          accountId: account.persona.accountId,
          name: account.persona.name,
          tone: account.persona.tone as 'warm' | 'professional' | 'witty' | 'casual' | 'elegant',
          writingStyle: account.persona.writingStyle as 'concise' | 'detailed' | 'emotional' | 'balanced',
          targetAudience: account.persona.targetAudience,
          contentThemes: JSON.parse(account.persona.contentThemes || '[]'),
          keywords: JSON.parse(account.persona.keywords || '[]'),
          avoidTopics: JSON.parse(account.persona.avoidTopics || '[]'),
          referenceDesc: account.persona.referenceDesc,
          signaturePhrase: account.persona.signaturePhrase,
        }
      : null,
    referencePosts: account.posts.map((p) => ({
      id: p.id,
      accountId: p.accountId,
      xhsPostId: p.xhsPostId,
      title: p.title,
      content: p.content,
      coverUrl: p.coverUrl,
      imageUrls: JSON.parse(p.imageUrls || '[]'),
      postType: p.postType as 'normal' | 'video',
      likes: p.likes,
      comments: p.comments,
      collects: p.collects,
      shares: p.shares,
      tags: JSON.parse(p.tags || '[]'),
      category: p.category,
      aiScore: p.aiScore,
      aiAnalysis: p.aiAnalysis,
      publishDate: p.publishDate,
    })),
  });

  // Calculate suggested time (next peak hour)
  const now = new Date();
  const hour = now.getHours();
  const suggestedHour = hour < 12 ? 18 : hour < 18 ? 19 : 12;
  const suggestedTime = new Date(now);
  suggestedTime.setDate(suggestedTime.getDate() + 1);
  suggestedTime.setHours(suggestedHour, 0, 0, 0);

  const plan: ActionPlan = {
    id: `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    suggestionId,
    type: 'content',
    status: 'pending',
    title: `AI 内容方案：${topic}`,
    description: `基于建议"${suggestionText}"生成的笔记草稿`,
    content: {
      title: generated.title,
      contentBody: generated.content,
      tags: generated.tags,
      mediaType: 'image',
      suggestedTime: suggestedTime.toISOString(),
    },
    createdAt: new Date().toISOString(),
  };

  return plan;
}

async function handleTimingPlan(
  accountId: string,
  suggestionText: string,
  suggestionId: string
): Promise<ActionPlan> {
  // Get account's recent posts to analyze posting patterns
  const posts = await db.xhsPost.findMany({
    where: { accountId },
    orderBy: { publishDate: 'desc' },
    take: 30,
  });

  // Analyze engagement by hour
  const hourEngagement = new Map<number, { total: number; count: number }>();
  posts.forEach((post) => {
    if (post.publishTime) {
      const hour = parseInt(post.publishTime.split(':')[0] || '0', 10);
      const engagement = post.likes + post.comments + post.collects + post.shares;
      const existing = hourEngagement.get(hour) || { total: 0, count: 0 };
      hourEngagement.set(hour, {
        total: existing.total + engagement,
        count: existing.count + 1,
      });
    }
  });

  // Calculate best hours
  const hourStats = Array.from(hourEngagement.entries())
    .map(([hour, stats]) => ({
      hour,
      avgEngagement: stats.count > 0 ? stats.total / stats.count : 0,
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);

  // Get scheduled notes that need time adjustment
  const scheduledNotes = await db.scheduledNote.findMany({
    where: {
      accountId,
      status: 'draft',
    },
    take: 5,
  });

  // Generate time slots based on analysis
  const now = new Date();
  const slots: Array<{ time: string; activity: 'high' | 'medium' | 'low' }> = [];

  // Add top 3 best hours as suggestions
  const topHours = hourStats.slice(0, 3);
  if (topHours.length > 0) {
    for (let i = 0; i < topHours.length; i++) {
      const hour = topHours[i].hour;
      const activity = i === 0 ? 'high' : i === 1 ? 'medium' : 'low';
      const slotTime = new Date(now);
      slotTime.setDate(slotTime.getDate() + i);
      slotTime.setHours(hour, 30, 0, 0);
      slots.push({
        time: slotTime.toISOString(),
        activity: activity as 'high' | 'medium' | 'low',
      });
    }
  } else {
    // Fallback: use common best times
    const defaultHours = [18, 19, 20];
    for (let i = 0; i < defaultHours.length; i++) {
      const slotTime = new Date(now);
      slotTime.setDate(slotTime.getDate() + i);
      slotTime.setHours(defaultHours[i], 0, 0, 0);
      slots.push({
        time: slotTime.toISOString(),
        activity: i === 0 ? 'high' : 'medium' as 'high' | 'medium' | 'low',
      });
    }
  }

  const plan: ActionPlan = {
    id: `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    suggestionId,
    type: 'timing',
    status: 'pending',
    title: 'AI 时间推荐',
    description: `基于建议"${suggestionText}"分析的发布时间优化方案`,
    timing: {
      slots,
      affectedNoteIds: scheduledNotes.map((n) => n.id),
    },
    createdAt: new Date().toISOString(),
  };

  return plan;
}

async function handleEngagementPlan(
  accountId: string,
  suggestionText: string,
  suggestionId: string
): Promise<ActionPlan> {
  const account = await db.xhsAccount.findUnique({
    where: { id: accountId },
    include: {
      posts: { orderBy: { publishDate: 'desc' }, take: 10 },
      persona: true,
    },
  });

  if (!account) throw new Error('账号不存在');

  const personaTone = account.persona?.tone || 'casual';
  const signaturePhrase = account.persona?.signaturePhrase || '';

  // Generate engagement templates via AI
  const aiClient = getAiClient();
  let templates: Array<{ scenario: string; template: string }> | null = null;

  if (aiClient) {
    try {
      const prompt = `你是一位小红书互动运营专家。请根据以下账号信息，为常见的互动场景生成回复话术模板。

账号昵称：${account.nickname}
粉丝数：${account.followers}
语气风格：${personaTone}
${signaturePhrase ? `标志性用语：${signaturePhrase}` : ''}

请为以下5个场景各生成一个话术模板：
1. 新用户关注后的第一条欢迎评论
2. 笔记收到点赞后的感谢回复
3. 有人提问时的专业回复
4. 引导用户收藏和分享的号召
5. 处理负面评论的应对话术

请严格按照以下JSON格式返回：
{
  "scenarios": [
    { "scenario": "场景名称", "template": "话术模板" }
  ]
}`;
      const result = await aiClient.client.chat.completions.create({
        model: aiClient.model,
        messages: [
          { role: 'system', content: '你是一位小红书互动运营专家，擅长编写高互动率的回复话术。请始终返回JSON格式。' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      });
      const text = result.choices?.[0]?.message?.content || '';
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed?.scenarios && Array.isArray(parsed.scenarios)) {
          templates = parsed.scenarios;
        }
      }
    } catch { /* fallback to defaults */ }
  }

  const scenarios = templates || [
    { scenario: '关注欢迎', template: `感谢关注！${signaturePhrase ? signaturePhrase + ' ' : ''}我会持续分享更多精彩内容～` },
    { scenario: '点赞感谢', template: '谢谢你的喜欢！如果对你有帮助记得收藏哦 💕' },
    { scenario: '问题回复', template: '好问题！我详细说一下我的看法...' },
    { scenario: '引导互动', template: '觉得有用的话，点赞收藏让更多人看到吧！' },
    { scenario: '负面应对', template: '感谢你的反馈，每个人的体验可能不同，我会继续优化内容 💪' },
  ];

  const plan: ActionPlan = {
    id: `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    suggestionId,
    type: 'engagement',
    status: 'pending',
    title: 'AI 互动话术方案',
    description: `基于建议"${suggestionText}"生成的评论回复模板`,
    engagement: { scenarios },
    createdAt: new Date().toISOString(),
  };

  return plan;
}

async function handlePersonaPlan(
  accountId: string,
  suggestionText: string,
  suggestionId: string
): Promise<ActionPlan> {
  const account = await db.xhsAccount.findUnique({
    where: { id: accountId },
    include: { persona: true },
  });

  if (!account) throw new Error('账号不存在');

  const currentTags = account.persona
    ? JSON.parse(account.persona.keywords || '[]') as string[]
    : [];
  const currentDesc = account.persona?.referenceDesc || '';

  // Generate persona suggestions via AI
  const personaClient = getAiClient();

  let suggestedTags = currentTags;
  let suggestedDesc = currentDesc;

  if (personaClient) {
    try {
      const prompt = `你是一位小红书人设定位专家。请根据以下建议，为人设提供优化方案。

当前关键词：${currentTags.join('、') || '无'}
当前描述：${currentDesc || '无'}
优化建议：${suggestionText}

请返回JSON格式：
{
  "suggestedTags": ["新关键词1", "新关键词2", "新关键词3"],
  "suggestedDesc": "优化后的定位描述"
}`;
      const result = await personaClient.client.chat.completions.create({
        model: personaClient.model,
        messages: [
          { role: 'system', content: '你是小红书人设定位专家，请返回JSON格式。' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.6,
      });
      const text = result.choices?.[0]?.message?.content || '';
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed?.suggestedTags) suggestedTags = parsed.suggestedTags;
        if (parsed?.suggestedDesc) suggestedDesc = parsed.suggestedDesc;
      }
    } catch {
      // fallback
    }
  }

  // Fallback: derive suggestions from the suggestion text
  if (suggestedTags === currentTags && suggestedDesc === currentDesc) {
    const keywords = suggestionText
      .replace(/[，。！？、\s]/g, ' ')
      .split(' ')
      .filter((w) => w.length > 1)
      .slice(0, 5);
    suggestedTags = keywords.length > 0 ? [...new Set([...currentTags, ...keywords])] : currentTags;
    suggestedDesc = suggestionText.slice(0, 100);
  }

  const plan: ActionPlan = {
    id: `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    suggestionId,
    type: 'persona',
    status: 'pending',
    title: 'AI 人设调整方案',
    description: `基于建议"${suggestionText}"的人设优化建议`,
    persona: {
      currentTags,
      suggestedTags,
      currentDesc,
      suggestedDesc,
    },
    createdAt: new Date().toISOString(),
  };

  return plan;
}

async function handleStrategyPlan(
  accountId: string,
  suggestionText: string,
  suggestionId: string
): Promise<ActionPlan> {
  const account = await db.xhsAccount.findUnique({
    where: { id: accountId },
    include: {
      posts: { orderBy: { publishDate: 'desc' }, take: 20 },
      persona: true,
    },
  });

  if (!account) throw new Error('账号不存在');

  // Analyze recent posting patterns
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const postsThisWeek = account.posts.filter(
    (p) => p.publishDate && new Date(p.publishDate) >= weekStart
  );

  const dailyPlans: Array<{ date: string; time: string; topic: string; type: string }> = [];
  const topics = account.persona
    ? JSON.parse(account.persona.contentThemes || '[]') as string[]
    : ['日常分享', '教程', '干货'];

  for (let day = 0; day < 7; day++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + day);
    const topic = topics[day % topics.length];

    // Recommend posting time based on account history
    const hourStats = new Map<number, number>();
    account.posts.forEach((p) => {
      if (p.publishTime) {
        const h = parseInt(p.publishTime.split(':')[0] || '0', 10);
        hourStats.set(h, (hourStats.get(h) || 0) + 1);
      }
    });
    const bestHour = Array.from(hourStats.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 18;

    dailyPlans.push({
      date: date.toISOString().split('T')[0],
      time: `${bestHour}:00`,
      topic,
      type: postsThisWeek.length >= day ? '建议发布' : '建议休息',
    });
  }

  const goals = [
    `本周发布 ${Math.max(postsThisWeek.length + 1, 5)} 篇笔记`,
    `平均互动率提升 10%`,
    `粉丝增长 ${Math.ceil(account.followers * 0.05) || 50}+`,
  ];

  // AI-enhanced goals if available
  const strategyClient = getAiClient();

  if (strategyClient) {
    try {
      const prompt = `你是一位小红书周运营计划专家。基于以下数据，生成本周运营目标（3条）。

账号：${account.nickname} | 粉丝：${account.followers} | 本周已发：${postsThisWeek.length} 篇
建议方向：${suggestionText}

请返回JSON格式：{ "goals": ["目标1", "目标2", "目标3"] }`;
      const result = await strategyClient.client.chat.completions.create({
        model: strategyClient.model,
        messages: [
          { role: 'system', content: '你是小红书运营专家，请返回JSON格式。' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.6,
      });
      const text = result.choices?.[0]?.message?.content || '';
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed?.goals && Array.isArray(parsed.goals)) {
          goals.splice(0, goals.length, ...parsed.goals);
        }
      }
    } catch {
      // keep default goals
    }
  }

  const plan: ActionPlan = {
    id: `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    suggestionId,
    type: 'strategy',
    status: 'pending',
    title: 'AI 周运营计划',
    description: `基于建议"${suggestionText}"生成的7天运营计划`,
    strategy: {
      weekStart: weekStart.toISOString(),
      goals,
      dailyPlans,
    },
    createdAt: new Date().toISOString(),
  };

  return plan;
}

// ─── API Handler ─────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: accountId } = await params;
    const body = await request.json();
    const { suggestionId, suggestionText, suggestionType } = body;

    if (!suggestionId || !suggestionText || !suggestionType) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段' },
        { status: 400 }
      );
    }

    // Verify account exists
    const account = await db.xhsAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return NextResponse.json(
        { success: false, error: '账号不存在' },
        { status: 404 }
      );
    }

    // Verify suggestion exists
    const suggestion = await db.contentSuggestion.findUnique({
      where: { id: suggestionId },
    });

    if (!suggestion || suggestion.accountId !== accountId) {
      return NextResponse.json(
        { success: false, error: '建议不存在' },
        { status: 404 }
      );
    }

    // Dispatch to appropriate handler based on type
    let plan: ActionPlan;

    switch (suggestionType as PlanType) {
      case 'content':
        plan = await handleContentPlan(accountId, suggestionText, suggestionId);
        break;
      case 'timing':
        plan = await handleTimingPlan(accountId, suggestionText, suggestionId);
        break;
      case 'engagement':
        plan = await handleEngagementPlan(accountId, suggestionText, suggestionId);
        break;
      case 'persona':
        plan = await handlePersonaPlan(accountId, suggestionText, suggestionId);
        break;
      case 'strategy':
        plan = await handleStrategyPlan(accountId, suggestionText, suggestionId);
        break;
      default:
        return NextResponse.json(
          { success: false, error: '未知的建议类型' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error('Failed to generate plan:', error);
    const errorMessage = error instanceof Error ? error.message : '方案生成失败';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}