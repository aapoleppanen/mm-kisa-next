import { gql } from "graphql-request";

export interface EventsVariables {
  sportIds: [string];
  ctids: [string]; // 1-2-1 PREM && 1-114-1 WC
  lang: string;
  eventIds?: string[];
  toTime?: number;
}

export const events = gql`
  query Events(
    $sportIds: [ID!]
    $ctids: [ID!]
    $gameNames: [GameName!] = EBET
    $eventIds: [ID!]
    $toTime: Float
  ) {
    sports(ids: $sportIds, ctids: $ctids, gameNames: $gameNames) {
      tournaments {
        id
        name
        events(ids: $eventIds, toTime: $toTime) {
          id
          type # Outright | Fixture
          name # "MM-kisat 2022 - Voittaja" | "MM-kisat 2022 - Lohko B - Voittaja" |
          # "MM-kisat 2022 - Paras maalintekijä"
          date # UNIX epoch
          status # NotStarted |
          homeTeamId
          externalId # could match results
          teams {
            id # match to homeTeamId
            name
            shortName
          }
          isLive # boolean
          liveGameState {
            gameTime
            clockRunning
          }
          liveGameScore {
            homeScore
            awayScore
          }
          ebetDraws(fixtureDrawLimit: 3, outrightDrawLimit: 10) {
            row {
              description # 1X2
              competitors {
                name
                odds # Int
                outcomeType # Home | Tie | Away
              }
            }
          }
        }
      }
    }
  }
`;
