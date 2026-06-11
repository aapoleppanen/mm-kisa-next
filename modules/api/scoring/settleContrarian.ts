import prisma from "@/lib/prisma";
import type { Config } from "@prisma/client";
import { syncUserPointsFromPicks } from "./updateUserPoints";

/**
 * Contrarian outcome scoring (no betting). For each finished match, a correct
 * 1X2 pick scores `1 + k * (1 - p)`, where:
 *   p = share of players (who picked this match) who chose the winning outcome
 *   k = cfg.contrarianFactor
 * A correct pick on a popular outcome (high p) is worth ~1; a correct pick on
 * a rarely-chosen outcome (low p) approaches `1 + k`. Wrong picks score 0.
 */
export async function settleContrarian(cfg: Config): Promise<void> {
  const k = cfg.contrarianFactor;

  // Zero out picks on matches that aren't resolved yet.
  await prisma.$executeRaw`
    UPDATE "Pick" p SET "awardedPoints" = 0
    FROM "Match" m
    WHERE p."matchId" = m.id
      AND (m.result IS NULL OR m.result = 'NO_RESULT')
  `;

  await prisma.$executeRaw`
    WITH counts AS (
      SELECT
        m.id AS "matchId",
        m.result,
        COUNT(*)::float AS "totalCount",
        COUNT(*) FILTER (WHERE p."pickedResult" = m.result)::float AS "winnerCount"
      FROM "Match" m
      JOIN "Pick" p ON p."matchId" = m.id
      WHERE m.result IS NOT NULL AND m.result <> 'NO_RESULT'
        AND p."pickedResult" IS NOT NULL
      GROUP BY m.id, m.result
    )
    UPDATE "Pick" p SET "awardedPoints" =
      CASE
        WHEN p."pickedResult" = c.result AND c."totalCount" > 0
          THEN 1 + ${k}::float * (1 - c."winnerCount" / c."totalCount")
        ELSE 0
      END
    FROM counts c
    WHERE p."matchId" = c."matchId"
  `;

  await syncUserPointsFromPicks(cfg);
}
