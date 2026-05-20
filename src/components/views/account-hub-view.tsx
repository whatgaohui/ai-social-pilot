"use client";

/**
 * AccountHubView — 账号中心 (v3.1)
 *
 * Unified workspace combining 3 tabs:
 *   - 账号概览  (AccountView)  原"账号分析"页
 *   - 笔记管理  (ContentView)  原"内容库"页，"+ 新建笔记"打开 CreatorView Sheet
 *   - 人设管理  (PersonaView)  原"人设管理"页
 *
 * All 3 sub-views are reused as-is to minimize refactor risk.
 * Future: extract shared header (account selector + 4 metric cards)
 * so it stays visible across tab switches.
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore } from "@/store/app-store";
import { AccountView } from "@/components/views/account-view";
import { ContentView } from "@/components/views/content-view";
import { PersonaView } from "@/components/views/persona-view";
import { CreatorView } from "@/components/views/creator-view";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { LayoutGrid, FileText, Theater } from "lucide-react";
import { cn } from "@/lib/utils";

export function AccountHubView() {
  const {
    accountHubTab,
    setAccountHubTab,
    creatorSheetOpen,
    setCreatorSheetOpen,
  } = useAppStore();

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <Tabs
        value={accountHubTab}
        onValueChange={(v) =>
          setAccountHubTab(v as "overview" | "notes" | "persona")
        }
        className="h-full flex flex-col overflow-hidden"
      >
        {/* Tab triggers — sticky top bar */}
        <div className="shrink-0 border-b border-border/60 bg-background/95 backdrop-blur-md px-4 md:px-6">
          <TabsList className="h-12 bg-transparent gap-1 p-0">
            <TabsTrigger
              value="overview"
              className={cn(
                "h-12 px-4 gap-2 rounded-none border-b-2 border-transparent bg-transparent",
                "data-[state=active]:border-rose-500 data-[state=active]:text-rose-500",
                "data-[state=active]:shadow-none data-[state=active]:bg-transparent",
                "text-muted-foreground hover:text-foreground transition-colors"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              账号概览
            </TabsTrigger>
            <TabsTrigger
              value="notes"
              className={cn(
                "h-12 px-4 gap-2 rounded-none border-b-2 border-transparent bg-transparent",
                "data-[state=active]:border-rose-500 data-[state=active]:text-rose-500",
                "data-[state=active]:shadow-none data-[state=active]:bg-transparent",
                "text-muted-foreground hover:text-foreground transition-colors"
              )}
            >
              <FileText className="w-4 h-4" />
              笔记管理
            </TabsTrigger>
            <TabsTrigger
              value="persona"
              className={cn(
                "h-12 px-4 gap-2 rounded-none border-b-2 border-transparent bg-transparent",
                "data-[state=active]:border-rose-500 data-[state=active]:text-rose-500",
                "data-[state=active]:shadow-none data-[state=active]:bg-transparent",
                "text-muted-foreground hover:text-foreground transition-colors"
              )}
            >
              <Theater className="w-4 h-4" />
              人设管理
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab content — each scrolls independently */}
        <TabsContent
          value="overview"
          className="flex-1 mt-0 overflow-y-auto data-[state=inactive]:hidden"
        >
          <AccountView />
        </TabsContent>

        <TabsContent
          value="notes"
          className="flex-1 mt-0 overflow-y-auto data-[state=inactive]:hidden"
        >
          <ContentView />
        </TabsContent>

        <TabsContent
          value="persona"
          className="flex-1 mt-0 overflow-y-auto data-[state=inactive]:hidden"
        >
          <PersonaView />
        </TabsContent>
      </Tabs>

      {/* AI Creator Sheet — opened by "+ 新建笔记" button anywhere */}
      <Sheet open={creatorSheetOpen} onOpenChange={setCreatorSheetOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[800px] p-0 flex flex-col"
        >
          <SheetHeader className="px-6 py-4 border-b border-border/60 shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <span className="text-xl">✨</span>
              AI 创作笔记
            </SheetTitle>
            <SheetDescription>
              选择主题、风格，AI 帮你生成爆款笔记
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            <CreatorView />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}