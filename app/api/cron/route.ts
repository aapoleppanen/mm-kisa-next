import { getConfig, isPrePicksLocked } from "@/lib/config";
import prisma from "@/lib/prisma";
import { getActiveTournament } from "@/lib/tournament";
import { updateMatchOdds } from "@/modules/api/odds/updateMatchOdds";
import { updatePlayerOdds } from "@/modules/api/odds/updatePlayerOdds";
import { updateTeamOdds } from "@/modules/api/odds/updateTeamOdds";
import { fetchResults } from "@/modules/api/results/fetchResults";
import { settleAll } from "@/modules/api/scoring/settle";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function verifyCronAuth(request: Request): Promise<boolean> {
  const cfg = await getConfig();
  const secret = cfg.cronSecret ?? process.env.CRON_SECRET;
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!(await verifyCronAuth(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cfg = await getConfig();
  const tournament = await getActiveTournament();
  const prePicksLocked = await isPrePicksLocked(cfg.prePicksLockAt);
  const useVeikkausOdds = tournament.fixtureSource === "VEIKKAUS";

  if (!prePicksLocked) {
    const odds = useVeikkausOdds
      ? await Promise.all([updateTeamOdds(), updatePlayerOdds(), updateMatchOdds()])
      : null;
    await prisma.config.update({
      where: { id: 1 },
      data: { lastCronRunAt: new Date() },
    });
    if (useVeikkausOdds) {
      const [team, player, match] = odds!;
      return Response.json({ team, player, match });
    }
    return Response.json({ oddsSkipped: true });
  }

  const results = await fetchResults();
  const matchOdds = useVeikkausOdds ? await updateMatchOdds() : null;
  await settleAll();
  await prisma.config.update({
    where: { id: 1 },
    data: { lastCronRunAt: new Date() },
  });
  revalidatePath("/leaderboard");

  return Response.json({ results, matchOdds, settled: true });
}
