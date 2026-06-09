import { getActiveTournament } from "@/lib/tournament";
import type { SeedResult } from "@/lib/seed-result";
import { espnFetchResults } from "../espn/espn";
import { updateResults } from "./updateResults";

export async function fetchResults(): Promise<SeedResult> {
  const t = await getActiveTournament();
  return t.fixtureSource === "ESPN" ? espnFetchResults() : updateResults();
}
