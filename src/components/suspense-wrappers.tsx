"use client";

import React, { Suspense } from "react";
import {
  ContentCalendarSkeleton,
  ContentListSkeleton,
  AnalyticsPanelSkeleton,
  DashboardSkeleton,
} from "@/components/skeleton-system";
import { Spinner } from "@/components/inline-loading";

// ─── Suspense + Skeleton Wrappers ───────────────────────────────────────────

/**
 * SuspenseCalendar — Wraps async calendar components with ContentCalendarSkeleton
 */
export function SuspenseCalendar({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ContentCalendarSkeleton />}>
      {children}
    </Suspense>
  );
}

/**
 * SuspenseContentList — Wraps async content list components with ContentListSkeleton
 */
export function SuspenseContentList({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ContentListSkeleton />}>
      {children}
    </Suspense>
  );
}

/**
 * SuspenseAnalytics — Wraps async analytics components with AnalyticsPanelSkeleton
 */
export function SuspenseAnalytics({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AnalyticsPanelSkeleton />}>
      {children}
    </Suspense>
  );
}

/**
 * SuspenseDashboard — Wraps async dashboard overview with DashboardSkeleton
 */
export function SuspenseDashboard({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      {children}
    </Suspense>
  );
}

/**
 * SuspenseDefault — General purpose fallback with a centered spinner
 */
export function SuspenseDefault({
  children,
  label = "加载中...",
}: {
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <Spinner size="md" label={label} />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
