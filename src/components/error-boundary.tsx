"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WifiOff, AlertTriangle, Clock, RefreshCw, Copy, Check } from "lucide-react";
import { useState, useEffect, useCallback } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

type ErrorType = "network" | "render" | "timeout";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional fallback UI override */
  fallback?: ReactNode;
  /** Optional error type override */
  errorType?: ErrorType;
  /** Lightweight mode — smaller UI for panel-level wrapping */
  lightweight?: boolean;
  /** Optional onError callback */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Human-readable section name for error messages */
  sectionName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorType: ErrorType;
  retryCountdown: number;
  copied: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function classifyError(error: Error): ErrorType {
  const msg = error.message.toLowerCase();
  if (
    msg.includes("network") ||
    msg.includes("fetch") ||
    msg.includes("failed to fetch") ||
    msg.includes("net::err_") ||
    msg.includes("timeout") ||
    msg.includes("abort") ||
    msg.includes("eof") ||
    msg.includes("socket")
  ) {
    return "network";
  }
  if (
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("deadline") ||
    msg.includes("took too long")
  ) {
    return "timeout";
  }
  return "render";
}

// ─── Error UI Configuration ─────────────────────────────────────────────────

const ERROR_CONFIG: Record<ErrorType, {
  icon: typeof WifiOff;
  title: string;
  description: string;
  gradient: string;
  iconBg: string;
}> = {
  network: {
    icon: WifiOff,
    title: "网络连接异常",
    description: "无法连接到服务器，请检查网络后重试",
    gradient: "from-orange-500 to-amber-500",
    iconBg: "bg-orange-100 dark:bg-orange-950/30",
  },
  render: {
    icon: AlertTriangle,
    title: "页面渲染异常",
    description: "组件出现了意外错误，请尝试刷新页面",
    gradient: "from-rose-500 to-pink-500",
    iconBg: "bg-rose-100 dark:bg-rose-950/30",
  },
  timeout: {
    icon: Clock,
    title: "加载超时",
    description: "请求时间过长，请检查网络或稍后重试",
    gradient: "from-violet-500 to-purple-500",
    iconBg: "bg-violet-100 dark:bg-violet-950/30",
  },
};

// ─── Shake animation ────────────────────────────────────────────────────────

const shakeAnimation = {
  initial: { x: 0 },
  animate: {
    x: [0, -6, 6, -4, 4, -2, 2, 0],
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

// ─── Error Boundary Component ───────────────────────────────────────────────

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorType: "render",
      retryCountdown: 0,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorType: classifyError(error),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, retryCountdown: 0, copied: false });
  };

  handleRetry = () => {
    if (this.state.retryCountdown > 0) return;
    this.setState({ retryCountdown: 3 });
  };

  handleCopyError = () => {
    const errorInfo = [
      `Section: ${this.props.sectionName || "Unknown"}`,
      `Type: ${this.state.errorType}`,
      `Message: ${this.state.error?.message || "Unknown error"}`,
      `Stack: ${this.state.error?.stack || "No stack trace"}`,
      `Time: ${new Date().toISOString()}`,
      `URL: ${typeof window !== "undefined" ? window.location.href : "SSR"}`,
    ].join("\n");

    navigator.clipboard.writeText(errorInfo).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      if (this.props.lightweight) {
        return <LightweightErrorFallback state={this.state} onRetry={this.handleRetry} onCopy={this.handleCopyError} sectionName={this.props.sectionName} />;
      }
      return (
        <FullErrorFallback
          errorType={this.props.errorType || this.state.errorType}
          state={this.state}
          onRetry={this.handleRetry}
          onReset={this.handleReset}
          onCopy={this.handleCopyError}
          sectionName={this.props.sectionName}
        />
      );
    }

    return this.props.children;
  }
}

// ─── Full Error Fallback (for layout-level wrapping) ─────────────────────────

