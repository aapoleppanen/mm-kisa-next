import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { MatchCreateSchema } from "@/lib/admin-schemas";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const parsed = MatchCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const match = await prisma.match.create({
    data: {
      homeId: parsed.data.homeId,
      awayId: parsed.data.awayId,
      startTime: new Date(parsed.data.startTime),
      stage: parsed.data.stage,
      source: "MANUAL",
    },
    include: { home: true, away: true },
  });
  return NextResponse.json(match);
}
