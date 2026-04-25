"use client";

import { useAppStore } from "@/store/app-store";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardView } from "@/components/views/dashboard-view";
import { AccountView } from "@/components/views/account-view";
import { ContentView } from "@/components/views/content-view";
import { PersonaView } from "@/components/views/persona-view";
import { CreatorView } from "@/components/views/creator-view";
import { AddAccountDialog } from "@/components/add-account-dialog";

export default function Home() {
  const { activeTab } = useAppStore();

  const renderView = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardView />;
      case "account":
        return <AccountView />;
      case "content":
        return <ContentView />;
      case "persona":
        return <PersonaView />;
      case "creator":
        return <CreatorView />;
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <AppSidebar />

      {/* Main content */}
      <main className="flex-1 overflow-hidden h-screen">
        {renderView()}
      </main>

      {/* Add Account Dialog */}
      <AddAccountDialog />
    </div>
  );
}
