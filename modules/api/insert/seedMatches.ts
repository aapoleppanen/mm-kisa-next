import { getActiveTournament } from "@/lib/tournament";
import type { SeedResult } from "@/lib/seed-result";
import { espnInsertMatches } from "../espn/espn";
import { insertMatches } from "./insertMatches";

export async function seedMatches(): Promise<SeedResult> {
  const t = await getActiveTournament();
  return t.fixtureSource === "ESPN" ? espnInsertMatches() : insertMatches();
}
