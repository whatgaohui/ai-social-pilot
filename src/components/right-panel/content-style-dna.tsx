"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Dna,
  Type,
  SmilePlus,
  BarChart3,
  Sparkles,
  Hash,
  BookOpen,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/store/app-store";
import type { ContentPost } from "@/types";

// ── Stop words for Chinese + English ───────────────────────────────────────

const STOP_WORDS = new Set([
  "的", "了", "是", "在", "我", "有", "和", "就", "不", "人", "都", "一", "一个", "上", "也", "很",
  "到", "说", "要", "去", "你", "会", "着", "没有", "看", "好", "自己", "这", "他", "她", "它", "们",
  "那", "个", "又", "与", "但", "可以", "对", "什么", "这个", "那个", "被", "从", "把", "还", "让",
  "因为", "所以", "如果", "就是", "而且", "或者", "虽然", "但是", "不过", "然而", "以及", "关于",
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do",
  "does", "did", "will", "would", "could", "should", "may", "might", "can", "shall", "to", "of", "in",
  "for", "on", "with", "at", "by", "from", "as", "into", "through", "during", "before", "after", "and",
  "but", "or", "nor", "not", "so", "if", "it", "its", "i", "me", "my", "we", "our", "you", "your",
  "he", "him", "his", "she", "her", "they", "them", "their", "this", "that", "these", "those",
  "which", "who", "whom", "what", "when", "where", "how", "why", "all", "each", "every", "both",
  "few", "more", "most", "other", "some", "such", "no", "only", "same", "than", "too", "very",
  "just", "because", "about", "up", "out", "then", "also", "am",
]);

// ── Radar chart axes ───────────────────────────────────────────────────────

const RADAR_AXES = [
  { key: "professional", label: "专业性", labelEn: "Professional" },
  { key: "emotional", label: "情感性", labelEn: "Emotional" },
  { key: "concise", label: "简洁度", labelEn: "Concise" },
  { key: "storytelling", label: "故事性", labelEn: "Storytelling" },
  { key: "interactive", label: "互动性", labelEn: "Interactive" },
] as const;

// ── Style tag patterns ─────────────────────────────────────────────────────

interface StylePattern {
  keywords: string[];
  label: string;
  color: string;
}

