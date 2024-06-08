import { getSession } from "next-auth/react";
import prisma from "../../../lib/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/auth";

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  const { newName } = req.body;

  const session = await auth(req, res)

  if (!session?.user.id) {
    res.statusCode = 403;
    return { error: "Please sign in" };
  }

  const result = await prisma.user.update({
    where: {
      id: session.user.id,
    },
    data: {
      name: newName,
    },
  });
  res.json(result);
}
