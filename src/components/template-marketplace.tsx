"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Star,
  StarHalf,
  Sparkles,
  Copy,
  Check,
  Heart,
  Eye,
  Use,
  Plus,
  Pencil,
  Trash2,
  Filter,
  TrendingUp,
  Clock,
  Award,
  X,
  Wand2,
  Loader2,
  LayoutGrid,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Template {
  id: string;
  title: string;
  platform: string;
  category: string;
  content: string;
  tone: string;
  contentType: string;
  tags: string[];
  isPublic: boolean;
  isFeatured: boolean;
  usageCount: number;
  rating: number;
  preview: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  "日常分享",
  "专业干货",
  "好物种草",
  "教程攻略",
  "生活Vlog",
  "职场成长",
  "情感共鸣",
  "互动话题",
  "节日营销",
];

const PLATFORM_LABELS: Record<string, string> = {
  wechat: "朋友圈",
  xiaohongshu: "小红书",
};

const PLATFORM_COLORS: Record<string, string> = {
  wechat: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  xiaohongshu: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

const TONE_LABELS: Record<string, string> = {
  professional: "专业严谨",
  humorous: "轻松幽默",
  warm: "温馨治愈",
  inspirational: "励志正能量",
  emotional: "情感共鸣",
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  text: "纯文字",
  image: "图文搭配",
  video: "视频动态",
  mixed: "混合内容",
};

const SORT_OPTIONS = [
  { value: "newest", label: "最新", icon: Clock },
  { value: "popular", label: "最热", icon: TrendingUp },
  { value: "rating", label: "评分最高", icon: Star },
];

// ─── Animation ───────────────────────────────────────────────────────────────

const fadeInUp = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.98 },
};

// ─── Rating Stars ────────────────────────────────────────────────────────────

function RatingStars({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.3;
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(<Star key={i} className={`${iconSize} fill-amber-400 text-amber-400`} />);
    } else if (i === fullStars && hasHalf) {
      stars.push(<StarHalf key={i} className={`${iconSize} fill-amber-400 text-amber-400`} />);
    } else {
      stars.push(<Star key={i} className={`${iconSize} text-muted-foreground/30`} />);
    }
  }
  return <div className="flex items-center gap-0.5">{stars}</div>;
}

// ─── Template Card ───────────────────────────────────────────────────────────

interface TemplateCardProps {
  template: Template;
  onPreview: (t: Template) => void;
  onUse: (t: Template) => void;
  onFavorite: (id: string) => void;
  favorites: Set<string>;
}

