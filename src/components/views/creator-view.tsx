"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/empty-state";
import { useAppStore } from "@/store/app-store";
import type { XhsAccountInfo, ContentDraftInfo } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Send,
  Loader2,
  Save,
  Wand2,
  X,
  Plus,
  FileText,
  Trash2,
  Copy,
  Check,
  PenLine,
  Lightbulb,
  Type,
  Hash,
  ImagePlus,
  ChevronDown,
  ChevronUp,
  Clock,
  BookOpen,
} from "lucide-react";

type QuickTone = "default" | "warm" | "professional" | "witty" | "casual" | "elegant";

const toneOptions: { value: QuickTone; label: string; emoji: string; desc: string }[] = [
  { value: "default", label: "默认", emoji: "🎯", desc: "平台自然风格" },
  { value: "warm", label: "温暖", emoji: "😊", desc: "亲切友好" },
  { value: "professional", label: "专业", emoji: "💼", desc: "权威严谨" },
  { value: "witty", label: "幽默", emoji: "😄", desc: "风趣生动" },
  { value: "casual", label: "随性", emoji: "🤙", desc: "轻松自在" },
  { value: "elegant", label: "优雅", emoji: "✨", desc: "精致品味" },
];

const topicSuggestions = [
  { label: "好物分享", emoji: "🎁", prompt: "分享我最近入手的实用好物推荐" },
  { label: "探店打卡", emoji: "🏠", prompt: "探店分享：发现一家宝藏店铺" },
  { label: "穿搭灵感", emoji: "👗", prompt: "今日穿搭灵感分享" },
  { label: "美食制作", emoji: "🍳", prompt: "在家也能轻松搞定的美食教程" },
  { label: "旅行攻略", emoji: "✈️", prompt: "超详细的旅行攻略分享" },
  { label: "护肤心得", emoji: "🧴", prompt: "亲测好用的护肤心得分享" },
  { label: "职场干货", emoji: "💼", prompt: "职场新人必看的干货分享" },
  { label: "生活日常", emoji: "☀️", prompt: "平凡日子里的闪光时刻" },
];

// Title length guidelines
const TITLE_MAX = 20;
const CONTENT_MIN = 50;
const CONTENT_MAX = 1000;

// ─── Trending Tag Pools (static, defined outside component) ──────────────

const trendingTagPools: Record<string, string[]> = {
  default: ["生活日常", "好物推荐", "干货分享", "宝藏发现", "必收藏", "亲测好用", "涨知识", "实用技巧"],
  好物: ["好物分享", "好物推荐", "必买清单", "种草", "平价好物", "实用好物", "好物测评", "居家好物", "提升幸福感"],
  探店: ["探店打卡", "美食探店", "宝藏店铺", "探店分享", "网红店", "美食推荐", "必吃榜", "排队美食"],
  穿搭: ["穿搭灵感", "日常穿搭", "显瘦穿搭", "通勤穿搭", "穿搭分享", "OOTD", "时尚穿搭", "早秋穿搭"],
  美食: ["美食制作", "家常菜", "快手菜", "减脂餐", "美食教程", "烘焙", "一人食", "懒人食谱"],
  旅行: ["旅行攻略", "旅游推荐", "周末去哪儿", "小众旅行", "旅行日记", "拍照打卡", "自由行", "出行攻略"],
  护肤: ["护肤心得", "护肤步骤", "平价护肤", "抗老", "美白", "敏感肌", "秋冬护肤", "成分党"],
  职场: ["职场干货", "工作效率", "面试技巧", "职场成长", "升职加薪", "办公好物", "职场穿搭", "副业"],
};

