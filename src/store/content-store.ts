import { create } from 'zustand';
import type { KnowledgeItem, ContentPlan, ContentPost, Material, AnalyticsSummary } from '@/types';

interface ContentState {
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
}

export const useContentStore = create<ContentState>((set) => ({
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
  reorderPosts: (activeId, overId) => set((state) => {
    const oldIndex = state.contentPosts.findIndex(p => p.id === activeId);
    const newIndex = state.contentPosts.findIndex(p => p.id === overId);
    if (oldIndex === -1 || newIndex === -1) return state;
    const updated = [...state.contentPosts];
    const [moved] = updated.splice(oldIndex, 1);
    updated.splice(newIndex, 0, moved);
    return { contentPosts: updated };
  }),
  deleteContentPost: (id) => set((state) => ({
    contentPosts: state.contentPosts.filter(p => p.id !== id)
  })),

  // Materials
  materials: [],
  setMaterials: (materials) => set({ materials }),
  addMaterial: (material) => set((state) => ({ materials: [...state.materials, material] })),
  removeMaterial: (id) => set((state) => ({ materials: state.materials.filter(m => m.id !== id) })),

  // Analytics
  analytics: [],
  setAnalytics: (analytics) => set({ analytics }),
}));
