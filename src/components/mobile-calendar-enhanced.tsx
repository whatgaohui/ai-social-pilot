"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import type { ContentPost } from "@/types";
import { BottomSheet } from "@/components/bottom-sheet";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isToday,
  isSameMonth,
  addMonths,
  subMonths,
  parseISO,
  isSameDay,
} from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  FileText,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────

interface MobileCalendarEnhancedProps {
  className?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

const STATUS_DOT_COLORS: Record<string, string> = {
  planned: "bg-gray-400",
  generated: "bg-sky-500",
  optimized: "bg-amber-500",
  published: "bg-violet-500",
};

const PLATFORM_DOT_COLORS: Record<string, string> = {
  wechat: "bg-green-500",
  xiaohongshu: "bg-red-500",
};

// ─── Spring config ────────────────────────────────────────────────────────

const SPRING = { type: "spring" as const, stiffness: 350, damping: 32 };

// ─── Component ────────────────────────────────────────────────────────────

export function MobileCalendarEnhanced({ className = "" }: MobileCalendarEnhancedProps) {
  const { contentPosts, selectedDate, setSelectedDate, setSelectedPostId } = useAppStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetDate, setSheetDate] = useState<string>("");
  const [slideDir, setSlideDir] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const isSwiping = useRef(false);

  // Calendar math
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = (getDay(monthStart) + 6) % 7; // Monday = 0

  // Pad days from previous month
  const padStart = Array.from({ length: startDayOfWeek }, (_, i) => {
    const d = new Date(monthStart);
    d.setDate(d.getDate() - (startDayOfWeek - i));
    return d;
  });

  // Pad days from next month to complete grid
  const totalCells = Math.ceil((padStart.length + daysInMonth.length) / 7) * 7;
  const remaining = totalCells - padStart.length - daysInMonth.length;
  const padEnd = Array.from({ length: remaining }, (_, i) => {
    const d = new Date(monthEnd);
    d.setDate(d.getDate() + i + 1);
    return d;
  });

  const allDays = [...padStart, ...daysInMonth, ...padEnd];

  // Posts by date
  const postsByDate = useMemo(() => {
    const map: Record<string, ContentPost[]> = {};
    contentPosts.forEach((post) => {
      if (!map[post.scheduledDate]) map[post.scheduledDate] = [];
      map[post.scheduledDate].push(post);
    });
    return map;
  }, [contentPosts]);

  // Mini month indicators (prev, current, next)
  const miniMonths = useMemo(() => {
    return [
      subMonths(currentMonth, 1),
      currentMonth,
      addMonths(currentMonth, 1),
    ];
  }, [currentMonth]);

  const miniMonthData = useMemo(() => {
    return miniMonths.map((m) => {
      const start = startOfMonth(m);
      const end = endOfMonth(m);
      const days = eachDayOfInterval({ start, end });
      const count = days.reduce((acc, day) => {
        const ds = format(day, "yyyy-MM-dd");
        const posts = postsByDate[ds];
        return acc + (posts ? posts.length : 0);
      }, 0);
      return {
        month: m,
        label: format(m, "M月"),
        postCount: count,
        isCurrent: isSameMonth(m, new Date()),
      };
    });
  }, [miniMonths, postsByDate]);

