import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getConfig } from "@/lib/config";
import prisma from "@/lib/prisma";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const cfg = await getConfig();
  const now = new Date();
  const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

  const [
    matchesMissingOdds,
    matchesMissingResult,
    usersWithNoPicks,
    aliasCount,
    teamCount,
    matchCount,
  ] = await Promise.all([
    prisma.match.count({
      where: {
        startTime: { gt: now },
        OR: [{ homeWinOdds: 0 }, { drawOdds: 0 }, { awayWinOdds: 0 }],
      },
    }),
    prisma.match.count({
      where: {
        startTime: { lt: threeHoursAgo },
        OR: [{ result: null }, { result: "NO_RESULT" }],
      },
    }),
    prisma.user.count({ where: { picks: { none: {} } } }),
    prisma.teamNameAlias.count(),
    prisma.team.count(),
    prisma.match.count(),
  ]);

  return NextResponse.json({
    lastCronRunAt: cfg.lastCronRunAt,
    matchesMissingOdds,
    matchesMissingResult,
    usersWithNoPicks,
    teamNameAliases: aliasCount,
    teams: teamCount,
    matches: matchCount,
    unmappedTeamsRisk: teamCount > 0 && aliasCount < teamCount,
  });
}
