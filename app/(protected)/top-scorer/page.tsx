import prisma from "@/lib/prisma";
import TopScorerClient from "@/components/top-scorer/top-scorer-client";

export default async function TopScorerPage() {
  const players = await prisma.player.findMany({
    orderBy: { odds: "asc" },
  });

  return <TopScorerClient players={JSON.parse(JSON.stringify(players))} />;
}
