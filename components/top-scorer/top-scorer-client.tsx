"use client";

import { useEffect, useState } from "react";
import { Player } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TopScorerClient({ players, locked }: { players: Player[]; locked: boolean }) {
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/user-winner-scorer")
      .then((r) => r.json())
      .then(({ playerPick }) => playerPick && setPicked(playerPick));
  }, []);

  const handleClick = async (playerId: number) => {
    const prev = picked;
    setPicked(playerId);
    const res = await fetch("/api/top-scorer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });
    if (!res.ok) { setPicked(prev); toast.error("Failed to save pick"); }
    else toast.success("Top scorer pick saved!");
  };

  return (
    <div className="py-6 max-w-2xl mx-auto px-4 space-y-6">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <Star className="h-8 w-8 text-amber-500 fill-amber-400 animate-pulse" />
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-wider">Top Scorer</h1>
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Predict the Golden Boot Winner</p>
      </div>

      {locked && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center">
          <p className="text-xs text-amber-700 font-bold flex items-center justify-center gap-1.5">
            🔒 Scorer predictions are locked!
          </p>
        </div>
      )}

      <div className="bg-white/95 border border-border/80 rounded-3xl p-5 shadow-xl">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {players.map((player) => {
            const isSelected = player.id === picked;
            return (
              <button
                key={player.id}
                disabled={locked}
                onClick={() => handleClick(player.id)}
                className={cn(
                  "flex flex-col items-center justify-between p-3.5 rounded-2xl border-2 transition-all duration-300 relative select-none min-h-[96px]",
                  isSelected
                    ? "bg-primary border-primary text-white shadow-md scale-[1.03]"
                    : "bg-slate-50/50 border-slate-200 text-slate-800 hover:border-primary/40 hover:bg-emerald-50/30",
                  locked ? "opacity-60 cursor-not-allowed" : "cursor-pointer active:scale-95"
                )}
              >
                {/* Gold boot mark */}
                <span className="text-sm mb-1.5">{isSelected ? "👟🔥" : "⚽"}</span>

                <span className="font-extrabold text-xs text-center truncate max-w-full leading-tight mb-2">{player.name}</span>
                
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full",
                  isSelected ? "bg-amber-400 text-slate-900" : "bg-emerald-50 text-primary"
                )}>
                  {(player.odds / 100).toFixed(2)}×
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
