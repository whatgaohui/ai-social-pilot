"use client";

import React, { createContext, useContext, useCallback } from "react";
import { toast as sonnerToast, type ExternalToast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ToastOptions {
  description?: string;
  action?: ExternalToast["action"];
  duration?: number;
}

interface ToastContextValue {
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
  warning: (message: string, options?: ToastOptions) => void;
  dismiss: (id?: string | number) => void;
  /** Low-level access to sonner's `toast` for advanced use-cases */
  raw: typeof sonnerToast;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const success = useCallback((message: string, options?: ToastOptions) => {
    sonnerToast.success(message, {
      description: options?.description,
      action: options?.action,
      duration: options?.duration ?? 3000,
    });
  }, []);

  const error = useCallback((message: string, options?: ToastOptions) => {
    sonnerToast.error(message, {
      description: options?.description,
      action: options?.action,
      duration: options?.duration ?? 4000,
    });
  }, []);

  const info = useCallback((message: string, options?: ToastOptions) => {
    sonnerToast.info(message, {
      description: options?.description,
      action: options?.action,
      duration: options?.duration ?? 3000,
    });
  }, []);

  const warning = useCallback((message: string, options?: ToastOptions) => {
    sonnerToast.warning(message, {
      description: options?.description,
      action: options?.action,
      duration: options?.duration ?? 3500,
    });
  }, []);

  const dismiss = useCallback((id?: string | number) => {
    sonnerToast.dismiss(id);
  }, []);

  const value = React.useMemo<ToastContextValue>(
    () => ({ success, error, info, warning, dismiss, raw: sonnerToast }),
    [success, error, info, warning, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

/**
 * Access the unified toast context from anywhere inside `<ToastProvider>`.
 *
 * @example
 * ```tsx
 * const { success, error } = useToast();
 * success("知识已添加", { description: "已添加到知识库" });
 * ```
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a <ToastProvider>");
  }
  return ctx;
}
