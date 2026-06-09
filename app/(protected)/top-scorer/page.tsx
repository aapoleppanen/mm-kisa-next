import prisma from "@/lib/prisma";
import { getConfig, isPrePicksLocked } from "@/lib/config";
import TopScorerClient from "@/components/top-scorer/top-scorer-client";

export default async function TopScorerPage() {
  const [players, cfg] = await Promise.all([
    prisma.player.findMany({ orderBy: { odds: "asc" } }),
    getConfig(),
  ]);
  const locked = await isPrePicksLocked(cfg.prePicksLockAt);

  return (
    <TopScorerClient
      players={JSON.parse(JSON.stringify(players))}
      locked={locked}
    />
  );
}
