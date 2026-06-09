import { auth } from "@/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const CommentSchema = z.object({
  content: z.string().min(1).max(500).trim(),
});

type Params = { params: Promise<{ matchId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { matchId } = await params;
  const id = parseInt(matchId, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid matchId" }, { status: 400 });

  const comments = await prisma.comment.findMany({
    where: { matchId: id },
    include: { user: { select: { name: true, image: true, id: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ comments });
}

export async function POST(request: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 403 });
  }

  const { matchId } = await params;
  const id = parseInt(matchId, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid matchId" }, { status: 400 });

  const body = await request.json();
  const parsed = CommentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const comment = await prisma.comment.create({
    data: {
      content: parsed.data.content,
      matchId: id,
      userId: session.user.id,
    },
    include: { user: { select: { name: true, image: true, id: true } } },
  });

  return NextResponse.json({ comment }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 403 });
  }

  const { commentId } = await request.json();
  if (!commentId) return NextResponse.json({ error: "Missing commentId" }, { status: 400 });

  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment || comment.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.comment.delete({ where: { id: commentId } });
  return NextResponse.json({ ok: true });
}
