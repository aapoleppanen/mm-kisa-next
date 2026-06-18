import prisma from "@/lib/prisma";
import type { Config } from "@prisma/client";

/**
 * Materialise a default 0–0 prediction for every player who left a now-locked
 * match blank, so "didn't pick" is scored exactly as the UI shows it (0–0)
 * instead of silently counting for nothing.
 *
 * Only meaningful in EXACT_SCORE mode, where a blank pick has an obvious default
 * (the score steppers start at 0–0). A match is "locked" once we are within
 * lockLeadHours of kickoff — the same threshold the pick API enforces.
 *
 * Scope: only users who have ever made a pick, i.e. actual participants. Someone
 * who signed up but never played is not silently entered into every game.
 *
 * Idempotent: the NOT EXISTS skips users who already picked, and ON CONFLICT
 * guards against a player saving a pick in the same window the cron runs.
 *
 * @returns number of default picks inserted this run
 */
export async function fillDefaultPicks(cfg: Config): Promise<number> {
  if (cfg.scoringMode !== "EXACT_SCORE") return 0;

  const inserted = await prisma.$executeRaw`
    INSERT INTO "Pick" ("matchId", "userId", "predHome", "predAway", "pickedResult", "betAmount", "awardedPoints", "createdAt", "updatedAt")
    SELECT m.id, u.id, 0, 0, 'DRAW'::"Result", 0, 0, NOW(), NOW()
    FROM "Match" m
    CROSS JOIN "User" u
    WHERE m.result IS NULL
      AND m."startTime" < NOW() + (${cfg.lockLeadHours} * interval '1 hour')
      AND EXISTS (SELECT 1 FROM "Pick" played WHERE played."userId" = u.id)
      AND NOT EXISTS (
        SELECT 1 FROM "Pick" p WHERE p."matchId" = m.id AND p."userId" = u.id
      )
    ON CONFLICT ("userId", "matchId") DO NOTHING
  `;

  return inserted;
}
