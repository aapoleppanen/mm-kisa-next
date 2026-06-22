"use client";

import { useEffect } from "react";
import { Bell } from "lucide-react";
import { useNotifications, markNotificationsRead } from "@/lib/notifications-client";
import NotificationFeed from "@/components/notifications/notification-feed";

export default function NotificationsPage() {
  const { data, mutate } = useNotifications();
  const notifications = data?.notifications ?? [];

  // Opening the page clears the unread state.
  useEffect(() => {
    if ((data?.unreadCount ?? 0) > 0) {
      markNotificationsRead();
      mutate(
        (prev) =>
          prev && {
            unreadCount: 0,
            notifications: prev.notifications.map((n) => ({ ...n, read: true })),
          },
        { revalidate: false }
      );
    }
  }, [data?.unreadCount, mutate]);

  return (
    <div className="py-6 max-w-xl mx-auto px-4 space-y-4">
      <div className="flex flex-col items-center gap-1 text-center">
        <Bell className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-wider">Notifications</h1>
      </div>
      <div className="bg-white border border-border/80 rounded-2xl shadow-sm overflow-hidden">
        <NotificationFeed notifications={notifications} emptyHint="No notifications yet. Get tagged in a match to see them here." />
      </div>
    </div>
  );
}
