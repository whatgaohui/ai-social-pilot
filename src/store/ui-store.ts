import { create } from 'zustand';
import type { Platform } from '@/types';

interface UIState {
  // Date & selection
  selectedDate: string | null;
  setSelectedDate: (date: string | null) => void;
  selectedPostId: string | null;
  setSelectedPostId: (id: string | null) => void;
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;

  // Streaming state — used to show real-time AI content in the editor
  streamingContent: string;
  setStreamingContent: (content: string) => void;
  isStreamActive: boolean;
  setIsStreamActive: (active: boolean) => void;
  clearStreaming: () => void;

  // Panel tabs
  leftPanelTab: string;
  setLeftPanelTab: (tab: string) => void;
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
}

export const useUIStore = create<UIState>((set) => ({
  // Date & selection
  selectedDate: null,
  setSelectedDate: (date) => set({ selectedDate: date }),
  selectedPostId: null,
  setSelectedPostId: (id) => set({ selectedPostId: id }),
  isGenerating: false,
  setIsGenerating: (generating) => set({ isGenerating: generating }),

  // Streaming state
  streamingContent: "",
  setStreamingContent: (content) => set({ streamingContent: content }),
  isStreamActive: false,
  setIsStreamActive: (active) => set({ isStreamActive: active }),
  clearStreaming: () => set({ streamingContent: "", isStreamActive: false }),

  // Panel tabs
  leftPanelTab: 'calendar',
  setLeftPanelTab: (tab) => set({ leftPanelTab: tab }),
  rightPanelTab: 'workspace',
  setRightPanelTab: (tab) => set({ rightPanelTab: tab }),

  // Platform
  platform: 'wechat',
  setPlatform: (platform) => set({ platform }),

  // Account panel
  accountPanelOpen: false,
  setAccountPanelOpen: (open) => set({ accountPanelOpen: open }),

  // Onboarding (always start false on SSR to avoid hydration mismatch;
  //   client-side init reads from localStorage via useUIStore.onboardingInit())
  onboardingCompleted: false,
  setOnboardingCompleted: (completed) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('onboarding-completed', String(completed));
    }
    set({ onboardingCompleted: completed });
  },
  onboardingInit: () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('onboarding-completed') === 'true';
      if (saved) set({ onboardingCompleted: true });
    }
  },

  // Settings Center
  settingsCenterOpen: false,
  setSettingsCenterOpen: (open) => set({ settingsCenterOpen: open }),

  // Command Palette
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
}));
