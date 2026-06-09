"use client";

import { Match, Pick, Player, Result, Team, User } from "@prisma/client";
import { LeaderBoardUser } from "@/app/(protected)/leaderboard/page";
import { roundNumber } from "@/utils/numberUtils";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type FullUser = User & {
  picks: (Pick & { match: Match & { home: Team; away: Team } })[];
  winnerPick: Team | null;
  topScorerPick: Player | null;
};

function getPotentialWin(bet: number, pick: Result | null, match: Match) {
  const key =
    pick === Result.HOME_TEAM
      ? "homeWinOdds"
      : pick === Result.DRAW
      ? "drawOdds"
      : "awayWinOdds";
  return (bet * match[key]) / 100;
}

export default function UserPicksOverview({ picks, user }: { picks: FullUser; user: LeaderBoardUser }) {
  return (
    <div className="px-4 py-3 space-y-3">
      <div className="grid grid-cols-2 gap-3 text-center">
        <div>
          <p className="text-2xl font-bold">{roundNumber(user.remainingcredits)}</p>
          <p className="text-sm text-muted-foreground">Credits</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{roundNumber(user.points)}</p>
          <p className="text-sm text-muted-foreground">Points</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className={cn("text-center p-2 rounded-lg bg-white", picks.winnerPick?.id === 4 && "font-bold ring-2 ring-primary")}>
          Winner: {picks.winnerPick?.name ?? "—"}
          {picks.winnerPick?.winningOdds ? ` (${picks.winnerPick.winningOdds / 100})` : ""}
        </div>
        <div className={cn("text-center p-2 rounded-lg bg-white", picks.topScorerPick?.id === 95 && "font-bold ring-2 ring-primary")}>
          Scorer: {picks.topScorerPick?.name ?? "—"}
          {picks.topScorerPick?.odds ? ` (${picks.topScorerPick.odds / 100})` : ""}
        </div>
      </div>

      <Separator />

      <p className="text-sm font-semibold">Match picks</p>
      <div className="space-y-1">
        {picks.picks.map((p) => {
          const won = p.pickedResult === p.match.result;
          const matchDone = !!p.match.result;
          const displayPts = matchDone && p.awardedPoints > 0
            ? p.awardedPoints
            : !matchDone && p.betAmount > 0
            ? getPotentialWin(p.betAmount, p.pickedResult, p.match)
            : 0;
          return (
            <div key={p.id} className="flex items-center justify-between text-xs gap-2 py-1">
              <span className="text-muted-foreground w-10">
                {format(new Date(p.match.startTime), "d.M")}
              </span>
              <span className="flex-1 truncate">
                {p.match.home.name} vs {p.match.away.name}
              </span>
              <span className="text-muted-foreground">
                {p.predHome != null ? `${p.predHome}-${p.predAway}` : p.pickedResult}
              </span>
              <span className={cn("font-medium", won ? "text-green-600" : matchDone ? "text-muted-foreground line-through" : "")}>
                {displayPts > 0 ? (matchDone && won ? `+${displayPts.toFixed(1)}` : displayPts.toFixed(1)) : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
