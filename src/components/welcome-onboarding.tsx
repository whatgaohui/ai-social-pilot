"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/store/app-store";
import { toast } from "sonner";
import {
  Sparkles, User, BookOpen, CalendarDays, ArrowRight, ArrowLeft,
  CheckCircle2, ChevronRight, Cpu, Zap, Link2, MessageCircle,
  BookMarked, ExternalLink, Shield, Loader2, Rocket, Star,
  Palette, Brain, Target, Eye, EyeOff, Wand2, Settings2, BarChart3, Download
} from "lucide-react";

// --- Animation Variants ---
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const staggerItem = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 260, damping: 22 } },
};

// --- Constants ---
const TOTAL_STEPS = 6;

const STEP_META = [
  { icon: Sparkles, label: "欢迎", gradient: "from-violet-500 to-purple-600" },
  { icon: Target, label: "平台", gradient: "from-rose-500 to-pink-600" },
  { icon: User, label: "人设", gradient: "from-amber-500 to-orange-500" },
  { icon: BookOpen, label: "知识库", gradient: "from-emerald-500 to-teal-500" },
  { icon: Cpu, label: "AI模型", gradient: "from-violet-500 to-indigo-600" },
  { icon: Rocket, label: "完成", gradient: "from-rose-500 to-red-600" },
];

const QUICK_KNOWLEDGE = [
  "我的专业领域知识",
  "工作/创业经验总结",
  "个人成长故事",
  "行业见解和观点",
  "客户案例/成功经验",
];

interface WelcomeOnboardingProps {
  onComplete: () => void;
}

