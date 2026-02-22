// Notification Service - Create and send notifications
import { db } from './db';
import { NotificationType, Prisma } from '@prisma/client';
import { sendEmail } from './email';

interface CreateNotificationInput {
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Prisma.JsonObject;
  actionUrl?: string;
  actionLabel?: string;
  sendEmail?: boolean;
}

export async function createNotification(input: CreateNotificationInput) {
  const notification = await db.notification.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      data: input.data,
      actionUrl: input.actionUrl,
      actionLabel: input.actionLabel,
    },
  });

  // Send email if enabled and requested
  if (input.sendEmail) {
    await sendNotificationEmail(notification);
  }

  return notification;
}

async function sendNotificationEmail(notification: any) {
  // Check if user has email notifications enabled
  const preferences = await db.notificationPreference.findUnique({
    where: { userId: notification.userId },
  });

  // If user has disabled emails, skip
  if (preferences && !preferences.emailEnabled) {
    return;
  }

  // Get user email
  const user = await db.user.findUnique({
    where: { id: notification.userId },
    select: { email: true, name: true },
  });

  if (!user) {
    console.error('User not found for notification:', notification.userId);
    return;
  }

  // Check if Resend is configured
  if (!process.env.RESEND_API_KEY) {
    console.log('Email service not configured. Would send email to:', user.email);
    return;
  }

  // Send email via Resend
  try {
    await sendEmail({
      to: user.email,
      subject: notification.title,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
              .footer { text-align: center; margin-top: 20px; color: #999; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>${notification.title}</h1>
              </div>
              <div class="content">
                <p>Hi ${user.name || 'there'},</p>
                <p>${notification.message}</p>
                ${notification.actionUrl ? `<a href="${notification.actionUrl}" class="button">${notification.actionLabel || 'View'}</a>` : ''}
                <div class="footer">
                  <p>You received this email because you have notifications enabled.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error) {
    console.error('Error sending notification email:', error);
  }
}

export async function markNotificationAsRead(notificationId: string, userId: string) {
  return db.notification.updateMany({
    where: {
      id: notificationId,
      userId, // Ensure user can only mark their own notifications
    },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsAsRead(userId: string) {
  return db.notification.updateMany({
    where: {
      userId,
      readAt: null,
    },
    data: { readAt: new Date() },
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  return db.notification.count({
    where: {
      userId,
      readAt: null,
    },
  });
}
