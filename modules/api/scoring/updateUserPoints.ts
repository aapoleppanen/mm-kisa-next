import prisma from "@/lib/prisma";
import type { Config } from "@prisma/client";
import { decimalOdds } from "@/lib/config";

function log2OddsBonus(oddsInt: number, factor: number): number {
  const decimal = decimalOdds(oddsInt);
  if (decimal <= 1) return 0;
  return (Math.log(decimal) / Math.LN2) * factor;
}

export async function syncUserPointsFromPicks(cfg: Config): Promise<void> {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      teamId: true,
      playerId: true,
      picks: { select: { awardedPoints: true } },
      winnerPick: { select: { winningOdds: true } },
      topScorerPick: { select: { odds: true } },
    },
  });

  await Promise.all(
    users.map((user) => {
      const pickTotal = user.picks.reduce((sum, p) => sum + p.awardedPoints, 0);
      let bonus = 0;
      if (cfg.actualWinnerTeamId && user.teamId === cfg.actualWinnerTeamId && user.winnerPick) {
        bonus += log2OddsBonus(user.winnerPick.winningOdds, cfg.winnerBonusFactor);
      }
      if (cfg.actualTopScorerId && user.playerId === cfg.actualTopScorerId && user.topScorerPick) {
        bonus += log2OddsBonus(user.topScorerPick.odds, cfg.topScorerBonusFactor);
      }
      return prisma.user.update({
        where: { id: user.id },
        data: { points: pickTotal + bonus },
      });
    })
  );
}
