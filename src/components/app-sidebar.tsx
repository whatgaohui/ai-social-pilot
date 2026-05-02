"use client";

import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import {
  LayoutDashboard,
  UserCircle,
  FileText,
  Theater,
  Sparkles,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NotificationCenter } from "@/components/notification-center";

const navItems = [
  { id: "dashboard" as const, label: "仪表盘", icon: LayoutDashboard },
  { id: "account" as const, label: "账号分析", icon: UserCircle },
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
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
          <div className="w-9 h-9 rounded-xl bg-xhs flex items-center justify-center shadow-sm shadow-xhs/20">
            <span className="text-white font-bold text-sm">红</span>
          </div>
          <div className="flex-1">
            <h1 className="text-sm font-bold leading-tight tracking-tight">小红书AI运营</h1>
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
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 active:scale-[0.97]",
                      isActive
                        ? "nav-active-indicator bg-gradient-to-r from-xhs-light to-xhs-light/40 text-xhs shadow-sm shadow-xhs/5"
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

        {/* Footer info */}
        <div className="px-5 py-4 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <p className="text-xs text-muted-foreground">v1.0.0 · 运行中</p>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md border-t border-border flex items-center justify-around px-1 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
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
      </nav>
    </>
  );
}
