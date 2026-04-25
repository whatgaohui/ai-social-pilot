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
      <aside className="hidden md:flex w-56 flex-col border-r bg-card h-screen sticky top-0">
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 py-5 border-b">
          <div className="w-8 h-8 rounded-lg bg-xhs flex items-center justify-center">
            <span className="text-white font-bold text-sm">红</span>
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight">小红书AI运营</h1>
            <p className="text-xs text-muted-foreground">智能运营助手</p>
          </div>
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
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-xhs-light text-xhs"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className={cn("w-5 h-5", isActive && "text-xhs")} />
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
        <div className="px-5 py-4 border-t">
          <p className="text-xs text-muted-foreground">v1.0.0</p>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t flex items-center justify-around px-2 py-1 safe-area-bottom">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors",
                isActive ? "text-xhs" : "text-muted-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
