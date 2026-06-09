import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { getConfig, isPrePicksLocked } from "@/lib/config";
import { updateMatchOdds } from "@/modules/api/odds/updateMatchOdds";
import { updatePlayerOdds } from "@/modules/api/odds/updatePlayerOdds";
import { updateTeamOdds } from "@/modules/api/odds/updateTeamOdds";
import { updateResults } from "@/modules/api/results/updateResults";
import { settleAll } from "@/modules/api/scoring/settle";

export async function POST() {
  const { error } = await requireAdmin();
  if (error) return error;

  const cfg = await getConfig();

  if (!isPrePicksLocked(cfg.prePicksLockAt)) {
    const [team, player, match] = await Promise.all([
      updateTeamOdds(),
      updatePlayerOdds(),
      updateMatchOdds(),
    ]);
    return NextResponse.json({ team, player, match });
  }

  const [results, matchOdds] = await Promise.all([
    updateResults(),
    updateMatchOdds(),
  ]);
  await settleAll();
  revalidatePath("/leaderboard");

  return NextResponse.json({ results, matchOdds, settled: true });
}
