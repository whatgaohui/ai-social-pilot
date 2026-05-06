'use client';

import { Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ActivityItem } from '@/lib/dashboard-stats';
import { activityBorderColor, formatRelativeTime } from '@/lib/dashboard-stats';

export function ActivityFeedCard({ items }: { items: ActivityItem[] }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Activity className="w-4 h-4 text-xhs" />
          最近动态
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {items.length > 0 ? (
          <div className="space-y-0 max-h-72 overflow-y-auto custom-scrollbar">
            {items.map((item, i) => {
              const ItemIcon = item.icon;
              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 py-2.5 px-2 rounded-lg border-l-[3px] stagger-item transition-colors duration-200 hover:bg-muted/30",
                    activityBorderColor[item.type],
                    i < items.length - 1 && "mb-0.5"
                  )}
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm", item.iconBg)}>
                    <ItemIcon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{item.text}</p>
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0 whitespace-nowrap">
                    {formatRelativeTime(item.time)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">暂无动态</p>
        )}
      </CardContent>
    </Card>
  );
}
