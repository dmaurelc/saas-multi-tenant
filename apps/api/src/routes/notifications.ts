// Notification Routes - Manage user notifications
import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { db } from '../lib/db';
import {
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount,
} from '../lib/notifications';

const notifications = new Hono();

// Validation schemas
const createNotificationSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum([
    'USER_INVITED',
    'USER_ADDED',
    'USER_ROLE_CHANGED',
    'PAYMENT_SUCCEEDED',
    'PAYMENT_FAILED',
    'SUBSCRIPTION_CREATED',
    'SUBSCRIPTION_UPDATED',
    'SUBSCRIPTION_CANCELED',
    'INVOICE_AVAILABLE',
    'TENANT_UPDATED',
    'SYSTEM_ANNOUNCEMENT',
    'CUSTOM',
  ]),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  data: z.record(z.any()).optional(),
  actionUrl: z.string().url().optional(),
  actionLabel: z.string().optional(),
  sendEmail: z.boolean().optional().default(false),
});

// ============================================
// GET /api/v1/notifications - List user notifications
// ============================================
notifications.get('/', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const unreadOnly = c.req.query('unreadOnly') === 'true';
    const limit = parseInt(c.req.query('limit') || '50');

    const where: any = { userId: user.id };
    if (unreadOnly) {
      where.readAt = null;
    }

    const [notificationsList, unreadCount] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      getUnreadCount(user.id),
    ]);

    return c.json({
      data: notificationsList,
      unreadCount,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return c.json({ error: 'Failed to fetch notifications' }, 500);
  }
});

// ============================================
// POST /api/v1/notifications - Create notification (admin only)
// ============================================
notifications.post('/', authMiddleware, async (c) => {
  try {
    const user = c.get('user');

    // Only OWNER and ADMIN can create notifications for others
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const body = await c.req.json();
    const result = createNotificationSchema.safeParse(body);

    if (!result.success) {
      return c.json({ error: 'Invalid request', details: result.error.errors }, 400);
    }

    const notification = await createNotification({
      tenantId: user.tenantId,
      ...result.data,
    });

    return c.json(notification, 201);
  } catch (error) {
    console.error('Error creating notification:', error);
    return c.json({ error: 'Failed to create notification' }, 500);
  }
});

// ============================================
// PATCH /api/v1/notifications/:id/read - Mark as read
// ============================================
notifications.patch('/:id/read', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');

    await markNotificationAsRead(id, user.id);

    return c.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return c.json({ error: 'Failed to mark notification as read' }, 500);
  }
});

// ============================================
// POST /api/v1/notifications/read-all - Mark all as read
// ============================================
notifications.post('/read-all', authMiddleware, async (c) => {
  try {
    const user = c.get('user');

    await markAllNotificationsAsRead(user.id);

    return c.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return c.json({ error: 'Failed to mark all as read' }, 500);
  }
});

// ============================================
// DELETE /api/v1/notifications/:id - Delete notification
// ============================================
notifications.delete('/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');

    // Users can only delete their own notifications
    const notification = await db.notification.findFirst({
      where: { id, userId: user.id },
    });

    if (!notification) {
      return c.json({ error: 'Notification not found' }, 404);
    }

    await db.notification.delete({
      where: { id },
    });

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return c.json({ error: 'Failed to delete notification' }, 500);
  }
});

// ============================================
// GET /api/v1/notifications/preferences - Get user preferences
// ============================================
notifications.get('/preferences', authMiddleware, async (c) => {
  try {
    const user = c.get('user');

    let preferences = await db.notificationPreference.findUnique({
      where: { userId: user.id },
    });

    // Create default preferences if they don't exist
    if (!preferences) {
      preferences = await db.notificationPreference.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          emailEnabled: true,
          inAppEnabled: true,
          preferences: {},
        },
      });
    }

    return c.json(preferences);
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return c.json({ error: 'Failed to fetch preferences' }, 500);
  }
});

// ============================================
// PATCH /api/v1/notifications/preferences - Update preferences
// ============================================
notifications.patch('/preferences', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();

    const preferences = await db.notificationPreference.upsert({
      where: { userId: user.id },
      create: {
        tenantId: user.tenantId,
        userId: user.id,
        ...body,
      },
      update: body,
    });

    return c.json(preferences);
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return c.json({ error: 'Failed to update preferences' }, 500);
  }
});

export default notifications;
