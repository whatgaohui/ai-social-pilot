import { NextRequest, NextResponse } from 'next/server';
import { createAIClient } from '@/lib/ai-client';
import { buildSpellcheckPrompt } from '@/lib/ai-prompts';

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

    // Build prompts using centralized prompt builder
    const messages = buildSpellcheckPrompt({ platform, content });

    const response = await ai.chatCompletion(messages);

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
        ['错别字', '标点错误', '语法问题'].includes(issue.type as string)
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
