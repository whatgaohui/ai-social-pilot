import { db } from '@/lib/db';

interface CreateNotificationParams {
  type?: string;
  title: string;
  message?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Helper to create a notification in the database.
 * Designed to be called from other API routes (fire-and-forget).
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    await db.notification.create({
      data: {
        type: params.type || 'system',
        title: params.title,
        message: params.message || '',
        metadata: params.metadata ? JSON.stringify(params.metadata) : '',
      },
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
    // Don't throw – notification failure should not break the main flow
  }
}
