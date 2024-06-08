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
  SELECT COALESCE(SUM(odds), 0) + COALESCE(winningOdds, 0) + COALESCE(playerOdds, 0) AS total, User.name as name, User.id AS id
  FROM (
    SELECT homeWinOdds AS Odds, id, result
    FROM \`Match\`
    WHERE \`Match\`.result = "HOME_TEAM"
  UNION
    SELECT awayWinOdds AS Odds, id, result
    FROM \`Match\`
    WHERE \`Match\`.result = "AWAY_TEAM"
  UNION
    SELECT drawOdds AS Odds, id, result
    FROM \`Match\`
    WHERE \`Match\`.result = "DRAW") AS od
  INNER JOIN Pick ON od.id = Pick.matchId AND od.result = Pick.pickedResult
  RIGHT JOIN User on User.id = Pick.userId
  LEFT JOIN Team on Team.id = User.teamId AND Team.id = 4
  LEFT JOIN (
  SELECT id, odds as playerOdds, name
  FROM Player
  WHERE Player.id = 95
  ) as player on player.id = User.playerId AND player.id = 95
  GROUP BY User.id
  ORDER BY total DESC
  `;

    return res.json({
      users: JSON.parse(JSON.stringify(users)),
    });
  } catch (e) {
    return res.status(500).send({ message: "failure" });
  }
}
