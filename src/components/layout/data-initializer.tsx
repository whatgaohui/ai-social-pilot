"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import {
  Sparkles, Zap, Settings, Check,
} from "lucide-react";

const LOADING_STEPS = [
  { label: "加载配置...", icon: Settings },
  { label: "获取数据...", icon: Zap },
  { label: "准备就绪", icon: Check },
];

export function DataInitializer() {
  const { setPersona, setKnowledgeItems, setCurrentPlan, setContentPosts } = useAppStore();
  const [loadingStage, setLoadingStage] = useState(0); // 0: config, 1: data, 2: ready
  const [progress, setProgress] = useState(0);
  const [savedPlatform, setSavedPlatform] = useState<string | null>(null);
  useEffect(() => {
    try { setSavedPlatform(localStorage.getItem('platform-storage')); } catch {}
  }, []);

  useEffect(() => {
    const stageTimers = [
      setTimeout(() => setLoadingStage(1), 400),
      setTimeout(() => setLoadingStage(2), 900),
    ];
    return () => { stageTimers.forEach(clearTimeout); };
  }, []);

  // Smooth progress animation
  useEffect(() => {
    const target = loadingStage === 0 ? 30 : loadingStage === 1 ? 70 : 100;
    let raf: number;
    const animate = () => {
      setProgress((prev) => {
        if (prev < target) {
          const next = Math.min(prev + (target - prev) * 0.12 + 0.5, target);
          raf = requestAnimationFrame(animate);
          return next;
        }
        return target;
      });
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [loadingStage]);

  useEffect(() => {
    async function init() {
      try {
        const [personaRes, knowledgeRes, plansRes] = await Promise.all([
          fetch("/api/persona"),
          fetch("/api/knowledge"),
          fetch("/api/plan"),
        ]);

        if (personaRes.ok) {
          const persona = await personaRes.json();
          if (persona) setPersona(persona);
        }
        if (knowledgeRes.ok) {
          const items = await knowledgeRes.json();
          setKnowledgeItems(items);
        }
        if (plansRes.ok) {
          const plans = await plansRes.json();
          if (plans.length > 0) {
            const activePlan = plans.find((p: { status: string }) => p.status === "active") || plans[0];
            setCurrentPlan(activePlan);
            if (activePlan.posts) {
              setContentPosts(activePlan.posts);
            }
          }
        }
      } catch (e) {
        console.error("Failed to initialize data:", e);
      } finally {
        setLoadingStage(2);
      }
    }
    init();
  }, [setPersona, setKnowledgeItems, setCurrentPlan, setContentPosts]);

  const isReady = loadingStage === 2 && progress >= 98;

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        {/* 顶部加载进度条 */}
        <div className="loading-bar-top" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" as const }}
          className="flex flex-col items-center gap-5"
        >
          {/* Logo */}
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200 dark:shadow-violet-900/40">
            <Sparkles className="h-7 w-7 text-white" />
          </div>

          {/* Step text with fade transition */}
          <div className="relative h-5 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.p
                key={loadingStage}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="text-sm text-muted-foreground font-medium"
              >
                {LOADING_STEPS[loadingStage].label}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Progress bar */}
          <div className="w-40 h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${savedPlatform === 'xiaohongshu' ? 'from-rose-500 to-pink-500' : 'from-violet-500 to-purple-500'}`}
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.15 }}
            />
          </div>

          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {LOADING_STEPS.map((step, i) => {
              const StepIcon = step.icon;
              const isCompleted = i < loadingStage;
              const isActive = i === loadingStage;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    transition: { delay: i * 0.1 },
                  }}
                >
                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center transition-colors duration-300 ${
                      isCompleted
                        ? "bg-emerald-100 dark:bg-emerald-900/30"
                        : isActive
                          ? "bg-violet-100 dark:bg-violet-900/30"
                          : "bg-muted"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <StepIcon
                        className={`h-3 w-3 ${
                          isActive ? "text-violet-500" : "text-muted-foreground/50"
                        }`}
                      />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}
