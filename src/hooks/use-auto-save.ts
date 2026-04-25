"use client";

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UseAutoSaveOptions {
  /** The data to auto-save */
  data: unknown;
  /** A unique key for localStorage isolation (prefixed with `autosave-`) */
  key: string;
  /** Interval in ms between auto-saves. Default: 30000 (30s) */
  interval?: number;
  /** Whether auto-save is active. Default: true */
  enabled?: boolean;
}

interface UseAutoSaveReturn {
  /** Timestamp of the last successful save, or null */
  savedAt: Date | null;
  /** Whether data has changed since the last save */
  isDirty: boolean;
  /** Clear the saved draft from localStorage */
  clearSaved: () => void;
  /** Load a previously saved draft from localStorage (returns parsed value or null) */
  loadSaved: () => unknown;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStorageKey(key: string): string {
  return `autosave-${key}`;
}

function getMetaKey(key: string): string {
  return `autosave-${key}.__meta`;
}

function safeJsonParse(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function safeJsonStringify(data: unknown): string | null {
  try {
    return JSON.stringify(data);
  } catch {
    return null;
  }
}

// ─── Subscription-based reactivity for savedAt / isDirty ─────────────────────
// We use a simple pub/sub so the hook can update state from setInterval
// callbacks without calling setState synchronously in an effect body.

type Listener = () => void;

const subscriptions = new Map<string, Set<Listener>>();

function subscribe(key: string, listener: Listener): () => void {
  if (!subscriptions.has(key)) subscriptions.set(key, new Set());
  subscriptions.get(key)!.add(listener);
  return () => {
    subscriptions.get(key)?.delete(listener);
  };
}

function emit(key: string) {
  subscriptions.get(key)?.forEach((fn) => fn());
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAutoSave({
  data,
  key,
  interval = 30_000,
  enabled = true,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const storageKey = getStorageKey(key);
  const metaKey = getMetaKey(key);
  const lastSerializedRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reactive `savedAt` via useSyncExternalStore
  const getSavedAtSnapshot = useCallback((): Date | null => {
    try {
      const meta = localStorage.getItem(metaKey);
      if (meta) {
        const parsed = JSON.parse(meta) as { savedAt: string };
        return new Date(parsed.savedAt);
      }
    } catch {
      // ignore
    }
    return null;
  }, [metaKey]);

  const savedAt = useSyncExternalStore(
    useCallback((onStoreChange) => subscribe(key, onStoreChange), [key]),
    getSavedAtSnapshot,
    () => null, // server snapshot
  );

  // Reactive `isDirty` — compare current data against what's stored in localStorage
  const getIsDirtySnapshot = useCallback((): boolean => {
    if (!enabled) return false;
    const current = safeJsonStringify(data);
    if (current === null) return false;
    try {
      const stored = localStorage.getItem(storageKey);
      return stored !== current;
    } catch {
      return false;
    }
  }, [data, enabled, storageKey]);

  const isDirty = useSyncExternalStore(
    useCallback((onStoreChange) => subscribe(key, onStoreChange), [key]),
    getIsDirtySnapshot,
    () => false, // server snapshot
  );

  // Periodic save — setState is avoided; we write to localStorage
  // and notify subscribers so useSyncExternalStore picks up changes.
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const doSave = () => {
      const serialized = safeJsonStringify(data);
      if (!serialized) return;

      // Only write if data actually changed from what's stored
      try {
        const existing = localStorage.getItem(storageKey);
        if (existing === serialized) return;
      } catch {
        // localStorage might be unavailable
      }

      try {
        localStorage.setItem(storageKey, serialized);
        localStorage.setItem(
          metaKey,
          JSON.stringify({ savedAt: new Date().toISOString() }),
        );
        lastSerializedRef.current = serialized;
        emit(key); // trigger re-render via subscription
      } catch (err) {
        // QuotaExceededError or other storage errors — silently skip
        if (err instanceof DOMException && err.name === "QuotaExceededError") {
          console.warn(`[useAutoSave] localStorage quota exceeded for key "${key}"`);
        }
      }
    };

    // Save immediately, then periodically
    doSave();

    intervalRef.current = setInterval(doSave, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [data, enabled, interval, storageKey, metaKey, key]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const clearSaved = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(metaKey);
    } catch {
      // ignore
    }
    lastSerializedRef.current = null;
    emit(key);
  }, [storageKey, metaKey, key]);

  const loadSaved = useCallback((): unknown => {
    try {
      const raw = localStorage.getItem(storageKey);
      return safeJsonParse(raw);
    } catch {
      return null;
    }
  }, [storageKey]);

  return { savedAt, isDirty, clearSaved, loadSaved };
}

// ─── Utility: format a relative time string (X 分钟前 / X 小时前) ────────────

export function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  return `${days} 天前`;
}
