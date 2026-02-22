'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Check, X, Clock } from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  actionUrl?: string;
  actionLabel?: string;
  createdAt: string;
}

interface NotificationDropdownProps {
  notifications: Notification[];
  onClose: () => void;
  onMarkRead: () => void;
}

export function NotificationDropdown({
  notifications,
  onClose,
  onMarkRead,
}: NotificationDropdownProps) {
  const [markingAll, setMarkingAll] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.notification-dropdown')) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  async function markAllAsRead() {
    setMarkingAll(true);
    try {
      await apiClient.post<{ success: boolean }>('/api/v1/notifications/read-all');
      onMarkRead();
    } catch (error) {
      console.error('Error marking all as read:', error);
    } finally {
      setMarkingAll(false);
    }
  }

  async function markAsRead(id: string) {
    try {
      await apiClient.patch<{ success: boolean }>(`/api/v1/notifications/${id}/read`);
      onMarkRead();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async function deleteNotification(id: string) {
    try {
      await fetch(`/api/v1/notifications/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      onMarkRead();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'USER_INVITED':
      case 'USER_ADDED':
        return (
          <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
            👤
          </div>
        );
      case 'PAYMENT_SUCCEEDED':
        return (
          <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
            💳
          </div>
        );
      case 'PAYMENT_FAILED':
        return (
          <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            ❌
          </div>
        );
      case 'SUBSCRIPTION_CREATED':
      case 'SUBSCRIPTION_UPDATED':
        return (
          <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
            ⭐
          </div>
        );
      default:
        return (
          <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            📢
          </div>
        );
    }
  };

  return (
    <div className="notification-dropdown absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border z-50 max-h-125 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex justify-between items-center">
        <div>
          <h3 className="font-semibold">Notifications</h3>
          <p className="text-xs text-muted-foreground">
            {notifications.filter((n) => !n.readAt).length} unread
          </p>
        </div>
        {notifications.some((n) => !n.readAt) && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead} disabled={markingAll}>
            <Check className="h-4 w-4 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 border-b hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                !notification.readAt ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
              }`}
            >
              <div className="flex gap-3">
                <div className="shrink-0 mt-1">{getNotificationIcon(notification.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{notification.title}</p>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {notification.message}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                    {notification.actionUrl && (
                      <a
                        href={notification.actionUrl}
                        onClick={() => markAsRead(notification.id)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {notification.actionLabel || 'View'}
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  {!notification.readAt && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      title="Mark as read"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="text-gray-400 hover:text-red-600"
                    title="Delete"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-2 border-t text-center">
          <a
            href="/notifications"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 w-full"
          >
            View all notifications
          </a>
        </div>
      )}
    </div>
  );
}
