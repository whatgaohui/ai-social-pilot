"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
  type ComponentType,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Info,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Lightbulb,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

/* ─── Types ───────────────────────────────────────────────────── */

interface RichTooltipProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  variant?: "default" | "info" | "success" | "warning" | "error";
  children: ReactNode;
  delayMs?: number;
  side?: "top" | "bottom" | "left" | "right";
  followCursor?: boolean;
}

interface PopoverCardProps {
  trigger: ReactNode;
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  width?: number;
}

interface TourTooltipProps {
  step: {
    id: string;
    title: string;
    description: string;
  };
  visible: boolean;
  targetRect: DOMRect | null;
  placement?: "bottom" | "top" | "left" | "right";
}

/* ─── Variant Config ──────────────────────────────────────────── */

const VARIANT_CONFIG = {
  default: {
    icon: Info,
    color: "text-foreground",
    borderColor: "border-border",
  },
  info: {
    icon: Info,
    color: "text-sky-600 dark:text-sky-400",
    borderColor: "border-sky-200 dark:border-sky-800",
  },
  success: {
    icon: CheckCircle2,
    color: "text-emerald-600 dark:text-emerald-400",
    borderColor: "border-emerald-200 dark:border-emerald-800",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-600 dark:text-amber-400",
    borderColor: "border-amber-200 dark:border-amber-800",
  },
  error: {
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
    borderColor: "border-red-200 dark:border-red-800",
  },
};

/* ─── Rich Tooltip ────────────────────────────────────────────── */

export function RichTooltip({
  title,
  description,
  icon: IconProp,
  variant = "default",
  children,
  delayMs = 300,
  side = "top",
  followCursor = false,
}: RichTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const triggerRef = useRef<HTMLDivElement>(null);
  const config = VARIANT_CONFIG[variant];
  const Icon = IconProp || config.icon;

  const show = useCallback(() => {
    timeoutRef.current = setTimeout(() => setVisible(true), delayMs);
  }, [delayMs]);

  const hide = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setVisible(false);
  }, []);

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  // Cursor following
  useEffect(() => {
    if (!followCursor || !visible) return;
    const handleMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, [followCursor, visible]);

  // Static positioning
  useEffect(() => {
    if (followCursor || !visible || !triggerRef.current) return;
    const raf = requestAnimationFrame(() => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const tooltipW = 240;
      const tooltipH = 70;
      const gap = 8;

      let x = rect.left + rect.width / 2 - tooltipW / 2;
      let y = rect.top - tooltipH - gap;

      if (side === "bottom") {
        y = rect.bottom + gap;
      } else if (side === "left") {
        x = rect.left - tooltipW - gap;
        y = rect.top + rect.height / 2 - tooltipH / 2;
      } else if (side === "right") {
        x = rect.right + gap;
        y = rect.top + rect.height / 2 - tooltipH / 2;
      }

      // Clamp to viewport
      x = Math.max(8, Math.min(x, window.innerWidth - tooltipW - 8));
      y = Math.max(8, Math.min(y, window.innerHeight - tooltipH - 8));

      setPos({ x, y });
    });
    return () => cancelAnimationFrame(raf);
  }, [visible, side, followCursor]);

  return (
    <div
      ref={triggerRef}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      className="inline-flex"
    >
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            className={cn(
              "tooltip-rich fixed z-[9990] rounded-lg border bg-popover shadow-lg pointer-events-none",
              config.borderColor
            )}
            style={{
              left: followCursor ? pos.x + 12 : pos.x,
              top: followCursor ? pos.y + 12 : pos.y,
            }}
            initial={{ opacity: 0, scale: 0.95, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 4 }}
            transition={{ duration: 0.15 }}
          >
            <div className="flex items-start gap-2">
              <Icon className={cn("h-3.5 w-3.5 flex-shrink-0 mt-0.5", config.color)} />
              <div>
                <div className="tooltip-title">{title}</div>
                <div className="tooltip-desc">{description}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Popover Card ────────────────────────────────────────────── */

export function PopoverCard({
  trigger,
  title,
  description,
  icon: IconProp,
  children,
  width = 300,
}: PopoverCardProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const Icon = IconProp;

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const raf = requestAnimationFrame(() => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const gap = 8;
      let x = rect.right + gap;
      let y = rect.top;

      // Clamp to viewport
      if (x + width > window.innerWidth - 16) {
        x = rect.left - width - gap;
      }
      if (y + 300 > window.innerHeight) {
        y = window.innerHeight - 316;
      }
      y = Math.max(16, y);

      setPos({ x, y });
    });
    return () => cancelAnimationFrame(raf);
  }, [open, width]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        cardRef.current &&
        !cardRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  return (
    <>
      <div
        ref={triggerRef}
        className="inline-flex cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        {trigger}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={cardRef}
            className="fixed z-[9990] rounded-xl border border-border bg-popover shadow-xl overflow-hidden"
            style={{ left: pos.x, top: pos.y, width }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Card header */}
            {(title || description || Icon) && (
              <div className="flex items-start gap-2.5 p-4 border-b bg-muted/20">
                {Icon && (
                  <div className="flex-shrink-0 h-7 w-7 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                    <Icon className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {title && (
                    <h4 className="text-xs font-semibold text-foreground">{title}</h4>
                  )}
                  {description && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      {description}
                    </p>
                  )}
                </div>
              </div>
            )}
            {/* Card body */}
            <div className="p-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ─── Tour Tooltip (for Onboarding) ───────────────────────────── */

export function TourTooltip({
  step,
  visible,
  targetRect,
  placement = "bottom",
}: TourTooltipProps) {
  if (!visible || !targetRect) return null;

  const gap = 12;
  let style: React.CSSProperties = {};
  const tooltipW = 280;

  switch (placement) {
    case "bottom":
      style = {
        top: targetRect.bottom + gap,
        left: Math.max(16, Math.min(targetRect.left + targetRect.width / 2 - tooltipW / 2, window.innerWidth - tooltipW - 16)),
      };
      break;
    case "top":
      style = {
        bottom: window.innerHeight - targetRect.top + gap,
        left: Math.max(16, Math.min(targetRect.left + targetRect.width / 2 - tooltipW / 2, window.innerWidth - tooltipW - 16)),
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

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed z-[9999] w-[280px] rounded-xl bg-popover border shadow-2xl overflow-hidden"
          style={style}
          initial={{ opacity: 0, scale: 0.92, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 6 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                <HelpCircle className="h-4 w-4 text-white" />
              </div>
              <div>
                <h4 className="text-xs font-bold">{step.title}</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                  {step.description}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── Delayed Tooltip Wrapper ─────────────────────────────────── */

export function DelayedTooltip({
  children,
  title,
  delayMs = 300,
}: {
  children: ReactNode;
  title: string;
  delayMs?: number;
}) {
  return (
    <RichTooltip title={title} description="" delayMs={delayMs}>
      {children}
    </RichTooltip>
  );
}
