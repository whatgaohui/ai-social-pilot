'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, X, CheckCircle, Loader2, Wand2, Clock, MessageSquare, User, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { PlanPreviewDialog } from '@/components/account/plan-preview-dialog';
import type { ActionPlan } from '@/types';

interface Suggestion {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: string;
}

const priorityMap: Record<string, { label: string; className: string }> = {
  high: { label: '高优先', className: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
  medium: { label: '中优先', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  low: { label: '低优先', className: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
};

const suggestionTypeMap: Record<string, { planType: 'content' | 'timing' | 'engagement' | 'persona' | 'strategy' | null; buttonLabel: string; buttonIcon: React.ReactNode }> = {
  content_gap: { planType: 'content', buttonLabel: '生成方案', buttonIcon: <Wand2 className="w-3 h-3" /> },
  best_time: { planType: 'timing', buttonLabel: '应用', buttonIcon: <Clock className="w-3 h-3" /> },
  trending: { planType: 'strategy', buttonLabel: '生成计划', buttonIcon: <BarChart3 className="w-3 h-3" /> },
  general: { planType: null, buttonLabel: '应用', buttonIcon: <CheckCircle className="w-3 h-3" /> },
};

export function AISuggestionsPanel({ accountId }: { accountId: string | null }) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState<string | null>(null);
  const [previewPlan, setPreviewPlan] = useState<ActionPlan | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!accountId) return;
    setLoading(true);
    fetch(`/api/accounts/${accountId}/suggestions`)
      .then((r) => r.json())
      .then((json) => { if (json.success) setSuggestions(json.data); })
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false));
  }, [accountId]);

  const handleAction = async (suggestionId: string, action: 'dismiss' | 'apply') => {
    setActing(suggestionId);
    try {
      const res = await fetch(`/api/accounts/${accountId}/suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionId, action }),
      });
      const json = await res.json();
      if (json.success) {
        setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
        toast.success(action === 'dismiss' ? '已忽略该建议' : '已应用该建议');
      }
    } catch {
      toast.error('操作失败，请重试');
    } finally {
      setActing(null);
    }
  };

  const handleGeneratePlan = async (suggestion: Suggestion) => {
    const typeConfig = suggestionTypeMap[suggestion.type] || suggestionTypeMap.general;

    if (!typeConfig.planType) {
      // No plan type, use default apply action
      handleAction(suggestion.id, 'apply');
      return;
    }

    setGeneratingPlan(suggestion.id);
    try {
      const res = await fetch(`/api/accounts/${accountId}/generate-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestionId: suggestion.id,
          suggestionText: suggestion.description,
          suggestionType: typeConfig.planType,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setPreviewPlan(json.data);
        setPreviewOpen(true);
      } else {
        toast.error(json.error || '方案生成失败');
      }
    } catch {
      toast.error('网络错误，请重试');
    } finally {
      setGeneratingPlan(null);
    }
  };

  const handlePlanApplied = () => {
    if (previewPlan) {
      setSuggestions((prev) => prev.filter((s) => s.id !== previewPlan.suggestionId));
    }
    setPreviewPlan(null);
  };

  if (loading) {
    return (
      <Card className="border-xhs/20 bg-gradient-to-r from-xhs-light/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />AI 运营建议
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2 py-6 justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">正在生成建议...</span>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Card className="border-xhs/20 bg-gradient-to-r from-xhs-light/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />AI 运营建议
          </CardTitle>
        </CardHeader>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          暂无建议，当前数据不足以生成个性化建议
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-xhs/20 bg-gradient-to-r from-xhs-light/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />AI 运营建议
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {suggestions.map((s) => {
            const priority = priorityMap[s.priority] || priorityMap.low;
            const typeConfig = suggestionTypeMap[s.type] || suggestionTypeMap.general;
            return (
              <div key={s.id} className="p-3 rounded-xl border border-border/50 bg-background/50 group">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="secondary" className={`text-[10px] border-0 shrink-0 ${priority.className}`}>
                      {priority.label}
                    </Badge>
                    <h4 className="text-sm font-medium truncate">{s.title}</h4>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => handleGeneratePlan(s)}
                      disabled={acting === s.id || generatingPlan === s.id}
                    >
                      {generatingPlan === s.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          {typeConfig.buttonIcon}
                          <span className="ml-1 text-xs">{typeConfig.buttonLabel}</span>
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleAction(s.id, 'dismiss')}
                      disabled={acting === s.id || generatingPlan === s.id}
                    >
                      <X className="w-3 h-3 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{s.description}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <PlanPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        plan={previewPlan}
        accountId={accountId || ''}
        onApplied={handlePlanApplied}
      />
    </>
  );
}
