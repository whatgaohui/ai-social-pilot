"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  CalendarRange,
  BarChart3,
  Lightbulb,
  Loader2,
  Check,
} from "lucide-react";
import { toast } from "sonner";

// ─── Quick Action Types ──────────────────────────────────────────────────────

interface QuickAction {
  id: string;
  label: string;
  icon: typeof Sparkles;
  gradient: string;
  shadowColor: string;
  apiEndpoint: string;
  apiMethod: string;
  apiBody: () => Record<string, unknown>;
  successMessage: (data: Record<string, unknown>) => string;
}

// ─── Shimmer Overlay ─────────────────────────────────────────────────────────

function ShimmerOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 rounded-xl overflow-hidden"
    >
      <div className="absolute inset-0 bg-black/20 dark:bg-black/30 rounded-xl" />
      <div className="absolute inset-0 animate-shimmer rounded-xl" />
      <div className="absolute inset-0 flex items-center justify-center">
        <Loader2 className="h-4 w-4 text-white animate-spin" />
      </div>
    </motion.div>
  );
}

// ─── Result Badge ────────────────────────────────────────────────────────────

function ResultBadge({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -4 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="absolute -top-2 -right-2 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-bold shadow-lg"
    >
      <Check className="h-2.5 w-2.5" />
      {text}
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface ActionButtonState {
  loading: boolean;
  result: string | null;
}

export function ContentQuickActions() {
  const [actionStates, setActionStates] = useState<Record<string, ActionButtonState>>({});
  const timerRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ── Actions config ────────────────────────────────────────────────────────
  const actions: QuickAction[] = [
    {
      id: "ai-generate",
      label: "AI一键生成",
      icon: Sparkles,
      gradient: "from-violet-500 to-purple-600",
      shadowColor: "shadow-violet-500/25",
      apiEndpoint: "/api/ai/generate",
      apiMethod: "POST",
      apiBody: () => ({ type: "auto" }),
      successMessage: () => "已生成内容",
    },
    {
      id: "batch-generate",
      label: "批量生成30天",
      icon: CalendarRange,
      gradient: "from-emerald-500 to-teal-600",
      shadowColor: "shadow-emerald-500/25",
      apiEndpoint: "/api/ai/batch-generate",
      apiMethod: "POST",
      apiBody: () => ({ days: 30 }),
      successMessage: (data) => {
        const count = (data as { count?: number }).count;
        return count ? `生成了${count}条` : "批量生成完成";
      },
    },
    {
      id: "ai-analyze",
      label: "AI数据分析",
      icon: BarChart3,
      gradient: "from-amber-500 to-orange-600",
      shadowColor: "shadow-amber-500/25",
      apiEndpoint: "/api/ai/analyze",
      apiMethod: "POST",
      apiBody: () => ({ quick: true }),
      successMessage: () => "分析完成",
    },
    {
      id: "inspiration",
      label: "灵感推荐",
      icon: Lightbulb,
      gradient: "from-rose-500 to-pink-600",
      shadowColor: "shadow-rose-500/25",
      apiEndpoint: "/api/ai/generate",
      apiMethod: "POST",
      apiBody: () => ({ type: "inspiration" }),
      successMessage: () => "灵感已生成",
    },
  ];

  // ── Handle action click ──────────────────────────────────────────────────
  const handleAction = useCallback(async (action: QuickAction) => {
    // Clear any existing timer for this action
    if (timerRefs.current[action.id]) {
      clearTimeout(timerRefs.current[action.id]);
    }

    setActionStates((prev) => ({
      ...prev,
      [action.id]: { loading: true, result: null },
    }));

    try {
      const res = await fetch(action.apiEndpoint, {
        method: action.apiMethod,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action.apiBody()),
      });

      if (res.ok) {
        const data = await res.json();
        const msg = action.successMessage(data || {});
        setActionStates((prev) => ({
          ...prev,
          [action.id]: { loading: false, result: msg },
        }));
        toast.success(msg);

        // Auto-dismiss result badge after 3s
        timerRefs.current[action.id] = setTimeout(() => {
          setActionStates((prev) => ({
            ...prev,
            [action.id]: { ...prev[action.id], result: null },
          }));
        }, 3000);
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error((errorData as { error?: string }).error || "操作失败");
        setActionStates((prev) => ({
          ...prev,
          [action.id]: { loading: false, result: null },
        }));
      }
    } catch {
      toast.error("请求失败，请重试");
      setActionStates((prev) => ({
        ...prev,
        [action.id]: { loading: false, result: null },
      }));
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="bg-muted/30 backdrop-blur-sm border rounded-xl p-3"
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          快捷操作
        </span>
        <Sparkles className="h-3 w-3 text-violet-500 animate-pulse" />
      </div>

      <div className="grid grid-cols-4 gap-2">
        {actions.map((action, idx) => {
          const Icon = action.icon;
          const state = actionStates[action.id];
          const isLoading = state?.loading ?? false;
          const resultText = state?.result ?? null;

          return (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * idx }}
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleAction(action)}
              disabled={isLoading}
              className={`
                relative group flex flex-col items-center gap-1.5 p-2.5 rounded-xl
                transition-shadow duration-200 cursor-pointer
                hover:shadow-lg ${action.shadowColor}
                active:scale-[0.97]
              `}
            >
              {/* Gradient icon background */}
              <div
                className={`
                  h-8 w-8 rounded-lg bg-gradient-to-br ${action.gradient}
                  flex items-center justify-center shadow-sm
                  group-hover:shadow-md transition-shadow duration-200
                `}
              >
                <Icon className="h-4 w-4 text-white" />
              </div>

              {/* Label */}
              <span className="text-[10px] font-medium text-foreground/80 leading-tight text-center">
                {action.label}
              </span>

              {/* Loading shimmer overlay */}
              <AnimatePresence>
                {isLoading && <ShimmerOverlay />}
              </AnimatePresence>

              {/* Result badge */}
              <AnimatePresence>
                {resultText && <ResultBadge text={resultText} />}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
