"use client";

import React, { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { RefreshCw, Copy, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import type { ContentPost } from "@/types";

// ─── Stop words (Chinese + English common) ─────────────────────────────────
const STOP_WORDS = new Set([
  // Chinese stop words
  "的", "了", "在", "是", "我", "有", "和", "就", "不", "人", "都", "一", "一个",
  "上", "也", "很", "到", "说", "要", "去", "你", "会", "着", "没有", "看", "好",
  "自己", "这", "他", "她", "它", "们", "那", "什么", "被", "让", "把", "给",
  "从", "对", "等", "与", "及", "或", "但", "而", "且", "如果", "因为", "所以",
  "可以", "这个", "那个", "已经", "还是", "可能", "应该", "知道", "时候", "现在",
  "今天", "明天", "昨天", "大家", "然后", "这样", "那样", "怎么", "为什么", "吗",
  "呢", "吧", "啊", "哦", "嗯", "哈", "呀", "嘛", "啦", "哟", "么",
  // English stop words
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "need", "dare", "ought",
  "and", "or", "but", "if", "of", "at", "by", "for", "with", "about",
  "to", "from", "in", "on", "up", "out", "it", "its", "i", "me", "my",
  "we", "our", "you", "your", "he", "him", "his", "she", "her", "they",
  "them", "their", "this", "that", "these", "those", "what", "which", "who",
  "when", "where", "how", "not", "no", "so", "as", "than", "too", "very",
]);

// ─── Color palette for word chips ──────────────────────────────────────────
const WORD_COLORS = [
  "text-violet-400",
  "text-emerald-400",
  "text-amber-400",
  "text-rose-400",
  "text-cyan-400",
  "text-fuchsia-400",
];

const WORD_BG_COLORS = [
  "bg-violet-400/10 border-violet-400/20 hover:bg-violet-400/20",
  "bg-emerald-400/10 border-emerald-400/20 hover:bg-emerald-400/20",
  "bg-amber-400/10 border-amber-400/20 hover:bg-amber-400/20",
  "bg-rose-400/10 border-rose-400/20 hover:bg-rose-400/20",
  "bg-cyan-400/10 border-cyan-400/20 hover:bg-cyan-400/20",
  "bg-fuchsia-400/10 border-fuchsia-400/20 hover:bg-fuchsia-400/20",
];

const WORD_SHADOW_COLORS = [
  "hover:shadow-violet-400/30",
  "hover:shadow-emerald-400/30",
  "hover:shadow-amber-400/30",
  "hover:shadow-rose-400/30",
  "hover:shadow-cyan-400/30",
  "hover:shadow-fuchsia-400/30",
];

// ─── Word extraction ────────────────────────────────────────────────────────
function extractWords(posts: ContentPost[]): Map<string, number> {
  const freq = new Map<string, number>();

  for (const post of posts) {
    const text = `${post.topic || ""} ${post.content || ""}`;
    if (!text.trim()) continue;

    // Extract Chinese characters (grouped as 2-4 char phrases) and English words
    // Chinese: split into individual characters and bigrams/trigrams
    const chineseMatches = text.match(/[\u4e00-\u9fff]+/g) || [];
    for (const segment of chineseMatches) {
      // Single characters (at least 2 occurrences to be meaningful)
      for (let i = 0; i < segment.length; i++) {
        const char = segment[i];
        if (!STOP_WORDS.has(char)) {
          freq.set(char, (freq.get(char) || 0) + 1);
        }
      }
      // Bigrams (2-char phrases)
      for (let i = 0; i < segment.length - 1; i++) {
        const bigram = segment.slice(i, i + 2);
        if (!STOP_WORDS.has(bigram)) {
          freq.set(bigram, (freq.get(bigram) || 0) + 1);
        }
      }
      // Trigrams (3-char phrases)
      for (let i = 0; i < segment.length - 2; i++) {
        const trigram = segment.slice(i, i + 3);
        if (!STOP_WORDS.has(trigram)) {
          freq.set(trigram, (freq.get(trigram) || 0) + 1);
        }
      }
    }

    // English words
    const englishMatches = text.match(/[a-zA-Z]{2,}/g) || [];
    for (const word of englishMatches) {
      const lower = word.toLowerCase();
      if (!STOP_WORDS.has(lower) && lower.length >= 2) {
        freq.set(lower, (freq.get(lower) || 0) + 1);
      }
    }

    // Hashtags (#tag)
    const hashtagMatches = text.match(/#[\u4e00-\u9fff_a-zA-Z0-9]+/g) || [];
    for (const tag of hashtagMatches) {
      const cleaned = tag.replace(/^#+/, "");
      if (cleaned.length >= 2) {
        freq.set(cleaned, (freq.get(cleaned) || 0) + 1);
      }
    }
  }

  return freq;
}

// Seeded pseudo-random for consistent layout per analysis
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface WordItem {
  text: string;
  count: number;
  fontSize: number;
  colorIndex: number;
  rotation: number;
  delay: number;
}

// ─── Component ──────────────────────────────────────────────────────────────

interface ContentWordCloudProps {
  posts: ContentPost[];
}

export function ContentWordCloud({ posts }: ContentWordCloudProps) {
  const [analysisVersion, setAnalysisVersion] = useState(0);

  const words = useMemo((): WordItem[] => {
    const freq = extractWords(posts);
    if (freq.size === 0) return [];

    // Sort by frequency, take top 30
    const sorted = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30);

    const maxCount = sorted[0]?.[1] || 1;
    const minCount = sorted[sorted.length - 1]?.[1] || 1;
    const rng = seededRandom(analysisVersion * 42 + 7);

    return sorted.map(([text, count], index) => {
      // Normalize to 0-1 range
      const normalized = maxCount === minCount
        ? 0.5
        : (count - minCount) / (maxCount - minCount);

      // Font size: 12px to 28px
      const fontSize = Math.round(12 + normalized * 16);
      const colorIndex = index % WORD_COLORS.length;
      const rotation = Math.round((rng() - 0.5) * 30); // -15 to +15
      const delay = index * 0.03;

      return { text, count, fontSize, colorIndex, rotation, delay };
    });
  }, [posts, analysisVersion]);

  const handleAnalyze = useCallback(() => {
    setAnalysisVersion((v) => v + 1);
    toast.success("词频分析已刷新");
  }, []);

  const handleWordClick = useCallback((word: string) => {
    navigator.clipboard.writeText(word).then(() => {
      toast.success("已复制到剪贴板", { description: word, duration: 1500 });
    }).catch(() => {
      toast.error("复制失败");
    });
  }, []);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center">
            <BarChart3 className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <h3 className="text-xs font-semibold">词云分析</h3>
            <p className="text-[10px] text-muted-foreground">
              共分析 {posts.length} 篇内容 · {words.length} 个高频词
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-[10px] border-border/60"
          onClick={handleAnalyze}
        >
          <RefreshCw className="h-3 w-3" />
          分析词频
        </Button>
      </div>

      {/* Word Cloud */}
      {words.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center mb-3">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">暂无内容数据</p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">
            创建内容后即可查看词云分析
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 bg-card/50 p-4">
          <div className="flex flex-wrap items-center justify-center gap-2 min-h-[180px]">
            {words.map((word, i) => (
              <motion.button
                key={`${word.text}-${analysisVersion}`}
                initial={{ opacity: 0, scale: 0.3, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  delay: word.delay,
                  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
                }}
                whileHover={{
                  scale: 1.15,
                  transition: { duration: 0.15 },
                }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleWordClick(word.text)}
                className={`
                  inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                  border cursor-pointer transition-all duration-200
                  ${WORD_BG_COLORS[word.colorIndex]}
                  ${WORD_SHADOW_COLORS[word.colorIndex]}
                  hover:shadow-lg
                `}
                style={{
                  fontSize: `${word.fontSize}px`,
                  transform: `rotate(${word.rotation}deg)`,
                  lineHeight: 1.2,
                }}
                title={`${word.text}: ${word.count}次 · 点击复制`}
              >
                <span className={`font-semibold ${WORD_COLORS[word.colorIndex]}`}>
                  {word.text}
                </span>
                {word.fontSize >= 18 && (
                  <span className="text-[9px] text-muted-foreground/60 font-normal ml-0.5">
                    {word.count}
                  </span>
                )}
              </motion.button>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {WORD_COLORS.map((color, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className={`h-1.5 w-1.5 rounded-full ${color}`} />
                  <span className="text-[9px] text-muted-foreground/60">
                    {["热门", "趋势", "关键词", "话题", "标签", "品牌"][i]}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1 text-[9px] text-muted-foreground/50">
              <Copy className="h-2.5 w-2.5" />
              点击复制
            </div>
          </div>
        </div>
      )}

      {/* Top 5 Bar */}
      {words.length > 0 && (
        <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
          <p className="text-[10px] text-muted-foreground font-medium mb-2">TOP 5 高频词汇</p>
          <div className="space-y-1.5">
            {words.slice(0, 5).map((word, i) => {
              const maxCount = words[0].count;
              const pct = Math.round((word.count / maxCount) * 100);
              return (
                <div key={word.text} className="flex items-center gap-2">
                  <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] font-bold ${
                    i === 0 ? "bg-amber-400/20 text-amber-500" :
                    i === 1 ? "bg-slate-300/30 text-slate-400" :
                    i === 2 ? "bg-orange-400/20 text-orange-500" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {i + 1}
                  </span>
                  <span className="text-[11px] font-medium w-16 truncate">{word.text}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted/60 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${WORD_COLORS[word.colorIndex].replace("text-", "bg-").replace("-400", "-500/60")}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: 0.2 + i * 0.1, ease: "easeOut" }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">
                    {word.count}次
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
