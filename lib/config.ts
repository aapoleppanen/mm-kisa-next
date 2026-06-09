import { cache } from "react";
import { differenceInHours, isBefore } from "date-fns";
import type { Config, Stage } from "@prisma/client";
import prisma from "@/lib/prisma";

export const veikkausGraphQlEndpoint =
  "https://v3.middle.prod.gcp.veikkaus.fi/midas/graphql";

export const startDate = new Date("2022-11-20T15:00:00Z");
export const euro2024startDate = new Date("2024-06-14T19:00:00Z");

const DEFAULT_CONFIG = {
  id: 1,
  scoringMode: "FIXED_ODDS" as const,
  startingCredits: 500,
  maxBetAmount: 50,
  lockLeadHours: 1,
  prePicksLockAt: null,
  rakePercent: 0,
  exactScorePoints: 3,
  goalDiffPoints: 2,
  tendencyPoints: 1,
  maintenanceMode: false,
  cronSecret: null,
  winnerBonusFactor: 10,
  topScorerBonusFactor: 10,
  actualWinnerTeamId: null,
  actualTopScorerId: null,
  updatedAt: new Date(),
};

export const getConfig = cache(async (): Promise<Config> => {
  const row = await prisma.config.findUnique({ where: { id: 1 } });
  if (row) return row;
  return prisma.config.create({ data: DEFAULT_CONFIG });
});

export function decimalOdds(matchOddsInt: number): number {
  return matchOddsInt / 100;
}

export function disabledToday(date: Date, lockLeadHours = 1): boolean {
  const diff = differenceInHours(date, new Date());
  return diff < lockLeadHours;
}

export function isPrePicksLocked(prePicksLockAt: Date | null | undefined): boolean {
  if (!prePicksLockAt) {
    return isBefore(euro2024startDate, new Date());
  }
  return isBefore(prePicksLockAt, new Date());
}

/** @deprecated use isPrePicksLocked with config */
export const disablePrePicks = () => isBefore(euro2024startDate, new Date());

const STAGE_MAX_BET: Record<Stage, number | null> = {
  GROUP: null,
  R16: 100,
  QF: 200,
  SF: 200,
  FINAL: 200,
};

export function maxBetForStage(stage: Stage, configMaxBet: number): number {
  return STAGE_MAX_BET[stage] ?? configMaxBet;
}
