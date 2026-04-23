/**
 * Content Workflow Engine — Server-side module
 *
 * Defines workflow templates as step arrays with sequential execution,
 * conditional branching (e.g., re-optimize if aiScore < 60), and
 * JSON-file-based run tracking.
 */

import { createAIClient } from '@/lib/ai-client';
import { db } from '@/lib/db';
import { createNotification } from '@/lib/notification-helper';
import * as fs from 'fs';
import * as path from 'path';

// ─── Types ────────────────────────────────────────────────────────────────────

export type StepType = 'ai-generate' | 'ai-optimize' | 'schedule' | 'score' | 'format';

export interface WorkflowStep {
  name: string;
  type: StepType;
  config: Record<string, unknown>;
  /** If set, a conditional branch: if the condition key in context is below this value, re-run a previous step */
  branchOnLow?: { key: string; threshold: number; gotoStep: number };
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  steps: WorkflowStep[];
}

export interface WorkflowRunContext {
  postId?: string;
  planId?: string;
  topic?: string;
  content?: string;
  platform?: string;
  persona?: Record<string, unknown>;
  knowledgeItems?: Array<{ title: string; content: string }>;
  tone?: string;
  contentType?: string;
  /** Dynamic results collected during execution */
  aiScore?: number;
  scheduledAt?: string;
  generatedContent?: string;
  optimizedContent?: string;
  outline?: string;
  [key: string]: unknown;
}

export interface StepResult {
  stepIndex: number;
  stepName: string;
  status: 'running' | 'completed' | 'error' | 'skipped';
  result?: string;
  aiScore?: number;
  duration?: number;
  error?: string;
}

export interface WorkflowRun {
  id: string;
  templateId: string;
  templateName: string;
  status: 'running' | 'completed' | 'error' | 'partial';
  context: WorkflowRunContext;
  steps: StepResult[];
  startedAt: string;
  completedAt?: string;
  error?: string;
}

// ─── Workflow Run Persistence ─────────────────────────────────────────────────

const WORKFLOW_RUNS_FILE = path.join(process.cwd(), 'db', 'workflow-runs.json');

function readWorkflowRuns(): WorkflowRun[] {
  try {
    if (fs.existsSync(WORKFLOW_RUNS_FILE)) {
      const raw = fs.readFileSync(WORKFLOW_RUNS_FILE, 'utf-8');
      return JSON.parse(raw) as WorkflowRun[];
    }
  } catch {
    // ignore
  }
  return [];
}

