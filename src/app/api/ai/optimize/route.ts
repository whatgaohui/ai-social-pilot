import { NextRequest, NextResponse } from 'next/server';
import { createAIClient } from '@/lib/ai-client';

export async function POST(request: NextRequest) {
  try {
    const { post, persona, feedback, knowledgeItems, platform = 'wechat', mode } = await request.json();
    const isXHS = platform === 'xiaohongshu';

    // Handle format mode specifically
    if (mode === 'format') {
      return handleFormatMode(post, platform);
    }

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

    // Strip markdown code blocks if present (AI sometimes wraps output in ```)
    let cleaned = optimizedContent.trim();
    const codeBlockMatch = cleaned.match(/```(?:[a-zA-Z]*)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      cleaned = codeBlockMatch[1].trim();
    }

    return NextResponse.json({
      content: cleaned,
      model: ai.config?.name || ai.config?.provider || 'default',
    });
  } catch (error) {
    console.error('Optimize error:', error);
    return NextResponse.json({ error: 'Failed to optimize content' }, { status: 500 });
  }
}

async function handleFormatMode(post: { content: string; contentType: string; topic: string }, platform: string) {
  const isXHS = platform === 'xiaohongshu';
  const ai = await createAIClient();

  let systemPrompt = '';
  let userPrompt = '';

  if (isXHS) {
    systemPrompt = `你是一位小红书排版格式优化专家。你的任务是对已有笔记的排版格式进行专业优化，不改变核心内容含义。

排版优化规则：
1. 标题优化：标题控制在15-25个字之间，添加强力词（如"绝了"、"终于"、"必看"、"救命"等）提升点击率
2. 正文排版：每段2-4句话，段落间空一行，保持阅读节奏
3. Emoji密度：每50-80个字添加1个emoji，不要过多也不要过少，emoji要与内容相关
4. 话题标签：确保文末有3-5个话题标签，格式为 #标签名，包含热门标签和精准标签
5. 首行吸引：第一行要有冲击力，可以用感叹、提问、数字等方式吸引用户继续阅读
6. 空行节奏：在重要信息前后适当空行，制造视觉节奏感

注意：
- 保留原文的核心信息和观点
- 只做排版格式调整，不改变语义
- 输出完整的优化后内容（含标题和标签）`;

    userPrompt = `请对以下小红书笔记进行排版格式优化：

原文：
${post.content}

主题：${post.topic}

请严格按照排版优化规则输出完整的优化后内容。`;
  } else {
    systemPrompt = `你是一位朋友圈排版格式优化专家。你的任务是对已有朋友圈文案的排版格式进行专业优化，不改变核心内容含义。

排版优化规则：
1. 段落优化：将长内容拆分为2-3个段落，每段2-3句话，段落间留一个空行
2. Emoji优化：策略性添加emoji，每段开头或关键句后可加1-2个，总量控制在3-6个，不要堆砌
3. 话题标签：在文末添加1-2个相关话题标签，格式为 #标签名
4. 排版美化：去除多余的连续空行，保持一个空行的间距；优化换行位置
5. @提及建议：在合适位置添加@提及（如果内容涉及特定场景，如 @某个朋友、@某个品牌）

注意：
- 保留原文的核心信息和观点
- 只做排版格式调整，不改变语义
- 文案控制在100-200字以内
- 输出完整的优化后内容`;

    userPrompt = `请对以下朋友圈文案进行排版格式优化：

原文：
${post.content}

主题：${post.topic}

请严格按照排版优化规则输出完整的优化后内容。`;
  }

  const formattedContent = await ai.chatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  // Strip markdown code blocks if present
  let cleaned = formattedContent.trim();
  const codeBlockMatch = cleaned.match(/```(?:[a-zA-Z]*)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  return NextResponse.json({
    content: cleaned,
    mode: 'format',
    model: ai.config?.name || ai.config?.provider || 'default',
  });
}
