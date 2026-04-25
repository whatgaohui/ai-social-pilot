import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── GET /api/audience-insights ────────────────────────────────────────────
// 分析内容数据推算受众特征
// Query params:
//   range — "7d" | "30d" | "90d" (default: "30d")

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';

    let days = 30;
    if (range === '7d') days = 7;
    else if (range === '90d') days = 90;

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Fetch posts + interactions
    const [posts, comments] = await Promise.all([
      db.contentPost.findMany({
        where: { createdAt: { gte: startDate } },
        orderBy: { createdAt: 'asc' },
      }),
      db.contentComment.findMany({
        where: { syncedAt: { gte: startDate } },
      }),
    ]);

    // Previous period for comparison
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);
    const [prevPosts, prevComments] = await Promise.all([
      db.contentPost.findMany({
        where: { createdAt: { gte: prevStartDate, lt: startDate } },
      }),
      db.contentComment.findMany({
        where: { syncedAt: { gte: prevStartDate, lt: startDate } },
      }),
    ]);

    // ── 1. Demographics (推算) ──────────────────────────────────────────
    const demographics = computeDemographics(posts, comments);

    // ── 2. Active Hours (活跃时段分布) ──────────────────────────────────
    const activeHours = computeActiveHours(posts, comments);

    // ── 3. Content Preferences (内容偏好分析) ──────────────────────────
    const contentPreferences = computeContentPreferences(posts);

    // ── 4. Engagement Trends (互动率趋势) ──────────────────────────────
    const engagementTrends = computeEngagementTrends(posts, comments, now, days);

    // ── 5. Audience Tags (受众画像标签) ────────────────────────────────
    const audienceTags = computeAudienceTags(posts, comments, contentPreferences, activeHours);

    // ── 6. Platform Comparison (平台对比) ──────────────────────────────
    const platformComparison = computePlatformComparison(posts, prevPosts);

    // ── 7. Estimated Audience Size (受众规模估算) ──────────────────────
    const estimatedSize = estimateAudienceSize(posts);

    return NextResponse.json({
      range,
      days,
      generatedAt: now.toISOString(),
      demographics,
      activeHours,
      contentPreferences,
      engagementTrends,
      audienceTags,
      platformComparison,
      estimatedSize,
    });
  } catch (error) {
    console.error('Failed to fetch audience insights:', error);
    return NextResponse.json(
      { error: '获取受众洞察失败' },
      { status: 500 }
    );
  }
}

// ─── Demographics (推算) ─────────────────────────────────────────────────

interface Demographics {
  ageGroups: Array<{ label: string; percentage: number; confidence: number }>;
  genderSplit: Array<{ label: string; percentage: number }>;
  cityTier: Array<{ label: string; percentage: number }>;
}

