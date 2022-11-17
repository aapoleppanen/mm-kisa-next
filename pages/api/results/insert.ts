import { insertTeams } from "../../../modules/api/insert/insertTeams";
import { updateResults } from "../../../modules/api/results/updateResults";

export default async function handle(req, res) {
  const teams = await insertTeams();
  const matches = await updateResults();
  res.json({ teams, matches });
}
