import { auth } from "@/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const ALLOWED_EMOJIS = ["⚽", "🔥", "❤️", "😂", "😮", "👍", "🎉", "😢"];

const ReactionSchema = z.object({
  emoji: z.string().refine((e) => ALLOWED_EMOJIS.includes(e), "Invalid emoji"),
});

type Params = { params: Promise<{ commentId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 403 });
  }

  const { commentId } = await params;
  const body = await request.json();
  const parsed = ReactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid emoji" }, { status: 400 });
  }

  const { emoji } = parsed.data;
  const userId = session.user.id;

  const existing = await prisma.reaction.findUnique({
    where: { commentId_userId_emoji: { commentId, userId, emoji } },
  });

  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
    return NextResponse.json({ added: false });
  }

  await prisma.reaction.create({ data: { commentId, userId, emoji } });
  return NextResponse.json({ added: true });
}
