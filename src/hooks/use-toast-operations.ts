"use client";

import { useCallback } from "react";
import { toast as sonnerToast, type ExternalToast } from "sonner";

/** Options shared by all toast helpers */
interface ToastOptions {
  description?: string;
  action?: ExternalToast["action"];
  duration?: number;
}

/** Emit a green success toast */
export function useSuccessToast() {
  return useCallback((message: string, options?: ToastOptions) => {
    sonnerToast.success(message, {
      description: options?.description,
      action: options?.action,
      duration: options?.duration ?? 3000,
    });
  }, []);
}

/** Emit a red error toast */
export function useErrorToast() {
  return useCallback((message: string, options?: ToastOptions) => {
    sonnerToast.error(message, {
      description: options?.description,
      action: options?.action,
      duration: options?.duration ?? 4000,
    });
  }, []);
}

/** Emit a blue info toast */
export function useInfoToast() {
  return useCallback((message: string, options?: ToastOptions) => {
    sonnerToast.info(message, {
      description: options?.description,
      action: options?.action,
      duration: options?.duration ?? 3000,
    });
  }, []);
}

/** Emit an amber warning toast */
export function useWarningToast() {
  return useCallback((message: string, options?: ToastOptions) => {
    sonnerToast.warning(message, {
      description: options?.description,
      action: options?.action,
      duration: options?.duration ?? 3500,
    });
  }, []);
}

/** Options for promise-based auto-toast */
interface PromiseToastOptions<T> {
  loading: string;
  success: string | ((data: T) => string);
  error: string | ((error: Error) => string);
  description?: string;
  action?: ExternalToast["action"];
}

/**
 * Automatically show loading → success / error toasts for an async operation.
 *
 * @example
 * ```tsx
 * const save = usePromiseToast(savePost, {
 *   loading: "保存中…",
 *   success: "保存成功",
 *   error: "保存失败",
 * });
 * // call save(postData)
 * ```
 */
export function usePromiseToast<T>(
  fn: (arg: T) => Promise<unknown>,
  opts: PromiseToastOptions<unknown>,
) {
  return useCallback(
    (arg: T) =>
      sonnerToast.promise(fn(arg), {
        loading: opts.loading,
        success: opts.success,
        error: opts.error,
        description: opts.description,
        action: opts.action,
      }),
    [fn, opts],
  );
}
