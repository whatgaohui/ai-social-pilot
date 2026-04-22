"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/* ─── 骨架屏系统 — 可复用的加载占位组件 ─── */

/**
 * ContentCardSkeleton
 * 匹配内容卡片布局：标题栏 + 3行文本
 */
export function ContentCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-4 space-y-3 loading-skeleton-shimmer",
        className
      )}
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      {/* 分割线 */}
      <Skeleton className="h-px w-full" />
      {/* 文本行 */}
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="h-3.5 w-3/5" />
      </div>
      {/* 底部操作栏 */}
      <div className="flex items-center gap-2 pt-1">
        <Skeleton className="h-6 w-16 rounded-md" />
        <Skeleton className="h-6 w-16 rounded-md" />
        <div className="flex-1" />
        <Skeleton className="h-4 w-12 rounded" />
      </div>
    </div>
  );
}

/**
 * CalendarSkeleton
 * 匹配日历网格：7列网格的骨架单元格
 */
export function CalendarSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("p-4 space-y-3 loading-skeleton-shimmer", className)}>
      {/* 月份标题 */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-28" />
        <div className="flex gap-1.5">
          <Skeleton className="h-7 w-7 rounded-md" />
          <Skeleton className="h-7 w-7 rounded-md" />
        </div>
      </div>
      {/* 星期头 */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full rounded" />
        ))}
      </div>
      {/* 日历格子 */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-8 w-full rounded-md"
          />
        ))}
      </div>
    </div>
  );
}

/**
 * ListSkeleton
 * 通用列表骨架，支持可配置行数
 */
export function ListSkeleton({
  rows = 5,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg border bg-card p-3 loading-skeleton-shimmer"
        >
          <Skeleton className="h-9 w-9 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-5 w-14 rounded-full flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

/**
 * ProfileCardSkeleton
 * 匹配人设/个人资料卡片布局
 */
export function ProfileCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-4 space-y-4 loading-skeleton-shimmer",
        className
      )}
    >
      {/* 头像 + 基本信息 */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
      {/* 标签 */}
      <div className="flex flex-wrap gap-1.5">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-18 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      {/* 统计数据 */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="text-center space-y-1">
            <Skeleton className="h-5 w-10 mx-auto rounded" />
            <Skeleton className="h-3 w-12 mx-auto rounded" />
          </div>
        ))}
      </div>
      {/* 简介 */}
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  );
}
