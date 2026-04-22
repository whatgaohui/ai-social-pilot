"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Wave Shimmer Animation Helper ──────────────────────────────────────────

function WaveItem({ children, index, total }: { children: React.ReactNode; index: number; total: number }) {
  const delay = (index / total) * 1.5; // Stagger over 1.5s
  return (
    <div
      className="skeleton-wave"
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}

// ─── Content Calendar Skeleton ──────────────────────────────────────────────

export function ContentCalendarSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="p-3 space-y-2.5">
      {/* Calendar header */}
      <div className="flex items-center justify-between mb-3">
        <WaveItem index={0} total={20}>
          <Skeleton className="h-5 w-28" />
        </WaveItem>
        <WaveItem index={1} total={20}>
          <div className="flex gap-1">
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-7 w-7 rounded-md" />
          </div>
        </WaveItem>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["一", "二", "三", "四", "五", "六", "日"].map((d, i) => (
          <WaveItem key={d} index={i + 2} total={20}>
            <div className="h-6 flex items-center justify-center">
              <span className="text-[10px] text-muted-foreground">{d}</span>
            </div>
          </WaveItem>
        ))}
      </div>

      {/* Calendar grid rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, colIdx) => {
            const cellIndex = rowIdx * 7 + colIdx;
            return (
              <WaveItem key={colIdx} index={cellIndex + 9} total={40}>
                <div className="aspect-square rounded-lg bg-muted/50 flex flex-col items-center justify-center gap-0.5">
                  <Skeleton className="h-3.5 w-3.5 rounded" />
                  {cellIndex % 4 === 0 && <Skeleton className="h-1 w-4 rounded-full" />}
                </div>
              </WaveItem>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Content List Skeleton ──────────────────────────────────────────────────

export function ContentListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="p-3 space-y-2">
      {/* List header */}
      <WaveItem index={0} total={count * 3 + 2}>
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-7 w-7 rounded-lg" />
        </div>
      </WaveItem>

      {/* List items */}
      {Array.from({ length: count }).map((_, idx) => (
        <WaveItem key={idx} index={idx * 3 + 1} total={count * 3 + 2}>
          <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/30">
            {/* Date badge */}
            <div className="flex flex-col items-center gap-0.5 min-w-[36px]">
              <Skeleton className="h-5 w-8 rounded" />
              <Skeleton className="h-3 w-6 rounded" />
            </div>

            {/* Content */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-3/5 rounded" />
                <Skeleton className="h-4 w-10 rounded-full" />
              </div>
              <Skeleton className="h-3 w-full rounded" />
              <Skeleton className="h-3 w-4/5 rounded" />
              {/* Tags/badges row */}
              <div className="flex gap-1.5 pt-1">
                <Skeleton className="h-4 w-12 rounded-full" />
                <Skeleton className="h-4 w-14 rounded-full" />
                {idx % 2 === 0 && <Skeleton className="h-4 w-10 rounded-full" />}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-1">
              <Skeleton className="h-6 w-6 rounded-md" />
              <Skeleton className="h-6 w-6 rounded-md" />
              <Skeleton className="h-6 w-6 rounded-md" />
            </div>
          </div>
        </WaveItem>
      ))}
    </div>
  );
}

// ─── Analytics Panel Skeleton ───────────────────────────────────────────────

