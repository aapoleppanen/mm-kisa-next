"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications, markNotificationsRead } from "@/lib/notifications-client";
import NotificationFeed from "./notification-feed";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data, mutate } = useNotifications();
  const unread = data?.unreadCount ?? 0;
  const notifications = data?.notifications ?? [];

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Mark everything read once the panel is opened (optimistically clear the badge).
  useEffect(() => {
    if (open && unread > 0) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center size-9 rounded-xl text-slate-600 hover:text-primary hover:bg-primary/10 transition-colors duration-200"
      >
        <Bell size={18} strokeWidth={1.9} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-80 max-w-[90vw] bg-white border border-border/80 rounded-2xl shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
            <span className="text-sm font-bold text-slate-800">Notifications</span>
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-[11px] font-semibold text-primary hover:underline"
            >
              See all
            </Link>
          </div>
          <div className={cn("max-h-96 overflow-y-auto")}>
            <NotificationFeed notifications={notifications} onItemClick={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
