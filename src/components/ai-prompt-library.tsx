"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Copy,
  Check,
  Plus,
  Search,
  Wand2,
  BookOpen,
  PenTool,
  MessageCircle,
  BarChart3,
  Lightbulb,
  Type,
  Loader2,
  ChevronDown,
  X,
  Trash2,
  Pencil,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/store/app-store";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PromptItem {
  id: string;
  title: string;
  description: string;
  category: string;
  prompt: string;
  difficulty: "初级" | "中级" | "高级";
  usageCount: number;
  isBuiltIn?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PROMPT_CATEGORIES = [
  { id: "content-generation", label: "内容生成", icon: PenTool, color: "text-violet-500", bg: "bg-violet-100 dark:bg-violet-900/30" },
  { id: "title-optimization", label: "标题优化", icon: Type, color: "text-amber-500", bg: "bg-amber-100 dark:bg-amber-900/30" },
  { id: "copy-polishing", label: "文案润色", icon: BookOpen, color: "text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  { id: "data-analysis", label: "数据分析", icon: BarChart3, color: "text-sky-500", bg: "bg-sky-100 dark:bg-sky-900/30" },
  { id: "creative-inspiration", label: "创意灵感", icon: Lightbulb, color: "text-rose-500", bg: "bg-rose-100 dark:bg-rose-900/30" },
];

const DIFFICULTY_STYLES: Record<string, string> = {
  初级: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  中级: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  高级: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

// ─── Built-in Prompts ────────────────────────────────────────────────────────

const BUILT_IN_PROMPTS: PromptItem[] = [
  // 内容生成
  {
    id: "builtin-cg-1",
    title: "朋友圈日常分享",
    description: "生成自然亲切的朋友圈日常文案",
    category: "content-generation",
    prompt: "你是一位社交媒体运营专家。请根据以下信息生成一条自然、有温度的朋友圈文案：\n\n主题：{topic}\n语气：{tone}\n人设：{persona}\n\n要求：\n1. 字数控制在100-300字\n2. 适当使用1-3个emoji\n3. 语气自然不做作\n4. 结尾可以引导互动\n5. 避免明显的营销感",
    difficulty: "初级",
    usageCount: 3420,
    isBuiltIn: true,
  },
  {
    id: "builtin-cg-2",
    title: "小红书种草笔记",
    description: "生成吸引人的小红书种草内容",
    category: "content-generation",
    prompt: "你是一位小红书爆款内容创作者。请根据以下信息生成一篇种草笔记：\n\n产品/主题：{topic}\n目标受众：{audience}\n核心卖点：{keyPoints}\n\n要求：\n1. 标题要有吸引力，包含emoji\n2. 正文300-800字，分段清晰\n3. 使用要点列表格式\n4. 真实感强，像亲身经历\n5. 结尾添加3-5个相关话题标签\n6. 适当使用emoji增加趣味性",
    difficulty: "中级",
    usageCount: 2850,
    isBuiltIn: true,
  },
  {
    id: "builtin-cg-3",
    title: "专业知识分享",
    description: "生成有深度的专业干货内容",
    category: "content-generation",
    prompt: "你是一位行业专家。请根据以下信息生成一篇专业的知识分享内容：\n\n专业领域：{field}\n主题：{topic}\n知识素材：{knowledge}\n\n要求：\n1. 深入浅出，专业但不晦涩\n2. 有实际案例或数据支撑\n3. 结构清晰，3-5个核心要点\n4. 字数200-500字\n5. 结尾有可行动的建议\n6. 展现专业性和思考深度",
    difficulty: "高级",
    usageCount: 1960,
    isBuiltIn: true,
  },
  {
    id: "builtin-cg-4",
    title: "互动话题生成",
    description: "生成引发讨论和互动的话题",
    category: "content-generation",
    prompt: "你是一位社交媒体互动专家。请生成一条能引发评论讨论的朋友圈内容：\n\n话题方向：{topic}\n平台：{platform}\n\n要求：\n1. 以提问或投票形式开篇\n2. 提供A/B选项或开放性问题\n3. 自己先给出一个选择和理由\n4. 语气轻松有趣\n5. 引导用户在评论区参与\n6. 字数50-200字",
    difficulty: "初级",
    usageCount: 2100,
    isBuiltIn: true,
  },
  {
    id: "builtin-cg-5",
    title: "故事型内容",
    description: "用故事叙述的方式创作内容",
    category: "content-generation",
    prompt: "你是一位优秀的讲故事的人。请根据以下信息创作一篇故事型内容：\n\n核心主题：{topic}\n情感基调：{tone}\n\n要求：\n1. 以一个引人入胜的场景或时间开头\n2. 有转折或对比\n3. 语言有画面感\n4. 结尾有情感升华或感悟\n5. 字数200-400字\n6. 让读者产生共鸣",
    difficulty: "中级",
    usageCount: 1680,
    isBuiltIn: true,
  },
  // 标题优化
  {
    id: "builtin-to-1",
    title: "爆款标题生成",
    description: "生成多种风格的高点击率标题",
    category: "title-optimization",
    prompt: "你是一位标题优化专家。请为以下内容生成5个不同风格的吸引人标题：\n\n内容主题：{topic}\n平台：{platform}\n\n请分别生成：\n1. 悬念式标题（制造好奇心）\n2. 数字式标题（带具体数字）\n3. 对比式标题（制造反差感）\n4. 痛点式标题（直击用户需求）\n5. 情感式标题（引发共鸣）\n\n每个标题15字以内，要求：\n- 不做标题党\n- 信息量清晰\n- 有吸引点击的元素",
    difficulty: "中级",
    usageCount: 2400,
    isBuiltIn: true,
  },
  {
    id: "builtin-to-2",
    title: "标题A/B测试方案",
    description: "生成对比标题用于测试效果",
    category: "title-optimization",
    prompt: "你是一位A/B测试专家。请为以下内容生成3组对比标题，每组两个版本：\n\n内容主题：{topic}\n目标受众：{audience}\n\n每组标题应测试不同假设：\n第1组：理性 vs 感性\n第2组：问句 vs 陈述句\n第3组：具体数字 vs 抽象描述\n\n每个标题20字以内，并说明该组测试的假设。",
    difficulty: "高级",
    usageCount: 1200,
    isBuiltIn: true,
  },
  {
    id: "builtin-to-3",
    title: "标题诊断优化",
    description: "分析现有标题并给出优化建议",
    category: "title-optimization",
    prompt: "你是一位内容运营专家。请分析以下标题并给出优化建议：\n\n原始标题：{title}\n\n请从以下维度分析：\n1. 吸引力评分（1-10分）并说明理由\n2. 目标用户匹配度\n3. 信息完整度\n4. 情感触发度\n5. 可优化空间\n\n然后给出3个优化版本。",
    difficulty: "高级",
    usageCount: 980,
    isBuiltIn: true,
  },
  // 文案润色
  {
    id: "builtin-cp-1",
    title: "文案润色优化",
    description: "优化已有文案的表达和结构",
    category: "copy-polishing",
    prompt: "你是一位资深文案编辑。请润色优化以下文案：\n\n原文：\n{content}\n\n目标语气：{tone}\n\n请从以下方面优化：\n1. 语言精炼度（去除冗余表达）\n2. 节奏感（长短句交替）\n3. 表达力（替换平淡表达）\n4. 结构优化（段落划分更清晰）\n5. 互动性（增强读者参与感）\n\n输出优化后的完整文案，并标注主要改动点。",
    difficulty: "中级",
    usageCount: 3100,
    isBuiltIn: true,
  },
  {
    id: "builtin-cp-2",
    title: "风格转换",
    description: "将文案转换为不同语气风格",
    category: "copy-polishing",
    prompt: "你是一位多风格文案写手。请将以下文案转换为{targetTone}风格：\n\n原文：\n{content}\n\n转换要求：\n1. 保持核心信息和要点不变\n2. 完全转换语气和表达方式\n3. 适配目标平台特点\n4. 保持原文的信息密度\n5. 转换后读起来自然不生硬\n\n可选风格：专业严谨、轻松幽默、温馨治愈、励志正能量、情感共鸣",
    difficulty: "中级",
    usageCount: 1800,
    isBuiltIn: true,
  },
  {
    id: "builtin-cp-3",
    title: "小红书文案排版",
    description: "为小红书优化文案排版和格式",
    category: "copy-polishing",
    prompt: "你是一位小红书排版优化师。请将以下内容优化为小红书爆款格式：\n\n原文：\n{content}\n\n优化要求：\n1. 添加吸引眼球的标题（含emoji）\n2. 正文分段，每段不超过3行\n3. 使用emoji做视觉分隔\n4. 重点内容用【】或「」标注\n5. 添加要点列表\n6. 结尾添加话题标签（5-8个）\n7. 整体字数控制在500-1000字",
    difficulty: "初级",
    usageCount: 2200,
    isBuiltIn: true,
  },
  // 数据分析
  {
    id: "builtin-da-1",
    title: "内容表现分析",
    description: "基于数据给出内容优化建议",
    category: "data-analysis",
    prompt: "你是一位数据分析专家。请基于以下内容数据给出分析报告和优化建议：\n\n内容类型：{contentType}\n发布时间：{publishTime}\n数据表现：\n- 阅读量：{views}\n- 点赞数：{likes}\n- 评论数：{comments}\n- 转发数：{shares}\n\n请分析：\n1. 数据表现评级\n2. 互动率分析\n3. 可能的问题点\n4. 3条具体的优化建议",
    difficulty: "高级",
    usageCount: 890,
    isBuiltIn: true,
  },
  {
    id: "builtin-da-2",
    title: "竞品内容策略分析",
    description: "分析竞品内容策略并给出建议",
    category: "data-analysis",
    prompt: "你是一位竞品分析专家。请分析以下竞品信息并给出策略建议：\n\n竞品账号：{competitor}\n内容特征：{features}\n\n请分析：\n1. 竞品内容策略特点\n2. 优势和可借鉴之处\n3. 我们可以差异化做的方向\n4. 3条可执行的内容策略建议",
    difficulty: "高级",
    usageCount: 650,
    isBuiltIn: true,
  },
  // 创意灵感
  {
    id: "builtin-ci-1",
    title: "热门话题创意",
    description: "基于热门话题生成创意内容方向",
    category: "creative-inspiration",
    prompt: "你是一位创意总监。请基于以下热门话题/趋势生成5个创意内容方向：\n\n话题/趋势：{topic}\n所属领域：{field}\n目标平台：{platform}\n\n每个创意方向包含：\n1. 创意标题\n2. 内容角度（50字描述）\n3. 目标受众\n4. 预期互动效果\n5. 配图/素材建议",
    difficulty: "中级",
    usageCount: 1500,
    isBuiltIn: true,
  },
  {
    id: "builtin-ci-2",
    title: "一周内容灵感",
    description: "生成一周的内容创作灵感",
    category: "creative-inspiration",
    prompt: "你是一位内容策划专家。请为一个{field}领域的创作者生成一周的内容计划：\n\n人设定位：{persona}\n平台：{platform}\n\n每天包含：\n1. 周一至周日，每天1个内容方向\n2. 内容类型（图文/视频/纯文字）\n3. 主题建议\n4. 语气风格\n5. 发布时间建议\n\n注意：一周内容要错开类型，避免单一重复。",
    difficulty: "中级",
    usageCount: 1200,
    isBuiltIn: true,
  },
  {
    id: "builtin-ci-3",
    title: "节日营销灵感",
    description: "基于即将到来的节日生成营销内容",
    category: "creative-inspiration",
    prompt: "你是一位节日营销策划师。请为{holiday}生成创意营销内容方案：\n\n品牌/账号类型：{brandType}\n目标受众：{audience}\n\n请生成：\n1. 3个节日营销主题\n2. 每个主题的文案方向\n3. 视觉/配图建议\n4. 互动活动设计\n5. 节前预热和节后回溯内容建议",
    difficulty: "初级",
    usageCount: 980,
    isBuiltIn: true,
  },
];

// ─── Animation ───────────────────────────────────────────────────────────────

const fadeIn = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

// ─── Prompt Card ─────────────────────────────────────────────────────────────

interface PromptCardProps {
  prompt: PromptItem;
  onCopy: (p: PromptItem) => void;
  onUse: (p: PromptItem) => void;
  onEdit?: (p: PromptItem) => void;
  onDelete?: (id: string) => void;
}

function PromptCard({ prompt, onCopy, onUse, onEdit, onDelete }: PromptCardProps) {
  const [expanded, setExpanded] = useState(false);

  const categoryInfo = PROMPT_CATEGORIES.find((c) => c.id === prompt.category);

  return (
    <motion.div
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      className="prompt-card group rounded-xl border border-border/60 bg-card/80 hover:border-violet-300/50 dark:hover:border-violet-700/50 hover:shadow-md transition-all duration-200 overflow-hidden"
    >
      <div className="p-3.5">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${categoryInfo?.bg || "bg-muted"}`}>
              {React.createElement(categoryInfo?.icon || Sparkles, { className: `h-3.5 w-3.5 ${categoryInfo?.color || "text-muted-foreground"}` })}
            </div>
            <div>
              <h4 className="text-xs font-semibold">{prompt.title}</h4>
              <p className="text-[10px] text-muted-foreground">{prompt.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`difficulty-badge text-[8px] px-1.5 py-0.5 rounded-md font-medium ${DIFFICULTY_STYLES[prompt.difficulty] || ""}`}>
              {prompt.difficulty}
            </span>
          </div>
        </div>

        {/* Prompt preview */}
        <div className="prompt-preview rounded-lg bg-muted/40 border border-border/30 p-2.5 mb-2.5">
          <pre className="text-[10px] whitespace-pre-wrap leading-relaxed font-[inherit]">
            {expanded ? prompt.prompt : prompt.prompt.slice(0, 120) + (prompt.prompt.length > 120 ? "..." : "")}
          </pre>
          {prompt.prompt.length > 120 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[9px] text-violet-500 hover:text-violet-600 mt-1 flex items-center gap-0.5"
            >
              {expanded ? "收起" : "展开全部"}
              <ChevronDown className={`h-2.5 w-2.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
          )}
        </div>

        {/* Footer: usage + actions */}
        <div className="flex items-center justify-between">
          <span className="usage-count text-[9px] text-muted-foreground flex items-center gap-0.5">
            <Zap className="h-2.5 w-2.5" />
            {prompt.usageCount > 1000 ? `${(prompt.usageCount / 1000).toFixed(1)}k` : prompt.usageCount}次使用
          </span>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" className="h-6 text-[9px] px-2" onClick={() => onCopy(prompt)}>
              <Copy className="h-2.5 w-2.5 mr-0.5" />
              复制
            </Button>
            <Button size="sm" variant="ghost" className="h-6 text-[9px] px-2 bg-violet-500 hover:bg-violet-600 text-white" onClick={() => onUse(prompt)}>
              <Wand2 className="h-2.5 w-2.5 mr-0.5" />
              使用
            </Button>
            {onEdit && !prompt.isBuiltIn && (
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onEdit(prompt)}>
                <Pencil className="h-2.5 w-2.5" />
              </Button>
            )}
            {onDelete && !prompt.isBuiltIn && (
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive" onClick={() => onDelete(prompt.id)}>
                <Trash2 className="h-2.5 w-2.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Create/Edit Prompt Dialog ───────────────────────────────────────────────

interface PromptFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editPrompt?: PromptItem | null;
  onSuccess: () => void;
}

function PromptFormDialog({ open, onOpenChange, editPrompt, onSuccess }: PromptFormDialogProps) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "content-generation",
    prompt: "",
    difficulty: "初级" as "初级" | "中级" | "高级",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editPrompt) {
      setForm({
        title: editPrompt.title,
        description: editPrompt.description,
        category: editPrompt.category,
        prompt: editPrompt.prompt,
        difficulty: editPrompt.difficulty,
      });
    } else {
      setForm({ title: "", description: "", category: "content-generation", prompt: "", difficulty: "初级" });
    }
  }, [editPrompt, open]);

  const handleSubmit = useCallback(async () => {
    if (!form.title.trim() || !form.prompt.trim()) {
      toast.error("名称和提示词不能为空");
      return;
    }

    setIsSubmitting(true);

    // Save to localStorage
    try {
      const customPromptsStr = localStorage.getItem("custom-prompts") || "[]";
      const customPrompts: PromptItem[] = JSON.parse(customPromptsStr);

      if (editPrompt) {
        const idx = customPrompts.findIndex((p) => p.id === editPrompt.id);
        if (idx >= 0) {
          customPrompts[idx] = { ...customPrompts[idx], ...form };
        }
      } else {
        customPrompts.push({
          id: `custom-${Date.now()}`,
          ...form,
          usageCount: 0,
        });
      }

      localStorage.setItem("custom-prompts", JSON.stringify(customPrompts));
      toast.success(editPrompt ? "提示词已更新" : "提示词已创建");
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error("保存失败");
    } finally {
      setIsSubmitting(false);
    }
  }, [form, editPrompt, onOpenChange, onSuccess]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            {editPrompt ? <Pencil className="h-4 w-4 text-violet-500" /> : <Plus className="h-4 w-4 text-violet-500" />}
            {editPrompt ? "编辑提示词" : "创建提示词"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            自定义AI提示词，用于各种内容生成场景
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">名称</label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="提示词名称" className="text-sm h-9" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">描述</label>
            <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="简短描述用途" className="text-sm h-9" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">分类</label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROMPT_CATEGORIES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">难度</label>
              <Select value={form.difficulty} onValueChange={(v) => setForm((f) => ({ ...f, difficulty: v as "初级" | "中级" | "高级" }))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="初级">初级</SelectItem>
                  <SelectItem value="中级">中级</SelectItem>
                  <SelectItem value="高级">高级</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">提示词内容</label>
            <Textarea
              value={form.prompt}
              onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
              placeholder="输入AI系统提示词... 使用 {变量名} 作为占位符"
              className="text-xs min-h-[150px] resize-none font-mono"
            />
            <p className="text-[9px] text-muted-foreground">{`提示: 使用 {topic}、{tone}、{persona} 等占位符，使用时会自动替换`}</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>取消</Button>
          <Button size="sm" onClick={handleSubmit} disabled={isSubmitting || !form.title.trim() || !form.prompt.trim()}>
            {isSubmitting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
            {editPrompt ? "保存" : "创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AIPromptLibrary() {
  const { platform } = useAppStore();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editPrompt, setEditPrompt] = useState<PromptItem | null>(null);

  // Load custom prompts from localStorage (lazy initializer)
  const [customPrompts, setCustomPrompts] = useState<PromptItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("custom-prompts") || "[]";
      return JSON.parse(saved);
    } catch {
      return [];
    }
  });

  const loadCustomPrompts = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("custom-prompts") || "[]";
        setCustomPrompts(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
  }, []);

  // All prompts (built-in + custom)
  const allPrompts = useMemo(() => {
    const combined = [...BUILT_IN_PROMPTS, ...customPrompts];
    let filtered = combined;

    if (activeCategory !== "all") {
      filtered = filtered.filter((p) => p.category === activeCategory);
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.prompt.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [customPrompts, activeCategory, search]);

  // Copy prompt
  const handleCopy = useCallback((prompt: PromptItem) => {
    navigator.clipboard.writeText(prompt.prompt);
    toast.success("提示词已复制到剪贴板");
  }, []);

  // Use prompt - send to AI optimize API
  const handleUse = useCallback(async (prompt: PromptItem) => {
    toast.info("正在应用提示词...");
    try {
      const personaStr = "专业内容创作者";
      const filledPrompt = prompt.prompt
        .replace(/{topic}/g, "日常分享")
        .replace(/{tone}/g, "温馨自然")
        .replace(/{persona}/g, personaStr)
        .replace(/{platform}/g, platform === "wechat" ? "朋友圈" : "小红书")
        .replace(/{content}/g, "")
        .replace(/{title}/g, "")
        .replace(/{field}/g, "内容创作")
        .replace(/{knowledge}/g, "")
        .replace(/{audience}/g, "年轻职场人")
        .replace(/{keyPoints}/g, "高品质、高性价比");

      const res = await fetch("/api/ai/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post: { content: "", contentType: "text", topic: prompt.title, id: "" },
          platform,
          feedback: filledPrompt,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        navigator.clipboard.writeText(data.content || "");
        toast.success("AI生成完成，已复制到剪贴板", { description: `使用提示词: ${prompt.title}` });
      } else {
        toast.error("AI生成失败");
      }
    } catch {
      toast.error("网络错误，请重试");
    }
  }, [platform]);

  // Delete custom prompt
  const handleDelete = useCallback((id: string) => {
    const updated = customPrompts.filter((p) => p.id !== id);
    setCustomPrompts(updated);
    localStorage.setItem("custom-prompts", JSON.stringify(updated));
    toast.success("提示词已删除");
  }, [customPrompts]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="rounded-xl border border-border/60 bg-card/80 p-3 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索提示词..."
            className="pl-9 h-9 text-xs"
          />
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
          <Button
            size="sm"
            variant={!activeCategory ? "secondary" : "ghost"}
            className={`h-7 text-[10px] px-2.5 shrink-0 ${!activeCategory ? "bg-violet-500 text-white" : ""}`}
            onClick={() => setActiveCategory("all")}
          >
            全部
          </Button>
          {PROMPT_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <Button
                key={cat.id}
                size="sm"
                variant={activeCategory === cat.id ? "secondary" : "ghost"}
                className={`h-7 text-[10px] px-2.5 shrink-0 gap-1 ${activeCategory === cat.id ? "bg-violet-500 text-white" : ""}`}
                onClick={() => setActiveCategory(activeCategory === cat.id ? "all" : cat.id)}
              >
                <Icon className="h-3 w-3" />
                {cat.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Prompt count + create button */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          共 {allPrompts.length} 个提示词
          {customPrompts.length > 0 && (
            <span className="ml-1.5 text-violet-500">（{customPrompts.length}个自定义）</span>
          )}
        </p>
        <Button size="sm" className="h-7 text-[10px]" onClick={() => { setEditPrompt(null); setShowForm(true); }}>
          <Plus className="h-3 w-3 mr-1" />
          创建提示词
        </Button>
      </div>

      {/* Prompt Cards */}
      <div className="space-y-2.5">
        {allPrompts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">暂无匹配的提示词</p>
          </div>
        ) : (
          allPrompts.map((prompt) => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              onCopy={handleCopy}
              onUse={handleUse}
              onEdit={(p) => { setEditPrompt(p); setShowForm(true); }}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* Form Dialog */}
      <PromptFormDialog
        open={showForm || !!editPrompt}
        onOpenChange={(open) => { setShowForm(open); if (!open) setEditPrompt(null); }}
        editPrompt={editPrompt}
        onSuccess={loadCustomPrompts}
      />
    </motion.div>
  );
}
