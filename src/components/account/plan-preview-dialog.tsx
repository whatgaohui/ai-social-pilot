'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sparkles,
  Calendar,
  MessageSquare,
  User,
  BarChart3,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ActionPlan, PlanType } from '@/types';

interface PlanPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: ActionPlan | null;
  accountId: string;
  onApplied?: () => void;
}

const typeConfig: Record<PlanType, { icon: React.ReactNode; label: string; color: string }> = {
  content: { icon: <Sparkles className="w-5 h-5" />, label: 'AI 内容方案', color: 'text-purple-500' },
  timing: { icon: <Calendar className="w-5 h-5" />, label: 'AI 时间推荐', color: 'text-blue-500' },
  engagement: { icon: <MessageSquare className="w-5 h-5" />, label: 'AI 互动话术', color: 'text-green-500' },
  persona: { icon: <User className="w-5 h-5" />, label: 'AI 人设建议', color: 'text-orange-500' },
  strategy: { icon: <BarChart3 className="w-5 h-5" />, label: 'AI 周运营计划', color: 'text-cyan-500' },
};

export function PlanPreviewDialog({
  open,
  onOpenChange,
  plan,
  accountId,
  onApplied,
}: PlanPreviewDialogProps) {
  const [applying, setApplying] = useState(false);
  const [modifications, setModifications] = useState<{
    title?: string;
    contentBody?: string;
    tags?: string[];
    scheduledAt?: string;
    selectedSlot?: string;
  }>({});

  if (!plan) return null;

  const config = typeConfig[plan.type];

  const handleApply = async () => {
    setApplying(true);
    try {
      const res = await fetch(`/api/accounts/${accountId}/apply-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          modifications: Object.keys(modifications).length > 0 ? modifications : undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(json.data?.message || '方案已应用');
        onApplied?.();
        onOpenChange(false);
      } else {
        toast.error(json.error || '应用失败');
      }
    } catch {
      toast.error('网络错误，请重试');
    } finally {
      setApplying(false);
    }
  };

  const renderContentPlan = () => {
    if (!plan.content) return null;

    const suggestedTime = new Date(plan.content.suggestedTime);
    const formattedTime = suggestedTime.toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">标题</label>
          <p className="text-sm font-semibold mt-1">{plan.content.title}</p>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">内容</label>
          <ScrollArea className="h-[200px] mt-1 rounded-md border border-border/50 p-3">
            <p className="text-sm whitespace-pre-wrap">{plan.content.contentBody}</p>
          </ScrollArea>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">标签</label>
          <div className="flex gap-1 flex-wrap mt-1">
            {plan.content.tags.map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>建议发布时间：{formattedTime}</span>
        </div>
      </div>
    );
  };

  const renderTimingPlan = () => {
    if (!plan.timing) return null;

    const activityMap = {
      high: { label: '粉丝活跃：高', color: 'bg-green-500' },
      medium: { label: '粉丝活跃：中', color: 'bg-yellow-500' },
      low: { label: '粉丝活跃：低', color: 'bg-gray-500' },
    };

    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground mb-3">
          分析显示，你的粉丝在特定时段更活跃。以下是推荐的时间槽：
        </div>

        <div className="space-y-2">
          {plan.timing.slots.map((slot, i) => {
            const time = new Date(slot.time);
            const formatted = time.toLocaleString('zh-CN', {
              month: 'numeric',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
            const activity = activityMap[slot.activity];

            return (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-border transition-colors cursor-pointer"
                onClick={() => setModifications({ selectedSlot: slot.time })}
              >
                <div className={`w-2 h-2 rounded-full ${activity.color}`} />
                <span className="text-sm font-medium">{formatted}</span>
                <Badge variant="outline" className="text-xs">
                  {activity.label}
                </Badge>
              </div>
            );
          })}
        </div>

        {plan.timing.affectedNoteIds.length > 0 && (
          <div className="text-xs text-muted-foreground">
            将调整 {plan.timing.affectedNoteIds.length} 个待发布笔记的时间
          </div>
        )}
      </div>
    );
  };

  const renderEngagementPlan = () => {
    if (!plan.engagement) return null;

    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground mb-3">
          以下是针对不同互动场景的话术模板：
        </div>

        {plan.engagement.scenarios.map((scenario, i) => (
          <div key={i} className="p-3 rounded-lg border border-border/50 bg-background/50">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              {scenario.scenario}
            </div>
            <p className="text-sm">{scenario.template}</p>
          </div>
        ))}
      </div>
    );
  };

  const renderPersonaPlan = () => {
    if (!plan.persona) return null;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">当前标签</label>
            <div className="flex gap-1 flex-wrap mt-1">
              {plan.persona.currentTags.map((tag, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">建议标签</label>
            <div className="flex gap-1 flex-wrap mt-1">
              {plan.persona.suggestedTags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">当前描述</label>
            <p className="text-sm mt-1">{plan.persona.currentDesc}</p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">建议描述</label>
            <p className="text-sm mt-1 text-orange-700">{plan.persona.suggestedDesc}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderStrategyPlan = () => {
    if (!plan.strategy) return null;

    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground mb-3">
          目标：{plan.strategy.goals.join('、')}
        </div>

        <div className="space-y-2">
          {plan.strategy.dailyPlans.map((dayPlan, i) => {
            const date = new Date(dayPlan.date);
            const formatted = date.toLocaleString('zh-CN', {
              weekday: 'short',
              month: 'numeric',
              day: 'numeric',
            });

            return (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border/50">
                <div className="text-sm font-medium">{formatted}</div>
                <div className="text-sm text-muted-foreground">{dayPlan.time}</div>
                <Badge variant="outline" className="text-xs">
                  {dayPlan.topic}
                </Badge>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPlanContent = () => {
    switch (plan.type) {
      case 'content':
        return renderContentPlan();
      case 'timing':
        return renderTimingPlan();
      case 'engagement':
        return renderEngagementPlan();
      case 'persona':
        return renderPersonaPlan();
      case 'strategy':
        return renderStrategyPlan();
      default:
        return <div className="text-sm text-muted-foreground">未知的方案类型</div>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className={config.color}>{config.icon}</span>
            {config.label}
          </DialogTitle>
          <DialogDescription>{plan.description}</DialogDescription>
        </DialogHeader>

        <div className="py-4">{renderPlanContent()}</div>

        <DialogFooter className="gap-2">
          {plan.type === 'engagement' ? (
            <Button variant="default" onClick={() => onOpenChange(false)}>
              <CheckCircle className="w-4 h-4 mr-2" />
              已复制话术
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button variant="default" onClick={handleApply} disabled={applying}>
                {applying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {plan.type === 'content' ? '保存为草稿' : '应用方案'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}