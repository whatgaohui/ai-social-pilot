"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  WifiOff, AlertTriangle, Clock, RefreshCw, Copy, Check,
  ServerCrash, DatabaseZap, HelpCircle, ChevronDown, ChevronUp,
  Home, Sparkles,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

type ErrorType = "network" | "server" | "data" | "render" | "timeout" | "unknown";

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
  /** Auto-retry interval in seconds (0 = disabled) */
  autoRetryInterval?: number;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorType: ErrorType;
  retryCountdown: number;
  copied: boolean;
  showDetails: boolean;
  autoRetryTimer: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function classifyError(error: Error): ErrorType {
  const msg = error.message.toLowerCase();
  const stack = (error.stack || "").toLowerCase();

  if (
    msg.includes("network") ||
    msg.includes("fetch") ||
    msg.includes("failed to fetch") ||
    msg.includes("net::err_") ||
    msg.includes("eof") ||
    msg.includes("socket") ||
    msg.includes("err_network") ||
    msg.includes("err_connection")
  ) {
    return "network";
  }
  if (
    msg.includes("500") ||
    msg.includes("502") ||
    msg.includes("503") ||
    msg.includes("internal server error") ||
    stack.includes("server")
  ) {
    return "server";
  }
  if (
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("deadline") ||
    msg.includes("took too long") ||
    msg.includes("abort")
  ) {
    return "timeout";
  }
  if (
    msg.includes("data") ||
    msg.includes("json") ||
    msg.includes("parse") ||
    msg.includes("unexpected") ||
    msg.includes("cannot read")
  ) {
    return "data";
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
    title: "网络连接失败",
    description: "网络连接失败，请检查网络设置",
    gradient: "from-orange-500 to-amber-500",
    iconBg: "bg-orange-100 dark:bg-orange-950/30",
  },
  server: {
    icon: ServerCrash,
    title: "服务器异常",
    description: "服务器出了点小问题，请稍后再试",
    gradient: "from-rose-500 to-pink-500",
    iconBg: "bg-rose-100 dark:bg-rose-950/30",
  },
  data: {
    icon: DatabaseZap,
    title: "数据异常",
    description: "数据加载异常，请刷新重试",
    gradient: "from-cyan-500 to-blue-500",
    iconBg: "bg-cyan-100 dark:bg-cyan-950/30",
  },
  render: {
    icon: AlertTriangle,
    title: "页面渲染异常",
    description: "组件出现了意外错误，请尝试刷新页面",
    gradient: "from-violet-500 to-purple-500",
    iconBg: "bg-violet-100 dark:bg-violet-950/30",
  },
  timeout: {
    icon: Clock,
    title: "加载超时",
    description: "请求时间过长，请检查网络或稍后重试",
    gradient: "from-amber-500 to-orange-500",
    iconBg: "bg-amber-100 dark:bg-amber-950/30",
  },
  unknown: {
    icon: HelpCircle,
    title: "未知错误",
    description: "发生了未知错误，请稍后重试",
    gradient: "from-gray-500 to-slate-500",
    iconBg: "bg-gray-100 dark:bg-gray-950/30",
  },
};

// ─── Shake animation ────────────────────────────────────────────────────────

