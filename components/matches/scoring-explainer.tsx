"use client";

import { useState } from "react";
import type { ScoringMode } from "@prisma/client";
import { cn } from "@/lib/utils";

export type ScoringParams = {
  contrarianFactor: number;
  exactScorePoints: number;
  goalDiffPoints: number;
  tendencyPoints: number;
  maxBetAmount: number;
  startingCredits: number;
};

function content(mode: ScoringMode, p: ScoringParams): { summary: string; points: string[] } {
  switch (mode) {
    case "CONTRARIAN":
      return {
        summary: "Pick each match winner — you score more for results few others called.",
        points: [
          `A correct pick scores 1 + ${p.contrarianFactor} × (1 − p), where p is the share of players who picked the same result.`,
          `Everyone backs the favourite → about 1 point. You nail an upset almost nobody saw → up to ${(1 + p.contrarianFactor).toFixed(1)} points.`,
          "A wrong pick scores 0. No credits, no stakes — just one tap per match.",
        ],
      };
    case "EXACT_SCORE":
      return {
        summary: "Predict the exact scoreline of each match.",
        points: [
          `Exact score: ${p.exactScorePoints} pts.`,
          `Right goal difference (wrong score): ${p.goalDiffPoints} pts.`,
          `Right winner only: ${p.tendencyPoints} pt. Wrong: 0.`,
        ],
      };
    case "PARI_MUTUEL":
      return {
        summary: "Bet credits on outcomes — the winning side splits the whole pot.",
        points: [
          `You start with ${p.startingCredits} credits, max ${p.maxBetAmount} per match.`,
          "Payout = your stake × (total pot ÷ stakes on your outcome).",
          "Back the outcome few others chose for a bigger share of the pot.",
        ],
      };
    case "COMPRESSED_ODDS":
      return {
        summary: "Bet credits at fixed odds, compressed so longshots don't dominate.",
        points: [
          `You start with ${p.startingCredits} credits, max ${p.maxBetAmount} per match.`,
          "A correct bet pays stake × log2(odds); favourites and underdogs end up closer in value.",
        ],
      };
    default: // FIXED_ODDS
      return {
        summary: "Bet credits at fixed odds.",
        points: [
          `You start with ${p.startingCredits} credits, max ${p.maxBetAmount} per match.`,
          "A correct bet pays stake × odds; a wrong bet loses the stake.",
        ],
      };
  }
}

export default function ScoringExplainer({
  scoringMode,
  params,
}: {
  scoringMode: ScoringMode;
  params: ScoringParams;
}) {
  const [open, setOpen] = useState(false);
  const { summary, points } = content(scoringMode, params);

  return (
    <div className="mx-auto max-w-xl px-4 pt-3">
      <div className="bg-white/90 backdrop-blur-md border border-primary/20 rounded-2xl shadow-sm overflow-hidden">
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-left"
          aria-expanded={open}
        >
          <span className="text-base leading-none">💡</span>
          <span className="flex-1 text-xs font-semibold text-slate-700 leading-snug">
            How scoring works
            <span className="hidden sm:inline text-slate-400 font-normal"> — {summary}</span>
          </span>
          <span className={cn("text-[10px] text-slate-400 transition-transform duration-150", open && "rotate-180")}>
            ▼
          </span>
        </button>
        {open && (
          <div className="px-4 pb-3 pt-0">
            <p className="text-xs text-slate-600 sm:hidden mb-1.5">{summary}</p>
            <ul className="space-y-1">
              {points.map((line, i) => (
                <li key={i} className="text-xs text-slate-600 flex gap-1.5">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
