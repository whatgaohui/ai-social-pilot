"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────────────

type ApiErrorType = "network" | "timeout" | "rate_limit" | "not_found" | "server" | "unknown";

interface ApiError {
  type: ApiErrorType;
  message: string;
  status?: number;
  originalError?: Error;
  retryable: boolean;
}

interface UseApiFetchOptions<T> {
  /** Maximum number of retries (default: 3) */
  retries?: number;
  /** Initial delay for exponential backoff in ms (default: 1000) */
  backoffBase?: number;
  /** Enable toast notifications for errors (default: true) */
  showToast?: boolean;
  /** Manual trigger mode — won't auto-fetch */
  manual?: boolean;
  /** Success toast message */
  successMessage?: string;
  /** Custom error messages per type */
  errorMessages?: Partial<Record<ApiErrorType, string>>;
  /** Transform response data */
  transform?: (data: T) => T;
}

interface UseApiFetchResult<T> {
  data: T | null;
  error: ApiError | null;
  isLoading: boolean;
  isRetrying: boolean;
  retryCount: number;
  refetch: () => Promise<void>;
  reset: () => void;
}

// ─── Error Type Detection ───────────────────────────────────────────────────

function detectErrorType(error: unknown, response?: Response): ApiErrorType {
  if (error instanceof TypeError && (error.message.includes("fetch") || error.message.includes("Failed to fetch") || error.message.includes("NetworkError"))) {
    return "network";
  }
  if (error instanceof DOMException && error.name === "AbortError") {
    return "timeout";
  }
  if (error instanceof Error && error.message.includes("timeout")) {
    return "timeout";
  }
  if (response) {
    if (response.status === 429) return "rate_limit";
    if (response.status === 404) return "not_found";
    if (response.status >= 500) return "server";
    if (response.status === 0) return "network";
  }
  return "unknown";
}

// ─── User-Friendly Chinese Error Messages ───────────────────────────────────

const DEFAULT_ERROR_MESSAGES: Record<ApiErrorType, string> = {
  network: "网络连接失败，请检查网络设置",
  timeout: "请求超时，请稍后重试",
  rate_limit: "请求过于频繁，请稍后再试",
  not_found: "请求的资源不存在",
  server: "服务器出了点小问题，请稍后再试",
  unknown: "发生了未知错误，请重试",
};

// ─── Retry Delay Calculator (Exponential Backoff) ───────────────────────────

function getRetryDelay(retryCount: number, base: number): number {
  const jitter = Math.random() * 200; // Add jitter to prevent thundering herd
  return Math.min(base * Math.pow(2, retryCount) + jitter, 30000); // Max 30 seconds
}

// ─── Hook Implementation ────────────────────────────────────────────────────

export function useApiFetch<T = unknown>(
  url: string,
  options?: RequestInit & UseApiFetchOptions<T>,
): UseApiFetchResult<T> {
  const {
    retries = 3,
    backoffBase = 1000,
    showToast = true,
    manual = false,
    successMessage,
    errorMessages,
    transform,
    ...fetchOptions
  } = options || {};

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(!manual);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const messages = { ...DEFAULT_ERROR_MESSAGES, ...errorMessages };

  const fetchData = useCallback(async (attempt = 0) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (attempt === 0) {
      setIsLoading(true);
    } else {
      setIsRetrying(true);
    }
    setError(null);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorType = detectErrorType(null, response);
        const apiError: ApiError = {
          type: errorType,
          message: messages[errorType],
          status: response.status,
          retryable: response.status === 429 || response.status >= 500,
        };

        // Retry for retryable errors
        if (apiError.retryable && attempt < retries) {
          const delay = getRetryDelay(attempt, backoffBase);
          setRetryCount(attempt + 1);
          if (showToast && attempt === 0) {
            toast.info(`请求失败，${Math.ceil(delay / 1000)}秒后重试... (${attempt + 1}/${retries})`);
          }
          await new Promise((resolve) => setTimeout(resolve, delay));
          return fetchData(attempt + 1);
        }

        setError(apiError);
        if (showToast) {
          toast.error(messages[errorType], {
            description: response.status ? `状态码: ${response.status}` : undefined,
          });
        }
        return;
      }

      const rawData = await response.json();
      const result = transform ? transform(rawData as T) : (rawData as T);
      setData(result);
      setRetryCount(0);

      if (showToast && successMessage) {
        toast.success(successMessage);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return; // Request was cancelled, ignore
      }

      const errorType = detectErrorType(err);
      const apiError: ApiError = {
        type: errorType,
        message: messages[errorType],
        originalError: err instanceof Error ? err : new Error(String(err)),
        retryable: errorType === "network" || errorType === "timeout" || errorType === "server",
      };

      // Retry for retryable errors
      if (apiError.retryable && attempt < retries) {
        const delay = getRetryDelay(attempt, backoffBase);
        setRetryCount(attempt + 1);
        if (showToast && attempt === 0) {
          toast.info(`请求失败，${Math.ceil(delay / 1000)}秒后重试... (${attempt + 1}/${retries})`);
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
        return fetchData(attempt + 1);
      }

      setError(apiError);
      if (showToast) {
        toast.error(messages[errorType]);
      }
    } finally {
      setIsLoading(false);
      setIsRetrying(false);
    }
  }, [url, retries, backoffBase, showToast, successMessage, messages, transform, fetchOptions]);

  // Auto-fetch on mount
  useEffect(() => {
    if (!manual) {
      fetchData();
    }
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData, manual]);

  const refetch = useCallback(async () => {
    setRetryCount(0);
    await fetchData();
  }, [fetchData]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
    setIsRetrying(false);
    setRetryCount(0);
  }, []);

  return {
    data,
    error,
    isLoading,
    isRetrying,
    retryCount,
    refetch,
    reset,
  };
}

// ─── Simplified API Error Handler for non-fetch usage ──────────────────────

export function useApiErrorHandler() {
  const handleError = useCallback((err: unknown, context?: string) => {
    const errorType = detectErrorType(err);
    const message = DEFAULT_ERROR_MESSAGES[errorType];

    console.error(`[API Error]${context ? ` (${context})` : ""}:`, err);
    toast.error(message, {
      description: context ? `操作: ${context}` : undefined,
    });

    return {
      type: errorType,
      message,
      retryable: ["network", "timeout", "server"].includes(errorType),
    } as ApiError;
  }, []);

  const handleSuccess = useCallback((message?: string) => {
    if (message) {
      toast.success(message);
    }
  }, []);

  return { handleError, handleSuccess };
}
