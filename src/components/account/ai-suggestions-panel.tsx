'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, X, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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

export function AISuggestionsPanel({ accountId }: { accountId: string | null }) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

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
    <Card className="border-xhs/20 bg-gradient-to-r from-xhs-light/5 to-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />AI 运营建议
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map((s) => {
          const priority = priorityMap[s.priority] || priorityMap.low;
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
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleAction(s.id, 'apply')} disabled={acting === s.id}>
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleAction(s.id, 'dismiss')} disabled={acting === s.id}>
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
  );
}
