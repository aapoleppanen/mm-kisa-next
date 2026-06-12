import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import prisma from "@/lib/prisma";

const MergeSchema = z.object({
  fromTeamId: z.number().int(),
  intoTeamId: z.number().int(),
});

// Merge a duplicate team (e.g. football-data "Turkey") into the canonical ESPN
// team (e.g. "Türkiye"): repoint every reference, then delete the duplicate.
// Afterwards the leftover matches share the canonical team pair, so the regular
// "Dedupe matches" step can remove them and migrate their picks.
export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const parsed = MergeSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { fromTeamId, intoTeamId } = parsed.data;
  if (fromTeamId === intoTeamId) {
    return NextResponse.json({ error: "Cannot merge a team into itself" }, { status: 400 });
  }

  const [from, into] = await Promise.all([
    prisma.team.findUnique({ where: { id: fromTeamId } }),
    prisma.team.findUnique({ where: { id: intoTeamId } }),
  ]);
  if (!from || !into) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const [homeMoved, awayMoved, usersMoved, aliasesMoved] = await prisma.$transaction([
    prisma.match.updateMany({ where: { homeId: fromTeamId }, data: { homeId: intoTeamId } }),
    prisma.match.updateMany({ where: { awayId: fromTeamId }, data: { awayId: intoTeamId } }),
    prisma.user.updateMany({ where: { teamId: fromTeamId }, data: { teamId: intoTeamId } }),
    prisma.teamNameAlias.updateMany({ where: { teamId: fromTeamId }, data: { teamId: intoTeamId } }),
    prisma.team.delete({ where: { id: fromTeamId } }),
  ]);

  return NextResponse.json({
    merged: { from: from.name, into: into.name },
    matchesRepointed: homeMoved.count + awayMoved.count,
    usersRepointed: usersMoved.count,
    aliasesRepointed: aliasesMoved.count,
    next: "Run 'Dedupe matches' to remove the now-duplicated fixtures.",
  });
}
