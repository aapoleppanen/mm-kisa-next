import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getConfig } from "@/lib/config";
import { StageResetSchema } from "@/lib/config-schema";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const parsed = StageResetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const cfg = await getConfig();
  const { stage } = parsed.data;

  const matches = await prisma.match.findMany({
    where: { stage },
    select: { id: true },
  });
  const matchIds = matches.map((m) => m.id);

  if (matchIds.length > 0) {
    await prisma.pick.deleteMany({ where: { matchId: { in: matchIds } } });
  }

  await prisma.user.updateMany({
    data: { credits: cfg.startingCredits },
  });

  return NextResponse.json({ ok: true, clearedMatches: matchIds.length });
}
