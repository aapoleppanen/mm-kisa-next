import { auth } from "@/auth";
import { NextApiRequest, NextApiResponse } from "next";
import { disabledToday } from "../../../lib/config";
import prisma from "../../../lib/prisma";
import { User } from "@prisma/client";

const getUserCreditsView = async (userId: number) => {
  const user = (await prisma.$queryRaw`
    SELECT * FROM "UserCreditsView" WHERE "userId" = ${userId} LIMIT 1
  `) as {
    remainingCredits: User["remainingCredits"];
    userId: User["id"];
    oldRemainingCredits: User["remainingCredits"];
  }[];

  return user[0];
}

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { matchId, result, betAmount } = req.body;

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

  const user = await getUserCreditsView(session.user.id);

  if (!user || betAmount > user?.remainingCredits) {
    res.statusCode = 403;
    res.json({ error: "Failed to make bet. Not enough remaining credits." });
    return;
  }

  if (pick) {
    if (disabledToday(pick.match.startTime)) {
      res.statusCode = 403;
      res.json({ error: "Too late" });
      return;
    }

    await prisma.pick.update({
      where: {
        id: pick.id,
      },
      data: {
        pickedResult: result,
        betAmount,
      },
    });

    const updatedUser = await getUserCreditsView(session.user.id);

    res.json({ remainingCredits: updatedUser.remainingCredits });
  } else {
    await prisma.pick.create({
      data: {
        matchId,
        userId: session.user.id,
        pickedResult: result,
        betAmount,
      },
    });

    res.json({ remainingCredits: user.remainingCredits - betAmount });
  }
}
