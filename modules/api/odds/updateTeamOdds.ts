import request from "graphql-request";
import { veikkausGraphQlEndpoint } from "../../../lib/config";
import prisma from "../../../lib/prisma";
import { events } from "./queries";
import { EventsResponse } from "./types";
import { getActiveTournament, veikkausVariables } from "@/lib/tournament";
import { getTeamNameMap } from "@/lib/team-map";
import { emptySeedResult, type SeedResult } from "@/lib/seed-result";

export const updateTeamOdds = async (): Promise<SeedResult> => {
  const result = emptySeedResult();
  try {
    const tournament = await getActiveTournament();
    const teamMap = await getTeamNameMap();
    const response = await request<EventsResponse>(
      veikkausGraphQlEndpoint,
      events,
      veikkausVariables(tournament)
    );

    for (const event of response.sports[0].tournaments[0].events) {
      if (event.name !== tournament.veikkausWinnerEvent) continue;

      for (const comp of event.ebetDraws[0].row.competitors) {
        const fdName = teamMap[comp.name];
        if (!fdName) {
          if (!result.unmapped.includes(comp.name)) result.unmapped.push(comp.name);
          continue;
        }

        const existing = await prisma.team.findUnique({ where: { name: fdName } });
        if (!existing) {
          result.unmapped.push(fdName);
          continue;
        }

        await prisma.team.update({
          where: { name: fdName },
          data: { winningOdds: comp.odds },
        });
        result.updated++;
      }
    }

    return result;
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : "updateTeamOdds failed");
    return result;
  }
};
