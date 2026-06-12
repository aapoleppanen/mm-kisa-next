import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import prisma from "@/lib/prisma";
import { fetchResults } from "@/modules/api/results/fetchResults";
import { settleAll } from "@/modules/api/scoring/settle";

// Manual "refresh results & recompute" — mirrors the scheduled /api/cron.
// Uses the active fixture source (ESPN) via fetchResults; never the legacy
// football-data upsert (which created duplicate matches) or the dead Veikkaus
// odds endpoint. Refresh outright odds from the dedicated admin buttons instead.
export async function POST() {
  const { error } = await requireAdmin();
  if (error) return error;

  const results = await fetchResults();
  await settleAll();
  await prisma.config.update({
    where: { id: 1 },
    data: { lastCronRunAt: new Date() },
  });
  revalidatePath("/leaderboard");

  return NextResponse.json({ results, settled: true });
}
