/**
 * AI Provider definitions - Client-safe (no server-only dependencies)
 * This file only contains data and types, no runtime logic.
 */

export interface AIModelConfig {
  id: string;
  name: string;
  provider: string;
  modelId: string;
  baseUrl: string;
  apiKey: string;
  isFree: boolean;
  isActive: boolean;
  maxTokens: number;
  temperature: number;
}

// Pre-configured free model providers (client-safe)
export const PRESET_PROVIDERS: Array<{
  id: string;
  name: string;
  provider: string;
  baseUrl: string;
  defaultModel: string;
  models: string[];
  isFree: boolean;
  description: string;
  icon: string;
  docsUrl: string;
}> = [
  {
    id: 'z-ai-default',
    name: 'Z.ai 内置',
    provider: 'z-ai',
    baseUrl: '',
    defaultModel: 'default',
    models: ['default'],
    isFree: true,
    description: '平台内置 AI 服务，无需额外配置',
    icon: '✨',
    docsUrl: '',
  },
  {
    id: 'gemini-free',
    name: 'Google Gemini (免费)',
    provider: 'gemini',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'google/gemini-2.0-flash-exp:free',
    models: [
      'google/gemini-2.0-flash-exp:free',
      'google/gemini-2.5-flash-preview:free',
      'google/gemma-3-27b-it:free',
    ],
    isFree: true,
    description: 'Google 最新 Gemini 模型，通过 OpenRouter 免费访问',
    icon: '💎',
    docsUrl: 'https://openrouter.ai/models?q=gemini&order=newest&pricing=free',
  },
  {
    id: 'groq-free',
    name: 'Groq (免费)',
    provider: 'groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    models: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'gemma2-9b-it',
      'mixtral-8x7b-32768',
    ],
    isFree: true,
    description: '超高速推理，Llama/Mixtral 免费模型',
    icon: '⚡',
    docsUrl: 'https://console.groq.com/docs/quickstart',
  },
  {
    id: 'cerebras-free',
    name: 'Cerebras (免费)',
    provider: 'cerebras',
    baseUrl: 'https://api.cerebras.ai/v1',
    defaultModel: 'llama-3.3-70b',
    models: [
      'llama-3.3-70b',
      'llama3.1-8b',
      'qwen-2.5-32b',
    ],
    isFree: true,
    description: '极速 AI 推理芯片，Llama 模型免费使用',
    icon: '🧠',
    docsUrl: 'https://inference.cerebras.ai/docs',
  },
  {
    id: 'siliconflow-free',
    name: 'SiliconFlow (免费)',
    provider: 'siliconflow',
    baseUrl: 'https://api.siliconflow.cn/v1',
    defaultModel: 'Qwen/Qwen3-8B',
    models: [
      'Qwen/Qwen3-8B',
      'Qwen/Qwen2.5-72B-Instruct',
      'deepseek-ai/DeepSeek-V3',
      'THUDM/glm-4-9b-chat',
    ],
    isFree: true,
    description: '国内平台，Qwen/DeepSeek/GLM 免费模型',
    icon: '🌐',
    docsUrl: 'https://docs.siliconflow.cn/',
  },
  {
    id: 'openrouter-free',
    name: 'OpenRouter (免费模型)',
    provider: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
    models: [
      'meta-llama/llama-3.3-70b-instruct:free',
      'mistralai/mistral-small-3.1-24b-instruct:free',
      'deepseek/deepseek-chat-v3-0324:free',
    ],
    isFree: true,
    description: 'AI 模型聚合平台，汇聚多家免费模型',
    icon: '🔀',
    docsUrl: 'https://openrouter.ai/models?order=newest&pricing=free',
  },
];
