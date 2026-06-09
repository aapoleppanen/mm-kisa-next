import prisma from "@/lib/prisma";
import { getConfig, isPrePicksLocked } from "@/lib/config";
import WinnerClient from "@/components/winner/winner-client";

export default async function WinnerPage() {
  const [teams, cfg] = await Promise.all([
    prisma.team.findMany({ orderBy: { winningOdds: "asc" } }),
    getConfig(),
  ]);
  const locked = await isPrePicksLocked(cfg.prePicksLockAt);

  return (
    <WinnerClient
      teams={JSON.parse(JSON.stringify(teams))}
      locked={locked}
    />
  );
}
