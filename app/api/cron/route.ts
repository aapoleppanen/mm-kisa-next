import { disablePrePicks } from "@/lib/config";
import { updateMatchOdds } from "@/modules/api/odds/updateMatchOdds";
import { updatePlayerOdds } from "@/modules/api/odds/updatePlayerOdds";
import { updateTeamOdds } from "@/modules/api/odds/updateTeamOdds";
import { updatePlayerPoints } from "@/modules/api/results/updatePlayerPoints";
import { updateResults } from "@/modules/api/results/updateResults";

export async function GET() {
  if (!disablePrePicks()) {
    const team = await updateTeamOdds();
    const player = await updatePlayerOdds();
    const match = await updateMatchOdds();

    Response.json({ team, player, match });
  }

  const results = await updateResults();
  const matchOdds = await updateMatchOdds();
  const playerPoints = await updatePlayerPoints()

  Response.json({ results, matchOdds, playerPoints });
}