function writeWorkflowRuns(runs: WorkflowRun[]): void {
  try {
    const dir = path.dirname(WORKFLOW_RUNS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(WORKFLOW_RUNS_FILE, JSON.stringify(runs.slice(0, 50), null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to write workflow runs:', error);
  }
}

export function saveWorkflowRun(run: WorkflowRun): void {
  const runs = readWorkflowRuns();
  runs.unshift(run);
  writeWorkflowRuns(runs);
}

export function getRecentWorkflowRuns(limit = 10): WorkflowRun[] {
  return readWorkflowRuns().slice(0, limit);
}

// ─── Workflow Templates ──────────────────────────────────────────────────────

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'draft-to-scheduled',
    name: '草稿自动排期',
    description: '将已有内容自动优化、评分并排期发布',
    icon: 'Rocket',
    steps: [
      {
        name: 'AI智能优化',
        type: 'ai-optimize',
        config: {},
      },
      {
        name: 'AI质量评分',
        type: 'score',
        config: {},
      },
      {
        name: '条件检查',
        type: 'score',
        config: { checkOnly: true },
        branchOnLow: { key: 'aiScore', threshold: 60, gotoStep: 0 },
      },
      {
        name: '自动排期',
        type: 'schedule',
        config: {},
      },
    ],
  },
  {
    id: 'idea-to-content',
    name: '创意全流程',
    description: '从主题出发，生成大纲→扩展内容→润色→评分→排期',
    icon: 'Lightbulb',
    steps: [
      {
        name: '生成内容大纲',
        type: 'ai-generate',
        config: { generateOutline: true },
      },
      {
        name: '扩展内容正文',
        type: 'ai-generate',
        config: { expandOutline: true },
      },
      {
        name: 'AI润色优化',
        type: 'ai-optimize',
        config: {},
      },
      {
        name: 'AI质量评分',
        type: 'score',
        config: {},
      },
      {
        name: '条件检查',
        type: 'score',
        config: { checkOnly: true },
        branchOnLow: { key: 'aiScore', threshold: 60, gotoStep: 2 },
      },
      {
        name: '自动排期',
        type: 'schedule',
        config: {},
      },
    ],
  },
  {
    id: 'quick-polish',
    name: '快速润色',
    description: '一键优化、评分，提升内容质量',
    icon: 'Sparkles',
    steps: [
      {
        name: 'AI润色优化',
        type: 'ai-optimize',
        config: {},
      },
      {
        name: 'AI质量评分',
        type: 'score',
        config: {},
      },
      {
        name: '条件检查',
        type: 'score',
        config: { checkOnly: true },
        branchOnLow: { key: 'aiScore', threshold: 60, gotoStep: 0 },
      },
    ],
  },
  {
    id: 'batch-optimize',
    name: '批量优化评分',
    description: '对多篇内容依次进行优化和评分',
    icon: 'Layers',
    steps: [
      {
        name: 'AI批量优化',
        type: 'ai-optimize',
        config: { batch: true },
      },
      {
        name: 'AI批量评分',
        type: 'score',
        config: {},
      },
    ],
  },
];

// ─── Step Executor ────────────────────────────────────────────────────────────

async function executeAIGenerate(
  context: WorkflowRunContext,
  config: Record<string, unknown>,
): Promise<{ content: string; aiScore?: number }> {
  const ai = await createAIClient();
  const isXHS = context.platform === 'xiaohongshu';
  const tone = (context.tone as string) || '专业严谨';

  let systemPrompt = '';
  let userPrompt = '';

  if (config.generateOutline) {
    systemPrompt = `你是一位社交媒体内容创作专家。你的任务是根据给定的主题生成一个内容大纲。

要求：
- 生成3-5个章节/段落的大纲
- 每个章节包含核心要点（20字以内）
- 整体结构清晰、逻辑流畅
- ${isXHS ? '适合小红书平台风格' : '适合朋友圈风格'}
- 语气风格：${tone}

请用JSON格式输出，格式如下：
{"outline": "## 第一章：标题\\n- 要点1\\n- 要点2\\n## 第二章：标题\\n- 要点1\\n- 要点2"}`;

    userPrompt = `请为主题「${context.topic || '日常分享'}」生成内容大纲。
${context.contentType ? `内容类型：${context.contentType}` : ''}
${context.knowledgeItems && context.knowledgeItems.length > 0 ? `可参考的知识库素材：${context.knowledgeItems.slice(0, 3).map(k => `- ${k.title}: ${k.content.slice(0, 80)}`).join('\n')}` : ''}`;
  } else if (config.expandOutline) {
    systemPrompt = `你是一位社交媒体内容创作专家。你的任务是根据已有大纲扩展为完整内容。

要求：
- ${isXHS ? '字数300-800字，适合小红书' : '字数200-500字，适合朋友圈'}
- 语气风格：${tone}
- 内容流畅自然，有吸引力
- ${isXHS ? '适当添加emoji，结尾添加3-5个话题标签' : '适当添加emoji'}`;

    userPrompt = `请根据以下大纲扩展为完整内容：

大纲：
${context.outline || ''}

${context.generatedContent ? `已有初步内容参考：\n${context.generatedContent.slice(0, 200)}` : ''}`;
  } else {
    systemPrompt = `你是一位社交媒体内容创作专家。请根据主题生成高质量内容。

要求：
- ${isXHS ? '字数300-800字，适合小红书平台' : '字数200-500字，适合朋友圈'}
- 语气风格：${tone}
- 内容流畅自然，有吸引力
- ${isXHS ? '适当添加emoji，结尾添加3-5个话题标签' : '适当添加emoji'}`;

    userPrompt = `请为主题「${context.topic || '日常分享'}」生成内容。
${context.contentType ? `内容类型：${context.contentType}` : ''}
${context.knowledgeItems && context.knowledgeItems.length > 0 ? `可参考的知识库素材：${context.knowledgeItems.slice(0, 3).map(k => `- ${k.title}: ${k.content.slice(0, 80)}`).join('\n')}` : ''}`;
  }

  const result = await ai.chatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  let cleaned = result.trim();
  const codeBlockMatch = cleaned.match(/```(?:[a-zA-Z]*)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  // Try to parse outline JSON
  if (config.generateOutline) {
    try {
      const parsed = JSON.parse(cleaned);
      return { content: parsed.outline || cleaned };
    } catch {
      // Not JSON, return as-is
    }
  }

  return { content: cleaned };
}

async function executeAIOptimize(
  context: WorkflowRunContext,
): Promise<{ content: string }> {
  const contentToOptimize = context.optimizedContent || context.generatedContent || context.content || '';
  if (!contentToOptimize) {
    return { content: '' };
  }

  const ai = await createAIClient();
  const isXHS = context.platform === 'xiaohongshu';
  const tone = (context.tone as string) || '专业严谨';

  const systemPrompt = `你是一位社交媒体文案优化专家。
你的任务是对已有文案进行优化润色。

优化要求：
- 保留原文核心信息
- 提升文案的吸引力和互动性
- ${isXHS ? '控制在300-800字，丰富emoji，确保话题标签' : '控制在200-500字，适当使用emoji'}
- 语气风格：${tone}`;

  const userPrompt = `请优化以下文案：

原文案：
${contentToOptimize}

主题：${context.topic || '日常分享'}

请直接输出优化后的内容。`;

  const result = await ai.chatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  let cleaned = result.trim();
  const codeBlockMatch = cleaned.match(/```(?:[a-zA-Z]*)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  return { content: cleaned };
}

async function executeScore(context: WorkflowRunContext, checkOnly = false): Promise<{ score: number }> {
  if (checkOnly) {
    return { score: context.aiScore || 0 };
  }

  const contentToScore = context.optimizedContent || context.generatedContent || context.content || '';
  if (!contentToScore) {
    return { score: 0 };
  }

  const ai = await createAIClient();

  const systemPrompt = `你是一位社交媒体内容质量评估专家。请对以下内容进行评分。

评分维度（每项0-100分）：
1. 内容质量（专业性、准确性、深度）
2. 吸引力（标题、开篇、情感共鸣）
3. 可读性（结构、排版、emoji使用）
4. 互动性（引导互动、话题标签、号召力）

请只输出一个JSON对象，格式如下：
{"quality": 85, "attractiveness": 78, "readability": 92, "engagement": 70, "total": 81}`;

  const userPrompt = `请评估以下内容：

内容：
${contentToScore.slice(0, 1000)}

平台：${context.platform === 'xiaohongshu' ? '小红书' : '朋友圈'}`;

  const result = await ai.chatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  try {
    let cleaned = result.trim();
    const codeBlockMatch = cleaned.match(/```(?:[a-zA-Z]*)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      cleaned = codeBlockMatch[1].trim();
    }
    const parsed = JSON.parse(cleaned);
    return { score: Math.min(100, Math.max(0, Math.round(parsed.total || 0))) };
  } catch {
    return { score: 70 };
  }
}

async function executeSchedule(context: WorkflowRunContext): Promise<{ scheduledAt: string }> {
  // Schedule for 2 days from now at 12:00
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 2);
  targetDate.setHours(12, 0, 0, 0);
  const scheduledAt = targetDate.toISOString();

  if (context.postId) {
    try {
      await db.contentPost.update({
        where: { id: context.postId },
        data: {
          status: 'scheduled',
          scheduledAt,
        },
      });
    } catch (error) {
      console.error('Failed to schedule post:', error);
    }
  }

  return { scheduledAt };
}

// ─── Workflow Executor ────────────────────────────────────────────────────────

export async function executeWorkflow(
  templateId: string,
  initialContext: WorkflowRunContext,
  onProgress?: (step: StepResult) => void,
): Promise<WorkflowRun> {
  const template = WORKFLOW_TEMPLATES.find((t) => t.id === templateId);
  if (!template) {
    throw new Error(`Workflow template not found: ${templateId}`);
  }

  const runId = `wf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const context: WorkflowRunContext = { ...initialContext };
  const steps: StepResult[] = [];
  let currentStep = 0;
  const maxIterations = 20; // Prevent infinite loops from branching
  let iteration = 0;

  const run: WorkflowRun = {
    id: runId,
    templateId: template.id,
    templateName: template.name,
    status: 'running',
    context,
    steps: [],
    startedAt: new Date().toISOString(),
  };

  saveWorkflowRun(run);

  try {
    while (currentStep < template.steps.length && iteration < maxIterations) {
      iteration++;
      const step = template.steps[currentStep];
      const stepResult: StepResult = {
        stepIndex: currentStep,
        stepName: step.name,
        status: 'running',
      };
      steps.push(stepResult);

      const startTime = Date.now();

      try {
        switch (step.type) {
          case 'ai-generate': {
            const genResult = await executeAIGenerate(context, step.config);
            if (step.config.generateOutline) {
              context.outline = genResult.content;
            } else if (step.config.expandOutline) {
              context.generatedContent = genResult.content;
            } else {
              context.generatedContent = genResult.content;
            }
            stepResult.result = genResult.content.slice(0, 200);
            stepResult.status = 'completed';
            break;
          }
          case 'ai-optimize': {
            const optResult = await executeAIOptimize(context);
            context.optimizedContent = optResult.content;
            stepResult.result = optResult.content.slice(0, 200);
            stepResult.status = 'completed';
            break;
          }
          case 'score': {
            const scoreResult = await executeScore(context, !!step.config.checkOnly);
            context.aiScore = scoreResult.score;
            stepResult.aiScore = scoreResult.score;
            stepResult.result = `评分: ${scoreResult.score}`;
            stepResult.status = 'completed';

            // Check conditional branch
            if (step.branchOnLow) {
              const { key, threshold, gotoStep } = step.branchOnLow;
              const value = (context[key] as number) || 0;
              if (value < threshold) {
                stepResult.result += `（低于${threshold}，返回步骤${gotoStep + 1}）`;
                currentStep = gotoStep;
                stepResult.duration = Date.now() - startTime;
                if (onProgress) onProgress(stepResult);
                continue;
              }
            }
            break;
          }
          case 'schedule': {
            const scheduleResult = await executeSchedule(context);
            context.scheduledAt = scheduleResult.scheduledAt;
            stepResult.result = `排期: ${scheduleResult.scheduledAt}`;
            stepResult.status = 'completed';
            break;
          }
          default:
            stepResult.status = 'skipped';
            break;
        }
      } catch (error) {
        stepResult.status = 'error';
        stepResult.error = error instanceof Error ? error.message : String(error);
      }

      stepResult.duration = Date.now() - startTime;
      if (onProgress) onProgress(stepResult);
      currentStep++;
    }

    // Update post in DB if we have a final optimized content and postId
    const finalContent = context.optimizedContent || context.generatedContent;
    if (context.postId && finalContent) {
      try {
        await db.contentPost.update({
          where: { id: context.postId },
          data: {
            content: finalContent,
            aiScore: context.aiScore || 0,
            status: context.scheduledAt ? 'scheduled' : 'optimized',
            scheduledAt: context.scheduledAt || undefined,
          },
        });

        // Create version history
        const maxVersion = await db.contentVersion.findFirst({
          where: { postId: context.postId },
          orderBy: { version: 'desc' },
          select: { version: true },
        });
        const newVersion = (maxVersion?.version || 0) + 1;
        await db.contentVersion.create({
          data: {
            postId: context.postId,
            version: newVersion,
            content: finalContent,
            changeType: 'optimize',
            summary: `工作流「${template.name}」自动优化`,
            aiScore: context.aiScore || 0,
          },
        });
      } catch (error) {
        console.error('Failed to update post after workflow:', error);
      }
    }

    // Send notification
    const hasError = steps.some((s) => s.status === 'error');
    createNotification({
      type: 'completion',
      title: `工作流「${template.name}」完成`,
      message: hasError
        ? `部分步骤执行失败，请检查`
        : `所有步骤执行成功，最终评分${context.aiScore || '--'}分`,
    }).catch(() => {});

    run.status = hasError ? 'partial' : 'completed';
    run.completedAt = new Date().toISOString();
    run.steps = steps;
    saveWorkflowRun(run);

    return run;
  } catch (error) {
    run.status = 'error';
    run.error = error instanceof Error ? error.message : String(error);
    run.completedAt = new Date().toISOString();
    run.steps = steps;
    saveWorkflowRun(run);
    return run;
  }
}

export function getWorkflowTemplates(): WorkflowTemplate[] {
  return WORKFLOW_TEMPLATES;
}
