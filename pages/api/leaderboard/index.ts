import { unstable_getServerSession } from "next-auth";
import prisma from "../../../lib/prisma";
import { options } from "../auth/[...nextauth]";

export default async function handle(req, res) {
  try {
    const session = await unstable_getServerSession(req, res, options);

    if (!session?.user) {
      return res.status(401).send({ message: "Unauthorized" });
    }

    const users: { total: number; name: string; id: string } =
      await prisma.$queryRaw`
      SELECT SUM(odds) AS total, name, User.id AS id
        FROM (
          SELECT homeWinOdds AS Odds, id
          FROM \`Match\`
          WHERE \`Match\`.result = "HOME_TEAM"
        UNION
          SELECT awayWinOdds AS Odds, id
          FROM \`Match\`
          WHERE \`Match\`.result = "AWAY_TEAM"
        UNION
          SELECT drawOdds AS Odds, id
          FROM \`Match\`
          WHERE \`Match\`.result = "DRAW") AS od
      INNER JOIN Pick ON od.id = Pick.matchId
      RIGHT JOIN User on User.id = Pick.userId
      GROUP BY User.id
      `;

    return res.json({
      users: JSON.parse(JSON.stringify(users)),
    });
  } catch (e) {
    return res.status(500).send({ message: "failure" });
  }
}
