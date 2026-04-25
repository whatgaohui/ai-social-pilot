/**
 * Combined store that aggregates all domain-specific stores.
 *
 * The original monolithic `useAppStore` has been split into 4 domain-specific stores:
 *   - usePersonaStore  (persona-store.ts)
 *   - useContentStore  (content-store.ts)
 *   - useUIStore       (ui-store.ts)
 *   - useNotificationStore (notification-store.ts)
 *
 * This module creates a combined Zustand store that mirrors all sub-store state,
 * so `useAppStore.getState()`, `.subscribe()`, `.setState()` work natively
 * via Zustand (not via Object.assign which Turbopack can strip).
 *
 * For new code, prefer importing from the specific domain store directly
 * for better re-render isolation.
 */

import { create } from 'zustand';
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
  } as AppState;
}

// ─── Create combined Zustand store ──────────────────────────────────────────
//
// This is a real Zustand store so `.subscribe()`, `.getState()`, `.setState()`
// are all provided natively by Zustand — Turbopack cannot strip them.

const useAppStore = create<AppState>(() => getCombinedState());

// ─── Keep combined store in sync with sub-stores ────────────────────────────
//
// When any sub-store changes, we update the combined store with the new
// combined state. We use the internal _setState reference to avoid
// triggering our custom routing logic in the overridden setState.

const _internalSetState = useAppStore.setState.bind(useAppStore);

function syncFromSubStores() {
  _internalSetState(getCombinedState(), true);
}

// Subscribe to each sub-store
usePersonaStore.subscribe(syncFromSubStores);
useContentStore.subscribe(syncFromSubStores);
useUIStore.subscribe(syncFromSubStores);
useNotificationStore.subscribe(syncFromSubStores);

// ─── Override setState to route updates to the correct sub-store ─────────────

type Listener = (state: AppState, prevState: AppState) => void;

useAppStore.setState = function (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) {
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

  // The sub-store updates will trigger syncFromSubStores which updates the combined store
};

export { useAppStore };
export type { AppState };
