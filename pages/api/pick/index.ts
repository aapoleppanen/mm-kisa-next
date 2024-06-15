import { auth } from "@/auth";
import { NextApiRequest, NextApiResponse } from "next";
import { disabledToday, maxBetAmount } from "../../../lib/config";
import prisma from "../../../lib/prisma";
import { User } from "@prisma/client";
import { roundNumber } from "@/utils/numberUtils";

const getUserCreditsView = async (userId: number) => {
  const user = (await prisma.$queryRaw`
    SELECT * FROM "UserCreditsView" WHERE "userId" = ${userId} LIMIT 1
  `) as {
    remainingCredits: User["remainingCredits"];
    userId: User["id"];
    oldRemainingCredits: User["remainingCredits"];
  }[];

  return user[0];
};

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { matchId, result, betAmount: betAmountInit } = req.body;

  const betAmount = roundNumber(betAmountInit);

  const session = await auth(req, res);

  if (!session?.user.id) {
    res.statusCode = 403;
    return res.json({ error: "Please sign in" });
  }

  if (betAmount < 0 || betAmount > maxBetAmount) {
    res.statusCode = 403;
    return res.json({ error: "Invalid bet amount" });
  }

  if (!result || result === "" || betAmount === 0) {
    try {
      await prisma.pick.delete({
        where: {
          userId_matchId: {
            userId: session.user.id,
            matchId,
          },
        },
      });
    } catch (e) {
      console.error(e);
    } finally {
      const updatedUser = await getUserCreditsView(session.user.id);

      return res.json({
        remainingCredits: updatedUser.remainingCredits,
        betAmount: 0,
        notification: "Cleared bet succesfully",
      });
    }
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

  if (
    !user ||
    (betAmount > user?.remainingCredits && pick && pick?.betAmount < betAmount)
  ) {
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

    res.json({ remainingCredits: updatedUser.remainingCredits, betAmount });
  } else {
    await prisma.pick.create({
      data: {
        matchId,
        userId: session.user.id,
        pickedResult: result,
        betAmount,
      },
    });

    res.json({
      remainingCredits: user.remainingCredits - betAmount,
      betAmount,
    });
  }
}
