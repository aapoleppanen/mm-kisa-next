import { auth } from "@/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const UpdateProfileSchema = z.object({
  newName: z.string().min(1).max(100).optional(),
  // R2 object key (e.g. "avatars/xxx.png") or an absolute URL — resolved via storageUrl().
  avatar_url: z.string().max(500).nullable().optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = UpdateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { newName, avatar_url } = parsed.data;

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(newName ? { name: newName } : {}),
      ...(avatar_url !== undefined ? { image: avatar_url } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
