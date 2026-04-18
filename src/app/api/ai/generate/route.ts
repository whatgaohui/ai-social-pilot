import { NextRequest, NextResponse } from 'next/server';
import { createAIClient } from '@/lib/ai-client';

export async function POST(request: NextRequest) {
  try {
    const { type, persona, knowledgeItems, material, topic, tone, style, existingContent, platform = 'wechat' } = await request.json();
    const isXHS = platform === 'xiaohongshu';
    
    const ai = await createAIClient();
    
    let systemPrompt = '';
    let userPrompt = '';
    
    const personaContext = persona ? `
人设信息：
- 姓名：${persona.name}
- 职业/头衔：${persona.title || '未设置'}
- 行业：${persona.industry || '未设置'}
- 风格：${tone || persona.tone || '专业严谨'}
- 文案风格：${style || persona.style || '均衡兼顾'}
- 目标受众：${persona.targetAudience || '普通读者'}
- 关键词：${persona.keywords || '未设置'}
` : '';

    const knowledgeContext = knowledgeItems && knowledgeItems.length > 0 ? `
个人知识库素材：
${knowledgeItems.slice(0, 10).map((item: { title: string; content: string; category: string }, i: number) => `${i + 1}. [${item.category}] ${item.title}: ${item.content.slice(0, 200)}`).join('\n')}
` : '';

    if (type === 'auto') {
      if (isXHS) {
        systemPrompt = `你是一位资深的小红书内容运营专家，擅长创作爆款小红书笔记。
${personaContext}
小红书笔记创作要求：
1. 第一行是吸引眼球的标题（15-25字，要有噱头和痛点）
2. 正文内容要生动有趣，大量使用emoji表情
3. 段落要简短，每段2-3行，便于手机阅读
4. 结尾必须包含3-5个相关话题标签（#格式）
5. 内容要有价值感，让用户产生"收藏"欲望
6. 正文控制在300-500字
7. 语气要真实自然，像朋友在分享`;

        userPrompt = `platform: "xiaohongshu"
请为小红书创作一篇笔记。
主题：${topic || '自由发挥'}
${knowledgeContext}

请直接输出笔记内容（标题+正文+话题标签），不需要额外解释。`;
      } else {
        systemPrompt = `你是一位专业的朋友圈内容运营专家，擅长为个人IP打造者创作高质量的朋友圈文案。
${personaContext}
要求：
1. 基于用户的知识库内容进行原创创作，绝不抄袭
2. 文案要自然、有温度、有个性
3. 适当使用emoji增加亲和力（但不要过度）
4. 控制在100-200字左右
5. 每条文案都要有独特价值，能引发共鸣或思考`;

        userPrompt = `请为朋友圈创作一条文案。
主题：${topic || '自由发挥'}
${knowledgeContext}

请直接输出文案内容，不需要额外解释。`;
      }

    } else if (type === 'fragment') {
      const materialInfo = material ? `
原始素材：
${material.type === 'conversation' ? '类型：对话片段' : material.type === 'screenshot' ? '类型：截图内容' : '类型：文本片段'}
内容类型标签：${material.contentType || '通用'}
素材内容：${material.content || '未提供'}
` : '';

      if (isXHS) {
        systemPrompt = `你是一位资深的小红书内容运营专家，擅长将日常碎片信息转化为爆款小红书笔记。
${personaContext}
小红书笔记创作要求：
1. 第一行是吸引眼球的标题（15-25字，要有噱头和痛点）
2. 从原始素材中提炼核心信息和亮点
3. 正文内容要生动有趣，大量使用emoji表情
4. 段落要简短，每段2-3行，便于手机阅读
5. 结尾必须包含3-5个相关话题标签（#格式）
6. 内容要有价值感，让用户产生"收藏"欲望
7. 正文控制在300-500字
8. 语气要真实自然，像朋友在分享`;

        userPrompt = `platform: "xiaohongshu"
请将以下素材转化为一篇小红书笔记。
${materialInfo}
${knowledgeContext}

请直接输出笔记内容（标题+正文+话题标签），不需要额外解释。`;
      } else {
        systemPrompt = `你是一位专业的朋友圈内容运营专家，擅长将日常碎片信息转化为高质量的朋友圈文案。
${personaContext}
要求：
1. 从原始素材中提炼核心信息和亮点
2. 重新组织语言，使其更有吸引力和传播力
3. 适当增加个人观点和情感
4. 控制在100-200字左右
5. 适当使用emoji增加亲和力`;

        userPrompt = `请将以下素材转化为一条优质的朋友圈文案。
${materialInfo}
${knowledgeContext}

请直接输出文案内容，不需要额外解释。`;
      }

    } else if (type === 'polish') {
      if (isXHS) {
        systemPrompt = `你是一位资深的小红书文案润色专家，擅长将原始内容优化为爆款小红书笔记。
${personaContext}
小红书笔记润色要求：
1. 保留原始内容的核心意思和真实性
2. 重新组织为小红书笔记格式：标题 + 正文 + 话题标签
3. 标题要吸引眼球（15-25字，有噱头和痛点）
4. 正文大量使用emoji表情，段落简短
5. 结尾包含3-5个相关话题标签（#格式）
6. 正文控制在300-500字
7. 提升内容的"收藏价值"
8. 语气真实自然，像朋友在分享`;

        userPrompt = `platform: "xiaohongshu"
请将以下内容润色为一篇小红书笔记：

原文：${existingContent || ''}

${knowledgeContext}

请直接输出润色后的笔记（标题+正文+话题标签），不需要额外解释。`;
      } else {
        systemPrompt = `你是一位专业的文案润色专家，擅长将大白话优化为优美、有吸引力的朋友圈文案。
${personaContext}
要求：
1. 保留原始内容的核心意思和真实性
2. 提升语言的文学性和感染力
3. 使文案更有节奏感和层次感
4. 适当使用修辞手法（比喻、排比、对比等）
5. 控制在100-200字左右
6. 保持自然的语气，避免过于华丽`;

        userPrompt = `请将以下大白话润色为优美的朋友圈文案：

原文：${existingContent || ''}

${knowledgeContext}

请直接输出润色后的文案，不需要额外解释。`;
      }
    }

    const generatedContent = await ai.chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);
    
    return NextResponse.json({ 
      content: generatedContent,
      model: ai.config?.name || ai.config?.provider || 'default',
    });
  } catch (error) {
    console.error('AI generation error:', error);
    return NextResponse.json({ error: 'Failed to generate content', details: String(error) }, { status: 500 });
  }
}
