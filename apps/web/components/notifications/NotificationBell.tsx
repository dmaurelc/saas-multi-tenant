'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationDropdown } from './NotificationDropdown';
import { apiClient } from '@/lib/api/client';

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

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const res = await apiClient.get<{
          data: Notification[];
          unreadCount: number;
        }>('/api/v1/notifications');

        setNotifications(res.data);
        setUnreadCount(res.unreadCount);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    }

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s

    return () => clearInterval(interval);
  }, []);

  const handleMarkRead = () => {
    setUnreadCount(0);
    setNotifications(notifications.map((n) => ({ ...n, readAt: new Date().toISOString() })));
  };

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" onClick={() => setOpen(!open)} className="relative">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 flex items-center justify-center bg-red-500 text-white text-xs rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <NotificationDropdown
          notifications={notifications}
          onClose={() => setOpen(false)}
          onMarkRead={handleMarkRead}
        />
      )}
    </div>
  );
}
