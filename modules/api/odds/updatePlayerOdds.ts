import request from "graphql-request";
import prisma from "../../../lib/prisma";
import { events } from "./queries";
import { EventsResponse } from "./types";
import { getActiveTournament, veikkausVariables } from "@/lib/tournament";
import { emptySeedResult, type SeedResult } from "@/lib/seed-result";

const veikkausGraphQlEndpoint =
  "https://v3.middle.prod.gcp.veikkaus.fi/midas/graphql";

export const updatePlayerOdds = async (): Promise<SeedResult> => {
  const result = emptySeedResult();
  try {
    const tournament = await getActiveTournament();
    const response = await request<EventsResponse>(
      veikkausGraphQlEndpoint,
      events,
      veikkausVariables(tournament)
    );

    for (const event of response.sports[0].tournaments[0].events) {
      if (event.name !== tournament.veikkausScorerEvent) continue;

      for (const player of event.ebetDraws[0].row.competitors) {
        const existing = await prisma.player.findUnique({ where: { name: player.name } });
        await prisma.player.upsert({
          where: { name: player.name },
          update: { odds: player.odds },
          create: { name: player.name, odds: player.odds },
        });
        if (existing) result.updated++;
        else result.inserted++;
      }
    }

    return result;
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : "updatePlayerOdds failed");
    return result;
  }
};
