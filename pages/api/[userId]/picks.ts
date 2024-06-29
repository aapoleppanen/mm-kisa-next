import { auth } from "@/auth";
import prisma from "../../../lib/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { add } from "date-fns";

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await auth(req, res);

    if (!session?.user) {
      return res.status(401).send({ message: "unauthorized " });
    }

    const { userId } = req.query;

    const picks = await prisma.user.findUnique({
      where: {
        id: userId?.toString(),
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
          where: {
            match: {
              startTime: {
                lte: add(new Date(), { hours: 1 }),
              },
            }
          }
        },
      },
    });

    res.json({ picks });
  } catch (e) {
    console.log(e);
    return res.status(500).send({ message: "failure" });
  }
}
