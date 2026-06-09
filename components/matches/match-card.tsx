"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Match, Result, Team } from "@prisma/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { disabledToday, maxBetAmount } from "@/lib/config";
import MatchComments from "./match-comments";

type Props = {
  match: Match & { away: Team; home: Team };
  result: Result | "";
  betAmount: number;
  updateUserCredits: (credits: number) => void;
};

const ZBet = z.number().min(0).max(maxBetAmount);

function usePotentialWin(betAmount: number | "", match: Match, pick: Result | "") {
  if (!betAmount || !pick || pick === Result.NO_RESULT) return 0;
  const key =
    pick === Result.HOME_TEAM
      ? "homeWinOdds"
      : pick === Result.DRAW
      ? "drawOdds"
      : "awayWinOdds";
  return (Number(betAmount) * match[key]) / 100;
}

function debounce<T extends (...args: any[]) => any>(fn: T, ms: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export default function MatchCard({ match, result, betAmount: initialBet, updateUserCredits }: Props) {
  const [currentPick, setCurrentPick] = useState<Result | "">(result);
  const [betAmount, setBetAmount] = useState<number | "">(initialBet);
  const [showComments, setShowComments] = useState(false);
  const potentialWin = usePotentialWin(betAmount, match, currentPick);
  const latestRef = useRef({ currentPick, betAmount });
  const disabled = disabledToday(new Date(match.startTime));

  useEffect(() => {
    latestRef.current = { currentPick, betAmount };
  });

  const makeApiCall = useCallback(async () => {
    const { currentPick, betAmount } = latestRef.current;
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
  }, [match.id, updateUserCredits]);

  const debouncedSave = useRef(debounce(makeApiCall, 600)).current;

  const pickButton = (pickResult: Result, label: string, imgSrc?: string, goals?: number | null) => (
    <Button
      variant={currentPick === pickResult ? "default" : "outline"}
      onClick={() => { setCurrentPick(pickResult); debouncedSave(); }}
      disabled={disabled}
      className="flex-1 min-w-[110px] h-auto py-2 px-2 flex-col gap-1 rounded-xl"
    >
      {imgSrc && (
        <img src={imgSrc} alt="" className="h-6 w-auto object-contain" />
      )}
      <span className="text-xs font-semibold">{label}</span>
      {goals != null && <span className="text-xs">({goals})</span>}
      <span className="text-xs opacity-70">
        {pickResult === Result.HOME_TEAM
          ? match.homeWinOdds / 100
          : pickResult === Result.DRAW
          ? match.drawOdds / 100
          : match.awayWinOdds / 100}
      </span>
    </Button>
  );

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
