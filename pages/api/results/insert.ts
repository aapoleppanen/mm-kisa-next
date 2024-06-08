import { insertTeams } from "../../../modules/api/insert/insertTeams";
import { updateResults } from "../../../modules/api/results/updateResults";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  const teams = await insertTeams();
  const matches = await updateResults();
  res.json({ teams, matches });
}
