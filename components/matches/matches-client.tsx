"use client";

import { useState } from "react";
import { Match, Pick, Result, ScoringMode, Team } from "@prisma/client";
import { isSameDay } from "date-fns";
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

  if (!matches.length) return <p className="text-center p-8">No matches yet.</p>;

  let lastDate = new Date(matches[0].startTime);

  return (
    <div className="relative min-h-screen">
      <img
        src={backgroundUrl}
        alt="background"
        className="fixed inset-0 w-full h-full object-cover -z-10"
      />

      <div className="flex flex-col items-center px-2 pt-4 pb-6 gap-3 max-w-2xl mx-auto">
        <p className="text-white font-bold text-sm sm:text-base text-center drop-shadow-md">
          PICKS MUST BE MADE {lockLeadHours} HOUR{lockLeadHours !== 1 ? "S" : ""} BEFORE MATCH STARTS
        </p>

        <div className="fixed top-2 right-4 sm:top-auto sm:bottom-4 bg-white rounded-xl border-2 border-black px-4 py-2 z-50 font-bold shadow-lg text-sm">
          Credits: {roundNumber(credits)}
        </div>

        {matches.map((match) => {
          const pick = match.Pick?.[0];
          const result = pick?.pickedResult ?? Result.NO_RESULT;
          const betAmount = pick?.betAmount ?? 0;

          const startDate = new Date(match.startTime);
          const showDateStamp = !isSameDay(startDate, lastDate) || match === matches[0];
          if (showDateStamp) lastDate = startDate;

          return (
            <div key={match.id} className="w-full flex flex-col items-center gap-2">
              {showDateStamp && (
                <div className="w-[90%] flex items-center justify-center h-14 rounded-xl bg-gradient-to-br from-[rgb(211,211,211)] to-[rgb(150,160,155)] shadow-md">
                  <span className="text-3xl font-bold text-white drop-shadow">
                    {startDate.toDateString()}
                  </span>
                </div>
              )}
              <MatchCard
                match={match}
                result={result}
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
