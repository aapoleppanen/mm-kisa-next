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
  if (!betAmount || !pick || pick === Result.NO_RESULT) return 0;
  const amount = Number(betAmount);

  if (scoringMode === "PARI_MUTUEL" && poolMultiplier) {
    return amount * poolMultiplier;
  }
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

function debounce<T extends (...args: any[]) => any>(fn: T, ms: number) {
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

  const { data: poolData } = useSWR<PoolData>(
    isPariMutuel ? `/api/match/${match.id}/pool` : null,
    fetcher,
    { refreshInterval: 15000 }
  );

  const poolMultiplier =
    currentPick && poolData?.multipliers
      ? poolData.multipliers[currentPick] ?? null
      : null;

  const potentialWin = usePotentialWin(
    betAmount,
    match,
    currentPick,
    scoringMode,
    poolMultiplier
  );

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

  const displayOdds = (pickResult: Result) => {
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
    return dec.toFixed(2);
  };

  const pickButton = (pickResult: Result, label: string, imgSrc?: string, goals?: number | null) => (
    <Button
      variant={currentPick === pickResult ? "default" : "outline"}
      onClick={() => {
        if (!isExactScore) {
          setCurrentPick(pickResult);
          debouncedSave();
        }
      }}
      disabled={disabled || isExactScore}
      className="flex-1 min-w-[110px] h-auto py-2 px-2 flex-col gap-1 rounded-xl"
    >
      {imgSrc && <img src={imgSrc} alt="" className="h-6 w-auto object-contain" />}
      <span className="text-xs font-semibold">{label}</span>
      {goals != null && <span className="text-xs">({goals})</span>}
      {!isExactScore && <span className="text-xs opacity-70">{displayOdds(pickResult)}</span>}
    </Button>
  );

  const derivedPick = isExactScore ? scoreToResult(predHome, predAway) : currentPick;

  return (
    <div className="w-full rounded-3xl overflow-hidden shadow-md bg-gradient-to-br from-[rgb(211,211,211)] to-[rgb(150,160,155)] p-3 flex flex-col items-center gap-3">
      <span className="text-4xl font-bold text-white drop-shadow">
        {format(new Date(match.startTime), "HH:mm")}
      </span>

      <div className="flex flex-wrap justify-center gap-2 w-full">
        {pickButton(Result.HOME_TEAM, match.home.name, match.home.crest, match.homeGoals)}
        {pickButton(Result.DRAW, "Draw")}
        {pickButton(Result.AWAY_TEAM, match.away.name, match.away.crest, match.awayGoals)}
      </div>

      {isExactScore ? (
        <div className="flex items-center gap-4 w-full justify-center">
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-white font-medium">Home</span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={disabled || predHome <= 0}
                onClick={() => { setPredHome((h) => Math.max(0, h - 1)); debouncedSave(); }}
              >
                −
              </Button>
              <span className="text-white font-bold w-6 text-center">{predHome}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => { setPredHome((h) => h + 1); debouncedSave(); }}
              >
                +
              </Button>
            </div>
          </div>
          <span className="text-white font-bold text-lg">:</span>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-white font-medium">Away</span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={disabled || predAway <= 0}
                onClick={() => { setPredAway((a) => Math.max(0, a - 1)); debouncedSave(); }}
              >
                −
              </Button>
              <span className="text-white font-bold w-6 text-center">{predAway}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => { setPredAway((a) => a + 1); debouncedSave(); }}
              >
                +
              </Button>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            className="text-white hover:bg-white/20"
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
        <div className="flex items-center gap-2 w-full">
          <div className="flex items-center gap-2 flex-1">
            <Input
              type="number"
              value={betAmount}
              min={0}
              max={maxBetAmount}
              step="0.01"
              placeholder="Bet amount"
              disabled={disabled}
              className="w-36"
              onChange={(e) => setBetAmount(e.target.value ? Number(e.target.value) : "")}
              onBlur={() => { setBetAmount(betAmount || 0); debouncedSave(); }}
            />
            <span className="text-xs text-white font-medium whitespace-nowrap">
              = {potentialWin.toFixed(2)} pts
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            className="text-white hover:bg-white/20"
            onClick={() => { setCurrentPick(""); setBetAmount(0); debouncedSave(); }}
          >
            Clear
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className="border-white text-white hover:bg-white/20"
            onClick={makeApiCall}
          >
            Save
          </Button>
        </div>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="text-white/80 hover:bg-white/10 text-xs"
        onClick={() => setShowComments(!showComments)}
      >
        {showComments ? "Hide comments" : "Comments"}
      </Button>

      {showComments && <MatchComments matchId={match.id} />}
    </div>
  );
}
