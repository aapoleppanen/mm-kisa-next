import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import prisma from "@/lib/prisma";
import { fetchEspnEventIds } from "@/modules/api/espn/espn";
import { settleAll } from "@/modules/api/scoring/settle";

// Removes duplicate Match rows left by the legacy football-data cron run, keeping
// only the ESPN-seeded matches. Canonical = a match whose id is in the live ESPN
// scoreboard. Matches are grouped by their (unordered) team pair, which is unique
// per World Cup fixture. Any picks sitting on a legacy duplicate are migrated to
// the canonical match before it's deleted, so no pick data is lost.
//
// Dry-run by default — pass ?apply=true to actually delete.
export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const apply = request.nextUrl.searchParams.get("apply") === "true";

  const espnIds = await fetchEspnEventIds();
  if (espnIds.size === 0) {
    return NextResponse.json(
      { error: "Could not load ESPN event ids — aborting so nothing is deleted blindly." },
      { status: 400 }
    );
  }

  const matches = await prisma.match.findMany({
    select: {
      id: true,
      homeId: true,
      awayId: true,
      Pick: { select: { id: true, userId: true } },
    },
  });

  const pairKey = (homeId: number, awayId: number) =>
    `${Math.min(homeId, awayId)}-${Math.max(homeId, awayId)}`;

  const groups = new Map<string, typeof matches>();
  for (const m of matches) {
    const key = pairKey(m.homeId, m.awayId);
    const arr = groups.get(key) ?? [];
    arr.push(m);
    groups.set(key, arr);
  }

  const dropPickIds: number[] = [];
  const movesByTarget = new Map<number, number[]>(); // canonical matchId -> pick ids to move
  const deleteMatchIds: number[] = [];
  const conflicts: { key: string; reason: string; ids: number[] }[] = [];
  let duplicateGroups = 0;

  for (const [key, group] of Array.from(groups.entries())) {
    if (group.length < 2) continue;
    duplicateGroups++;

    const canonical = group.filter((m) => espnIds.has(m.id));
    const legacy = group.filter((m) => !espnIds.has(m.id));

    if (canonical.length === 0) {
      conflicts.push({ key, reason: "no ESPN-canonical match — left untouched", ids: group.map((m) => m.id) });
      continue;
    }
    if (canonical.length > 1) {
      conflicts.push({ key, reason: "multiple ESPN matches share this pair — keeping all, removing legacy only", ids: canonical.map((m) => m.id) });
    }

    // Keep the canonical match with the most picks (stable on id).
    const target = canonical.slice().sort((a, b) => b.Pick.length - a.Pick.length || a.id - b.id)[0];
    const targetUsers = new Set(target.Pick.map((p) => p.userId));
    const moveIds = movesByTarget.get(target.id) ?? [];

    for (const lm of legacy) {
      for (const p of lm.Pick) {
        if (targetUsers.has(p.userId)) {
          dropPickIds.push(p.id); // user already picked the canonical match
        } else {
          moveIds.push(p.id);
          targetUsers.add(p.userId);
        }
      }
      deleteMatchIds.push(lm.id);
    }
    if (moveIds.length) movesByTarget.set(target.id, moveIds);
  }

  const plan = {
    apply,
    matchesTotal: matches.length,
    duplicateGroups,
    matchesToDelete: deleteMatchIds.length,
    picksToMigrate: Array.from(movesByTarget.values()).reduce((n, ids) => n + ids.length, 0),
    picksToDropAsDuplicate: dropPickIds.length,
    conflicts,
    deleteMatchIds,
  };

  if (apply && deleteMatchIds.length) {
    await prisma.$transaction([
      prisma.pick.deleteMany({ where: { id: { in: dropPickIds } } }),
      ...Array.from(movesByTarget.entries()).map(([matchId, ids]) =>
        prisma.pick.updateMany({ where: { id: { in: ids } }, data: { matchId } })
      ),
      prisma.match.deleteMany({ where: { id: { in: deleteMatchIds } } }),
    ]);
    await settleAll();
    revalidatePath("/leaderboard");
    revalidatePath("/matches");
  }

  return NextResponse.json(plan);
}
