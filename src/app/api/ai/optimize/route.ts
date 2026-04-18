import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const { post, persona, feedback, knowledgeItems } = await request.json();
    
    const zai = await ZAI.create();
    
    const personaContext = persona ? `
人设信息：
- 姓名：${persona.name}
- 风格：${persona.tone || '专业严谨'}
- 文案风格：${persona.style || '均衡兼顾'}
` : '';

    const systemPrompt = `你是一位朋友圈文案优化专家。${personaContext}
你的任务是对已有的朋友圈文案进行优化迭代。

优化原则：
1. 保留原文核心信息
2. 根据反馈意见进行针对性改进
3. 提升文案的吸引力和互动性
4. 控制在100-200字
5. 适当使用emoji`;

    const userPrompt = `请优化以下朋友圈文案：

原文案：
${post.content}

内容类型：${post.contentType}
主题：${post.topic}

${feedback ? `优化要求/反馈：${feedback}` : '请从以下方面优化：1.提升标题吸引力 2.优化开篇 3.增强结尾号召力'}

${knowledgeItems && knowledgeItems.length > 0 ? `可参考的知识库素材：${knowledgeItems.slice(0, 3).map((item: { title: string; content: string }) => `- ${item.title}: ${item.content.slice(0, 100)}`).join('\n')}` : ''}

请直接输出优化后的文案内容。`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      thinking: { type: 'disabled' },
    });

    const optimizedContent = completion.choices[0]?.message?.content || '';
    
    return NextResponse.json({ content: optimizedContent });
  } catch (error) {
    console.error('Optimize error:', error);
    return NextResponse.json({ error: 'Failed to optimize content' }, { status: 500 });
  }
}
