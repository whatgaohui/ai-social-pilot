"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/empty-state";
import { useAppStore } from "@/store/app-store";
import type { XhsAccountInfo, ContentDraftInfo } from "@/types";
import { toast } from "sonner";
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
} from "lucide-react";

type QuickTone = "default" | "warm" | "professional" | "witty" | "casual" | "elegant";

const toneOptions: { value: QuickTone; label: string; emoji: string }[] = [
  { value: "default", label: "默认", emoji: "🎯" },
  { value: "warm", label: "温暖", emoji: "😊" },
  { value: "professional", label: "专业", emoji: "💼" },
  { value: "witty", label: "幽默", emoji: "😄" },
  { value: "casual", label: "随性", emoji: "🤙" },
  { value: "elegant", label: "优雅", emoji: "✨" },
];

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
  const [savingDraft, setSavingDraft] = useState(false);

  // Generated content
  const [generatedTitle, setGeneratedTitle] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [generatedTags, setGeneratedTags] = useState<string[]>([]);
  const [generatedCoverPrompt, setGeneratedCoverPrompt] = useState("");
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [newTag, setNewTag] = useState("");

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
        // Update existing draft
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
        // Create new draft
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
  };

  const addTag = () => {
    const val = newTag.trim();
    if (val && !generatedTags.includes(val)) {
      setGeneratedTags([...generatedTags, val]);
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

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="p-4 md:p-6">
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
    <div className="p-4 md:p-6 space-y-6 custom-scrollbar overflow-y-auto h-full pb-20 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">AI 创作助手</h2>
        <select
          value={selectedAccountId || ""}
          onChange={(e) => setSelectedAccountId(e.target.value)}
          className="text-sm border rounded-lg px-3 py-1.5 bg-background"
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
              onKeyDown={(e) => {
                if (e.key === "Enter" && !generating) handleGenerate();
              }}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">语气风格</Label>
            <div className="flex flex-wrap gap-2">
              {toneOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedTone(opt.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-all ${
                    selectedTone === opt.value
                      ? "border-xhs bg-xhs-light text-xhs"
                      : "border-border hover:border-xhs/30"
                  }`}
                >
                  <span>{opt.emoji}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating || !topic.trim()}
            className="w-full bg-xhs hover:bg-xhs-dark text-white"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                AI创作中...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-1" />
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
              <CardTitle className="text-sm font-semibold">编辑内容</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  disabled={!generatedContent}
                >
                  {copied ? (
                    <Check className="w-4 h-4 mr-1 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 mr-1" />
                  )}
                  复制
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={resetEditor}
                >
                  清空
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {generating ? (
              <div className="space-y-3">
                <Skeleton className="h-8 rounded" />
                <Skeleton className="h-32 rounded" />
                <Skeleton className="h-8 rounded w-1/2" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">标题</Label>
                  <Input
                    value={generatedTitle}
                    onChange={(e) => setGeneratedTitle(e.target.value)}
                    placeholder="输入标题..."
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">正文</Label>
                  <Textarea
                    value={generatedContent}
                    onChange={(e) => setGeneratedContent(e.target.value)}
                    placeholder="内容正文..."
                    rows={8}
                    className="resize-y"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">标签</Label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {generatedTags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="gap-1 text-xs">
                        #{tag}
                        <button onClick={() => removeTag(i)} className="hover:text-xhs">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
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
                    <Button size="sm" variant="outline" onClick={addTag}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">封面图提示词</Label>
                  <Input
                    value={generatedCoverPrompt}
                    onChange={(e) => setGeneratedCoverPrompt(e.target.value)}
                    placeholder="描述封面图的画面内容..."
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePolish}
                    disabled={polishing || !generatedContent}
                  >
                    {polishing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        润色中...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-1" />
                        AI润色
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    className="bg-xhs hover:bg-xhs-dark text-white"
                    onClick={handleSaveDraft}
                    disabled={savingDraft}
                  >
                    {savingDraft ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-1" />
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
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleLoadDraft(draft)}
                >
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
                        className="text-xs"
                      >
                        {draft.status === "draft"
                          ? "草稿"
                          : draft.status === "polishing"
                          ? "润色中"
                          : draft.status === "ready"
                          ? "就绪"
                          : "已发布"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(draft.updatedAt).toLocaleDateString("zh-CN")}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
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
