"use client";

import { motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ───────────────────────────────────────────────────────────────────

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  /** Optional icon from lucide-react */
  icon?: LucideIcon;
  /** Primary title text */
  title: string;
  /** Optional description below the title */
  description?: string;
  /** Optional call-to-action button */
  action?: EmptyStateAction;
  /** Visual variant */
  variant?: "default" | "muted" | "gradient";
  /** Size preset */
  size?: "sm" | "md" | "lg";
  /** Custom gradient classes for the gradient variant (e.g. "from-violet-500 to-purple-600") */
  gradientClass?: string;
}

// ─── Size Configs ────────────────────────────────────────────────────────────

const SIZE_CONFIG = {
  sm: {
    iconWrap: "h-8 w-8",
    icon: "h-4 w-4",
    title: "text-xs font-medium",
    description: "text-[10px]",
    padding: "py-8 px-4",
    gap: "gap-2",
    actionBtn: "h-7 text-[10px] px-2.5",
    iconRounded: "rounded-lg",
  },
  md: {
    iconWrap: "h-12 w-12",
    icon: "h-6 w-6",
    title: "text-sm font-semibold",
    description: "text-xs",
    padding: "py-12 px-6",
    gap: "gap-3",
    actionBtn: "h-8 text-xs px-3.5",
    iconRounded: "rounded-xl",
  },
  lg: {
    iconWrap: "h-16 w-16",
    icon: "h-8 w-8",
    title: "text-base font-semibold",
    description: "text-sm",
    padding: "py-16 px-6",
    gap: "gap-4",
    actionBtn: "h-9 text-sm px-4",
    iconRounded: "rounded-2xl",
  },
} as const;

// ─── Animation ──────────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

const iconVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.35, ease: "easeOut" as const, delay: 0.1 },
  },
};

const actionVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" as const, delay: 0.25 },
  },
};

// ─── Component ──────────────────────────────────────────────────────────────

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "default",
  size = "md",
  gradientClass = "from-violet-500 to-purple-600",
}: EmptyStateProps) {
  const s = SIZE_CONFIG[size];

  // ── Gradient variant: card with gradient background ──
  if (variant === "gradient") {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex justify-center"
      >
        <div
          className={`flex flex-col items-center text-center max-w-[280px] rounded-2xl bg-gradient-to-br ${gradientClass} ${s.padding} shadow-lg`}
        >
          {/* Icon container */}
          {Icon && (
            <motion.div
              variants={iconVariants}
              className={`flex items-center justify-center mb-2 h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm`}
            >
              <Icon className="h-7 w-7 text-white" />
            </motion.div>
          )}

          {/* Title */}
          <motion.div variants={iconVariants}>
            <h3 className={`text-white font-semibold leading-tight ${size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base"}`}>
              {title}
            </h3>
          </motion.div>

          {/* Description */}
          {description && (
            <p className={`text-white/75 mt-1.5 leading-relaxed ${size === "sm" ? "text-[10px]" : size === "md" ? "text-xs" : "text-sm"}`}>
              {description}
            </p>
          )}

          {/* Action */}
          {action && (
            <motion.div variants={actionVariants} className="mt-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={action.onClick}
                className={`bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-white/20 ${s.actionBtn}`}
              >
                {action.label}
              </Button>
            </motion.div>
          )}
        </div>
      </motion.div>
    );
  }

  // ── Default & Muted variants ──
  const isMuted = variant === "muted";

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`flex flex-col items-center justify-center text-center ${s.padding} ${isMuted ? "opacity-60" : ""}`}
    >
      {/* Icon */}
      {Icon && (
        <motion.div
          variants={iconVariants}
          className={`flex items-center justify-center mb-2 ${s.iconWrap} ${s.iconRounded} ${
            isMuted
              ? "bg-muted/40"
              : "bg-gradient-to-br from-muted/60 to-muted/30 dark:from-muted/40 dark:to-muted/20"
          }`}
        >
          <Icon className={`${s.icon} ${isMuted ? "text-muted-foreground/60" : "text-muted-foreground"}`} />
        </motion.div>
      )}

      {/* Title */}
      <motion.div variants={iconVariants}>
        <h3 className={`${s.title} ${isMuted ? "text-muted-foreground" : "text-foreground"}`}>
          {title}
        </h3>
      </motion.div>

      {/* Description */}
      {description && (
        <motion.p
          variants={iconVariants}
          className={`${s.description} text-muted-foreground mt-1 leading-relaxed max-w-[240px]`}
        >
          {description}
        </motion.p>
      )}

      {/* Action */}
      {action && (
        <motion.div variants={actionVariants} className="mt-3">
          <Button
            size="sm"
            variant={isMuted ? "ghost" : "secondary"}
            onClick={action.onClick}
            className={s.actionBtn}
          >
            {action.label}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