export function AnalyticsPanelSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {/* Tab bar */}
      <WaveItem index={0} total={20}>
        <div className="flex gap-1 mb-2">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      </WaveItem>

      {/* Stats cards row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <WaveItem key={i} index={i + 1} total={20}>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/30 space-y-2">
              <Skeleton className="h-3 w-16 rounded" />
              <Skeleton className="h-6 w-12 rounded" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          </WaveItem>
        ))}
      </div>

      {/* Chart area */}
      <WaveItem index={6} total={20}>
        <div className="h-48 rounded-xl bg-muted/20 border border-border/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-6 w-16 rounded-lg" />
          </div>
          {/* Chart bars */}
          <div className="flex items-end gap-2 h-32">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end">
                <Skeleton
                  className="w-full rounded-t"
                  style={{ height: `${30 + Math.random() * 60}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-8 rounded" />
            ))}
          </div>
        </div>
      </WaveItem>

      {/* Secondary chart / list */}
      <WaveItem index={8} total={20}>
        <div className="h-36 rounded-xl bg-muted/20 border border-border/30 p-4 space-y-3">
          <Skeleton className="h-4 w-20 rounded" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-6 w-6 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-20 rounded" />
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
                <Skeleton className="h-4 w-10 rounded" />
              </div>
            ))}
          </div>
        </div>
      </WaveItem>
    </div>
  );
}

// ─── Content Editor Skeleton ────────────────────────────────────────────────

export function ContentEditorSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <WaveItem index={0} total={20}>
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border/50">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-7 rounded-md" />
          ))}
          <div className="flex-1" />
          <Skeleton className="h-7 w-16 rounded-md" />
          <Skeleton className="h-7 w-20 rounded-md" />
        </div>
      </WaveItem>

      {/* Editor body with sidebar */}
      <div className="flex flex-1 min-h-0">
        {/* Main editing area */}
        <div className="flex-1 p-4 space-y-3">
          <WaveItem index={1} total={20}>
            {/* Title input */}
            <Skeleton className="h-8 w-3/4 rounded-lg" />
          </WaveItem>
          <WaveItem index={2} total={20}>
            {/* Textarea lines */}
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-3 rounded"
                  style={{ width: `${60 + Math.random() * 40}%` }}
                />
              ))}
            </div>
          </WaveItem>
          <WaveItem index={3} total={20}>
            {/* Empty line */}
            <Skeleton className="h-3 w-full rounded" />
          </WaveItem>
          <WaveItem index={4} total={20}>
            {/* More text lines */}
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-3 rounded"
                  style={{ width: `${50 + Math.random() * 50}%` }}
                />
              ))}
            </div>
          </WaveItem>
        </div>

        {/* Sidebar */}
        <WaveItem index={5} total={20}>
          <div className="hidden sm:block w-56 border-l border-border/50 p-3 space-y-3">
            <Skeleton className="h-5 w-20 rounded" />
            {/* AI suggestion cards */}
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-2 rounded-lg bg-muted/30 space-y-1.5">
                <Skeleton className="h-3 w-16 rounded" />
                <Skeleton className="h-3 w-full rounded" />
                <Skeleton className="h-3 w-4/5 rounded" />
                <div className="flex gap-1 pt-1">
                  <Skeleton className="h-5 w-10 rounded-md" />
                  <Skeleton className="h-5 w-10 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </WaveItem>
      </div>
    </div>
  );
}

// ─── Dashboard Skeleton ─────────────────────────────────────────────────────

export function DashboardSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {/* Stat cards row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <WaveItem key={i} index={i} total={20}>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/30 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-5 w-5 rounded-md" />
                <Skeleton className="h-3 w-14 rounded" />
              </div>
              <Skeleton className="h-7 w-16 rounded" />
              <Skeleton className="h-2.5 w-full rounded-full" />
            </div>
          </WaveItem>
        ))}
      </div>

      {/* Charts + Timeline grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Main chart (2 cols) */}
        <WaveItem index={5} total={20}>
          <div className="sm:col-span-2 h-56 rounded-xl bg-muted/20 border border-border/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24 rounded" />
              <div className="flex gap-1">
                <Skeleton className="h-6 w-12 rounded-md" />
                <Skeleton className="h-6 w-12 rounded-md" />
              </div>
            </div>
            {/* Line chart placeholder */}
            <div className="flex items-center gap-3 h-36">
              <div className="flex flex-col justify-between h-full py-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-2.5 w-6 rounded" />
                ))}
              </div>
              <div className="flex-1 relative">
                <svg viewBox="0 0 400 140" className="w-full h-full">
                  <polyline
                    points="0,120 60,80 120,100 180,50 240,70 300,30 360,60 400,40"
                    fill="none"
                    className="stroke-muted-foreground/15"
                    strokeWidth="2"
                  />
                  <polyline
                    points="0,120 60,80 120,100 180,50 240,70 300,30 360,60 400,40"
                    fill="url(#skeletonGradient)"
                    className="opacity-30"
                    strokeWidth="0"
                  />
                  <defs>
                    <linearGradient id="skeletonGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" className="stroke-muted-foreground/10" />
                      <stop offset="100%" className="stroke-transparent" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
        </WaveItem>

        {/* Activity timeline (1 col) */}
        <WaveItem index={6} total={20}>
          <div className="h-56 rounded-xl bg-muted/20 border border-border/30 p-4 space-y-3">
            <Skeleton className="h-4 w-16 rounded" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Skeleton className="h-5 w-5 rounded-full mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-full rounded" />
                    <Skeleton className="h-2.5 w-12 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </WaveItem>
      </div>
    </div>
  );
}

// ─── Feed Skeleton (for infinite scroll) ────────────────────────────────────

export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3 p-3">
      {Array.from({ length: count }).map((_, idx) => (
        <WaveItem key={idx} index={idx * 4} total={count * 4}>
          <div className="rounded-xl border border-border/30 bg-muted/20 p-4 space-y-3">
            {/* Header: avatar + name + time */}
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3.5 w-24 rounded" />
                <Skeleton className="h-2.5 w-16 rounded" />
              </div>
              <Skeleton className="h-7 w-14 rounded-full" />
            </div>

            {/* Content text */}
            <div className="space-y-1.5 pl-[46px]">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-3 rounded"
                  style={{ width: i === 2 ? "70%" : "100%" }}
                />
              ))}
            </div>

            {/* Optional image placeholder */}
            {idx % 2 === 0 && (
              <div className="pl-[46px]">
                <Skeleton className="h-40 w-full rounded-lg" />
              </div>
            )}

            {/* Engagement bar */}
            <div className="flex items-center gap-4 pl-[46px] pt-1">
              <Skeleton className="h-4 w-12 rounded" />
              <Skeleton className="h-4 w-12 rounded" />
              <Skeleton className="h-4 w-12 rounded" />
            </div>
          </div>
        </WaveItem>
      ))}
    </div>
  );
}
