import { headers } from "next/headers";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { getConfig, maxBetForStage } from "@/lib/config";
import MatchesClient from "@/components/matches/matches-client";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session!.user.id;
  const cfg = await getConfig();

  const [userCredits, matches] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { remainingCredits: true },
    }),
    prisma.match.findMany({
      include: {
        away: true,
        home: true,
        Pick: { where: { userId } },
        _count: {
          select: { Comment: true },
        },
      },
      orderBy: { startTime: "asc" },
    }),
  ]);

  const matchesWithMaxBet = matches.map((m) => ({
    ...m,
    maxBet: maxBetForStage(m.stage, cfg.maxBetAmount),
  }));

  return (
    <MatchesClient
      matches={JSON.parse(JSON.stringify(matchesWithMaxBet))}
      initialCredits={userCredits?.remainingCredits ?? 0}
      backgroundUrl="https://storage.googleapis.com/em-kisa-2024-bucket/background_6.jpg"
      scoringMode={cfg.scoringMode}
      lockLeadHours={cfg.lockLeadHours}
    />
  );
}
