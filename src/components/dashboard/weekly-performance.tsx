'use client';

import { BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/components/account-card';
import type { XhsPostInfo } from '@/types';

export function WeeklyPerformanceCard({ posts }: { posts: XhsPostInfo[] }) {
  const dayLabels = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
  const dayEngagement = Array(7).fill(0) as number[];
  for (const post of posts) {
    if (!post.publishDate) continue;
    const date = new Date(post.publishDate);
    const dayIndex = (date.getDay() + 6) % 7;
    dayEngagement[dayIndex] += (post.likes || 0) + (post.comments || 0) + (post.collects || 0);
  }
  const maxEng = Math.max(...dayEngagement, 1);

  // Weekly comparison
  const weeklyData = (() => {
    if (posts.length < 2) return null;
    const sorted = [...posts].sort((a, b) => {
      if (a.publishDate && b.publishDate) return a.publishDate.localeCompare(b.publishDate);
      return 0;
    });
    const mid = Math.max(1, Math.floor(sorted.length / 2));
    const older = sorted.slice(0, mid);
    const newer = sorted.slice(mid);
    const olderEng = older.reduce((s, p) => s + (p.likes || 0) + (p.comments || 0) + (p.collects || 0), 0) / older.length;
    const newerEng = newer.reduce((s, p) => s + (p.likes || 0) + (p.comments || 0) + (p.collects || 0), 0) / newer.length;
    const pctChange = olderEng > 0 ? (((newerEng - olderEng) / olderEng) * 100).toFixed(1) : "0";
    return {
      pctChange: parseFloat(pctChange),
      isPositive: parseFloat(pctChange) >= 0,
    };
  })();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-xhs" />
            互动趋势
          </CardTitle>
          {weeklyData && (
            <Badge variant="secondary" className={cn(
              "text-[10px] border-0",
              weeklyData.isPositive
                ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400"
                : "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400"
            )}>
              较前期 {weeklyData.isPositive ? "+" : ""}{weeklyData.pctChange}%
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
          {dayLabels.map((day, i) => {
            const currentWeek = dayEngagement[i];
            const barPct = Math.round((currentWeek / maxEng) * 100);
            return (
              <div key={day} className="flex items-center gap-3 py-1.5 stagger-item" style={{ animationDelay: `${i * 0.04}s` }}>
                <span className="text-xs font-medium text-muted-foreground w-8 shrink-0">{day}</span>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-5 rounded-md bg-muted/40 overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-xhs/60 to-xhs/30 rounded-md transition-all duration-500"
                      style={{ width: `${Math.max(barPct, 4)}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold tabular-nums w-14 text-right shrink-0">{formatNumber(currentWeek)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
