"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/app-store";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardView } from "@/components/views/dashboard-view";
import { AccountView } from "@/components/views/account-view";
import { ContentView } from "@/components/views/content-view";
import { PersonaView } from "@/components/views/persona-view";
import { CreatorView } from "@/components/views/creator-view";
import { AnalyticsView } from "@/components/views/analytics-view";
import { SettingsView } from "@/components/views/settings-view";
import { AddAccountDialog } from "@/components/add-account-dialog";
import { CommandPalette } from "@/components/command-palette";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { toast } from "sonner";
import { useNotificationStore } from "@/store/notification-store";

function ExportHandler() {
  const addNotification = useNotificationStore((s) => s.addNotification);

  useEffect(() => {
    const handleExport = async () => {
      try {
        const res = await fetch("/api/export", { method: "POST" });
        const data = await res.json();
        if (data.success) {
          const dateStr = new Date().toISOString().slice(0, 10);
          const filename = `xhs-data-export-${dateStr}.json`;
          const blob = new Blob([JSON.stringify(data.data, null, 2)], {
            type: "application/json",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast.success("数据导出成功！");
          addNotification({
            type: "export",
            title: "数据导出完成",
            message: `已导出 ${data.data.accounts?.length || 0} 个账号的数据`,
            navigateTo: "dashboard",
          });
        } else {
          toast.error(data.error || "导出失败");
        }
      } catch {
        toast.error("网络错误，请重试");
      }
    };

    window.addEventListener("xhs-export", handleExport);
    return () => window.removeEventListener("xhs-export", handleExport);
  }, [addNotification]);

  return null;
}

export default function Home() {
  const { activeTab } = useAppStore();

  const renderView = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardView />;
      case "account":
        return <AccountView />;
      case "analytics":
        return <AnalyticsView />;
      case "content":
        return <ContentView />;
      case "persona":
        return <PersonaView />;
      case "creator":
        return <CreatorView />;
      case "settings":
        return <SettingsView />;
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <AppSidebar />

      {/* Main content */}
      <main className="flex-1 overflow-hidden h-screen bg-muted/30">
        {renderView()}
      </main>

      {/* Global overlays and handlers */}
      <AddAccountDialog />
      <CommandPalette />
      <KeyboardShortcuts />
      <ExportHandler />
    </div>
  );
}
