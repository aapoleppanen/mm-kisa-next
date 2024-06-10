import { auth } from "@/auth";
import prisma from "../../../lib/prisma";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await auth(req, res);

    if (!session?.user) {
      return res.status(401).send({ message: "Unauthorized" });
    }

    const users: { total: number; name: string; id: string }[] =
      await prisma.$queryRaw`
    SELECT
      "User".name as name, "User".id AS id,
      CAST(COALESCE(SUM("Pick"."betAmount" * odds), 0) AS INTEGER) AS total
    FROM (
      SELECT "homeWinOdds" AS odds, id, result
      FROM "Match"
      WHERE "Match".result = 'HOME_TEAM'
    UNION
      SELECT "awayWinOdds" AS odds, id, result
      FROM "Match"
      WHERE "Match".result = 'AWAY_TEAM'
    UNION
      SELECT "drawOdds" AS odds, id, result
      FROM "Match"
      WHERE "Match".result = 'DRAW'
    ) AS od
    INNER JOIN "Pick" ON od.id = "Pick"."matchId" AND od.result = "Pick"."pickedResult"
    RIGHT JOIN "User" ON "User".id = "Pick"."userId"
    LEFT JOIN "Team" ON "Team".id = "User"."teamId" AND "Team".id = 4
    LEFT JOIN (
      SELECT id, odds as playerOdds, name
      FROM "Player"
      WHERE "Player".id = 95
    ) AS player ON player.id = "User"."playerId" AND player.id = 95
    GROUP BY "User".id, "User".name, "Team"."winningOdds", playerOdds
    ORDER BY total DESC;
  `;

  console.log(users);

    return res.json({
      users: JSON.parse(JSON.stringify(users)),
    });
  } catch (e) {
    return res.status(500).send({ message: "failure" });
  }
}
