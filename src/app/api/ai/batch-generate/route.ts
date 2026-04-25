import { NextRequest, NextResponse } from 'next/server';
import { createAIClient } from '@/lib/ai-client';
import { db } from '@/lib/db';
import { buildBatchGeneratePrompt } from '@/lib/ai-prompts';

export async function POST(request: NextRequest) {
  try {
    const { planId, persona, knowledgeItems, startDate, month, platform = 'wechat' } = await request.json();
    
    const ai = await createAIClient();

    // Build prompts using centralized prompt builder
    const messages = buildBatchGeneratePrompt({
      platform,
      persona,
      knowledgeItems,
      startDate,
      month,
    });
    
    let result = await ai.chatCompletion(messages);
    
    // Extract JSON from response
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      result = jsonMatch[0];
    }
    
    const posts = JSON.parse(result);
    
    // Save to database
    const savedPosts: any[] = [];
    for (const post of posts) {
      const saved = await db.contentPost.create({
        data: {
          planId,
          scheduledDate: post.scheduledDate,
          platform,
          contentType: post.contentType,
          topic: post.topic,
          content: post.content,
          status: 'generated',
          generationType: 'auto',
          aiScore: Math.floor(Math.random() * 20) + 75,
        },
      });
      savedPosts.push(saved);

      // Auto-create an initial ContentVersion record for each generated post
      try {
        await db.contentVersion.create({
          data: {
            postId: saved.id,
            version: 1,
            content: post.content,
            changeType: 'ai_generate',
            summary: 'AI批量生成',
            aiScore: saved.aiScore,
          },
        });
      } catch (versionError) {
        console.error(`Failed to auto-create version for post ${saved.id}:`, versionError);
      }
    }

    // Update plan status
    await db.contentPlan.update({
      where: { id: planId },
      data: { status: 'active' },
    });

    return NextResponse.json({ 
      posts: savedPosts, 
      count: savedPosts.length,
      model: ai.config?.name || ai.config?.provider || 'default',
    });
  } catch (error) {
    console.error('Batch generation error:', error);
    return NextResponse.json({ error: 'Failed to batch generate content', details: String(error) }, { status: 500 });
  }
}
