"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Match, Result, ScoringMode, Team } from "@prisma/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { z } from "zod";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { decimalOdds, disabledToday } from "@/lib/config";
import MatchComments from "./match-comments";

type PoolData = {
  pool: number;
  multipliers: Record<string, number | null>;
};

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
};

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

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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
}: Props) {
  const [currentPick, setCurrentPick] = useState<Result | "">(result);
  const [betAmount, setBetAmount] = useState<number | "">(initialBet);
  const [predHome, setPredHome] = useState(initialPredHome ?? 0);
  const [predAway, setPredAway] = useState(initialPredAway ?? 0);
  const [showComments, setShowComments] = useState(false);
  const latestRef = useRef({ currentPick, betAmount, predHome, predAway });
  const disabled = disabledToday(new Date(match.startTime), lockLeadHours);
  const isExactScore = scoringMode === "EXACT_SCORE";
  const isPariMutuel = scoringMode === "PARI_MUTUEL";
  const hasScore = match.homeGoals != null && match.awayGoals != null;

  const { data: poolData } = useSWR<PoolData>(
    isPariMutuel ? `/api/match/${match.id}/pool` : null,
    fetcher,
    { refreshInterval: 15000 }
  );

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
  }, [match.id, updateUserCredits, maxBetAmount, isExactScore]);

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
        className={`flex-1 flex flex-col items-center gap-1 py-3 px-1 rounded-2xl border-2 transition-all text-sm font-semibold ${
          selected
            ? "bg-primary border-primary text-white shadow-md"
            : "bg-white border-border text-foreground hover:border-primary/50 hover:bg-primary/5"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        {crest && (
          <img src={crest} alt="" className="h-8 w-auto object-contain" />
        )}
        <span className="text-xs font-bold leading-tight text-center">{label}</span>
        {!isExactScore && (
          <span className={`text-xs font-medium ${selected ? "text-white/80" : "text-muted-foreground"}`}>
            {displayOdds(pickResult)}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="w-full rounded-2xl bg-white border border-border shadow-sm overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/40">
        <span className="text-primary font-bold text-lg">
          {format(new Date(match.startTime), "HH:mm")}
        </span>
        {hasScore && (
          <span className="text-base font-bold text-foreground tracking-widest">
            {match.homeGoals} – {match.awayGoals}
          </span>
        )}
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          {match.stage}
        </span>
      </div>

      {/* Pick buttons */}
      <div className="flex gap-2 p-3">
        <PickButton pickResult={Result.HOME_TEAM} label={match.home.name} crest={match.home.crest} />
        <PickButton pickResult={Result.DRAW} label="Draw" />
        <PickButton pickResult={Result.AWAY_TEAM} label={match.away.name} crest={match.away.crest} />
      </div>

      {/* Bet / score row */}
      <div className="px-3 pb-3">
        {isExactScore ? (
          <div className="flex items-center justify-center gap-5">
            {/* Home score */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs text-muted-foreground">{match.home.name}</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={disabled || predHome <= 0}
                  onClick={() => { setPredHome((h) => Math.max(0, h - 1)); debouncedSave(); }}
                  className="w-8 h-8 p-0"
                >
                  −
                </Button>
                <span className="font-bold text-xl w-5 text-center">{predHome}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  onClick={() => { setPredHome((h) => h + 1); debouncedSave(); }}
                  className="w-8 h-8 p-0"
                >
                  +
                </Button>
              </div>
            </div>
            <span className="text-muted-foreground text-xl font-light">:</span>
            {/* Away score */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs text-muted-foreground">{match.away.name}</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={disabled || predAway <= 0}
                  onClick={() => { setPredAway((a) => Math.max(0, a - 1)); debouncedSave(); }}
                  className="w-8 h-8 p-0"
                >
                  −
                </Button>
                <span className="font-bold text-xl w-5 text-center">{predAway}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  onClick={() => { setPredAway((a) => a + 1); debouncedSave(); }}
                  className="w-8 h-8 p-0"
                >
                  +
                </Button>
              </div>
            </div>
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
            >
              Clear
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={betAmount}
              min={0}
              max={maxBetAmount}
              step="0.01"
              placeholder={`Bet (max ${maxBetAmount})`}
              disabled={disabled}
              className="w-36 h-9 text-sm"
              onChange={(e) => setBetAmount(e.target.value ? Number(e.target.value) : "")}
              onBlur={() => { setBetAmount(betAmount || 0); debouncedSave(); }}
            />
            {potentialWin != null && currentPick && currentPick !== Result.NO_RESULT ? (
              <span className="text-sm text-muted-foreground flex-1 whitespace-nowrap">
                → <strong className="text-foreground">{potentialWin.toFixed(1)}</strong> pts
              </span>
            ) : (
              <span className="flex-1" />
            )}
            <Button
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => { setCurrentPick(""); setBetAmount(0); debouncedSave(); }}
            >
              Clear
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={makeApiCall}
            >
              Save
            </Button>
          </div>
        )}
      </div>

      {/* Comments toggle */}
      <div className="border-t border-border">
        <button
          onClick={() => setShowComments(!showComments)}
          className="w-full flex items-center gap-1.5 px-4 py-2.5 text-xs text-muted-foreground hover:text-primary hover:bg-muted/40 transition-colors"
        >
          <span>💬</span>
          <span>{showComments ? "Hide comments" : "Comments"}</span>
        </button>
        {showComments && (
          <div className="p-3 pt-0">
            <MatchComments matchId={match.id} />
          </div>
        )}
      </div>
    </div>
  );
}
