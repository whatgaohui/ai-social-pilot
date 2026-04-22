"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface LoadingOverlayProps {
  /** Whether the overlay is visible */
  isOpen: boolean;
  /** Callback to close / cancel the loading */
  onClose?: () => void;
  /** Loading message (default: "加载中...") */
  message?: string;
  /** Show cancel button (default: false) */
  showCancel?: boolean;
  /** Minimum display duration in ms (default: 500) */
  minDuration?: number;
  /** Callback when overlay animation completes */
  onComplete?: () => void;
}

// ─── Predefined Messages ────────────────────────────────────────────────────

const LOADING_MESSAGES = {
  default: "加载中...",
  thinking: "AI正在思考...",
  generating: "正在生成...",
  saving: "正在保存...",
  uploading: "正在上传...",
  processing: "正在处理...",
} as const;

// ─── Loading Overlay Component ──────────────────────────────────────────────

export function LoadingOverlay({
  isOpen,
  onClose,
  message = LOADING_MESSAGES.default,
  showCancel = false,
  minDuration = 500,
  onComplete,
}: LoadingOverlayProps) {
  // Track visibility via ref to derive state without sync setState in effect
  const visibleRef = React.useRef(false);
  const openTimeRef = React.useRef<number>(0);
  const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const showContentTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derive visible state from the ref
  const [visible, setVisible] = useState(false);
  const [showContent, setShowContent] = useState(false);

  // Separate effects for open and close
  React.useLayoutEffect(() => {
    if (isOpen) {
      openTimeRef.current = Date.now();
      visibleRef.current = true;
      setVisible(true);
      showContentTimerRef.current = setTimeout(() => setShowContent(true), 100);
    }
    return () => {
      if (showContentTimerRef.current) clearTimeout(showContentTimerRef.current);
    };
  }, [isOpen]);

  // Handle close with minimum duration
  useEffect(() => {
    if (!isOpen && visibleRef.current) {
      const elapsed = Date.now() - openTimeRef.current;
      const remaining = Math.max(0, minDuration - elapsed);

      const hide = () => {
        visibleRef.current = false;
        setShowContent(false);
        closeTimerRef.current = setTimeout(() => {
          setVisible(false);
          onComplete?.();
        }, 200);
      };

      if (remaining > 0) {
        closeTimerRef.current = setTimeout(hide, remaining);
      } else {
        hide();
      }
    }
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, [isOpen, minDuration, onComplete]);

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="loading-overlay fixed inset-0 z-[100] flex flex-col items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop blur */}
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />

          {/* Content */}
          <AnimatePresence>
            {showContent && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="relative flex flex-col items-center gap-5 z-10"
              >
                {/* Animated Logo */}
                <motion.div
                  className="relative"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-xl shadow-violet-300/30 dark:shadow-violet-900/40 loading-logo-spin">
                    <motion.div
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Sparkles className="h-8 w-8 text-white" />
                    </motion.div>
                  </div>
                </motion.div>

                {/* Loading Message */}
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-center"
                >
                  <p className="text-sm font-medium text-foreground">
                    {message}
                  </p>
                </motion.div>

                {/* Indeterminate Progress Bar */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="w-48"
                >
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full rounded-full loading-bar-animated"
                      style={{
                        background: "linear-gradient(90deg, #8b5cf6, #a855f7, #d946ef, #8b5cf6)",
                        backgroundSize: "300% 100%",
                      }}
                      animate={{
                        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  </div>
                </motion.div>

                {/* Cancel Button */}
                {showCancel && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClose}
                      className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
                    >
                      <X className="h-3 w-3" />
                      取消
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Simple Loading Screen (no overlay, for page-level loading) ─────────────

export function LoadingScreen({
  message = "加载中...",
}: {
  message?: string;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col items-center gap-5"
      >
        {/* Animated Logo */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="relative"
        >
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200 dark:shadow-violet-900/40">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="h-7 w-7 text-white" />
            </motion.div>
          </div>
        </motion.div>

        {/* Loading message */}
        <p className="text-sm text-muted-foreground font-medium">{message}</p>

        {/* Progress bar */}
        <div className="w-40 h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full loading-bar-animated"
            style={{
              background: "linear-gradient(90deg, #8b5cf6, #a855f7, #d946ef, #8b5cf6)",
              backgroundSize: "300% 100%",
            }}
            animate={{
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>
      </motion.div>
    </div>
  );
}