function computeDemographics(
  posts: Array<{ contentType: string; topic: string; likes: number; comments: number; shares: number }>,
  comments: Array<{ content: string }>
): Demographics {
  const totalEngagement = posts.reduce((s, p) => s + p.likes + p.comments + p.shares, 0);
  if (totalEngagement === 0) {
    return {
      ageGroups: [
        { label: '25-30岁', percentage: 35, confidence: 0.5 },
        { label: '30-35岁', percentage: 28, confidence: 0.45 },
        { label: '18-25岁', percentage: 20, confidence: 0.4 },
        { label: '35-40岁', percentage: 12, confidence: 0.35 },
        { label: '40岁+', percentage: 5, confidence: 0.3 },
      ],
      genderSplit: [
        { label: '女性', percentage: 58 },
        { label: '男性', percentage: 42 },
      ],
      cityTier: [
        { label: '一线城市', percentage: 38 },
        { label: '新一线', percentage: 27 },
        { label: '二线城市', percentage: 22 },
        { label: '三线及以下', percentage: 13 },
      ],
    };
  }

  // Content type weight: 视频偏向年轻、干货偏向职场、故事偏向中年等
  const typeAgeWeights: Record<string, Record<string, number>> = {
    text:     { '18-25岁': 0.15, '25-30岁': 0.3, '30-35岁': 0.3, '35-40岁': 0.18, '40岁+': 0.07 },
    image:    { '18-25岁': 0.25, '25-30岁': 0.35, '30-35岁': 0.25, '35-40岁': 0.1, '40岁+': 0.05 },
    video:    { '18-25岁': 0.35, '25-30岁': 0.3, '30-35岁': 0.2, '35-40岁': 0.1, '40岁+': 0.05 },
    mixed:    { '18-25岁': 0.2, '25-30岁': 0.32, '30-35岁': 0.28, '35-40岁': 0.13, '40岁+': 0.07 },
    story:    { '18-25岁': 0.15, '25-30岁': 0.25, '30-35岁': 0.3, '35-40岁': 0.2, '40岁+': 0.1 },
    insight:  { '18-25岁': 0.1, '25-30岁': 0.3, '30-35岁': 0.35, '35-40岁': 0.18, '40岁+': 0.07 },
    interaction: { '18-25岁': 0.3, '25-30岁': 0.35, '30-35岁': 0.22, '35-40岁': 0.1, '40岁+': 0.03 },
    // XHS types
    seeding:  { '18-25岁': 0.3, '25-30岁': 0.35, '30-35岁': 0.25, '35-40岁': 0.07, '40岁+': 0.03 },
    review:   { '18-25岁': 0.22, '25-30岁': 0.35, '30-35岁': 0.28, '35-40岁': 0.1, '40岁+': 0.05 },
    tutorial: { '18-25岁': 0.2, '25-30岁': 0.32, '30-35岁': 0.28, '35-40岁': 0.13, '40岁+': 0.07 },
    drygoods: { '18-25岁': 0.12, '25-30岁': 0.3, '30-35岁': 0.35, '35-40岁': 0.15, '40岁+': 0.08 },
    vlog:     { '18-25岁': 0.35, '25-30岁': 0.32, '30-35岁': 0.2, '35-40岁': 0.08, '40岁+': 0.05 },
    daily:    { '18-25岁': 0.28, '25-30岁': 0.3, '30-35岁': 0.25, '35-40岁': 0.12, '40岁+': 0.05 },
    recommend: { '18-25岁': 0.25, '25-30岁': 0.35, '30-35岁': 0.25, '35-40岁': 0.1, '40岁+': 0.05 },
    collection: { '18-25岁': 0.2, '25-30岁': 0.33, '30-35岁': 0.27, '35-40岁': 0.13, '40岁+': 0.07 },
  };

  // Weight by engagement of each content type
  const ageScores: Record<string, number> = { '18-25岁': 0, '25-30岁': 0, '30-35岁': 0, '35-40岁': 0, '40岁+': 0 };
  const totalWeight = posts.reduce((s, p) => {
    const engagement = p.likes + p.comments * 2 + p.shares * 3;
    const weights = typeAgeWeights[p.contentType] || typeAgeWeights.text;
    for (const [age, w] of Object.entries(weights)) {
      ageScores[age] += engagement * w;
    }
    return s + engagement;
  }, 0);

  const ageGroups = Object.entries(ageScores)
    .sort((a, b) => b[1] - a[1])
    .map(([label, score]) => ({
      label,
      percentage: totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 20,
      confidence: totalWeight > 0 ? Math.min(0.6 + (score / totalWeight) * 0.4, 0.92) : 0.4,
    }));

  // Gender: analyze from content keywords
  const femaleKeywords = ['美妆', '护肤', '穿搭', '瑜伽', '减肥', '美食', '母婴', '闺蜜', '婚纱', '护肤'];
  const maleKeywords = ['科技', '数码', '汽车', '投资', '健身', '游戏', '足球', '篮球', '军事'];
  let femaleScore = 0;
  let maleScore = 0;
  posts.forEach((p) => {
    const eng = p.likes + p.comments + p.shares;
    const topic = p.topic.toLowerCase();
    femaleKeywords.forEach((kw) => { if (topic.includes(kw)) femaleScore += eng; });
    maleKeywords.forEach((kw) => { if (topic.includes(kw)) maleScore += eng; });
  });
  const genderTotal = femaleScore + maleScore;
  const femalePct = genderTotal > 0 ? Math.round((femaleScore / genderTotal) * 100) : 55;

  return {
    ageGroups,
    genderSplit: [
      { label: '女性', percentage: femalePct },
      { label: '男性', percentage: 100 - femalePct },
    ],
    cityTier: [
      { label: '一线城市', percentage: 35 },
      { label: '新一线', percentage: 28 },
      { label: '二线城市', percentage: 23 },
      { label: '三线及以下', percentage: 14 },
    ],
  };
}

// ─── Active Hours (活跃时段分布) ──────────────────────────────────────────

