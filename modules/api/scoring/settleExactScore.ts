import prisma from "@/lib/prisma";
import type { Config } from "@prisma/client";
import { syncUserPointsFromPicks } from "./updateUserPoints";

export async function settleExactScore(cfg: Config): Promise<void> {
  const exactPts = cfg.exactScorePoints;
  const goalDiffPts = cfg.goalDiffPoints;
  const tendencyPts = cfg.tendencyPoints;

  await prisma.$executeRaw`
    UPDATE "Pick" p SET "awardedPoints" = 0
    FROM "Match" m
    WHERE p."matchId" = m.id
      AND (m.result IS NULL OR m.result = 'NO_RESULT'
        OR m."homeGoals" IS NULL OR m."awayGoals" IS NULL
        OR p."predHome" IS NULL OR p."predAway" IS NULL)
  `;

  await prisma.$executeRaw`
    UPDATE "Pick" p SET "awardedPoints" =
      CASE
        WHEN p."predHome" = m."homeGoals" AND p."predAway" = m."awayGoals" THEN ${exactPts}::float
        WHEN (p."predHome" - p."predAway") = (m."homeGoals" - m."awayGoals") THEN ${goalDiffPts}::float
        WHEN SIGN(p."predHome" - p."predAway") = SIGN(m."homeGoals" - m."awayGoals") THEN ${tendencyPts}::float
        ELSE 0
      END
    FROM "Match" m
    WHERE p."matchId" = m.id
      AND m.result IS NOT NULL AND m.result <> 'NO_RESULT'
      AND m."homeGoals" IS NOT NULL AND m."awayGoals" IS NOT NULL
      AND p."predHome" IS NOT NULL AND p."predAway" IS NOT NULL
  `;

  await syncUserPointsFromPicks(cfg);
}
