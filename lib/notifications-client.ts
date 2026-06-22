"use client";

import useSWR from "swr";

export type AppNotification = {
  id: string;
  read: boolean;
  createdAt: string;
  actorName: string | null;
  actorImage: string | null;
  matchId: number;
  homeName: string;
  awayName: string;
  snippet: string;
};

type NotificationsResponse = { notifications: AppNotification[]; unreadCount: number };

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Shared SWR key — the bell and the bottom-nav badge dedupe onto one poll.
export function useNotifications() {
  return useSWR<NotificationsResponse>("/api/notifications", fetcher, {
    refreshInterval: 45_000,
    revalidateOnFocus: true,
  });
}

export async function markNotificationsRead(ids?: string[]) {
  await fetch("/api/notifications/read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ids ? { ids } : {}),
  });
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}
