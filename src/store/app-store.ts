import { create } from 'zustand';

interface AppState {
  // Navigation
  activeTab: 'dashboard' | 'account' | 'content' | 'persona' | 'creator';
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
}));
