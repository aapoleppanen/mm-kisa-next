import prisma from "../../../lib/prisma";
import { Match } from "../../../pages/api/results/types";

export const updateResults = async () => {
  try {
    const path = "https://api.football-data.org/v4/competitions/EC/matches";
    const response = await fetch(path, {
      headers: { "X-Auth-Token": `${process.env.FD_API_TOKEN}` },
    });
    const json = await response.json();
    let success = true;

    // 'YYYY-MM-DD hh:mm:ss'
    // WINNER: "HOME_TEAM" | "AWAY_TEAM" | "DRAW"

    json.matches.forEach(async (match: Match) => {
      try {
        if (match.awayTeam.name && match.awayTeam.name) {
          const awayTeam = await prisma.team.findUnique({
            where: {
              name: match.awayTeam.name,
            },
          });

          const homeTeam = await prisma.team.findUnique({
            where: {
              name: match.homeTeam.name,
            },
          });

          if (!awayTeam)
            throw new Error(`Away team not found ${match.awayTeam.name}`);
          if (!homeTeam)
            throw new Error(`Away team not found ${match.homeTeam.name}`);

          const matchRes = await prisma.match.upsert({
            where: {
              id: match.id,
            },
            update: {
              awayGoals: match.score.fullTime.away ?? match.score.halfTime.away,
              homeGoals: match.score.fullTime.home ?? match.score.halfTime.home,
              result: match.score.duration == "REGULAR" ? match.score.winner : "DRAW",
            },
            create: {
              startTime: match.utcDate,
              homeId: homeTeam?.id,
              awayId: awayTeam?.id,
              homeGoals: match.score.fullTime.home,
              awayGoals: match.score.fullTime.away,
              id: match.id,
            },
          });

          console.log(matchRes);
        }
      } catch (e) {
        console.error(e);
        success = false;
      }
    });
    return success;
  } catch (e) {
    console.error(e);
    return false;
  }
};
