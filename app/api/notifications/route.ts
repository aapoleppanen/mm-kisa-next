import { auth } from "@/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { stripMentions } from "@/lib/mentions";

// The notification feed is the set of comment-mentions where the current user
// was tagged. readAt null = unread.
export async function GET(_request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 403 });
  }

  const [mentions, unreadCount] = await Promise.all([
    prisma.commentMention.findMany({
      where: { mentionedUserId: session.user.id },
      include: {
        comment: {
          include: {
            user: { select: { name: true, image: true } },
            match: {
              select: { id: true, home: { select: { name: true } }, away: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.commentMention.count({
      where: { mentionedUserId: session.user.id, readAt: null },
    }),
  ]);

  const notifications = mentions.map((m) => ({
    id: m.id,
    read: m.readAt != null,
    createdAt: m.createdAt,
    actorName: m.comment.user.name,
    actorImage: m.comment.user.image,
    matchId: m.comment.match.id,
    homeName: m.comment.match.home.name,
    awayName: m.comment.match.away.name,
    snippet: stripMentions(m.comment.content).slice(0, 120),
  }));

  return NextResponse.json({ notifications, unreadCount });
}
