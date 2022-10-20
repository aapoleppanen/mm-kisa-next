interface EventsResponse {
  sports: {
    tournaments: Tournament[];
  }[];
}

interface Tournament {
  id: string;
  name: string;
  events: Event[];
}

interface Event {
  id: string;
  type: "Outright" | "Fixture";
  name:
    | string
    | "MM-kisat 2022 - Voittaja"
    | "MM-kisat - Lohko A - Voittaja"
    | "MM-kisat - Lohko B - Voittaja"
    | "MM-kisat - Lohko C - Voittaja"
    | "MM-kisat - Lohko D - Voittaja"
    | "MM-kisat - Lohko E - Voittaja"
    | "MM-kisat - Lohko F - Voittaja"
    | "MM-kisat - Lohko G - Voittaja"
    | "MM-kisat - Lohko H - Voittaja"
    | "MM-kisat 2022 - Paras maalintekijä";
  date: number; // UNIX epoch
  status: string | "NotStarted";
  homeTeamId: string;
  externalId: string;
  teams: Team[];
  isLive: boolean;
  liveGameState: {
    gameTime: string;
    clockRunning: true;
  };
  liveGameScore: {
    homeScore: number;
    awayScore: number;
  };
  ebetDraws: Draw[];
}

interface Team {
  id: string;
  name: string;
  shortName: string;
}

interface Draw {
  row: {
    description: string | "1X2";
    competitors: Competitor[];
  };
}

interface Competitor {
  name: string;
  odds: number;
  outcomeType: "Home" | "Tie" | "Away" | "Over" | "Under";
}

export type { EventsResponse, Event, Tournament, Team, Draw, Competitor };