export function CreatorView() {
  const { selectedAccountId, setSelectedAccountId, setAddAccountDialogOpen } =
    useAppStore();

  const [accounts, setAccounts] = useState<(XhsAccountInfo & { postsCount?: number })[]>([]);
  const [drafts, setDrafts] = useState<ContentDraftInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Generation form
  const [topic, setTopic] = useState("");
  const [selectedTone, setSelectedTone] = useState<QuickTone>("default");
  const [generating, setGenerating] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [optimizingTags, setOptimizingTags] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [showTopicSuggestions, setShowTopicSuggestions] = useState(false);

  // Generated content
  const [generatedTitle, setGeneratedTitle] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [generatedTags, setGeneratedTags] = useState<string[]>([]);
  const [generatedCoverPrompt, setGeneratedCoverPrompt] = useState("");
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [newTag, setNewTag] = useState("");

  // Content quality score
  const contentQuality = useMemo(() => {
    if (!generatedContent) return 0;
    let score = 0;
    if (generatedTitle.length > 0 && generatedTitle.length <= TITLE_MAX) score += 25;
    if (generatedContent.length >= CONTENT_MIN) score += 25;
    if (generatedTags.length >= 3) score += 25;
    if (generatedCoverPrompt.length > 5) score += 25;
    return score;
  }, [generatedTitle, generatedContent, generatedTags, generatedCoverPrompt]);

  const qualityLabel = contentQuality >= 75 ? "优秀" : contentQuality >= 50 ? "良好" : contentQuality >= 25 ? "待完善" : "未开始";
  const qualityColor = contentQuality >= 75 ? "text-emerald-600" : contentQuality >= 50 ? "text-amber-600" : contentQuality >= 25 ? "text-orange-500" : "text-muted-foreground";

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      loadDrafts(selectedAccountId);
    }
  }, [selectedAccountId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      if (data.success) {
        setAccounts(data.data || []);
        if (!selectedAccountId && data.data?.length > 0) {
          setSelectedAccountId(data.data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadDrafts = async (accountId: string) => {
    try {
      const res = await fetch(`/api/drafts?accountId=${accountId}`);
      const data = await res.json();
      if (data.success) setDrafts(data.data || []);
    } catch (err) {
      console.error("Failed to load drafts:", err);
    }
  };

  const handleGenerate = async () => {
    if (!selectedAccountId) {
      toast.error("请先选择账号");
      return;
    }
    if (!topic.trim()) {
      toast.error("请输入创作主题");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedAccountId,
          topic: topic.trim(),
          tone: selectedTone === "default" ? undefined : selectedTone,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const draft = data.data.draft;
        const generated = data.data.generated;
        setGeneratedTitle(generated.title || draft.title || "");
        setGeneratedContent(generated.content || draft.content || "");
        setGeneratedTags(generated.tags || draft.tags || []);
        setGeneratedCoverPrompt(generated.coverPrompt || draft.coverPrompt || "");
        setCurrentDraftId(draft.id || null);
        toast.success("内容生成成功！");
      } else {
        toast.error(data.error || "生成失败");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setGenerating(false);
    }
  };

  const handlePolish = async () => {
    if (!selectedAccountId || !generatedContent) return;

    setPolishing(true);
    try {
      const res = await fetch("/api/content/polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedAccountId,
          content: generatedContent,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setGeneratedContent(data.data.content || generatedContent);
        if (data.data.title) setGeneratedTitle(data.data.title);
        if (data.data.tags) setGeneratedTags(data.data.tags);
        toast.success("润色完成！");
      } else {
        toast.error(data.error || "润色失败");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setPolishing(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedAccountId) return;

    setSavingDraft(true);
    try {
      if (currentDraftId) {
        const res = await fetch(`/api/drafts/${currentDraftId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: generatedTitle,
            content: generatedContent,
            tags: generatedTags,
            coverPrompt: generatedCoverPrompt,
            status: "draft",
          }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success("草稿已保存");
        } else {
          toast.error(data.error || "保存失败");
        }
      } else {
        const res = await fetch("/api/drafts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: selectedAccountId,
            title: generatedTitle,
            content: generatedContent,
            tags: generatedTags,
            coverPrompt: generatedCoverPrompt,
            status: "draft",
          }),
        });
        const data = await res.json();
        if (data.success) {
          setCurrentDraftId(data.data.id);
          toast.success("草稿已保存");
        } else {
          toast.error(data.error || "保存失败");
        }
      }
      loadDrafts(selectedAccountId);
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setSavingDraft(false);
    }
  };

  const handleCopy = async () => {
    const text = `${generatedTitle}\n\n${generatedContent}\n\n${generatedTags.map((t) => `#${t}`).join(" ")}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("已复制到剪贴板");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteDraft = async (draftId: string) => {
    try {
      const res = await fetch(`/api/drafts/${draftId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("草稿已删除");
        loadDrafts(selectedAccountId!);
      }
    } catch {
      toast.error("删除失败");
    }
  };

  const handleLoadDraft = (draft: ContentDraftInfo) => {
    setGeneratedTitle(draft.title);
    setGeneratedContent(draft.content);
    setGeneratedTags(draft.tags || []);
    setGeneratedCoverPrompt(draft.coverPrompt || "");
    setCurrentDraftId(draft.id);
    toast.success("草稿已加载");
  };

  const addTag = (val?: string) => {
    const tagVal = val || newTag.trim();
    if (tagVal && !generatedTags.includes(tagVal)) {
      setGeneratedTags([...generatedTags, tagVal]);
      setNewTag("");
    }
  };

  const removeTag = (index: number) => {
    setGeneratedTags(generatedTags.filter((_, i) => i !== index));
  };

  const resetEditor = () => {
    setGeneratedTitle("");
    setGeneratedContent("");
    setGeneratedTags([]);
    setGeneratedCoverPrompt("");
    setCurrentDraftId(null);
  };

  // ─── AI Hashtag Optimization ────────────────────────────────────────────

  const suggestedTags = useMemo(() => {
    const content = (topic + " " + generatedTitle + " " + generatedContent).toLowerCase();
    let tags: string[] = [];

    // Match topic to tag pool
    for (const [keyword, pool] of Object.entries(trendingTagPools)) {
      if (keyword !== "default" && content.includes(keyword)) {
        tags = [...tags, ...pool];
      }
    }

    // Always include default pool
    tags = [...tags, ...trendingTagPools.default];

    // Remove duplicates and already-added tags
    const unique = [...new Set(tags)].filter((t) => !generatedTags.includes(t));
    return unique.slice(0, 8);
  }, [topic, generatedTitle, generatedContent, generatedTags]);

  const handleOptimizeTags = useCallback(async () => {
    if (!generatedContent) return;
    setOptimizingTags(true);

    // Simulate AI analysis with 1-2s delay
    await new Promise((resolve) => setTimeout(resolve, 1200 + Math.random() * 800));

    const content = (topic + " " + generatedTitle + " " + generatedContent).toLowerCase();
    let trendingTags: string[] = [];

    for (const [keyword, pool] of Object.entries(trendingTagPools)) {
      if (keyword !== "default" && content.includes(keyword)) {
        trendingTags = [...trendingTags, ...pool.slice(0, 3)];
      }
    }

    // Add some default trending tags if no matches
    if (trendingTags.length < 3) {
      trendingTags = [...trendingTags, ...trendingTagPools.default.slice(0, 3)];
    }

    // Remove duplicates and already-existing tags
    const newTags = [...new Set(trendingTags)].filter((t) => !generatedTags.includes(t)).slice(0, 3);

    // Reorder: trending first, then existing
    const optimizedTags = [...newTags, ...generatedTags];
    setGeneratedTags(optimizedTags);
    setOptimizingTags(false);
    toast.success(`标签已优化！新增${newTags.length}个热门标签`);
  }, [topic, generatedTitle, generatedContent, generatedTags]);

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6 view-animate">
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="p-4 md:p-6 view-animate">
        <EmptyState
          icon={Sparkles}
          title="还没有添加账号"
          description="添加小红书账号后，即可开始AI创作"
          actionLabel="添加账号"
          onAction={() => setAddAccountDialogOpen(true)}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5 custom-scrollbar overflow-y-auto h-full pb-20 md:pb-6 view-animate">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">AI 创作助手</h2>
          <p className="text-sm text-muted-foreground mt-0.5">智能内容生成与润色</p>
        </div>
        <select
          value={selectedAccountId || ""}
          onChange={(e) => setSelectedAccountId(e.target.value)}
          className="text-sm border border-border rounded-lg px-3 py-1.5 bg-white dark:bg-neutral-950"
        >
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.nickname || "未命名用户"}
            </option>
          ))}
        </select>
      </div>

      {/* Generate Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-xhs" />
            生成内容
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium">创作主题</Label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="输入你想创作的内容主题，例如：分享我的居家好物推荐..."
              className="h-10"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !generating) handleGenerate();
              }}
            />
            {/* Topic suggestions */}
            <div>
              <button
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-xhs transition-colors"
                onClick={() => setShowTopicSuggestions(!showTopicSuggestions)}
              >
                <Lightbulb className="w-3 h-3" />
                需要灵感？
                {showTopicSuggestions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {showTopicSuggestions && (
                <div className="mt-2 flex flex-wrap gap-1.5 p-3 bg-muted/30 rounded-xl border border-border/50">
                  {topicSuggestions.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => setTopic(s.prompt)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-border/60 text-xs hover:border-xhs/30 hover:bg-xhs-light/30 hover:text-xhs transition-all"
                    >
                      <span>{s.emoji}</span>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">语气风格</Label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {toneOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedTone(opt.value)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all text-xs",
                    selectedTone === opt.value
                      ? "border-xhs bg-xhs-light text-xhs shadow-sm shadow-xhs/10"
                      : "border-border hover:border-xhs/30 hover:bg-muted/50"
                  )}
                >
                  <span className="text-lg">{opt.emoji}</span>
                  <span className="font-medium">{opt.label}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight hidden sm:block">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating || !topic.trim()}
            className="w-full bg-xhs hover:bg-xhs-dark text-white shadow-sm shadow-xhs/20 h-10"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                AI创作中，请稍候...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-1.5" />
                开始创作
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Editor Section */}
      {(generatedContent || generating) && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <PenLine className="w-4 h-4" />
                编辑内容
                {contentQuality > 0 && (
                  <Badge variant="secondary" className={cn("text-[10px] border-0", qualityColor)}>
                    {qualityLabel} · {contentQuality}分
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  disabled={!generatedContent}
                  className="border-border text-xs"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 mr-1" />
                  )}
                  {copied ? "已复制" : "复制"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={resetEditor}
                  className="border-border text-xs"
                >
                  清空
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {generating ? (
              <div className="space-y-3 py-4">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-xhs-light flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-xhs animate-pulse" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">AI正在创作中</p>
                    <p className="text-xs text-muted-foreground mt-1">正在分析主题、生成标题和内容...</p>
                  </div>
                  <div className="w-48">
                    <Progress value={undefined} className="h-1.5" />
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Quality score bar */}
                {contentQuality > 0 && (
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium">内容完善度</span>
                      <span className={cn("text-xs font-bold", qualityColor)}>{contentQuality}%</span>
                    </div>
                    <Progress value={contentQuality} className="h-1.5" />
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                      <span className={cn(generatedTitle.length > 0 && "text-emerald-600")}>
                        {generatedTitle.length > 0 ? "✓" : "○"} 标题
                      </span>
                      <span className={cn(generatedContent.length >= CONTENT_MIN && "text-emerald-600")}>
                        {generatedContent.length >= CONTENT_MIN ? "✓" : "○"} 正文
                      </span>
                      <span className={cn(generatedTags.length >= 3 && "text-emerald-600")}>
                        {generatedTags.length >= 3 ? "✓" : "○"} 标签
                      </span>
                      <span className={cn(generatedCoverPrompt.length > 5 && "text-emerald-600")}>
                        {generatedCoverPrompt.length > 5 ? "✓" : "○"} 封面提示
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <Type className="w-3 h-3" />
                      标题
                    </Label>
                    <span className={cn(
                      "text-[10px]",
                      generatedTitle.length > TITLE_MAX ? "text-red-500 font-medium" : "text-muted-foreground"
                    )}>
                      {generatedTitle.length}/{TITLE_MAX}
                    </span>
                  </div>
                  <Input
                    value={generatedTitle}
                    onChange={(e) => setGeneratedTitle(e.target.value)}
                    placeholder="输入标题..."
                    className={cn(
                      generatedTitle.length > TITLE_MAX && "border-red-300 focus-visible:ring-red-300"
                    )}
                  />
                  {generatedTitle.length > TITLE_MAX && (
                    <p className="text-[10px] text-red-500">标题建议不超过{TITLE_MAX}字，小红书展示效果更好</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <BookOpen className="w-3 h-3" />
                      正文
                    </Label>
                    <span className={cn(
                      "text-[10px]",
                      generatedContent.length > CONTENT_MAX ? "text-red-500 font-medium" : "text-muted-foreground"
                    )}>
                      {generatedContent.length}/{CONTENT_MAX}
                    </span>
                  </div>
                  <Textarea
                    value={generatedContent}
                    onChange={(e) => setGeneratedContent(e.target.value)}
                    placeholder="内容正文..."
                    rows={8}
                    className="resize-y"
                  />
                  {generatedContent.length > 0 && generatedContent.length < CONTENT_MIN && (
                    <p className="text-[10px] text-amber-500">建议正文不少于{CONTENT_MIN}字，内容更丰富</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <Hash className="w-3 h-3" />
                    标签
                  </Label>
                  {generatedTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {generatedTags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="gap-1 text-xs border-0 bg-xhs-light/60 text-xhs/80">
                          #{tag}
                          <button onClick={() => removeTag(i)} className="hover:text-xhs transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="添加标签"
                      className="text-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                    />
                    <Button size="sm" variant="outline" onClick={() => addTag()} className="shrink-0 border-border">
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* Hashtag Suggestions Panel */}
                  {suggestedTags.length > 0 && (
                    <div className="bg-muted/30 rounded-xl p-3 space-y-2">
                      <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" />
                        推荐标签
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {suggestedTags.map((tag) => {
                          const isAlreadyAdded = generatedTags.includes(tag);
                          return (
                            <button
                              key={tag}
                              onClick={() => !isAlreadyAdded && addTag(tag)}
                              disabled={isAlreadyAdded}
                              className={cn(
                                "badge-animate-in px-2.5 py-1 rounded-full text-xs transition-all duration-200 border",
                                isAlreadyAdded
                                  ? "bg-muted/50 text-muted-foreground/40 border-border/30 cursor-not-allowed line-through"
                                  : "bg-xhs-light/40 text-xhs/80 border-xhs/20 hover:bg-xhs-light/70 hover:text-xhs hover:border-xhs/40 cursor-pointer"
                              )}
                            >
                              #{tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <ImagePlus className="w-3 h-3" />
                    封面图提示词
                  </Label>
                  <Input
                    value={generatedCoverPrompt}
                    onChange={(e) => setGeneratedCoverPrompt(e.target.value)}
                    placeholder="描述封面图的画面内容..."
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePolish}
                    disabled={polishing || !generatedContent}
                    className="border-border text-xs"
                  >
                    {polishing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                        润色中...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3.5 h-3.5 mr-1" />
                        AI润色
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOptimizeTags}
                    disabled={optimizingTags || !generatedContent}
                    className="border-border text-xs"
                  >
                    {optimizingTags ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                        优化中...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 mr-1" />
                        优化标签
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    className="bg-xhs hover:bg-xhs-dark text-white shadow-sm shadow-xhs/20 text-xs"
                    onClick={handleSaveDraft}
                    disabled={savingDraft}
                  >
                    {savingDraft ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5 mr-1" />
                        保存草稿
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Drafts List */}
      {drafts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4" />
              我的草稿 ({drafts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer",
                    currentDraftId === draft.id ? "border-xhs/30 bg-xhs-light/20" : "border-border hover:bg-muted/30"
                  )}
                  onClick={() => handleLoadDraft(draft)}
                >
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {draft.title || "无标题草稿"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant={
                          draft.status === "ready"
                            ? "default"
                            : draft.status === "polishing"
                            ? "secondary"
                            : "outline"
                        }
                        className="text-[10px]"
                      >
                        {draft.status === "draft"
                          ? "草稿"
                          : draft.status === "polishing"
                          ? "润色中"
                          : draft.status === "ready"
                          ? "就绪"
                          : "已发布"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(draft.updatedAt).toLocaleDateString("zh-CN")}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDraft(draft.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


