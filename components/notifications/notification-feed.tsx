"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cloudStorageLoader } from "@/utils/imageUtils";
import { cn } from "@/lib/utils";
import { type AppNotification, relativeTime } from "@/lib/notifications-client";

export default function NotificationFeed({
  notifications,
  onItemClick,
  emptyHint = "No notifications yet.",
}: {
  notifications: AppNotification[];
  onItemClick?: () => void;
  emptyHint?: string;
}) {
  if (!notifications.length) {
    return <p className="text-xs text-muted-foreground text-center py-6">{emptyHint}</p>;
  }

  return (
    <ul className="divide-y divide-border/50">
      {notifications.map((n) => (
        <li key={n.id}>
          <Link
            href={`/matches?match=${n.matchId}`}
            onClick={onItemClick}
            className={cn(
              "flex gap-2.5 items-start px-3 py-2.5 transition-colors duration-150 hover:bg-muted/40",
              !n.read && "bg-primary/5"
            )}
          >
            <Avatar className="size-7 shrink-0">
              {n.actorImage && <AvatarImage src={cloudStorageLoader({ src: n.actorImage })} />}
              <AvatarFallback className="text-[10px] bg-muted text-muted-foreground font-medium">
                {n.actorName?.[0] ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground/90 leading-snug">
                <span className="font-semibold">{n.actorName ?? "Someone"}</span>{" "}
                tagged you in{" "}
                <span className="font-medium">
                  {n.homeName} vs {n.awayName}
                </span>
              </p>
              {n.snippet && (
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{n.snippet}</p>
              )}
              <span className="text-[10px] text-muted-foreground/70">{relativeTime(n.createdAt)}</span>
            </div>
            {!n.read && <span className="mt-1 size-2 rounded-full bg-primary shrink-0" />}
          </Link>
        </li>
      ))}
    </ul>
  );
}
