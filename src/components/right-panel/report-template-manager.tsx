"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileBarChart,
  Plus,
  GripVertical,
  Trash2,
  Pencil,
  Clock,
  Loader2,
  Sparkles,
  CalendarDays,
  Check,
  X,
  Copy,
  Layers,
  History,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────────

type PeriodType = "week" | "month" | "quarter" | "custom";

interface TemplateSection {
  key: string;
  title: string;
  enabled: boolean;
}

interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  isPreset: boolean;
  sections: string; // JSON string
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ReportHistory {
  id: string;
  templateName: string;
  title: string;
  periodType: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}

// ─── Constants ──────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, { gradient: string; bg: string; border: string; badge: string }> = {
  violet: {
    gradient: "from-violet-500 to-purple-600",
    bg: "bg-violet-50 dark:bg-violet-900/20",
    border: "border-violet-200 dark:border-violet-800",
    badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  },
  rose: {
    gradient: "from-rose-500 to-pink-600",
    bg: "bg-rose-50 dark:bg-rose-900/20",
    border: "border-rose-200 dark:border-rose-800",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  },
  amber: {
    gradient: "from-amber-500 to-orange-600",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200 dark:border-amber-800",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
  emerald: {
    gradient: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-200 dark:border-emerald-800",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  cyan: {
    gradient: "from-cyan-500 to-teal-600",
    bg: "bg-cyan-50 dark:bg-cyan-900/20",
    border: "border-cyan-200 dark:border-cyan-800",
    badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  },
};

const ALL_SECTIONS: TemplateSection[] = [
  { key: "overview", title: "概览摘要", enabled: true },
  { key: "top5", title: "内容表现 TOP5", enabled: true },
  { key: "trends", title: "互动趋势", enabled: true },
  { key: "platform", title: "平台对比", enabled: true },
  { key: "suggestions", title: "下周建议", enabled: true },
];

const PERIOD_LABELS: Record<PeriodType, string> = {
  week: "本周",
  month: "本月",
  quarter: "本季度",
  custom: "自定义",
};

// ─── Helpers ────────────────────────────────────────────────────────────

function parseSections(json: string): TemplateSection[] {
  try {
    return JSON.parse(json);
  } catch {
    return ALL_SECTIONS;
  }
}

function formatLastUsed(dateStr: string | null): string {
  if (!dateStr) return "未使用";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}分钟前`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}小时前`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}天前`;
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

// ─── Animation ──────────────────────────────────────────────────────────

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

// ─── Skeleton ───────────────────────────────────────────────────────────

function TemplateSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-xl" />
      ))}
    </div>
  );
}

// ─── Template Card ──────────────────────────────────────────────────────

function TemplateCard({
  template,
  onUse,
  onEdit,
  onDelete,
}: {
  template: Template;
  onUse: (t: Template) => void;
  onEdit: (t: Template) => void;
  onDelete: (id: string) => void;
}) {
  const colors = COLOR_MAP[template.color] || COLOR_MAP.violet;
  const sections = parseSections(template.sections);
  const enabledCount = sections.filter((s) => s.enabled).length;

  return (
    <motion.div variants={itemVariants} layout>
      <Card className="border-0 shadow-sm overflow-hidden card-press">
        <div className="flex">
          {/* Color bar */}
          <div className={`w-1.5 bg-gradient-to-b ${colors.gradient} flex-shrink-0`} />

          <CardContent className="p-3 flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <div className={`h-8 w-8 rounded-lg ${colors.bg} flex items-center justify-center shrink-0`}>
                <span className="text-base">{template.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <h4 className="text-xs font-semibold truncate">{template.name}</h4>
                  {template.isPreset && (
                    <Badge variant="outline" className={`text-[9px] h-4 px-1 border-0 ${colors.badge}`}>
                      预设
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground line-clamp-2 mb-1.5">{template.description}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <Layers className="h-2.5 w-2.5" />
                    {enabledCount}个章节
                  </span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {formatLastUsed(template.lastUsedAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Section Preview */}
            <div className="flex flex-wrap gap-1 mt-2">
              {sections.filter((s) => s.enabled).map((s) => (
                <Badge key={s.key} variant="secondary" className="text-[9px] h-4 px-1.5">
                  {s.title}
                </Badge>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
              <Button
                size="sm"
                className="flex-1 h-7 text-[10px] gap-1 bg-gradient-to-r text-white hover:opacity-90 from-violet-500 to-purple-600"
                onClick={() => onUse(template)}
              >
                <Sparkles className="h-3 w-3" />
                使用模板
              </Button>
              {!template.isPreset && (
                <>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={() => onEdit(template)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-500" onClick={() => onDelete(template.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </div>
      </Card>
    </motion.div>
  );
}

// ─── Custom Template Form ───────────────────────────────────────────────

function CustomTemplateForm({
  initialData,
  onSave,
  onCancel,
}: {
  initialData?: Template;
  onSave: (data: { name: string; description: string; icon: string; color: string; sections: TemplateSection[] }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [icon, setIcon] = useState(initialData?.icon || "📝");
  const [color, setColor] = useState(initialData?.color || "violet");
  const [sections, setSections] = useState<TemplateSection[]>(
    initialData ? parseSections(initialData.sections) : [...ALL_SECTIONS]
  );

  const toggleSection = (key: string) => {
    setSections((prev) =>
      prev.map((s) => (s.key === key ? { ...s, enabled: !s.enabled } : s))
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-medium">模板名称</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="输入模板名称"
          className="h-8 text-xs"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium">模板描述</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="描述模板的用途"
          className="min-h-[60px] text-xs"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-xs font-medium">图标</label>
          <Input value={icon} onChange={(e) => setIcon(e.target.value)} className="h-8 text-xs text-center" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium">主题色</label>
          <Select value={color} onValueChange={setColor}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="violet">紫色</SelectItem>
              <SelectItem value="rose">玫红</SelectItem>
              <SelectItem value="amber">琥珀</SelectItem>
              <SelectItem value="emerald">翡翠</SelectItem>
              <SelectItem value="cyan">青色</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5" />
          报告章节（拖拽排序）
        </label>
        <div className="space-y-1.5">
          {sections.map((section) => (
            <motion.div
              key={section.key}
              layout
              className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                section.enabled ? "bg-background border-border" : "bg-muted/30 border-border/50 opacity-60"
              }`}
            >
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground cursor-grab" />
              <div className="flex-1">
                <span className="text-xs font-medium">{section.title}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={() => toggleSection(section.key)}
              >
                {section.enabled ? (
                  <Check className="h-3 w-3 text-emerald-500" />
                ) : (
                  <X className="h-3 w-3 text-muted-foreground" />
                )}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 justify-end pt-2">
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onCancel}>取消</Button>
        <Button
          size="sm"
          className="h-8 text-xs bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700"
          onClick={() => onSave({ name, description, icon, color, sections })}
          disabled={!name.trim()}
        >
          保存模板
        </Button>
      </div>
    </div>
  );
}

