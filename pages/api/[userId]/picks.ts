import { unstable_getServerSession } from "next-auth";
import prisma from "../../../lib/prisma";
import { options } from "../auth2/auth";

export default async function handle(req, res) {
  try {
    const session = await unstable_getServerSession(req, res, options);

    if (!session?.user) {
      return res.status(401).send({ message: "unauthorized " });
    }

    const { userId } = req.query;

    const picks = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        winnerPick: true,
        topScorerPick: true,
        picks: {
          include: {
            match: {
              include: {
                home: true,
                away: true,
              },
            },
          },
          orderBy: {
            match: {
              startTime: "asc",
            },
          },
        },
      },
    });

    res.json({ picks });
  } catch (e) {
    console.log(e);
    return res.status(500).send({ message: "failure" });
  }
}
