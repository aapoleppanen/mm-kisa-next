import prisma from "@/lib/prisma";
import type { Config } from "@prisma/client";
import { syncUserPointsFromPicks } from "./updateUserPoints";

export async function settleFixedOdds(_cfg: Config): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "Pick" p SET "awardedPoints" = 0
    FROM "Match" m
    WHERE p."matchId" = m.id
      AND (m.result IS NULL OR m.result = 'NO_RESULT')
  `;

  await prisma.$executeRaw`
    UPDATE "Pick" p SET "awardedPoints" = 0
    FROM "Match" m
    WHERE p."matchId" = m.id
      AND m.result IS NOT NULL AND m.result <> 'NO_RESULT'
      AND p."pickedResult" IS DISTINCT FROM m.result
  `;

  await prisma.$executeRaw`
    UPDATE "Pick" p SET "awardedPoints" = p."betAmount" * (
      CASE m.result
        WHEN 'HOME_TEAM' THEN m."homeWinOdds"::float / 100.0
        WHEN 'AWAY_TEAM' THEN m."awayWinOdds"::float / 100.0
        WHEN 'DRAW' THEN m."drawOdds"::float / 100.0
        ELSE 0
      END
    )
    FROM "Match" m
    WHERE p."matchId" = m.id
      AND m.result IS NOT NULL AND m.result <> 'NO_RESULT'
      AND p."pickedResult" = m.result
  `;

  await syncUserPointsFromPicks(_cfg);
}
