/**
 * Centralized AI Prompt Templates
 *
 * All prompt construction logic is consolidated here so that:
 * - Prompts are easy to find, review, and tune in one place
 * - Route handlers stay thin – they only call build*Prompt() and pass the
 *   resulting messages to the AI client
 * - Prompt wording changes do not require touching route files
 *
 * IMPORTANT: The prompt text has been moved verbatim from the original route
 * files. Do NOT reword anything – only relocate.
 */

// ── Shared types ────────────────────────────────────────────────────────────

/** A single message in a chat completion request */
export interface ChatMessage {
  role: string;
  content: string;
}

export interface PersonaInfo {
  name: string;
  title?: string;
  tone?: string;
  style?: string;
  industry?: string;
  keywords?: string;
  targetAudience?: string;
  bio?: string;
}

export interface KnowledgeItem {
  title: string;
  content: string;
  category: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function buildPersonaContext(persona: PersonaInfo | null | undefined, overrides?: { tone?: string; style?: string }): string {
  if (!persona) return '';
  return `
人设信息：
- 姓名：${persona.name}
- 职业/头衔：${persona.title || '未设置'}
- 行业：${persona.industry || '未设置'}
- 风格：${overrides?.tone || persona.tone || '专业严谨'}
- 文案风格：${overrides?.style || persona.style || '均衡兼顾'}
- 目标受众：${persona.targetAudience || '普通读者'}
- 关键词：${persona.keywords || '未设置'}
`;
}

function buildKnowledgeContext(items: KnowledgeItem[] | null | undefined, limit = 10, contentSlice = 200): string {
  if (!items || items.length === 0) return '';
  return `
个人知识库素材：
${items.slice(0, limit).map((item, i) => `${i + 1}. [${item.category}] ${item.title}: ${item.content.slice(0, contentSlice)}`).join('\n')}
`;
}

// ── Content Rewrite presets (used by buildGeneratePrompt) ───────────────────

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

// ── 1. Generate Prompt ──────────────────────────────────────────────────────

export interface GeneratePromptParams {
  platform: string;
  persona: PersonaInfo | null;
  knowledgeItems: KnowledgeItem[] | null;
  type: string; // auto | fragment | polish
  topic?: string;
  tone?: string;
  style?: string;
  material?: { type?: string; contentType?: string; content?: string } | null;
  existingContent?: string;
  // Rewrite sub-modes
  mode?: string; // style_rewrite | expand | condense
  stylePreset?: string;
  expandMode?: string;
  condenseMode?: string;
}

export function buildGeneratePrompt(params: GeneratePromptParams): ChatMessage[] {
  const { platform, persona, knowledgeItems, type, topic, tone, style, material, existingContent, mode, stylePreset, expandMode, condenseMode } = params;
  const isXHS = platform === 'xiaohongshu';

  // ── Content rewrite sub-modes ──────────────────────────────────────────
  if (mode === 'style_rewrite' || mode === 'expand' || mode === 'condense') {
    return buildContentRewritePrompt({
      mode: mode as 'style_rewrite' | 'expand' | 'condense',
      content: existingContent || '',
      platform,
      persona,
      stylePreset,
      expandMode,
      condenseMode,
    });
  }

  const personaContext = buildPersonaContext(persona, { tone, style });
  const knowledgeContext = buildKnowledgeContext(knowledgeItems);

  let systemPrompt = '';
  let userPrompt = '';

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

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

// ── 1b. Content Rewrite (sub-modes of generate) ────────────────────────────

interface ContentRewriteParams {
  mode: 'style_rewrite' | 'expand' | 'condense';
  content: string;
  platform: string;
  persona?: PersonaInfo | Record<string, string> | null;
  stylePreset?: string;
  expandMode?: string;
  condenseMode?: string;
}

function buildContentRewritePrompt(params: ContentRewriteParams): ChatMessage[] {
  const { mode, content, platform, persona, stylePreset, expandMode, condenseMode } = params;
  const isXHS = platform === 'xiaohongshu';

  const platformHint = isXHS
    ? '这是小红书平台的内容，保持小红书风格（适当emoji、话题标签等）。'
    : '这是朋友圈的内容，保持朋友圈的自然亲切风格。';

  const personaHint = persona ? `\n人设参考：${persona.name}，${persona.title || ''}，风格偏好：${persona.style || '均衡'}。` : '';

  let systemPrompt = '';
  let userPrompt = '';

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

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

// ── 2. Optimize Prompt ──────────────────────────────────────────────────────

export interface OptimizePromptParams {
  platform: string;
  post: {
    content: string;
    contentType: string;
    topic: string;
    id?: string;
  };
  persona: PersonaInfo | null;
  feedback?: string;
  knowledgeItems: KnowledgeItem[] | null;
  mode?: string; // general | format | engagement
}

export function buildOptimizePrompt(params: OptimizePromptParams): ChatMessage[] {
  const { platform, post, persona, feedback, knowledgeItems, mode } = params;

  // Format mode has its own distinct prompt
  if (mode === 'format') {
    return buildFormatPrompt({ platform, post });
  }

  const isXHS = platform === 'xiaohongshu';

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

${knowledgeItems && knowledgeItems.length > 0 ? `可参考的知识库素材：${knowledgeItems.slice(0, 3).map(item => `- ${item.title}: ${item.content.slice(0, 100)}`).join('\n')}` : ''}

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

${knowledgeItems && knowledgeItems.length > 0 ? `可参考的知识库素材：${knowledgeItems.slice(0, 3).map(item => `- ${item.title}: ${item.content.slice(0, 100)}`).join('\n')}` : ''}

请直接输出优化后的文案内容。`;
  }

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

// ── 2b. Format Prompt (sub-mode of optimize) ───────────────────────────────

interface FormatPromptParams {
  platform: string;
  post: {
    content: string;
    contentType: string;
    topic: string;
    id?: string;
  };
}

function buildFormatPrompt(params: FormatPromptParams): ChatMessage[] {
  const { platform, post } = params;
  const isXHS = platform === 'xiaohongshu';

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

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

// ── 3. Quality Score Prompt ─────────────────────────────────────────────────

export interface QualityScorePromptParams {
  platform: string;
  content: string;
  topic: string;
}

export function buildQualityScorePrompt(params: QualityScorePromptParams): ChatMessage[] {
  const { platform, content, topic } = params;
  const isXHS = platform === 'xiaohongshu';

  const platformLabel = isXHS ? '小红书' : '朋友圈';
  const lastDimension = isXHS
    ? '{ "name": "话题标签", "score": <0-100>, "explanation": "<1-2句话解释为什么给出这个分数>", "suggestion": "<具体的改进建议>" }'
    : '{ "name": "传播潜力", "score": <0-100>, "explanation": "<1-2句话解释为什么给出这个分数>", "suggestion": "<具体的改进建议>" }';
  const lastCriterion = isXHS
    ? '- 话题标签：标签相关性和热度'
    : '- 传播潜力：被转发的可能性';

  const systemPrompt = `你是一个${platformLabel}内容质量评估专家。请对以下内容进行多维度质量评分，并为每个维度提供详细的评分解释和改进建议。`;

  const userPrompt = `主题：${topic || '未指定'}
内容：
${content}

请以JSON格式返回评分结果（不要其他文字）：
{
  "overallScore": <0-100的综合分数>,
  "dimensions": [
    { "name": "标题吸引力", "score": <0-100>, "explanation": "<1-2句话解释为什么给出这个分数>", "suggestion": "<具体的改进建议>" },
    { "name": "内容价值", "score": <0-100>, "explanation": "<1-2句话解释为什么给出这个分数>", "suggestion": "<具体的改进建议>" },
    { "name": "情感共鸣", "score": <0-100>, "explanation": "<1-2句话解释为什么给出这个分数>", "suggestion": "<具体的改进建议>" },
    { "name": "可读性", "score": <0-100>, "explanation": "<1-2句话解释为什么给出这个分数>", "suggestion": "<具体的改进建议>" },
    { "name": "互动引导", "score": <0-100>, "explanation": "<1-2句话解释为什么给出这个分数>", "suggestion": "<具体的改进建议>" },
    ${lastDimension}
  ],
  "strengths": ["<优点1>", "<优点2>"],
  "improvements": ["<改进建议1>", "<改进建议2>"]
}

评分标准：
- 标题吸引力：是否能在信息流中快速抓住注意力
- 内容价值：信息量、实用性、独特性
- 情感共鸣：能否引发读者情感共振
- 可读性：排版、节奏、文字流畅度
- 互动引导：是否鼓励读者点赞/评论/收藏/转发
${lastCriterion}

要求：
- explanation：1-2句话解释该维度得分的具体原因，指出内容中哪些方面做得好或不足
- suggestion：针对该维度的具体、可操作的改进建议，例如"尝试在标题中加入数字（如3个技巧）或情感词（如惊艳）"`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

// ── 3b. Quality Optimize Prompt ─────────────────────────────────────────────

export interface QualityOptimizePromptParams {
  platform: string;
  content: string;
  topic?: string;
  lowDimensions: Array<{
    name: string;
    score: number;
    suggestion?: string;
  }>;
}

export function buildQualityOptimizePrompt(params: QualityOptimizePromptParams): ChatMessage[] {
  const { platform, content, topic, lowDimensions } = params;
  const isXHS = platform === 'xiaohongshu';
  const platformLabel = isXHS ? '小红书' : '朋友圈';

  const dimensionFeedback = lowDimensions
    .map((d) => `- ${d.name}（${d.score}分）${d.suggestion ? `：${d.suggestion}` : ''}`)
    .join('\n');

  const systemPrompt = `你是一位${platformLabel}内容优化专家。你的任务是根据质量评分反馈，对内容进行针对性优化，重点提升低分维度的表现。

优化原则：
1. 重点改进指定的低分维度，同时不降低其他维度的表现
2. 保留原文核心信息和风格
3. 优化要自然流畅，不能有拼凑感
4. 直接输出优化后的完整内容，不要解释修改了什么
${isXHS ? '5. 保持小红书风格：emoji表情、段落简短、话题标签' : '5. 保持朋友圈风格：自然亲切、控制在100-200字'}`;

  const userPrompt = `请优化以下${platformLabel}内容，重点提升低分维度：

主题：${topic || '未指定'}

原文内容：
${content}

需重点改进的维度：
${dimensionFeedback}

请直接输出优化后的完整内容。`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

// ── 4. Spellcheck Prompt ────────────────────────────────────────────────────

export interface SpellcheckPromptParams {
  platform: string;
  content: string;
}

export function buildSpellcheckPrompt(params: SpellcheckPromptParams): ChatMessage[] {
  const { platform, content } = params;

  const systemPrompt = `你是一位专业的中文社交媒体内容校对专家。你的任务是检查社交媒体内容中的错别字、标点符号错误和语法问题。

请严格按照以下JSON格式返回结果，不要返回任何其他内容：
{
  "checked": true,
  "issues": [
    {
      "original": "错误的文本片段",
      "suggestion": "修正后的文本",
      "type": "错别字",
      "position": { "start": 0, "end": 3 }
    }
  ]
}

规则：
1. type 只能是以下三种之一："错别字"、"标点错误"、"语法问题"
2. position 中的 start 和 end 是 original 在原始 content 中的字符位置（从0开始计数）
3. 如果没有发现任何问题，返回 { "checked": true, "issues": [] }
4. 只返回真正的问题，不要对风格、语气等提出建议
5. ${platform === 'xiaohongshu' ? '注意小红书常用表达方式，不要误报常见的网络用语' : '注意朋友圈常见的表达方式，不要误报常见的口语化表达'}`;

  const userPrompt = `请检查以下社交媒体内容中的错别字、标点错误和语法问题：

---
${content}
---

请返回JSON格式结果。`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

// ── 5. Analyze Prompt ───────────────────────────────────────────────────────

export interface AnalyzePromptParams {
  platform: string;
  analytics: Record<string, unknown>;
  posts: Array<Record<string, unknown>>;
}

export function buildAnalyzePrompt(params: AnalyzePromptParams): ChatMessage[] {
  const { platform, analytics, posts } = params;
  const isXHS = platform === 'xiaohongshu';

  const systemPrompt = isXHS
    ? `你是一位小红书运营数据分析专家。你需要分析小红书运营数据，重点关注收藏率、话题标签效果、标题点击率等XHS核心指标。
请用中文回复，使用markdown格式。`
    : `你是一位朋友圈运营数据分析专家。你需要分析运营数据，提供 actionable 的改进建议。
请用中文回复，使用markdown格式。`;

  const xhsMetrics = isXHS ? `
小红书核心指标：
- 总收藏数：${analytics.totalFavorites || 0}
- 收藏率：${analytics.totalFavorites && analytics.totalViews ? (Number(analytics.totalFavorites) / Number(analytics.totalViews) * 100).toFixed(1) : 0}%
- 话题标签使用情况：${analytics.hashtagEffectiveness || '暂无数据'}
- 标题平均点击率：${analytics.titleCTR || '暂无数据'}
` : '';

  const userPrompt = isXHS
    ? `请分析以下小红书运营数据，并提供改进建议：

数据概览：
- 总笔记数：${analytics.totalPosts}
- 已发布数：${analytics.publishedCount}
- 总点赞：${analytics.totalLikes}
- 总评论：${analytics.totalComments}
- 总分享：${analytics.totalShares}
- 总浏览：${analytics.totalViews}
- 总收藏：${analytics.totalFavorites || 0}
- 平均AI评分：${analytics.avgScore}/100
${xhsMetrics}
内容类型分布：${JSON.stringify(analytics.typeDistribution)}
状态分布：${JSON.stringify(analytics.statusDistribution)}

${posts && posts.length > 0 ? `表现最好的笔记：
${posts.slice(0, 5).map((p, i) => `${i + 1}. [${p.contentType}] ${p.topic} - 赞${p.likes} 评${p.comments} 收藏${p.favorites || 0}`).join('\n')}` : ''}

请提供：
1. 当前小红书运营状态评估（重点关注收藏率和互动数据）
2. 内容表现分析（话题标签效果、标题吸引力）
3. 提升收藏率的具体建议（至少5条）
4. 下一阶段重点方向`
    : `请分析以下朋友圈运营数据，并提供改进建议：

数据概览：
- 总内容数：${analytics.totalPosts}
- 已发布数：${analytics.publishedCount}
- 总点赞：${analytics.totalLikes}
- 总评论：${analytics.totalComments}
- 总分享：${analytics.totalShares}
- 总浏览：${analytics.totalViews}
- 平均AI评分：${analytics.avgScore}/100

内容类型分布：${JSON.stringify(analytics.typeDistribution)}
状态分布：${JSON.stringify(analytics.statusDistribution)}

${posts && posts.length > 0 ? `表现最好的内容：
${posts.slice(0, 5).map((p, i) => `${i + 1}. [${p.contentType}] ${p.topic} - 赞${p.likes} 评${p.comments} 转${p.shares}`).join('\n')}` : ''}

请提供：
1. 当前运营状态评估
2. 内容表现分析
3. 具体改进建议（至少5条）
4. 下一阶段重点方向`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

// ── 6. Batch Generate Prompt ────────────────────────────────────────────────

export interface BatchGeneratePromptParams {
  platform: string;
  persona: PersonaInfo | null;
  knowledgeItems: KnowledgeItem[] | null;
  startDate: string;
  month: string;
}

export function buildBatchGeneratePrompt(params: BatchGeneratePromptParams): ChatMessage[] {
  const { platform, persona, knowledgeItems, startDate, month } = params;
  const isXHS = platform === 'xiaohongshu';

  const personaContext = buildPersonaContext(persona);
  const knowledgeContext = knowledgeItems && knowledgeItems.length > 0 ? `
知识库素材（创作参考，用于原创）：
${knowledgeItems.slice(0, 15).map((item, i) => `${i + 1}. [${item.category}] ${item.title}: ${item.content.slice(0, 150)}`).join('\n')}
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

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

// ── 7. Schedule Suggest Prompt ──────────────────────────────────────────────

export interface ScheduleSuggestPromptParams {
  platform: string;
  days: number;
  contentPosts: Array<{
    scheduledDate: string;
    contentType: string;
    topic: string;
    likes: number;
    comments: number;
    shares: number;
    status: string;
  }>;
}

export function buildScheduleSuggestPrompt(params: ScheduleSuggestPromptParams): ChatMessage[] {
  const { platform, days, contentPosts } = params;
  const isXHS = platform === 'xiaohongshu';
  const platformLabel = isXHS ? '小红书' : '朋友圈';

  // Build context from existing posts
  const postSummary = contentPosts.length > 0
    ? contentPosts.slice(0, 20).map((p, i) => {
        const engagement = p.likes + p.comments * 3 + p.shares * 5;
        return `${i + 1}. ${p.scheduledDate} | ${p.contentType} | ${p.topic} | 互动指数:${engagement} | 状态:${p.status}`;
      }).join('\n')
    : '暂无历史内容数据';

  const typeDistribution: Record<string, number> = {};
  contentPosts.forEach((p) => {
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

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

// ── 8. Report Prompt ────────────────────────────────────────────────────────

export interface ReportPromptParams {
  platform: string;
  period: string;
  data: {
    totalPosts: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    totalViews: number;
    avgScore: number;
    publishRate: number;
    publishedCount: number;
    totalFavorites?: number;
    contentTypeAnalysis: Array<{ type: string; count: number; percentage: number; avgEngagement: number }>;
    topPosts: Array<{ id: string; topic: string; content: string; likes: number; comments: number; shares: number; views: number; favorites: number; contentType: string; engagement: number }>;
    persona: PersonaInfo | null;
    knowledgeItems: Array<{ category: string; title: string }>;
  };
}

export function buildReportPrompt(params: ReportPromptParams): ChatMessage[] {
  const { platform, period, data } = params;
  const isXHS = platform === 'xiaohongshu';

  const systemPrompt = isXHS
    ? `你是一位资深的小红书运营数据分析专家，擅长从数据中发现规律、提供可执行的优化建议。
请严格用JSON格式回复，不要包含markdown代码块标记。你的回复必须是一个合法的JSON对象。`
    : `你是一位资深的社交媒体运营数据分析专家，擅长从数据中发现规律、提供可执行的优化建议。
请严格用JSON格式回复，不要包含markdown代码块标记。你的回复必须是一个合法的JSON对象。`;

  const platformLabel = isXHS ? '小红书' : '朋友圈';
  const periodLabel = period === 'weekly' ? '本周' : '本月';

  const userPrompt = `请分析以下${platformLabel}${periodLabel}运营数据，生成一份结构化的运营报告。

## 基础数据
- 总${isXHS ? '笔记' : '内容'}数: ${data.totalPosts}
- 已发布: ${data.publishedCount}（发布率 ${data.publishRate}%）
- 总点赞: ${data.totalLikes}
- 总评论: ${data.totalComments}
- 总${isXHS ? '收藏' : '转发'}: ${isXHS ? (data.totalFavorites || 0) : data.totalShares}
- 总浏览: ${data.totalViews}
- 平均AI评分: ${data.avgScore}/100

## 内容类型分布
${data.contentTypeAnalysis.map(t => `- ${t.type}: ${t.count}篇 (${t.percentage}%), 平均互动${t.avgEngagement}`).join('\n')}

## Top 3 ${isXHS ? '笔记' : '内容'}
${data.topPosts.map((p, i) => `${i + 1}. [${p.contentType}] ${p.topic}
   内容: ${p.content.substring(0, 60)}...
   互动: 赞${p.likes} 评${p.comments} ${isXHS ? `藏${p.favorites}` : `转${p.shares}`} 浏${p.views} 分${p.engagement}`).join('\n')}

## 人设信息
${data.persona ? `- 名称: ${data.persona.name}\n- 行业: ${data.persona.industry}\n- 风格: ${data.persona.tone}/${data.persona.style}\n- 目标受众: ${data.persona.targetAudience}` : '未设置人设'}

${data.knowledgeItems.length > 0 ? `## 知识库
${data.knowledgeItems.slice(0, 5).map(k => `- [${k.category}] ${k.title}`).join('\n')}` : ''}

请以JSON格式返回以下结构（严格不要包含任何多余文字或markdown标记）:
{
  "overview": {
    "totalPosts": ${data.totalPosts},
    "totalLikes": ${data.totalLikes},
    "totalComments": ${data.totalComments},
    "totalShares": ${isXHS ? (data.totalFavorites || 0) : data.totalShares},
    "totalViews": ${data.totalViews},
    "avgScore": ${data.avgScore},
    "publishRate": ${data.publishRate}
  },
  "topPosts": [
    {"id": "id1", "topic": "主题", "contentPreview": "内容预览", "engagementSummary": "互动摘要描述", "engagement": 100},
    {"id": "id2", "topic": "主题", "contentPreview": "内容预览", "engagementSummary": "互动摘要描述", "engagement": 80},
    {"id": "id3", "topic": "主题", "contentPreview": "内容预览", "engagementSummary": "互动摘要描述", "engagement": 60}
  ],
  "contentTypeAnalysis": "${JSON.stringify(data.contentTypeAnalysis)}",
  "trends": {
    "summary": "整体趋势总结（1-2句话）",
    "engagementTrend": "上升/下降/平稳",
    "bestPerformingType": "表现最好的内容类型",
    "peakDay": "互动最高的一天描述"
  },
  "aiInsights": [
    "洞察1：具体发现和建议",
    "洞察2：具体发现和建议",
    "洞察3：具体发现和建议",
    "洞察4：具体发现和建议",
    "洞察5：具体发现和建议"
  ],
  "suggestions": [
    {"title": "建议标题", "description": "具体建议描述"},
    {"title": "建议标题", "description": "具体建议描述"},
    {"title": "建议标题", "description": "具体建议描述"},
    {"title": "建议标题", "description": "具体建议描述"}
  ],
  "nextWeekPlan": [
    {"focus": "重点方向1", "type": "内容类型", "reason": "推荐理由"},
    {"focus": "重点方向2", "type": "内容类型", "reason": "推荐理由"},
    {"focus": "重点方向3", "type": "内容类型", "reason": "推荐理由"},
    {"focus": "重点方向4", "type": "内容类型", "reason": "推荐理由"}
  ]
}`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

// ── 9. Chat Prompt ──────────────────────────────────────────────────────────

export interface ChatPromptParams {
  platform: string;
  personaId?: string;
  context?: string;
}

/**
 * Build the system prompt for AI chat.
 * Note: The chat route builds context from the database (persona + knowledge),
 * so the context string is pre-built and passed in here.
 */
export function buildChatSystemPrompt(params: ChatPromptParams): string {
  const { platform, context } = params;
  const isXHS = platform === 'xiaohongshu';

  const platformHint = isXHS
    ? `当前平台：小红书。注意小红书的内容特点——大量使用emoji、段落简短、结尾带话题标签（#）、强调"收藏价值"。`
    : `当前平台：朋友圈。注意朋友圈的内容特点——自然亲切、有温度、控制在100-200字、适当使用emoji。`;

  const basePrompt = `你是一个专业的社交媒体运营AI助手，擅长帮助用户创作${isXHS ? '小红书笔记' : '朋友圈内容'}。

${platformHint}

核心能力：
1. **内容创作**：根据用户需求创作优质社交媒体内容
2. **文案优化**：对用户提供的文案进行润色和优化
3. **标题生成**：为内容创作吸引眼球的标题
4. **数据分析**：分析内容表现，给出优化建议
5. **发布策略**：推荐最佳发布时间和内容策略
6. **互动策划**：设计用户互动和话题

回复规范：
- 使用中文回复
- 回复简洁专业，直接给出有价值的建议
- 如果用户要求创作内容，直接输出内容本身，不需要额外解释
- 如果用户要求分析，给出具体可执行的建议
- 适当使用emoji增加亲和力`;

  if (context) {
    return `${basePrompt}\n\n---\n\n${context}`;
  }

  return basePrompt;
}
