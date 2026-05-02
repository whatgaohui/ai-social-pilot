"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, FileText, RefreshCw, Loader2, CheckCircle2, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import type { XhsAccountInfo } from "@/types";

interface AccountCardProps {
  account: XhsAccountInfo & { postsCount?: number; draftsCount?: number; engagementData?: number[] };
  onClick?: () => void;
  selected?: boolean;
  compact?: boolean;
  className?: string;
}

function formatNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + "万";
  if (num >= 1000) return (num / 1000).toFixed(1) + "k";
  return num.toString();
}

function StatusIndicator({ status }: { status: string }) {
  switch (status) {
    case "scraping":
      return (
        <Badge variant="secondary" className="gap-1 text-xs">
          <Loader2 className="w-3 h-3 animate-spin" />
          采集中
        </Badge>
      );
    case "success":
      return (
        <Badge variant="secondary" className="gap-1 text-xs text-emerald-600 bg-emerald-50 border-0">
          <CheckCircle2 className="w-3 h-3" />
          已同步
        </Badge>
      );
    case "partial":
      return (
        <Badge variant="secondary" className="gap-1 text-xs text-amber-600 bg-amber-50 border-0">
          <AlertCircle className="w-3 h-3" />
          部分采集
        </Badge>
      );
    case "error":
      return (
        <Badge variant="secondary" className="gap-1 text-xs text-red-600 bg-red-50 border-0">
          <AlertCircle className="w-3 h-3" />
          异常
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="gap-1 text-xs">
          <RefreshCw className="w-3 h-3" />
          待采集
        </Badge>
      );
  }
}

function MiniSparkline({ data, color = "#FF2442" }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 28;
  const padding = 2;

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (val - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(" L ")}`;

  // Calculate trend percentage
  const firstVal = data[0] || 0;
  const lastVal = data[data.length - 1] || 0;
  const trendPct = firstVal > 0 ? Math.round(((lastVal - firstVal) / firstVal) * 100) : 0;
  const isUp = trendPct >= 0;

  return (
    <div className="flex items-center gap-1.5">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {firstVal > 0 && (
        <span className={cn("text-[10px] font-medium flex items-center", isUp ? "text-emerald-600" : "text-red-500")}>
          {isUp ? <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> : <TrendingDown className="w-2.5 h-2.5 mr-0.5" />}
          {isUp ? "+" : ""}{trendPct}%
        </span>
      )}
    </div>
  );
}

export function AccountCard({ account, onClick, selected, compact, className }: AccountCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm",
        selected && "ring-2 ring-xhs/60 border-xhs/40 bg-xhs-light/20",
        className
      )}
      onClick={onClick}
    >
      <CardContent className={cn("p-4", compact && "p-3")}>
        <div className="flex items-start gap-3">
          <Avatar className={cn(compact ? "w-9 h-9" : "w-11 h-11", "shrink-0")}>
            <AvatarImage src={account.avatarUrl} alt={account.nickname} />
            <AvatarFallback className="bg-xhs-light text-xhs text-sm font-medium">
              {(account.nickname || "用户").slice(0, 1)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm truncate">
                {account.nickname || "未命名用户"}
              </span>
              <StatusIndicator status={account.status} />
            </div>
            {account.bio && !compact && (
              <p className="text-xs text-muted-foreground truncate mb-2">{account.bio}</p>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {formatNumber(account.followers)}粉丝
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {account.postsCount ?? account.notesCount}笔记
              </span>
            </div>
            {/* Mini sparkline for engagement trend */}
            {account.engagementData && account.engagementData.length >= 2 && !compact && (
              <div className="mt-2 pt-2 border-t border-border/50">
                <MiniSparkline data={account.engagementData} />
              </div>
            )}
            {account.lastScrapedAt && !compact && (
              <p className="text-xs text-muted-foreground mt-1.5">
                最后同步: {new Date(account.lastScrapedAt).toLocaleDateString("zh-CN")}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export { formatNumber, MiniSparkline };
