"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Match, Result, ScoringMode, Team } from "@prisma/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import type { PoolData } from "@/lib/pools";
import type { PickDist } from "./matches-client";
import { Input } from "@/components/ui/input";
import { decimalOdds, disabledToday } from "@/lib/config";
import { cn } from "@/lib/utils";

// Comments are only needed once a card is expanded — keep them out of the
// initial matches bundle.
const MatchComments = dynamic(() => import("./match-comments"), {
  ssr: false,
  loading: () => <p className="text-xs text-muted-foreground py-2 text-center">Loading comments…</p>,
});

type Props = {
  match: Match & { away: Team; home: Team };
  result: Result | "";
  betAmount: number;
  predHome?: number | null;
  predAway?: number | null;
  scoringMode: ScoringMode;
  maxBetAmount: number;
  lockLeadHours: number;
  updateUserCredits: (credits: number) => void;
  poolData?: PoolData;
  commentCount?: number;
  pickDist?: PickDist;
  defaultOpenComments?: boolean;
};

// "1d 3h", "3h 12m", "12m", or "<1m" until the given timestamp.
function formatCountdown(ms: number): string {
  const totalMin = Math.floor(ms / 60_000);
  if (totalMin < 1) return "<1m";
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function usePotentialWin(
  betAmount: number | "",
  match: Match,
  pick: Result | "",
  scoringMode: ScoringMode,
  poolMultiplier: number | null
) {
  if (!betAmount || !pick || pick === Result.NO_RESULT) return null;
  const amount = Number(betAmount);
  if (scoringMode === "PARI_MUTUEL" && poolMultiplier) return amount * poolMultiplier;
  if (scoringMode === "COMPRESSED_ODDS") {
    const key =
      pick === Result.HOME_TEAM ? "homeWinOdds" : pick === Result.DRAW ? "drawOdds" : "awayWinOdds";
    const dec = decimalOdds(match[key]);
    return dec > 1 ? amount * (Math.log(dec) / Math.LN2) : 0;
  }
  const key =
    pick === Result.HOME_TEAM ? "homeWinOdds" : pick === Result.DRAW ? "drawOdds" : "awayWinOdds";
  return amount * decimalOdds(match[key]);
}

function debounce<T extends (...args: unknown[]) => unknown>(fn: T, ms: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function scoreToResult(home: number, away: number): Result {
  if (home > away) return Result.HOME_TEAM;
  if (home < away) return Result.AWAY_TEAM;
  return Result.DRAW;
}

export default function MatchCard({
  match,
  result,
  betAmount: initialBet,
  predHome: initialPredHome,
  predAway: initialPredAway,
  scoringMode,
  maxBetAmount,
  lockLeadHours,
  updateUserCredits,
  poolData,
  commentCount: initialCommentCount = 0,
  pickDist,
  defaultOpenComments = false,
}: Props) {
  const [currentPick, setCurrentPick] = useState<Result | "">(result);
  const [betAmount, setBetAmount] = useState<number | "">(initialBet);
  const [predHome, setPredHome] = useState(initialPredHome ?? 0);
  const [predAway, setPredAway] = useState(initialPredAway ?? 0);
  const [showComments, setShowComments] = useState(defaultOpenComments);
  // Seed from the server-provided count so the badge shows before the drawer is
  // ever opened; MatchComments refines it (post/delete) once mounted.
  const [commentCount, setCommentCount] = useState<number | null>(initialCommentCount);
  const latestRef = useRef({ currentPick, betAmount, predHome, predAway });
  const disabled = disabledToday(new Date(match.startTime), lockLeadHours);

  // Live countdown to the pick lock (kickoff − lockLeadHours).
  const lockAt = new Date(match.startTime).getTime() - lockLeadHours * 3_600_000;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (disabled) return; // no need to tick once locked
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [disabled]);
  const msToLock = lockAt - now;

  // Crowd pick distribution — only revealed once picks have locked.
  const distTotal = pickDist ? pickDist.HOME_TEAM + pickDist.DRAW + pickDist.AWAY_TEAM : 0;
  const showCrowd = disabled && distTotal > 0;
  const crowdPct = (n: number) => (distTotal ? Math.round((n / distTotal) * 100) : 0);
  const isExactScore = scoringMode === "EXACT_SCORE";
  const isContrarian = scoringMode === "CONTRARIAN";
  const isPariMutuel = scoringMode === "PARI_MUTUEL";
  // Betting modes show a stake input + odds; the rest are pure prediction.
  const isBetting = !isExactScore && !isContrarian;
  const hasScore = match.homeGoals != null && match.awayGoals != null;

  const poolMultiplier =
    currentPick && poolData?.multipliers ? poolData.multipliers[currentPick] ?? null : null;

  const potentialWin = usePotentialWin(betAmount, match, currentPick, scoringMode, poolMultiplier);

  useEffect(() => {
    latestRef.current = { currentPick, betAmount, predHome, predAway };
  });

  const makeApiCall = useCallback(async () => {
    const { currentPick, betAmount, predHome, predAway } = latestRef.current;

    if (isExactScore) {
      const response = await fetch("/api/pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: match.id, predHome, predAway }),
      });
      if (response.status === 403) {
        const { error } = await response.json();
        toast.error(error);
        return;
      }
      const data = await response.json();
      updateUserCredits(data.remainingCredits);
      setCurrentPick(scoreToResult(predHome, predAway));
      toast.success(data.notification ?? "Prediction saved!");
      return;
    }

    if (isContrarian) {
      if (!currentPick || currentPick === Result.NO_RESULT) return;
      const response = await fetch("/api/pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: match.id, result: currentPick }),
      });
      if (response.status === 403) {
        const { error } = await response.json();
        toast.error(error);
        return;
      }
      const data = await response.json();
      toast.success(data.notification ?? "Pick saved!");
      return;
    }

    const ZBet = z.number().min(0).max(maxBetAmount);
    if (!ZBet.safeParse(Number(betAmount)).success || Number(betAmount) > maxBetAmount) {
      toast.error(`Invalid bet amount (max: ${maxBetAmount})`);
      return;
    }

    const response = await fetch("/api/pick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId: match.id, result: currentPick, betAmount }),
    });

    if (response.status === 403) {
      const { error } = await response.json();
      toast.error(error);
      return;
    }

    const { remainingCredits, betAmount: newBet, notification } = await response.json();
    updateUserCredits(remainingCredits);
    setBetAmount(newBet);
    toast.success(notification ?? "Bet placed!");
  }, [match.id, updateUserCredits, maxBetAmount, isExactScore, isContrarian]);

  const debouncedSave = useRef(debounce(makeApiCall, 600)).current;

  const displayOdds = (pickResult: Result): string => {
    if (isPariMutuel && poolData?.multipliers) {
      const m = poolData.multipliers[pickResult];
      return m != null ? `${m.toFixed(2)}×` : "—";
    }
    const key =
      pickResult === Result.HOME_TEAM
        ? "homeWinOdds"
        : pickResult === Result.DRAW
        ? "drawOdds"
        : "awayWinOdds";
    const dec = decimalOdds(match[key]);
    if (scoringMode === "COMPRESSED_ODDS") {
      return dec > 1 ? `${(Math.log(dec) / Math.LN2).toFixed(2)}×` : dec.toFixed(2);
    }
    return `${dec.toFixed(2)}×`;
  };

  const derivedPick = isExactScore ? scoreToResult(predHome, predAway) : currentPick;

  const PickButton = ({
    pickResult,
    label,
    crest,
  }: {
    pickResult: Result;
    label: string;
    crest?: string;
  }) => {
    const selected = derivedPick === pickResult;
    return (
      <button
        onClick={() => {
          if (!isExactScore && !disabled) {
            setCurrentPick(pickResult);
            debouncedSave();
          }
        }}
        disabled={disabled || isExactScore}
        className={cn(
          "flex-1 flex flex-col items-center gap-1.5 py-4 px-1 rounded-2xl border-2 transition-all duration-300 relative select-none overflow-hidden",
          selected
            ? "bg-primary border-primary text-white shadow-md scale-[1.01]"
            : "bg-white border-slate-200 text-slate-800 hover:border-primary/50 hover:bg-emerald-50/50",
          disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer active:scale-95"
        )}
      >
        {/* Selected Accent glow */}
        {selected && (
          <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-amber-400 m-2" />
        )}
        
        {crest ? (
          <div className="h-10 w-10 rounded-full border border-slate-100 flex items-center justify-center p-0.5 bg-slate-50 shadow-sm overflow-hidden shrink-0">
            <img src={crest} alt="" loading="lazy" decoding="async" width={40} height={40} className="h-full w-full object-contain" />
          </div>
        ) : (
          <div className="h-10 w-10 rounded-full border border-slate-100 flex items-center justify-center bg-slate-50 text-slate-400 shadow-sm shrink-0">
            🤝
          </div>
        )}
        
        <span className="text-xs font-bold leading-tight text-center truncate max-w-full px-1">{label}</span>

        {isBetting && (
          <span className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full",
            selected
              ? "bg-amber-400 text-slate-900"
              : "text-primary bg-emerald-50 font-semibold"
          )}>
            {displayOdds(pickResult)}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="w-full rounded-3xl bg-white border-l-4 border-l-primary border-y border-r border-border/80 shadow-md overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-slate-50">
        <span className="bg-primary/10 text-primary text-xs font-black px-2.5 py-0.5 rounded-full tracking-wide">
          {format(new Date(match.startTime), "HH:mm")}
        </span>
        
        {hasScore && (
          <div className="flex items-center gap-1.5 bg-slate-800 text-white rounded-xl px-3 py-0.5 shadow-inner">
            <span className="text-[9px] font-bold tracking-widest text-slate-300 uppercase leading-none mt-0.5 mr-0.5">FT</span>
            <span className="text-xs font-mono font-black tracking-widest">
              {match.homeGoals} – {match.awayGoals}
            </span>
          </div>
        )}
        
        <span className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider bg-slate-200/50 px-2 py-0.5 rounded-md">
          {match.stage}
        </span>
      </div>

      {/* Lock countdown strip (hidden once the match has a final score) */}
      {!hasScore && (
        <div className="px-4 py-1.5 flex items-center justify-center border-b border-border/40 bg-slate-50/50">
          {disabled ? (
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">🔒 Picks locked</span>
          ) : (
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
              🕒 Locks in {formatCountdown(msToLock)}
            </span>
          )}
        </div>
      )}

      {/* Pick buttons */}
      <div className="flex gap-2.5 p-3">
        <PickButton pickResult={Result.HOME_TEAM} label={match.home.name} crest={match.home.crest} />
        <PickButton pickResult={Result.DRAW} label="Draw" />
        <PickButton pickResult={Result.AWAY_TEAM} label={match.away.name} crest={match.away.crest} />
      </div>

      {/* Crowd pick distribution — revealed only after lock */}
      {showCrowd && (
        <div className="px-3 pb-2 -mt-1 space-y-1">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Crowd picks · {distTotal}
          </div>
          {[
            { label: match.home.name, n: pickDist!.HOME_TEAM },
            { label: "Draw", n: pickDist!.DRAW },
            { label: match.away.name, n: pickDist!.AWAY_TEAM },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-slate-500 w-16 truncate">{s.label}</span>
              <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-primary/60 rounded-full" style={{ width: `${crowdPct(s.n)}%` }} />
              </div>
              <span className="text-[10px] font-bold text-slate-600 w-8 text-right tabular-nums">
                {crowdPct(s.n)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Bet / score row */}
      <div className="px-3 pb-4">
        {isExactScore ? (
          <div className="flex items-center justify-center gap-6 py-1 bg-slate-50/70 border border-slate-100 rounded-2xl p-2.5">
            {/* Home score */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase">{match.home.name}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={disabled || predHome <= 0}
                  onClick={() => { setPredHome((h) => Math.max(0, h - 1)); debouncedSave(); }}
                  className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:border-primary hover:bg-emerald-50 flex items-center justify-center font-bold text-sm shadow-sm active:scale-90 transition-all disabled:opacity-40"
                >
                  −
                </button>
                <span className="font-extrabold font-mono text-xl w-6 text-center text-slate-800">{predHome}</span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => { setPredHome((h) => h + 1); debouncedSave(); }}
                  className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:border-primary hover:bg-emerald-50 flex items-center justify-center font-bold text-sm shadow-sm active:scale-90 transition-all"
                >
                  +
                </button>
              </div>
            </div>
            
            <span className="text-slate-300 text-2xl font-light leading-none mt-4">:</span>
            
            {/* Away score */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase">{match.away.name}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={disabled || predAway <= 0}
                  onClick={() => { setPredAway((a) => Math.max(0, a - 1)); debouncedSave(); }}
                  className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:border-primary hover:bg-emerald-50 flex items-center justify-center font-bold text-sm shadow-sm active:scale-90 transition-all disabled:opacity-40"
                >
                  −
                </button>
                <span className="font-extrabold font-mono text-xl w-6 text-center text-slate-800">{predAway}</span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => { setPredAway((a) => a + 1); debouncedSave(); }}
                  className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:border-primary hover:bg-emerald-50 flex items-center justify-center font-bold text-sm shadow-sm active:scale-90 transition-all"
                >
                  +
                </button>
              </div>
            </div>
            
            <div className="flex flex-col gap-1.5 ml-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={async () => {
                  setPredHome(0);
                  setPredAway(0);
                  setCurrentPick("");
                  const response = await fetch("/api/pick", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ matchId: match.id, clear: true }),
                  });
                  if (response.ok) {
                    const data = await response.json();
                    updateUserCredits(data.remainingCredits);
                    toast.success("Prediction cleared");
                  }
                }}
                className="h-8 text-[11px] font-semibold text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl"
              >
                Clear
              </Button>
            </div>
          </div>
        ) : isContrarian ? (
          <div className="flex items-center justify-between gap-2 py-1 bg-slate-50 border border-slate-100 rounded-2xl p-2.5">
            <span className="text-[11px] text-slate-500 px-1">
              {currentPick && currentPick !== Result.NO_RESULT
                ? "Pick saved — tap another to change"
                : "Tap your prediction above"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={disabled || !currentPick || currentPick === Result.NO_RESULT}
              onClick={async () => {
                setCurrentPick("");
                const response = await fetch("/api/pick", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ matchId: match.id, clear: true }),
                });
                if (response.ok) toast.success("Cleared pick");
              }}
              className="h-8 text-[11px] font-semibold text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl px-2"
            >
              Clear
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 py-1 bg-slate-50 border border-slate-100 rounded-2xl p-2.5">
            <div className="relative flex-1 max-w-[130px]">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">$</span>
              <Input
                type="number"
                value={betAmount}
                min={0}
                max={maxBetAmount}
                step="0.01"
                placeholder={`Bet (max ${maxBetAmount})`}
                disabled={disabled}
                className="w-full pl-6 h-8 text-xs font-bold border-slate-200 rounded-xl focus-visible:ring-primary/20 focus-visible:border-primary"
                onChange={(e) => setBetAmount(e.target.value ? Number(e.target.value) : "")}
                onBlur={() => { setBetAmount(betAmount || 0); debouncedSave(); }}
              />
            </div>
            
            {potentialWin != null && currentPick && currentPick !== Result.NO_RESULT ? (
              <span className="text-[11px] text-slate-500 flex-1 whitespace-nowrap px-1">
                Win: <strong className="text-primary font-bold text-xs">+{potentialWin.toFixed(1)}</strong> pts
              </span>
            ) : (
              <span className="flex-1 text-[11px] text-slate-400 italic px-1">Enter stake</span>
            )}
            
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => { setCurrentPick(""); setBetAmount(0); debouncedSave(); }}
                className="h-8 text-[11px] font-semibold text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl px-2"
              >
                Clear
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={makeApiCall}
                className="h-8 text-[11px] font-bold text-primary border-primary/40 hover:bg-primary/10 rounded-xl px-3"
              >
                Save
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Comments toggle - Animated header */}
      <div className="border-t border-border/40">
        <button
          onClick={() => setShowComments(!showComments)}
          className="w-full flex items-center justify-between px-4 py-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors duration-150"
        >
          <span className="font-medium">
            {showComments
              ? "Hide comments"
              : commentCount != null && commentCount > 0
                ? `Comments (${commentCount})`
                : "Comments"}
          </span>
          <span className={cn(
            "text-[10px] transition-transform duration-150",
            showComments ? "rotate-180" : ""
          )}>
            ▼
          </span>
        </button>
        {showComments && (
          <div className="p-3 pt-0">
            <MatchComments matchId={match.id} onCountChange={setCommentCount} />
          </div>
        )}
      </div>
    </div>
  );
}
