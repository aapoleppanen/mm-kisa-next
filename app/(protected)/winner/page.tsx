import prisma from "@/lib/prisma";
import WinnerClient from "@/components/winner/winner-client";

export default async function WinnerPage() {
  const teams = await prisma.team.findMany({
    orderBy: { winningOdds: "asc" },
  });

  return <WinnerClient teams={JSON.parse(JSON.stringify(teams))} />;
}
