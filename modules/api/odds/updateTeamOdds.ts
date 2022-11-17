import request from "graphql-request";
import { veikkausGraphQlEndpoint } from "../../../lib/config";
import prisma from "../../../lib/prisma";
import { events } from "../../../pages/api/odds/queries";
import { EventsResponse } from "../../../pages/api/odds/types";
import { VeikkausFDWorldCupTeamMap } from "../../../utils/adapterUtils";

export const updateTeamOdds = async () => {
  try {
    const response = await request<EventsResponse>(
      veikkausGraphQlEndpoint,
      events,
      {
        sportIds: ["1"],
        ctids: ["1-114-1"],
        lang: "fi",
      }
    );

    response.sports[0].tournaments[0].events.forEach(async (event) => {
      if (event.name == "MM-kisat 2022 - Voittaja") {
        event.ebetDraws[0].row.competitors.forEach(async (comp) => {
          const res = await prisma.team.update({
            where: {
              name: VeikkausFDWorldCupTeamMap[comp.name],
            },
            data: {
              winningOdds: comp.odds,
            },
          });
          console.log(res);
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
