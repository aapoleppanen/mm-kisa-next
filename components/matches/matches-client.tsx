"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Match, Pick, Result, ScoringMode, Team } from "@prisma/client";
import { useSearchParams } from "next/navigation";
import { format, isSameDay, startOfDay } from "date-fns";
import useSWR from "swr";
import { roundNumber } from "@/utils/numberUtils";
import MatchCard from "./match-card";
import ScoringExplainer, { type ScoringParams } from "./scoring-explainer";
import PaymentReminder from "./payment-reminder";
import FootballLoader from "@/components/ui/football-loader";
import type { PoolData } from "@/lib/pools";

const PAGE_SIZE = 12;

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export type PickDist = { HOME_TEAM: number; DRAW: number; AWAY_TEAM: number };

type MatchWithRelations = Match & {
  away: Team;
  home: Team;
  Pick?: Pick[];
  maxBet: number;
  pickDist: PickDist;
  _count?: { Comment: number };
};

type Props = {
  matches: MatchWithRelations[];
  initialCredits: number;
  backgroundUrl: string; // Deprecated, using CSS soccer pitch instead
  scoringMode: ScoringMode;
  lockLeadHours: number;
  scoringParams: ScoringParams;
  mobilepayNumber: string | null;
  hasPaid: boolean;
};

export default function MatchesClient({
  matches,
  initialCredits,
  scoringMode,
  lockLeadHours,
  scoringParams,
  mobilepayNumber,
  hasPaid,
}: Props) {
  const [credits, setCredits] = useState(initialCredits);
  const searchParams = useSearchParams();
  const deepLinkId = Number(searchParams.get("match")) || null;
  const isPariMutuel = scoringMode === "PARI_MUTUEL";
  // Credits only matter in the betting modes.
  const showCredits =
    scoringMode === "FIXED_ODDS" || scoringMode === "COMPRESSED_ODDS" || scoringMode === "PARI_MUTUEL";

  const { data: poolsData } = useSWR<Record<string, PoolData>>(
    isPariMutuel ? "/api/pools" : null,
    fetcher,
    { refreshInterval: 30000, refreshWhenHidden: false, revalidateOnFocus: false }
  );

  // Anchor the initial view on today's first match (or a deep-linked match), so
  // players land on what's relevant. Older fixtures load when scrolling up.
  const anchorIndex = useMemo(() => {
    if (deepLinkId) {
      const i = matches.findIndex((m) => m.id === deepLinkId);
      if (i !== -1) return i;
    }
    const todayStart = startOfDay(new Date());
    const i = matches.findIndex((m) => new Date(m.startTime) >= todayStart);
    return i === -1 ? Math.max(0, matches.length - PAGE_SIZE) : i;
  }, [matches, deepLinkId]);

  const [start, setStart] = useState(() => Math.max(0, anchorIndex));
  const [end, setEnd] = useState(() => Math.min(matches.length, anchorIndex + PAGE_SIZE));

  const topSentinelRef = useRef<HTMLDivElement | null>(null);
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const didInitialScroll = useRef(false);
  // Scroll-position preservation when prepending older matches.
  const pendingPrepend = useRef(false);
  const prevScrollHeight = useRef(0);

  const hasOlder = start > 0;
  const hasNewer = end < matches.length;

  // Land on the anchor card after first paint.
  useEffect(() => {
    if (didInitialScroll.current || !anchorRef.current) return;
    didInitialScroll.current = true;
    const y = anchorRef.current.getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo(0, Math.max(0, y));
  }, []);

  // After older matches are prepended, offset the scroll so the viewport stays put.
  useLayoutEffect(() => {
    if (!pendingPrepend.current) return;
    pendingPrepend.current = false;
    const el = document.scrollingElement;
    if (el) window.scrollBy(0, el.scrollHeight - prevScrollHeight.current);
  }, [start]);

  useEffect(() => {
    const el = topSentinelRef.current;
    if (!el || !hasOlder) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !pendingPrepend.current) {
          const sEl = document.scrollingElement;
          prevScrollHeight.current = sEl?.scrollHeight ?? 0;
          pendingPrepend.current = true;
          setStart((s) => Math.max(0, s - PAGE_SIZE));
        }
      },
      { rootMargin: "300px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasOlder]);

  useEffect(() => {
    const el = bottomSentinelRef.current;
    if (!el || !hasNewer) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setEnd((e) => Math.min(matches.length, e + PAGE_SIZE));
        }
      },
      { rootMargin: "600px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNewer, matches.length]);

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

  const visibleMatches = matches.slice(start, end);

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

      {/* How to pay */}
      {mobilepayNumber && (
        <PaymentReminder mobilepayNumber={mobilepayNumber} initialHasPaid={hasPaid} />
      )}

      {/* Match list */}
      <div className="flex flex-col items-center px-4 pt-6 pb-12 gap-5 max-w-xl mx-auto">
        {/* Scroll-up sentinel: loads older matches */}
        {hasOlder && (
          <div ref={topSentinelRef} className="w-full flex justify-center py-6">
            <FootballLoader size="sm" text="Loading earlier matches…" />
          </div>
        )}

        {visibleMatches.map((match, i) => {
          const globalIndex = start + i;
          const pick = match.Pick?.[0];
          const pickResult = pick?.pickedResult ?? Result.NO_RESULT;
          const betAmount = pick?.betAmount ?? 0;

          const startDate = new Date(match.startTime);
          const prev = visibleMatches[i - 1];
          const showDateStamp = i === 0 || !prev || !isSameDay(startDate, new Date(prev.startTime));
          const isAnchor = globalIndex === anchorIndex;

          return (
            <div
              key={match.id}
              ref={isAnchor ? anchorRef : undefined}
              className="w-full flex flex-col items-center gap-3"
            >
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
                commentCount={match._count?.Comment ?? 0}
                pickDist={match.pickDist}
                defaultOpenComments={deepLinkId === match.id}
              />
            </div>
          );
        })}

        {/* Scroll-down sentinel: loads newer matches */}
        {hasNewer && (
          <div ref={bottomSentinelRef} className="w-full flex justify-center py-6">
            <FootballLoader size="sm" text={`Loading more… (${end}/${matches.length})`} />
          </div>
        )}
      </div>
    </div>
  );
}
