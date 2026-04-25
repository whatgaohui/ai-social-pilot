"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, FileText, RefreshCw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import type { XhsAccountInfo } from "@/types";

interface AccountCardProps {
  account: XhsAccountInfo & { postsCount?: number; draftsCount?: number };
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
        <Badge variant="secondary" className="gap-1 text-xs text-green-600 bg-green-50">
          <CheckCircle2 className="w-3 h-3" />
          已同步
        </Badge>
      );
    case "error":
      return (
        <Badge variant="secondary" className="gap-1 text-xs text-red-600 bg-red-50">
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

export function AccountCard({ account, onClick, selected, compact, className }: AccountCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md",
        selected && "ring-2 ring-xhs border-xhs",
        className
      )}
      onClick={onClick}
    >
      <CardContent className={cn("p-4", compact && "p-3")}>
        <div className="flex items-start gap-3">
          <Avatar className={cn(compact ? "w-9 h-9" : "w-11 h-11")}>
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
            {account.lastScrapedAt && !compact && (
              <p className="text-xs text-muted-foreground mt-1">
                最后同步: {new Date(account.lastScrapedAt).toLocaleDateString("zh-CN")}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export { formatNumber };
