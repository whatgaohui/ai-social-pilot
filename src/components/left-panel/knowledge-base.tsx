"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import type { KnowledgeItem, KnowledgeCategory } from "@/types";
import { KNOWLEDGE_CATEGORY_LABELS } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, Plus, Search, Trash2, Tag, FileText } from "lucide-react";
import { useSuccessToast, useErrorToast } from "@/hooks/use-toast-operations";
import { EmptyState } from "@/components/ui/empty-state";

const CATEGORIES: KnowledgeCategory[] = ["expertise", "experience", "opinion", "story", "resource"];

export function KnowledgeBase() {
  const { knowledgeItems, setKnowledgeItems, addKnowledgeItem, removeKnowledgeItem } = useAppStore();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", category: "expertise" as KnowledgeCategory, tags: "" });
  const showSuccess = useSuccessToast();
  const showError = useErrorToast();

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/knowledge");
      if (res.ok) {
        const data = await res.json();
        setKnowledgeItems(data);
      }
    } catch {
      /* silent — data will remain empty */
    }
  }, [setKnowledgeItems]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleAdd = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      showError("请填写标题和内容");
      return;
    }
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        addKnowledgeItem(data);
        setForm({ title: "", content: "", category: "expertise", tags: "" });
        setDialogOpen(false);
        showSuccess("知识已添加", { description: `${form.title} 已保存到知识库` });
      }
    } catch {
      showError("添加失败", { description: "网络错误，请稍后重试" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/knowledge/${id}`, { method: "DELETE" });
      if (res.ok) {
        removeKnowledgeItem(id);
        showSuccess("知识已删除");
      }
    } catch {
      showError("删除失败", { description: "无法删除，请稍后重试" });
    }
  };

  const filtered = knowledgeItems.filter((item) => {
    const matchSearch = !search || item.title.includes(search) || item.content.includes(search);
    const matchCategory = activeCategory === "all" || item.category === activeCategory;
    return matchSearch && matchCategory;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-3"
    >
      {/* Usage Guide */}
      <div className="rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800 p-3">
        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-1 mb-1">
          <BookOpen className="h-3.5 w-3.5" />
          知识库使用指南
        </p>
        <ul className="text-[11px] text-emerald-600 dark:text-emerald-400 space-y-0.5 ml-4 list-disc">
          <li>添加专业知识、经验总结 → AI 生成文案时会自动参考</li>
          <li>建议添加 5-10 条知识，覆盖不同领域（经验、观点、故事等）</li>
          <li>知识越具体、越详细，AI 生成的内容越贴合您的风格</li>
        </ul>
      </div>

      {/* Search & Add */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="搜索知识库..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 text-sm pl-8 input-glow"
          />
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-9 px-3">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>添加知识条目</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                添加专业知识、经验总结等内容到您的个人知识库
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-sm">标题</Label>
                <Input
                  placeholder="如：产品设计的核心原则"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="input-glow"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">内容</Label>
                <Textarea
                  placeholder="输入详细内容..."
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="min-h-[100px] resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">分类</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as KnowledgeCategory })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {KNOWLEDGE_CATEGORY_LABELS[cat]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">标签（逗号分隔）</Label>
                  <Input
                    placeholder="如：设计,用户体验"
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    className="input-glow"
                  />
                </div>
              </div>
              <Button onClick={handleAdd} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                添加
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 flex-wrap">
        <Button
          variant={activeCategory === "all" ? "secondary" : "ghost"}
          size="sm"
          className="h-7 text-xs px-2"
          onClick={() => setActiveCategory("all")}
        >
          全部
        </Button>
        {CATEGORIES.map((cat) => (
          <Button
            key={cat}
            variant={activeCategory === cat ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => setActiveCategory(cat)}
          >
            {KNOWLEDGE_CATEGORY_LABELS[cat]}
          </Button>
        ))}
      </div>

      {/* Items List */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-2 pr-3">
          <AnimatePresence>
            {filtered.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="知识库还是空的"
                description="添加您的专业知识、行业洞察和品牌信息"
                action={{ label: "添加知识条目", onClick: () => setDialogOpen(true) }}
                variant="default"
                size="md"
              />
            ) : (
              filtered.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="border-0 shadow-sm hover:shadow-md hover:border-primary/10 transition-all duration-200 group card-enter list-item-enter">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-medium truncate">{item.title}</h4>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                              {KNOWLEDGE_CATEGORY_LABELS[item.category as KnowledgeCategory] || item.category}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {item.content}
                          </p>
                          {item.tags && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {item.tags.split(/[,，]/).filter(Boolean).slice(0, 3).map((tag, i) => (
                                <span key={i} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  {tag.trim()}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </motion.div>
  );
}
