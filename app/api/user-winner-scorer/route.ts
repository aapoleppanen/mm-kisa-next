import { auth } from "@/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { teamId: true, playerId: true },
  });

  return NextResponse.json({
    teamPick: user?.teamId ?? null,
    playerPick: user?.playerId ?? null,
  });
}
