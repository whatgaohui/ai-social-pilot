"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import type { Persona } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { User, Sparkles, Save, Briefcase, MessageSquare, Heart, Tag } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";

const TONE_OPTIONS = [
  { value: "professional", label: "专业严谨" },
  { value: "casual", label: "轻松自然" },
  { value: "humorous", label: "幽默风趣" },
  { value: "inspirational", label: "励志正能量" },
  { value: "storytelling", label: "故事叙述" },
  { value: "custom", label: "✨ 自定义风格..." },
];

const STYLE_OPTIONS = [
  { value: "concise", label: "简洁精炼" },
  { value: "detailed", label: "详细丰富" },
  { value: "emotional", label: "情感共鸣" },
  { value: "balanced", label: "均衡兼顾" },
];

export function PersonaForm() {
  const { persona, setPersona } = useAppStore();
  const [form, setForm] = useState({
    name: "",
    title: "",
    industry: "",
    tone: "professional",
    customTone: "",
    style: "balanced",
    keywords: "",
    bio: "",
    targetAudience: "",
    avatarUrl: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPersona();
  }, []);

  useEffect(() => {
    if (persona) {
      const isCustom = !TONE_OPTIONS.some(o => o.value === persona.tone) && persona.tone;
      setForm({
        name: persona.name || "",
        title: persona.title || "",
        industry: persona.industry || "",
        tone: isCustom ? "custom" : persona.tone || "professional",
        customTone: isCustom ? persona.tone : "",
        style: persona.style || "balanced",
        keywords: persona.keywords || "",
        bio: persona.bio || "",
        targetAudience: persona.targetAudience || "",
        avatarUrl: persona.avatarUrl || "",
      });
    }
  }, [persona]);

  const fetchPersona = async () => {
    try {
      const res = await fetch("/api/persona");
      if (res.ok) {
        const data = await res.json();
        if (data) setPersona(data);
      }
    } catch (e) {
      console.error("Failed to fetch persona:", e);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("请填写姓名");
      return;
    }
    if (form.tone === "custom" && !form.customTone?.trim()) {
      toast.error("请填写自定义语气风格");
      return;
    }
    setSaving(true);
    try {
      const { customTone, ...formData } = form;
      const res = await fetch("/api/persona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          tone: form.tone === "custom" ? form.customTone : form.tone,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPersona(data);
        toast.success("人设信息已保存");
      } else {
        const errData = await res.json().catch(() => null);
        toast.error(errData?.error || "保存失败，请重试");
      }
    } catch (e) {
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleKeywordsChange = (value: string) => {
    setForm({ ...form, keywords: value });
  };

  // Show empty state banner when persona hasn't been configured yet
  const hasPersona = persona && persona.name;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Empty state when no persona set */}
      {!hasPersona && (
        <EmptyState
          icon={User}
          title="设置您的人设"
          description="定义您的品牌形象和内容风格"
          action={{ label: "开始设置", onClick: () => { const nameInput = document.querySelector('input[placeholder="输入您的姓名"]') as HTMLInputElement; nameInput?.focus(); } }}
          variant="gradient"
          size="sm"
          gradientClass="from-violet-500 to-purple-600"
        />
      )}

      {/* Basic Info */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-card to-card/80">
        <CardHeader className="pb-3 px-4 pt-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            基本信息
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-4">
          <div className="space-y-1.5 min-w-0">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">姓名 *</Label>
            <Input
              placeholder="输入您的姓名"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-9 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">职业/头衔</Label>
              <Input
                placeholder="如：产品经理"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">行业</Label>
              <Input
                placeholder="如：互联网"
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Style Settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 px-4 pt-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-amber-500" />
            </div>
            风格设定
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">语气风格</Label>
              {form.tone === "custom" && (
                <Input
                  placeholder="描述您的语气风格，如：温暖亲切、知性优雅..."
                  value={form.customTone || ""}
                  onChange={(e) => setForm({ ...form, customTone: e.target.value })}
                  className="h-9 text-sm mb-1.5"
                  autoFocus
                />
              )}
              <Select value={form.tone} onValueChange={(v) => setForm({ ...form, tone: v })}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">文案风格</Label>
              <Select value={form.style} onValueChange={(v) => setForm({ ...form, style: v })}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STYLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5 min-w-0">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">关键词（用逗号分隔）</Label>
            <Input
              placeholder="如：AI,产品,创业,成长"
              value={form.keywords}
              onChange={(e) => handleKeywordsChange(e.target.value)}
              className="h-9 text-sm"
            />
            {form.keywords && (
              <div className="flex flex-wrap gap-1 mt-1">
                {form.keywords.split(/[,，]/).filter(Boolean).map((kw, i) => (
                  <Badge key={i} variant="secondary" className="text-xs py-0 px-1.5">
                    {kw.trim()}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bio & Audience */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 px-4 pt-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Briefcase className="h-4 w-4 text-emerald-500" />
            </div>
            个人简介 & 受众
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-4">
          <div className="space-y-1.5 min-w-0">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">个人简介</Label>
            <Textarea
              placeholder="简单介绍自己..."
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className="text-sm min-h-[60px] resize-none"
            />
          </div>
          <div className="space-y-1.5 min-w-0">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">目标受众</Label>
            <Textarea
              placeholder="描述您的目标读者..."
              value={form.targetAudience}
              onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
              className="text-sm min-h-[60px] resize-none"
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full h-10 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-md shadow-violet-200 dark:shadow-violet-900/40" size="sm">
        {saving ? (
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            保存中...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            保存人设
          </span>
        )}
      </Button>
    </motion.div>
  );
}