interface ActiveHourCell {
  day: string;      // 周一 ~ 周日
  period: string;   // 早间/上午/中午/下午/傍晚/晚间
  hourStart: number;
  hourEnd: number;
  score: number;    // 0-100
  engagement: number;
}

interface ActiveHoursData {
  heatmap: ActiveHourCell[];  // 7×6 = 42 cells
  bestSlot: { day: string; period: string; score: number };
  bestTime: string;           // 如 "周三 晚间 19:00-22:00"
}

const DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const PERIOD_DEFS: Array<{ label: string; hourStart: number; hourEnd: number; baseWeight: number }> = [
  { label: '早间', hourStart: 6, hourEnd: 9, baseWeight: 30 },
  { label: '上午', hourStart: 9, hourEnd: 12, baseWeight: 50 },
  { label: '中午', hourStart: 12, hourEnd: 14, baseWeight: 65 },
  { label: '下午', hourStart: 14, hourEnd: 17, baseWeight: 45 },
  { label: '傍晚', hourStart: 17, hourEnd: 19, baseWeight: 55 },
  { label: '晚间', hourStart: 19, hourEnd: 23, baseWeight: 80 },
];

function computeActiveHours(
  posts: Array<{ createdAt: Date; likes: number; comments: number; shares: number }>,
  comments: Array<{ syncedAt: Date }>
): ActiveHoursData {
  // Initialize heatmap with base weights + noise
  const heatmap = DAY_LABELS.reduce<ActiveHourCell[]>((acc, day) => {
    PERIOD_DEFS.forEach((p) => {
      // Add deterministic noise based on day+period hash
      const hash = (day.charCodeAt(0) * 7 + p.hourStart * 13) % 20;
      acc.push({
        day,
        period: p.label,
        hourStart: p.hourStart,
        hourEnd: p.hourEnd,
        score: p.baseWeight + hash - 10,
        engagement: 0,
      });
    });
    return acc;
  }, []);

  // Adjust from actual post publishing times
  posts.forEach((p) => {
    const d = new Date(p.createdAt);
    const dayOfWeek = d.getDay();
    const dayIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Mon=0, Sun=6
    const hour = d.getHours();
    const eng = p.likes + p.comments * 2 + p.shares * 3;

    const cellIdx = dayIdx * 6 + PERIOD_DEFS.findIndex(
      (pd) => hour >= pd.hourStart && hour < pd.hourEnd
    );
    if (cellIdx >= 0 && cellIdx < heatmap.length) {
      heatmap[cellIdx].score += Math.min(eng * 0.5, 30);
      heatmap[cellIdx].engagement += eng;
    }
  });

  // Boost from comment times
  comments.forEach((c) => {
    const d = new Date(c.syncedAt);
    const dayOfWeek = d.getDay();
    const dayIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const hour = d.getHours();
    const cellIdx = dayIdx * 6 + PERIOD_DEFS.findIndex(
      (pd) => hour >= pd.hourStart && hour < pd.hourEnd
    );
    if (cellIdx >= 0 && cellIdx < heatmap.length) {
      heatmap[cellIdx].score += 5;
    }
  });

  // Normalize to 0-100
  const maxScore = Math.max(...heatmap.map((h) => h.score), 1);
  const normalized = heatmap.map((h) => ({
    ...h,
    score: Math.round((h.score / maxScore) * 100),
  }));

  // Find best slot
  const best = normalized.reduce((a, b) => (a.score > b.score ? a : b));

  return {
    heatmap: normalized,
    bestSlot: { day: best.day, period: best.period, score: best.score },
    bestTime: `${best.day} ${best.period} ${best.hourStart}:00-${best.hourEnd}:00`,
  };
}

// ─── Content Preferences (内容偏好) ──────────────────────────────────────

interface ContentPreferenceItem {
  type: string;
  label: string;
  engagement: number;
  count: number;
  avgEngagement: number;
  percentage: number;
}

interface ContentPreferencesData {
  topTypes: ContentPreferenceItem[];
  radar: Array<{ dimension: string; score: number }>; // 教育/娱乐/社交/购物/资讯/生活
}

const CONTENT_LABEL_MAP: Record<string, string> = {
  text: '纯文字', image: '图文搭配', video: '视频动态', mixed: '混合内容',
  story: '故事分享', insight: '观点洞察', interaction: '互动话题',
  seeding: '种草安利', review: '好物测评', tutorial: '教程攻略',
  drygoods: '干货知识', vlog: '生活Vlog', daily: '日常分享',
  recommend: '好物推荐', collection: '合集清单',
};

