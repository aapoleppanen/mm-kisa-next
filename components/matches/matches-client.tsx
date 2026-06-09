"use client";

import { useState } from "react";
import { Match, Pick, Result, ScoringMode, Team } from "@prisma/client";
import { format, isSameDay } from "date-fns";
import { roundNumber } from "@/utils/numberUtils";
import MatchCard from "./match-card";

type MatchWithRelations = Match & {
  away: Team;
  home: Team;
  Pick?: Pick[];
  maxBet: number;
};

type Props = {
  matches: MatchWithRelations[];
  initialCredits: number;
  backgroundUrl: string;
  scoringMode: ScoringMode;
  lockLeadHours: number;
};

export default function MatchesClient({
  matches,
  initialCredits,
  backgroundUrl,
  scoringMode,
  lockLeadHours,
}: Props) {
  const [credits, setCredits] = useState(initialCredits);

  if (!matches.length) {
    return <p className="text-center p-8 text-muted-foreground">No matches yet.</p>;
  }

  let lastDate = new Date(matches[0].startTime);

  return (
    <div className="relative min-h-screen">
      <img
        src={backgroundUrl}
        alt=""
        className="fixed inset-0 w-full h-full object-cover -z-10"
      />

      {/* Credits badge */}
      <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-50 bg-white border-2 border-border rounded-2xl px-4 py-2 shadow-lg font-bold text-sm flex items-center gap-1.5">
        <span className="text-muted-foreground text-xs font-medium">Credits</span>
        <span className="text-foreground">{roundNumber(credits)}</span>
      </div>

      {/* Lock warning */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-border px-4 py-2 text-center">
        <p className="text-xs text-muted-foreground font-medium">
          Picks must be placed {lockLeadHours}h before kick-off
        </p>
      </div>

      {/* Match list */}
      <div className="flex flex-col items-center px-3 pt-4 pb-8 gap-3 max-w-xl mx-auto">
        {matches.map((match) => {
          const pick = match.Pick?.[0];
          const pickResult = pick?.pickedResult ?? Result.NO_RESULT;
          const betAmount = pick?.betAmount ?? 0;

          const startDate = new Date(match.startTime);
          const showDateStamp = !isSameDay(startDate, lastDate) || match === matches[0];
          if (showDateStamp) lastDate = startDate;

          return (
            <div key={match.id} className="w-full flex flex-col items-center gap-2">
              {showDateStamp && (
                <div className="w-full flex items-center gap-3 py-1">
                  <div className="flex-1 h-px bg-white/50" />
                  <span className="text-white text-xs font-bold uppercase tracking-widest drop-shadow whitespace-nowrap">
                    {format(startDate, "EEEE d.M.")}
                  </span>
                  <div className="flex-1 h-px bg-white/50" />
                </div>
              )}
              <MatchCard
                match={match}
                result={pickResult}
                betAmount={betAmount}
                predHome={pick?.predHome}
                predAway={pick?.predAway}
                scoringMode={scoringMode}
                maxBetAmount={match.maxBet}
                lockLeadHours={lockLeadHours}
                updateUserCredits={setCredits}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
