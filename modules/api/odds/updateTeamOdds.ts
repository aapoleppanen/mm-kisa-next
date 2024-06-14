import request from "graphql-request";
import { veikkausGraphQlEndpoint } from "../../../lib/config";
import prisma from "../../../lib/prisma";
import { euro2024Variables, events } from "../../../pages/api/odds/queries";
import { EventsResponse } from "../../../pages/api/odds/types";
import { VeikkausFDEuroTeamMap } from "../../../utils/adapterUtils";

export const updateTeamOdds = async () => {
  try {
    const response = await request<EventsResponse>(
      veikkausGraphQlEndpoint,
      events,
      euro2024Variables
    );

    response.sports[0].tournaments[0].events.forEach(async (event) => {
      if (event.name == "Euro 2024 - Mestari") {
        event.ebetDraws[0].row.competitors.forEach(async (comp) => {
          console.log(comp, VeikkausFDEuroTeamMap[comp.name])

          const name = VeikkausFDEuroTeamMap[comp.name];

          if (!name) return

          const res = await prisma.team.update({
            where: {
              name,
            },
            data: {
              winningOdds: comp.odds,
            },
          });
          // console.log(res);
        });
      }
    });

    console.log("successfully updated team winning odds");
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};
