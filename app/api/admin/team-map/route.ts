import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { TeamMapUpdateSchema } from "@/lib/admin-schemas";
import prisma from "@/lib/prisma";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const aliases = await prisma.teamNameAlias.findMany({
    include: { team: { select: { id: true, name: true } } },
    orderBy: { veikkausName: "asc" },
  });
  return NextResponse.json(aliases);
}

export async function PUT(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const parsed = TeamMapUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  for (const entry of parsed.data.aliases) {
    await prisma.teamNameAlias.upsert({
      where: { veikkausName: entry.veikkausName },
      update: { teamId: entry.teamId },
      create: { veikkausName: entry.veikkausName, teamId: entry.teamId },
    });
  }

  const aliases = await prisma.teamNameAlias.findMany({
    include: { team: { select: { id: true, name: true } } },
    orderBy: { veikkausName: "asc" },
  });
  return NextResponse.json(aliases);
}
