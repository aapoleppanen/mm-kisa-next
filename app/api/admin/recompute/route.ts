import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { settleAll } from "@/modules/api/scoring/settle";

export async function POST() {
  const { error } = await requireAdmin();
  if (error) return error;

  await settleAll();
  revalidatePath("/leaderboard");

  return NextResponse.json({ ok: true });
}
