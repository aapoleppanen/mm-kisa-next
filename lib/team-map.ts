import { cache } from "react";
import prisma from "@/lib/prisma";
import { VeikkausFDEuroTeamMap } from "@/utils/adapterUtils";

export const getTeamNameMap = cache(async (): Promise<Record<string, string>> => {
  let aliases = await prisma.teamNameAlias.findMany({
    include: { team: { select: { name: true } } },
  });

  if (aliases.length === 0) {
    await seedDefaultAliases();
    aliases = await prisma.teamNameAlias.findMany({
      include: { team: { select: { name: true } } },
    });
  }

  return Object.fromEntries(
    aliases.map((a) => [a.veikkausName, a.team.name])
  );
});

async function seedDefaultAliases() {
  const teams = await prisma.team.findMany({ select: { id: true, name: true } });
  const byName = new Map(teams.map((t) => [t.name, t.id]));

  for (const [veikkausName, fdName] of Object.entries(VeikkausFDEuroTeamMap)) {
    const teamId = byName.get(fdName);
    if (!teamId) continue;
    await prisma.teamNameAlias.upsert({
      where: { veikkausName },
      update: { teamId },
      create: { veikkausName, teamId },
    });
  }
}

export async function resolveVeikkausTeamName(
  veikkausName: string,
  map: Record<string, string>
): Promise<string | null> {
  return map[veikkausName] ?? null;
}