const shakeAnimation = {
  initial: { x: 0 },
  animate: {
    x: [0, -6, 6, -4, 4, -2, 2, 0],
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

// ─── Error Boundary Component ───────────────────────────────────────────────

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private autoRetryTimerId: ReturnType<typeof setTimeout> | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorType: "render",
      retryCountdown: 0,
      copied: false,
      showDetails: false,
      autoRetryTimer: props.autoRetryInterval || 0,
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
    const contextInfo = {
      section: this.props.sectionName || "Unknown",
      errorType: classifyError(error),
      timestamp: new Date().toISOString(),
      url: typeof window !== "undefined" ? window.location.href : "SSR",
      userAgent: typeof window !== "undefined" ? navigator.userAgent : "SSR",
    };
    console.error("[ErrorBoundary] Caught error in section:", contextInfo.section, error, errorInfo);
    console.error("[ErrorBoundary] Context:", contextInfo);

    // Report to error monitoring (extend as needed)
    this.reportError(error, errorInfo, contextInfo);

    this.props.onError?.(error, errorInfo);

    // Start auto-retry timer
    this.startAutoRetry();
  }

  private reportError(error: Error, errorInfo: ErrorInfo, context: Record<string, string>) {
    // Structured error logging for potential monitoring services
    const report = {
      type: "ErrorBoundary",
      context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      componentStack: errorInfo.componentStack,
    };
    // Log to console in dev; in production, this could be sent to a monitoring service
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      console.table(report);
    }
  }

  private startAutoRetry() {
    const interval = this.props.autoRetryInterval;
    if (!interval || interval <= 0) return;

    this.autoRetryTimerId = setTimeout(() => {
      this.setState({ hasError: false, error: null, showDetails: false });
      console.warn("[ErrorBoundary] Auto-retry triggered after", interval, "seconds");
    }, interval * 1000);

    // Start countdown display
    this.setState({ autoRetryTimer: interval });
    this.tickAutoRetry();
  }

  private tickAutoRetry() {
    const tick = () => {
      this.setState((prev) => {
        if (prev.autoRetryTimer <= 1) return { autoRetryTimer: 0 };
        const next = prev.autoRetryTimer - 1;
        setTimeout(tick, 1000);
        return { autoRetryTimer: next };
      });
    };
    setTimeout(tick, 1000);
  }

  private clearAutoRetry() {
    if (this.autoRetryTimerId) {
      clearTimeout(this.autoRetryTimerId);
      this.autoRetryTimerId = null;
    }
  }

  componentWillUnmount() {
    this.clearAutoRetry();
  }

  handleReset = () => {
    this.clearAutoRetry();
    this.setState({
      hasError: false,
      error: null,
      retryCountdown: 0,
      copied: false,
      showDetails: false,
      autoRetryTimer: 0,
    });
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  handleRetry = () => {
    if (this.state.retryCountdown > 0) return;
    this.clearAutoRetry();
    this.setState({ retryCountdown: 3, showDetails: false });
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

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      if (this.props.lightweight) {
        return (
          <LightweightErrorFallback
            state={this.state}
            onRetry={this.handleRetry}
            onCopy={this.handleCopyError}
            sectionName={this.props.sectionName}
            onToggleDetails={this.toggleDetails}
          />
        );
      }
      return (
        <FullErrorFallback
          errorType={this.props.errorType || this.state.errorType}
          state={this.state}
          onRetry={this.handleRetry}
          onReset={this.handleReset}
          onCopy={this.handleCopyError}
          onToggleDetails={this.toggleDetails}
          sectionName={this.props.sectionName}
        />
      );
    }

    return this.props.children;
  }
}

// ─── Animated Error Illustration (SVG) ──────────────────────────────────────

