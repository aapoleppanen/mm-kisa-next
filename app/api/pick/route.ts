import { auth } from "@/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { disabledToday, maxBetAmount } from "@/lib/config";
import { roundNumber } from "@/utils/numberUtils";
import { User } from "@prisma/client";

const PickSchema = z.object({
  matchId: z.number().int(),
  result: z.string().optional(),
  betAmount: z.number().min(0),
});

async function getUserCreditsView(userId: string) {
  const rows = (await prisma.$queryRaw`
    SELECT * FROM "UserCreditsView" WHERE "userId" = ${userId} LIMIT 1
  `) as { remainingCredits: User["remainingCredits"]; userId: User["id"] }[];
  return rows[0];
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.id) {
    return NextResponse.json({ error: "Please sign in" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = PickSchema.safeParse({
    ...body,
    betAmount: roundNumber(body.betAmount),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { matchId, result, betAmount } = parsed.data;
  const userId = session.user.id;

  if (betAmount < 0 || betAmount > maxBetAmount) {
    return NextResponse.json({ error: "Invalid bet amount" }, { status: 403 });
  }

  if (!result || result === "" || betAmount === 0) {
    try {
      await prisma.pick.delete({
        where: { userId_matchId: { userId, matchId } },
      });
    } catch {}
    const updatedUser = await getUserCreditsView(userId);
    return NextResponse.json({
      remainingCredits: updatedUser.remainingCredits,
      betAmount: 0,
      notification: "Cleared bet successfully",
    });
  }

  const pick = await prisma.pick.findFirst({
    where: { matchId, userId },
    include: { match: { select: { startTime: true } } },
  });

  const user = await getUserCreditsView(userId);

  if (!user || (betAmount > user.remainingCredits && pick && pick.betAmount < betAmount)) {
    return NextResponse.json(
      { error: "Failed to make bet. Not enough remaining credits." },
      { status: 403 }
    );
  }

  if (pick) {
    if (disabledToday(pick.match.startTime)) {
      return NextResponse.json({ error: "Too late" }, { status: 403 });
    }

    await prisma.pick.update({
      where: { id: pick.id },
      data: { pickedResult: result as any, betAmount },
    });

    const updatedUser = await getUserCreditsView(userId);
    return NextResponse.json({ remainingCredits: updatedUser.remainingCredits, betAmount });
  }

  await prisma.pick.create({
    data: { matchId, userId, pickedResult: result as any, betAmount },
  });

  return NextResponse.json({
    remainingCredits: user.remainingCredits - betAmount,
    betAmount,
  });
}
