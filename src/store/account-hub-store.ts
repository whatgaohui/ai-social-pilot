import { create } from 'zustand';

interface AccountHubState {
  // Active tab within the hub
  activeHubTab: 'overview' | 'calendar' | 'persona';
  setActiveHubTab: (tab: AccountHubState['activeHubTab']) => void;

  // Selected date in calendar
  selectedDate: string | null;
  setSelectedDate: (date: string | null) => void;

  // Selected post for single-note analytics
  selectedPostId: string | null;
  setSelectedPostId: (id: string | null) => void;
}

export const useAccountHubStore = create<AccountHubState>((set) => ({
  activeHubTab: 'overview',
  setActiveHubTab: (tab) => set({ activeHubTab: tab }),
  selectedDate: null,
  setSelectedDate: (date) => set({ selectedDate: date }),
  selectedPostId: null,
  setSelectedPostId: (id) => set({ selectedPostId: id }),
}));
