import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { MatchUpdateSchema } from "@/lib/admin-schemas";
import prisma from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = MatchUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const data = {
    ...parsed.data,
    startTime: parsed.data.startTime ? new Date(parsed.data.startTime) : undefined,
  };

  const match = await prisma.match.update({
    where: { id: Number(id) },
    data,
    include: { home: true, away: true },
  });
  return NextResponse.json(match);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  await prisma.match.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
