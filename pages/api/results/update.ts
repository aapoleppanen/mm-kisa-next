import { updateResults } from "../../../modules/api/results/updateResults";

export default async function handle(req, res) {
  const matches = await updateResults();
  res.json({ matches });
}
