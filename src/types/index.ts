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
  platform?: string;
  contentType: string;
  topic: string;
  content: string;
  status: string;
  generationType: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  favorites?: number;
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

export type Platform = 'wechat' | 'xiaohongshu';
export type ContentType = 'text' | 'image' | 'video' | 'mixed' | 'story' | 'insight' | 'interaction';
export type XHSContentType = 'seeding' | 'review' | 'tutorial' | 'drygoods' | 'vlog' | 'daily' | 'recommend' | 'collection';
export type PostStatus = 'planned' | 'generated' | 'optimized' | 'published';
export type GenerationType = 'auto' | 'fragment' | 'polish';
export type ToneType = 'professional' | 'casual' | 'humorous' | 'inspirational' | 'storytelling';
export type StyleType = 'concise' | 'detailed' | 'emotional' | 'balanced';
export type KnowledgeCategory = 'expertise' | 'experience' | 'opinion' | 'story' | 'resource';

export const PLATFORM_LABELS: Record<Platform, string> = {
  wechat: '朋友圈',
  xiaohongshu: '小红书',
};

export const PLATFORM_COLORS: Record<Platform, string> = {
  wechat: 'from-green-500 to-emerald-600',
  xiaohongshu: 'from-red-500 to-rose-600',
};

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  text: '纯文字',
  image: '图文搭配',
  video: '视频动态',
  mixed: '混合内容',
  story: '故事分享',
  insight: '观点洞察',
  interaction: '互动话题',
};

export const XHS_CONTENT_TYPE_LABELS: Record<XHSContentType, string> = {
  seeding: '种草安利',
  review: '好物测评',
  tutorial: '教程攻略',
  drygoods: '干货知识',
  vlog: '生活Vlog',
  daily: '日常分享',
  recommend: '好物推荐',
  collection: '合集清单',
};

export const XHS_CONTENT_TYPE_COLORS: Record<XHSContentType, string> = {
  seeding: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  tutorial: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  drygoods: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  vlog: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  daily: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  recommend: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  collection: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
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

export interface ContentVersion {
  id: string;
  postId: string;
  version: number;
  content: string;
  changeType: string; // edit, optimize, polish, ai_generate
  summary: string;
  aiScore: number;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  type: 'optimize' | 'polish' | 'generate' | 'publish' | 'reminder' | 'error';
  title: string;
  description: string;
  timestamp: number;
  read: boolean;
  postId?: string;
}

export type ChangeType = 'edit' | 'optimize' | 'polish' | 'ai_generate';

export const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
  edit: '编辑',
  optimize: '优化',
  polish: '润色',
  ai_generate: 'AI生成',
};

export const CHANGE_TYPE_COLORS: Record<ChangeType, string> = {
  edit: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  optimize: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  polish: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  ai_generate: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
};

// Platform Account types
export interface PlatformAccount {
  id: string;
  platform: string;
  displayName: string;
  accountType: string;
  status: string;
  avatarUrl: string;
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  scope: string;
  apiEndpoint: string;
  apiKey: string;
  apiSecret: string;
  connectedAt: string | null;
  expiresAt: string | null;
  lastSyncAt: string | null;
  lastError: string;
  followers: number;
  following: number;
  postsCount: number;
  createdAt: string;
  updatedAt: string;
}

export type AccountStatus = 'disconnected' | 'connecting' | 'connected' | 'expired' | 'error';
export type TokenType = 'oauth' | 'api_key' | 'cookie';

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  disconnected: '未连接',
  connecting: '连接中',
  connected: '已连接',
  expired: '已过期',
  error: '连接异常',
};

export const ACCOUNT_STATUS_COLORS: Record<AccountStatus, string> = {
  disconnected: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  connecting: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  connected: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  expired: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

export const TOKEN_TYPE_LABELS: Record<TokenType, string> = {
  oauth: 'OAuth 授权',
  api_key: 'API Key',
  cookie: 'Cookie 登录',
};

// Xiaohongshu note structure
export interface XHSNote {
  title: string;
  body: string;
  hashtags: string[];
  coverType: 'photo' | 'video';
}

// Parse Xiaohongshu note from raw content
export function parseXHSNote(content: string): XHSNote {
  const lines = content.split('\n');
  const hashtags: string[] = [];
  const bodyLines: string[] = [];
  let title = '';
  
  let isTitle = true;
  for (const line of lines) {
    if (isTitle && line.trim() && !line.startsWith('#') && !title) {
      title = line.trim();
      isTitle = false;
    } else if (line.trim().startsWith('#')) {
      const tag = line.trim().replace(/^#+\s*/, '');
      if (tag) hashtags.push(tag);
    } else if (line.trim()) {
      bodyLines.push(line);
      isTitle = false;
    }
  }
  
  return {
    title: title || '未命名笔记',
    body: bodyLines.join('\n'),
    hashtags,
    coverType: 'photo',
  };
}