function TemplateCard({ template, onPreview, onUse, onFavorite, favorites }: TemplateCardProps) {
  const isFav = favorites.has(template.id);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(template.content);
    setCopied(true);
    toast.success("已复制到剪贴板");
    setTimeout(() => setCopied(false), 1500);
  }, [template.content]);

  return (
    <motion.div
      layout
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="template-card group relative rounded-xl border border-border/60 bg-card/80 hover:border-violet-300/50 dark:hover:border-violet-700/50 hover:shadow-lg transition-all duration-200 overflow-hidden cursor-pointer"
    >
      {/* Featured badge */}
      {template.isFeatured && (
        <div className="featured-badge absolute top-2 right-2 z-10">
          <Award className="h-3 w-3 mr-0.5" />
          精选
        </div>
      )}

      <div className="p-4">
        {/* Top row: badges */}
        <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
          <span className={`template-badge text-[9px] px-1.5 py-0.5 rounded-md font-medium ${PLATFORM_COLORS[template.platform] || ""}`}>
            {PLATFORM_LABELS[template.platform] || template.platform}
          </span>
          <span className="template-badge text-[9px] px-1.5 py-0.5 rounded-md font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
            {template.category}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold mb-1.5 line-clamp-1 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
          {template.title}
        </h3>

        {/* Preview snippet */}
        <p className="template-preview text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
          {template.preview}
        </p>

        {/* Meta: tone, content type */}
        <div className="flex items-center gap-2 mb-3">
          {template.tone && (
            <span className="text-[9px] text-muted-foreground">风格: {TONE_LABELS[template.tone] || template.tone}</span>
          )}
          <span className="text-[9px] text-muted-foreground">·</span>
          <span className="text-[9px] text-muted-foreground">{CONTENT_TYPE_LABELS[template.contentType] || template.contentType}</span>
        </div>

        {/* Rating + Usage */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <RatingStars rating={template.rating} />
            <span className="text-[10px] text-muted-foreground tabular-nums">{template.rating.toFixed(1)}</span>
          </div>
          <span className="usage-count text-[9px] text-muted-foreground flex items-center gap-0.5">
            <TrendingUp className="h-2.5 w-2.5" />
            {template.usageCount > 1000 ? `${(template.usageCount / 1000).toFixed(1)}k` : template.usageCount}次使用
          </span>
        </div>

        {/* Action buttons (show on hover) */}
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[10px] flex-1 bg-violet-500 hover:bg-violet-600 text-white"
            onClick={(e) => { e.stopPropagation(); onUse(template); }}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            使用
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[10px] flex-1"
            onClick={(e) => { e.stopPropagation(); onPreview(template); }}
          >
            <Eye className="h-3 w-3 mr-1" />
            预览
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={`h-7 w-7 p-0 ${isFav ? "text-rose-500" : ""}`}
            onClick={(e) => { e.stopPropagation(); onFavorite(template.id); }}
          >
            <Heart className={`h-3 w-3 ${isFav ? "fill-rose-500" : ""}`} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={(e) => { e.stopPropagation(); handleCopy(); }}
          >
            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Create/Edit Template Dialog ─────────────────────────────────────────────

interface TemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTemplate?: Template | null;
  onSuccess: () => void;
}

function TemplateFormDialog({ open, onOpenChange, editTemplate, onSuccess }: TemplateFormDialogProps) {
  const [form, setForm] = useState({
    title: "",
    platform: "wechat",
    category: "日常分享",
    content: "",
    tone: "professional",
    contentType: "text",
    tags: "",
    isPublic: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editTemplate) {
      setForm({
        title: editTemplate.title,
        platform: editTemplate.platform,
        category: editTemplate.category,
        content: editTemplate.content,
        tone: editTemplate.tone,
        contentType: editTemplate.contentType,
        tags: editTemplate.tags.join(", "),
        isPublic: editTemplate.isPublic,
      });
    } else {
      setForm({
        title: "",
        platform: "wechat",
        category: "日常分享",
        content: "",
        tone: "professional",
        contentType: "text",
        tags: "",
        isPublic: true,
      });
    }
  }, [editTemplate, open]);

  const handleSubmit = useCallback(async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("标题和内容不能为空");
      return;
    }

    setIsSubmitting(true);
    try {
      const body = {
        ...(editTemplate ? { id: editTemplate.id } : {}),
        title: form.title,
        platform: form.platform,
        category: form.category,
        content: form.content,
        tone: form.tone,
        contentType: form.contentType,
        tags: form.tags.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
        isPublic: form.isPublic,
      };

      const method = editTemplate ? "PUT" : "POST";
      const res = await fetch("/api/templates", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(editTemplate ? "模板已更新" : "模板已创建");
        onOpenChange(false);
        onSuccess();
      } else {
        const data = await res.json();
        toast.error(data.error || "操作失败");
      }
    } catch {
      toast.error("操作失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  }, [form, editTemplate, onOpenChange, onSuccess]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <Plus className="h-4 w-4 text-violet-500" />
            {editTemplate ? "编辑模板" : "创建模板"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            创建自定义内容模板，方便快速生成文案
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">模板标题</label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="例如：职场干货分享"
              className="text-sm h-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">平台</label>
              <Select value={form.platform} onValueChange={(v) => setForm((f) => ({ ...f, platform: v }))}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wechat">朋友圈</SelectItem>
                  <SelectItem value="xiaohongshu">小红书</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">分类</label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">模板内容</label>
            <Textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              placeholder="输入模板内容，使用 [变量名] 作为占位符..."
              className="text-xs min-h-[120px] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">语气风格</label>
              <Select value={form.tone} onValueChange={(v) => setForm((f) => ({ ...f, tone: v }))}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TONE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">内容类型</label>
              <Select value={form.contentType} onValueChange={(v) => setForm((f) => ({ ...f, contentType: v }))}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONTENT_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">标签（逗号分隔）</label>
            <Input
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="职场, 干货, 专业"
              className="text-sm h-9"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={isSubmitting || !form.title.trim() || !form.content.trim()}>
            {isSubmitting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
            {editTemplate ? "保存" : "创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Template Detail Dialog ──────────────────────────────────────────────────

interface TemplateDetailDialogProps {
  template: Template | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUse: (t: Template) => void;
  onAIRewrite: (t: Template) => void;
}

function TemplateDetailDialog({ template, open, onOpenChange, onUse, onAIRewrite }: TemplateDetailDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!template) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(template.content);
    setCopied(true);
    toast.success("已复制到剪贴板");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`template-badge text-[10px] px-2 py-0.5 rounded-md font-medium ${PLATFORM_COLORS[template.platform]}`}>
              {PLATFORM_LABELS[template.platform]}
            </span>
            <span className="template-badge text-[10px] px-2 py-0.5 rounded-md font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
              {template.category}
            </span>
            {template.isFeatured && (
              <span className="featured-badge text-[10px]">
                <Award className="h-3 w-3 mr-0.5" />
                精选
              </span>
            )}
          </div>
          <DialogTitle className="text-base">{template.title}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground flex items-center gap-3">
            <span>风格: {TONE_LABELS[template.tone] || template.tone}</span>
            <span>类型: {CONTENT_TYPE_LABELS[template.contentType] || template.contentType}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Content */}
        <div className="rounded-lg border border-border/60 bg-muted/30 p-4 my-2">
          <pre className="text-xs whitespace-pre-wrap leading-relaxed font-[inherit]">{template.content}</pre>
        </div>

        {/* Tags */}
        {template.tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {template.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[9px]">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <RatingStars rating={template.rating} size="md" />
            <span className="tabular-nums">{template.rating.toFixed(1)}</span>
          </div>
          <span className="usage-count flex items-center gap-0.5">
            <TrendingUp className="h-3 w-3" />
            {template.usageCount}次使用
          </span>
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          <Button size="sm" className="bg-violet-500 hover:bg-violet-600 text-white" onClick={() => onUse(template)}>
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            一键使用
          </Button>
          <Button size="sm" variant="outline" onClick={() => onAIRewrite(template)}>
            <Wand2 className="h-3.5 w-3.5 mr-1.5" />
            AI改写
          </Button>
          <Button size="sm" variant="outline" onClick={handleCopy}>
            {copied ? <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
            {copied ? "已复制" : "复制"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function TemplateMarketplace() {
  const { platform: currentPlatform } = useAppStore();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState("newest");
  const [activeTab, setActiveTab] = useState("marketplace");
  const [myTemplates, setMyTemplates] = useState<Template[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [total, setTotal] = useState(0);

  // Load favorites from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("template-favorites");
      if (saved) {
        try { setFavorites(new Set(JSON.parse(saved))); } catch { /* ignore */ }
      }
    }
  }, []);

  const saveFavorites = useCallback((favs: Set<string>) => {
    setFavorites(favs);
    if (typeof window !== "undefined") {
      localStorage.setItem("template-favorites", JSON.stringify([...favs]));
    }
  }, []);

  // Load marketplace templates
  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        platform: platformFilter,
        category: categoryFilter,
        search,
        sortBy,
        page: "1",
        limit: "50",
      });
      const res = await fetch(`/api/templates?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
        setTotal(data.total || 0);
      }
    } catch {
      toast.error("加载模板失败");
    } finally {
      setLoading(false);
    }
  }, [platformFilter, categoryFilter, search, sortBy]);

  // Load my custom templates
  const loadMyTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/templates?sortBy=newest&limit=100`);
      if (res.ok) {
        const data = await res.json();
        // Only show custom (non-featured) templates as "mine"
        setMyTemplates((data.templates || []).filter((t: Template) => !t.isFeatured));
      }
    } catch {
      toast.error("加载模板失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "marketplace") {
      loadTemplates();
    } else {
      loadMyTemplates();
    }
  }, [activeTab, loadTemplates, loadMyTemplates]);

  // Toggle favorite
  const toggleFavorite = useCallback((id: string) => {
    const newFavs = new Set(favorites);
    if (newFavs.has(id)) {
      newFavs.delete(id);
    } else {
      newFavs.add(id);
    }
    saveFavorites(newFavs);
  }, [favorites, saveFavorites]);

  // Use template — fill content editor
  const handleUseTemplate = useCallback((template: Template) => {
    // Copy template content to clipboard
    navigator.clipboard.writeText(template.content);
    toast.success("模板内容已复制，可粘贴到内容编辑器", {
      description: `已复制「${template.title}」模板`,
    });
    setPreviewTemplate(null);
  }, []);

  // AI Rewrite
  const handleAIRewrite = useCallback(async (template: Template) => {
    toast.info("AI正在改写模板...");
    setPreviewTemplate(null);
    try {
      const res = await fetch("/api/ai/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post: {
            content: template.content,
            contentType: template.contentType,
            topic: template.title,
            id: "",
          },
          platform: template.platform,
          feedback: `请基于以下模板改写一篇新内容，保持结构但换新内容：\n${template.content}`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        navigator.clipboard.writeText(data.content || "");
        toast.success("AI改写完成，已复制到剪贴板");
      }
    } catch {
      toast.error("AI改写失败");
    }
  }, []);

  // Delete template
  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/templates?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("模板已删除");
        loadMyTemplates();
      }
    } catch {
      toast.error("删除失败");
    }
  }, [loadMyTemplates]);

  // Featured templates
  const featuredTemplates = useMemo(() => templates.filter((t) => t.isFeatured), [templates]);

  const displayTemplates = activeTab === "marketplace" ? templates : myTemplates;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* ─── Marketplace Header ─── */}
      <div className="marketplace-header rounded-xl border border-border/60 bg-card/80 p-3 space-y-3">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索模板标题、内容、标签..."
            className="pl-9 h-9 text-xs"
          />
        </div>

        {/* Platform toggle */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground mr-1">平台</span>
          {["all", "wechat", "xiaohongshu"].map((p) => (
            <Button
              key={p}
              size="sm"
              variant={platformFilter === p ? "secondary" : "ghost"}
              className={`h-7 text-[10px] px-2.5 ${platformFilter === p ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300" : ""}`}
              onClick={() => setPlatformFilter(p)}
            >
              {p === "all" ? "全部" : PLATFORM_LABELS[p]}
            </Button>
          ))}

          {/* Sort */}
          <div className="ml-auto flex items-center gap-1">
            {SORT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <Button
                  key={opt.value}
                  size="sm"
                  variant={sortBy === opt.value ? "secondary" : "ghost"}
                  className={`h-7 text-[10px] px-2 gap-1 ${sortBy === opt.value ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300" : ""}`}
                  onClick={() => setSortBy(opt.value)}
                >
                  <Icon className="h-3 w-3" />
                  {opt.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Category filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
          <span className="text-[10px] text-muted-foreground shrink-0">分类</span>
          <Button
            size="sm"
            variant={!categoryFilter ? "secondary" : "ghost"}
            className={`h-6 text-[9px] px-2 shrink-0 ${!categoryFilter ? "bg-violet-500 text-white" : ""}`}
            onClick={() => setCategoryFilter("")}
          >
            全部
          </Button>
          {CATEGORIES.map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={categoryFilter === cat ? "secondary" : "ghost"}
              className={`h-6 text-[9px] px-2 shrink-0 ${categoryFilter === cat ? "bg-violet-500 text-white" : ""}`}
              onClick={() => setCategoryFilter(categoryFilter === cat ? "" : cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* ─── Tabs: Marketplace / My Templates ─── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full h-9 bg-muted/50 p-0.5">
          <TabsTrigger value="marketplace" className="flex-1 h-7 text-xs gap-1">
            <LayoutGrid className="h-3 w-3" />
            模板市场
            <span className="text-[9px] text-muted-foreground">({total})</span>
          </TabsTrigger>
          <TabsTrigger value="my" className="flex-1 h-7 text-xs gap-1">
            <Pencil className="h-3 w-3" />
            我的模板
          </TabsTrigger>
        </TabsList>

        <TabsContent value="marketplace" className="mt-3">
          {/* Featured Templates */}
          {featuredTemplates.length > 0 && !search && !categoryFilter && (
            <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Award className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-semibold">精选推荐</span>
                <span className="text-[9px] text-muted-foreground">每周更新</span>
              </div>
              <ScrollArea className="w-full">
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                  {featuredTemplates.map((t) => (
                    <TemplateCard
                      key={t.id}
                      template={t}
                      onPreview={setPreviewTemplate}
                      onUse={handleUseTemplate}
                      onFavorite={toggleFavorite}
                      favorites={favorites}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* All templates grid */}
          <div className="marketplace-grid grid grid-cols-2 lg:grid-cols-3 gap-3">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-48 rounded-xl bg-muted/40 animate-pulse" />
              ))
            ) : displayTemplates.length === 0 ? (
              <div className="col-span-full text-center py-8">
                <p className="text-sm text-muted-foreground">暂无匹配模板</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {displayTemplates.map((t) => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    onPreview={setPreviewTemplate}
                    onUse={handleUseTemplate}
                    onFavorite={toggleFavorite}
                    favorites={favorites}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        </TabsContent>

        <TabsContent value="my" className="mt-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground">自定义模板 ({myTemplates.length})</p>
            <Button size="sm" className="h-7 text-[10px]" onClick={() => { setEditTemplate(null); setCreateFormOpen(true); }}>
              <Plus className="h-3 w-3 mr-1" />
              创建模板
            </Button>
          </div>

          <div className="space-y-2">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 rounded-lg bg-muted/40 animate-pulse" />
              ))
            ) : myTemplates.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-2">还没有自定义模板</p>
                <Button size="sm" variant="outline" onClick={() => setCreateFormOpen(true)}>
                  <Plus className="h-3 w-3 mr-1" />
                  创建第一个模板
                </Button>
              </div>
            ) : (
              myTemplates.map((t) => (
                <div key={t.id} className="template-card flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-card/80 hover:border-violet-300/50 transition-all group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-medium truncate">{t.title}</h4>
                      <span className={`template-badge text-[8px] px-1 py-0 ${PLATFORM_COLORS[t.platform]}`}>
                        {PLATFORM_LABELS[t.platform]}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">{t.preview}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setPreviewTemplate(t)}>
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditTemplate(t)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => handleDelete(t.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── Dialogs ─── */}
      <TemplateDetailDialog
        template={previewTemplate}
        open={!!previewTemplate}
        onOpenChange={(open) => { if (!open) setPreviewTemplate(null); }}
        onUse={handleUseTemplate}
        onAIRewrite={handleAIRewrite}
      />

      <TemplateFormDialog
        open={createFormOpen || !!editTemplate}
        onOpenChange={(open) => { setCreateFormOpen(open); if (!open) setEditTemplate(null); }}
        editTemplate={editTemplate}
        onSuccess={activeTab === "marketplace" ? loadTemplates : loadMyTemplates}
      />
    </motion.div>
  );
}
