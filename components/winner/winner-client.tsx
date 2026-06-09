"use client";

import { useEffect, useState } from "react";
import { Team } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { disablePrePicks } from "@/lib/config";
import { toast } from "sonner";

export default function WinnerClient({ teams }: { teams: Team[] }) {
  const [picked, setPicked] = useState<number | null>(null);
  const locked = disablePrePicks();

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
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">Pick Tournament Winner</h1>
      {locked && (
        <p className="text-center text-sm text-muted-foreground mb-4">
          Picks are now locked.
        </p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {teams
          .filter((t) => t.winningOdds > 0)
          .map((team) => (
            <Button
              key={team.id}
              variant={team.id === picked ? "default" : "outline"}
              disabled={locked}
              onClick={() => handleClick(team.id)}
              className="h-auto py-3 flex-col gap-1"
            >
              <span className="font-semibold text-sm">{team.name}</span>
              <span className="text-xs opacity-70">{team.winningOdds / 100}</span>
            </Button>
          ))}
      </div>
    </div>
  );
}
