import { request } from "graphql-request";
import { veikkausGraphQlEndpoint } from "../../../lib/config";
import { euro2024Variables, events } from "./queries";
import { EventsResponse } from "./types";

export default async function handle(req, res) {
  try {
    const response = await request<EventsResponse>(
      veikkausGraphQlEndpoint,
      events,
      euro2024Variables
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
