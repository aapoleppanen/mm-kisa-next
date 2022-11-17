import { request } from "graphql-request";
import { veikkausGraphQlEndpoint } from "../../../lib/config";
import { events } from "./queries";
import { EventsResponse } from "./types";

export default async function handle(req, res) {
  try {
    const variables = {
      sportIds: ["1"],
      ctids: ["1-114-1"],
      lang: "fi",
    };

    const response = await request<EventsResponse>(
      veikkausGraphQlEndpoint,
      events,
      variables
    );

    const fixtures = response.sports[0].tournaments[0].events
      .filter((event) => {
        return true;
        return event.type == "Fixture";
      })
      .map((fixture) => {
        return {
          ...fixture,
          ebetDraws: fixture.ebetDraws.filter((draw) => {
            return true;
            return draw.row.description == "1X2";
          }),
        };
      });

    res.json(fixtures);
  } catch (e) {
    console.error(e);
    res.json({ failure: true });
  }
}
