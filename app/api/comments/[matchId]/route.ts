import { auth } from "@/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getConfig } from "@/lib/config";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const CommentSchema = z.object({
  content: z.string().min(1).max(500).trim(),
  gifUrl: z.string().url().optional().nullable(),
});

type Params = { params: Promise<{ matchId: string }> };

function groupReactions(
  reactions: { emoji: string; userId: string }[],
  currentUserId: string | undefined
) {
  const map = new Map<string, { count: number; userReacted: boolean }>();
  for (const r of reactions) {
    const existing = map.get(r.emoji) ?? { count: 0, userReacted: false };
    map.set(r.emoji, {
      count: existing.count + 1,
      userReacted: existing.userReacted || r.userId === currentUserId,
    });
  }
  return Array.from(map.entries()).map(([emoji, data]) => ({ emoji, ...data }));
}

export async function GET(request: NextRequest, { params }: Params) {
  const { matchId } = await params;
  const id = parseInt(matchId, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid matchId" }, { status: 400 });

  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  const currentUserId = session?.user.id;

  const comments = await prisma.comment.findMany({
    where: { matchId: id },
    include: {
      user: { select: { name: true, image: true, id: true } },
      reactions: { select: { emoji: true, userId: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    comments: comments.map((c) => ({
      ...c,
      reactions: groupReactions(c.reactions, currentUserId),
    })),
  });
}

export async function POST(request: NextRequest, { params }: Params) {
  const ip = clientIp(request);
  const rl = rateLimit(`comments:${ip}`, { limit: 20, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 403 });
  }

  const cfg = await getConfig();
  if (cfg.maintenanceMode) {
    return NextResponse.json({ error: "Maintenance mode" }, { status: 503 });
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
      gifUrl: parsed.data.gifUrl ?? null,
      matchId: id,
      userId: session.user.id,
    },
    include: {
      user: { select: { name: true, image: true, id: true } },
      reactions: { select: { emoji: true, userId: true } },
    },
  });

  return NextResponse.json(
    { comment: { ...comment, reactions: [] } },
    { status: 201 }
  );
}

export async function DELETE(request: NextRequest, { params: _params }: Params) {
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
