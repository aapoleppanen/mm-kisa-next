"use client";

import { useState } from "react";
import type { ScoringMode } from "@prisma/client";
import { LeaderBoardUser } from "@/app/(protected)/leaderboard/page";
import { cloudStorageLoader } from "@/utils/imageUtils";
import { roundNumber } from "@/utils/numberUtils";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import UserPicksOverview from "./user-picks-overview";
import { Loader2, ChevronDown, ChevronUp, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LeaderboardClient({
  users,
  scoringMode,
}: {
  users: LeaderBoardUser[];
  scoringMode: ScoringMode;
}) {
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

  if (!users?.length) {
    return (
      <div className="bg-white border border-border rounded-3xl p-8 shadow-xl max-w-sm mx-auto text-center mt-10">
        <span className="text-4xl">📊</span>
        <p className="mt-4 text-slate-700 font-bold">No leaderboard data yet.</p>
        <p className="text-xs text-muted-foreground mt-1">Predictions will compute once the first match kicks off!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4 max-w-xl mx-auto px-2">
      <div className="flex flex-col items-center gap-1 mb-2">
        <Trophy className="h-8 w-8 text-amber-500 animate-pulse" />
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-wider">Leaderboard</h1>
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">MM-Kisa Standings</p>
      </div>

      <div className="bg-white/95 backdrop-blur-sm border border-border/80 rounded-3xl p-4 sm:p-5 shadow-xl space-y-2">
        {users.map((user, idx) => {
          const rank = idx + 1;
          const isTop3 = rank <= 3;
          const isSelected = selected === user.id;
          
          const rankColors = {
            1: "bg-amber-400 text-slate-900 border-amber-300 font-black",
            2: "bg-slate-300 text-slate-800 border-slate-200 font-black",
            3: "bg-amber-700 text-white border-amber-600 font-black",
          }[rank] ?? "text-slate-400 font-bold bg-slate-100/80 border-slate-200";

          return (
            <div
              key={user.id}
              className={cn(
                "rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden select-none",
                isSelected 
                  ? "bg-emerald-50/50 border-primary/30 shadow-md"
                  : "bg-slate-50/50 border-slate-100 hover:border-primary/20 hover:bg-emerald-50/20"
              )}
              onClick={() => handleExpand(user.id)}
            >
              <div className="flex items-center justify-between p-3 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Rank Badge */}
                  <span className={cn(
                    "text-xs w-6 h-6 rounded-full border flex items-center justify-center text-center shrink-0 font-mono",
                    rankColors
                  )}>
                    {rank}
                  </span>
                  
                  {/* Avatar */}
                  <Avatar className="h-9 w-9 shrink-0 border border-slate-100 shadow-sm bg-white">
                    {user.image && (
                      <AvatarImage src={cloudStorageLoader({ src: user.image })} />
                    )}
                    <AvatarFallback className="text-xs font-black bg-emerald-50 text-primary uppercase">
                      {user.name?.[0] ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* User Name */}
                  <span className={cn(
                    "truncate text-sm",
                    isSelected ? "font-bold text-primary" : "font-semibold text-slate-700"
                  )}>
                    {user.name}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 shrink-0">
                  {/* User Points */}
                  {loadingId === user.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <div className="flex flex-col items-end">
                      <span className="font-extrabold font-mono text-slate-800 text-sm">{roundNumber(user.points)}</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none">pts</span>
                    </div>
                  )}
                  
                  {/* Expand Icon */}
                  <div className={cn(
                    "text-slate-400 transition-colors duration-200",
                    isSelected ? "text-primary" : ""
                  )}>
                    {isSelected ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              </div>

              {isSelected && picks && (
                <div 
                  className="bg-white/80 border-t border-border/40 animate-in fade-in slide-in-from-top-1 duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Separator className="bg-border/30" />
                  <UserPicksOverview picks={picks} user={user} scoringMode={scoringMode} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
