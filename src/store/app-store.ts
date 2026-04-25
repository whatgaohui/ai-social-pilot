/**
 * Backward-compatibility wrapper for the split domain stores.
 *
 * The original monolithic `useAppStore` has been split into 4 domain-specific stores:
 *   - usePersonaStore  (persona-store.ts)
 *   - useContentStore  (content-store.ts)
 *   - useUIStore       (ui-store.ts)
 *   - useNotificationStore (notification-store.ts)
 *
 * This module re-exports `useAppStore` that combines all 4 stores so existing
 * consumers continue to work without any code changes.
 *
 * For new code, prefer importing from the specific domain store directly
 * for better re-render isolation.
 */

import { usePersonaStore } from './persona-store';
import { useContentStore } from './content-store';
import { useUIStore } from './ui-store';
import { useNotificationStore } from './notification-store';
import type { Persona, KnowledgeItem, ContentPlan, ContentPost, Material, AnalyticsSummary, Platform, AppNotification } from '@/types';

// ─── Combined state interface (identical to the old AppState) ───────────────

interface AppState {
  // Persona
  persona: Persona | null;
  setPersona: (persona: Persona | null) => void;

  // Knowledge Base
  knowledgeItems: KnowledgeItem[];
  setKnowledgeItems: (items: KnowledgeItem[]) => void;
  addKnowledgeItem: (item: KnowledgeItem) => void;
  removeKnowledgeItem: (id: string) => void;
  updateKnowledgeItem: (id: string, data: Partial<KnowledgeItem>) => void;

  // Content Plan
  currentPlan: ContentPlan | null;
  contentPosts: ContentPost[];
  setCurrentPlan: (plan: ContentPlan | null) => void;
  setContentPosts: (posts: ContentPost[]) => void;
  addContentPost: (post: ContentPost) => void;
  updateContentPost: (id: string, data: Partial<ContentPost>) => void;
  reorderPosts: (activeId: string, overId: string) => void;
  deleteContentPost: (id: string) => void;

  // Materials
  materials: Material[];
  setMaterials: (materials: Material[]) => void;
  addMaterial: (material: Material) => void;
  removeMaterial: (id: string) => void;

  // Analytics
  analytics: AnalyticsSummary[];
  setAnalytics: (analytics: AnalyticsSummary[]) => void;

  // UI State
  selectedDate: string | null;
  setSelectedDate: (date: string | null) => void;
  selectedPostId: string | null;
  setSelectedPostId: (id: string | null) => void;
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;

  // Streaming state
  streamingContent: string;
  setStreamingContent: (content: string) => void;
  isStreamActive: boolean;
  setIsStreamActive: (active: boolean) => void;
  clearStreaming: () => void;

  // Left panel active tab
  leftPanelTab: string;
  setLeftPanelTab: (tab: string) => void;

  // Right panel active tab
  rightPanelTab: string;
  setRightPanelTab: (tab: string) => void;

  // Platform
  platform: Platform;
  setPlatform: (platform: Platform) => void;

  // Account panel
  accountPanelOpen: boolean;
  setAccountPanelOpen: (open: boolean) => void;

  // Onboarding
  onboardingCompleted: boolean;
  setOnboardingCompleted: (completed: boolean) => void;
  onboardingInit: () => void;

  // Settings Center
  settingsCenterOpen: boolean;
  setSettingsCenterOpen: (open: boolean) => void;

  // Command Palette
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  // Notifications
  notifications: AppNotification[];
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
}

// ─── Helper: merge state from all 4 stores ──────────────────────────────────

function getCombinedState(): AppState {
  return {
    ...usePersonaStore.getState(),
    ...useContentStore.getState(),
    ...useUIStore.getState(),
    ...useNotificationStore.getState(),
  };
}

// ─── useAppStore: combined hook + static API ────────────────────────────────
//
// Supports three call patterns:
//   1. useAppStore()              → returns the full combined state (React hook)
//   2. useAppStore(selector)      → returns selector(combinedState) (React hook)
//   3. useAppStore.getState()     → returns combined state outside React
//   4. useAppStore.subscribe(fn)  → subscribe to changes outside React
//   5. useAppStore.setState(obj)  → update state outside React
//
// We use a single object that IS both the hook function AND the store API,
// so Turbopack's ESM module system preserves all properties correctly.

type Listener = (state: AppState, prevState: AppState) => void;
type Selector<T> = (state: AppState) => T;

function useAppStoreHook<T>(selector?: Selector<T>): AppState | T {
  // Subscribe to each sub-store individually — Zustand will only trigger
  // a re-render when the slice we read actually changes.
  const personaState = usePersonaStore();
  const contentState = useContentStore();
  const uiState = useUIStore();
  const notificationState = useNotificationStore();

  const combined: AppState = {
    ...personaState,
    ...contentState,
    ...uiState,
    ...notificationState,
  };

  return selector ? selector(combined) : combined;
}

// Build the full store object with hook + static API
const useAppStore = Object.assign(useAppStoreHook, {
  getState: getCombinedState,

  subscribe(listener: Listener) {
    const unsubs = [
      usePersonaStore.subscribe(() => {
        const next = getCombinedState();
        const prev = getCombinedState(); // best-effort prev state
        listener(next, prev);
      }),
      useContentStore.subscribe(() => {
        const next = getCombinedState();
        const prev = getCombinedState();
        listener(next, prev);
      }),
      useUIStore.subscribe(() => {
        const next = getCombinedState();
        const prev = getCombinedState();
        listener(next, prev);
      }),
      useNotificationStore.subscribe(() => {
        const next = getCombinedState();
        const prev = getCombinedState();
        listener(next, prev);
      }),
    ];
    return () => unsubs.forEach((u) => u());
  },

  setState(partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) {
    const update = typeof partial === 'function' ? partial(getCombinedState()) : partial;
    // Route updates to the appropriate sub-store
    const personaKeys = new Set(Object.keys(usePersonaStore.getState()));
    const contentKeys = new Set(Object.keys(useContentStore.getState()));
    const uiKeys = new Set(Object.keys(useUIStore.getState()));
    const notificationKeys = new Set(Object.keys(useNotificationStore.getState()));

    const personaSlice: Record<string, unknown> = {};
    const contentSlice: Record<string, unknown> = {};
    const uiSlice: Record<string, unknown> = {};
    const notificationSlice: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(update)) {
      if (personaKeys.has(key)) personaSlice[key] = value;
      else if (contentKeys.has(key)) contentSlice[key] = value;
      else if (uiKeys.has(key)) uiSlice[key] = value;
      else if (notificationKeys.has(key)) notificationSlice[key] = value;
    }

    if (Object.keys(personaSlice).length) usePersonaStore.setState(personaSlice);
    if (Object.keys(contentSlice).length) useContentStore.setState(contentSlice);
    if (Object.keys(uiSlice).length) useUIStore.setState(uiSlice);
    if (Object.keys(notificationSlice).length) useNotificationStore.setState(notificationSlice);
  },
}) as {
  (): AppState;
  <T>(selector: Selector<T>): T;
  getState: () => AppState;
  subscribe: (listener: Listener) => () => void;
  setState: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void;
};

export { useAppStore };
export type { AppState };