export function WelcomeOnboarding({ onComplete }: WelcomeOnboardingProps) {
  const {
    persona, setPersona, knowledgeItems, setKnowledgeItems, addKnowledgeItem,
    setPlatform, platform, setOnboardingCompleted, setAccountPanelOpen,
    setSettingsCenterOpen,
  } = useAppStore();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Step 2: Platform selection
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(
    platform === 'xiaohongshu' ? ['xiaohongshu'] : ['wechat']
  );

  // Step 3: Persona form
  const [personaForm, setPersonaForm] = useState({
    name: persona?.name || "",
    title: persona?.title || "",
    industry: persona?.industry || "",
    tone: persona?.tone || "professional",
    customTone: persona?.tone === "custom" ? (persona as unknown as Record<string, string>)?.customTone || "" : "",
    bio: persona?.bio || "",
    targetAudience: persona?.targetAudience || "",
    keywords: persona?.keywords || "",
  });
  const [savingPersona, setSavingPersona] = useState(false);

  // Step 4: Knowledge items
  const [newKnowledge, setNewKnowledge] = useState("");
  const [knowledgeCategory, setKnowledgeCategory] = useState("experience");

  // Step 5: AI model config
  const [aiMode, setAiMode] = useState<"builtin" | "custom">("builtin");
  const [aiConfigForm, setAiConfigForm] = useState({
    name: "",
    apiKey: "",
    baseUrl: "",
    modelId: "",
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [savingAi, setSavingAi] = useState(false);
  const [testingAi, setTestingAi] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Track completed steps for the progress bar
  // Only mark a step as completed if the user has actually configured it in THIS session
  const [personaSaved, setPersonaSaved] = useState(!!persona?.name);
  const [knowledgeAdded, setKnowledgeAdded] = useState(knowledgeItems.length >= 1);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [importingDemo, setImportingDemo] = useState(false);

  const completedSteps = [
    true, // Step 0: Welcome - always done
    selectedPlatforms.length > 0, // Step 1: Platform - requires active selection
    personaSaved, // Step 2: Persona - requires saving in this session or pre-existing
    knowledgeAdded, // Step 3: Knowledge - requires adding at least 1 item
    aiConfigured, // Step 4: AI model - requires explicit config or skip
    false, // Step 5: Finish - never pre-completed
  ];

  // Load AI configs on mount
  const [existingConfigs, setExistingConfigs] = useState<{ isActive: boolean; name: string }[]>([]);
  useEffect(() => {
    fetch("/api/ai-config")
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setExistingConfigs(data);
        if (data.some((c: { isActive: boolean }) => c.isActive)) {
          setAiMode("custom");
        }
      })
      .catch(() => {});
  }, []);

  const goNext = () => { setDirection(1); setStep(s => Math.min(s + 1, TOTAL_STEPS - 1)); };
  const goPrev = () => { setDirection(-1); setStep(s => Math.max(s - 1, 0)); };

  const handleSavePersona = async () => {
    if (!personaForm.name.trim()) { toast.error("请填写姓名"); return; }
    if (personaForm.tone === "custom" && !personaForm.customTone?.trim()) { toast.error("请填写自定义语气风格"); return; }
    setSavingPersona(true);
    try {
      const { customTone, ...personaData } = personaForm;
      const res = await fetch("/api/persona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...personaData,
          tone: personaForm.tone === "custom" ? personaForm.customTone : personaForm.tone,
          style: "balanced",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPersona(data);
        setPersonaSaved(true);
        toast.success("人设已保存");
        goNext();
      } else {
        const errData = await res.json().catch(() => null);
        toast.error(errData?.error || "保存失败，请重试");
      }
    } catch { toast.error("网络错误，保存失败"); }
    finally { setSavingPersona(false); }
  };

  const handleAddKnowledge = async (content?: string) => {
    const text = content || newKnowledge.trim();
    if (!text) return;
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: text.length > 20 ? text.slice(0, 20) + "..." : text,
          content: text,
          category: knowledgeCategory,
          tags: "",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        addKnowledgeItem(data);
        setNewKnowledge("");
        setKnowledgeAdded(true);
        toast.success("知识条目已添加");
      }
    } catch { toast.error("添加失败"); }
  };

  const handleSaveAiConfig = async () => {
    if (!aiConfigForm.name || !aiConfigForm.modelId || !aiConfigForm.apiKey) {
      toast.error("请填写完整的模型配置");
      return;
    }
    setSavingAi(true);
    try {
      const res = await fetch("/api/ai-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: aiConfigForm.name,
          provider: "custom",
          modelId: aiConfigForm.modelId,
          baseUrl: aiConfigForm.baseUrl,
          apiKey: aiConfigForm.apiKey,
          isFree: false,
          isActive: true,
          maxTokens: 2048,
          temperature: 0.7,
        }),
      });
      if (res.ok) {
        toast.success("AI 模型已配置");
        setAiConfigured(true);
        goNext();
      } else {
        toast.error("保存失败");
      }
    } catch { toast.error("保存失败"); }
    finally { setSavingAi(false); }
  };

  const handleTestAi = async () => {
    if (!aiConfigForm.modelId || !aiConfigForm.apiKey) {
      toast.error("请填写模型和 API Key");
      return;
    }
    setTestingAi(true);
    setAiTestResult(null);
    try {
      const res = await fetch("/api/ai-config/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "custom",
          baseUrl: aiConfigForm.baseUrl,
          apiKey: aiConfigForm.apiKey,
          modelId: aiConfigForm.modelId,
        }),
      });
      const data = await res.json();
      setAiTestResult(data);
    } catch { setAiTestResult({ success: false, message: "请求失败" }); }
    finally { setTestingAi(false); }
  };

  const handleFinish = () => {
    // Set the first selected platform as active
    if (selectedPlatforms.length > 0) {
      setPlatform(selectedPlatforms[0] as "wechat" | "xiaohongshu");
    }
    setOnboardingCompleted(true);
    onComplete();
  };

  const handleSkipAI = () => {
    setAiConfigured(true);
    goNext();
  };

  const handleSkipOnboarding = () => {
    setOnboardingCompleted(true);
    onComplete();
  };

  // --- Render Progress Bar ---
  const renderProgress = () => (
    <div className="flex items-center justify-center gap-1.5 mb-6">
      {STEP_META.map((s, i) => {
        const Icon = s.icon;
        const isCompleted = completedSteps[i];
        const isCurrent = i === step;
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center">
              <motion.div
                className={`h-8 w-8 rounded-full flex items-center justify-center transition-all ${
                  isCurrent
                    ? `bg-gradient-to-br ${s.gradient} shadow-lg`
                    : isCompleted
                    ? "bg-emerald-500 shadow-md"
                    : "bg-muted"
                }`}
                animate={isCurrent ? { scale: [1, 1.08, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {isCompleted && !isCurrent ? (
                  <CheckCircle2 className="h-4 w-4 text-white" />
                ) : (
                  <Icon className={`h-4 w-4 ${isCurrent ? "text-white" : "text-muted-foreground"}`} />
                )}
              </motion.div>
              <span className={`text-[10px] mt-1 font-medium ${isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
                {s.label}
              </span>
            </div>
            {i < STEP_META.length - 1 && (
              <div className={`w-6 sm:w-10 h-0.5 mx-0.5 rounded-full mt-[-12px] ${
                completedSteps[i] && (isCompleted || isCurrent) ? "bg-emerald-400" : "bg-muted"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );

  // --- Step Renderers ---
  const renderWelcome = () => (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="text-center space-y-6 py-4">
      {/* Hero Logo */}
      <motion.div variants={staggerItem} className="relative inline-block">
        <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-violet-500 via-purple-500 to-rose-500 flex items-center justify-center mx-auto shadow-2xl shadow-violet-300/50 dark:shadow-violet-900/50">
          <Sparkles className="h-10 w-10 text-white" />
        </div>
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-amber-400 flex items-center justify-center shadow-md"
        >
          <Star className="h-3.5 w-3.5 text-amber-900" />
        </motion.div>
      </motion.div>

      <motion.div variants={staggerItem} className="space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 via-purple-600 to-rose-500">
            AI 社交运营助手
          </span>
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
          一站式智能内容创作平台，支持朋友圈和小红书双平台。<br />
          让 AI 帮你规划、创作、优化每一条内容。
        </p>
      </motion.div>

      {/* Feature Highlights */}
      <motion.div variants={staggerItem} className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
        {[
          { icon: Wand2, label: "AI 创作", color: "from-violet-500 to-purple-600", desc: "智能生成文案", stagger: "slide-in-stagger-1" },
          { icon: BarChart3, label: "数据分析", color: "from-emerald-500 to-teal-600", desc: "互动数据洞察", stagger: "slide-in-stagger-2" },
          { icon: Palette, label: "爆款灵感", color: "from-amber-500 to-orange-500", desc: "12+标题公式", stagger: "slide-in-stagger-3" },
        ].map((f) => (
          <Card key={f.label} className={`border-0 shadow-sm bg-muted/30 p-0 glass-card ${f.stagger || ''}`}>
            <CardContent className="p-3 text-center">
              <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mx-auto mb-1.5 shadow-sm`}>
                <f.icon className="h-4 w-4 text-white" />
              </div>
              <p className="text-xs font-semibold">{f.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{f.desc}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <motion.div variants={staggerItem}>
        <Button
          onClick={goNext}
          className="w-full max-w-xs h-11 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-200 dark:shadow-violet-900/40 btn-ripple"
        >
          开始设置
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
        <div className="mt-3 space-y-1.5">
          <p className="text-[11px] text-muted-foreground">只需 3 分钟，完成基础配置</p>
          <button
            onClick={handleSkipOnboarding}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            跳过引导，直接体验
          </button>
          <p className="text-[10px] text-muted-foreground/60">稍后可在设置中重新完成引导</p>
        </div>
      </motion.div>
    </motion.div>
  );

  const renderPlatform = () => (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6 py-2">
      <div className="text-center space-y-1.5">
        <h3 className="text-lg font-bold">选择运营平台</h3>
        <p className="text-xs text-muted-foreground">选择您要运营的社交平台，可以同时选择多个</p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
        {[
          {
            id: "wechat",
            name: "微信朋友圈",
            desc: "个人IP打造 · 全自动内容规划",
            icon: MessageCircle,
            color: "from-green-500 to-emerald-600",
            ring: "ring-green-500",
            bg: "bg-green-50 dark:bg-green-950/20",
            features: ["30天内容日历", "文案AI生成", "朋友圈预览"],
          },
          {
            id: "xiaohongshu",
            name: "小红书",
            desc: "爆款内容打造 · 全自动笔记生成",
            icon: BookMarked,
            color: "from-red-500 to-rose-600",
            ring: "ring-red-500",
            bg: "bg-red-50 dark:bg-red-950/20",
            features: ["笔记AI生成", "标题A/B测试", "话题标签推荐"],
          },
        ].map((p) => {
          const isSelected = selectedPlatforms.includes(p.id);
          const PlatformIcon = p.icon;
          return (
            <motion.div variants={staggerItem} key={p.id}>
              <Card
                onClick={() => {
                  setSelectedPlatforms(prev =>
                    prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id]
                  );
                }}
                className={`cursor-pointer transition-all border-2 hover:shadow-lg ${
                  isSelected ? `${p.bg} ${p.ring}` : "border-transparent hover:border-muted"
                }`}
              >
                <CardContent className="p-4">
                  <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${p.color} flex items-center justify-center mx-auto mb-3 shadow-md ${isSelected ? "scale-110" : ""} transition-transform`}>
                    <PlatformIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-center">
                    <h4 className="text-sm font-bold">{p.name}</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{p.desc}</p>
                  </div>
                  {isSelected && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-2">
                      <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800" variant="outline">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        已选择
                      </Badge>
                    </motion.div>
                  )}
                  <div className="mt-3 space-y-1">
                    {p.features.map((f) => (
                      <div key={f} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                        {f}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={goPrev} className="flex-1 h-10">
          <ArrowLeft className="h-4 w-4 mr-1" /> 返回
        </Button>
        <Button
          onClick={goNext}
          disabled={selectedPlatforms.length === 0}
          className="flex-1 h-10 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
        >
          下一步 <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </motion.div>
  );

  const renderPersona = () => (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-5 py-2 pb-6">
      <div className="text-center space-y-1.5">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto shadow-md">
          <User className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-lg font-bold">设置您的品牌人设</h3>
        <p className="text-xs text-muted-foreground">AI 将根据人设信息生成个性化内容，填写越详细效果越好</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3.5">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1">
              <User className="h-3 w-3" /> 姓名 <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="输入您的姓名或昵称"
              value={personaForm.name}
              onChange={(e) => setPersonaForm({ ...personaForm, name: e.target.value })}
              className="h-9 text-sm"
              autoFocus
            />
          </div>

          {/* Title & Industry */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">职业/头衔</Label>
              <Input
                placeholder="如：产品经理"
                value={personaForm.title}
                onChange={(e) => setPersonaForm({ ...personaForm, title: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">行业</Label>
              <Input
                placeholder="如：互联网"
                value={personaForm.industry}
                onChange={(e) => setPersonaForm({ ...personaForm, industry: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Tone */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> 语气风格
            </Label>
            {personaForm.tone === "custom" && (
              <Input
                placeholder="描述您的语气风格，如：温暖亲切、知性优雅..."
                value={personaForm.customTone || ""}
                onChange={(e) => setPersonaForm({ ...personaForm, customTone: e.target.value })}
                className="h-9 text-sm mb-1.5"
                autoFocus
              />
            )}
            <Select value={personaForm.tone} onValueChange={(v) => setPersonaForm({ ...personaForm, tone: v })}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">专业严谨</SelectItem>
                <SelectItem value="casual">轻松自然</SelectItem>
                <SelectItem value="humorous">幽默风趣</SelectItem>
                <SelectItem value="inspirational">励志正能量</SelectItem>
                <SelectItem value="storytelling">故事叙述</SelectItem>
                <SelectItem value="custom">✨ 自定义风格...</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">个人简介</Label>
            <Textarea
              placeholder="简单介绍自己，让 AI 更了解您..."
              value={personaForm.bio}
              onChange={(e) => setPersonaForm({ ...personaForm, bio: e.target.value })}
              className="text-sm min-h-[70px] resize-none"
            />
          </div>

          {/* Target Audience */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1">
              <Target className="h-3 w-3" /> 目标受众
            </Label>
            <Textarea
              placeholder="您的读者是谁？如：25-35岁的互联网从业者、对个人成长感兴趣的人..."
              value={personaForm.targetAudience}
              onChange={(e) => setPersonaForm({ ...personaForm, targetAudience: e.target.value })}
              className="text-sm min-h-[60px] resize-none"
            />
          </div>

          {/* Keywords */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1">
              <Brain className="h-3 w-3" /> 关键词（用逗号分隔）
            </Label>
            <Input
              placeholder="如：AI,产品,创业,成长"
              value={personaForm.keywords}
              onChange={(e) => setPersonaForm({ ...personaForm, keywords: e.target.value })}
              className="h-9 text-sm"
            />
            {personaForm.keywords && (
              <div className="flex flex-wrap gap-1 mt-1">
                {personaForm.keywords.split(/[,，]/).filter(Boolean).map((kw, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px] py-0 px-1.5">{kw.trim()}</Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {persona?.name && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
          <span className="text-xs text-emerald-700 dark:text-emerald-300">
            已有人设数据「{persona.name}」，保存将更新
          </span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={goPrev} className="flex-1 h-10">
          <ArrowLeft className="h-4 w-4 mr-1" /> 返回
        </Button>
        <Button
          onClick={handleSavePersona}
          disabled={savingPersona || !personaForm.name.trim()}
          className="flex-1 h-10 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-200 dark:shadow-amber-900/40"
        >
          {savingPersona ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> 保存中...</> : <>保存并继续 <ArrowRight className="h-4 w-4 ml-1" /></>}
        </Button>
      </div>
    </motion.div>
  );

  const renderKnowledge = () => (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-5 py-2 pb-6">
      <div className="text-center space-y-1.5">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto shadow-md">
          <BookOpen className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-lg font-bold">建立知识库</h3>
        <p className="text-xs text-muted-foreground">添加专业知识、经验总结，让 AI 生成更贴合您的内容</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          {/* Quick Add */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">快速添加知识</Label>
            <div className="flex gap-2">
              <Textarea
                placeholder="输入您的专业知识或经验..."
                value={newKnowledge}
                onChange={(e) => setNewKnowledge(e.target.value)}
                className="text-sm min-h-[60px] resize-none flex-1"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddKnowledge(); } }}
              />
            </div>
            <div className="flex gap-2">
              <Select value={knowledgeCategory} onValueChange={setKnowledgeCategory}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="experience">工作经验</SelectItem>
                  <SelectItem value="expertise">专业知识</SelectItem>
                  <SelectItem value="story">个人故事</SelectItem>
                  <SelectItem value="opinion">观点见解</SelectItem>
                  <SelectItem value="case">案例经验</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => handleAddKnowledge()}
                disabled={!newKnowledge.trim()}
                size="sm"
                className="h-8 bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
              >
                添加
              </Button>
            </div>
          </div>

          {/* Quick Suggestions */}
          <div className="space-y-2">
            <p className="text-[10px] text-muted-foreground font-medium">不知道写什么？试试这些：</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_KNOWLEDGE.map((suggestion) => (
                <Badge
                  key={suggestion}
                  variant="outline"
                  className="text-[10px] cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
                  onClick={() => {
                    setNewKnowledge(suggestion);
                    setKnowledgeCategory("expertise");
                  }}
                >
                  + {suggestion}
                </Badge>
              ))}
            </div>
          </div>

          {/* Added Items */}
          {knowledgeItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                已添加 {knowledgeItems.length} 条知识
              </p>
              <ScrollArea className="max-h-40">
                <div className="space-y-1.5">
                  {knowledgeItems.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-xs">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                      <span className="flex-1 truncate">{item.title || item.content.slice(0, 40)}</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">
                        {item.category || "其他"}
                      </Badge>
                    </div>
                  ))}
                  {knowledgeItems.length > 5 && (
                    <p className="text-[10px] text-muted-foreground text-center">
                      还有 {knowledgeItems.length - 5} 条...
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground text-center">
        {knowledgeItems.length >= 2 ? (
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
            知识库已就绪，继续下一步
          </span>
        ) : (
          "建议至少添加 2 条知识，也可以稍后在左侧面板补充"
        )}
      </p>

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={goPrev} className="flex-1 h-10">
          <ArrowLeft className="h-4 w-4 mr-1" /> 返回
        </Button>
        <Button
          onClick={goNext}
          className="flex-1 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-200 dark:shadow-emerald-900/40"
        >
          下一步 <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </motion.div>
  );

  const renderAIModel = () => (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-5 py-2 pb-6">
      <div className="text-center space-y-1.5">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto shadow-md">
          <Cpu className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-lg font-bold">配置 AI 模型</h3>
        <p className="text-xs text-muted-foreground">选择 AI 驱动引擎，内置 AI 开箱即用，也可自定义高级模型</p>
      </div>

      {/* AI Mode Toggle */}
      <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
        <Card
          onClick={() => setAiMode("builtin")}
          className={`cursor-pointer transition-all border-2 ${
            aiMode === "builtin"
              ? "border-violet-500 bg-violet-50 dark:bg-violet-950/20 shadow-md"
              : "border-transparent hover:border-muted"
          }`}
        >
          <CardContent className="p-4 text-center">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-2">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <h4 className="text-sm font-bold">内置 AI</h4>
            <p className="text-[10px] text-muted-foreground mt-0.5">开箱即用，无需配置</p>
            {aiMode === "builtin" && (
              <Badge className="mt-2 text-[10px] bg-violet-500/10 text-violet-600 border-violet-200" variant="outline">
                推荐
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card
          onClick={() => setAiMode("custom")}
          className={`cursor-pointer transition-all border-2 ${
            aiMode === "custom"
              ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20 shadow-md"
              : "border-transparent hover:border-muted"
          }`}
        >
          <CardContent className="p-4 text-center">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-2">
              <Settings2 className="h-5 w-5 text-white" />
            </div>
            <h4 className="text-sm font-bold">自定义模型</h4>
            <p className="text-[10px] text-muted-foreground mt-0.5">DeepSeek / Gemini / 自定义</p>
            {existingConfigs.some(c => c.isActive) && (
              <Badge className="mt-2 text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200" variant="outline">
                已配置
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Custom Config Form */}
      <AnimatePresence>
        {aiMode === "custom" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">配置名称</Label>
                  <Input
                    placeholder="如：我的 DeepSeek"
                    value={aiConfigForm.name}
                    onChange={(e) => setAiConfigForm({ ...aiConfigForm, name: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">API Base URL</Label>
                  <Input
                    placeholder="如：https://api.deepseek.com/v1"
                    value={aiConfigForm.baseUrl}
                    onChange={(e) => setAiConfigForm({ ...aiConfigForm, baseUrl: e.target.value })}
                    className="h-9 text-sm font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">模型 ID</Label>
                    <Input
                      placeholder="deepseek-chat"
                      value={aiConfigForm.modelId}
                      onChange={(e) => setAiConfigForm({ ...aiConfigForm, modelId: e.target.value })}
                      className="h-9 text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1">
                      <Shield className="h-3 w-3" /> API Key
                    </Label>
                    <div className="relative">
                      <Input
                        type={showApiKey ? "text" : "password"}
                        placeholder="sk-..."
                        value={aiConfigForm.apiKey}
                        onChange={(e) => setAiConfigForm({ ...aiConfigForm, apiKey: e.target.value })}
                        className="h-9 text-sm font-mono pr-8"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showApiKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Test Result */}
                {aiTestResult && (
                  <div className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs ${
                    aiTestResult.success
                      ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                      : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
                  }`}>
                    {aiTestResult.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
                    {aiTestResult.message}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestAi}
                    disabled={testingAi || !aiConfigForm.modelId || !aiConfigForm.apiKey}
                    className="flex-1 h-8 text-xs border-violet-200 dark:border-violet-800 text-violet-600"
                  >
                    {testingAi ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Zap className="h-3 w-3 mr-1" />}
                    测试连接
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveAiConfig}
                    disabled={savingAi}
                    className="flex-1 h-8 text-xs bg-gradient-to-r from-violet-600 to-purple-600 text-white"
                  >
                    {savingAi ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> 保存中</> : <>保存配置</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Already configured notice */}
      {aiMode === "builtin" && existingConfigs.some(c => c.isActive) && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
          <Zap className="h-4 w-4 flex-shrink-0" />
          您已有自定义模型「{existingConfigs.find(c => c.isActive)?.name}」，选择内置 AI 后自定义模型将暂停使用
        </div>
      )}

      {/* Security notice */}
      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 text-[10px] text-muted-foreground">
        <Shield className="h-3.5 w-3.5 flex-shrink-0" />
        API Key 仅存储在本地数据库，不会外传。稍后可在顶部「模型配置」中修改。
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={goPrev} className="flex-1 h-10">
          <ArrowLeft className="h-4 w-4 mr-1" /> 返回
        </Button>
        <Button
          onClick={handleSkipAI}
          className="flex-1 h-10 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md shadow-violet-200 dark:shadow-violet-900/40"
        >
          {aiMode === "builtin" ? (
            <>使用内置 AI 并继续 <ArrowRight className="h-4 w-4 ml-1" /></>
          ) : (
            <>跳过，稍后配置 <ArrowRight className="h-4 w-4 ml-1" /></>
          )}
        </Button>
      </div>
    </motion.div>
  );

  const renderFinish = () => {
    const platformLabels = selectedPlatforms.map(p => p === "wechat" ? "朋友圈" : "小红书");
    return (
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="text-center space-y-6 py-4">
        {/* Success Animation */}
        <motion.div variants={staggerItem}>
          <div className="relative inline-block">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
              className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-300/50 dark:shadow-emerald-900/50"
            >
              <CheckCircle2 className="h-10 w-10 text-white" />
            </motion.div>
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 0] }}
              transition={{ duration: 1, delay: 0.3 }}
              className="absolute inset-0 rounded-full border-4 border-emerald-400"
            />
          </div>
        </motion.div>

        <motion.div variants={staggerItem} className="space-y-2">
          <h3 className="text-2xl font-bold">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-teal-500">
              设置完成！
            </span>
          </h3>
          <p className="text-sm text-muted-foreground">您的 AI 运营助手已准备就绪</p>
        </motion.div>

        {/* Summary */}
        <motion.div variants={staggerItem} className="max-w-xs mx-auto">
          <Card className="border-0 shadow-sm card-glow">
            <CardContent className="p-4 space-y-3">
              {[
                { icon: User, label: "人设", value: persona?.name || personaForm.name || "未设置", color: "text-amber-500" },
                { icon: BookOpen, label: "知识库", value: `${knowledgeItems.length} 条`, color: "text-emerald-500" },
                { icon: Target, label: "运营平台", value: platformLabels.join(" + "), color: "text-violet-500" },
                { icon: Cpu, label: "AI 模型", value: aiMode === "builtin" ? "内置 AI" : "自定义模型", color: "text-violet-500" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 text-left">
                  <div className={`h-8 w-8 rounded-lg bg-muted/80 flex items-center justify-center shrink-0`}>
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                    <p className="text-xs font-medium truncate">{item.value}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Next Steps Tips */}
        <motion.div variants={staggerItem} className="max-w-xs mx-auto text-left">
          <p className="text-xs font-semibold mb-2 flex items-center gap-1">
            <Zap className="h-3 w-3 text-amber-500" />
            接下来可以做的事
          </p>
          <div className="space-y-1.5">
            {[
              "生成 30 天内容发布计划",
              "连接平台账号实现自动发布",
              "使用爆款灵感库获取创意",
              "通过 AI 优化已有文案",
            ].map((tip, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />
                {tip}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={staggerItem} className="max-w-xs mx-auto">
          <p className="text-xs font-semibold mb-3 flex items-center gap-1 justify-center">
            <Zap className="h-3 w-3 text-amber-500" />
            快速开始
          </p>
          <div className="space-y-2.5">
            <motion.div
              whileHover={{ scale: 1.02, boxShadow: "0 4px 12px rgba(139, 92, 246, 0.15)" }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring" as const, stiffness: 300, damping: 20 }}
            >
              <Card
                className="cursor-pointer border border-violet-200 dark:border-violet-800 hover:border-violet-300 dark:hover:border-violet-700 transition-colors overflow-hidden"
                onClick={async () => {
                  setGeneratingPlan(true);
                  try {
                    const res = await fetch("/api/ai/batch-generate", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({}),
                    });
                    if (res.ok) {
                      toast.success("30天计划生成中，请在日历页查看");
                    } else {
                      toast.error("生成失败，请稍后重试");
                    }
                  } catch {
                    toast.error("网络错误，请重试");
                  } finally {
                    setGeneratingPlan(false);
                  }
                }}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm shrink-0">
                    <Sparkles className={`h-5 w-5 text-white ${generatingPlan ? "animate-pulse" : ""}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">生成30天计划</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">AI 自动生成完整内容日历</p>
                  </div>
                  {generatingPlan && <Loader2 className="h-4 w-4 animate-spin text-violet-500 shrink-0" />}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02, boxShadow: "0 4px 12px rgba(16, 185, 129, 0.15)" }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring" as const, stiffness: 300, damping: 20 }}
            >
              <Card
                className="cursor-pointer border border-emerald-200 dark:border-emerald-800 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors overflow-hidden"
                onClick={async () => {
                  setImportingDemo(true);
                  try {
                    const isXHS = selectedPlatforms.includes("xiaohongshu");
                    const demoTopics = isXHS
                      ? ["我的护肤心得分享", "办公室好物推荐", "周末探店打卡", "高效学习方法分享", "减脂餐食谱合集"]
                      : ["今日工作感悟", "行业观察笔记", "读书心得分享", "生活小确幸", "个人成长复盘"];
                    const contentType = isXHS ? "drygoods" : "insight";
                    const p = isXHS ? "xiaohongshu" : "wechat";

                    for (let i = 0; i < 5; i++) {
                      const date = new Date();
                      date.setDate(date.getDate() + i);
                      const dateStr = date.toISOString().split("T")[0];

                      await fetch("/api/content", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          scheduledDate: dateStr,
                          contentType,
                          topic: demoTopics[i],
                          content: `这是一篇关于「${demoTopics[i]}」的示例内容，用于演示系统功能。你可以编辑或替换为实际内容。`,
                          platform: p,
                          status: "generated",
                        }),
                      });
                    }
                    toast.success("已导入5条示例数据");
                  } catch {
                    toast.error("导入失败，请重试");
                  } finally {
                    setImportingDemo(false);
                  }
                }}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-sm shrink-0">
                    <Download className={`h-5 w-5 text-white ${importingDemo ? "animate-bounce" : ""}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">导入示例数据</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">快速填充示例内容体验功能</p>
                  </div>
                  {importingDemo && <Loader2 className="h-4 w-4 animate-spin text-emerald-500 shrink-0" />}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02, boxShadow: "0 4px 12px rgba(245, 158, 11, 0.15)" }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring" as const, stiffness: 300, damping: 20 }}
            >
              <Card
                className="cursor-pointer border border-amber-200 dark:border-amber-800 hover:border-amber-300 dark:hover:border-amber-700 transition-colors overflow-hidden"
                onClick={() => { setSettingsCenterOpen(true); }}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-sm shrink-0">
                    <Cpu className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">配置AI模型</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">切换或添加自定义 AI 模型</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>

        {/* Optional: Connect accounts */}
        <motion.div variants={staggerItem}>
          <Button
            variant="outline"
            className="h-9 text-xs gap-1.5 text-muted-foreground"
            onClick={() => { setAccountPanelOpen(true); }}
          >
            <Link2 className="h-3.5 w-3.5" />
            连接平台账号（可选）
          </Button>
        </motion.div>

        <motion.div variants={staggerItem}>
          <Button
            onClick={handleFinish}
            className="w-full max-w-xs h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/40 text-sm font-semibold"
          >
            <Rocket className="h-4 w-4 mr-1.5" />
            开始运营之旅
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </motion.div>
      </motion.div>
    );
  };

  // --- Main Step Content ---
  const stepContent = [
    renderWelcome,
    renderPlatform,
    renderPersona,
    renderKnowledge,
    renderAIModel,
    renderFinish,
  ];

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col items-center justify-start p-4 sm:p-6 overflow-hidden">
      <div className="w-full max-w-md flex flex-col min-h-0 flex-1">
        {/* Progress Indicator - show after welcome step */}
        {step > 0 && step < TOTAL_STEPS - 1 && renderProgress()}
        {step > 0 && step < TOTAL_STEPS - 1 && (
          <div className="mb-4 flex-shrink-0">
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${(step / (TOTAL_STEPS - 1)) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}

        {/* Animated Step Container - scrollable */}
        <div className="relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {stepContent[step]()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// Helper for the BarChart3 icon in JSX
function BarChart3Icon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
    </svg>
  );
}
