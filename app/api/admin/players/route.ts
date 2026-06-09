import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { PlayerCreateSchema } from "@/lib/admin-schemas";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const parsed = PlayerCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const player = await prisma.player.create({ data: parsed.data });
  return NextResponse.json(player);
}
