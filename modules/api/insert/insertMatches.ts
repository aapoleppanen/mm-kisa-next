import prisma from "../../../lib/prisma";
import { getActiveTournament, mapFdStageToStage } from "@/lib/tournament";
import { emptySeedResult, type SeedResult } from "@/lib/seed-result";
import type { Match as FDMatch } from "../results/types";

export const insertMatches = async (): Promise<SeedResult> => {
  const result = emptySeedResult();
  try {
    const tournament = await getActiveTournament();
    const path = `https://api.football-data.org/v4/competitions/${tournament.fdCompetition}/matches`;
    const response = await fetch(path, {
      headers: { "X-Auth-Token": `${process.env.FD_API_TOKEN}` },
    });
    const json = await response.json();

    for (const match of (json.matches ?? []) as FDMatch[]) {
      try {
        if (!match.awayTeam?.name || !match.homeTeam?.name) {
          result.skipped++;
          continue;
        }

        const homeTeam = await prisma.team.findUnique({ where: { name: match.homeTeam.name } });
        const awayTeam = await prisma.team.findUnique({ where: { name: match.awayTeam.name } });

        if (!homeTeam) {
          result.unmapped.push(match.homeTeam.name);
          continue;
        }
        if (!awayTeam) {
          result.unmapped.push(match.awayTeam.name);
          continue;
        }

        const existing = await prisma.match.findUnique({ where: { id: match.id } });
        await prisma.match.upsert({
          where: { id: match.id },
          update: {
            startTime: match.utcDate,
            stage: mapFdStageToStage(match.stage),
          },
          create: {
            id: match.id,
            startTime: match.utcDate,
            homeId: homeTeam.id,
            awayId: awayTeam.id,
            stage: mapFdStageToStage(match.stage),
          },
        });

        if (existing) result.updated++;
        else result.inserted++;
      } catch (e) {
        result.errors.push(`Match ${match.id}: ${e instanceof Error ? e.message : "unknown"}`);
      }
    }
    return result;
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : "insertMatches failed");
    return result;
  }
};
