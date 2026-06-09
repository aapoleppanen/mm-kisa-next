import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getConfig } from "@/lib/config";
import { ConfigUpdateSchema } from "@/lib/config-schema";
import prisma from "@/lib/prisma";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const config = await getConfig();
  return NextResponse.json(config);
}

export async function PUT(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const parsed = ConfigUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const data = {
    ...parsed.data,
    prePicksLockAt:
      parsed.data.prePicksLockAt === null
        ? null
        : parsed.data.prePicksLockAt
        ? new Date(parsed.data.prePicksLockAt)
        : undefined,
  };

  const config = await prisma.config.update({
    where: { id: 1 },
    data,
  });

  return NextResponse.json(config);
}
