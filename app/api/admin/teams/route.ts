import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { TeamCreateSchema } from "@/lib/admin-schemas";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const parsed = TeamCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const team = await prisma.team.create({ data: parsed.data });
  return NextResponse.json(team);
}
