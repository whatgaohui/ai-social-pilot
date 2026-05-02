"use client";

import { cn } from "@/lib/utils";
import { useNotificationStore } from "@/store/notification-store";
import { useAppStore } from "@/store/app-store";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Check, FileText, RefreshCw, Sparkles, Trash2, Download, Info } from "lucide-react";

const typeConfig: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  scrape: { icon: RefreshCw, color: "text-emerald-600", bg: "bg-emerald-50" },
  analysis: { icon: Sparkles, color: "text-xhs", bg: "bg-xhs-light" },
  draft: { icon: FileText, color: "text-amber-600", bg: "bg-amber-50" },
  export: { icon: Download, color: "text-blue-600", bg: "bg-blue-50" },
  delete: { icon: Trash2, color: "text-red-600", bg: "bg-red-50" },
  info: { icon: Info, color: "text-gray-600", bg: "bg-gray-50" },
};

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "刚刚";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

export function NotificationCenter() {
  const { notifications, markAsRead, markAllAsRead, unreadCount } = useNotificationStore();
  const { setActiveTab, setSelectedAccountId } = useAppStore();
  const unread = unreadCount();

  const handleNotificationClick = (id: string, navigateTo?: string, accountId?: string) => {
    markAsRead(id);
    if (navigateTo) {
      setActiveTab(navigateTo as 'dashboard' | 'account' | 'content' | 'persona' | 'creator');
    }
    if (accountId) {
      setSelectedAccountId(accountId);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-lg hover:bg-muted/80"
        >
          <Bell className="w-4.5 h-4.5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-xhs text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 p-0 border border-border"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">通知中心</h3>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-xhs hover:text-xhs-dark h-7 px-2"
              onClick={markAllAsRead}
            >
              <Check className="w-3 h-3 mr-1" />
              全部已读
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
              <p>暂无通知</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notif) => {
                const config = typeConfig[notif.type] || typeConfig.info;
                const Icon = config.icon;
                return (
                  <button
                    key={notif.id}
                    className={cn(
                      "w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted/50 transition-colors",
                      !notif.read && "bg-xhs-light/20"
                    )}
                    onClick={() => handleNotificationClick(notif.id, notif.navigateTo, notif.accountId)}
                  >
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", config.bg)}>
                      <Icon className={cn("w-4 h-4", config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm", !notif.read && "font-medium")}>{notif.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                      <p className="text-[11px] text-muted-foreground/70 mt-1">{formatTimeAgo(notif.timestamp)}</p>
                    </div>
                    {!notif.read && (
                      <div className="w-2 h-2 rounded-full bg-xhs shrink-0 mt-2" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
