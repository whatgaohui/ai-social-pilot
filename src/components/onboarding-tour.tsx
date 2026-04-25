"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  ArrowLeftRight,
  User,
  CalendarDays,
  FileText,
  BarChart3,
  Search,
  Settings,
  Command,
  ChevronLeft,
  ChevronRight,
  X,
  RotateCcw,
} from "lucide-react";

/* ─── Types ───────────────────────────────────────────────────── */

interface TourStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string;
  icon: typeof Sparkles;
  placement: "bottom" | "top" | "left" | "right";
}

/* ─── Tour Steps ──────────────────────────────────────────────── */

const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "欢迎使用 AI 运营助手",
    description: "这是一款专为社交媒体运营设计的AI工具，支持朋友圈和小红书双平台内容管理。接下来我们将快速了解核心功能。",
    targetSelector: "",
    icon: Sparkles,
    placement: "bottom",
  },
  {
    id: "platform",
    title: "平台切换器",
    description: "在这里快速切换朋友圈和小红书平台，每个平台有独立的内容库和运营数据。",
    targetSelector: "[data-tour='platform-switcher']",
    icon: ArrowLeftRight,
    placement: "bottom",
  },
  {
    id: "left-panel",
    title: "人设 & 知识库",
    description: "左侧面板管理您的运营人设和专业知识库。AI会根据人设风格生成符合您品牌调性的内容。",
    targetSelector: "[data-tour='left-panel']",
    icon: User,
    placement: "right",
  },
  {
    id: "calendar",
    title: "内容日历",
    description: "日历视图帮您可视化排期管理内容发布计划。拖拽调整发布日期，一目了然。",
    targetSelector: "[data-tour='calendar']",
    icon: CalendarDays,
    placement: "right",
  },
  {
    id: "workspace",
    title: "内容工作台",
    description: "右侧工作台是内容创作和编辑的核心区域。支持AI生成、优化润色和内容评分。",
    targetSelector: "[data-tour='workspace']",
    icon: FileText,
    placement: "left",
  },
  {
    id: "ai-features",
    title: "AI 智能功能",
    description: "利用AI自动生成文案、优化内容质量、智能评分。大幅提升内容创作效率。",
    targetSelector: "[data-tour='ai-features']",
    icon: Sparkles,
    placement: "bottom",
  },
  {
    id: "analytics",
    title: "数据分析",
    description: "查看内容运营数据统计和趋势分析，数据驱动决策优化运营策略。",
    targetSelector: "[data-tour='analytics']",
    icon: BarChart3,
    placement: "left",
  },
  {
    id: "search",
    title: "全局搜索 (⌘K)",
    description: "快速搜索内容、知识库条目或使用命令面板执行操作，是最高效的导航方式。",
    targetSelector: "[data-tour='search']",
    icon: Search,
    placement: "bottom",
  },
  {
    id: "settings",
    title: "设置与AI配置",
    description: "配置AI模型、管理平台账号、调整显示偏好。所有个性化设置都在这里。",
    targetSelector: "[data-tour='settings']",
    icon: Settings,
    placement: "bottom",
  },
  {
    id: "shortcuts",
    title: "键盘快捷键",
    description: "掌握快捷键可以大幅提升操作速度。按 ⌘/ 随时查看快捷键列表，还能自定义绑定。",
    targetSelector: "[data-tour='shortcuts']",
    icon: Command,
    placement: "left",
  },
];

const TOUR_COMPLETED_KEY = "onboarding-tour-completed";

/* ─── Overlay + Spotlight ─────────────────────────────────────── */

function SpotlightOverlay({
  targetRect,
}: {
  targetRect: DOMRect | null;
}) {
  const padding = 8;
  return (
    <motion.div
      className="spotlight-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        background: targetRect
          ? `radial-gradient(ellipse ${Math.max(targetRect.width, 200)}px ${Math.max(targetRect.height, 200)}px at ${targetRect.left + targetRect.width / 2}px ${targetRect.top + targetRect.height / 2}px, transparent 0%, rgba(0,0,0,0.6) 100%)`
          : "rgba(0,0,0,0.6)",
        boxShadow: targetRect
          ? `${targetRect.left - padding}px ${targetRect.top - padding}px 0 ${padding}px transparent, ${window.innerWidth - targetRect.right - padding}px ${targetRect.top - padding}px 0 ${padding}px transparent, ${targetRect.left - padding}px ${window.innerHeight - targetRect.bottom - padding}px 0 ${padding}px transparent, ${window.innerWidth - targetRect.right - padding}px ${window.innerHeight - targetRect.bottom - padding}px 0 ${padding}px transparent`
          : undefined,
        clipPath: targetRect
          ? `polygon(0% 0%, 0% 100%, ${targetRect.left - padding}px 100%, ${targetRect.left - padding}px ${targetRect.top - padding}px, ${targetRect.right + padding}px ${targetRect.top - padding}px, ${targetRect.right + padding}px ${targetRect.bottom + padding}px, ${targetRect.left - padding}px ${targetRect.bottom + padding}px, ${targetRect.left - padding}px 100%, 100% 100%, 100% 0%)`
          : undefined,
      }}
    />
  );
}

/* ─── Tour Tooltip ────────────────────────────────────────────── */

