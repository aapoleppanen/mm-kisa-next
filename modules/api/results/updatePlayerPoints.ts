import prisma from "@/lib/prisma";

export const updatePlayerPoints = async () => {
  try {
    await prisma.$queryRaw`
    UPDATE "User"
    SET points = subquery.winnings
    FROM (
      SELECT
        "Pick"."userId" AS id,
        CAST(COALESCE(SUM("Pick"."betAmount" * odds), 0) AS INTEGER) AS winnings
      FROM (
        SELECT "homeWinOdds" AS odds, id, result FROM "Match" WHERE "Match".result = 'HOME_TEAM'
        UNION
        SELECT "awayWinOdds" AS odds, id, result FROM "Match" WHERE "Match".result = 'AWAY_TEAM'
        UNION
        SELECT "drawOdds" AS odds, id, result FROM "Match" WHERE "Match".result = 'DRAW'
      ) AS od
      INNER JOIN "Pick" ON od.id = "Pick"."matchId" AND od.result = "Pick"."pickedResult"
      GROUP BY "Pick"."userId"
    ) AS subquery
    WHERE "User".id = subquery.id
    `;
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};
