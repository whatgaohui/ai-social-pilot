import { create } from 'zustand';
import type { Persona, KnowledgeItem, ContentPlan, ContentPost, Material, AnalyticsSummary } from '@/types';

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

  // Left panel tab
  leftPanelTab: 'persona',
  setLeftPanelTab: (tab) => set({ leftPanelTab: tab }),

  // Right panel tab
  rightPanelTab: 'copywriting',
  setRightPanelTab: (tab) => set({ rightPanelTab: tab }),
}));
