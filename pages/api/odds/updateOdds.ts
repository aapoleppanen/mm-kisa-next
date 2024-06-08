import { disablePrePicks } from "../../../lib/config";
import { updateMatchOdds } from "../../../modules/api/odds/updateMatchOdds";
import { updatePlayerOdds } from "../../../modules/api/odds/updatePlayerOdds";
import { updateTeamOdds } from "../../../modules/api/odds/updateTeamOdds";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  if (!disablePrePicks) {
    const team = await updateTeamOdds();
    const player = await updatePlayerOdds();
  }
  const match = await updateMatchOdds();
  res.json({ match });
}
