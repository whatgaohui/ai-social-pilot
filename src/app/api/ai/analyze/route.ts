import { NextRequest, NextResponse } from 'next/server';
import { createAIClient } from '@/lib/ai-client';

export async function POST(request: NextRequest) {
  try {
    const { analytics, posts } = await request.json();
    
    const ai = await createAIClient();
    
    const systemPrompt = `你是一位朋友圈运营数据分析专家。你需要分析运营数据，提供 actionable 的改进建议。
请用中文回复，使用markdown格式。`;

    const userPrompt = `请分析以下朋友圈运营数据，并提供改进建议：

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
${posts.slice(0, 5).map((p: { topic: string; contentType: string; likes: number; comments: number; shares: number }, i: number) => `${i + 1}. [${p.contentType}] ${p.topic} - 赞${p.likes} 评${p.comments} 转${p.shares}`).join('\n')}` : ''}

请提供：
1. 当前运营状态评估
2. 内容表现分析
3. 具体改进建议（至少5条）
4. 下一阶段重点方向`;

    const analysis = await ai.chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);
    
    return NextResponse.json({ 
      analysis,
      model: ai.config?.name || ai.config?.provider || 'default',
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json({ error: 'Failed to analyze data' }, { status: 500 });
  }
}