function FullErrorFallback({
  errorType,
  state,
  onRetry,
  onReset,
  onCopy,
  sectionName,
}: {
  errorType: ErrorType;
  state: ErrorBoundaryState;
  onRetry: () => void;
  onReset: () => void;
  onCopy: () => void;
  sectionName?: string;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-animated">
      <motion.div
        {...shakeAnimation}
        className="w-full max-w-sm"
      >
        <Card className="border-0 shadow-xl">
          <CardContent className="p-6 text-center space-y-5">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
            >
              <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${ERROR_CONFIG[errorType].gradient} flex items-center justify-center mx-auto shadow-lg`}>
                <ErrorIcon type={errorType} className="h-8 w-8 text-white" />
              </div>
            </motion.div>

            {/* Text */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-2"
            >
              <h3 className="text-lg font-bold">{ERROR_CONFIG[errorType].title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {ERROR_CONFIG[errorType].description}
              </p>
              {state.error?.message && (
                <p className="text-xs text-muted-foreground/70 font-mono bg-muted/50 rounded-lg px-3 py-2 break-all max-h-20 overflow-y-auto">
                  {state.error.message}
                </p>
              )}
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-2.5"
            >
              <Button
                onClick={onRetry}
                disabled={state.retryCountdown > 0}
                className={`w-full h-10 bg-gradient-to-r ${ERROR_CONFIG[errorType].gradient} text-white shadow-md btn-press`}
              >
                {state.retryCountdown > 0 ? (
                  <>
                    <Clock className="h-4 w-4 mr-1.5 animate-spin" />
                    {state.retryCountdown} 秒后重试...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1.5" />
                    重试
                  </>
                )}
              </Button>
              <Button
                onClick={onReset}
                variant="outline"
                className="w-full h-9 text-xs"
              >
                返回首页
              </Button>
            </motion.div>

            {/* Copy Error Info */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={onCopy}
                className="text-xs text-muted-foreground hover:text-foreground mx-auto"
              >
                {state.copied ? (
                  <>
                    <Check className="h-3 w-3 mr-1 text-emerald-500" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1" />
                    复制错误信息
                  </>
                )}
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// ─── Lightweight Error Fallback (for panel-level wrapping) ──────────────────

function LightweightErrorFallback({
  state,
  onRetry,
  onCopy,
  sectionName,
}: {
  state: ErrorBoundaryState;
  onRetry: () => void;
  onCopy: () => void;
  sectionName?: string;
}) {
  const config = ERROR_CONFIG[state.errorType];
  return (
    <motion.div
      {...shakeAnimation}
      className="flex flex-col items-center justify-center py-12 px-4"
    >
      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center mb-3 shadow-sm`}>
        <ErrorIcon type={state.errorType} className="h-5 w-5 text-white" />
      </div>
      <h4 className="text-sm font-semibold mb-1">{config.title}</h4>
      <p className="text-[11px] text-muted-foreground mb-3 text-center max-w-[200px]">
        {sectionName ? `${sectionName} · ` : ""}{config.description}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          disabled={state.retryCountdown > 0}
          className="h-7 text-[11px] gap-1"
        >
          {state.retryCountdown > 0 ? (
            <>
              <Clock className="h-3 w-3 animate-spin" />
              {state.retryCountdown}s
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3" />
              重试
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCopy}
          className="h-7 text-[11px] text-muted-foreground"
        >
          {state.copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
    </motion.div>
  );
}

// ─── ErrorIcon helper ────────────────────────────────────────────────────────

function ErrorIcon({ type, className }: { type: ErrorType; className?: string }) {
  switch (type) {
    case "network":
      return <WifiOff className={className} />;
    case "timeout":
      return <Clock className={className} />;
    case "render":
      return <AlertTriangle className={className} />;
  }
}

// ─── Countdown Hook ─────────────────────────────────────────────────────────

export function useRetryCountdown(countdown: number, onCountdownEnd: () => void) {
  const [_tick, setTick] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Return current countdown value (derived from state.tick + initial countdown)
  return countdown;
}

// ─── Countdown wrapper for ErrorBoundary retry ──────────────────────────────

export function ErrorBoundaryWithRetry(props: ErrorBoundaryProps) {
  const [countdown, setCountdown] = useState(0);

  const handleRetry = useCallback(() => {
    if (countdown > 0) return;
    setCountdown(3);
  }, [countdown]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => {
      setCountdown((c) => c - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  return (
    <ErrorBoundary
      {...props}
      // We let the class component handle its own state,
      // but we can enhance with external retry countdown if needed
    />
  );
}
