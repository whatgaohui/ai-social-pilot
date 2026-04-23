"use client";

import { motion } from "framer-motion";
import {
  Sparkles,
  BarChart3,
  Lightbulb,
  FileText,
  PenLine,
  TrendingUp,
  CalendarPlus,
  Wand2,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/store/app-store";

// ─── Floating Orbs Background ────────────────────────────────────────────────

function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute -top-8 -left-8 h-32 w-32 rounded-full bg-violet-400/10 dark:bg-violet-500/10 blur-2xl"
        animate={{
          y: [0, 12, -8, 0],
          x: [0, -6, 4, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/4 -right-4 h-24 w-24 rounded-full bg-emerald-400/10 dark:bg-emerald-500/10 blur-2xl"
        animate={{
          y: [0, -10, 6, 0],
          x: [0, 8, -4, 0],
          scale: [1, 0.9, 1.08, 1],
        }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      <motion.div
        className="absolute bottom-8 left-1/4 h-20 w-20 rounded-full bg-amber-400/10 dark:bg-amber-500/10 blur-2xl"
        animate={{
          y: [0, 8, -12, 0],
          x: [0, -4, 8, 0],
          scale: [0.95, 1.05, 1, 0.95],
        }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      {/* Small floating geometric shapes */}
      <motion.div
        className="absolute top-16 right-12 h-3 w-3 rounded-sm bg-violet-400/15 dark:bg-violet-500/20 rotate-45 animate-float"
        animate={{ y: [0, -10, 0], rotate: [45, 90, 45] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />
      <motion.div
        className="absolute bottom-24 right-16 h-2.5 w-2.5 rounded-full bg-rose-400/15 dark:bg-rose-500/20 animate-float"
        animate={{ y: [0, -8, 0], scale: [1, 1.3, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
      />
      <motion.div
        className="absolute top-1/3 left-8 h-2 w-2 rounded-full bg-emerald-400/15 dark:bg-emerald-500/20 animate-float"
        animate={{ y: [0, -6, 0], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 3 }}
      />
    </div>
  );
}

// ─── Animated Illustration (larger, centered, with pulse) ─────────────────────

function AnimatedIllustration() {
  return (
    <div className="relative flex items-center justify-center w-full mb-8">
      {/* Subtle pulsing glow ring behind the illustration */}
      <motion.div
        className="absolute h-40 w-40 sm:h-48 sm:w-48 rounded-full bg-gradient-to-br from-violet-400/10 to-emerald-400/8"
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute h-32 w-32 sm:h-40 sm:w-40 rounded-full bg-gradient-to-br from-violet-400/8 to-rose-400/5"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />

      {/* Main document icon */}
      <motion.div
        className="relative"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Glow behind the icon */}
        <motion.div
          className="absolute inset-0 rounded-3xl bg-gradient-to-br from-violet-400/30 to-emerald-400/20 blur-xl"
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Card shape */}
        <div className="relative h-28 w-24 sm:h-32 sm:w-28 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25 flex items-center justify-center">
          {/* Decorative lines on the card */}
          <div className="absolute top-5 left-5 right-5 space-y-2">
            <motion.div
              className="h-1.5 w-full rounded-full bg-white/30"
              initial={{ width: "100%" }}
              animate={{ width: ["100%", "70%", "100%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="h-1.5 w-3/4 rounded-full bg-white/20"
              initial={{ width: "75%" }}
              animate={{ width: ["75%", "100%", "75%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            />
            <motion.div
              className="h-1.5 w-1/2 rounded-full bg-white/15"
              initial={{ width: "50%" }}
              animate={{ width: ["50%", "80%", "50%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            />
          </div>

          {/* Sparkle */}
          <motion.div
            className="absolute -top-2 -right-2"
            animate={{ rotate: [0, 180, 360], scale: [1, 1.2, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="h-6 w-6 text-amber-300" />
          </motion.div>
        </div>
      </motion.div>

      {/* Floating pen */}
      <motion.div
        className="absolute -right-4 top-0"
        animate={{ y: [0, -10, 0], rotate: [-15, 5, -15] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      >
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25 flex items-center justify-center">
          <PenLine className="h-5 w-5 text-white" />
        </div>
      </motion.div>

      {/* Floating chart */}
      <motion.div
        className="absolute -left-4 bottom-0"
        animate={{ y: [0, 8, 0], rotate: [10, -5, 10] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      >
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25 flex items-center justify-center">
          <TrendingUp className="h-5 w-5 text-white" />
        </div>
      </motion.div>

      {/* Floating book */}
      <motion.div
        className="absolute -left-1 top-2"
        animate={{ y: [0, -6, 0], rotate: [-5, 8, -5] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
      >
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-500/25 flex items-center justify-center">
          <BookOpen className="h-4 w-4 text-white" />
        </div>
      </motion.div>
    </div>
  );
}

// ─── Quick Action Card ───────────────────────────────────────────────────────

interface QuickCardProps {
  icon: typeof Sparkles;
  label: string;
  description: string;
  gradient: string;
  shadowColor: string;
  onClick: () => void;
  delay: number;
  extraClass?: string;
}

function QuickCard({
  icon: Icon,
  label,
  description,
  gradient,
  shadowColor,
  onClick,
  delay,
  extraClass,
}: QuickCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay,
        duration: 0.4,
        ease: "easeOut",
      }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`focus-ring-soft flex items-center gap-3 p-3.5 rounded-xl bg-background border border-border/20 hover:border-border/20 transition-colors cursor-pointer text-left group w-full ${extraClass || ''}`}
    >
      <div
        className={`flex-shrink-0 h-10 w-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm group-hover:shadow-md ${shadowColor} transition-shadow duration-200`}
      >
        <Icon className="h-4.5 w-4.5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground leading-tight">
          {label}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
          {description}
        </p>
      </div>
    </motion.button>
  );
}

// ─── Suggestion Chip ──────────────────────────────────────────────────────────

function SuggestionChip({ icon: Icon, label, delay }: { icon: typeof Sparkles; label: string; delay: number }) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.35, ease: "easeOut" }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => toast.info("请在左侧日历中选择日期开始创作")}
      className="badge-pulse inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 hover:bg-muted border border-border/20 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-ring-soft"
    >
      <Icon className="h-3 w-3" />
      {label}
    </motion.button>
  );
}

// ─── Main Empty State Component ──────────────────────────────────────────────

export function WorkspaceEmptyState() {
  const { setRightPanelTab, platform } = useAppStore();
  const isXHS = platform === "xiaohongshu";

  const quickCards: QuickCardProps[] = [
    {
      icon: Sparkles,
      label: "生成新内容",
      description: "AI智能生成优质社交内容",
      gradient: isXHS
        ? "from-rose-500 to-pink-600"
        : "from-violet-500 to-purple-600",
      shadowColor: isXHS ? "hover:shadow-rose-500/20" : "hover:shadow-violet-500/20",
      onClick: () => {
        toast.info("请在左侧日历中选择或创建内容");
      },
      delay: 0.3,
      extraClass: "scale-in-bounce",
    },
    {
      icon: BarChart3,
      label: "查看数据分析",
      description: "多维度内容效果分析报告",
      gradient: "from-emerald-500 to-teal-600",
      shadowColor: "hover:shadow-emerald-500/20",
      onClick: () => setRightPanelTab("data"),
      delay: 0.4,
    },
    {
      icon: Lightbulb,
      label: "灵感库",
      description: "爆款内容灵感与参考案例",
      gradient: "from-amber-500 to-orange-600",
      shadowColor: "hover:shadow-amber-500/20",
      onClick: () => {
        toast.info("请在选中内容后查看灵感库");
      },
      delay: 0.5,
    },
  ];

  const suggestionChips = [
    { icon: CalendarPlus, label: "创建内容", delay: 0.6 },
    { icon: Wand2, label: "AI 助手", delay: 0.7 },
    { icon: FileText, label: "导入草稿", delay: 0.8 },
  ];

  return (
    <div className="card-spotlight relative flex flex-col items-center justify-center min-h-full px-6 py-12 overflow-hidden bg-gradient-animated bg-dots-pattern">
      {/* Floating background orbs & shapes */}
      <FloatingOrbs />

      {/* Content */}
      <div className="content-card-hover border border-border/20 rounded-2xl p-8">
      <div className="relative z-10 flex flex-col items-center w-full max-w-[320px]">
        {/* Animated illustration with pulse glow */}
        <div className="animate-breathe">
        <AnimatedIllustration />
        </div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4, ease: "easeOut" }}
          className="text-center mb-2"
        >
          <h3 className="text-lg font-bold animate-gradient-text leading-snug">
            选择内容开始创作
          </h3>
        </motion.div>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
          className="text-sm text-muted-foreground text-center mb-6 leading-relaxed"
        >
          在左侧日历中选择日期，或创建新内容
          <br />
          开启你的内容运营之旅
        </motion.p>

        {/* Divider between illustration and actions */}
        <div className="divider-gradient w-full my-4" />

        {/* Quick-action suggestion chips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-2 mb-8"
        >
          {suggestionChips.map((chip) => (
            <SuggestionChip key={chip.label} {...chip} />
          ))}
        </motion.div>

        {/* Quick action cards */}
        <div className="w-full space-y-2.5">
          {quickCards.map((card) => (
            <QuickCard key={card.label} {...card} />
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}
