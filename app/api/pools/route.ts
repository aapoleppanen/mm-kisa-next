import { NextResponse } from "next/server";
import { Result } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getConfig } from "@/lib/config";
import type { PoolData } from "@/lib/pools";

type OutcomeTotals = {
  [Result.HOME_TEAM]: number;
  [Result.DRAW]: number;
  [Result.AWAY_TEAM]: number;
};

function emptyOutcomes(): OutcomeTotals {
  return {
    [Result.HOME_TEAM]: 0,
    [Result.DRAW]: 0,
    [Result.AWAY_TEAM]: 0,
  };
}

function buildPoolData(pool: number, byOutcome: OutcomeTotals, rakeFactor: number): PoolData {
  return {
    pool,
    multipliers: {
      HOME_TEAM: byOutcome.HOME_TEAM > 0 ? (pool * rakeFactor) / byOutcome.HOME_TEAM : null,
      DRAW: byOutcome.DRAW > 0 ? (pool * rakeFactor) / byOutcome.DRAW : null,
      AWAY_TEAM: byOutcome.AWAY_TEAM > 0 ? (pool * rakeFactor) / byOutcome.AWAY_TEAM : null,
    },
  };
}

export async function GET() {
  const cfg = await getConfig();
  const rakeFactor = 1 - cfg.rakePercent / 100;

  // Aggregate in Postgres (sum per match + outcome) instead of pulling every pick row.
  const grouped = await prisma.pick.groupBy({
    by: ["matchId", "pickedResult"],
    where: { betAmount: { gt: 0 } },
    _sum: { betAmount: true },
  });

  const byMatch = new Map<number, { pool: number; byOutcome: OutcomeTotals }>();

  for (const g of grouped) {
    const amount = g._sum.betAmount ?? 0;
    let entry = byMatch.get(g.matchId);
    if (!entry) {
      entry = { pool: 0, byOutcome: emptyOutcomes() };
      byMatch.set(g.matchId, entry);
    }
    entry.pool += amount;
    if (
      g.pickedResult === Result.HOME_TEAM ||
      g.pickedResult === Result.DRAW ||
      g.pickedResult === Result.AWAY_TEAM
    ) {
      entry.byOutcome[g.pickedResult] += amount;
    }
  }

  const pools: Record<string, PoolData> = {};
  byMatch.forEach((entry, matchId) => {
    pools[matchId] = buildPoolData(entry.pool, entry.byOutcome, rakeFactor);
  });

  return NextResponse.json(pools);
}
