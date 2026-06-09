import prisma from "@/lib/prisma";
import type { Config } from "@prisma/client";
import { syncUserPointsFromPicks } from "./updateUserPoints";

export async function settlePariMutuel(cfg: Config): Promise<void> {
  const rake = cfg.rakePercent;

  await prisma.$executeRaw`
    UPDATE "Pick" p SET "awardedPoints" = 0
    FROM "Match" m
    WHERE p."matchId" = m.id
      AND (m.result IS NULL OR m.result = 'NO_RESULT')
  `;

  await prisma.$executeRaw`
    WITH pools AS (
      SELECT m.id AS "matchId", m.result,
        SUM(p."betAmount") AS pool,
        SUM(p."betAmount") FILTER (WHERE p."pickedResult" = m.result) AS "winningPool"
      FROM "Match" m
      JOIN "Pick" p ON p."matchId" = m.id
      WHERE m.result IS NOT NULL AND m.result <> 'NO_RESULT'
      GROUP BY m.id, m.result
    )
    UPDATE "Pick" p SET "awardedPoints" =
      CASE
        WHEN po."winningPool" IS NULL OR po."winningPool" = 0 THEN p."betAmount"
        WHEN p."pickedResult" = po.result THEN
          p."betAmount" * po.pool * (1 - ${rake}::float / 100.0) / po."winningPool"
        ELSE 0
      END
    FROM pools po
    WHERE p."matchId" = po."matchId"
  `;

  await syncUserPointsFromPicks(cfg);
}
