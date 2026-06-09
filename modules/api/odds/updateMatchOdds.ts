import request from "graphql-request";
import { veikkausGraphQlEndpoint } from "../../../lib/config";
import prisma from "../../../lib/prisma";
import { events } from "./queries";
import { EventsResponse } from "./types";
import { getActiveTournament, veikkausVariables } from "@/lib/tournament";
import { getTeamNameMap } from "@/lib/team-map";
import { emptySeedResult, type SeedResult } from "@/lib/seed-result";
import { add } from "date-fns";

export const updateMatchOdds = async (): Promise<SeedResult> => {
  const result = emptySeedResult();
  try {
    const tournament = await getActiveTournament();
    const teamMap = await getTeamNameMap();
    const response = await request<EventsResponse>(
      veikkausGraphQlEndpoint,
      events,
      veikkausVariables(tournament)
    );

    const fixtures = response.sports[0].tournaments[0].events.filter(
      (event) => event.type == "Fixture"
    );

    for (const event of fixtures) {
      for (const draw of event.ebetDraws) {
        if (draw.row.description != "1X2") continue;

        const homeVeikkaus = draw.row.competitors[0].name;
        const awayVeikkaus = draw.row.competitors[2].name;
        const homeTeamName = teamMap[homeVeikkaus];
        const awayTeamName = teamMap[awayVeikkaus];
        const homeTeamOdds = draw.row.competitors[0].odds;
        const awayTeamOdds = draw.row.competitors[2].odds;
        const drawOdds = draw.row.competitors[1].odds;

        if (!homeTeamName) {
          if (!result.unmapped.includes(homeVeikkaus)) result.unmapped.push(homeVeikkaus);
          continue;
        }
        if (!awayTeamName) {
          if (!result.unmapped.includes(awayVeikkaus)) result.unmapped.push(awayVeikkaus);
          continue;
        }
        if (!homeTeamOdds || !awayTeamOdds || !drawOdds) {
          result.skipped++;
          continue;
        }

        const awayTeam = await prisma.team.findUnique({ where: { name: awayTeamName } });
        const homeTeam = await prisma.team.findUnique({ where: { name: homeTeamName } });

        if (!awayTeam) {
          result.unmapped.push(awayTeamName);
          continue;
        }
        if (!homeTeam) {
          result.unmapped.push(homeTeamName);
          continue;
        }

        const match = await prisma.match.findFirst({
          where: {
            homeId: homeTeam.id,
            awayId: awayTeam.id,
            startTime: { gte: add(new Date(), { hours: 1 }) },
          },
        });

        if (match) {
          await prisma.match.update({
            where: { id: match.id },
            data: { awayWinOdds: awayTeamOdds, homeWinOdds: homeTeamOdds, drawOdds },
          });
          result.updated++;
        } else {
          result.skipped++;
        }
      }
    }

    return result;
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : "updateMatchOdds failed");
    return result;
  }
};
