import prisma from "../../../lib/prisma";
import {
  fetchVeikkausOutrights,
  getActiveTournament,
  oddsToInt,
} from "@/lib/tournament";
import { emptySeedResult, type SeedResult } from "@/lib/seed-result";

// Tournament-winner odds per team, from the Veikkaus content-service (free, no key).
export const updateTeamOdds = async (): Promise<SeedResult> => {
  const result = emptySeedResult();
  try {
    const tournament = await getActiveTournament();
    if (tournament.veikkausDrilldownTagId == null) {
      result.errors.push("Tournament has no veikkausDrilldownTagId set");
      return result;
    }

    const events = await fetchVeikkausOutrights(tournament.veikkausDrilldownTagId);
    const event = events.find((e) => e.name === tournament.veikkausWinnerEvent);
    if (!event) {
      result.errors.push(`Winner market "${tournament.veikkausWinnerEvent}" not found`);
      return result;
    }

    const outcomes = event.markets?.[0]?.outcomes ?? [];
    for (const outcome of outcomes) {
      const name = outcome.name?.trim();
      const decimal = outcome.prices?.[0]?.decimal;
      if (!name || decimal == null) {
        result.skipped++;
        continue;
      }

      const existing = await prisma.team.findUnique({ where: { name } });
      if (!existing) {
        if (!result.unmapped.includes(name)) result.unmapped.push(name);
        continue;
      }

      await prisma.team.update({
        where: { name },
        data: { winningOdds: oddsToInt(decimal) },
      });
      result.updated++;
    }

    return result;
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : "updateTeamOdds failed");
    return result;
  }
};
