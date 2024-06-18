import { disablePrePicks } from "@/lib/config";
import { updateMatchOdds } from "@/modules/api/odds/updateMatchOdds";
import { updatePlayerOdds } from "@/modules/api/odds/updatePlayerOdds";
import { updateTeamOdds } from "@/modules/api/odds/updateTeamOdds";
import { updatePlayerPoints } from "@/modules/api/results/updatePlayerPoints";
import { updateResults } from "@/modules/api/results/updateResults";
import { revalidatePath } from "next/cache";

export const dynamic = 'force-dynamic'
export const revalidate = 0;

export async function GET() {
  if (!disablePrePicks()) {
    const team = await updateTeamOdds();
    const player = await updatePlayerOdds();
    const match = await updateMatchOdds();

    return Response.json({ team, player, match });
  }

  const results = await updateResults();
  const matchOdds = await updateMatchOdds();
  const playerPoints = await updatePlayerPoints()

  revalidatePath('/leaderboard')

  return Response.json({ results, matchOdds, playerPoints });
}
