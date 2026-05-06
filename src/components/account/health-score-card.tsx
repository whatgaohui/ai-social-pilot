'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, TrendingUp, Users, Palette } from 'lucide-react';

interface HealthScoreData {
  score: number;
  postingScore: number;
  engagementScore: number;
  followerScore: number;
  diversityScore: number;
  calculatedAt?: string;
  factors?: {
    totalPosts: number;
    avgEngagement: number;
    categoryCount: number;
    tagCount: number;
    recentPosts: number;
    message?: string;
  };
}

function CircularProgress({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? 'text-emerald-500' : score >= 60 ? 'text-amber-500' : 'text-red-500';
  const bgColor = score >= 80 ? 'stroke-emerald-200 dark:stroke-emerald-900' : score >= 60 ? 'stroke-amber-200 dark:stroke-amber-900' : 'stroke-red-200 dark:stroke-red-900';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth="8" fill="none" className={`${bgColor} stroke-current`} />
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth="8" fill="none" className={`${color} stroke-current transition-all duration-1000`} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-3xl font-bold ${color}`}>{score}</span>
        <span className="text-xs text-muted-foreground">健康分</span>
      </div>
    </div>
  );
}

function SubScoreBar({ icon: Icon, label, score }: { icon: React.ElementType; label: string; score: number }) {
  const color = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500';
  const textColor = score >= 80 ? 'text-emerald-600 dark:text-emerald-400' : score >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';

  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="text-sm w-16 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-sm font-medium w-8 text-right ${textColor}`}>{score}</span>
    </div>
  );
}

export function HealthScoreCard({ accountId }: { accountId: string | null }) {
  const [data, setData] = useState<HealthScoreData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accountId) return;
    setLoading(true);
    fetch(`/api/accounts/${accountId}/health`)
      .then((r) => r.json())
      .then((json) => { if (json.success) setData(json.data); })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [accountId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <Skeleton className="w-[120px] h-[120px] rounded-full" />
            <div className="flex-1 space-y-3 w-full">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.score === 0) {
    return (
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Activity className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium mb-1">暂无健康数据</p>
            <p className="text-xs text-muted-foreground">{data?.factors?.message || '请先采集账号数据以获取健康评分'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Activity className="w-4 h-4 text-xhs" />账号健康评分
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <CircularProgress score={data.score} />
          <div className="flex-1 space-y-3 w-full">
            <SubScoreBar icon={TrendingUp} label="发布频率" score={data.postingScore} />
            <SubScoreBar icon={Activity} label="互动表现" score={data.engagementScore} />
            <SubScoreBar icon={Users} label="粉丝基础" score={data.followerScore} />
            <SubScoreBar icon={Palette} label="内容多样性" score={data.diversityScore} />
          </div>
        </div>
        {data.factors && !data.factors.message && (
          <div className="mt-4 pt-3 border-t text-xs text-muted-foreground flex flex-wrap gap-4">
            <span>笔记 {data.factors.totalPosts} 篇</span>
            <span>平均互动 {data.factors.avgEngagement}</span>
            <span>分类 {data.factors.categoryCount} 种</span>
            <span>标签 {data.factors.tagCount} 个</span>
            <span>近30天 {data.factors.recentPosts} 篇</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
