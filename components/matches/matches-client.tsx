"use client";

import { useState } from "react";
import { Match, Pick, Result, ScoringMode, Team } from "@prisma/client";
import { format, isSameDay } from "date-fns";
import useSWR from "swr";
import { roundNumber } from "@/utils/numberUtils";
import MatchCard from "./match-card";
import ScoringExplainer, { type ScoringParams } from "./scoring-explainer";
import type { PoolData } from "@/lib/pools";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type MatchWithRelations = Match & {
  away: Team;
  home: Team;
  Pick?: Pick[];
  maxBet: number;
};

type Props = {
  matches: MatchWithRelations[];
  initialCredits: number;
  backgroundUrl: string; // Deprecated, using CSS soccer pitch instead
  scoringMode: ScoringMode;
  lockLeadHours: number;
  scoringParams: ScoringParams;
};

export default function MatchesClient({
  matches,
  initialCredits,
  scoringMode,
  lockLeadHours,
  scoringParams,
}: Props) {
  const [credits, setCredits] = useState(initialCredits);
  const isPariMutuel = scoringMode === "PARI_MUTUEL";
  // Credits only matter in the betting modes.
  const showCredits =
    scoringMode === "FIXED_ODDS" || scoringMode === "COMPRESSED_ODDS" || scoringMode === "PARI_MUTUEL";

  const { data: poolsData } = useSWR<Record<string, PoolData>>(
    isPariMutuel ? "/api/pools" : null,
    fetcher,
    { refreshInterval: 30000, refreshWhenHidden: false, revalidateOnFocus: false }
  );

  if (!matches.length) {
    return (
      <div className="soccer-pitch-bg min-h-screen flex items-center justify-center p-8">
        <div className="bg-white border border-border/80 rounded-3xl p-8 shadow-xl max-w-sm text-center">
          <span className="text-4xl">⚽</span>
          <p className="mt-4 text-slate-700 font-bold">No matches scheduled yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Check back later once the fixtures are seeded!</p>
        </div>
      </div>
    );
  }

  let lastDate = new Date(matches[0].startTime);

  return (
    <div className="soccer-pitch-bg min-h-screen pt-4 sm:pt-6 pb-24">
      {/* Credits badge - Premium scoreboard badge (betting modes only) */}
      {showCredits && (
        <div className="fixed top-3 right-3 sm:top-20 sm:right-6 z-40 bg-white/95 backdrop-blur-md border border-amber-400 rounded-2xl px-3.5 py-1.5 shadow-lg flex items-center gap-2 hover-lift">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white font-black text-xs">
            $
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase leading-none">Credits</span>
            <span className="text-sm font-black text-slate-800 leading-tight">{roundNumber(credits)}</span>
          </div>
        </div>
      )}

      {/* Lock warning */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-border/60 px-4 py-2.5 text-center shadow-sm">
        <p className="text-xs text-primary font-bold flex items-center justify-center gap-1.5">
          <span>🕒</span>
          <span>Predictions lock {lockLeadHours} hours before kickoff</span>
        </p>
      </div>

      {/* How scoring works */}
      <ScoringExplainer scoringMode={scoringMode} params={scoringParams} />

      {/* Match list */}
      <div className="flex flex-col items-center px-4 pt-6 pb-12 gap-5 max-w-xl mx-auto">
        {matches.map((match) => {
          const pick = match.Pick?.[0];
          const pickResult = pick?.pickedResult ?? Result.NO_RESULT;
          const betAmount = pick?.betAmount ?? 0;

          const startDate = new Date(match.startTime);
          const showDateStamp = !isSameDay(startDate, lastDate) || match === matches[0];
          if (showDateStamp) lastDate = startDate;

          return (
            <div key={match.id} className="w-full flex flex-col items-center gap-3">
              {showDateStamp && (
                <div className="w-full flex items-center gap-3 py-2 mt-4">
                  <div className="flex-1 h-[2px] bg-gradient-to-r from-transparent to-primary/20" />
                  <div className="bg-primary/10 border border-primary/20 rounded-full px-4 py-1 flex items-center gap-1.5 shadow-sm">
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">
                      📅 {format(startDate, "EEEE d.M.yyyy")}
                    </span>
                  </div>
                  <div className="flex-1 h-[2px] bg-gradient-to-l from-transparent to-primary/20" />
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
                poolData={poolsData?.[match.id]}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
