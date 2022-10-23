import { getSession } from "next-auth/react";
import prisma from "../../../lib/prisma";

export default async function handle(req, res) {
  const { playerId } = req.body;

  const session = await getSession({ req });

  if (!session.user.id) {
    res.statusCode = 403;
    return { error: "Please sign in" };
  }

  const result = await prisma.user.update({
    where: {
      id: session.user.id,
    },
    data: {
      playerId,
    },
  });
  res.json(result);
}
