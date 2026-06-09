import prisma from "../../../lib/prisma";
import { getActiveTournament } from "@/lib/tournament";
import { emptySeedResult, type SeedResult } from "@/lib/seed-result";
import { Match } from "./types";

export const updateResults = async (): Promise<SeedResult> => {
  const result = emptySeedResult();
  try {
    const tournament = await getActiveTournament();
    const path = `https://api.football-data.org/v4/competitions/${tournament.fdCompetition}/matches`;
    const response = await fetch(path, {
      headers: { "X-Auth-Token": `${process.env.FD_API_TOKEN}` },
    });
    const json = await response.json();

    for (const match of json.matches as Match[]) {
      try {
        if (!match.awayTeam.name || !match.homeTeam.name) {
          result.skipped++;
          continue;
        }

        const existing = await prisma.match.findUnique({
          where: { id: match.id },
          select: { resultOverridden: true },
        });
        if (existing?.resultOverridden) {
          result.skipped++;
          continue;
        }

        const awayTeam = await prisma.team.findUnique({
          where: { name: match.awayTeam.name },
        });
        const homeTeam = await prisma.team.findUnique({
          where: { name: match.homeTeam.name },
        });

        if (!awayTeam) {
          result.unmapped.push(match.awayTeam.name);
          continue;
        }
        if (!homeTeam) {
          result.unmapped.push(match.homeTeam.name);
          continue;
        }

        const hadMatch = !!existing;
        await prisma.match.upsert({
          where: { id: match.id },
          update: {
            awayGoals: match.score.fullTime.away ?? match.score.halfTime.away,
            homeGoals: match.score.fullTime.home ?? match.score.halfTime.home,
            result: match.score.duration == "REGULAR" ? match.score.winner : "DRAW",
          },
          create: {
            startTime: match.utcDate,
            homeId: homeTeam.id,
            awayId: awayTeam.id,
            homeGoals: match.score.fullTime.home,
            awayGoals: match.score.fullTime.away,
            id: match.id,
          },
        });
        if (hadMatch) result.updated++;
        else result.inserted++;
      } catch (e) {
        result.errors.push(`Match ${match.id}: ${e instanceof Error ? e.message : "unknown"}`);
      }
    }
    return result;
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : "updateResults failed");
    return result;
  }
};
