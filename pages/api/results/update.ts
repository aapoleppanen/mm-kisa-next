import { updateResults } from "../../../modules/api/results/updateResults";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  const matches = await updateResults();
  res.json({ matches });
}
