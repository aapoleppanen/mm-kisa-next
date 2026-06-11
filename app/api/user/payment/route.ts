import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { hasPaid } = await request.json();
  if (typeof hasPaid !== "boolean") {
    return NextResponse.json({ error: "hasPaid must be boolean" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { hasPaid },
    select: { hasPaid: true },
  });

  return NextResponse.json(user);
}
