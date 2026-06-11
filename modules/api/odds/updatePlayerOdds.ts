import prisma from "../../../lib/prisma";
import {
  fetchVeikkausOutrights,
  getActiveTournament,
  oddsToInt,
} from "@/lib/tournament";
import { emptySeedResult, type SeedResult } from "@/lib/seed-result";

// Golden-boot (top scorer) odds, from the Veikkaus content-service (free, no key).
// Also seeds the candidate Player list (upsert by name).
export const updatePlayerOdds = async (): Promise<SeedResult> => {
  const result = emptySeedResult();
  try {
    const tournament = await getActiveTournament();
    if (tournament.veikkausDrilldownTagId == null) {
      result.errors.push("Tournament has no veikkausDrilldownTagId set");
      return result;
    }

    const events = await fetchVeikkausOutrights(tournament.veikkausDrilldownTagId);
    const event = events.find((e) => e.name === tournament.veikkausScorerEvent);
    if (!event) {
      result.errors.push(`Top-scorer market "${tournament.veikkausScorerEvent}" not found`);
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

      const existing = await prisma.player.findUnique({ where: { name } });
      await prisma.player.upsert({
        where: { name },
        update: { odds: oddsToInt(decimal) },
        create: { name, odds: oddsToInt(decimal) },
      });
      if (existing) result.updated++;
      else result.inserted++;
    }

    return result;
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : "updatePlayerOdds failed");
    return result;
  }
};
