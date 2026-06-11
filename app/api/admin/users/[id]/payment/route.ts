import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import prisma from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const { hasPaid } = await request.json();

  if (typeof hasPaid !== "boolean") {
    return NextResponse.json({ error: "hasPaid must be boolean" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id },
    data: { hasPaid },
    select: { id: true, hasPaid: true },
  });

  return NextResponse.json(user);
}
