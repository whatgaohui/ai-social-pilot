'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { StatSparkline } from './stat-sparkline';
import { statCardGradients } from '@/lib/dashboard-stats';
import { formatNumber } from '@/components/account-card';

interface StatCardConfig {
  key: string;
  label: string;
  icon: React.ElementType;
  value: string;
  bg: string;
  textColor: string;
  sparkColor: string;
  sparkData: number[];
  trend: { value: number; isPositive: boolean };
}

export function StatsOverview({ stats, transitioning }: { stats: StatCardConfig[]; transitioning: boolean }) {
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4 transition-opacity duration-300", transitioning && "opacity-60")}>
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.key} className={cn("card-hover overflow-hidden relative group border-0 shadow-sm", statCardGradients[stat.key])}>
            <div className={cn("absolute top-0 left-0 right-0 h-[2px] opacity-60 group-hover:opacity-100 transition-opacity duration-300",
              stat.key === "accounts" ? "bg-gradient-to-r from-rose-400 to-rose-500" :
              stat.key === "posts" ? "bg-gradient-to-r from-amber-400 to-amber-500" :
              stat.key === "engagement" ? "bg-gradient-to-r from-emerald-400 to-emerald-500" :
              "bg-gradient-to-r from-xhs to-xhs-dark"
            )} />
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-110", stat.bg)}>
                  <Icon className={cn("w-5 h-5", stat.textColor)} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-extrabold tracking-tight stat-count-animate">{stat.value}</p>
                    <span className={cn(
                      "text-[11px] font-semibold flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-appear",
                      stat.trend.isPositive
                        ? "bg-emerald-100/60 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                        : "bg-red-100/60 dark:bg-red-950/30 text-red-600 dark:text-red-400"
                    )}>
                      {stat.trend.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {stat.trend.isPositive ? "+" : "-"}{stat.trend.value}%
                    </span>
                  </div>
                </div>
              </div>
              <StatSparkline data={stat.sparkData} color={stat.sparkColor} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
