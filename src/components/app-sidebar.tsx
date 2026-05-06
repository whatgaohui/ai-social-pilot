"use client";

import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import {
  LayoutDashboard,
  UserCircle,
  BarChart3,
  FileText,
  Theater,
  Sparkles,
  Settings,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NotificationCenter } from "@/components/notification-center";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { id: "dashboard" as const, label: "仪表盘", icon: LayoutDashboard },
  { id: "account" as const, label: "账号分析", icon: UserCircle },
  { id: "analytics" as const, label: "数据洞察", icon: BarChart3 },
  { id: "content" as const, label: "内容库", icon: FileText },
  { id: "persona" as const, label: "人设管理", icon: Theater },
  { id: "creator" as const, label: "AI创作", icon: Sparkles },
];

export function AppSidebar() {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 flex-col border-r border-border bg-white dark:bg-neutral-950 h-screen sticky top-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border/60">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-xhs to-xhs-dark flex items-center justify-center shadow-md shadow-xhs/25 group-hover:shadow-lg transition-shadow duration-300">
            <span className="text-white font-bold text-sm">红</span>
          </div>
          <div className="flex-1">
            <h1 className="text-sm font-bold leading-tight tracking-tight gradient-text-xhs">小红书AI运营</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">智能运营助手</p>
          </div>
          <NotificationCenter />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 active:scale-[0.97] nav-item-hover",
                      isActive
                        ? "nav-active-indicator nav-active-glow bg-gradient-to-r from-xhs-light to-xhs-light/40 text-xhs shadow-sm shadow-xhs/5"
                        : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    )}
                  >
                    <item.icon className={cn("w-5 h-5 transition-all duration-150", isActive && "text-xhs")} />
                    {item.label}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="md:hidden">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* Settings + Footer */}
        <div className="px-3 pb-2">
          <button
            onClick={() => setActiveTab("settings")}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 active:scale-[0.97] nav-item-hover",
              activeTab === "settings"
                ? "nav-active-indicator nav-active-glow bg-gradient-to-r from-xhs-light to-xhs-light/40 text-xhs shadow-sm shadow-xhs/5"
                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}
          >
            <Settings className={cn("w-5 h-5 transition-all duration-150", activeTab === "settings" && "text-xhs")} />
            设置
          </button>
        </div>

        <div className="px-5 py-4 border-t border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse" />
              <p className="text-xs text-muted-foreground">v2.1.0</p>
            </div>
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-0 font-medium">
              运行中
            </Badge>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md border-t border-border flex items-center justify-around px-1 pb-[env(safe-area-inset-bottom)]">
        {navItems.slice(0, 5).map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-all duration-150 min-w-[56px] active:scale-[0.97]",
                isActive
                  ? "text-xhs"
                  : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150",
                isActive ? "bg-gradient-to-br from-xhs-light to-xhs-light/40" : ""
              )}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className={cn(
                "text-[10px] font-medium transition-all",
                isActive && "font-semibold"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
        {/* Settings button for mobile */}
        <button
          onClick={() => setActiveTab("settings")}
          className={cn(
            "flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-all duration-150 min-w-[56px] active:scale-[0.97]",
            activeTab === "settings" ? "text-xhs" : "text-muted-foreground"
          )}
        >
          <div className={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150",
            activeTab === "settings" ? "bg-gradient-to-br from-xhs-light to-xhs-light/40" : ""
          )}>
            <Settings className="w-5 h-5" />
          </div>
          <span className={cn(
            "text-[10px] font-medium transition-all",
            activeTab === "settings" && "font-semibold"
          )}>
            设置
          </span>
        </button>
      </nav>
    </>
  );
}
