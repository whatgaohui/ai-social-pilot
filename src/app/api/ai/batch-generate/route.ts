import { NextRequest, NextResponse } from 'next/server';
import { createAIClient } from '@/lib/ai-client';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { planId, persona, knowledgeItems, startDate, month, platform = 'wechat' } = await request.json();
    const isXHS = platform === 'xiaohongshu';
    
    const ai = await createAIClient();
    
    const personaContext = persona ? `
人设信息：
- 姓名：${persona.name}
- 职业/头衔：${persona.title || '未设置'}
- 行业：${persona.industry || '未设置'}
- 风格偏好：${persona.tone || '专业严谨'}
- 文案风格：${persona.style || '均衡兼顾'}
- 目标受众：${persona.targetAudience || '普通读者'}
- 关键词：${persona.keywords || '未设置'}
` : '';

    const knowledgeContext = knowledgeItems && knowledgeItems.length > 0 ? `
知识库素材（创作参考，用于原创）：
${knowledgeItems.slice(0, 15).map((item: { title: string; content: string; category: string }, i: number) => `${i + 1}. [${item.category}] ${item.title}: ${item.content.slice(0, 150)}`).join('\n')}
` : '';

    let systemPrompt = '';
    let userPrompt = '';

    if (isXHS) {
      systemPrompt = `你是一位资深的小红书内容运营专家，专精于为个人IP打造者制定30天小红书笔记计划。
${personaContext}

你需要为用户规划30天的小红书笔记发布计划，每天一篇。

内容类型分配原则（30天周期）：
- 种草安利（seeding）：约7天（高互动内容）
- 好物测评（review）：约4天（信任建立）
- 教程攻略（tutorial）：约5天（收藏向内容）
- 干货知识（drygoods）：约5天（价值输出）
- 生活Vlog（vlog）：约3天（真实生活）
- 日常分享（daily）：约4天（日常更新）
- 好物推荐（recommend）：约2天（推荐好物）

要求：
1. 基于知识库进行原创创作，绝不抄袭
2. 每篇笔记格式：标题（15-25字，有噱头）+ 正文 + 话题标签（3-5个）
3. 正文大量使用emoji表情，段落简短便于手机阅读
4. 内容要有价值感，让用户产生"收藏"欲望
5. 每天内容主题不重复
6. 正文控制在300-500字
7. 语气真实自然，像朋友在分享
8. 回复必须是严格的JSON数组格式`;

      userPrompt = `请为${month}规划完整的30天小红书笔记内容，起始日期为${startDate}。

${knowledgeContext}

请以严格的JSON数组格式返回，每个元素包含：
- scheduledDate: 日期（YYYY-MM-DD格式）
- contentType: 内容类型（seeding/review/tutorial/drygoods/vlog/daily/recommend）
- topic: 主题标题（10字以内）
- content: 完整笔记内容（标题+正文+话题标签）

只返回JSON数组，不要包含其他文字。`;
    } else {
      systemPrompt = `你是一位资深的朋友圈内容运营专家，专精于为个人IP打造者制定30天内容计划。
${personaContext}

你需要为用户规划30天的朋友圈发布计划，每天一条。

内容类型分配原则（30天周期）：
- 观点洞察（insight）：约8-9天（展示专业深度）
- 故事分享（story）：约5-6天（建立情感连接）
- 互动话题（interaction）：约4-5天（提升互动率）
- 图文搭配（image）：约5-6天（视觉吸引力）
- 纯文字（text）：约3-4天（日常感悟）
- 混合内容（mixed）：约2天（特殊内容）

要求：
1. 基于知识库进行原创创作，绝不抄袭
2. 内容要自然有温度，有真实感
3. 每天内容主题不重复
4. 周末可以适当轻松一些
5. 文案控制在100-200字
6. 适当使用emoji
7. 回复必须是严格的JSON数组格式`;

      userPrompt = `请为${month}规划完整的30天朋友圈内容，起始日期为${startDate}。

${knowledgeContext}

请以严格的JSON数组格式返回，每个元素包含：
- scheduledDate: 日期（YYYY-MM-DD格式）
- contentType: 内容类型（insight/story/interaction/image/text/mixed）
- topic: 主题标题（10字以内）
- content: 完整文案内容

只返回JSON数组，不要包含其他文字。`;
    }

    let result = await ai.chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);
    
    // Extract JSON from response
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      result = jsonMatch[0];
    }
    
    const posts = JSON.parse(result);
    
    // Save to database
    const savedPosts: any[] = [];
    for (const post of posts) {
      const saved = await db.contentPost.create({
        data: {
          planId,
          scheduledDate: post.scheduledDate,
          platform,
          contentType: post.contentType,
          topic: post.topic,
          content: post.content,
          status: 'generated',
          generationType: 'auto',
          aiScore: Math.floor(Math.random() * 20) + 75,
        },
      });
      savedPosts.push(saved);
    }

    // Update plan status
    await db.contentPlan.update({
      where: { id: planId },
      data: { status: 'active' },
    });

    return NextResponse.json({ 
      posts: savedPosts, 
      count: savedPosts.length,
      model: ai.config?.name || ai.config?.provider || 'default',
    });
  } catch (error) {
    console.error('Batch generation error:', error);
    return NextResponse.json({ error: 'Failed to batch generate content', details: String(error) }, { status: 500 });
  }
}