// Content type → radar dimension mapping
const TYPE_TO_DIMENSION: Record<string, string[]> = {
  text:     ['资讯', '教育'],
  image:    ['生活', '社交'],
  video:    ['娱乐', '生活'],
  mixed:    ['生活', '娱乐', '资讯'],
  story:    ['社交', '娱乐'],
  insight:  ['教育', '资讯'],
  interaction: ['社交', '娱乐'],
  seeding:  ['购物', '生活'],
  review:   ['购物', '生活'],
  tutorial: ['教育', '生活'],
  drygoods: ['教育', '资讯'],
  vlog:     ['生活', '娱乐'],
  daily:    ['社交', '生活'],
  recommend: ['购物', '生活'],
  collection: ['购物', '教育'],
};

const RADAR_DIMENSIONS = ['教育', '娱乐', '社交', '购物', '资讯', '生活'];

function computeContentPreferences(
  posts: Array<{ contentType: string; likes: number; comments: number; shares: number }>
): ContentPreferencesData {
  const typeMap: Record<string, { totalEng: number; count: number }> = {};
  posts.forEach((p) => {
    if (!typeMap[p.contentType]) typeMap[p.contentType] = { totalEng: 0, count: 0 };
    typeMap[p.contentType].totalEng += p.likes + p.comments * 2 + p.shares * 3;
    typeMap[p.contentType].count += 1;
  });

  const entries = Object.entries(typeMap).map(([type, data]) => ({
    type,
    label: CONTENT_LABEL_MAP[type] || type,
    engagement: data.totalEng,
    count: data.count,
    avgEngagement: data.count > 0 ? Math.round(data.totalEng / data.count) : 0,
    percentage: 0,
  }));

  const totalEng = entries.reduce((s, e) => s + e.engagement, 0);
  entries.forEach((e) => {
    e.percentage = totalEng > 0 ? Math.round((e.engagement / totalEng) * 100) : 0;
  });

  const topTypes = entries.sort((a, b) => b.engagement - a.engagement);

  // Radar: aggregate content types into 6 dimensions
  const dimScores: Record<string, number> = {};
  RADAR_DIMENSIONS.forEach((d) => { dimScores[d] = 0; });

  posts.forEach((p) => {
    const dims = TYPE_TO_DIMENSION[p.contentType] || ['生活'];
    const eng = p.likes + p.comments * 2 + p.shares * 3;
    dims.forEach((d) => { dimScores[d] = (dimScores[d] || 0) + eng; });
  });

  const maxDimScore = Math.max(...Object.values(dimScores), 1);
  const radar = RADAR_DIMENSIONS.map((d) => ({
    dimension: d,
    score: Math.round((dimScores[d] / maxDimScore) * 100),
  }));

  return { topTypes, radar };
}

// ─── Engagement Trends (互动率趋势) ──────────────────────────────────────

interface EngagementTrendsData {
  daily: Array<{ date: string; label: string; engagementRate: number; totalEngagement: number; posts: number }>;
  weeklyAvg: Array<{ weekLabel: string; avgEngagementRate: number; totalInteractions: number }>;
  changePercentage: number;  // vs previous period
  trend: 'up' | 'down' | 'stable';
}

