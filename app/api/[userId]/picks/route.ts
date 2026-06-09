import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  const picks = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      picks: {
        include: {
          match: {
            include: { home: true, away: true },
          },
        },
        orderBy: { match: { startTime: "asc" } },
      },
      winnerPick: true,
      topScorerPick: true,
    },
  });

  return NextResponse.json({ picks });
}
