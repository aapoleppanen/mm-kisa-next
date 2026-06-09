import { cache } from "react";
import type { Stage, Tournament } from "@prisma/client";
import prisma from "@/lib/prisma";

const DEFAULT_TOURNAMENT = {
  name: "World Cup 2026",
  startDate: new Date("2026-06-11T19:00:00Z"),
  fixtureSource: "ESPN" as const,
  espnLeagueSlug: "fifa.world",
  fdCompetition: "WC",
  veikkausDrilldownTagId: 2086,
  veikkausWinnerEvent: "World Cup - Group Winner & Tournament Winner",
  veikkausScorerEvent: "World Cup - Golden Boot - Top Goalscorer",
  isActive: true,
};

export const getActiveTournament = cache(async (): Promise<Tournament> => {
  const active = await prisma.tournament.findFirst({ where: { isActive: true } });
  if (active) return active;

  const count = await prisma.tournament.count();
  if (count === 0) {
    return prisma.tournament.create({ data: DEFAULT_TOURNAMENT });
  }

  const first = await prisma.tournament.findFirst({ orderBy: { id: "asc" } });
  if (!first) throw new Error("No tournament configured");
  return prisma.tournament.update({
    where: { id: first.id },
    data: { isActive: true },
  });
});

export function veikkausVariables(_tournament: Tournament): never {
  throw new Error("Veikkaus odds source not configured");
}

const FD_STAGE_MAP: Record<string, Stage> = {
  GROUP_STAGE: "GROUP",
  LAST_16: "R16",
  QUARTER_FINALS: "QF",
  SEMI_FINALS: "SF",
  FINAL: "FINAL",
  THIRD_PLACE: "FINAL",
};

export function mapFdStageToStage(fdStage: string): Stage {
  return FD_STAGE_MAP[fdStage] ?? "GROUP";
}
