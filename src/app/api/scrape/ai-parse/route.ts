import { NextRequest, NextResponse } from 'next/server';
import { createAIClient } from '@/lib/ai-client';

interface ParsedItem {
  title: string;
  content: string;
  tags: string[];
  type: string;
  likes: number;
  comments: number;
  scheduledDate?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, platform } = body as {
      content: string;
      platform?: string;
    };

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: '请提供要解析的内容' },
        { status: 400 },
      );
    }

    if (content.length > 30000) {
      return NextResponse.json(
        { error: '内容过长，请控制在30000字以内' },
        { status: 400 },
      );
    }

    const client = await createAIClient();

    const systemPrompt = `你是一个内容解析助手。你的任务是解析用户粘贴的社交平台帖子内容（如小红书、朋友圈等），将其结构化为 JSON 数据。

返回一个 JSON 数组，每个元素包含：
- "title": 帖子标题（如果没有显式标题则从正文提取，最多30字）
- "content": 帖子完整正文内容（保留原始格式）
- "tags": 话题标签数组（从 #标签 或内容主题中提取，不超过5个）
- "type": 内容类型，只能是以下之一: "种草安利" | "好物测评" | "教程攻略" | "干货知识" | "生活Vlog" | "日常分享"
- "likes": 点赞数（如果能从内容中识别到数字则填入，否则为0）
- "comments": 评论数（如果能从内容中识别到数字则填入，否则为0）

重要规则：
1. 只返回 JSON 数组，不要包含任何额外文字、代码块标记或解释
2. 每条帖子用空行分隔
3. 如果内容中包含"发布时间"、"日期"等日期信息，额外添加 "scheduledDate" 字段（格式 YYYY-MM-DD）
4. tags 中的每个标签不要包含 # 符号
5. 尽可能准确地从原文中提取标题和正文，不要遗漏内容
6. 如果无法区分多条内容，就把整个文本作为一条来解析`;

    const userPrompt = `请解析以下${platform === 'xiaohongshu' ? '小红书' : platform === 'wechat' ? '朋友圈' : '社交平台'}帖子内容：

---
${content.trim()}
---

请返回结构化的 JSON 数组。`;

    const response = await client.chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    // Clean up response - remove code blocks if present
    let cleaned = response.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    // Parse JSON
    let parsed: ParsedItem[];
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Try to extract JSON array from the response
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        return NextResponse.json(
          { error: 'AI 返回的数据格式异常，请重试或检查内容格式' },
          { status: 500 },
        );
      }
    }

    // Validate and normalize the parsed data
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return NextResponse.json(
        { error: 'AI 未能识别到有效内容，请检查粘贴的内容格式' },
        { status: 422 },
      );
    }

    const validTypes = ['种草安利', '好物测评', '教程攻略', '干货知识', '生活Vlog', '日常分享'];
    const normalized: ParsedItem[] = parsed.map((item, index) => ({
      title: String(item.title || `内容 ${index + 1}`).slice(0, 100),
      content: String(item.content || '').slice(0, 5000),
      tags: Array.isArray(item.tags)
        ? item.tags.slice(0, 5).map((t: unknown) => String(t).replace(/^#/, ''))
        : [],
      type: validTypes.includes(item.type) ? item.type : '日常分享',
      likes: Number(item.likes) || 0,
      comments: Number(item.comments) || 0,
      scheduledDate: item.scheduledDate || undefined,
    }));

    return NextResponse.json({
      items: normalized,
      total: normalized.length,
      message: `成功解析 ${normalized.length} 条内容`,
    });
  } catch (error) {
    console.error('AI parse failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI 解析失败，请稍后重试' },
      { status: 500 },
    );
  }
}
