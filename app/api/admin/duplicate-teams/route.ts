import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import prisma from "@/lib/prisma";
import { fetchEspnEventIds } from "@/modules/api/espn/espn";

// Teams that are NOT referenced by any live-ESPN match are almost certainly
// legacy football-data rows whose name differs from ESPN's (e.g. "Turkey" vs
// "Türkiye"). Surface them with a best-guess canonical match so they can be merged.
const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const espnIds = await fetchEspnEventIds();
  const matches = await prisma.match.findMany({ select: { id: true, homeId: true, awayId: true } });

  const canonicalTeamIds = new Set<number>();
  for (const m of matches) {
    if (espnIds.has(m.id)) {
      canonicalTeamIds.add(m.homeId);
      canonicalTeamIds.add(m.awayId);
    }
  }

  const teams = await prisma.team.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  const canonical = teams.filter((t) => canonicalTeamIds.has(t.id));

  const orphans = teams
    .filter((t) => !canonicalTeamIds.has(t.id))
    .map((t) => {
      // light fuzzy suggestion: same first 4 normalized chars
      const n = normalize(t.name);
      const suggestion =
        canonical.find((c) => normalize(c.name) === n) ??
        canonical.find((c) => normalize(c.name).slice(0, 4) === n.slice(0, 4)) ??
        null;
      return { id: t.id, name: t.name, suggestedIntoId: suggestion?.id ?? null, suggestedIntoName: suggestion?.name ?? null };
    });

  return NextResponse.json({ orphans, canonical });
}
