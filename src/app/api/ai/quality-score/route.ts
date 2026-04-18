import { NextRequest, NextResponse } from 'next/server';
import { createAIClient } from '@/lib/ai-client';

export async function POST(request: NextRequest) {
  try {
    const { content, topic, platform = 'wechat' } = await request.json();

    if (!content) {
      return NextResponse.json({ error: '内容不能为空' }, { status: 400 });
    }

    const ai = await createAIClient();
    const isXHS = platform === 'xiaohongshu';

    const platformLabel = isXHS ? '小红书' : '朋友圈';
    const lastDimension = isXHS
      ? '{ "name": "话题标签", "score": <0-100>, "suggestion": "<一句话建议>" }'
      : '{ "name": "传播潜力", "score": <0-100>, "suggestion": "<一句话建议>" }';
    const lastCriterion = isXHS
      ? '- 话题标签：标签相关性和热度'
      : '- 传播潜力：被转发的可能性';

    const systemPrompt = `你是一个${platformLabel}内容质量评估专家。请对以下内容进行多维度质量评分。`;

    const userPrompt = `主题：${topic || '未指定'}
内容：
${content}

请以JSON格式返回评分结果（不要其他文字）：
{
  "overallScore": <0-100的综合分数>,
  "dimensions": [
    { "name": "标题吸引力", "score": <0-100>, "suggestion": "<一句话建议>" },
    { "name": "内容价值", "score": <0-100>, "suggestion": "<一句话建议>" },
    { "name": "情感共鸣", "score": <0-100>, "suggestion": "<一句话建议>" },
    { "name": "可读性", "score": <0-100>, "suggestion": "<一句话建议>" },
    { "name": "互动引导", "score": <0-100>, "suggestion": "<一句话建议>" },
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
${lastCriterion}`;

    const response = await ai.chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    // Extract JSON from the response (handle markdown code blocks if present)
    let jsonStr = response.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const scoreData = JSON.parse(jsonStr);

    // Validate the response structure
    if (
      typeof scoreData.overallScore !== 'number' ||
      !Array.isArray(scoreData.dimensions) ||
      !Array.isArray(scoreData.strengths) ||
      !Array.isArray(scoreData.improvements)
    ) {
      throw new Error('Invalid score data structure');
    }

    return NextResponse.json(scoreData);
  } catch (error) {
    console.error('Quality score error:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'AI返回的数据格式异常，请重试' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: '质量评分失败，请稍后重试' },
      { status: 500 }
    );
  }
}
