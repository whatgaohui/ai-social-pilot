import { create } from 'zustand';
import type { AppNotification, NotificationType, NotificationCategory } from '@/types';

// ─── DB → Client mapper ──────────────────────────────────────────────────────

interface DbNotification {
  id: string;
  type: string;
  category: string;
  title: string;
  message: string;
  read: boolean;
  isArchived: boolean;
  priority: string;
  actionUrl: string;
  metadata: string;
  data: string;
  createdAt: string;
}

function mapDbToClient(dbNotif: DbNotification): AppNotification {
  // Parse metadata JSON for extra client fields (postId, actionLabel, actionType)
  let extra: Record<string, unknown> = {};
  try {
    if (dbNotif.metadata) {
      extra = JSON.parse(dbNotif.metadata);
    }
  } catch {
    // ignore malformed JSON
  }

  return {
    id: dbNotif.id,
    type: dbNotif.type as NotificationType,
    category: dbNotif.category as NotificationCategory,
    title: dbNotif.title,
    description: dbNotif.message || '',
    timestamp: new Date(dbNotif.createdAt).getTime(),
    read: dbNotif.read,
    ...(extra.postId ? { postId: extra.postId as string } : {}),
    ...(extra.actionLabel ? { actionLabel: extra.actionLabel as string } : {}),
    ...(extra.actionType ? { actionType: extra.actionType as AppNotification['actionType'] } : {}),
  };
}

// ─── Store interface ─────────────────────────────────────────────────────────

interface NotificationState {
  notifications: AppNotification[];
  isLoading: boolean;
  isInitialized: boolean;
  initNotifications: () => Promise<void>;
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  isLoading: false,
  isInitialized: false,

  // Load notifications from the server on app start
  initNotifications: async () => {
    if (get().isInitialized) return;
    set({ isLoading: true });
    try {
      const res = await fetch('/api/notifications?limit=50');
      if (res.ok) {
        const data = await res.json();
        // API returns { notifications: [...], total: number }
        const notifs = Array.isArray(data.notifications)
          ? data.notifications
          : Array.isArray(data)
            ? data
            : [];
        set({ notifications: notifs.map(mapDbToClient) });
      }
    } catch (e) {
      console.error('Failed to load notifications from server:', e);
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  addNotification: (notification) => {
    const tempId = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newNotification: AppNotification = {
      ...notification,
      id: tempId,
      timestamp: Date.now(),
      read: false,
    };

    // Optimistic update – immediately show in UI
    set((state) => ({
      notifications: [newNotification, ...state.notifications].slice(0, 50),
    }));

    // Persist to server in the background
    try {
      fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: notification.type,
          category: notification.category || 'system',
          title: notification.title,
          message: notification.description || '',
          actionUrl: '',
          metadata: JSON.stringify({
            postId: notification.postId,
            actionLabel: notification.actionLabel,
            actionType: notification.actionType,
          }),
          data: '',
          priority: 'medium',
        }),
      })
        .then(async (res) => {
          if (res.ok) {
            const saved = await res.json();
            // Replace the temp ID with the real DB ID
            set((state) => ({
              notifications: state.notifications.map((n) =>
                n.id === tempId ? mapDbToClient(saved) : n
              ),
            }));
          }
        })
        .catch((e) => {
          console.error('Failed to persist notification:', e);
        });
    } catch (e) {
      console.error('Failed to persist notification:', e);
    }
  },

  markNotificationRead: (id) => {
    // Optimistic update
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));

    // Persist to server in the background
    try {
      fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      }).catch((e) => {
        console.error('Failed to mark notification read:', e);
      });
    } catch (e) {
      console.error('Failed to mark notification read:', e);
    }
  },

  markAllNotificationsRead: () => {
    const { notifications } = get();
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);

    // Optimistic update
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    }));

    // Persist to server in the background
    if (unreadIds.length > 0) {
      try {
        fetch('/api/notifications/mark-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: unreadIds }),
        }).catch((e) => {
          console.error('Failed to mark all notifications read:', e);
        });
      } catch (e) {
        console.error('Failed to mark all notifications read:', e);
      }
    }
  },

  clearNotifications: () => {
    const { notifications } = get();
    const readIds = notifications.filter((n) => n.read).map((n) => n.id);

    // Optimistic update
    set({ notifications: [] });

    // Delete read notifications on the server
    if (readIds.length > 0) {
      try {
        fetch('/api/notifications', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: readIds }),
        }).catch((e) => {
          console.error('Failed to clear notifications:', e);
        });
      } catch (e) {
        console.error('Failed to clear notifications:', e);
      }
    }
  },
}));
