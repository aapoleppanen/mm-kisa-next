import { gql } from "graphql-request";

export interface EventsVariables {
  sportIds: [string];
  ctids: [string]; // 1-2-1 PREM && 1-114-1 WC && 1-15-149 euro 2024
  lang: string;
  eventIds?: string[];
  toTime?: number;
}

export const euro2024Variables: EventsVariables = {
  sportIds: ["1"],
  ctids: ["1-15-149"],
  lang: "fi",
};

export const wc2022Variables: EventsVariables = {
  sportIds: ["1"],
  ctids: ["1-114-1"],
  lang: "fi",
};

export const events = gql`
query PitkavetoBEventsQuery(
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
`

const eventsLong = gql`
  query PitkavetoBEventsQuery(
    $sportIds: [ID!]
    $ctids: [ID!]
    $gameNames: [GameName!] = EBET
    $eventIds: [ID!]
    $toTime: Float
  ) {
    sports(ids: $sportIds, ctids: $ctids, gameNames: $gameNames) {
      id
      name
      tournaments {
        id
        name
        providers {
          prefix
          id
        }
        events(ids: $eventIds, toTime: $toTime) {
          ...eventDetails
          hasLiveBetting
          isLive
          provider {
            prefix
            id
          }
          liveGameState {
            gameTime
            clockRunning
          }
          liveGameScore {
            homeScore
            awayScore
            additionalScores {
              key
              value
            }
          }
          drawCount(gameNames: EBET)
          ebetDraws(fixtureDrawLimit: 3, outrightDrawLimit: 10) {
            ...pitkavetoDrawDetails
          }
        }
      }
    }
  }

  fragment eventDetails on Event {
    id
    type
    name
    date
    hasLiveBetting
    yourBetEligible
    status
    tvStreamInfo {
      streamId
      streamProvider
    }
    homeTeamId
    sport {
      id
      name
    }
    category {
      name
    }
    provider {
      prefix
      id
    }
    externalId
    statsIds {
      statsId
      statsSeasonId
      statsTournamentId
    }
    tournament {
      id
      name
      sortPosition
      providers {
        prefix
        id
      }
    }
    teams {
      id
      name
      shortName
    }
  }

  fragment pitkavetoDrawDetails on PitkavetoDraw {
    eventId
    id
    betSlipId
    openTime
    closeTime
    resultsAvailableTime
    gameName
    includedRowCount
    status
    market {
      metadata {
        key
        value
      }
    }
    row {
      id
      sportId
      eventId
      status
      name
      description
      detailedDescription
      tvChannel
      type
      externalId
      competitors {
        id
        name
        handicap
        group
        odds
        status
        outcomeType
      }
      sport {
        name
      }
    }
    jackpots {
      type
      description
      amount
    }
  }
`;

export const events_old = gql`
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
