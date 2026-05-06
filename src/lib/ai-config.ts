/**
 * AI Provider configuration.
 *
 * Built-in free Chinese LLM providers:
 * - 智谱 AI (GLM-4-Flash): 免费额度 100万 tokens/天
 * - 硅基流动: 免费模型可用
 * - 阿里云通义: 新用户免费额度
 *
 * Signup links:
 * - 智谱: https://open.bigmodel.cn/
 * - 硅基流动: https://cloud.siliconflow.cn/
 * - 阿里云: https://dashscope.console.aliyun.com/
 */

export interface AIProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  defaultModel: string;
  models: string[];
  pricing: 'free' | 'paid';
  freeQuota?: string;
  signupUrl: string;
  description: string;
}

export const AI_PROVIDERS: AIProviderConfig[] = [
  {
    id: 'zhipu',
    name: '智谱 AI (GLM)',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4-flash',
    models: ['glm-4-flash', 'glm-4-flash-250414', 'glm-4-plus', 'glm-4'],
    pricing: 'free',
    freeQuota: '100万 tokens/天',
    signupUrl: 'https://open.bigmodel.cn/',
    description: '智谱 GLM-4-Flash 免费额度充足，适合日常运营',
  },
  {
    id: 'siliconflow',
    name: '硅基流动',
    baseUrl: 'https://api.siliconflow.cn/v1',
    defaultModel: 'THUDM/glm-4-9b-chat',
    models: ['THUDM/glm-4-9b-chat', 'Qwen/Qwen2.5-72B-Instruct', 'meta-llama/Meta-Llama-3.1-8B-Instruct'],
    pricing: 'free',
    freeQuota: '免费模型不限额度',
    signupUrl: 'https://cloud.siliconflow.cn/',
    description: '开源模型免费，支持 GLM/Qwen/Llama',
  },
  {
    id: 'dashscope',
    name: '阿里云通义',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
    models: ['qwen-turbo', 'qwen-plus', 'qwen-max'],
    pricing: 'free',
    freeQuota: '新用户免费额度',
    signupUrl: 'https://dashscope.console.aliyun.com/',
    description: '通义千问系列，新用户有大量免费额度',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    pricing: 'paid',
    signupUrl: 'https://platform.deepseek.com/',
    description: 'DeepSeek 推理能力强，性价比高',
  },
  {
    id: 'custom',
    name: '自定义 (OpenAI 兼容)',
    baseUrl: '',
    defaultModel: '',
    models: [],
    pricing: 'paid',
    signupUrl: '',
    description: '任何 OpenAI 兼容接口，如 Ollama 本地部署',
  },
];

export function getProviderById(id: string): AIProviderConfig | undefined {
  return AI_PROVIDERS.find((p) => p.id === id);
}

export function getDefaultProvider(): AIProviderConfig {
  return AI_PROVIDERS[0]; // 智谱 AI
}
