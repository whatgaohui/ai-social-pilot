"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Shared skeleton loaders ─────────────────────────────────────────────────

/** Minimal inline placeholder for dialog trigger icons (e.g. SettingsCenter button) */
function InlineSkeleton({ className = "" }: { className?: string }) {
  return <Skeleton className={`animate-pulse rounded-lg ${className}`} />;
}

/** Skeleton for dialog/overlay components — small circle while loading */
function DialogSkeleton() {
  return (
    <div className="flex items-center justify-center">
      <Skeleton className="h-8 w-8 rounded-lg" />
    </div>
  );
}

/** Skeleton for tab content area — matches full tab panel height */
function TabContentSkeleton() {
  return (
    <div className="flex-1 p-4 space-y-4 animate-pulse">
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    </div>
  );
}

/** Skeleton for the WelcomeOnboarding full-screen overlay */
function OnboardingSkeleton() {
  return (
    <div className="h-full flex items-center justify-center animate-pulse">
      <div className="space-y-4 text-center">
        <Skeleton className="h-16 w-16 rounded-2xl mx-auto" />
        <Skeleton className="h-6 w-48 mx-auto" />
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>
    </div>
  );
}

// ─── Dialog / overlay components — only loaded when opened ────────────────────

export const LazySettingsCenter = dynamic(
  () =>
    import("./settings-center").then((mod) => ({
      default: mod.SettingsCenter,
    })),
  {
    ssr: false,
    loading: () => <InlineSkeleton className="h-8 w-8" />,
  }
);

export const LazyCommandPalette = dynamic(
  () =>
    import("./command-palette").then((mod) => ({
      default: mod.CommandPalette,
    })),
  { ssr: false, loading: () => null }
);

export const LazyContentSearch = dynamic(
  () =>
    import("./content-search").then((mod) => ({
      default: mod.ContentSearch,
    })),
  { ssr: false, loading: () => null }
);

export const LazyKeyboardShortcutsDialog = dynamic(
  () =>
    import("./keyboard-shortcuts-help").then((mod) => ({
      default: mod.KeyboardShortcutsHelp,
    })),
  { ssr: false, loading: () => null }
);

export const LazyPlatformAccountPanel = dynamic(
  () =>
    import("./platform-account-panel").then((mod) => ({
      default: mod.PlatformAccountPanel,
    })),
  { ssr: false, loading: () => null }
);

export const LazyAIWritingAssistant = dynamic(
  () =>
    import("./ai-writing-assistant").then((mod) => ({
      default: mod.AIWritingAssistant,
    })),
  { ssr: false, loading: () => null }
);

export const LazyWelcomeOnboarding = dynamic(
  () =>
    import("./welcome-onboarding").then((mod) => ({
      default: mod.WelcomeOnboarding,
    })),
  { ssr: false, loading: () => <OnboardingSkeleton /> }
);

// ─── Tab-based components — lazy loaded per tab ──────────────────────────────

export const LazyDashboardOverview = dynamic(
  () =>
    import("./dashboard-overview").then((mod) => ({
      default: mod.DashboardOverview,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="mx-4 mt-3 mb-2 space-y-3 animate-pulse">
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    ),
  }
);

export const LazyContentWorkspace = dynamic(
  () =>
    import("./right-panel/content-workspace").then((mod) => ({
      default: mod.ContentWorkspace,
    })),
  { ssr: false, loading: () => <TabContentSkeleton /> }
);

export const LazyDataAndReports = dynamic(
  () =>
    import("./right-panel/data-and-reports").then((mod) => ({
      default: mod.DataAndReports,
    })),
  { ssr: false, loading: () => <TabContentSkeleton /> }
);

export const LazyAccountCollector = dynamic(
  () =>
    import("./right-panel/account-collector").then((mod) => ({
      default: mod.AccountCollector,
    })),
  { ssr: false, loading: () => <TabContentSkeleton /> }
);
