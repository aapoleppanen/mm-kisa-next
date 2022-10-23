import { request } from "graphql-request";
import prisma from "../../../lib/prisma";
import { VeikkausFDWorldCupTeamMap } from "../../../utils/adapterUtils";
import { events } from "./queries";
import { EventsResponse } from "./types";

export const veikkausGraphQlEndpoint =
  "https://v3.middle.prod.gcp.veikkaus.fi/midas/graphql";

export default async function handle(req, res) {
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
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.json({ success: false });
  }
}
