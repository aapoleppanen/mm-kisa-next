import { auth } from "@/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { disabledToday, getConfig, isPrePicksLocked } from "@/lib/config";

// A pick is only revealed to others once its match has locked (picks closed),
// to stop players copying each other while betting is open. The owner always
// sees their own picks. Outright (winner / top-scorer) picks reveal once the
// tournament-wide pre-picks deadline passes.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 403 });
  }

  const { userId } = await params;
  const isOwner = session.user.id === userId;
  const cfg = await getConfig();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      picks: {
        include: { match: { include: { home: true, away: true } } },
        orderBy: { match: { startTime: "asc" } },
      },
      winnerPick: true,
      topScorerPick: true,
    },
  });

  if (!user) return NextResponse.json({ picks: null });

  const picks = user.picks.map((p) => {
    const revealed = isOwner || disabledToday(p.match.startTime, cfg.lockLeadHours);
    if (revealed) return { ...p, locked: false };
    // Redact the prediction itself; keep the match so the UI can show a
    // "hidden until lock" row.
    return {
      ...p,
      locked: true,
      pickedResult: null,
      predHome: null,
      predAway: null,
      betAmount: 0,
      awardedPoints: 0,
    };
  });

  const outrightsRevealed = isOwner || (await isPrePicksLocked(cfg.prePicksLockAt));

  return NextResponse.json({
    picks: {
      ...user,
      picks,
      winnerPick: outrightsRevealed ? user.winnerPick : null,
      topScorerPick: outrightsRevealed ? user.topScorerPick : null,
      outrightsLocked: !outrightsRevealed,
    },
  });
}
