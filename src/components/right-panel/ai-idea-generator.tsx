"use client";

import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lightbulb,
  Sparkles,
  RefreshCw,
  Check,
  CheckCircle,
  ChevronRight,
  History,
  Target,
  Users,
  Zap,
  Heart,
  BookOpen,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store/app-store";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface ContentBrief {
  title: string;
  angle: string;
  talkingPoints: string[];
  contentType: string;
  engagementPotential: "high" | "medium" | "low";
  emotionTrigger: string;
}

interface IdeaSet {
  id: string;
  seed: string;
  niche: string;
  audience: string;
  ideas: ContentBrief[];
  timestamp: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const NICHES = [
  { key: "个人成长", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300", activeColor: "bg-emerald-500 text-white" },
  { key: "职场干货", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", activeColor: "bg-blue-500 text-white" },
  { key: "生活方式", color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300", activeColor: "bg-pink-500 text-white" },
  { key: "好物分享", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300", activeColor: "bg-amber-500 text-white" },
  { key: "知识科普", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300", activeColor: "bg-cyan-500 text-white" },
  { key: "情感共鸣", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300", activeColor: "bg-rose-500 text-white" },
  { key: "行业洞察", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300", activeColor: "bg-violet-500 text-white" },
  { key: "创业副业", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300", activeColor: "bg-orange-500 text-white" },
] as const;

const AUDIENCES = [
  { key: "职场新人", icon: Users, color: "text-blue-500" },
  { key: "宝妈群体", icon: Heart, color: "text-rose-500" },
  { key: "大学生", icon: BookOpen, color: "text-emerald-500" },
  { key: "创业者", icon: Target, color: "text-amber-500" },
] as const;

const QUICK_SEEDS = ["年终总结", "效率提升", "副业收入", "职场沟通", "自我管理", "认知升级"];

const ENGAGEMENT_CONFIG = {
  high: { label: "高潜力", color: "engagement-high", gradient: "from-emerald-500 to-teal-500", bg: "bg-emerald-50 dark:bg-emerald-950/20", border: "border-emerald-200 dark:border-emerald-800/40" },
  medium: { label: "中等", color: "engagement-medium", gradient: "from-amber-500 to-orange-500", bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-200 dark:border-amber-800/40" },
  low: { label: "需优化", color: "engagement-low", gradient: "from-rose-500 to-red-500", bg: "bg-rose-50 dark:bg-rose-950/20", border: "border-rose-200 dark:border-rose-800/40" },
} as const;

const CONTENT_TYPE_LABELS: Record<string, string> = {
  text: "纯文字",
  image: "图文搭配",
  video: "视频动态",
  story: "故事分享",
  insight: "观点洞察",
  interaction: "互动话题",
  tutorial: "教程攻略",
  seeding: "种草安利",
};

const EMOTION_LABELS: Record<string, string> = {
  "共鸣": "共鸣",
  "好奇": "好奇",
  "感动": "感动",
  "励志": "励志",
  "焦虑": "焦虑缓解",
  "惊喜": "惊喜",
  "认同": "认同感",
  "怀旧": "怀旧",
};

const STORAGE_KEY = "ai-idea-history";

// ─── Animation Variants ─────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

// ─── History Management ─────────────────────────────────────────────────────────

function loadHistory(): IdeaSet[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as IdeaSet[] : [];
  } catch {
    return [];
  }
}

function saveHistory(history: IdeaSet[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 5)));
  } catch {
    // ignore storage errors
  }
}

// ─── Brief Card Component ───────────────────────────────────────────────────────

function BriefCard({ brief, index, onUse, onRefine }: {
  brief: ContentBrief;
  index: number;
  onUse: () => void;
  onRefine: () => void;
}) {
  const [checkedPoints, setCheckedPoints] = useState<Set<number>>(new Set());
  const [copiedTitle, setCopiedTitle] = useState(false);

  const engagement = ENGAGEMENT_CONFIG[brief.engagementPotential] || ENGAGEMENT_CONFIG.medium;

  const togglePoint = (i: number) => {
    setCheckedPoints((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const copyTitle = () => {
    navigator.clipboard.writeText(brief.title).then(() => {
      setCopiedTitle(true);
      setTimeout(() => setCopiedTitle(false), 1500);
    }).catch((error) => {
      console.warn('[ai-idea-generator]', error);
      toast.error("复制失败");
    });
  };

  return (
    <motion.div
      variants={cardVariants}
      layout
      className={`rounded-xl border overflow-hidden brief-card-shine ${engagement.border} ${engagement.bg} transition-all hover:shadow-md`}
    >
      {/* Gradient header */}
      <div className={`h-1.5 bg-gradient-to-r ${engagement.gradient}`} />

      <div className="p-3 space-y-2.5">
        {/* Top: engagement badge + index */}
        <div className="flex items-center justify-between">
          <Badge className={`text-[9px] px-1.5 py-0 h-4 border-0 ${engagement.bg} ${engagement.color} font-semibold`}>
            <Zap className="h-2.5 w-2.5 mr-0.5" />
            {engagement.label}
          </Badge>
          <span className="text-[10px] text-muted-foreground">#{index + 1}</span>
        </div>

        {/* Title */}
        <button
          onClick={copyTitle}
          className="w-full text-left group/title"
          title="点击复制标题"
        >
          <h4 className="text-sm font-semibold leading-snug text-foreground group-hover/title:text-violet-600 dark:group-hover/title:text-violet-400 transition-colors line-clamp-2">
            {brief.title}
          </h4>
        </button>
        {copiedTitle && (
          <motion.span
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-[10px] text-emerald-500 flex items-center gap-0.5"
          >
            <Check className="h-3 w-3" /> 已复制
          </motion.span>
        )}

        {/* Angle */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          {brief.angle}
        </p>

        {/* Talking Points */}
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">要点</p>
          <ul className="space-y-1">
            {brief.talkingPoints.map((point, i) => (
              <li key={i}>
                <button
                  onClick={() => togglePoint(i)}
                  className="flex items-start gap-1.5 w-full text-left group/point"
                >
                  <div
                    className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                      checkedPoints.has(i)
                        ? "bg-violet-500 border-violet-500 text-white"
                        : "border-muted-foreground/30 group-hover/point:border-violet-300"
                    }`}
                  >
                    {checkedPoints.has(i) && <Check className="h-2.5 w-2.5" />}
                  </div>
                  <span
                    className={`text-xs leading-relaxed ${
                      checkedPoints.has(i)
                        ? "text-muted-foreground line-through"
                        : "text-foreground/80"
                    }`}
                  >
                    {point}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Badges row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {brief.contentType && (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 border-0 bg-muted/60">
              {CONTENT_TYPE_LABELS[brief.contentType] || brief.contentType}
            </Badge>
          )}
          {brief.emotionTrigger && (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 border-0 bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
              <Heart className="h-2.5 w-2.5 mr-0.5" />
              {brief.emotionTrigger}
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            className="h-7 text-[11px] px-3 bg-violet-500 hover:bg-violet-600 text-white gap-1"
            onClick={onUse}
          >
            <CheckCircle className="h-3 w-3" />
            采用创意
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px] px-3 gap-1"
            onClick={onRefine}
          >
            <RefreshCw className="h-3 w-3" />
            深入优化
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function AIIdeaGenerator() {
  const selectedPost = useAppStore((s) => s.contentPosts.find((p) => p.id === s.selectedPostId) ?? null);
  const updateContentPost = useAppStore((s) => s.updateContentPost);
  const platform = useAppStore((s) => s.platform);
  const persona = useAppStore((s) => s.persona);

  const [seed, setSeed] = useState("");
  const [selectedNiche, setSelectedNiche] = useState("个人成长");
  const [selectedAudience, setSelectedAudience] = useState("职场新人");
  const [ideas, setIdeas] = useState<ContentBrief[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<IdeaSet[]>([]);

  // Load history on mount
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  // Platform label
  const platformLabel = platform === "xiaohongshu" ? "小红书" : "朋友圈";
  const isXHS = platform === "xiaohongshu";

  // Generate ideas
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setIdeas([]);

    const prompt = `基于以下信息生成3个内容创意简报：
- 种子关键词：${seed || "通用"}
- 垂直领域：${selectedNiche}
- 目标受众：${selectedAudience}
- 平台：${platformLabel}
- 人设：${persona?.name || "未设置"}

以JSON格式返回：
{
  "ideas": [
    {
      "title": "...",
      "angle": "...",
      "talkingPoints": ["...", "...", "..."],
      "contentType": "...",
      "engagementPotential": "high/medium/low",
      "emotionTrigger": "..."
    }
  ]
}`;

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "idea-brief",
          prompt,
          platform,
        }),
      });

      if (!res.ok) throw new Error("API error");

      const data = await res.json();
      let parsed: ContentBrief[] = [];

      // Try to parse JSON from response
      const content = typeof data === "string" ? data : data.content || data.result || JSON.stringify(data);
      try {
        // Try direct parse
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const obj = JSON.parse(jsonMatch[0]);
          parsed = obj.ideas || [];
        }
      } catch {
        // Fallback: generate mock ideas
        parsed = generateFallbackIdeas(selectedNiche, selectedAudience);
      }

      if (parsed.length === 0) {
        parsed = generateFallbackIdeas(selectedNiche, selectedAudience);
      }

      setIdeas(parsed);

      // Save to history
      const newSet: IdeaSet = {
        id: `idea-${Date.now()}`,
        seed: seed || "通用",
        niche: selectedNiche,
        audience: selectedAudience,
        ideas: parsed,
        timestamp: Date.now(),
      };
      const updatedHistory = [newSet, ...history].slice(0, 5);
      setHistory(updatedHistory);
      saveHistory(updatedHistory);

      toast.success("创意生成完成", { description: `已生成 ${parsed.length} 个内容创意简报` });
    } catch (err) {
      console.error("Generate ideas error:", err);
      const fallback = generateFallbackIdeas(selectedNiche, selectedAudience);
      setIdeas(fallback);
      toast.info("使用本地创意", { description: "AI服务暂时不可用" });
    } finally {
      setIsGenerating(false);
    }
  }, [seed, selectedNiche, selectedAudience, platform, platformLabel, persona, history]);

  // Use idea → populate selected post
  const handleUseIdea = useCallback(
    (brief: ContentBrief) => {
      if (!selectedPost) {
        toast.error("请先选择一篇内容");
        return;
      }

      const outline = brief.talkingPoints.join("\n• ");
      const topic = brief.title;

      const res = {
        topic,
        content: brief.angle + "\n\n" + (outline ? `• ${outline}` : ""),
        contentType: brief.contentType || "text",
      };

      updateContentPost(selectedPost.id, res);
      toast.success("创意已应用", { description: `标题和内容大纲已更新到: ${topic.slice(0, 20)}...` });
    },
    [selectedPost, updateContentPost],
  );

  // Refine idea
  const handleRefineIdea = useCallback(
    async (brief: ContentBrief) => {
      setIsGenerating(true);
      try {
        const res = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "idea-brief",
            prompt: `请优化以下创意简报，使其更具吸引力和互动性：\n标题: ${brief.title}\n角度: ${brief.angle}\n要点: ${brief.talkingPoints.join(", ")}\n平台: ${platformLabel}`,
            platform,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const content = typeof data === "string" ? data : data.content || data.result || "";
          toast.success("优化完成", { description: content.slice(0, 50) + "..." });
        }
      } catch {
        toast.error("优化失败");
      } finally {
        setIsGenerating(false);
      }
    },
    [platform, platformLabel],
  );

  // Load history item
  const handleLoadHistory = useCallback((item: IdeaSet) => {
    setIdeas(item.ideas);
    setSelectedNiche(item.niche);
    setSelectedAudience(item.audience);
    setSeed(item.seed);
    setShowHistory(false);
    toast.info("已加载历史创意");
  }, []);

  return (
    <div className="space-y-4">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-sm">
            <Lightbulb className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">AI创意生成</h3>
            <p className="text-[10px] text-muted-foreground">生成详细内容创意简报</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[10px] text-muted-foreground hover:text-foreground gap-1"
          onClick={() => setShowHistory((v) => !v)}
        >
          <History className="h-3 w-3" />
          历史
          {history.length > 0 && (
            <Badge className="h-3.5 w-3.5 p-0 text-[8px] bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400 border-0 flex items-center justify-center">
              {history.length}
            </Badge>
          )}
        </Button>
      </div>

      {/* ── History Panel ──────────────────────────────────────── */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-border/20 bg-muted/20 p-3 space-y-1.5 max-h-40 overflow-y-auto">
              <p className="text-[10px] font-semibold text-muted-foreground mb-1">最近生成</p>
              {history.length === 0 ? (
                <p className="text-[10px] text-muted-foreground/60">暂无历史记录</p>
              ) : (
                history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleLoadHistory(item)}
                    className="idea-history-item w-full flex items-center gap-2 p-2 rounded-lg text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{item.seed}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {item.niche} · {item.audience} · {item.ideas.length}条创意
                      </p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Quick Seeds ────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground">热门关键词</p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_SEEDS.map((s) => (
            <button
              key={s}
              onClick={() => setSeed(s)}
              className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
                seed === s
                  ? "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700"
                  : "border-border/20 text-muted-foreground hover:border-border/20 hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Seed Input ─────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold text-muted-foreground">种子关键词</label>
        <Input
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
          placeholder="输入关键词，如：个人品牌打造..."
          className="h-8 text-xs"
        />
      </div>

      {/* ── Niche Selector ─────────────────────────────────────── */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground">垂直领域</p>
        <div className="flex flex-wrap gap-1.5">
          {NICHES.map((n) => (
            <button
              key={n.key}
              onClick={() => setSelectedNiche(n.key)}
              className={`text-[10px] px-2.5 py-1 rounded-full border transition-all ${
                selectedNiche === n.key
                  ? `${n.activeColor} border-transparent niche-chip-active`
                  : `${n.color} border-transparent hover:opacity-80`
              }`}
            >
              {n.key}
            </button>
          ))}
        </div>
      </div>

      {/* ── Audience Selector ──────────────────────────────────── */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground">目标受众</p>
        <div className="grid grid-cols-2 gap-1.5">
          {AUDIENCES.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.key}
                onClick={() => setSelectedAudience(a.key)}
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-[10px] transition-all ${
                  selectedAudience === a.key
                    ? "bg-violet-50 border-violet-300 text-violet-700 dark:bg-violet-950/20 dark:border-violet-700 dark:text-violet-300"
                    : "border-border/20 text-muted-foreground hover:border-border/20 hover:text-foreground"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${selectedAudience === a.key ? "text-violet-500" : a.color}`} />
                {a.key}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Generate Button ────────────────────────────────────── */}
      <Button
        className="w-full h-9 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white gap-2 shadow-sm"
        onClick={handleGenerate}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="h-4 w-4" />
            </motion.div>
            正在生成创意...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            生成创意简报
          </>
        )}
      </Button>

      {/* ── Brief Cards ────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {ideas.length > 0 && !isGenerating && (
          <motion.div
            key="briefs"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="space-y-3"
          >
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <p className="text-xs font-semibold">生成结果</p>
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 border-0">
                {ideas.length}条
              </Badge>
            </div>

            {ideas.map((brief, i) => (
              <BriefCard
                key={`${brief.title}-${i}`}
                brief={brief}
                index={i}
                onUse={() => handleUseIdea(brief)}
                onRefine={() => handleRefineIdea(brief)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Loading Skeleton ───────────────────────────────────── */}
      {isGenerating && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-border/20 p-4 space-y-3 skeleton-pulse">
              <div className="h-2.5 w-16 rounded bg-muted" />
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="h-3 w-full rounded bg-muted" />
              <div className="space-y-1.5">
                <div className="h-3 w-full rounded bg-muted" />
                <div className="h-3 w-5/6 rounded bg-muted" />
                <div className="h-3 w-2/3 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Fallback Ideas Generator ──────────────────────────────────────────────────

function generateFallbackIdeas(niche: string, audience: string): ContentBrief[] {
  const templates = [
    {
      title: `${niche}必看：${audience}最容易踩的3个坑`,
      angle: `从${audience}的实际痛点出发，分享${niche}领域的常见误区，引发共鸣和反思。`,
      talkingPoints: [
        "误区一：盲目跟风，缺少个人思考",
        "误区二：急于求成，忽视长期积累",
        "误区三：信息过载，缺少执行力",
      ],
      contentType: "text",
      engagementPotential: "high" as const,
      emotionTrigger: "共鸣",
    },
    {
      title: `我是如何在${niche}中找到突破口的（真实经历分享）`,
      angle: `以第一人称视角讲述个人在${niche}领域的成长故事，增加真实感和代入感。`,
      talkingPoints: [
        "最初的迷茫与困惑期",
        "转折点：一个关键决定改变了一切",
        "现在的成果与对未来${audience}的建议",
      ],
      contentType: "story",
      engagementPotential: "medium" as const,
      emotionTrigger: "励志",
    },
    {
      title: `${audience}必备：${niche}领域5个实用技巧`,
      angle: `聚焦${audience}的实际需求，提供${niche}领域经过验证的实用方法论。`,
      talkingPoints: [
        "技巧一：建立每日复盘习惯",
        "技巧二：利用碎片时间学习",
        "技巧三：构建个人知识体系",
        "技巧四：主动寻求反馈",
        "技巧五：设定可量化的目标",
      ],
      contentType: "insight",
      engagementPotential: "high" as const,
      emotionTrigger: "认同",
    },
  ];

  return templates;
}
