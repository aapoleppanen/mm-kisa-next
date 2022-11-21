import { updateMatchOdds } from "../../../modules/api/odds/updateMatchOdds";
import { updatePlayerOdds } from "../../../modules/api/odds/updatePlayerOdds";
import { updateTeamOdds } from "../../../modules/api/odds/updateTeamOdds";

export default async function handle(req, res) {
  // const team = await updateTeamOdds();
  // const player = await updatePlayerOdds();
  const match = await updateMatchOdds();
  res.json({ match });
}
