import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { TournamentSchema } from "@/lib/admin-schemas";
import { getActiveTournament } from "@/lib/tournament";
import prisma from "@/lib/prisma";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const tournament = await getActiveTournament();
  const all = await prisma.tournament.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json({ active: tournament, all });
}

export async function PUT(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const parsed = TournamentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const data = {
    ...parsed.data,
    startDate: new Date(parsed.data.startDate),
    isActive: parsed.data.isActive ?? true,
  };

  if (data.isActive) {
    await prisma.tournament.updateMany({ data: { isActive: false } });
  }

  const existing = await prisma.tournament.findFirst({ where: { isActive: true } });
  const tournament = existing
    ? await prisma.tournament.update({ where: { id: existing.id }, data })
    : await prisma.tournament.create({ data });

  return NextResponse.json(tournament);
}
