import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { MatchResultSchema } from "@/lib/config-schema";
import prisma from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const matchId = parseInt(id, 10);
  if (isNaN(matchId)) {
    return NextResponse.json({ error: "Invalid match id" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = MatchResultSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const match = await prisma.match.update({
    where: { id: matchId },
    data: {
      result: parsed.data.result,
      homeGoals: parsed.data.homeGoals ?? undefined,
      awayGoals: parsed.data.awayGoals ?? undefined,
      resultOverridden: true,
    },
  });

  return NextResponse.json(match);
}