  // Handlers
  const goToPrevMonth = useCallback(() => {
    setSlideDir(1);
    setCurrentMonth((prev) => subMonths(prev, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setSlideDir(-1);
    setCurrentMonth((prev) => addMonths(prev, 1));
  }, []);

  const handleDayTap = useCallback(
    (date: Date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      setSelectedDate(dateStr);
      const posts = postsByDate[dateStr];
      if (posts && posts.length > 0) {
        setSheetDate(dateStr);
        setSheetOpen(true);
      }
    },
    [postsByDate, setSelectedDate],
  );

  const handleFAB = useCallback(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    setSheetDate(today);
    setSheetOpen(true);
  }, []);

  // Swipe handlers for month change
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartX.current = e.touches[0].clientX;
    isSwiping.current = true;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!isSwiping.current) return;
      isSwiping.current = false;
      const delta = e.changedTouches[0].clientX - dragStartX.current;
      if (Math.abs(delta) > 60) {
        if (delta > 0) goToPrevMonth();
        else goToNextMonth();
      }
    },
    [goToPrevMonth, goToNextMonth],
  );

  // Posts for selected day (for bottom sheet)
  const dayPosts = useMemo(() => {
    if (!sheetDate) return [];
    return postsByDate[sheetDate] || [];
  }, [sheetDate, postsByDate]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Month header with swipe support */}
      <div className="flex items-center justify-between px-4 pb-2">
        <button
          onClick={goToPrevMonth}
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-muted/50 active:bg-muted transition-colors tap-target"
          aria-label="上个月"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center">
          <motion.span
            key={format(currentMonth, "yyyy-MM")}
            initial={{ opacity: 0, y: slideDir !== 0 ? slideDir * 10 : 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={SPRING}
            className="text-sm font-semibold"
          >
            {format(currentMonth, "yyyy年M月", { locale: zhCN })}
          </motion.span>
        </div>

        <button
          onClick={goToNextMonth}
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-muted/50 active:bg-muted transition-colors tap-target"
          aria-label="下个月"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 px-3 pb-1">
        {WEEKDAYS.map((day, idx) => (
          <div
            key={day}
            className={`text-center text-[10px] font-medium py-1 ${
              idx >= 5 ? "text-muted-foreground/60" : "text-muted-foreground"
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid with swipe gesture */}
      <motion.div
        key={format(currentMonth, "yyyy-MM")}
        initial={{ opacity: 0, x: slideDir !== 0 ? slideDir * 60 : 0 }}
        animate={{ opacity: 1, x: 0 }}
        transition={SPRING}
        className="grid grid-cols-7 gap-px px-3"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {allDays.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isTodayDate = isToday(day);
          const isSelected = selectedDate === dateStr;
          const posts = postsByDate[dateStr];
          const hasPosts = posts && posts.length > 0;

          return (
            <button
              key={dateStr}
              onClick={() => handleDayTap(day)}
              className={`
                relative flex flex-col items-center justify-center
                h-11 min-h-[44px] rounded-xl transition-colors duration-150 touch-target
                ${isCurrentMonth ? "" : "opacity-30"}
                ${isSelected ? "bg-primary text-primary-foreground" : ""}
                ${isTodayDate && !isSelected ? "ring-1 ring-primary/40" : ""}
                ${hasPosts && !isSelected ? "font-semibold" : ""}
              `}
              aria-label={format(day, "M月d日")}
            >
              <span className="text-xs tabular-nums leading-none">{format(day, "d")}</span>

              {/* Post indicator dots */}
              {hasPosts && (
                <div className="flex items-center gap-[2px] mt-0.5">
                  {posts.slice(0, 3).map((post) => (
                    <span
                      key={post.id}
                      className={`h-[4px] w-[4px] rounded-full ${
                        isSelected ? "bg-primary-foreground/80" : PLATFORM_DOT_COLORS[post.platform || "wechat"]
                      }`}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </motion.div>

      {/* Mini month indicator bar */}
      <div className="flex items-center justify-center gap-6 px-4 pt-3 pb-1">
        {miniMonthData.map((data) => {
          const isActive = isSameMonth(data.month, currentMonth);
          return (
            <button
              key={data.label}
              onClick={() => setCurrentMonth(data.month)}
              className="flex items-center gap-1.5 tap-target"
            >
              <span
                className={`text-[10px] font-medium transition-colors ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {data.label}
              </span>
              <div className="flex items-center gap-[2px]">
                {data.postCount > 0 ? (
                  Array.from({ length: Math.min(data.postCount, 5) }).map((_, i) => (
                    <motion.span
                      key={i}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.03, type: "spring", stiffness: 500, damping: 25 }}
                      className={`h-[5px] w-[5px] rounded-full ${
                        data.isCurrent
                          ? "bg-emerald-500"
                          : "bg-muted-foreground/30"
                      }`}
                    />
                  ))
                ) : (
                  <span className="h-[5px] w-[5px] rounded-full bg-muted-foreground/15" />
                )}
              </div>
              {data.postCount > 5 && (
                <span className="text-[8px] text-muted-foreground tabular-nums">
                  +{data.postCount - 5}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Quick Add FAB */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.3 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.92 }}
        onClick={handleFAB}
        className="mobile-fab fixed right-4 bottom-24 z-40 sm:hidden
          flex items-center justify-center w-12 h-12 rounded-full
          bg-gradient-to-br from-violet-500 to-purple-600
          text-white shadow-lg shadow-violet-500/25
          active:shadow-md transition-shadow"
        aria-label="快速添加"
      >
        <Plus className="h-5 w-5" />
        <span className="mobile-fab-ripple absolute inset-0 rounded-full" />
      </motion.button>

      {/* Day Detail Bottom Sheet */}
      <BottomSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={sheetDate ? format(parseISO(sheetDate), "M月d日 EEEE", { locale: zhCN }) : ""}
        initialSnap={0}
        snapPoints={[0.4, 0.75]}
      >
        {dayPosts.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">
                共 {dayPosts.length} 条内容
              </span>
            </div>
            {dayPosts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                onClick={() => {
                  setSelectedPostId(post.id);
                  setSheetOpen(false);
                }}
                className="flex items-center gap-2 p-3 rounded-xl border border-border/60
                  hover:bg-muted/50 active:bg-muted/80 transition-colors cursor-pointer tap-target"
              >
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className={`h-[5px] w-[5px] rounded-full ${PLATFORM_DOT_COLORS[post.platform || "wechat"]}`} />
                  <span className={`h-[5px] w-[5px] rounded-full ${STATUS_DOT_COLORS[post.status] || "bg-gray-400"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{post.topic}</p>
                  {post.content && (
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                      {post.content.slice(0, 60)}
                    </p>
                  )}
                </div>
                <FileText className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CalendarDays className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">暂无内容安排</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">点击上方按钮快速添加</p>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-border/30">
          <button
            onClick={() => {
              setSelectedPostId("");
              setSheetOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
              bg-muted/50 hover:bg-muted text-xs font-medium text-muted-foreground
              hover:text-foreground transition-colors tap-target"
          >
            <Plus className="h-3.5 w-3.5" />
            为此日添加内容
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
