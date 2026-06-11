import { auth } from "@/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Result } from "@prisma/client";
import prisma from "@/lib/prisma";
import { disabledToday, getConfig, maxBetForStage } from "@/lib/config";
import { roundNumber } from "@/utils/numberUtils";
import { User } from "@prisma/client";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const ResultEnum = z.enum(["HOME_TEAM", "AWAY_TEAM", "DRAW", "NO_RESULT"]);

const PickSchema = z.object({
  matchId: z.number().int(),
  result: ResultEnum.optional(),
  betAmount: z.number().min(0).optional(),
  predHome: z.number().int().min(0).optional(),
  predAway: z.number().int().min(0).optional(),
  clear: z.boolean().optional(),
});

async function getUserCreditsView(userId: string) {
  const rows = (await prisma.$queryRaw`
    SELECT * FROM "UserCreditsView" WHERE "userId" = ${userId} LIMIT 1
  `) as { remainingCredits: User["remainingCredits"]; userId: User["id"] }[];
  return rows[0];
}

function predToResult(predHome: number, predAway: number): Result {
  if (predHome > predAway) return Result.HOME_TEAM;
  if (predHome < predAway) return Result.AWAY_TEAM;
  return Result.DRAW;
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  const rl = rateLimit(`pick:${ip}`, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.id) {
    return NextResponse.json({ error: "Please sign in" }, { status: 403 });
  }

  const cfg = await getConfig();
  if (cfg.maintenanceMode) {
    return NextResponse.json({ error: "Maintenance mode" }, { status: 503 });
  }

  const body = await request.json();
  const parsed = PickSchema.safeParse({
    ...body,
    betAmount: body.betAmount != null ? roundNumber(body.betAmount) : undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { matchId, result, betAmount = 0, predHome, predAway, clear } = parsed.data;
  const userId = session.user.id;
  const isExactScore = cfg.scoringMode === "EXACT_SCORE";
  const isContrarian = cfg.scoringMode === "CONTRARIAN";

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { startTime: true, stage: true },
  });
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const maxBet = maxBetForStage(match.stage, cfg.maxBetAmount);

  if (isExactScore) {
    if (clear || predHome == null || predAway == null) {
      try {
        await prisma.pick.delete({ where: { userId_matchId: { userId, matchId } } });
      } catch {}
      const updatedUser = await getUserCreditsView(userId);
      return NextResponse.json({
        remainingCredits: updatedUser?.remainingCredits ?? 0,
        betAmount: 0,
        notification: "Cleared prediction",
      });
    }

    if (disabledToday(match.startTime, cfg.lockLeadHours)) {
      return NextResponse.json({ error: "Too late" }, { status: 403 });
    }

    const pickedResult = predToResult(predHome, predAway);
    await prisma.pick.upsert({
      where: { userId_matchId: { userId, matchId } },
      create: { matchId, userId, predHome, predAway, pickedResult, betAmount: 0 },
      update: { predHome, predAway, pickedResult, betAmount: 0 },
    });

    const updatedUser = await getUserCreditsView(userId);
    return NextResponse.json({
      remainingCredits: updatedUser?.remainingCredits ?? 0,
      betAmount: 0,
      predHome,
      predAway,
      notification: "Prediction saved",
    });
  }

  if (isContrarian) {
    // Outcome-only pick, no stake.
    if (clear || !result || result === Result.NO_RESULT) {
      try {
        await prisma.pick.delete({ where: { userId_matchId: { userId, matchId } } });
      } catch {}
      return NextResponse.json({ remainingCredits: 0, betAmount: 0, notification: "Cleared pick" });
    }

    if (disabledToday(match.startTime, cfg.lockLeadHours)) {
      return NextResponse.json({ error: "Too late" }, { status: 403 });
    }

    await prisma.pick.upsert({
      where: { userId_matchId: { userId, matchId } },
      create: { matchId, userId, pickedResult: result, betAmount: 0 },
      update: { pickedResult: result, betAmount: 0 },
    });
    return NextResponse.json({ remainingCredits: 0, betAmount: 0, notification: "Pick saved" });
  }

  if (betAmount < 0 || betAmount > maxBet) {
    return NextResponse.json({ error: "Invalid bet amount" }, { status: 403 });
  }

  if (!result || result === Result.NO_RESULT || betAmount === 0) {
    try {
      await prisma.pick.delete({ where: { userId_matchId: { userId, matchId } } });
    } catch {}
    const updatedUser = await getUserCreditsView(userId);
    return NextResponse.json({
      remainingCredits: updatedUser?.remainingCredits ?? 0,
      betAmount: 0,
      notification: "Cleared bet successfully",
    });
  }

  const pick = await prisma.pick.findFirst({
    where: { matchId, userId },
  });

  const user = await getUserCreditsView(userId);

  if (!user || (betAmount > user.remainingCredits && pick && pick.betAmount < betAmount)) {
    return NextResponse.json(
      { error: "Failed to make bet. Not enough remaining credits." },
      { status: 403 }
    );
  }

  if (disabledToday(match.startTime, cfg.lockLeadHours)) {
    return NextResponse.json({ error: "Too late" }, { status: 403 });
  }

  if (pick) {
    await prisma.pick.update({
      where: { id: pick.id },
      data: { pickedResult: result, betAmount },
    });
  } else {
    await prisma.pick.create({
      data: { matchId, userId, pickedResult: result, betAmount },
    });
  }

  const updatedUser = await getUserCreditsView(userId);
  return NextResponse.json({
    remainingCredits: updatedUser?.remainingCredits ?? 0,
    betAmount,
  });
}
