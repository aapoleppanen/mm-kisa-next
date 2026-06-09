import prisma from "../../../lib/prisma";
import { getActiveTournament } from "@/lib/tournament";
import { emptySeedResult, type SeedResult } from "@/lib/seed-result";

export const insertTeams = async (): Promise<SeedResult> => {
  const result = emptySeedResult();
  try {
    const tournament = await getActiveTournament();
    if (!tournament.fdCompetition) throw new Error("fdCompetition not set");
    const path = `https://api.football-data.org/v4/competitions/${tournament.fdCompetition}/teams`;
    const response = await fetch(path, {
      headers: { "X-Auth-Token": `${process.env.FD_API_TOKEN}` },
    });
    const json = await response.json();

    for (const team of json.teams ?? []) {
      try {
        const existing = await prisma.team.findUnique({ where: { name: team.name } });
        await prisma.team.upsert({
          where: { name: team.name },
          update: { crest: team.crest },
          create: { name: team.name, crest: team.crest },
        });
        if (existing) result.updated++;
        else result.inserted++;
      } catch (e) {
        result.errors.push(`${team.name}: ${e instanceof Error ? e.message : "unknown"}`);
      }
    }
    return result;
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : "insertTeams failed");
    return result;
  }
};