const STYLE_PATTERNS: StylePattern[] = [
  { keywords: ["%", "数据", "增长", "分析", "指标", "同比", "环比", "报告", "统计", "量", "率"], label: "数据驱动", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  { keywords: ["故事", "经历", "那天", "记得", "曾经", "小时候", "回忆", "讲述", "分享", "第一次"], label: "故事叙述", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  { keywords: ["感觉", "感动", "温暖", "心", "爱", "幸福", "快乐", "美好", "感恩", "珍惜"], label: "情感共鸣", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" },
  { keywords: ["方法", "技巧", "步骤", "建议", "攻略", "指南", "教程", "技巧", "要点", "注意"], label: "干货输出", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  { keywords: ["哈哈", "😂", "🤣", "笑", "好玩", "有趣", "乐", "段子", "梗", "逗"], label: "轻松幽默", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
  { keywords: ["思考", "反思", "认知", "底层", "本质", "逻辑", "深入", "洞察", "理解", "为什么"], label: "深度思考", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300" },
  { keywords: ["打卡", "日常", "生活", "早餐", "咖啡", "天气", "周末", "运动", "健身", "跑步"], label: "生活记录", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  { keywords: ["推荐", "安利", "种草", "好用", "必买", "划算", "性价比", "真的", "绝绝子", "宝藏"], label: "好物种草", color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300" },
];

// ── Animation variants ─────────────────────────────────────────────────────

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const } },
};

// ── Helper: count word frequency ───────────────────────────────────────────

function countWords(posts: ContentPost[]): Map<string, number> {
  const wordCount = new Map<string, number>();
  for (const post of posts) {
    if (!post.content) continue;
    const text = post.content.replace(/#[^\s#]+/g, "").trim();
    const segments = text.split(/[\s,，。.！!？?；;：:、\n\r\t]+/);
    for (const seg of segments) {
      if (seg.length <= 1) continue;
      if (STOP_WORDS.has(seg)) continue;
      if (/^[\d.]+$/.test(seg)) continue;
      wordCount.set(seg, (wordCount.get(seg) || 0) + 1);
    }
  }
  return wordCount;
}

// ── Helper: extract emojis ─────────────────────────────────────────────────

function extractEmojis(posts: ContentPost[]): { emoji: string; count: number }[] {
  const emojiMap = new Map<string, number>();
  const emojiRegex = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu;
  for (const post of posts) {
    if (!post.content) continue;
    const matches = post.content.match(emojiRegex);
    if (matches) {
      for (const emoji of matches) {
        emojiMap.set(emoji, (emojiMap.get(emoji) || 0) + 1);
      }
    }
  }
  return Array.from(emojiMap.entries())
    .map(([emoji, count]) => ({ emoji, count }))
    .sort((a, b) => b.count - a.count);
}

// ── Helper: analyze tone distribution ──────────────────────────────────────

function analyzeTone(posts: ContentPost[]): { positive: number; negative: number; neutral: number; question: number } {
  const positiveWords = ["好", "棒", "优秀", "喜欢", "赞", "开心", "快乐", "美好", "成功", "出色", "惊喜", "感动", "温暖", "幸福", "感恩", "精彩", "完美", "太棒了"];
  const negativeWords = ["不好", "差", "糟糕", "失败", "讨厌", "烦", "累", "难", "问题", "错误", "可惜", "遗憾", "不行", "不好"];
  const questionWords = ["吗", "呢", "？", "?", "多少", "什么", "怎么", "如何", "哪个", "哪里", "为什么"];

  let posCount = 0;
  let negCount = 0;
  let qCount = 0;
  let totalSentences = 0;

  for (const post of posts) {
    if (!post.content) continue;
    const sentences = post.content.split(/[。！\n\r]+/).filter(Boolean);
    for (const sentence of sentences) {
      totalSentences++;
      let hasPos = false;
      let hasNeg = false;
      let hasQ = false;
      for (const w of positiveWords) { if (sentence.includes(w)) { hasPos = true; break; } }
      for (const w of negativeWords) { if (sentence.includes(w)) { hasNeg = true; break; } }
      for (const w of questionWords) { if (sentence.includes(w)) { hasQ = true; break; } }
      if (hasQ) qCount++;
      else if (hasNeg) negCount++;
      else if (hasPos) posCount++;
    }
  }

  const neutral = Math.max(0, totalSentences - posCount - negCount - qCount);
  return { positive: posCount, negative: negCount, neutral, question: qCount };
}

// ── Helper: compute style radar scores ─────────────────────────────────────

function computeRadarScores(posts: ContentPost[]): number[] {
  if (posts.length === 0) return [0, 0, 0, 0, 0];

  let professionalScore = 0;
  let emotionalScore = 0;
  let conciseScore = 0;
  let storytellingScore = 0;
  let interactiveScore = 0;
  const totalPosts = posts.length;

  const professionalWords = ["专业", "数据", "分析", "报告", "研究", "行业", "市场", "策略", "指标", "增长", "趋势", "优化", "方案", "体系", "框架", "模型"];
  const emotionalWords = ["感动", "温暖", "心", "爱", "幸福", "快乐", "美好", "感恩", "珍惜", "想念", "泪", "笑", "拥抱", "陪伴", "家人", "朋友"];
  const storyWords = ["故事", "经历", "那天", "记得", "曾经", "小时候", "回忆", "讲述", "突然", "然后", "接着", "后来", "从此", "终于", "那一年", "那时候"];
  const interactiveWords = ["你们", "大家", "评论", "留言", "分享", "转发", "点赞", "收藏", "说说", "觉得", "有没有", "一起", "互动", "投票"];

  for (const post of posts) {
    const content = post.content || "";
    const sentences = content.split(/[。！？\n\r]+/).filter(Boolean);
    const avgSentenceLen = sentences.length > 0
      ? sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length
      : 0;

    if (avgSentenceLen < 30) conciseScore += 20;
    else if (avgSentenceLen < 50) conciseScore += 15;
    else if (avgSentenceLen < 80) conciseScore += 10;
    else conciseScore += 5;

    const wordHits = (words: string[]) => words.filter((w) => content.includes(w)).length;
    professionalScore += Math.min(25, wordHits(professionalWords) * 5);
    emotionalScore += Math.min(25, wordHits(emotionalWords) * 5);
    storytellingScore += Math.min(25, wordHits(storyWords) * 5);
    interactiveScore += Math.min(25, wordHits(interactiveWords) * 5);

    if (content.includes("?") || content.includes("？") || content.includes("吗") || content.includes("呢")) {
      interactiveScore += 5;
    }
  }

  return [
    Math.min(100, Math.round(professionalScore / totalPosts * 4)),
    Math.min(100, Math.round(emotionalScore / totalPosts * 4)),
    Math.min(100, Math.round(conciseScore / totalPosts)),
    Math.min(100, Math.round(storytellingScore / totalPosts * 4)),
    Math.min(100, Math.round(interactiveScore / totalPosts * 4)),
  ];
}

// ── SVG Radar Chart Component ──────────────────────────────────────────────

function RadarChart({ scores }: { scores: number[] }) {
  const size = 180;
  const center = size / 2;
  const maxRadius = 70;
  const numAxes = RADAR_AXES.length;
  const angleStep = (2 * Math.PI) / numAxes;
  const startAngle = -Math.PI / 2;

  const getPoint = (axisIndex: number, value: number) => {
    const angle = startAngle + axisIndex * angleStep;
    const r = (value / 100) * maxRadius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const dataPoints = scores.map((s, i) => getPoint(i, s));
  const polygonPoints = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  const gridLevels = [25, 50, 75, 100];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      <defs>
        <linearGradient id="radarFill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(139,92,246,0.25)" />
          <stop offset="100%" stopColor="rgba(16,185,129,0.15)" />
        </linearGradient>
        <linearGradient id="radarStroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>

      {gridLevels.map((level) => {
        const points = RADAR_AXES.map((_, i) => getPoint(i, level)).map((p) => `${p.x},${p.y}`).join(" ");
        return (
          <polygon
            key={level}
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth={0.5}
            className="text-muted-foreground/20"
          />
        );
      })}

      {RADAR_AXES.map((_, i) => {
        const p = getPoint(i, 100);
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={p.x}
            y2={p.y}
            stroke="currentColor"
            strokeWidth={0.5}
            className="text-muted-foreground/15"
          />
        );
      })}

      <motion.polygon
        points={polygonPoints}
        fill="url(#radarFill)"
        stroke="url(#radarStroke)"
        strokeWidth={2}
        strokeLinejoin="round"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
        style={{ transformOrigin: `${center}px ${center}px` }}
      />

      {dataPoints.map((p, i) => (
        <motion.circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={3}
          fill="#8b5cf6"
          stroke="white"
          strokeWidth={1.5}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.6 + i * 0.08 }}
          style={{ transformOrigin: `${p.x}px ${p.y}px` }}
        />
      ))}

      {RADAR_AXES.map((axis, i) => {
        const labelPos = getPoint(i, 115);
        return (
          <text
            key={i}
            x={labelPos.x}
            y={labelPos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="radar-label fill-foreground/70"
          >
            <tspan>{axis.label}</tspan>
          </text>
        );
      })}
    </svg>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export function ContentStyleDNA() {
  const contentPosts = useAppStore((s) => s.contentPosts);
  const platform = useAppStore((s) => s.platform);

  const postsWithContent = useMemo(
    () => contentPosts.filter((p) => p.content && p.content.trim().length > 0),
    [contentPosts],
  );

  const analysis = useMemo(() => {
    const posts = postsWithContent;
    if (posts.length === 0) return null;

    const wordMap = countWords(posts);
    const topWords = Array.from(wordMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const emojis = extractEmojis(posts);
    const topEmojis = emojis.slice(0, 5);

    const totalChars = posts.reduce((sum, p) => sum + (p.content?.length || 0), 0);
    const avgLength = Math.round(totalChars / posts.length);
    const uniqueWords = wordMap.size;
    const emojiDensity = totalChars > 0 ? ((emojis.reduce((s, e) => s + e.count, 0) / totalChars) * 100).toFixed(1) : "0";

    const detectedStyles = STYLE_PATTERNS
      .map((pattern) => ({
        ...pattern,
        hits: pattern.keywords.reduce((count, kw) => {
          return count + posts.reduce((postCount, post) => {
            const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
            const matches = (post.content || "").match(regex);
            return postCount + (matches ? matches.length : 0);
          }, 0);
        }, 0),
      }))
      .filter((s) => s.hits > 0)
      .sort((a, b) => b.hits - a.hits);

    const tone = analyzeTone(posts);
    const toneTotal = tone.positive + tone.negative + tone.neutral + tone.question;

    const radarScores = computeRadarScores(posts);

    const sentenceLengths: number[] = [];
    for (const post of posts) {
      const sentences = (post.content || "").split(/[。！？\n\r]+/).filter((s) => s.trim().length > 0);
      for (const s of sentences) {
        sentenceLengths.push(s.trim().length);
      }
    }
    const avgSentenceLen = sentenceLengths.length > 0
      ? Math.round(sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length)
      : 0;
    const shortPct = sentenceLengths.length > 0
      ? Math.round((sentenceLengths.filter((l) => l <= 20).length / sentenceLengths.length) * 100)
      : 0;
    const medPct = sentenceLengths.length > 0
      ? Math.round((sentenceLengths.filter((l) => l > 20 && l <= 50).length / sentenceLengths.length) * 100)
      : 0;
    const longPct = sentenceLengths.length > 0
      ? Math.round((sentenceLengths.filter((l) => l > 50).length / sentenceLengths.length) * 100)
      : 0;

    return {
      topWords,
      topEmojis,
      avgLength,
      uniqueWords,
      emojiDensity,
      detectedStyles,
      tone,
      toneTotal,
      radarScores,
      avgSentenceLen,
      shortPct,
      medPct,
      longPct,
      totalPosts: posts.length,
    };
  }, [postsWithContent]);

  if (!analysis || analysis.totalPosts === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Dna className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-xs text-muted-foreground">暂无内容数据</p>
        <p className="text-[10px] text-muted-foreground/70">至少需要1篇内容才能分析风格DNA</p>
      </div>
    );
  }

  const tonePercentages = analysis.toneTotal > 0
    ? {
        positive: Math.round((analysis.tone.positive / analysis.toneTotal) * 100),
        negative: Math.round((analysis.tone.negative / analysis.toneTotal) * 100),
        neutral: Math.round((analysis.tone.neutral / analysis.toneTotal) * 100),
        question: Math.round((analysis.tone.question / analysis.toneTotal) * 100),
      }
    : { positive: 25, negative: 5, neutral: 60, question: 10 };

  const maxWordCount = analysis.topWords.length > 0 ? analysis.topWords[0][1] : 1;

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-3"
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <motion.div variants={staggerItem} className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
          <Dna className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">风格DNA</h3>
          <p className="text-[10px] text-muted-foreground">基于 {analysis.totalPosts} 篇内容分析</p>
        </div>
      </motion.div>

      {/* ── Radar Chart ────────────────────────────────────────── */}
      <motion.div variants={staggerItem}>
        <Card className="p-3">
          <CardContent className="p-0">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-teal-500" />
              <span className="text-xs font-semibold">写作风格雷达</span>
            </div>
            <RadarChart scores={analysis.radarScores} />
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {RADAR_AXES.map((axis, i) => (
                <div key={axis.key} className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">{axis.label}</span>
                  <span className="text-[10px] font-bold tabular-nums text-teal-600 dark:text-teal-400">{analysis.radarScores[i]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Style Tags ─────────────────────────────────────────── */}
      {analysis.detectedStyles.length > 0 && (
        <motion.div variants={staggerItem}>
          <Card className="p-3">
            <CardContent className="p-0">
              <div className="flex items-center gap-1.5 mb-2">
                <Type className="h-3.5 w-3.5 text-violet-500" />
                <span className="text-xs font-semibold">风格特征</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {analysis.detectedStyles.map((style, i) => (
                  <motion.span
                    key={style.label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + i * 0.05 }}
                    className={`tag-float inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${style.color}`}
                    style={{ animationDelay: `${i * 0.4}s` }}
                  >
                    {style.label}
                  </motion.span>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Vocabulary Stats ────────────────────────────────────── */}
      <motion.div variants={staggerItem}>
        <Card className="p-3">
          <CardContent className="p-0">
            <div className="flex items-center gap-1.5 mb-2">
              <BookOpen className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-semibold">词汇统计</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="text-center p-2 rounded-lg bg-muted/40">
                <span className="text-sm font-bold tabular-nums">{analysis.avgLength}</span>
                <span className="block text-[9px] text-muted-foreground">平均字数</span>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/40">
                <span className="text-sm font-bold tabular-nums">{analysis.uniqueWords}</span>
                <span className="block text-[9px] text-muted-foreground">独立词汇</span>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/40">
                <span className="text-sm font-bold tabular-nums">{analysis.avgSentenceLen}</span>
                <span className="block text-[9px] text-muted-foreground">句均字数</span>
              </div>
            </div>
            {analysis.topWords.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-muted-foreground">高频词汇 TOP 10</span>
                {analysis.topWords.map(([word, count], i) => (
                  <motion.div
                    key={word}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    className="flex items-center gap-2"
                  >
                    <span className="text-[9px] text-muted-foreground w-3 text-right tabular-nums">{i + 1}</span>
                    <span className="text-[11px] font-medium w-14 truncate">{word}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 progress-fill-animate"
                        style={{ width: `${(count / maxWordCount) * 100}%` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(count / maxWordCount) * 100}%` }}
                        transition={{ duration: 0.6, delay: 0.4 + i * 0.05 }}
                      />
                    </div>
                    <span className="text-[9px] text-muted-foreground tabular-nums w-4 text-right">{count}</span>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Emoji Analysis ──────────────────────────────────────── */}
      {analysis.topEmojis.length > 0 && (
        <motion.div variants={staggerItem}>
          <Card className="p-3">
            <CardContent className="p-0">
              <div className="flex items-center gap-1.5 mb-2">
                <SmilePlus className="h-3.5 w-3.5 text-orange-500" />
                <span className="text-xs font-semibold">表情分析</span>
                <Badge variant="secondary" className="ml-auto text-[9px] h-4 px-1.5 bg-orange-500/10 text-orange-600 dark:text-orange-400">
                  {analysis.emojiDensity}/百字
                </Badge>
              </div>
              <div className="flex gap-3">
                {analysis.topEmojis.map((e, i) => (
                  <motion.div
                    key={e.emoji}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.08 }}
                    className="flex flex-col items-center gap-0.5"
                  >
                    <span className="text-xl">{e.emoji}</span>
                    <span className="text-[9px] text-muted-foreground tabular-nums">{e.count}次</span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Tone Distribution ───────────────────────────────────── */}
      <motion.div variants={staggerItem}>
        <Card className="p-3">
          <CardContent className="p-0">
            <div className="flex items-center gap-1.5 mb-2">
              <BarChart3 className="h-3.5 w-3.5 text-cyan-500" />
              <span className="text-xs font-semibold">语气分布</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden flex">
              {tonePercentages.positive > 0 && (
                <motion.div
                  className="bg-emerald-500 h-full progress-fill-animate"
                  style={{ width: `${tonePercentages.positive}%` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${tonePercentages.positive}%` }}
                  transition={{ duration: 0.6 }}
                />
              )}
              {tonePercentages.negative > 0 && (
                <motion.div
                  className="bg-rose-500 h-full progress-fill-animate"
                  style={{ width: `${tonePercentages.negative}%` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${tonePercentages.negative}%` }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                />
              )}
              {tonePercentages.neutral > 0 && (
                <motion.div
                  className="bg-slate-400 dark:bg-slate-600 h-full progress-fill-animate"
                  style={{ width: `${tonePercentages.neutral}%` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${tonePercentages.neutral}%` }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                />
              )}
              {tonePercentages.question > 0 && (
                <motion.div
                  className="bg-amber-500 h-full progress-fill-animate"
                  style={{ width: `${tonePercentages.question}%` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${tonePercentages.question}%` }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                />
              )}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-muted-foreground">积极 {tonePercentages.positive}%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-[10px] text-muted-foreground">消极 {tonePercentages.negative}%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-600" />
                <span className="text-[10px] text-muted-foreground">中性 {tonePercentages.neutral}%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-[10px] text-muted-foreground">疑问 {tonePercentages.question}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Writing Rhythm ──────────────────────────────────────── */}
      <motion.div variants={staggerItem}>
        <Card className="p-3">
          <CardContent className="p-0">
            <div className="flex items-center gap-1.5 mb-2">
              <Hash className="h-3.5 w-3.5 text-purple-500" />
              <span className="text-xs font-semibold">写作节奏</span>
            </div>
            <div className="flex items-end gap-1 h-16">
              {[
                { label: "短句", pct: analysis.shortPct, color: "bg-emerald-500" },
                { label: "中句", pct: analysis.medPct, color: "bg-amber-500" },
                { label: "长句", pct: analysis.longPct, color: "bg-rose-500" },
              ].map((item, i) => (
                <div key={item.label} className="flex-1 flex flex-col items-center gap-1">
                  <motion.div
                    className={`w-full rounded-t-md ${item.color} max-h-12`}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(4, (item.pct / 100) * 48)}px` }}
                    transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                  />
                  <span className="text-[9px] text-muted-foreground">{item.label}</span>
                  <span className="text-[10px] font-bold tabular-nums">{item.pct}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Platform Comparison ─────────────────────────────────── */}
      <motion.div variants={staggerItem}>
        <Card className="p-3 border-dashed border-border/20">
          <CardContent className="p-0">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="h-3.5 w-3.5 text-indigo-500" />
              <span className="text-xs font-semibold">风格 vs 平台均格</span>
            </div>
            <div className="space-y-2">
              {[
                { label: "平均字数", your: analysis.avgLength, avg: platform === "wechat" ? 120 : 280 },
                { label: "句均字数", your: analysis.avgSentenceLen, avg: platform === "wechat" ? 18 : 22 },
                { label: "互动词汇%", your: Math.round(analysis.radarScores[4]), avg: platform === "wechat" ? 35 : 55 },
              ].map((item) => {
                const yourPct = Math.min(100, (item.your / (item.avg * 2)) * 100);
                const avgPct = Math.min(100, (item.avg / (item.avg * 2)) * 100);
                return (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] text-muted-foreground">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-teal-500">你: {item.your}</span>
                        <span className="text-[9px] text-muted-foreground">均: {item.avg}</span>
                      </div>
                    </div>
                    <div className="relative h-1.5 rounded-full bg-muted/50">
                      <motion.div
                        className="absolute h-full rounded-full bg-muted-foreground/20 top-0 left-0"
                        style={{ width: `${avgPct}%` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${avgPct}%` }}
                        transition={{ duration: 0.4 }}
                      />
                      <motion.div
                        className="absolute h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 top-0 left-0"
                        style={{ width: `${yourPct}%` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${yourPct}%` }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
