import { auth } from "@/auth";
import { NextApiRequest, NextApiResponse } from "next";
import { disabledToday } from "../../../lib/config";
import prisma from "../../../lib/prisma";

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  const { matchId, result } = req.body;

  const session = await auth(req, res);

  if (!session?.user.id) {
    res.statusCode = 403;
    return { error: "Please sign in" };
  }

  const pick = await prisma.pick.findFirst({
    where: {
      matchId,
      userId: session.user.id,
    },
    include: {
      match: {
        select: {
          startTime: true,
        },
      },
    },
  });

  if (pick) {
    if (disabledToday(pick.match.startTime)) {
      res.statusCode = 403;
      res.json({ error: "Too late" });
      return;
    }

    const opResult = await prisma.pick.update({
      where: {
        id: pick.id,
      },
      data: {
        pickedResult: result,
      },
    });
    res.json(opResult);
  } else {
    const opResult = await prisma.pick.create({
      data: {
        matchId,
        userId: session.user.id,
        pickedResult: result,
      },
    });
    res.json(opResult);
  }
}
