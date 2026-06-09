import request from "graphql-request";
import { veikkausGraphQlEndpoint } from "../../../lib/config";
import prisma from "../../../lib/prisma";
import { euro2024Variables, events } from "./queries";
import { EventsResponse } from "./types";
import { VeikkausFDEuroTeamMap } from "../../../utils/adapterUtils";
import { add } from "date-fns";

const VeikkausFDTeamMap = VeikkausFDEuroTeamMap;

export const updateMatchOdds = async () => {
  try {
    const response = await request<EventsResponse>(
      veikkausGraphQlEndpoint,
      events,
      euro2024Variables
    );

    const fixtures = response.sports[0].tournaments[0].events.filter(
      (event) => event.type == "Fixture"
    );

    for (const event of fixtures) {
      for (const draw of event.ebetDraws) {
        if (draw.row.description != "1X2") continue;

        const homeTeamName = VeikkausFDTeamMap[draw.row.competitors[0].name];
        const awayTeamName = VeikkausFDTeamMap[draw.row.competitors[2].name];
        const homeTeamOdds = draw.row.competitors[0].odds;
        const awayTeamOdds = draw.row.competitors[2].odds;
        const drawOdds = draw.row.competitors[1].odds;

        if (!homeTeamName || !awayTeamName || !homeTeamOdds || !awayTeamOdds || !drawOdds) {
          continue;
        }

        const awayTeam = await prisma.team.findUnique({ where: { name: awayTeamName } });
        const homeTeam = await prisma.team.findUnique({ where: { name: homeTeamName } });

        if (!awayTeam) throw new Error(`Away team not found ${awayTeamName}`);
        if (!homeTeam) throw new Error(`Home team not found ${homeTeamName}`);

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
        }
      }
    }

    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};