function computeEngagementTrends(
  posts: Array<{ createdAt: Date; likes: number; comments: number; shares: number; views: number; status: string }>,
  comments: Array<{ syncedAt: Date }>,
  now: Date,
  days: number,
): EngagementTrendsData {
  // Build daily map
  const dailyMap = new Map<string, { eng: number; views: number; posts: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - (days - 1 - i));
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, { eng: 0, views: 0, posts: 0 });
  }

  posts.forEach((p) => {
    const key = new Date(p.createdAt).toISOString().slice(0, 10);
    const entry = dailyMap.get(key);
    if (entry) {
      entry.eng += p.likes + p.comments + p.shares;
      entry.views += p.views;
      entry.posts += 1;
    }
  });

  const daily = Array.from(dailyMap.entries()).map(([dateStr, data]) => {
    const d = new Date(dateStr);
    return {
      date: dateStr,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      engagementRate: data.views > 0 ? Math.round((data.eng / data.views) * 10000) / 100 : 0,
      totalEngagement: data.eng,
      posts: data.posts,
    };
  });

  // Weekly aggregation
  const weekCount = Math.ceil(days / 7);
  const weeklyAvg = Array.from({ length: weekCount }, (_, i) => {
    const weekStart = i * 7;
    const weekEnd = Math.min(weekStart + 7, daily.length);
    const weekData = daily.slice(weekStart, weekEnd);
    const totalEng = weekData.reduce((s, d) => s + d.totalEngagement, 0);
    const totalViews = weekData.reduce((s, d) => s + d.posts, 0) * 100; // estimate
    const avgRate = totalViews > 0 ? (totalEng / totalViews) * 100 : 0;
    return {
      weekLabel: `第${i + 1}周`,
      avgEngagementRate: Math.round(avgRate * 100) / 100,
      totalInteractions: totalEng,
    };
  });

  // Change: first half vs second half
  const mid = Math.floor(daily.length / 2);
  const firstHalf = daily.slice(0, mid).reduce((s, d) => s + d.totalEngagement, 0);
  const secondHalf = daily.slice(mid).reduce((s, d) => s + d.totalEngagement, 0);
  const changePercentage = firstHalf > 0
    ? Math.round(((secondHalf - firstHalf) / firstHalf) * 100)
    : (secondHalf > 0 ? 100 : 0);

  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (changePercentage > 5) trend = 'up';
  else if (changePercentage < -5) trend = 'down';

  return { daily, weeklyAvg, changePercentage, trend };
}

// ─── Audience Tags (受众画像标签) ────────────────────────────────────────

interface AudienceTag {
  label: string;
  category: 'age' | 'behavior' | 'interest' | 'time' | 'trait';
  confidence: number; // 0-1
  description: string;
}

function computeAudienceTags(
  posts: Array<{ contentType: string; topic: string; likes: number; comments: number; shares: number }>,
  _comments: Array<{ content: string }>,
  preferences: ContentPreferencesData,
  activeHours: ActiveHoursData,
): AudienceTag[] {
  const tags: AudienceTag[] = [];
  const totalEng = posts.reduce((s, p) => s + p.likes + p.comments + p.shares, 0);
  const hasData = totalEng > 0 && posts.length > 0;

  // Top age group tag
  const topAgeType = posts.reduce<Record<string, number>>((acc, p) => {
    acc[p.contentType] = (acc[p.contentType] || 0) + p.likes + p.comments + p.shares;
    return acc;
  }, {});

  const dominantType = Object.entries(topAgeType).sort((a, b) => b[1] - a[1])[0]?.[0];

  // Age tags
  if (dominantType === 'video' || dominantType === 'vlog' || dominantType === 'daily') {
    tags.push({ label: '18-30岁年轻群体', category: 'age', confidence: hasData ? 0.78 : 0.45, description: '视频/Vlog类内容互动率高' });
  } else if (dominantType === 'insight' || dominantType === 'drygoods' || dominantType === 'tutorial') {
    tags.push({ label: '25-35岁职场人', category: 'age', confidence: hasData ? 0.82 : 0.5, description: '干货/洞察类内容互动率高' });
  } else if (dominantType === 'story') {
    tags.push({ label: '30-45岁成熟群体', category: 'age', confidence: hasData ? 0.7 : 0.4, description: '故事类内容受中年用户青睐' });
  } else {
    tags.push({ label: '25-35岁核心群体', category: 'age', confidence: hasData ? 0.65 : 0.4, description: '综合内容偏好' });
  }

  // Behavior tags
  const avgShares = posts.length > 0 ? posts.reduce((s, p) => s + p.shares, 0) / posts.length : 0;
  const avgComments = posts.length > 0 ? posts.reduce((s, p) => s + p.comments, 0) / posts.length : 0;
  if (avgShares > 5) {
    tags.push({ label: '爱转发分享', category: 'behavior', confidence: 0.75, description: '平均每条转发量较高' });
  }
  if (avgComments > 8) {
    tags.push({ label: '爱互动评论', category: 'behavior', confidence: 0.72, description: '评论活跃度高于均值' });
  }
  if (avgShares <= 2 && avgComments <= 3) {
    tags.push({ label: '沉默浏览型', category: 'behavior', confidence: 0.6, description: '浏览多但互动较少' });
  }

  // Interest tags based on content preferences
  const topRadar = [...preferences.radar].sort((a, b) => b.score - a.score).slice(0, 2);
  const interestMap: Record<string, string> = {
    '教育': '爱看干货学习', '娱乐': '爱看趣味内容', '社交': '社交活跃型',
    '购物': '种草消费型', '资讯': '信息敏感型', '生活': '生活方式关注者',
  };
  topRadar.forEach((r) => {
    if (r.score > 40) {
      tags.push({
        label: interestMap[r.dimension] || r.dimension,
        category: 'interest',
        confidence: Math.min(0.5 + r.score * 0.005, 0.9),
        description: `${r.dimension}维度偏好突出`,
      });
    }
  });

  // Time tag
  if (activeHours.bestSlot.period === '晚间') {
    tags.push({ label: '活跃在晚间', category: 'time', confidence: 0.7, description: `最佳互动时段：${activeHours.bestTime}` });
  } else if (activeHours.bestSlot.period === '中午') {
    tags.push({ label: '午休时段活跃', category: 'time', confidence: 0.65, description: `最佳互动时段：${activeHours.bestTime}` });
  } else if (activeHours.bestSlot.period === '早间') {
    tags.push({ label: '早起刷手机', category: 'time', confidence: 0.6, description: `最佳互动时段：${activeHours.bestTime}` });
  } else {
    tags.push({ label: `${activeHours.bestSlot.period}活跃`, category: 'time', confidence: 0.6, description: `最佳互动时段：${activeHours.bestTime}` });
  }

  // Trait tags
  if (posts.some((p) => p.topic.includes('职场') || p.topic.includes('工作'))) {
    tags.push({ label: '职场白领', category: 'trait', confidence: 0.7, description: '职场相关话题互动较多' });
  }
  if (posts.some((p) => p.topic.includes('宝宝') || p.topic.includes('育儿') || p.topic.includes('妈妈'))) {
    tags.push({ label: '宝妈群体', category: 'trait', confidence: 0.65, description: '母婴/育儿话题有互动' });
  }
  if (posts.some((p) => p.topic.includes('学生') || p.topic.includes('学习') || p.topic.includes('考试'))) {
    tags.push({ label: '学生党', category: 'trait', confidence: 0.6, description: '学习/考试相关内容有互动' });
  }

  // Sort by confidence, return top 5
  return tags.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}

