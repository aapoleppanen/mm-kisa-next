import { getSession } from "next-auth/react";
import { disablePrePicks } from "../../../lib/config";
import prisma from "../../../lib/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/auth";

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  const { teamId } = req.body;

  const session = await auth(req, res)

  if (!session?.user.id) {
    res.statusCode = 403;
    return { error: "Please sign in" };
  }

  if (disablePrePicks()) {
    res.statusCode = 403;
    return { error: "Cannot change winner anymore!" };
  }

  const result = await prisma.user.update({
    where: {
      id: session.user.id,
    },
    data: {
      teamId,
    },
  });
  res.json(result);
}
