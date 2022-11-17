import prisma from "../../../lib/prisma";

export const insertTeams = async () => {
  try {
    const path = "https://api.football-data.org/v4/competitions/WC/teams";
    const response = await fetch(path, {
      headers: { "X-Auth-Token": `${process.env.FD_API_TOKEN}` },
    });
    const json = await response.json();

    const filtered = json.teams.map((team: any) => {
      return {
        name: team.name,
        crest: team.crest,
      };
    });

    const many = await prisma.team.createMany({
      data: filtered,
    });

    console.log(`Succesfully inserted ${many} teams`);
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};
