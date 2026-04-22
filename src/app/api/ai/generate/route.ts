import { NextRequest, NextResponse } from 'next/server';
import { createAIClient } from '@/lib/ai-client';
import { db } from '@/lib/db';

// ── Content Rewrite Modes ───────────────────────────────────────────────────

const STYLE_PRESET_PROMPTS: Record<string, string> = {
  professional: '专业正式：使用严谨的书面语，避免口语化表达，用词精准，逻辑清晰。适合职场、行业分享类内容。',
  humorous: '轻松幽默：使用网络流行语和俏皮表达，适当加入梗和段子，让读者会心一笑。保持轻松愉快的氛围。',
  emotional: '温情走心：用温暖细腻的语言表达情感，注重画面感和故事性。让读者产生共鸣和感动。',
  sharp: '犀利毒舌：使用犀利尖锐的表达，有态度有观点，敢于说真话。适当使用反讽和对比手法，语言简洁有力。',
};

const EXPAND_MODE_PROMPTS: Record<string, string> = {
  details: '补充细节：在原文基础上，补充具体的数据、场景描述、时间地点等细节信息，让内容更加丰富具体。',
  examples: '增加案例：在原文基础上，增加1-2个真实案例或故事来支撑观点，让内容更有说服力。',
  deepen: '深化观点：在原文基础上，深入分析背后的原因、影响和趋势，提出更深层次的思考和洞察。',
};

const CONDENSE_MODE_PROMPTS: Record<string, string> = {
  essential: '精简提炼：保留核心信息和关键观点，去除冗余修饰和重复内容，使表达更加精炼清晰。',
  oneline: '一句话总结：将所有内容压缩为一句精炼的话，不超过30字，要包含最核心的信息。',
};

interface RewriteParams {
  mode: 'style_rewrite' | 'expand' | 'condense';
  content: string;
  platform: string;
  persona?: Record<string, string> | null;
  stylePreset?: string;
  expandMode?: string;
  condenseMode?: string;
}

async function handleContentRewrite(params: RewriteParams): Promise<NextResponse> {
  try {
    const { mode, content, platform, persona, stylePreset, expandMode, condenseMode } = params;
    const isXHS = platform === 'xiaohongshu';

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is empty' }, { status: 400 });
    }

    const ai = await createAIClient();

    let systemPrompt = '';
    let userPrompt = '';

    const platformHint = isXHS
      ? '这是小红书平台的内容，保持小红书风格（适当emoji、话题标签等）。'
      : '这是朋友圈的内容，保持朋友圈的自然亲切风格。';

    const personaHint = persona ? `\n人设参考：${persona.name}，${persona.title || ''}，风格偏好：${persona.style || '均衡'}。` : '';

    if (mode === 'style_rewrite') {
      const presetPrompt = STYLE_PRESET_PROMPTS[stylePreset || 'professional'] || STYLE_PRESET_PROMPTS.professional;
      systemPrompt = `你是一位资深的文案风格改写专家。${platformHint}${personaHint}

你的任务是将用户提供的文案改写为指定风格。

改写要求：
1. 完全保留原文的核心含义和信息
2. 严格按照指定风格进行改写
3. 不要增加或删除原文的核心观点
4. 改写后的内容要自然流畅

风格要求：${presetPrompt}

请直接输出改写后的文案，不需要任何解释或标注。`;

      userPrompt = `请将以下文案改写：

原文：
${content}`;

    } else if (mode === 'expand') {
      const modePrompt = EXPAND_MODE_PROMPTS[expandMode || 'details'] || EXPAND_MODE_PROMPTS.details;
      systemPrompt = `你是一位资深的内容扩写专家。${platformHint}${personaHint}

你的任务是将用户提供的短内容扩写为更丰富、更完整的文案。

扩写要求：
1. 保留原文的核心信息和观点
2. ${modePrompt}
3. 扩写后的内容要自然连贯，不能有拼凑感
4. ${isXHS ? '扩写后控制在400-600字。' : '扩写后控制在200-400字。'}

请直接输出扩写后的文案，不需要任何解释或标注。`;

      userPrompt = `请将以下文案扩写：

原文（${content.length}字）：
${content}`;

    } else if (mode === 'condense') {
      const modePrompt = CONDENSE_MODE_PROMPTS[condenseMode || 'essential'] || CONDENSE_MODE_PROMPTS.essential;
      systemPrompt = `你是一位资深的内容提炼专家。${platformHint}${personaHint}

你的任务是将用户提供的较长文案压缩为更精炼的版本。

缩写要求：
1. 保留原文最核心的信息和观点
2. ${modePrompt}
3. 缩写后的内容要仍然完整可读
4. 不要丢失关键信息

请直接输出缩写后的文案，不需要任何解释或标注。`;

      userPrompt = `请将以下文案缩写：

原文（${content.length}字）：
${content}`;
    }

    const result = await ai.chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    return NextResponse.json({
      content: result,
      mode,
      originalLength: content.length,
      resultLength: result.length,
      model: ai.config?.name || ai.config?.provider || 'default',
    });
  } catch (error) {
    console.error('Content rewrite error:', error);
    return NextResponse.json({ error: 'Failed to rewrite content', details: String(error) }, { status: 500 });
  }
}

// ── Main POST Handler ───────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { type, mode, persona, knowledgeItems, material, topic, tone, style, existingContent, platform = 'wechat', postId, stylePreset, expandMode, condenseMode } = await request.json();
    const isXHS = platform === 'xiaohongshu';

    // ── New mode handling: style_rewrite, expand, condense ─────
    if (mode === 'style_rewrite' || mode === 'expand' || mode === 'condense') {
      return handleContentRewrite({ mode, content: existingContent, platform, persona, stylePreset, expandMode, condenseMode });
    }
    
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

    // ── Fallback for unsupported type ────────────────────────────
    } else {
      return NextResponse.json({ error: 'Unsupported type', details: `Type "${type}" is not supported` }, { status: 400 });
    }

    const generatedContent = await ai.chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    // Auto-create a ContentVersion record in "auto" mode when postId is provided
    if (type === 'auto' && postId) {
      try {
        const maxVersion = await db.contentVersion.findFirst({
          where: { postId },
          orderBy: { version: 'desc' },
          select: { version: true },
        });
        const newVersion = (maxVersion?.version || 0) + 1;
        await db.contentVersion.create({
          data: {
            postId,
            version: newVersion,
            content: generatedContent,
            changeType: 'ai_generate',
            summary: 'AI生成文案',
            aiScore: 0,
          },
        });
      } catch (versionError) {
        console.error('Failed to auto-create content version:', versionError);
      }
    }

    return NextResponse.json({ 
      content: generatedContent,
      model: ai.config?.name || ai.config?.provider || 'default',
    });
  } catch (error) {
    console.error('AI generation error:', error);
    return NextResponse.json({ error: 'Failed to generate content', details: String(error) }, { status: 500 });
  }
}