function ErrorIllustration({ type, className = "" }: { type: ErrorType; className?: string }) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
      className={className}
    >
      <svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="error-illustration"
        aria-hidden="true"
      >
        {/* Warning circle background */}
        <circle cx="60" cy="60" r="52" className="fill-muted/60" />
        <circle cx="60" cy="60" r="52" className="stroke-muted-foreground/15" strokeWidth="2" />

        {/* Inner glow ring */}
        <circle cx="60" cy="60" r="42" className="stroke-muted-foreground/8" strokeWidth="1" />

        {/* Error type-specific icon */}
        {type === "network" && (
          <>
            {/* WiFi signal broken */}
            <path d="M38 52C44 46 52 42 60 42" className="stroke-orange-400/40" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M82 52C76 46 68 42 60 42" className="stroke-orange-400/40" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M44 62C50 56 55 54 60 54" className="stroke-orange-400/30" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M76 62C70 56 65 54 60 54" className="stroke-orange-400/30" strokeWidth="3" strokeLinecap="round" fill="none" />
            {/* X mark at center */}
            <circle cx="60" cy="74" r="6" className="fill-orange-400/20" />
            <path d="M57 71L63 77M63 71L57 77" className="stroke-orange-500" strokeWidth="2" strokeLinecap="round" />
            {/* Signal break line */}
            <path d="M60 42L60 30" className="stroke-red-400/60" strokeWidth="2" strokeLinecap="round" />
            <path d="M55 33L60 28L65 33" className="stroke-red-400/60" strokeWidth="2" strokeLinecap="round" fill="none" />
          </>
        )}
        {type === "server" && (
          <>
            {/* Server rack */}
            <rect x="40" y="38" width="40" height="12" rx="3" className="fill-rose-400/15 stroke-rose-400/30" strokeWidth="1.5" />
            <rect x="40" y="54" width="40" height="12" rx="3" className="fill-rose-400/15 stroke-rose-400/30" strokeWidth="1.5" />
            <rect x="40" y="70" width="40" height="12" rx="3" className="fill-rose-400/15 stroke-rose-400/30" strokeWidth="1.5" />
            {/* Server indicator lights */}
            <circle cx="48" cy="44" r="2" className="fill-emerald-400/50" />
            <circle cx="48" cy="60" r="2" className="fill-emerald-400/50" />
            <circle cx="48" cy="76" r="2" className="fill-red-400/70" />
            {/* Warning icon on broken server */}
            <path d="M72 76L70 70H74L72 76Z" className="fill-amber-400/60" />
            <circle cx="72" cy="79" r="1" className="fill-amber-400/60" />
          </>
        )}
        {type === "data" && (
          <>
            {/* Database cylinder */}
            <ellipse cx="60" cy="44" rx="18" ry="8" className="fill-cyan-400/15 stroke-cyan-400/30" strokeWidth="1.5" />
            <path d="M42 44V72C42 76.4 49.2 80 60 80C70.8 80 78 76.4 78 72V44" className="stroke-cyan-400/30" strokeWidth="1.5" fill="none" />
            <ellipse cx="60" cy="72" rx="18" ry="8" className="stroke-cyan-400/30" strokeWidth="1.5" fill="none" />
            {/* Broken data lines */}
            <path d="M50 56L58 52" className="stroke-red-400/50" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M62 52L70 56" className="stroke-red-400/50" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M54 64L60 60" className="stroke-red-400/40" strokeWidth="1.5" strokeLinecap="round" />
          </>
        )}
        {(type === "render" || type === "unknown") && (
          <>
            {/* Warning triangle */}
            <path d="M60 36L38 78H82L60 36Z" className="fill-violet-400/10 stroke-violet-400/30" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M60 36L38 78H82L60 36Z" className="fill-none" />
            {/* Exclamation mark */}
            <path d="M60 50V62" className="stroke-violet-400" strokeWidth="3" strokeLinecap="round" />
            <circle cx="60" cy="68" r="2" className="fill-violet-400" />
            {/* Sparkles */}
            <circle cx="90" cy="44" r="2" className="fill-violet-400/30" />
            <circle cx="32" cy="68" r="1.5" className="fill-violet-400/25" />
          </>
        )}
        {type === "timeout" && (
          <>
            {/* Clock face */}
            <circle cx="60" cy="60" r="22" className="fill-amber-400/10 stroke-amber-400/30" strokeWidth="1.5" />
            {/* Clock hands */}
            <path d="M60 44V60L72 66" className="stroke-amber-400" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="60" cy="60" r="2.5" className="fill-amber-400" />
            {/* Hour marks */}
            <path d="M60 40V42" className="stroke-amber-400/40" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M60 78V80" className="stroke-amber-400/40" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M38 60H40" className="stroke-amber-400/40" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M80 60H82" className="stroke-amber-400/40" strokeWidth="1.5" strokeLinecap="round" />
            {/* Motion lines suggesting timeout */}
            <path d="M88 52L92 50" className="stroke-amber-400/25" strokeWidth="1" strokeLinecap="round" />
            <path d="M90 60L94 60" className="stroke-amber-400/25" strokeWidth="1" strokeLinecap="round" />
            <path d="M88 68L92 70" className="stroke-amber-400/25" strokeWidth="1" strokeLinecap="round" />
          </>
        )}
      </svg>
    </motion.div>
  );
}

// ─── Error Details Collapse ─────────────────────────────────────────────────

