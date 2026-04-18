"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import type { ContentPost } from "@/types";
import { CONTENT_TYPE_LABELS, CONTENT_TYPE_COLORS, POST_STATUS_LABELS, XHS_CONTENT_TYPE_LABELS, XHS_CONTENT_TYPE_COLORS, ContentType, PostStatus, GenerationType, XHSContentType } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ABComparison } from "@/components/right-panel/ab-comparison";
import { HashtagRecommender } from "@/components/right-panel/hashtag-recommender";
import { CoverImageGenerator } from "@/components/right-panel/cover-image-generator";
import {
  Copy, Wand2, Check, Edit3, Send, Loader2, Sparkles,
  FileText, RefreshCw, MessageSquare, Upload, Lightbulb, Calendar,
  FileUp, Type, MessageCircle, Image, ChevronDown, ChevronUp,
  CalendarPlus
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export function CopywritingOutput() {
  const {
    contentPosts, selectedPostId, selectedDate,
    persona, knowledgeItems, updateContentPost, setSelectedPostId,
    currentPlan, addContentPost, platform,
  } = useAppStore();
  const isXHS = platform === 'xiaohongshu';

  const selectedPost = contentPosts.find(p => p.id === selectedPostId);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [optimizing, setOptimizing] = useState(false);

  // Polish mode
  const [polishInput, setPolishInput] = useState("");
  const [polishResult, setPolishResult] = useState("");
  const [polishing, setPolishing] = useState(false);

  // Fragment mode
  const [fragmentInput, setFragmentInput] = useState("");
  const [fragmentType, setFragmentType] = useState("conversation");
  const [fragmentResult, setFragmentResult] = useState("");
  const [fragmenting, setFragmenting] = useState(false);

  // Collapsible sections
  const [showPolish, setShowPolish] = useState(false);
  const [showFragment, setShowFragment] = useState(false);
  const [showPublish, setShowPublish] = useState(false);

  // Publish to calendar form
  const [pubTopic, setPubTopic] = useState("");
  const [pubContent, setPubContent] = useState("");
  const [pubContentType, setPubContentType] = useState<ContentType>("text");
  const [pubDate, setPubDate] = useState("");
  const [publishing, setPublishing] = useState(false);

  const startEdit = () => {
    if (selectedPost) {
      setEditContent(selectedPost.content);
      setEditing(true);
    }
  };

  const saveEdit = async () => {
    if (!selectedPost) return;
    try {
      const res = await fetch(`/api/content/${selectedPost.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      if (res.ok) {
        const updated = await res.json();
        updateContentPost(selectedPost.id, updated);
        setEditing(false);
        toast.success("内容已更新");
      }
    } catch {
      toast.error("更新失败");
    }
  };

  const handleOptimize = async () => {
    if (!selectedPost) return;
    setOptimizing(true);
    try {
      const res = await fetch("/api/ai/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post: selectedPost,
          persona,
          feedback: "",
          knowledgeItems,
          platform,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const updateRes = await fetch(`/api/content/${selectedPost.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: data.content,
            status: "optimized",
            aiScore: Math.min(98, selectedPost.aiScore + Math.floor(Math.random() * 5) + 3),
          }),
        });
        if (updateRes.ok) {
          const updated = await updateRes.json();
          updateContentPost(selectedPost.id, updated);
          toast.success("AI优化完成");
        }
      }
    } catch {
      toast.error("优化失败");
    } finally {
      setOptimizing(false);
    }
  };

  const handleStatusChange = async (status: PostStatus) => {
    if (!selectedPost) return;
    try {
      const res = await fetch(`/api/content/${selectedPost.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated = await res.json();
        updateContentPost(selectedPost.id, updated);
        toast.success(`状态已更新为${POST_STATUS_LABELS[status]}`);
      }
    } catch {
      toast.error("更新失败");
    }
  };

  const handleCopy = () => {
    const text = selectedPost?.content || polishResult;
    if (text) {
      navigator.clipboard.writeText(text);
      toast.success("已复制到剪贴板");
    }
  };

  const handlePolish = async () => {
    if (!polishInput.trim()) {
      toast.error("请输入需要润色的文字");
      return;
    }
    setPolishing(true);
    setPolishResult("");
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "polish",
          persona,
          knowledgeItems,
          existingContent: polishInput,
          platform,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPolishResult(data.content);
        toast.success(isXHS ? "笔记润色完成" : "润色完成");
      }
    } catch {
      toast.error("润色失败");
    } finally {
      setPolishing(false);
    }
  };

  const handleFragmentGenerate = async () => {
    if (!fragmentInput.trim()) {
      toast.error("请输入碎片内容");
      return;
    }
    setFragmenting(true);
    setFragmentResult("");
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "fragment",
          persona,
          knowledgeItems,
          material: {
            type: "text",
            content: fragmentInput,
            contentType: fragmentType,
          },
          platform,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setFragmentResult(data.content);
        toast.success(isXHS ? "碎片转化为笔记完成" : "碎片转化完成");
      }
    } catch {
      toast.error("转化失败");
    } finally {
      setFragmenting(false);
    }
  };

  const handlePublishToCalendar = async () => {
    if (!pubContent.trim()) {
      toast.error("请输入文案内容");
      return;
    }
    if (!pubTopic.trim()) {
      toast.error("请输入主题");
      return;
    }
    if (!pubDate) {
      toast.error("请选择发布日期");
      return;
    }
    if (!currentPlan?.id) {
      toast.error("请先生成内容计划");
      return;
    }

    setPublishing(true);
    try {
      const dateStr = format(new Date(pubDate), 'yyyy-MM-dd');
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: currentPlan.id,
          scheduledDate: dateStr,
          contentType: pubContentType,
          topic: pubTopic,
          content: pubContent,
          platform,
          status: "generated",
          generationType: "polish",
          likes: 0,
          comments: 0,
          shares: 0,
          views: 0,
          favorites: 0,
          aiScore: 0,
          feedback: "",
        }),
      });

      if (res.ok) {
        const newPost = await res.json();
        addContentPost(newPost);
        toast.success("已发布到日历！");
        setPubTopic("");
        setPubContent("");
        setPubDate("");
        setPubContentType("text");
        setShowPublish(false);
      } else {
        toast.error("发布失败，请重试");
      }
    } catch {
      toast.error("发布失败");
    } finally {
      setPublishing(false);
    }
  };

  const contentTypeOptions = isXHS
    ? (Object.entries(XHS_CONTENT_TYPE_LABELS) as [XHSContentType, string][]).map(([value, label]) => ({ value, label }))
    : (Object.entries(CONTENT_TYPE_LABELS) as [ContentType, string][]).map(([value, label]) => ({ value, label }));

  const getContentTypeColor = (ct: string) => {
    if (isXHS) return XHS_CONTENT_TYPE_COLORS[ct as XHSContentType] || '';
    return CONTENT_TYPE_COLORS[ct as ContentType] || '';
  };

  const getContentTypeLabel = (ct: string) => {
    if (isXHS) return XHS_CONTENT_TYPE_LABELS[ct as XHSContentType] || ct;
    return CONTENT_TYPE_LABELS[ct as ContentType] || ct;
  };

  const renderPublishForm = (compact?: boolean) => (
    <div className="space-y-2">
      <Input
        placeholder="输入主题"
        value={pubTopic}
        onChange={(e) => setPubTopic(e.target.value)}
        className="text-sm h-8"
      />
      <Textarea
        placeholder="输入文案内容..."
        value={pubContent}
        onChange={(e) => setPubContent(e.target.value)}
        className={`resize-none text-sm ${compact ? "min-h-[60px]" : "min-h-[80px]"}`}
      />
      <div className="flex gap-2">
        <div className="flex-1">
          <div className="flex flex-wrap gap-1">
            {contentTypeOptions.map((ct) => (
              <Button
                key={ct.value}
                variant={pubContentType === ct.value ? "secondary" : "ghost"}
                size="sm"
                className={`h-6 px-2 text-[10px] ${pubContentType === ct.value ? getContentTypeColor(ct.value) : ""}`}
                onClick={() => setPubContentType(ct.value)}
              >
                {ct.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
      <Input
        type="date"
        value={pubDate}
        onChange={(e) => setPubDate(e.target.value)}
        className="text-sm h-8"
      />
      <Button
        onClick={handlePublishToCalendar}
        disabled={publishing || !pubContent.trim() || !pubTopic.trim() || !pubDate}
        size="sm"
        className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
      >
        {publishing ? (
          <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" />发布中...</>
        ) : (
          <><CalendarPlus className="h-3 w-3 mr-1.5" />发布到日历</>
        )}
      </Button>
    </div>
  );

  // No post selected - show quick polish tool
  if (!selectedPost) {
    return (
      <div className="flex flex-col h-full">
        <ScrollArea className="flex-1 px-4 py-4">
          {/* Quick Polish Tool */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Wand2 className="h-4 w-4 text-amber-500" />
                  </div>
                  口水话润色
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <p className="text-xs text-muted-foreground">
                  {isXHS ? '把大白话粘贴进来，AI帮您优化成吸引人的小红书笔记' : '把大白话粘贴进来，AI帮您优化成优美的朋友圈文案'}
                </p>
                <Textarea
                  placeholder="粘贴您的日常文字..."
                  value={polishInput}
                  onChange={(e) => setPolishInput(e.target.value)}
                  className="min-h-[80px] resize-none text-sm"
                />
                <Button
                  onClick={handlePolish}
                  disabled={polishing || !polishInput.trim()}
                  size="sm"
                  className="w-full"
                >
                  {polishing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      AI润色中...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                      一键润色
                    </>
                  )}
                </Button>

                {polishResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="rounded-lg bg-background p-3 border relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">润色结果</span>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={handleCopy}>
                          <Copy className="h-3 w-3 mr-1" />
                          复制
                        </Button>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{polishResult}</p>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>

            {/* Fragment to Copy */}
            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <FileUp className="h-4 w-4 text-blue-500" />
                  </div>
                  碎片转文案
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <p className="text-xs text-muted-foreground">
                  {isXHS ? '粘贴日常对话、截图文字等碎片内容，AI转化为小红书笔记' : '粘贴日常对话、截图文字等碎片内容，AI转化为优质朋友圈文案'}
                </p>
                <Textarea
                  placeholder="粘贴对话记录、想法片段、聊天截图文字..."
                  value={fragmentInput}
                  onChange={(e) => setFragmentInput(e.target.value)}
                  className="min-h-[80px] resize-none text-sm"
                />
                <div className="flex gap-2">
                  {(["conversation", "experience", "question"] as const).map((type) => (
                    <Button
                      key={type}
                      variant={fragmentType === type ? "secondary" : "ghost"}
                      size="sm"
                      className="flex-1 h-7 text-[10px]"
                      onClick={() => setFragmentType(type)}
                    >
                      {type === "conversation" ? "💬 对话" : type === "experience" ? "📖 经历" : "❓ 疑问"}
                    </Button>
                  ))}
                </div>
                <Button
                  onClick={handleFragmentGenerate}
                  disabled={fragmenting || !fragmentInput.trim()}
                  size="sm"
                  className="w-full"
                >
                  {fragmenting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      AI转化中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                      转化为文案
                    </>
                  )}
                </Button>
                {fragmentResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="rounded-lg bg-background p-3 border relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">转化结果</span>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => {
                          navigator.clipboard.writeText(fragmentResult);
                          toast.success("已复制到剪贴板");
                        }}>
                          <Copy className="h-3 w-3 mr-1" />
                          复制
                        </Button>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{fragmentResult}</p>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>

            {/* Publish to Calendar */}
            <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <CalendarPlus className="h-4 w-4 text-emerald-500" />
                  </div>
                  发布到日历
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <p className="text-xs text-muted-foreground">
                  将文案直接创建为日历内容，快速排期发布
                </p>
                {!currentPlan?.id && (
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-2.5">
                    <p className="text-[10px] text-amber-600 dark:text-amber-400">
                      ⚠️ 请先生成内容计划后再发布
                    </p>
                  </div>
                )}
                {renderPublishForm(false)}
              </CardContent>
            </Card>

            {/* Hint */}
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <FileText className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm text-center">点击日历中的日期查看文案详情</p>
              <p className="text-xs mt-1 text-center">选中某天的内容后可以查看、编辑和AI优化</p>
            </div>
          </motion.div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-4 py-4">
        <motion.div
          key={selectedPost.id}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          {/* Post Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>{selectedPost.scheduledDate}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={getContentTypeColor(selectedPost.contentType)} variant="secondary">
                {getContentTypeLabel(selectedPost.contentType)}
              </Badge>
              <Badge variant="outline">{POST_STATUS_LABELS[selectedPost.status as PostStatus]}</Badge>
              {selectedPost.generationType === "auto" && (
                <Badge variant="outline" className="text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800">
                  <Sparkles className="h-3 w-3 mr-0.5" />
                  AI生成
                </Badge>
              )}
              {selectedPost.aiScore > 0 && (
                <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                  ★ {selectedPost.aiScore}分
                </Badge>
              )}
            </div>
            <h3 className="text-base font-semibold">{selectedPost.topic}</h3>
          </div>

          <Separator />

          {/* Content Area */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              {editing ? (
                <div className="space-y-3">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[150px] text-sm leading-relaxed resize-none"
                  />
                  <div className="flex gap-2">
                    <Button onClick={saveEdit} size="sm" className="flex-1">
                      <Check className="h-3.5 w-3.5 mr-1" />
                      保存
                    </Button>
                    <Button onClick={() => setEditing(false)} variant="outline" size="sm">
                      取消
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="relative group">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedPost.content}</p>
                  <div className="absolute top-0 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-7 px-2 shadow-sm"
                      onClick={handleCopy}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-7 px-2 shadow-sm"
                      onClick={startEdit}
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
              {/* Character count for Xiaohongshu */}
              {isXHS && (
                <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                  <span>字数统计</span>
                  <span className={selectedPost.content.length > 500 ? 'text-amber-500' : selectedPost.content.length < 200 ? 'text-red-400' : 'text-emerald-500'}>
                    {selectedPost.content.length} 字 {selectedPost.content.length < 200 ? '(偏短)' : selectedPost.content.length > 500 ? '(偏长)' : '(合适)'}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button
              onClick={handleOptimize}
              disabled={optimizing}
              variant="outline"
              className="w-full h-9 border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30"
            >
              {optimizing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  AI优化中...
                </>
              ) : (
                <>
                  <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                  AI智能优化
                </>
              )}
            </Button>

            <div className="grid grid-cols-3 gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => handleStatusChange("generated")}
                disabled={selectedPost.status === "published"}
              >
                <FileText className="h-3 w-3 mr-1" />
                生成
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border-emerald-200 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400"
                onClick={() => handleStatusChange("optimized")}
                disabled={selectedPost.status === "published"}
              >
                <Check className="h-3 w-3 mr-1" />
                优化
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => handleStatusChange("published")}
              >
                <Send className="h-3 w-3 mr-1" />
                发布
              </Button>
            </div>
          </div>

          <Separator />

          {/* Engagement Data (simulated) */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  互动数据
                </CardTitle>
                {(selectedPost.views === 0 || !selectedPost.views) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] text-muted-foreground"
                    onClick={async () => {
                      if (!selectedPost) return;
                      const data = {
                        views: Math.floor(Math.random() * 500) + 100,
                        likes: Math.floor(Math.random() * 50) + 5,
                        comments: Math.floor(Math.random() * 20),
                        shares: Math.floor(Math.random() * 10),
                        ...(isXHS ? { favorites: Math.floor(Math.random() * 30) + 2 } : {}),
                      };
                      const res = await fetch(`/api/content/${selectedPost.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(data),
                      });
                      if (res.ok) {
                        const updated = await res.json();
                        updateContentPost(selectedPost.id, updated);
                        toast.success("已生成模拟互动数据");
                      }
                    }}
                  >
                    <Sparkles className="h-3 w-3 mr-0.5" />
                    模拟数据
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className={`grid gap-2 ${isXHS ? 'grid-cols-5' : 'grid-cols-4'}`}>
                {[
                  { label: "浏览", value: selectedPost.views || "—" },
                  { label: "点赞", value: selectedPost.likes || "—" },
                  { label: "评论", value: selectedPost.comments || "—" },
                  ...(isXHS ? [{ label: "收藏", value: (selectedPost as Record<string, unknown>).favorites || "—" }] : []),
                  { label: "转发", value: selectedPost.shares || "—" },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-lg font-semibold">{stat.value}</div>
                    <div className="text-[10px] text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* A/B Comparison Test */}
          <ABComparison post={selectedPost} />

          {/* Hashtag Recommender - Xiaohongshu only */}
          {isXHS && (
            <HashtagRecommender
              postTopic={selectedPost.topic}
              postContent={selectedPost.content}
              onSelectHashtag={(tag) => {
                const updated = selectedPost.content + '\n#' + tag;
                setEditContent(updated);
              }}
            />
          )}

          {/* Cover Image Generator - Xiaohongshu only */}
          {isXHS && (
            <CoverImageGenerator
              postTopic={selectedPost.topic}
              postContent={selectedPost.content}
            />
          )}

          {/* Quick Tools - Collapsible */}
          <Collapsible open={showPolish} onOpenChange={setShowPolish}>
            <CollapsibleTrigger className="w-full">
              <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group/trig">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Wand2 className="h-4 w-4 text-amber-500" />
                    </div>
                    <span className="text-sm font-medium">口水话润色</span>
                  </div>
                  {showPolish ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </CardContent>
              </Card>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-1 pb-3 space-y-2">
                <Textarea
                  placeholder="粘贴大白话..."
                  value={polishInput}
                  onChange={(e) => setPolishInput(e.target.value)}
                  className="min-h-[60px] resize-none text-sm"
                />
                <Button
                  onClick={handlePolish}
                  disabled={polishing || !polishInput.trim()}
                  size="sm"
                  className="w-full h-8"
                >
                  {polishing ? (
                    <><Loader2 className="h-3 w-3 mr-1 animate-spin" />AI润色中...</>
                  ) : (
                    <><Wand2 className="h-3 w-3 mr-1" />一键润色</>
                  )}
                </Button>
                {polishResult && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-2.5 border border-amber-100 dark:border-amber-900/30 relative">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">润色结果</span>
                        <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]" onClick={() => { navigator.clipboard.writeText(polishResult); toast.success("已复制"); }}>
                          <Copy className="h-2.5 w-2.5 mr-0.5" />复制
                        </Button>
                      </div>
                      <p className="text-xs leading-relaxed whitespace-pre-wrap">{polishResult}</p>
                    </div>
                  </motion.div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={showFragment} onOpenChange={setShowFragment}>
            <CollapsibleTrigger className="w-full">
              <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <FileUp className="h-4 w-4 text-blue-500" />
                    </div>
                    <span className="text-sm font-medium">碎片转文案</span>
                  </div>
                  {showFragment ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </CardContent>
              </Card>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-1 pb-3 space-y-2">
                <Textarea
                  placeholder="粘贴对话/想法..."
                  value={fragmentInput}
                  onChange={(e) => setFragmentInput(e.target.value)}
                  className="min-h-[60px] resize-none text-sm"
                />
                <div className="flex gap-1.5">
                  {(["conversation", "experience", "question"] as const).map((type) => (
                    <Button
                      key={type}
                      variant={fragmentType === type ? "secondary" : "ghost"}
                      size="sm"
                      className="flex-1 h-7 text-[10px]"
                      onClick={() => setFragmentType(type)}
                    >
                      {type === "conversation" ? "💬 对话" : type === "experience" ? "📖 经历" : "❓ 疑问"}
                    </Button>
                  ))}
                </div>
                <Button
                  onClick={handleFragmentGenerate}
                  disabled={fragmenting || !fragmentInput.trim()}
                  size="sm"
                  className="w-full h-8"
                >
                  {fragmenting ? (
                    <><Loader2 className="h-3 w-3 mr-1 animate-spin" />AI转化中...</>
                  ) : (
                    <><Sparkles className="h-3 w-3 mr-1" />转化为文案</>
                  )}
                </Button>
                {fragmentResult && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-2.5 border border-blue-100 dark:border-blue-900/30 relative">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">转化结果</span>
                        <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]" onClick={() => { navigator.clipboard.writeText(fragmentResult); toast.success("已复制"); }}>
                          <Copy className="h-2.5 w-2.5 mr-0.5" />复制
                        </Button>
                      </div>
                      <p className="text-xs leading-relaxed whitespace-pre-wrap">{fragmentResult}</p>
                    </div>
                  </motion.div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Publish to Calendar - Collapsible in selected post view */}
          <Collapsible open={showPublish} onOpenChange={setShowPublish}>
            <CollapsibleTrigger className="w-full">
              <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <CalendarPlus className="h-4 w-4 text-emerald-500" />
                    </div>
                    <span className="text-sm font-medium">发布新内容到日历</span>
                  </div>
                  {showPublish ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </CardContent>
              </Card>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-1 pb-3">
                {!currentPlan?.id && (
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-2.5 mb-2">
                    <p className="text-[10px] text-amber-600 dark:text-amber-400">
                      ⚠️ 请先生成内容计划后再发布
                    </p>
                  </div>
                )}
                {renderPublishForm(true)}
              </div>
            </CollapsibleContent>
          </Collapsible>

        </motion.div>
      </ScrollArea>
    </div>
  );
}
