import { NextRequest, NextResponse } from 'next/server';
import { createAIClient } from '@/lib/ai-client';

export async function POST(request: NextRequest) {
  try {
    const { content, platform = 'wechat' } = await request.json();

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({
        checked: true,
        issues: [],
      });
    }

    const ai = await createAIClient();

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

    const response = await ai.chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    // Try to parse the response as JSON
    let result;
    try {
      // Extract JSON from possible markdown code blocks
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, response];
      const jsonStr = jsonMatch[1] || response;
      result = JSON.parse(jsonStr.trim());
    } catch {
      // If parsing fails, try to fix common issues
      try {
        const cleaned = response.replace(/[\n\r\t]/g, '').trim();
        result = JSON.parse(cleaned);
      } catch {
        // Fallback: return no issues
        return NextResponse.json({
          checked: true,
          issues: [],
        });
      }
    }

    // Validate the result structure
    if (!result || typeof result !== 'object') {
      return NextResponse.json({
        checked: true,
        issues: [],
      });
    }

    // Validate issues array
    if (!Array.isArray(result.issues)) {
      return NextResponse.json({
        checked: true,
        issues: [],
      });
    }

    // Filter and validate each issue
    const validIssues = result.issues
      .filter((issue: Record<string, unknown>) =>
        issue.original &&
        issue.suggestion &&
        typeof issue.original === 'string' &&
        typeof issue.suggestion === 'string' &&
        ['错别字', '标点错误', '语法问题'].includes(issue.type)
      )
      .map((issue: Record<string, unknown>) => ({
        original: issue.original,
        suggestion: issue.suggestion,
        type: issue.type || '错别字',
        position: issue.position && typeof issue.position === 'object'
          ? {
              start: typeof (issue.position as Record<string, unknown>).start === 'number' ? (issue.position as Record<string, unknown>).start as number : -1,
              end: typeof (issue.position as Record<string, unknown>).end === 'number' ? (issue.position as Record<string, unknown>).end as number : -1,
            }
          : { start: -1, end: -1 },
      }));

    return NextResponse.json({
      checked: true,
      issues: validIssues,
    });
  } catch (error) {
    console.error('Spellcheck error:', error);
    // Fallback to no issues on error
    return NextResponse.json({
      checked: true,
      issues: [],
    });
  }
}