// ─── Use Template Dialog ────────────────────────────────────────────────

function UseTemplateDialog({
  template,
  open,
  onClose,
}: {
  template: Template;
  open: boolean;
  onClose: () => void;
}) {
  const { platform } = useAppStore();
  const [period, setPeriod] = useState<PeriodType>("week");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/report-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: template.id,
          periodType: period,
          platform,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "生成失败");
      }

      toast.success("报告已生成");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "报告生成失败");
    } finally {
      setIsGenerating(false);
    }
  }, [template.id, period, platform, onClose]);

  const sections = parseSections(template.sections);
  const enabledSections = sections.filter((s) => s.enabled);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <span>{template.icon}</span>
            使用「{template.name}」生成报告
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Period Selection */}
          <div className="space-y-2">
            <label className="text-xs font-medium">时间范围</label>
            <div className="grid grid-cols-3 gap-2">
              {(["week", "month", "quarter"] as PeriodType[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`p-2 rounded-lg text-[11px] font-medium text-center transition-all ${
                    period === p
                      ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-sm"
                      : "bg-muted/80 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Included Sections */}
          <div className="space-y-2">
            <label className="text-xs font-medium">包含章节</label>
            <div className="flex flex-wrap gap-1.5">
              {enabledSections.map((s) => (
                <Badge key={s.key} variant="secondary" className="text-[10px] h-5">
                  {s.title}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" className="text-xs" onClick={onClose}>取消</Button>
          <Button
            size="sm"
            className="text-xs bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? <><Loader2 className="h-3 w-3 animate-spin" />生成中...</> : <><Sparkles className="h-3 w-3" />生成报告</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────

export function ReportTemplateManager() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [history, setHistory] = useState<ReportHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [usingTemplate, setUsingTemplate] = useState<Template | null>(null);
  const [activeTab, setActiveTab] = useState<"templates" | "history">("templates");

  // ── Fetch Templates ───────────────────────────────────────────────
  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/report-templates");
      if (res.ok) setTemplates(await res.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch History ─────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/report-generate");
      if (res.ok) {
        const data = await res.json();
        // The API returns a list of history entries
        if (Array.isArray(data)) setHistory(data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchHistory();
  }, [fetchTemplates, fetchHistory]);

  // ── Create Template ───────────────────────────────────────────────
  const handleCreate = useCallback(
    async (data: { name: string; description: string; icon: string; color: string; sections: TemplateSection[] }) => {
      try {
        const res = await fetch("/api/report-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          toast.success("模板已创建");
          setShowCreateDialog(false);
          fetchTemplates();
        } else {
          toast.error("创建失败");
        }
      } catch {
        toast.error("创建失败");
      }
    },
    [fetchTemplates]
  );

  // ── Update Template ───────────────────────────────────────────────
  const handleUpdate = useCallback(
    async (data: { name: string; description: string; icon: string; color: string; sections: TemplateSection[] }) => {
      if (!editingTemplate) return;
      try {
        const res = await fetch(`/api/report-templates/${editingTemplate.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          toast.success("模板已更新");
          setEditingTemplate(null);
          fetchTemplates();
        } else {
          toast.error("更新失败");
        }
      } catch {
        toast.error("更新失败");
      }
    },
    [editingTemplate, fetchTemplates]
  );

  // ── Delete Template ───────────────────────────────────────────────
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/report-templates/${id}`, { method: "DELETE" });
        if (res.ok) {
          toast.success("模板已删除");
          fetchTemplates();
        } else {
          const err = await res.json().catch(() => ({}));
          toast.error(err.error || "删除失败");
        }
      } catch {
        toast.error("删除失败");
      }
    },
    [fetchTemplates]
  );

  const presetTemplates = templates.filter((t) => t.isPreset);
  const customTemplates = templates.filter((t) => !t.isPreset);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-3 pb-1 flex-shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold truncate">报告模板</h3>
            <p className="text-[10px] text-muted-foreground">选择模板快速生成报告</p>
          </div>
          <Button
            size="sm"
            className="h-7 text-[10px] gap-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="h-3 w-3" />
            新建
          </Button>
        </div>

        {/* Tab Switch */}
        <div className="flex items-center h-7 rounded-full bg-muted/80 p-0.5">
          <button
            onClick={() => setActiveTab("templates")}
            className={`flex-1 h-6 rounded-full text-[11px] font-medium transition-colors ${
              activeTab === "templates" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <span className="flex items-center justify-center gap-1">
              <Layers className="h-3 w-3" />
              模板
            </span>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 h-6 rounded-full text-[11px] font-medium transition-colors ${
              activeTab === "history" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <span className="flex items-center justify-center gap-1">
              <History className="h-3 w-3" />
              历史
            </span>
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {/* ── Loading ── */}
          {loading && <TemplateSkeleton />}

          {/* ── Templates Tab ── */}
          {!loading && activeTab === "templates" && (
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-3">
              {/* Preset Templates */}
              {presetTemplates.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <FileBarChart className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground font-medium">预设模板</span>
                  </div>
                  {presetTemplates.map((t) => (
                    <TemplateCard
                      key={t.id}
                      template={t}
                      onUse={(tmpl) => setUsingTemplate(tmpl)}
                      onEdit={(tmpl) => setEditingTemplate(tmpl)}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}

              {/* Custom Templates */}
              {customTemplates.length > 0 && (
                <div className="space-y-2">
                  <Separator className="my-2" />
                  <div className="flex items-center gap-1.5">
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground font-medium">自定义模板</span>
                    <Badge variant="secondary" className="text-[9px] h-4 px-1">{customTemplates.length}</Badge>
                  </div>
                  {customTemplates.map((t) => (
                    <TemplateCard
                      key={t.id}
                      template={t}
                      onUse={(tmpl) => setUsingTemplate(tmpl)}
                      onEdit={(tmpl) => setEditingTemplate(tmpl)}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}

              {/* Empty State */}
              {templates.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8">
                  <Layers className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">暂无模板</p>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── History Tab ── */}
          {!loading && activeTab === "history" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
              {history.length === 0 ? (
                <div className="text-center py-8">
                  <History className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">暂无生成历史</p>
                </div>
              ) : (
                history.map((h) => (
                  <Card key={h.id} className="border-0 shadow-sm">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-muted/80 flex items-center justify-center shrink-0">
                        <FileBarChart className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{h.title}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                          <span>{h.templateName}</span>
                          <span>·</span>
                          <span>{PERIOD_LABELS[h.periodType as PeriodType] || h.periodType}</span>
                          <span>·</span>
                          <span>{h.startDate} ~ {h.endDate}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                ))
              )}
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* ── Create Template Dialog ── */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[400px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">新建报告模板</DialogTitle>
          </DialogHeader>
          <CustomTemplateForm
            onSave={handleCreate}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* ── Edit Template Dialog ── */}
      <Dialog open={!!editingTemplate} onOpenChange={(o) => !o && setEditingTemplate(null)}>
        <DialogContent className="sm:max-w-[400px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">编辑模板</DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <CustomTemplateForm
              initialData={editingTemplate}
              onSave={handleUpdate}
              onCancel={() => setEditingTemplate(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Use Template Dialog ── */}
      {usingTemplate && (
        <UseTemplateDialog
          template={usingTemplate}
          open={!!usingTemplate}
          onClose={() => setUsingTemplate(null)}
        />
      )}
    </div>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
