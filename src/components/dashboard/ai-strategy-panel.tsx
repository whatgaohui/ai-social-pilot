'use client';

import { Sparkles, RefreshCw, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { strategyIconMap, priorityBadgeStyle, type StrategyRecommendation } from '@/lib/dashboard-stats';

export function AIStrategyPanel({
  recommendations,
  loading,
  onRefresh,
}: {
  recommendations: StrategyRecommendation[];
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <Card className="overflow-hidden border-purple-200/40 dark:border-purple-900/30 bg-gradient-to-br from-purple-50/30 to-transparent dark:from-purple-950/10">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            AI运营建议
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/20 h-7"
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
            )}
            换一批
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {loading && recommendations.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3 p-3 rounded-xl bg-muted/20">
                <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recommendations.map((rec, i) => {
              const RecIcon = strategyIconMap[rec.icon] || Sparkles;
              return (
                <div
                  key={rec.id}
                  className="flex gap-3 p-3 rounded-xl bg-background/60 hover:bg-background/80 border border-border/30 transition-all duration-200 stagger-item group"
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  <div className="w-9 h-9 rounded-lg bg-purple-100/60 dark:bg-purple-950/30 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200">
                    <RecIcon className="w-4.5 h-4.5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold truncate">{rec.title}</span>
                      <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4 border font-semibold", priorityBadgeStyle[rec.priority])}>
                        {rec.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{rec.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
