"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { toast } from "sonner";
import {
  Trophy,
  Medal,
  Sparkles,
  Heart,
  Flame,
  Globe,
} from "lucide-react";

// ─── Achievement definitions ──────────────────────────────────────
interface Achievement {
  id: string;
  icon: typeof Trophy;
  title: string;
  description: string;
  color: string;         // text color class
  bgColor: string;       // background color class
  borderColor: string;   // border color class
  gradient: string;      // gradient background for celebration toast
  check: (posts: ReturnType<typeof useAppStore.getState>["contentPosts"]) => boolean;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: "content_master",
    icon: Trophy,
    title: "内容达人",
    description: "已发布 10+ 篇内容",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    borderColor: "border-emerald-500/30",
    gradient: "from-emerald-500 to-teal-600",
    check: (posts) => posts.filter((p) => p.status === "published").length >= 10,
  },
  {
    id: "ai_creator",
    icon: Sparkles,
    title: "AI创作者",
    description: "使用AI生成 20+ 次",
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-100 dark:bg-violet-900/30",
    borderColor: "border-violet-500/30",
    gradient: "from-violet-500 to-purple-600",
    check: (posts) =>
      posts.filter((p) => p.generationType === "auto" || p.contentType === "ai").length >= 20,
  },
  {
    id: "interaction_star",
    icon: Heart,
    title: "互动之星",
    description: "累计获得 100+ 互动",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    borderColor: "border-amber-500/30",
    gradient: "from-amber-500 to-orange-600",
    check: (posts) =>
      posts.reduce(
        (sum, p) => sum + (p.likes || 0) + (p.comments || 0) + (p.shares || 0),
        0
      ) >= 100,
  },
  {
    id: "consecutive_ops",
    icon: Flame,
    title: "连续运营",
    description: "连续 7+ 天有内容发布",
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-100 dark:bg-rose-900/30",
    borderColor: "border-rose-500/30",
    gradient: "from-rose-500 to-red-600",
    check: (posts) => {
      const published = posts
        .filter((p) => p.status === "published")
        .map((p) => p.scheduledDate || p.createdAt.split("T")[0])
        .filter(Boolean)
        .sort();
      if (published.length < 7) return false;
      let streak = 1;
      let maxStreak = 1;
      for (let i = 1; i < published.length; i++) {
        const d1 = new Date(published[i - 1]);
        const d2 = new Date(published[i]);
        const diffDays = (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays <= 1) {
          streak++;
          maxStreak = Math.max(maxStreak, streak);
        } else {
          streak = 1;
        }
      }
      return maxStreak >= 7;
    },
  },
  {
    id: "cross_platform",
    icon: Globe,
    title: "跨平台运营",
    description: "在两个平台均有发布",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    borderColor: "border-purple-500/30",
    gradient: "from-purple-500 to-indigo-600",
    check: (posts) => {
      const platforms = new Set(posts.filter((p) => p.status === "published").map((p) => p.platform || "wechat"));
      return platforms.size >= 2;
    },
  },
];

const STORAGE_KEY = "unlocked-achievements";

function getUnlocked(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return new Set(JSON.parse(stored) as string[]);
  } catch {
    // ignore
  }
  return new Set();
}

function persistUnlocked(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
}

// ─── Confetti particle ────────────────────────────────────────────
function ConfettiParticle({ delay }: { delay: number }) {
  const colors = ["#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4"];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const x = Math.random() * 100;
  const size = 4 + Math.random() * 6;
  const rotation = Math.random() * 360;

  return (
    <motion.div
      className="absolute rounded-sm pointer-events-none"
      style={{
        width: size,
        height: size * 0.6,
        backgroundColor: color,
        left: `${x}%`,
        top: "-10px",
        rotate: rotation,
      }}
      initial={{ y: -20, opacity: 1, scale: 0 }}
      animate={{
        y: [0, 200],
        opacity: [1, 0],
        scale: [0, 1, 0.8],
        x: [0, (Math.random() - 0.5) * 100],
        rotate: [rotation, rotation + 180 + Math.random() * 180],
      }}
      transition={{
        duration: 2.5 + Math.random(),
        delay,
        ease: "easeOut",
      }}
    />
  );
}

// ─── Achievement celebration toast ────────────────────────────────
function AchievementToast({ achievement, onClose }: { achievement: Achievement; onClose: () => void }) {
  const Icon = achievement.icon;

  return (
    <div className="relative overflow-hidden rounded-2xl p-0" style={{ width: 340 }}>
      {/* Gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${achievement.gradient}`} />

      {/* Confetti particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <ConfettiParticle key={i} delay={i * 0.05} />
        ))}
      </div>

      {/* Content */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className="relative z-10 flex items-start gap-4 p-5"
      >
        <motion.div
          animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex-shrink-0"
        >
          <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
            <Icon className="h-7 w-7 text-white" />
          </div>
        </motion.div>
        <div className="flex-1 min-w-0">
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Medal className="h-4 w-4 text-yellow-300" />
              <span className="text-[10px] font-semibold text-white/80 uppercase tracking-wider">成就解锁</span>
            </div>
            <h3 className="text-base font-bold text-white mb-0.5">{achievement.title}</h3>
            <p className="text-xs text-white/80">{achievement.description}</p>
          </motion.div>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 h-6 w-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          aria-label="关闭"
        >
          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </motion.div>
    </div>
  );
}

// ─── Main hook ────────────────────────────────────────────────────
export function useAchievements() {
  const contentPosts = useAppStore((s) => s.contentPosts);
  const [newlyUnlocked, setNewlyUnlocked] = useState<Achievement | null>(null);
  const checkedRef = useRef<Set<string>>(new Set());

  const checkAchievements = useCallback(() => {
    const posts = useAppStore.getState().contentPosts;
    if (posts.length === 0) return;

    const unlocked = getUnlocked();

    for (const achievement of ACHIEVEMENTS) {
      if (unlocked.has(achievement.id)) continue;
      if (checkedRef.current.has(achievement.id)) continue;

      if (achievement.check(posts)) {
        unlocked.add(achievement.id);
        persistUnlocked(unlocked);
        checkedRef.current.add(achievement.id);

        // Create a notification for the achievement
        fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "achievement",
            category: "achievement",
            title: `🏆 成就解锁: ${achievement.title}`,
            message: achievement.description,
            metadata: JSON.stringify({ achievementId: achievement.id }),
          }),
        }).catch(() => {
          // ignore
        });

        // Show celebration toast
        setNewlyUnlocked(achievement);
      }
    }
  }, []);

  // Check on mount and when posts change significantly
  useEffect(() => {
    const timer = setTimeout(() => {
      checkAchievements();
    }, 3000);
    return () => clearTimeout(timer);
  }, [contentPosts, checkAchievements]);

  // Show toast when achievement is unlocked
  useEffect(() => {
    if (!newlyUnlocked) return;
    const id = `achievement-${newlyUnlocked.id}-${Date.now()}`;
    toast.custom(
      (t) => (
        <AchievementToast
          achievement={newlyUnlocked}
          onClose={() => toast.dismiss(id)}
        />
      ),
      { id, duration: 8000, position: "top-center" }
    );
  }, [newlyUnlocked]);

  // Also check after key actions (listen for store changes)
  useEffect(() => {
    const unsub = useAppStore.subscribe((state, prevState) => {
      if (state.contentPosts.length !== prevState.contentPosts.length) {
        const timer = setTimeout(checkAchievements, 2000);
        return () => clearTimeout(timer);
      }
    });
    return unsub;
  }, [checkAchievements]);

  return { achievements: ACHIEVEMENTS, unlocked: getUnlocked() };
}
