import { NextResponse } from "next/server";
import { Result } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getConfig } from "@/lib/config";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const matchId = parseInt(id, 10);
  if (isNaN(matchId)) {
    return NextResponse.json({ error: "Invalid match id" }, { status: 400 });
  }

  const cfg = await getConfig();
  const rakeFactor = 1 - cfg.rakePercent / 100;

  const picks = await prisma.pick.findMany({
    where: { matchId },
    select: { betAmount: true, pickedResult: true },
  });

  const pool = picks.reduce((sum, p) => sum + p.betAmount, 0);
  const byOutcome = {
    [Result.HOME_TEAM]: 0,
    [Result.DRAW]: 0,
    [Result.AWAY_TEAM]: 0,
  };

  for (const p of picks) {
    if (p.pickedResult && p.pickedResult in byOutcome) {
      byOutcome[p.pickedResult as keyof typeof byOutcome] += p.betAmount;
    }
  }

  const multipliers = {
    HOME_TEAM: byOutcome.HOME_TEAM > 0 ? (pool * rakeFactor) / byOutcome.HOME_TEAM : null,
    DRAW: byOutcome.DRAW > 0 ? (pool * rakeFactor) / byOutcome.DRAW : null,
    AWAY_TEAM: byOutcome.AWAY_TEAM > 0 ? (pool * rakeFactor) / byOutcome.AWAY_TEAM : null,
  };

  return NextResponse.json({ pool, byOutcome, multipliers });
}