// ─── Platform Comparison (平台对比) ──────────────────────────────────────

interface PlatformComparisonData {
  wechat: {
    engagementRate: number;
    topContentType: string;
    topContentLabel: string;
    activePeriod: string;
    audienceTrait: string;
    avgInteractionPerPost: number;
  };
  xiaohongshu: {
    engagementRate: number;
    topContentType: string;
    topContentLabel: string;
    activePeriod: string;
    audienceTrait: string;
    avgInteractionPerPost: number;
  };
  differences: Array<{ dimension: string; wechat: string; xhs: string }>;
}

function computePlatformComparison(
  posts: Array<{ platform: string; contentType: string; likes: number; comments: number; shares: number; views: number; createdAt: Date }>,
  _prevPosts: Array<{ platform: string }>,
): PlatformComparisonData {
  const wcPosts = posts.filter((p) => !p.platform || p.platform === 'wechat');
  const xhsPosts = posts.filter((p) => p.platform === 'xiaohongshu');

  const calcRate = (arr: typeof posts) => {
    if (arr.length === 0) return 0;
    const tv = arr.reduce((s, p) => s + p.views, 0);
    const ti = arr.reduce((s, p) => s + p.likes + p.comments + p.shares, 0);
    return tv > 0 ? Math.round((ti / tv) * 10000) / 100 : 0;
  };

  const calcAvgInteraction = (arr: typeof posts) => {
    if (arr.length === 0) return 0;
    return Math.round(arr.reduce((s, p) => s + p.likes + p.comments + p.shares, 0) / arr.length);
  };

  const getTopType = (arr: typeof posts) => {
    if (arr.length === 0) return { type: '-', label: '-' };
    const m: Record<string, number> = {};
    arr.forEach((p) => { m[p.contentType] = (m[p.contentType] || 0) + p.likes + p.comments * 2 + p.shares * 3; });
    const top = Object.entries(m).sort((a, b) => b[1] - a[1])[0];
    return top ? { type: top[0], label: CONTENT_LABEL_MAP[top[0]] || top[0] } : { type: '-', label: '-' };
  };

  const getActivePeriod = (arr: typeof posts) => {
    if (arr.length === 0) return '暂无数据';
    const hourCounts: Record<number, number> = {};
    arr.forEach((p) => {
      const h = new Date(p.createdAt).getHours();
      hourCounts[h] = (hourCounts[h] || 0) + 1;
    });
    const topHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
    if (!topHour) return '暂无数据';
    const hour = parseInt(topHour[0]);
    if (hour >= 6 && hour < 9) return '早间 6-9时';
    if (hour >= 9 && hour < 12) return '上午 9-12时';
    if (hour >= 12 && hour < 14) return '中午 12-14时';
    if (hour >= 14 && hour < 17) return '下午 14-17时';
    if (hour >= 17 && hour < 19) return '傍晚 17-19时';
    return '晚间 19-23时';
  };

  const wcTop = getTopType(wcPosts);
  const xhsTop = getTopType(xhsPosts);

  const wechat = {
    engagementRate: calcRate(wcPosts),
    topContentType: wcTop.type,
    topContentLabel: wcTop.label,
    activePeriod: getActivePeriod(wcPosts),
    audienceTrait: wcPosts.length > 0 ? '私域强关系' : '暂无数据',
    avgInteractionPerPost: calcAvgInteraction(wcPosts),
  };

  const xiaohongshu = {
    engagementRate: calcRate(xhsPosts),
    topContentType: xhsTop.type,
    topContentLabel: xhsTop.label,
    activePeriod: getActivePeriod(xhsPosts),
    audienceTrait: xhsPosts.length > 0 ? '公域种草型' : '暂无数据',
    avgInteractionPerPost: calcAvgInteraction(xhsPosts),
  };

  const differences = [
    { dimension: '受众关系', wechat: '熟人/半熟人', xhs: '陌生人/兴趣匹配' },
    { dimension: '内容消费', wechat: '碎片化浏览', xhs: '主动搜索+推荐' },
    { dimension: '互动动机', wechat: '社交维护', xhs: '获取价值/种草' },
    { dimension: '最佳时段', wechat: wechat.activePeriod, xhs: xiaohongshu.activePeriod },
    { dimension: '高互动类型', wechat: wechat.topContentLabel, xhs: xiaohongshu.topContentLabel },
  ];

  return { wechat, xiaohongshu, differences };
}

