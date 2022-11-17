import request from "graphql-request";
import { veikkausGraphQlEndpoint } from "../../../lib/config";
import prisma from "../../../lib/prisma";
import { events } from "../../../pages/api/odds/queries";
import { EventsResponse } from "../../../pages/api/odds/types";

export const updatePlayerOdds = async () => {
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
      if (event.name == "MM-kisat 2022 - Paras maalintekijä") {
        event.ebetDraws[0].row.competitors.forEach(async (player) => {
          const res = await prisma.player.upsert({
            where: {
              name: player.name,
            },
            update: {
              odds: player.odds,
            },
            create: {
              name: player.name,
              odds: player.odds,
            },
          });

          console.log(res);
        });
      }
    });

    console.log("successfully updated player winning odds");
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};
