export interface Persona {
  id: string;
  name: string;
  title: string;
  industry: string;
  tone: string;
  style: string;
  keywords: string;
  bio: string;
  targetAudience: string;
  avatarUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeItem {
  id: string;
  category: string;
  title: string;
  content: string;
  tags: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContentPlan {
  id: string;
  month: string;
  theme: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  posts?: ContentPost[];
}

export interface ContentPost {
  id: string;
  planId: string;
  scheduledDate: string;
  contentType: string;
  topic: string;
  content: string;
  status: string;
  generationType: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  aiScore: number;
  feedback: string;
  createdAt: string;
  updatedAt: string;
}

export interface Material {
  id: string;
  name: string;
  type: string;
  content: string;
  imageUrl: string;
  contentType: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsSummary {
  id: string;
  period: string;
  date: string;
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalViews: number;
  avgScore: number;
  insights: string;
  createdAt: string;
  updatedAt: string;
}

export type ContentType = 'text' | 'image' | 'video' | 'mixed' | 'story' | 'insight' | 'interaction';
export type PostStatus = 'planned' | 'generated' | 'optimized' | 'published';
export type GenerationType = 'auto' | 'fragment' | 'polish';
export type ToneType = 'professional' | 'casual' | 'humorous' | 'inspirational' | 'storytelling';
export type StyleType = 'concise' | 'detailed' | 'emotional' | 'balanced';
export type KnowledgeCategory = 'expertise' | 'experience' | 'opinion' | 'story' | 'resource';

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  text: '纯文字',
  image: '图文搭配',
  video: '视频动态',
  mixed: '混合内容',
  story: '故事分享',
  insight: '观点洞察',
  interaction: '互动话题',
};

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  planned: '待生成',
  generated: '已生成',
  optimized: '已优化',
  published: '已发布',
};

export const TONE_LABELS: Record<ToneType, string> = {
  professional: '专业严谨',
  casual: '轻松自然',
  humorous: '幽默风趣',
  inspirational: '励志正能量',
  storytelling: '故事叙述',
};

export const STYLE_LABELS: Record<StyleType, string> = {
  concise: '简洁精炼',
  detailed: '详细丰富',
  emotional: '情感共鸣',
  balanced: '均衡兼顾',
};

export const KNOWLEDGE_CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  expertise: '专业知识',
  experience: '经验总结',
  opinion: '观点看法',
  story: '故事素材',
  resource: '资源收藏',
};

export const CONTENT_TYPE_COLORS: Record<ContentType, string> = {
  text: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  image: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  video: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  mixed: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  story: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  insight: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  interaction: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
};
