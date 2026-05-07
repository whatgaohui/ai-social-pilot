import { create } from 'zustand';

interface AppState {
  // Navigation
  activeTab: 'dashboard' | 'account' | 'content' | 'persona' | 'settings';
  setActiveTab: (tab: AppState['activeTab']) => void;

  // Selected account
  selectedAccountId: string | null;
  setSelectedAccountId: (id: string | null) => void;

  // Loading states
  isScraping: boolean;
  setIsScraping: (v: boolean) => void;
  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;

  // Dialogs
  addAccountDialogOpen: boolean;
  setAddAccountDialogOpen: (v: boolean) => void;

  // Prefilled topic for creator view
  prefilledTopic: string | null;
  setPrefilledTopic: (topic: string | null) => void;
  navigateToCreator: (topic: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),
  selectedAccountId: null,
  setSelectedAccountId: (id) => set({ selectedAccountId: id }),
  isScraping: false,
  setIsScraping: (v) => set({ isScraping: v }),
  isGenerating: false,
  setIsGenerating: (v) => set({ isGenerating: v }),
  addAccountDialogOpen: false,
  setAddAccountDialogOpen: (v) => set({ addAccountDialogOpen: v }),
  prefilledTopic: null,
  setPrefilledTopic: (topic) => set({ prefilledTopic: topic }),
  navigateToCreator: (topic) => set({ activeTab: 'content', prefilledTopic: topic }),
}));
