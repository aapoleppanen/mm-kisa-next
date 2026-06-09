import { auth } from "@/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { disablePrePicks } from "@/lib/config";

const TopScorerSchema = z.object({ playerId: z.number().int() });

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 403 });
  }

  if (disablePrePicks()) {
    return NextResponse.json({ error: "Picks are now locked" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = TopScorerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { playerId: parsed.data.playerId },
  });

  return NextResponse.json({ ok: true });
}
