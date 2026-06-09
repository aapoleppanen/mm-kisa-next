import { cache } from "react";
import type { Stage, Tournament } from "@prisma/client";
import prisma from "@/lib/prisma";

const DEFAULT_TOURNAMENT = {
  name: "Euro 2024",
  fdCompetition: "EC",
  veikkausCtids: "1-15-149",
  startDate: new Date("2024-06-14T19:00:00Z"),
  veikkausWinnerEvent: "Euro 2024 - Mestari",
  veikkausScorerEvent: "Euro 2024 - Paras maalintekijä",
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

export function veikkausVariables(tournament: Tournament) {
  return {
    sportIds: ["1"] as [string],
    ctids: [tournament.veikkausCtids] as [string],
    lang: "fi",
  };
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
