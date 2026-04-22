"use client";

import React from "react";
import { ProgressRing } from "@/components/progress-ring";
import {
  EmptyCalendar,
  EmptyContent,
  EmptyAnalytics,
  EmptyNotifications,
} from "@/components/empty-state-illustrations";

// ─── Memoized ProgressRing ───────────────────────────────────────────────────
// ProgressRing is a pure display component that only depends on its props.
// Wrapping with React.memo avoids re-renders when the parent re-renders but
// the ring's value/size haven't changed.

export const MemoizedProgressRing = React.memo(
  function MemoizedProgressRing(
    props: React.ComponentProps<typeof ProgressRing>
  ) {
    return <ProgressRing {...props} />;
  }
);

// ─── Memoized empty-state illustrations ──────────────────────────────────────
// These are static SVG illustrations — zero dependency on app state.
// They should never re-render once mounted.

export const MemoizedEmptyCalendar = React.memo(EmptyCalendar);
export const MemoizedEmptyContent = React.memo(EmptyContent);
export const MemoizedEmptyAnalytics = React.memo(EmptyAnalytics);
export const MemoizedEmptyNotifications = React.memo(EmptyNotifications);
