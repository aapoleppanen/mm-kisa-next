"use client";

import { useEffect, useState } from "react";
import { Team } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export default function WinnerClient({ teams, locked }: { teams: Team[]; locked: boolean }) {
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/user-winner-scorer")
      .then((r) => r.json())
      .then(({ teamPick }) => teamPick && setPicked(teamPick));
  }, []);

  const handleClick = async (teamId: number) => {
    const prev = picked;
    setPicked(teamId);
    const res = await fetch("/api/winner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId }),
    });
    if (!res.ok) { setPicked(prev); toast.error("Failed to save pick"); }
    else toast.success("Winner pick saved!");
  };

  return (
    <div className="py-6 max-w-2xl mx-auto px-4 space-y-6">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <Trophy className="h-8 w-8 text-amber-500 animate-bounce" />
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-wider">Tournament Winner</h1>
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Predict the Outright Champion</p>
      </div>

      {locked && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center">
          <p className="text-xs text-amber-700 font-bold flex items-center justify-center gap-1.5">
            🔒 Picks are locked for this tournament!
          </p>
        </div>
      )}

      <div className="bg-white/95 border border-border/80 rounded-3xl p-5 shadow-xl">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {teams
            .filter((t) => t.winningOdds > 0)
            .map((team) => {
              const isSelected = team.id === picked;
              return (
                <button
                  key={team.id}
                  disabled={locked}
                  onClick={() => handleClick(team.id)}
                  className={cn(
                    "flex flex-col items-center justify-between p-3.5 rounded-2xl border-2 transition-all duration-300 relative select-none",
                    isSelected
                      ? "bg-primary border-primary text-white shadow-md scale-[1.03]"
                      : "bg-slate-50/50 border-slate-200 text-slate-800 hover:border-primary/40 hover:bg-emerald-50/30",
                    locked ? "opacity-60 cursor-not-allowed" : "cursor-pointer active:scale-95"
                  )}
                >
                  {/* Gold star on pick */}
                  {isSelected && (
                    <span className="absolute top-1.5 right-1.5 text-xs text-amber-400">★</span>
                  )}
                  
                  {/* Flag Crest */}
                  {team.crest ? (
                    <div className="h-12 w-12 rounded-full border border-slate-100 bg-white flex items-center justify-center p-0.5 shadow-sm overflow-hidden mb-2">
                      <img src={team.crest} alt={team.name} className="h-full w-full object-contain" />
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded-full border border-slate-100 bg-slate-100 flex items-center justify-center text-sm shadow-sm mb-2">
                      🏳️
                    </div>
                  )}

                  <span className="font-extrabold text-xs text-center truncate max-w-full leading-tight">{team.name}</span>
                  
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full mt-2",
                    isSelected ? "bg-amber-400 text-slate-900" : "bg-emerald-50 text-primary"
                  )}>
                    {(team.winningOdds / 100).toFixed(2)}×
                  </span>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}