// ─── Estimated Audience Size ─────────────────────────────────────────────

interface EstimatedAudienceSize {
  min: number;
  max: number;
  estimated: number;
  confidence: string;
  basis: string;
}

function estimateAudienceSize(
  posts: Array<{ likes: number; comments: number; shares: number; views: number; status: string }>
): EstimatedAudienceSize {
  const publishedPosts = posts.filter((p) => p.status === 'published');
  if (publishedPosts.length === 0) {
    return {
      min: 0,
      max: 0,
      estimated: 0,
      confidence: '无数据',
      basis: '暂无已发布内容',
    };
  }

  const totalViews = publishedPosts.reduce((s, p) => s + p.views, 0);
  const totalLikes = publishedPosts.reduce((s, p) => s + p.likes, 0);
  const totalComments = publishedPosts.reduce((s, p) => s + p.comments, 0);
  const avgViews = Math.round(totalViews / publishedPosts.length);
  const avgLikes = totalLikes / publishedPosts.length;
  const avgComments = totalComments / publishedPosts.length;

  // Estimate: followers ≈ avg_views / impression_rate (朋友圈 ~10%, 小红书 ~30%)
  // Use a blended estimate
  const followerEstimate = avgViews / 0.15;
  const likeRatioEstimate = avgLikes / 0.03;
  const commentRatioEstimate = avgComments / 0.005;

  const estimates = [followerEstimate, likeRatioEstimate, commentRatioEstimate].filter((e) => e > 0 && isFinite(e));
  const estimated = estimates.length > 0
    ? Math.round(estimates.reduce((a, b) => a + b, 0) / estimates.length)
    : 0;

  return {
    min: Math.round(estimated * 0.6),
    max: Math.round(estimated * 1.5),
    estimated,
    confidence: publishedPosts.length >= 10 ? '较高' : publishedPosts.length >= 5 ? '中等' : '较低',
    basis: `基于${publishedPosts.length}篇已发布内容的平均浏览${avgViews}、点赞${avgLikes.toFixed(1)}、评论${avgComments.toFixed(1)}推算`,
  };
}
