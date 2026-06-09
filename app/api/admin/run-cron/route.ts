import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { getConfig, isPrePicksLocked } from "@/lib/config";
import prisma from "@/lib/prisma";
import { updateMatchOdds } from "@/modules/api/odds/updateMatchOdds";
import { updatePlayerOdds } from "@/modules/api/odds/updatePlayerOdds";
import { updateTeamOdds } from "@/modules/api/odds/updateTeamOdds";
import { updateResults } from "@/modules/api/results/updateResults";
import { settleAll } from "@/modules/api/scoring/settle";

export async function POST() {
  const { error } = await requireAdmin();
  if (error) return error;

  const cfg = await getConfig();
  const prePicksLocked = await isPrePicksLocked(cfg.prePicksLockAt);

  if (!prePicksLocked) {
    const [team, player, match] = await Promise.all([
      updateTeamOdds(),
      updatePlayerOdds(),
      updateMatchOdds(),
    ]);
    await prisma.config.update({
      where: { id: 1 },
      data: { lastCronRunAt: new Date() },
    });
    return NextResponse.json({ team, player, match });
  }

  const [results, matchOdds] = await Promise.all([
    updateResults(),
    updateMatchOdds(),
  ]);
  await settleAll();
  await prisma.config.update({
    where: { id: 1 },
    data: { lastCronRunAt: new Date() },
  });
  revalidatePath("/leaderboard");

  return NextResponse.json({ results, matchOdds, settled: true });
}
