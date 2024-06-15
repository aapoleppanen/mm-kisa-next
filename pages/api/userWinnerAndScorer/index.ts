import { auth } from "@/auth";
import { NextApiRequest, NextApiResponse } from "next";
import { disablePrePicks } from "../../../lib/config";
import prisma from "../../../lib/prisma";

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  const session = await auth(req, res)

  if (!session?.user.id) {
    res.statusCode = 403;
    return res.json({ error: "Please sign in" })
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
  });

  return res.json({
    teamPick: user?.teamId,
    playerPick: user?.playerId,
  })
}