function TourTooltip({
  step,
  stepIndex,
  totalSteps,
  targetRect,
  onNext,
  onPrev,
  onSkip,
}: {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  targetRect: DOMRect | null;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}) {
  const StepIcon = step.icon;

  // Calculate tooltip position
  let style: React.CSSProperties = {};
  if (targetRect) {
    const tooltipWidth = 320;
    const tooltipHeight = 200;
    const gap = 16;
    switch (step.placement) {
      case "bottom":
        style = {
          top: targetRect.bottom + gap,
          left: Math.max(16, targetRect.left + targetRect.width / 2 - tooltipWidth / 2),
        };
        break;
      case "top":
        style = {
          bottom: window.innerHeight - targetRect.top + gap,
          left: Math.max(16, targetRect.left + targetRect.width / 2 - tooltipWidth / 2),
        };
        break;
      case "left":
        style = {
          top: targetRect.top,
          right: window.innerWidth - targetRect.left + gap,
        };
        break;
      case "right":
        style = {
          top: targetRect.top,
          left: targetRect.right + gap,
        };
        break;
    }
  } else {
    // Welcome step - center
    style = {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    };
  }

  return (
    <motion.div
      className="fixed z-[9999] w-80"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      style={style}
    >
      <div className="rounded-xl bg-popover border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-start gap-3">
          <div className="flex-shrink-0 h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md">
            <StepIcon className="h-4.5 w-4.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-foreground">{step.title}</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
              {step.description}
            </p>
          </div>
          <button
            className="flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
            onClick={onSkip}
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        {/* Progress dots */}
        <div className="onboarding-progress px-5 py-2">
          {TOUR_STEPS.map((_, i) => (
            <motion.div
              key={i}
              className={`dot ${i === stepIndex ? "active" : ""} ${i < stepIndex ? "completed" : ""}`}
              layout
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="px-5 pb-4 flex items-center justify-between">
          <div className="text-[10px] text-muted-foreground">
            {stepIndex + 1} / {totalSteps}
          </div>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-3 text-[11px]"
                onClick={onPrev}
              >
                <ChevronLeft className="h-3 w-3 mr-1" />
                上一步
              </Button>
            )}
            {stepIndex < totalSteps - 1 ? (
              <Button
                size="sm"
                className="h-7 px-3 text-[11px] bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
                onClick={onNext}
              >
                下一步
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            ) : (
              <Button
                size="sm"
                className="h-7 px-3 text-[11px] bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                onClick={onNext}
              >
                开始使用
                <Sparkles className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Main Onboarding Tour ────────────────────────────────────── */

export function OnboardingTour() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const { onboardingCompleted, setOnboardingCompleted } = useAppStore();
  const initialized = useRef(false);

  // Check if tour should run
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const tourCompleted = localStorage.getItem(TOUR_COMPLETED_KEY) === "true";
    const storeCompleted = useAppStore.getState().onboardingCompleted;

    if (!tourCompleted && !storeCompleted) {
      // Delay start slightly for page to render
      const timer = setTimeout(() => setIsActive(true), 800);
      return () => clearTimeout(timer);
    }
  }, [onboardingCompleted]);

  // Update target rect when step changes
  useEffect(() => {
    if (!isActive) return;
    const step = TOUR_STEPS[currentStep];
    if (!step.targetSelector) {
      return;
    }

    const updateRect = () => {
      const el = document.querySelector(step.targetSelector);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
      } else {
        setTargetRect(null);
      }
    };

    // Small delay to let any transitions settle
    const timer = setTimeout(updateRect, 100);
    window.addEventListener("resize", updateRect);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateRect);
    };
  }, [isActive, currentStep]);

  const handleNext = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      // Tour complete
      setIsActive(false);
      localStorage.setItem(TOUR_COMPLETED_KEY, "true");
      setOnboardingCompleted(true);
    }
  }, [currentStep, setOnboardingCompleted]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    setIsActive(false);
    localStorage.setItem(TOUR_COMPLETED_KEY, "true");
    setOnboardingCompleted(true);
  }, [setOnboardingCompleted]);

  // Public restart function
  const restart = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
    localStorage.removeItem(TOUR_COMPLETED_KEY);
    setOnboardingCompleted(false);
  }, [setOnboardingCompleted]);

  // Store restart in window for settings access
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__restartTour = restart;
    return () => {
      delete (window as unknown as Record<string, unknown>).__restartTour;
    };
  }, [restart]);

  if (!isActive) return null;

  const step = TOUR_STEPS[currentStep];

  return (
    <>
      {/* Spotlight overlay */}
      <AnimatePresence>
        <SpotlightOverlay targetRect={targetRect} />
      </AnimatePresence>

      {/* Highlight ring on target */}
      {targetRect && step.targetSelector && (
        <motion.div
          className="fixed z-[9998] pointer-events-none rounded-lg"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="tour-highlight w-full h-full" />
        </motion.div>
      )}

      {/* Tour tooltip */}
      <AnimatePresence mode="wait">
        <TourTooltip
          key={step.id}
          step={step}
          stepIndex={currentStep}
          totalSteps={TOUR_STEPS.length}
          targetRect={targetRect}
          onNext={handleNext}
          onPrev={handlePrev}
          onSkip={handleSkip}
        />
      </AnimatePresence>
    </>
  );
}

/* ─── Restart Tour Button (for Settings) ──────────────────────── */

export function RestartTourButton() {
  const handleRestart = () => {
    localStorage.removeItem(TOUR_COMPLETED_KEY);
    useAppStore.getState().setOnboardingCompleted(false);
    // Trigger the tour to restart
    const fn = (window as unknown as Record<string, (() => void) | undefined>).__restartTour;
    if (typeof fn === "function") fn();
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-9 text-xs w-full justify-start"
      onClick={handleRestart}
    >
      <RotateCcw className="h-3.5 w-3.5 mr-2" />
      重新开始引导
    </Button>
  );
}