function ErrorDetails({ state, onToggle }: {
  state: ErrorBoundaryState;
  onToggle: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="w-full"
    >
      <button
        onClick={onToggle}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto cursor-pointer"
      >
        {state.showDetails ? (
          <>
            <ChevronUp className="h-3 w-3" />
            隐藏详情
          </>
        ) : (
          <>
            <ChevronDown className="h-3 w-3" />
            显示详情
          </>
        )}
      </button>
      <AnimatePresence>
        {state.showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 bg-muted/50 rounded-lg p-3 text-left max-h-40 overflow-y-auto">
              <p className="text-[10px] font-mono text-muted-foreground break-all whitespace-pre-wrap">
                {state.error?.stack || state.error?.message || "无堆栈信息"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Full Error Fallback (for layout-level wrapping) ─────────────────────────

function FullErrorFallback({
  errorType,
  state,
  onRetry,
  onReset,
  onCopy,
  onToggleDetails,
  sectionName,
}: {
  errorType: ErrorType;
  state: ErrorBoundaryState;
  onRetry: () => void;
  onReset: () => void;
  onCopy: () => void;
  onToggleDetails: () => void;
  sectionName?: string;
}) {
  const config = ERROR_CONFIG[errorType];

  return (
    <div className="error-boundary-container min-h-screen flex items-center justify-center p-4 bg-gradient-animated">
      <motion.div
        {...shakeAnimation}
        className="w-full max-w-sm"
      >
        <Card className="card-spotlight bg-gradient-to-br from-red-50/50 to-orange-50/50 dark:from-red-950/20 dark:to-orange-950/20 border-0 shadow-xl overflow-hidden">
          <CardContent className="p-6 text-center space-y-5">
            {/* Animated Error Illustration */}
            <div className="flex justify-center">
              <ErrorIllustration type={errorType} />
            </div>

            {/* Text */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-2"
            >
              <h3 className="text-lg font-bold">{config.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed py-1">
                {config.description}
              </p>
              {sectionName && (
                <p className="text-[11px] text-muted-foreground/60">
                  错误位置: {sectionName}
                </p>
              )}
            </motion.div>

            {/* Auto-retry countdown */}
            {state.autoRetryTimer > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <RefreshCw className="h-3 w-3" />
                </motion.div>
                <span>{state.autoRetryTimer} 秒后自动重试...</span>
              </motion.div>
            )}

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
                className={`focus-ring-soft w-full h-10 bg-gradient-to-r ${config.gradient} text-white shadow-md btn-press retry-button-pulse`}
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
                className="w-full h-9 text-xs gap-1.5"
              >
                <Home className="h-3.5 w-3.5" />
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

            {/* Error Details Collapse */}
            <ErrorDetails state={state} onToggle={onToggleDetails} />
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
  onToggleDetails,
}: {
  state: ErrorBoundaryState;
  onRetry: () => void;
  onCopy: () => void;
  sectionName?: string;
  onToggleDetails: () => void;
}) {
  const config = ERROR_CONFIG[state.errorType];
  return (
    <motion.div
      {...shakeAnimation}
      className="flex flex-col items-center justify-center py-12 px-4 bg-gradient-to-br from-red-50/50 to-orange-50/50 dark:from-red-950/20 dark:to-orange-950/20 rounded-xl"
    >
      {/* Lightweight icon */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
        className={`h-10 w-10 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center mb-3 shadow-sm`}
      >
        <ErrorIcon type={state.errorType} className="h-5 w-5 text-white" />
      </motion.div>
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
          className="h-7 text-[11px] gap-1 focus-ring-soft"
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

      {/* Auto-retry for lightweight */}
      {state.autoRetryTimer > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[10px] text-muted-foreground mt-2"
        >
          {state.autoRetryTimer}秒后自动重试
        </motion.p>
      )}
    </motion.div>
  );
}

// ─── ErrorIcon helper ────────────────────────────────────────────────────────

function ErrorIcon({ type, className }: { type: ErrorType; className?: string }) {
  const config = ERROR_CONFIG[type];
  const Icon = config.icon;
  return <Icon className={className} />;
}

// ─── Countdown wrapper for ErrorBoundary retry ──────────────────────────────

export function ErrorBoundaryWithRetry(props: ErrorBoundaryProps) {
  return <ErrorBoundary {...props} />;
}
