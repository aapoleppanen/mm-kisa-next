import { auth } from "@/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Pick as PrismaPick } from "@prisma/client";
import prisma from "@/lib/prisma";
import { disabledToday, getConfig } from "@/lib/config";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { parseMentionIds } from "@/lib/mentions";

const CommentSchema = z
  .object({
    content: z.string().max(500).trim(),
    gifUrl: z.string().url().optional().nullable(),
  })
  .refine((data) => data.content.length >= 1 || data.gifUrl, {
    message: "Comment or GIF required",
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

export type MentionPick =
  | { locked: true }
  | { locked: false; none: true }
  | {
      locked: false;
      none: false;
      pickedResult: PrismaPick["pickedResult"];
      predHome: number | null;
      predAway: number | null;
      betAmount: number;
      awardedPoints: number;
    };

type MentionView = {
  userId: string;
  name: string | null;
  image: string | null;
  pick: MentionPick;
};

type CommentWithMentions = {
  mentions: {
    mentionedUserId: string;
    mentionedUser: { id: string; name: string | null; image: string | null };
  }[];
};

// Build the per-mention pick payload, revealing a tagged user's pick only once
// the match has locked (or when the viewer is that user themselves).
function buildMentions(
  comment: CommentWithMentions,
  pickByUser: Map<string, PrismaPick>,
  locked: boolean,
  currentUserId: string | undefined
): MentionView[] {
  return comment.mentions.map((m) => {
    const reveal = locked || m.mentionedUserId === currentUserId;
    let pick: MentionPick;
    if (!reveal) {
      pick = { locked: true };
    } else {
      const p = pickByUser.get(m.mentionedUserId);
      pick = p
        ? {
            locked: false,
            none: false,
            pickedResult: p.pickedResult,
            predHome: p.predHome,
            predAway: p.predAway,
            betAmount: p.betAmount,
            awardedPoints: p.awardedPoints,
          }
        : { locked: false, none: true };
    }
    return {
      userId: m.mentionedUserId,
      name: m.mentionedUser.name,
      image: m.mentionedUser.image,
      pick,
    };
  });
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { matchId } = await params;
  const id = parseInt(matchId, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid matchId" }, { status: 400 });

  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  const currentUserId = session?.user.id;

  const [cfg, match, comments] = await Promise.all([
    getConfig(),
    prisma.match.findUnique({
      where: { id },
      select: {
        startTime: true,
        result: true,
        homeGoals: true,
        awayGoals: true,
        home: { select: { name: true } },
        away: { select: { name: true } },
      },
    }),
    prisma.comment.findMany({
      where: { matchId: id },
      include: {
        user: { select: { name: true, image: true, id: true } },
        reactions: { select: { emoji: true, userId: true } },
        mentions: {
          include: { mentionedUser: { select: { id: true, name: true, image: true } } },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const locked = match ? disabledToday(match.startTime, cfg.lockLeadHours) : false;

  // One query for every tagged user's pick on this match, then map by user.
  const mentionedIds = Array.from(
    new Set(comments.flatMap((c) => c.mentions.map((m) => m.mentionedUserId)))
  );
  const pickByUser = new Map<string, PrismaPick>();
  if (mentionedIds.length) {
    const picks = await prisma.pick.findMany({
      where: { matchId: id, userId: { in: mentionedIds } },
    });
    for (const p of picks) pickByUser.set(p.userId, p);
  }

  return NextResponse.json({
    match: match && {
      locked,
      result: match.result,
      homeGoals: match.homeGoals,
      awayGoals: match.awayGoals,
      homeName: match.home.name,
      awayName: match.away.name,
    },
    comments: comments.map((c) => ({
      ...c,
      reactions: groupReactions(c.reactions, currentUserId),
      mentions: buildMentions(c, pickByUser, locked, currentUserId),
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

  // Parse mentions from the content itself (authoritative — don't trust a
  // client-supplied list), validate the users exist, and never self-notify.
  const rawIds = parseMentionIds(parsed.data.content).filter((uid) => uid !== session.user.id);
  const validIds = rawIds.length
    ? (await prisma.user.findMany({ where: { id: { in: rawIds } }, select: { id: true } })).map((u) => u.id)
    : [];

  const match = await prisma.match.findUnique({ where: { id }, select: { startTime: true } });
  const locked = match ? disabledToday(match.startTime, cfg.lockLeadHours) : false;

  const comment = await prisma.comment.create({
    data: {
      content: parsed.data.content,
      gifUrl: parsed.data.gifUrl ?? null,
      matchId: id,
      userId: session.user.id,
      mentions: validIds.length
        ? { createMany: { data: validIds.map((uid) => ({ mentionedUserId: uid })) } }
        : undefined,
    },
    include: {
      user: { select: { name: true, image: true, id: true } },
      reactions: { select: { emoji: true, userId: true } },
      mentions: {
        include: { mentionedUser: { select: { id: true, name: true, image: true } } },
      },
    },
  });

  const pickByUser = new Map<string, PrismaPick>();
  if (validIds.length) {
    const picks = await prisma.pick.findMany({ where: { matchId: id, userId: { in: validIds } } });
    for (const p of picks) pickByUser.set(p.userId, p);
  }

  return NextResponse.json(
    {
      comment: {
        ...comment,
        reactions: [],
        mentions: buildMentions(comment, pickByUser, locked, session.user.id),
      },
    },
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
