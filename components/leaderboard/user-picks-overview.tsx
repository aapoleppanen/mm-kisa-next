"use client";

import { Match, Pick, Player, Result, ScoringMode, Team, User } from "@prisma/client";
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

export default function UserPicksOverview({
  picks,
  user,
  scoringMode,
}: {
  picks: FullUser;
  user: LeaderBoardUser;
  scoringMode: ScoringMode;
}) {
  // Credits only exist in the betting modes.
  const showCredits =
    scoringMode === "FIXED_ODDS" || scoringMode === "COMPRESSED_ODDS" || scoringMode === "PARI_MUTUEL";
  return (
    <div className="px-4 py-4 space-y-4 bg-slate-50/30">
      {/* Stats summary boxes */}
      <div className={cn("grid gap-3 text-center", showCredits ? "grid-cols-2" : "grid-cols-1")}>
        {showCredits && (
          <div className="bg-white border border-slate-100 rounded-xl py-2 px-3 shadow-sm flex flex-col items-center">
            <span className="text-lg font-black text-slate-800 font-mono">{roundNumber(user.remainingcredits)}</span>
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Credits left</span>
          </div>
        )}
        <div className="bg-white border border-slate-100 rounded-xl py-2 px-3 shadow-sm flex flex-col items-center">
          <span className="text-lg font-black text-primary font-mono">{roundNumber(user.points)}</span>
          <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Total Points</span>
        </div>
      </div>

      {/* Winner & Scorer Pick Outrights — tiebreakers only, not added to points */}
      <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider text-center">
        Tiebreakers (don&apos;t affect points)
      </p>
      <div className="grid grid-cols-2 gap-3.5 text-xs">
        <div className={cn(
          "flex flex-col items-center p-2.5 rounded-xl border bg-white shadow-sm gap-0.5",
          picks.winnerPick?.id === 4 ? "border-amber-400 bg-amber-50/30 font-bold" : "border-slate-100"
        )}>
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-1">👑 Champ Pick</span>
          <span className="text-slate-800 font-bold text-center truncate max-w-full">
            {picks.winnerPick?.name ?? "—"}
          </span>
          {picks.winnerPick?.winningOdds && (
            <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.2 rounded-full mt-0.5">
              {(picks.winnerPick.winningOdds / 100).toFixed(2)}×
            </span>
          )}
        </div>
        
        <div className={cn(
          "flex flex-col items-center p-2.5 rounded-xl border bg-white shadow-sm gap-0.5",
          picks.topScorerPick?.id === 95 ? "border-amber-400 bg-amber-50/30 font-bold" : "border-slate-100"
        )}>
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-1">⭐ Golden Boot</span>
          <span className="text-slate-800 font-bold text-center truncate max-w-full">
            {picks.topScorerPick?.name ?? "—"}
          </span>
          {picks.topScorerPick?.odds && (
            <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.2 rounded-full mt-0.5">
              {(picks.topScorerPick.odds / 100).toFixed(2)}×
            </span>
          )}
        </div>
      </div>

      <Separator className="bg-border/30" />

      {/* Match predictions header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Match predictions</span>
        <span className="text-[9px] text-slate-400 font-bold uppercase">Points</span>
      </div>
      
      {/* Match predictions list */}
      <div className="space-y-1.5">
        {picks.picks.length === 0 ? (
          <p className="text-xs text-muted-foreground italic text-center py-2 bg-white rounded-xl border border-slate-100">
            No match picks placed yet.
          </p>
        ) : (
          picks.picks.map((p) => {
            const won = p.pickedResult === p.match.result;
            const matchDone = !!p.match.result;
            const displayPts = matchDone && p.awardedPoints > 0
              ? p.awardedPoints
              : !matchDone && p.betAmount > 0
              ? getPotentialWin(p.betAmount, p.pickedResult, p.match)
              : 0;
              
            return (
              <div 
                key={p.id} 
                className="flex items-center justify-between text-xs gap-3.5 py-2 px-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-slate-200 transition-colors duration-150"
              >
                <span className="text-slate-400 font-bold w-8 font-mono">
                  {format(new Date(p.match.startTime), "d.M.")}
                </span>
                
                <span className="flex-1 truncate font-semibold text-slate-700">
                  {p.match.home.name} vs {p.match.away.name}
                </span>
                
                <span className="text-slate-500 font-bold font-mono text-center min-w-[36px] bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                  {p.predHome != null ? `${p.predHome}-${p.predAway}` : p.pickedResult}
                </span>
                
                <span className={cn(
                  "font-black font-mono w-10 text-right text-xs",
                  won ? "text-primary" : matchDone ? "text-slate-400 line-through" : "text-amber-500"
                )}>
                  {displayPts > 0 
                    ? (matchDone && won ? `+${displayPts.toFixed(1)}` : `${displayPts.toFixed(1)}`) 
                    : "—"}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
