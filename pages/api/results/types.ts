export enum FDCompetiton {
  WorldCup = "WC",
  PremierLeague = "PL",
}

export enum FDStatus {
  Scheduled = "SCHEDULED",
  Timed = "TIMED",
  Cancelled = "CANCELLED",
  PostPoned = "POSTPONED",
  Suspended = "SUSPENDED",
  InPlay = "IN_PLAY",
  Paused = "PAUSED",
  Finished = "FINISHED",
}

export enum FDGroup {
  GroupA = "GROUP_A",
  GroupB = "GROUP_B",
  GroupC = "GROUP_C",
  GroupD = "GROUP_D",
  GroupE = "GROUP_E",
  GroupF = "GROUP_F",
  GroupG = "GROUP_G",
  GroupH = "GROUP_H",
  GroupI = "GROUP_I",
  GroupJ = "GROUP_J",
  GroupK = "GROUP_K",
  GroupL = "GROUP_L",
}

export enum FDStage {
  Final = "FINAL",
  ThirdPlace = "THIRD_PLACE",
  SemiFinals = "SEMI_FINALS",
  QuarterFinals = "QUARTER_FINALS",
  Last16 = "LAST_16",
  Last32 = "LAST_32",
  Last64 = "LAST_64",
  Round4 = "ROUND_4",
  Round3 = "ROUND_3",
  Round2 = "ROUND_2",
  Round1 = "ROUND_1",
  GroupStage = "GROUP_STAGE",
  PreliminaryRound = "PRELIMINARY_ROUND",
  Qualification = "QUALIFICATION",
  QualificationRound1 = "QUALIFICATION_ROUND_1",
  QualificationRound2 = "QUALIFICATION_ROUND_2",
  QualificationRound3 = "QUALIFICATION_ROUND_3",
  PlayoffRound1 = "PLAYOFF_ROUND_1",
  PlayoffRound2 = "PLAYOFF_ROUND_2",
  Playoffs = "PLAYOFFS",
  RegularSeason = "REGULAR_SEASON",
  Clausura = "CLAUSURA",
  Apertura = "APERTURA",
  ChampionshipRound = "CHAMPIONSHIP_ROUND",
  RelegationRound = "RELEGATION_ROUND",
}

export interface FixtureResultVariables {
  ids?: number[];
  competition?: FDCompetiton;
  dateFrom?: string; // Format 'yyyy-MM-dd'
  dateTo?: string; // Format 'yyyy-MM-dd'
  // date?: string; // Format 'yyy-MM-dd'
  status?: FDStatus;
}

export interface FDMatchResponse {
  filters: Filters;
  resultSet: ResultSet;
  competition: Competition;
  matches: Match[];
}

export interface Competition {
  id: number;
  name: string;
  code: string;
  type: string;
  emblem: string;
}

export interface Filters {
  season: string;
}

export interface Match {
  area: Area;
  competition: Competition;
  season: Season;
  id: number;
  utcDate: Date;
  status: string;
  matchday: number;
  stage: string;
  group: null;
  lastUpdated: Date;
  homeTeam: Team;
  awayTeam: Team;
  score: Score;
  odds: Odds;
  referees: Referee[];
}

export interface Area {
  id: number;
  name: string;
  code: string;
  flag: string;
}

export interface Team {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

export interface Odds {
  msg: string;
}

export interface Referee {
  id: number;
  name: string;
  type: string;
  nationality: string;
}

export interface Score {
  winner: string;
  duration: string;
  fullTime: Time;
  halfTime: Time;
}

export interface Time {
  home: number;
  away: number;
}

export interface Season {
  id: number;
  startDate: Date;
  endDate: Date;
  currentMatchday: number;
  winner: null;
}

export interface ResultSet {
  count: number;
  first: Date;
  last: Date;
  played: number;
}

// export interface FixtureResultsVariables {
//   date: string; // "yyyy-MM-dd"
// }

// export type FixtureResultsResponse = FixtureResults[];

// export interface FixtureResults {
//   gameName: GameName;
//   listIndex: string;
//   id: number;
//   name: Name;
//   status: string;
//   openTime: number;
//   closeTime: number;
//   drawTime: number;
//   resultsAvailableTime: number;
//   gameRuleSet: GameRuleSet;
//   rows: Row[];
// }

// export enum GameName {
//   Ebet = "EBET",
// }

// export interface GameRuleSet {
//   basePrice: number;
//   maxPrice: number;
//   stakeInterval: number;
//   minStake: number;
//   maxStake: number;
//   minSystemLevel: number;
//   maxSystemLevel: number;
//   oddsType: OddsType;
// }

// export enum OddsType {
//   Fixed = "FIXED",
// }

// export enum Name {
//   Single = "SINGLE",
// }

// export interface Row {
//   id: string;
//   status: RowStatus;
//   includedRowCount: number;
//   name: string;
//   description: string
("1X2");
//   detailedDescription: string;
//   tvChannel: TvChannel;
//   competitors: Competitor[];
//   result: Result;
//   eventId: string;
//   excludedEvents: string[];
//   type: string;
//   sportId: string;
//   includedRows: string[];
// }

// export interface Competitor {
//   id: string;
//   name: string;
//   odds: Odds;
//   status: CompetitorStatus;
//   handicap?: string;
//   number?: number;
// }

// export interface Odds {
//   odds: number;
// }

// export enum CompetitorStatus {
//   Active = "ACTIVE",
//   Inactive = "INACTIVE",
// }

// export interface Result {
//   score: Score;
//   competitors: string[];
//   status: ResultStatus;
// }

// export interface Score {
//   home: number;
//   away: number;
// }

// export enum ResultStatus {
//   Final = "FINAL",
// }

// export enum RowStatus {
//   Closed = "CLOSED",
// }

// export enum TvChannel {
//   CMore1 = "CMore1",
//   Empty = "",
//   Veikkaus = "Veikkaus",
// }
