import { create } from 'zustand';

export interface Notification {
  id: string;
  type: 'scrape' | 'analysis' | 'draft' | 'export' | 'delete' | 'info';
  title: string;
  message: string;
  read: boolean;
  timestamp: number;
  // Navigation context
  navigateTo?: 'dashboard' | 'account' | 'content' | 'persona' | 'creator';
  accountId?: string;
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'timestamp'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  unreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  addNotification: (notification) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      read: false,
      timestamp: Date.now(),
    };
    set((state) => ({
      notifications: [newNotification, ...state.notifications].slice(0, 50), // Keep last 50
    }));
  },
  markAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  },
  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    }));
  },
  unreadCount: () => {
    return get().notifications.filter((n) => !n.read).length;
  },
}));
