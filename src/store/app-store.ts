import { create } from 'zustand';
import type { Persona, KnowledgeItem, ContentPlan, ContentPost, Material, AnalyticsSummary, Platform, AppNotification } from '@/types';

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

  // Notifications
  notifications: AppNotification[];
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Persona
  persona: null,
  setPersona: (persona) => set({ persona }),

  // Knowledge Base
  knowledgeItems: [],
  setKnowledgeItems: (items) => set({ knowledgeItems: items }),
  addKnowledgeItem: (item) => set((state) => ({ knowledgeItems: [...state.knowledgeItems, item] })),
  removeKnowledgeItem: (id) => set((state) => ({ knowledgeItems: state.knowledgeItems.filter(i => i.id !== id) })),
  updateKnowledgeItem: (id, data) => set((state) => ({
    knowledgeItems: state.knowledgeItems.map(i => i.id === id ? { ...i, ...data } : i)
  })),

  // Content Plan
  currentPlan: null,
  contentPosts: [],
  setCurrentPlan: (plan) => set({ currentPlan: plan }),
  setContentPosts: (posts) => set({ contentPosts: posts }),
  addContentPost: (post) => set((state) => ({ contentPosts: [...state.contentPosts, post] })),
  updateContentPost: (id, data) => set((state) => ({
    contentPosts: state.contentPosts.map(p => p.id === id ? { ...p, ...data } : p)
  })),

  // Materials
  materials: [],
  setMaterials: (materials) => set({ materials }),
  addMaterial: (material) => set((state) => ({ materials: [...state.materials, material] })),
  removeMaterial: (id) => set((state) => ({ materials: state.materials.filter(m => m.id !== id) })),

  // Analytics
  analytics: [],
  setAnalytics: (analytics) => set({ analytics }),

  // UI State
  selectedDate: null,
  setSelectedDate: (date) => set({ selectedDate: date }),
  selectedPostId: null,
  setSelectedPostId: (id) => set({ selectedPostId: id }),
  isGenerating: false,
  setIsGenerating: (generating) => set({ isGenerating: generating }),

  // Left panel tab (calendar | knowledge | templates)
  leftPanelTab: 'calendar',
  setLeftPanelTab: (tab) => set({ leftPanelTab: tab }),

  // Right panel tab (workspace | optimize | data)
  rightPanelTab: 'workspace',
  setRightPanelTab: (tab) => set({ rightPanelTab: tab }),

  // Platform
  platform: 'wechat',
  setPlatform: (platform) => set({ platform }),

  // Account panel
  accountPanelOpen: false,
  setAccountPanelOpen: (open) => set({ accountPanelOpen: open }),

  // Onboarding
  onboardingCompleted: typeof window !== 'undefined' ? (localStorage.getItem('onboarding-completed') === 'true') : false,
  setOnboardingCompleted: (completed) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('onboarding-completed', String(completed));
    }
    set({ onboardingCompleted: completed });
  },

  // Notifications
  notifications: [],
  addNotification: (notification) => set((state) => {
    const newNotification: AppNotification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      read: false,
    };
    const updated = [newNotification, ...state.notifications].slice(0, 20);
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('app-notifications', JSON.stringify(updated));
    }
    return { notifications: updated };
  }),
  markNotificationRead: (id) => set((state) => {
    const updated = state.notifications.map(n => n.id === id ? { ...n, read: true } : n);
    if (typeof window !== 'undefined') {
      localStorage.setItem('app-notifications', JSON.stringify(updated));
    }
    return { notifications: updated };
  }),
  markAllNotificationsRead: () => set((state) => {
    const updated = state.notifications.map(n => ({ ...n, read: true }));
    if (typeof window !== 'undefined') {
      localStorage.setItem('app-notifications', JSON.stringify(updated));
    }
    return { notifications: updated };
  }),
  clearNotifications: () => set(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('app-notifications');
    }
    return { notifications: [] };
  }),
}));
