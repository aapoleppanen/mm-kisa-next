import prisma from "@/lib/prisma";
import AdminClient from "@/components/admin/admin-client";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [teams, players, matches] = await Promise.all([
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.player.findMany({ orderBy: { name: "asc" } }),
    prisma.match.findMany({
      include: { home: true, away: true },
      orderBy: { startTime: "asc" },
      take: 50,
    }),
  ]);

  return (
    <AdminClient
      teams={JSON.parse(JSON.stringify(teams))}
      players={JSON.parse(JSON.stringify(players))}
      matches={JSON.parse(JSON.stringify(matches))}
    />
  );
}
