import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { TeamUpdateSchema } from "@/lib/admin-schemas";
import prisma from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = TeamUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const team = await prisma.team.update({
    where: { id: Number(id) },
    data: parsed.data,
  });
  return NextResponse.json(team);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  await prisma.team.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
