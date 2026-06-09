"use client";

import { useState } from "react";
import { LeaderBoardUser } from "@/app/(protected)/leaderboard/page";
import { cloudStorageLoader } from "@/utils/imageUtils";
import { roundNumber } from "@/utils/numberUtils";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import UserPicksOverview from "./user-picks-overview";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";

export default function LeaderboardClient({ users }: { users: LeaderBoardUser[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [picks, setPicks] = useState<any>(null);

  const handleExpand = async (id: string) => {
    if (selected === id) { setSelected(null); setPicks(null); return; }
    setLoadingId(id);
    const res = await fetch(`/api/${id}/picks`);
    const { picks } = await res.json();
    setPicks(picks);
    setSelected(id);
    setLoadingId(null);
  };

  if (!users?.length) return <p className="text-center p-8">No users yet.</p>;

  return (
    <div className="space-y-1 py-4">
      <h1 className="text-2xl font-bold text-center mb-4">Leaderboard</h1>
      {users.map((user, idx) => (
        <div
          key={user.id}
          className="rounded-xl bg-muted hover:bg-border cursor-pointer transition-colors"
          onClick={() => handleExpand(user.id)}
        >
          <div className="flex items-center justify-between p-3 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sm font-mono text-muted-foreground w-5">{idx + 1}</span>
              <Avatar className="h-9 w-9 shrink-0">
                {user.image && (
                  <AvatarImage src={cloudStorageLoader({ src: user.image })} />
                )}
                <AvatarFallback>{user.name?.[0] ?? "?"}</AvatarFallback>
              </Avatar>
              <span className="font-semibold truncate">{user.name}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {loadingId === user.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="font-bold tabular-nums">{roundNumber(user.points / 100)}</span>
              )}
              {selected === user.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>

          {selected === user.id && picks && (
            <div onClick={(e) => e.stopPropagation()}>
              <Separator />
              <UserPicksOverview picks={picks} user={user} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
