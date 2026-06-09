import { getActiveTournament } from "@/lib/tournament";
import type { SeedResult } from "@/lib/seed-result";
import { espnSeedTeams } from "../espn/espn";
import { insertTeams } from "./insertTeams";

export async function seedTeams(): Promise<SeedResult> {
  const t = await getActiveTournament();
  return t.fixtureSource === "ESPN" ? espnSeedTeams() : insertTeams();
}
