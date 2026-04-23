"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sun, BookOpen, FileText, Sparkles, Briefcase, Lightbulb,
  TrendingUp, MessageCircle, Loader2, Copy, Check
} from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/store/app-store";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

interface Template {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: typeof FileText;
  gradient: string;
  prompt: string;
  contentExample: string;
}

const TEMPLATES: Template[] = [
  {
    id: "morning",
    title: "早安问候",
    description: "温暖有活力的早安文案，适合每日打卡",
    category: "日常",
    icon: Sun,
    gradient: "from-amber-500 to-orange-500",
    prompt: "morning",
    contentExample: "早安！☀️ 新的一天，从一杯手冲咖啡开始。\n\n今天的目标：完成产品方案初稿，给团队一个好的方向。\n\n你们今天的第一杯是什么？",
  },
  {
    id: "expertise",
    title: "专业分享",
    description: "展示专业能力，建立行业影响力",
    category: "专业",
    icon: Briefcase,
    gradient: "from-blue-500 to-cyan-500",
    prompt: "expertise",
    contentExample: "做了5年产品，总结出一个铁律：\n\n用户说的需求，90%不是真需求。\n\n真正的需求藏在：\n1️⃣ 用户反复抱怨却忍着没用的问题\n2️⃣ 用户自发寻找替代方案的场景\n3️⃣ 用户愿意为之付费的痛点\n\n学会听懂'沉默的声音'，才是产品人的基本功。",
  },
  {
    id: "story",
    title: "故事叙述",
    description: "用故事引发共鸣，增强情感连接",
    category: "故事",
    icon: BookOpen,
    gradient: "from-purple-500 to-pink-500",
    prompt: "story",
    contentExample: "三年前的今天，我辞职了。\n\n所有人都说我疯了——大厂P7，年薪50万，说走就走。\n\n但只有我知道，那天早上看镜子里的自己，眼睛是灰的。\n\n现在回头看，那是我做过最勇敢的决定。\n\n人生最大的风险，不是冒险，是在不喜欢的生活里慢慢枯萎。",
  },
  {
    id: "interaction",
    title: "互动话题",
    description: "引发讨论，提升朋友圈活跃度",
    category: "互动",
    icon: MessageCircle,
    gradient: "from-emerald-500 to-teal-500",
    prompt: "interaction",
    contentExample: "投票时间 🙋\n\n如果只能选一个，你会选择：\n\nA. 每天多赚1000块\nB. 每天多出1小时自由时间\n\n评论区告诉我你的选择和理由～\n\n我先选B，因为时间才是最贵的奢侈品。",
  },
  {
    id: "insight",
    title: "观点洞察",
    description: "独到见解，展现思考深度",
    category: "观点",
    icon: Lightbulb,
    gradient: "from-rose-500 to-red-500",
    prompt: "insight",
    contentExample: "说个扎心的真相：\n\n大部分人的'努力'，只是在感动自己。\n\n真正的努力有三个特征：\n✅ 有明确的方向和标准\n✅ 主动寻求反馈和改进\n✅ 结果可量化、可追溯\n\n如果你的努力只是'我很忙'，那可能只是在用战术勤奋掩盖战略懒惰。",
  },
  {
    id: "achievement",
    title: "成就展示",
    description: "分享成果，建立信任和影响力",
    category: "成就",
    icon: TrendingUp,
    gradient: "from-violet-500 to-indigo-500",
    prompt: "achievement",
    contentExample: "小里程碑达成 🎉\n\n这个月帮3位创业者完成了品牌定位，其中一家已经拿到了天使轮融资。\n\n最开心的不是数字，而是看到他们从迷茫到坚定的转变。\n\n创业这条路，有人同行，就不算孤单。",
  },
];

export function CopywritingTemplates() {
  const { persona, knowledgeItems } = useAppStore();
  const [generating, setGenerating] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const categories = ["all", ...new Set(TEMPLATES.map(t => t.category))];

  const filtered = TEMPLATES.filter(t => activeCategory === "all" || t.category === activeCategory);

  const handleGenerate = async (template: Template) => {
    setGenerating(template.id);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "auto",
          persona,
          knowledgeItems,
          topic: `按照「${template.title}」模板风格创作`,
          tone: persona?.tone || "professional",
          style: persona?.style || "balanced",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setResults(prev => ({ ...prev, [template.id]: data.content }));
        toast.success("内容已生成");
      }
    } catch {
      toast.error("生成失败");
    } finally {
      setGenerating(null);
    }
  };

  const { copied: copiedResult, copy: copyResult } = useCopyToClipboard();

  const handleCopy = (text: string) => {
    copyResult(text);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Usage Guide */}
      <div className="rounded-lg bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 border border-violet-200 dark:border-violet-800 p-3">
        <p className="text-xs font-medium text-violet-700 dark:text-violet-300 flex items-center gap-1 mb-1">
          <Sparkles className="h-3.5 w-3.5" />
          模板使用指南
        </p>
        <ul className="text-[11px] text-violet-600 dark:text-violet-400 space-y-0.5 ml-4 list-disc">
          <li>选择模板 → 点击「AI生成」→ AI 会结合您的人设和知识库生成个性化文案</li>
          <li>生成的内容可直接复制使用，或点击「重新生成」获取不同版本</li>
          <li>人设和知识库越完善，生成效果越好</li>
        </ul>
      </div>

      {/* Category filter */}
      <div className="flex gap-1 flex-wrap">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={activeCategory === cat ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => setActiveCategory(cat)}
          >
            {cat === "all" ? "全部" : cat}
          </Button>
        ))}
      </div>

      {/* Templates */}
      <ScrollArea className="h-[420px]">
        <div className="space-y-2 pr-3">
          {filtered.map((template) => {
            const Icon = template.icon;
            const result = results[template.id];
            const isGenerating = generating === template.id;

            return (
              <Card key={template.id} className="content-card-hover micro-hover card-spotlight border-0 shadow-sm hover:shadow-md transition-all duration-200 group card-enter">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${template.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="text-sm font-medium">{template.title}</h4>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {template.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{template.description}</p>

                      {!result && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs mt-2 text-violet-600 dark:text-violet-400 hover:text-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950/30 focus-ring-soft"
                          onClick={() => handleGenerate(template)}
                          disabled={isGenerating}
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              生成中...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3 w-3 mr-1" />
                              AI生成
                            </>
                          )}
                        </Button>
                      )}

                      {result && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="mt-2"
                        >
                          <div className="rounded-lg bg-muted/50 p-2.5 relative group/result">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover/result:opacity-100 transition-opacity btn-press ${copiedResult ? "bg-emerald-50 dark:bg-emerald-950/30" : ""}`}
                              onClick={() => handleCopy(result)}
                            >
                              {copiedResult ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                            </Button>
                            <p className="text-xs leading-relaxed whitespace-pre-wrap pr-6">{result}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] mt-1 text-muted-foreground focus-ring-soft"
                            onClick={() => handleGenerate(template)}
                            disabled={isGenerating}
                          >
                            {isGenerating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                            重新生成
                          </Button>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </motion.div>
  );
}
