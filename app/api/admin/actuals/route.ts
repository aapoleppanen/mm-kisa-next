import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { ActualsSchema } from "@/lib/admin-schemas";
import { settleAll } from "@/modules/api/scoring/settle";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const parsed = ActualsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const config = await prisma.config.update({
    where: { id: 1 },
    data: {
      actualWinnerTeamId: parsed.data.actualWinnerTeamId,
      actualTopScorerId: parsed.data.actualTopScorerId,
    },
  });

  await settleAll();
  revalidatePath("/leaderboard");

  return NextResponse.json(config);
}
