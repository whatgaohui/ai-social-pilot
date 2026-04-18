import { NextRequest, NextResponse } from 'next/server';
import { createAIClient } from '@/lib/ai-client';

export async function POST(request: NextRequest) {
  try {
    const { post, persona, feedback, knowledgeItems, platform = 'wechat' } = await request.json();
    const isXHS = platform === 'xiaohongshu';
    
    const ai = await createAIClient();
    
    const personaContext = persona ? `
人设信息：
- 姓名：${persona.name}
- 风格：${persona.tone || '专业严谨'}
- 文案风格：${persona.style || '均衡兼顾'}
` : '';

    let systemPrompt = '';
    let userPrompt = '';

    if (isXHS) {
      systemPrompt = `你是一位小红书文案优化专家。${personaContext}
你的任务是对已有的小红书笔记进行优化迭代。

优化要求：
1. 保留原文核心信息
2. 根据反馈意见进行针对性改进
3. 优化标题的吸引力和点击率
4. 丰富emoji使用
5. 确保结尾有3-5个话题标签
6. 保持300-500字
7. 提升内容的"收藏价值"
8. 语气真实自然，像朋友在分享`;

      userPrompt = `请优化以下小红书笔记：

原文案：
${post.content}

内容类型：${post.contentType}
主题：${post.topic}

${feedback ? `优化要求/反馈：${feedback}` : '请从以下方面优化：1.提升标题吸引力 2.丰富emoji 3.优化话题标签 4.提升收藏价值'}

${knowledgeItems && knowledgeItems.length > 0 ? `可参考的知识库素材：${knowledgeItems.slice(0, 3).map((item: { title: string; content: string }) => `- ${item.title}: ${item.content.slice(0, 100)}`).join('\n')}` : ''}

请直接输出优化后的笔记内容（标题+正文+话题标签）。`;
    } else {
      systemPrompt = `你是一位朋友圈文案优化专家。${personaContext}
你的任务是对已有的朋友圈文案进行优化迭代。

优化原则：
1. 保留原文核心信息
2. 根据反馈意见进行针对性改进
3. 提升文案的吸引力和互动性
4. 控制在100-200字
5. 适当使用emoji`;

      userPrompt = `请优化以下朋友圈文案：

原文案：
${post.content}

内容类型：${post.contentType}
主题：${post.topic}

${feedback ? `优化要求/反馈：${feedback}` : '请从以下方面优化：1.提升标题吸引力 2.优化开篇 3.增强结尾号召力'}

${knowledgeItems && knowledgeItems.length > 0 ? `可参考的知识库素材：${knowledgeItems.slice(0, 3).map((item: { title: string; content: string }) => `- ${item.title}: ${item.content.slice(0, 100)}`).join('\n')}` : ''}

请直接输出优化后的文案内容。`;
    }

    const optimizedContent = await ai.chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);
    
    return NextResponse.json({ 
      content: optimizedContent,
      model: ai.config?.name || ai.config?.provider || 'default',
    });
  } catch (error) {
    console.error('Optimize error:', error);
    return NextResponse.json({ error: 'Failed to optimize content' }, { status: 500 });
  }
}
