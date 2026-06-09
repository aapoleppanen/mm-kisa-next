"use client";

import { useEffect, useState } from "react";
import { Player } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { disablePrePicks } from "@/lib/config";
import { toast } from "sonner";

export default function TopScorerClient({ players }: { players: Player[] }) {
  const [picked, setPicked] = useState<number | null>(null);
  const locked = disablePrePicks();

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
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">Pick Top Scorer</h1>
      {locked && (
        <p className="text-center text-sm text-muted-foreground mb-4">
          Picks are now locked.
        </p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 justify-center">
        {players.map((player) => (
          <Button
            key={player.id}
            variant={player.id === picked ? "default" : "outline"}
            disabled={locked}
            onClick={() => handleClick(player.id)}
            className="h-auto py-3 flex-col gap-1"
          >
            <span className="font-semibold text-sm">{player.name}</span>
            <span className="text-xs opacity-70">{player.odds / 100}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
