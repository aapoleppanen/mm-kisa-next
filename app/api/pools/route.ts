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

  const picks = await prisma.pick.findMany({
    where: { betAmount: { gt: 0 } },
    select: { matchId: true, betAmount: true, pickedResult: true },
  });

  const byMatch = new Map<number, { pool: number; byOutcome: OutcomeTotals }>();

  for (const p of picks) {
    let entry = byMatch.get(p.matchId);
    if (!entry) {
      entry = { pool: 0, byOutcome: emptyOutcomes() };
      byMatch.set(p.matchId, entry);
    }
    entry.pool += p.betAmount;
    if (
      p.pickedResult === Result.HOME_TEAM ||
      p.pickedResult === Result.DRAW ||
      p.pickedResult === Result.AWAY_TEAM
    ) {
      entry.byOutcome[p.pickedResult] += p.betAmount;
    }
  }

  const pools: Record<string, PoolData> = {};
  byMatch.forEach((entry, matchId) => {
    pools[matchId] = buildPoolData(entry.pool, entry.byOutcome, rakeFactor);
  });

  return NextResponse.json(pools);
}
