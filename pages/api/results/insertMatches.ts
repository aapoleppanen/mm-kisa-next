import prisma from "../../../lib/prisma";

export default async function handle(req, res) {
  try {
    const path = "https://api.football-data.org/v4/competitions/WC/matches";
    const response = await fetch(path, {
      headers: { "X-Auth-Token": `${process.env.FD_API_TOKEN}` },
    });
    const json = await response.json();
    let success = true;

    // 'YYYY-MM-DD hh:mm:ss'
    // WINNER: "HOME_TEAM" | "AWAY_TEAM" | "DRAW"

    json.matches.forEach(async (match: any) => {
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

          const createRes = await prisma.match.create({
            data: {
              startTime: match.utcDate,
              homeId: homeTeam?.id,
              awayId: awayTeam?.id,
              homeGoals: match.score.fullTime.home,
              awayGoals: match.score.fullTime.away,
            },
          });

          console.log(createRes);
        }
      } catch (e) {
        console.error(e);
        success = false;
      }
    });
    res.json({ success });
  } catch (e) {
    console.error(e);
    res.json({ success: false });
  }
}
