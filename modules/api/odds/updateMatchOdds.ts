import request from "graphql-request";
import { veikkausGraphQlEndpoint } from "../../../lib/config";
import prisma from "../../../lib/prisma";
import { euro2024Variables, events } from "../../../pages/api/odds/queries";
import { EventsResponse } from "../../../pages/api/odds/types";
import {
  VeikkausFDEuroTeamMap,
} from "../../../utils/adapterUtils";

const VeikkausFDTeamMap = VeikkausFDEuroTeamMap; // VeikkausFDWorldCupTeamMap

export const updateMatchOdds = async () => {
  try {
    const response = await request<EventsResponse>(
      veikkausGraphQlEndpoint,
      events,
      euro2024Variables
    );

    response.sports[0].tournaments[0].events
      .filter((event) => {
        return event.type == "Fixture";
      })
      .forEach(async (event) => {
        event.ebetDraws.forEach(async (draw) => {
          if (draw.row.description == "1X2") {
            const homeTeamName =
              VeikkausFDTeamMap[draw.row.competitors[0].name];
            const awayTeamName =
              VeikkausFDTeamMap[draw.row.competitors[2].name];
            const homeTeamOdds = draw.row.competitors[0].odds;
            const awayTeamOdds = draw.row.competitors[2].odds;
            const drawOdds = draw.row.competitors[1].odds;

            if (
              homeTeamName &&
              awayTeamName &&
              homeTeamOdds &&
              awayTeamOdds &&
              drawOdds
            ) {
              const awayTeam = await prisma.team.findUnique({
                where: { name: awayTeamName },
              });
              const homeTeam = await prisma.team.findUnique({
                where: { name: homeTeamName },
              });

              if (!awayTeam)
                throw new Error(`Away team not found ${awayTeamName}`);
              if (!homeTeam)
                throw new Error(`Away team not found ${homeTeamName}`);

              const match = await prisma.match.findFirst({
                where: {
                  homeId: homeTeam.id,
                  awayId: awayTeam.id,
                },
              });

              if (match) {
                const res = await prisma.match.update({
                  where: {
                    id: match.id,
                  },
                  data: {
                    awayWinOdds: awayTeamOdds,
                    homeWinOdds: homeTeamOdds,
                    drawOdds,
                  },
                });

                // console.log(res);
              }
            }
          }
        });
      });

    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};
